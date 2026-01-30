import { masterDataDB, HierarchyScopeFlatRecord, HierarchyScopeRecord, HierarchyScopeParentChildRecord } from './masterDataDB';

/**
 * Parent-child relationship for equipment levels
 */
interface HierarchyScopeParentChild {
  id: string;
  parentEquipmentLevel: string;
  parentEquipmentID: string;
  childEquipmentLevel: string;
  childEquipmentID: string;
}

/**
 * Converts flat hierarchy scope structure to row-based structure
 * The flat structure has columns for each equipment level
 * The row-based structure has one row per equipment level with equipmentID and equipmentLevel
 */
export class HierarchyScopeConverter {
  
  /**
   * Equipment levels in hierarchical order
   */
  private readonly equipmentLevels = [
    'Enterprise',
    'Site',
    'Area',
    'Work Center',
    'Work Unit',
    'Process Cell',
    'Unit',
    'Production Line',
    'Production Unit',
    'Work Cell',
    'Storage Zone',
    'Storage Unit'
  ];

  /**
   * Parent-child relationships between equipment levels
   */
  private readonly levelHierarchy: Record<string, string> = {
    'Site': 'Enterprise',
    'Area': 'Site',
    'Work Center': 'Area',
    'Work Unit': 'Work Center',
    'Process Cell': 'Work Unit',
    'Unit': 'Process Cell',
    'Production Line': 'Unit',
    'Production Unit': 'Production Line',
    'Work Cell': 'Production Unit',
    'Storage Zone': 'Work Cell',
    'Storage Unit': 'Storage Zone'
  };

  /**
   * Convert flat records to row-based records
   * @param flatRecords - Array of flat hierarchy scope records
   * @param plants - Array of plant records (for Site level mapping)
   * @param productionLines - Array of production line records (for Production Line level mapping)
   * @returns Object containing row-based records and equipment ID to row-based ID mapping
   */
  async convertFlatToRowBased(
    flatRecords: HierarchyScopeFlatRecord[],
    plants: any[],
    productionLines: any[]
  ): Promise<{ records: HierarchyScopeRecord[]; equipmentIdMapping: Map<string, string> }> {
    const result: HierarchyScopeRecord[] = [];
    const uniqueEntries = new Set<string>(); // To avoid duplicates
    const equipmentIdMapping = new Map<string, string>(); // Maps equipmentID+level to row-based ID

    console.log('[Converter] Starting conversion of', flatRecords.length, 'flat records');
    console.log('[Converter] Plants:', plants.length, 'Production Lines:', productionLines.length);

    for (const flatRecord of flatRecords) {
      // Get the site/plant ID for this row
      const siteId = flatRecord.Site;
      // For each equipment level in the flat record, create a row-based record
      for (const level of this.equipmentLevels) {
        const equipmentID = flatRecord[level as keyof HierarchyScopeFlatRecord] as string;
        if (!equipmentID || equipmentID === '') {
          continue; // Skip empty levels
        }
        // Create unique key to avoid duplicates
        const uniqueKey = `${equipmentID}-${level}`;
        if (uniqueEntries.has(uniqueKey)) {
          continue; // Skip if already added
        }
        let rowBasedId = '';
        let mappedEquipmentID = equipmentID;
        // Enterprise level: do not include plantId
        if (level === 'Enterprise') {
          rowBasedId = `HS-${equipmentID}-Enterprise`;
          result.push({
            id: rowBasedId,
            equipmentID,
            equipmentLevel: level,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1
          });
          uniqueEntries.add(uniqueKey);
          equipmentIdMapping.set(`${equipmentID}-${level}`, rowBasedId);
        }
        // Site/Plant level: do not include plantId in key, just use plant id
        else if (level === 'Site') {
          const plant = plants.find(p => p.id === equipmentID || p.name === equipmentID);
          if (plant) {
            mappedEquipmentID = plant.id;
            rowBasedId = `HS-${plant.id}-Site`;
            result.push({
              id: rowBasedId,
              equipmentID: plant.id,
              equipmentLevel: 'Site',
              createdAt: new Date(),
              updatedAt: new Date(),
              version: 1
            });
            uniqueEntries.add(uniqueKey);
            equipmentIdMapping.set(`${equipmentID}-${level}`, rowBasedId);
            console.log('[Converter] Mapped Site:', equipmentID, '->', plant.id, 'ID:', rowBasedId);
          } else {
            console.warn('[Converter] No plant found for Site:', equipmentID);
          }
        }
        // For all levels below Site, include plantId in the key
        else if (siteId) {
          if (level === 'Production Line') {
            const prodLine = productionLines.find(pl => pl.id === equipmentID || pl.name === equipmentID);
            if (prodLine) {
              mappedEquipmentID = prodLine.id;
              rowBasedId = `HS-${siteId}-${prodLine.id}-ProductionLine`;
              result.push({
                id: rowBasedId,
                equipmentID: prodLine.id,
                equipmentLevel: 'Production Line',
                createdAt: new Date(),
                updatedAt: new Date(),
                version: 1
              });
              uniqueEntries.add(uniqueKey);
              equipmentIdMapping.set(`${equipmentID}-${level}`, rowBasedId);
              console.log('[Converter] Mapped Production Line:', equipmentID, '->', prodLine.id, 'ID:', rowBasedId);
            } else {
              console.warn('[Converter] No production line found for:', equipmentID);
            }
          } else {
            rowBasedId = `HS-${siteId}-${equipmentID}-${level.replace(/\s+/g, '')}`;
            result.push({
              id: rowBasedId,
              equipmentID,
              equipmentLevel: level,
              createdAt: new Date(),
              updatedAt: new Date(),
              version: 1
            });
            uniqueEntries.add(uniqueKey);
            equipmentIdMapping.set(`${equipmentID}-${level}`, rowBasedId);
          }
        }
      }
    }

    console.log('[Converter] Conversion complete. Generated', result.length, 'row-based records');
    return { records: result, equipmentIdMapping };
  }

