# ISA-95 Test Data Generator

A full-stack application for generating test data for ISA-95 manufacturing entities with configurable primary keys, field rules, and relationship mapping.

## 🏗 Architecture

### Backend (.NET 9 Web API)
- **Clean Architecture** with dependency injection
- **Domain Layer**: Entities, Rules, Models
- **Application Layer**: Service interfaces
- **Infrastructure Layer**: Service implementations
- **API Layer**: Controllers and endpoints

### Key Features
✅ Load ISA-95 entity definitions from JSON  
✅ Navigate entity relationship graphs  
✅ Define custom primary key rules  
✅ Configure field value generation rules  
✅ Generate deterministic test data  
✅ Create relationship mapping files  
✅ Prevent infinite recursion in cyclic graphs  
✅ Download generated data as ZIP  

## 📁 Project Structure

```
ISA95DataGenerator/
├── InbuiltEntitiesDTDL/          # ISA-95 JSON entity definitions
├── src/
│   ├── ISA95DataGenerator.API/              # Web API controllers
│   ├── ISA95DataGenerator.Application/      # Service interfaces
│   ├── ISA95DataGenerator.Domain/           # Entities, Rules, Models
│   └── ISA95DataGenerator.Infrastructure/   # Service implementations
└── ISA95DataGenerator.sln
```

## 🚀 Getting Started

### Prerequisites
- .NET 9 SDK
- Node.js 18+ (for frontend)
- Visual Studio 2022 or VS Code

### Backend Setup

1. **Restore packages**:
   ```bash
   cd "C:\Users\radion.badanjuk\Documents\Avanade\MDS\MDS Tools\ISA95DataGenerator"
   dotnet restore
   ```

2. **Build solution**:
   ```bash
   dotnet build
   ```

3. **Run the API**:
   ```bash
   cd src/ISA95DataGenerator.API
   dotnet run
   ```

   API will be available at: `http://localhost:5000`

### Configuration

Update `appsettings.json` to set the metadata path:

```json
{
  "MetadataPath": "../../InbuiltEntitiesDTDL"
}
```

## ☁️ Microsoft Fabric (PySpark) Data Migration

You can run Data Migration mappings outside the web UI using the Fabric-ready PySpark assets.

### Included assets
- `templates/fabric/isa95_pyspark_migration.py` — PySpark migration runner
- `templates/fabric/ISA95_Fabric_Migration.ipynb` — ready-to-run Fabric notebook
- `templates/fabric/FABRIC_PYSPARK_MIGRATION.md` — usage guide

### What this supports
- Source-to-entity mapping generation from exported mapping JSON config
- Entity-to-entity (bridge) mapping generation
- Mapping filters, field rules, and primary-key rules from the existing configuration format
- Failed/skipped item summaries for batch runs

### Typical flow
1. Export mapping config from UI as JSON (`Export Config`)
2. Upload `isa95_pyspark_migration.py`, config JSON, and source tables to Fabric Lakehouse Files
3. Open `ISA95_Fabric_Migration.ipynb` in Fabric and update paths in the configuration cell
4. Run notebook cells to generate output CSV folders

## 📡 API Endpoints

### Entities
- `GET /api/entities` - Get all entities
- `GET /api/entities/{name}/structure` - Get entity structure
- `GET /api/entities/{name}/related` - Get related entities
- `GET /api/entities/{name}/graph?maxDepth=3` - Get entity graph
- `POST /api/entities/reload` - Reload metadata

### Rules
- `POST /api/rules/primary-key` - Define PK rule
- `GET /api/rules/primary-key/{entityName}` - Get PK rule
- `GET /api/rules/primary-key` - Get all PK rules
- `DELETE /api/rules/primary-key/{entityName}` - Delete PK rule
- `POST /api/rules/field` - Define field rule
- `GET /api/rules/field/{entityName}/{fieldName}` - Get field rule
- `GET /api/rules/field/{entityName}` - Get entity field rules
- `GET /api/rules/field` - Get all field rules
- `DELETE /api/rules/field/{entityName}/{fieldName}` - Delete field rule

### Data Generation
- `POST /api/datageneration/generate-data` - Generate test data
- `POST /api/datageneration/generate-mapping` - Generate mapping file
- `POST /api/datageneration/download` - Download ZIP with data and mappings

## 🎯 Usage Examples

### 1. Generate Primary Key Rule

