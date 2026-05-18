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
- **Equipment Property (latest):** 1 record:
  - id: `PROP-TRACK-PLANT01MUNICH-LINE-01-EQ-MIX-01-EP-MIX-CUR`
  - description: `MixerMotorCurrentA`
  - value: `93.84`
  - uom: `A`
  - sourceTimeStamp: `2026-05-05T09:51:00.000Z`

**Validation Criteria:**
- Equipment with id `EQ-MIX-01` exists
- Equipment is linked to multiple Equipment Property records for `EP-MIX-CUR`
- Only the record with the maximum `sourceTimeStamp` is returned as the "latest"
- Returned record has valid `sourceTimeStamp` value

**Timestamp Evidence (Real Data Snapshot):**
- First recorded property `sourceTimeStamp` = `2026-01-01T06:30:00.000Z` (5-second interval sampling)
- Latest recorded property `sourceTimeStamp` = `2026-05-05T09:51:00.000Z`
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

---

## TC-FUNC-REL-015

**Relationship Chain:** Equipment -> Equipment Property (latest record per property, all properties)

**Filter:**
- Equipment ID = `'EQ-OVEN-01'`
- All 5 assigned Equipment Properties: `EP-OVEN-TEMP` (OvenChamberTempC), `EP-OVEN-HUM` (OvenHumidityPct), `EP-OVEN-PWR` (OvenPowerKW), `EP-OVEN-CTRL` (ControlOutputPct), `EP-OVEN-STATE` (MachineState)
- Retrieve the single record per property with the highest `sourceTimeStamp`
- sourceTimeStamp filters / expected values:
  - Equipment: non-empty ISO-8601 value
  - Equipment Property (latest per property): must be the maximum `sourceTimeStamp` value for each respective property of this equipment

**Expected Results:**
- **Equipment:** 1 record (`EQ-OVEN-01`)
- **Equipment Property (latest, 5 entries — one per property):**

  | Property ID | Description | Latest sourceTimeStamp | Latest Value | UoM |
  |---|---|---|---|---|
  | `EP-OVEN-TEMP` | OvenChamberTempC | `2026-05-05T13:48:00.000Z` | `94.19` | C |
  | `EP-OVEN-HUM` | OvenHumidityPct | `2026-05-05T13:48:00.000Z` | `47.92` | % |
  | `EP-OVEN-PWR` | OvenPowerKW | `2026-05-05T13:48:00.000Z` | `26.62` | kW |
  | `EP-OVEN-CTRL` | ControlOutputPct | `2026-05-05T13:48:00.000Z` | `44.08` | % |
  | `EP-OVEN-STATE` | MachineState | `2026-05-05T13:48:00.000Z` | `run` | EA |

  Property id values:
  - `PROP-TRACK-PLANT01MUNICH-LINE-01-EQ-OVEN-01-EP-OVEN-TEMP`
  - `PROP-TRACK-PLANT01MUNICH-LINE-01-EQ-OVEN-01-EP-OVEN-HUM`
  - `PROP-TRACK-PLANT01MUNICH-LINE-01-EQ-OVEN-01-EP-OVEN-PWR`
  - `PROP-TRACK-PLANT01MUNICH-LINE-01-EQ-OVEN-01-EP-OVEN-CTRL`
  - `PROP-TRACK-PLANT01MUNICH-LINE-01-EQ-OVEN-01-EP-OVEN-STATE`

**Validation Criteria:**
- Equipment with id `EQ-OVEN-01` exists
- Exactly 5 Equipment Property definitions are assigned to `EQ-OVEN-01` via `EquipmentPropertyAssignments`
- For each property, only the record with the maximum `sourceTimeStamp` is returned
- All 5 returned records belong to `EQ-OVEN-01` exclusively
- All records have valid `sourceTimeStamp` values

