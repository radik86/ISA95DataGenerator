-- =============================================================================
-- fix-genericdata-fields.sql
-- Patches JSON field names and backfills operationsType in GenericDataStores.
-- Safe to run multiple times (idempotent).
--
-- Why this version is more reliable:
-- - Uses TRY_CONVERT (avoids conversion failures on dirty values)
-- - Uses text pre-filters to avoid expensive JSON predicates in WHERE where possible
-- - Prints row counts after each step
-- =============================================================================

SET NOCOUNT ON;

DECLARE @UtcNow DATETIME2(7) = SYSUTCDATETIME();

-- ── 1) Rename plannedDurationHours -> plannedQuantity ───────────────────────
;WITH candidates AS (
    SELECT Id
    FROM dbo.GenericDataStores WITH (INDEX(IX_GenericDataStores_StoreName))
    WHERE StoreName = 'segmentEquipmentRequirements'
      AND DataJson LIKE '%"plannedDurationHours"%'
)
UPDATE g
SET
    DataJson = JSON_MODIFY(
                 JSON_MODIFY(
                    g.DataJson,
                    '$.plannedQuantity',
                    COALESCE(
                        TRY_CONVERT(float, JSON_VALUE(g.DataJson, '$.plannedQuantity')),
                        TRY_CONVERT(float, JSON_VALUE(g.DataJson, '$.plannedDurationHours'))
                    )
                 ),
                 '$.plannedDurationHours',
                 NULL
              ),
    UpdatedAt = @UtcNow
FROM dbo.GenericDataStores g
JOIN candidates c ON c.Id = g.Id;

SELECT 'Step1 segmentEquipmentRequirements rename' AS Step, @@ROWCOUNT AS RowsAffected;

-- ── 2) Rename actualDurationHours -> actualQuantity ─────────────────────────
;WITH candidates AS (
    SELECT Id
    FROM dbo.GenericDataStores WITH (INDEX(IX_GenericDataStores_StoreName))
    WHERE StoreName = 'segmentEquipmentActuals'
      AND DataJson LIKE '%"actualDurationHours"%'
)
UPDATE g
SET
    DataJson = JSON_MODIFY(
                 JSON_MODIFY(
                    g.DataJson,
                    '$.actualQuantity',
                    COALESCE(
                        TRY_CONVERT(float, JSON_VALUE(g.DataJson, '$.actualQuantity')),
                        TRY_CONVERT(float, JSON_VALUE(g.DataJson, '$.actualDurationHours'))
                    )
                 ),
                 '$.actualDurationHours',
                 NULL
              ),
    UpdatedAt = @UtcNow
FROM dbo.GenericDataStores g
JOIN candidates c ON c.Id = g.Id;

SELECT 'Step2 segmentEquipmentActuals rename' AS Step, @@ROWCOUNT AS RowsAffected;

-- ── 3) Backfill operationsType only where missing ───────────────────────────
;WITH candidates AS (
    SELECT Id
    FROM dbo.GenericDataStores WITH (INDEX(IX_GenericDataStores_StoreName))
    WHERE StoreName IN (
        'operationsRequests',
        'segmentRequirements',
        'segmentMaterialRequirements',
        'segmentEquipmentRequirements',
        'operationsResponses',
        'segmentResponses',
        'segmentMaterialActuals',
        'segmentEquipmentActuals',
        'operationsEvents'
    )
      AND DataJson NOT LIKE '%"operationsType"%'
)
UPDATE g
SET
    DataJson = JSON_MODIFY(
                 g.DataJson,
                 '$.operationsType',
                 CASE WHEN g.RecordId LIKE 'MNT-%' THEN 'Maintenance' ELSE 'Production' END
              ),
    UpdatedAt = @UtcNow
FROM dbo.GenericDataStores g
JOIN candidates c ON c.Id = g.Id;

SELECT 'Step3 backfill operationsType' AS Step, @@ROWCOUNT AS RowsAffected;

-- ── Verification ─────────────────────────────────────────────────────────────
SELECT  StoreName,
        COUNT(*) AS TotalRecords,
        SUM(CASE WHEN JSON_VALUE(DataJson, '$.operationsType') = 'Production'  THEN 1 ELSE 0 END) AS Production,
        SUM(CASE WHEN JSON_VALUE(DataJson, '$.operationsType') = 'Maintenance' THEN 1 ELSE 0 END) AS Maintenance,
        SUM(CASE WHEN JSON_VALUE(DataJson, '$.operationsType') IS NULL          THEN 1 ELSE 0 END) AS MissingOperationsType
FROM    dbo.GenericDataStores
WHERE   StoreName IN (
            'operationsRequests','segmentRequirements',
            'segmentMaterialRequirements','segmentEquipmentRequirements',
            'operationsResponses','segmentResponses',
            'segmentMaterialActuals','segmentEquipmentActuals',
            'operationsEvents'
        )
GROUP BY StoreName
ORDER BY StoreName;

SELECT  StoreName,
        SUM(CASE WHEN JSON_VALUE(DataJson, '$.plannedDurationHours') IS NOT NULL THEN 1 ELSE 0 END) AS OldPlannedDurationHours,
        SUM(CASE WHEN JSON_VALUE(DataJson, '$.plannedQuantity')       IS NOT NULL THEN 1 ELSE 0 END) AS NewPlannedQuantity
FROM    dbo.GenericDataStores
WHERE   StoreName = 'segmentEquipmentRequirements'
GROUP BY StoreName;

SELECT  StoreName,
        SUM(CASE WHEN JSON_VALUE(DataJson, '$.actualDurationHours') IS NOT NULL THEN 1 ELSE 0 END) AS OldActualDurationHours,
        SUM(CASE WHEN JSON_VALUE(DataJson, '$.actualQuantity')       IS NOT NULL THEN 1 ELSE 0 END) AS NewActualQuantity
FROM    dbo.GenericDataStores
WHERE   StoreName = 'segmentEquipmentActuals'
GROUP BY StoreName;
