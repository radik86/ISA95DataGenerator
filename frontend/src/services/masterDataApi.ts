/**
 * Master Data API Service
 * Replaces IndexedDB (masterDataDB) with SQL Server backend API calls
 */

const API_BASE_URL = 'http://localhost:5237/api';
const BULK_CONCURRENCY = 6;

async function runWithConcurrency<T>(tasks: Array<() => Promise<T>>, concurrency: number): Promise<T[]> {
  if (tasks.length === 0) return [];

  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const current = nextIndex++;
      if (current >= tasks.length) return;
      results[current] = await tasks[current]();
    }
  };

  const workerCount = Math.min(concurrency, tasks.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

function normalizeHierarchyScopeFlatForApi(record: any): any {
  if (!record || typeof record !== 'object') return record;

  return {
    ...record,
    enterprise: record.enterprise ?? record.Enterprise ?? '',
    site: record.site ?? record.Site ?? '',
    area: record.area ?? record.Area ?? '',
    workCenter: record.workCenter ?? record['Work Center'] ?? '',
    workUnit: record.workUnit ?? record['Work Unit'] ?? '',
    processCell: record.processCell ?? record['Process Cell'] ?? '',
    unit: record.unit ?? record.Unit ?? '',
    productionLine: record.productionLine ?? record['Production Line'] ?? '',
    productionUnit: record.productionUnit ?? record['Production Unit'] ?? '',
    workCell: record.workCell ?? record['Work Cell'] ?? '',
    storageZone: record.storageZone ?? record['Storage Zone'] ?? '',
    storageUnit: record.storageUnit ?? record['Storage Unit'] ?? '',
  };
}

function normalizeHierarchyScopeFlatFromApi(record: any): any {
  if (!record || typeof record !== 'object') return record;

  return {
    ...record,
    Enterprise: record.Enterprise ?? record.enterprise ?? '',
    Site: record.Site ?? record.site ?? '',
    Area: record.Area ?? record.area ?? '',
    'Work Center': record['Work Center'] ?? record.workCenter ?? '',
    'Work Unit': record['Work Unit'] ?? record.workUnit ?? '',
    'Process Cell': record['Process Cell'] ?? record.processCell ?? '',
    Unit: record.Unit ?? record.unit ?? '',
    'Production Line': record['Production Line'] ?? record.productionLine ?? '',
    'Production Unit': record['Production Unit'] ?? record.productionUnit ?? '',
    'Work Cell': record['Work Cell'] ?? record.workCell ?? '',
    'Storage Zone': record['Storage Zone'] ?? record.storageZone ?? '',
    'Storage Unit': record['Storage Unit'] ?? record.storageUnit ?? '',
  };
}

// Helper function for API calls
async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }
  
  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return {} as T;
  }
  
  return response.json();
}

// Map store names to API endpoints
const storeToEndpoint: Record<string, string> = {
  materialClasses: '/masterdata/material-classes',
  materials: '/masterdata/materials',
  materialLots: '/masterdata/material-lots',
  materialSublots: '/masterdata/material-sublots',
  materialClassProperties: '/masterdata/material-class-properties',
  materialClassPropertiesAssignments: '/masterdata/material-class-property-assignments',
  equipmentClasses: '/masterdata/equipment-classes',
  equipment: '/masterdata/equipment',
  equipmentProperties: '/masterdata/equipment-properties',
  equipmentPropertyAssignments: '/masterdata/equipment-property-assignments',
  equipmentClassProperties: '/masterdata/equipment-class-properties',
  equipmentClassPropertiesAssignments: '/masterdata/equipment-class-property-assignments',
  processSegments: '/masterdata/process-segments',
  segmentBOMs: '/masterdata/segment-boms',
  equipmentUsages: '/masterdata/equipment-usages',
  plants: '/masterdata/plants',
  productionLines: '/masterdata/production-lines',
  lineEquipment: '/masterdata/line-equipment',
  shifts: '/masterdata/shifts',
  crews: '/masterdata/crews',
  shiftCrewAssignments: '/masterdata/shift-crew-assignments',
  operationEventDefinitions: '/masterdata/operation-event-definitions',
  operationEventDefinitionProperties: '/masterdata/operation-event-definition-properties',
  operationEventDefinitionPropertyAssignments: '/masterdata/operation-event-definition-property-assignments',
  operationEventDefSegmentAssignments: '/masterdata/operation-event-def-segment-assignments',
  operationsEventClasses: '/masterdata/operations-event-classes',
  operationsEventRecords: '/masterdata/operations-event-records',
  operationsEventEntries: '/masterdata/operations-event-entries',
  hierarchyScopes: '/masterdata/hierarchy-scopes',
  hierarchyScopesFlat: '/masterdata/hierarchy-scopes-flat',
  materialDefinitionProperties: '/masterdata/material-definition-properties',
  materialDefinitionPropertyAssignments: '/masterdata/material-definition-property-assignments',
  // Legacy stores that may not have backend endpoints yet
  hierarchyScopeParentChild: '/masterdata/hierarchy-scope-parent-child',
};

