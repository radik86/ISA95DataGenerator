-- =============================================================================
-- fix-packaging-segment-end-dates.sql
-- Fixes packaging segmentRequirements whose latestEndDateTime is not after
-- the previous segment sequence end within the same operationsRequest.
--
-- Default behavior:
-- - Adds duration per PACK processSegmentId using @PackDurations mapping table
-- - Updates only StoreName='segmentRequirements'
-- - Updates UpdatedAt to current UTC time
--
-- Safe behavior:
-- - Targets only rows where PACK end <= previous sequence end
-- - Preview mode is ON by default
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @MinutesToAdd INT = 60;
DECLARE @PreviewOnly BIT = 1; -- 1 = preview only, 0 = apply update
DECLARE @UtcNow DATETIME2(7) = SYSUTCDATETIME();

DECLARE @PackDurations TABLE (
    processSegmentId NVARCHAR(200) PRIMARY KEY,
    durationHours DECIMAL(10,2) NOT NULL
);

INSERT INTO @PackDurations (processSegmentId, durationHours)
VALUES
    ('BAGUETTE-250G-PACK', 0.50),
    ('BREAD-750G-PACK', 1.00),
    ('LOAF-750G-PACK', 1.00),
    ('PITA-200G-PACK', 0.75);

-- Optional visibility check: PACK segments present in data but missing in mapping table
SELECT DISTINCT
        JSON_VALUE(g.DataJson, '$.processSegmentId') AS UnmappedProcessSegmentId
FROM dbo.GenericDataStores g
WHERE g.StoreName = 'segmentRequirements'
    AND JSON_VALUE(g.DataJson, '$.operationsRequestId') LIKE 'OR-%'
    AND JSON_VALUE(g.DataJson, '$.processSegmentId') LIKE '%-PACK'
    AND JSON_VALUE(g.DataJson, '$.processSegmentId') NOT IN (SELECT processSegmentId FROM @PackDurations)
ORDER BY UnmappedProcessSegmentId;

IF OBJECT_ID('tempdb..#targets') IS NOT NULL DROP TABLE #targets;

;WITH sr AS (
    SELECT
        g.Id,
        g.RecordId,
        JSON_VALUE(g.DataJson, '$.operationsRequestId') AS operationsRequestId,
        JSON_VALUE(g.DataJson, '$.processSegmentId') AS processSegmentId,
        TRY_CONVERT(INT, JSON_VALUE(g.DataJson, '$.sequence')) AS sequenceNo,
        TRY_CONVERT(DATETIME2, JSON_VALUE(g.DataJson, '$.earliestStartDateTime')) AS earliestStartDateTime,
        TRY_CONVERT(DATETIME2, JSON_VALUE(g.DataJson, '$.latestEndDateTime')) AS latestEndDateTime
    FROM dbo.GenericDataStores g WITH (INDEX(IX_GenericDataStores_StoreName))
    WHERE g.StoreName = 'segmentRequirements'
),
prev_seq AS (
    SELECT
        cur.Id,
        MAX(prev.latestEndDateTime) AS prevSequenceEndDateTime
    FROM sr cur
    JOIN sr prev
        ON prev.operationsRequestId = cur.operationsRequestId
       AND prev.sequenceNo < cur.sequenceNo
    GROUP BY cur.Id
)
SELECT
    s.Id,
    s.RecordId,
    s.operationsRequestId,
    s.processSegmentId,
    s.sequenceNo,
    s.earliestStartDateTime,
    s.latestEndDateTime AS oldLatestEndDateTime,
    p.prevSequenceEndDateTime,
        d.durationHours,
        DATEADD(MINUTE, CAST(d.durationHours * 60 AS INT), s.latestEndDateTime) AS newLatestEndDateTime
INTO #targets
FROM sr s
JOIN prev_seq p ON p.Id = s.Id
JOIN @PackDurations d ON d.processSegmentId = s.processSegmentId
WHERE s.processSegmentId LIKE '%-PACK'
  AND s.earliestStartDateTime IS NOT NULL
  AND s.latestEndDateTime IS NOT NULL
  AND p.prevSequenceEndDateTime IS NOT NULL
  AND s.latestEndDateTime <= p.prevSequenceEndDateTime;

SELECT COUNT(*) AS TargetRows, @PreviewOnly AS PreviewOnly
FROM #targets;

SELECT
    RecordId,
    operationsRequestId,
    processSegmentId,
    sequenceNo,
    durationHours,
    CONVERT(VARCHAR(19), earliestStartDateTime, 120) AS earliestStartDateTime,
    CONVERT(VARCHAR(19), oldLatestEndDateTime, 120) AS oldLatestEndDateTime,
    CONVERT(VARCHAR(19), prevSequenceEndDateTime, 120) AS prevSequenceEndDateTime,
    CONVERT(VARCHAR(19), newLatestEndDateTime, 120) AS newLatestEndDateTime
FROM #targets
ORDER BY operationsRequestId, sequenceNo;

IF @PreviewOnly = 1
BEGIN
    PRINT 'Preview mode only. Set @PreviewOnly = 0 to apply updates.';
    RETURN;
END;

BEGIN TRAN;

UPDATE g
SET
    g.DataJson = JSON_MODIFY(
        g.DataJson,
        '$.latestEndDateTime',
        CONVERT(VARCHAR(19), t.newLatestEndDateTime, 120)
    ),
    g.UpdatedAt = @UtcNow
FROM dbo.GenericDataStores g
JOIN #targets t ON t.Id = g.Id;

SELECT @@ROWCOUNT AS RowsUpdated;

-- Post-update verification (should return zero rows)
;WITH sr AS (
    SELECT
        g.Id,
        g.RecordId,
        JSON_VALUE(g.DataJson, '$.operationsRequestId') AS operationsRequestId,
        JSON_VALUE(g.DataJson, '$.processSegmentId') AS processSegmentId,
        TRY_CONVERT(INT, JSON_VALUE(g.DataJson, '$.sequence')) AS sequenceNo,
        TRY_CONVERT(DATETIME2, JSON_VALUE(g.DataJson, '$.latestEndDateTime')) AS latestEndDateTime
    FROM dbo.GenericDataStores g
    WHERE g.StoreName = 'segmentRequirements'
),
prev_seq AS (
    SELECT
        cur.Id,
        MAX(prev.latestEndDateTime) AS prevSequenceEndDateTime
    FROM sr cur
    JOIN sr prev
        ON prev.operationsRequestId = cur.operationsRequestId
       AND prev.sequenceNo < cur.sequenceNo
    GROUP BY cur.Id
)
SELECT
    s.RecordId,
    s.operationsRequestId,
    s.processSegmentId,
    s.sequenceNo,
    CONVERT(VARCHAR(19), s.latestEndDateTime, 120) AS latestEndDateTime,
    CONVERT(VARCHAR(19), p.prevSequenceEndDateTime, 120) AS prevSequenceEndDateTime
FROM sr s
JOIN prev_seq p ON p.Id = s.Id
WHERE s.processSegmentId LIKE '%-PACK'
  AND s.latestEndDateTime <= p.prevSequenceEndDateTime
ORDER BY s.operationsRequestId, s.sequenceNo;

COMMIT TRAN;
