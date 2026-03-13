import argparse
import csv
from datetime import datetime
import json
import os
import random
import re
import shutil
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from pyspark.sql import DataFrame, SparkSession, functions as F


_KNOWN_ISA95_TERMS = sorted([
    "operations", "operation", "segment", "material", "equipment", "event", "record", "entry",
    "requirement", "requirements", "response", "responses", "property", "properties", "actual", "actuals",
    "capability", "capabilities", "definition", "definitions", "specification", "specifications",
    "parameter", "parameters", "class", "classes", "allocation", "reference", "resource", "scope",
    "hierarchy", "sublot", "lot", "source", "target", "evaluated", "from", "lang", "string", "set",
    "job", "order", "list", "data", "type", "id", "pk"
], key=len, reverse=True)


@dataclass
class MigrationResult:
    """Aggregated outcome of one migration run, including output and log metadata."""
    successful: int
    failed: int
    skipped: int
    failed_items: List[str]
    skipped_items: List[str]
    outputs: List[str]
    version_id: str
    run_output_path: str
    log_file_path: str


def _utc_now_iso() -> str:
    """Return current UTC timestamp in ISO-like format used in run/item logs."""
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def _write_run_log(
    logs_dir: str,
    version_id: str,
    run_started_at: str,
    run_ended_at: str,
    summary: Dict[str, Any],
    items: List[Dict[str, Any]],
) -> str:
    """Write a structured JSON ingestion log for a single migration run."""
    os.makedirs(logs_dir, exist_ok=True)
    log_file_path = os.path.join(logs_dir, f"ingestion_log_{version_id}.json")

    payload = {
        "version_id": version_id,
        "run_started_at": run_started_at,
        "run_ended_at": run_ended_at,
        "summary": summary,
        "items": items,
    }

    with open(log_file_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    return log_file_path


def _ci_get(record: Dict[str, Any], key: str, default: Any = None) -> Any:
    """Case-insensitive dictionary lookup helper."""
    if key in record:
        return record[key]
    lk = key.lower()
    for k, v in record.items():
        if str(k).lower() == lk:
            return v
    return default


def _to_str(v: Any) -> str:
    """Convert value to string while treating None as empty string."""
    if v is None:
        return ""
    return str(v)


def _to_float(v: Any, default: float = 0.0) -> float:
    """Safely convert value to float, returning a default on failure."""
    try:
        return float(v)
    except Exception:
        return default


def _to_int(v: Any, default: int = 0) -> int:
    """Safely convert value to int, returning a default on failure."""
    try:
        return int(v)
    except Exception:
        return default


def _apply_filters(df: DataFrame, filters: Optional[List[Dict[str, Any]]]) -> DataFrame:
    """Apply configured frontend-style filters to a Spark DataFrame."""
    if not filters:
        return df

    result = df
    for flt in filters:
        if not flt or not flt.get("enabled", True):
            continue
        column = flt.get("column") or flt.get("field")
        op = (flt.get("operator") or "").lower()
        value = flt.get("value")

        if not column or column not in result.columns:
            continue

        col = F.col(column)
        sval = "" if value is None else str(value)

        if op == "equals":
            result = result.filter(col.cast("string") == F.lit(sval))
        elif op == "not_equals":
            result = result.filter(col.cast("string") != F.lit(sval))
        elif op == "contains":
            result = result.filter(F.lower(col.cast("string")).contains(sval.lower()))
        elif op == "not_contains":
            result = result.filter(~F.lower(col.cast("string")).contains(sval.lower()))
        elif op == "starts_with":
            result = result.filter(F.lower(col.cast("string")).startswith(sval.lower()))
        elif op == "ends_with":
            result = result.filter(F.lower(col.cast("string")).endswith(sval.lower()))
        elif op == "greater_than":
            result = result.filter(col.cast("double") > F.lit(_to_float(value)))
        elif op == "less_than":
            result = result.filter(col.cast("double") < F.lit(_to_float(value)))
        elif op == "is_null":
            result = result.filter(col.isNull() | (F.trim(col.cast("string")) == ""))
        elif op == "is_not_null":
            result = result.filter(col.isNotNull() & (F.trim(col.cast("string")) != ""))
        elif op == "is_empty":
            result = result.filter(col.isNull() | (F.trim(col.cast("string")) == ""))
        elif op == "is_not_empty":
            result = result.filter(col.isNotNull() & (F.trim(col.cast("string")) != ""))

    return result


def _eval_condition(value: str, condition: str) -> bool:
    """Evaluate If/Then condition expressions used by rule processing."""
    cond = (condition or "").strip()
    if not cond:
        return False

    parts = cond.split(" ", 1)
    op = parts[0].lower()
    rhs = parts[1] if len(parts) > 1 else ""

    if op in ("equals", "==", "="):
        return value.lower() == rhs.lower()
    if op in ("not_equals", "!="):
        return value.lower() != rhs.lower()
    if op == "contains":
        return rhs.lower() in value.lower()
    if op == "starts_with":
        return value.lower().startswith(rhs.lower())
    if op == "ends_with":
        return value.lower().endswith(rhs.lower())
    if op in ("greater_than", ">"):
        return _to_float(value) > _to_float(rhs)
    if op in ("less_than", "<"):
        return _to_float(value) < _to_float(rhs)
    if op in ("isnull", "is_null"):
        return value == ""
    if op in ("isnotnull", "is_not_null"):
        return value != ""
    return False


def _replace_placeholders(template: str, record: Dict[str, Any]) -> str:
    """Replace {field} placeholders in templates with source-record values."""
    out = template or ""
    for k, v in record.items():
        out = out.replace("{" + str(k) + "}", _to_str(v))
    return out


def _resolve_lookup(source_record: Dict[str, Any], rule: Dict[str, Any], lookup_tables: Dict[str, List[Dict[str, Any]]]) -> Any:
    """Resolve one-step lookup rules against preloaded lookup tables."""
    params = rule.get("parameters") or {}
    table_name = params.get("sourceTable") or params.get("lookupTable")
    return_field = params.get("returnField") or ""
    default_value = params.get("defaultValue", "")

    local_field = params.get("sourceField")
    match_field = params.get("matchField")

    join_conditions = params.get("joinConditions") or []
    if join_conditions:
        jc = join_conditions[0]
        jc_type = jc.get("type")
        if jc_type == "field":
            local_field = jc.get("localField")
            match_field = jc.get("sourceField")
        elif jc_type == "composite":
            local_fields = jc.get("localFields") or []
            source_fields = jc.get("sourceFields") or []
            if table_name not in lookup_tables:
                return default_value
            lookup_rows = lookup_tables[table_name]
            for lr in lookup_rows:
                ok = True
                for idx, lf in enumerate(local_fields):
                    sf = source_fields[idx] if idx < len(source_fields) else None
                    if not sf:
                        ok = False
                        break
                    if _to_str(_ci_get(lr, sf)).strip().lower() != _to_str(_ci_get(source_record, lf)).strip().lower():
                        ok = False
                        break
                if ok:
                    return _ci_get(lr, return_field, default_value)
            return default_value

    if not table_name or table_name not in lookup_tables:
        return default_value

    source_value = _to_str(_ci_get(source_record, local_field or ""))
    if source_value == "":
        return default_value

    for lr in lookup_tables[table_name]:
        if _to_str(_ci_get(lr, match_field or "")).strip().lower() == source_value.strip().lower():
            return _ci_get(lr, return_field, default_value)

    return default_value


def _resolve_multiple_lookups(source_record: Dict[str, Any], rule: Dict[str, Any], lookup_tables: Dict[str, List[Dict[str, Any]]]) -> Any:
    """Resolve chained lookup rules where each step feeds the next step."""
    params = rule.get("parameters") or {}
    steps = params.get("lookupSteps") or []
    default_value = params.get("defaultValue", "")

    current_value: Optional[str] = None

    for step_index, step in enumerate(steps):
        table_name = step.get("lookupTable")
        return_field = step.get("returnField") or ""
        if not table_name or table_name not in lookup_tables:
            return default_value

        join_conditions = step.get("joinConditions") or []
        if not join_conditions:
            return default_value

        jc = join_conditions[0]
        jc_type = jc.get("type")

        if step_index == 0:
            if jc_type == "field":
                match_value = _to_str(_ci_get(source_record, jc.get("localField") or ""))
            elif jc_type == "composite":
                local_fields = jc.get("localFields") or []
                match_value = "|".join([_to_str(_ci_get(source_record, f)) for f in local_fields])
            elif jc_type == "concatenation":
                expr = jc.get("localExpression") or ""
                match_value = _replace_placeholders(expr, source_record)
            else:
                return default_value
        else:
            match_value = _to_str(current_value)

        if match_value == "":
            return default_value

        matched = None
        for lr in lookup_tables[table_name]:
            if jc_type == "field":
                sf = jc.get("sourceField") or ""
                key = _to_str(_ci_get(lr, sf))
            elif jc_type == "composite":
                source_fields = jc.get("sourceFields") or []
                key = "|".join([_to_str(_ci_get(lr, sf)) for sf in source_fields])
            elif jc_type == "concatenation":
                expr = jc.get("sourceExpression") or ""
                for k, v in lr.items():
                    expr = expr.replace("{" + str(k) + "}", _to_str(v))
                key = expr
            else:
                key = ""

            if key.strip().lower() == match_value.strip().lower():
                matched = lr
                break

        if matched is None:
            return default_value

        current_value = _to_str(_ci_get(matched, return_field))

    return current_value if current_value is not None else default_value


def _apply_field_rule(rule: Dict[str, Any], source_record: Dict[str, Any], index: int, transformed: Dict[str, Any]) -> Any:
    """Apply a non-PK field rule to generate a transformed field value."""
    if not rule:
        return ""

    rule_type = rule.get("ruleType") or ""
    params = rule.get("parameters") or {}

    if rule_type in ("Static", "Enumeration"):
        return params.get("value", "")

    if rule_type == "Range":
        min_v = _to_float(params.get("min", 0))
        max_v = _to_float(params.get("max", 100))
        return random.random() * (max_v - min_v) + min_v

    if rule_type == "Examples":
        values = params.get("values") or []
        return random.choice(values) if values else ""

    if rule_type == "Pattern":
        return params.get("regex", "")

    if rule_type == "Sequence":
        start = _to_int(params.get("start", 1), 1)
        return start + index

    if rule_type == "PrefixSequence":
        start = _to_int(params.get("start", 1), 1)
        prefix = params.get("prefix", "") or ""
        suffix = params.get("suffix", "") or ""
        padding = _to_int(params.get("padding", 0), 0)
        num = start + index
        number = str(num).zfill(padding) if padding > 0 else str(num)
        return f"{prefix}{number}{suffix}"

    if rule_type == "Composite":
        fields = params.get("fields") or []
        sep = params.get("separator", "-")
        return sep.join([_to_str(_ci_get(transformed, f)) for f in fields])

    if rule_type == "CompositeConcat":
        fields = params.get("fields") or []
        sep = params.get("separator", "-")
        gp = params.get("globalPrefix", "") or ""
        gs = params.get("globalSuffix", "") or ""
        parts = []
        for f in fields:
            fn = f.get("fieldName") or ""
            pre = f.get("prefix", "") or ""
            suf = f.get("suffix", "") or ""
            val = _to_str(_ci_get(transformed, fn))
            parts.append(f"{pre}{val}{suf}")
        return f"{gp}{sep.join(parts)}{gs}"

    if rule_type == "IfThen":
        source_field = params.get("sourceField")
        source_fields = params.get("sourceFields") or []
        condition = params.get("condition", "")
        true_value = params.get("trueValue", "")
        false_value = params.get("falseValue", "")

        value = _to_str(_ci_get(source_record, source_field)) if source_field else ""
        if not value and source_fields:
            value = _to_str(_ci_get(source_record, source_fields[0]))

        selected = true_value if _eval_condition(value, condition) else false_value
        return _replace_placeholders(_to_str(selected), source_record)

    if rule_type == "Case":
        source_field = params.get("sourceField", "")
        source_value = _to_str(_ci_get(source_record, source_field)).strip()
        for case in params.get("cases") or []:
            if source_value.lower() == _to_str(case.get("case")).strip().lower():
                return case.get("value", "")
        # No match — resolve default: field reference takes priority over static value
        default_field = params.get("defaultFieldName") or params.get("sourceField", "")
        if default_field:
            field_val = _ci_get(source_record, default_field)
            return _to_str(field_val) if field_val is not None else ""
        return params.get("defaultValue", "")

    if rule_type == "Coalesce":
        for f in params.get("sourceFields") or []:
            v = _to_str(_ci_get(source_record, f)).strip()
            if v:
                return v
        return params.get("defaultValue", "")

    if rule_type == "Concat":
        fields = params.get("sourceFields") or []
        sep = params.get("separator", "")
        prefix = params.get("prefix", "") or ""
        suffix = params.get("suffix", "") or ""
        values = [_to_str(_ci_get(source_record, f)).strip() for f in fields]
        values = [v for v in values if v]
        return f"{prefix}{sep.join(values)}{suffix}"

    return ""


def _apply_pk_rule(
    pk_rule: Dict[str, Any],
    source_record: Dict[str, Any],
    index: int,
    transformed: Dict[str, Any],
    lookup_tables: Dict[str, List[Dict[str, Any]]],
    sequence_counter_ref: Dict[str, int],
) -> Any:
    """Apply PK rule logic, including stateful sequence handling."""
    if not pk_rule:
        return ""

    rule_type = pk_rule.get("ruleType") or ""
    params = pk_rule.get("parameters") or {}

    if rule_type == "Static":
        return params.get("value", "")

    if rule_type == "Sequence":
        current = sequence_counter_ref["value"]
        inc = _to_int(params.get("increment", 1), 1)
        sequence_counter_ref["value"] = current + inc
        return current

    if rule_type == "PrefixSequence":
        current = sequence_counter_ref["value"]
        sequence_counter_ref["value"] = current + 1
        prefix = params.get("prefix", "") or ""
        suffix = params.get("suffix", "") or ""
        padding = _to_int(params.get("padding", 0), 0)
        number = str(current).zfill(padding) if padding > 0 else str(current)
        return f"{prefix}{number}{suffix}"

    if rule_type == "Composite":
        fields = params.get("fields") or []
        sep = params.get("separator", "-")
        return sep.join([_to_str(_ci_get(transformed, f)) for f in fields])

    if rule_type == "CompositeConcat":
        return _apply_field_rule(pk_rule, source_record, index, transformed)

    if rule_type == "Lookup":
        return _resolve_lookup(source_record, pk_rule, lookup_tables)

    return _apply_field_rule(pk_rule, source_record, index, transformed)


def _extract_lookup_table_names(mapping: Dict[str, Any]) -> List[str]:
    """Collect lookup table names referenced by a mapping's field and PK rules."""
    names = set()

    def collect(rule: Optional[Dict[str, Any]]) -> None:
        if not rule:
            return
        rt = rule.get("ruleType")
        p = rule.get("parameters") or {}
        if rt == "Lookup":
            name = p.get("sourceTable") or p.get("lookupTable")
            if name:
                names.add(name)
        elif rt == "MultipleLookups":
            for step in p.get("lookupSteps") or []:
                name = step.get("lookupTable")
                if name:
                    names.add(name)

    for fm in mapping.get("fieldMappings") or []:
        collect(fm.get("fieldRule"))

    collect(mapping.get("primaryKeyRule"))
    return list(names)


def _build_bridge_key(record: Dict[str, Any], join_fields: List[Dict[str, Any]], from_bridge: bool) -> str:
    """Build normalized join keys for bridge-table resolution."""
    parts = []
    for jf in join_fields:
        field_name = jf.get("bridgeField") if from_bridge else jf.get("entityField")
        val = _to_str(_ci_get(record, field_name or "")).strip()

        if from_bridge:
            prefix = jf.get("bridgePrefix", "") or ""
            suffix = jf.get("bridgeSuffix", "") or ""
        else:
            prefix = jf.get("entityPrefix", "") or ""
            suffix = jf.get("entitySuffix", "") or ""

        parts.append((prefix + val + suffix).lower())
    return "||".join(parts)


def _load_source_table(
    spark: SparkSession,
    source_base_path: str,
    table_name: str,
    source_format: str,
    debug: bool = True,
) -> Optional[DataFrame]:
    """Load one source table using Spark with robust path and format fallbacks."""
    entries: List[str] = []
    try:
        entries = os.listdir(source_base_path)
    except Exception:
        entries = []

    lower_to_actual = {e.lower(): e for e in entries}

    candidates = [
        os.path.join(source_base_path, table_name),
        os.path.join(source_base_path, f"{table_name}.csv"),
        os.path.join(source_base_path, f"{table_name}.json"),
        os.path.join(source_base_path, f"{table_name}.parquet"),
    ]

    # Add case-insensitive matches from directory listing
    for suffix in ["", ".csv", ".json", ".parquet"]:
        lookup = f"{table_name}{suffix}".lower()
        actual = lower_to_actual.get(lookup)
        if actual:
            candidates.append(os.path.join(source_base_path, actual))

    # Preserve order but remove duplicates
    deduped_candidates = list(dict.fromkeys(candidates))

    for path in deduped_candidates:
        if not os.path.exists(path):
            continue

        if path.startswith("file:"):
            read_paths = [path]
        elif path.startswith("/lakehouse/"):
            # In Fabric notebooks, direct /lakehouse paths often trigger ABFS HEAD 400 during Spark checks.
            # Prefer file: URI to avoid noisy failures.
            read_paths = [f"file:{path}"]
        else:
            read_paths = [path, f"file:{path}"]

        for read_path in read_paths:
            try:
                if debug:
                    print(f"[DEBUG] Trying source path for '{table_name}': {read_path}")
                if source_format.lower() == "csv" or path.endswith(".csv"):
                    return spark.read.option("header", True).option("inferSchema", True).csv(read_path)
                if source_format.lower() == "json" or path.endswith(".json"):
                    return spark.read.option("multiLine", True).json(read_path)
                if source_format.lower() == "parquet" or path.endswith(".parquet"):
                    return spark.read.parquet(read_path)
            except Exception as ex:
                if debug:
                    print(f"[DEBUG] Failed reading source path for '{table_name}': {read_path} | {str(ex)}")

        # Fallback for CSV in environments where Spark can't read the local path directly
        if source_format.lower() == "csv" or path.endswith(".csv"):
            try:
                with open(path, "r", encoding="utf-8-sig", newline="") as fh:
                    rows = list(csv.DictReader(fh))
                if rows:
                    if debug:
                        print(f"[DEBUG] Loaded source table via Python CSV fallback: {table_name} ({len(rows)} rows)")
                    return spark.createDataFrame(rows)
                if debug:
                    print(f"[DEBUG] CSV fallback read zero rows for table '{table_name}'")
            except Exception as ex:
                if debug:
                    print(f"[DEBUG] CSV fallback failed for '{table_name}': {path} | {str(ex)}")

    if debug:
        print(f"[DEBUG] No readable source path found for '{table_name}'. Checked {len(deduped_candidates)} candidate(s).")
    return None


def _to_rows(df: DataFrame) -> List[Dict[str, Any]]:
    """Materialize a DataFrame into Python dictionaries for rule-based processing."""
    return [r.asDict(recursive=True) for r in df.collect()]


def _transform_regular_mapping(
    spark: SparkSession,
    mapping: Dict[str, Any],
    source_df: DataFrame,
    lookup_tables: Dict[str, List[Dict[str, Any]]],
) -> DataFrame:
    """Transform a regular (non-bridge) mapping into ISA95 entity rows."""
    filtered_df = _apply_filters(source_df, mapping.get("filters"))
    source_rows = _to_rows(filtered_df)

    out_rows: List[Dict[str, Any]] = []
    pk_rule = mapping.get("primaryKeyRule")
    sequence_counter = {"value": _to_int(((pk_rule or {}).get("parameters") or {}).get("start", 1), 1)}

    for idx, src in enumerate(source_rows):
        transformed: Dict[str, Any] = {}

        for fm in mapping.get("fieldMappings") or []:
            if not fm.get("generate", False):
                continue

            field_name = fm.get("fieldName")
            field_rule = fm.get("fieldRule")

            if field_rule:
                rt = field_rule.get("ruleType")
                if rt == "Lookup":
                    transformed[field_name] = _resolve_lookup(src, field_rule, lookup_tables)
                elif rt == "MultipleLookups":
                    transformed[field_name] = _resolve_multiple_lookups(src, field_rule, lookup_tables)
                else:
                    transformed[field_name] = _apply_field_rule(field_rule, src, idx, transformed)
            elif fm.get("sourceColumn"):
                transformed[field_name] = _ci_get(src, fm.get("sourceColumn"), "")
            else:
                transformed[field_name] = ""

        if pk_rule:
            transformed["PrimaryKey"] = _apply_pk_rule(pk_rule, src, idx, transformed, lookup_tables, sequence_counter)

        out_rows.append(transformed)

    if not out_rows:
        return spark.createDataFrame([], "dummy string").drop("dummy")

    return spark.createDataFrame(out_rows)


def _build_entity_cache_for_bridge(
    spark: SparkSession,
    mappings: List[Dict[str, Any]],
    all_source_dfs: Dict[str, DataFrame],
    target_entity: str,
) -> List[Dict[str, Any]]:
    """Build transformed entity rows used as lookup cache by bridge mappings."""
    rows: List[Dict[str, Any]] = []

    entity_mappings = [m for m in mappings if not m.get("isBridge") and m.get("targetEntity") == target_entity and m.get("enabled", True)]
    for em in entity_mappings:
        source_table = em.get("sourceTable")
        src_df = all_source_dfs.get(source_table)
        if src_df is None:
            continue

        lookup_tables = {}
        for name in _extract_lookup_table_names(em):
            if name in all_source_dfs:
                lookup_tables[name] = _to_rows(all_source_dfs[name])

        transformed_df = _transform_regular_mapping(spark, em, src_df, lookup_tables)
        rows.extend(_to_rows(transformed_df))

    return rows


def _transform_bridge_mapping(
    spark: SparkSession,
    mapping: Dict[str, Any],
    source_df: DataFrame,
    all_mappings: List[Dict[str, Any]],
    all_source_dfs: Dict[str, DataFrame],
) -> DataFrame:
    """Transform bridge mappings into source-target relationship rows."""
    filtered_df = _apply_filters(source_df, mapping.get("filters"))
    source_rows = _to_rows(filtered_df)

    entity1 = mapping.get("bridgeEntity1")
    entity2 = mapping.get("bridgeEntity2")
    source_type_label = _format_entity_name_for_output(entity1 or "")
    target_type_label = _format_entity_name_for_output(entity2 or "")
    entity1_join = mapping.get("bridgeEntity1JoinFields") or []
    entity2_join = mapping.get("bridgeEntity2JoinFields") or []

    e1_rows = _build_entity_cache_for_bridge(spark, all_mappings, all_source_dfs, entity1)
    e2_rows = _build_entity_cache_for_bridge(spark, all_mappings, all_source_dfs, entity2)

    e1_index = {_build_bridge_key(r, entity1_join, from_bridge=False): r for r in e1_rows}
    e2_index = {_build_bridge_key(r, entity2_join, from_bridge=False): r for r in e2_rows}

    out_rows: List[Dict[str, Any]] = []
    pk_rule = mapping.get("primaryKeyRule")
    sequence_counter = {"value": _to_int(((pk_rule or {}).get("parameters") or {}).get("start", 1), 1)}

    for idx, src in enumerate(source_rows):
        out = {
            "Source type": source_type_label,
            "Source PrimaryKey": "",
            "Target Type": target_type_label,
            "Target PrimaryKey": "",
            "Relationship Type": mapping.get("relationshipType") or "related",
        }

        if entity1_join:
            k1 = _build_bridge_key(src, entity1_join, from_bridge=True)
            out["Source PrimaryKey"] = _ci_get(e1_index.get(k1, {}), "PrimaryKey", "")

        if entity2_join:
            k2 = _build_bridge_key(src, entity2_join, from_bridge=True)
            out["Target PrimaryKey"] = _ci_get(e2_index.get(k2, {}), "PrimaryKey", "")

        if pk_rule:
            out["PrimaryKey"] = _apply_pk_rule(pk_rule, src, idx, out, {}, sequence_counter)

        out_rows.append(out)

    if not out_rows:
        return spark.createDataFrame([], "dummy string").drop("dummy")

    return spark.createDataFrame(out_rows)


def _write_output_csv(df: DataFrame, output_path: str) -> str:
    """Write a DataFrame as Spark CSV output folder (legacy helper)."""
    local_path = output_path
    if local_path.startswith("file:"):
        local_path = local_path[len("file:"):]

    try:
        if os.path.isdir(local_path):
            shutil.rmtree(local_path)
        elif os.path.isfile(local_path):
            os.remove(local_path)
    except Exception:
        # Let Spark write attempt surface the real error if cleanup is not possible
        pass

    spark_output_path = output_path
    if output_path.startswith("/lakehouse/") and not output_path.startswith("file:"):
        spark_output_path = f"file:{output_path}"

    df.coalesce(1).write.mode("overwrite").option("header", True).csv(spark_output_path)
    return output_path


def _format_entity_name_for_output(entity_name: str) -> str:
    """Normalize entity names into spaced title-case labels for outputs."""
    if not entity_name:
        return ""

    spaced = entity_name.replace("_", " ").replace("-", " ")
    spaced = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", spaced)
    spaced = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1 \2", spaced)
    spaced = re.sub(r"\s+", " ", spaced).strip()

    def _expand_token(token: str) -> str:
        lower = token.lower()
        if not lower.isalpha():
            return lower.title()

        parts: List[str] = []
        idx = 0
        while idx < len(lower):
            matched = None
            for term in _KNOWN_ISA95_TERMS:
                if lower.startswith(term, idx):
                    matched = term
                    break

            if matched is None:
                return lower.title()

            parts.append(matched.title())
            idx += len(matched)

        return " ".join(parts)

    tokens = [t for t in spaced.split(" ") if t]
    return " ".join(_expand_token(t) for t in tokens)


def _csv_escape(value: Any) -> str:
    """Escape one CSV value according to RFC-like quoting rules."""
    text = "" if value is None else str(value)
    if any(ch in text for ch in [",", '"', "\n", "\r"]):
        return '"' + text.replace('"', '""') + '"'
    return text


def _write_entity_csv_files(
    df: DataFrame,
    output_dir: str,
    entity_name: str,
    max_split_file_size_mb: int,
) -> List[str]:
    """Write entity data into one or more CSV files based on size limits."""
    os.makedirs(output_dir, exist_ok=True)

    columns = df.columns
    if not columns:
        return []

    clamped_mb = max(1, min(10, int(max_split_file_size_mb)))
    max_file_bytes = clamped_mb * 1024 * 1024

    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    base_name = _format_entity_name_for_output(entity_name)
    header_line = ",".join(columns)
    header_bytes = len((header_line + "\n").encode("utf-8"))

    files: List[str] = []
    file_index = 1
    current_file = None
    current_bytes = 0
    records_in_current_file = 0

    def _open_file(index: int):
        if index == 1:
            file_name = f"{base_name}_{timestamp}.csv"
        else:
            file_name = f"{base_name}_{timestamp}_{index:02d}.csv"
        file_path = os.path.join(output_dir, file_name)
        handle = open(file_path, "w", encoding="utf-8", newline="")
        handle.write(header_line + "\n")
        files.append(file_path)
        return handle, header_bytes, 0

    current_file, current_bytes, records_in_current_file = _open_file(file_index)

    try:
        for row in df.toLocalIterator():
            row_data = row.asDict(recursive=True)
            line = ",".join(_csv_escape(row_data.get(col)) for col in columns)
            line_bytes = len((line + "\n").encode("utf-8"))

            if records_in_current_file > 0 and current_bytes + line_bytes > max_file_bytes:
                current_file.close()
                file_index += 1
                current_file, current_bytes, records_in_current_file = _open_file(file_index)

            current_file.write(line + "\n")
            current_bytes += line_bytes
            records_in_current_file += 1
    finally:
        if current_file is not None:
            current_file.close()

    return files


def _write_mapping_csv_files(
    df: DataFrame,
    output_dir: str,
    mapping_name: str,
    max_split_file_size_mb: int,
) -> List[str]:
    """Write mapping relationship data into one or more CSV files based on size limits."""
    os.makedirs(output_dir, exist_ok=True)

    columns = df.columns
    if not columns:
        return []

    clamped_mb = max(1, min(10, int(max_split_file_size_mb)))
    max_file_bytes = clamped_mb * 1024 * 1024

    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    base_name = mapping_name
    header_line = ",".join(columns)
    header_bytes = len((header_line + "\n").encode("utf-8"))

    files: List[str] = []
    file_index = 1
    current_file = None
    current_bytes = 0
    records_in_current_file = 0

    def _open_file(index: int):
        if index == 1:
            file_name = f"{base_name}_{timestamp}.csv"
        else:
            file_name = f"{base_name}_{timestamp}_{index:02d}.csv"
        file_path = os.path.join(output_dir, file_name)
        handle = open(file_path, "w", encoding="utf-8", newline="")
        handle.write(header_line + "\n")
        files.append(file_path)
        return handle, header_bytes, 0

    current_file, current_bytes, records_in_current_file = _open_file(file_index)

    try:
        for row in df.toLocalIterator():
            row_data = row.asDict(recursive=True)
            line = ",".join(_csv_escape(row_data.get(col)) for col in columns)
            line_bytes = len((line + "\n").encode("utf-8"))

            if records_in_current_file > 0 and current_bytes + line_bytes > max_file_bytes:
                current_file.close()
                file_index += 1
                current_file, current_bytes, records_in_current_file = _open_file(file_index)

            current_file.write(line + "\n")
            current_bytes += line_bytes
            records_in_current_file += 1
    finally:
        if current_file is not None:
            current_file.close()

    return files


def _debug_print_source_path(source_base_path: str, debug: bool, max_items: int = 200) -> None:
    """Print source folder diagnostics to help troubleshooting in Fabric."""
    if not debug:
        return

    print(f"[DEBUG] SOURCE_BASE_PATH = {source_base_path}")
    exists = os.path.exists(source_base_path)
    print(f"[DEBUG] SOURCE_BASE_PATH exists = {exists}")

    if not exists:
        return

    try:
        entries = sorted(os.listdir(source_base_path))
        print(f"[DEBUG] SOURCE_BASE_PATH item count = {len(entries)}")
        preview = entries[:max_items]
        for name in preview:
            full = os.path.join(source_base_path, name)
            if os.path.isdir(full):
                print(f"[DEBUG]   DIR  {name}")
            else:
                try:
                    size = os.path.getsize(full)
                    print(f"[DEBUG]   FILE {name} ({size} bytes)")
                except Exception:
                    print(f"[DEBUG]   FILE {name}")

        if len(entries) > max_items:
            print(f"[DEBUG]   ... ({len(entries) - max_items} more items)")
    except Exception as ex:
        print(f"[DEBUG] Failed to list SOURCE_BASE_PATH: {str(ex)}")


def run_migration(
    spark: SparkSession,
    config_path: str,
    source_base_path: str,
    output_base_path: str,
    source_format: str = "csv",
    max_split_file_size_mb: int = 10,
    debug: bool = True,
) -> MigrationResult:
    """Execute end-to-end migration, write outputs, and emit run/entity ingestion logs."""
    run_started_at = _utc_now_iso()
    if debug:
        print(f"[DEBUG] CONFIG_PATH = {config_path}")
    config_exists = os.path.exists(config_path)
    if debug:
        print(f"[DEBUG] CONFIG_PATH exists = {config_exists}")

    if not config_exists:
        raise FileNotFoundError(f"Config file not found: {config_path}")

    with open(config_path, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    if debug:
        print("[DEBUG] Config file loaded successfully")

    _debug_print_source_path(source_base_path, debug)

    mappings = cfg.get("mappings") or []
    if debug:
        print(f"[DEBUG] Total mappings in config = {len(mappings)}")
    enabled_mappings = [m for m in mappings if m.get("enabled", True)]
    if debug:
        print(f"[DEBUG] Enabled mappings = {len(enabled_mappings)}")

    successful = 0
    failed = 0
    skipped = 0
    failed_items: List[str] = []
    skipped_items: List[str] = []
    outputs: List[str] = []

    source_tables = sorted({m.get("sourceTable") for m in enabled_mappings if m.get("sourceTable")})
    if debug:
        print(f"[DEBUG] Referenced source tables = {len(source_tables)}")
    all_source_dfs: Dict[str, DataFrame] = {}
    missing_source_tables: List[str] = []
    for table in source_tables:
        df = _load_source_table(spark, source_base_path, table, source_format, debug=debug)
        if df is not None:
            all_source_dfs[table] = df
            if debug:
                print(f"[DEBUG] Loaded source table: {table}")
        else:
            if debug:
                print(f"[DEBUG] Source table not found/readable: {table}")
            missing_source_tables.append(table)

    if debug:
        print(f"[DEBUG] Loaded source DataFrames = {len(all_source_dfs)}")
    if missing_source_tables:
        print(f"Missing source tables ({len(missing_source_tables)}):")
        for t in missing_source_tables:
            print(f"  - {t}")

    sorted_mappings = sorted(enabled_mappings, key=lambda m: 1 if m.get("isBridge") else 0)

    run_timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S-%f")[:-3]
    version_id = run_timestamp
    run_output_base_path = os.path.join(output_base_path, f"migration_{run_timestamp}")

    mapping_dir = os.path.join(run_output_base_path, "mapping")
    logs_dir = os.path.join(run_output_base_path, "logs")
    os.makedirs(run_output_base_path, exist_ok=True)
    os.makedirs(mapping_dir, exist_ok=True)
    os.makedirs(logs_dir, exist_ok=True)

    if debug:
        print(f"[DEBUG] Run output folder: {run_output_base_path}")
        print(f"[DEBUG] Version ID: {version_id}")

    ingestion_items: List[Dict[str, Any]] = []

    # Process each enabled mapping and capture per-item ingestion telemetry.
    for mapping in sorted_mappings:
        source_table = mapping.get("sourceTable")
        target_entity = mapping.get("targetEntity")
        item_id = f"{source_table} → {target_entity}"
        item_started_at = _utc_now_iso()
        item_kind = "mapping" if mapping.get("isBridge") else "entity"
        source_total_rowcount = 0
        ingested_rowcount = 0
        output_paths: List[str] = []

        try:
            source_df = all_source_dfs.get(source_table)
            # Source table missing/empty -> mark as skipped with reason and error code.
            if source_df is None or source_df.rdd.isEmpty():
                item_ended_at = _utc_now_iso()
                reason = "Source table empty or not found"
                skipped += 1
                skipped_items.append(f"{item_id} | {reason}")
                ingestion_items.append({
                    "version_id": version_id,
                    "item_id": item_id,
                    "kind": item_kind,
                    "source_table": source_table,
                    "target_entity": target_entity,
                    "is_bridge": bool(mapping.get("isBridge")),
                    "status": "skipped",
                    "reason": reason,
                    "error_code": "SOURCE_NOT_FOUND_OR_EMPTY",
                    "error_message": "",
                    "source_total_rowcount": source_total_rowcount,
                    "ingested_rowcount": ingested_rowcount,
                    "output_files": output_paths,
                    "started_at": item_started_at,
                    "ended_at": item_ended_at,
                })
                continue

            source_total_rowcount = source_df.count()

            lookup_tables: Dict[str, List[Dict[str, Any]]] = {}
            for ln in _extract_lookup_table_names(mapping):
                if ln in all_source_dfs:
                    lookup_tables[ln] = _to_rows(all_source_dfs[ln])

            # Bridge mappings and regular entity mappings are transformed via dedicated logic.
            if mapping.get("isBridge"):
                out_df = _transform_bridge_mapping(spark, mapping, source_df, sorted_mappings, all_source_dfs)
                mapping_files = _write_mapping_csv_files(
                    out_df,
                    mapping_dir,
                    target_entity,
                    max_split_file_size_mb=max_split_file_size_mb,
                )
                outputs.extend(mapping_files)
                output_paths = mapping_files
            else:
                out_df = _transform_regular_mapping(spark, mapping, source_df, lookup_tables)
                entity_files = _write_entity_csv_files(
                    out_df,
                    run_output_base_path,
                    target_entity,
                    max_split_file_size_mb=max_split_file_size_mb,
                )
                outputs.extend(entity_files)
                output_paths = entity_files

            ingested_rowcount = out_df.count()
            item_ended_at = _utc_now_iso()

            successful += 1
            # Persist successful item metrics, timing, and produced output files.
            ingestion_items.append({
                "version_id": version_id,
                "item_id": item_id,
                "kind": item_kind,
                "source_table": source_table,
                "target_entity": target_entity,
                "is_bridge": bool(mapping.get("isBridge")),
                "status": "successful",
                "reason": "",
                "error_code": "",
                "error_message": "",
                "source_total_rowcount": source_total_rowcount,
                "ingested_rowcount": ingested_rowcount,
                "output_files": output_paths,
                "started_at": item_started_at,
                "ended_at": item_ended_at,
            })
        except Exception as ex:
            item_ended_at = _utc_now_iso()
            error_code = ex.__class__.__name__
            error_message = str(ex)
            failed += 1
            failed_items.append(f"{item_id} | {error_message}")
            # Persist failure diagnostics including exception class as error code.
            ingestion_items.append({
                "version_id": version_id,
                "item_id": item_id,
                "kind": item_kind,
                "source_table": source_table,
                "target_entity": target_entity,
                "is_bridge": bool(mapping.get("isBridge")),
                "status": "failed",
                "reason": "Processing error",
                "error_code": error_code,
                "error_message": error_message,
                "source_total_rowcount": source_total_rowcount,
                "ingested_rowcount": ingested_rowcount,
                "output_files": output_paths,
                "started_at": item_started_at,
                "ended_at": item_ended_at,
            })

    run_ended_at = _utc_now_iso()
    # Final run summary used in the structured log file.
    summary = {
        "successful": successful,
        "failed": failed,
        "skipped": skipped,
        "total_mappings": len(sorted_mappings),
        "total_outputs": len(outputs),
    }
    log_file_path = _write_run_log(
        logs_dir=logs_dir,
        version_id=version_id,
        run_started_at=run_started_at,
        run_ended_at=run_ended_at,
        summary=summary,
        items=ingestion_items,
    )
    outputs.append(log_file_path)

    return MigrationResult(
        successful=successful,
        failed=failed,
        skipped=skipped,
        failed_items=failed_items,
        skipped_items=skipped_items,
        outputs=outputs,
        version_id=version_id,
        run_output_path=run_output_base_path,
        log_file_path=log_file_path,
    )


def _print_result(result: MigrationResult) -> None:
    """Print human-readable summary after run completion."""
    print("Migration complete!")
    print(f"  Version ID: {result.version_id}")
    print(f"  Successful: {result.successful}")
    print(f"  Failed:     {result.failed}")
    print(f"  Skipped:    {result.skipped}")
    print(f"  Run folder: {result.run_output_path}")
    print(f"  Log file:   {result.log_file_path}")

    if result.failed_items:
        print("Failed mappings:")
        for i in result.failed_items:
            print(f"  - {i}")

    if result.skipped_items:
        print("Skipped mappings:")
        for i in result.skipped_items:
            print(f"  - {i}")

    if result.outputs:
        print("Output folders:")
        for o in result.outputs:
            print(f"  - {o}")


def main() -> None:
    """CLI entry point for Fabric/standalone execution."""
    parser = argparse.ArgumentParser(description="ISA-95 mapping migration runner for PySpark/Fabric")
    parser.add_argument("--config", required=True, help="Path to exported mapping JSON file")
    parser.add_argument("--source-base", required=True, help="Base folder containing source tables")
    parser.add_argument("--output-base", required=True, help="Output base folder for generated CSV files")
    parser.add_argument("--source-format", default="csv", choices=["csv", "json", "parquet"], help="Source table file format")
    parser.add_argument("--max-split-file-size-mb", type=int, default=10, help="Max split size for ISA95 entity CSV files (1-10 MB)")
    parser.set_defaults(debug=True)
    parser.add_argument("--debug", dest="debug", action="store_true", help="Enable verbose debug logs")
    parser.add_argument("--no-debug", dest="debug", action="store_false", help="Disable verbose debug logs")

    args = parser.parse_args()

    spark = SparkSession.builder.appName("ISA95_PySpark_Migration").getOrCreate()
    result = run_migration(
        spark=spark,
        config_path=args.config,
        source_base_path=args.source_base,
        output_base_path=args.output_base,
        source_format=args.source_format,
        max_split_file_size_mb=args.max_split_file_size_mb,
        debug=args.debug,
    )
    _print_result(result)


if __name__ == "__main__":
    main()
