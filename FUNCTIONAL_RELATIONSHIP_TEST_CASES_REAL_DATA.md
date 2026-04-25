# ISA-95 Functional Relationship Test Cases

**Data Source:** Real migration snapshot (2026-04-17)

**Timestamp Validation Requirement:**

Every test case must validate and report `sourceTimeStamp` for:
- Source entity record
- Each related target entity record
- Mapping rows used to establish relationships

## TC-FUNC-REL-001

**Relationship Chain:** Operations Event Class -> Operation Event Definition -> Operations Event Record

**Filter:**
- Operations Event Class ID = `'Production'`
- sourceTimeStamp expectations:
	- Operations Event Class: non-empty ISO-8601 value
	- Operation Event Definition: non-empty ISO-8601 value
	- Operations Event Record: non-empty ISO-8601 value

**Expected Results:**
- **Operations Event Class:** 1 record (`Production`)
- **Operation Event Definition:** 6 records (OED-PROD-BAKE-END, OED-PROD-BAKE-START, OED-PROD-MIX-END, OED-PROD-MIX-START, OED-PROD-PACK-END, OED-PROD-PACK-START)
- **Operations Event Record:** 6 records (OER-T-008, OER-T-009, OER-T-010, OER-T-011, OER-T-012, OER-T-013)

**Validation Criteria:**
- Operations Event Class with id `Production` exists
- All 6 Operation Event Definition records reference this class
- All 6 Operations Event Record records reference one of the definitions
- All records have valid `sourceTimeStamp` values

## TC-FUNC-REL-002

**Relationship Chain:** Operations Request -> Segment Requirement -> Material Requirement; Segment Requirement -> Equipment Requirement

**Filter:**
- Operations Request ID = `'OR-PLANT01MUNICH-LINE-01-202601270827-801'`
- sourceTimeStamp expectations:
	- Operations Request: non-empty ISO-8601 value (expected in snapshot: `2026-01-01T06:30:00.000Z`)
	- Segment Requirement: non-empty ISO-8601 value
	- Material Requirement: non-empty ISO-8601 value
	- Equipment Requirement: non-empty ISO-8601 value

**Expected Results:**
- **Segment Requirement:** 3 records
- **Material Requirement:** 7 records
- **Equipment Requirement:** 3 records

**Validation Criteria:**
- Operations Request with id `OR-PLANT01MUNICH-LINE-01-202601270827-801` exists
- Exactly 3 Segment Requirement records reference this Operations Request
- Exactly 7 Material Requirement records reference one of those 3 Segment Requirements
- Exactly 3 Equipment Requirement records reference one of those 3 Segment Requirements
- All records have valid `sourceTimeStamp` values

## Validation SQL (Evaluation Oracle)

These SQL statements can be used to evaluate expected record sets for TC-FUNC-REL-001 and TC-FUNC-REL-002.

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

## TC-FUNC-REL-003

**Relationship Chain:** Operations Response -> Operations Request; Operations Response -> Segment Response

**Filter:**
- Operations Response ID = `'OPS-RESP-PLANT01MUNICH-LINE-01-202604161209-216'`
- sourceTimeStamp filters / expected values:
	- Operations Response: `2026-01-01T06:30:00.000Z`
	- Operations Request: `2026-01-01T06:30:00.000Z`
	- Segment Response: non-empty ISO-8601 value

**Expected Results:**
- **Operations Request:** 1 record (OR-PLANT01MUNICH-LINE-01-202601270827-801)
- **Segment Response:** 6 records

**Validation Criteria:**
- Operations Response with filtered id exists
- Exactly 1 Operations Request is linked to this response
- Exactly 6 Segment Response records are linked to this response
- All records have valid `sourceTimeStamp` values

**Timestamp Evidence (Real Data Snapshot):**
- Operations Response: `sourceTimeStamp = 2026-01-01T06:30:00.000Z`
- Operations Request: `sourceTimeStamp = 2026-01-01T06:30:00.000Z`

