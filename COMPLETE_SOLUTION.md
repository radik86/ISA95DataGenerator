# ISA-95 Test Data Generator - Complete Solution

## 📋 Overview

A full-stack application for generating deterministic test data based on ISA-95 manufacturing standards. The system loads entity metadata from JSON files, allows users to define primary key and field rules, and generates referentially-consistent test data with configurable seeding.

## 🏗 Architecture

### Backend (.NET 9 Web API)
- **Clean Architecture** with 4 layers:
  - **Domain**: Core entities and models
  - **Application**: Service interfaces
  - **Infrastructure**: Service implementations
  - **API**: Controllers and endpoints

### Frontend (React + TypeScript + Vite)
- **Component-based UI** with Material UI
- **React Flow** for graph visualization
- **React Query** for server state
- **Zustand** for client state
- **Strong TypeScript** typing throughout

## 🚀 Getting Started

### Prerequisites
- .NET 9 SDK
- Node.js 18+
- 150 ISA-95 JSON files in `InbuiltEntitiesDTDL` folder

### Backend Setup

```powershell
# Navigate to API project
cd ISA95DataGenerator.API

# Run the API
dotnet run
```

Backend runs at: **http://localhost:5000**
Swagger UI: **http://localhost:5000/swagger**

### Frontend Setup

```powershell
# Navigate to frontend
cd frontend

# Install dependencies (if not already done)
npm install

# Run dev server
npm run dev
```

Frontend runs at: **http://localhost:5173**

## 📦 Project Structure

```
ISA95DataGenerator/
├── ISA95DataGenerator.sln
├── ISA95DataGenerator.Domain/
│   ├── Entities/
│   │   ├── EntityDefinition.cs
│   │   ├── AttributeDefinition.cs
│   │   └── RelationshipDefinition.cs
│   ├── Rules/
│   │   ├── PrimaryKeyRule.cs
│   │   ├── FieldRule.cs
│   │   └── DataGenerationModels.cs
│   └── MappingFile.cs
├── ISA95DataGenerator.Application/
│   └── Interfaces/
│       ├── IMetadataLoaderService.cs
│       ├── IGraphTraversalService.cs
│       ├── IPrimaryKeyRuleService.cs
│       ├── IFieldRuleService.cs
│       ├── ITestDataGeneratorService.cs
│       └── IMappingFileService.cs
├── ISA95DataGenerator.Infrastructure/
│   └── Services/
│       ├── MetadataLoaderService.cs
│       ├── GraphTraversalService.cs
│       ├── PrimaryKeyRuleService.cs
│       ├── FieldRuleService.cs
│       ├── TestDataGeneratorService.cs
│       └── MappingFileService.cs
├── ISA95DataGenerator.API/
│   ├── Controllers/
│   │   ├── EntitiesController.cs
│   │   ├── RulesController.cs
│   │   └── DataGenerationController.cs
│   └── Program.cs
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   └── hooks.ts
│   │   ├── components/
│   │   │   ├── EntityBrowser.tsx
│   │   │   ├── EntityGraph.tsx
│   │   │   ├── EntityNode.tsx
│   │   │   ├── EntityDetails.tsx
│   │   │   ├── PrimaryKeyRuleBuilder.tsx
│   │   │   ├── FieldRuleEditor.tsx
│   │   │   ├── DataGeneration.tsx
│   │   │   └── Layout.tsx
│   │   ├── store/
│   │   │   └── useStore.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── InbuiltEntitiesDTDL/          # 150 ISA-95 JSON entity files
├── README.md
├── BACKEND_COMPLETE.md
├── PROJECT_SUMMARY.md
└── test-api.ps1
```

## 🎯 Features

### 1. Entity Browser UI ✅
- **Graph Visualization**: React Flow-based interactive graph showing entity relationships
- **Entity Sidebar**: Searchable list of all 150+ entities
- **Property Tooltips**: Click info icon on any node to see:
  - All attributes with types and constraints
  - Primary key indicators
  - Enum values
  - Min/max ranges
  - Relationship list with cardinality
- **Entity Details Panel**: Tabbed view showing attributes and relationships
- **Search**: Filter entities by name, display name, or description

### 2. Primary Key Rule Builder UI ✅
- **Entity Selection**: 
  - Select individual entities
  - Apply to all entities at once
- **Field Configuration**:
  - Single or composite primary keys
  - Select from `canBePrimaryKey` fields
- **Format Templates**:
  - Custom templates: `{FieldName}-{Seq:0000}`
  - Prefix, suffix, separator options
  - Sequence configuration with padding
- **Live Preview**: See generated PK format before applying
- **Rule Management**: View and delete existing PK rules

