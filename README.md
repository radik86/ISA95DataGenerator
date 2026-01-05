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

### Add New Entity
1. Place JSON file in `InbuiltEntitiesDTDL` folder
2. Ensure it follows ISA-95 format with `dtdlSchema`
3. Call `POST /api/entities/reload`

### Debug
Set environment variable:
```bash
ASPNETCORE_ENVIRONMENT=Development
```

## 📝 License

Internal Avanade project.

## 👥 Contributors

Generated with GitHub Copilot assistance.
