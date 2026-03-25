-- =============================================================================
-- migrate-oer-oee-record-ids.sql
--
-- Migrates existing operationsEventRecords / operationsEventEntries rows in
-- dbo.GenericDataStores to the new OER-<uuid> / OEE-<uuid> key scheme.
--
-- Scope:
--   StoreName IN ('operationsEventRecords', 'operationsEventEntries')
--   AND JSON informationObjectType IN ('Equipment', 'SegmentResponse')
--   AND RecordId is NOT already in the new OER-/OEE- format
--
-- Usage:
--   1. Run with @DryRun = 1 (default) to preview rows that will be changed.
--   2. Set @DryRun = 0 and re-run to apply.
--
-- Idempotent: rows already matching OER-* / OEE-* are skipped.
-- =============================================================================

SET NOCOUNT ON;

DECLARE @DryRun BIT = 1;   -- ← change to 0 to apply changes

-- ---------------------------------------------------------------------------
-- Step 1 – Materialise the old→new ID mapping
--          We dump into a temp table first so that NEWID() is evaluated exactly
--          once per row and not re-invoked during the final UPDATE.
-- ---------------------------------------------------------------------------
IF OBJECT_ID('tempdb..#RecordMapping') IS NOT NULL
    DROP TABLE #RecordMapping;

SELECT
    g.Id,
    g.StoreName,
    g.RecordId AS OldRecordId,
    CAST(
        CONCAT(
            CASE g.StoreName
                WHEN 'operationsEventRecords'  THEN 'OER'
                WHEN 'operationsEventEntries'  THEN 'OEE'
                ELSE 'UNK'
            END,
            '-',
            LOWER(CAST(NEWID() AS NVARCHAR(36)))
        )
    AS NVARCHAR(400)) AS NewRecordId
INTO #RecordMapping
FROM dbo.GenericDataStores g
WHERE g.StoreName IN ('operationsEventRecords', 'operationsEventEntries')
  AND JSON_VALUE(g.DataJson, '$.informationObjectType') IN ('Equipment', 'SegmentResponse')
  AND g.RecordId NOT LIKE 'OER-%'
  AND g.RecordId NOT LIKE 'OEE-%';

-- ---------------------------------------------------------------------------
-- Step 2 – Preview
-- ---------------------------------------------------------------------------
SELECT
    rm.StoreName,
    rm.OldRecordId,
    rm.NewRecordId,
    JSON_VALUE(g.DataJson, '$.informationObjectType') AS InfoObjectType,
    g.CreatedAt,
    g.UpdatedAt
FROM #RecordMapping rm
JOIN dbo.GenericDataStores g ON g.Id = rm.Id
ORDER BY rm.StoreName, rm.OldRecordId;

DECLARE @TotalRows INT = (SELECT COUNT(*) FROM #RecordMapping);
PRINT 'Total rows to update: ' + CAST(@TotalRows AS VARCHAR(20));

-- ---------------------------------------------------------------------------
-- Step 3 – Apply (only when @DryRun = 0)
--          Updates both RecordId column and the $.id field inside DataJson.
-- ---------------------------------------------------------------------------
IF @DryRun = 0
BEGIN
    BEGIN TRANSACTION;

    UPDATE g
    SET
        g.RecordId = rm.NewRecordId,
        g.DataJson = JSON_MODIFY(g.DataJson, '$.id', rm.NewRecordId),
        g.UpdatedAt = GETUTCDATE()
    FROM dbo.GenericDataStores g
    INNER JOIN #RecordMapping rm ON rm.Id = g.Id;

    DECLARE @Updated INT = @@ROWCOUNT;

    COMMIT TRANSACTION;

    PRINT 'Applied. Rows updated: ' + CAST(@Updated AS VARCHAR(20));
END
ELSE
BEGIN
    PRINT 'DRY RUN – no changes were written. Set @DryRun = 0 to apply.';
END

-- ---------------------------------------------------------------------------
-- Cleanup
-- ---------------------------------------------------------------------------
IF OBJECT_ID('tempdb..#RecordMapping') IS NOT NULL
    DROP TABLE #RecordMapping;
