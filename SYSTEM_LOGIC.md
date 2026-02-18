# ISA-95 Data Generator - System Logic Documentation

This document explains the internal logic and data flows within the ISA-95 Data Generator system.

**Last Updated:** February 18, 2026

---

## Table of Contents

1. [Operations Events Generation](#operations-events-generation)

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