  /**
   * Generate parent-child relationships from flat records
   * @param flatRecords - Array of flat hierarchy scope records
   * @param equipmentIdMapping - Map of equipment ID + level to row-based ID
   * @returns Array of parent-child relationship records
   */
  generateParentChildRelationships(
    flatRecords: HierarchyScopeFlatRecord[],
    equipmentIdMapping: Map<string, string>
  ): HierarchyScopeParentChild[] {
    const relationships: HierarchyScopeParentChild[] = [];
    const uniqueRelationships = new Set<string>(); // Track unique parent-child pairs
    let relationshipId = 1;

    console.log('[Converter] Generating parent-child relationships from', flatRecords.length, 'flat records');

    for (const flatRecord of flatRecords) {
      // For each equipment level, create a relationship with its parent
      for (let i = 1; i < this.equipmentLevels.length; i++) {
        const childLevel = this.equipmentLevels[i];
        const parentLevel = this.levelHierarchy[childLevel];
        
        if (!parentLevel) continue;

        const childEquipmentID = flatRecord[childLevel as keyof HierarchyScopeFlatRecord] as string;
        const parentEquipmentID = flatRecord[parentLevel as keyof HierarchyScopeFlatRecord] as string;

        if (childEquipmentID && parentEquipmentID) {
          // Get row-based IDs from mapping
          const parentRowBasedId = equipmentIdMapping.get(`${parentEquipmentID}-${parentLevel}`);
          const childRowBasedId = equipmentIdMapping.get(`${childEquipmentID}-${childLevel}`);

          if (parentRowBasedId && childRowBasedId) {
            // Create unique key to avoid duplicate relationships
            const relationshipKey = `${parentRowBasedId}|${childRowBasedId}`;
            
            if (!uniqueRelationships.has(relationshipKey)) {
              relationships.push({
                id: `HSPC-${String(relationshipId++).padStart(4, '0')}`,
                parentEquipmentLevel: parentLevel,
                parentEquipmentID: parentRowBasedId,
                childEquipmentLevel: childLevel,
                childEquipmentID: childRowBasedId
              });
              uniqueRelationships.add(relationshipKey);
            }
          } else {
            console.warn('[Converter] Missing row-based ID for relationship:', {
              parent: `${parentEquipmentID}-${parentLevel}`,
              child: `${childEquipmentID}-${childLevel}`,
              parentRowBasedId,
              childRowBasedId
            });
          }
        }
      }
    }

    console.log('[Converter] Generated', relationships.length, 'unique parent-child relationships');
    return relationships;
  }

