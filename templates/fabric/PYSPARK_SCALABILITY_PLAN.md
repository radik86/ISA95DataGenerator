# PySpark Migration Script — Scalability Improvement Plan

## Context

`isa95_pyspark_migration.py` currently uses Spark only as a file reader.
All transformation work happens driver-side in Python, with full table materialisation
via `df.collect()` / `_to_rows()`. This limits the effective dataset size to driver RAM
and makes the script behave as a single-node Python program regardless of cluster size.

This document describes three independent, prioritised improvements and provides an
implementation prompt for each. The improvements are designed to work on both
**Microsoft Fabric** (OneLake / Lakehouse paths) and **Databricks** (DBFS / Unity Catalog /
ABFSS paths).

---

## Improvement 1 — Selective bridge entity cache (fields-only projection)

### Problem

`_build_entity_cache_for_bridge` runs the full `_transform_regular_mapping` pipeline for
every entity referenced by a bridge (both sides), then keeps every transformed field in the
in-memory index dict. For large entities this is wasteful because the index is only ever
queried for:

1. `PrimaryKey` — to resolve `Source PrimaryKey` / `Target PrimaryKey`
2. Entity join fields (`entityField` from `bridgeEntity1JoinFields` / `bridgeEntity2JoinFields`)
3. Any field referenced by a bridge `fieldMapping` with a `sourceEntity` of `"Entity1"` or
   `"Entity2"` (typically `sourceTimeStamp`, or a small set of pass-through columns)

All other transformed fields are computed and immediately discarded.

### Proposed solution

Before building the cache, statically analyse the mapping config to compute the minimal set
of fields that each entity side actually needs. Only carry those fields in the index dict.

```
required_fields(entity_side) =
    {"PrimaryKey"}
    ∪ {jf["entityField"] for jf in bridgeEntityNJoinFields}
    ∪ {fm["fieldName"] for fm in bridge fieldMappings
       where fm["sourceEntity"] matches this entity side
       and fm["generate"] == true}
```

Pass `required_fields` into `_build_entity_cache_for_bridge` as a parameter. After transform,
slim each row dict to only those keys before adding it to the index.

### Expected benefit

- Memory footprint of the bridge index reduces proportionally to the ratio
  `len(required_fields) / len(all_transformed_fields)`.
  For a 50-field entity where only PrimaryKey + 1 join field + sourceTimeStamp are needed,
  this is a ~94 % reduction per row.
- No change to correctness — all consumed fields are preserved.
- No change to the transform logic itself; projection happens as a post-processing step.

### Implementation scope

- `_build_entity_cache_for_bridge`: add `required_fields: Optional[Set[str]]` parameter;
  slim row dicts after `_to_rows()`.
- New helper `_compute_bridge_field_requirements(mapping: Dict) -> Tuple[Set[str], Set[str]]`
  that returns `(entity1_required, entity2_required)`.
- Call site in `_transform_bridge_mapping`: compute requirements, pass to cache builder.

---

## Improvement 2 — Streaming transform via `toLocalIterator()`

### Problem

`_transform_regular_mapping` calls `_to_rows(filtered_df)` which internally calls
`df.collect()`. This materialises the entire source table into a Python list on the driver
before the processing loop starts. Peak driver memory = full table size.

`_transform_bridge_mapping` has the same issue for the bridge source rows.

### Proposed solution

Replace `df.collect()` (via `_to_rows`) with `df.toLocalIterator()` inside the main
processing loops. The iterator streams one row at a time from the executor to the driver;
peak driver memory becomes bounded by:

- one source row (bytes)
- all lookup table dicts (intentionally small reference tables)
- the accumulated output list `out_rows` (still grows, but only with *output* columns, not
  source columns)

The output list `out_rows` cannot be eliminated entirely because `spark.createDataFrame()`
needs a complete list. For very large outputs, this should be replaced with direct CSV
streaming using `toLocalIterator()` on the result DataFrame — but that is a separate
concern addressed in Improvement 3.

```python
# Before
source_rows = _to_rows(filtered_df)          # collect() — full table in RAM
for idx, src in enumerate(source_rows):

# After
for idx, src in enumerate(
    r.asDict(recursive=True) for r in filtered_df.toLocalIterator()
):
```

`_add_computed_fields` currently takes a full list and mutates it in place. It must be
refactored to either:
- (a) be called per-row inside the loop, or
- (b) pre-compute from the DataFrame before switching to iterator mode (acceptable for
  `segment_requirements` since it is typically small).

### Expected benefit

- Transforms tables of arbitrary row count without OOM on the driver.
- Works identically on Fabric and Databricks — `toLocalIterator()` is standard PySpark.
- Rule evaluation throughput is unchanged (still single-threaded Python).

