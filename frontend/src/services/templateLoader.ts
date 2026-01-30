import { csvParser, ParsedCSVData } from './csvParser';
import { masterDataDB } from './masterDataDB';

export class TemplateDataLoader {
    /**
     * Fetches a CSV file from the templates/masterdata directory in the public folder.
     * @param fileName The name of the CSV file to fetch
     * @returns The CSV file contents as a string
     */
    async fetchCSV(fileName: string): Promise<string> {
      const url = `${this.TEMPLATE_BASE_PATH}/${fileName}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${fileName} (status: ${response.status})`);
      }
      return await response.text();
    }

  private readonly TEMPLATE_BASE_PATH = '/templates/masterdata';

  async loadAllTemplates(): Promise<ParsedCSVData> {
    console.log('[TemplateLoader] Starting to load all templates');
    const files = [
      { name: 'material_classes.csv', parser: 'materialClasses' },
      { name: 'materials.csv', parser: 'materials' },
      { name: 'material_lots.csv', parser: 'materialLots' },
      { name: 'material_definition_property_template.csv', parser: 'materialDefinitionProperties' },
      { name: 'material_definition_property_assignment_template.csv', parser: 'materialDefinitionPropertyAssignments' },
      { name: 'equipment_classes.csv', parser: 'equipmentClasses' },
      { name: 'equipment.csv', parser: 'equipment' },
      { name: 'equipment_properties.csv', parser: 'equipmentProperties' },
      { name: 'equipment_property_assignments.csv', parser: 'equipmentPropertyAssignments' },
      { name: 'process_segments.csv', parser: 'processSegments' },
      { name: 'segment_material_bom.csv', parser: 'segmentBOMs' },
      { name: 'equipment_usage.csv', parser: 'equipmentUsages' },
      { name: 'plants.csv', parser: 'plants' },
      { name: 'production_lines.csv', parser: 'productionLines' },
      { name: 'line_equipment.csv', parser: 'lineEquipment' },
      { name: 'operation_event_definitions.csv', parser: 'operationEventDefinitions' },
      { name: 'operations_event_definition_segment_assignments.csv', parser: 'operationEventDefSegmentAssignments' },
      { name: 'operation_event_definition_property.csv', parser: 'operationEventDefinitionProperties' },
      { name: 'operation_event_definition_property_assignment.csv', parser: 'operationEventDefinitionPropertyAssignments' },
      { name: 'operations_event_classes.csv', parser: 'operationsEventClasses' },
      { name: 'operations_event_records_template.csv', parser: 'operationsEventRecords' },
      { name: 'operations_event_entries_template.csv', parser: 'operationsEventEntries' },
      { name: 'hierarchy_scope.csv', parser: 'hierarchyScopes' },
      { name: 'hierarchy_scope_flat.csv', parser: 'hierarchyScopesFlat' },
      { name: 'shifts.csv', parser: 'shifts' },
      { name: 'crews.csv', parser: 'crews' },
      { name: 'shift_crew_assignments.csv', parser: 'shiftCrewAssignments' },
      { name: 'equipment_class_properties.csv', parser: 'equipmentClassProperties' },
      { name: 'equipment_class_properties_assignment.csv', parser: 'equipmentClassPropertyAssignments' },
    ];

    const result: ParsedCSVData = {};

    for (const file of files) {
      try {
        console.log(`[TemplateLoader] ---\n[FILE] ${file.name}\n[PARSER] ${file.parser}`);
        const csvText = await this.fetchCSV(file.name);
        console.log(`[TemplateLoader] [LOADED] ${file.name} (chars: ${csvText?.length})`);
        let parsed: any[] = [];
        switch (file.parser) {
          case 'materialClasses':
            parsed = csvParser.parseMaterialClasses(csvText);
            result.materialClasses = parsed;
            break;
          case 'materials':
            parsed = csvParser.parseMaterials(csvText);
            result.materials = parsed;
            break;
          case 'materialLots':
            parsed = csvParser.parseMaterialLots(csvText);
            result.materialLots = parsed;
            break;
          case 'materialDefinitionProperties':
            parsed = csvParser.parseMaterialDefinitionProperties(csvText);
            result.materialDefinitionProperties = parsed;
            break;
          case 'materialDefinitionPropertyAssignments':
            parsed = csvParser.parseMaterialDefinitionPropertyAssignments(csvText);
            result.materialDefinitionPropertyAssignments = parsed;
            break;
          case 'equipmentClasses':
            parsed = csvParser.parseEquipmentClasses(csvText);
            result.equipmentClasses = parsed;
            break;
          case 'equipment':
            parsed = csvParser.parseEquipment(csvText);
            result.equipment = parsed;
            break;
          case 'equipmentProperties':
            parsed = csvParser.parseEquipmentProperties(csvText);
            result.equipmentProperties = parsed;
            break;
          case 'equipmentPropertyAssignments':
            parsed = csvParser.parseEquipmentPropertyAssignments(csvText);
            result.equipmentPropertyAssignments = parsed;
            break;
          case 'processSegments':
            parsed = csvParser.parseProcessSegments(csvText);
            result.processSegments = parsed;
            break;
          case 'segmentBOMs':
            parsed = csvParser.parseSegmentBOMs(csvText);
            result.segmentBOMs = parsed;
            break;
          case 'equipmentUsages':
            parsed = csvParser.parseEquipmentUsages(csvText);
            result.equipmentUsages = parsed;
            break;
          case 'plants':
            parsed = csvParser.parsePlants(csvText);
            result.plants = parsed;
            break;
          case 'productionLines':
            parsed = csvParser.parseProductionLines(csvText);
            result.productionLines = parsed;
            break;
          case 'lineEquipment':
            parsed = csvParser.parseLineEquipment(csvText);
            result.lineEquipment = parsed;
            break;
          case 'operationEventDefinitions':
            parsed = csvParser.parseOperationEventDefinitions(csvText);
            result.operationEventDefinitions = parsed;
            break;
          case 'operationEventDefSegmentAssignments':
            parsed = csvParser.parseOperationEventDefSegmentAssignments(csvText);
            result.operationEventDefSegmentAssignments = parsed;
            break;
          case 'operationEventDefinitionProperties':
            parsed = csvParser.parseOperationEventDefinitionProperties(csvText);
            result.operationEventDefinitionProperties = parsed;
            break;
          case 'operationEventDefinitionPropertyAssignments':
            parsed = csvParser.parseOperationEventDefinitionPropertyAssignments(csvText);
            result.operationEventDefinitionPropertyAssignments = parsed;
            break;
          case 'operationsEventClasses':
            parsed = csvParser.parseOperationsEventClasses(csvText);
            result.operationsEventClasses = parsed;
            break;
          case 'operationsEventRecords':
            parsed = csvParser.parseOperationsEventRecords(csvText);
            result.operationsEventRecords = parsed;
            break;
          case 'operationsEventEntries':
            parsed = csvParser.parseOperationsEventEntries(csvText);
            result.operationsEventEntries = parsed;
            break;
          case 'hierarchyScopes':
            parsed = csvParser.parseHierarchyScopes(csvText);
            result.hierarchyScopes = parsed;
            break;
          case 'hierarchyScopesFlat':
            parsed = csvParser.parseHierarchyScopesFlat(csvText);
            result.hierarchyScopesFlat = parsed;
            break;
          case 'shifts':
            parsed = csvParser.parseShifts(csvText);
            result.shifts = parsed;
            break;
          case 'crews':
            parsed = csvParser.parseCrews(csvText);
            result.crews = parsed;
            break;
          case 'shiftCrewAssignments':
            parsed = csvParser.parseShiftCrewAssignments(csvText);
            result.shiftCrewAssignments = parsed;
            break;
          case 'equipmentClassProperties':
            parsed = csvParser.parseEquipmentClassProperties(csvText);
            result.equipmentClassProperties = parsed;
            break;
          case 'equipmentClassPropertyAssignments':
            parsed = csvParser.parseEquipmentClassPropertiesAssignments(csvText);
            result.equipmentClassPropertiesAssignments = parsed;
            break;
        }
        console.log(`[TemplateLoader] [PARSED] ${file.name} -> ${parsed.length} records`);
      } catch (error) {
        console.error(`Failed to load ${file.name}:`, error);
      }
    }
    return result;
  }

  /**
   * Loads all templates and imports them into the IndexedDB database.
   * @returns Promise that resolves when all data has been imported
   */
  async importTemplatesIntoDB(): Promise<void> {
    console.log('[TemplateLoader] Starting template import to DB');
    const csvData = await this.loadAllTemplates();
    console.log('[TemplateLoader] Loaded all templates, importing to DB');
    await masterDataDB.importFromCSV(csvData);
    console.log('[TemplateLoader] Template import to DB completed');
  }

  /**
   * Clears all existing data and reloads from templates.
   * @returns Promise that resolves when data has been reset
   */
  async resetToTemplateData(): Promise<void> {
    console.log('[TemplateLoader] Starting data reset to templates');
    await masterDataDB.clearAll();
    console.log('[TemplateLoader] Database cleared, importing templates');
    await this.importTemplatesIntoDB();
    console.log('[TemplateLoader] Data reset to templates completed');
  }
}

// Export a singleton instance for compatibility with existing imports
export const templateLoader = new TemplateDataLoader();
