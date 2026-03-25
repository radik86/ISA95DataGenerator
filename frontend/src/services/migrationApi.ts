/**
 * Migration API Client — talks to the V2 backend-driven migration endpoints.
 * Replaces browser-side IndexedDB reads + File System Access API writes
 * with server-side SQL-Server reads + streaming CSV generation.
 */

const API_BASE_URL = 'http://localhost:5237/api/DataMigration';

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────

export interface MigrationSession {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  totalRecords: number;
  processedRecords: number;
  progressPercentage: number;
  errorMessage?: string;
}

export interface MigrationStatusResponse {
  sessionId: string;
  status: string;
  progressPercentage: number;
  processedRecords: number;
  totalRecords: number;
  errorMessage?: string;
  outputFiles: string[];
  log: string[];
}

// ─────────────────────────────────────────────
//  API Client
// ─────────────────────────────────────────────

export const migrationApi = {
  // ── Session management ──

  /** Create a new migration session */
  async createSession(name: string): Promise<MigrationSession> {
    const res = await fetch(`${API_BASE_URL}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error(`Failed to create session: ${await res.text()}`);
    return res.json();
  },

  /** Get session by ID */
  async getSession(sessionId: string): Promise<MigrationSession> {
    const res = await fetch(`${API_BASE_URL}/session/${sessionId}`);
    if (!res.ok) throw new Error(`Session not found: ${await res.text()}`);
    return res.json();
  },

  /** Delete session and all associated data */
  async deleteSession(sessionId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/session/${sessionId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete session: ${await res.text()}`);
  },

  // ── Source data upload (replaces IndexedDB reads) ──

  /**
   * Upload all records for a single store (e.g. "material_classes", "equipment").
   * The backend stores these in SQL Server for processing.
   */
  async uploadStoreData(sessionId: string, storeName: string, records: any[]): Promise<{ storeName: string; recordCount: number }> {
    const res = await fetch(`${API_BASE_URL}/session/${sessionId}/source-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeName, records }),
    });
    if (!res.ok) throw new Error(`Failed to upload ${storeName}: ${await res.text()}`);
    return res.json();
  },

  /**
   * Upload multiple stores in one request.
   * @param stores  Object with store names as keys and record arrays as values.
   */
  async uploadStoreDataBulk(
    sessionId: string,
    stores: Record<string, any[]>,
  ): Promise<{ storeCount: number; totalRecords: number }> {
    const res = await fetch(`${API_BASE_URL}/session/${sessionId}/source-data/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stores),
    });
    if (!res.ok) throw new Error(`Bulk upload failed: ${await res.text()}`);
    return res.json();
  },

  /** Clear all uploaded source data for a session */
  async clearSourceData(sessionId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/session/${sessionId}/source-data`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to clear source data: ${await res.text()}`);
  },

  // ── Execution ──

  /**
   * Start backend migration execution.
   * @param mappings The full table-mapping configuration array from the frontend.
   */
  async executeMigration(
    sessionId: string,
    mappings: any[],
    loadMode: 'full' | 'delta',
    maxFileSizeMb?: number,
    separateMasterProcessFiles?: boolean,
    sourceIncludeTimestampSuffix?: boolean,
    sourceSplitFiles?: boolean,
    preferServerSideSource?: boolean,
    minimalPersistenceMode?: boolean,
  ): Promise<{ message: string; sessionId: string }> {
    const res = await fetch(`${API_BASE_URL}/session/${sessionId}/execute-v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mappings,
        loadMode,
        maxFileSizeMb,
        separateMasterProcessFiles,
        sourceIncludeTimestampSuffix,
        sourceSplitFiles,
        preferServerSideSource,
        minimalPersistenceMode,
      }),
    });
    if (!res.ok) throw new Error(`Execute failed: ${await res.text()}`);
    return res.json();
  },

  /** Poll migration progress/status */
  async getStatus(sessionId: string): Promise<MigrationStatusResponse> {
    const res = await fetch(`${API_BASE_URL}/session/${sessionId}/status`);
    if (!res.ok) throw new Error(`Status check failed: ${await res.text()}`);
    return res.json();
  },

  // ── Download ──

  /** Download the migration output ZIP */
  async downloadZip(sessionId: string): Promise<Blob> {
    const res = await fetch(`${API_BASE_URL}/session/${sessionId}/download-zip`);
    if (!res.ok) throw new Error(`Download failed: ${await res.text()}`);
    return res.blob();
  },

  /** Download a specific output file by name */
  async downloadFile(sessionId: string, fileName: string): Promise<Blob> {
    const res = await fetch(`${API_BASE_URL}/session/${sessionId}/download/${fileName}`);
    if (!res.ok) throw new Error(`Download failed: ${await res.text()}`);
    return res.blob();
  },

  // ── Utility ──

  /** Trigger file download in browser */
  triggerDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

export default migrationApi;
