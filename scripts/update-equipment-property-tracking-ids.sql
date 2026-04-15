-- =============================================================================
-- Fast migration for equipmentPropertyTracking IDs in GenericDataStores
--
-- Goal:
--   1) RecordId (table key) keeps timestamp suffix for uniqueness
--   2) DataJson.id (business id) does NOT include timestamp
--
-- New patterns:
--   RecordId parent: PROP-TRACK-{plantId}-{lineId}-{equipmentId}-{equipmentPropertyId}-{yyyyMMddHHmmss}
--   RecordId child:  PROP-TRACK-{plantId}-{lineId}-{parentEquipmentId}-CHILD-{equipmentId}-{equipmentPropertyId}-{yyyyMMddHHmmss}
--
--   DataJson.id parent: PROP-TRACK-{plantId}-{lineId}-{equipmentId}-{equipmentPropertyId}
--   DataJson.id child:  PROP-TRACK-{plantId}-{lineId}-{parentEquipmentId}-CHILD-{equipmentId}-{equipmentPropertyId}
--
-- Performance strategy:
--   A) Extract/resolve once into temp tables
--   B) Update GenericDataStores in batches by joining on OldRecordId
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

-- -----------------------------------------------------------------------------
-- Step 0: temp table setup
-- -----------------------------------------------------------------------------
IF OBJECT_ID('tempdb..#EptBase') IS NOT NULL DROP TABLE #EptBase;
IF OBJECT_ID('tempdb..#SegResp') IS NOT NULL DROP TABLE #SegResp;
IF OBJECT_ID('tempdb..#OpsResp') IS NOT NULL DROP TABLE #OpsResp;
IF OBJECT_ID('tempdb..#EptMap') IS NOT NULL DROP TABLE #EptMap;

CREATE TABLE #EptBase
(
    DbRowId bigint NOT NULL,
    OldRecordId nvarchar(400) NOT NULL,
    SegmentResponseId nvarchar(200) NULL,
    EquipmentId nvarchar(200) NULL,
    EquipmentPropertyId nvarchar(200) NULL,
    CreatedTimestampRaw nvarchar(64) NULL,
    OperationsResponseIdDirect nvarchar(200) NULL,
    PlantIdFromJson nvarchar(200) NULL,
    LineIdFromJson nvarchar(200) NULL,
    ParentFromJson nvarchar(200) NULL,
    PRIMARY KEY CLUSTERED (OldRecordId)
);

CREATE TABLE #SegResp
(
    SegmentResponseId nvarchar(200) NOT NULL PRIMARY KEY,
    OperationsResponseId nvarchar(200) NULL,
    PlantId nvarchar(200) NULL,
    LineId nvarchar(200) NULL,
    ProductionLineId nvarchar(200) NULL
);

CREATE TABLE #OpsResp
(
    OperationsResponseId nvarchar(200) NOT NULL PRIMARY KEY,
    PlantId nvarchar(200) NULL,
    LineId nvarchar(200) NULL,
    ProductionLineId nvarchar(200) NULL
);

CREATE TABLE #EptMap
(
    DbRowId bigint NOT NULL,
    OldRecordId nvarchar(400) NOT NULL,
    NewRecordId nvarchar(400) NOT NULL,
    BaseIdWithoutTimestamp nvarchar(400) NOT NULL,
    ResolvedPlantId nvarchar(200) NULL,
    ResolvedLineId nvarchar(200) NULL,
    ResolvedParentEquipmentId nvarchar(200) NULL,
    TimestampSuffix char(14) NOT NULL,
    PRIMARY KEY CLUSTERED (OldRecordId)
);

-- -----------------------------------------------------------------------------
-- Step 1: materialize source rows (equipmentPropertyTracking only)
-- -----------------------------------------------------------------------------
INSERT INTO #EptBase
(
    DbRowId,
    OldRecordId,
    SegmentResponseId,
    EquipmentId,
    EquipmentPropertyId,
    CreatedTimestampRaw,
    OperationsResponseIdDirect,
    PlantIdFromJson,
    LineIdFromJson,
    ParentFromJson
)
SELECT
    g.Id,
    g.RecordId,
    JSON_VALUE(g.DataJson, '$.segmentResponseId') AS SegmentResponseId,
    JSON_VALUE(g.DataJson, '$.equipmentId') AS EquipmentId,
    JSON_VALUE(g.DataJson, '$.equipmentPropertyId') AS EquipmentPropertyId,
    COALESCE(JSON_VALUE(g.DataJson, '$.createdTimestamp'), CONVERT(varchar(19), g.CreatedAt, 120)) AS CreatedTimestampRaw,
    JSON_VALUE(g.DataJson, '$.operationsResponseId') AS OperationsResponseIdDirect,
    JSON_VALUE(g.DataJson, '$.plantId') AS PlantIdFromJson,
    JSON_VALUE(g.DataJson, '$.lineId') AS LineIdFromJson,
    JSON_VALUE(g.DataJson, '$.parentEquipmentId') AS ParentFromJson
