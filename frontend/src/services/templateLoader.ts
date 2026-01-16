import { csvParser, ParsedCSVData } from './csvParser';
import { masterDataDB } from './masterDataDB';

export class TemplateDataLoader {
  private readonly TEMPLATE_BASE_PATH = '/templates/masterdata';

  async loadAllTemplates(): Promise<ParsedCSVData> {
    const files = [
      { name: 'material_classes.csv', parser: 'materialClasses' },
      { name: 'materials.csv', parser: 'materials' },
      { name: 'material_lots.csv', parser: 'materialLots' },
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
      { name: 'hierarchy_scope.csv', parser: 'hierarchyScopes' },
      { name: 'hierarchy_scope_flat.csv', parser: 'hierarchyScopesFlat' },
      { name: 'shifts.csv', parser: 'shifts' },
      { name: 'crews.csv', parser: 'crews' },
      { name: 'shift_crew_assignments.csv', parser: 'shiftCrewAssignments' },
    ];

    const result: ParsedCSVData = {};

    for (const file of files) {
      try {
        const csvText = await this.fetchCSV(file.name);
        switch (file.parser) {
          case 'materialClasses':
            result.materialClasses = csvParser.parseMaterialClasses(csvText);
            break;
          case 'materials':
            result.materials = csvParser.parseMaterials(csvText);
            break;
          case 'materialLots':
            result.materialLots = csvParser.parseMaterialLots(csvText);
            break;
          case 'equipmentClasses':
            result.equipmentClasses = csvParser.parseEquipmentClasses(csvText);
            break;
          case 'equipment':
            result.equipment = csvParser.parseEquipment(csvText);
            break;
          case 'equipmentProperties':
            result.equipmentProperties = csvParser.parseEquipmentProperties(csvText);
            break;
          case 'equipmentPropertyAssignments':
            result.equipmentPropertyAssignments = csvParser.parseEquipmentPropertyAssignments(csvText);
            break;
          case 'processSegments':
            result.processSegments = csvParser.parseProcessSegments(csvText);
            break;
          case 'segmentBOMs':
            result.segmentBOMs = csvParser.parseSegmentBOMs(csvText);
            break;
          case 'equipmentUsages':
            result.equipmentUsages = csvParser.parseEquipmentUsages(csvText);
            break;
          case 'plants':
            result.plants = csvParser.parsePlants(csvText);
            break;
          case 'productionLines':
            result.productionLines = csvParser.parseProductionLines(csvText);
            break;
          case 'lineEquipment':
            result.lineEquipment = csvParser.parseLineEquipment(csvText);
            break;
          case 'operationEventDefinitions':
            result.operationEventDefinitions = csvParser.parseOperationEventDefinitions(csvText);
            break;
          case 'operationEventDefSegmentAssignments':
            result.operationEventDefSegmentAssignments = csvParser.parseOperationEventDefSegmentAssignments(csvText);
            break;
          case 'hierarchyScopes':
            result.hierarchyScopes = csvParser.parseHierarchyScopes(csvText);
            break;
          case 'hierarchyScopesFlat':
            result.hierarchyScopesFlat = csvParser.parseHierarchyScopesFlat(csvText);
            break;
          case 'shifts':
            result.shifts = csvParser.parseShifts(csvText);
            break;
          case 'crews':
            result.crews = csvParser.parseCrews(csvText);
            break;
          case 'shiftCrewAssignments':
            result.shiftCrewAssignments = csvParser.parseShiftCrewAssignments(csvText);
            break;
        }
      } catch (error) {
        console.error(`Failed to load ${file.name}:`, error);
      }
    }

    return result;
  }

  async fetchCSV(filename: string): Promise<string> {
    const response = await fetch(`${this.TEMPLATE_BASE_PATH}/${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${filename}: ${response.statusText}`);
    }
    return response.text();
  }

  async importTemplatesIntoDB(): Promise<void> {
    const data = await this.loadAllTemplates();
    console.log('Template data loaded:', {
      equipmentProperties: data.equipmentProperties?.length || 0,
      equipmentPropertyAssignments: data.equipmentPropertyAssignments?.length || 0,
      equipment: data.equipment?.length || 0,
      operationEventDefinitions: data.operationEventDefinitions?.length || 0,
      operationEventDefSegmentAssignments: data.operationEventDefSegmentAssignments?.length || 0
    });
    await masterDataDB.importFromCSV(data);
  }

  async resetToTemplateData(): Promise<void> {
    await masterDataDB.clearAll();
    await this.importTemplatesIntoDB();
  }
}

export const templateLoader = new TemplateDataLoader();
