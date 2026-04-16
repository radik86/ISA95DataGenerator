SET NOCOUNT ON;

;WITH sr AS (
    SELECT
        g.RecordId,
        JSON_VALUE(g.DataJson, '$.operationsRequestId') AS operationsRequestId,
        JSON_VALUE(g.DataJson, '$.processSegmentId') AS processSegmentId,
        TRY_CONVERT(DATETIME2, JSON_VALUE(g.DataJson, '$.latestEndDateTime')) AS latestEndDateTime,
        g.UpdatedAt
    FROM dbo.GenericDataStores g
    WHERE g.StoreName = 'segmentRequirements'
      AND JSON_VALUE(g.DataJson, '$.operationsRequestId') LIKE 'OR-%'
      AND (
            JSON_VALUE(g.DataJson, '$.processSegmentId') LIKE '%-BAKE'
         OR JSON_VALUE(g.DataJson, '$.processSegmentId') LIKE '%-PACK'
      )
),
ranked AS (
    SELECT
        s.*,
        CASE
            WHEN s.processSegmentId LIKE '%-BAKE' THEN 'BAKE'
            WHEN s.processSegmentId LIKE '%-PACK' THEN 'PACK'
        END AS stepType,
        CASE
            WHEN s.processSegmentId LIKE '%-BAKE' THEN LEFT(s.processSegmentId, LEN(s.processSegmentId) - 5)
            WHEN s.processSegmentId LIKE '%-PACK' THEN LEFT(s.processSegmentId, LEN(s.processSegmentId) - 5)
        END AS productKey,
        ROW_NUMBER() OVER (
            PARTITION BY
                s.operationsRequestId,
                CASE
                    WHEN s.processSegmentId LIKE '%-BAKE' THEN LEFT(s.processSegmentId, LEN(s.processSegmentId) - 5)
                    WHEN s.processSegmentId LIKE '%-PACK' THEN LEFT(s.processSegmentId, LEN(s.processSegmentId) - 5)
                END,
                CASE
                    WHEN s.processSegmentId LIKE '%-BAKE' THEN 'BAKE'
                    WHEN s.processSegmentId LIKE '%-PACK' THEN 'PACK'
                END
            ORDER BY s.latestEndDateTime DESC, s.UpdatedAt DESC, s.RecordId DESC
        ) AS rn
    FROM sr s
),
latest_per_step AS (
    SELECT
        operationsRequestId,
        productKey,
        stepType,
        RecordId,
        latestEndDateTime
    FROM ranked
    WHERE rn = 1
)
SELECT
    l.operationsRequestId,
    l.productKey,
    MAX(CASE WHEN l.stepType = 'BAKE' THEN l.RecordId END) AS bakeRecordId,
    MAX(CASE WHEN l.stepType = 'BAKE' THEN CONVERT(VARCHAR(19), l.latestEndDateTime, 120) END) AS bakeLatestEndDateTime,
    MAX(CASE WHEN l.stepType = 'PACK' THEN l.RecordId END) AS packRecordId,
    MAX(CASE WHEN l.stepType = 'PACK' THEN CONVERT(VARCHAR(19), l.latestEndDateTime, 120) END) AS packLatestEndDateTime,
    DATEDIFF(
        MINUTE,
        MAX(CASE WHEN l.stepType = 'BAKE' THEN l.latestEndDateTime END),
        MAX(CASE WHEN l.stepType = 'PACK' THEN l.latestEndDateTime END)
    ) AS packMinusBakeMinutes
FROM latest_per_step l
GROUP BY
    l.operationsRequestId,
    l.productKey
ORDER BY
    l.operationsRequestId,
    l.productKey;
