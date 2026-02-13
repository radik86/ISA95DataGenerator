# ISA-95 Data Generator - Backend Migration Plan

**Document Version:** 1.0  
**Date:** February 13, 2026  
**Status:** Planning Phase  
**Author:** Development Team

---

## 📋 Executive Summary

### Current Problem
The ISA-95 Data Generator application experiences critical browser memory issues:
- **Browser crashes at 97%** during large data migrations
- **Memory limit: 2GB** (browser constraint)
- **Poor performance** with 1000+ process data records
- **No data persistence** between sessions
- **Limited scalability** for enterprise use cases

### Solution Overview
Migrate from browser-based IndexedDB storage to enterprise-grade SQL Server LocalDB backend with RESTful API layer.

### Expected Benefits
- ✅ **Eliminate browser crashes** - Move computation to server
- ✅ **Unlimited data capacity** - Database handles millions of records
- ✅ **10x faster performance** - Server-side batch processing
- ✅ **Data persistence** - Survives browser refresh/restart
- ✅ **Multi-user ready** - Foundation for future cloud deployment
- ✅ **Better UX** - Progressive loading, no freezing

---

## 🏗️ Architecture Transformation

### Current Architecture (IndexedDB)
```
┌─────────────────────────────────────────┐
│         Browser (React SPA)             │
│  ┌───────────────────────────────────┐  │
│  │  React Components                 │  │
│  │  - MasterDataManager             │  │
│  │  - ProcessDataGenerator          │  │
│  │  - DataMigration                 │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │  IndexedDB Service Layer          │  │
│  │  - masterDataDB.ts                │  │
│  │  - All logic in browser           │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │  IndexedDB (Browser Storage)      │  │
│  │  - 2GB memory limit               │  │
│  │  - Lost on browser close          │  │
│  │  - Single user only               │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘

Problems:
❌ All data in browser memory (crashes at 2GB)
❌ Heavy computation freezes UI
❌ Data lost between sessions
❌ No concurrent users
❌ Can't handle large datasets
```

### Target Architecture (SQL Server Backend)
```
┌─────────────────────────────────────────┐
│         Browser (React SPA)             │
│  ┌───────────────────────────────────┐  │
│  │  React Components                 │  │
│  │  - Display & User Input Only      │  │
│  │  - Virtual Scrolling              │  │
│  │  - Progressive Loading            │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │  API Client Layer (Axios)         │  │
│  │  - masterDataApi.ts               │  │
│  │  - processDataApi.ts              │  │
│  │  - Thin wrapper, no logic         │  │
│  └───────────┬───────────────────────┘  │
└──────────────┼───────────────────────────┘
               │ HTTP/REST
               │ (localhost:5237)
┌──────────────▼───────────────────────────┐
│      .NET 9 Backend API                  │
│  ┌───────────────────────────────────┐   │
│  │  Controllers (RESTful)            │   │
│  │  - MasterDataController           │   │
│  │  - ProcessDataController          │   │
│  │  - DataMigrationController        │   │
│  └───────────┬───────────────────────┘   │
│              │                            │
│  ┌───────────▼───────────────────────┐   │
│  │  Application Services             │   │
│  │  - Data Generation Service        │   │
│  │  - CSV Export Service             │   │
│  │  - Batch Processing               │   │
│  └───────────┬───────────────────────┘   │
│              │                            │
│  ┌───────────▼───────────────────────┐   │
│  │  Entity Framework Core 9          │   │
│  │  - Compiled Queries               │   │
│  │  - Bulk Operations                │   │
│  │  - AsNoTracking for reads         │   │
│  └───────────┬───────────────────────┘   │
└──────────────┼────────────────────────────┘
               │
┌──────────────▼────────────────────────────┐
│  SQL Server LocalDB                       │
│  - 37 Tables (Master + Process Data)      │
│  - Indexed for performance                │
│  - Persists to disk                       │
│  - Handles millions of records            │
└───────────────────────────────────────────┘

Benefits:
✅ Data in database (no browser memory issues)
✅ Backend does heavy computation
✅ Data persists across sessions
✅ Supports multiple users
✅ Scales to millions of records
```

---

## 📊 Migration Phases

### Phase 1: Foundation Setup (Week 1) ⚡ CRITICAL PATH

#### 1.1 Backend Database Infrastructure
**Status:** ✅ COMPLETE
- [x] SQL Server LocalDB installed
- [x] Entity Framework Core 9 configured
- [x] 37 database tables created
- [x] 4 migrations applied (Initial, ProcessData, DecimalPrecisions, MasterData)

