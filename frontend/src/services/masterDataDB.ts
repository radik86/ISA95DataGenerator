import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database Schema
interface MasterDataDB extends DBSchema {
  materialClasses: {
    key: string;
    value: MaterialClassRecord;
    indexes: { 'by-updated': Date };
  };
  materials: {
    key: string;
    value: MaterialRecord;
    indexes: { 'by-class': string; 'by-updated': Date };
  };
  materialLots: {
    key: string;
    value: MaterialLotRecord;
    indexes: { 'by-material': string; 'by-updated': Date };
  };
  materialSublots: {
    key: string;
    value: MaterialSublotRecord;
    indexes: { 'by-lot': string; 'by-updated': Date };
  };
  equipmentClasses: {
    key: string;
    value: EquipmentClassRecord;
    indexes: { 'by-updated': Date };
  };
  equipment: {
    key: string;
    value: EquipmentRecord;
    indexes: { 'by-class': string; 'by-updated': Date };
  };
  processSegments: {
    key: string;
    value: ProcessSegmentRecord;
    indexes: { 'by-product': string; 'by-updated': Date };
  };
  segmentBOMs: {
    key: string;
    value: SegmentBOMRecord;
    indexes: { 'by-segment': string; 'by-material': string; 'by-updated': Date };
  };
  equipmentUsages: {
    key: string;
    value: EquipmentUsageRecord;
    indexes: { 'by-segment': string; 'by-equipment': string; 'by-updated': Date };
  };
  plants: {
    key: string;
    value: PlantRecord;
    indexes: { 'by-updated': Date };
  };
  productionLines: {
    key: string;
    value: ProductionLineRecord;
    indexes: { 'by-plant': string; 'by-updated': Date };
  };
  lineEquipment: {
    key: string;
    value: LineEquipmentRecord;
    indexes: { 'by-line': string; 'by-equipment': string; 'by-updated': Date };
  };
  equipmentProperties: {
    key: string;
    value: EquipmentPropertyRecord;
    indexes: { 'by-updated': Date };
  };
  equipmentPropertyAssignments: {
    key: string;
    value: EquipmentPropertyAssignmentRecord;
    indexes: { 'by-equipment': string; 'by-segment': string; 'by-property': string; 'by-updated': Date };
  };
}

