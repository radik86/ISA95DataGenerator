import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database Schema
interface ProcessDataDB extends DBSchema {
  operationsRequests: {
    key: string;
    value: OperationsRequestRecord;
    indexes: { 'by-plant': string; 'by-line': string; 'by-product': string; 'by-updated': Date };
  };
  segmentRequirements: {
    key: string;
    value: SegmentRequirementRecord;
    indexes: { 'by-operation': string; 'by-segment': string; 'by-updated': Date };
  };
  segmentMaterialRequirements: {
    key: string;
    value: SegmentMaterialRequirementRecord;
    indexes: { 'by-segment-req': string; 'by-material': string; 'by-updated': Date };
  };
  segmentEquipmentRequirements: {
    key: string;
    value: SegmentEquipmentRequirementRecord;
    indexes: { 'by-segment-req': string; 'by-equipment': string; 'by-updated': Date };
  };
  operationsResponses: {
    key: string;
    value: OperationsResponseRecord;
    indexes: { 'by-request': string; 'by-updated': Date };
  };
  segmentResponses: {
    key: string;
    value: SegmentResponseRecord;
    indexes: { 'by-requirement': string; 'by-ops-response': string; 'by-updated': Date };
  };
  segmentMaterialActuals: {
    key: string;
    value: SegmentMaterialActualRecord;
    indexes: { 'by-segment-resp': string; 'by-material': string; 'by-updated': Date };
  };
  segmentEquipmentActuals: {
    key: string;
    value: SegmentEquipmentActualRecord;
    indexes: { 'by-segment-resp': string; 'by-equipment': string; 'by-updated': Date };
  };
  testResults: {
    key: string;
    value: TestResultRecord;
    indexes: { 'by-material-lot': string; 'by-evaluation-date': Date; 'by-updated': Date };
  };
  equipmentPropertyTracking: {
    key: string;
    value: EquipmentPropertyTrackingRecord;
    indexes: { 'by-equipment': string; 'by-property': string; 'by-segment-resp': string; 'by-timestamp': Date; 'by-updated': Date };
  };
  operationsEvents: {
    key: string;
    value: OperationsEventRecord;
    indexes: { 'by-segment-resp': string; 'by-event-def': string; 'by-updated': Date };
  };
  operationsEventRecords: {
    key: string;
    value: OperationsEventRecordRecord;
    indexes: { 'by-event-def': string; 'by-status': string; 'by-updated': Date };
  };
  operationsEventEntries: {
    key: string;
    value: OperationsEventEntryRecord;
    indexes: { 'by-event-record': string; 'by-entry-type': string; 'by-updated': Date };
  };
  segmentData: {
    key: string;
    value: SegmentDataRecord;
    indexes: { 'by-segment-resp': string; 'by-shift': string; 'by-crew': string; 'by-updated': Date };
  };
}