**Timestamp Evidence (Real Data Snapshot):**
- First recorded property `sourceTimeStamp` = `2026-01-01T06:30:00.000Z` (5-second interval sampling)
- Latest recorded property `sourceTimeStamp` = `2026-05-05T13:48:00.000Z` (all 5 properties share the same latest baking run)
- All 5 latest readings are from segment response `SEG-RESP-PLANT01MUNICH-LINE-01-202605051151-RUN13-722`

---

## TC-FUNC-REL-016

**Relationship Chain:** Equipment (multiple) -> Equipment Property (time-range filter, all equipment, all properties)

**Filter:**
- Equipment IDs = `'EQ-MIX-01'`, `'EQ-OVEN-01'`, `'EQ-PACKAGE-01'`
- All assigned Equipment Properties per equipment (5 for MIXER, 5 for OVEN, 1 for PACK)
- sourceTimeStamp range = `[2026-01-01T06:30:00.000Z, 2026-01-01T08:30:00.000Z]` (2-hour window)
- sourceTimeStamp filters / expected values:
  - All Equipment: non-empty ISO-8601 value
  - Equipment Property records: all samples with `sourceTimeStamp >= 2026-01-01T06:30:00.000Z` AND `sourceTimeStamp <= 2026-01-01T08:30:00.000Z`

**Expected Results:**
- **Equipment:** 3 records (`EQ-MIX-01`, `EQ-OVEN-01`, `EQ-PACKAGE-01`)
- **Equipment Property records** for `EQ-MIX-01` (5 properties × 5-second interval samples in 2-hour window): `EP-MIX-CUR`, `EP-MIX-VISC`, `EP-MIX-TORQ`, `EP-VIB`, `EP-MIX-STATE`
- **Equipment Property records** for `EQ-OVEN-01` (5 properties × 5-second interval samples in 2-hour window): `EP-OVEN-TEMP`, `EP-OVEN-HUM`, `EP-OVEN-PWR`, `EP-OVEN-CTRL`, `EP-OVEN-STATE`
- **Equipment Property records** for `EQ-PACKAGE-01` (1 property × 5-second interval samples in 2-hour window): `EP-PACK-STATE`

**Validation Criteria:**
- All 3 Equipment records exist
- All returned Equipment Property records have `sourceTimeStamp` within the specified 2-hour window
- No records outside the range are returned
- Records are partitioned correctly per equipment (no cross-equipment mixing)
- Expected boundary records present at `2026-01-01T06:30:00.000Z` and `2026-01-01T08:30:00.000Z`
- All returned records have valid `sourceTimeStamp` values

**Timestamp Evidence (Real Data Snapshot):**
- First sample: `sourceTimeStamp = 2026-01-01T06:30:00.000Z`
- Sampling interval: 5 seconds
- Expected boundary records:
  - Lower: property reading at exactly `2026-01-01T06:30:00.000Z`
  - Upper: property reading at exactly `2026-01-01T08:30:00.000Z`

---

## TC-FUNC-REL-017

**Relationship Chain:** Equipment -> Child Equipment (ParentEquipmentId) -> Child Equipment Property (latest)

**Filter:**
- All 3 equipment parent-child pairs in the snapshot:
  - Parent `'EQ-MIX-01'` → Child `'EQ-MIX-MOTOR-01'` (Mixer Motor) → Property `EP-MIX-MOTORSPEED`
  - Parent `'EQ-OVEN-01'` → Child `'EQ-OVEN-ZONE-01'` (Oven Zone) → Property `EP-OVEN-ZONE-HEAT`
  - Parent `'EQ-PACKAGE-01'` → Child `'EQ-PACK-LABELER-01'` (Labeler) → no assigned properties
- Retrieve the single child property record with the highest `sourceTimeStamp` (where applicable)
- sourceTimeStamp filters / expected values:
  - Parent Equipment: non-empty ISO-8601 value
  - Child Equipment: non-empty ISO-8601 value
  - Child Equipment Property (latest): maximum `sourceTimeStamp` in the snapshot for the child's property