**Database Schema:**
```
Master Data (25 tables):
├── MaterialClass, Material, MaterialLot, MaterialSublot
├── MaterialDefinitionProperty, MaterialDefinitionPropertyAssignment
├── EquipmentClass, Equipment, EquipmentProperty, EquipmentPropertyAssignment
├── EquipmentClassProperty, EquipmentClassPropertyAssignment
├── ProcessSegment, SegmentBOM, EquipmentUsage
├── Plant, ProductionLine, LineEquipment
├── Shift, Crew, ShiftCrewAssignment
├── OperationEventDefinition, OperationEventDefinitionProperty
├── OperationEventDefinitionPropertyAssignment, OperationEventDefSegmentAssignment
└── OperationsEventClass, HierarchyScope

Process Data (7 tables):
├── OperationsRequest, OperationsResponse
├── SegmentRequirement, SegmentResponse
├── SegmentMaterialRequirement, SegmentMaterialActual
└── SegmentEquipmentRequirement, SegmentEquipmentActual

Additional (5 tables):
├── OperationsEventRecord, OperationsEventEntry
├── OperationsEvent, OperationsEventProperty
└── SegmentData
```

#### 1.2 Backend API Development
**Status:** 🔄 IN PROGRESS

**Tasks:**
1. **Create Master Data APIs** (Priority: HIGH)
   ```
   File: src/ISA95DataGenerator.API/Controllers/MasterDataController.cs
   
   Endpoints to implement:
   - POST /api/masterdata/material-classes/bulk
   - POST /api/masterdata/materials/bulk
   - POST /api/masterdata/material-lots/bulk
   - POST /api/masterdata/equipment-classes/bulk
   - POST /api/masterdata/equipment/bulk
   - POST /api/masterdata/plants/bulk
   - POST /api/masterdata/production-lines/bulk
   - POST /api/masterdata/process-segments/bulk
   - POST /api/masterdata/shifts/bulk
   - POST /api/masterdata/crews/bulk
   
   All bulk endpoints should:
   - Accept List<Entity> in request body
   - Use AddRangeAsync() for batch insert
   - Return { count, data } in response
   - Include error handling with detailed messages
   ```

2. **Create Process Data APIs**
   ```
   File: src/ISA95DataGenerator.API/Controllers/ProcessDataController.cs
   
   Endpoints to implement:
   - POST /api/processdata/operations-requests/bulk
   - POST /api/processdata/operations-responses/bulk
   - POST /api/processdata/segment-requirements/bulk
   - POST /api/processdata/segment-responses/bulk
   - POST /api/processdata/segment-material-requirements/bulk
   - POST /api/processdata/segment-material-actuals/bulk
   - POST /api/processdata/segment-equipment-requirements/bulk
   - POST /api/processdata/segment-equipment-actuals/bulk
   ```

3. **Add Pagination Support**
   ```csharp
   // All GET endpoints should support pagination
   [HttpGet("materials")]
   public async Task<IActionResult> GetMaterials(
       [FromQuery] int page = 1,
       [FromQuery] int pageSize = 100,
       [FromQuery] string? filter = null,
       [FromQuery] string? sortBy = null)
   {
       var query = _context.Materials.AsQueryable();
       
       if (!string.IsNullOrEmpty(filter))
           query = query.Where(m => m.Name.Contains(filter));
       
       var total = await query.CountAsync();
       
       var data = await query
           .OrderBy(sortBy ?? "Name")
           .Skip((page - 1) * pageSize)
           .Take(pageSize)
           .AsNoTracking()  // Performance optimization
           .ToListAsync();
       
       return Ok(new { data, page, pageSize, total });
   }
   ```

4. **Add Summary Endpoints** (Quick stats without loading data)
   ```csharp
   [HttpGet("summary")]
   public async Task<IActionResult> GetSummary()
   {
       var summary = new
       {
           materialClasses = await _context.MaterialClasses.CountAsync(),
           materials = await _context.Materials.CountAsync(),
           materialLots = await _context.MaterialLots.CountAsync(),
           equipmentClasses = await _context.EquipmentClasses.CountAsync(),
           equipment = await _context.Equipment.CountAsync(),
           processSegments = await _context.ProcessSegments.CountAsync(),
           plants = await _context.Plants.CountAsync(),
           productionLines = await _context.ProductionLines.CountAsync(),
           shifts = await _context.Shifts.CountAsync(),
           crews = await _context.Crews.CountAsync()
       };
       return Ok(summary);
   }
   ```