// Record Interfaces with metadata
export interface BaseRecord {
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface MaterialClassRecord extends BaseRecord {
  id: string;
  name: string;
  description: string;
}

export interface MaterialRecord extends BaseRecord {
  id: string;
  name: string;
  classId: string;
  className: string;
  defaultUoM: string;
  description: string;
}

export interface MaterialLotRecord extends BaseRecord {
  id: string;
  materialId: string;
  lotQuantity: number;
  lotUoM: string;
  receivedDateTime?: string;
  producedDateTime?: string;
  supplierOrProducerId?: string;
  supplierOrProducerName?: string;
  producedByProcessSegmentId?: string;
}

export interface MaterialSublotRecord extends BaseRecord {
  id: string;
  materialLotId: string;
  quantity: number;
  quantityUnitOfMeasure: string;
  storageLocation?: string;
  status?: string;
  disposition?: string;
}

export interface EquipmentClassRecord extends BaseRecord {
  id: string;
  name: string;
  description: string;
}

export interface EquipmentRecord extends BaseRecord {
  id: string;
  name: string;
  classId: string;
  className: string;
  description?: string;
  productionLineId?: string;
}

export interface ProcessSegmentRecord extends BaseRecord {
  id: string;
  productMaterialId: string;
  name: string;
  sequence: number;
  durationHours: number;
}

export interface SegmentBOMRecord extends BaseRecord {
  id: string;
  processSegmentId: string;
  materialId: string;
  qtyPerUnit: number;
  uom: string;
}

export interface EquipmentUsageRecord extends BaseRecord {
  id: string;
  processSegmentId: string;
  equipmentId: string;
  role: string;
  capacityPerRun: number;
}

export interface PlantRecord extends BaseRecord {
  id: string;
  name: string;
  location: string;
  description: string;
}

export interface ProductionLineRecord extends BaseRecord {
  id: string;
  plantId: string;
  name: string;
  description: string;
}

export interface LineEquipmentRecord extends BaseRecord {
  id: string;
  productionLineId: string;
  equipmentId: string;
  sequence: number;
  description: string;
}

export interface EquipmentPropertyRecord extends BaseRecord {
  id: string;
  name: string;
  description: string;
  valueDataType: string;
  unit?: string;
  minValue?: number;
  maxValue?: number;
}

export interface EquipmentPropertyAssignmentRecord extends BaseRecord {
  id: string;
  equipmentId: string;
  processSegmentId: string;
  equipmentPropertyId: string;
  samplingMode: string;
  samplingIntervalSeconds?: number;
}

class MasterDataDatabase {
  private dbPromise: Promise<IDBPDatabase<MasterDataDB>>;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private async initDB(): Promise<IDBPDatabase<MasterDataDB>> {
    return openDB<MasterDataDB>('master-data-db', 5, {
      upgrade(db, oldVersion) {
        // Material Classes
        if (!db.objectStoreNames.contains('materialClasses')) {
          const materialClassStore = db.createObjectStore('materialClasses', { keyPath: 'id' });
          materialClassStore.createIndex('by-updated', 'updatedAt');
        }

        // Materials
        if (!db.objectStoreNames.contains('materials')) {
          const materialStore = db.createObjectStore('materials', { keyPath: 'id' });
          materialStore.createIndex('by-class', 'classId');
          materialStore.createIndex('by-updated', 'updatedAt');
        }

        // Material Lots (version 3)
        if (!db.objectStoreNames.contains('materialLots')) {
          const materialLotStore = db.createObjectStore('materialLots', { keyPath: 'id' });
          materialLotStore.createIndex('by-material', 'materialId');
          materialLotStore.createIndex('by-updated', 'updatedAt');
        }

        // Material Sublots (version 4)
        if (!db.objectStoreNames.contains('materialSublots')) {
          const materialSublotStore = db.createObjectStore('materialSublots', { keyPath: 'id' });
          materialSublotStore.createIndex('by-lot', 'materialLotId');
          materialSublotStore.createIndex('by-updated', 'updatedAt');
        }

        // Equipment Classes
        if (!db.objectStoreNames.contains('equipmentClasses')) {
          const equipmentClassStore = db.createObjectStore('equipmentClasses', { keyPath: 'id' });
          equipmentClassStore.createIndex('by-updated', 'updatedAt');
        }

        // Equipment
        if (!db.objectStoreNames.contains('equipment')) {
          const equipmentStore = db.createObjectStore('equipment', { keyPath: 'id' });
          equipmentStore.createIndex('by-class', 'classId');
          equipmentStore.createIndex('by-updated', 'updatedAt');
        }

        // Process Segments
        if (!db.objectStoreNames.contains('processSegments')) {
          const processSegmentStore = db.createObjectStore('processSegments', { keyPath: 'id' });
          processSegmentStore.createIndex('by-product', 'productMaterialId');
          processSegmentStore.createIndex('by-updated', 'updatedAt');
        }

        // Segment BOMs
        if (!db.objectStoreNames.contains('segmentBOMs')) {
          const bomStore = db.createObjectStore('segmentBOMs', { keyPath: 'id' });
          bomStore.createIndex('by-segment', 'processSegmentId');
          bomStore.createIndex('by-material', 'materialId');
          bomStore.createIndex('by-updated', 'updatedAt');
        }

        // Equipment Usages
        if (!db.objectStoreNames.contains('equipmentUsages')) {
          const usageStore = db.createObjectStore('equipmentUsages', { keyPath: 'id' });
          usageStore.createIndex('by-segment', 'processSegmentId');
          usageStore.createIndex('by-equipment', 'equipmentId');
          usageStore.createIndex('by-updated', 'updatedAt');
        }

        // Plants
        if (!db.objectStoreNames.contains('plants')) {
          const plantStore = db.createObjectStore('plants', { keyPath: 'id' });
          plantStore.createIndex('by-updated', 'updatedAt');
        }

        // Production Lines
        if (!db.objectStoreNames.contains('productionLines')) {
          const lineStore = db.createObjectStore('productionLines', { keyPath: 'id' });
          lineStore.createIndex('by-plant', 'plantId');
          lineStore.createIndex('by-updated', 'updatedAt');
        }

        // Line Equipment
        if (!db.objectStoreNames.contains('lineEquipment')) {
          const lineEqStore = db.createObjectStore('lineEquipment', { keyPath: 'id' });
          lineEqStore.createIndex('by-line', 'productionLineId');
          lineEqStore.createIndex('by-equipment', 'equipmentId');
          lineEqStore.createIndex('by-updated', 'updatedAt');
        }

        // Equipment Properties (version 5)
        if (!db.objectStoreNames.contains('equipmentProperties')) {
          const epStore = db.createObjectStore('equipmentProperties', { keyPath: 'id' });
          epStore.createIndex('by-updated', 'updatedAt');
        }

        // Equipment Property Assignments (version 5)
        if (!db.objectStoreNames.contains('equipmentPropertyAssignments')) {
          const epaStore = db.createObjectStore('equipmentPropertyAssignments', { keyPath: 'id' });
          epaStore.createIndex('by-equipment', 'equipmentId');
          epaStore.createIndex('by-segment', 'processSegmentId');
          epaStore.createIndex('by-property', 'equipmentPropertyId');
          epaStore.createIndex('by-updated', 'updatedAt');
        }
      },
    });
  }

  // Generic CRUD operations
  async getAll<T extends keyof MasterDataDB>(storeName: T): Promise<MasterDataDB[T]['value'][]> {
    const db = await this.dbPromise;
    return db.getAll(storeName);
  }

  async get<T extends keyof MasterDataDB>(
    storeName: T,
    key: string
  ): Promise<MasterDataDB[T]['value'] | undefined> {
    const db = await this.dbPromise;
    return db.get(storeName, key);
  }