### 3. Field Rule Editor UI ✅
- **Rule Types**:
  - **Range**: Min/max numeric values
  - **Examples**: List of values to pick from
  - **Pattern**: Regex pattern for generation
  - **Static**: Fixed value for all instances
  - **Sequence**: Auto-incrementing numbers
- **Rule Management**: View and delete field rules by entity/field
- **Entity/Field Selection**: Dropdown with type information

### 4. Data Generation UI ✅
- **Configuration**:
  - Select root entity
  - Choose related entities to include
  - Set instance count (1-1000)
  - Random seed for deterministic generation
  - Max relationship depth (1-5)
- **Generation**:
  - Uses all defined PK and field rules
  - Maintains referential integrity
  - Prevents infinite recursion
  - Deterministic with seeding
- **Result Views**:
  - **JSON View**: Expandable tree viewer
  - **Table View**: Grid display of first 100 rows
  - **Mapping File**: SourceType → TargetType relationships
- **Download**: ZIP file with all JSON files + mapping.json

### 5. Mapping File UI ✅
- Embedded in Data Generation page (3rd tab)
- Shows source/target entity mappings
- Displays relationship names and cardinality
- Downloadable as part of ZIP

## 🔧 Technical Implementation

### Backend Services

#### MetadataLoaderService
- Parses ISA-95 JSON format: `columns` array + `dtdlSchema.contents`
- Extracts entity ID from DTMI format: `dtmi:digitaltwins:isa95:Equipment;1` → `Equipment`
- Handles enum values and constraints
- Thread-safe caching with `SemaphoreSlim`

#### TestDataGeneratorService
- **Deterministic Generation**: Uses `Random(seed ?? 42)`
- **Rule Application**: Field rules → PK rules → default generators
- **Relationship Handling**:
  - 1:1 → Generate single related instance
  - 1:N → Generate N children
  - N:1 → Reference existing parent
  - N:M → Generate/link through relationships
- **Cycle Prevention**: Visited set to avoid infinite loops
- **Referential Integrity**: Instance cache for reuse

#### PrimaryKeyRuleService
- Template parsing with regex: `{Seq:0000}` → `0001`, `0002`, ...
- Composite key concatenation
- Sequence counter management

#### FieldRuleService
- **Range**: `Random.Next(min, max)` or `Random.NextDouble()`
- **Examples**: Pick random from list
- **Pattern**: Regex-based generation (basic implementation)
- **Static**: Return fixed value
- **Sequence**: Increment counter

### Frontend Architecture

#### State Management
- **React Query**: Server state, caching, mutations
- **Zustand**: Client state for selected entities and rules
- **URL Routing**: React Router for navigation

#### Graph Visualization
- **React Flow**: Node-based graph rendering
- **Custom Nodes**: EntityNode component with Material UI
- **Radial Layout**: Root entity centered, related entities around it
- **Interactive**: Pan, zoom, drag nodes
- **Tooltips**: Popover with full entity details

#### Type Safety
- All TypeScript types mirror backend C# models
- Enums for Cardinality, RuleType, RelationshipDirection
- Discriminated unions for RuleParameters

## 📊 API Endpoints

### Entities
- `GET /api/entities` - Get all entities
- `GET /api/entities/{name}/structure` - Get entity details
- `GET /api/entities/{name}/related` - Get related entity names
- `GET /api/entities/{name}/graph?maxDepth=2` - Get relationship graph
- `POST /api/entities/reload` - Reload metadata from disk

### Primary Key Rules
- `POST /api/rules/primary-key` - Define PK rule
- `GET /api/rules/primary-key/{entity}` - Get PK rule for entity
- `GET /api/rules/primary-key` - Get all PK rules
- `DELETE /api/rules/primary-key/{entity}` - Delete PK rule
- `DELETE /api/rules/primary-key` - Clear all PK rules

### Field Rules
- `POST /api/rules/field` - Define field rule
- `GET /api/rules/field/{entity}` - Get field rules for entity
- `GET /api/rules/field` - Get all field rules
- `DELETE /api/rules/field/{entity}/{field}` - Delete field rule
- `DELETE /api/rules/field` - Clear all field rules

### Data Generation
- `POST /api/datageneration/generate-data` - Generate test data
- `POST /api/datageneration/generate-mapping` - Generate mapping file only
- `POST /api/datageneration/download` - Download ZIP

## 🧪 Testing

### Backend Testing
```powershell
# Run PowerShell test script
.\test-api.ps1
```

Tests:
1. Get all entities
2. Get Equipment structure
3. Create PK rule
4. Create field rule
5. Generate test data
6. Get entity graph

### Frontend Manual Testing
1. Open http://localhost:5173
2. Navigate to Entity Browser → select Equipment
3. View graph and click info icon on nodes
4. Go to PK Rules → create rule for Equipment
5. Go to Field Rules → add rules for fields
6. Go to Generate Data → generate 10 Equipment instances
7. View in JSON/Table/Mapping tabs
8. Download ZIP