## TC-FUNC-REL-004

**Relationship Chain:** Material Lot -> Material Sublot; Material Lot -> Material Lot Property

**Filter:**
- Material Lot ID = `'LOT-PLANT01MUNICH-LINE-01-202601011230-BREAD-750G-R1'`
- sourceTimeStamp filters / expected values:
	- Material Lot: `2026-01-01T11:30:00.000Z`
	- Material Sublot: `2026-01-01T11:30:00.000Z` (expected set)
	- Material Lot Property: `2026-01-01T11:30:00.000Z` (expected set)

**Expected Results:**
- **Material Sublot:** 4 records
- **Material Lot Property:** 1 record

**Validation Criteria:**
- Material Lot with filtered id exists
- Exactly 4 Material Sublot records are linked to this lot
- Exactly 1 Material Lot Property record is linked to this lot
- All records have valid `sourceTimeStamp` values

**Timestamp Evidence (Real Data Snapshot):**
- Material Lot: `sourceTimeStamp = 2026-01-01T11:30:00.000Z`
- Material Sublot mappings: `sourceTimeStamp = 2026-01-01T11:30:00.000Z`
- Material Lot Property mappings: `sourceTimeStamp = 2026-01-01T11:30:00.000Z`

## TC-FUNC-REL-005

**Relationship Chain:** Test Result -> Material Lot -> Material Sublot

**Filter:**
- Test Result ID = `'TEST-LOT-PLANT01MUNICH-LINE-01-202601011230-BREAD-750G-R1-083'`
- sourceTimeStamp filters / expected values:
	- Test Result: `2026-01-01T10:50:00.000Z`
	- Material Lot: `2026-01-01T11:30:00.000Z`
	- Material Sublot: `2026-01-01T11:30:00.000Z` (expected set)

**Expected Results:**
- **Material Lot:** 1 record (LOT-PLANT01MUNICH-LINE-01-202601011230-BREAD-750G-R1)
- **Material Sublot:** 4 records

**Validation Criteria:**
- Test Result with filtered id exists
- Exactly 1 Material Lot is linked to this Test Result
- Exactly 4 Material Sublot records are linked to that Material Lot
- All records have valid `sourceTimeStamp` values

**Timestamp Evidence (Real Data Snapshot):**
- Test Result: `sourceTimeStamp = 2026-01-01T10:50:00.000Z`
- Material Lot: `sourceTimeStamp = 2026-01-01T11:30:00.000Z`
- Material Lot -> Material Sublot mappings: `sourceTimeStamp = 2026-01-01T11:30:00.000Z`

---

## TC-FUNC-REL-006

**Relationship Chain:** Operations Response -> Segment Response -> Material Actual

**Filter:**
- Operations Response ID = `'OPS-RESP-PLANT01MUNICH-LINE-01-202604161209-216'`
- sourceTimeStamp filters / expected values:
  - Operations Response: `2026-01-01T06:30:00.000Z`
  - Segment Response: values between `2026-01-01T06:30:00.000Z` and `2026-01-01T12:30:00.000Z` (4 distinct windows)
  - Material Actual: values between `2026-01-01T06:30:00.000Z` and `2026-01-01T12:30:00.000Z`

**Expected Results:**
- **Segment Response:** 6 records
  - SEG-RESP-PLANT01MUNICH-LINE-01-202601010730-RUN1-658
  - SEG-RESP-PLANT01MUNICH-LINE-01-202601010930-RUN1-971
  - SEG-RESP-PLANT01MUNICH-LINE-01-202601010930-RUN2-903
  - SEG-RESP-PLANT01MUNICH-LINE-01-202601011130-RUN1-425
  - SEG-RESP-PLANT01MUNICH-LINE-01-202601011130-RUN2-027
  - SEG-RESP-PLANT01MUNICH-LINE-01-202601011330-RUN2-235
- **Material Actual:** 14 records (consumed materials across all segment responses)