**Expected Results:**
- **Parent Equipment:** 3 records (`EQ-MIX-01`, `EQ-OVEN-01`, `EQ-PACKAGE-01`)
- **Child Equipment:** 3 records linked via `ParentEquipmentId`:
  - `EQ-MIX-MOTOR-01` (parent = `EQ-MIX-01`)
  - `EQ-OVEN-ZONE-01` (parent = `EQ-OVEN-01`)
  - `EQ-PACK-LABELER-01` (parent = `EQ-PACKAGE-01`)
- **Child Equipment Property (latest):**
  - `EQ-MIX-MOTOR-01`: 1 record with id prefix `PROP-TRACK-PLANT01MUNICH-LINE-01-EQ-MIX-MOTOR-01-EP-MIX-MOTORSPEED` at max `sourceTimeStamp`
  - `EQ-OVEN-ZONE-01`: 1 record with id prefix `PROP-TRACK-PLANT01MUNICH-LINE-01-EQ-OVEN-ZONE-01-EP-OVEN-ZONE-HEAT` at max `sourceTimeStamp`
  - `EQ-PACK-LABELER-01`: 0 records (no Equipment Property assignments exist for this child)

**Validation Criteria:**
- Each parent Equipment exists
- Each parent has exactly 1 child Equipment record (resolved via `ParentEquipmentId`)
- `EQ-MIX-MOTOR-01` has property `EP-MIX-MOTORSPEED` assigned (via `EquipmentPropertyAssignments`)
- `EQ-OVEN-ZONE-01` has property `EP-OVEN-ZONE-HEAT` assigned
- `EQ-PACK-LABELER-01` has no property assignments — resolved child property set is empty
- Child property latest records have valid `sourceTimeStamp` values

**Timestamp Evidence (Real Data Snapshot):**
- Child property first `sourceTimeStamp` = `2026-01-01T06:30:00.000Z` (5-second interval sampling)
- Property id patterns:
  - `PROP-TRACK-PLANT01MUNICH-LINE-01-EQ-MIX-MOTOR-01-EP-MIX-MOTORSPEED-{value}`
  - `PROP-TRACK-PLANT01MUNICH-LINE-01-EQ-OVEN-ZONE-01-EP-OVEN-ZONE-HEAT-{value}`

---

## TC-FUNC-REL-018

**Relationship Chain:** Hierarchy Scope (Area) -> Direct Child Hierarchy Scopes

**Filter:**
- Parent Hierarchy Scope ID = `'HS-PLANT01MUNICH-BAKING-MUNICH-Area'`
- Parent Equipment Level = `'Area'`, EquipmentID = `'BAKING-MUNICH'`
- sourceTimeStamp filters / expected values:
  - Parent Hierarchy Scope: non-empty ISO-8601 value
  - Child Hierarchy Scope records: non-empty ISO-8601 value

**Expected Results:**
- **Parent Hierarchy Scope:** 1 record (`HS-PLANT01MUNICH-BAKING-MUNICH-Area`)
- **HierarchyScopeParentChilds entries with this parent:** 1 record
  - `HSPC-0003`: child = `HS-PLANT01MUNICH-WCenter1-WorkCenter` (Work Center)
- **Child Hierarchy Scope node:** 1 record (`HS-PLANT01MUNICH-WCenter1-WorkCenter`, EquipmentLevel = `Work Center`)

**Validation Criteria:**
- Hierarchy Scope `HS-PLANT01MUNICH-BAKING-MUNICH-Area` exists and has EquipmentLevel = `Area`
- Exactly 1 `HierarchyScopeParentChilds` record references this node as parent (HSPC-0003)
- The child node `HS-PLANT01MUNICH-WCenter1-WorkCenter` exists with EquipmentLevel = `Work Center`
- All records have valid `sourceTimeStamp` values

**Timestamp Evidence (Real Data Snapshot):**
- `HSPC-0003`: parent `HS-PLANT01MUNICH-BAKING-MUNICH-Area` (Area) → child `HS-PLANT01MUNICH-WCenter1-WorkCenter` (Work Center)

---

## TC-FUNC-REL-019