**Implementation Code Template:**
```csharp
// File: src/ISA95DataGenerator.API/Controllers/MasterDataController.cs

[ApiController]
[Route("api/[controller]")]
public class MasterDataController : ControllerBase
{
    private readonly MigrationDbContext _context;
    private readonly ILogger<MasterDataController> _logger;

    public MasterDataController(
        MigrationDbContext context, 
        ILogger<MasterDataController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // Bulk Insert Pattern (repeat for each entity)
    [HttpPost("material-classes/bulk")]
    public async Task<IActionResult> CreateMaterialClassesBulk(
        [FromBody] List<MaterialClass> entities)
    {
        try
        {
            // Set timestamps
            foreach (var entity in entities)
            {
                entity.Id = entity.Id == Guid.Empty ? Guid.NewGuid() : entity.Id;
                entity.CreatedAt = DateTime.UtcNow;
                entity.UpdatedAt = DateTime.UtcNow;
            }

            await _context.MaterialClasses.AddRangeAsync(entities);
            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Bulk created {Count} material classes", 
                entities.Count);

            return Ok(new { count = entities.Count, data = entities });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error bulk creating material classes");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // Paginated Read Pattern
    [HttpGet("material-classes")]
    public async Task<IActionResult> GetMaterialClasses(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 100)
    {
        var total = await _context.MaterialClasses.CountAsync();
        var data = await _context.MaterialClasses
            .OrderBy(m => m.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync();

        return Ok(new { data, page, pageSize, total });
    }

    // Individual CRUD operations
    [HttpGet("material-classes/{id}")]
    public async Task<IActionResult> GetMaterialClass(Guid id)
    {
        var entity = await _context.MaterialClasses.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost("material-classes")]
    public async Task<IActionResult> CreateMaterialClass(
        [FromBody] MaterialClass entity)
    {
        entity.Id = Guid.NewGuid();
        entity.CreatedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        
        _context.MaterialClasses.Add(entity);
        await _context.SaveChangesAsync();
        
        return CreatedAtAction(
            nameof(GetMaterialClass), 
            new { id = entity.Id }, 
            entity);
    }

    [HttpPut("material-classes/{id}")]
    public async Task<IActionResult> UpdateMaterialClass(
        Guid id, 
        [FromBody] MaterialClass entity)
    {
        entity.Id = id;
        entity.UpdatedAt = DateTime.UtcNow;
        
        _context.Entry(entity).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        
        return Ok(entity);
    }

    [HttpDelete("material-classes/{id}")]
    public async Task<IActionResult> DeleteMaterialClass(Guid id)
    {
        var entity = await _context.MaterialClasses.FindAsync(id);
        if (entity == null) return NotFound();
        
        _context.MaterialClasses.Remove(entity);
        await _context.SaveChangesAsync();
        
        return NoContent();
    }

    // Clear all data endpoint
    [HttpDelete("clear/all")]
    public async Task<IActionResult> ClearAllMasterData()
    {
        _logger.LogWarning("Clearing all master data");
        
        // Order matters due to foreign keys
        _context.ShiftCrewAssignments.RemoveRange(
            _context.ShiftCrewAssignments);
        _context.LineEquipment.RemoveRange(_context.LineEquipment);
        _context.EquipmentUsages.RemoveRange(_context.EquipmentUsages);
        _context.SegmentBOMs.RemoveRange(_context.SegmentBOMs);
        _context.ProcessSegments.RemoveRange(_context.ProcessSegments);
        _context.ProductionLines.RemoveRange(_context.ProductionLines);
        _context.Equipment.RemoveRange(_context.Equipment);
        _context.EquipmentClasses.RemoveRange(_context.EquipmentClasses);
        _context.MaterialLots.RemoveRange(_context.MaterialLots);
        _context.Materials.RemoveRange(_context.Materials);
        _context.MaterialClasses.RemoveRange(_context.MaterialClasses);
        _context.Crews.RemoveRange(_context.Crews);
        _context.Shifts.RemoveRange(_context.Shifts);
        _context.Plants.RemoveRange(_context.Plants);
        
        await _context.SaveChangesAsync();
        
        return Ok(new { message = "All master data cleared" });
    }
}
```

**Testing Checklist:**
- [ ] Test bulk insert with 100 records
- [ ] Test bulk insert with 1000 records
- [ ] Test pagination with different page sizes
- [ ] Test sorting and filtering
- [ ] Verify no memory leaks on backend
- [ ] Test error handling with invalid data
- [ ] Verify response times < 500ms

---

### Phase 2: Frontend API Client Layer (Week 1-2)

#### 2.1 Create API Client Services
**Status:** 🔄 IN PROGRESS

**File Structure:**
```
frontend/src/api/
├── client.ts                  // Axios base configuration
├── masterDataApi.ts          // Master data operations
├── processDataApi.ts         // Process data operations
├── migrationApi.ts           // Data migration operations
└── index.ts                  // Export all APIs
```

**Implementation:**

**File: `frontend/src/api/client.ts`**
```typescript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5237/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] Response from ${response.config.url}:`, 
      response.data);
    return response;
  },
  (error) => {
    console.error('[API] Response error:', error.response?.data || error);
    return Promise.reject(error);
  }
);

export default apiClient;
```

**File: `frontend/src/api/masterDataApi.ts`**
```typescript
import { apiClient } from './client';

