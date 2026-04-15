-- =============================================================================
-- EquipmentPropertyTracking ID migration using string transformations
--
-- Transformation order requested:
--   1) Remove trailing digest after last '-' (example: -0032)
--   2) Remove token EQ-ACT
--   3) Remove datetime token -yyyyMMddHHmm-
--
-- Result:
--   - DataJson.id      = transformed base id (no timestamp suffix)
--   - GenericDataStores.RecordId = transformed base id + '-' + createdTimestamp(yyyyMMddHHmmss)
--
-- Notes:
--   - Uses existing RecordId as source for transformation.
--   - Uses createdTimestamp from DataJson; falls back to GenericDataStores.CreatedAt.
--   - Includes staging + evaluation + batched update with per-batch transactions.
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @RunId uniqueidentifier = NEWID();

IF OBJECT_ID('dbo.EptRecordIdStringTransformStage', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.EptRecordIdStringTransformStage
    (
        RunId uniqueidentifier NOT NULL,
        DbRowId bigint NOT NULL,
        OldRecordId nvarchar(400) NOT NULL,
        Step1_NoDigest nvarchar(400) NOT NULL,
        Step2_NoEqAct nvarchar(400) NOT NULL,
        Step3_NoTimestamp nvarchar(400) NOT NULL,
        BaseIdWithoutTimestamp nvarchar(400) NOT NULL,
        TimestampSuffix char(14) NOT NULL,
        NewRecordId nvarchar(400) NOT NULL,
        IsProcessed bit NOT NULL CONSTRAINT DF_EptRecordIdStringTransformStage_IsProcessed DEFAULT (0),
        CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_EptRecordIdStringTransformStage_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_EptRecordIdStringTransformStage PRIMARY KEY CLUSTERED (RunId, OldRecordId)
    );

    CREATE INDEX IX_EptRecordIdStringTransformStage_Run_Row
        ON dbo.EptRecordIdStringTransformStage (RunId, DbRowId);
END;

;WITH SourceRows AS
(
    SELECT
        g.Id AS DbRowId,
        g.RecordId AS OldRecordId,
        COALESCE(JSON_VALUE(g.DataJson, '$.createdTimestamp'), CONVERT(varchar(19), g.CreatedAt, 120)) AS CreatedTimestampRaw
    FROM GenericDataStores g
    WHERE g.StoreName = 'equipmentPropertyTracking'
),
Step1 AS
(
    SELECT
        s.DbRowId,
        s.OldRecordId,
        s.CreatedTimestampRaw,
        CASE
            WHEN s.OldRecordId LIKE '%-[0-9][0-9][0-9][0-9]'
                THEN LEFT(s.OldRecordId, LEN(s.OldRecordId) - 5)
            ELSE s.OldRecordId
        END AS Step1_NoDigest
    FROM SourceRows s
),
Step2 AS
(
    SELECT
        s.DbRowId,
        s.OldRecordId,
        s.CreatedTimestampRaw,
        s.Step1_NoDigest,
        REPLACE(
            REPLACE(s.Step1_NoDigest, 'PROP-TRACK-EQ-ACT-', 'PROP-TRACK-'),
            '-EQ-ACT-',
            '-'
        ) AS Step2_NoEqAct
    FROM Step1 s
),
Step3 AS
(
    SELECT
        s.DbRowId,
        s.OldRecordId,
        s.CreatedTimestampRaw,
        s.Step1_NoDigest,
        s.Step2_NoEqAct,
        CASE
            WHEN PATINDEX('%-[1-2][0-9][0-9][0-9][0-1][0-9][0-3][0-9][0-2][0-9][0-5][0-9]-%', s.Step2_NoEqAct) > 0
                THEN STUFF(
                    s.Step2_NoEqAct,
                    PATINDEX('%-[1-2][0-9][0-9][0-9][0-1][0-9][0-3][0-9][0-2][0-9][0-5][0-9]-%', s.Step2_NoEqAct),
                    14,
                    '-'
                )
            ELSE s.Step2_NoEqAct
        END AS Step3_NoTimestamp
    FROM Step2 s
),
Computed AS
(
    SELECT
        s.DbRowId,
        s.OldRecordId,
        s.Step1_NoDigest,
        s.Step2_NoEqAct,
        s.Step3_NoTimestamp,
        s.Step3_NoTimestamp AS BaseIdWithoutTimestamp,
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
INSERT INTO dbo.EptRecordIdStringTransformStage
(
    RunId,
    DbRowId,
    OldRecordId,
    Step1_NoDigest,
    Step2_NoEqAct,
    Step3_NoTimestamp,
    BaseIdWithoutTimestamp,
    TimestampSuffix,
    NewRecordId,
    IsProcessed
)
SELECT
    @RunId,
    c.DbRowId,
    c.OldRecordId,
    c.Step1_NoDigest,
    c.Step2_NoEqAct,
    c.Step3_NoTimestamp,
    c.BaseIdWithoutTimestamp,
    c.TimestampSuffix,
    c.BaseIdWithoutTimestamp + '-' + c.TimestampSuffix AS NewRecordId,
    0
FROM Computed c;

-- ------------------------------
-- Evaluation output: ingest/transform
-- ------------------------------
SELECT @RunId AS RunId;

SELECT
    COUNT(*) AS TotalStaged,
    SUM(CASE WHEN OldRecordId = Step1_NoDigest THEN 0 ELSE 1 END) AS RemovedDigestCount,
    SUM(CASE WHEN Step1_NoDigest = Step2_NoEqAct THEN 0 ELSE 1 END) AS RemovedEqActCount,
    SUM(CASE WHEN Step2_NoEqAct = Step3_NoTimestamp THEN 0 ELSE 1 END) AS RemovedTimestampCount,
    SUM(CASE WHEN TimestampSuffix = '19700101000000' THEN 1 ELSE 0 END) AS FallbackTimestampCount
FROM dbo.EptRecordIdStringTransformStage
WHERE RunId = @RunId;

SELECT NewRecordId, COUNT(*) AS Cnt
FROM dbo.EptRecordIdStringTransformStage
WHERE RunId = @RunId
GROUP BY NewRecordId
HAVING COUNT(*) > 1;

SELECT TOP (50)
    RunId,
    DbRowId,
    OldRecordId,
    Step1_NoDigest,
    Step2_NoEqAct,
    Step3_NoTimestamp,
    BaseIdWithoutTimestamp,
    TimestampSuffix,
    NewRecordId,
    IsProcessed,
    CreatedAt
FROM dbo.EptRecordIdStringTransformStage
WHERE RunId = @RunId
ORDER BY DbRowId;

-- ------------------------------
-- Batched update
-- ------------------------------
DECLARE @BatchSize int = 10000;
DECLARE @Rows int = 1;
DECLARE @BatchNo int = 0;

IF OBJECT_ID('tempdb..#Batch') IS NOT NULL DROP TABLE #Batch;
CREATE TABLE #Batch
(
    OldRecordId nvarchar(400) NOT NULL PRIMARY KEY,
    NewRecordId nvarchar(400) NOT NULL,
    BaseIdWithoutTimestamp nvarchar(400) NOT NULL
);

WHILE (@Rows > 0)
BEGIN
    DELETE FROM #Batch;

    INSERT INTO #Batch (OldRecordId, NewRecordId, BaseIdWithoutTimestamp)
    SELECT TOP (@BatchSize)
        s.OldRecordId,
        s.NewRecordId,
        s.BaseIdWithoutTimestamp
    FROM dbo.EptRecordIdStringTransformStage s
    INNER JOIN GenericDataStores g
        ON g.StoreName = 'equipmentPropertyTracking'
       AND g.RecordId = s.OldRecordId
    WHERE s.RunId = @RunId
      AND s.IsProcessed = 0
    ORDER BY s.DbRowId;

    IF @@ROWCOUNT = 0
    BEGIN
        SET @Rows = 0;
        BREAK;
    END;

    SET @BatchNo = @BatchNo + 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE g
        SET
            g.RecordId = b.NewRecordId,
            g.DataJson = JSON_MODIFY(g.DataJson, '$.id', b.BaseIdWithoutTimestamp),
            g.UpdatedAt = GETUTCDATE()
        FROM GenericDataStores g
        INNER JOIN #Batch b
            ON b.OldRecordId = g.RecordId
        WHERE g.StoreName = 'equipmentPropertyTracking';

        SET @Rows = @@ROWCOUNT;

        UPDATE s
        SET s.IsProcessed = 1
        FROM dbo.EptRecordIdStringTransformStage s
        INNER JOIN #Batch b
            ON b.OldRecordId = s.OldRecordId
        WHERE s.RunId = @RunId;

        COMMIT TRANSACTION;
        PRINT CONCAT('Batch ', @BatchNo, ': updated rows = ', @Rows);
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;

-- ------------------------------
-- Evaluation output: post-update
-- ------------------------------
SELECT
    @RunId AS RunId,
    COUNT(*) AS TotalStaged,
    SUM(CASE WHEN IsProcessed = 1 THEN 1 ELSE 0 END) AS ProcessedRows,
    SUM(CASE WHEN IsProcessed = 0 THEN 1 ELSE 0 END) AS RemainingRows
FROM dbo.EptRecordIdStringTransformStage
WHERE RunId = @RunId;

SELECT RecordId, COUNT(*) AS Cnt
FROM GenericDataStores
WHERE StoreName = 'equipmentPropertyTracking'
GROUP BY RecordId
HAVING COUNT(*) > 1;

SELECT TOP (50)
    g.RecordId,
    JSON_VALUE(g.DataJson, '$.id') AS JsonId,
    JSON_VALUE(g.DataJson, '$.equipmentId') AS equipmentId,
    JSON_VALUE(g.DataJson, '$.equipmentPropertyId') AS equipmentPropertyId,
    JSON_VALUE(g.DataJson, '$.createdTimestamp') AS createdTimestamp
FROM GenericDataStores g
WHERE g.StoreName = 'equipmentPropertyTracking'
ORDER BY g.Id DESC;
