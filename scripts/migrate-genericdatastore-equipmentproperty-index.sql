-- =============================================================================
-- Schema migration: GenericDataStores unique index for equipmentPropertyTracking
--
-- CURRENT state:
--   Unique index IX_GenericDataStores_StoreName_RecordId on (StoreName, RecordId)
--   This index already works correctly when RecordId includes the timestamp
--   suffix, because each sample is uniquely addressed by its full key + time.
--
-- This script documents the index and provides options:
--   Option A (recommended): Keep existing unique index unchanged.
--                           RecordId now = base-pattern + timestamp suffix,
--                           so uniqueness is maintained at the application level.
--   Option B (alternative): Drop unique index on (StoreName, RecordId) and
--                            replace with unique on (StoreName, RecordId, CreatedAt).
--                            Only use this if you want RecordId to stay without
--                            timestamp and rely on DB-level CreatedAt for uniqueness.
-- =============================================================================

-- -----------------------------------------------------------------------
-- Option A: No schema change needed (recommended)
-- The existing index already enforces uniqueness.
-- Just verify the index exists:
-- -----------------------------------------------------------------------
SELECT
    i.name        AS IndexName,
    c.name        AS ColumnName,
    ic.key_ordinal
FROM sys.indexes i
JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
JOIN sys.columns c        ON c.object_id  = ic.object_id AND c.column_id = ic.column_id
WHERE i.object_id = OBJECT_ID('GenericDataStores')
  AND i.is_unique = 1
ORDER BY i.name, ic.key_ordinal;


-- -----------------------------------------------------------------------
-- Option B: Change uniqueness to (StoreName, RecordId, CreatedAt)
-- Only run this if you chose to keep RecordId WITHOUT timestamp suffix
-- and want the DB to enforce uniqueness on the combination.
-- -----------------------------------------------------------------------
/*
-- Drop existing unique index
DROP INDEX IF EXISTS IX_GenericDataStores_StoreName_RecordId ON GenericDataStores;

-- Create new unique index including CreatedAt
CREATE UNIQUE INDEX IX_GenericDataStores_StoreName_RecordId_CreatedAt
    ON GenericDataStores (StoreName, RecordId, CreatedAt);

-- Verify
SELECT
    i.name        AS IndexName,
    c.name        AS ColumnName,
    ic.key_ordinal,
    i.is_unique
FROM sys.indexes i
JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
JOIN sys.columns c        ON c.object_id  = ic.object_id AND c.column_id = ic.column_id
WHERE i.object_id = OBJECT_ID('GenericDataStores')
  AND i.name LIKE '%StoreName%'
ORDER BY i.name, ic.key_ordinal;
*/