  async add<T extends keyof MasterDataDB>(
    storeName: T,
    data: Omit<MasterDataDB[T]['value'], 'createdAt' | 'updatedAt' | 'version'>
  ): Promise<void> {
    const db = await this.dbPromise;
    const now = new Date();
    const record = {
      ...data,
      createdAt: now,
      updatedAt: now,
      version: 1,
    } as MasterDataDB[T]['value'];
    await db.add(storeName, record);
  }

  async update<T extends keyof MasterDataDB>(
    storeName: T,
    data: Omit<MasterDataDB[T]['value'], 'createdAt' | 'updatedAt' | 'version'>
  ): Promise<void> {
    const db = await this.dbPromise;
    const existing = await db.get(storeName, (data as any).id);
    
    if (!existing) {
      throw new Error(`Record not found: ${(data as any).id}`);
    }

    const record = {
      ...data,
      createdAt: (existing as any).createdAt,
      updatedAt: new Date(),
      version: ((existing as any).version || 0) + 1,
    } as MasterDataDB[T]['value'];
    
    await db.put(storeName, record);
  }

  async delete<T extends keyof MasterDataDB>(storeName: T, key: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete(storeName, key);
  }

  async bulkAdd<T extends keyof MasterDataDB>(
    storeName: T,
    records: Omit<MasterDataDB[T]['value'], 'createdAt' | 'updatedAt' | 'version'>[]
  ): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(storeName, 'readwrite');
    const now = new Date();

    for (const data of records) {
      const record = {
        ...data,
        createdAt: now,
        updatedAt: now,
        version: 1,
      } as MasterDataDB[T]['value'];
      
      // Validate that the record has an id
      if (!record.id) {
        console.error(`Record missing id in ${storeName}:`, record);
        throw new Error(`Record missing id in ${storeName}`);
      }
      
      await tx.store.put(record);
    }

    await tx.done;
  }

  async clear<T extends keyof MasterDataDB>(storeName: T): Promise<void> {
    const db = await this.dbPromise;
    await db.clear(storeName);
  }

  async clearAll(): Promise<void> {
    const db = await this.dbPromise;
    const storeNames: (keyof MasterDataDB)[] = [
      'materialClasses',
      'materials',
      'materialLots',
      'materialSublots',
      'equipmentClasses',
      'equipment',
      'equipmentProperties',
      'equipmentPropertyAssignments',
      'processSegments',
      'segmentBOMs',
      'equipmentUsages',
      'plants',
      'productionLines',
      'lineEquipment',
    ];

    for (const storeName of storeNames) {
      await db.clear(storeName);
    }
  }

  // CSV Import helpers
  async importFromCSV(csvData: {
    materialClasses?: any[];
    materials?: any[];
    materialLots?: any[];
    equipmentClasses?: any[];
    equipment?: any[];
    equipmentProperties?: any[];
    equipmentPropertyAssignments?: any[];
    processSegments?: any[];
    segmentBOMs?: any[];
    equipmentUsages?: any[];
    plants?: any[];
    productionLines?: any[];
    lineEquipment?: any[];
  }): Promise<void> {
    if (csvData.materialClasses) {
      await this.bulkAdd('materialClasses', csvData.materialClasses);
    }
    if (csvData.materials) {
      await this.bulkAdd('materials', csvData.materials);
    }
    if (csvData.materialLots) {
      await this.bulkAdd('materialLots', csvData.materialLots);
    }
    if (csvData.equipmentClasses) {
      await this.bulkAdd('equipmentClasses', csvData.equipmentClasses);
    }
    if (csvData.equipment) {
      try {
        await this.bulkAdd('equipment', csvData.equipment);
      } catch (error) {
        console.error('Failed to import equipment:', error, csvData.equipment);
        throw error;
      }
    }
    if (csvData.equipmentProperties) {
      console.log('Importing equipment properties:', csvData.equipmentProperties.length);
      try {
        await this.bulkAdd('equipmentProperties', csvData.equipmentProperties);
      } catch (error) {
        console.error('Failed to import equipment properties:', error, csvData.equipmentProperties);
        throw error;
      }
    }
    if (csvData.equipmentPropertyAssignments) {
      console.log('Importing equipment property assignments:', csvData.equipmentPropertyAssignments.length);
      try {
        await this.bulkAdd('equipmentPropertyAssignments', csvData.equipmentPropertyAssignments);
      } catch (error) {
        console.error('Failed to import equipment property assignments:', error, csvData.equipmentPropertyAssignments);
        throw error;
      }
    }
    if (csvData.processSegments) {
      await this.bulkAdd('processSegments', csvData.processSegments);
    }
    if (csvData.segmentBOMs) {
      await this.bulkAdd('segmentBOMs', csvData.segmentBOMs);
    }
    if (csvData.equipmentUsages) {
      await this.bulkAdd('equipmentUsages', csvData.equipmentUsages);
    }
    if (csvData.plants) {
      await this.bulkAdd('plants', csvData.plants);
    }
    if (csvData.productionLines) {
      await this.bulkAdd('productionLines', csvData.productionLines);
    }
    if (csvData.lineEquipment) {
      await this.bulkAdd('lineEquipment', csvData.lineEquipment);
    }
  }
}

// Singleton instance
export const masterDataDB = new MasterDataDatabase();