**Relationship Chain:** Hierarchy Scope (Production Line) -> Production Unit -> Equipment Work Cells

**Filter:**
- Production Line Hierarchy Scope ID = `'HS-PLANT01MUNICH-LINE-01-ProductionLine'`
- EquipmentID = `'LINE-01'`, EquipmentLevel = `'Production Line'`
- sourceTimeStamp filters / expected values:
  - Production Line Hierarchy Scope: non-empty ISO-8601 value
  - Intermediate Production Unit Hierarchy Scope: non-empty ISO-8601 value
  - Equipment Work Cell Hierarchy Scopes: non-empty ISO-8601 values

**Expected Results:**
- **Production Line Hierarchy Scope:** 1 record (`HS-PLANT01MUNICH-LINE-01-ProductionLine`, EquipmentID = `LINE-01`)
- **Intermediate Production Unit (1 hop via HSPC-0008):** 1 record
  - `HS-PLANT01MUNICH-PUnitMUNICH-ProductionUnit` (EquipmentLevel = `Production Unit`)
- **Equipment Work Cell Hierarchy Scopes (2 hops, via HSPC-0009 / HSPC-0012 / HSPC-0015):** 3 records
  - `HS-PLANT01MUNICH-EQ-MIX-01-WorkCell` → EquipmentID = `EQ-MIX-01`
  - `HS-PLANT01MUNICH-EQ-OVEN-01-WorkCell` → EquipmentID = `EQ-OVEN-01`
  - `HS-PLANT01MUNICH-EQ-PACKAGE-01-WorkCell` → EquipmentID = `EQ-PACKAGE-01`

**Validation Criteria:**
- Hierarchy Scope `HS-PLANT01MUNICH-LINE-01-ProductionLine` exists
- Exactly 1 `HierarchyScopeParentChilds` record has this production line as parent (HSPC-0008 → Production Unit)
- Exactly 3 `HierarchyScopeParentChilds` records have the Production Unit as parent with ChildEquipmentLevel = `Work Cell`
- Each Work Cell EquipmentID resolves to an existing Equipment record
- All records have valid `sourceTimeStamp` values

**Timestamp Evidence (Real Data Snapshot):**
- `HSPC-0008`: `HS-PLANT01MUNICH-LINE-01-ProductionLine` → `HS-PLANT01MUNICH-PUnitMUNICH-ProductionUnit`
- `HSPC-0009`: `HS-PLANT01MUNICH-PUnitMUNICH-ProductionUnit` → `HS-PLANT01MUNICH-EQ-MIX-01-WorkCell`
- `HSPC-0012`: `HS-PLANT01MUNICH-PUnitMUNICH-ProductionUnit` → `HS-PLANT01MUNICH-EQ-OVEN-01-WorkCell`
- `HSPC-0015`: `HS-PLANT01MUNICH-PUnitMUNICH-ProductionUnit` → `HS-PLANT01MUNICH-EQ-PACKAGE-01-WorkCell`

---

## TC-FUNC-REL-020

**Relationship Chain:** Hierarchy Scope (Site) -> Descendant Production Lines (recursive traversal)

**Filter:**
- Site Hierarchy Scope ID = `'HS-PLANT01MUNICH-Site'`
- EquipmentID = `'PLANT01MUNICH'`, EquipmentLevel = `'Site'`
- Target descendant level = `'Production Line'`
- sourceTimeStamp filters / expected values:
  - Site Hierarchy Scope: non-empty ISO-8601 value
  - Production Line Hierarchy Scope: non-empty ISO-8601 value

**Expected Results:**
- **Site Hierarchy Scope:** 1 record (`HS-PLANT01MUNICH-Site`, EquipmentID = `PLANT01MUNICH`)
- **Production Line descendant (recursive, 6 hops):** 1 record
  - `HS-PLANT01MUNICH-LINE-01-ProductionLine` → EquipmentID = `LINE-01`

