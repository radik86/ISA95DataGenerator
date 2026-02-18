# ISA-95 Data Generator - System Logic Documentation

This document explains the internal logic and data flows within the ISA-95 Data Generator system.

**Last Updated:** February 18, 2026

---

## Table of Contents

1. [Operations Events Generation](#operations-events-generation)
2. [Segment Requirement Timeline Calculation](#segment-requirement-timeline-calculation)

---

## Operations Events Generation

### Overview

The system generates operations events, operations event records, and operations event entries for actual process data to simulate real-world production events including downtime, quality issues, and production milestones.

### Input Sources

#### 1. Master Data Templates (Primary Input)

Operations events are generated based on master data loaded from CSV files in `frontend/public/templates/masterdata/`:

| CSV File | Purpose | Key Fields |
|----------|---------|------------|
| `operation_event_definitions.csv` | Defines event types and their characteristics | `OperationsEventDefinitionID`, `EventCategory`, `EventCode`, `Description`, `CausesDowntime` (TRUE/FALSE), `CausesScrap` (TRUE/FALSE), `RootCauseType`, `EventType` |
| `operation_event_definition_segment_assignments.csv` | Links events to process segments | `OperationsEventDefSegAssignID`, `OperationsEventDefinitionId`, `ProcessSegmentID`, `IsMandatory` (TRUE/FALSE), `StartOrEndEvent` (Start/End), `Notes` |
| `operation_event_definition_property_assignment.csv` | Contains property values including **Duration** | `OperationsEventDefinitionID`, `OperationsEventDefinitionPropertyId`, `Value`, `valueUnitOfMeasure` |
| `operations_event_records_template.csv` | Templates for event records | `OperationsEventRecordID`, `OperationsEventDefinitionID` |
| `operations_event_entries_template.csv` | Templates for event entries | `OperationsEventEntryID`, `OperationsEventRecordID`, `EntryType`, `Description` |

**Example Event Definitions:**

```csv
OperationsEventDefinitionID,EventCategory,EventCode,Description,CausesDowntime,CausesScrap
OED-UD-OVERTEMP,UnplannedDowntime,OvenOverTemperature,Oven temperature exceeds safe limit,TRUE,FALSE
OED-UD-MIXFAIL,UnplannedDowntime,MixerFailure,Mixer mechanical or electrical failure,TRUE,FALSE
OED-SCR-BURN,QualityScrap,BurnedProduct,Product burned during baking,FALSE,TRUE
OED-PROD-MIX-START,Production,MixingStart,Start of Mixing,FALSE,FALSE
```

**Example Duration Property Assignments:**

```csv
OperationsEventDefinitionID,OperationsEventDefinitionPropertyId,Value,valueUnitOfMeasure
OED-UD-OVERTEMP,Duration,2,minutes
OED-UD-MIXFAIL,Duration,3,minutes
OED-UD-POWER,Duration,2,minutes
OED-SCR-BURN,Duration,2,minutes
```

#### 2. User Configuration (Conditional Triggers)

Events are conditionally included based on UI inputs in the Process Data Generator:

| UI Parameter | State Variable | Effect on Event Generation |
|--------------|----------------|---------------------------|
| **Start Delay (minutes)** | `productionDelayMinutes` | If > 0: Includes events where `CausesDowntime=TRUE` |
| **Downtime Delay (minutes)** | `downtimeDelayMinutes` | Extends segment duration to simulate production delays |
| **Scrap Percentage (%)** | `scrapProducedPercent` | If > 0: Includes events where `CausesScrap=TRUE` |

**Code Location:** [ProcessDataGenerator.tsx](frontend/src/components/ProcessDataGenerator.tsx#L847-L865)

```typescript
// Filter conditional events based on conditions (downtime, scrap)
const filteredConditionalAssignments = conditionalAssignments.filter(assignment => {
  const eventDef = operationEventDefinitions.find(oed => oed.id === assignment.operationsEventDefinitionId);
  if (!eventDef) return false;
  
  // Include downtime events only if production delay is defined
  const includeForDowntime = productionDelayMinutes > 0 && eventDef.causesDowntime;
  
  // Include scrap events only if scrap percentage is defined
  const includeForScrap = scrapProducedPercent > 0 && eventDef.causesScrap;
  
  const shouldInclude = includeForDowntime || includeForScrap;
  return shouldInclude;
});
```

#### 3. Segment Response Context

Each event is tied to actual production timing from generated segment responses:

- **`segmentResponse.actualStartDateTime`** - Start of production segment
- **`segmentResponse.actualEndDateTime`** - End of production segment
- **`assignment.startOrEndEvent`** - Determines if event occurs at segment start (first 10%) or end (last 10%)

**Code Location:** [ProcessDataGenerator.tsx](frontend/src/components/ProcessDataGenerator.tsx#L909-L922)

```typescript
// Determine event timestamp based on StartOrEndEvent
let eventTime: Date;
const startOrEnd = (assignment.startOrEndEvent || 'Start').toLowerCase();

if (startOrEnd === 'end') {
  // End events occur near the end of the segment (last 10%)
  const nearEndMs = endTime.getTime() - (durationMs * 0.1 * Math.random());
  eventTime = new Date(nearEndMs);
} else {
  // Start events occur near the beginning of the segment (first 10%)
  const nearStartMs = startTime.getTime() + (durationMs * 0.1 * Math.random());
  eventTime = new Date(nearStartMs);
}
```

### Generation Flow

#### Step 1: Filter and Select Events

**Code Location:** [ProcessDataGenerator.tsx](frontend/src/components/ProcessDataGenerator.tsx#L827-L883)

1. **Load assignments** for each segment requirement from master data
2. **Separate** into mandatory and conditional assignments
3. **Filter conditional events** based on user configuration (downtime/scrap flags)
4. **Randomly select** 1-3 conditional events from filtered list
5. **Combine** mandatory + selected conditional events

```typescript
// Separate mandatory from conditional
const mandatoryAssignments = segmentAssignments.filter(a => 
  a.isMandatory === true || a.isMandatory === 'TRUE' || a.isMandatory === 'true'
);
const conditionalAssignments = segmentAssignments.filter(a => 
  !(a.isMandatory === true || a.isMandatory === 'TRUE')
);

// Combine mandatory events with randomly selected conditional events
let selectedAssignments = [...mandatoryAssignments];

if (filteredConditionalAssignments.length > 0) {
  const numConditionalEvents = Math.floor(Math.random() * 3) + 1;
  const shuffled = [...filteredConditionalAssignments].sort(() => 0.5 - Math.random());
  const selectedConditional = shuffled.slice(0, Math.min(numConditionalEvents, filteredConditionalAssignments.length));
  selectedAssignments = [...selectedAssignments, ...selectedConditional];
}
```

#### Step 2: Generate Operations Events

**Code Location:** [ProcessDataGenerator.tsx](frontend/src/components/ProcessDataGenerator.tsx#L886-L941)

For each selected event assignment and each segment response:

1. **Calculate event timestamp** based on `StartOrEndEvent` property
2. **Create OperationsEvent** entity with:
   - Unique ID
   - Reference to segment response
   - Event definition ID
   - Effective timestamp
   - Equipment and hierarchy scope references

```typescript
const operationsEvent: OperationsEvent = {
  id: `OPS-EVENT-${segResp.id}-${assignment.operationsEventDefinitionId}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
  segmentResponseId: segResp.id,
  operationsEventDefinitionId: assignment.operationsEventDefinitionId,
  effectiveTimestamp: eventTime.toISOString().slice(0, 19).replace('T', ' '),
  notes: `${eventDef?.description || 'Event'} (${startOrEnd === 'end' ? 'End' : 'Start'}) - ${assignment.notes}`,
  eventType: eventDef?.eventType || 'Alarm',
  equipmentId: equipmentIdValue,
  hierarchyScope: hierarchyScopeValue,
};
```

#### Step 3: Generate Operations Event Records

**Code Location:** [ProcessDataGenerator.tsx](frontend/src/components/ProcessDataGenerator.tsx#L943-L977)

For each operations event:

1. **Find event definition** to get severity
2. **Create OperationsEventRecord** with:
   - Link to operations event
   - Severity (from event definition)
   - Status (randomly "Open" or "Closed")
   - Equipment and segment references

```typescript
const operationsEventRecord: OperationsEventRecord = {
  id: recordId,
  operationsEventId: opsEvent.id,
  operationsEventDefinitionId: opsEvent.operationsEventDefinitionId,
  severity: eventDef?.severity || 'Medium',
  status: Math.random() > 0.3 ? 'Closed' : 'Open',
  comments: `Event occurred at ${opsEvent.effectiveTimestamp} - ${opsEvent.notes}`,
  effectiveTime: opsEvent.effectiveTimestamp,
  segmentResponseId: opsEvent.segmentResponseId,
  equipmentId: selectedEquipment,
  eventType: opsEvent.eventType || 'Alarm',
};
```

#### Step 4: Generate Operations Event Entries

**Code Location:** [ProcessDataGenerator.tsx](frontend/src/components/ProcessDataGenerator.tsx#L979-L1041)

For each operations event record:

1. **Find entry templates** from master data matching the event definition
2. **Create entries** based on templates (or default entry if no templates exist)
3. **Offset timestamps** by 5 minutes per entry

```typescript
// Find entry templates for this event definition ID from master data
const recordTemplates = operationsEventRecordsTemplates.filter(
  rt => rt.OperationsEventDefinitionID === opsEvent.operationsEventDefinitionId
);

// For each matching record template, find corresponding entry templates
for (const recordTemplate of recordTemplates) {
  const entryTemplates = operationsEventEntriesTemplates.filter(
    et => et.OperationsEventRecordID === recordTemplate.OperationsEventRecordID
  );
  
  // Create entries based on templates
  for (let i = 0; i < entryTemplates.length; i++) {
    const template = entryTemplates[i];
    const eventTime = new Date(opsEvent.effectiveTimestamp.replace(' ', 'T') + 'Z');
    const entryTime = new Date(eventTime.getTime() + (entryCount) * 5 * 60000); // Add 5 minutes per entry
    
    const operationsEventEntry: OperationsEventEntry = {
      id: entryId,
      operationsEventRecordId: recordId,
      entryType: template.EntryType || 'Production',
      description: template.Description || `Entry for ${eventDef?.eventCode || 'event'}`,
      effectiveTime: entryTime.toISOString().slice(0, 19).replace('T', ' '),
      segmentResponseId: operationsEventRecord.segmentResponseId,
      equipmentId: operationsEventRecord.equipmentId,
    };
  }
}
```

#### Step 5: Generate Operations Event Properties

**Code Location:** [ProcessDataGenerator.tsx](frontend/src/components/ProcessDataGenerator.tsx#L1054-L1096)

For each operations event:

1. **Find property assignments** from master data
2. **Create property record** for each assignment
3. **Use values directly from master data** (including Duration)

```typescript
for (const opsEvent of generatedOperationsEvents) {
  // Find all property assignments for this event's definition
  const propertyAssignments = operationEventDefinitionPropertyAssignments.filter(
    pa => pa.operationsEventDefinitionId === opsEvent.operationsEventDefinitionId
  );
  
  // For each assignment, create an operation event property
  for (const assignment of propertyAssignments) {
    const property = operationEventDefinitionProperties.find(
      p => p.id === assignment.operationsEventDefinitionPropertyId
    );
    
    const operationsEventProperty = {
      id: propId,
      operationsEventId: opsEvent.id,
      operationsEventDefinitionPropertyId: property.id,
      value: assignment.value,              // ← From CSV (e.g., "2")
      valueUnitOfMeasure: assignment.valueUnitOfMeasure, // ← From CSV (e.g., "minutes")
      effectiveTime: opsEvent.effectiveTimestamp,
    };
    
    generatedOperationsEventProperties.push(operationsEventProperty);
  }
}
```

### Duration Property - Source & Behavior

#### Key Understanding

The **Duration property is NOT calculated** during generation - it's **pre-defined in master data** for each event type.

**Source:** [operation_event_definition_property_assignment.csv](frontend/public/templates/masterdata/operation_event_definition_property_assignment.csv)

**Examples:**
- `OED-UD-OVERTEMP` (Oven Over Temperature) → Duration = 2 minutes
- `OED-UD-MIXFAIL` (Mixer Failure) → Duration = 3 minutes
- `OED-UD-POWER` (Power Loss) → Duration = 2 minutes
- All quality/scrap events → Duration = 2 minutes

#### What Duration Represents

The Duration property represents the **event duration itself** - how long the alarm/event condition lasted - NOT the production delay it caused.

**Example:**
- A mixer failure event might have `Duration = 3 minutes` (the alarm was active for 3 minutes)
- But the actual production delay from this failure is reflected in the **segment response duration extension** via the `downtimeDelayMinutes` parameter

#### Relationship to Downtime Delay

```
Event Duration (from master data CSV)
  ↓
  Represents how long the event/alarm was active
  
Downtime Delay (user input parameter)
  ↓
  Extends the segment response duration
  ↓
  Simulates the actual production impact
```

**Code Location:** [ProcessDataGenerator.tsx](frontend/src/components/ProcessDataGenerator.tsx#L610-L619)

```typescript
// Calculate duration for this run
let runDuration = segmentDuration;

// Apply downtime delay to extend the duration
if (downtimeDelayMinutes > 0) {
  const downtimeDelayHours = downtimeDelayMinutes / 60;
  runDuration += downtimeDelayHours;
  console.log(`Applied downtime delay of ${downtimeDelayMinutes} minutes. New duration: ${runDuration}h`);
}

const endTime = new Date(runStartTime.getTime() + runDuration * 60 * 60 * 1000);
```

### Data Storage

All generated operations events data is stored in **IndexedDB** (browser-side):

- **Database:** `processDataDB`
- **Stores:**
  - `operationsEvents`
  - `operationsEventRecords`
  - `operationsEventEntries`
  - `operationsEventProperties`

This data can later be migrated to the backend SQL Server database via the **Data Migration** component.

### Summary Diagram

```
Master Data (CSV)
  ├── operation_event_definitions.csv
  │     └── CausesDowntime, CausesScrap flags
  ├── operation_event_definition_segment_assignments.csv
  │     └── IsMandatory, StartOrEndEvent
  └── operation_event_definition_property_assignment.csv
        └── Duration values (2-3 minutes)
              ↓
        User Configuration
          ├── productionDelayMinutes > 0 → Include downtime events
          ├── downtimeDelayMinutes → Extend segment duration
          └── scrapProducedPercent > 0 → Include scrap events
              ↓
        Event Filtering & Selection
          ├── Mandatory events (always included)
          └── 1-3 conditional events (randomly selected)
              ↓
        Generation Process
          ├── 1. OperationsEvent (with timestamp)
          ├── 2. OperationsEventRecord (with severity, status)
          ├── 3. OperationsEventEntry (from templates)
          └── 4. OperationsEventProperty (Duration from CSV)
              ↓
        IndexedDB Storage
          └── processDataDB
                ├── operationsEvents
                ├── operationsEventRecords
                ├── operationsEventEntries
                └── operationsEventProperties
```

---

## Segment Requirement Timeline Calculation

### Overview

The system calculates planned start and end times for segment requirements using a **pipeline/overlapping scheduling approach** with **sequential dependency enforcement**. This allows production to flow efficiently while ensuring downstream segments cannot complete before upstream segments finish.

### Core Concepts

#### 1. Pipeline Effect (Start Time Logic)

**Principle:** Subsequent segments can start as soon as the **first run** of the previous segment completes, rather than waiting for all runs to finish.

**Example:** 
- Mixing produces batches of 400 units every 2 hours
- After the first batch is mixed (2 hours), baking can start on that batch
- While batch 1 is baking, mixing continues with batch 2, 3, etc.

#### 2. Sequential Dependency (End Time Logic)

**Principle:** A segment cannot complete before the previous segment has finished **all** its runs.

**Example:**
- If mixing takes 20 hours to process all 10 batches (10 runs × 2 hours)
- And baking only takes 10 hours (10 runs × 1 hour)
- Baking's end time is adjusted to 20 hours (when mixing completes)
- **Reason:** You can't finish baking bread that hasn't been mixed yet

### Input Parameters

| Parameter | Source | Purpose |
|-----------|--------|---------|
| `plannedQuantity` | User form input | Total units to produce (e.g., 4000 EA) |
| `equipmentCapacity` | `equipmentUsages.capacityPerRun` | How many units per equipment run (e.g., 400 EA) |
| `segmentDuration` | `processSegments.durationHours` | Duration of one run (e.g., 2 hours for mixing, 1 hour for packaging) |

### Calculation Steps

#### Step 1: Calculate Required Runs

```typescript
const requiredRuns = Math.ceil(formData.plannedQuantity / equipmentCapacity);
```

**Example:** 4000 EA ÷ 400 EA/run = 10 runs

#### Step 2: Calculate Total Duration

```typescript
const totalDuration = segmentDuration * requiredRuns;
```

**Example:** 
- Mixing: 2 hours × 10 runs = 20 hours
- Baking: 2 hours × 10 runs = 20 hours
- Packaging: 1 hour × 10 runs = 10 hours

#### Step 3: Determine Start Time

**Code Location:** [ProcessDataGenerator.tsx](frontend/src/components/ProcessDataGenerator.tsx#L2169-L2182)

```typescript
let segmentStartTime: Date;
if (index === 0) {
  // First segment starts at operations request start time
  segmentStartTime = new Date(currentTime);
} else if (previousSegmentFirstRunEnd) {
  // Subsequent segments can start when first run of previous segment completes
  segmentStartTime = new Date(previousSegmentFirstRunEnd);
} else {
  segmentStartTime = new Date(currentTime);
}
```

**Example Timeline:**
- Mixing starts: 2026-01-26 00:01:00
- Mixing first run ends: 2026-01-26 02:01:00 (after 2 hours)
- **Baking starts: 2026-01-26 02:01:00** ← Pipeline effect!
- Baking first run ends: 2026-01-26 04:01:00 (after 2 hours)
- **Packaging starts: 2026-01-26 04:01:00** ← Pipeline effect!

#### Step 4: Calculate Provisional End Time

```typescript
let allRunsEnd = new Date(segmentStartTime.getTime() + totalDuration * 60 * 60 * 1000);
```

**Example Provisional End Times:**
- Mixing: 00:01 + 20h = **20:01** ✓
- Baking: 02:01 + 20h = **22:01** ✓
- Packaging: 04:01 + 10h = **14:01** ✗ (Too early!)

#### Step 5: Enforce Sequential Dependency

**Code Location:** [ProcessDataGenerator.tsx](frontend/src/components/ProcessDataGenerator.tsx#L2190-L2197)

```typescript
// IMPORTANT: Ensure this segment cannot complete before the previous segment completes all its runs
// When previous segment finishes later, the last batch from that segment still needs processing time in this segment
if (index > 0 && currentTime > allRunsEnd) {
  console.log(`[Plan Generation] Adjusting end time: Segment ${segment.id} would end at ${allRunsEnd.toISOString()}, but previous segment ends at ${currentTime.toISOString()}`);
  // Add this segment's duration for processing the last batch from the previous segment
  allRunsEnd = new Date(currentTime.getTime() + segmentDuration * 60 * 60 * 1000);
  console.log(`[Plan Generation] Adjusted end time to ${allRunsEnd.toISOString()} (previous end + ${segmentDuration}h for last batch processing)`);
}
```

**Example Adjustment:**
- Packaging provisional end: 14:01
- Baking actual end (currentTime): 22:01
- **Packaging adjusted end: 23:01** ← Previous segment end (22:01) + packaging duration (1h) for last batch!

#### Step 6: Update Tracking Variables

```typescript
// Update for next segment (pipeline effect: next segment can start when this segment's first run completes)
previousSegmentFirstRunEnd = firstRunEnd;

// Update currentTime to when all runs of this segment complete (for tracking overall timeline)
currentTime = new Date(allRunsEnd);
```

### Example: Wheat Bread 750g Production

**Inputs:**
- Planned Quantity: 4000 EA
- Product: BREAD-750G (Wheat Bread 750g)
- Segments: Mixing → Baking → Packaging

**Master Data:**
```csv
ProcessSegmentID,SegmentDurationHours
BREAD-750G-MIX,2
BREAD-750G-BAKE,2
BREAD-750G-PACK,1

EquipmentUsageID,ProcessSegmentID,CapacityPerRunEA
EU-001,BREAD-750G-MIX,400
EU-002,BREAD-750G-BAKE,400
EU-010,BREAD-750G-PACK,400
```

**Calculations:**

| Segment | Capacity | Runs Needed | Duration/Run | Total Duration | Start | Provisional End | Adjusted End | Final End |
|---------|----------|-------------|--------------|----------------|-------|-----------------|--------------|-----------|
| Mixing | 400 | 10 | 2h | 20h | 00:01 | 20:01 | - | **20:01** |
| Baking | 400 | 10 | 2h | 20h | 02:01 | 22:01 | - | **22:01** |
| Packaging | 400 | 10 | 1h | 10h | 04:01 | 14:01 | **23:01** | **23:01** |

**Key Insight:** Packaging's end time is adjusted from 14:01 to 23:01 because:
1. The previous segment (Baking) finishes at 22:01
2. The last batch from baking still needs 1 hour of packaging time
3. Final calculation: 22:01 (baking ends) + 1h (packaging duration) = 23:01

### Visual Timeline

```
Time →    00:01      02:01      04:01      14:01      20:01      22:01  23:01
          |----------|----------|----------|----------|----------|------|
Mixing:   [===== 10 runs × 2h = 20 hours ================]
                     |                                           |
Baking:              [===== 10 runs × 2h = 20 hours ===================]
                                |                      |                |  |
Packaging:                      [== 10 runs × 1h ==]  |                |  |
                                (would end here)      |                |  |
                                                      |                |  |
Packaging                          [WAIT/BUFFER]     [Last Batch Process]|
(adjusted):                        (wait for all batches)         [22:01-23:01]

Legend:
[====] Active production
[WAIT] Enforced waiting period to maintain sequential dependency
[Last Batch Process] Processing the final batch from previous segment

Batch Flow Example:
- Baking Batch 10 completes at 22:01
- That batch must go through packaging: 22:01 → 23:01
- Therefore, Packaging segment ends at 23:01
```

### Code Locations

| Step | File | Lines | Description |
|------|------|-------|-------------|
| Calculate runs | [ProcessDataGenerator.tsx](frontend/src/components/ProcessDataGenerator.tsx#L2164) | 2164 | `Math.ceil(plannedQuantity / capacity)` |
| Calculate duration | [ProcessDataGenerator.tsx](frontend/src/components/ProcessDataGenerator.tsx#L2167) | 2167 | `segmentDuration * requiredRuns` |
| Determine start time | [ProcessDataGenerator.tsx](frontend/src/components/ProcessDataGenerator.tsx#L2169-L2182) | 2169-2182 | Pipeline effect: start after first run of previous |
| Calculate end time | [ProcessDataGenerator.tsx](frontend/src/components/ProcessDataGenerator.tsx#L2187-L2189) | 2187-2189 | `startTime + totalDuration` |
| Enforce dependency | [ProcessDataGenerator.tsx](frontend/src/components/ProcessDataGenerator.tsx#L2190-L2197) | 2190-2197 | Add one run duration if would end before previous segment |
| Create segment requirement | [ProcessDataGenerator.tsx](frontend/src/components/ProcessDataGenerator.tsx#L2204-L2213) | 2204-2213 | Store as `earliestStartDateTime` and `latestEndDateTime` |

### Why This Logic Matters

**Without Dependency Enforcement:**
```
✗ Packaging ends at 14:01, but baking doesn't finish until 22:01
✗ This implies packaging 8 hours of product that hasn't been baked yet!
✗ Violates material flow and production reality
```

**With Dependency Enforcement:**
```
✓ Packaging ends at 23:01 (baking end 22:01 + 1h packaging duration)
✓ All bread is fully processed through all stages
✓ The last batch from baking (finishes at 22:01) goes through packaging (22:01-23:01)
✓ Maintains logical production sequence and material flow
```

### Special Cases

#### Case 1: Faster Upstream Segment

If a previous segment has shorter duration per run:
- Downstream segment may naturally take longer
- No adjustment needed
- Example: Mixing (1h) → Baking (3h) → Packaging (1h)
  - Baking naturally takes longest, no adjustment

#### Case 2: Multiple Fast Downstream Segments

If several downstream segments are faster:
- Each gets adjusted to previous segment's end time + its own duration
- Creates a "cascade" of adjustments
- Example: Mixing (20h) → Baking (5h) → Packaging (2h) → Labeling (1h)
  - Baking: adjust to 20h (mixing end) + 2h (baking duration) = 22h
  - Packaging: adjust to 22h (baking end) + 1h (packaging duration) = 23h
  - Labeling: adjust to 23h (packaging end) + 1h (labeling duration) = 24h

#### Case 3: Equal Durations

If all segments have equal duration:
- Each ends progressively later due to pipeline start delays
- No adjustments needed
- Example: All segments 10h, capacity 400
  - Mixing: 00:00-10:00
  - Baking: 02:00-12:00
  - Packaging: 04:00-14:00 (no adjustment needed)

---