export interface MaterialClass {
  id?: string;
  name: string;
  description: string;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export const masterDataApi = {
  // Material Classes
  getAllMaterialClasses: (page = 1, pageSize = 100) =>
    apiClient.get<PaginatedResponse<MaterialClass>>(
      '/masterdata/material-classes',
      { params: { page, pageSize } }
    ),

  getMaterialClass: (id: string) =>
    apiClient.get<MaterialClass>(`/masterdata/material-classes/${id}`),

  createMaterialClass: (data: MaterialClass) =>
    apiClient.post<MaterialClass>('/masterdata/material-classes', data),

  createMaterialClassesBulk: (data: MaterialClass[]) =>
    apiClient.post('/masterdata/material-classes/bulk', data),

  updateMaterialClass: (id: string, data: MaterialClass) =>
    apiClient.put<MaterialClass>(`/masterdata/material-classes/${id}`, data),

  deleteMaterialClass: (id: string) =>
    apiClient.delete(`/masterdata/material-classes/${id}`),

  // Materials
  getAllMaterials: (page = 1, pageSize = 100) =>
    apiClient.get('/masterdata/materials', { params: { page, pageSize } }),

  createMaterialsBulk: (data: any[]) =>
    apiClient.post('/masterdata/materials/bulk', data),

  // Material Lots
  getAllMaterialLots: (page = 1, pageSize = 100) =>
    apiClient.get('/masterdata/material-lots', { params: { page, pageSize } }),

  createMaterialLotsBulk: (data: any[]) =>
    apiClient.post('/masterdata/material-lots/bulk', data),

  // Equipment Classes
  getAllEquipmentClasses: (page = 1, pageSize = 100) =>
    apiClient.get('/masterdata/equipment-classes', 
      { params: { page, pageSize } }),

  createEquipmentClassesBulk: (data: any[]) =>
    apiClient.post('/masterdata/equipment-classes/bulk', data),

  // Equipment
  getAllEquipment: (page = 1, pageSize = 100) =>
    apiClient.get('/masterdata/equipment', { params: { page, pageSize } }),

  createEquipmentBulk: (data: any[]) =>
    apiClient.post('/masterdata/equipment/bulk', data),

  // Process Segments
  getAllProcessSegments: (page = 1, pageSize = 100) =>
    apiClient.get('/masterdata/process-segments', 
      { params: { page, pageSize } }),

  createProcessSegmentsBulk: (data: any[]) =>
    apiClient.post('/masterdata/process-segments/bulk', data),

  // Plants
  getAllPlants: (page = 1, pageSize = 100) =>
    apiClient.get('/masterdata/plants', { params: { page, pageSize } }),

  createPlantsBulk: (data: any[]) =>
    apiClient.post('/masterdata/plants/bulk', data),

  // Production Lines
  getAllProductionLines: (page = 1, pageSize = 100) =>
    apiClient.get('/masterdata/production-lines', 
      { params: { page, pageSize } }),

  createProductionLinesBulk: (data: any[]) =>
    apiClient.post('/masterdata/production-lines/bulk', data),

  // Shifts
  getAllShifts: (page = 1, pageSize = 100) =>
    apiClient.get('/masterdata/shifts', { params: { page, pageSize } }),

  createShiftsBulk: (data: any[]) =>
    apiClient.post('/masterdata/shifts/bulk', data),

  // Crews
  getAllCrews: (page = 1, pageSize = 100) =>
    apiClient.get('/masterdata/crews', { params: { page, pageSize } }),

  createCrewsBulk: (data: any[]) =>
    apiClient.post('/masterdata/crews/bulk', data),

  // Summary
  getSummary: () =>
    apiClient.get('/masterdata/summary'),

  // Clear all
  clearAll: () =>
    apiClient.delete('/masterdata/clear/all'),

  // Alias for compatibility
  clearAllMasterData: () =>
    apiClient.delete('/masterdata/clear/all'),
};
```

**File: `frontend/src/api/processDataApi.ts`**
```typescript
import { apiClient } from './client';

export const processDataApi = {
  // Operations Requests
  getAllOperationsRequests: (page = 1, pageSize = 100) =>
    apiClient.get('/processdata/operations-requests', 
      { params: { page, pageSize } }),

  createOperationsRequestsBulk: (data: any[]) =>
    apiClient.post('/processdata/operations-requests/bulk', data),

  // Operations Responses
  getAllOperationsResponses: (page = 1, pageSize = 100) =>
    apiClient.get('/processdata/operations-responses', 
      { params: { page, pageSize } }),

  createOperationsResponsesBulk: (data: any[]) =>
    apiClient.post('/processdata/operations-responses/bulk', data),

  // Segment Requirements
  getAllSegmentRequirements: (page = 1, pageSize = 100) =>
    apiClient.get('/processdata/segment-requirements', 
      { params: { page, pageSize } }),

  createSegmentRequirementsBulk: (data: any[]) =>
    apiClient.post('/processdata/segment-requirements/bulk', data),

  // Segment Responses
  getAllSegmentResponses: (
    page = 1, 
    pageSize = 100, 
    operationsResponseId?: string
  ) =>
    apiClient.get('/processdata/segment-responses', {
      params: { page, pageSize, operationsResponseId },
    }),

  createSegmentResponsesBulk: (data: any[]) =>
    apiClient.post('/processdata/segment-responses/bulk', data),

  // Material Actuals
  getAllSegmentMaterialActuals: (
    page = 1, 
    pageSize = 100,
    segmentResponseId?: string
  ) =>
    apiClient.get('/processdata/segment-material-actuals', {
      params: { page, pageSize, segmentResponseId },
    }),

  createSegmentMaterialActualsBulk: (data: any[]) =>
    apiClient.post('/processdata/segment-material-actuals/bulk', data),

  // Equipment Actuals
  getAllSegmentEquipmentActuals: (
    page = 1, 
    pageSize = 100,
    segmentResponseId?: string
  ) =>
    apiClient.get('/processdata/segment-equipment-actuals', {
      params: { page, pageSize, segmentResponseId },
    }),

  createSegmentEquipmentActualsBulk: (data: any[]) =>
    apiClient.post('/processdata/segment-equipment-actuals/bulk', data),

  // Summary
  getSummary: () =>
    apiClient.get('/processdata/summary'),

  // Clear all
  clearAll: () =>
    apiClient.delete('/processdata/clear/all'),
};
```

**Testing Checklist:**
- [ ] Test API client connection to backend
- [ ] Verify error handling for network failures
- [ ] Test timeout scenarios
- [ ] Verify request/response interceptors
- [ ] Test with backend running and stopped

---

### Phase 3: Component Migration (Week 2-3)

#### 3.1 Master Data Manager Migration
**File:** `frontend/src/components/MasterDataManager.tsx`

**Migration Strategy:**
```typescript
// OLD CODE (IndexedDB)
import { masterDataDB } from '../services/masterDataDB';

async function loadAllData() {
  const classes = await masterDataDB.getAll('materialClasses');
  setMaterialClasses(classes);
}

async function handleSave(data) {
  await masterDataDB.add('materialClasses', data);
}

// NEW CODE (Backend API)
import { masterDataApi } from '../api/client';

async function loadAllData() {
  const response = await masterDataApi.getAllMaterialClasses();
  setMaterialClasses(response.data.data); // Paginated response
}

async function handleSave(data) {
  if (data.id) {
    await masterDataApi.updateMaterialClass(data.id, data);
  } else {
    await masterDataApi.createMaterialClass(data);
  }
}
```

**Components to Migrate (Priority Order):**
1. ✅ **MasterDataManager** (Week 2)
   - Replace all `masterDataDB` calls with `masterDataApi`
   - Implement pagination for tables
   - Add loading states
   - Handle API errors gracefully

2. ✅ **TemplateLoader** (Week 2)
   - Load CSV templates
   - Use bulk insert APIs
   - Show progress bar during upload

3. 🔄 **ProcessDataGenerator** (Week 3)
   - Load master data from backend
   - Generate data in batches
   - Use backend bulk insert APIs
   - Show real-time progress

4. ⏳ **DataMigration** (Week 4)
   - Keep mapping configuration
   - Send data to backend for processing
   - Stream results from backend

**Implementation Pattern:**
```typescript
// Add loading states
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// Wrap API calls with error handling
async function loadData() {
  setLoading(true);
  setError(null);
  
  try {
    const response = await masterDataApi.getAllMaterialClasses();
    setMaterialClasses(response.data.data);
  } catch (err) {
    setError(err.message);
    console.error('Failed to load data:', err);
  } finally {
    setLoading(false);
  }
}

// Add retry logic for failed requests
async function retryableSave(data: any, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await masterDataApi.createMaterialClass(data);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

---

### Phase 4: Backend Data Generation (Week 3-4) 🚀 CRITICAL

**This is the key to eliminating browser crashes!**

#### 4.1 Backend Generation Service
**File:** `src/ISA95DataGenerator.Application/Services/ProcessDataGenerationService.cs`

```csharp
public class ProcessDataGenerationService
{
    private readonly MigrationDbContext _context;
    private readonly ILogger<ProcessDataGenerationService> _logger;
    private readonly Random _random;

    public async Task<GenerationResult> GenerateProcessDataAsync(
        GenerationRequest request,
        IProgress<int> progress,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "Starting generation of {Count} operations responses", 
            request.OperationsResponseCount);

        var result = new GenerationResult();
        const int BATCH_SIZE = 500; // Generate 500 at a time
        int totalBatches = (int)Math.Ceiling(
            (double)request.OperationsResponseCount / BATCH_SIZE);

        for (int batchIndex = 0; batchIndex < totalBatches; batchIndex++)
        {
            if (cancellationToken.IsCancellationRequested)
                break;

            int batchSize = Math.Min(
                BATCH_SIZE, 
                request.OperationsResponseCount - (batchIndex * BATCH_SIZE));

            // Generate batch
            var batch = GenerateBatch(request, batchSize);

            // Save to database
            await _context.OperationsResponses.AddRangeAsync(
                batch.OperationsResponses, cancellationToken);
            await _context.SegmentResponses.AddRangeAsync(
                batch.SegmentResponses, cancellationToken);
            await _context.SegmentMaterialActuals.AddRangeAsync(
                batch.MaterialActuals, cancellationToken);
            await _context.SegmentEquipmentActuals.AddRangeAsync(
                batch.EquipmentActuals, cancellationToken);

            await _context.SaveChangesAsync(cancellationToken);

            // IMPORTANT: Clear change tracker to free memory
            _context.ChangeTracker.Clear();

            // Report progress
            int progressPercent = ((batchIndex + 1) * 100) / totalBatches;
            progress?.Report(progressPercent);

            _logger.LogInformation(
                "Completed batch {Current}/{Total} ({Percent}%)",
                batchIndex + 1, totalBatches, progressPercent);

            result.TotalGenerated += batchSize;
        }

        return result;
    }

    private GenerationBatch GenerateBatch(
        GenerationRequest request, 
        int count)
    {
        // Same generation logic as frontend, but in C#
        var batch = new GenerationBatch();

        for (int i = 0; i < count; i++)
        {
            var opsResponse = GenerateOperationsResponse(request);
            batch.OperationsResponses.Add(opsResponse);

            foreach (var segmentReq in request.SegmentRequirements)
            {
                var segmentResp = GenerateSegmentResponse(
                    opsResponse, segmentReq);
                batch.SegmentResponses.Add(segmentResp);

                // Generate material actuals
                var materialActuals = GenerateMaterialActuals(
                    segmentResp, segmentReq);
                batch.MaterialActuals.AddRange(materialActuals);

                // Generate equipment actuals
                var equipmentActuals = GenerateEquipmentActuals(
                    segmentResp, segmentReq);
                batch.EquipmentActuals.AddRange(equipmentActuals);
            }
        }

        return batch;
    }
}
```

**Frontend Progress Component:**
```typescript
// Use SignalR for real-time progress updates
import * as signalR from '@microsoft/signalr';

const connection = new signalR.HubConnectionBuilder()
  .withUrl('http://localhost:5237/generationHub')
  .build();

connection.on('GenerationProgress', (progress: number) => {
  setProgress(progress);
  console.log(`Generation progress: ${progress}%`);
});

async function startGeneration(request: GenerationRequest) {
  await connection.start();
  await apiClient.post('/processdata/generate', request);
}
```

---

### Phase 5: CSV Export Optimization (Week 4)

#### 5.1 Backend Streaming CSV Export
**File:** `src/ISA95DataGenerator.API/Controllers/ExportController.cs`

```csharp
[HttpGet("export/operations-responses")]
public async Task<IActionResult> ExportOperationsResponses()
{
    var stream = new MemoryStream();
    var writer = new StreamWriter(stream);
    var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

    // Write header
    csv.WriteHeader<OperationsResponse>();
    await csv.NextRecordAsync();

    // Stream data in chunks - never load all into memory
    await foreach (var entity in _context.OperationsResponses
        .AsNoTracking()
        .AsAsyncEnumerable())
    {
        csv.WriteRecord(entity);
        await csv.NextRecordAsync();
    }

    await writer.FlushAsync();
    stream.Position = 0;

    var fileName = $"operations_responses_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
    return File(stream, "text/csv", fileName);
}

// Export all related data as ZIP
[HttpGet("export/full-dataset")]
public async Task<IActionResult> ExportFullDataset()
{
    var memoryStream = new MemoryStream();
    using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, true))
    {
        // Add each entity type as separate CSV file
        await AddEntityToZip(archive, "operations_responses.csv", 
            _context.OperationsResponses);
        await AddEntityToZip(archive, "segment_responses.csv", 
            _context.SegmentResponses);
        await AddEntityToZip(archive, "material_actuals.csv", 
            _context.SegmentMaterialActuals);
        await AddEntityToZip(archive, "equipment_actuals.csv", 
            _context.SegmentEquipmentActuals);
    }

    memoryStream.Position = 0;
    return File(memoryStream, "application/zip", 
        $"full_dataset_{DateTime.UtcNow:yyyyMMdd_HHmmss}.zip");
}
```

---

### Phase 6: Performance Optimization (Week 5-6)

#### 6.1 Database Indexing
**File:** `src/ISA95DataGenerator.Infrastructure/Data/MigrationDbContext.cs`

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    base.OnModelCreating(modelBuilder);

    // Add indexes for frequently queried fields
    modelBuilder.Entity<OperationsResponse>()
        .HasIndex(x => x.StartTime)
        .HasDatabaseName("IX_OperationsResponse_StartTime");

    modelBuilder.Entity<SegmentResponse>()
        .HasIndex(x => x.OperationsResponseId)
        .HasDatabaseName("IX_SegmentResponse_OperationsResponseId");

    modelBuilder.Entity<SegmentMaterialActual>()
        .HasIndex(x => x.SegmentResponseId)
        .HasDatabaseName("IX_SegmentMaterialActual_SegmentResponseId");

    modelBuilder.Entity<SegmentMaterialActual>()
        .HasIndex(x => x.MaterialId)
        .HasDatabaseName("IX_SegmentMaterialActual_MaterialId");

    // Composite index for common query patterns
    modelBuilder.Entity<OperationsResponse>()
        .HasIndex(x => new { x.PlantId, x.StartTime })
        .HasDatabaseName("IX_OperationsResponse_PlantId_StartTime");
}
```

**Create Migration:**
```bash
cd src/ISA95DataGenerator.Infrastructure
dotnet ef migrations add AddPerformanceIndexes -s ../ISA95DataGenerator.API/ISA95DataGenerator.API.csproj
```

#### 6.2 Compiled Queries
```csharp
// File: src/ISA95DataGenerator.Infrastructure/Data/CompiledQueries.cs

public static class CompiledQueries
{
    // Compiled query - executes faster on repeated calls
    public static readonly Func<MigrationDbContext, string, IAsyncEnumerable<Material>>
        GetMaterialsByClass = EF.CompileAsyncQuery(
            (MigrationDbContext context, string classId) =>
                context.Materials
                    .Where(m => m.ClassId == Guid.Parse(classId))
                    .AsNoTracking()
        );