**Validation Criteria:**
- Operations Response with filtered id exists
- Exactly 6 Segment Response records are linked to this Operations Response
- Exactly 14 Material Actual records are linked across those 6 Segment Responses
- All records have valid `sourceTimeStamp` values

**Timestamp Evidence (Real Data Snapshot):**
- Operations Response -> Segment Response mappings: timestamps `2026-01-01T06:30:00.000Z`, `2026-01-01T08:30:00.000Z`, `2026-01-01T10:30:00.000Z`, `2026-01-01T12:30:00.000Z`
- Segment Response -> Material Actual mappings: same 4 timestamp windows

---

## TC-FUNC-REL-007

**Relationship Chain:** Operations Response -> Segment Response -> Equipment Actual -> Equipment

**Filter:**
- Operations Response ID = `'OPS-RESP-PLANT01MUNICH-LINE-01-202604161209-216'`
- sourceTimeStamp filters / expected values:
  - Operations Response: `2026-01-01T06:30:00.000Z`
  - Segment Response: values between `2026-01-01T06:30:00.000Z` and `2026-01-01T12:30:00.000Z`
  - Equipment Actual: values between `2026-01-01T06:30:00.000Z` and `2026-01-01T12:30:00.000Z`
  - Equipment: non-empty ISO-8601 value

**Expected Results:**
- **Segment Response:** 6 records
- **Equipment Actual:** 6 records
  - EQ-ACT-PLANT01MUNICH-LINE-01-202601010730-EQ-MIX-01-36-Production-2-Hours
  - EQ-ACT-PLANT01MUNICH-LINE-01-202601010930-EQ-MIX-01-17-Production-2-Hours
  - EQ-ACT-PLANT01MUNICH-LINE-01-202601010930-EQ-OVEN-01-02-Production-2-Hours
  - EQ-ACT-PLANT01MUNICH-LINE-01-202601011130-EQ-OVEN-01-23-Production-2-Hours
  - EQ-ACT-PLANT01MUNICH-LINE-01-202601011130-EQ-PACKAGE-01-94-Production-1-Hours
  - EQ-ACT-PLANT01MUNICH-LINE-01-202601011330-EQ-PACKAGE-01-58-Production-1-Hours
- **Equipment:** 3 distinct records (EQ-MIX-01, EQ-OVEN-01, EQ-PACKAGE-01)

**Validation Criteria:**
- Operations Response with filtered id exists
- Exactly 6 Segment Response records are linked to this Operations Response
- Exactly 6 Equipment Actual records are linked across those Segment Responses
- Exactly 3 distinct Equipment records are resolved from those Equipment Actuals
- All records have valid `sourceTimeStamp` values

**Timestamp Evidence (Real Data Snapshot):**
- Operations Response -> Segment Response mappings: `2026-01-01T06:30:00.000Z`, `2026-01-01T08:30:00.000Z`, `2026-01-01T10:30:00.000Z`, `2026-01-01T12:30:00.000Z`
- Segment Response -> Equipment Actual mappings: same 4 timestamp windows
- Equipment Actual -> Equipment mappings: same 4 timestamp windows

---

## TC-FUNC-REL-008

**Relationship Chain:** Operations Request -> Segment Requirement -> Material Requirement; Segment Requirement -> Equipment Requirement

> Extension of TC-FUNC-REL-002 that also validates the Equipment Requirement resolves to Equipment master data via Equipment Requirement -> Equipment mapping.

**Filter:**
- Operations Request ID = `'OR-PLANT01MUNICH-LINE-01-202601270827-801'`
- sourceTimeStamp filters / expected values:
  - Operations Request: `2026-01-01T06:30:00.000Z`
  - Segment Requirement: non-empty ISO-8601 value
  - Material Requirement: non-empty ISO-8601 value
  - Equipment Requirement: non-empty ISO-8601 value
  - Equipment (resolved via Equipment Requirement): non-empty ISO-8601 value