**Hierarchy Traversal Path (PLANT01MUNICH → LINE-01):**
| Hop | HSPC ID | Parent | Child |
|-----|---------|--------|-------|
| 1 | HSPC-0002 | `HS-PLANT01MUNICH-Site` (Site) | `HS-PLANT01MUNICH-BAKING-MUNICH-Area` (Area) |
| 2 | HSPC-0003 | `HS-PLANT01MUNICH-BAKING-MUNICH-Area` (Area) | `HS-PLANT01MUNICH-WCenter1-WorkCenter` (Work Center) |
| 3 | HSPC-0004 | `HS-PLANT01MUNICH-WCenter1-WorkCenter` (Work Center) | `HS-PLANT01MUNICH-WUnit1-WorkUnit` (Work Unit) |
| 4 | HSPC-0005 | `HS-PLANT01MUNICH-WUnit1-WorkUnit` (Work Unit) | `HS-PLANT01MUNICH-ProcessCellMUNICH-ProcessCell` (Process Cell) |
| 5 | HSPC-0006 | `HS-PLANT01MUNICH-ProcessCellMUNICH-ProcessCell` (Process Cell) | `HS-PLANT01MUNICH-Unit1-Unit` (Unit) |
| 6 | HSPC-0007 | `HS-PLANT01MUNICH-Unit1-Unit` (Unit) | `HS-PLANT01MUNICH-LINE-01-ProductionLine` (Production Line) |

**Validation Criteria:**
- Hierarchy Scope `HS-PLANT01MUNICH-Site` exists
- Recursive traversal of `HierarchyScopeParentChilds` from `HS-PLANT01MUNICH-Site` yields exactly 1 node with EquipmentLevel = `Production Line`
- That Production Line node is `HS-PLANT01MUNICH-LINE-01-ProductionLine` (EquipmentID = `LINE-01`)
- Traversal depth is exactly 6 hops (HSPC-0002 through HSPC-0007)
- All records have valid `sourceTimeStamp` values

**Timestamp Evidence (Real Data Snapshot):**
- Traversal verified via HSPC-0002, HSPC-0003, HSPC-0004, HSPC-0005, HSPC-0006, HSPC-0007

---

## TC-FUNC-REL-021

**Relationship Chain:** Equipment -> Equipment Class -> Equipment Class Properties (MIXER class)

**Filter:**
- Equipment ID = `'EQ-MIX-01'`
- Equipment Class ID = `'MIXER'` (resolved via `Equipments.ClassId`)
- sourceTimeStamp filters / expected values:
  - Equipment: non-empty ISO-8601 value
  - Equipment Class Properties: non-empty ISO-8601 values

**Expected Results:**
- **Equipment:** 1 record (`EQ-MIX-01`, ClassId = `MIXER`, ClassName = `Mixer`)
- **Equipment Class Properties for MIXER:** 7 records
  - `ECP-MIX-CTRL` — ControlOutputPct
  - `ECP-MIX-CUR` — MixerMotorCurrentA
  - `ECP-MIX-STATE` — MachineState
  - `ECP-MIX-TORQ` — MixerTorqueNm
  - `ECP-MIX-VISC` — DoughViscosityIndex
  - `ECP-PRESSURE` — OperatingPressure
  - `ECP-VIB` — EquipmentVibrationRMS

**Validation Criteria:**
- Equipment `EQ-MIX-01` exists and has `ClassId = 'MIXER'`
- Exactly 7 `EquipmentClassProperties` records exist with `EquipmentClassId = 'MIXER'`
- For each Class Property with a corresponding Equipment Property assignment (e.g. `ECP-MIX-CUR` ↔ `EP-MIX-CUR`), an `EquipmentClassPropertyAssignments` record exists with id pattern `{ECP-ID}_{EP-ID}`
- All records have valid `sourceTimeStamp` values

