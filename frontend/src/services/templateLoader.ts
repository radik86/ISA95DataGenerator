import { csvParser, ParsedCSVData } from './csvParser';
import { masterDataApi } from './masterDataApi';

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
      { name: 'material_class_properties.csv', parser: 'materialClassProperties' },
      { name: 'material_class_properties_assignments.csv', parser: 'materialClassPropertiesAssignments' },
      { name: 'material_class_properties_to_material_class_assignment.csv', parser: 'materialClassToPropertyAssignments' },
      { name: 'material_definition_property_template.csv', parser: 'materialDefinitionProperties' },
      { name: 'material_definition_property_assignment_template.csv', parser: 'materialDefinitionPropertyAssignments' },
      { name: 'equipment_classes.csv', parser: 'equipmentClasses' },
      { name: 'equipment.csv', parser: 'equipment' },
      { name: 'equipment_properties.csv', parser: 'equipmentProperties' },
      { name: 'equipment_property_assignments.csv', parser: 'equipmentPropertyAssignments' },
      { name: 'process_segments.csv', parser: 'processSegments' },
      { name: 'segment_material_bom.csv', parser: 'segmentBOMs' },
      { name: 'maintenance_bom.csv', parser: 'maintenanceBOMs' },
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
      { name: 'person_classes.csv', parser: 'personClasses' },
      { name: 'personnel_capabilities.csv', parser: 'personnelCapabilities' },
      { name: 'employees.csv', parser: 'employees' },
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
          case 'materialClassProperties':
            parsed = csvParser.parseMaterialClassProperties(csvText);
            result.materialClassProperties = parsed;
            break;
          case 'materialClassPropertiesAssignments':
            parsed = csvParser.parseMaterialClassPropertiesAssignments(csvText);
            result.materialClassPropertiesAssignments = parsed;
            break;
          case 'materialClassToPropertyAssignments':
            parsed = csvParser.parseMaterialClassToPropertyAssignments(csvText);
            result.materialClassToPropertyAssignments = parsed;
            break;
          case 'materialDefinitionPropertyAssignments':
            parsed = csvParser.parseMaterialDefinitionPropertyAssignments(csvText);
            console.log(`[TemplateLoader] Parsed ${parsed.length} material definition property assignments:`, parsed);
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
          case 'maintenanceBOMs':
            parsed = csvParser.parseMaintenanceBOMs(csvText);
            result.maintenanceBOMs = parsed;
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
          case 'personClasses':
            parsed = csvParser.parsePersonClasses(csvText);
            result.personClasses = parsed;
            break;
          case 'personnelCapabilities':
            parsed = csvParser.parsePersonnelCapabilities(csvText);
            result.personnelCapabilities = parsed;
            break;
          case 'employees':
            parsed = csvParser.parseEmployees(csvText);
            result.employees = parsed;
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

  private parseTemplateByKey(parserKey: string, csvText: string): any[] {
    switch (parserKey) {
      case 'materialClasses': return csvParser.parseMaterialClasses(csvText);
      case 'materials': return csvParser.parseMaterials(csvText);
      case 'materialLots': return csvParser.parseMaterialLots(csvText);
      case 'materialDefinitionProperties': return csvParser.parseMaterialDefinitionProperties(csvText);
      case 'materialClassProperties': return csvParser.parseMaterialClassProperties(csvText);
      case 'materialClassPropertiesAssignments': return csvParser.parseMaterialClassPropertiesAssignments(csvText);
      case 'materialClassToPropertyAssignments': return csvParser.parseMaterialClassToPropertyAssignments(csvText);
      case 'materialDefinitionPropertyAssignments': return csvParser.parseMaterialDefinitionPropertyAssignments(csvText);
      case 'equipmentClasses': return csvParser.parseEquipmentClasses(csvText);
      case 'equipment': return csvParser.parseEquipment(csvText);
      case 'equipmentProperties': return csvParser.parseEquipmentProperties(csvText);
      case 'equipmentPropertyAssignments': return csvParser.parseEquipmentPropertyAssignments(csvText);
      case 'equipmentClassProperties': return csvParser.parseEquipmentClassProperties(csvText);
      case 'equipmentClassPropertyAssignments': return csvParser.parseEquipmentClassPropertiesAssignments(csvText);
      case 'processSegments': return csvParser.parseProcessSegments(csvText);
      case 'segmentBOMs': return csvParser.parseSegmentBOMs(csvText);
      case 'maintenanceBOMs': return csvParser.parseMaintenanceBOMs(csvText);
      case 'equipmentUsages': return csvParser.parseEquipmentUsages(csvText);
      case 'plants': return csvParser.parsePlants(csvText);
      case 'productionLines': return csvParser.parseProductionLines(csvText);
      case 'lineEquipment': return csvParser.parseLineEquipment(csvText);
      case 'operationEventDefinitions': return csvParser.parseOperationEventDefinitions(csvText);
      case 'operationEventDefSegmentAssignments': return csvParser.parseOperationEventDefSegmentAssignments(csvText);
      case 'operationEventDefinitionProperties': return csvParser.parseOperationEventDefinitionProperties(csvText);
      case 'operationEventDefinitionPropertyAssignments': return csvParser.parseOperationEventDefinitionPropertyAssignments(csvText);
      case 'operationsEventClasses': return csvParser.parseOperationsEventClasses(csvText);
      case 'operationsEventRecords': return csvParser.parseOperationsEventRecords(csvText);
      case 'operationsEventEntries': return csvParser.parseOperationsEventEntries(csvText);
      case 'hierarchyScopes': return csvParser.parseHierarchyScopes(csvText);
      case 'hierarchyScopesFlat': return csvParser.parseHierarchyScopesFlat(csvText);
      case 'shifts': return csvParser.parseShifts(csvText);
      case 'crews': return csvParser.parseCrews(csvText);
      case 'shiftCrewAssignments': return csvParser.parseShiftCrewAssignments(csvText);
      case 'personClasses': return csvParser.parsePersonClasses(csvText);
      case 'personnelCapabilities': return csvParser.parsePersonnelCapabilities(csvText);
      case 'employees': return csvParser.parseEmployees(csvText);
      default: return [];
    }
  }

  /**
   * Resets a single store to its template data.
   * Non-destructive behavior: upserts template rows into the target store only.
   * Related stores are intentionally not cleared.
   */
  async resetSingleStoreToTemplate(storeName: string, csvFileName: string, parserKey: string, clearFirst: string[] = []): Promise<void> {
    const csvText = await this.fetchCSV(csvFileName);
    const data = this.parseTemplateByKey(parserKey, csvText);

    // clearFirst kept in signature for backward compatibility; intentionally unused.
    void clearFirst;

    if (data.length === 0) return;

    const existing = await masterDataApi.getAll<any>(storeName);
    const existingIds = new Set(existing.map((item: any) => item?.id).filter(Boolean));

    for (const row of data) {
      const id = (row as any)?.id;
      if (id && existingIds.has(id)) {
        await masterDataApi.update(storeName, row as any);
      } else {
        await masterDataApi.add(storeName, row as any);
      }
    }
  }

  /**
   * Loads all templates and imports them into the SQL Server database via API.
   * Merge/upsert mode by default to preserve user-added records.
   *
   * @param replaceExisting When true, clear existing master data before import.
   * @returns Promise that resolves when all data has been imported
   */
  async importTemplatesIntoDB(replaceExisting = false): Promise<void> {
    console.log('[TemplateLoader] Starting template import to DB');
    const csvData = await this.loadAllTemplates();
    console.log('[TemplateLoader] Loaded all templates, importing to DB');
    await masterDataApi.importFromCSV(csvData, replaceExisting);
    console.log('[TemplateLoader] Template import to DB completed');
  }

  /**
   * Clears all existing data and reloads from templates.
   * @returns Promise that resolves when data has been reset
   */
  async resetToTemplateData(): Promise<void> {
    console.log('[TemplateLoader] Starting data reset to templates');
    console.log('[TemplateLoader] Clearing database and importing templates');
    await this.importTemplatesIntoDB(true);
    console.log('[TemplateLoader] Data reset to templates completed');
  }
}

// Export a singleton instance for compatibility with existing imports
export const templateLoader = new TemplateDataLoader();
