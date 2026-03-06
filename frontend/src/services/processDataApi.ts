/**
 * Process Data API Service
 * Replaces IndexedDB (processDataDB) with SQL Server backend via GenericDataController.
 */
import type {
  OperationsRequestRecord,
  SegmentRequirementRecord,
  SegmentMaterialRequirementRecord,
  SegmentEquipmentRequirementRecord,
  OperationsResponseRecord,
  SegmentResponseRecord,
  SegmentMaterialActualRecord,
  SegmentEquipmentActualRecord,
  TestResultRecord,
  EquipmentPropertyTrackingRecord,
  OperationsEventRecord,
  OperationsEventRecordRecord,
  OperationsEventEntryRecord,
  OperationsEventPropertyRecord,
  SegmentDataRecord,
} from './processDataDB';

// Re-export record types so callers can switch imports easily
export type {
  OperationsRequestRecord,
  SegmentRequirementRecord,
  SegmentMaterialRequirementRecord,
  SegmentEquipmentRequirementRecord,
  OperationsResponseRecord,
  SegmentResponseRecord,
  SegmentMaterialActualRecord,
  SegmentEquipmentActualRecord,
  TestResultRecord,
  EquipmentPropertyTrackingRecord,
  OperationsEventRecord,
  OperationsEventRecordRecord,
  OperationsEventEntryRecord,
  OperationsEventPropertyRecord,
  SegmentDataRecord,
};

const API_BASE = 'http://localhost:5237/api/GenericData';

// Valid process-data store names (mirrors the IndexedDB schema)
export type ProcessDataStoreName =
  | 'operationsRequests'
  | 'segmentRequirements'
  | 'segmentMaterialRequirements'
  | 'segmentEquipmentRequirements'
  | 'operationsResponses'
  | 'segmentResponses'
  | 'segmentMaterialActuals'
  | 'segmentEquipmentActuals'
  | 'testResults'
  | 'equipmentPropertyTracking'
  | 'operationsEvents'
  | 'operationsEventRecords'
  | 'operationsEventEntries'
  | 'operationsEventProperties'
  | 'segmentData';

// ──────────────────────── helpers ────────────────────────

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  if (res.status === 204) return {} as T;
  return res.json();
}

// ──────────────────────── service ────────────────────────

class ProcessDataApiService {
  /** Metadata that was on IndexedDB records but the server doesn't need. */
  private withMeta<T extends Record<string, any>>(record: T): T & { createdAt: string; updatedAt: string; version: number; DataGeneratedAt: string; LastDataMigrationAt: string | null } {
    const now = new Date().toISOString();
    return {
      ...record,
      createdAt: (record as any).createdAt ?? now,
      updatedAt: now,
      version: ((record as any).version ?? 0) + 1,
      DataGeneratedAt: (record as any).DataGeneratedAt ?? (record as any).createdAt ?? now,
      LastDataMigrationAt: (record as any).LastDataMigrationAt ?? null,
    };
  }

  // ─── basic CRUD ───

  async add<K extends ProcessDataStoreName>(
    storeName: K,
    record: any,
  ): Promise<void> {
    const enriched = this.withMeta(record);
    await apiFetch(`${API_BASE}/${storeName}`, {
      method: 'POST',
      body: JSON.stringify(enriched),
    });
  }

  async put<K extends ProcessDataStoreName>(
    storeName: K,
    record: any,
  ): Promise<void> {
    const enriched = this.withMeta(record);
    await apiFetch(`${API_BASE}/${storeName}/${encodeURIComponent(record.id)}`, {
      method: 'PUT',
      body: JSON.stringify(enriched),
    });
  }

  async get<K extends ProcessDataStoreName>(
    storeName: K,
    key: string,
  ): Promise<any | undefined> {
    try {
      return await apiFetch<any>(`${API_BASE}/${storeName}/${encodeURIComponent(key)}`);
    } catch {
      return undefined;
    }
  }

  async getAll<K extends ProcessDataStoreName>(
    storeName: K,
  ): Promise<any[]> {
    try {
      return await apiFetch<any[]>(`${API_BASE}/${storeName}`);
    } catch (err) {
      console.error(`processDataApi.getAll(${storeName}) failed:`, err);
      return [];
    }
  }

  async getAllByIndex<K extends ProcessDataStoreName>(
    storeName: K,
    _indexName: string,
    query: string | Date,
  ): Promise<any[]> {
    // The generic store doesn't have indexes; fetch all and filter client-side.
    const all = await this.getAll(storeName);
    // indexName is like 'by-operation' → field is 'operationsRequestId', etc.
    // For simplicity, do client-side filter on the key referenced by indexName.
    // This only gets called in a few places.
    const val = typeof query === 'string' ? query : query.toISOString();
    return all.filter((r: any) => Object.values(r).includes(val));
  }