```json
POST /api/rules/primary-key
{
  "entityName": "Equipment",
  "fieldNames": ["id"],
  "formatTemplate": "EQ-{Seq:0000}",
  "useSequence": true,
  "startingSequence": 1,
  "sequencePadding": 4
}
```

### 2. Define Field Rule

```json
POST /api/rules/field
{
  "entityName": "Equipment",
  "fieldName": "equipmentLevel",
  "ruleType": "Examples",
  "parameters": {
    "values": ["site", "area", "workCenter", "unit"]
  }
}
```

### 3. Generate Test Data

```json
POST /api/datageneration/generate-data
{
  "rootEntityName": "Equipment",
  "includedRelatedEntities": ["EquipmentProperty"],
  "instanceCount": 10,
  "seed": 42,
  "maxDepth": 3,
  "primaryKeyRules": [
    {
      "entityName": "Equipment",
      "formatTemplate": "EQ-{Seq:0000}",
      "useSequence": true
    }
  ],
  "fieldRules": [
    {
      "entityName": "Equipment",
      "fieldName": "equipmentLevel",
      "ruleType": "Examples",
      "parameters": {
        "values": ["site", "area", "workCenter"]
      }
    }
  ]
}
```

## 🔧 Services

### MetadataLoaderService
- Loads ISA-95 JSON files from `InbuiltEntitiesDTDL` folder
- Parses entity definitions, attributes, and relationships
- Caches entities for performance

### GraphTraversalService
- Navigates entity relationship graphs
- Finds paths between entities
- Prevents cycles with visited tracking

### PrimaryKeyRuleService
- Manages primary key generation rules
- Supports templates: `{Field}-{Seq:0000}`
- Composite keys and custom formatting

### FieldRuleService
- Manages field value generation rules
- Supports: Range, Examples, Pattern, Static, Sequence
- Deterministic generation with seeded Random

### TestDataGeneratorService
- Generates test data recursively
- Maintains referential integrity
- Caches instances for reuse
- Handles 1:1, 1:N, N:1, N:M relationships

### MappingFileService
- Creates mapping between source/target entities
- Tracks relationship types
- Exports as JSON

## 📊 Data Models

### EntityDefinition
```csharp
- Id: string (dtmi:digitaltwins:isa95:Equipment;1)
- Name: string
- DisplayName: string
- Description: string
- Attributes: List<AttributeDefinition>
- Relationships: List<RelationshipDefinition>
```

### AttributeDefinition
```csharp
- Name: string
- Schema: string (String, Integer, Double, DateTime, Enum)
- IsRequired: bool
- IsPrimaryKey: bool
- EnumValues: List<string>
```

### RelationshipDefinition
```csharp
- Name: string
- TargetEntityId: string
- TargetEntityName: string
- Cardinality: OneToOne | OneToMany | ManyToOne | ManyToMany
```

## 🛠 Development

### Repository Rules
- Never modify `.json` files inside `InbuiltEntitiesDTDL/` directly (also referred to as `InbuildEntitiesDTDL`).
- Treat `InbuiltEntitiesDTDL/` as protected baseline metadata.
- If metadata updates are needed for UI/mapping behavior, make them in `frontend/public/InbuiltEntitiesDTDL/` unless a maintainer explicitly requests a baseline update.

### Add New Entity
1. Place JSON file in `InbuiltEntitiesDTDL` folder
2. Ensure it follows ISA-95 format with `dtdlSchema`
3. Call `POST /api/entities/reload`

### Debug
Set environment variable:
```bash
ASPNETCORE_ENVIRONMENT=Development
```

## � TODO: Data Source Schema Configuration System

The following features are planned to allow UI-based configuration of data source tables and structures:

### Phase 1: Schema Storage & Service
- [ ] Create `dataSourceSchemas` store in IndexedDB
- [ ] Implement `SchemaService` with CRUD operations for table schemas
- [ ] Define schema format: `{ tableName, displayName, sourceType, columns[], dataStoreKey }`

### Phase 2: UI Components
- [ ] **Schema List Panel** - Display all data source tables with edit/delete options
- [ ] **Column Editor** - Add/remove/reorder columns for each table
- [ ] **Data Type Selector** - Dropdown for column types (string, number, datetime, boolean)
- [ ] **Field Mapping** - Link UI column to actual data field name