// Record Interfaces with metadata
export interface BaseRecord {
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface OperationsRequestRecord extends BaseRecord {
  id: string;
  description: string;
  plantId: string;
  lineId: string;
  productMaterialId: string;
  plannedQuantity: number;
  quantityUoM: string;
  plannedStartDateTime: string;
  plannedEndDateTime: string;
  priority: number;
  status: string;
}

export interface SegmentRequirementRecord extends BaseRecord {
  id: string;
  operationsRequestId: string;
  processSegmentId: string;
  sequence: number;
  earliestStartDateTime: string;
  latestEndDateTime: string;
  targetQuantity: number;
  quantityUoM: string;
}

export interface SegmentMaterialRequirementRecord extends BaseRecord {
  id: string;
  segmentRequirementId: string;
  materialId: string;
  requiredQty: number;
  qtyUoM: string;
  requirementType: string;
}

export interface SegmentEquipmentRequirementRecord extends BaseRecord {
  id: string;
  segmentRequirementId: string;
  lineId: string;
  equipmentClassId: string;
  equipmentId: string;
  requirementType: string;
  plannedDurationHours: number;
}

export interface OperationsResponseRecord extends BaseRecord {
  id: string;
  operationsRequestId: string;
  description: string;
  actualStartDateTime: string;
  actualEndDateTime: string;
  actualQuantity: number;
  quantityUoM: string;
  status: string;
}

export interface SegmentResponseRecord extends BaseRecord {
  id: string;
  segmentRequirementId: string;
  operationsResponseId: string;
  processSegmentId: string;
  actualStartDateTime: string;
  actualEndDateTime: string;
  actualQuantity: number;
  quantityUoM: string;
  status: string;
}

export interface SegmentMaterialActualRecord extends BaseRecord {
  id: string;
  segmentResponseId: string;
  materialId: string;
  materialLotId: string;
  actualQty: number;
  qtyUoM: string;
  direction: 'CONSUME' | 'PRODUCE';
}

export interface SegmentEquipmentActualRecord extends BaseRecord {
  id: string;
  segmentResponseId: string;
  equipmentId: string;
  actualDurationHours: number;
  actualStartDateTime: string;
  actualEndDateTime: string;
}

export interface TestResultRecord extends BaseRecord {
  id: string;
  materialLotId: string;
  description: string;
  evaluationDate: string;
  evaluatedCriterionResult: string;
}

export interface EquipmentPropertyTrackingRecord extends BaseRecord {
  id: string;
  segmentResponseId: string;
  equipmentId: string;
  equipmentPropertyId: string;
  value: number;
  uom: string;
  createdTimestamp: string;
}

export interface OperationsEventRecord extends BaseRecord {
  id: string;
  segmentResponseId: string;
  operationsEventDefinitionId: string;
  startDateTime: string;
  endDateTime: string;
  durationMinutes: number;
  comment?: string;
}

export interface OperationsEventRecordRecord extends BaseRecord {
  id: string;
  operationsEventId: string;
  operationsEventDefinitionId: string;
  severity: string;
  status: string;
  comments: string;
  effectiveTime: string;
  segmentResponseId: string;
  equipmentId: string;
}

export interface OperationsEventEntryRecord extends BaseRecord {
  id: string;
  operationsEventRecordId: string;
  entryType: string;
  description: string;
  effectiveTime: string;
  segmentResponseId: string;
  equipmentId: string;
}

export interface SegmentDataRecord extends BaseRecord {
  id: string;
  segmentResponseId: string;
  recordType: 'shift' | 'crew';
  shiftId?: string;
  crewId?: string;
  startDateTime: string;
  endDateTime: string;
  notes?: string;
}

const DB_NAME = 'process-data-db';
const DB_VERSION = 7;

class ProcessDataDBService {
  private db: IDBPDatabase<ProcessDataDB> | null = null;