**Timestamp Evidence (Real Data Snapshot):**
- Equipment `EQ-MIX-01`: non-empty `UpdatedAt` timestamp
- All 7 `EquipmentClassProperties` for MIXER: non-empty `UpdatedAt` timestamps
- Sample `EquipmentClassPropertyAssignments` ids: `ECP-MIX-CUR_EP-MIX-CUR`, `ECP-MIX-STATE_EP-MIX-STATE`, `ECP-MIX-TORQ_EP-MIX-TORQ`, `ECP-MIX-VISC_EP-MIX-VISC`, `ECP-VIB_EP-VIB`

---

## TC-FUNC-REL-022

**Relationship Chain:** Equipment -> Equipment Class -> Equipment Class Properties (OVEN class)

**Filter:**
- Equipment ID = `'EQ-OVEN-01'`
- Equipment Class ID = `'OVEN'` (resolved via `Equipments.ClassId`)
- sourceTimeStamp filters / expected values:
  - Equipment: non-empty ISO-8601 value
  - Equipment Class Properties: non-empty ISO-8601 values

**Expected Results:**
- **Equipment:** 1 record (`EQ-OVEN-01`, ClassId = `OVEN`)
- **Equipment Class Properties for OVEN:** 6 records
  - `ECP-OVEN-CTRL` — ControlOutputPct
  - `ECP-OVEN-HUM` — OvenHumidityPct
  - `ECP-OVEN-PWR` — OvenPowerKW
  - `ECP-OVEN-STATE` — MachineState
  - `ECP-OVEN-TEMP` — OvenChamberTempC
  - `ECP-TEMPERATURE` — OperatingTemperature

**Validation Criteria:**
- Equipment `EQ-OVEN-01` exists and has `ClassId = 'OVEN'`
- Exactly 6 `EquipmentClassProperties` records exist with `EquipmentClassId = 'OVEN'`
- For each Class Property with a corresponding Equipment Property assignment, an `EquipmentClassPropertyAssignments` record exists with id pattern `{ECP-ID}_{EP-ID}`
- All records have valid `sourceTimeStamp` values

**Timestamp Evidence (Real Data Snapshot):**
- Equipment `EQ-OVEN-01`: non-empty `UpdatedAt` timestamp
- All 6 `EquipmentClassProperties` for OVEN: non-empty `UpdatedAt` timestamps
- Sample `EquipmentClassPropertyAssignments` ids: `ECP-OVEN-CTRL_EP-OVEN-CTRL`, `ECP-OVEN-HUM_EP-OVEN-HUM`, `ECP-OVEN-PWR_EP-OVEN-PWR`, `ECP-OVEN-STATE_EP-OVEN-STATE`, `ECP-OVEN-TEMP_EP-OVEN-TEMP`

---

## TC-FUNC-REL-023

**Relationship Chain:** Equipment -> Equipment Class -> Equipment Class Properties (PACK class)

**Filter:**
- Equipment ID = `'EQ-PACKAGE-01'`
- Equipment Class ID = `'PACK'` (resolved via `Equipments.ClassId`)
- sourceTimeStamp filters / expected values:
  - Equipment: non-empty ISO-8601 value
  - Equipment Class Properties: non-empty ISO-8601 values

**Expected Results:**
- **Equipment:** 1 record (`EQ-PACKAGE-01`, ClassId = `PACK`)
- **Equipment Class Properties for PACK:** 2 records
  - `ECP-PACK-CTRL` — ControlOutputPct
  - `ECP-PACK-STATE` — MachineState

**Validation Criteria:**
- Equipment `EQ-PACKAGE-01` exists and has `ClassId = 'PACK'`
- Exactly 2 `EquipmentClassProperties` records exist with `EquipmentClassId = 'PACK'`
- For each Class Property with a corresponding Equipment Property assignment, an `EquipmentClassPropertyAssignments` record exists with id pattern `{ECP-ID}_{EP-ID}`
- All records have valid `sourceTimeStamp` values

**Timestamp Evidence (Real Data Snapshot):**
- Equipment `EQ-PACKAGE-01`: non-empty `UpdatedAt` timestamp
- Both `EquipmentClassProperties` for PACK: non-empty `UpdatedAt` timestamps
- Sample `EquipmentClassPropertyAssignments` ids: `ECP-PACK-STATE_EP-PACK-STATE`

