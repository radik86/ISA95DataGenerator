# Fabric PySpark ISA-95 Migration Script

Use `templates/fabric/isa95_pyspark_migration.py` to execute Data Migration mappings outside the web app, using exported mapping JSON configuration.

## Inputs

- Mapping JSON exported from Data Migration (`Export Config` as JSON)
- Source tables in a base folder (CSV/JSON/Parquet)
  - Expected naming by source table name, e.g.:
    - `<source_base>/material_classes`
    - `<source_base>/material_classes.csv`

## Output

- Source-to-entity CSV folders: `<output_base>/<targetEntity>/...`
- Entity-to-entity (bridge) CSV folders: `<output_base>/mapping/<targetEntity>/...`

Each folder contains one Spark CSV output with headers.

## Notebook usage (Microsoft Fabric)

```python
from pyspark.sql import SparkSession
from templates.fabric.isa95_pyspark_migration import run_migration

spark = SparkSession.builder.getOrCreate()

result = run_migration(
    spark=spark,
    config_path="/lakehouse/default/Files/config/source_to_entity_mappings_2026-03-03.json",
    source_base_path="/lakehouse/default/Files/source_tables",
    output_base_path="/lakehouse/default/Files/isa95_output",
    source_format="csv",
)

print(result)
print(result.skipped_items)
print(result.failed_items)
```

## Job/CLI style usage

```bash
python templates/fabric/isa95_pyspark_migration.py \
  --config /lakehouse/default/Files/config/all_mappings_2026-03-03.json \
  --source-base /lakehouse/default/Files/source_tables \
  --output-base /lakehouse/default/Files/isa95_output \
  --source-format csv
```

## Current rule support

- Filters: `equals`, `not_equals`, `contains`, `not_contains`, `starts_with`, `ends_with`, `greater_than`, `less_than`, `is_null`, `is_not_null`, `is_empty`, `is_not_empty`
- Field rules: `Static`, `Range`, `Examples`, `Pattern`, `Sequence`, `PrefixSequence`, `Enumeration`, `IfThen`, `Case`, `Coalesce`, `Concat`, `Composite`, `CompositeConcat`, `Lookup`, `MultipleLookups`
- PK rules: `Static`, `Sequence`, `PrefixSequence`, `Composite`, `CompositeConcat`, `Lookup`, plus fallback to generic field-rule logic
- Bridge mapping join keys: supports `bridgeEntity1JoinFields` and `bridgeEntity2JoinFields` with prefixes/suffixes

## Notes

- This script follows the same mapping + configuration approach as Data Migration and supports both source-to-entity and bridge entity-to-entity generation.
- It is designed for Fabric notebook execution with PySpark and uses row-wise transformation for rule fidelity.
- For very large lookup tables, consider partitioned sources and/or optimizing lookup table handling in Spark-native joins.
