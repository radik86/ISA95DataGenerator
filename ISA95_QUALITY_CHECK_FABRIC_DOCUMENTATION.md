# ISA-95 Quality Check — Fabric Notebook & Python Validator Documentation

**Version**: 1.0  
**Last Updated**: April 29, 2026  
**Status**: Production Ready

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture & Component Overview](#2-architecture--component-overview)
3. [File Inventory](#3-file-inventory)
4. [Technical Implementation](#4-technical-implementation)
   - [Validator Core (`validate_isa95_entities_and_mappings.py`)](#41-validator-core)
   - [Fabric Notebook (`isa95_quality_check_fabric.ipynb`)](#42-fabric-notebook)
   - [DTDL Metadata Cache (`dtdl_metadata_cache.json`)](#43-dtdl-metadata-cache)
   - [Value Rules Config (`quality-value-rules.json`)](#44-value-rules-config)
   - [Validation Report (`quality-check-report.json`)](#45-validation-report-output)
5. [Validation Rules Reference](#5-validation-rules-reference)
6. [Configuration Guide](#6-configuration-guide)
7. [How to Use](#7-how-to-use)
8. [How to Maintain & Adjust Rules](#8-how-to-maintain--adjust-rules)
9. [Execution Modes](#9-execution-modes)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. System Overview

The ISA-95 Quality Check system validates migrated ISA-95 CSV data **before or after** it is loaded into a target system. It runs as a standalone Python script or inside a **Microsoft Fabric notebook** (PySpark-compatible), and checks:

- **Referential integrity** — mapping file foreign keys resolve to real entity primary keys
- **Enum validation** — constrained fields contain only DTDL-defined allowed values
- **Timestamp format** — `sourceTimeStamp` is present, formatted as `yyyy-MM-ddTHH:mm:ss.fffZ`, and within an allowed date window
- **Duration unit of measure** — `durationUnitofMeasure` is one of the supported values
- **Primary key checks** — PK columns exist, are populated, and are unique per entity
- **Mandatory column checks** — DTDL-mandatory fields are present and non-empty
- **Value-presence rules** — configurable checks that specific values appear in entity data (e.g. `MaterialCode` in `MaterialDefinitionProperty`)

---

## 2. Architecture & Component Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Microsoft Fabric Notebook                                │
│              isa95_quality_check_fabric.ipynb                                │
│                                                                              │
│  Cell 1 · Configure Paths      Cell 3 · Run Validation                       │
│  ├─ LAKEHOUSE_ROOT             ├─ run_validation_for_notebook()               │
│  ├─ DATA_DIR (CSV input)       ├─ RI_MODE: "python" or "sql"                  │
│  ├─ SCRIPTS_DIR                └─ Writes report JSON                         │
│  ├─ METADATA_CACHE                                                            │
│  ├─ VALUE_RULES_CONFIG         Cell 4 · Inspect Issues                        │
│  └─ OUTPUT_JSON                Cell 5 · Row Counts Summary                    │
│                                Cell 6 · Full Report Explorer                  │
│  Cell 2 · Import Validator     Cell 7 · Fast Re-Run                           │
└─────────────────────────────────────────────────────────────────────────────┘
          │                                   │
          │ importlib.util                     │ writes JSON
          ▼                                   ▼
┌─────────────────────────┐      ┌───────────────────────────────┐
│  validate_isa95_entities │      │  quality-check-report.json     │
│  _and_mappings.py        │      │  (output — Lakehouse)          │
│                          │      └───────────────────────────────┘
│  class Validator         │
│  ├─ load_dtdl()          │      ┌───────────────────────────────┐
│  ├─ load_csv_tables()    │◄─────│  dtdl_metadata_cache.json      │
│  ├─ validate_*()         │      │  (entity definitions cache)    │
│  └─ run()                │      └───────────────────────────────┘
│                          │
│  run_validation_for      │      ┌───────────────────────────────┐
│  _notebook() [API fn]    │◄─────│  quality-value-rules.json      │
│                          │      │  (configurable value rules)    │
└─────────────────────────┘      └───────────────────────────────┘
          ▲
          │ reads
┌─────────────────────────┐
│  ISA-95 CSV files        │
│  Entity files:           │
│  ├─ Equipment.csv        │
│  ├─ MaterialLot.csv      │
│  └─ ...                  │
│  Mapping files:          │
│  ├─ equipment_to_        │
│  │  equipmentclass_      │
│  │  mapping.csv          │
│  └─ ...                  │
└─────────────────────────┘
```

### Data Flow

```
CSV files (Lakehouse)
       │
       ▼
load_csv_tables()
  ├── Phase 1: Scan all headers (classify: entity or mapping)
  ├── Phase 2: Load mapping files + collect referenced entity types
  └── Phase 3: Load entity files
        ├── Referenced entities → full rows, PK + sourceTimestamp only (memory-efficient)
        └── Non-referenced entities → up to MAX_ROWS_PER_FILE rows, all columns
       │
       ▼
load_dtdl()
  ├── Try cache first (dtdl_metadata_cache.json)
  └── Fall back to DTDL directory (builds + writes cache)
       │
       ▼
Validation Passes
  ├── Per table:    sourceTimeStamp, durationUnitofMeasure
  ├── Entity tables: mandatory columns, enum values, PK existence/uniqueness
  ├── Global:       value-presence rules
  └── Mapping tables: referential integrity (FK against entity PK index)
       │
       ▼
Report JSON + print_report_summary()
```

---

## 3. File Inventory

| File | Location | Purpose |
|------|----------|---------|
| `validate_isa95_entities_and_mappings.py` | `scripts/` | Core validator — all validation logic, CLI entry point, notebook API |
| `isa95_quality_check_fabric.ipynb` | `templates/fabric/` | Microsoft Fabric notebook — orchestrates validation runs |
| `generate_dtdl_metadata_cache.py` | `scripts/` | Utility to pre-generate the DTDL metadata cache offline |
| `dtdl_metadata_cache.json` | `scripts/` (local) / Lakehouse `Files/isa95/config/` | Cached entity definitions (enums, PKs, mandatory cols) extracted from DTDL |
| `quality-value-rules.json` | Lakehouse `Files/isa95/config/` | Optional additional value-presence rules |
| `quality-check-report.json` | `scripts/` (local) / Lakehouse `Files/isa95_quality_output/` | Output: full issue list + summary |
| `isa95_validation_report.json` | `scripts/` | Sample/reference output for local runs |
| `InbuiltEntitiesDTDL/*.json` | `InbuiltEntitiesDTDL/` | Source DTDL entity definitions (70+ files) |

---

## 4. Technical Implementation

### 4.1 Validator Core

**File**: `scripts/validate_isa95_entities_and_mappings.py`

#### Key Classes

**`DtdlEntity`** — Parsed representation of one ISA-95 entity:

```python
@dataclass
class DtdlEntity:
    name: str                           # Entity name (e.g. "Equipment")
    source_file: str                    # Source DTDL file path
    aliases: Set[str]                   # Normalized name variants for matching
    mandatory_cols: List[str]           # Columns marked mandatory in DTDL
    primary_key_cols: List[str]         # Columns marked primaryKey in DTDL
    enum_values: Dict[str, Set[str]]    # field → allowed values
```

**`CsvTable`** — Loaded CSV file with smart column resolution:

```python
@dataclass
class CsvTable:
    path: Path
    headers: List[str]
    rows: List[Dict[str, str]]
    pk_only: bool        # True = only PK + sourceTimestamp loaded (memory-efficient)

    # stem_aliases      → normalized name variants of the file name
    # mapping_filename_types → parsed (src, tgt) from "*_to_*_mapping" naming
```

**`Validator`** — Orchestration class:

```python
class Validator:
    def load_dtdl(self)                         # Loads entity defs from cache or DTDL dir
    def load_csv_tables(self)                   # Reads all CSV files into memory
    def resolve_entity_metadata(table)          # Matches CSV to a DtdlEntity
    def validate_source_timestamp_column(table) # Rule: timestamp presence + format
    def validate_duration_unit(table)           # Rule: durationUnitofMeasure allowed values
    def validate_entity_table(table, entity)    # Rules: mandatory, enum, PK checks
    def validate_configured_value_presence_rules() # Rules: custom value presence
    def validate_mapping_referential_integrity(table) # Rule: FK → entity PK
    def run()                                   # Runs all validation passes, returns report dict
```

#### Entity Resolution Algorithm

When a CSV is loaded, the validator tries to identify which DTDL entity it represents:

1. **Name alias match** — normalises the CSV file stem (strips timestamps, spaces, plural `s`) and checks against all entity aliases in the cache.
2. **Column overlap fallback** — counts how many CSV headers match known mandatory/PK/enum columns for each entity. Requires a match score of ≥ 2 to avoid false positives.

This allows files named `Equipment_20260105T120000Z.csv`, `equipments.csv`, or `Equipment Output.csv` to all resolve to the `Equipment` entity.

#### Mapping File Detection

A CSV is treated as a mapping file if its headers contain all of:
```
sourceType, sourcePrimaryKey, targetType, targetPrimaryKey
```

OR its filename matches the pattern: `<source>_to_<target>_mapping[_timestamp]`

#### Memory Optimisation for Large Datasets

- Entity files **referenced in mapping files** are loaded with only `PrimaryKey` + `sourceTimestamp` columns (all rows). This keeps the in-memory PK index small.
- Entity files **not referenced** and mapping files load up to `MAX_ROWS_PER_FILE` rows (default: 50,000).
- Set `MAX_ROWS_PER_FILE = None` (notebook variable) to load all rows.

#### Notebook API Function

`run_validation_for_notebook()` is the primary entry point for the Fabric notebook:

```python
def run_validation_for_notebook(
    data_dirs: Sequence[str],          # CSV file directories to scan
    dtdl_dir: str = "",                # DTDL JSON files dir (for cache rebuild)
    metadata_cache: str = "...",       # Path to read/write cache
    refresh_metadata: bool = False,    # Force rebuild cache from DTDL
    output_json: str = "",             # Optional path to write report JSON
    max_past_days: int = 3650,         # sourceTimeStamp age limit (10 years)
    max_future_days: int = 30,         # sourceTimeStamp future limit
    include_master_process: bool = False, # Include masterdata/processdata folders
    max_rows_per_file: int = 50000,    # Row limit per file (None = unlimited)
    value_rules_config: str = "",      # Optional path to value-rules JSON
) -> Dict[str, Any]:                   # Returns full report dict
```

---

### 4.2 Fabric Notebook

**File**: `templates/fabric/isa95_quality_check_fabric.ipynb`

The notebook has 7 cells:

| Cell | Title | Purpose |
|------|-------|---------|
| 1 | Configure Paths | Set all Lakehouse paths and runtime parameters |
| 2 | Import Validator | Dynamically load validator script via `importlib.util` |
| 3 | Run Validation | Execute validation (python mode or SQL/Spark mode) |
| 4 | Inspect Top Issues | Print first 25 issues to notebook output |
| 5 | Row Counts | Print markdown tables of entity and mapping file counts |
| 6 | Full Report Explorer | Browse all issues with filter controls |
| 7 | Fast Re-Run | Re-run without DTDL rebuild (uses cache) |

#### Execution Modes (configured in cell 1)

```python
RI_MODE = "python"   # In-memory referential integrity check (default, no SQL needed)
RI_MODE = "sql"      # Spark SQL anti-join check (Fabric SQL Warehouse, future use)
```

#### Dynamic Script Import (cell 2)

The notebook does **not** use `%run` or `pip install`. It loads the validator script at runtime via:

```python
spec = importlib.util.spec_from_file_location("isa95_validator", str(validator_path))
validator_module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = validator_module   # Register so dataclass __module__ resolves correctly
spec.loader.exec_module(validator_module)
```

This means the validator script must be uploaded to the Lakehouse `Files/isa95/isa95_script/` folder.

---

### 4.3 DTDL Metadata Cache

**File**: `scripts/dtdl_metadata_cache.json` (local) / `Files/isa95/config/dtdl_metadata_cache.json` (Fabric)

The cache is a JSON file that stores extracted entity metadata so the full DTDL directory does not need to be present at validation time:

```json
{
  "version": 1,
  "generatedAtUtc": "2026-04-29T10:00:00+00:00",
  "dtdlDir": "/path/to/InbuiltEntitiesDTDL",
  "entities": [
    {
      "name": "Equipment",
      "source_file": "Equipment.json",
      "aliases": ["equipment", "equipments"],
      "mandatory_cols": ["primarykey", "name"],
      "primary_key_cols": ["primarykey"],
      "enum_values": {
        "equipmentlevel": ["Enterprise", "Site", "Area", "Work Center", "Equipment"]
      }
    }
  ]
}
```

**Generation** — Two ways to produce the cache:

**Option A** — Generate offline via helper script:
```powershell
cd scripts
python generate_dtdl_metadata_cache.py `
  --dtdl-dir ..\InbuiltEntitiesDTDL `
  --metadata-cache dtdl_metadata_cache.json
```

**Option B** — Auto-generate in notebook on first run by setting:
```python
refresh_metadata = True   # triggers rebuild from DTDL_DIR
```

---

### 4.4 Value Rules Config

**File**: `Files/isa95/config/quality-value-rules.json` (Fabric) — optional

Defines configurable value-presence rules in addition to the built-in `MaterialDefinitionProperty` check.

**Format**:

```json
{
  "rules": [
    {
      "name": "my_custom_rule",
      "entity": "MaterialDefinitionProperty",
      "entityAliases": ["materialdefinitionproperty", "materialdefinitionproperties"],
      "candidateColumns": ["description"],
      "expectedValues": ["MaterialCode", "DefaultUnitOfMeasure"],
      "compareMode": "exact",
      "missingValueRule": "material_definition_property_defaults_missing",
      "missingEntityRule": "material_definition_property_file_missing",
      "severity": "error"
    }
  ]
}
```

**Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Rule identifier for reporting |
| `entity` | string | Entity name to check (must match a DTDL entity) |
| `entityAliases` | array | Alternative name patterns for CSV file matching |
| `candidateColumns` | array | Column names to search within |
| `expectedValues` | array | Values that must appear at least once |
| `compareMode` | string | `exact` / `lowercase` / `normalized` — how values are compared |
| `missingValueRule` | string | Issue rule code when values are missing |
| `missingEntityRule` | string | Issue rule code when entity CSV is missing |
| `severity` | string | `error` / `warning` / `info` |

---

### 4.5 Validation Report Output

**File**: `quality-check-report.json`

```json
{
  "summary": {
    "dataDirs": ["generated"],
    "dtdlDir": "InbuiltEntitiesDTDL",
    "dtdlMetadataSource": "cache",
    "metadataCache": "generated/dtdl_metadata_cache.json",
    "csvFilesEvaluated": 42,
    "entityFilesEvaluated": 35,
    "mappingFilesEvaluated": 7,
    "errors": 0,
    "warnings": 2
  },
  "issues": [
    {
      "severity": "error",
      "rule": "mapping_source_fk_broken",
      "file": "/path/to/equipment_to_equipmentclass_mapping.csv",
      "row": 5,
      "message": "Source PrimaryKey not found in source entity",
      "details": {
        "sourceType": "Equipment",
        "sourcePrimaryKey": "EQ-9999"
      }
    }
  ]
}
```

---

## 5. Validation Rules Reference

### Complete Rule Code Index

| Rule Code | Category | Severity | Description |
|-----------|----------|----------|-------------|
| `source_timestamp_missing` | Timestamp | Error | `sourceTimeStamp` column is absent in CSV |
| `source_timestamp_empty` | Timestamp | Error | `sourceTimeStamp` cell is blank |
| `source_timestamp_format` | Timestamp | Error | Does not match `yyyy-MM-ddTHH:mm:ss.fffZ` |
| `source_timestamp_range` | Timestamp | Error | Outside allowed past/future window |
| `duration_uom_invalid` | Duration | Error | `durationUnitofMeasure` not in: `milliseconds, seconds, minutes, hours, days` |
| `mandatory_column_missing` | Schema | Error | DTDL-mandatory column absent from CSV |
| `mandatory_value_missing` | Schema | Error | DTDL-mandatory column has empty value in a row |
| `enum_value_invalid` | Enum | Error | Field value not in DTDL-defined allowed set |
| `primary_key_column_missing` | PK | Error | DTDL-designated PK column absent from CSV |
| `primary_key_value_missing` | PK | Error | PK cell is empty in a row |
| `primary_key_duplicate` | PK | Error | Duplicate PK combination across rows |
| `primary_key_not_mandatory_in_dtdl` | PK | Warning | PK column not also marked mandatory in DTDL |
| `mapping_columns_missing` | Mapping | Error | Required mapping columns (`sourceType` etc.) absent |
| `mapping_required_field_missing` | Mapping | Error | Mapping row missing source/target type or PK |
| `mapping_source_fk_broken` | Referential Integrity | Error | `sourcePrimaryKey` not found in source entity |
| `mapping_target_fk_broken` | Referential Integrity | Error | `targetPrimaryKey` not found in target entity |
| `mapping_source_entity_unresolved` | Referential Integrity | Warning | `sourceType` cannot be matched to a loaded CSV |
| `mapping_target_entity_unresolved` | Referential Integrity | Warning | `targetType` cannot be matched to a loaded CSV |
| `mapping_source_type_vs_filename` | Mapping | Warning | `sourceType` value differs from filename pattern |
| `mapping_target_type_vs_filename` | Mapping | Warning | `targetType` value differs from filename pattern |
| `dtdl_entity_unresolved` | Schema | Warning | CSV cannot be matched to any DTDL entity |
| `dtdl_parse` | Setup | Error | Failed to parse a DTDL JSON file |
| `dtdl_cache_read` | Setup | Warning | Failed to read metadata cache |
| `dtdl_cache_write` | Setup | Warning | Failed to write metadata cache |
| `no_csv_found` | Setup | Warning | No CSV files found in provided directories |
| `csv_empty` | Setup | Warning | CSV has no headers |
| `csv_parse` | Setup | Error | Failed to parse a CSV file |
| `value_rules_config_missing` | Config | Warning | Configured value-rules JSON file not found |
| `value_rules_config_read` | Config | Warning | Failed to parse value-rules JSON |
| `value_rules_config_invalid` | Config | Warning | Value-rules JSON is not valid format |
| `value_rule_invalid` | Config | Warning | A value rule is missing required fields |
| `value_rule_required_values_missing` | Value | Error/Warning | Required values not found in entity CSV |
| `value_rule_entity_file_missing` | Value | Warning | Entity CSV for a value rule not found |
| `input_path` | Setup | Error | Data directory does not exist |

---

## 6. Configuration Guide

### Notebook Path Variables (Cell 1)

```python
LAKEHOUSE_ROOT = "/lakehouse/default"

DATA_DIR    = f"{LAKEHOUSE_ROOT}/Files/isa95_data"
# ↑ Root folder containing migrated CSV files.
#   Sub-folders are scanned recursively.

SCRIPTS_DIR = f"{LAKEHOUSE_ROOT}/Files/isa95/isa95_script"
# ↑ Must contain validate_isa95_entities_and_mappings.py

VALIDATOR_SCRIPT = f"{SCRIPTS_DIR}/validate_isa95_entities_and_mappings.py"

METADATA_CACHE   = f"{LAKEHOUSE_ROOT}/Files/isa95/config/dtdl_metadata_cache.json"
# ↑ Stores extracted entity definitions. Auto-built on first run if DTDL_DIR exists.

VALUE_RULES_CONFIG = f"{LAKEHOUSE_ROOT}/Files/isa95/config/quality-value-rules.json"
# ↑ Optional. Extra value-presence rules. Leave empty or non-existent to use defaults only.

OUTPUT_JSON = f"{LAKEHOUSE_ROOT}/Files/isa95_quality_output/quality-check-report.json"
# ↑ Where the full report is saved.

DTDL_DIR = f"{LAKEHOUSE_ROOT}/Files/InbuiltEntitiesDTDL"
# ↑ DTDL source files. Only needed to (re)build cache.

RI_MODE = "python"       # "python" (default) or "sql" (Spark anti-join, experimental)
MAX_ROWS_PER_FILE = 50_000   # Rows per file cap; set None to remove limit
```

### CLI Parameters (standalone usage)

```
--data-dirs          One or more directories with migrated CSV files (required)
--dtdl-dir           Directory with DTDL JSON files (required only for cache rebuild)
--metadata-cache     Read/write path for metadata cache (default: generated/dtdl_metadata_cache.json)
--refresh-metadata   Force rebuild cache from --dtdl-dir
--output-json        Optional file to write JSON report
--max-issues         Max issues to print in terminal (default: 20)
--max-past-days      sourceTimeStamp max age in days from now UTC (default: 3650)
--max-future-days    sourceTimeStamp max future offset in days from now UTC (default: 30)
--value-rules-config Optional path to value-rules JSON config
--include-master-process   Include masterdata/ and processdata/ folders (excluded by default)
```

### Timestamp Window Configuration

| Parameter | Default | Meaning |
|-----------|---------|---------|
| `max_past_days` | `3650` (10 years) | Timestamps older than this are flagged as errors |
| `max_future_days` | `30` | Timestamps more than this many days in the future are errors |

To tighten for recent migration data:
```python
# Notebook
report = run_validation_for_notebook(
    data_dirs=DATA_DIRS,
    metadata_cache=METADATA_CACHE,
    max_past_days=365,    # Only allow data from last year
    max_future_days=1,    # Maximum 1 day in future
)
```

```powershell
# CLI
python validate_isa95_entities_and_mappings.py `
  --data-dirs generated `
  --metadata-cache dtdl_metadata_cache.json `
  --max-past-days 365 `
  --max-future-days 1
```

---

## 7. How to Use

### Setup in Microsoft Fabric

**Step 1 — Upload files to Lakehouse**

Upload these files to your Fabric Lakehouse:

```
Files/
├── isa95/
│   ├── isa95_script/
│   │   └── validate_isa95_entities_and_mappings.py   ← validator script
│   └── config/
│       ├── dtdl_metadata_cache.json                  ← pre-generated or auto-built
│       └── quality-value-rules.json                  ← optional extra rules
├── InbuiltEntitiesDTDL/
│   ├── Equipment.json
│   ├── MaterialLot.json
│   └── ... (all 70+ DTDL files)                      ← needed for cache build
├── isa95_data/
│   └── ... (migrated CSV files)                      ← validation input
└── isa95_quality_output/                              ← report output (created automatically)
```

**Step 2 — Import the notebook**

Upload `templates/fabric/isa95_quality_check_fabric.ipynb` to Fabric.

**Step 3 — Update Cell 1 paths**

```python
DATA_DIR = f"{LAKEHOUSE_ROOT}/Files/isa95_data"
SCRIPTS_DIR = f"{LAKEHOUSE_ROOT}/Files/isa95/isa95_script"
# ... other paths
```

**Step 4 — First run (build cache)**

Run all cells in sequence. The notebook auto-detects if the cache is missing and builds it from DTDL files.

**Step 5 — Review output**

- Cell 4 shows the top 25 issues immediately
- Cell 5 shows row count summary tables
- Cell 6 allows filtering all issues by severity/rule/file
- Full report JSON is saved to `OUTPUT_JSON` for download

---

### Running Locally (CLI)

**First run — build cache from DTDL:**

```powershell
cd "c:\...\ISA95DataGenerator\scripts"

python validate_isa95_entities_and_mappings.py `
  --data-dirs ..\generated `
  --dtdl-dir ..\InbuiltEntitiesDTDL `
  --metadata-cache dtdl_metadata_cache.json `
  --refresh-metadata `
  --output-json isa95_validation_report.json
```

**Subsequent runs — use existing cache:**

```powershell
python validate_isa95_entities_and_mappings.py `
  --data-dirs ..\generated `
  --metadata-cache dtdl_metadata_cache.json `
  --output-json isa95_validation_report.json
```

**Pre-build cache only (no validation):**

```powershell
python generate_dtdl_metadata_cache.py `
  --dtdl-dir ..\InbuiltEntitiesDTDL `
  --metadata-cache dtdl_metadata_cache.json
```

---

### Interpreting the Report

**Summary block**:
```json
{
  "summary": {
    "csvFilesEvaluated": 42,
    "entityFilesEvaluated": 35,
    "mappingFilesEvaluated": 7,
    "errors": 3,
    "warnings": 8
  }
}
```

- `errors: 0` — data is clean
- `errors > 0` — data has must-fix violations: broken FKs, invalid enums, empty mandatory fields
- `warnings > 0` — data has potential issues: unresolved entity types, PK-not-mandatory mismatches

**Issue entry**:
```json
{
  "severity": "error",
  "rule": "mapping_source_fk_broken",
  "file": "equipment_to_equipmentclass_mapping.csv",
  "row": 5,
  "message": "Source PrimaryKey not found in source entity",
  "details": {
    "sourceType": "Equipment",
    "sourcePrimaryKey": "EQ-MISSING"
  }
}
```

- `file` — exact path to the offending CSV
- `row` — 1-based row number including header (row 2 = first data row)
- `details` — structured extra info for diagnosing the issue

---

## 8. How to Maintain & Adjust Rules

### Adding a New Value-Presence Rule

To require specific values to appear in a given entity's CSV, add a rule to `quality-value-rules.json`:

```json
{
  "rules": [
    {
      "name": "equipment_property_required_values",
      "entity": "EquipmentProperty",
      "entityAliases": ["equipmentproperty", "equipmentproperties"],
      "candidateColumns": ["name", "description"],
      "expectedValues": ["Capacity", "Temperature"],
      "compareMode": "normalized",
      "missingValueRule": "equipment_property_values_missing",
      "missingEntityRule": "equipment_property_file_missing",
      "severity": "warning"
    }
  ]
}
```

`compareMode` options:
- `exact` — case-sensitive exact match
- `lowercase` — case-insensitive match
- `normalized` — alphanumeric only, case-insensitive (most lenient; recommended for display strings)

---

### Adjusting the Timestamp Window

To allow older timestamps (e.g. historical data imports):

```python
# In notebook
report = run_validation_for_notebook(
    data_dirs=DATA_DIRS,
    metadata_cache=METADATA_CACHE,
    max_past_days=7300,  # Allow up to 20 years
)
```

To tighten for fresh migration data exclusively:
```python
max_past_days=180,   # Only last 6 months
max_future_days=0,   # No future timestamps
```

---

### Adding or Updating Enum Values

Enum values come from DTDL files in `InbuiltEntitiesDTDL/`. To add a new allowed value:

1. Open the relevant DTDL file, e.g. `InbuiltEntitiesDTDL/Equipment.json`
2. Find the `enumValues` array for the field
3. Add the new value:
   ```json
   {
     "name": "equipmentLevel",
     "enumValues": ["Enterprise", "Site", "Area", "Work Center", "Equipment", "Sub-Equipment"]
   }
   ```
4. Rebuild the metadata cache:
   ```powershell
   python generate_dtdl_metadata_cache.py `
     --dtdl-dir ..\InbuiltEntitiesDTDL `
     --metadata-cache dtdl_metadata_cache.json
   ```
5. In Fabric: upload the new `dtdl_metadata_cache.json` to `Files/isa95/config/` and re-run the notebook

---

### Changing the Mandatory Columns

Mandatory column checks come from DTDL files. In the DTDL JSON:

```json
{
  "columns": [
    {
      "name": "description",
      "mandatory": true,      ← Controls mandatory_column_missing and mandatory_value_missing rules
      "primaryKey": false
    }
  ]
}
```

Change `"mandatory": true/false` and rebuild the cache.

---

### Adding a New Entity Type

When a new ISA-95 entity is introduced:

1. Create a DTDL JSON file in `InbuiltEntitiesDTDL/MyNewEntity.json`:
   ```json
   {
     "name": "MyNewEntity",
     "columns": [
       { "name": "PrimaryKey", "primaryKey": true, "mandatory": true },
       { "name": "name",        "mandatory": true },
       { "name": "status",      "type": "enum", "enumValues": ["Active", "Inactive"] },
       { "name": "sourceTimeStamp", "mandatory": true }
     ]
   }
   ```
2. Rebuild cache: `python generate_dtdl_metadata_cache.py ...`
3. Upload updated cache to Fabric
4. Place entity CSV files in `DATA_DIR`
5. Re-run notebook — the new entity will be automatically validated

---

### Adjusting Row Limits

If large mapping files cause memory issues in Fabric:

```python
# In notebook Cell 1
MAX_ROWS_PER_FILE = 10_000    # Reduce limit
MAX_ROWS_PER_FILE = None      # Remove limit entirely (may cause OOM on very large files)
```

---

### Including Master/Process Data Folders

By default, CSVs in `masterdata/` and `processdata/` subfolders are excluded. To include them:

```python
# Notebook
report = run_validation_for_notebook(
    data_dirs=DATA_DIRS,
    include_master_process=True,   # Override default exclusion
)
```

```powershell
# CLI
python validate_isa95_entities_and_mappings.py `
  --data-dirs generated `
  --include-master-process ...
```

---

## 9. Execution Modes

### Python Mode (default, `RI_MODE = "python"`)

All referential integrity checks run in-memory in Python:

- Entity CSV PK columns are indexed into a `Set[str]` per entity type
- Mapping files are iterated row by row and each FK is looked up against the index
- Works without any database or Spark session
- Suitable for datasets up to a few million rows with `MAX_ROWS_PER_FILE` tuning

### SQL/Spark Mode (`RI_MODE = "sql"`)

Uses Spark DataFrames and SQL anti-joins for referential integrity:

- Creates a temporary Spark database (`ri_staging`)
- Loads mapping CSVs and referenced entity CSVs as Spark tables
- Runs `LEFT JOIN` anti-join queries to find broken foreign keys
- Returns issues in the same JSON format as Python mode
- Requires an active Spark session (Fabric notebook environment)

**When to use SQL mode**:
- Mapping files larger than 50,000 rows per file
- Entity files too large to fit in executor memory
- When Fabric SQL Warehouse is the authoritative data store

---

## 10. Troubleshooting

### Issue: `FileNotFoundError: Validator script not found`

**Cause**: `SCRIPTS_DIR` path does not contain the Python file.  
**Fix**: Upload `validate_isa95_entities_and_mappings.py` to `Files/isa95/isa95_script/` in the Lakehouse.

---

### Issue: `Neither metadata cache nor DTDL directory exists`

**Cause**: First run without uploading either the cache or the DTDL files.  
**Fix**: Upload either:
- `dtdl_metadata_cache.json` to `Files/isa95/config/`
- OR the full `InbuiltEntitiesDTDL/` folder to `Files/InbuiltEntitiesDTDL/` and set `refresh_metadata = True`

---

### Issue: `dtdl_entity_unresolved` warnings for all files

**Cause**: CSV file names do not align with any entity alias in the cache.  
**Diagnosis**: Check the exact entity names in the cache:
```python
import json
cache = json.loads(Path(METADATA_CACHE).read_text())
for e in cache["entities"]:
    print(e["name"], "→", e["aliases"])
```
**Fix**: Rename CSV files to match entity names, or add aliases to the DTDL file and rebuild cache.

---

### Issue: `mapping_source_entity_unresolved` for all mapping files

**Cause**: The entity CSVs for the types referenced in mappings are not in `DATA_DIR`, or file names don't match.  
**Fix**: Ensure all entity CSV files are in the same `DATA_DIR` and file names match entity names.

---

### Issue: Many `source_timestamp_range` errors for legitimate historical data

**Cause**: Default `max_past_days=3650` is too strict for very old data.  
**Fix**: Increase the window in notebook Cell 1:
```python
report = run_validation_for_notebook(
    data_dirs=DATA_DIRS,
    metadata_cache=METADATA_CACHE,
    max_past_days=9999,
)
```

---

### Issue: Report shows `csvFilesEvaluated: 0`

**Cause**: `DATA_DIR` does not exist or contains no `.csv` files at any depth.  
**Fix**: Verify the path in Cell 3 output:
```
DATA_DIR exists:  False -> /lakehouse/default/Files/isa95_data
```
Upload CSV files to the correct path or update `DATA_DIR`.

---

### Quick Reference: Fabric File Layout

```
Lakehouse Files/
├── isa95/
│   ├── isa95_script/
│   │   └── validate_isa95_entities_and_mappings.py
│   └── config/
│       ├── dtdl_metadata_cache.json
│       └── quality-value-rules.json            (optional)
├── InbuiltEntitiesDTDL/
│   └── *.json                                  (70+ entity files)
├── isa95_data/
│   └── **/*.csv                                (migrated data)
├── isa95_data_zip/
│   └── migration_*.zip                         (optional: zip input)
└── isa95_quality_output/
    ├── quality-check-report.json               (main report)
    └── counts/
        ├── entity_file_counts.csv
        ├── entity_consolidated_counts.csv
        ├── mapping_file_counts.csv
        └── mapping_consolidated_counts.csv
```