  async init(): Promise<IDBPDatabase<ProcessDataDB>> {
    if (this.db) return this.db;

    this.db = await openDB<ProcessDataDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Operations Requests
        if (!db.objectStoreNames.contains('operationsRequests')) {
          const orStore = db.createObjectStore('operationsRequests', { keyPath: 'id' });
          orStore.createIndex('by-plant', 'plantId');
          orStore.createIndex('by-line', 'lineId');
          orStore.createIndex('by-product', 'productMaterialId');
          orStore.createIndex('by-updated', 'updatedAt');
        }

        // Segment Requirements
        if (!db.objectStoreNames.contains('segmentRequirements')) {
          const srStore = db.createObjectStore('segmentRequirements', { keyPath: 'id' });
          srStore.createIndex('by-operation', 'operationsRequestId');
          srStore.createIndex('by-segment', 'processSegmentId');
          srStore.createIndex('by-updated', 'updatedAt');
        }

        // Segment Material Requirements
        if (!db.objectStoreNames.contains('segmentMaterialRequirements')) {
          const smrStore = db.createObjectStore('segmentMaterialRequirements', { keyPath: 'id' });
          smrStore.createIndex('by-segment-req', 'segmentRequirementId');
          smrStore.createIndex('by-material', 'materialId');
          smrStore.createIndex('by-updated', 'updatedAt');
        }

        // Segment Equipment Requirements
        if (!db.objectStoreNames.contains('segmentEquipmentRequirements')) {
          const serStore = db.createObjectStore('segmentEquipmentRequirements', { keyPath: 'id' });
          serStore.createIndex('by-segment-req', 'segmentRequirementId');
          serStore.createIndex('by-equipment', 'equipmentId');
          serStore.createIndex('by-updated', 'updatedAt');
        }

        // Operations Responses (Actual Data)
        if (!db.objectStoreNames.contains('operationsResponses')) {
          const opsRespStore = db.createObjectStore('operationsResponses', { keyPath: 'id' });
          opsRespStore.createIndex('by-request', 'operationsRequestId');
          opsRespStore.createIndex('by-updated', 'updatedAt');
        }

        // Segment Responses
        if (!db.objectStoreNames.contains('segmentResponses')) {
          const segRespStore = db.createObjectStore('segmentResponses', { keyPath: 'id' });
          segRespStore.createIndex('by-requirement', 'segmentRequirementId');
          segRespStore.createIndex('by-ops-response', 'operationsResponseId');
          segRespStore.createIndex('by-updated', 'updatedAt');
        }

        // Segment Material Actuals
        if (!db.objectStoreNames.contains('segmentMaterialActuals')) {
          const matActStore = db.createObjectStore('segmentMaterialActuals', { keyPath: 'id' });
          matActStore.createIndex('by-segment-resp', 'segmentResponseId');
          matActStore.createIndex('by-material', 'materialId');
          matActStore.createIndex('by-updated', 'updatedAt');
        }

        // Segment Equipment Actuals
        if (!db.objectStoreNames.contains('segmentEquipmentActuals')) {
          const eqActStore = db.createObjectStore('segmentEquipmentActuals', { keyPath: 'id' });
          eqActStore.createIndex('by-segment-resp', 'segmentResponseId');
          eqActStore.createIndex('by-equipment', 'equipmentId');
          eqActStore.createIndex('by-updated', 'updatedAt');
        }

        // Test Results
        if (!db.objectStoreNames.contains('testResults')) {
          const testResultsStore = db.createObjectStore('testResults', { keyPath: 'id' });
          testResultsStore.createIndex('by-material-lot', 'materialLotId');
          testResultsStore.createIndex('by-evaluation-date', 'evaluationDate');
          testResultsStore.createIndex('by-updated', 'updatedAt');
        }

        // Equipment Property Tracking
        if (!db.objectStoreNames.contains('equipmentPropertyTracking')) {
          const propTrackStore = db.createObjectStore('equipmentPropertyTracking', { keyPath: 'id' });
          propTrackStore.createIndex('by-equipment', 'equipmentId');
          propTrackStore.createIndex('by-property', 'equipmentPropertyId');
          propTrackStore.createIndex('by-segment-resp', 'segmentResponseId');
          propTrackStore.createIndex('by-timestamp', 'createdTimestamp');
          propTrackStore.createIndex('by-updated', 'updatedAt');
        }

        // Operations Events
        if (!db.objectStoreNames.contains('operationsEvents')) {
          const opsEventsStore = db.createObjectStore('operationsEvents', { keyPath: 'id' });
          opsEventsStore.createIndex('by-segment-resp', 'segmentResponseId');
          opsEventsStore.createIndex('by-event-def', 'operationsEventDefinitionId');
          opsEventsStore.createIndex('by-updated', 'updatedAt');
        }

        // Operations Event Records
        if (!db.objectStoreNames.contains('operationsEventRecords')) {
          const opsEventRecordsStore = db.createObjectStore('operationsEventRecords', { keyPath: 'id' });
          opsEventRecordsStore.createIndex('by-event-def', 'operationsEventDefinitionId');
          opsEventRecordsStore.createIndex('by-status', 'status');
          opsEventRecordsStore.createIndex('by-updated', 'updatedAt');
        }

        // Operations Event Entries
        if (!db.objectStoreNames.contains('operationsEventEntries')) {
          const opsEventEntriesStore = db.createObjectStore('operationsEventEntries', { keyPath: 'id' });
          opsEventEntriesStore.createIndex('by-event-record', 'operationsEventRecordId');
          opsEventEntriesStore.createIndex('by-entry-type', 'entryType');
          opsEventEntriesStore.createIndex('by-updated', 'updatedAt');
        }

        // Segment Data (Shift and Crew Assignments)
        if (!db.objectStoreNames.contains('segmentData')) {
          const segDataStore = db.createObjectStore('segmentData', { keyPath: 'id' });
          segDataStore.createIndex('by-segment-resp', 'segmentResponseId');
          segDataStore.createIndex('by-shift', 'shiftId');
          segDataStore.createIndex('by-crew', 'crewId');
          segDataStore.createIndex('by-updated', 'updatedAt');
        }
      },
    });

    return this.db;
  }

  async add<K extends keyof ProcessDataDB>(storeName: K, record: Omit<ProcessDataDB[K]['value'], 'createdAt' | 'updatedAt' | 'version'>): Promise<void> {
    const db = await this.init();
    const now = new Date();
    const recordWithMetadata = {
      ...record,
      createdAt: now,
      updatedAt: now,
      version: 1,
    } as ProcessDataDB[K]['value'];
    await db.add(storeName, recordWithMetadata);
  }

  async put<K extends keyof ProcessDataDB>(storeName: K, record: Omit<ProcessDataDB[K]['value'], 'updatedAt' | 'version'> & { createdAt: Date; version: number }): Promise<void> {
    const db = await this.init();
    const recordWithMetadata = {
      ...record,
      updatedAt: new Date(),
      version: record.version + 1,
    } as ProcessDataDB[K]['value'];
    await db.put(storeName, recordWithMetadata);
  }

  async get<K extends keyof ProcessDataDB>(storeName: K, key: string): Promise<ProcessDataDB[K]['value'] | undefined> {
    const db = await this.init();
    return db.get(storeName, key);
  }

  async getAll<K extends keyof ProcessDataDB>(storeName: K): Promise<ProcessDataDB[K]['value'][]> {
    const db = await this.init();
    return db.getAll(storeName);
  }

  async getAllByIndex<K extends keyof ProcessDataDB>(
    storeName: K,
    indexName: string,
    query: string | Date
  ): Promise<ProcessDataDB[K]['value'][]> {
    const db = await this.init();
    return db.getAllFromIndex(storeName, indexName as any, query);
  }

  async delete<K extends keyof ProcessDataDB>(storeName: K, key: string): Promise<void> {
    const db = await this.init();
    await db.delete(storeName, key);
  }

  async clear<K extends keyof ProcessDataDB>(storeName: K): Promise<void> {
    const db = await this.init();
    await db.clear(storeName);
  }

  async saveGeneratedData(
    operationsRequest: Omit<OperationsRequestRecord, 'createdAt' | 'updatedAt' | 'version'>,
    segmentRequirements: Omit<SegmentRequirementRecord, 'createdAt' | 'updatedAt' | 'version'>[],
    materialRequirements: Omit<SegmentMaterialRequirementRecord, 'createdAt' | 'updatedAt' | 'version'>[],
    equipmentRequirements: Omit<SegmentEquipmentRequirementRecord, 'createdAt' | 'updatedAt' | 'version'>[]
  ): Promise<void> {
    const db = await this.init();
    const tx = db.transaction(
      ['operationsRequests', 'segmentRequirements', 'segmentMaterialRequirements', 'segmentEquipmentRequirements'],
      'readwrite'
    );

    const now = new Date();

    // Save operations request
    await tx.objectStore('operationsRequests').put({
      ...operationsRequest,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });

    // Save segment requirements
    for (const sr of segmentRequirements) {
      await tx.objectStore('segmentRequirements').put({
        ...sr,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
    }

    // Save material requirements
    for (const mr of materialRequirements) {
      await tx.objectStore('segmentMaterialRequirements').put({
        ...mr,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
    }

    // Save equipment requirements
    for (const er of equipmentRequirements) {
      await tx.objectStore('segmentEquipmentRequirements').put({
        ...er,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
    }

    await tx.done;
  }

  async getOperationsRequestWithRequirements(operationsRequestId: string): Promise<{
    operationsRequest: OperationsRequestRecord;
    segmentRequirements: SegmentRequirementRecord[];
    materialRequirements: SegmentMaterialRequirementRecord[];
    equipmentRequirements: SegmentEquipmentRequirementRecord[];
  } | null> {
    const db = await this.init();
    
    const operationsRequest = await db.get('operationsRequests', operationsRequestId);
    if (!operationsRequest) return null;

    const segmentRequirements = await db.getAllFromIndex('segmentRequirements', 'by-operation', operationsRequestId);
    
    const materialRequirements: SegmentMaterialRequirementRecord[] = [];
    const equipmentRequirements: SegmentEquipmentRequirementRecord[] = [];

    for (const sr of segmentRequirements) {
      const mats = await db.getAllFromIndex('segmentMaterialRequirements', 'by-segment-req', sr.id);
      materialRequirements.push(...mats);

      const eqs = await db.getAllFromIndex('segmentEquipmentRequirements', 'by-segment-req', sr.id);
      equipmentRequirements.push(...eqs);
    }

    return {
      operationsRequest,
      segmentRequirements,
      materialRequirements,
      equipmentRequirements,
    };
  }

  async saveActualData(
    operationsResponse: Omit<OperationsResponseRecord, 'createdAt' | 'updatedAt' | 'version'>,
    segmentResponses: Omit<SegmentResponseRecord, 'createdAt' | 'updatedAt' | 'version'>[],
    materialActuals: Omit<SegmentMaterialActualRecord, 'createdAt' | 'updatedAt' | 'version'>[],
    equipmentActuals: Omit<SegmentEquipmentActualRecord, 'createdAt' | 'updatedAt' | 'version'>[],
    equipmentPropertyTracking: Omit<EquipmentPropertyTrackingRecord, 'createdAt' | 'updatedAt' | 'version'>[],
    testResults: Omit<TestResultRecord, 'createdAt' | 'updatedAt' | 'version'>[],
    operationsEvents: Omit<OperationsEventRecord, 'createdAt' | 'updatedAt' | 'version'>[],
    operationsEventRecords: Omit<OperationsEventRecordRecord, 'createdAt' | 'updatedAt' | 'version'>[],
    operationsEventEntries: Omit<OperationsEventEntryRecord, 'createdAt' | 'updatedAt' | 'version'>[],
    segmentData: Omit<SegmentDataRecord, 'createdAt' | 'updatedAt' | 'version'>[]
  ): Promise<void> {
    const db = await this.init();
    const tx = db.transaction(
      ['operationsResponses', 'segmentResponses', 'segmentMaterialActuals', 'segmentEquipmentActuals', 'equipmentPropertyTracking', 'testResults', 'operationsEvents', 'operationsEventRecords', 'operationsEventEntries', 'segmentData'],
      'readwrite'
    );

    const now = new Date();

    // Save operations response
    await tx.objectStore('operationsResponses').put({
      ...operationsResponse,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });

    // Save segment responses
    for (const sr of segmentResponses) {
      await tx.objectStore('segmentResponses').put({
        ...sr,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
    }

    // Save material actuals
    for (const ma of materialActuals) {
      await tx.objectStore('segmentMaterialActuals').put({
        ...ma,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
    }

    // Save equipment actuals
    for (const ea of equipmentActuals) {
      await tx.objectStore('segmentEquipmentActuals').put({
        ...ea,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
    }

    // Save equipment property tracking
    for (const ept of equipmentPropertyTracking) {
      await tx.objectStore('equipmentPropertyTracking').put({
        ...ept,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
    }

    // Save test results
    for (const tr of testResults) {
      await tx.objectStore('testResults').put({
        ...tr,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
    }

    // Save operations events
    for (const oe of operationsEvents) {
      await tx.objectStore('operationsEvents').put({
        ...oe,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
    }

    // Save operations event records
    for (const oer of operationsEventRecords) {
      await tx.objectStore('operationsEventRecords').put({
        ...oer,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
    }

    // Save operations event entries
    for (const oee of operationsEventEntries) {
      await tx.objectStore('operationsEventEntries').put({
        ...oee,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
    }

    // Save segment data (shifts and crews)
    for (const sd of segmentData) {
      await tx.objectStore('segmentData').put({
        ...sd,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
    }

    await tx.done;
  }
}

export const processDataDB = new ProcessDataDBService();
