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
  operationEventDefinitions: {
    key: string;
    value: OperationEventDefinitionRecord;
    indexes: { 'by-category': string; 'by-code': string; 'by-updated': Date };
  };
  operationsEventClasses: {
    key: string;
    value: OperationsEventClassRecord;
    indexes: { 'by-updated': Date };
  };
  operationsEventRecords: {
    key: string;
    value: OperationsEventRecordRecord;
    indexes: { 'by-definition': string; 'by-updated': Date };
  };
  operationsEventEntries: {
    key: string;
    value: OperationsEventEntryRecord;
    indexes: { 'by-record': string; 'by-updated': Date };
  };
  hierarchyScopes: {
    key: string;
    value: HierarchyScopeRecord;
    indexes: { 'by-level': string; 'by-equipment': string; 'by-updated': Date };
  };
  hierarchyScopesFlat: {
    key: string;
    value: HierarchyScopeFlatRecord;
    indexes: { 'by-site': string; 'by-enterprise': string; 'by-updated': Date };
  };
  hierarchyScopeParentChild: {
    key: string;
    value: HierarchyScopeParentChildRecord;
    indexes: { 'by-parent-level': string; 'by-child-level': string; 'by-updated': Date };
  };
  shifts: {
    key: string;
    value: ShiftRecord;
    indexes: { 'by-number': number; 'by-updated': Date };
  };
  crews: {
    key: string;
    value: CrewRecord;
    indexes: { 'by-updated': Date };
  };
  shiftCrewAssignments: {
    key: string;
    value: ShiftCrewAssignmentRecord;
    indexes: { 'by-shift': string; 'by-crew': string; 'by-updated': Date };
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
  parentLotId?: string;
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
  parentEquipmentId?: string;
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
  plantId?: string;
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

export interface OperationEventDefinitionRecord extends BaseRecord {
  id: string;
  eventCategory: string;
  eventCode: string;
  description: string;
  causesDowntime: boolean;
  causesScrap: boolean;
  rootCauseType: string;
}

export interface HierarchyScopeRecord extends BaseRecord {
  id: string;
  equipmentID: string;
  equipmentLevel: string;
}

export interface HierarchyScopeFlatRecord extends BaseRecord {
  id: string;
  Enterprise: string;
  Site: string;
  Area: string;
  'Work Center': string;
  'Work Unit': string;
  'Process Cell': string;
  Unit: string;
  'Production Line': string;
  'Production Unit': string;
  'Work Cell': string;
  'Storage Zone': string;
  'Storage Unit': string;
}

export interface HierarchyScopeParentChildRecord extends BaseRecord {
  id: string;
  parentEquipmentLevel: string;
  parentEquipmentID: string;
  childEquipmentLevel: string;
  childEquipmentID: string;
}

export interface ShiftRecord extends BaseRecord {
  id: string;
  shiftNumber: number;
  shiftName: string;
  startTime: string;
  endTime: string;
  description: string;
}

export interface CrewRecord extends BaseRecord {
  id: string;
  crewName: string;
  peopleCount: number;
  skills: string;
  description: string;
}

export interface ShiftCrewAssignmentRecord extends BaseRecord {
  id: string;
  shiftId: string;
  crewId: string;
  effectiveDate: string;
  expiryDate: string;
}

export interface OperationsEventClassRecord extends BaseRecord {
  OperationsEventClassID: string;
  ClassName: string;
  Description: string;
}

export interface OperationsEventRecordRecord extends BaseRecord {
  id: string;
  OperationsEventRecordID: string;
  OperationsEventDefinitionID: string;
  Severity: string;
  Status: string;
  Comments: string;
}

export interface OperationsEventEntryRecord extends BaseRecord {
  id: string;
  OperationsEventEntryID: string;
  OperationsEventRecordID: string;
  EntryType: string;
  Description: string;
}

class MasterDataDatabase {
  private dbPromise: Promise<IDBPDatabase<MasterDataDB>>;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private async initDB(): Promise<IDBPDatabase<MasterDataDB>> {
    return openDB<MasterDataDB>('master-data-db', 11, {
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

        // Operation Event Definitions (version 6)
        if (!db.objectStoreNames.contains('operationEventDefinitions')) {
          const oedStore = db.createObjectStore('operationEventDefinitions', { keyPath: 'id' });
          oedStore.createIndex('by-category', 'eventCategory');
          oedStore.createIndex('by-code', 'eventCode');
          oedStore.createIndex('by-updated', 'updatedAt');
        }

        // Operation Event Definition Segment Assignments (version 7)
        if (!db.objectStoreNames.contains('operationEventDefSegmentAssignments')) {
          const oedsaStore = db.createObjectStore('operationEventDefSegmentAssignments', { keyPath: 'id' });
          oedsaStore.createIndex('by-definition', 'operationsEventDefinitionId');
          oedsaStore.createIndex('by-segment', 'processSegmentId');
          oedsaStore.createIndex('by-updated', 'updatedAt');
        }

        // Hierarchy Scopes (version 7)
        if (!db.objectStoreNames.contains('hierarchyScopes')) {
          const hsStore = db.createObjectStore('hierarchyScopes', { keyPath: 'id' });
          hsStore.createIndex('by-level', 'equipmentLevel');
          hsStore.createIndex('by-equipment', 'equipmentID');
          hsStore.createIndex('by-updated', 'updatedAt');
        }

        // Hierarchy Scopes Flat (version 8)
        if (!db.objectStoreNames.contains('hierarchyScopesFlat')) {
          const hsFlatStore = db.createObjectStore('hierarchyScopesFlat', { keyPath: 'id' });
          hsFlatStore.createIndex('by-site', 'Site');
          hsFlatStore.createIndex('by-enterprise', 'Enterprise');
          hsFlatStore.createIndex('by-updated', 'updatedAt');
        }

        // Hierarchy Scope Parent-Child (version 9)
        if (!db.objectStoreNames.contains('hierarchyScopeParentChild')) {
          const hspcStore = db.createObjectStore('hierarchyScopeParentChild', { keyPath: 'id' });
          hspcStore.createIndex('by-parent-level', 'parentEquipmentLevel');
          hspcStore.createIndex('by-child-level', 'childEquipmentLevel');
          hspcStore.createIndex('by-updated', 'updatedAt');
        }

        // Shifts (version 10)
        if (!db.objectStoreNames.contains('shifts')) {
          const shiftsStore = db.createObjectStore('shifts', { keyPath: 'id' });
          shiftsStore.createIndex('by-number', 'shiftNumber');
          shiftsStore.createIndex('by-updated', 'updatedAt');
        }

        // Crews (version 10)
        if (!db.objectStoreNames.contains('crews')) {
          const crewsStore = db.createObjectStore('crews', { keyPath: 'id' });
          crewsStore.createIndex('by-updated', 'updatedAt');
        }

        // Shift-Crew Assignments (version 10)
        if (!db.objectStoreNames.contains('shiftCrewAssignments')) {
          const scaStore = db.createObjectStore('shiftCrewAssignments', { keyPath: 'id' });
          scaStore.createIndex('by-shift', 'shiftId');
          scaStore.createIndex('by-crew', 'crewId');
          scaStore.createIndex('by-updated', 'updatedAt');
        }

        // Operations Event Classes (version 11)
        if (!db.objectStoreNames.contains('operationsEventClasses')) {
          const oecStore = db.createObjectStore('operationsEventClasses', { keyPath: 'OperationsEventClassID' });
          oecStore.createIndex('by-updated', 'updatedAt');
        }

        // Operations Event Records (version 12)
        if (!db.objectStoreNames.contains('operationsEventRecords')) {
          const oerStore = db.createObjectStore('operationsEventRecords', { keyPath: 'id' });
          oerStore.createIndex('by-definition', 'OperationsEventDefinitionID');
          oerStore.createIndex('by-updated', 'updatedAt');
        }

        // Operations Event Entries (version 12)
        if (!db.objectStoreNames.contains('operationsEventEntries')) {
          const oeeStore = db.createObjectStore('operationsEventEntries', { keyPath: 'id' });
          oeeStore.createIndex('by-record', 'OperationsEventRecordID');
          oeeStore.createIndex('by-updated', 'updatedAt');
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

    // Define keyPath mapping for each store
    const keyPathMap: { [key: string]: string } = {
      'operationsEventClasses': 'OperationsEventClassID',
      // All other stores use 'id' as keyPath
    };

    const keyPath = keyPathMap[storeName as string] || 'id';

    for (const data of records) {
      const record = {
        ...data,
        createdAt: now,
        updatedAt: now,
        version: 1,
      } as MasterDataDB[T]['value'];
      
      // Validate that the record has the required key
      if (!(record as any)[keyPath]) {
        console.error(`Record missing ${keyPath} in ${storeName}:`, record);
        throw new Error(`Record missing ${keyPath} in ${storeName}`);
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
    operationEventDefinitions?: any[];
    operationEventDefSegmentAssignments?: any[];
    operationsEventClasses?: any[];
    hierarchyScopes?: any[];
    hierarchyScopesFlat?: any[];
    shifts?: any[];
    crews?: any[];
    shiftCrewAssignments?: any[];
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
    if (csvData.operationEventDefinitions) {
      console.log('Importing operation event definitions:', csvData.operationEventDefinitions.length);
      await this.bulkAdd('operationEventDefinitions', csvData.operationEventDefinitions);
    }

    if (csvData.operationEventDefSegmentAssignments) {
      console.log('Importing operation event def segment assignments:', csvData.operationEventDefSegmentAssignments.length);
      await this.bulkAdd('operationEventDefSegmentAssignments', csvData.operationEventDefSegmentAssignments);
    }

    if (csvData.operationsEventClasses) {
      console.log('Importing operations event classes:', csvData.operationsEventClasses.length);
      await this.bulkAdd('operationsEventClasses', csvData.operationsEventClasses);
    }

    if (csvData.operationsEventRecords) {
      console.log('Clearing old operations event records...');
      await this.clear('operationsEventRecords');
      console.log('Importing operations event records:', csvData.operationsEventRecords.length);
      console.log('First record:', csvData.operationsEventRecords[0]);
      console.log('First record keys:', Object.keys(csvData.operationsEventRecords[0]));
      await this.bulkAdd('operationsEventRecords', csvData.operationsEventRecords);
    }

    if (csvData.operationsEventEntries) {
      console.log('Clearing old operations event entries...');
      await this.clear('operationsEventEntries');
      console.log('Importing operations event entries:', csvData.operationsEventEntries.length);
      await this.bulkAdd('operationsEventEntries', csvData.operationsEventEntries);
    }

    if (csvData.hierarchyScopes) {
      console.log('Importing hierarchy scopes:', csvData.hierarchyScopes.length);
      await this.bulkAdd('hierarchyScopes', csvData.hierarchyScopes);
    }

    if (csvData.hierarchyScopesFlat) {
      console.log('Importing hierarchy scopes flat:', csvData.hierarchyScopesFlat.length);
      await this.bulkAdd('hierarchyScopesFlat', csvData.hierarchyScopesFlat);
    }

    if (csvData.shifts) {
      console.log('Importing shifts:', csvData.shifts.length);
      await this.bulkAdd('shifts', csvData.shifts);
    }

    if (csvData.crews) {
      console.log('Importing crews:', csvData.crews.length);
      await this.bulkAdd('crews', csvData.crews);
    }

    if (csvData.shiftCrewAssignments) {
      console.log('Importing shift-crew assignments:', csvData.shiftCrewAssignments.length);
      await this.bulkAdd('shiftCrewAssignments', csvData.shiftCrewAssignments);
    }

    console.log('Master data import completed successfully');
  }
}

// Singleton instance
export const masterDataDB = new MasterDataDatabase();