**Expected Results:**
- **Segment Requirement:** 3 records (SR-...-MIX, SR-...-BAKE, SR-...-PACK)
- **Material Requirement:** 7 records (SMR-... entries with Flour, Water, Yeast, Salt, Dough, Paper, BREAD-750G)
- **Equipment Requirement:** 3 records (SER-... entries for EQ-MIX-01, EQ-OVEN-01, EQ-PACKAGE-01)
- **Equipment:** 3 distinct records (EQ-MIX-01, EQ-OVEN-01, EQ-PACKAGE-01)

**Validation Criteria:**
- Operations Request with filtered id exists
- Exactly 3 Segment Requirement records reference this Operations Request
- Exactly 7 Material Requirement records reference those Segment Requirements
- Exactly 3 Equipment Requirement records reference those Segment Requirements
- Each Equipment Requirement resolves to 1 Equipment record
- All records have valid `sourceTimeStamp` values

---

## TC-FUNC-REL-009

**Relationship Chain:** Operations Event -> Segment Response (via Operations Event Record -> Operations Event Record Entry -> Segment Response)

**Filter:**
- Operations Event ID = `'OPS-EVENT-SEG-RESP-PLANT01MUNICH-LINE-01-202601012230-RUN1-841-OED-PROC-MIXERR-160'`
- operationsEventType = `'Alarm'`
- sourceTimeStamp filters / expected values:
  - Operations Event: `2026-01-01T21:37:15.000Z`
  - Operations Event Record: `2026-01-01T21:37:15.000Z`
  - Operations Event Record Entry: `2026-01-01T21:42:15.000Z`
  - Segment Response: `2026-01-01T21:30:00.000Z`

**Expected Results:**
- **Operations Event Definition:** 1 record (`OED-PROC-MIXERR`)
- **Operations Event Record:** 1 record
- **Operations Event Record Entry:** 1 record
- **Segment Response:** 1 record (`SEG-RESP-PLANT01MUNICH-LINE-01-202601012230-RUN1-841`)

**Validation Criteria:**
- Operations Event with filtered id exists and has operationsEventType = `Alarm`
- Exactly 1 Operation Event Definition is linked to this event
- Exactly 1 Operations Event Record is linked to this event
- That record has Exactly 1 Operations Event Record Entry
- That entry resolves to exactly 1 Segment Response
- All records have valid `sourceTimeStamp` values

**Timestamp Evidence (Real Data Snapshot):**
- Operations Event: `sourceTimeStamp = 2026-01-01T21:37:15.000Z`
- Operations Event -> Operations Event Definition mapping: `2026-01-01T21:37:15.000Z`
- Operations Event -> Operations Event Record mapping: `2026-01-01T21:37:15.000Z`
- Operations Event Record -> Operations Event Record Entry mapping: `2026-01-01T21:42:15.000Z`
- Operations Event Record Entry -> Segment Response mapping: `2026-01-01T21:42:15.000Z`

---

## TC-FUNC-REL-010

**Relationship Chain:** Operations Event -> Segment Response -> Equipment Actual -> Equipment

**Filter:**
- Operations Event ID = `'OPS-EVENT-SEG-RESP-PLANT01MUNICH-LINE-01-202601012230-RUN1-841-OED-PROC-MIXERR-160'`
- operationsEventType = `'Alarm'`
- sourceTimeStamp filters / expected values:
  - Operations Event: `2026-01-01T21:37:15.000Z`
  - Segment Response: `2026-01-01T21:30:00.000Z`
  - Equipment Actual: `2026-01-01T21:30:00.000Z`
  - Equipment: non-empty ISO-8601 value

**Expected Results:**
- **Segment Response:** 1 record (`SEG-RESP-PLANT01MUNICH-LINE-01-202601012230-RUN1-841`)
- **Equipment Actual:** 1 record
- **Equipment:** 1 record (`EQ-MIX-01`)