### Implementation scope

- `_transform_regular_mapping`: replace `_to_rows(filtered_df)` with iterator.
- `_transform_bridge_mapping`: replace `_to_rows(filtered_df)` (bridge source rows) with
  iterator.
- `_add_computed_fields`: replace list mutation with per-row function
  `_apply_computed_fields_to_record(table_name, row_dict) -> None`.
- `_to_rows` helper: keep for lookup table materialisation (intentionally small tables);
  add a docstring note that it must not be used on large source tables.

---

## Improvement 3 — Fabric / Databricks path abstraction

### Problem

`_load_source_table` contains Fabric-specific path logic:

- `/lakehouse/…` paths are rewritten to `file:/lakehouse/…` for Spark reads.
- `os.path.exists()` and `os.listdir()` are used for path probing, which works on Fabric
  where the Lakehouse is mounted at `/lakehouse/` but fails on Databricks where storage
  lives at `dbfs:/` or `abfss://` URIs accessible only through Spark / DBFS APIs.
- The Python CSV fallback uses `open()` with a local file path — works on Fabric mount,
  fails when the source is cloud object storage on Databricks.

The notebook (`ISA95_Fabric_Migration.ipynb`) exposes `SOURCE_BASE_PATH` and
`OUTPUT_BASE_PATH` as configurable cells, but the path rewriting logic is buried inside
the script.

### Proposed solution

Introduce a `PLATFORM` configuration variable (either `"fabric"` or `"databricks"`) that
drives all path handling. Add it as a parameter to `run_migration` and to the notebook.

#### Platform-specific behaviour table

| Concern | Fabric | Databricks |
|---------|--------|------------|
| Local path prefix | `/lakehouse/` | `/dbfs/` (DBFS) or none (ABFSS) |
| Spark read URI prefix | `file:/lakehouse/…` | `dbfs:/…` or `abfss://…` |
| Path existence probe | `os.path.exists()` | `dbutils.fs.ls()` or Spark `_jvm` check |
| Python CSV fallback | `open(local_path)` | `dbutils.fs.cp()` to temp + `open()`, or skip fallback |
| Output path | `os.makedirs()` + local write | write via Spark to DBFS or object storage |
| `os.listdir()` for candidates | ✅ available | ❌ not available for ABFSS |

#### Implementation approach

1. Add a `PlatformConfig` dataclass (or simple dict) with fields:
   - `platform: Literal["fabric", "databricks"]`
   - `spark_read_prefix: str` — URI prefix to prepend for Spark reads
   - `local_read_available: bool` — whether `os.path` operations work for the source path
   - `output_use_spark_write: bool` — whether CSV output should use Spark writer instead
     of `open()`

2. `_load_source_table` accepts `platform_config: PlatformConfig` and uses it to:
   - Build the Spark read URI correctly for the active platform.
   - Skip `os.listdir()` candidate enumeration on Databricks (use Spark path directly).
   - Conditionally use the Python CSV fallback only when `local_read_available` is `True`.

3. The notebook gets a new configuration cell:
   ```python
   PLATFORM = "fabric"   # "fabric" | "databricks"
   ```

4. `run_migration` accepts `platform: str = "fabric"` and constructs the `PlatformConfig`
   internally before passing to all I/O functions.

5. Output write functions (`_write_entity_csv_files`, `_write_mapping_csv_files`) receive
   the config and, when `output_use_spark_write` is `True`, use
   `df.write.mode("overwrite").option("header", True).csv(spark_path)` instead of
   `open()` — restoring Spark's distributed multi-partition write for Databricks.

### Expected benefit

- Single script, two platforms — no fork to maintain.
- Databricks users set `PLATFORM = "databricks"` in the notebook; everything else is
  automatic.
- Output on Databricks uses Spark's native distributed writer, which scales with the
  cluster.

---

## Recommended implementation order

| # | Improvement | Effort | Risk | Priority |
|---|-------------|--------|------|----------|
| 1 | Selective bridge cache projection | Low | Low | High — immediate memory win, zero algorithmic change |
| 2 | Streaming via `toLocalIterator()` | Medium | Low | High — removes the primary OOM risk |
| 3 | Platform abstraction | Medium | Medium | High — required for Databricks support |

All three are independent and can be implemented in parallel. Improvement 2 should land
before any large-scale production runs.

---

## Implementation prompt

The following prompt can be given directly to a coding agent to implement all three
improvements:

---

