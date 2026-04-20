#!/usr/bin/env python3
"""
Validate migrated ISA-95 entity and mapping CSV outputs.

Rules implemented:
1) Referential integrity for mapping files using Source/Target PrimaryKey against
   corresponding entity primary keys.
2) Enum values must match DTDL definitions exactly.
3) sourceTimeStamp must exist in every evaluated file, follow ISO format
   yyyy-MM-ddTHH:mm:ss.fffZ, parse as valid UTC datetime, and be within allowed
   past/future window.
4) durationUnitofMeasure values must be one of:
   milliseconds, seconds, minutes, hours, days
5) MaterialDefinitionProperty defaults must include DefaultUnitOfMeasure and
   MaterialCode.
6) Primary key checks from DTDL metadata:
   - primary key columns are present
   - all primary key values are populated
   - primary key combinations are unique
   - DTDL primaryKey columns are mandatory

Important scope:
- Evaluates only CSVs under provided --data-dirs.
- Excludes template/master/process folders by default.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set, Tuple


SUPPORTED_DURATION_UOM = {"milliseconds", "seconds", "minutes", "hours", "days"}
TIMESTAMP_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$")

# Common filename timestamp suffixes, e.g.:
# material_definition_20260105T120000Z.csv
# material_definition-20260105120000.csv
# material_definition_2026-01-05-120000.csv
FILENAME_TIMESTAMP_SUFFIX_RE = re.compile(
    r"^(?P<base>.+?)(?:[_\-. ]+)(?:"
    r"\d{8}T\d{6}Z?"
    r"|\d{14}"
    r"|\d{8}"
    r"|\d{4}-\d{2}-\d{2}(?:[_\-. ]\d{2}(?::?\d{2}){1,2})?"
    r")$",
    re.IGNORECASE,
)

MAPPING_FILENAME_RE = re.compile(
    r"^(?P<src>.+?)(?:[_\-. ]+to[_\-. ]+)(?P<tgt>.+?)(?:[_\-. ]+mapping)$",
    re.IGNORECASE,
)


def normalize_name(value: str) -> str:
    return "".join(ch for ch in value.lower() if ch.isalnum())


def strip_filename_timestamp_suffix(stem: str) -> str:
    current = stem.strip()
    # Repeatedly strip trailing timestamp-like segments to handle compounded names.
    for _ in range(3):
        match = FILENAME_TIMESTAMP_SUFFIX_RE.match(current)
        if not match:
            break
        next_value = match.group("base").strip(" _-.")
        if not next_value or next_value == current:
            break
        current = next_value
    return current


def parse_mapping_filename(stem: str) -> Optional[Tuple[str, str]]:
    """Parse names like 'material actual_to_material definition_mapping_20260105T120000Z'."""
    base = strip_filename_timestamp_suffix(stem)
    match = MAPPING_FILENAME_RE.match(base.strip())
    if not match:
        return None
    src = match.group("src").strip(" _-.")
    tgt = match.group("tgt").strip(" _-.")
    if not src or not tgt:
        return None
    return src, tgt


def parse_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    text = str(value).strip().lower()
    return text in {"true", "1", "yes", "y"}


def parse_iso_millis_z(value: str) -> Optional[datetime]:
    if not TIMESTAMP_RE.match(value):
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%dT%H:%M:%S.%fZ").replace(tzinfo=timezone.utc)
    except ValueError:
        return None


@dataclass
class DtdlEntity:
    name: str
    source_file: str
    aliases: Set[str] = field(default_factory=set)
    mandatory_cols: List[str] = field(default_factory=list)
    primary_key_cols: List[str] = field(default_factory=list)
    enum_values: Dict[str, Set[str]] = field(default_factory=dict)


@dataclass
class CsvTable:
    path: Path
    headers: List[str]
    rows: List[Dict[str, str]]
    pk_only: bool = False  # True = only PK + sourceTimestamp columns loaded (referenced entity)

    @property
    def normalized_headers(self) -> Dict[str, str]:
        return {normalize_name(h): h for h in self.headers}

    @property
    def stem_aliases(self) -> Set[str]:
        stem = self.path.stem
        stem_no_ts = strip_filename_timestamp_suffix(stem)
        aliases = {
            normalize_name(stem),
            normalize_name(stem.replace("_", " ")),
            normalize_name(stem_no_ts),
            normalize_name(stem_no_ts.replace("_", " ")),
        }
        if stem.lower().endswith("s"):
            aliases.add(normalize_name(stem[:-1]))
        if stem_no_ts.lower().endswith("s"):
            aliases.add(normalize_name(stem_no_ts[:-1]))
        return aliases

    @property
    def mapping_filename_types(self) -> Optional[Tuple[str, str]]:
        parsed = parse_mapping_filename(self.path.stem)
        if not parsed:
            return None
        src, tgt = parsed
        return normalize_name(src), normalize_name(tgt)


class Validator:
    def __init__(self, args: argparse.Namespace) -> None:
        self.args = args
        self.issues: List[Dict[str, Any]] = []
        self.dtdl_entities: Dict[str, DtdlEntity] = {}
        self.dtdl_metadata_source = "unknown"
        self.tables: List[CsvTable] = []
        self.entity_match: Dict[Path, Optional[DtdlEntity]] = {}
        self.entity_pk_index: Dict[str, Set[str]] = {}
        self.entity_pk_columns: Dict[Path, List[str]] = {}

    def add_issue(
        self,
        severity: str,
        rule: str,
        file_path: Path,
        message: str,
        row_number: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        issue = {
            "severity": severity,
            "rule": rule,
            "file": str(file_path),
            "message": message,
        }
        if row_number is not None:
            issue["row"] = row_number
        if details:
            issue["details"] = details
        self.issues.append(issue)

    @staticmethod
    def _serialize_entity(entity: DtdlEntity) -> Dict[str, Any]:
        return {
            "name": entity.name,
            "source_file": entity.source_file,
            "aliases": sorted(entity.aliases),
            "mandatory_cols": entity.mandatory_cols,
            "primary_key_cols": entity.primary_key_cols,
            "enum_values": {k: sorted(v) for k, v in entity.enum_values.items()},
        }

    @staticmethod
    def _deserialize_entity(payload: Dict[str, Any]) -> Optional[DtdlEntity]:
        name = str(payload.get("name") or "").strip()
        if not name:
            return None

        entity = DtdlEntity(
            name=name,
            source_file=str(payload.get("source_file") or "<metadata-cache>"),
        )
        entity.aliases = {str(a) for a in (payload.get("aliases") or []) if str(a).strip()}
        entity.mandatory_cols = [str(c) for c in (payload.get("mandatory_cols") or []) if str(c).strip()]
        entity.primary_key_cols = [str(c) for c in (payload.get("primary_key_cols") or []) if str(c).strip()]

        enum_values = payload.get("enum_values") or {}
        if isinstance(enum_values, dict):
            for key, values in enum_values.items():
                norm_key = str(key).strip()
                if not norm_key:
                    continue
                entity.enum_values[norm_key] = {str(v) for v in (values or []) if str(v).strip()}

        return entity

    def _try_load_dtdl_cache(self, cache_path: Path) -> bool:
        if not cache_path.exists():
            return False

        try:
            payload = json.loads(cache_path.read_text(encoding="utf-8"))
        except Exception as exc:
            self.add_issue("warning", "dtdl_cache_read", cache_path, f"Failed to read metadata cache: {exc}")
            return False

        entities = payload.get("entities")
        if not isinstance(entities, list) or not entities:
            return False

        loaded: Dict[str, DtdlEntity] = {}
        for item in entities:
            if not isinstance(item, dict):
                continue
            entity = self._deserialize_entity(item)
            if entity is None:
                continue
            loaded[normalize_name(entity.name)] = entity

        if not loaded:
            return False

        self.dtdl_entities = loaded
        self.dtdl_metadata_source = "cache"
        return True

    def _write_dtdl_cache(self, cache_path: Path, dtdl_dir: Path) -> None:
        payload = {
            "version": 1,
            "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
            "dtdlDir": str(dtdl_dir),
            "entities": [self._serialize_entity(e) for e in self.dtdl_entities.values()],
        }
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def load_dtdl(self) -> None:
        cache_path = Path(self.args.metadata_cache)

        if not self.args.refresh_metadata and self._try_load_dtdl_cache(cache_path):
            return

        if not self.args.dtdl_dir:
            raise FileNotFoundError(
                "DTDL metadata cache not available. Provide --dtdl-dir to build cache, "
                "or run once with --refresh-metadata."
            )

        dtdl_dir = Path(self.args.dtdl_dir)
        files = sorted(dtdl_dir.glob("*.json"))
        if not files:
            raise FileNotFoundError(f"No DTDL metadata JSON files found in: {dtdl_dir}")

        for file_path in files:
            try:
                raw = file_path.read_bytes()
                text = None
                for enc in ("utf-8", "utf-8-sig", "utf-16"):
                    try:
                        text = raw.decode(enc)
                        break
                    except UnicodeDecodeError:
                        continue
                if text is None:
                    raise UnicodeDecodeError("utf-8", b"", 0, 1, "Unable to decode DTDL JSON with supported encodings")
                data = json.loads(text)
            except Exception as exc:
                self.add_issue("error", "dtdl_parse", file_path, f"Failed to parse DTDL JSON: {exc}")
                continue

            name = str(data.get("name") or file_path.stem)
            entity = DtdlEntity(name=name, source_file=str(file_path))

            entity.aliases.update(
                {
                    normalize_name(name),
                    normalize_name(file_path.stem),
                    normalize_name(file_path.stem.replace("_", " ")),
                }
            )

            columns = data.get("columns") or []
            for col in columns:
                col_name = str(col.get("name") or "").strip()
                if not col_name:
                    continue
                col_key = normalize_name(col_name)

                if parse_bool(col.get("mandatory")):
                    entity.mandatory_cols.append(col_key)
                if parse_bool(col.get("primaryKey")):
                    entity.primary_key_cols.append(col_key)

                if str(col.get("type", "")).strip().lower() == "enum":
                    values = col.get("enumValues") or []
                    enum_set = {str(v) for v in values if str(v).strip()}
                    if enum_set:
                        entity.enum_values[col_key] = enum_set

            dtdl_schema = data.get("dtdlSchema") or {}
            for content in dtdl_schema.get("contents") or []:
                schema = content.get("schema")
                if not isinstance(schema, dict):
                    continue
                if str(schema.get("@type", "")).lower() != "enum":
                    continue
                prop_name = normalize_name(str(content.get("name") or ""))
                if not prop_name:
                    continue
                enum_values = set()
                for item in schema.get("enumValues") or []:
                    val = item.get("enumValue")
                    if val is not None and str(val).strip():
                        enum_values.add(str(val))
                if enum_values:
                    entity.enum_values[prop_name] = enum_values

            self.dtdl_entities[normalize_name(name)] = entity

        self.dtdl_metadata_source = "dtdl_dir"

        try:
            self._write_dtdl_cache(cache_path, dtdl_dir)
        except Exception as exc:
            self.add_issue("warning", "dtdl_cache_write", cache_path, f"Failed to write metadata cache: {exc}")

    def iter_candidate_csv_files(self) -> Iterable[Path]:
        exclude_parts = {"templates"}
        if self.args.exclude_master_process:
            exclude_parts.update({"masterdata", "processdata"})

        seen: Set[Path] = set()
        for directory in self.args.data_dirs:
            root = Path(directory)
            if not root.exists():
                self.add_issue("error", "input_path", root, "Data directory does not exist")
                continue
            for file_path in root.rglob("*.csv"):
                parts_norm = {p.lower() for p in file_path.parts}
                if any(ex in parts_norm for ex in exclude_parts):
                    continue
                if file_path in seen:
                    continue
                seen.add(file_path)
                yield file_path

    def _read_headers(self, csv_path: Path) -> Optional[List[str]]:
        """Read only the header row of a CSV. Returns None on error."""
        try:
            with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
                reader = csv.DictReader(handle)
                headers = list(reader.fieldnames or [])
            if not headers:
                self.add_issue("warning", "csv_empty", csv_path, "CSV has no headers")
                return None
            return headers
        except Exception as exc:
            self.add_issue("error", "csv_parse", csv_path, f"Failed to parse CSV: {exc}")
            return None

    def _is_mapping_headers(self, headers: List[str]) -> bool:
        norm = {normalize_name(h) for h in headers}
        return {"sourcetype", "sourceprimarykey", "targettype", "targetprimarykey"}.issubset(norm)

    def load_csv_tables(self) -> None:
        max_rows = getattr(self.args, "max_rows_per_file", None)

        # ── Phase 1: scan headers of all candidate CSVs ──────────────────────
        mapping_candidates: List[Tuple[Path, List[str]]] = []
        entity_candidates: List[Tuple[Path, List[str]]] = []

        for csv_path in self.iter_candidate_csv_files():
            headers = self._read_headers(csv_path)
            if headers is None:
                continue
            if self._is_mapping_headers(headers):
                mapping_candidates.append((csv_path, headers))
            else:
                entity_candidates.append((csv_path, headers))

        # ── Phase 2: load mapping files (limited rows) + collect referenced entity types ──
        referenced_entity_types: Set[str] = set()

        for csv_path, headers in mapping_candidates:
            norm_h = {normalize_name(h): h for h in headers}
            src_type_col = norm_h.get("sourcetype")
            tgt_type_col = norm_h.get("targettype")
            try:
                with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
                    reader = csv.DictReader(handle)
                    rows = []
                    for i, row in enumerate(reader):
                        if max_rows is not None and i >= max_rows:
                            break
                        row_stripped = {k: (v or "").strip() for k, v in row.items()}
                        rows.append(row_stripped)
                        if src_type_col:
                            t = normalize_name(row_stripped.get(src_type_col, ""))
                            if t:
                                referenced_entity_types.add(t)
                        if tgt_type_col:
                            t = normalize_name(row_stripped.get(tgt_type_col, ""))
                            if t:
                                referenced_entity_types.add(t)
            except Exception as exc:
                self.add_issue("error", "csv_parse", csv_path, f"Failed to parse CSV: {exc}")
                continue
            self.tables.append(CsvTable(path=csv_path, headers=headers, rows=rows))

        # ── Phase 3: load entity files ────────────────────────────────────────
        # Referenced entities → all rows, only PK + id + sourceTimestamp columns (pk_only=True)
        # Other entities      → max_rows_per_file rows, all columns
        for csv_path, headers in entity_candidates:
            norm_h = {normalize_name(h): h for h in headers}

            # Resolve entity to check if it is referenced in any mapping
            tmp_table = CsvTable(path=csv_path, headers=headers, rows=[])
            entity = self.resolve_entity_metadata(tmp_table)

            all_aliases: Set[str] = tmp_table.stem_aliases
            if entity:
                all_aliases = all_aliases | entity.aliases
            is_referenced = bool(all_aliases & referenced_entity_types)

            try:
                if is_referenced and entity:
                    # Keep only id + PK columns + sourceTimestamp
                    keep_cols: Set[str] = set()
                    for col_key in list(entity.primary_key_cols) + ["id", "sourcetimestamp"]:
                        actual = norm_h.get(col_key)
                        if actual:
                            keep_cols.add(actual)

                    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
                        reader = csv.DictReader(handle)
                        rows = [
                            {k: (v or "").strip() for k, v in row.items() if k in keep_cols}
                            for row in reader
                        ]
                    self.tables.append(CsvTable(path=csv_path, headers=headers, rows=rows, pk_only=True))
                else:
                    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
                        reader = csv.DictReader(handle)
                        rows = []
                        for i, row in enumerate(reader):
                            if max_rows is not None and i >= max_rows:
                                break
                            rows.append({k: (v or "").strip() for k, v in row.items()})
                    self.tables.append(CsvTable(path=csv_path, headers=headers, rows=rows))
            except Exception as exc:
                self.add_issue("error", "csv_parse", csv_path, f"Failed to parse CSV: {exc}")
                continue

    def resolve_entity_metadata(self, table: CsvTable) -> Optional[DtdlEntity]:
        # First pass: match by file name aliases
        table_aliases = set(table.stem_aliases)
        for entity in self.dtdl_entities.values():
            if table_aliases.intersection(entity.aliases):
                return entity

        # Second pass: best header overlap with DTDL known columns
        header_keys = set(table.normalized_headers.keys())
        best_entity: Optional[DtdlEntity] = None
        best_score = 0
        for entity in self.dtdl_entities.values():
            known = set(entity.mandatory_cols) | set(entity.primary_key_cols) | set(entity.enum_values.keys())
            if not known:
                continue
            score = len(header_keys.intersection(known))
            if score > best_score:
                best_score = score
                best_entity = entity

        if best_score >= 2:
            return best_entity
        return None

    def is_mapping_table(self, table: CsvTable) -> bool:
        keys = set(table.normalized_headers.keys())
        has_mapping_headers = {
            "sourcetype",
            "sourceprimarykey",
            "targettype",
            "targetprimarykey",
        }.issubset(keys)
        return has_mapping_headers or table.mapping_filename_types is not None

    def get_cell(self, row: Dict[str, str], header_map: Dict[str, str], normalized: str) -> str:
        header = header_map.get(normalized)
        if not header:
            return ""
        return (row.get(header) or "").strip()

    def validate_source_timestamp_column(self, table: CsvTable) -> None:
        hmap = table.normalized_headers
        ts_col = hmap.get("sourcetimestamp")
        if not ts_col:
            self.add_issue(
                "error",
                "source_timestamp_missing",
                table.path,
                "Missing required column sourceTimeStamp",
            )
            return

        now = datetime.now(timezone.utc)
        min_dt = now - timedelta(days=self.args.max_past_days)
        max_dt = now + timedelta(days=self.args.max_future_days)

        for idx, row in enumerate(table.rows, start=2):
            value = (row.get(ts_col) or "").strip()
            if not value:
                self.add_issue(
                    "error",
                    "source_timestamp_empty",
                    table.path,
                    "sourceTimeStamp is empty",
                    idx,
                )
                continue

            parsed = parse_iso_millis_z(value)
            if not parsed:
                self.add_issue(
                    "error",
                    "source_timestamp_format",
                    table.path,
                    "sourceTimeStamp must match yyyy-MM-ddTHH:mm:ss.fffZ",
                    idx,
                    {"value": value},
                )
                continue

            if parsed < min_dt or parsed > max_dt:
                self.add_issue(
                    "error",
                    "source_timestamp_range",
                    table.path,
                    "sourceTimeStamp is outside allowed date range",
                    idx,
                    {
                        "value": value,
                        "allowedMinUtc": min_dt.isoformat(),
                        "allowedMaxUtc": max_dt.isoformat(),
                    },
                )

    def validate_duration_unit(self, table: CsvTable) -> None:
        hmap = table.normalized_headers
        du_col = hmap.get("durationunitofmeasure")
        if not du_col:
            return

        for idx, row in enumerate(table.rows, start=2):
            val = (row.get(du_col) or "").strip()
            if not val:
                continue
            if val.lower() not in SUPPORTED_DURATION_UOM:
                self.add_issue(
                    "error",
                    "duration_uom_invalid",
                    table.path,
                    "Unsupported durationUnitofMeasure",
                    idx,
                    {"value": val, "supported": sorted(SUPPORTED_DURATION_UOM)},
                )

    def validate_entity_table(self, table: CsvTable, entity: DtdlEntity) -> None:
        hmap = table.normalized_headers

        # Mandatory columns in DTDL should exist and be populated per row
        for mandatory in entity.mandatory_cols:
            if mandatory not in hmap:
                self.add_issue(
                    "error",
                    "mandatory_column_missing",
                    table.path,
                    f"Missing mandatory column from DTDL: {mandatory}",
                    details={"entity": entity.name},
                )

        # Enum strictness
        for enum_col, allowed in entity.enum_values.items():
            header = hmap.get(enum_col)
            if not header:
                continue
            for idx, row in enumerate(table.rows, start=2):
                val = (row.get(header) or "").strip()
                if not val:
                    continue
                if val not in allowed:
                    self.add_issue(
                        "error",
                        "enum_value_invalid",
                        table.path,
                        f"Invalid enum value for column {header}",
                        idx,
                        {"value": val, "allowed": sorted(allowed), "entity": entity.name},
                    )

        # PK columns must exist
        pk_cols = [pk for pk in entity.primary_key_cols if pk in hmap]
        self.entity_pk_columns[table.path] = pk_cols
        if entity.primary_key_cols and len(pk_cols) != len(entity.primary_key_cols):
            missing = [pk for pk in entity.primary_key_cols if pk not in hmap]
            self.add_issue(
                "error",
                "primary_key_column_missing",
                table.path,
                "Missing primary key column(s) defined in DTDL",
                details={"missing": missing, "entity": entity.name},
            )

        # PK columns should also be mandatory according to DTDL rule interpretation
        mandatory_set = set(entity.mandatory_cols)
        non_mandatory_pk = [pk for pk in entity.primary_key_cols if pk not in mandatory_set]
        if non_mandatory_pk:
            self.add_issue(
                "warning",
                "primary_key_not_mandatory_in_dtdl",
                table.path,
                "DTDL marks primary key columns not mandatory",
                details={"columns": non_mandatory_pk, "entity": entity.name},
            )

        # Row-level mandatory check
        for idx, row in enumerate(table.rows, start=2):
            for mandatory in entity.mandatory_cols:
                header = hmap.get(mandatory)
                if not header:
                    continue
                if not (row.get(header) or "").strip():
                    self.add_issue(
                        "error",
                        "mandatory_value_missing",
                        table.path,
                        f"Mandatory value is empty for column {header}",
                        idx,
                        {"entity": entity.name},
                    )

        # PK row population + uniqueness
        if pk_cols:
            seen: Dict[Tuple[str, ...], int] = {}
            for idx, row in enumerate(table.rows, start=2):
                key_parts = tuple((row.get(hmap[c]) or "").strip() for c in pk_cols)
                if any(part == "" for part in key_parts):
                    self.add_issue(
                        "error",
                        "primary_key_value_missing",
                        table.path,
                        "Primary key value is empty",
                        idx,
                        {"columns": pk_cols, "entity": entity.name},
                    )
                    continue
                if key_parts in seen:
                    self.add_issue(
                        "error",
                        "primary_key_duplicate",
                        table.path,
                        "Duplicate primary key combination",
                        idx,
                        {"firstRow": seen[key_parts], "columns": pk_cols, "entity": entity.name},
                    )
                else:
                    seen[key_parts] = idx

            # Build PK index for referential checks.
            pk_values: Set[str] = set()
            id_col = hmap.get("id")
            if id_col:
                pk_values = {(row.get(id_col) or "").strip() for row in table.rows if (row.get(id_col) or "").strip()}
            else:
                for row in table.rows:
                    parts = [
                        (row.get(hmap[c]) or "").strip()
                        for c in pk_cols
                        if (row.get(hmap[c]) or "").strip()
                    ]
                    if len(parts) == len(pk_cols):
                        pk_values.add("|".join(parts))

            for alias in (entity.aliases | table.stem_aliases):
                if alias:
                    self.entity_pk_index.setdefault(alias, set()).update(pk_values)

    def _build_pk_index_for_table(self, table: CsvTable, entity: DtdlEntity) -> None:
        """Build PK index only (used for pk_only tables that carry PK + sourceTimestamp exclusively)."""
        hmap = table.normalized_headers
        pk_cols = [pk for pk in entity.primary_key_cols if pk in hmap]
        self.entity_pk_columns[table.path] = pk_cols

        if not pk_cols:
            return

        pk_values: Set[str] = set()
        id_col = hmap.get("id")
        if id_col:
            pk_values = {(row.get(id_col) or "").strip() for row in table.rows if (row.get(id_col) or "").strip()}
        else:
            for row in table.rows:
                parts = [
                    (row.get(hmap[c]) or "").strip()
                    for c in pk_cols
                    if (row.get(hmap.get(c, ""), "") or "").strip()
                ]
                if len(parts) == len(pk_cols):
                    pk_values.add("|".join(parts))

        for alias in (entity.aliases | table.stem_aliases):
            if alias:
                self.entity_pk_index.setdefault(alias, set()).update(pk_values)

    def validate_material_definition_property_defaults(self) -> None:
        required = {"defaultunitofmeasure", "materialcode"}
        found: Set[str] = set()
        mdp_tables_seen = 0

        for table in self.tables:
            matched = self.entity_match.get(table.path)
            if matched and normalize_name(matched.name) == "materialdefinitionproperty":
                mdp_tables_seen += 1
            elif normalize_name(table.path.stem) not in {
                "materialdefinitionproperty",
                "materialdefinitionproperties",
                "materialdefinitionpropertyoutput",
            }:
                continue
            else:
                mdp_tables_seen += 1

            headers_norm = table.normalized_headers
            candidate_cols = [
                headers_norm.get("id"),
                headers_norm.get("name"),
                headers_norm.get("propertyname"),
                headers_norm.get("description"),
                headers_norm.get("value"),
            ]
            candidate_cols = [c for c in candidate_cols if c]

            for row in table.rows:
                for col in candidate_cols:
                    token = normalize_name((row.get(col) or "").strip())
                    if token in required:
                        found.add(token)

        if mdp_tables_seen == 0:
            self.add_issue(
                "warning",
                "material_definition_property_file_missing",
                Path("<global>"),
                "MaterialDefinitionProperty CSV not found in evaluated data directories",
            )
            return

        missing = sorted(required - found)
        if missing:
            self.add_issue(
                "error",
                "material_definition_property_defaults_missing",
                Path("<global>"),
                "Missing required default MaterialDefinitionProperty entries",
                details={"missing": missing},
            )

    def validate_mapping_referential_integrity(self, table: CsvTable) -> None:
        hmap = table.normalized_headers
        required_cols = {"sourcetype", "sourceprimarykey", "targettype", "targetprimarykey"}
        missing_cols = [col for col in required_cols if col not in hmap]
        if missing_cols:
            self.add_issue(
                "error",
                "mapping_columns_missing",
                table.path,
                "Mapping file is missing required mapping columns",
                details={"missingColumns": sorted(missing_cols)},
            )
            return

        src_type_col = hmap["sourcetype"]
        src_pk_col = hmap["sourceprimarykey"]
        tgt_type_col = hmap["targettype"]
        tgt_pk_col = hmap["targetprimarykey"]

        unresolved_src_types: Set[str] = set()
        unresolved_tgt_types: Set[str] = set()
        filename_types = table.mapping_filename_types

        for idx, row in enumerate(table.rows, start=2):
            src_type = (row.get(src_type_col) or "").strip()
            src_pk = (row.get(src_pk_col) or "").strip()
            tgt_type = (row.get(tgt_type_col) or "").strip()
            tgt_pk = (row.get(tgt_pk_col) or "").strip()

            if not src_type or not src_pk or not tgt_type or not tgt_pk:
                self.add_issue(
                    "error",
                    "mapping_required_field_missing",
                    table.path,
                    "Mapping row missing source/target type or primary key",
                    idx,
                )
                continue

            src_type_key = normalize_name(src_type)
            tgt_type_key = normalize_name(tgt_type)

            if filename_types is not None:
                expected_src, expected_tgt = filename_types
                if src_type_key != expected_src:
                    self.add_issue(
                        "warning",
                        "mapping_source_type_vs_filename",
                        table.path,
                        "Source type does not match mapping filename pattern",
                        idx,
                        {"sourceType": src_type, "expectedFromFile": expected_src},
                    )
                if tgt_type_key != expected_tgt:
                    self.add_issue(
                        "warning",
                        "mapping_target_type_vs_filename",
                        table.path,
                        "Target type does not match mapping filename pattern",
                        idx,
                        {"targetType": tgt_type, "expectedFromFile": expected_tgt},
                    )

            src_index = self.entity_pk_index.get(src_type_key)
            tgt_index = self.entity_pk_index.get(tgt_type_key)

            if src_index is None:
                if src_type_key not in unresolved_src_types:
                    unresolved_src_types.add(src_type_key)
                    self.add_issue(
                        "warning",
                        "mapping_source_entity_unresolved",
                        table.path,
                        "Could not resolve source entity type to loaded entity CSV",
                        idx,
                        {"sourceType": src_type},
                    )
            elif src_pk not in src_index:
                self.add_issue(
                    "error",
                    "mapping_source_fk_broken",
                    table.path,
                    "Source PrimaryKey not found in source entity",
                    idx,
                    {"sourceType": src_type, "sourcePrimaryKey": src_pk},
                )

            if tgt_index is None:
                if tgt_type_key not in unresolved_tgt_types:
                    unresolved_tgt_types.add(tgt_type_key)
                    self.add_issue(
                        "warning",
                        "mapping_target_entity_unresolved",
                        table.path,
                        "Could not resolve target entity type to loaded entity CSV",
                        idx,
                        {"targetType": tgt_type},
                    )
            elif tgt_pk not in tgt_index:
                self.add_issue(
                    "error",
                    "mapping_target_fk_broken",
                    table.path,
                    "Target PrimaryKey not found in target entity",
                    idx,
                    {"targetType": tgt_type, "targetPrimaryKey": tgt_pk},
                )

    def run(self) -> Dict[str, Any]:
        self.load_dtdl()
        self.load_csv_tables()

        if not self.tables:
            self.add_issue("warning", "no_csv_found", Path("<global>"), "No candidate CSV files found")

        mapping_tables: List[CsvTable] = []
        entity_tables: List[CsvTable] = []

        for table in self.tables:
            self.validate_source_timestamp_column(table)
            self.validate_duration_unit(table)

            if self.is_mapping_table(table):
                mapping_tables.append(table)
                continue

            entity = self.resolve_entity_metadata(table)
            self.entity_match[table.path] = entity
            if not entity:
                self.add_issue(
                    "warning",
                    "dtdl_entity_unresolved",
                    table.path,
                    "Could not map CSV to a DTDL entity; enum/pk checks skipped",
                )
                continue

            entity_tables.append(table)
            if not table.pk_only:
                self.validate_entity_table(table, entity)
            else:
                # pk_only: only build the PK index for referential integrity; skip full validation
                self._build_pk_index_for_table(table, entity)

        self.validate_material_definition_property_defaults()

        for table in mapping_tables:
            self.validate_mapping_referential_integrity(table)

        severity_counts: Dict[str, int] = {"error": 0, "warning": 0, "info": 0}
        for issue in self.issues:
            sev = str(issue.get("severity", "warning")).lower()
            severity_counts[sev] = severity_counts.get(sev, 0) + 1

        report = {
            "summary": {
                "dataDirs": self.args.data_dirs,
                "dtdlDir": self.args.dtdl_dir,
                "dtdlMetadataSource": self.dtdl_metadata_source,
                "metadataCache": self.args.metadata_cache,
                "csvFilesEvaluated": len(self.tables),
                "entityFilesEvaluated": len(entity_tables),
                "mappingFilesEvaluated": len(mapping_tables),
                "errors": severity_counts.get("error", 0),
                "warnings": severity_counts.get("warning", 0),
            },
            "issues": self.issues,
        }
        return report


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate ISA-95 migrated entity/mapping CSV outputs")
    parser.add_argument(
        "--data-dirs",
        nargs="+",
        required=True,
        help="One or more directories containing migrated output CSV files",
    )
    parser.add_argument(
        "--dtdl-dir",
        default="",
        help="Directory containing ISA95 DTDL metadata JSON files (optional if metadata cache exists)",
    )
    parser.add_argument(
        "--metadata-cache",
        default="generated/dtdl_metadata_cache.json",
        help="Path to read/write extracted DTDL metadata cache",
    )
    parser.add_argument(
        "--refresh-metadata",
        action="store_true",
        help="Force rebuild metadata cache from --dtdl-dir",
    )
    parser.add_argument(
        "--output-json",
        default="",
        help="Optional path to write JSON report",
    )
    parser.add_argument(
        "--max-past-days",
        type=int,
        default=3650,
        help="Maximum age for sourceTimeStamp relative to now (UTC)",
    )
    parser.add_argument(
        "--max-future-days",
        type=int,
        default=30,
        help="Maximum future offset for sourceTimeStamp relative to now (UTC)",
    )
    parser.add_argument(
        "--exclude-master-process",
        action="store_true",
        default=True,
        help="Exclude CSVs in masterdata/processdata folders (default: enabled)",
    )
    parser.add_argument(
        "--include-master-process",
        action="store_true",
        help="Override and include masterdata/processdata folders",
    )

    args = parser.parse_args(argv)
    if args.include_master_process:
        args.exclude_master_process = False
    if args.refresh_metadata and not args.dtdl_dir:
        parser.error("--refresh-metadata requires --dtdl-dir")
    return args


def run_validation_for_notebook(
    data_dirs: Sequence[str],
    dtdl_dir: str = "",
    metadata_cache: str = "generated/dtdl_metadata_cache.json",
    refresh_metadata: bool = False,
    output_json: str = "",
    max_past_days: int = 3650,
    max_future_days: int = 30,
    include_master_process: bool = False,
    max_rows_per_file: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Notebook-friendly API for Fabric/Jupyter usage.

    Example:
        report = run_validation_for_notebook(
            data_dirs=["/lakehouse/default/Files/migration_outputs/isa95"],
            dtdl_dir="/lakehouse/default/Files/InbuiltEntitiesDTDL",
            refresh_metadata=True,
            output_json="/lakehouse/default/Files/generated/quality-check-report.json",
        )
    """
    args = argparse.Namespace(
        data_dirs=list(data_dirs),
        dtdl_dir=dtdl_dir,
        metadata_cache=metadata_cache,
        refresh_metadata=refresh_metadata,
        output_json=output_json,
        max_past_days=max_past_days,
        max_future_days=max_future_days,
        exclude_master_process=not include_master_process,
        include_master_process=include_master_process,
        max_rows_per_file=max_rows_per_file,
    )

    validator = Validator(args)
    report = validator.run()

    if output_json:
        out_path = Path(output_json)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    return report