**Validation Criteria:**
- Operations Event with filtered id exists and has operationsEventType = `Alarm`
- Chain resolves through Operations Event Record -> Operations Event Record Entry -> Segment Response
- That Segment Response has exactly 1 Equipment Actual
- That Equipment Actual resolves to Equipment `EQ-MIX-01`
- All records have valid `sourceTimeStamp` values

**Timestamp Evidence (Real Data Snapshot):**
- Operations Event: `sourceTimeStamp = 2026-01-01T21:37:15.000Z`
- Operations Event Record Entry -> Segment Response mapping: `2026-01-01T21:42:15.000Z`
- Segment Response -> Equipment Actual mapping: `2026-01-01T21:30:00.000Z`
- Equipment Actual -> Equipment mapping: `2026-01-01T21:30:00.000Z`

---

## TC-FUNC-REL-011

**Relationship Chain:** Operations Event (Alarm type) -> Operations Event Definition

**Filter:**
- operationsEventType = `'Alarm'`
- category = `'Process'`
- sourceTimeStamp filters / expected values:
  - Operations Event: timestamps in range `2026-01-01T21:37:15.000Z` (sample alarm)
  - Operations Event Definition: non-empty ISO-8601 value

**Sample Anchoring Record:**
- Operations Event ID = `'OPS-EVENT-SEG-RESP-PLANT01MUNICH-LINE-01-202601012230-RUN1-841-OED-PROC-MIXERR-160'`
- Expected Operations Event Definition = `OED-PROC-MIXERR`

**Expected Results:**
- **Operations Event Definition:** 1 record per alarm event (each alarm links to exactly 1 definition)
- Total Alarm events in snapshot: 1,898 of operationsEventType = `Alarm`

**Validation Criteria:**
- All Operations Events with operationsEventType = `Alarm` each resolve to exactly 1 Operations Event Definition
- No orphaned alarm records (every alarm has a valid definiton reference)
- Operations Event and linked Operations Event Definition both have valid `sourceTimeStamp` values

**Timestamp Evidence (Real Data Snapshot):**
- Sample Operations Event: `sourceTimeStamp = 2026-01-01T21:37:15.000Z`
- Operations Event -> Operations Event Definition mapping: `sourceTimeStamp = 2026-01-01T21:37:15.000Z`

---

## TC-FUNC-REL-012

**Relationship Chain:** Equipment -> Equipment Property (latest record)

**Filter:**
- Equipment ID = `'EQ-MIX-01'`
- Equipment Property description = `'MixerMotorCurrentA'` (id prefix `EP-MIX-CUR`)
- Retrieve the single property record with the highest `sourceTimeStamp`
- sourceTimeStamp filters / expected values:
  - Equipment: non-empty ISO-8601 value
  - Equipment Property: must be the maximum `sourceTimeStamp` value for property `EP-MIX-CUR` of this equipment

**Expected Results:**
- **Equipment:** 1 record (`EQ-MIX-01`)
- **Equipment Property (latest):** 1 record with id = `PROP-TRACK-PLANT01MUNICH-LINE-01-EQ-MIX-01-EP-MIX-CUR` and the highest recorded `sourceTimeStamp` in the snapshot

**Validation Criteria:**
- Equipment with id `EQ-MIX-01` exists
- Equipment is linked to multiple Equipment Property records for `EP-MIX-CUR`
- Only the record with the maximum `sourceTimeStamp` is returned as the "latest"
- Returned record has valid `sourceTimeStamp` value

**Timestamp Evidence (Real Data Snapshot):**
- First recorded property `sourceTimeStamp` = `2026-01-01T06:30:00.000Z` (5-second interval sampling)
- Property id pattern: `PROP-TRACK-PLANT01MUNICH-LINE-01-EQ-MIX-01-EP-MIX-CUR-{value}`

---

## TC-FUNC-REL-013

**Relationship Chain:** Equipment -> Equipment Property (time-range filter)

