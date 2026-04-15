-- =============================================================================
-- PART 2: Update + Evaluate
-- EquipmentPropertyTracking RecordId migration update from staging table
--
-- Prerequisite:
--   Run PART 1 and copy the produced RunId.
--
-- Behavior:
--   - Updates in batches with per-batch transaction.
--   - Joins GenericDataStores using staged OldRecordId.
--   - Sets:
--       GenericDataStores.RecordId = staged NewRecordId
--       DataJson.id = staged BaseIdWithoutTimestamp
--       DataJson.plantId/lineId/parentEquipmentId from staged values
--   - Marks staged rows as processed.
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @RunIdRaw nvarchar(100) = N'REPLACE-WITH-RUNID';
DECLARE @RunId uniqueidentifier = TRY_CONVERT(uniqueidentifier, @RunIdRaw);

IF @RunId IS NULL
BEGIN
    THROW 50001, 'Invalid RunId. Replace @RunIdRaw with the RunId returned by PART 1.', 1;
END;

IF OBJECT_ID('dbo.EptRecordIdMigrationStage', 'U') IS NULL
BEGIN
    THROW 50002, 'Staging table dbo.EptRecordIdMigrationStage does not exist. Run PART 1 first.', 1;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.EptRecordIdMigrationStage WHERE RunId = @RunId)
BEGIN
    THROW 50003, 'No staged rows found for provided RunId. Run PART 1 or check RunId.', 1;
END;

DECLARE @BatchSize int = 10000;
DECLARE @Rows int = 1;
DECLARE @BatchNo int = 0;

IF OBJECT_ID('tempdb..#Batch') IS NOT NULL DROP TABLE #Batch;
CREATE TABLE #Batch
(
    OldRecordId nvarchar(400) NOT NULL PRIMARY KEY,
    NewRecordId nvarchar(400) NOT NULL,
    BaseIdWithoutTimestamp nvarchar(400) NOT NULL,
    ResolvedPlantId nvarchar(200) NULL,
    ResolvedLineId nvarchar(200) NULL,
    ResolvedParentEquipmentId nvarchar(200) NULL
);

WHILE (@Rows > 0)
BEGIN
    DELETE FROM #Batch;

    INSERT INTO #Batch
    (
        OldRecordId,
        NewRecordId,
        BaseIdWithoutTimestamp,
        ResolvedPlantId,
        ResolvedLineId,
        ResolvedParentEquipmentId
    )
    SELECT TOP (@BatchSize)
        s.OldRecordId,
        s.NewRecordId,
        s.BaseIdWithoutTimestamp,
        s.ResolvedPlantId,
        s.ResolvedLineId,
        s.ResolvedParentEquipmentId
    FROM dbo.EptRecordIdMigrationStage s
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
            g.DataJson = JSON_MODIFY(
                JSON_MODIFY(
                    JSON_MODIFY(
                        JSON_MODIFY(g.DataJson, '$.id', b.BaseIdWithoutTimestamp),
                        '$.plantId', b.ResolvedPlantId
                    ),
                    '$.lineId', b.ResolvedLineId
                ),
                '$.parentEquipmentId', b.ResolvedParentEquipmentId
            ),
            g.UpdatedAt = GETUTCDATE()
        FROM GenericDataStores g
        INNER JOIN #Batch b
            ON b.OldRecordId = g.RecordId
        WHERE g.StoreName = 'equipmentPropertyTracking';

        SET @Rows = @@ROWCOUNT;

        UPDATE s
        SET
            s.IsProcessed = 1
        FROM dbo.EptRecordIdMigrationStage s
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
-- Evaluation output for PART 2
-- ------------------------------
SELECT
    @RunId AS RunId,
    COUNT(*) AS TotalStaged,
    SUM(CASE WHEN IsProcessed = 1 THEN 1 ELSE 0 END) AS ProcessedRows,
    SUM(CASE WHEN IsProcessed = 0 THEN 1 ELSE 0 END) AS RemainingRows
FROM dbo.EptRecordIdMigrationStage
WHERE RunId = @RunId;

SELECT RecordId, COUNT(*) AS Cnt
FROM GenericDataStores
WHERE StoreName = 'equipmentPropertyTracking'
GROUP BY RecordId
HAVING COUNT(*) > 1;

SELECT TOP (50)
    g.RecordId,
    JSON_VALUE(g.DataJson, '$.id') AS JsonId,
    JSON_VALUE(g.DataJson, '$.plantId') AS plantId,
    JSON_VALUE(g.DataJson, '$.lineId') AS lineId,
    JSON_VALUE(g.DataJson, '$.parentEquipmentId') AS parentEquipmentId,
    JSON_VALUE(g.DataJson, '$.equipmentId') AS equipmentId,
    JSON_VALUE(g.DataJson, '$.equipmentPropertyId') AS equipmentPropertyId,
    JSON_VALUE(g.DataJson, '$.createdTimestamp') AS createdTimestamp
FROM GenericDataStores g
WHERE g.StoreName = 'equipmentPropertyTracking'
ORDER BY g.Id DESC;
