SET NOCOUNT ON;

;WITH sr AS (
    SELECT
        g.Id,
        g.RecordId,
        g.CreatedAt,
        g.UpdatedAt,
        JSON_VALUE(g.DataJson, '$.operationsRequestId') AS operationsRequestId,
        JSON_VALUE(g.DataJson, '$.processSegmentId') AS processSegmentId,
        TRY_CONVERT(INT, JSON_VALUE(g.DataJson, '$.sequence')) AS sequenceNo,
        TRY_CONVERT(DATETIME2, JSON_VALUE(g.DataJson, '$.latestEndDateTime')) AS latestEndDateTime
    FROM dbo.GenericDataStores g
    WHERE g.StoreName = 'segmentRequirements'
      AND JSON_VALUE(g.DataJson, '$.processSegmentId') LIKE '%-PACK'
),
latest_pack AS (
    SELECT
        s.*,
        ROW_NUMBER() OVER (
            PARTITION BY s.operationsRequestId, s.processSegmentId
            ORDER BY s.UpdatedAt DESC, s.CreatedAt DESC, s.Id DESC
        ) AS rn
    FROM sr s
)
SELECT
    Id,
    RecordId,
    operationsRequestId,
    processSegmentId,
    sequenceNo,
    CONVERT(VARCHAR(19), latestEndDateTime, 120) AS currentLatestEndDateTime,
    CONVERT(VARCHAR(19), DATEADD(HOUR, 1, latestEndDateTime), 120) AS plus1hLatestEndDateTime,
    UpdatedAt
FROM latest_pack
WHERE rn = 1
ORDER BY operationsRequestId, processSegmentId;