> **Task**: Refactor `templates/fabric/isa95_pyspark_migration.py` and
> `templates/fabric/ISA95_Fabric_Migration.ipynb` to improve scalability and add
> Databricks support. Do not change transformation logic or rule evaluation behaviour.
> Apply all three improvements described below.
>
> ---
>
> **Improvement 1 — Selective bridge entity cache projection**
>
> Add a new helper function:
> ```python
> def _compute_bridge_field_requirements(
>     mapping: Dict[str, Any]
> ) -> Tuple[Set[str], Set[str]]:
> ```
> It returns `(entity1_required_fields, entity2_required_fields)` by inspecting:
> - `bridgeEntity1JoinFields[*]["entityField"]` / `bridgeEntity2JoinFields[*]["entityField"]`
> - `fieldMappings` entries where `generate == True` and `sourceEntity` matches the entity
>   name or `"Entity1"` / `"Entity2"`, collecting their `fieldName` values
> - Always include `"PrimaryKey"` in both sets
>
> Update `_build_entity_cache_for_bridge` to accept an optional
> `required_fields: Optional[Set[str]] = None` parameter. After each row dict is produced
> by `_to_rows()`, slim it: `row = {k: v for k, v in row.items() if k in required_fields}`
> before appending.
>
> In `_transform_bridge_mapping`, call `_compute_bridge_field_requirements(mapping)` and
> pass the resulting sets to the two cache builder calls.
>
> ---
>
> **Improvement 2 — Streaming transform via `toLocalIterator()`**
>
> Replace `_add_computed_fields(source_table, source_rows)` (which mutates a full list)
> with a single-record version:
> ```python
> def _apply_computed_fields(table_name: str, record: Dict[str, Any]) -> None:
>     """Mutate a single source record to inject computed fields."""
> ```
> containing the same `segment_requirements` / `durationHours` logic.
>
> In `_transform_regular_mapping`:
> - Remove `source_rows = _to_rows(filtered_df)` and the `_add_computed_fields` call.
> - Change the loop to:
>   ```python
>   source_table = mapping.get("sourceTable") or ""
>   for idx, src in enumerate(
>       r.asDict(recursive=True) for r in filtered_df.toLocalIterator()
>   ):
>       _apply_computed_fields(source_table, src)
>       # ... existing transform body unchanged ...
>   ```
>
> In `_transform_bridge_mapping`:
> - Apply the same iterator replacement for bridge source rows.
> - Keep `_to_rows()` for lookup table materialisation (reference tables are small by
>   definition).
>
> Keep the old `_add_computed_fields` function but have it delegate to
> `_apply_computed_fields` per record, or remove it if no other caller remains.
>
> ---
>
> **Improvement 3 — Platform abstraction (Fabric / Databricks)**
>
> Add a `PlatformConfig` dataclass near the top of the file:
> ```python
> @dataclass
> class PlatformConfig:
>     platform: str                  # "fabric" | "databricks"
>     spark_source_prefix: str       # prefix to prepend when building Spark read URIs
>     local_fs_available: bool       # whether os.path / os.listdir work for source paths
>     output_use_spark_writer: bool  # True → use df.write.csv(); False → use open()
> ```
>
> Add a factory function:
> ```python
> def _make_platform_config(platform: str) -> PlatformConfig:
> ```
> returning the correct config for `"fabric"` and `"databricks"`:
>
> | field | fabric | databricks |
> |-------|--------|------------|
> | `spark_source_prefix` | `"file:"` (prepended to `/lakehouse/…` paths) | `"dbfs:"` (prepended to `/dbfs/…` paths; ABFSS paths passed as-is) |
> | `local_fs_available` | `True` | `False` |
> | `output_use_spark_writer` | `False` (current `open()`-based write) | `True` |
>
> Thread `PlatformConfig` through:
> - `_load_source_table(spark, source_base_path, table_name, source_format, platform_config, debug)`
>   - Use `platform_config.local_fs_available` to gate `os.listdir()` candidate probing
>     and the Python CSV fallback.
>   - Build the Spark read URI using `platform_config.spark_source_prefix`.
> - `_write_entity_csv_files` and `_write_mapping_csv_files`:
>   - When `platform_config.output_use_spark_writer` is `True`, replace `open()` with
>     `spark.createDataFrame(rows).coalesce(1).write.mode("overwrite") \`
>     `.option("header", True).csv(spark_output_path)`.
> - `run_migration`: add `platform: str = "fabric"` parameter, construct
>   `PlatformConfig` via `_make_platform_config(platform)`, pass to all I/O functions.
>
> Update `ISA95_Fabric_Migration.ipynb` Cell 1 to add:
> ```python
> PLATFORM = "fabric"   # "fabric" | "databricks"
> ```
> and pass it as `platform=PLATFORM` in the `run_migration(...)` call in Cell 3.
>
> Preserve all existing default values so that a Fabric notebook with no changes to
> `PLATFORM` continues to behave exactly as today.