**Filter:**
- Equipment ID = `'EQ-MIX-01'`
- Equipment Property description = `'MixerMotorCurrentA'` (id prefix `EP-MIX-CUR`)
- sourceTimeStamp range = `[2026-01-01T06:30:00.000Z, 2026-01-01T08:30:00.000Z]` (2-hour window)
- sourceTimeStamp filters / expected values:
  - Equipment: non-empty ISO-8601 value
  - Equipment Property: all records with `sourceTimeStamp >= 2026-01-01T06:30:00.000Z` AND `sourceTimeStamp <= 2026-01-01T08:30:00.000Z`

**Expected Results:**
- **Equipment Property records** for `EP-MIX-CUR` in that 2-hour window: all property samples recorded at 5-second intervals between `2026-01-01T06:30:00.000Z` and `2026-01-01T08:30:00.000Z`

**Validation Criteria:**
- Equipment with id `EQ-MIX-01` exists
- Returned Equipment Property records all have `sourceTimeStamp` within the specified 2-hour window
- No records outside the range are returned
- All returned records have property id prefix `PROP-TRACK-PLANT01MUNICH-LINE-01-EQ-MIX-01-EP-MIX-CUR`

**Timestamp Evidence (Real Data Snapshot):**
- First sample: `sourceTimeStamp = 2026-01-01T06:30:00.000Z`
- Sampling interval: 5 seconds
- Expected boundary records:
  - Lower: property reading at exactly `2026-01-01T06:30:00.000Z`
  - Upper: property reading at exactly `2026-01-01T08:30:00.000Z`

---

## TC-FUNC-REL-014

**Relationship Chain:** Operations Event (maintenance category) -> Operations Event Definition; Operations Event -> Segment Response -> Equipment Actual -> Equipment

**Filter:**
- Operations Event ID = `'OPS-EVENT-MNT-SRESP-MNT-RESP-20260416115813-1-OED-MNT-START-413'`
- category = `'MaintenanceExecution'`
- sourceTimeStamp filters / expected values:
  - Operations Event: `2026-02-09T15:39:26.000Z`
  - Operations Event Definition: `2026-02-09T15:39:26.000Z`
  - Operations Event Record: `2026-02-09T15:39:26.000Z`
  - Operations Event Record Entry: `2026-02-09T15:44:26.000Z`
  - Segment Response: `2026-02-09T14:30:00.000Z`
  - Equipment Actual: `2026-02-09T14:30:00.000Z`
  - Equipment: non-empty ISO-8601 value

**Expected Results:**
- **Operations Event Definition:** 1 record (`OED-MNT-START`)
- **Operations Event Record:** 1 record
- **Operations Event Record Entry:** 1 record
- **Segment Response:** 1 record (`MNT-SRESP-MNT-RESP-20260416115813-1`)
- **Equipment Actual:** 1 record
- **Equipment:** 1 record (`EQ-MIX-01`)

**Validation Criteria:**
- Operations Event with filtered id exists and has category = `MaintenanceExecution`
- Exactly 1 Operations Event Definition is linked (type OED-MNT-START)
- Chain resolves through Operations Event Record -> Operations Event Record Entry -> Segment Response
- That Segment Response has exactly 1 Equipment Actual
- That Equipment Actual resolves to Equipment `EQ-MIX-01`
- All records have valid `sourceTimeStamp` values

**Timestamp Evidence (Real Data Snapshot):**
- Operations Event: `sourceTimeStamp = 2026-02-09T15:39:26.000Z`
- Operations Event -> Operations Event Definition mapping: `2026-02-09T15:39:26.000Z`
- Operations Event -> Operations Event Record mapping: `2026-02-09T15:39:26.000Z`
- Operations Event Record -> Operations Event Record Entry mapping: `2026-02-09T15:44:26.000Z`
- Operations Event Record Entry -> Segment Response mapping: `2026-02-09T15:44:26.000Z`
- Segment Response -> Equipment Actual mapping: `2026-02-09T14:30:00.000Z`
- Equipment Actual -> Equipment mapping: `2026-02-09T14:30:00.000Z`
