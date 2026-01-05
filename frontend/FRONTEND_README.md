# ISA-95 Test Data Generator - Frontend

React + TypeScript + Vite frontend for the ISA-95 Test Data Generator.

## Features

### 1. Entity Browser
- **Interactive Graph Visualization** using React Flow
- Navigate and search through entity relationships
- Click on node info icon to see detailed property table
- Sidebar showing all entities with search
- Entity details panel with attributes and relationships tabs

### 2. Primary Key Rule Builder
- Select single or multiple entities
- Apply PK rules to all entities at once
- Configure composite keys
- Define format templates with placeholders (`{Field}-{Seq:0000}`)
- Live preview of generated primary keys
- Manage existing PK rules

### 3. Field Rule Editor
- Select entity and field
- Choose from 5 rule types:
  - **Range**: Numeric/datetime min-max ranges
  - **Examples**: List of example values to pick from
  - **Pattern**: Regex pattern for value generation
  - **Static**: Fixed value for all instances
  - **Sequence**: Auto-incrementing values
- View and manage all field rules

### 4. Data Generation
- Select root entity and related entities to include
- Configure instance count, random seed, max depth
- Generate deterministic test data
- View results in:
  - JSON viewer with expandable tree
  - Table grid for quick browsing
  - Mapping file preview
- Download ZIP with all generated files

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** - Fast build tool
- **Material UI** - UI component library
- **React Router** - Navigation
- **React Query** - Server state management
- **Zustand** - Client state management
- **React Flow** - Graph visualization
- **Axios** - HTTP client
- **react-json-view-lite** - JSON viewer

## Getting Started

### Prerequisites
- Node.js 18+
- Backend API running on `http://localhost:5000`

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The production build will be in the `dist/` folder.

## Project Structure

```
frontend/
├── src/
│   ├── api/               # API client and React Query hooks
│   │   ├── client.ts      # Axios configuration
│   │   └── hooks.ts       # React Query hooks
│   ├── components/        # React components
│   │   ├── EntityBrowser.tsx
│   │   ├── EntityGraph.tsx
│   │   ├── EntityNode.tsx
│   │   ├── EntityDetails.tsx
│   │   ├── PrimaryKeyRuleBuilder.tsx
│   │   ├── FieldRuleEditor.tsx
│   │   ├── DataGeneration.tsx
│   │   └── Layout.tsx
│   ├── store/            # Zustand state management
│   │   └── useStore.ts
│   ├── types/            # TypeScript type definitions
│   │   └── index.ts
│   ├── App.tsx           # Main app component with routing
│   └── main.tsx          # Entry point
├── package.json
└── vite.config.ts
```

## API Integration

The frontend connects to the backend API at `http://localhost:5000/api`.

### Endpoints Used

- `GET /api/entities` - Get all entities
- `GET /api/entities/{name}/structure` - Get entity details
- `GET /api/entities/{name}/graph` - Get relationship graph
- `GET /api/entities/{name}/related` - Get related entities
- `POST /api/rules/primary-key` - Define PK rule
- `GET /api/rules/primary-key` - Get all PK rules
- `DELETE /api/rules/primary-key/{entity}` - Delete PK rule
- `POST /api/rules/field` - Define field rule
- `GET /api/rules/field` - Get all field rules
- `DELETE /api/rules/field/{entity}/{field}` - Delete field rule
- `POST /api/datageneration/generate-data` - Generate test data
- `POST /api/datageneration/download` - Download ZIP

## Usage Guide

### 1. Browse Entities
1. Go to "Entity Browser"
2. Select an entity from the sidebar
3. View the relationship graph
4. Click the info icon on any node to see property details

### 2. Define Primary Key Rules
1. Go to "PK Rules"
2. Select entity (or check "Apply to all")
3. Choose PK fields
4. Configure format (template, prefix, suffix, sequence)
5. Preview the result
6. Click "Apply Rule"

### 3. Define Field Rules
1. Go to "Field Rules"
2. Select entity and field
3. Choose rule type
4. Configure parameters
5. Click "Apply Field Rule"

### 4. Generate Test Data
1. Go to "Generate Data"
2. Select root entity
3. Choose related entities to include
4. Set instance count and seed
5. Click "Generate Data"
6. View results in JSON/Table/Mapping tabs
7. Click "Download ZIP" to get all files

## Development Tips

- The app uses React Query for caching - data is cached for 30 seconds
- All API calls are typed with TypeScript
- State is managed with Zustand (rules) and React Query (server data)
- The graph layout is radial with the root entity in the center
- Seed value ensures deterministic data generation

## Troubleshooting

### Backend Connection Issues
- Ensure backend API is running on `http://localhost:5000`
- Check CORS is enabled on backend
- Verify `ISA95DataGenerator.API` project is running

### Graph Not Rendering
- Ensure React Flow CSS is imported
- Check browser console for errors
- Verify entity has relationships

### Rules Not Saving
- Check network tab for API errors
- Ensure backend rules services are working
- Verify entity/field names are correct