    public static readonly Func<MigrationDbContext, Guid, IAsyncEnumerable<SegmentResponse>>
        GetSegmentResponsesByOperationsResponse = EF.CompileAsyncQuery(
            (MigrationDbContext context, Guid operationsResponseId) =>
                context.SegmentResponses
                    .Where(sr => sr.OperationsResponseId == operationsResponseId)
                    .AsNoTracking()
        );
}

// Usage in controller:
var materials = await CompiledQueries
    .GetMaterialsByClass(_context, classId)
    .ToListAsync();
```

#### 6.3 Output Caching (.NET 9 Feature)
```csharp
// File: src/ISA95DataGenerator.API/Program.cs

builder.Services.AddOutputCache(options =>
{
    // Default policy: 5 minutes
    options.AddBasePolicy(builder => 
        builder.Expire(TimeSpan.FromMinutes(5)));

    // Master data: 1 hour (changes infrequently)
    options.AddPolicy("MasterData", builder => 
        builder.Expire(TimeSpan.FromHours(1)));

    // Summary data: 30 seconds
    options.AddPolicy("Summary", builder => 
        builder.Expire(TimeSpan.FromSeconds(30)));
});

app.UseOutputCache();

// Apply to controllers:
[HttpGet("material-classes")]
[OutputCache(PolicyName = "MasterData")]
public async Task<IActionResult> GetMaterialClasses() { }

[HttpGet("summary")]
[OutputCache(PolicyName = "Summary")]
public async Task<IActionResult> GetSummary() { }
```

---

## 🧪 Testing Strategy

### Unit Tests
```csharp
// File: tests/ISA95DataGenerator.Tests/Services/ProcessDataGenerationServiceTests.cs

[Fact]
public async Task GenerateProcessData_Should_CreateRecordsInBatches()
{
    // Arrange
    var options = new DbContextOptionsBuilder<MigrationDbContext>()
        .UseInMemoryDatabase(databaseName: "TestDb")
        .Options;
    var context = new MigrationDbContext(options);
    var service = new ProcessDataGenerationService(context, logger);

    var request = new GenerationRequest
    {
        OperationsResponseCount = 1500, // > 1 batch
        // ... other properties
    };

    // Act
    var result = await service.GenerateProcessDataAsync(
        request, null, CancellationToken.None);

    // Assert
    Assert.Equal(1500, result.TotalGenerated);
    var responses = await context.OperationsResponses.CountAsync();
    Assert.Equal(1500, responses);
}
```

### Integration Tests
```csharp
[Fact]
public async Task BulkInsert_Should_Handle_1000Records()
{
    // Arrange
    var entities = Enumerable.Range(1, 1000)
        .Select(i => new MaterialClass
        {
            Name = $"Class {i}",
            Description = $"Description {i}"
        })
        .ToList();

    // Act
    var response = await _client.PostAsJsonAsync(
        "/api/masterdata/material-classes/bulk", entities);

    // Assert
    response.EnsureSuccessStatusCode();
    var result = await response.Content.ReadFromJsonAsync<BulkResult>();
    Assert.Equal(1000, result.Count);
}
```

### Performance Tests
```csharp
[Fact]
public async Task Generation_Should_Complete_Within_30Seconds()
{
    var stopwatch = Stopwatch.StartNew();
    
    var request = new GenerationRequest
    {
        OperationsResponseCount = 1000
    };

    await _service.GenerateProcessDataAsync(request, null, CancellationToken.None);
    
    stopwatch.Stop();
    Assert.True(stopwatch.Elapsed.TotalSeconds < 30);
}
```

### Load Tests (k6)
```javascript
// File: tests/load-tests/bulk-insert.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 10, // 10 virtual users
  duration: '30s',
};