  async delete<K extends ProcessDataStoreName>(storeName: K, key: string): Promise<void> {
    await apiFetch(`${API_BASE}/${storeName}/${encodeURIComponent(key)}`, { method: 'DELETE' });
  }

  async clear<K extends ProcessDataStoreName>(storeName: K): Promise<void> {
    await apiFetch(`${API_BASE}/${storeName}`, { method: 'DELETE' });
  }

  // ─── compound save methods (mirror processDataDB) ───

  async saveGeneratedData(
    operationsRequest: Omit<OperationsRequestRecord, 'createdAt' | 'updatedAt' | 'version'>,
    segmentRequirements: Omit<SegmentRequirementRecord, 'createdAt' | 'updatedAt' | 'version'>[],
    materialRequirements: Omit<SegmentMaterialRequirementRecord, 'createdAt' | 'updatedAt' | 'version'>[],
    equipmentRequirements: Omit<SegmentEquipmentRequirementRecord, 'createdAt' | 'updatedAt' | 'version'>[],
  ): Promise<void> {
    const now = new Date().toISOString();
    const enrich = (r: any) => ({
      ...r,
      createdAt: r.createdAt ?? now,
      updatedAt: now,
      version: 1,
      DataGeneratedAt: r.DataGeneratedAt ?? r.createdAt ?? now,
      LastDataMigrationAt: r.LastDataMigrationAt ?? null,
    });

    const stores: Record<string, any[]> = {
      operationsRequests: [enrich(operationsRequest)],
      segmentRequirements: segmentRequirements.map(enrich),
      segmentMaterialRequirements: materialRequirements.map(enrich),
      segmentEquipmentRequirements: equipmentRequirements.map(enrich),
    };

    await apiFetch(`${API_BASE}/bulk-multi`, {
      method: 'POST',
      body: JSON.stringify({ stores }),
    });
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
    operationsEventProperties: Omit<OperationsEventPropertyRecord, 'createdAt' | 'updatedAt' | 'version'>[],
    segmentData: Omit<SegmentDataRecord, 'createdAt' | 'updatedAt' | 'version'>[],
  ): Promise<void> {
    const now = new Date().toISOString();
    const enrich = (r: any) => ({
      ...r,
      createdAt: r.createdAt ?? now,
      updatedAt: now,
      version: 1,
      DataGeneratedAt: r.DataGeneratedAt ?? r.createdAt ?? now,
      LastDataMigrationAt: r.LastDataMigrationAt ?? null,
    });

    const stores: Record<string, any[]> = {
      operationsResponses: [enrich(operationsResponse)],
      segmentResponses: segmentResponses.map(enrich),
      segmentMaterialActuals: materialActuals.map(enrich),
      segmentEquipmentActuals: equipmentActuals.map(enrich),
      equipmentPropertyTracking: equipmentPropertyTracking.map(enrich),
      testResults: testResults.map(enrich),
      operationsEvents: operationsEvents.map(enrich),
      operationsEventRecords: operationsEventRecords.map(enrich),
      operationsEventEntries: operationsEventEntries.map(enrich),
      operationsEventProperties: operationsEventProperties.map(enrich),
      segmentData: segmentData.map(enrich),
    };

    await apiFetch(`${API_BASE}/bulk-multi`, {
      method: 'POST',
      body: JSON.stringify({ stores }),
    });
  }

  async getOperationsRequestWithRequirements(operationsRequestId: string): Promise<{
    operationsRequest: OperationsRequestRecord;
    segmentRequirements: SegmentRequirementRecord[];
    materialRequirements: SegmentMaterialRequirementRecord[];
    equipmentRequirements: SegmentEquipmentRequirementRecord[];
  } | null> {
    const operationsRequest = await this.get('operationsRequests', operationsRequestId);
    if (!operationsRequest) return null;

    const allSegmentReqs = await this.getAll('segmentRequirements') as SegmentRequirementRecord[];
    const segmentRequirements = allSegmentReqs.filter(
      (sr) => sr.operationsRequestId === operationsRequestId,
    );

    const segReqIds = new Set(segmentRequirements.map((sr) => sr.id));

    const allMatReqs = await this.getAll('segmentMaterialRequirements') as SegmentMaterialRequirementRecord[];
    const materialRequirements = allMatReqs.filter((mr) => segReqIds.has(mr.segmentRequirementId));

    const allEqReqs = await this.getAll('segmentEquipmentRequirements') as SegmentEquipmentRequirementRecord[];
    const equipmentRequirements = allEqReqs.filter((er) => segReqIds.has(er.segmentRequirementId));

    return {
      operationsRequest,
      segmentRequirements,
      materialRequirements,
      equipmentRequirements,
    };
  }
}

export const processDataApi = new ProcessDataApiService();
