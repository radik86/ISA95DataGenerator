-- =============================================================================
-- Direct update script (no ingestion/staging tables)
--
-- Applies rules directly to GenericDataStores (StoreName = equipmentPropertyTracking):
--   1) Remove trailing digest after last '-' if it is exactly 4 digits (e.g. -0032)
--   2) Remove token EQ-ACT
--   3) Remove datetime token -yyyyMMddHHmm-
--
-- Then updates:
--   - DataJson.id = transformed base id (without timestamp)
--   - RecordId    = transformed base id + '-' + timestamp suffix (yyyyMMddHHmmss)
--
-- Timestamp suffix source:
--   DataJson.createdTimestamp, fallback to GenericDataStores.CreatedAt
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

;WITH SourceRows AS
(
    SELECT
        g.Id,
        g.RecordId AS OldRecordId,
        g.DataJson,
        COALESCE(JSON_VALUE(g.DataJson, '$.createdTimestamp'), CONVERT(varchar(19), g.CreatedAt, 120)) AS CreatedTimestampRaw
    FROM GenericDataStores g
    WHERE g.StoreName = 'equipmentPropertyTracking'
),
Step1 AS
(
    SELECT
        s.Id,
        s.OldRecordId,
        s.DataJson,
        s.CreatedTimestampRaw,
        CASE
            WHEN s.OldRecordId LIKE '%-[0-9][0-9][0-9][0-9]'
                THEN LEFT(s.OldRecordId, LEN(s.OldRecordId) - 5)
            ELSE s.OldRecordId
        END AS NoDigest
    FROM SourceRows s
),
Step2 AS
(
    SELECT
        s.Id,
        s.OldRecordId,
        s.DataJson,
        s.CreatedTimestampRaw,
        REPLACE(
            REPLACE(s.NoDigest, 'PROP-TRACK-EQ-ACT-', 'PROP-TRACK-'),
            '-EQ-ACT-',
            '-'
        ) AS NoEqAct
    FROM Step1 s
),
Step3 AS
(
    SELECT
        s.Id,
        s.OldRecordId,
        s.DataJson,
        s.CreatedTimestampRaw,
        CASE
            WHEN PATINDEX('%-[1-2][0-9][0-9][0-9][0-1][0-9][0-3][0-9][0-2][0-9][0-5][0-9]-%', s.NoEqAct) > 0
                THEN STUFF(
                    s.NoEqAct,
                    PATINDEX('%-[1-2][0-9][0-9][0-9][0-1][0-9][0-3][0-9][0-2][0-9][0-5][0-9]-%', s.NoEqAct),
                    14,
                    '-'
                )
            ELSE s.NoEqAct
        END AS BaseIdWithoutTimestamp
    FROM Step2 s
),
Computed AS
(
    SELECT
        s.Id,
        s.BaseIdWithoutTimestamp,
        CASE
            WHEN LEN(
                LEFT(
                    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(s.CreatedTimestampRaw, '-', ''), ' ', ''), ':', ''), 'T', ''), 'Z', ''),
                    14
                )
            ) = 14
                THEN LEFT(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(s.CreatedTimestampRaw, '-', ''), ' ', ''), ':', ''), 'T', ''), 'Z', ''), 14)
            ELSE '19700101000000'
        END AS TimestampSuffix
    FROM Step3 s
)
UPDATE g
SET
    g.RecordId = c.BaseIdWithoutTimestamp + '-' + c.TimestampSuffix,
    g.DataJson = JSON_MODIFY(g.DataJson, '$.id', c.BaseIdWithoutTimestamp),
    g.UpdatedAt = GETUTCDATE()
FROM GenericDataStores g
INNER JOIN Computed c
    ON c.Id = g.Id
WHERE g.StoreName = 'equipmentPropertyTracking'
  AND (
        g.RecordId <> c.BaseIdWithoutTimestamp + '-' + c.TimestampSuffix
        OR JSON_VALUE(g.DataJson, '$.id') <> c.BaseIdWithoutTimestamp
      );

SELECT @@ROWCOUNT AS RowsUpdated;

-- Verification
SELECT RecordId, COUNT(*) AS Cnt
FROM GenericDataStores
WHERE StoreName = 'equipmentPropertyTracking'
GROUP BY RecordId
HAVING COUNT(*) > 1;

SELECT TOP (50)
    RecordId,
    JSON_VALUE(DataJson, '$.id') AS JsonId,
    JSON_VALUE(DataJson, '$.createdTimestamp') AS createdTimestamp,
    UpdatedAt
FROM GenericDataStores
WHERE StoreName = 'equipmentPropertyTracking'
ORDER BY Id DESC;