FROM GenericDataStores g
WHERE g.StoreName = 'equipmentPropertyTracking';

-- -----------------------------------------------------------------------------
-- Step 2: materialize lookup stores (only needed keys)
-- -----------------------------------------------------------------------------
INSERT INTO #SegResp (SegmentResponseId, OperationsResponseId, PlantId, LineId, ProductionLineId)
SELECT
    g.RecordId,
    JSON_VALUE(g.DataJson, '$.operationsResponseId'),
    JSON_VALUE(g.DataJson, '$.plantId'),
    JSON_VALUE(g.DataJson, '$.lineId'),
    JSON_VALUE(g.DataJson, '$.productionLineId')
FROM GenericDataStores g
WHERE g.StoreName = 'segmentResponses';

INSERT INTO #OpsResp (OperationsResponseId, PlantId, LineId, ProductionLineId)
SELECT
    g.RecordId,
    JSON_VALUE(g.DataJson, '$.plantId'),
    JSON_VALUE(g.DataJson, '$.lineId'),
    JSON_VALUE(g.DataJson, '$.productionLineId')
FROM GenericDataStores g
WHERE g.StoreName = 'operationsResponses';

-- -----------------------------------------------------------------------------
-- Step 3: build mapping table (OldRecordId -> NewRecordId + BaseId)
-- -----------------------------------------------------------------------------
;WITH Resolved AS
(
    SELECT
        b.DbRowId,
        b.OldRecordId,
        b.EquipmentId,
        b.EquipmentPropertyId,
        COALESCE(
            NULLIF(b.PlantIdFromJson, ''),
            NULLIF(sr.PlantId, ''),
            NULLIF(orow.PlantId, '')
        ) AS ResolvedPlantId,
        COALESCE(
            NULLIF(b.LineIdFromJson, ''),
            NULLIF(sr.LineId, ''),
            NULLIF(sr.ProductionLineId, ''),
            NULLIF(orow.LineId, ''),
            NULLIF(orow.ProductionLineId, '')
        ) AS ResolvedLineId,
        COALESCE(
            NULLIF(b.ParentFromJson, ''),
            NULLIF(eq.ParentEquipmentId, '')
        ) AS ResolvedParentEquipmentId,
        LEFT(
            REPLACE(
                REPLACE(
                    REPLACE(
                        REPLACE(
                            REPLACE(b.CreatedTimestampRaw, '-', ''),
                            ' ', ''
                        ),
                        ':', ''
                    ),
                    'T', ''
                ),
                'Z', ''
            ),
            14
        ) AS TimestampSuffix
    FROM #EptBase b
    LEFT JOIN #SegResp sr
        ON sr.SegmentResponseId = b.SegmentResponseId
    LEFT JOIN #OpsResp orow
        ON orow.OperationsResponseId = COALESCE(NULLIF(b.OperationsResponseIdDirect, ''), NULLIF(sr.OperationsResponseId, ''))
    LEFT JOIN Equipments eq
        ON eq.Id = b.EquipmentId
),
Computed AS
(
    SELECT
        r.DbRowId,
        r.OldRecordId,
        ISNULL(NULLIF(r.ResolvedPlantId, ''), 'UNKNOWN-PLANT') AS FinalPlantId,
        ISNULL(NULLIF(r.ResolvedLineId, ''), 'UNKNOWN-LINE') AS FinalLineId,
        NULLIF(r.ResolvedParentEquipmentId, '') AS FinalParentEquipmentId,
        ISNULL(NULLIF(r.EquipmentId, ''), 'UNKNOWN-EQ') AS FinalEquipmentId,
        ISNULL(NULLIF(r.EquipmentPropertyId, ''), 'UNKNOWN-PROP') AS FinalEquipmentPropertyId,
        CASE
            WHEN LEN(ISNULL(r.TimestampSuffix, '')) = 14 THEN r.TimestampSuffix
            ELSE '19700101000000'
        END AS FinalTimestampSuffix
    FROM Resolved r
)
INSERT INTO #EptMap
(
    DbRowId,
    OldRecordId,
    NewRecordId,
    BaseIdWithoutTimestamp,
    ResolvedPlantId,
    ResolvedLineId,
    ResolvedParentEquipmentId,
    TimestampSuffix
)
SELECT
    c.DbRowId,
    c.OldRecordId,
    CASE
        WHEN c.FinalParentEquipmentId IS NOT NULL
            THEN 'PROP-TRACK-' + c.FinalPlantId + '-' + c.FinalLineId + '-' + c.FinalParentEquipmentId + '-CHILD-' + c.FinalEquipmentId + '-' + c.FinalEquipmentPropertyId + '-' + c.FinalTimestampSuffix
        ELSE 'PROP-TRACK-' + c.FinalPlantId + '-' + c.FinalLineId + '-' + c.FinalEquipmentId + '-' + c.FinalEquipmentPropertyId + '-' + c.FinalTimestampSuffix
    END AS NewRecordId,
    CASE
        WHEN c.FinalParentEquipmentId IS NOT NULL
            THEN 'PROP-TRACK-' + c.FinalPlantId + '-' + c.FinalLineId + '-' + c.FinalParentEquipmentId + '-CHILD-' + c.FinalEquipmentId + '-' + c.FinalEquipmentPropertyId
        ELSE 'PROP-TRACK-' + c.FinalPlantId + '-' + c.FinalLineId + '-' + c.FinalEquipmentId + '-' + c.FinalEquipmentPropertyId
    END AS BaseIdWithoutTimestamp,
    c.FinalPlantId,
    c.FinalLineId,
    c.FinalParentEquipmentId,
    c.FinalTimestampSuffix