// Map CSV import endpoints
const storeToImportEndpoint: Record<string, string> = {
  materialClasses: '/csvimport/material-classes',
  materials: '/csvimport/materials',
  materialLots: '/csvimport/material-lots',
  equipmentClasses: '/csvimport/equipment-classes',
  equipment: '/csvimport/equipment',
  processSegments: '/csvimport/process-segments',
  segmentBOMs: '/csvimport/segment-boms',
  plants: '/csvimport/plants',
  productionLines: '/csvimport/production-lines',
  shifts: '/csvimport/shifts',
  crews: '/csvimport/crews',
  operationEventDefinitions: '/csvimport/operation-event-definitions',
  hierarchyScopes: '/csvimport/hierarchy-scopes',
};

/**
 * Master Data API - provides same interface as masterDataDB but uses backend SQL Server
 */
export const masterDataApi = {
  /**
   * Get all records from a store
   */
  async getAll<T>(storeName: string): Promise<T[]> {
    const endpoint = storeToEndpoint[storeName];
    if (!endpoint) {
      console.warn(`No endpoint mapping for store: ${storeName}, returning empty array`);
      return [];
    }
    
    try {
      const result = await apiCall<T[]>(endpoint);
      if (!Array.isArray(result)) return [];

      if (storeName === 'hierarchyScopesFlat') {
        return result.map(item => normalizeHierarchyScopeFlatFromApi(item)) as T[];
      }

      return result;
    } catch (error) {
      console.error(`Failed to get ${storeName}:`, error);
      return [];
    }
  },

  /**
   * Get a single record by ID
   */
  async get<T>(storeName: string, id: string): Promise<T | undefined> {
    const endpoint = storeToEndpoint[storeName];
    if (!endpoint) {
      console.warn(`No endpoint mapping for store: ${storeName}`);
      return undefined;
    }
    
    try {
      return await apiCall<T>(`${endpoint}/${encodeURIComponent(id)}`);
    } catch (error) {
      console.error(`Failed to get ${storeName}/${id}:`, error);
      return undefined;
    }
  },

  /**
   * Add a new record
   */
  async add<T>(storeName: string, data: T): Promise<T> {
    const endpoint = storeToEndpoint[storeName];
    if (!endpoint) {
      throw new Error(`No endpoint mapping for store: ${storeName}`);
    }
    
    const payload = storeName === 'hierarchyScopesFlat'
      ? normalizeHierarchyScopeFlatForApi(data)
      : data;

    return await apiCall<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update an existing record
   */
  async update<T extends { id: string }>(storeName: string, data: T): Promise<T> {
    const endpoint = storeToEndpoint[storeName];
    if (!endpoint) {
      throw new Error(`No endpoint mapping for store: ${storeName}`);
    }
    
    const payload = storeName === 'hierarchyScopesFlat'
      ? normalizeHierarchyScopeFlatForApi(data)
      : data;

    return await apiCall<T>(`${endpoint}/${encodeURIComponent(data.id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Delete a record by ID
   */
  async delete(storeName: string, id: string): Promise<void> {
    const endpoint = storeToEndpoint[storeName];
    if (!endpoint) {
      throw new Error(`No endpoint mapping for store: ${storeName}`);
    }
    
    await apiCall<void>(`${endpoint}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  /**
   * Clear all data from a store
   */
  async clear(storeName: string): Promise<void> {
    // Get all records and delete them one by one
    const items = await this.getAll<{ id: string }>(storeName);
    for (const item of items) {
      await this.delete(storeName, item.id);
    }
  },

  /**
   * Bulk add records
   */
  async bulkAdd<T>(storeName: string, items: T[]): Promise<{ succeeded: number; failed: number }> {
    const tasks = items.map((item) => async () => {
      try {
        await this.add(storeName, item);
        return true;
      } catch (error) {
        console.error(`Failed to add item to ${storeName}:`, error);
        return false;
      }
    });

    const results = await runWithConcurrency(tasks, BULK_CONCURRENCY);
    const succeeded = results.filter(Boolean).length;
    return { succeeded, failed: results.length - succeeded };
  },

  /**
   * Import CSV file to a store
   */
  async importCsv(storeName: string, file: File): Promise<{ count: number }> {
    const endpoint = storeToImportEndpoint[storeName];
    if (!endpoint) {
      throw new Error(`No CSV import endpoint for store: ${storeName}`);
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Import failed: ${errorText}`);
    }
    
    return response.json();
  },

  /**
   * Clear all master data from the database
   */
  async clearAll(): Promise<void> {
    await apiCall<void>('/masterdata/clear-all', {
      method: 'DELETE',
    });
  },

  /**
   * Import parsed CSV data to the database (same interface as masterDataDB.importFromCSV)
   * @param csvData The parsed CSV data object with store names as keys
   */
  async importFromCSV(csvData: Record<string, any[]>): Promise<void> {
    // Clear existing data first
    await this.clearAll();
    
    // Import in the correct order to respect foreign key constraints
    const importOrder = [
      'materialClasses',
      'materials',
      'materialLots',
      'materialSublots',
      'materialClassProperties',
      'materialClassPropertiesAssignments',
      'materialDefinitionProperties',
      'materialDefinitionPropertyAssignments',
      'equipmentClasses',
      'equipmentClassProperties',
      'equipmentClassPropertiesAssignments',
      'equipment',
      'equipmentProperties',
      'equipmentPropertyAssignments',
      'processSegments',
      'segmentBOMs',
      'equipmentUsages',
      'plants',
      'productionLines',
      'lineEquipment',
      'shifts',
      'crews',
      'shiftCrewAssignments',
      'hierarchyScopes',
      'hierarchyScopesFlat',
      'hierarchyScopeParentChild',
      'operationEventDefinitions',
      'operationEventDefinitionProperties',
      'operationEventDefinitionPropertyAssignments',
      'operationEventDefSegmentAssignments',
      'operationsEventClasses',
      'operationsEventRecords',
      'operationsEventEntries',
    ];
    
    for (const storeName of importOrder) {
      const data = csvData[storeName];
      if (data && Array.isArray(data) && data.length > 0) {
        console.log(`[MasterDataApi] Importing ${data.length} records to ${storeName}`);
        await this.bulkAdd(storeName, data);
      }
    }
    
    // Handle any stores not in the import order
    for (const [storeName, data] of Object.entries(csvData)) {
      if (!importOrder.includes(storeName) && Array.isArray(data) && data.length > 0) {
        console.log(`[MasterDataApi] Importing ${data.length} records to ${storeName}`);
        await this.bulkAdd(storeName, data);
      }
    }
  },

  /**
   * Get summary of all master data counts
   */
  async getSummary(): Promise<Record<string, number>> {
    try {
      return await apiCall<Record<string, number>>('/masterdata/summary');
    } catch {
      return {};
    }
  },

  /**
   * Check if backend API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await apiCall<any>('/masterdata/plants');
      return true;
    } catch {
      return false;
    }
  },
};

export default masterDataApi;