### Phase 3: Import/Export Features
- [ ] **Import Table Schema from CSV** - Parse CSV headers to create table schema
- [ ] **Import Table Schema from JSON** - Load complete schema definition from JSON file
- [ ] **Export Schemas to JSON** - Save current schema configuration for backup/sharing
- [ ] **Export Schemas to CSV** - Export schema as CSV template

### Phase 4: Auto-Detection & Sync
- [ ] **"Sync from Data" Button** - Auto-detect columns from actual IndexedDB data
- [ ] **Detect New Fields** - Highlight fields in data not yet in schema
- [ ] **Suggest Schema Updates** - Propose adding missing fields with auto-detected types
- [ ] **Validation** - Ensure mapped fields exist in actual data

### Phase 5: Migration
- [ ] Modify `DataMigration.tsx` to read table definitions from schema store
- [ ] Replace hardcoded table definitions with dynamic schema loading
- [ ] Add default schemas that ship with the application
- [ ] Support schema versioning and change tracking
## 📋 TODO: Lookup Field Rule

Add a new field rule type `Lookup` that retrieves values from other source tables based on configurable join conditions.

### Lookup Rule Features
- [ ] **Single Field Join** - Lookup based on one field matching (e.g., `equipmentId -> HierarchyScope.equipmentID`)
- [ ] **Composite Field Join** - Lookup based on multiple fields (e.g., `plantId + lineId -> ProductionLine`)
- [ ] **Field Concatenation Join** - Lookup with concatenated key (e.g., `CONCAT(prefix, '-', id) -> TargetTable.compositeKey`)
- [ ] **Return Field Selection** - Specify which field(s) to return from the lookup table
- [ ] **Default Value** - Fallback value when lookup finds no match
- [ ] **Multiple Match Handling** - Options: first, last, random, or error on multiple matches

### Lookup Parameters Schema
```typescript
interface LookupParameters {
  sourceTable: string;           // Table to lookup from
  joinConditions: JoinCondition[]; // Array of join conditions
  returnField: string;           // Field to return from source table
  defaultValue?: any;            // Value if no match found
  multipleMatchBehavior?: 'first' | 'last' | 'random' | 'error';
}

interface JoinCondition {
  type: 'field' | 'composite' | 'concatenation';
  // For 'field' type:
  localField?: string;           // Field in current record
  sourceField?: string;          // Field in source table
  // For 'composite' type:
  localFields?: string[];        // Multiple fields in current record
  sourceFields?: string[];       // Multiple fields in source table
  // For 'concatenation' type:
  localExpression?: string;      // Expression like "{field1}-{field2}"
  sourceExpression?: string;     // Expression for source table
}
```

### Implementation Tasks
- [x] Add `Lookup` to `FieldRuleType` enum in `FieldRule.cs`
- [x] Create `LookupParameters` class in Domain layer
- [x] Implement lookup logic in `FieldRuleService.cs`
- [x] Add UI editor for Lookup rule in `FieldRuleEditor.tsx`
- [ ] Support lookup in bridge table generation
- [ ] Support lookup in primary key generation
- [ ] Add caching for frequently looked up tables
- [ ] Add validation for lookup configuration

### Example Use Cases
```json
// Example 1: Simple field lookup (Equipment ID -> Hierarchy Scope ID)
{
  "entityName": "OperationsEvent",
  "fieldName": "hierarchyScope",
  "ruleType": "Lookup",
  "parameters": {
    "sourceTable": "hierarchyScopes",
    "joinConditions": [
      { "type": "field", "localField": "equipmentId", "sourceField": "equipmentID" }
    ],
    "returnField": "id",
    "defaultValue": ""
  }
}

// Example 2: Composite key lookup
{
  "entityName": "SegmentResponse",
  "fieldName": "productionLineId",
  "ruleType": "Lookup",
  "parameters": {
    "sourceTable": "productionLines",
    "joinConditions": [
      { "type": "composite", "localFields": ["plantId", "areaId"], "sourceFields": ["plantId", "areaId"] }
    ],
    "returnField": "id"
  }
}

// Example 3: Concatenation lookup
{
  "entityName": "MaterialLot",
  "fieldName": "materialDefinitionId",
  "ruleType": "Lookup",
  "parameters": {
    "sourceTable": "materials",
    "joinConditions": [
      { "type": "concatenation", "localExpression": "{category}-{code}", "sourceField": "compositeKey" }
    ],
    "returnField": "id"
  }
}
```
## �📝 License

Internal Avanade project.

## 👥 Contributors

Generated with GitHub Copilot assistance.