export default function() {
  const payload = JSON.stringify(
    Array.from({length: 100}, (_, i) => ({
      name: `Class ${i}`,
      description: `Description ${i}`
    }))
  );

  const response = http.post(
    'http://localhost:5237/api/masterdata/material-classes/bulk',
    payload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1s': (r) => r.timings.duration < 1000,
  });
}
```

---

## 📈 Success Metrics

### Performance Benchmarks
| Metric | Current (IndexedDB) | Target (Backend) | Status |
|--------|---------------------|------------------|--------|
| Master data load | 2-5 seconds | < 500ms | ⏳ |
| Process data page (100 records) | N/A (all in memory) | < 200ms | ⏳ |
| Generate 1000 responses | 30 seconds + crash | < 30 seconds | ⏳ |
| CSV export (10k records) | Crashes | < 5 seconds | ⏳ |
| Browser memory usage | 2GB+ (crashes) | < 200MB | ⏳ |
| Data persistence | Lost on close | ✅ Persisted | ⏳ |
| Concurrent users | 1 | Unlimited | ⏳ |

### Key Performance Indicators (KPIs)
- ✅ **Zero browser crashes** during data generation
- ✅ **10x improvement** in data load times
- ✅ **99.9% uptime** for backend API
- ✅ **< 1 second** response time for paginated queries
- ✅ **Handles 100k+ records** without performance degradation

---

## 🔄 Rollback Plan

### If Migration Fails
1. **Keep IndexedDB code** in separate branch
2. **Feature flag** to toggle between IndexedDB and Backend
3. **Quick rollback** via Git merge

```typescript
// Feature flag implementation
const USE_BACKEND_STORAGE = process.env.REACT_APP_USE_BACKEND === 'true';

