-- =============================================================================
-- backfill-last-data-migration-at.sql
--
-- Backfills GenericDataStores.LastDataMigrationAt for existing rows using the
-- updatedAt timestamp that is stored inside each record's DataJson payload.
--
-- Why: The delta migration logic compares UpdatedAt > LastDataMigrationAt.
-- Without this backfill every row looks "never migrated" and a delta run
-- would re-export the entire history.
--
-- After this backfill:
--   - Rows where DataJson contains a valid $.updatedAt → LastDataMigrationAt
--     is set to that value.
--   - Rows where $.updatedAt is missing or unparseable → LastDataMigrationAt
--     falls back to the row's own UpdatedAt column.
--   - Rows that already have LastDataMigrationAt set → skipped.
--
-- Usage:
--   1. Run with @DryRun = 1 (default) to preview counts per store.
--   2. Set @DryRun = 0 and re-run to apply.
--
-- Idempotent: only touches rows where LastDataMigrationAt IS NULL.
-- =============================================================================

SET NOCOUNT ON;

DECLARE @DryRun   BIT           = 1;   -- ← change to 0 to apply
DECLARE @UtcNow   DATETIME2(7)  = SYSUTCDATETIME();

-- ---------------------------------------------------------------------------
-- Step 1 – Summary of rows eligible for backfill (always shown)
-- ---------------------------------------------------------------------------
SELECT
    StoreName,
    COUNT(*)                                                        AS TotalRows,
    SUM(CASE WHEN TRY_CONVERT(DATETIME2(7),
                     JSON_VALUE(DataJson, '$.updatedAt')) IS NOT NULL
             THEN 1 ELSE 0 END)                                    AS RowsWithJsonDate,
    SUM(CASE WHEN TRY_CONVERT(DATETIME2(7),
                     JSON_VALUE(DataJson, '$.updatedAt')) IS NULL
             THEN 1 ELSE 0 END)                                    AS RowsFallbackToColumnDate
FROM dbo.GenericDataStores
WHERE LastDataMigrationAt IS NULL
GROUP BY StoreName
ORDER BY StoreName;

-- ---------------------------------------------------------------------------
-- Step 2 – Apply (only when @DryRun = 0)
-- ---------------------------------------------------------------------------
IF @DryRun = 0
BEGIN
    BEGIN TRANSACTION;

    UPDATE dbo.GenericDataStores
    SET LastDataMigrationAt =
            COALESCE(
                TRY_CONVERT(DATETIME2(7), JSON_VALUE(DataJson, '$.updatedAt')),
                UpdatedAt
            )
    WHERE LastDataMigrationAt IS NULL;

    DECLARE @Updated INT = @@ROWCOUNT;

    COMMIT TRANSACTION;

    PRINT 'Applied. Rows stamped: ' + CAST(@Updated AS VARCHAR(20));
END
ELSE
BEGIN
    PRINT 'DRY RUN – no changes were written. Set @DryRun = 0 to apply.';

    -- Preview: show a sample of 20 rows with the resolved value
    SELECT TOP 20
        Id,
        StoreName,
        RecordId,
        JSON_VALUE(DataJson, '$.updatedAt')                        AS JsonUpdatedAt,
        UpdatedAt                                                   AS ColumnUpdatedAt,
        COALESCE(
            TRY_CONVERT(DATETIME2(7), JSON_VALUE(DataJson, '$.updatedAt')),
            UpdatedAt
        )                                                           AS ResolvedLastDataMigrationAt
    FROM dbo.GenericDataStores
    WHERE LastDataMigrationAt IS NULL
    ORDER BY StoreName, Id;
END
