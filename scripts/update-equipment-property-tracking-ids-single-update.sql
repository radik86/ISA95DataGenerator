-- One update statement per rule

SET NOCOUNT ON;
SET XACT_ABORT ON;

-- Rule 1: remove trailing digest "-dddd" (last 5 chars) from RecordId and DataJson.id
UPDATE g
SET
    g.RecordId =
        CASE
            WHEN g.RecordId LIKE '%-[0-9][0-9][0-9][0-9]'
                THEN LEFT(g.RecordId, LEN(g.RecordId) - 5)
            ELSE g.RecordId
        END,
    g.DataJson = JSON_MODIFY(
        g.DataJson,
        '$.id',
        CASE
            WHEN JSON_VALUE(g.DataJson, '$.id') LIKE '%-[0-9][0-9][0-9][0-9]'
                THEN LEFT(JSON_VALUE(g.DataJson, '$.id'), LEN(JSON_VALUE(g.DataJson, '$.id')) - 5)
            ELSE JSON_VALUE(g.DataJson, '$.id')
        END
    ),
    g.UpdatedAt = GETUTCDATE()
FROM GenericDataStores g
WHERE g.StoreName = 'equipmentPropertyTracking'
  AND (
        g.RecordId LIKE '%-[0-9][0-9][0-9][0-9]'
        OR JSON_VALUE(g.DataJson, '$.id') LIKE '%-[0-9][0-9][0-9][0-9]'
      );

-- Rule 2: remove token EQ-ACT from RecordId and DataJson.id
UPDATE g
SET
    g.RecordId = REPLACE(REPLACE(g.RecordId, 'PROP-TRACK-EQ-ACT-', 'PROP-TRACK-'), '-EQ-ACT-', '-'),
    g.DataJson = JSON_MODIFY(
        g.DataJson,
        '$.id',
        REPLACE(REPLACE(JSON_VALUE(g.DataJson, '$.id'), 'PROP-TRACK-EQ-ACT-', 'PROP-TRACK-'), '-EQ-ACT-', '-')
    ),
    g.UpdatedAt = GETUTCDATE()
FROM GenericDataStores g
WHERE g.StoreName = 'equipmentPropertyTracking'
  AND (
        g.RecordId LIKE '%EQ-ACT%'
        OR JSON_VALUE(g.DataJson, '$.id') LIKE '%EQ-ACT%'
      );

-- Rule 3: remove datetime token "-yyyyMMddHHmm-" from RecordId and DataJson.id
UPDATE g
SET
    g.RecordId =
        CASE
            WHEN PATINDEX('%-[1-2][0-9][0-9][0-9][0-1][0-9][0-3][0-9][0-2][0-9][0-5][0-9]-%', g.RecordId) > 0
                THEN STUFF(
                    g.RecordId,
                    PATINDEX('%-[1-2][0-9][0-9][0-9][0-1][0-9][0-3][0-9][0-2][0-9][0-5][0-9]-%', g.RecordId),
                    14,
                    '-'
                )
            ELSE g.RecordId
        END,
    g.DataJson = JSON_MODIFY(
        g.DataJson,
        '$.id',
        CASE
            WHEN PATINDEX('%-[1-2][0-9][0-9][0-9][0-1][0-9][0-3][0-9][0-2][0-9][0-5][0-9]-%', JSON_VALUE(g.DataJson, '$.id')) > 0
                THEN STUFF(
                    JSON_VALUE(g.DataJson, '$.id'),
                    PATINDEX('%-[1-2][0-9][0-9][0-9][0-1][0-9][0-3][0-9][0-2][0-9][0-5][0-9]-%', JSON_VALUE(g.DataJson, '$.id')),
                    14,
                    '-'
                )
            ELSE JSON_VALUE(g.DataJson, '$.id')
        END
    ),
    g.UpdatedAt = GETUTCDATE()
FROM GenericDataStores g
WHERE g.StoreName = 'equipmentPropertyTracking'
  AND (
        PATINDEX('%-[1-2][0-9][0-9][0-9][0-1][0-9][0-3][0-9][0-2][0-9][0-5][0-9]-%', g.RecordId) > 0
        OR PATINDEX('%-[1-2][0-9][0-9][0-9][0-1][0-9][0-3][0-9][0-2][0-9][0-5][0-9]-%', JSON_VALUE(g.DataJson, '$.id')) > 0
      );

-- Rule 4: set final RecordId = DataJson.id + '-' + createdTimestamp(yyyyMMddHHmmss)
UPDATE g
SET
    g.RecordId =
        JSON_VALUE(g.DataJson, '$.id')
        + '-'
        + CASE
            WHEN LEN(
                LEFT(
                    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(JSON_VALUE(g.DataJson, '$.createdTimestamp'), CONVERT(varchar(19), g.CreatedAt, 120)), '-', ''), ' ', ''), ':', ''), 'T', ''), 'Z', ''),
                    14
                )
            ) = 14
                THEN LEFT(
                    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(JSON_VALUE(g.DataJson, '$.createdTimestamp'), CONVERT(varchar(19), g.CreatedAt, 120)), '-', ''), ' ', ''), ':', ''), 'T', ''), 'Z', ''),
                    14
                )
            ELSE '19700101000000'
          END,
    g.UpdatedAt = GETUTCDATE()
FROM GenericDataStores g
WHERE g.StoreName = 'equipmentPropertyTracking'
  AND JSON_VALUE(g.DataJson, '$.id') IS NOT NULL;
