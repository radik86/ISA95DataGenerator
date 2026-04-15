import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Re-export types from DataMigration component to ensure type compatibility
export interface FieldRuleConfig {
  ruleType: string;
  parameters: Record<string, any>;
}

export interface FieldMapping {
  fieldName: string;
  sourceColumn?: string;
  sourceEntity?: string;
  generate: boolean;
  transformation?: string;
  fieldRule?: FieldRuleConfig;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  transformation?: string;
}

export interface TableMapping {
  sourceTable: string;
  targetEntity: string;
  mappings: ColumnMapping[];
  fieldMappings: FieldMapping[];
  enabled: boolean;
  primaryKeyField?: string;
  primaryKeyRule?: FieldRuleConfig;
  isBridge?: boolean;
  bridgeEntity1?: string;
  bridgeEntity1Column?: string;
  bridgeEntity2?: string;
  bridgeEntity2Column?: string;
  relationshipType?: string;
}

export interface MigrationConfig {
  id: string;
  name: string;
  tableMappings: TableMapping[];
  createdAt: Date;
  updatedAt: Date;
}

// Database Schema
interface MigrationConfigDB extends DBSchema {
  configs: {
    key: string;
    value: MigrationConfig;
    indexes: { 'by-updated': Date };
  };
  currentConfig: {
    key: string;
    value: {
      id: string;
      tableMappings: TableMapping[];
      updatedAt: Date;
    };
  };
}

class MigrationConfigDatabase {
  private dbPromise: Promise<IDBPDatabase<MigrationConfigDB>>;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private async initDB(): Promise<IDBPDatabase<MigrationConfigDB>> {
    return openDB<MigrationConfigDB>('migration-config-db', 1, {
      upgrade(db) {
        // Migration configurations store
        if (!db.objectStoreNames.contains('configs')) {
          const configStore = db.createObjectStore('configs', { keyPath: 'id' });
          configStore.createIndex('by-updated', 'updatedAt');
        }

        // Current working configuration store
        if (!db.objectStoreNames.contains('currentConfig')) {
          db.createObjectStore('currentConfig', { keyPath: 'id' });
        }
      },
    });
  }

  // Save current working mappings
  async saveCurrentMappings(tableMappings: TableMapping[]): Promise<void> {
    const db = await this.dbPromise;
    await db.put('currentConfig', {
      id: 'current',
      tableMappings,
      updatedAt: new Date(),
    });
  }

  // Load current working mappings
  async loadCurrentMappings(): Promise<TableMapping[]> {
    const db = await this.dbPromise;
    const current = await db.get('currentConfig', 'current');
    return current?.tableMappings || [];
  }

  // Clear current working mappings
  async clearCurrentMappings(): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('currentConfig', 'current');
  }

  // Save named configuration
  async saveConfig(name: string, tableMappings: TableMapping[]): Promise<string> {
    const db = await this.dbPromise;
    const id = `config_${Date.now()}`;
    const config: MigrationConfig = {
      id,
      name,
      tableMappings,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.put('configs', config);
    return id;
  }

  // Load named configuration
  async loadConfig(id: string): Promise<MigrationConfig | undefined> {
    const db = await this.dbPromise;
    return await db.get('configs', id);
  }

  // Get all saved configurations
  async getAllConfigs(): Promise<MigrationConfig[]> {
    const db = await this.dbPromise;
    return await db.getAll('configs');
  }

  // Delete configuration
  async deleteConfig(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('configs', id);
  }

  // Update configuration
  async updateConfig(id: string, name: string, tableMappings: TableMapping[]): Promise<void> {
    const db = await this.dbPromise;
    const existing = await db.get('configs', id);
    if (existing) {
      const updated: MigrationConfig = {
        ...existing,
        name,
        tableMappings,
        updatedAt: new Date(),
      };
      await db.put('configs', updated);
    }
  }
}

export const migrationConfigDB = new MigrationConfigDatabase();
