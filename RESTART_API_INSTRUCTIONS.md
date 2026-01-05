# Instructions to Restart API with CSV Generation

## The Problem
The API is currently running with the old code that generates JSON files instead of CSV files. The new code has been implemented but needs the API to be restarted.

## Solution Steps

### Option 1: Stop via Task Manager (Recommended)
1. Press `Ctrl+Shift+Esc` to open Task Manager
2. Find "ISA95DataGenerator.API.exe" in the list
3. Right-click and select "End Task"
4. Run the commands below in PowerShell

### Option 2: Close the terminal where it's running
1. Find the PowerShell terminal where you ran `dotnet run`
2. Press `Ctrl+C` to stop it
3. Run the commands below

## After Stopping the API

```powershell
# Navigate to project directory
cd "c:\Users\radion.badanjuk\Documents\Avanade\MDS\MDS Tools\ISA95DataGenerator"

# Build the project with new changes
dotnet build

# Start the API with new CSV generation code
dotnet run --project src/ISA95DataGenerator.API
```

## How to Verify It's Working

1. Open the frontend in your browser
2. Create a graph with entities and relationships
3. Set instance counts and cardinalities
4. Click "Download Data"
5. Open the downloaded ZIP file
6. You should see:
   - **CSV files** (not JSON) - one per entity (e.g., `Operations Request.csv`, `Segment Requirement.csv`)
   - **mapping.csv** - relationships in CSV format

## What Changed in the Backend

✅ `DataGenerationModels.cs` - Added `EntityInstanceCounts` and `GraphRelationshipCardinality`
✅ `TestDataGeneratorService.cs` - Uses entity counts and relationship cardinalities
✅ `DataGenerationController.cs` - Generates CSV files instead of JSON

The code is ready - just needs the API restarted!
