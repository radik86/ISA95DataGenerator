/**
 * Migration Config API Service
 * Replaces IndexedDB (migrationConfigDB) with SQL Server backend via GenericDataController.
 */

// Re-export types from migrationConfigDB so callers can switch imports
export type {
  FieldRuleConfig,
  FieldMapping,
  ColumnMapping,
  TableMapping,
  MigrationConfig,
} from './migrationConfigDB';

import type { TableMapping, MigrationConfig } from './migrationConfigDB';

const API_BASE = 'http://localhost:5237/api/GenericData';

// We use two logical stores inside GenericDataController:
//   "migrationConfigs"   – named saved configurations
//   "migrationCurrent"   – the single "current" working state

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

class MigrationConfigApiService {
  // ──────── current working mappings ────────

  async saveCurrentMappings(tableMappings: TableMapping[]): Promise<void> {
    const record = {
      id: 'current',
      tableMappings,
      updatedAt: new Date().toISOString(),
    };
    await apiFetch(`${API_BASE}/migrationCurrent/current`, {
      method: 'PUT',
      body: JSON.stringify(record),
    });
  }

  async loadCurrentMappings(): Promise<TableMapping[]> {
    try {
      const record = await apiFetch<{ tableMappings?: TableMapping[] }>(
        `${API_BASE}/migrationCurrent/current`,
      );
      return record?.tableMappings ?? [];
    } catch {
      return [];
    }
  }

  async clearCurrentMappings(): Promise<void> {
    try {
      await apiFetch(`${API_BASE}/migrationCurrent/current`, { method: 'DELETE' });
    } catch { /* ignore if already absent */ }
  }

  // ──────── named configurations ────────

  async saveConfig(name: string, tableMappings: TableMapping[]): Promise<string> {
    const id = `config_${Date.now()}`;
    const config: MigrationConfig = {
      id,
      name,
      tableMappings,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await apiFetch(`${API_BASE}/migrationConfigs`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
    return id;
  }

  async loadConfig(id: string): Promise<MigrationConfig | undefined> {
    try {
      return await apiFetch<MigrationConfig>(`${API_BASE}/migrationConfigs/${encodeURIComponent(id)}`);
    } catch {
      return undefined;
    }
  }

  async getAllConfigs(): Promise<MigrationConfig[]> {
    try {
      return await apiFetch<MigrationConfig[]>(`${API_BASE}/migrationConfigs`);
    } catch {
      return [];
    }
  }

  async deleteConfig(id: string): Promise<void> {
    await apiFetch(`${API_BASE}/migrationConfigs/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async updateConfig(id: string, name: string, tableMappings: TableMapping[]): Promise<void> {
    const existing = await this.loadConfig(id);
    const updated: MigrationConfig = {
      id,
      name,
      tableMappings,
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date(),
    };
    await apiFetch(`${API_BASE}/migrationConfigs/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updated),
    });
  }
}

export const migrationConfigApi = new MigrationConfigApiService();