def print_report_summary(report: Dict[str, Any], max_issues: int = 20) -> None:
    """Print a compact summary in notebook/terminal contexts."""
    from collections import Counter

    summary = report.get("summary", {})
    issues  = report.get("issues", [])

    print("=" * 60)
    print("ISA-95 Output Validation Summary")
    print("=" * 60)
    print(f"RI mode:             {report.get('riMode', 'python')}")
    print(f"CSV files evaluated: {summary.get('csvFilesEvaluated', 0)}")
    print(f"Entity files:        {summary.get('entityFilesEvaluated', 0)}")
    print(f"Mapping files:       {summary.get('mappingFilesEvaluated', 0)}")
    print(f"Errors:              {summary.get('errors', 0)}")
    print(f"Warnings:            {summary.get('warnings', 0)}")
    print()

    # Count by rule+severity
    counts: "Counter[str]" = Counter(
        f"[{i.get('severity', 'warning').upper()}] {i.get('rule', '?')}"
        for i in issues
    )
    if counts:
        print("── Issues by Rule " + "─" * 42)
        for rule_key, count in sorted(counts.items(), key=lambda x: (-x[1], x[0])):
            print(f"  {count:6d}  {rule_key}")
        print()

    if max_issues and issues:
        print(f"── First {min(max_issues, len(issues))} Issue(s) " + "─" * 40)
        for issue in issues[:max_issues]:
            location = issue.get("file", "")
            row = issue.get("row")
            if row is not None:
                location = f"{location}:{row}"
            print(f"[{issue.get('severity', 'warning').upper()}] {issue.get('rule')} - {Path(location).name if location else ''} - {issue.get('message')}")
    print("=" * 60)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)
    validator = Validator(args)
    report = validator.run()

    if args.output_json:
        out_path = Path(args.output_json)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print_report_summary(report, max_issues=20)

    return 1 if report["summary"]["errors"] > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