async function getData() {
  if (USE_BACKEND_STORAGE) {
    return await masterDataApi.getAllMaterials();
  } else {
    return await masterDataDB.getAll('materials');
  }
}
```

### Backup Strategy
- **Daily database backups** using SQL Server backup
- **Export current IndexedDB data** before migration
- **Keep CSV templates** as fallback data source

---

## 📅 Implementation Timeline

### Week 1: Foundation
- [x] Database schema (COMPLETE)
- [ ] Backend API development
- [ ] Frontend API client layer
- [ ] Basic CRUD operations working

### Week 2: Core Migration
- [ ] Migrate MasterDataManager component
- [ ] Migrate TemplateLoader service
- [ ] Template data loading to backend
- [ ] Basic pagination implemented

### Week 3: Data Generation
- [ ] Backend generation service
- [ ] Batch processing implementation
- [ ] SignalR progress updates
- [ ] ProcessDataGenerator migration

### Week 4: Export & Polish
- [ ] Backend CSV export
- [ ] Virtual scrolling on frontend
- [ ] Server-side filtering/sorting
- [ ] Remove IndexedDB code

### Week 5-6: Optimization
- [ ] Database indexing
- [ ] Output caching
- [ ] Compiled queries
- [ ] Load testing
- [ ] Performance tuning

---

## 🎯 Next Immediate Actions

### Sprint 1 Tasks (This Week)
1. **Complete Backend APIs** (2-3 days)
   - Implement all bulk insert endpoints
   - Add pagination to GET endpoints
   - Test with Swagger

2. **Frontend API Client** (1 day)
   - Create client.ts, masterDataApi.ts, processDataApi.ts
   - Test connectivity
   - Add error handling

3. **Migrate MasterDataManager** (1-2 days)
   - Replace IndexedDB calls with API calls
   - Add loading states
   - Test full CRUD operations

4. **Load Template Data** (1 day)
   - Update templateLoader.ts
   - Test bulk import
   - Verify data in SQL Server

### Definition of Done
- ✅ Backend API accepts CSV template data
- ✅ MasterDataManager displays data from backend
- ✅ Can create/edit/delete master data via backend
- ✅ Template reset clears backend and reloads
- ✅ No IndexedDB calls in MasterDataManager
- ✅ All tests passing

---

## 📝 Migration Checklist

### Infrastructure
- [x] SQL Server LocalDB installed
- [x] EF Core migrations created
- [x] Database tables exist
- [ ] Backend API running on localhost:5237
- [ ] CORS configured for frontend
- [ ] Logging configured

### Backend APIs
- [ ] Master Data CRUD (25 entities)
- [ ] Process Data CRUD (7 entities)
- [ ] Bulk insert endpoints
- [ ] Pagination implemented
- [ ] Summary/statistics endpoints
- [ ] Error handling
- [ ] API documentation (Swagger)

### Frontend
- [ ] API client layer created
- [ ] Error handling with retry logic
- [ ] Loading states on all components
- [ ] Pagination UI components
- [ ] Virtual scrolling for large lists

### Components Migrated
- [ ] MasterDataManager (70% complete)
- [ ] TemplateLoader (100% complete)
- [ ] ProcessDataGenerator (0%)
- [ ] DataMigration (0%)

### Testing
- [ ] Unit tests for services
- [ ] Integration tests for APIs
- [ ] Load tests with k6
- [ ] Performance benchmarking
- [ ] Memory profiling

### Documentation
- [x] Migration plan documented
- [ ] API documentation
- [ ] Deployment guide
- [ ] User migration guide

---

## 📚 References

### Technical Documentation
- [EF Core Performance](https://learn.microsoft.com/en-us/ef/core/performance/)
- [ASP.NET Core Output Caching](https://learn.microsoft.com/en-us/aspnet/core/performance/caching/output)
- [SignalR Real-time Communication](https://learn.microsoft.com/en-us/aspnet/core/signalr/)
- [React Virtual Scrolling](https://react-window.vercel.app/)

### Project Files
- Database Schema: `src/ISA95DataGenerator.Domain/Entities/`
- Migrations: `src/ISA95DataGenerator.Infrastructure/Migrations/`
- Configuration Export: `all_mappings_2026-02-13.json` (119 mappings)

---

## ✅ Sign-off

**Approved by:** _________________  
**Date:** _________________  
**Next Review:** Week of February 20, 2026

---

*Document maintained by: Development Team*  
*Last updated: February 13, 2026*