---

## Validation SQL (TC-FUNC-REL-015 through TC-FUNC-REL-023)

```sql
-- TC-FUNC-REL-015: Latest record per property for EQ-OVEN-01 (5 properties)
SELECT 'EP-OVEN-TEMP' AS PropertyId, TOP 1 RecordId, JSON_VALUE(DataJson,'$.sourceTimeStamp') AS sourceTimeStamp
FROM GenericDataStores
WHERE StoreName='equipment_property_tracking'
  AND JSON_VALUE(DataJson,'$.equipmentId')='EQ-OVEN-01'
  AND RecordId LIKE '%EP-OVEN-TEMP%'
ORDER BY JSON_VALUE(DataJson,'$.sourceTimeStamp') DESC;
-- (Repeat pattern for EP-OVEN-HUM, EP-OVEN-PWR, EP-OVEN-CTRL, EP-OVEN-STATE)

-- TC-FUNC-REL-016: All property records for EQ-MIX-01, EQ-OVEN-01, EQ-PACKAGE-01 in 2-hour window
SELECT
    JSON_VALUE(DataJson,'$.equipmentId') AS EquipmentId,
    RecordId,
    JSON_VALUE(DataJson,'$.sourceTimeStamp') AS sourceTimeStamp
FROM GenericDataStores
WHERE StoreName = 'equipment_property_tracking'
  AND JSON_VALUE(DataJson,'$.equipmentId') IN ('EQ-MIX-01','EQ-OVEN-01','EQ-PACKAGE-01')
  AND JSON_VALUE(DataJson,'$.sourceTimeStamp') >= '2026-01-01T06:30:00.000Z'
  AND JSON_VALUE(DataJson,'$.sourceTimeStamp') <= '2026-01-01T08:30:00.000Z'
ORDER BY JSON_VALUE(DataJson,'$.equipmentId'), JSON_VALUE(DataJson,'$.sourceTimeStamp');

-- TC-FUNC-REL-017: Child equipment of EQ-MIX-01, EQ-OVEN-01, EQ-PACKAGE-01
SELECT Id, Name, ParentEquipmentId
FROM Equipments
WHERE ParentEquipmentId IN ('EQ-MIX-01','EQ-OVEN-01','EQ-PACKAGE-01')
ORDER BY ParentEquipmentId, Id;

-- Latest property record for each child with properties
SELECT TOP 1 RecordId, JSON_VALUE(DataJson,'$.sourceTimeStamp') AS sourceTimeStamp
FROM GenericDataStores
WHERE StoreName='equipment_property_tracking'
  AND JSON_VALUE(DataJson,'$.equipmentId')='EQ-MIX-MOTOR-01'
  AND RecordId LIKE '%EP-MIX-MOTORSPEED%'
ORDER BY JSON_VALUE(DataJson,'$.sourceTimeStamp') DESC;

SELECT TOP 1 RecordId, JSON_VALUE(DataJson,'$.sourceTimeStamp') AS sourceTimeStamp
FROM GenericDataStores
WHERE StoreName='equipment_property_tracking'
  AND JSON_VALUE(DataJson,'$.equipmentId')='EQ-OVEN-ZONE-01'
  AND RecordId LIKE '%EP-OVEN-ZONE-HEAT%'
ORDER BY JSON_VALUE(DataJson,'$.sourceTimeStamp') DESC;

-- EQ-PACK-LABELER-01 has no property assignments — verify:
SELECT COUNT(*) AS PropertyAssignmentCount
FROM EquipmentPropertyAssignments
WHERE EquipmentId = 'EQ-PACK-LABELER-01';

-- TC-FUNC-REL-018: Direct children of HS-PLANT01MUNICH-BAKING-MUNICH-Area
SELECT hspc.Id, hspc.ChildEquipmentID, hspc.ChildEquipmentLevel,
       hs.EquipmentID, hs.EquipmentLevel
FROM HierarchyScopeParentChilds hspc
JOIN HierarchyScopes hs ON hs.Id = hspc.ChildEquipmentID
WHERE hspc.ParentEquipmentID = 'HS-PLANT01MUNICH-BAKING-MUNICH-Area'
ORDER BY hspc.Id;

-- TC-FUNC-REL-019: Equipment (Work Cells) under HS-PLANT01MUNICH-LINE-01-ProductionLine
SELECT
    hs_wc.Id   AS WorkCellHierarchyScopeId,
    hs_wc.EquipmentID AS EquipmentId,
    e.Name     AS EquipmentName
FROM HierarchyScopeParentChilds hspc_line
JOIN HierarchyScopeParentChilds hspc_punit
    ON hspc_punit.ParentEquipmentID = hspc_line.ChildEquipmentID
    AND hspc_punit.ChildEquipmentLevel = 'Work Cell'
JOIN HierarchyScopes hs_wc ON hs_wc.Id = hspc_punit.ChildEquipmentID
JOIN Equipments e ON e.Id = hs_wc.EquipmentID
WHERE hspc_line.ParentEquipmentID = 'HS-PLANT01MUNICH-LINE-01-ProductionLine'
ORDER BY hs_wc.EquipmentID;

-- TC-FUNC-REL-020: All Production Line descendants of HS-PLANT01MUNICH-Site (recursive CTE)
WITH hierarchy AS (
    SELECT ChildEquipmentID AS NodeId, ChildEquipmentLevel AS NodeLevel, 1 AS Depth
    FROM HierarchyScopeParentChilds
    WHERE ParentEquipmentID = 'HS-PLANT01MUNICH-Site'
    UNION ALL
    SELECT c.ChildEquipmentID, c.ChildEquipmentLevel, h.Depth + 1
    FROM HierarchyScopeParentChilds c
    INNER JOIN hierarchy h ON c.ParentEquipmentID = h.NodeId
)
SELECT h.NodeId AS ProductionLineHsId, hs.EquipmentID AS LineId, h.Depth
FROM hierarchy h
JOIN HierarchyScopes hs ON hs.Id = h.NodeId
WHERE h.NodeLevel = 'Production Line'
ORDER BY hs.EquipmentID;

-- TC-FUNC-REL-021: MIXER class properties for EQ-MIX-01
SELECT
    e.Id AS EquipmentId, e.ClassId,
    ecp.Id AS ClassPropertyId, ecp.Name AS PropertyName
FROM Equipments e
JOIN EquipmentClassProperties ecp ON ecp.EquipmentClassId = e.ClassId
WHERE e.Id = 'EQ-MIX-01'
ORDER BY ecp.Id;

SELECT ecpa.Id, ecpa.EquipmentClassPropertyId, ecpa.EquipmentPropertyId
FROM EquipmentClassPropertyAssignments ecpa
WHERE ecpa.EquipmentClassPropertyId IN (
    SELECT ecp.Id FROM EquipmentClassProperties ecp WHERE ecp.EquipmentClassId = 'MIXER'
)
ORDER BY ecpa.Id;

-- TC-FUNC-REL-022: OVEN class properties for EQ-OVEN-01
SELECT
    e.Id AS EquipmentId, e.ClassId,
    ecp.Id AS ClassPropertyId, ecp.Name AS PropertyName
FROM Equipments e
JOIN EquipmentClassProperties ecp ON ecp.EquipmentClassId = e.ClassId
WHERE e.Id = 'EQ-OVEN-01'
ORDER BY ecp.Id;

-- TC-FUNC-REL-023: PACK class properties for EQ-PACKAGE-01
SELECT
    e.Id AS EquipmentId, e.ClassId,
    ecp.Id AS ClassPropertyId, ecp.Name AS PropertyName
FROM Equipments e
JOIN EquipmentClassProperties ecp ON ecp.EquipmentClassId = e.ClassId
WHERE e.Id = 'EQ-PACKAGE-01'
ORDER BY ecp.Id;
```