## 🎨 UI Features

### Entity Browser
- **Sidebar**: Fixed 300px width, scrollable entity list
- **Graph**: Full-size canvas with React Flow controls
- **Details Panel**: 300px height at bottom, tabbed view
- **Search**: Real-time filtering of entity list
- **Node Tooltips**: Popover with table of properties

### Rule Builders
- **Left Panel**: 2/3 width for configuration
- **Right Panel**: 1/3 width for existing rules list
- **Preview**: Live preview of generated values
- **Validation**: Disable buttons until form is valid

### Data Generation
- **Left Panel**: 1/3 width for configuration
- **Right Panel**: 2/3 width for results
- **Tabs**: JSON / Table / Mapping views
- **Loading States**: CircularProgress during generation
- **Error Handling**: Alert components for errors

## 🔒 Data Integrity

- **Deterministic**: Same seed always produces same data
- **Referential Integrity**: Foreign keys reference existing instances
- **No Orphans**: All relationships properly maintained
- **Cycle Prevention**: Max depth and visited set prevent infinite loops
- **Rule Validation**: Backend validates all rules before application

## 📝 Configuration

### Backend (Program.cs)
```csharp
// Metadata path (relative to API project)
var metadataPath = "../../InbuiltEntitiesDTDL";

// CORS for frontend
builder.Services.AddCors(options => {
    options.AddPolicy("AllowFrontend", policy => {
        policy.WithOrigins("http://localhost:3000", "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});
```

### Frontend (api/client.ts)
```typescript
const API_BASE_URL = 'http://localhost:5000/api';
```

## 🚦 Status

### ✅ Completed
- Backend: Domain models, services, controllers
- Backend: All 18 API endpoints
- Backend: Metadata loading from 150 JSON files
- Backend: Deterministic data generation
- Backend: Rule management (PK + Field)
- Backend: Mapping file generation
- Backend: ZIP download
- Frontend: React + TypeScript + Vite setup
- Frontend: API client with React Query
- Frontend: Zustand store
- Frontend: Entity Browser with React Flow graph
- Frontend: Primary Key Rule Builder
- Frontend: Field Rule Editor
- Frontend: Data Generation UI
- Frontend: Mapping File preview
- Frontend: App layout and routing
- Documentation: README, BACKEND_COMPLETE, FRONTEND_README
- Testing: PowerShell test script

### 📦 Deliverables
1. ✅ .NET 9 Web API solution
2. ✅ All domain models
3. ✅ All service interfaces and implementations
4. ✅ All API controllers
5. ✅ React frontend with all UI components
6. ✅ Graph visualization
7. ✅ Rule builders
8. ✅ Data generation UI
9. ✅ Comprehensive documentation
10. ✅ Test scripts

## 🎯 Usage Workflow

1. **Start Backend**
   ```powershell
   cd ISA95DataGenerator.API
   dotnet run
   ```

2. **Start Frontend**
   ```powershell
   cd frontend
   npm run dev
   ```

3. **Browse Entities**
   - Open http://localhost:5173
   - Navigate to "Entity Browser"
   - Select an entity to see its graph
   - Click info icons to see property details

4. **Define PK Rules**
   - Navigate to "PK Rules"
   - Select entity (or apply to all)
   - Configure format template
   - Save rule

5. **Define Field Rules**
   - Navigate to "Field Rules"
   - Select entity and field
   - Choose rule type and configure
   - Save rule

6. **Generate Data**
   - Navigate to "Generate Data"
   - Select root entity
   - Choose related entities
   - Set instance count and seed
   - Click "Generate Data"
   - View results in JSON/Table/Mapping
   - Download ZIP

## 🎉 Success Metrics

- ✅ 150 ISA-95 entities loaded successfully
- ✅ Graph visualization renders all relationships
- ✅ PK rules support templates and sequences
- ✅ 5 field rule types implemented
- ✅ Deterministic generation with seeding
- ✅ Referential integrity maintained
- ✅ ZIP download includes all files
- ✅ Full TypeScript type safety
- ✅ Responsive Material UI design
- ✅ Clean Architecture maintained

## 🔮 Future Enhancements

- Export/import rule sets as JSON
- Bulk rule application wizard
- Advanced regex generation (RandExp library)
- Data validation against constraints
- Custom relationship traversal strategies
- Graph layout customization
- Dark mode theme
- Entity comparison view
- Rule templates library
- Undo/redo for rule changes

---

**Version**: 1.0.0
**Created**: December 2025
**Stack**: .NET 9 + React 18 + TypeScript + Vite + Material UI + React Flow
