# Functional Relationship Test Cases (Real DB Data)

Data source: `ISA95Migrations_SQL2022` (localhost)
Snapshot date: 2026-04-08

This document contains functional test cases built from:

- Entity-to-entity mapping configuration in `migrationCurrent.dump.json`
- Real records currently available in the database
- Relationship chains requested by the user

## TC-FUNC-REL-001

### Title
Operations Event Class filter returns related Operation Event Definitions and related Operations Event Records.

### Relationship Path

1. `Operationseventclass -> Operationseventdefinition`
2. `Operationseventdefinition -> Operationseventrecord`

### Mapping/Attribute Basis

- Mapping entry: `Operations Event Definition_to_Operations Event Class_mapping`
- Join attribute: `OperationEventDefinitions.EventCategory = OperationsEventClasses.OperationsEventClassID`
- Relationship type in mapping: `isAMemberOf`

### Filter Parameters (Entity Attributes)

- `OperationsEventClassID = 'Production'`

### Execution Steps (API-oriented)

1. Call `GET /api/masterdata/operations-event-classes`.
2. Filter records where `operationsEventClassID == 'Production'`.
3. Call `GET /api/masterdata/operation-event-definitions`.
4. Filter records where `eventCategory == 'Production'`.
5. Call `GET /api/masterdata/operations-event-records`.
6. Filter records where `operationsEventDefinitionID` is in the definition IDs from step 4.

### Expected Value / Expected Records

Expected `OperationsEventClasses` records:

- `Production`

Expected `OperationEventDefinitions` records (`eventCategory = Production`):

1. `OED-PROD-BAKE-END`
2. `OED-PROD-BAKE-START`
3. `OED-PROD-MIX-END`
4. `OED-PROD-MIX-START`
5. `OED-PROD-PACK-END`
6. `OED-PROD-PACK-START`

Expected `OperationsEventRecords` records (linked through definition IDs above):

1. `OER-T-008` -> `OED-PROD-MIX-START`
2. `OER-T-009` -> `OED-PROD-MIX-END`
3. `OER-T-010` -> `OED-PROD-BAKE-START`
4. `OER-T-011` -> `OED-PROD-BAKE-END`
5. `OER-T-012` -> `OED-PROD-PACK-START`
6. `OER-T-013` -> `OED-PROD-PACK-END`

### Pass Criteria

- Exactly 1 class record for `Production`
- Exactly 6 related definition records with `eventCategory = Production`
- Exactly 6 related event record rows with definition IDs from that set

## TC-FUNC-REL-002

### Title
Operations Request filter returns related Segment Requirements, and each Segment Requirement returns related Material Requirements and Equipment Requirements.

### Relationship Path

1. `OperationsRequest -> SegmentRequirement`
2. `SegmentRequirement -> Materialrequirement`
3. `SegmentRequirement -> Equipmentrequirement`

### Mapping/Attribute Basis

- Mapping entry: `Operations Request_to_Segment Requirement_mapping`
  - Join attribute: `segment_requirements.operationsRequestId -> OperationsRequest.id`
- Mapping entry: `Segment requirement_to_Material requirement_mapping`
  - Join attribute: `segment_material_requirements.segmentRequirementId -> SegmentRequirement.id`
- Mapping entry: `Segment Requirement_to_Equipment Requirement_mapping`
  - Join attribute: `segment_equipment_requirements.segmentRequirementId -> SegmentRequirement.id`

### Filter Parameters (Entity Attributes)

- `OperationsRequest.id = 'OR-PLANT01MUNICH-LINE-01-202601270827-801'`

### Execution Steps (API-oriented)

1. Call `GET /api/genericdata/operationsRequests`.
2. Filter record where `id == 'OR-PLANT01MUNICH-LINE-01-202601270827-801'`.
3. Call `GET /api/genericdata/segmentRequirements`.
4. Filter records where `operationsRequestId == 'OR-PLANT01MUNICH-LINE-01-202601270827-801'`.
5. Collect filtered `segmentRequirement.id` values.
6. Call `GET /api/genericdata/segmentMaterialRequirements`.
7. Filter records where `segmentRequirementId` is in collected segment requirement IDs.
8. Call `GET /api/genericdata/segmentEquipmentRequirements`.
9. Filter records where `segmentRequirementId` is in collected segment requirement IDs.

### Expected Value / Expected Records

Expected `segmentRequirements` records:

1. `SR-PLANT01MUNICH-LINE-01-202601270827-001-BREAD-750G-MIX`
2. `SR-PLANT01MUNICH-LINE-01-202601270827-002-BREAD-750G-BAKE`
3. `SR-PLANT01MUNICH-LINE-01-202601270827-003-BREAD-750G-PACK`

Expected `segmentMaterialRequirements` records (for the 3 segment requirement IDs above):

1. `SMR-PLANT01MUNICH-LINE-01-202601270827-001-BREAD-750G-MIX` (materialId: `Flour_Type_550`)
2. `SMR-PLANT01MUNICH-LINE-01-202601270827-002-BREAD-750G-MIX` (materialId: `Water`)
3. `SMR-PLANT01MUNICH-LINE-01-202601270827-003-BREAD-750G-MIX` (materialId: `Yeast`)
4. `SMR-PLANT01MUNICH-LINE-01-202601270827-004-BREAD-750G-MIX` (materialId: `Salt`)
5. `SMR-PLANT01MUNICH-LINE-01-202601270827-001-BREAD-750G-BAKE` (materialId: `Dough`)
6. `SMR-PLANT01MUNICH-LINE-01-202601270827-001-BREAD-750G-PACK` (materialId: `Paper`)
7. `SMR-PLANT01MUNICH-LINE-01-202601270827-OUTPUT-BREAD-750G-PACK` (materialId: `BREAD-750G`)

Expected `segmentEquipmentRequirements` records (for the 3 segment requirement IDs above):

1. `SER-PLANT01MUNICH-LINE-01-202601270827-001-BREAD-750G-MIX` (equipmentId: `EQ-MIX-01`)
2. `SER-PLANT01MUNICH-LINE-01-202601270827-001-BREAD-750G-BAKE` (equipmentId: `EQ-OVEN-01`)
3. `SER-PLANT01MUNICH-LINE-01-202601270827-001-BREAD-750G-PACK` (equipmentId: `EQ-PACKAGE-01`)

### Pass Criteria

- Exactly 3 segment requirements for the filtered operations request
- Exactly 7 related material requirements across those segment requirements
- Exactly 3 related equipment requirements across those segment requirements
- Every material/equipment requirement row has `segmentRequirementId` belonging to one of the 3 expected segment requirement IDs

## Validation SQL (Optional Oracle for Expected Set)

These SQL statements can be used as an oracle to validate API output:

```sql
-- TC-FUNC-REL-001
SELECT c.OperationsEventClassID, d.Id AS DefinitionId, r.Id AS RecordId
FROM OperationsEventClasses c
LEFT JOIN OperationEventDefinitions d ON d.EventCategory = c.OperationsEventClassID
LEFT JOIN OperationsEventRecords r ON r.OperationsEventDefinitionID = d.Id
WHERE c.OperationsEventClassID = 'Production'
ORDER BY d.Id, r.Id;

-- TC-FUNC-REL-002
DECLARE @orid NVARCHAR(200) = 'OR-PLANT01MUNICH-LINE-01-202601270827-801';

SELECT RecordId AS SegmentRequirementId
FROM GenericDataStores
WHERE StoreName='segmentRequirements'
  AND JSON_VALUE(DataJson,'$.operationsRequestId')=@orid
ORDER BY RecordId;

SELECT RecordId AS SegmentMaterialRequirementId,
       JSON_VALUE(DataJson,'$.segmentRequirementId') AS SegmentRequirementId,
       JSON_VALUE(DataJson,'$.materialId') AS MaterialId
FROM GenericDataStores
WHERE StoreName='segmentMaterialRequirements'
  AND JSON_VALUE(DataJson,'$.segmentRequirementId') IN (
      SELECT RecordId
      FROM GenericDataStores
      WHERE StoreName='segmentRequirements'
        AND JSON_VALUE(DataJson,'$.operationsRequestId')=@orid
  )
ORDER BY SegmentRequirementId, SegmentMaterialRequirementId;

SELECT RecordId AS SegmentEquipmentRequirementId,
       JSON_VALUE(DataJson,'$.segmentRequirementId') AS SegmentRequirementId,
       JSON_VALUE(DataJson,'$.equipmentId') AS EquipmentId
FROM GenericDataStores
WHERE StoreName='segmentEquipmentRequirements'
  AND JSON_VALUE(DataJson,'$.segmentRequirementId') IN (
      SELECT RecordId
      FROM GenericDataStores
      WHERE StoreName='segmentRequirements'
        AND JSON_VALUE(DataJson,'$.operationsRequestId')=@orid
  )
ORDER BY SegmentRequirementId, SegmentEquipmentRequirementId;
```
