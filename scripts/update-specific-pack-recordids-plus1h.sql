SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @UtcNow DATETIME2(7) = SYSUTCDATETIME();

BEGIN TRAN;

-- Preview before update
SELECT
    RecordId,
    JSON_VALUE(DataJson, '$.latestEndDateTime') AS oldLatestEndDateTime,
    CONVERT(VARCHAR(19),
        DATEADD(
            HOUR, 1,
            TRY_CONVERT(DATETIME2, JSON_VALUE(DataJson, '$.latestEndDateTime'))
        ),
        120
    ) AS newLatestEndDateTime
FROM dbo.GenericDataStores
WHERE StoreName = 'segmentRequirements'
  AND RecordId IN (
    'SR-PLANT01MUNICH-LINE-01-202601270827-003-BREAD-750G-PACK',
    'SR-PLANT01MUNICH-LINE-01-202601271744-003-BREAD-750G-PACK',
    'SR-PLANT03FRA-LINE-03-202603061437-003-BREAD-750G-PACK'
  );

-- Apply update
UPDATE g
SET
    g.DataJson = JSON_MODIFY(
        g.DataJson,
        '$.latestEndDateTime',
        CONVERT(VARCHAR(19),
            DATEADD(
                HOUR, 1,
                TRY_CONVERT(DATETIME2, JSON_VALUE(g.DataJson, '$.latestEndDateTime'))
            ),
            120
        )
    ),
    g.UpdatedAt = @UtcNow
FROM dbo.GenericDataStores g
WHERE g.StoreName = 'segmentRequirements'
  AND g.RecordId IN (
    'SR-PLANT01MUNICH-LINE-01-202601270827-003-BREAD-750G-PACK',
    'SR-PLANT01MUNICH-LINE-01-202601271744-003-BREAD-750G-PACK',
    'SR-PLANT03FRA-LINE-03-202603061437-003-BREAD-750G-PACK'
  );

SELECT @@ROWCOUNT AS RowsUpdated;

-- Verify after update
SELECT
    RecordId,
    JSON_VALUE(DataJson, '$.latestEndDateTime') AS latestEndDateTimeAfterUpdate
FROM dbo.GenericDataStores
WHERE StoreName = 'segmentRequirements'
  AND RecordId IN (
    'SR-PLANT01MUNICH-LINE-01-202601270827-003-BREAD-750G-PACK',
    'SR-PLANT01MUNICH-LINE-01-202601271744-003-BREAD-750G-PACK',
    'SR-PLANT03FRA-LINE-03-202603061437-003-BREAD-750G-PACK'
  );

COMMIT TRAN;