  /**
   * Generate CSV content from parent-child relationships
   * @param relationships - Array of parent-child relationship records
   * @returns CSV string
   */
  generateParentChildCSV(relationships: HierarchyScopeParentChild[]): string {
    const header = 'id,parentEquipmentLevel,parentEquipmentID,childEquipmentLevel,childEquipmentID\n';
    const rows = relationships.map(r => 
      `${r.id},${r.parentEquipmentLevel},${r.parentEquipmentID},${r.childEquipmentLevel},${r.childEquipmentID}`
    ).join('\n');
    return header + rows;
  }

  /**
   * Download parent-child relationships as CSV file
   * @param relationships - Array of parent-child relationship records
   */
  downloadParentChildCSV(relationships: HierarchyScopeParentChild[]): void {
    const csvContent = this.generateParentChildCSV(relationships);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'hierarchy_scope_parent_child.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('[Converter] Downloaded parent-child CSV file');
  }

  /**
   * Convert and save flat records to row-based format in the database
   */
  async convertAndSave(): Promise<{ success: boolean; recordCount: number; message: string }> {
    try {
      // Load flat records from database
      const flatRecords = await masterDataDB.getAll('hierarchyScopesFlat');
      
      if (!flatRecords || flatRecords.length === 0) {
        return {
          success: false,
          recordCount: 0,
          message: 'No flat hierarchy scope records found. Please import hierarchy_scope_flat.csv first.'
        };
      }

      // Load plants and production lines for mapping
      const plants = await masterDataDB.getAll('plants');
      const productionLines = await masterDataDB.getAll('productionLines');

      console.log('[Converter] Loaded', flatRecords.length, 'flat records,', plants.length, 'plants,', productionLines.length, 'production lines');

      // Convert flat to row-based
      const { records: rowBasedRecords, equipmentIdMapping } = await this.convertFlatToRowBased(flatRecords, plants, productionLines);

      if (rowBasedRecords.length === 0) {
        return {
          success: false,
          recordCount: 0,
          message: 'No records were generated. Check console for warnings.'
        };
      }

      // Clear existing hierarchy scopes
      await masterDataDB.clear('hierarchyScopes');
      console.log('[Converter] Cleared existing hierarchy scopes');

      // Save row-based records
      await masterDataDB.bulkAdd('hierarchyScopes', rowBasedRecords);
      console.log('[Converter] Saved', rowBasedRecords.length, 'row-based records');

      // Generate parent-child relationships using the equipment ID mapping
      const relationships = this.generateParentChildRelationships(flatRecords, equipmentIdMapping);
      
      // Save parent-child relationships to database
      await masterDataDB.clear('hierarchyScopeParentChild');
      console.log('[Converter] Cleared existing parent-child relationships');
      
      const relationshipRecords: HierarchyScopeParentChildRecord[] = relationships.map(r => ({
        ...r,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      await masterDataDB.bulkAdd('hierarchyScopeParentChild', relationshipRecords);
      console.log('[Converter] Saved', relationshipRecords.length, 'parent-child relationships');
      
      // Download parent-child CSV
      this.downloadParentChildCSV(relationships);

      return {
        success: true,
        recordCount: rowBasedRecords.length,
        message: `Successfully converted ${flatRecords.length} flat records into ${rowBasedRecords.length} row-based hierarchy scope records and ${relationships.length} parent-child relationships.`
      };

    } catch (error) {
      console.error('[Converter] Error during conversion:', error);
      return {
        success: false,
        recordCount: 0,
        message: `Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Singleton instance
export const hierarchyScopeConverter = new HierarchyScopeConverter();