FROM Computed c;

-- Helpful index for batch update join/filter
CREATE INDEX IX_EptMap_DbRowId ON #EptMap (DbRowId);

-- -----------------------------------------------------------------------------
-- Step 4: preview stats
-- -----------------------------------------------------------------------------
SELECT COUNT(*) AS TotalRowsToUpdate FROM #EptMap;

SELECT TOP (20)
    m.OldRecordId,
    m.BaseIdWithoutTimestamp,
    m.NewRecordId,
    m.ResolvedPlantId,
    m.ResolvedLineId,
    m.ResolvedParentEquipmentId,
    m.TimestampSuffix
FROM #EptMap m
ORDER BY m.DbRowId;

-- Duplicate preview in target key (should be 0 before update)
SELECT NewRecordId, COUNT(*) AS Cnt
FROM #EptMap
GROUP BY NewRecordId
HAVING COUNT(*) > 1;

-- -----------------------------------------------------------------------------
-- Step 5: batched update on GenericDataStores using OldRecordId
-- -----------------------------------------------------------------------------
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
        m.OldRecordId,
        m.NewRecordId,
        m.BaseIdWithoutTimestamp,
        m.ResolvedPlantId,
        m.ResolvedLineId,
        m.ResolvedParentEquipmentId
    FROM #EptMap m
    INNER JOIN GenericDataStores g
        ON g.StoreName = 'equipmentPropertyTracking'
       AND g.RecordId = m.OldRecordId
    ORDER BY m.DbRowId;

    IF @@ROWCOUNT = 0
    BEGIN
        SET @Rows = 0;
        BREAK;
    END

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

        -- Remove processed rows from map so each loop is O(batch), not O(total)
        DELETE m
        FROM #EptMap m
        INNER JOIN #Batch b
            ON b.OldRecordId = m.OldRecordId;

        COMMIT TRANSACTION;
        PRINT CONCAT('Batch ', @BatchNo, ': updated rows = ', @Rows);
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END

-- -----------------------------------------------------------------------------
-- Step 6: verification
-- -----------------------------------------------------------------------------
SELECT COUNT(*) AS RemainingInMap FROM #EptMap;

SELECT RecordId, COUNT(*) AS Cnt
FROM GenericDataStores
WHERE StoreName = 'equipmentPropertyTracking'
GROUP BY RecordId
HAVING COUNT(*) > 1;

SELECT TOP (50)
    RecordId,
    JSON_VALUE(DataJson, '$.id') AS JsonId,
    JSON_VALUE(DataJson, '$.plantId') AS plantId,
    JSON_VALUE(DataJson, '$.lineId') AS lineId,
    JSON_VALUE(DataJson, '$.parentEquipmentId') AS parentEquipmentId,
    JSON_VALUE(DataJson, '$.equipmentId') AS equipmentId,
    JSON_VALUE(DataJson, '$.equipmentPropertyId') AS equipmentPropertyId,
    JSON_VALUE(DataJson, '$.createdTimestamp') AS createdTimestamp
FROM GenericDataStores
WHERE StoreName = 'equipmentPropertyTracking'
ORDER BY Id DESC;
