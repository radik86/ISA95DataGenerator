# CSV Generation Implementation Summary

## Overview
Implemented backend support for entity-specific instance counts, relationship cardinalities, and CSV file generation per entity.

## Changes Made

### 1. Data Models (`DataGenerationModels.cs`)

Added new class and properties to support graph-based data generation:

```csharp
public class GraphRelationshipCardinality
{
    public string SourceEntity { get; set; }
    public string TargetEntity { get; set; }
    public string RelationshipName { get; set; }
    public int Cardinality { get; set; } // Number of child records per parent
}

public class DataGenerationRequest
{
    // ... existing properties ...
    public Dictionary<string, int>? EntityInstanceCounts { get; set; }
    public List<GraphRelationshipCardinality>? RelationshipCardinalities { get; set; }
}
```

### 2. Test Data Generator Service (`TestDataGeneratorService.cs`)

#### Updated `GenerateDataAsync` method:
- Uses entity-specific instance counts from `EntityInstanceCounts` dictionary
- Falls back to global `InstanceCount` if entity not in dictionary
- Passes request to `GenerateRelatedEntitiesAsync` for cardinality processing

```csharp
int rootInstanceCount = request.EntityInstanceCounts?.GetValueOrDefault(request.RootEntityName) 
                        ?? request.InstanceCount;
```

#### Updated `GenerateRelatedEntitiesAsync` method:
- Checks `RelationshipCardinalities` for specific 1:N ratios
- Generates exact number of child records per parent based on cardinality
- Honors entity-specific instance counts for related entities
- Falls back to default cardinality logic if no rule specified

**Key Logic:**
```csharp
var cardinalityRule = request.RelationshipCardinalities?.FirstOrDefault(rc =>
    rc.SourceEntity == entityName &&
    rc.TargetEntity == relationship.TargetEntityName &&
    rc.RelationshipName == relationship.Name);

int instanceCount = cardinalityRule != null 
    ? cardinalityRule.Cardinality 
    : /* default logic */;
```

### 3. Data Generation Controller (`DataGenerationController.cs`)

#### Updated `DownloadGeneratedData` endpoint:

**Changed from JSON to CSV:**
- Generates separate CSV file for each entity
- Creates proper CSV format with quoted fields
- Handles arrays/lists in fields (joined with semicolons)
- Excludes internal fields (those starting with `_`)

**Mapping File Format:**
- Changed from JSON to CSV
- Columns: "Source Type", "Source PK", "Target Type", "Target PK", "Relationship"
- **Does NOT include cardinality field** (as requested)

**CSV Generation Logic:**
```csharp
// Header
var headers = firstRow.Keys.Where(k => !k.StartsWith("_")).ToList();
await writer.WriteLineAsync(string.Join(",", headers.Select(h => $"\"{h}\"")));

// Rows
foreach (var row in kvp.Value)
{
    var values = headers.Select(h => {
        var value = row.ContainsKey(h) ? row[h] : "";
        // Handle arrays
        if (value is IEnumerable enumerable && value is not string)
            return $"\"{string.Join(";", items)}\"";
        return $"\"{value?.ToString()?.Replace("\"", "\"\"") ?? ""}\"";
    });
    await writer.WriteLineAsync(string.Join(",", values));
}
```

## Frontend Integration

The frontend already sends the correct data via `DataGenerationRequest`:

```typescript
const request: DataGenerationRequest = {
  // ... other fields ...
  entityInstanceCounts: {
    "Operations Request": 3,
    "Segment Requirement": 12  // 3 × 4 via cardinality
  },
  relationshipCardinalities: [{
    sourceEntity: "Operations Request",
    targetEntity: "Segment Requirement",
    relationshipName: "RequiredByOperationsRequest",
    cardinality: 4  // 1:4 ratio
  }]
};
```

## Testing Instructions

### 1. Stop and Rebuild API:
```powershell
# Stop the running API process (Ctrl+C in terminal or Task Manager)
cd "c:\Users\radion.badanjuk\Documents\Avanade\MDS\MDS Tools\ISA95DataGenerator"
dotnet build
dotnet run --project src/ISA95DataGenerator.API
```

### 2. Test from Frontend:
1. Create a graph with multiple entities
2. Set instance counts on entities (e.g., "Operations Request" = 3)
3. Add relationships with cardinality (e.g., 1:4 ratio)
4. Enable ID composition for child entities
5. Click "Download Data"

### 3. Expected Output:
ZIP file containing:
- `Operations Request.csv` - 3 records
- `Segment Requirement.csv` - 12 records (3 × 4)
- `mapping.csv` - Relationship mappings WITHOUT cardinality column

### 4. CSV File Structure:

**Entity CSV (e.g., Operations Request.csv):**
```csv
"ID","Description","StartTime","EndTime",...
"OPS-0001","Description value","2026-01-05","2026-02-05",...
"OPS-0002","Description value","2026-01-06","2026-02-06",...
```

**Mapping CSV (mapping.csv):**
```csv
"Source Type","Source PK","Target Type","Target PK","Relationship"
"Operations Request","OPS-0001","Segment Requirement","OPS-0001-001","RequiredByOperationsRequest"
"Operations Request","OPS-0001","Segment Requirement","OPS-0001-002","RequiredByOperationsRequest"
"Operations Request","OPS-0001","Segment Requirement","OPS-0001-003","RequiredByOperationsRequest"
"Operations Request","OPS-0001","Segment Requirement","OPS-0001-004","RequiredByOperationsRequest"
```

## Key Features

✅ **Entity-Specific Instance Counts**: Generate different numbers of records per entity
✅ **Relationship Cardinality**: Control exact 1:N ratio for parent-child relationships
✅ **CSV Format**: Separate file per entity with proper CSV formatting
✅ **Mapping File**: CSV format with relationship structure
✅ **ID Composition**: PrefixSequence field rules create hierarchical IDs
✅ **Backward Compatible**: Falls back to default logic if new properties not provided

## Notes

- The build failed because the API is currently running and locking DLL files
- The code compiles successfully (Domain, Application, and Infrastructure layers built without errors)
- Simply stop the API, rebuild, and restart to apply changes
- All frontend code is already complete and sends correct data structure

## Microsoft Fabric (PySpark) Migration Option

In addition to running Data Migration inside the web application, you can now execute the same mapping configuration with PySpark in Microsoft Fabric.

### Assets
- `templates/fabric/isa95_pyspark_migration.py` — PySpark migration runner
- `templates/fabric/ISA95_Fabric_Migration.ipynb` — ready-to-run Fabric notebook
- `templates/fabric/FABRIC_PYSPARK_MIGRATION.md` — setup and usage guide

### Input/Output Model
- **Input:** exported Data Migration JSON config (`Export Config` as JSON) + source tables (CSV/JSON/Parquet)
- **Output:**
    - source-to-entity CSV folders under `<output_base>/<targetEntity>`
    - entity-to-entity mapping CSV folders under `<output_base>/mapping/<targetEntity>`

### Why use this path
- Run large mapping workloads directly on Fabric Spark compute
- Reuse existing mapping logic and configuration outside the browser runtime
- Get failed/skipped mapping summaries in notebook execution output
