import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Snackbar,
  Divider,
  Checkbox,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import { masterDataApi } from '../services/masterDataApi';
import { templateLoader } from '../services/templateLoader';

// Data Interfaces
interface MaterialClass {
  id: string;
  name: string;
  description: string;
}

interface Material {
  id: string;
  name: string;
  classId: string;
  className: string;
  defaultUoM: string;
  description: string;
}

interface MaterialLot {
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

interface MaterialSublot {
  id: string;
  materialLotId: string;
  quantity: number;
  quantityUnitOfMeasure: string;
  storageLocation?: string;
  status?: string;
  disposition?: string;
}

interface EquipmentClass {
  id: string;
  name: string;
  description: string;
  parentId?: string;
}

interface Equipment {
  id: string;
  name: string;
  classId: string;
  className: string;
  description?: string;
  productionLineId?: string;
  parentEquipmentId?: string;
}

interface EquipmentProperty {
  id: string;
  name: string;
  description: string;
  valueDataType: string;
  unit?: string;
  minValue?: number | string;
  maxValue?: number | string;
}

interface EquipmentPropertyAssignment {
  id: string;
  equipmentId: string;
  processSegmentId: string;
  equipmentPropertyId: string;
  samplingMode: string;
  samplingIntervalSeconds?: number;
}

interface EquipmentClassProperty {
  id: string;
  equipmentClassId: string;
  propertyName: string;
  description: string;
  valueDataType: string;
  unit?: string;
  minValue?: number | string;
  maxValue?: number | string;
}


interface EquipmentClassPropertyAssignment {
  id: string;
  equipmentClassPropertyId: string;
  equipmentPropertyId: string;
  propertyName: string;
  description: string;
  valueDataType: string;
  unit?: string;
  minValue?: number | string;
  maxValue?: number | string;
}

interface ProcessSegment {
  id: string;
  productMaterialId: string;
  name: string;
  sequence: number;
  durationHours: number;
}

interface SegmentMaterialBOM {
  id: string;
  processSegmentId: string;
  materialId: string;
  qtyPerUnit: number;
  uom: string;
  materialUse: string;
}

interface MaintenanceBOM {
  id: string;
  equipmentId: string;
  processSegmentId: string;
  processSegmentSequence: number;
  materialId: string;
  qtyPerUnit: number;
  personQuantity: number;
  personQuantityUoM: 'Person' | 'FTE';
  employeeId: string;
  personClassId: string;
  uom: string;
  materialUse: string;
}

interface EquipmentUsage {
  id: string;
  processSegmentId: string;
  equipmentId: string;
  role: string;
  capacityPerRun: number;
}

interface Plant {
  id: string;
  name: string;
  location: string;
  description: string;
}

interface ProductionLine {
  id: string;
  plantId: string;
  name: string;
  description: string;
}

interface LineEquipment {
  id: string;
  productionLineId: string;
  equipmentId: string;
  sequence: number;
  description: string;
  plantId?: string;
}

interface OperationEventDefinition {
  id: string;
  eventCategory: string;
  eventCode: string;
  description: string;
  causesDowntime: boolean;
  causesScrap: boolean;
  rootCauseType: string;
  eventType: string;
}

interface OperationEventDefinitionProperty {
  id: string;
  possibleValues: string;
  valueUnitOfMeasure: string;
}

interface OperationEventDefinitionPropertyAssignment {
  id: string;
  operationsEventDefinitionId: string;
  operationsEventDefinitionPropertyId: string;
  value: string;
  valueUnitOfMeasure: string;
}

interface OperationsEventClass {
  OperationsEventClassID: string;
  ClassName: string;
  Description: string;
}

interface OperationsEventRecord {
  id: string;
  OperationsEventRecordID: string;
  OperationsEventDefinitionID: string;
  Severity: string;
  Status: string;
  Comments: string;
}

interface OperationsEventEntry {
  id: string;
  OperationsEventEntryID: string;
  OperationsEventRecordID: string;
  EntryType: string;
  Description: string;
}

interface HierarchyScope {
  id: string;
  equipmentID: string;
  equipmentLevel: string;
}

interface HierarchyScopeFlat {
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

interface HierarchyScopeParentChild {
  id: string;
  parentEquipmentLevel: string;
  parentEquipmentID: string;
  childEquipmentLevel: string;
  childEquipmentID: string;
}

interface OperationEventDefSegmentAssignment {
  id: string;
  operationsEventDefinitionId: string;
  processSegmentId: string;
  startOrEndEvent: string;
  isMandatory: boolean;
  isPrimarySegment: boolean;
  notes: string;
}

interface Shift {
  id: string;
  shiftNumber: number;
  shiftName: string;
  startTime: string;
  endTime: string;
  description: string;
}

interface Crew {
  id: string;
  crewName: string;
  peopleCount: number;
  skills: string;
  description: string;
}

interface ShiftCrewAssignment {
  id: string;
  shiftId: string;
  crewId: string;
  effectiveDate: string;
  expiryDate: string;
}

interface PersonClass {
  id: string;
  name: string;
  description: string;
}

interface PersonnelCapability {
  id: string;
  capabilityName: string;
  description: string;
}

interface Employee {
  id: string;
  employeeName: string;
  personClassId: string;
  personnelCapabilityId: string;
  email: string;
  phoneNumber: string;
  description: string;
}

interface MaterialDefinitionProperty {
  id: string;
  value: string;
  description: string;
  valueUnitOfMeasure: string;
}

interface MaterialClassProperty {
  id: string;
  propertyName: string;
  description: string;
  valueDataType: string;
  unit: string;
  minValue: string;
  maxValue: string;
}

interface MaterialClassPropertyAssignment {
  id: string;
  materialClassPropertyId: string;
  materialDefinitionPropertyId: string;
}

interface MaterialDefinitionPropertyAssignment {
  pk: string; // Unique primary key
  id: string; // Property identifier (can be duplicated)
  materialDefinitionPropertyId: string;
  materialDefinitionId: string;
  value: string;
  description: string;
  valueUnitOfMeasure: string;
}

type StoreTemplateEntry = { storeName: string; csvFile: string; parserKey: string; label: string; clearFirst?: string[] };
const TEMPLATE_UPDATE_SUPPORTED_FILES = new Set<string>([
  'material_classes.csv',
  'materials.csv',
  'material_lots.csv',
  'material_class_properties.csv',
  'material_class_properties_assignments.csv',
  'material_definition_property_template.csv',
  'material_definition_property_assignment_template.csv',
  'equipment_classes.csv',
  'equipment.csv',
  'equipment_properties.csv',
  'equipment_property_assignments.csv',
  'plants.csv',
  'production_lines.csv',
  'line_equipment.csv',
  'process_segments.csv',
  'segment_material_bom.csv',
  'maintenance_bom.csv',
  'equipment_usage.csv',
  'person_classes.csv',
  'personnel_capabilities.csv',
  'employees.csv',
]);
const STORE_TEMPLATE_MAP: Record<number, Record<number, StoreTemplateEntry | null>> = {
  0: { // Materials
    0: { storeName: 'materialClasses', csvFile: 'material_classes.csv', parserKey: 'materialClasses', label: 'Material Classes', clearFirst: ['materialClassPropertiesAssignments', 'materialClassProperties', 'materialDefinitionPropertyAssignments', 'materialDefinitionProperties', 'materialSublots', 'materialLots', 'materials'] },
    1: { storeName: 'materials', csvFile: 'materials.csv', parserKey: 'materials', label: 'Materials', clearFirst: ['materialSublots', 'materialLots'] },
    2: { storeName: 'materialLots', csvFile: 'material_lots.csv', parserKey: 'materialLots', label: 'Material Lots', clearFirst: ['materialSublots'] },
    3: null,
    4: { storeName: 'materialClassProperties', csvFile: 'material_class_properties.csv', parserKey: 'materialClassProperties', label: 'Material Class Properties', clearFirst: ['materialClassPropertiesAssignments'] },
    5: { storeName: 'materialClassPropertiesAssignments', csvFile: 'material_class_properties_assignments.csv', parserKey: 'materialClassPropertiesAssignments', label: 'Material Class Property Assign.' },
    6: { storeName: 'materialDefinitionProperties', csvFile: 'material_definition_property_template.csv', parserKey: 'materialDefinitionProperties', label: 'Material Definition Properties', clearFirst: ['materialDefinitionPropertyAssignments'] },
    7: { storeName: 'materialDefinitionPropertyAssignments', csvFile: 'material_definition_property_assignment_template.csv', parserKey: 'materialDefinitionPropertyAssignments', label: 'Material Def. Property Assign.' },
  },
  1: { // Equipment & Facilities
    0: { storeName: 'equipmentClasses', csvFile: 'equipment_classes.csv', parserKey: 'equipmentClasses', label: 'Equipment Classes', clearFirst: ['equipmentClassPropertiesAssignments', 'equipmentClassProperties'] },
    1: { storeName: 'equipment', csvFile: 'equipment.csv', parserKey: 'equipment', label: 'Equipment', clearFirst: ['lineEquipment', 'equipmentPropertyAssignments', 'equipmentProperties'] },
    2: { storeName: 'equipmentProperties', csvFile: 'equipment_properties.csv', parserKey: 'equipmentProperties', label: 'Equipment Properties', clearFirst: ['equipmentPropertyAssignments'] },
    3: { storeName: 'equipmentPropertyAssignments', csvFile: 'equipment_property_assignments.csv', parserKey: 'equipmentPropertyAssignments', label: 'Equip. Property Assign.' },
    4: { storeName: 'equipmentClassProperties', csvFile: 'equipment_class_properties.csv', parserKey: 'equipmentClassProperties', label: 'Equip. Class Properties', clearFirst: ['equipmentClassPropertiesAssignments'] },
    5: { storeName: 'equipmentClassPropertiesAssignments', csvFile: 'equipment_class_properties_assignment.csv', parserKey: 'equipmentClassPropertyAssignments', label: 'Equip. Class Property Assign.' },
    6: { storeName: 'plants', csvFile: 'plants.csv', parserKey: 'plants', label: 'Plants', clearFirst: ['productionLines'] },
    7: { storeName: 'productionLines', csvFile: 'production_lines.csv', parserKey: 'productionLines', label: 'Production Lines', clearFirst: ['lineEquipment'] },
    8: { storeName: 'lineEquipment', csvFile: 'line_equipment.csv', parserKey: 'lineEquipment', label: 'Line Equipment' },
    9: { storeName: 'hierarchyScopes', csvFile: 'hierarchy_scope.csv', parserKey: 'hierarchyScopes', label: 'Hierarchy Scopes', clearFirst: ['hierarchyScopeParentChild', 'hierarchyScopesFlat'] },
    10: { storeName: 'hierarchyScopesFlat', csvFile: 'hierarchy_scope_flat.csv', parserKey: 'hierarchyScopesFlat', label: 'Hierarchy Scopes Flat' },
    11: null,
  },
  2: { // Production
    0: { storeName: 'processSegments', csvFile: 'process_segments.csv', parserKey: 'processSegments', label: 'Process Segments', clearFirst: ['maintenanceBOMs', 'equipmentUsages', 'segmentBOMs', 'operationEventDefSegmentAssignments'] },
    1: { storeName: 'segmentBOMs', csvFile: 'segment_material_bom.csv', parserKey: 'segmentBOMs', label: 'Segment BOMs' },
    2: { storeName: 'equipmentUsages', csvFile: 'equipment_usage.csv', parserKey: 'equipmentUsages', label: 'Equipment Usages' },
    3: { storeName: 'maintenanceBOMs', csvFile: 'maintenance_bom.csv', parserKey: 'maintenanceBOMs', label: 'Maintenance BOMs' },
  },
  3: { // Operations
    0: { storeName: 'operationEventDefinitions', csvFile: 'operation_event_definitions.csv', parserKey: 'operationEventDefinitions', label: 'Operation Event Definitions', clearFirst: ['operationEventDefSegmentAssignments', 'operationEventDefinitionPropertyAssignments', 'operationEventDefinitionProperties'] },
    1: { storeName: 'operationEventDefSegmentAssignments', csvFile: 'operations_event_definition_segment_assignments.csv', parserKey: 'operationEventDefSegmentAssignments', label: 'Event-Segment Assignments' },
    2: { storeName: 'operationEventDefinitionProperties', csvFile: 'operation_event_definition_property.csv', parserKey: 'operationEventDefinitionProperties', label: 'Event Definition Properties', clearFirst: ['operationEventDefinitionPropertyAssignments'] },
    3: { storeName: 'operationEventDefinitionPropertyAssignments', csvFile: 'operation_event_definition_property_assignment.csv', parserKey: 'operationEventDefinitionPropertyAssignments', label: 'Event Def. Property Assign.' },
    4: { storeName: 'operationsEventClasses', csvFile: 'operations_event_classes.csv', parserKey: 'operationsEventClasses', label: 'Operations Event Classes' },
    5: { storeName: 'operationsEventRecords', csvFile: 'operations_event_records_template.csv', parserKey: 'operationsEventRecords', label: 'Operations Event Records', clearFirst: ['operationsEventEntries'] },
    6: { storeName: 'operationsEventEntries', csvFile: 'operations_event_entries_template.csv', parserKey: 'operationsEventEntries', label: 'Operations Event Entries' },
  },
  4: { // Personnel
    0: { storeName: 'personClasses', csvFile: 'person_classes.csv', parserKey: 'personClasses', label: 'Person Classes', clearFirst: ['personnelCapabilities'] },
    1: { storeName: 'personnelCapabilities', csvFile: 'personnel_capabilities.csv', parserKey: 'personnelCapabilities', label: 'Personnel Capabilities' },
    2: { storeName: 'employees', csvFile: 'employees.csv', parserKey: 'employees', label: 'Employees', clearFirst: ['shiftCrewAssignments'] },
    3: { storeName: 'shifts', csvFile: 'shifts.csv', parserKey: 'shifts', label: 'Shifts', clearFirst: ['shiftCrewAssignments'] },
    4: { storeName: 'crews', csvFile: 'crews.csv', parserKey: 'crews', label: 'Crews', clearFirst: ['shiftCrewAssignments'] },
    5: { storeName: 'shiftCrewAssignments', csvFile: 'shift_crew_assignments.csv', parserKey: 'shiftCrewAssignments', label: 'Shift-Crew Assignments' },
  },
};

const MasterDataManager: React.FC = () => {
    // Equipment Class Property State
    const [equipmentClassProperties, setEquipmentClassProperties] = useState<EquipmentClassProperty[]>([]);
    const [equipmentClassPropertyDialog, setEquipmentClassPropertyDialog] = useState(false);
    const [editingEquipmentClassProperty, setEditingEquipmentClassProperty] = useState<EquipmentClassProperty | null>(null);

    // Equipment Class Property Assignment State
    const [equipmentClassPropertyAssignments, setEquipmentClassPropertyAssignments] = useState<EquipmentClassPropertyAssignment[]>([]);
    const [equipmentClassPropertyAssignmentDialog, setEquipmentClassPropertyAssignmentDialog] = useState(false);
    const [editingEquipmentClassPropertyAssignment, setEditingEquipmentClassPropertyAssignment] = useState<EquipmentClassPropertyAssignment | null>(null);
  const [categoryTab, setCategoryTab] = useState(0); // 0: Materials, 1: Equipment & Facilities, 2: Production, 3: Operations
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  
  // Material Class State
  const [materialClasses, setMaterialClasses] = useState<MaterialClass[]>([]);
  const [materialClassDialog, setMaterialClassDialog] = useState(false);
  const [editingMaterialClass, setEditingMaterialClass] = useState<MaterialClass | null>(null);
  
  // Material State
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialDialog, setMaterialDialog] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  
  // Material Lot State
  const [materialLots, setMaterialLots] = useState<MaterialLot[]>([]);
  const [materialLotDialog, setMaterialLotDialog] = useState(false);
  const [editingMaterialLot, setEditingMaterialLot] = useState<MaterialLot | null>(null);
  
  // Material Sublot State
  const [materialSublots, setMaterialSublots] = useState<MaterialSublot[]>([]);
  const [materialSublotDialog, setMaterialSublotDialog] = useState(false);
  const [editingMaterialSublot, setEditingMaterialSublot] = useState<MaterialSublot | null>(null);
  
  // Material Definition Property State
  const [materialDefinitionProperties, setMaterialDefinitionProperties] = useState<MaterialDefinitionProperty[]>([]);
  const [materialDefinitionPropertyDialog, setMaterialDefinitionPropertyDialog] = useState(false);
  const [editingMaterialDefinitionProperty, setEditingMaterialDefinitionProperty] = useState<MaterialDefinitionProperty | null>(null);

  // Material Class Property State
  const [materialClassProperties, setMaterialClassProperties] = useState<MaterialClassProperty[]>([]);
  const [materialClassPropertyDialog, setMaterialClassPropertyDialog] = useState(false);
  const [editingMaterialClassProperty, setEditingMaterialClassProperty] = useState<MaterialClassProperty | null>(null);

  // Material Class Property Assignment State
  const [materialClassPropertyAssignments, setMaterialClassPropertyAssignments] = useState<MaterialClassPropertyAssignment[]>([]);
  const [materialClassPropertyAssignmentDialog, setMaterialClassPropertyAssignmentDialog] = useState(false);
  const [editingMaterialClassPropertyAssignment, setEditingMaterialClassPropertyAssignment] = useState<MaterialClassPropertyAssignment | null>(null);
  
  // Material Definition Property Assignment State
  const [materialDefinitionPropertyAssignments, setMaterialDefinitionPropertyAssignments] = useState<MaterialDefinitionPropertyAssignment[]>([]);
  const [materialDefinitionPropertyAssignmentDialog, setMaterialDefinitionPropertyAssignmentDialog] = useState(false);
  const [editingMaterialDefinitionPropertyAssignment, setEditingMaterialDefinitionPropertyAssignment] = useState<MaterialDefinitionPropertyAssignment | null>(null);
  
  // Equipment Class State
  const [equipmentClasses, setEquipmentClasses] = useState<EquipmentClass[]>([]);
  const [equipmentClassDialog, setEquipmentClassDialog] = useState(false);
  const [editingEquipmentClass, setEditingEquipmentClass] = useState<EquipmentClass | null>(null);
  
  // Equipment State
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [equipmentDialog, setEquipmentDialog] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  
  // Equipment Property State
  const [equipmentProperties, setEquipmentProperties] = useState<EquipmentProperty[]>([]);
  const [equipmentPropertyDialog, setEquipmentPropertyDialog] = useState(false);
  const [editingEquipmentProperty, setEditingEquipmentProperty] = useState<EquipmentProperty | null>(null);
  
  // Equipment Property Assignment State
  const [equipmentPropertyAssignments, setEquipmentPropertyAssignments] = useState<EquipmentPropertyAssignment[]>([]);
  const [equipmentPropertyAssignmentDialog, setEquipmentPropertyAssignmentDialog] = useState(false);
  const [editingEquipmentPropertyAssignment, setEditingEquipmentPropertyAssignment] = useState<EquipmentPropertyAssignment | null>(null);
  
  // Process Segment State
  const [processSegments, setProcessSegments] = useState<ProcessSegment[]>([]);
  const [processSegmentDialog, setProcessSegmentDialog] = useState(false);
  const [editingProcessSegment, setEditingProcessSegment] = useState<ProcessSegment | null>(null);
  
  // Segment Material BOM State
  const [segmentBOMs, setSegmentBOMs] = useState<SegmentMaterialBOM[]>([]);
  const [bomDialog, setBomDialog] = useState(false);
  const [editingBOM, setEditingBOM] = useState<SegmentMaterialBOM | null>(null);

  // Maintenance BOM State
  const [maintenanceBOMs, setMaintenanceBOMs] = useState<MaintenanceBOM[]>([]);
  const [maintenanceBomDialog, setMaintenanceBomDialog] = useState(false);
  const [editingMaintenanceBom, setEditingMaintenanceBom] = useState<MaintenanceBOM | null>(null);
  
  // Equipment Usage State
  const [equipmentUsages, setEquipmentUsages] = useState<EquipmentUsage[]>([]);
  const [equipmentUsageDialog, setEquipmentUsageDialog] = useState(false);
  const [editingEquipmentUsage, setEditingEquipmentUsage] = useState<EquipmentUsage | null>(null);

  // Plant State
  const [plants, setPlants] = useState<Plant[]>([]);
  const [plantDialog, setPlantDialog] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);

  // Production Line State
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
  const [productionLineDialog, setProductionLineDialog] = useState(false);
  const [editingProductionLine, setEditingProductionLine] = useState<ProductionLine | null>(null);

  // Line Equipment State
  const [lineEquipment, setLineEquipment] = useState<LineEquipment[]>([]);
  const [lineEquipmentDialog, setLineEquipmentDialog] = useState(false);
  const [editingLineEquipment, setEditingLineEquipment] = useState<LineEquipment | null>(null);

  // Hierarchy Scope State
  const [hierarchyScopes, setHierarchyScopes] = useState<HierarchyScope[]>([]);
  const [hierarchyScopeDialog, setHierarchyScopeDialog] = useState(false);
  const [editingHierarchyScope, setEditingHierarchyScope] = useState<HierarchyScope | null>(null);

  // Hierarchy Scope Flat State
  const [hierarchyScopesFlat, setHierarchyScopesFlat] = useState<HierarchyScopeFlat[]>([]);

  // Hierarchy Scope Parent-Child State
  const [hierarchyScopeParentChild, setHierarchyScopeParentChild] = useState<HierarchyScopeParentChild[]>([]);

  // Operation Event Definition State
  const [operationEventDefinitions, setOperationEventDefinitions] = useState<OperationEventDefinition[]>([]);
  const [operationEventDefinitionDialog, setOperationEventDefinitionDialog] = useState(false);
  const [editingOperationEventDefinition, setEditingOperationEventDefinition] = useState<OperationEventDefinition | null>(null);

  // Operation Event Definition Segment Assignment State
  const [operationEventDefSegmentAssignments, setOperationEventDefSegmentAssignments] = useState<OperationEventDefSegmentAssignment[]>([]);
  const [operationEventDefSegmentAssignmentDialog, setOperationEventDefSegmentAssignmentDialog] = useState(false);
  const [editingOperationEventDefSegmentAssignment, setEditingOperationEventDefSegmentAssignment] = useState<OperationEventDefSegmentAssignment | null>(null);

  // Operation Event Definition Property State
  const [operationEventDefinitionProperties, setOperationEventDefinitionProperties] = useState<OperationEventDefinitionProperty[]>([]);
  const [operationEventDefinitionPropertyDialog, setOperationEventDefinitionPropertyDialog] = useState(false);
  const [editingOperationEventDefinitionProperty, setEditingOperationEventDefinitionProperty] = useState<OperationEventDefinitionProperty | null>(null);

  // Operation Event Definition Property Assignment State
  const [operationEventDefinitionPropertyAssignments, setOperationEventDefinitionPropertyAssignments] = useState<OperationEventDefinitionPropertyAssignment[]>([]);
  const [operationEventDefinitionPropertyAssignmentDialog, setOperationEventDefinitionPropertyAssignmentDialog] = useState(false);
  const [editingOperationEventDefinitionPropertyAssignment, setEditingOperationEventDefinitionPropertyAssignment] = useState<OperationEventDefinitionPropertyAssignment | null>(null);

  // Operations Event Class State
  const [operationsEventClasses, setOperationsEventClasses] = useState<OperationsEventClass[]>([]);
  const [operationsEventClassDialog, setOperationsEventClassDialog] = useState(false);
  const [editingOperationsEventClass, setEditingOperationsEventClass] = useState<OperationsEventClass | null>(null);

  // Operations Event Record State
  const [operationsEventRecords, setOperationsEventRecords] = useState<OperationsEventRecord[]>([]);
  const [operationsEventRecordDialog, setOperationsEventRecordDialog] = useState(false);
  const [editingOperationsEventRecord, setEditingOperationsEventRecord] = useState<OperationsEventRecord | null>(null);

  // Operations Event Entry State
  const [operationsEventEntries, setOperationsEventEntries] = useState<OperationsEventEntry[]>([]);
  const [operationsEventEntryDialog, setOperationsEventEntryDialog] = useState(false);
  const [editingOperationsEventEntry, setEditingOperationsEventEntry] = useState<OperationsEventEntry | null>(null);

  // Personnel Information State
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftDialog, setShiftDialog] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  const [crews, setCrews] = useState<Crew[]>([]);
  const [crewDialog, setCrewDialog] = useState(false);
  const [editingCrew, setEditingCrew] = useState<Crew | null>(null);

  const [shiftCrewAssignments, setShiftCrewAssignments] = useState<ShiftCrewAssignment[]>([]);
  const [shiftCrewAssignmentDialog, setShiftCrewAssignmentDialog] = useState(false);
  const [editingShiftCrewAssignment, setEditingShiftCrewAssignment] = useState<ShiftCrewAssignment | null>(null);

  const [personClasses, setPersonClasses] = useState<PersonClass[]>([]);
  const [personClassDialog, setPersonClassDialog] = useState(false);
  const [editingPersonClass, setEditingPersonClass] = useState<PersonClass | null>(null);

  const [personnelCapabilities, setPersonnelCapabilities] = useState<PersonnelCapability[]>([]);
  const [personnelCapabilityDialog, setPersonnelCapabilityDialog] = useState(false);
  const [editingPersonnelCapability, setEditingPersonnelCapability] = useState<PersonnelCapability | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeDialog, setEmployeeDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Load data from IndexedDB on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      // Check if database has data
      const materialClassesData = await masterDataApi.getAll('materialClasses');
      
      // If no data, load from templates
      if (materialClassesData.length === 0) {
        await handleLoadTemplates();
        return;
      }

      // Load all data from database
      const [mc, m, ml, ms, mcp, mcpa, mdp, mdpa, ec, e, ep, epa, ps, bom, mbom, eu, p, pl, le, hs, hsf, hspc, oed, oedsa, oedp, oedpa, sh, cr, sca, pc, pcap, emp, oec, oer, oee, ecprop, ecpropAssign] = await Promise.all([
        masterDataApi.getAll('materialClasses'),
        masterDataApi.getAll('materials'),
        masterDataApi.getAll('materialLots'),
        masterDataApi.getAll('materialSublots'),
        masterDataApi.getAll('materialClassProperties'),
        masterDataApi.getAll('materialClassPropertiesAssignments'),
        masterDataApi.getAll('materialDefinitionProperties'),
        masterDataApi.getAll('materialDefinitionPropertyAssignments'),
        masterDataApi.getAll('equipmentClasses'),
        masterDataApi.getAll('equipment'),
        masterDataApi.getAll('equipmentProperties'),
        masterDataApi.getAll('equipmentPropertyAssignments'),
        masterDataApi.getAll('processSegments'),
        masterDataApi.getAll('segmentBOMs'),
        masterDataApi.getAll('maintenanceBOMs'),
        masterDataApi.getAll('equipmentUsages'),
        masterDataApi.getAll('plants'),
        masterDataApi.getAll('productionLines'),
        masterDataApi.getAll('lineEquipment'),
        masterDataApi.getAll('hierarchyScopes'),
        masterDataApi.getAll('hierarchyScopesFlat'),
        masterDataApi.getAll('hierarchyScopeParentChild'),
        masterDataApi.getAll('operationEventDefinitions'),
        masterDataApi.getAll('operationEventDefSegmentAssignments'),
        masterDataApi.getAll('operationEventDefinitionProperties'),
        masterDataApi.getAll('operationEventDefinitionPropertyAssignments'),
        masterDataApi.getAll('shifts'),
        masterDataApi.getAll('crews'),
        masterDataApi.getAll('shiftCrewAssignments'),
        masterDataApi.getAll('personClasses'),
        masterDataApi.getAll('personnelCapabilities'),
        masterDataApi.getAll('employees'),
        masterDataApi.getAll('operationsEventClasses'),
        masterDataApi.getAll('operationsEventRecords'),
        masterDataApi.getAll('operationsEventEntries'),
        masterDataApi.getAll('equipmentClassProperties'),
        masterDataApi.getAll('equipmentClassPropertiesAssignments'),
      ]);

      setMaterialClasses(mc);
      setMaterials(m);
      setMaterialLots(ml);
      setMaterialSublots(ms);
      setMaterialClassProperties(mcp);
      setMaterialClassPropertyAssignments(mcpa);
      setMaterialDefinitionProperties(mdp);
      setMaterialDefinitionPropertyAssignments(mdpa);
      setEquipmentClasses(ec);
      setEquipment(e);
      setEquipmentProperties(ep);
      setEquipmentPropertyAssignments(epa);
      setProcessSegments(ps);
      setSegmentBOMs(bom);
      setMaintenanceBOMs(mbom);
      setEquipmentUsages(eu);
      setPlants(p);
      setProductionLines(pl);
      setLineEquipment(le);
      setHierarchyScopes(hs);
      setHierarchyScopesFlat(hsf);
      setHierarchyScopeParentChild(hspc);
      setOperationEventDefinitions(oed);
      setOperationEventDefSegmentAssignments(oedsa);
      setOperationEventDefinitionProperties(oedp);
      setOperationEventDefinitionPropertyAssignments(oedpa);
      setShifts(sh);
      setCrews(cr);
      setShiftCrewAssignments(sca);
      setPersonClasses(pc);
      setPersonnelCapabilities(pcap);
      setEmployees(emp);
      setOperationsEventClasses(oec);
      setOperationsEventRecords(oer);
      setOperationsEventEntries(oee);
      
      console.log('Loaded data counts:', {
        materialDefinitionProperties: mdp.length,
        materialDefinitionPropertyAssignments: mdpa.length,
        materialClassProperties: mcp.length,
        materialClassPropertyAssignments: mcpa.length,
        equipmentProperties: ep.length,
        equipmentPropertyAssignments: epa.length,
        equipment: e.length,
        operationEventDefinitions: oed.length,
        operationEventDefSegmentAssignments: oedsa.length,
        operationEventDefinitionProperties: oedp.length,
        operationEventDefinitionPropertyAssignments: oedpa.length,
        shifts: sh.length,
        crews: cr.length,
        shiftCrewAssignments: sca.length,
        personClasses: pc.length,
        personnelCapabilities: pcap.length,
        employees: emp.length
      });
      
      setEquipmentClassProperties(ecprop);
      setEquipmentClassPropertyAssignments(ecpropAssign);
      setLoading(false);
          {/* Equipment Class Properties Section */}
          {categoryTab === 1 && (
            <Box sx={{ p: 3 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ mb: 2 }}>Equipment Class Properties</Typography>
              <TableContainer component={Paper} sx={{ mb: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Equipment Class</TableCell>
                      <TableCell>Property Name</TableCell>
                      <TableCell>Data Type</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell>Min</TableCell>
                      <TableCell>Max</TableCell>
                      <TableCell>Description</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {equipmentClassProperties.map((prop) => (
                      <TableRow key={prop.id}>
                        <TableCell>{prop.id}</TableCell>
                        <TableCell>{equipmentClasses.find(ec => ec.id === prop.equipmentClassId)?.name || prop.equipmentClassId}</TableCell>
                        <TableCell>{prop.propertyName}</TableCell>
                        <TableCell>{prop.valueDataType}</TableCell>
                        <TableCell>{prop.unit}</TableCell>
                        <TableCell>{prop.minValue}</TableCell>
                        <TableCell>{prop.maxValue}</TableCell>
                        <TableCell>{prop.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Equipment Class Property Assignments Section */}
          {categoryTab === 1 && (
            <Box sx={{ p: 3 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ mb: 2 }}>Equipment Class Property Assignments</Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Class Property</TableCell>
                      <TableCell>Equipment Property</TableCell>
                      <TableCell>Data Type</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell>Min</TableCell>
                      <TableCell>Max</TableCell>
                      <TableCell>Description</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {equipmentClassPropertyAssignments.map((assign) => (
                      <TableRow key={assign.id}>
                        <TableCell>{assign.id}</TableCell>
                        <TableCell>{equipmentClassProperties.find(p => p.id === assign.equipmentClassPropertyId)?.propertyName || assign.equipmentClassPropertyId}</TableCell>
                        <TableCell>{equipmentProperties.find(ep => ep.id === assign.equipmentPropertyId)?.name || assign.equipmentPropertyId}</TableCell>
                        <TableCell>{assign.valueDataType}</TableCell>
                        <TableCell>{assign.unit}</TableCell>
                        <TableCell>{assign.minValue}</TableCell>
                        <TableCell>{assign.maxValue}</TableCell>
                        <TableCell>{assign.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
    } catch (error) {
      console.error('Failed to load data:', error);
      showSnackbar('Failed to load data from database', 'error');
      setLoading(false);
    }
  };

  const handleLoadTemplates = async () => {
    try {
      setLoading(true);
      await templateLoader.importTemplatesIntoDB();
      await loadAllData();
      showSnackbar('Template data loaded successfully', 'success');
    } catch (error) {
      console.error('Failed to load templates:', error);
      showSnackbar('Failed to load template data', 'error');
      setLoading(false);
    }
  };

  const handleResetToTemplates = async () => {
    if (!confirm('This will delete all current data and reload template data. Continue?')) {
      return;
    }
    
    try {
      setLoading(true);
      await templateLoader.resetToTemplateData();
      await loadAllData();
      showSnackbar('Data reset to template defaults', 'success');
    } catch (error) {
      console.error('Failed to reset data:', error);
      showSnackbar('Failed to reset data', 'error');
      setLoading(false);
    }
  };

  const handleResetCurrentTabToTemplate = async () => {
    const storeConfig = STORE_TEMPLATE_MAP[categoryTab]?.[tabValue];
    if (!storeConfig) {
      showSnackbar('No template available for this tab', 'warning');
      return;
    }
    if (!confirm(`This will refresh "${storeConfig.label}" from template without deleting related stores. Continue?`)) return;
    try {
      setLoading(true);
      await templateLoader.resetSingleStoreToTemplate(storeConfig.storeName, storeConfig.csvFile, storeConfig.parserKey, storeConfig.clearFirst);
      await loadAllData();
      showSnackbar(`"${storeConfig.label}" reset to template`, 'success');
    } catch (error) {
      console.error('Failed to reset store to template:', error);
      showSnackbar('Failed to reset to template', 'error');
      setLoading(false);
    }
  };

  const handleForceDatabaseReset = async () => {
    if (!confirm('This will delete the entire database and reload from templates. This is useful if the database schema has been upgraded. Continue?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Close all database connections
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name === 'master-data-db') {
          indexedDB.deleteDatabase(db.name);
          console.log('Deleted database:', db.name);
        }
      }
      
      // Wait a moment for the deletion to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reload the page to reinitialize everything
      window.location.reload();
    } catch (error) {
      console.error('Failed to reset database:', error);
      showSnackbar('Failed to reset database. Please manually clear IndexedDB from browser DevTools.', 'error');
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCategoryChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCategoryTab(newValue);
    setTabValue(0); // Reset to first tab in the new category
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Material Class Handlers
  const handleSaveMaterialClass = async (data: MaterialClass) => {
    try {
      if (editingMaterialClass) {
        await masterDataApi.update('materialClasses', data);
        setMaterialClasses(prev => prev.map(mc => mc.id === data.id ? data : mc));
        showSnackbar('Material class updated', 'success');
      } else {
        await masterDataApi.add('materialClasses', data);
        setMaterialClasses(prev => [...prev, data]);
        showSnackbar('Material class added', 'success');
      }
      setMaterialClassDialog(false);
      setEditingMaterialClass(null);
    } catch (error) {
      console.error('Failed to save material class:', error);
      showSnackbar('Failed to save material class', 'error');
    }
  };

  const handleDeleteMaterialClass = async (id: string) => {
    if (!confirm('Delete this material class?')) return;
    try {
      await masterDataApi.delete('materialClasses', id);
      setMaterialClasses(prev => prev.filter(mc => mc.id !== id));
      showSnackbar('Material class deleted', 'success');
    } catch (error) {
      console.error('Failed to delete material class:', error);
      showSnackbar('Failed to delete material class', 'error');
    }
  };

  // Material Handlers
  const handleSaveMaterial = async (data: Material) => {
    try {
      if (editingMaterial) {
        await masterDataApi.update('materials', data);
        setMaterials(prev => prev.map(m => m.id === data.id ? data : m));
        showSnackbar('Material updated', 'success');
      } else {
        await masterDataApi.add('materials', data);
        setMaterials(prev => [...prev, data]);
        showSnackbar('Material added', 'success');
      }
      setMaterialDialog(false);
      setEditingMaterial(null);
    } catch (error) {
      console.error('Failed to save material:', error);
      showSnackbar('Failed to save material', 'error');
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm('Delete this material?')) return;
    try {
      await masterDataApi.delete('materials', id);
      setMaterials(prev => prev.filter(m => m.id !== id));
      showSnackbar('Material deleted', 'success');
    } catch (error) {
      console.error('Failed to delete material:', error);
      showSnackbar('Failed to delete material', 'error');
    }
  };

  // Material Lot Handlers
  const handleSaveMaterialLot = async (data: MaterialLot) => {
    try {
      if (editingMaterialLot) {
        await masterDataApi.update('materialLots', data);
        setMaterialLots(prev => prev.map(ml => ml.id === data.id ? data : ml));
        showSnackbar('Material lot updated', 'success');
      } else {
        await masterDataApi.add('materialLots', data);
        setMaterialLots(prev => [...prev, data]);
        showSnackbar('Material lot added', 'success');
      }
      setMaterialLotDialog(false);
      setEditingMaterialLot(null);
    } catch (error) {
      console.error('Failed to save material lot:', error);
      showSnackbar('Failed to save material lot', 'error');
    }
  };

  const handleDeleteMaterialLot = async (id: string) => {
    if (!confirm('Delete this material lot?')) return;
    try {
      await masterDataApi.delete('materialLots', id);
      setMaterialLots(prev => prev.filter(ml => ml.id !== id));
      showSnackbar('Material lot deleted', 'success');
    } catch (error) {
      console.error('Failed to delete material lot:', error);
      showSnackbar('Failed to delete material lot', 'error');
    }
  };

  // Material Sublot Handlers
  const handleSaveMaterialSublot = async (data: MaterialSublot) => {
    try {
      if (editingMaterialSublot) {
        await masterDataApi.update('materialSublots', data);
        setMaterialSublots(prev => prev.map(ms => ms.id === data.id ? data : ms));
        showSnackbar('Material sublot updated', 'success');
      } else {
        await masterDataApi.add('materialSublots', data);
        setMaterialSublots(prev => [...prev, data]);
        showSnackbar('Material sublot added', 'success');
      }
      setMaterialSublotDialog(false);
      setEditingMaterialSublot(null);
    } catch (error) {
      console.error('Failed to save material sublot:', error);
      showSnackbar('Failed to save material sublot', 'error');
    }
  };

  const handleDeleteMaterialSublot = async (id: string) => {
    if (!confirm('Delete this material sublot?')) return;
    try {
      await masterDataApi.delete('materialSublots', id);
      setMaterialSublots(prev => prev.filter(ms => ms.id !== id));
      showSnackbar('Material sublot deleted', 'success');
    } catch (error) {
      console.error('Failed to delete material sublot:', error);
      showSnackbar('Failed to delete material sublot', 'error');
    }
  };

  // Material Definition Property Handlers
  const handleSaveMaterialDefinitionProperty = async (data: MaterialDefinitionProperty) => {
    try {
      if (editingMaterialDefinitionProperty) {
        await masterDataApi.update('materialDefinitionProperties', data);
        setMaterialDefinitionProperties(prev => prev.map(mdp => mdp.id === data.id ? data : mdp));
        showSnackbar('Material definition property updated', 'success');
      } else {
        await masterDataApi.add('materialDefinitionProperties', data);
        setMaterialDefinitionProperties(prev => [...prev, data]);
        showSnackbar('Material definition property added', 'success');
      }
      setMaterialDefinitionPropertyDialog(false);
      setEditingMaterialDefinitionProperty(null);
    } catch (error) {
      console.error('Failed to save material definition property:', error);
      showSnackbar('Failed to save material definition property', 'error');
    }
  };

  const handleDeleteMaterialDefinitionProperty = async (id: string) => {
    if (!confirm('Delete this material definition property?')) return;
    try {
      await masterDataApi.delete('materialDefinitionProperties', id);
      setMaterialDefinitionProperties(prev => prev.filter(mdp => mdp.id !== id));
      showSnackbar('Material definition property deleted', 'success');
    } catch (error) {
      console.error('Failed to delete material definition property:', error);
      showSnackbar('Failed to delete material definition property', 'error');
    }
  };

  // Material Class Property Handlers
  const handleSaveMaterialClassProperty = async (data: MaterialClassProperty) => {
    try {
      if (editingMaterialClassProperty) {
        await masterDataApi.update('materialClassProperties', data);
        setMaterialClassProperties(prev => prev.map(mcp => mcp.id === data.id ? data : mcp));
        showSnackbar('Material class property updated', 'success');
      } else {
        await masterDataApi.add('materialClassProperties', data);
        setMaterialClassProperties(prev => [...prev, data]);
        showSnackbar('Material class property added', 'success');
      }
      setMaterialClassPropertyDialog(false);
      setEditingMaterialClassProperty(null);
    } catch (error) {
      console.error('Failed to save material class property:', error);
      showSnackbar('Failed to save material class property', 'error');
    }
  };

  const handleDeleteMaterialClassProperty = async (id: string) => {
    if (!confirm('Delete this material class property?')) return;
    try {
      await masterDataApi.delete('materialClassProperties', id);
      setMaterialClassProperties(prev => prev.filter(mcp => mcp.id !== id));
      showSnackbar('Material class property deleted', 'success');
    } catch (error) {
      console.error('Failed to delete material class property:', error);
      showSnackbar('Failed to delete material class property', 'error');
    }
  };

  // Material Class Property Assignment Handlers
  const handleSaveMaterialClassPropertyAssignment = async (data: MaterialClassPropertyAssignment) => {
    try {
      if (editingMaterialClassPropertyAssignment) {
        await masterDataApi.update('materialClassPropertiesAssignments', data);
        setMaterialClassPropertyAssignments(prev => prev.map(mcpa => mcpa.id === data.id ? data : mcpa));
        showSnackbar('Material class property assignment updated', 'success');
      } else {
        await masterDataApi.add('materialClassPropertiesAssignments', data);
        setMaterialClassPropertyAssignments(prev => [...prev, data]);
        showSnackbar('Material class property assignment added', 'success');
      }
      setMaterialClassPropertyAssignmentDialog(false);
      setEditingMaterialClassPropertyAssignment(null);
    } catch (error) {
      console.error('Failed to save material class property assignment:', error);
      showSnackbar('Failed to save material class property assignment', 'error');
    }
  };

  const handleDeleteMaterialClassPropertyAssignment = async (id: string) => {
    if (!confirm('Delete this material class property assignment?')) return;
    try {
      await masterDataApi.delete('materialClassPropertiesAssignments', id);
      setMaterialClassPropertyAssignments(prev => prev.filter(mcpa => mcpa.id !== id));
      showSnackbar('Material class property assignment deleted', 'success');
    } catch (error) {
      console.error('Failed to delete material class property assignment:', error);
      showSnackbar('Failed to delete material class property assignment', 'error');
    }
  };

  // Material Definition Property Assignment Handlers
  const handleSaveMaterialDefinitionPropertyAssignment = async (data: MaterialDefinitionPropertyAssignment) => {
    try {
      if (editingMaterialDefinitionPropertyAssignment) {
        await masterDataApi.update('materialDefinitionPropertyAssignments', data);
        setMaterialDefinitionPropertyAssignments(prev => prev.map(mdpa => mdpa.pk === data.pk ? data : mdpa));
        showSnackbar('Material definition property assignment updated', 'success');
      } else {
        await masterDataApi.add('materialDefinitionPropertyAssignments', data);
        setMaterialDefinitionPropertyAssignments(prev => [...prev, data]);
        showSnackbar('Material definition property assignment added', 'success');
      }
      setMaterialDefinitionPropertyAssignmentDialog(false);
      setEditingMaterialDefinitionPropertyAssignment(null);
    } catch (error) {
      console.error('Failed to save material definition property assignment:', error);
      showSnackbar('Failed to save material definition property assignment', 'error');
    }
  };

  const handleDeleteMaterialDefinitionPropertyAssignment = async (pk: string) => {
    if (!confirm('Delete this material definition property assignment?')) return;
    try {
      await masterDataApi.delete('materialDefinitionPropertyAssignments', pk);
      setMaterialDefinitionPropertyAssignments(prev => prev.filter(mdpa => mdpa.pk !== pk));
      showSnackbar('Material definition property assignment deleted', 'success');
    } catch (error) {
      console.error('Failed to delete material definition property assignment:', error);
      showSnackbar('Failed to delete material definition property assignment', 'error');
    }
  };

  // Equipment Class Handlers
  const handleSaveEquipmentClass = async (data: EquipmentClass) => {
    try {
      if (editingEquipmentClass) {
        await masterDataApi.update('equipmentClasses', data);
        setEquipmentClasses(prev => prev.map(ec => ec.id === data.id ? data : ec));
        showSnackbar('Equipment class updated', 'success');
      } else {
        await masterDataApi.add('equipmentClasses', data);
        setEquipmentClasses(prev => [...prev, data]);
        showSnackbar('Equipment class added', 'success');
      }
      setEquipmentClassDialog(false);
      setEditingEquipmentClass(null);
    } catch (error) {
      console.error('Failed to save equipment class:', error);
      showSnackbar('Failed to save equipment class', 'error');
    }
  };

  const handleDeleteEquipmentClass = async (id: string) => {
    if (!confirm('Delete this equipment class?')) return;
    try {
      await masterDataApi.delete('equipmentClasses', id);
      setEquipmentClasses(prev => prev.filter(ec => ec.id !== id));
      showSnackbar('Equipment class deleted', 'success');
    } catch (error) {
      console.error('Failed to delete equipment class:', error);
      showSnackbar('Failed to delete equipment class', 'error');
    }
  };

  // Equipment Handlers
  const handleSaveEquipment = async (data: Equipment) => {
    try {
      if (editingEquipment) {
        await masterDataApi.update('equipment', data);
        setEquipment(prev => prev.map(e => e.id === data.id ? data : e));
        showSnackbar('Equipment updated', 'success');
      } else {
        await masterDataApi.add('equipment', data);
        setEquipment(prev => [...prev, data]);
        showSnackbar('Equipment added', 'success');
      }
      setEquipmentDialog(false);
      setEditingEquipment(null);
    } catch (error) {
      console.error('Failed to save equipment:', error);
      showSnackbar('Failed to save equipment', 'error');
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    if (!confirm('Delete this equipment?')) return;
    try {
      await masterDataApi.delete('equipment', id);
      setEquipment(prev => prev.filter(e => e.id !== id));
      showSnackbar('Equipment deleted', 'success');
    } catch (error) {
      console.error('Failed to delete equipment:', error);
      showSnackbar('Failed to delete equipment', 'error');
    }
  };

  // Equipment Property Handlers
  const handleSaveEquipmentProperty = async (data: EquipmentProperty) => {
    try {
      if (editingEquipmentProperty) {
        await masterDataApi.update('equipmentProperties', data);
        setEquipmentProperties(prev => prev.map(ep => ep.id === data.id ? data : ep));
        showSnackbar('Equipment property updated', 'success');
      } else {
        await masterDataApi.add('equipmentProperties', data);
        setEquipmentProperties(prev => [...prev, data]);
        showSnackbar('Equipment property added', 'success');
      }
      setEquipmentPropertyDialog(false);
      setEditingEquipmentProperty(null);
    } catch (error) {
      console.error('Failed to save equipment property:', error);
      showSnackbar('Failed to save equipment property', 'error');
    }
  };

  const handleDeleteEquipmentProperty = async (id: string) => {
    if (!confirm('Delete this equipment property?')) return;
    try {
      await masterDataApi.delete('equipmentProperties', id);
      setEquipmentProperties(prev => prev.filter(ep => ep.id !== id));
      showSnackbar('Equipment property deleted', 'success');
    } catch (error) {
      console.error('Failed to delete equipment property:', error);
      showSnackbar('Failed to delete equipment property', 'error');
    }
  };

  // Equipment Property Assignment Handlers
  const handleSaveEquipmentPropertyAssignment = async (data: EquipmentPropertyAssignment) => {
    try {
      if (editingEquipmentPropertyAssignment) {
        await masterDataApi.update('equipmentPropertyAssignments', data);
        setEquipmentPropertyAssignments(prev => prev.map(epa => epa.id === data.id ? data : epa));
        showSnackbar('Equipment property assignment updated', 'success');
      } else {
        await masterDataApi.add('equipmentPropertyAssignments', data);
        setEquipmentPropertyAssignments(prev => [...prev, data]);
        showSnackbar('Equipment property assignment added', 'success');
      }
      setEquipmentPropertyAssignmentDialog(false);
      setEditingEquipmentPropertyAssignment(null);
    } catch (error) {
      console.error('Failed to save equipment property assignment:', error);
      showSnackbar('Failed to save equipment property assignment', 'error');
    }
  };

  const handleDeleteEquipmentPropertyAssignment = async (id: string) => {
    if (!confirm('Delete this equipment property assignment?')) return;
    try {
      await masterDataApi.delete('equipmentPropertyAssignments', id);
      setEquipmentPropertyAssignments(prev => prev.filter(epa => epa.id !== id));
      showSnackbar('Equipment property assignment deleted', 'success');
    } catch (error) {
      console.error('Failed to delete equipment property assignment:', error);
      showSnackbar('Failed to delete equipment property assignment', 'error');
    }
  };

  // Process Segment Handlers
  const handleSaveProcessSegment = async (data: ProcessSegment) => {
    try {
      if (editingProcessSegment) {
        await masterDataApi.update('processSegments', data);
        setProcessSegments(prev => prev.map(ps => ps.id === data.id ? data : ps));
        showSnackbar('Process segment updated', 'success');
      } else {
        await masterDataApi.add('processSegments', data);
        setProcessSegments(prev => [...prev, data]);
        showSnackbar('Process segment added', 'success');
      }
      setProcessSegmentDialog(false);
      setEditingProcessSegment(null);
    } catch (error) {
      console.error('Failed to save process segment:', error);
      showSnackbar('Failed to save process segment', 'error');
    }
  };

  const handleDeleteProcessSegment = async (id: string) => {
    if (!confirm('Delete this process segment?')) return;
    try {
      await masterDataApi.delete('processSegments', id);
      setProcessSegments(prev => prev.filter(ps => ps.id !== id));
      showSnackbar('Process segment deleted', 'success');
    } catch (error) {
      console.error('Failed to delete process segment:', error);
      showSnackbar('Failed to delete process segment', 'error');
    }
  };

  // Segment BOM Handlers
  const handleSaveBOM = async (data: SegmentMaterialBOM) => {
    try {
      if (editingBOM) {
        await masterDataApi.update('segmentBOMs', data);
        setSegmentBOMs(prev => prev.map(bom => bom.id === data.id ? data : bom));
        showSnackbar('BOM line updated', 'success');
      } else {
        await masterDataApi.add('segmentBOMs', data);
        setSegmentBOMs(prev => [...prev, data]);
        showSnackbar('BOM line added', 'success');
      }
      setBomDialog(false);
      setEditingBOM(null);
    } catch (error) {
      console.error('Failed to save BOM line:', error);
      showSnackbar('Failed to save BOM line', 'error');
    }
  };

  const handleDeleteBOM = async (id: string) => {
    if (!confirm('Delete this BOM line?')) return;
    try {
      await masterDataApi.delete('segmentBOMs', id);
      setSegmentBOMs(prev => prev.filter(bom => bom.id !== id));
      showSnackbar('BOM line deleted', 'success');
    } catch (error) {
      console.error('Failed to delete BOM line:', error);
      showSnackbar('Failed to delete BOM line', 'error');
    }
  };

  // Equipment Usage Handlers
  const handleSaveEquipmentUsage = async (data: EquipmentUsage) => {
    try {
      if (editingEquipmentUsage) {
        await masterDataApi.update('equipmentUsages', data);
        setEquipmentUsages(prev => prev.map(eu => eu.id === data.id ? data : eu));
        showSnackbar('Equipment usage updated', 'success');
      } else {
        await masterDataApi.add('equipmentUsages', data);
        setEquipmentUsages(prev => [...prev, data]);
        showSnackbar('Equipment usage added', 'success');
      }
      setEquipmentUsageDialog(false);
      setEditingEquipmentUsage(null);
    } catch (error) {
      console.error('Failed to save equipment usage:', error);
      showSnackbar('Failed to save equipment usage', 'error');
    }
  };

  const handleDeleteEquipmentUsage = async (id: string) => {
    if (!confirm('Delete this equipment usage?')) return;
    try {
      await masterDataApi.delete('equipmentUsages', id);
      setEquipmentUsages(prev => prev.filter(eu => eu.id !== id));
      showSnackbar('Equipment usage deleted', 'success');
    } catch (error) {
      console.error('Failed to delete equipment usage:', error);
      showSnackbar('Failed to delete equipment usage', 'error');
    }
  };

  // Maintenance BOM handlers (dedicated maintenanceBOMs table)
  const handleSaveMaintenanceAssignment = async (data: MaintenanceBOM) => {
    try {
      const selectedSegment = processSegments.find(ps => ps.id === data.processSegmentId);
      const normalizedData: MaintenanceBOM = {
        ...data,
        processSegmentSequence: selectedSegment?.sequence ?? data.processSegmentSequence ?? 0,
        personQuantityUoM: data.personQuantityUoM || 'Person',
      };

      if (editingMaintenanceBom) {
        await masterDataApi.update('maintenanceBOMs', normalizedData);
        setMaintenanceBOMs(prev => prev.map(item => item.id === normalizedData.id ? normalizedData : item));
        showSnackbar('Maintenance BOM updated', 'success');
      } else {
        const newRecord: MaintenanceBOM = {
          ...normalizedData,
          id: normalizedData.id || `MBOM-${Date.now()}`,
        };
        await masterDataApi.add('maintenanceBOMs', newRecord);
        setMaintenanceBOMs(prev => [...prev, newRecord]);
        showSnackbar('Maintenance BOM added', 'success');
      }

      setMaintenanceBomDialog(false);
      setEditingMaintenanceBom(null);
    } catch (error) {
      console.error('Failed to save maintenance BOM:', error);
      showSnackbar('Failed to save maintenance BOM', 'error');
    }
  };

  const handleDeleteMaintenanceAssignment = async (id: string) => {
    if (!confirm('Delete this maintenance BOM line?')) return;

    try {
      await masterDataApi.delete('maintenanceBOMs', id);
      setMaintenanceBOMs(prev => prev.filter(item => item.id !== id));
      showSnackbar('Maintenance BOM deleted', 'success');
    } catch (error) {
      console.error('Failed to delete maintenance BOM:', error);
      showSnackbar('Failed to delete maintenance BOM', 'error');
    }
  };

  const handleCopyEquipmentBOM = async (sourceEquipmentId: string, targetEquipmentId: string) => {
    const sourceBOMs = maintenanceBOMs.filter(b => b.equipmentId === sourceEquipmentId);
    if (sourceBOMs.length === 0) {
      showSnackbar('No BOM lines found for source equipment', 'warning');
      return;
    }
    try {
      const ts = Date.now();
      const newEntries: MaintenanceBOM[] = sourceBOMs.map((b, i) => ({
        ...b,
        id: `MBOM-${targetEquipmentId}-${ts}-${i}`,
        equipmentId: targetEquipmentId,
        personQuantityUoM: b.personQuantityUoM || 'Person',
      }));
      for (const entry of newEntries) {
        await masterDataApi.add('maintenanceBOMs', entry);
      }
      setMaintenanceBOMs(prev => [...prev, ...newEntries]);
      showSnackbar(`Copied ${newEntries.length} BOM line(s) to ${targetEquipmentId}`, 'success');
    } catch (error) {
      console.error('Failed to copy BOM:', error);
      showSnackbar('Failed to copy BOM', 'error');
    }
  };

  // Operation Event Definition Handlers
  const handleDeleteOperationEventDefinition = async (id: string) => {
    if (!confirm('Delete this operation event definition?')) return;
    try {
      await masterDataApi.delete('operationEventDefinitions', id);
      setOperationEventDefinitions(prev => prev.filter(oed => oed.id !== id));
      showSnackbar('Operation event definition deleted', 'success');
    } catch (error) {
      console.error('Failed to delete operation event definition:', error);
      showSnackbar('Failed to delete operation event definition', 'error');
    }
  };

  // Operation Event Definition Segment Assignment Handlers
  const handleDeleteOperationEventDefSegmentAssignment = async (id: string) => {
    if (!confirm('Delete this event-segment assignment?')) return;
    try {
      await masterDataApi.delete('operationEventDefSegmentAssignments', id);
      setOperationEventDefSegmentAssignments(prev => prev.filter(oedsa => oedsa.id !== id));
      showSnackbar('Event-segment assignment deleted', 'success');
    } catch (error) {
      console.error('Failed to delete event-segment assignment:', error);
      showSnackbar('Failed to delete event-segment assignment', 'error');
    }
  };

  // Operation Event Definition Property Handlers
  const handleDeleteOperationEventDefinitionProperty = async (id: string) => {
    if (!confirm('Delete this event definition property?')) return;
    try {
      await masterDataApi.delete('operationEventDefinitionProperties', id);
      setOperationEventDefinitionProperties(prev => prev.filter(p => p.id !== id));
      showSnackbar('Event definition property deleted', 'success');
    } catch (error) {
      console.error('Failed to delete event definition property:', error);
      showSnackbar('Failed to delete event definition property', 'error');
    }
  };

  // Operation Event Definition Property Assignment Handlers
  const handleDeleteOperationEventDefinitionPropertyAssignment = async (id: string) => {
    if (!confirm('Delete this property assignment?')) return;
    try {
      await masterDataApi.delete('operationEventDefinitionPropertyAssignments', id);
      setOperationEventDefinitionPropertyAssignments(prev => prev.filter(a => a.id !== id));
      showSnackbar('Property assignment deleted', 'success');
    } catch (error) {
      console.error('Failed to delete property assignment:', error);
      showSnackbar('Failed to delete property assignment', 'error');
    }
  };

  // Plant Handlers
  const handleSavePlant = async (data: Plant) => {
    try {
      if (editingPlant) {
        await masterDataApi.update('plants', data);
        setPlants(prev => prev.map(p => p.id === data.id ? data : p));
        showSnackbar('Plant updated', 'success');
      } else {
        await masterDataApi.add('plants', data);
        setPlants(prev => [...prev, data]);
        showSnackbar('Plant added', 'success');
      }
      setPlantDialog(false);
      setEditingPlant(null);
    } catch (error) {
      console.error('Failed to save plant:', error);
      showSnackbar('Failed to save plant', 'error');
    }
  };

  const handleDeletePlant = async (id: string) => {
    if (!confirm('Delete this plant?')) return;
    try {
      await masterDataApi.delete('plants', id);
      setPlants(prev => prev.filter(p => p.id !== id));
      showSnackbar('Plant deleted', 'success');
    } catch (error) {
      console.error('Failed to delete plant:', error);
      showSnackbar('Failed to delete plant', 'error');
    }
  };

  // Production Line Handlers
  const handleSaveProductionLine = async (data: ProductionLine) => {
    try {
      if (editingProductionLine) {
        await masterDataApi.update('productionLines', data);
        setProductionLines(prev => prev.map(pl => pl.id === data.id ? data : pl));
        showSnackbar('Production line updated', 'success');
      } else {
        await masterDataApi.add('productionLines', data);
        setProductionLines(prev => [...prev, data]);
        showSnackbar('Production line added', 'success');
      }
      setProductionLineDialog(false);
      setEditingProductionLine(null);
    } catch (error) {
      console.error('Failed to save production line:', error);
      showSnackbar('Failed to save production line', 'error');
    }
  };

  const handleDeleteProductionLine = async (id: string) => {
    if (!confirm('Delete this production line?')) return;
    try {
      await masterDataApi.delete('productionLines', id);
      setProductionLines(prev => prev.filter(pl => pl.id !== id));
      showSnackbar('Production line deleted', 'success');
    } catch (error) {
      console.error('Failed to delete production line:', error);
      showSnackbar('Failed to delete production line', 'error');
    }
  };

  // Line Equipment Handlers
  const handleSaveLineEquipment = async (data: LineEquipment) => {
    try {
      if (editingLineEquipment) {
        await masterDataApi.update('lineEquipment', data);
        setLineEquipment(prev => prev.map(le => le.id === data.id ? data : le));
        showSnackbar('Line equipment updated', 'success');
      } else {
        await masterDataApi.add('lineEquipment', data);
        setLineEquipment(prev => [...prev, data]);
        showSnackbar('Line equipment added', 'success');
      }
      setLineEquipmentDialog(false);
      setEditingLineEquipment(null);
    } catch (error) {
      console.error('Failed to save line equipment:', error);
      showSnackbar('Failed to save line equipment', 'error');
    }
  };

  const handleDeleteLineEquipment = async (id: string) => {
    if (!confirm('Delete this line equipment?')) return;
    try {
      await masterDataApi.delete('lineEquipment', id);
      setLineEquipment(prev => prev.filter(le => le.id !== id));
      showSnackbar('Line equipment deleted', 'success');
    } catch (error) {
      console.error('Failed to delete line equipment:', error);
      showSnackbar('Failed to delete line equipment', 'error');
    }
  };

  // Shift Handlers
  const handleSaveShift = async (data: Shift) => {
    try {
      if (editingShift) {
        await masterDataApi.update('shifts', data);
        setShifts(prev => prev.map(s => s.id === data.id ? data : s));
        showSnackbar('Shift updated', 'success');
      } else {
        await masterDataApi.add('shifts', data);
        setShifts(prev => [...prev, data]);
        showSnackbar('Shift added', 'success');
      }
      setShiftDialog(false);
      setEditingShift(null);
    } catch (error) {
      console.error('Failed to save shift:', error);
      showSnackbar('Failed to save shift', 'error');
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm('Delete this shift?')) return;
    try {
      await masterDataApi.delete('shifts', id);
      setShifts(prev => prev.filter(s => s.id !== id));
      showSnackbar('Shift deleted', 'success');
    } catch (error) {
      console.error('Failed to delete shift:', error);
      showSnackbar('Failed to delete shift', 'error');
    }
  };

  // Crew Handlers
  const handleSaveCrew = async (data: Crew) => {
    try {
      if (editingCrew) {
        await masterDataApi.update('crews', data);
        setCrews(prev => prev.map(c => c.id === data.id ? data : c));
        showSnackbar('Crew updated', 'success');
      } else {
        await masterDataApi.add('crews', data);
        setCrews(prev => [...prev, data]);
        showSnackbar('Crew added', 'success');
      }
      setCrewDialog(false);
      setEditingCrew(null);
    } catch (error) {
      console.error('Failed to save crew:', error);
      showSnackbar('Failed to save crew', 'error');
    }
  };

  const handleDeleteCrew = async (id: string) => {
    if (!confirm('Delete this crew?')) return;
    try {
      await masterDataApi.delete('crews', id);
      setCrews(prev => prev.filter(c => c.id !== id));
      showSnackbar('Crew deleted', 'success');
    } catch (error) {
      console.error('Failed to delete crew:', error);
      showSnackbar('Failed to delete crew', 'error');
    }
  };

  const handleSavePersonClass = async (data: PersonClass) => {
    try {
      if (editingPersonClass) {
        await masterDataApi.update('personClasses', data);
        setPersonClasses(prev => prev.map(pc => pc.id === data.id ? data : pc));
        showSnackbar('Person class updated', 'success');
      } else {
        await masterDataApi.add('personClasses', data);
        setPersonClasses(prev => [...prev, data]);
        showSnackbar('Person class added', 'success');
      }
      setPersonClassDialog(false);
      setEditingPersonClass(null);
    } catch (error) {
      console.error('Failed to save person class:', error);
      showSnackbar('Failed to save person class', 'error');
    }
  };

  const handleDeletePersonClass = async (id: string) => {
    if (!confirm('Delete this person class?')) return;
    try {
      await masterDataApi.delete('personClasses', id);
      setPersonClasses(prev => prev.filter(pc => pc.id !== id));
      showSnackbar('Person class deleted', 'success');
    } catch (error) {
      console.error('Failed to delete person class:', error);
      showSnackbar('Failed to delete person class', 'error');
    }
  };

  const handleSavePersonnelCapability = async (data: PersonnelCapability) => {
    try {
      if (editingPersonnelCapability) {
        await masterDataApi.update('personnelCapabilities', data);
        setPersonnelCapabilities(prev => prev.map(pc => pc.id === data.id ? data : pc));
        showSnackbar('Personnel capability updated', 'success');
      } else {
        await masterDataApi.add('personnelCapabilities', data);
        setPersonnelCapabilities(prev => [...prev, data]);
        showSnackbar('Personnel capability added', 'success');
      }
      setPersonnelCapabilityDialog(false);
      setEditingPersonnelCapability(null);
    } catch (error) {
      console.error('Failed to save personnel capability:', error);
      showSnackbar('Failed to save personnel capability', 'error');
    }
  };

  const handleDeletePersonnelCapability = async (id: string) => {
    if (!confirm('Delete this personnel capability?')) return;
    try {
      await masterDataApi.delete('personnelCapabilities', id);
      setPersonnelCapabilities(prev => prev.filter(pc => pc.id !== id));
      showSnackbar('Personnel capability deleted', 'success');
    } catch (error) {
      console.error('Failed to delete personnel capability:', error);
      showSnackbar('Failed to delete personnel capability', 'error');
    }
  };

  const handleSaveEmployee = async (data: Employee) => {
    try {
      if (editingEmployee) {
        await masterDataApi.update('employees', data);
        setEmployees(prev => prev.map(emp => emp.id === data.id ? data : emp));
        showSnackbar('Employee updated', 'success');
      } else {
        await masterDataApi.add('employees', data);
        setEmployees(prev => [...prev, data]);
        showSnackbar('Employee added', 'success');
      }
      setEmployeeDialog(false);
      setEditingEmployee(null);
    } catch (error) {
      console.error('Failed to save employee:', error);
      showSnackbar('Failed to save employee', 'error');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('Delete this employee?')) return;
    try {
      await masterDataApi.delete('employees', id);
      setEmployees(prev => prev.filter(emp => emp.id !== id));
      showSnackbar('Employee deleted', 'success');
    } catch (error) {
      console.error('Failed to delete employee:', error);
      showSnackbar('Failed to delete employee', 'error');
    }
  };

  // Operation Event Definition Handlers
  const handleSaveOperationEventDefinition = async (data: OperationEventDefinition) => {
    try {
      if (editingOperationEventDefinition) {
        await masterDataApi.update('operationEventDefinitions', data);
        setOperationEventDefinitions(prev => prev.map(oed => oed.id === data.id ? data : oed));
        showSnackbar('Operation Event Definition updated', 'success');
      } else {
        await masterDataApi.add('operationEventDefinitions', data);
        setOperationEventDefinitions(prev => [...prev, data]);
        showSnackbar('Operation Event Definition added', 'success');
      }
      setOperationEventDefinitionDialog(false);
      setEditingOperationEventDefinition(null);
    } catch (error) {
      console.error('Failed to save operation event definition:', error);
      showSnackbar('Failed to save operation event definition', 'error');
    }
  };

  // Operations Event Class Handlers
  const handleSaveOperationsEventClass = async (data: OperationsEventClass) => {
    try {
      if (editingOperationsEventClass) {
        await masterDataApi.update('operationsEventClasses', data);
        setOperationsEventClasses(prev => prev.map(o => o.OperationsEventClassID === data.OperationsEventClassID ? data : o));
        showSnackbar('Operations Event Class updated', 'success');
      } else {
        await masterDataApi.add('operationsEventClasses', data);
        setOperationsEventClasses(prev => [...prev, data]);
        showSnackbar('Operations Event Class added', 'success');
      }
      setOperationsEventClassDialog(false);
      setEditingOperationsEventClass(null);
    } catch (error) {
      console.error('Failed to save operations event class:', error);
      showSnackbar('Failed to save operations event class', 'error');
    }
  };

  const handleDeleteOperationsEventClass = async (id: string) => {
    if (!confirm('Delete this operations event class?')) return;
    try {
      await masterDataApi.delete('operationsEventClasses', id);
      setOperationsEventClasses(prev => prev.filter(o => o.OperationsEventClassID !== id));
      showSnackbar('Operations Event Class deleted', 'success');
    } catch (error) {
      console.error('Failed to delete operations event class:', error);
      showSnackbar('Failed to delete operations event class', 'error');
    }
  };

  // Operations Event Record Handlers
  const handleSaveOperationsEventRecord = async (data: OperationsEventRecord) => {
    try {
      if (editingOperationsEventRecord) {
        await masterDataApi.update('operationsEventRecords', data);
        setOperationsEventRecords(prev => prev.map(o => o.id === data.id ? data : o));
        showSnackbar('Operations Event Record updated', 'success');
      } else {
        await masterDataApi.add('operationsEventRecords', data);
        setOperationsEventRecords(prev => [...prev, data]);
        showSnackbar('Operations Event Record added', 'success');
      }
      setOperationsEventRecordDialog(false);
      setEditingOperationsEventRecord(null);
    } catch (error) {
      console.error('Failed to save operations event record:', error);
      showSnackbar('Failed to save operations event record', 'error');
    }
  };

  const handleDeleteOperationsEventRecord = async (id: string) => {
    if (!confirm('Delete this operations event record?')) return;
    try {
      await masterDataApi.delete('operationsEventRecords', id);
      setOperationsEventRecords(prev => prev.filter(o => o.id !== id));
      showSnackbar('Operations Event Record deleted', 'success');
    } catch (error) {
      console.error('Failed to delete operations event record:', error);
      showSnackbar('Failed to delete operations event record', 'error');
    }
  };

  // Operations Event Entry Handlers
  const handleSaveOperationsEventEntry = async (data: OperationsEventEntry) => {
    try {
      if (editingOperationsEventEntry) {
        await masterDataApi.update('operationsEventEntries', data);
        setOperationsEventEntries(prev => prev.map(o => o.id === data.id ? data : o));
        showSnackbar('Operations Event Entry updated', 'success');
      } else {
        await masterDataApi.add('operationsEventEntries', data);
        setOperationsEventEntries(prev => [...prev, data]);
        showSnackbar('Operations Event Entry added', 'success');
      }
      setOperationsEventEntryDialog(false);
      setEditingOperationsEventEntry(null);
    } catch (error) {
      console.error('Failed to save operations event entry:', error);
      showSnackbar('Failed to save operations event entry', 'error');
    }
  };

  const handleDeleteOperationsEventEntry = async (id: string) => {
    if (!confirm('Delete this operations event entry?')) return;
    try {
      await masterDataApi.delete('operationsEventEntries', id);
      setOperationsEventEntries(prev => prev.filter(o => o.id !== id));
      showSnackbar('Operations Event Entry deleted', 'success');
    } catch (error) {
      console.error('Failed to delete operations event entry:', error);
      showSnackbar('Failed to delete operations event entry', 'error');
    }
  };

  // Shift-Crew Assignment Handlers
  const handleSaveShiftCrewAssignment = async (data: ShiftCrewAssignment) => {
    try {
      if (editingShiftCrewAssignment) {
        await masterDataApi.update('shiftCrewAssignments', data);
        setShiftCrewAssignments(prev => prev.map(sca => sca.id === data.id ? data : sca));
        showSnackbar('Shift-crew assignment updated', 'success');
      } else {
        await masterDataApi.add('shiftCrewAssignments', data);
        setShiftCrewAssignments(prev => [...prev, data]);
        showSnackbar('Shift-crew assignment added', 'success');
      }
      setShiftCrewAssignmentDialog(false);
      setEditingShiftCrewAssignment(null);
    } catch (error) {
      console.error('Failed to save shift-crew assignment:', error);
      showSnackbar('Failed to save shift-crew assignment', 'error');
    }
  };

  const handleDeleteShiftCrewAssignment = async (id: string) => {
    if (!confirm('Delete this shift-crew assignment?')) return;
    try {
      await masterDataApi.delete('shiftCrewAssignments', id);
      setShiftCrewAssignments(prev => prev.filter(sca => sca.id !== id));
      showSnackbar('Shift-crew assignment deleted', 'success');
    } catch (error) {
      console.error('Failed to delete shift-crew assignment:', error);
      showSnackbar('Failed to delete shift-crew assignment', 'error');
    }
  };

  // Helper function to download CSV
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Export to CSV using File System Access API
  const handleExportAll = async () => {
    console.log('Export All button clicked');
    console.log('Checking for showDirectoryPicker API:', 'showDirectoryPicker' in window);
    
    try {
      // Check if File System Access API is supported
      if ('showDirectoryPicker' in window) {
        console.log('File System Access API is supported, showing directory picker...');
        
        try {
          // Request directory picker
          const dirHandle = await (window as any).showDirectoryPicker({
            mode: 'readwrite',
          });

          console.log('Directory selected:', dirHandle.name);

        showSnackbar('Exporting all master data to selected folder...', 'success');

        // Export Material Classes
        const mcHeaders = 'MaterialClassID,MaterialClassName,MaterialClassDescription';
        const mcRows = materialClasses.map(mc => `${mc.id},${mc.name},${mc.description || ''}`).join('\n');
        const mcCsv = `${mcHeaders}\n${mcRows}`;
        const mcFileHandle = await dirHandle.getFileHandle('material_classes.csv', { create: true });
        const mcWritable = await mcFileHandle.createWritable();
        await mcWritable.write(mcCsv);
        await mcWritable.close();

        // Export Materials
        const mHeaders = 'MaterialID,MaterialName,MaterialClassID,MaterialDescription';
        const mRows = materials.map(m => `${m.id},${m.name},${m.classId},${m.description || ''}`).join('\n');
        const mCsv = `${mHeaders}\n${mRows}`;
        const mFileHandle = await dirHandle.getFileHandle('materials.csv', { create: true });
        const mWritable = await mFileHandle.createWritable();
        await mWritable.write(mCsv);
        await mWritable.close();

        // Export Material Lots
        const mlHeaders = 'MaterialLotID,MaterialID,LotQuantity,LotUoM,ReceivedDateTime,ProducedDateTime,SupplierOrProducerID,SupplierOrProducerName,ProducedByProcessSegmentID';
        const mlRows = materialLots.map(ml => `${ml.id},${ml.materialId},${ml.lotQuantity || ''},${ml.lotUoM || ''},${ml.receivedDateTime || ''},${ml.producedDateTime || ''},${ml.supplierOrProducerId || ''},${ml.supplierOrProducerName || ''},${ml.producedByProcessSegmentId || ''}`).join('\n');
        const mlCsv = `${mlHeaders}\n${mlRows}`;
        const mlFileHandle = await dirHandle.getFileHandle('material_lots.csv', { create: true });
        const mlWritable = await mlFileHandle.createWritable();
        await mlWritable.write(mlCsv);
        await mlWritable.close();

        // Export Material Class Properties
        const mcpHeaders = 'MaterialClassPropertyId,PropertyName,Description,ValueDataType,Unit,MinValue,MaxValue';
        const mcpRows = materialClassProperties.map(mcp => `${mcp.id},${mcp.propertyName},${mcp.description || ''},${mcp.valueDataType || ''},${mcp.unit || ''},${mcp.minValue || ''},${mcp.maxValue || ''}`).join('\n');
        const mcpCsv = `${mcpHeaders}\n${mcpRows}`;
        const mcpFileHandle = await dirHandle.getFileHandle('material_class_properties.csv', { create: true });
        const mcpWritable = await mcpFileHandle.createWritable();
        await mcpWritable.write(mcpCsv);
        await mcpWritable.close();

        // Export Material Class Property Assignments
        const mcpaHeaders = 'MaterialClassPropertyId,MaterialDefinitionPropertyId';
        const mcpaRows = materialClassPropertyAssignments.map(mcpa => `${mcpa.materialClassPropertyId},${mcpa.materialDefinitionPropertyId}`).join('\n');
        const mcpaCsv = `${mcpaHeaders}\n${mcpaRows}`;
        const mcpaFileHandle = await dirHandle.getFileHandle('material_class_properties_assignments.csv', { create: true });
        const mcpaWritable = await mcpaFileHandle.createWritable();
        await mcpaWritable.write(mcpaCsv);
        await mcpaWritable.close();

        // Export Material Definition Properties
        const mdpHeaders = 'id,Value,Description,ValueUnitOfMeasure';
        const mdpRows = materialDefinitionProperties.map(mdp => `${mdp.id},${mdp.value},${mdp.description || ''},${mdp.valueUnitOfMeasure || ''}`).join('\n');
        const mdpCsv = `${mdpHeaders}\n${mdpRows}`;
        const mdpFileHandle = await dirHandle.getFileHandle('material_definition_property_template.csv', { create: true });
        const mdpWritable = await mdpFileHandle.createWritable();
        await mdpWritable.write(mdpCsv);
        await mdpWritable.close();

        // Export Material Definition Property Assignments
        const mdpaHeaders = 'PK,Id,MaterialDefinitionId,Value,Description,ValueUnitOfMeasure';
        const mdpaRows = materialDefinitionPropertyAssignments.map(mdpa => `${mdpa.pk},${mdpa.id},${mdpa.materialDefinitionId},${mdpa.value},${mdpa.description || ''},${mdpa.valueUnitOfMeasure || ''}`).join('\n');
        const mdpaCsv = `${mdpaHeaders}\n${mdpaRows}`;
        const mdpaFileHandle = await dirHandle.getFileHandle('material_definition_property_assignment_template.csv', { create: true });
        const mdpaWritable = await mdpaFileHandle.createWritable();
        await mdpaWritable.write(mdpaCsv);
        await mdpaWritable.close();

        // Export Equipment Classes
        const ecHeaders = 'EquipmentClassID,EquipmentClassName,EquipmentClassDescription';
        const ecRows = equipmentClasses.map(ec => `${ec.id},${ec.name},${ec.description || ''}`).join('\n');
        const ecCsv = `${ecHeaders}\n${ecRows}`;
        const ecFileHandle = await dirHandle.getFileHandle('equipment_classes.csv', { create: true });
        const ecWritable = await ecFileHandle.createWritable();
        await ecWritable.write(ecCsv);
        await ecWritable.close();

        // Export Equipment
        const eHeaders = 'EquipmentID,EquipmentName,EquipmentClassID,EquipmentDescription,EquipmentParentId';
        const eRows = equipment.map(e => `${e.id},${e.name},${e.classId},${e.description || ''},${e.parentEquipmentId || ''}`).join('\n');
        const eCsv = `${eHeaders}\n${eRows}`;
        const eFileHandle = await dirHandle.getFileHandle('equipment.csv', { create: true });
        const eWritable = await eFileHandle.createWritable();
        await eWritable.write(eCsv);
        await eWritable.close();

        // Export Equipment Properties
        const epHeaders = 'EquipmentPropertyID,PropertyName,Description,ValueDataType,Unit,MinValue,MaxValue';
        const epRows = equipmentProperties.map(ep => `${ep.id},${ep.name},${ep.description || ''},${ep.valueDataType},${ep.unit || ''},${ep.minValue || ''},${ep.maxValue || ''}`).join('\n');
        const epCsv = `${epHeaders}\n${epRows}`;
        const epFileHandle = await dirHandle.getFileHandle('equipment_properties.csv', { create: true });
        const epWritable = await epFileHandle.createWritable();
        await epWritable.write(epCsv);
        await epWritable.close();

        // Export Equipment Property Assignments
        const epaHeaders = 'EquipmentPropertyAssignmentID,EquipmentID,ProcessSegmentID,EquipmentPropertyID,SamplingMode,SamplingIntervalSeconds';
        const epaRows = equipmentPropertyAssignments.map(epa => `${epa.id},${epa.equipmentId},${epa.processSegmentId},${epa.equipmentPropertyId},${epa.samplingMode},${epa.samplingIntervalSeconds || ''}`).join('\n');
        const epaCsv = `${epaHeaders}\n${epaRows}`;
        const epaFileHandle = await dirHandle.getFileHandle('equipment_property_assignments.csv', { create: true });
        const epaWritable = await epaFileHandle.createWritable();
        await epaWritable.write(epaCsv);
        await epaWritable.close();

        // Export Plants
        const pHeaders = 'PlantID,PlantName,PlantDescription';
        const pRows = plants.map(p => `${p.id},${p.name},${p.description || ''}`).join('\n');
        const pCsv = `${pHeaders}\n${pRows}`;
        const pFileHandle = await dirHandle.getFileHandle('plants.csv', { create: true });
        const pWritable = await pFileHandle.createWritable();
        await pWritable.write(pCsv);
        await pWritable.close();

        // Export Production Lines
        const plHeaders = 'ProductionLineID,ProductionLineName,PlantID,ProductionLineDescription';
        const plRows = productionLines.map(pl => `${pl.id},${pl.name},${pl.plantId},${pl.description || ''}`).join('\n');
        const plCsv = `${plHeaders}\n${plRows}`;
        const plFileHandle = await dirHandle.getFileHandle('production_lines.csv', { create: true });
        const plWritable = await plFileHandle.createWritable();
        await plWritable.write(plCsv);
        await plWritable.close();

        // Export Line Equipment
        const leHeaders = 'ProductionLineID,EquipmentID,Sequence';
        const leRows = lineEquipment.map(le => `${le.lineId},${le.equipmentId},${le.sequence}`).join('\n');
        const leCsv = `${leHeaders}\n${leRows}`;
        const leFileHandle = await dirHandle.getFileHandle('line_equipment.csv', { create: true });
        const leWritable = await leFileHandle.createWritable();
        await leWritable.write(leCsv);
        await leWritable.close();

        // Export Process Segments
        const psHeaders = 'ProcessSegmentID,ProcessSegmentName,ProductMaterialID,Sequence,DurationHours,ProcessSegmentDescription';
        const psRows = processSegments.map(ps => `${ps.id},${ps.name},${ps.productMaterialId},${ps.sequence},${ps.durationHours || ''},${ps.description || ''}`).join('\n');
        const psCsv = `${psHeaders}\n${psRows}`;
        const psFileHandle = await dirHandle.getFileHandle('process_segments.csv', { create: true });
        const psWritable = await psFileHandle.createWritable();
        await psWritable.write(psCsv);
        await psWritable.close();

        // Export Segment Material BOM
        const sbHeaders = 'ProcessSegmentID,MaterialID,QtyPerUnit,UoM,MaterialUse';
        const sbRows = segmentBOMs.map(sb => `${sb.processSegmentId},${sb.materialId},${sb.qtyPerUnit},${sb.uom},${sb.materialUse}`).join('\n');
        const sbCsv = `${sbHeaders}\n${sbRows}`;
        const sbFileHandle = await dirHandle.getFileHandle('segment_material_bom.csv', { create: true });
        const sbWritable = await sbFileHandle.createWritable();
        await sbWritable.write(sbCsv);
        await sbWritable.close();

        // Export Maintenance BOM
        const mbHeaders = 'MaintenanceBOMID,EquipmentID,ProcessSegmentID,ProcessSegmentSequence,MaterialID,QtyPerUnit,PersonQuantity,PersonQuantityUoM,EmployeeID,PersonClassID,UoM,MaterialUse';
        const mbRows = maintenanceBOMs.map(mb => `${mb.id},${mb.equipmentId},${mb.processSegmentId},${mb.processSegmentSequence ?? ''},${mb.materialId},${mb.qtyPerUnit},${mb.personQuantity || ''},${mb.personQuantityUoM || 'Person'},${mb.employeeId || ''},${mb.personClassId || ''},${mb.uom},${mb.materialUse}`).join('\n');
        const mbCsv = `${mbHeaders}\n${mbRows}`;
        const mbFileHandle = await dirHandle.getFileHandle('maintenance_bom.csv', { create: true });
        const mbWritable = await mbFileHandle.createWritable();
        await mbWritable.write(mbCsv);
        await mbWritable.close();

        // Export Equipment Usage
        const euHeaders = 'ProcessSegmentID,EquipmentID,Sequence';
        const euRows = equipmentUsages.map((eu: any) => `${eu.processSegmentId},${eu.equipmentId},${eu.sequence || ''}`).join('\n');
        const euCsv = `${euHeaders}\n${euRows}`;
        const euFileHandle = await dirHandle.getFileHandle('equipment_usage.csv', { create: true });
        const euWritable = await euFileHandle.createWritable();
        await euWritable.write(euCsv);
        await euWritable.close();

        showSnackbar('All master data exported successfully to selected folder!', 'success');
        } catch (pickerError: any) {
          console.error('Directory picker error:', pickerError);
          if (pickerError.name === 'AbortError') {
            showSnackbar('Folder selection cancelled', 'error');
          } else {
            throw pickerError; // Re-throw to outer catch
          }
        }
      } else {
        // Fallback: download files directly to browser's default download folder
        console.log('File System Access API not supported, using fallback downloads');
        handleExportAllFallback();
      }
    } catch (error: any) {
      console.error('Export error details:', error);
      if (error.name === 'AbortError') {
        // User cancelled, already handled
        return;
      } else if (error.name === 'NotAllowedError') {
        showSnackbar('Permission denied. Please allow folder access.', 'error');
      } else if (error.name === 'SecurityError') {
        showSnackbar('Security error. Using fallback download method.', 'error');
        // Fallback to regular downloads
        handleExportAllFallback();
      } else {
        console.error('Export failed:', error);
        showSnackbar(`Failed to export: ${error.message || 'Unknown error'}`, 'error');
      }
    }
  };

  // Fallback export method (direct downloads)
  const handleExportAllFallback = () => {
    try {
      showSnackbar('Exporting all master data...', 'success');

      // Export Material Classes
      const mcHeaders = 'MaterialClassID,MaterialClassName,MaterialClassDescription';
      const mcRows = materialClasses.map(mc => `${mc.id},${mc.name},${mc.description || ''}`).join('\n');
      downloadCSV(`${mcHeaders}\n${mcRows}`, 'material_classes.csv');

      // Export Materials
      const mHeaders = 'MaterialID,MaterialName,MaterialClassID,MaterialDescription';
      const mRows = materials.map(m => `${m.id},${m.name},${m.classId},${m.description || ''}`).join('\n');
      downloadCSV(`${mHeaders}\n${mRows}`, 'materials.csv');

      // Export Material Lots
      const mlHeaders = 'MaterialLotID,MaterialID,LotQuantity,LotUoM,ReceivedDateTime,ProducedDateTime,SupplierOrProducerID,SupplierOrProducerName,ProducedByProcessSegmentID';
      const mlRows = materialLots.map(ml => `${ml.id},${ml.materialId},${ml.lotQuantity || ''},${ml.lotUoM || ''},${ml.receivedDateTime || ''},${ml.producedDateTime || ''},${ml.supplierOrProducerId || ''},${ml.supplierOrProducerName || ''},${ml.producedByProcessSegmentId || ''}`).join('\n');
      downloadCSV(`${mlHeaders}\n${mlRows}`, 'material_lots.csv');

      // Export Material Class Properties
      const mcpHeaders = 'MaterialClassPropertyId,PropertyName,Description,ValueDataType,Unit,MinValue,MaxValue';
      const mcpRows = materialClassProperties.map(mcp => `${mcp.id},${mcp.propertyName},${mcp.description || ''},${mcp.valueDataType || ''},${mcp.unit || ''},${mcp.minValue || ''},${mcp.maxValue || ''}`).join('\n');
      downloadCSV(`${mcpHeaders}\n${mcpRows}`, 'material_class_properties.csv');

      // Export Material Class Property Assignments
      const mcpaHeaders = 'MaterialClassPropertyId,MaterialDefinitionPropertyId';
      const mcpaRows = materialClassPropertyAssignments.map(mcpa => `${mcpa.materialClassPropertyId},${mcpa.materialDefinitionPropertyId}`).join('\n');
      downloadCSV(`${mcpaHeaders}\n${mcpaRows}`, 'material_class_properties_assignments.csv');

      // Export Material Definition Properties
      const mdpHeaders = 'id,Value,Description,ValueUnitOfMeasure';
      const mdpRows = materialDefinitionProperties.map(mdp => `${mdp.id},${mdp.value},${mdp.description || ''},${mdp.valueUnitOfMeasure || ''}`).join('\n');
      downloadCSV(`${mdpHeaders}\n${mdpRows}`, 'material_definition_property_template.csv');

      // Export Material Definition Property Assignments
      const mdpaHeaders = 'PK,Id,MaterialDefinitionId,Value,Description,ValueUnitOfMeasure';
      const mdpaRows = materialDefinitionPropertyAssignments.map(mdpa => `${mdpa.pk},${mdpa.id},${mdpa.materialDefinitionId},${mdpa.value},${mdpa.description || ''},${mdpa.valueUnitOfMeasure || ''}`).join('\n');
      downloadCSV(`${mdpaHeaders}\n${mdpaRows}`, 'material_definition_property_assignment_template.csv');

      // Export Equipment Classes
      const ecHeaders = 'EquipmentClassID,EquipmentClassName,EquipmentClassDescription';
      const ecRows = equipmentClasses.map(ec => `${ec.id},${ec.name},${ec.description || ''}`).join('\n');
      downloadCSV(`${ecHeaders}\n${ecRows}`, 'equipment_classes.csv');

      // Export Equipment
      const eHeaders = 'EquipmentID,EquipmentName,EquipmentClassID,EquipmentDescription,EquipmentParentId';
      const eRows = equipment.map(e => `${e.id},${e.name},${e.classId},${e.description || ''},${e.parentEquipmentId || ''}`).join('\n');
      downloadCSV(`${eHeaders}\n${eRows}`, 'equipment.csv');

      // Export Equipment Properties
      const epHeaders = 'EquipmentPropertyID,PropertyName,Description,ValueDataType,Unit,MinValue,MaxValue';
      const epRows = equipmentProperties.map(ep => `${ep.id},${ep.name},${ep.description || ''},${ep.valueDataType},${ep.unit || ''},${ep.minValue || ''},${ep.maxValue || ''}`).join('\n');
      downloadCSV(`${epHeaders}\n${epRows}`, 'equipment_properties.csv');

      // Export Equipment Property Assignments
      const epaHeaders = 'EquipmentPropertyAssignmentID,EquipmentID,ProcessSegmentID,EquipmentPropertyID,SamplingMode,SamplingIntervalSeconds';
      const epaRows = equipmentPropertyAssignments.map(epa => `${epa.id},${epa.equipmentId},${epa.processSegmentId},${epa.equipmentPropertyId},${epa.samplingMode},${epa.samplingIntervalSeconds || ''}`).join('\n');
      downloadCSV(`${epaHeaders}\n${epaRows}`, 'equipment_property_assignments.csv');

      // Export Plants
      const pHeaders = 'PlantID,PlantName,PlantDescription';
      const pRows = plants.map(p => `${p.id},${p.name},${p.description || ''}`).join('\n');
      downloadCSV(`${pHeaders}\n${pRows}`, 'plants.csv');

      // Export Production Lines
      const plHeaders = 'ProductionLineID,ProductionLineName,PlantID,ProductionLineDescription';
      const plRows = productionLines.map(pl => `${pl.id},${pl.name},${pl.plantId},${pl.description || ''}`).join('\n');
      downloadCSV(`${plHeaders}\n${plRows}`, 'production_lines.csv');

      // Export Line Equipment
      const leHeaders = 'ProductionLineID,EquipmentID,Sequence';
      const leRows = lineEquipment.map(le => `${le.lineId},${le.equipmentId},${le.sequence}`).join('\n');
      downloadCSV(`${leHeaders}\n${leRows}`, 'line_equipment.csv');

      // Export Process Segments
      const psHeaders = 'ProcessSegmentID,ProcessSegmentName,ProductMaterialID,Sequence,DurationHours,ProcessSegmentDescription';
      const psRows = processSegments.map(ps => `${ps.id},${ps.name},${ps.productMaterialId},${ps.sequence},${ps.durationHours || ''},${ps.description || ''}`).join('\n');
      downloadCSV(`${psHeaders}\n${psRows}`, 'process_segments.csv');

      // Export Segment Material BOM
      const sbHeaders = 'ProcessSegmentID,MaterialID,QtyPerUnit,UoM,MaterialUse';
      const sbRows = segmentBOMs.map(sb => `${sb.processSegmentId},${sb.materialId},${sb.qtyPerUnit},${sb.uom},${sb.materialUse}`).join('\n');
      downloadCSV(`${sbHeaders}\n${sbRows}`, 'segment_material_bom.csv');

      // Export Maintenance BOM
      const mbHeaders = 'MaintenanceBOMID,EquipmentID,ProcessSegmentID,ProcessSegmentSequence,MaterialID,QtyPerUnit,PersonQuantity,PersonQuantityUoM,EmployeeID,PersonClassID,UoM,MaterialUse';
      const mbRows = maintenanceBOMs.map(mb => `${mb.id},${mb.equipmentId},${mb.processSegmentId},${mb.processSegmentSequence ?? ''},${mb.materialId},${mb.qtyPerUnit},${mb.personQuantity || ''},${mb.personQuantityUoM || 'Person'},${mb.employeeId || ''},${mb.personClassId || ''},${mb.uom},${mb.materialUse}`).join('\n');
      downloadCSV(`${mbHeaders}\n${mbRows}`, 'maintenance_bom.csv');

      // Export Equipment Usage
      const euHeaders = 'ProcessSegmentID,EquipmentID,Sequence';
      const euRows = equipmentUsages.map((eu: any) => `${eu.processSegmentId},${eu.equipmentId},${eu.sequence || ''}`).join('\n');
      downloadCSV(`${euHeaders}\n${euRows}`, 'equipment_usage.csv');

      showSnackbar('All master data exported successfully!', 'success');
    } catch (error) {
      console.error('Fallback export failed:', error);
      showSnackbar('Failed to export master data', 'error');
    }
  };

  const buildTemplateCsvPayloads = () => {
    const mcHeaders = 'MaterialClassID,MaterialClassName,MaterialClassDescription';
    const mcRows = materialClasses.map(mc => `${mc.id},${mc.name},${mc.description || ''}`).join('\n');

    const mHeaders = 'MaterialID,MaterialName,MaterialClassID,MaterialDescription';
    const mRows = materials.map(m => `${m.id},${m.name},${m.classId},${m.description || ''}`).join('\n');

    const mlHeaders = 'MaterialLotID,MaterialID,LotQuantity,LotUoM,ReceivedDateTime,ProducedDateTime,SupplierOrProducerID,SupplierOrProducerName,ProducedByProcessSegmentID';
    const mlRows = materialLots.map(ml => `${ml.id},${ml.materialId},${ml.lotQuantity || ''},${ml.lotUoM || ''},${ml.receivedDateTime || ''},${ml.producedDateTime || ''},${ml.supplierOrProducerId || ''},${ml.supplierOrProducerName || ''},${ml.producedByProcessSegmentId || ''}`).join('\n');

    const mcpHeaders = 'MaterialClassPropertyId,PropertyName,Description,ValueDataType,Unit,MinValue,MaxValue';
    const mcpRows = materialClassProperties.map(mcp => `${mcp.id},${mcp.propertyName},${mcp.description || ''},${mcp.valueDataType || ''},${mcp.unit || ''},${mcp.minValue || ''},${mcp.maxValue || ''}`).join('\n');

    const mcpaHeaders = 'MaterialClassPropertyId,MaterialDefinitionPropertyId';
    const mcpaRows = materialClassPropertyAssignments.map(mcpa => `${mcpa.materialClassPropertyId},${mcpa.materialDefinitionPropertyId}`).join('\n');

    const mdpHeaders = 'id,Value,Description,ValueUnitOfMeasure';
    const mdpRows = materialDefinitionProperties.map(mdp => `${mdp.id},${mdp.value},${mdp.description || ''},${mdp.valueUnitOfMeasure || ''}`).join('\n');

    const mdpaHeaders = 'PK,Id,MaterialDefinitionId,Value,Description,ValueUnitOfMeasure';
    const mdpaRows = materialDefinitionPropertyAssignments.map(mdpa => `${mdpa.pk},${mdpa.id},${mdpa.materialDefinitionId},${mdpa.value},${mdpa.description || ''},${mdpa.valueUnitOfMeasure || ''}`).join('\n');

    const ecHeaders = 'EquipmentClassID,EquipmentClassName,EquipmentClassDescription';
    const ecRows = equipmentClasses.map(ec => `${ec.id},${ec.name},${ec.description || ''}`).join('\n');

    const eHeaders = 'EquipmentID,EquipmentName,EquipmentClassID,EquipmentDescription,EquipmentParentId';
    const eRows = equipment.map(e => `${e.id},${e.name},${e.classId},${e.description || ''},${e.parentEquipmentId || ''}`).join('\n');

    const epHeaders = 'EquipmentPropertyID,PropertyName,Description,ValueDataType,Unit,MinValue,MaxValue';
    const epRows = equipmentProperties.map(ep => `${ep.id},${ep.name},${ep.description || ''},${ep.valueDataType},${ep.unit || ''},${ep.minValue || ''},${ep.maxValue || ''}`).join('\n');

    const epaHeaders = 'EquipmentPropertyAssignmentID,EquipmentID,ProcessSegmentID,EquipmentPropertyID,SamplingMode,SamplingIntervalSeconds';
    const epaRows = equipmentPropertyAssignments.map(epa => `${epa.id},${epa.equipmentId},${epa.processSegmentId},${epa.equipmentPropertyId},${epa.samplingMode},${epa.samplingIntervalSeconds || ''}`).join('\n');

    const pHeaders = 'PlantID,PlantName,PlantDescription';
    const pRows = plants.map(p => `${p.id},${p.name},${p.description || ''}`).join('\n');

    const plHeaders = 'ProductionLineID,ProductionLineName,PlantID,ProductionLineDescription';
    const plRows = productionLines.map(pl => `${pl.id},${pl.name},${pl.plantId},${pl.description || ''}`).join('\n');

    const leHeaders = 'ProductionLineID,EquipmentID,Sequence';
    const leRows = lineEquipment.map(le => `${le.lineId},${le.equipmentId},${le.sequence}`).join('\n');

    const psHeaders = 'ProcessSegmentID,ProcessSegmentName,ProductMaterialID,Sequence,DurationHours,ProcessSegmentDescription';
    const psRows = processSegments.map(ps => `${ps.id},${ps.name},${ps.productMaterialId},${ps.sequence},${ps.durationHours || ''},${ps.description || ''}`).join('\n');

    const sbHeaders = 'ProcessSegmentID,MaterialID,QtyPerUnit,UoM,MaterialUse';
    const sbRows = segmentBOMs.map(sb => `${sb.processSegmentId},${sb.materialId},${sb.qtyPerUnit},${sb.uom},${sb.materialUse}`).join('\n');

    const mbHeaders = 'MaintenanceBOMID,EquipmentID,ProcessSegmentID,ProcessSegmentSequence,MaterialID,QtyPerUnit,PersonQuantity,PersonQuantityUoM,EmployeeID,PersonClassID,UoM,MaterialUse';
    const mbRows = maintenanceBOMs.map(mb => `${mb.id},${mb.equipmentId},${mb.processSegmentId},${mb.processSegmentSequence ?? ''},${mb.materialId},${mb.qtyPerUnit},${mb.personQuantity || ''},${mb.personQuantityUoM || 'Person'},${mb.employeeId || ''},${mb.personClassId || ''},${mb.uom},${mb.materialUse}`).join('\n');

    const euHeaders = 'ProcessSegmentID,EquipmentID,Sequence';
    const euRows = equipmentUsages.map((eu: any) => `${eu.processSegmentId},${eu.equipmentId},${eu.sequence || ''}`).join('\n');

    const personClassHeaders = 'PersonClassID,PersonClassName,Description';
    const personClassRows = personClasses.map(pc => `${pc.id},${pc.name},${pc.description || ''}`).join('\n');

    const capabilityHeaders = 'PersonnelCapabilityID,CapabilityName,Description';
    const capabilityRows = personnelCapabilities.map(pc => `${pc.id},${pc.capabilityName},${pc.description || ''}`).join('\n');

    const employeeHeaders = 'EmployeeID,EmployeeName,PersonClassID,PersonnelCapabilityID,Email,PhoneNumber,Description';
    const employeeRows = employees.map(emp => `${emp.id},${emp.employeeName},${emp.personClassId},${emp.personnelCapabilityId},${emp.email || ''},${emp.phoneNumber || ''},${emp.description || ''}`).join('\n');

    return [
      { filename: 'material_classes.csv', content: `${mcHeaders}\n${mcRows}` },
      { filename: 'materials.csv', content: `${mHeaders}\n${mRows}` },
      { filename: 'material_lots.csv', content: `${mlHeaders}\n${mlRows}` },
      { filename: 'material_class_properties.csv', content: `${mcpHeaders}\n${mcpRows}` },
      { filename: 'material_class_properties_assignments.csv', content: `${mcpaHeaders}\n${mcpaRows}` },
      { filename: 'material_definition_property_template.csv', content: `${mdpHeaders}\n${mdpRows}` },
      { filename: 'material_definition_property_assignment_template.csv', content: `${mdpaHeaders}\n${mdpaRows}` },
      { filename: 'equipment_classes.csv', content: `${ecHeaders}\n${ecRows}` },
      { filename: 'equipment.csv', content: `${eHeaders}\n${eRows}` },
      { filename: 'equipment_properties.csv', content: `${epHeaders}\n${epRows}` },
      { filename: 'equipment_property_assignments.csv', content: `${epaHeaders}\n${epaRows}` },
      { filename: 'plants.csv', content: `${pHeaders}\n${pRows}` },
      { filename: 'production_lines.csv', content: `${plHeaders}\n${plRows}` },
      { filename: 'line_equipment.csv', content: `${leHeaders}\n${leRows}` },
      { filename: 'process_segments.csv', content: `${psHeaders}\n${psRows}` },
      { filename: 'segment_material_bom.csv', content: `${sbHeaders}\n${sbRows}` },
      { filename: 'maintenance_bom.csv', content: `${mbHeaders}\n${mbRows}` },
      { filename: 'equipment_usage.csv', content: `${euHeaders}\n${euRows}` },
      { filename: 'person_classes.csv', content: `${personClassHeaders}\n${personClassRows}` },
      { filename: 'personnel_capabilities.csv', content: `${capabilityHeaders}\n${capabilityRows}` },
      { filename: 'employees.csv', content: `${employeeHeaders}\n${employeeRows}` },
    ];
  };

  // Update template CSV files from current UI data.
  // This reuses the export pipeline and asks user to select the template folder.
  const handleUpdateTemplateCsvFiles = async () => {
    if (!('showDirectoryPicker' in window)) {
      showSnackbar('Your browser does not support direct file overwrite. Use Export All and copy files manually.', 'error');
      return;
    }

    const proceed = confirm(
      'This will overwrite template CSV files with current UI data.\n' +
      'Please select frontend/public/templates/masterdata in the next dialog. Continue?'
    );
    if (!proceed) return;

    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      const payloads = buildTemplateCsvPayloads();
      let changedCount = 0;

      for (const file of payloads) {
        const fileHandle = await dirHandle.getFileHandle(file.filename, { create: true });
        const existingFile = await fileHandle.getFile();
        const existingContent = await existingFile.text();

        if (existingContent === file.content) {
          continue;
        }

        const writable = await fileHandle.createWritable();
        await writable.write(file.content);
        await writable.close();
        changedCount++;
      }

      showSnackbar(
        changedCount === 0
          ? 'No template CSV changes detected.'
          : `Updated ${changedCount} template CSV file(s).`,
        'success'
      );
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        showSnackbar('Folder selection cancelled', 'error');
        return;
      }
      console.error('Failed to update template CSV files:', error);
      showSnackbar('Failed to update template CSV files', 'error');
    }
  };

  const handleUpdateCurrentTabTemplateCsvFile = async () => {
    const storeConfig = STORE_TEMPLATE_MAP[categoryTab]?.[tabValue];
    if (!storeConfig) {
      showSnackbar('No template configured for this tab', 'error');
      return;
    }
    if (!TEMPLATE_UPDATE_SUPPORTED_FILES.has(storeConfig.csvFile)) {
      showSnackbar(`Template update not yet supported for ${storeConfig.label}`, 'error');
      return;
    }
    if (!('showDirectoryPicker' in window)) {
      showSnackbar('Your browser does not support direct file overwrite. Use Export All and copy files manually.', 'error');
      return;
    }

    const proceed = confirm(
      `This will overwrite ${storeConfig.csvFile} with current UI data from ${storeConfig.label}.\n` +
      'Please select frontend/public/templates/masterdata in the next dialog. Continue?'
    );
    if (!proceed) return;

    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      const payload = buildTemplateCsvPayloads().find(p => p.filename === storeConfig.csvFile);
      if (!payload) {
        showSnackbar(`No CSV payload available for ${storeConfig.csvFile}`, 'error');
        return;
      }

      const fileHandle = await dirHandle.getFileHandle(payload.filename, { create: true });
      const existingFile = await fileHandle.getFile();
      const existingContent = await existingFile.text();

      if (existingContent === payload.content) {
        showSnackbar(`No changes detected for ${payload.filename}`, 'success');
        return;
      }

      const writable = await fileHandle.createWritable();
      await writable.write(payload.content);
      await writable.close();

      showSnackbar(`Updated ${payload.filename}`, 'success');
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        showSnackbar('Folder selection cancelled', 'error');
        return;
      }
      console.error('Failed to update current tab template CSV file:', error);
      showSnackbar('Failed to update tab template CSV', 'error');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            Master Data Management
          </Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleResetToTemplates}
              sx={{ mr: 1 }}
            >
              Reset All to Templates
            </Button>
            <Tooltip
              title={STORE_TEMPLATE_MAP[categoryTab]?.[tabValue]
                ? `Reset only "${STORE_TEMPLATE_MAP[categoryTab][tabValue]!.label}" to template`
                : 'No template available for this tab'}
              arrow
            >
              <span>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleResetCurrentTabToTemplate}
                  disabled={!STORE_TEMPLATE_MAP[categoryTab]?.[tabValue]}
                  sx={{ mr: 1 }}
                >
                  Reset Tab to Template
                </Button>
              </span>
            </Tooltip>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<RefreshIcon />}
              onClick={handleForceDatabaseReset}
              sx={{ mr: 1 }}
              title="Use this if database schema has been upgraded"
            >
              Force DB Reset
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              sx={{ mr: 1 }}
            >
              Import
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<DownloadIcon />}
              onClick={handleUpdateTemplateCsvFiles}
              sx={{ mr: 1 }}
            >
              Update Template CSVs
            </Button>
            <Tooltip
              title={(() => {
                const cfg = STORE_TEMPLATE_MAP[categoryTab]?.[tabValue];
                if (!cfg) return 'No template configured for this tab';
                if (!TEMPLATE_UPDATE_SUPPORTED_FILES.has(cfg.csvFile)) return `Update not yet supported for ${cfg.label}`;
                return `Update only ${cfg.csvFile}`;
              })()}
              arrow
            >
              <span>
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<DownloadIcon />}
                  onClick={handleUpdateCurrentTabTemplateCsvFile}
                  disabled={(() => {
                    const cfg = STORE_TEMPLATE_MAP[categoryTab]?.[tabValue];
                    return !cfg || !TEMPLATE_UPDATE_SUPPORTED_FILES.has(cfg.csvFile);
                  })()}
                  sx={{ mr: 1 }}
                >
                  Update Tab Template CSV
                </Button>
              </span>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleExportAll}
            >
              Export All
            </Button>
          </Box>
        </Box>
        <Alert severity="info">
          Manage master data organized by category: <strong>Materials</strong> (raw materials, products & lots) | <strong>Equipment & Facilities</strong> (machines, plants, lines) | <strong>Production</strong> (processes, BOMs, equipment usage).
          All data is stored locally with timestamps and version tracking.
        </Alert>
      </Box>

      {/* Category Tabs */}
      <Tabs 
        value={categoryTab} 
        onChange={handleCategoryChange} 
        sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
        centered
      >
        <Tab label="📦 Materials" />
        <Tab label="🏭 Equipment & Facilities" />
        <Tab label="⚙️ Production" />
        <Tab label="📋 Operations" />
        <Tab label="👥 Personnel Information" />
      </Tabs>

      {/* Materials Category */}
      {categoryTab === 0 && (
        <Box>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
            <Tab label="Material Classes" />
            <Tab label="Materials" />
            <Tab label="Material Lots" />
            <Tab label="Material Sublots" />
            <Tab label="Material Class Properties" />
            <Tab label="Material Class Property Assignments" />
            <Tab label="Material Definition Properties" />
            <Tab label="Material Definition Property Assignments" />
          </Tabs>

          <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
            {tabValue === 0 && (
              <MaterialClassTab
                data={materialClasses}
                onAdd={() => {
                  setEditingMaterialClass(null);
                  setMaterialClassDialog(true);
                }}
                onEdit={(item) => {
                  setEditingMaterialClass(item);
                  setMaterialClassDialog(true);
                }}
                onDelete={handleDeleteMaterialClass}
              />
            )}

            {tabValue === 1 && (
              <MaterialTab
                data={materials}
                materialClasses={materialClasses}
                onAdd={() => {
                  setEditingMaterial(null);
                  setMaterialDialog(true);
                }}
                onEdit={(item) => {
                  setEditingMaterial(item);
                  setMaterialDialog(true);
                }}
                onDelete={handleDeleteMaterial}
              />
            )}

            {tabValue === 2 && (
              <MaterialLotTab
                data={materialLots}
                materials={materials}
                onAdd={() => {
                  setEditingMaterialLot(null);
                  setMaterialLotDialog(true);
                }}
                onEdit={(item) => {
                  setEditingMaterialLot(item);
                  setMaterialLotDialog(true);
                }}
                onDelete={handleDeleteMaterialLot}
              />
            )}

            {tabValue === 3 && (
              <MaterialSublotTab
                data={materialSublots}
                materialLots={materialLots}
                materials={materials}
                onAdd={() => {
                  setEditingMaterialSublot(null);
                  setMaterialSublotDialog(true);
                }}
                onEdit={(item) => {
                  setEditingMaterialSublot(item);
                  setMaterialSublotDialog(true);
                }}
                onDelete={handleDeleteMaterialSublot}
              />
            )}

            {tabValue === 4 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Material Class Properties</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setEditingMaterialClassProperty(null);
                      setMaterialClassPropertyDialog(true);
                    }}
                  >
                    Add Property
                  </Button>
                </Box>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Property Name</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Value Data Type</TableCell>
                        <TableCell>Unit</TableCell>
                        <TableCell>Min Value</TableCell>
                        <TableCell>Max Value</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {materialClassProperties.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.id}</TableCell>
                          <TableCell>{item.propertyName}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.valueDataType}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell>{item.minValue}</TableCell>
                          <TableCell>{item.maxValue}</TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingMaterialClassProperty(item);
                                setMaterialClassPropertyDialog(true);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteMaterialClassProperty(item.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {tabValue === 5 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Material Class Property Assignments</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setEditingMaterialClassPropertyAssignment(null);
                      setMaterialClassPropertyAssignmentDialog(true);
                    }}
                  >
                    Add Assignment
                  </Button>
                </Box>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Material Class Property</TableCell>
                        <TableCell>Material Definition Property</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {materialClassPropertyAssignments.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.id}</TableCell>
                          <TableCell>{item.materialClassPropertyId}</TableCell>
                          <TableCell>{item.materialDefinitionPropertyId}</TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingMaterialClassPropertyAssignment(item);
                                setMaterialClassPropertyAssignmentDialog(true);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteMaterialClassPropertyAssignment(item.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {tabValue === 6 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Material Definition Properties</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setEditingMaterialDefinitionProperty(null);
                      setMaterialDefinitionPropertyDialog(true);
                    }}
                  >
                    Add Property
                  </Button>
                </Box>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Value</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Unit of Measure</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {materialDefinitionProperties.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.id}</TableCell>
                          <TableCell>{item.value}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.valueUnitOfMeasure}</TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingMaterialDefinitionProperty(item);
                                setMaterialDefinitionPropertyDialog(true);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteMaterialDefinitionProperty(item.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {tabValue === 7 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Material Definition Property Assignments</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setEditingMaterialDefinitionPropertyAssignment(null);
                      setMaterialDefinitionPropertyAssignmentDialog(true);
                    }}
                  >
                    Add Assignment
                  </Button>
                </Box>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>PK</TableCell>
                        <TableCell>ID</TableCell>
                        <TableCell>Material Definition ID</TableCell>
                        <TableCell>Value</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Unit of Measure</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {console.log('[RENDER] materialDefinitionPropertyAssignments.length:', materialDefinitionPropertyAssignments.length)}
                      {console.log('[RENDER] materialDefinitionPropertyAssignments:', materialDefinitionPropertyAssignments)}
                      {materialDefinitionPropertyAssignments.map((item) => (
                        <TableRow key={item.pk}>
                          <TableCell>{item.pk}</TableCell>
                          <TableCell>{item.id}</TableCell>
                          <TableCell>{item.materialDefinitionId}</TableCell>
                          <TableCell>{item.value}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.valueUnitOfMeasure}</TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingMaterialDefinitionPropertyAssignment(item);
                                setMaterialDefinitionPropertyAssignmentDialog(true);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteMaterialDefinitionPropertyAssignment(item.pk)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Equipment & Facilities Category */}
      {categoryTab === 1 && (
        <Box>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
            <Tab label="Classes" />
            <Tab label="Equipment" />
            <Tab label="Properties" />
            <Tab label="Prop. Assignments" />
            <Tab label="Class Properties" />
            <Tab label="Class Prop. Assignments" />
            <Tab label="Plants" />
            <Tab label="Lines" />
            <Tab label="Line Equipment" />
            <Tab label="Hierarchy" />
            <Tab label="Hierarchy Flat" />
            <Tab label="Hierarchy P-C" />
          </Tabs>

          <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
            {tabValue === 0 && (
              <EquipmentClassTab
                data={equipmentClasses}
                onAdd={() => {
                  setEditingEquipmentClass(null);
                  setEquipmentClassDialog(true);
                }}
                onEdit={(item) => {
                  setEditingEquipmentClass(item);
                  setEquipmentClassDialog(true);
                }}
                onDelete={handleDeleteEquipmentClass}
              />
            )}

            {tabValue === 1 && (
              <EquipmentTab
                data={equipment}
                equipmentClasses={equipmentClasses}
                productionLines={productionLines}
                plants={plants}
                onAdd={() => {
                  setEditingEquipment(null);
                  setEquipmentDialog(true);
                }}
                onEdit={(item) => {
                  setEditingEquipment(item);
                  setEquipmentDialog(true);
                }}
                onDelete={handleDeleteEquipment}
              />
            )}

            {tabValue === 2 && (
              <EquipmentPropertyTab
                data={equipmentProperties}
                onAdd={() => {
                  setEditingEquipmentProperty(null);
                  setEquipmentPropertyDialog(true);
                }}
                onEdit={(item) => {
                  setEditingEquipmentProperty(item);
                  setEquipmentPropertyDialog(true);
                }}
                onDelete={handleDeleteEquipmentProperty}
              />
            )}

            {tabValue === 3 && (
              <EquipmentPropertyAssignmentTab
                data={equipmentPropertyAssignments}
                equipment={equipment}
                processSegments={processSegments}
                equipmentProperties={equipmentProperties}
                onAdd={() => {
                  setEditingEquipmentPropertyAssignment(null);
                  setEquipmentPropertyAssignmentDialog(true);
                }}
                onEdit={(item) => {
                  setEditingEquipmentPropertyAssignment(item);
                  setEquipmentPropertyAssignmentDialog(true);
                }}
                onDelete={handleDeleteEquipmentPropertyAssignment}
              />
            )}


            {tabValue === 4 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Equipment Class Properties</Typography>
                  {/* Add button can be implemented here if needed */}
                </Box>
                <TableContainer component={Paper} sx={{ mb: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Equipment Class</TableCell>
                        <TableCell>Property Name</TableCell>
                        <TableCell>Data Type</TableCell>
                        <TableCell>Unit</TableCell>
                        <TableCell>Min</TableCell>
                        <TableCell>Max</TableCell>
                        <TableCell>Description</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {equipmentClassProperties.map((prop) => (
                        <TableRow key={prop.id}>
                          <TableCell>{prop.id}</TableCell>
                          <TableCell>{equipmentClasses.find(ec => ec.id === prop.equipmentClassId)?.name || prop.equipmentClassId}</TableCell>
                          <TableCell>{prop.propertyName}</TableCell>
                          <TableCell>{prop.valueDataType}</TableCell>
                          <TableCell>{prop.unit}</TableCell>
                          <TableCell>{prop.minValue}</TableCell>
                          <TableCell>{prop.maxValue}</TableCell>
                          <TableCell>{prop.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {tabValue === 5 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Equipment Class Property Assignments</Typography>
                  {/* Add button can be implemented here if needed */}
                </Box>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Class Property</TableCell>
                        <TableCell>Equipment Property</TableCell>
                        <TableCell>Data Type</TableCell>
                        <TableCell>Unit</TableCell>
                        <TableCell>Min</TableCell>
                        <TableCell>Max</TableCell>
                        <TableCell>Description</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {equipmentClassPropertyAssignments.map((assign) => (
                        <TableRow key={assign.id}>
                          <TableCell>{assign.id}</TableCell>
                          <TableCell>{equipmentClassProperties.find(p => p.id === assign.equipmentClassPropertyId)?.propertyName || assign.equipmentClassPropertyId}</TableCell>
                          <TableCell>{equipmentProperties.find(ep => ep.id === assign.equipmentPropertyId)?.name || assign.equipmentPropertyId}</TableCell>
                          <TableCell>{assign.valueDataType}</TableCell>
                          <TableCell>{assign.unit}</TableCell>
                          <TableCell>{assign.minValue}</TableCell>
                          <TableCell>{assign.maxValue}</TableCell>
                          <TableCell>{assign.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {tabValue === 6 && (
              <PlantTab
                data={plants}
                onAdd={() => {
                  setEditingPlant(null);
                  setPlantDialog(true);
                }}
                onEdit={(item) => {
                  setEditingPlant(item);
                  setPlantDialog(true);
                }}
                onDelete={handleDeletePlant}
              />
            )}

            {tabValue === 7 && (
              <ProductionLineTab
                data={productionLines}
                plants={plants}
                onAdd={() => {
                  setEditingProductionLine(null);
                  setProductionLineDialog(true);
                }}
                onEdit={(item) => {
                  setEditingProductionLine(item);
                  setProductionLineDialog(true);
                }}
                onDelete={handleDeleteProductionLine}
              />
            )}

            {tabValue === 8 && (
              <LineEquipmentTab
                data={lineEquipment}
                productionLines={productionLines}
                plants={plants}
                equipment={equipment}
                onAdd={() => {
                  setEditingLineEquipment(null);
                  setLineEquipmentDialog(true);
                }}
                onEdit={(item) => {
                  setEditingLineEquipment(item);
                  setLineEquipmentDialog(true);
                }}
                onDelete={handleDeleteLineEquipment}
              />
            )}

            {tabValue === 9 && (
              <Box>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">Hierarchy Scopes</Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                    setEditingHierarchyScope(null);
                    setHierarchyScopeDialog(true);
                  }}>
                    Add Hierarchy Scope
                  </Button>
                </Box>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Equipment ID</TableCell>
                        <TableCell>Equipment Level</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {hierarchyScopes.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell><Chip label={row.id} size="small" /></TableCell>
                          <TableCell>{row.equipmentID}</TableCell>
                          <TableCell><Chip label={row.equipmentLevel} color="primary" size="small" /></TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => {
                              setEditingHierarchyScope(row);
                              setHierarchyScopeDialog(true);
                            }}>
                              <EditIcon />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={async () => {
                              if (window.confirm('Are you sure you want to delete this hierarchy scope?')) {
                                await masterDataApi.delete('hierarchyScopes', row.id);
                                setHierarchyScopes(prev => prev.filter(h => h.id !== row.id));
                              }
                            }}>
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {tabValue === 10 && (
              <Box>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">Hierarchy Scopes Flat</Typography>
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={async () => {
                      if (window.confirm('This will convert flat hierarchy scope data into row-based format. Existing hierarchy scopes will be replaced. Continue?')) {
                        try {
                          setLoading(true);
                          const { hierarchyScopeConverter } = await import('../services/hierarchyScopeConverter');
                          const result = await hierarchyScopeConverter.convertAndSave();
                          
                          if (result.success) {
                            // Reload hierarchy scopes and parent-child
                            const hs = await masterDataApi.getAll('hierarchyScopes');
                            const hspc = await masterDataApi.getAll('hierarchyScopeParentChild');
                            setHierarchyScopes(hs);
                            setHierarchyScopeParentChild(hspc);
                            setSnackbar({
                              open: true,
                              message: result.message,
                              severity: 'success'
                            });
                          } else {
                            setSnackbar({
                              open: true,
                              message: result.message,
                              severity: 'warning'
                            });
                          }
                        } catch (error) {
                          console.error('Conversion error:', error);
                          setSnackbar({
                            open: true,
                            message: `Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                            severity: 'error'
                          });
                        } finally {
                          setLoading(false);
                        }
                      }
                    }}
                  >
                    Convert Flat to Row-Based
                  </Button>
                </Box>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Enterprise</TableCell>
                        <TableCell>Site</TableCell>
                        <TableCell>Area</TableCell>
                        <TableCell>Work Center</TableCell>
                        <TableCell>Work Unit</TableCell>
                        <TableCell>Process Cell</TableCell>
                        <TableCell>Unit</TableCell>
                        <TableCell>Production Line</TableCell>
                        <TableCell>Production Unit</TableCell>
                        <TableCell>Work Cell</TableCell>
                        <TableCell>Storage Zone</TableCell>
                        <TableCell>Storage Unit</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {hierarchyScopesFlat.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell><Chip label={row.id} size="small" /></TableCell>
                          <TableCell>{row.Enterprise}</TableCell>
                          <TableCell>{row.Site}</TableCell>
                          <TableCell>{row.Area}</TableCell>
                          <TableCell>{row['Work Center']}</TableCell>
                          <TableCell>{row['Work Unit']}</TableCell>
                          <TableCell>{row['Process Cell']}</TableCell>
                          <TableCell>{row.Unit}</TableCell>
                          <TableCell>{row['Production Line']}</TableCell>
                          <TableCell>{row['Production Unit']}</TableCell>
                          <TableCell>{row['Work Cell']}</TableCell>
                          <TableCell>{row['Storage Zone']}</TableCell>
                          <TableCell>{row['Storage Unit']}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {tabValue === 11 && (
              <Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6">Hierarchy Scope Parent-Child Relationships</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    This table shows the parent-child relationships between equipment levels in the hierarchy.
                    Generated automatically when converting flat hierarchy scope data to row-based format.
                  </Typography>
                </Box>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Parent Level</TableCell>
                        <TableCell>Parent Equipment ID</TableCell>
                        <TableCell>Child Level</TableCell>
                        <TableCell>Child Equipment ID</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {hierarchyScopeParentChild.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                              No parent-child relationships found. Convert flat hierarchy scope data to generate relationships.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        hierarchyScopeParentChild.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell><Chip label={row.id} size="small" /></TableCell>
                            <TableCell>
                              <Chip label={row.parentEquipmentLevel} color="primary" size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>{row.parentEquipmentID}</TableCell>
                            <TableCell>
                              <Chip label={row.childEquipmentLevel} color="secondary" size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>{row.childEquipmentID}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Production Category */}
      {categoryTab === 2 && (
        <Box>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
            <Tab label="Process Segments" />
            <Tab label="Segment Material BOM" />
            <Tab label="Equipment Usage" />
            <Tab label="Maintenance BOM" />
          </Tabs>

          <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
            {tabValue === 0 && (
              <ProcessSegmentTab
                data={processSegments}
                materials={materials}
                onAdd={() => {
                  setEditingProcessSegment(null);
                  setProcessSegmentDialog(true);
                }}
                onEdit={(item) => {
                  setEditingProcessSegment(item);
                  setProcessSegmentDialog(true);
                }}
                onDelete={handleDeleteProcessSegment}
              />
            )}

            {tabValue === 1 && (
              <SegmentBOMTab
                data={segmentBOMs}
                processSegments={processSegments}
                materials={materials}
                onAdd={() => {
                  setEditingBOM(null);
                  setBomDialog(true);
                }}
                onEdit={(item) => {
                  setEditingBOM(item);
                  setBomDialog(true);
                }}
                onDelete={handleDeleteBOM}
              />
            )}

            {tabValue === 2 && (
              <EquipmentUsageTab
                data={equipmentUsages}
                processSegments={processSegments}
                equipment={equipment}
                materials={materials}
                onAdd={() => {
                  setEditingEquipmentUsage(null);
                  setEquipmentUsageDialog(true);
                }}
                onEdit={(item) => {
                  setEditingEquipmentUsage(item);
                  setEquipmentUsageDialog(true);
                }}
                onDelete={handleDeleteEquipmentUsage}
              />
            )}

            {tabValue === 3 && (
              <MaintenanceTab
                equipment={equipment}
                processSegments={processSegments}
                materials={materials}
                personClasses={personClasses}
                employees={employees}
                data={maintenanceBOMs}
                onAdd={() => {
                  setEditingMaintenanceBom(null);
                  setMaintenanceBomDialog(true);
                }}
                onEdit={(item) => {
                  setEditingMaintenanceBom(item);
                  setMaintenanceBomDialog(true);
                }}
                onDelete={handleDeleteMaintenanceAssignment}
                onCopyBom={handleCopyEquipmentBOM}
              />
            )}
          </Box>
        </Box>
      )}

      {/* Operations Category */}
      {categoryTab === 3 && (
        <Box>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }} variant="scrollable" scrollButtons="auto">
            <Tooltip title="Operation Event Definitions" arrow>
              <Tab label="Definitions" />
            </Tooltip>
            <Tooltip title="Event-Segment Assignments" arrow>
              <Tab label="Segment Assign." />
            </Tooltip>
            <Tooltip title="Event Definition Properties" arrow>
              <Tab label="Properties" />
            </Tooltip>
            <Tooltip title="Property Assignments" arrow>
              <Tab label="Property Assign." />
            </Tooltip>
            <Tooltip title="Operations Event Classes" arrow>
              <Tab label="Classes" />
            </Tooltip>
            <Tooltip title="Operations Event Records" arrow>
              <Tab label="Records" />
            </Tooltip>
            <Tooltip title="Operations Event Entries" arrow>
              <Tab label="Entries" />
            </Tooltip>
          </Tabs>

          <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
            {tabValue === 0 && (
              <OperationEventDefinitionTab
                data={operationEventDefinitions}
                onAdd={() => {
                  setEditingOperationEventDefinition(null);
                  setOperationEventDefinitionDialog(true);
                }}
                onEdit={(item) => {
                  setEditingOperationEventDefinition(item);
                  setOperationEventDefinitionDialog(true);
                }}
                onDelete={handleDeleteOperationEventDefinition}
              />
            )}
            {tabValue === 1 && (
              <OperationEventDefSegmentAssignmentTab
                data={operationEventDefSegmentAssignments}
                operationEventDefinitions={operationEventDefinitions}
                processSegments={processSegments}
                onAdd={() => {
                  setEditingOperationEventDefSegmentAssignment(null);
                  setOperationEventDefSegmentAssignmentDialog(true);
                }}
                onEdit={(item) => {
                  setEditingOperationEventDefSegmentAssignment(item);
                  setOperationEventDefSegmentAssignmentDialog(true);
                }}
                onDelete={handleDeleteOperationEventDefSegmentAssignment}
              />
            )}
            {tabValue === 2 && (
              <Box>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Operation Event Definition Properties</Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                    setEditingOperationEventDefinitionProperty(null);
                    setOperationEventDefinitionPropertyDialog(true);
                  }}>
                    Add Property
                  </Button>
                </Box>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Property ID</TableCell>
                        <TableCell>Possible Values</TableCell>
                        <TableCell>Unit of Measure</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {operationEventDefinitionProperties.map((prop) => (
                        <TableRow key={prop.id}>
                          <TableCell><Chip label={prop.id} size="small" /></TableCell>
                          <TableCell>{prop.possibleValues}</TableCell>
                          <TableCell>{prop.valueUnitOfMeasure}</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => {
                              setEditingOperationEventDefinitionProperty(prop);
                              setOperationEventDefinitionPropertyDialog(true);
                            }}>
                              <EditIcon />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDeleteOperationEventDefinitionProperty(prop.id)}>
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
            {tabValue === 3 && (
              <Box>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Property Assignments</Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                    setEditingOperationEventDefinitionPropertyAssignment(null);
                    setOperationEventDefinitionPropertyAssignmentDialog(true);
                  }}>
                    Add Assignment
                  </Button>
                </Box>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Event Definition</TableCell>
                        <TableCell>Property</TableCell>
                        <TableCell>Value</TableCell>
                        <TableCell>Unit of Measure</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {operationEventDefinitionPropertyAssignments.map((assign) => {
                        const eventDef = operationEventDefinitions.find(d => d.id === assign.operationsEventDefinitionId);
                        const prop = operationEventDefinitionProperties.find(p => p.id === assign.operationsEventDefinitionPropertyId);
                        return (
                          <TableRow key={assign.id}>
                            <TableCell><Chip label={eventDef?.id || assign.operationsEventDefinitionId} size="small" /></TableCell>
                            <TableCell><Chip label={prop?.id || assign.operationsEventDefinitionPropertyId} size="small" color="primary" /></TableCell>
                            <TableCell>{assign.value}</TableCell>
                            <TableCell>{assign.valueUnitOfMeasure}</TableCell>
                            <TableCell align="right">
                              <IconButton size="small" onClick={() => {
                                setEditingOperationEventDefinitionPropertyAssignment(assign);
                                setOperationEventDefinitionPropertyAssignmentDialog(true);
                              }}>
                                <EditIcon />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleDeleteOperationEventDefinitionPropertyAssignment(assign.id)}>
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
            {tabValue === 4 && (
              <Box>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Operations Event Classes</Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                    setEditingOperationsEventClass(null);
                    setOperationsEventClassDialog(true);
                  }}>
                    Add Operations Event Class
                  </Button>
                </Box>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Class ID</TableCell>
                        <TableCell>Class Name</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {operationsEventClasses.map((oec) => (
                        <TableRow key={oec.OperationsEventClassID}>
                          <TableCell><Chip label={oec.OperationsEventClassID} size="small" /></TableCell>
                          <TableCell>{oec.ClassName}</TableCell>
                          <TableCell>{oec.Description}</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => {
                              setEditingOperationsEventClass(oec);
                              setOperationsEventClassDialog(true);
                            }}>
                              <EditIcon />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDeleteOperationsEventClass(oec.OperationsEventClassID)}>
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
            {tabValue === 5 && (
              <Box>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Operations Event Records</Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                    setEditingOperationsEventRecord(null);
                    setOperationsEventRecordDialog(true);
                  }}>
                    Add Operations Event Record
                  </Button>
                </Box>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Record ID</TableCell>
                        <TableCell>Event Definition</TableCell>
                        <TableCell>Severity</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Comments</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {operationsEventRecords.map((oer) => {
                        const eventDef = operationEventDefinitions.find(oed => oed.id === oer.OperationsEventDefinitionID);
                        return (
                          <TableRow key={oer.id}>
                            <TableCell><Chip label={oer.OperationsEventRecordID} size="small" /></TableCell>
                            <TableCell>{eventDef?.description || oer.OperationsEventDefinitionID}</TableCell>
                            <TableCell><Chip label={oer.Severity} size="small" color={oer.Severity === 'Critical' ? 'error' : oer.Severity === 'High' ? 'warning' : 'default'} /></TableCell>
                            <TableCell><Chip label={oer.Status} size="small" color={oer.Status === 'Open' ? 'warning' : 'success'} /></TableCell>
                            <TableCell>{oer.Comments}</TableCell>
                            <TableCell align="right">
                              <IconButton size="small" onClick={() => {
                                setEditingOperationsEventRecord(oer);
                                setOperationsEventRecordDialog(true);
                              }}>
                                <EditIcon />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleDeleteOperationsEventRecord(oer.id)}>
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
            {tabValue === 6 && (
              <Box>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Operations Event Entries</Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                    setEditingOperationsEventEntry(null);
                    setOperationsEventEntryDialog(true);
                  }}>
                    Add Operations Event Entry
                  </Button>
                </Box>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Entry ID</TableCell>
                        <TableCell>Event Record</TableCell>
                        <TableCell>Entry Type</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {operationsEventEntries.map((oee) => {
                        const eventRecord = operationsEventRecords.find(oer => oer.OperationsEventRecordID === oee.OperationsEventRecordID);
                        return (
                          <TableRow key={oee.id}>
                            <TableCell><Chip label={oee.OperationsEventEntryID} size="small" /></TableCell>
                            <TableCell>{eventRecord?.OperationsEventRecordID || oee.OperationsEventRecordID}</TableCell>
                            <TableCell><Chip label={oee.EntryType} size="small" color="primary" /></TableCell>
                            <TableCell>{oee.Description}</TableCell>
                            <TableCell align="right">
                              <IconButton size="small" onClick={() => {
                                setEditingOperationsEventEntry(oee);
                                setOperationsEventEntryDialog(true);
                              }}>
                                <EditIcon />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleDeleteOperationsEventEntry(oee.id)}>
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Personnel Information Category */}
      {categoryTab === 4 && (
        <Box>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
            <Tab label="Person Classes" />
            <Tab label="Personnel Capabilities" />
            <Tab label="Employees" />
            <Tab label="Shifts" />
            <Tab label="Crews" />
            <Tab label="Shift-Crew Assignments" />
          </Tabs>

          <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
            {tabValue === 0 && (
              <Box>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Person Classes</Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                    setEditingPersonClass(null);
                    setPersonClassDialog(true);
                  }}>
                    Add Person Class
                  </Button>
                </Box>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {personClasses.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell><Chip label={row.id} size="small" /></TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell>{row.description}</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => {
                              setEditingPersonClass(row);
                              setPersonClassDialog(true);
                            }}>
                              <EditIcon />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeletePersonClass(row.id)}>
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {tabValue === 1 && (
              <Box>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Personnel Capabilities</Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                    setEditingPersonnelCapability(null);
                    setPersonnelCapabilityDialog(true);
                  }}>
                    Add Capability
                  </Button>
                </Box>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Capability Name</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {personnelCapabilities.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell><Chip label={row.id} size="small" /></TableCell>
                          <TableCell>{row.capabilityName}</TableCell>
                          <TableCell>{row.description}</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => {
                              setEditingPersonnelCapability(row);
                              setPersonnelCapabilityDialog(true);
                            }}>
                              <EditIcon />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeletePersonnelCapability(row.id)}>
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {tabValue === 2 && (
              <Box>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Employees</Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                    setEditingEmployee(null);
                    setEmployeeDialog(true);
                  }}>
                    Add Employee
                  </Button>
                </Box>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Person Class</TableCell>
                        <TableCell>Capability</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Phone</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {employees.map((row) => {
                        const pc = personClasses.find(x => x.id === row.personClassId);
                        const cap = personnelCapabilities.find(x => x.id === row.personnelCapabilityId);
                        return (
                          <TableRow key={row.id}>
                            <TableCell><Chip label={row.id} size="small" /></TableCell>
                            <TableCell>{row.employeeName}</TableCell>
                            <TableCell>{pc ? pc.name : row.personClassId}</TableCell>
                            <TableCell>{cap ? cap.capabilityName : row.personnelCapabilityId}</TableCell>
                            <TableCell>{row.email || '-'}</TableCell>
                            <TableCell>{row.phoneNumber || '-'}</TableCell>
                            <TableCell align="right">
                              <IconButton size="small" onClick={() => {
                                setEditingEmployee(row);
                                setEmployeeDialog(true);
                              }}>
                                <EditIcon />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => handleDeleteEmployee(row.id)}>
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {tabValue === 3 && (
              <Box>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Shifts</Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                    setEditingShift(null);
                    setShiftDialog(true);
                  }}>
                    Add Shift
                  </Button>
                </Box>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Shift Number</TableCell>
                        <TableCell>Shift Name</TableCell>
                        <TableCell>Start Time</TableCell>
                        <TableCell>End Time</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {shifts.map((shift) => (
                        <TableRow key={shift.id}>
                          <TableCell><Chip label={shift.id} size="small" /></TableCell>
                          <TableCell><Chip label={`Shift ${shift.shiftNumber}`} size="small" color="primary" /></TableCell>
                          <TableCell>{shift.shiftName}</TableCell>
                          <TableCell>{shift.startTime}</TableCell>
                          <TableCell>{shift.endTime}</TableCell>
                          <TableCell>{shift.description}</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => {
                              setEditingShift(shift);
                              setShiftDialog(true);
                            }}>
                              <EditIcon />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteShift(shift.id)}>
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {tabValue === 4 && (
              <Box>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Crews</Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                    setEditingCrew(null);
                    setCrewDialog(true);
                  }}>
                    Add Crew
                  </Button>
                </Box>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Crew Name</TableCell>
                        <TableCell>People Count</TableCell>
                        <TableCell>Skills</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {crews.map((crew) => (
                        <TableRow key={crew.id}>
                          <TableCell><Chip label={crew.id} size="small" /></TableCell>
                          <TableCell>{crew.crewName}</TableCell>
                          <TableCell><Chip label={crew.peopleCount} size="small" color="secondary" /></TableCell>
                          <TableCell>{crew.skills}</TableCell>
                          <TableCell>{crew.description}</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => {
                              setEditingCrew(crew);
                              setCrewDialog(true);
                            }}>
                              <EditIcon />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteCrew(crew.id)}>
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {tabValue === 5 && (
              <Box>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Shift-Crew Assignments</Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                    setEditingShiftCrewAssignment(null);
                    setShiftCrewAssignmentDialog(true);
                  }}>
                    Add Assignment
                  </Button>
                </Box>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Shift</TableCell>
                        <TableCell>Crew</TableCell>
                        <TableCell>Effective Date</TableCell>
                        <TableCell>Expiry Date</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {shiftCrewAssignments.map((assignment) => {
                        const shift = shifts.find(s => s.id === assignment.shiftId);
                        const crew = crews.find(c => c.id === assignment.crewId);
                        return (
                          <TableRow key={assignment.id}>
                            <TableCell><Chip label={assignment.id} size="small" /></TableCell>
                            <TableCell>
                              <Chip 
                                label={shift ? `${shift.shiftName} (${shift.shiftNumber})` : assignment.shiftId} 
                                size="small" 
                                color="primary"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={crew ? crew.crewName : assignment.crewId} 
                                size="small" 
                                color="secondary"
                              />
                            </TableCell>
                            <TableCell>{assignment.effectiveDate}</TableCell>
                            <TableCell>{assignment.expiryDate}</TableCell>
                            <TableCell align="right">
                              <IconButton size="small" onClick={() => {
                                setEditingShiftCrewAssignment(assignment);
                                setShiftCrewAssignmentDialog(true);
                              }}>
                                <EditIcon />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => handleDeleteShiftCrewAssignment(assignment.id)}>
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Dialogs */}
      <MaterialClassDialog
        open={materialClassDialog}
        data={editingMaterialClass}
        onClose={() => {
          setMaterialClassDialog(false);
          setEditingMaterialClass(null);
        }}
        onSave={handleSaveMaterialClass}
      />

      <MaterialDialog
        open={materialDialog}
        data={editingMaterial}
        materialClasses={materialClasses}
        onClose={() => {
          setMaterialDialog(false);
          setEditingMaterial(null);
        }}
        onSave={handleSaveMaterial}
      />

      <MaterialLotDialog
        open={materialLotDialog}
        data={editingMaterialLot}
        materials={materials}
        materialLots={materialLots}
        onClose={() => {
          setMaterialLotDialog(false);
          setEditingMaterialLot(null);
        }}
        onSave={handleSaveMaterialLot}
      />

      <MaterialSublotDialog
        open={materialSublotDialog}
        data={editingMaterialSublot}
        materialLots={materialLots}
        materials={materials}
        onClose={() => {
          setMaterialSublotDialog(false);
          setEditingMaterialSublot(null);
        }}
        onSave={handleSaveMaterialSublot}
      />

      <MaterialDefinitionPropertyDialog
        open={materialDefinitionPropertyDialog}
        data={editingMaterialDefinitionProperty}
        onClose={() => {
          setMaterialDefinitionPropertyDialog(false);
          setEditingMaterialDefinitionProperty(null);
        }}
        onSave={handleSaveMaterialDefinitionProperty}
      />

      <MaterialClassPropertyDialog
        open={materialClassPropertyDialog}
        data={editingMaterialClassProperty}
        onClose={() => {
          setMaterialClassPropertyDialog(false);
          setEditingMaterialClassProperty(null);
        }}
        onSave={handleSaveMaterialClassProperty}
      />

      <MaterialClassPropertyAssignmentDialog
        open={materialClassPropertyAssignmentDialog}
        data={editingMaterialClassPropertyAssignment}
        materialClassProperties={materialClassProperties}
        materialDefinitionProperties={materialDefinitionProperties}
        onClose={() => {
          setMaterialClassPropertyAssignmentDialog(false);
          setEditingMaterialClassPropertyAssignment(null);
        }}
        onSave={handleSaveMaterialClassPropertyAssignment}
      />

      <MaterialDefinitionPropertyAssignmentDialog
        open={materialDefinitionPropertyAssignmentDialog}
        data={editingMaterialDefinitionPropertyAssignment}
        materials={materials}
        materialDefinitionProperties={materialDefinitionProperties}
        onClose={() => {
          setMaterialDefinitionPropertyAssignmentDialog(false);
          setEditingMaterialDefinitionPropertyAssignment(null);
        }}
        onSave={handleSaveMaterialDefinitionPropertyAssignment}
      />

      <EquipmentClassDialog
        open={equipmentClassDialog}
        data={editingEquipmentClass}
        equipmentClasses={equipmentClasses}
        onClose={() => {
          setEquipmentClassDialog(false);
          setEditingEquipmentClass(null);
        }}
        onSave={handleSaveEquipmentClass}
      />

      <EquipmentDialog
        open={equipmentDialog}
        data={editingEquipment}
        equipmentClasses={equipmentClasses}
        productionLines={productionLines}
        plants={plants}
        equipment={equipment}
        onClose={() => {
          setEquipmentDialog(false);
          setEditingEquipment(null);
        }}
        onSave={handleSaveEquipment}
      />

      <EquipmentPropertyDialog
        open={equipmentPropertyDialog}
        data={editingEquipmentProperty}
        onClose={() => {
          setEquipmentPropertyDialog(false);
          setEditingEquipmentProperty(null);
        }}
        onSave={handleSaveEquipmentProperty}
      />

      <EquipmentPropertyAssignmentDialog
        open={equipmentPropertyAssignmentDialog}
        data={editingEquipmentPropertyAssignment}
        equipment={equipment}
        processSegments={processSegments}
        equipmentProperties={equipmentProperties}
        onClose={() => {
          setEquipmentPropertyAssignmentDialog(false);
          setEditingEquipmentPropertyAssignment(null);
        }}
        onSave={handleSaveEquipmentPropertyAssignment}
      />

      <ProcessSegmentDialog
        open={processSegmentDialog}
        data={editingProcessSegment}
        materials={materials}
        onClose={() => {
          setProcessSegmentDialog(false);
          setEditingProcessSegment(null);
        }}
        onSave={handleSaveProcessSegment}
      />

      <SegmentBOMDialog
        open={bomDialog}
        data={editingBOM}
        processSegments={processSegments}
        equipment={equipment}
        equipmentUsages={equipmentUsages}
        materials={materials}
        onClose={() => {
          setBomDialog(false);
          setEditingBOM(null);
        }}
        onSave={handleSaveBOM}
      />

      <MaintenanceBomDialog
        open={maintenanceBomDialog}
        data={editingMaintenanceBom}
        equipment={equipment}
        processSegments={processSegments}
        materials={materials}
        personClasses={personClasses}
        employees={employees}
        onClose={() => {
          setMaintenanceBomDialog(false);
          setEditingMaintenanceBom(null);
        }}
        onSave={handleSaveMaintenanceAssignment}
      />

      <EquipmentUsageDialog
        open={equipmentUsageDialog}
        data={editingEquipmentUsage}
        processSegments={processSegments}
        equipment={equipment}
        materials={materials}
        onClose={() => {
          setEquipmentUsageDialog(false);
          setEditingEquipmentUsage(null);
        }}
        onSave={handleSaveEquipmentUsage}
      />

      <PlantDialog
        open={plantDialog}
        data={editingPlant}
        onClose={() => {
          setPlantDialog(false);
          setEditingPlant(null);
        }}
        onSave={handleSavePlant}
      />

      <ProductionLineDialog
        open={productionLineDialog}
        data={editingProductionLine}
        plants={plants}
        onClose={() => {
          setProductionLineDialog(false);
          setEditingProductionLine(null);
        }}
        onSave={handleSaveProductionLine}
      />

      <LineEquipmentDialog
        open={lineEquipmentDialog}
        data={editingLineEquipment}
        productionLines={productionLines}
        plants={plants}
        equipment={equipment}
        onClose={() => {
          setLineEquipmentDialog(false);
          setEditingLineEquipment(null);
        }}
        onSave={handleSaveLineEquipment}
      />

      <HierarchyScopeDialog
        open={hierarchyScopeDialog}
        data={editingHierarchyScope}
        plants={plants}
        productionLines={productionLines}
        onClose={() => {
          setHierarchyScopeDialog(false);
          setEditingHierarchyScope(null);
        }}
        onSave={async (data) => {
          if (editingHierarchyScope) {
            await masterDataApi.update('hierarchyScopes', data);
            setHierarchyScopes(prev => prev.map(h => h.id === data.id ? data : h));
          } else {
            await masterDataApi.add('hierarchyScopes', data);
            setHierarchyScopes(prev => [...prev, data]);
          }
          setHierarchyScopeDialog(false);
          setEditingHierarchyScope(null);
        }}
      />

      <ShiftDialog
        open={shiftDialog}
        data={editingShift}
        onClose={() => {
          setShiftDialog(false);
          setEditingShift(null);
        }}
        onSave={handleSaveShift}
      />

      <PersonClassDialog
        open={personClassDialog}
        data={editingPersonClass}
        onClose={() => {
          setPersonClassDialog(false);
          setEditingPersonClass(null);
        }}
        onSave={handleSavePersonClass}
      />

      <PersonnelCapabilityDialog
        open={personnelCapabilityDialog}
        data={editingPersonnelCapability}
        onClose={() => {
          setPersonnelCapabilityDialog(false);
          setEditingPersonnelCapability(null);
        }}
        onSave={handleSavePersonnelCapability}
      />

      <EmployeeDialog
        open={employeeDialog}
        data={editingEmployee}
        personClasses={personClasses}
        personnelCapabilities={personnelCapabilities}
        onClose={() => {
          setEmployeeDialog(false);
          setEditingEmployee(null);
        }}
        onSave={handleSaveEmployee}
      />

      <CrewDialog
        open={crewDialog}
        data={editingCrew}
        onClose={() => {
          setCrewDialog(false);
          setEditingCrew(null);
        }}
        onSave={handleSaveCrew}
      />

      <OperationsEventClassDialog
        open={operationsEventClassDialog}
        data={editingOperationsEventClass}
        onClose={() => {
          setOperationsEventClassDialog(false);
          setEditingOperationsEventClass(null);
        }}
        onSave={handleSaveOperationsEventClass}
      />

      <OperationsEventRecordDialog
        open={operationsEventRecordDialog}
        data={editingOperationsEventRecord}
        operationEventDefinitions={operationEventDefinitions}
        onClose={() => {
          setOperationsEventRecordDialog(false);
          setEditingOperationsEventRecord(null);
        }}
        onSave={handleSaveOperationsEventRecord}
      />

      <OperationsEventEntryDialog
        open={operationsEventEntryDialog}
        data={editingOperationsEventEntry}
        operationsEventRecords={operationsEventRecords}
        onClose={() => {
          setOperationsEventEntryDialog(false);
          setEditingOperationsEventEntry(null);
        }}
        onSave={handleSaveOperationsEventEntry}
      />

      <OperationEventDefinitionDialog
        open={operationEventDefinitionDialog}
        data={editingOperationEventDefinition}
        onClose={() => {
          setOperationEventDefinitionDialog(false);
          setEditingOperationEventDefinition(null);
        }}
        onSave={handleSaveOperationEventDefinition}
      />

      <ShiftCrewAssignmentDialog
        open={shiftCrewAssignmentDialog}
        data={editingShiftCrewAssignment}
        shifts={shifts}
        crews={crews}
        onClose={() => {
          setShiftCrewAssignmentDialog(false);
          setEditingShiftCrewAssignment(null);
        }}
        onSave={handleSaveShiftCrewAssignment}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// Tab Components
interface MaterialClassTabProps {
  data: MaterialClass[];
  onAdd: () => void;
  onEdit: (item: MaterialClass) => void;
  onDelete: (id: string) => void;
}

const MaterialClassTab: React.FC<MaterialClassTabProps> = ({ data, onAdd, onEdit, onDelete }) => {
  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6">Material Classes</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
          Add Material Class
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Parent Class</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id}>
                <TableCell><Chip label={row.id} size="small" /></TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.description}</TableCell>
                <TableCell>{row.parentId || '-'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => onEdit(row)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => onDelete(row.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

interface MaterialTabProps {
  data: Material[];
  materialClasses: MaterialClass[];
  onAdd: () => void;
  onEdit: (item: Material) => void;
  onDelete: (id: string) => void;
}

const MaterialTab: React.FC<MaterialTabProps> = ({ data, materialClasses, onAdd, onEdit, onDelete }) => {
  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6">Materials</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
          Add Material
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Class</TableCell>
              <TableCell>Default UoM</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id}>
                <TableCell><Chip label={row.id} size="small" /></TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>
                  <Chip 
                    label={row.className} 
                    size="small" 
                    color={
                      row.classId === 'FINISHEDPRODUCT' ? 'success' :
                      row.classId === 'RAWMATERIAL' ? 'primary' : 'default'
                    }
                  />
                </TableCell>
                <TableCell>{row.defaultUoM}</TableCell>
                <TableCell>{row.description}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => onEdit(row)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => onDelete(row.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

interface MaterialLotTabProps {
  data: MaterialLot[];
  materials: Material[];
  onAdd: () => void;
  onEdit: (item: MaterialLot) => void;
  onDelete: (id: string) => void;
}

const MaterialLotTab: React.FC<MaterialLotTabProps> = ({ data, materials, onAdd, onEdit, onDelete }) => {
  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6">Material Lots</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
          Add Material Lot
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lot ID</TableCell>
              <TableCell>Material</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>UoM</TableCell>
              <TableCell>Received</TableCell>
              <TableCell>Produced</TableCell>
              <TableCell>Supplier/Producer</TableCell>
              <TableCell>Produced By</TableCell>
              <TableCell>Parent Lot</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => {
              const material = materials.find(m => m.id === row.materialId);
              const parentLot = data.find(l => l.id === row.parentLotId);
              return (
                <TableRow key={row.id}>
                  <TableCell><Chip label={row.id} size="small" /></TableCell>
                  <TableCell>
                    {material ? (
                      <Chip label={material.name} size="small" color="primary" />
                    ) : (
                      <Chip label={row.materialId} size="small" color="default" />
                    )}
                  </TableCell>
                  <TableCell>{row.lotQuantity.toFixed(2)}</TableCell>
                  <TableCell>{row.lotUoM}</TableCell>
                  <TableCell>{row.receivedDateTime || '-'}</TableCell>
                  <TableCell>{row.producedDateTime || '-'}</TableCell>
                  <TableCell>
                    {row.supplierOrProducerName ? (
                      <Box>
                        <Typography variant="body2">{row.supplierOrProducerName}</Typography>
                        {row.supplierOrProducerId && (
                          <Typography variant="caption" color="text.secondary">
                            {row.supplierOrProducerId}
                          </Typography>
                        )}
                      </Box>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {row.producedByProcessSegmentId ? (
                      <Chip label={row.producedByProcessSegmentId} size="small" />
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {parentLot ? (
                      <Chip label={parentLot.id} size="small" color="default" />
                    ) : '-'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => onEdit(row)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => onDelete(row.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

interface MaterialSublotTabProps {
  data: MaterialSublot[];
  materialLots: MaterialLot[];
  materials: Material[];
  onAdd: () => void;
  onEdit: (item: MaterialSublot) => void;
  onDelete: (id: string) => void;
}

const MaterialSublotTab: React.FC<MaterialSublotTabProps> = ({ data, materialLots, materials, onAdd, onEdit, onDelete }) => {
  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6">Material Sublots</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
          Add Material Sublot
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Sublot ID</TableCell>
              <TableCell>Material Lot</TableCell>
              <TableCell>Material</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>UoM</TableCell>
              <TableCell>Storage Location</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Disposition</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => {
              const lot = materialLots.find(l => l.id === row.materialLotId);
              const material = materials.find(m => m.id === lot?.materialId);
              return (
                <TableRow key={row.id}>
                  <TableCell><Chip label={row.id} size="small" /></TableCell>
                  <TableCell>
                    {lot ? (
                      <Chip label={lot.id} size="small" color="primary" />
                    ) : (
                      <Chip label={row.materialLotId} size="small" color="default" />
                    )}
                  </TableCell>
                  <TableCell>
                    {material ? (
                      <Chip label={material.name} size="small" color="secondary" />
                    ) : '-'}
                  </TableCell>
                  <TableCell>{row.quantity != null ? row.quantity.toFixed(2) : '-'}</TableCell>
                  <TableCell>{row.quantityUnitOfMeasure || '-'}</TableCell>
                  <TableCell>{row.storageLocation || '-'}</TableCell>
                  <TableCell>{row.status || '-'}</TableCell>
                  <TableCell>{row.disposition || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => onEdit(row)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => onDelete(row.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

interface EquipmentClassTabProps {
  data: EquipmentClass[];
  onAdd: () => void;
  onEdit: (item: EquipmentClass) => void;
  onDelete: (id: string) => void;
}

const EquipmentClassTab: React.FC<EquipmentClassTabProps> = ({ data, onAdd, onEdit, onDelete }) => {
  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6">Equipment Classes</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
          Add Equipment Class
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Parent Class</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id}>
                <TableCell><Chip label={row.id} size="small" /></TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.description}</TableCell>
                <TableCell>{row.parentId || '-'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => onEdit(row)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => onDelete(row.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

interface EquipmentTabProps {
  data: Equipment[];
  equipmentClasses: EquipmentClass[];
  productionLines: ProductionLine[];
  plants: Plant[];
  onAdd: () => void;
  onEdit: (item: Equipment) => void;
  onDelete: (id: string) => void;
}

const EquipmentTab: React.FC<EquipmentTabProps> = ({ data, equipmentClasses, productionLines, plants, onAdd, onEdit, onDelete }) => {
  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6">Equipment</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
          Add Equipment
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Class</TableCell>
              <TableCell>Production Line</TableCell>
              <TableCell>Parent Equipment</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => {
              const prodLine = productionLines.find(pl => pl.id === row.productionLineId);
              const plant = plants.find(p => p.id === prodLine?.plantId);
              const parentEquipment = data.find(e => e.id === row.parentEquipmentId);
              return (
                <TableRow key={row.id}>
                  <TableCell><Chip label={row.id} size="small" /></TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>
                    <Chip label={row.className} size="small" color="primary" />
                  </TableCell>
                  <TableCell>
                    {prodLine ? (
                      <Box>
                        <Chip label={prodLine.name} size="small" color="secondary" />
                        {plant && (
                          <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                            ({plant.name})
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <em>Not assigned</em>
                    )}
                  </TableCell>
                  <TableCell>
                    {parentEquipment ? (
                      <Chip label={parentEquipment.name} size="small" color="default" />
                    ) : '-'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => onEdit(row)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => onDelete(row.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

interface EquipmentPropertyTabProps {
  data: EquipmentProperty[];
  onAdd: () => void;
  onEdit: (item: EquipmentProperty) => void;
  onDelete: (id: string) => void;
}

const EquipmentPropertyTab: React.FC<EquipmentPropertyTabProps> = ({ data, onAdd, onEdit, onDelete }) => {
  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6">Equipment Properties</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
          Add Equipment Property
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Data Type</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>Min Value</TableCell>
              <TableCell>Max Value</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id}>
                <TableCell><Chip label={row.id} size="small" /></TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell><Chip label={row.valueDataType} size="small" color="info" /></TableCell>
                <TableCell>{row.unit || '-'}</TableCell>
                <TableCell>{row.minValue !== undefined ? row.minValue : '-'}</TableCell>
                <TableCell>{row.maxValue !== undefined ? row.maxValue : '-'}</TableCell>
                <TableCell>{row.description}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => onEdit(row)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => onDelete(row.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

interface EquipmentPropertyAssignmentTabProps {
  data: EquipmentPropertyAssignment[];
  equipment: Equipment[];
  processSegments: ProcessSegment[];
  equipmentProperties: EquipmentProperty[];
  onAdd: () => void;
  onEdit: (item: EquipmentPropertyAssignment) => void;
  onDelete: (id: string) => void;
}

const EquipmentPropertyAssignmentTab: React.FC<EquipmentPropertyAssignmentTabProps> = ({ data, equipment, processSegments, equipmentProperties, onAdd, onEdit, onDelete }) => {
  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6">Equipment Property Assignments</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
          Add Assignment
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Equipment</TableCell>
              <TableCell>Process Segment</TableCell>
              <TableCell>Property</TableCell>
              <TableCell>Sampling Mode</TableCell>
              <TableCell>Interval (sec)</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => {
              const eq = equipment.find(e => e.id === row.equipmentId);
              const ps = processSegments.find(s => s.id === row.processSegmentId);
              const prop = equipmentProperties.find(p => p.id === row.equipmentPropertyId);
              return (
                <TableRow key={row.id}>
                  <TableCell><Chip label={row.id} size="small" /></TableCell>
                  <TableCell>
                    <Chip label={eq?.id || row.equipmentId} size="small" color="primary" />
                  </TableCell>
                  <TableCell>
                    <Chip label={ps?.name || row.processSegmentId} size="small" color="secondary" />
                  </TableCell>
                  <TableCell>
                    <Chip label={prop?.name || row.equipmentPropertyId} size="small" color="info" />
                  </TableCell>
                  <TableCell>{row.samplingMode}</TableCell>
                  <TableCell>{row.samplingIntervalSeconds || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => onEdit(row)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => onDelete(row.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

interface ProcessSegmentTabProps {
  data: ProcessSegment[];
  materials: Material[];
  onAdd: () => void;
  onEdit: (item: ProcessSegment) => void;
  onDelete: (id: string) => void;
}

const ProcessSegmentTab: React.FC<ProcessSegmentTabProps> = ({ data, materials, onAdd, onEdit, onDelete }) => {
  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6">Process Segments</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
          Add Process Segment
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Product Material</TableCell>
              <TableCell>Sequence</TableCell>
              <TableCell>Duration (hrs)</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id}>
                <TableCell><Chip label={row.id} size="small" /></TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>
                  <Chip 
                    label={materials.find(m => m.id === row.productMaterialId)?.name || row.productMaterialId} 
                    size="small" 
                    color="success"
                  />
                </TableCell>
                <TableCell>{row.sequence}</TableCell>
                <TableCell>{row.durationHours}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => onEdit(row)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => onDelete(row.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

interface SegmentBOMTabProps {
  data: SegmentMaterialBOM[];
  processSegments: ProcessSegment[];
  materials: Material[];
  onAdd: () => void;
  onEdit: (item: SegmentMaterialBOM) => void;
  onDelete: (id: string) => void;
}

const SegmentBOMTab: React.FC<SegmentBOMTabProps> = ({ data, processSegments, materials, onAdd, onEdit, onDelete }) => {
  const [selectedProduct, setSelectedProduct] = React.useState<string>('all');
  
  // Get unique products from process segments
  const products = React.useMemo(() => {
    const uniqueProducts = new Map<string, string>();
    processSegments.forEach(ps => {
      if (!uniqueProducts.has(ps.productMaterialId)) {
        const material = materials.find(m => m.id === ps.productMaterialId);
        uniqueProducts.set(
          ps.productMaterialId,
          material?.name || ps.productMaterialId || 'Maintenance / No Product'
        );
      }
    });
    return Array.from(uniqueProducts.entries());
  }, [processSegments, materials]);

  // Filter data by selected product
  const filteredData = React.useMemo(() => {
    if (selectedProduct === 'all') return data;
    
    const productSegments = processSegments
      .filter(ps => ps.productMaterialId === selectedProduct)
      .map(ps => ps.id);
    
    return data.filter(bom => productSegments.includes(bom.processSegmentId));
  }, [data, selectedProduct, processSegments]);

  // Group BOMs by product and segment
  const groupedData = React.useMemo(() => {
    const groups = new Map<string, Map<string, SegmentMaterialBOM[]>>();
    
    filteredData.forEach(bom => {
      const segment = processSegments.find(ps => ps.id === bom.processSegmentId);
      if (!segment) return;
      
      const productId = segment.productMaterialId;
      if (!groups.has(productId)) {
        groups.set(productId, new Map());
      }
      
      const productGroup = groups.get(productId)!;
      if (!productGroup.has(bom.processSegmentId)) {
        productGroup.set(bom.processSegmentId, []);
      }
      
      productGroup.get(bom.processSegmentId)!.push(bom);
    });
    
    return groups;
  }, [filteredData, processSegments]);

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Segment Material BOM</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 250 }}>
            <InputLabel>Filter by Product</InputLabel>
            <Select
              value={selectedProduct}
              label="Filter by Product"
              onChange={(e) => setSelectedProduct(e.target.value)}
              size="small"
            >
              <MenuItem value="all">All Products</MenuItem>
              {products.map(([id, name]) => (
                <MenuItem key={id} value={id}>{name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
            Add BOM Line
          </Button>
        </Box>
      </Box>

      {Array.from(groupedData.entries()).map(([productId, segmentMap]) => {
        const productName = materials.find(m => m.id === productId)?.name || productId || 'Maintenance / No Product';
        
        return (
          <Box key={productId} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: 'primary.main' }}>
              Product: {productName}
            </Typography>
            
            {Array.from(segmentMap.entries()).map(([segmentId, boms]) => {
              const segment = processSegments.find(ps => ps.id === segmentId);
              
              return (
                <Box key={segmentId} sx={{ mb: 2, ml: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                    Segment: {segment?.name} (Seq: {segment?.sequence})
                  </Typography>
                  
                  <TableContainer component={Paper} sx={{ mb: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>BOM Line ID</TableCell>
                          <TableCell>Material</TableCell>
                          <TableCell>Material Class</TableCell>
                          <TableCell>Qty Per Unit</TableCell>
                          <TableCell>UoM</TableCell>
                          <TableCell>Material Use</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {boms.map((row) => {
                          const material = materials.find(m => m.id === row.materialId);
                          return (
                            <TableRow key={row.id}>
                              <TableCell><Chip label={row.id} size="small" /></TableCell>
                              <TableCell>{material?.name || row.materialId}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={material?.className || 'Unknown'} 
                                  size="small"
                                  color={
                                    material?.classId === 'RAWMATERIAL' ? 'primary' :
                                    material?.classId === 'INPROCESSMATERIAL' ? 'default' : 'info'
                                  }
                                />
                              </TableCell>
                              <TableCell><strong>{row.qtyPerUnit}</strong></TableCell>
                              <TableCell>{row.uom}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={row.materialUse || 'CONSUME'} 
                                  size="small"
                                  color={
                                    row.materialUse === 'PRODUCE' ? 'success' :
                                    row.materialUse === 'SCRAP' ? 'error' : 'warning'
                                  }
                                />
                              </TableCell>
                              <TableCell align="right">
                                <IconButton size="small" onClick={() => onEdit(row)}>
                                  <EditIcon />
                                </IconButton>
                                <IconButton size="small" color="error" onClick={() => onDelete(row.id)}>
                                  <DeleteIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              );
            })}
          </Box>
        );
      })}
      
      {filteredData.length === 0 && (
        <Alert severity="info">
          No BOM lines found. Add materials required for each process segment.
        </Alert>
      )}
    </Box>
  );
};

interface EquipmentUsageTabProps {
  data: EquipmentUsage[];
  processSegments: ProcessSegment[];
  equipment: Equipment[];
  materials: Material[];
  onAdd: () => void;
  onEdit: (item: EquipmentUsage) => void;
  onDelete: (id: string) => void;
}

const EquipmentUsageTab: React.FC<EquipmentUsageTabProps> = ({ data, processSegments, equipment, materials, onAdd, onEdit, onDelete }) => {
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  
  // Get finished products (final products)
  const finishedProducts = materials.filter(m => m.classId === 'FINISHEDPRODUCT');
  
  // Filter equipment usage by selected product
  const filteredData = selectedProduct
    ? data.filter(usage => {
        const segment = processSegments.find(ps => ps.id === usage.processSegmentId);
        return segment?.productMaterialId === selectedProduct;
      })
    : data;
  
  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Equipment Usage</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Product</InputLabel>
            <Select
              value={selectedProduct}
              label="Filter by Product"
              onChange={(e) => setSelectedProduct(e.target.value)}
            >
              <MenuItem value="">
                <em>All Products</em>
              </MenuItem>
              {finishedProducts.map((product) => (
                <MenuItem key={product.id} value={product.id}>
                  {product.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
            Add Equipment Usage
          </Button>
        </Box>
      </Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Capacity defines how many units of product the equipment can process in one run. 
        Example: An oven with capacity 400 takes the same baking time whether producing 1 or 400 units.
      </Alert>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Process Segment</TableCell>
              <TableCell>Equipment</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Capacity Per Run (EA)</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((row) => {
              const segment = processSegments.find(ps => ps.id === row.processSegmentId);
              const productMaterial = materials.find(m => m.id === segment?.productMaterialId);
              return (
                <TableRow key={row.id}>
                  <TableCell><Chip label={row.id} size="small" /></TableCell>
                  <TableCell>
                    {productMaterial ? (
                      <Chip 
                        label={productMaterial.name} 
                        size="small" 
                        color="secondary"
                      />
                    ) : (
                      <em>N/A</em>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={segment?.name || row.processSegmentId} 
                      size="small"
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={equipment.find(e => e.id === row.equipmentId)?.id || row.equipmentId}
                      size="small"
                      color="default"
                    />
                  </TableCell>
                  <TableCell>{row.role}</TableCell>
                  <TableCell><strong>{row.capacityPerRun}</strong> units</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => onEdit(row)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => onDelete(row.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

interface MaintenanceTabProps {
  data: MaintenanceBOM[];
  equipment: Equipment[];
  processSegments: ProcessSegment[];
  materials: Material[];
  personClasses: PersonClass[];
  employees: Employee[];
  onAdd: () => void;
  onEdit: (item: MaintenanceBOM) => void;
  onDelete: (id: string) => void;
  onCopyBom: (sourceEquipmentId: string, targetEquipmentId: string) => void;
}

const MaintenanceTab: React.FC<MaintenanceTabProps> = ({
  data,
  equipment,
  processSegments,
  materials,
  personClasses,
  employees,
  onAdd,
  onEdit,
  onDelete,
  onCopyBom,
}) => {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyTargetEquipmentId, setCopyTargetEquipmentId] = useState('');

  const visibleAssignments = data.filter(item => !selectedEquipmentId || item.equipmentId === selectedEquipmentId);
  const groupedByEquipment = visibleAssignments.reduce<Record<string, MaintenanceBOM[]>>((acc, item) => {
    if (!acc[item.equipmentId]) {
      acc[item.equipmentId] = [];
    }
    acc[item.equipmentId].push(item);
    return acc;
  }, {});

  const groupedEntries = Object.entries(groupedByEquipment).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Maintenance BOM</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        Manage maintenance BOM lines by equipment and process segment.
      </Alert>

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 300 }}>
          <FormControl fullWidth>
            <InputLabel>Equipment</InputLabel>
            <Select
              value={selectedEquipmentId}
              label="Equipment"
              onChange={(e) => setSelectedEquipmentId(e.target.value)}
            >
              <MenuItem value="">
                <em>All equipment</em>
              </MenuItem>
              {equipment.map(eq => (
                <MenuItem key={eq.id} value={eq.id}>{eq.name} ({eq.id})</MenuItem>
              ))}
            </Select>
          </FormControl>
        </FormControl>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip
            title={selectedEquipmentId ? 'Copy BOM lines to another equipment' : 'Select an equipment first'}
            arrow
          >
            <span>
              <Button
                variant="outlined"
                startIcon={<ContentCopyIcon />}
                disabled={!selectedEquipmentId}
                onClick={() => { setCopyTargetEquipmentId(''); setCopyDialogOpen(true); }}
              >
                Copy BOM
              </Button>
            </span>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
            Add Maintenance BOM
          </Button>
        </Box>
      </Box>

      <Dialog open={copyDialogOpen} onClose={() => setCopyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Copy Maintenance BOM</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Copy all BOM lines from <strong>{equipment.find(e => e.id === selectedEquipmentId)?.name || selectedEquipmentId}</strong> to:
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Target Equipment</InputLabel>
            <Select
              value={copyTargetEquipmentId}
              label="Target Equipment"
              onChange={(e) => setCopyTargetEquipmentId(e.target.value)}
            >
              {equipment.filter(e => e.id !== selectedEquipmentId).map(eq => (
                <MenuItem key={eq.id} value={eq.id}>{eq.name} ({eq.id})</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCopyDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!copyTargetEquipmentId}
            onClick={() => { onCopyBom(selectedEquipmentId, copyTargetEquipmentId); setCopyDialogOpen(false); }}
          >
            Copy
          </Button>
        </DialogActions>
      </Dialog>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Equipment</TableCell>
              <TableCell>Segment</TableCell>
              <TableCell>Segment Seq</TableCell>
              <TableCell>Material</TableCell>
              <TableCell>Qty</TableCell>
              <TableCell>Personnel Qty</TableCell>
              <TableCell>Person Qty UoM</TableCell>
              <TableCell>Personnel Ref</TableCell>
              <TableCell>UoM</TableCell>
              <TableCell>Use</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groupedEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    No maintenance BOM lines found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              groupedEntries.flatMap(([equipmentId, items]) =>
                items.map((row, index) => {
                  const eq = equipment.find(e => e.id === row.equipmentId);
                  const segment = processSegments.find(ps => ps.id === row.processSegmentId);
                  const mat = materials.find(m => m.id === row.materialId);
                  const employee = employees.find(e => e.id === row.employeeId);
                  const personClass = personClasses.find(pc => pc.id === row.personClassId);
                  return (
                    <TableRow key={row.id}>
                      <TableCell>{index === 0 ? (eq?.name || equipmentId) : ''}</TableCell>
                      <TableCell>{segment?.name || row.processSegmentId}</TableCell>
                      <TableCell>{row.processSegmentSequence ?? segment?.sequence ?? '-'}</TableCell>
                      <TableCell>{mat?.name || row.materialId}</TableCell>
                      <TableCell>{row.qtyPerUnit}</TableCell>
                      <TableCell>{row.personQuantity || '-'}</TableCell>
                      <TableCell>{row.personQuantityUoM || 'Person'}</TableCell>
                      <TableCell>{employee?.employeeName || personClass?.name || row.employeeId || row.personClassId || '-'}</TableCell>
                      <TableCell>{row.uom}</TableCell>
                      <TableCell>{row.materialUse}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => onEdit(row)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => onDelete(row.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

interface MaintenanceBomDialogProps {
  open: boolean;
  data: MaintenanceBOM | null;
  equipment: Equipment[];
  processSegments: ProcessSegment[];
  materials: Material[];
  personClasses: PersonClass[];
  employees: Employee[];
  onClose: () => void;
  onSave: (data: MaintenanceBOM) => void;
}

const MaintenanceBomDialog: React.FC<MaintenanceBomDialogProps> = ({
  open,
  data,
  equipment,
  processSegments,
  materials,
  personClasses,
  employees,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<MaintenanceBOM>(
    data || {
      id: '',
      equipmentId: '',
      processSegmentId: '',
      processSegmentSequence: 0,
      materialId: '',
      qtyPerUnit: 1,
      personQuantity: 1,
      personQuantityUoM: 'Person',
      employeeId: '',
      personClassId: '',
      uom: 'EA',
      materialUse: 'CONSUME',
    }
  );

  React.useEffect(() => {
    if (data) {
      setFormData({
        ...data,
        processSegmentSequence: data.processSegmentSequence ?? 0,
        personQuantity: data.personQuantity ?? 0,
        personQuantityUoM: data.personQuantityUoM ?? 'Person',
        employeeId: data.employeeId ?? '',
        personClassId: data.personClassId ?? '',
      });
    } else {
      setFormData({
        id: '',
        equipmentId: '',
        processSegmentId: '',
        processSegmentSequence: 0,
        materialId: '',
        qtyPerUnit: 1,
        personQuantity: 1,
        personQuantityUoM: 'Person',
        employeeId: '',
        personClassId: '',
        uom: 'EA',
        materialUse: 'CONSUME',
      });
    }
  }, [data, open]);

  const maintenanceSegments = processSegments.filter(ps => !ps.productMaterialId);
  const maintenanceMaterials = materials.filter(m => m.classId !== 'FINISHEDPRODUCT');

  const handleSubmit = () => {
    if (!formData.equipmentId || !formData.processSegmentId || !formData.materialId) {
      alert('Equipment, Process Segment, and Material are required');
      return;
    }
    if (!formData.employeeId && !formData.personClassId) {
      alert('Select either an Employee or a Person Class for personnel requirement');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Maintenance BOM</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Equipment</InputLabel>
              <Select
                value={formData.equipmentId}
                label="Equipment"
                onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
              >
                {equipment.map(eq => (
                  <MenuItem key={eq.id} value={eq.id}>{eq.name} ({eq.id})</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Maintenance Process Segment</InputLabel>
              <Select
                value={formData.processSegmentId}
                label="Maintenance Process Segment"
                onChange={(e) => {
                  const processSegmentId = e.target.value;
                  const segment = processSegments.find(ps => ps.id === processSegmentId);
                  setFormData({
                    ...formData,
                    processSegmentId,
                    processSegmentSequence: segment?.sequence ?? 0,
                  });
                }}
              >
                {maintenanceSegments.map(ps => (
                  <MenuItem key={ps.id} value={ps.id}>{ps.name} ({ps.id})</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Material</InputLabel>
              <Select
                value={formData.materialId}
                label="Material"
                onChange={(e) => {
                  const matId = e.target.value;
                  const mat = materials.find(m => m.id === matId);
                  setFormData({ ...formData, materialId: matId, uom: mat?.defaultUoM || formData.uom });
                }}
              >
                {maintenanceMaterials.map(m => (
                  <MenuItem key={m.id} value={m.id}>{m.name} ({m.id})</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12} md={3}>
            <TextField
              fullWidth
              type="number"
              label="Qty Per Unit"
              inputProps={{ step: 0.01, min: 0 }}
              value={formData.qtyPerUnit}
              onChange={(e) => setFormData({ ...formData, qtyPerUnit: parseFloat(e.target.value) || 0 })}
            />
          </Grid>
          <Grid xs={12} md={3}>
            <TextField
              fullWidth
              label="UoM"
              value={formData.uom}
              onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
            />
          </Grid>
          <Grid xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Required Personnel (personQuantity)"
              inputProps={{ step: 0.01, min: 0 }}
              value={formData.personQuantity}
              onChange={(e) => setFormData({ ...formData, personQuantity: parseFloat(e.target.value) || 0 })}
            />
          </Grid>
          <Grid xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Personnel Quantity UoM</InputLabel>
              <Select
                value={formData.personQuantityUoM}
                label="Personnel Quantity UoM"
                onChange={(e) => setFormData({ ...formData, personQuantityUoM: e.target.value as 'Person' | 'FTE' })}
              >
                <MenuItem value="Person">Person</MenuItem>
                <MenuItem value="FTE">FTE</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Employee (optional)</InputLabel>
              <Select
                value={formData.employeeId}
                label="Employee (optional)"
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value, personClassId: e.target.value ? '' : formData.personClassId })}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {employees.map(emp => (
                  <MenuItem key={emp.id} value={emp.id}>{emp.employeeName} ({emp.id})</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Person Class (optional)</InputLabel>
              <Select
                value={formData.personClassId}
                label="Person Class (optional)"
                onChange={(e) => setFormData({ ...formData, personClassId: e.target.value, employeeId: e.target.value ? '' : formData.employeeId })}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {personClasses.map(pc => (
                  <MenuItem key={pc.id} value={pc.id}>{pc.name} ({pc.id})</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Material Use</InputLabel>
              <Select
                value={formData.materialUse}
                label="Material Use"
                onChange={(e) => setFormData({ ...formData, materialUse: e.target.value })}
              >
                <MenuItem value="CONSUME">CONSUME</MenuItem>
                <MenuItem value="PRODUCE">PRODUCE</MenuItem>
                <MenuItem value="SCRAP">SCRAP</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

// Dialog Components
interface MaterialClassDialogProps {
  open: boolean;
  data: MaterialClass | null;
  onClose: () => void;
  onSave: (data: MaterialClass) => void;
}

const MaterialClassDialog: React.FC<MaterialClassDialogProps> = ({ open, data, onClose, onSave }) => {
  const [formData, setFormData] = useState<MaterialClass>(
    data || { id: '', name: '', description: '' }
  );

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({ id: '', name: '', description: '' });
    }
  }, [data, open]);

  const handleSubmit = () => {
    if (!formData.id || !formData.name) {
      alert('ID and Name are required');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Material Class</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Class ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Class Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

interface MaterialDialogProps {
  open: boolean;
  data: Material | null;
  materialClasses: MaterialClass[];
  onClose: () => void;
  onSave: (data: Material) => void;
}

const MaterialDialog: React.FC<MaterialDialogProps> = ({ open, data, materialClasses, onClose, onSave }) => {
  const [formData, setFormData] = useState<Material>(
    data || { id: '', name: '', classId: '', className: '', defaultUoM: 'EA', description: '' }
  );

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({ id: '', name: '', classId: '', className: '', defaultUoM: 'EA', description: '' });
    }
  }, [data, open]);

  const handleClassChange = (classId: string) => {
    const selectedClass = materialClasses.find(mc => mc.id === classId);
    setFormData({ 
      ...formData, 
      classId, 
      className: selectedClass?.name || '' 
    });
  };

  const handleSubmit = () => {
    if (!formData.id || !formData.name || !formData.classId) {
      alert('ID, Name, and Class are required');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Material</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Material ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Material Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Grid>
          <Grid xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Material Class</InputLabel>
              <Select
                value={formData.classId}
                label="Material Class"
                onChange={(e) => handleClassChange(e.target.value)}
              >
                {materialClasses.map((mc) => (
                  <MenuItem key={mc.id} value={mc.id}>
                    {mc.name} ({mc.id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Default UoM"
              value={formData.defaultUoM}
              onChange={(e) => setFormData({ ...formData, defaultUoM: e.target.value })}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

interface MaterialLotDialogProps {
  open: boolean;
  data: MaterialLot | null;
  materials: Material[];
  materialLots: MaterialLot[];
  onClose: () => void;
  onSave: (data: MaterialLot) => void;
}

const MaterialLotDialog: React.FC<MaterialLotDialogProps> = ({ open, data, materials, materialLots, onClose, onSave }) => {
  const [formData, setFormData] = useState<MaterialLot>(
    data || { 
      id: '', 
      materialId: '', 
      lotQuantity: 0, 
      lotUoM: 'EA',
      receivedDateTime: '',
      producedDateTime: '',
      supplierOrProducerId: '',
      supplierOrProducerName: '',
      producedByProcessSegmentId: '',
      parentLotId: ''
    }
  );

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({ 
        id: '', 
        materialId: '', 
        lotQuantity: 0, 
        lotUoM: 'EA',
        receivedDateTime: '',
        producedDateTime: '',
        supplierOrProducerId: '',
        supplierOrProducerName: '',
        producedByProcessSegmentId: '',
        parentLotId: ''
      });
    }
  }, [data, open]);

  const handleSubmit = () => {
    if (!formData.id || !formData.materialId) {
      alert('Lot ID and Material are required');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Material Lot</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12} sm={6}>
            <TextField
              fullWidth
              label="Lot ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Material</InputLabel>
              <Select
                value={formData.materialId}
                label="Material"
                onChange={(e) => setFormData({ ...formData, materialId: e.target.value })}
              >
                {materials.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.name} ({m.id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField
              fullWidth
              label="Quantity"
              type="number"
              value={formData.lotQuantity}
              onChange={(e) => setFormData({ ...formData, lotQuantity: parseFloat(e.target.value) || 0 })}
              required
            />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField
              fullWidth
              label="UoM"
              value={formData.lotUoM}
              onChange={(e) => setFormData({ ...formData, lotUoM: e.target.value })}
              required
            />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField
              fullWidth
              label="Received DateTime"
              type="datetime-local"
              value={formData.receivedDateTime}
              onChange={(e) => setFormData({ ...formData, receivedDateTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField
              fullWidth
              label="Produced DateTime"
              type="datetime-local"
              value={formData.producedDateTime}
              onChange={(e) => setFormData({ ...formData, producedDateTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField
              fullWidth
              label="Supplier/Producer ID"
              value={formData.supplierOrProducerId}
              onChange={(e) => setFormData({ ...formData, supplierOrProducerId: e.target.value })}
            />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField
              fullWidth
              label="Supplier/Producer Name"
              value={formData.supplierOrProducerName}
              onChange={(e) => setFormData({ ...formData, supplierOrProducerName: e.target.value })}
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Produced By Process Segment ID"
              value={formData.producedByProcessSegmentId}
              onChange={(e) => setFormData({ ...formData, producedByProcessSegmentId: e.target.value })}
            />
          </Grid>
          <Grid xs={12}>
            <FormControl fullWidth>
              <InputLabel>Parent Lot (Optional)</InputLabel>
              <Select
                value={formData.parentLotId || ''}
                label="Parent Lot (Optional)"
                onChange={(e) => setFormData({ ...formData, parentLotId: e.target.value })}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {materialLots
                  .filter(lot => lot.id !== formData.id)
                  .map((lot) => {
                    const material = materials.find(m => m.id === lot.materialId);
                    return (
                      <MenuItem key={lot.id} value={lot.id}>
                        {lot.id} - {material?.name || lot.materialId} ({lot.lotQuantity} {lot.lotUoM})
                      </MenuItem>
                    );
                  })}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

interface MaterialSublotDialogProps {
  open: boolean;
  data: MaterialSublot | null;
  materialLots: MaterialLot[];
  materials: Material[];
  onClose: () => void;
  onSave: (data: MaterialSublot) => void;
}

const MaterialSublotDialog: React.FC<MaterialSublotDialogProps> = ({ open, data, materialLots, materials, onClose, onSave }) => {
  const [formData, setFormData] = useState<MaterialSublot>(
    data || {
      id: '',
      materialLotId: '',
      quantity: 0,
      quantityUnitOfMeasure: 'EA',
      storageLocation: '',
      status: '',
      disposition: ''
    }
  );

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({
        id: '',
        materialLotId: '',
        quantity: 0,
        quantityUnitOfMeasure: 'EA',
        storageLocation: '',
        status: '',
        disposition: ''
      });
    }
  }, [data, open]);

  const handleSubmit = () => {
    if (!formData.id || !formData.materialLotId) {
      alert('Sublot ID and Material Lot are required');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Material Sublot</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12} sm={6}>
            <TextField
              fullWidth
              label="Sublot ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Material Lot</InputLabel>
              <Select
                value={formData.materialLotId}
                label="Material Lot"
                onChange={(e) => setFormData({ ...formData, materialLotId: e.target.value })}
              >
                {materialLots.map((lot) => {
                  const material = materials.find(m => m.id === lot.materialId);
                  return (
                    <MenuItem key={lot.id} value={lot.id}>
                      {lot.id} - {material?.name || lot.materialId}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField
              fullWidth
              label="Quantity"
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
              required
            />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField
              fullWidth
              label="Unit of Measure"
              value={formData.quantityUnitOfMeasure}
              onChange={(e) => setFormData({ ...formData, quantityUnitOfMeasure: e.target.value })}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Storage Location"
              value={formData.storageLocation}
              onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
            />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField
              fullWidth
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              placeholder="e.g., Available, Reserved, Quarantined"
            />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField
              fullWidth
              label="Disposition"
              value={formData.disposition}
              onChange={(e) => setFormData({ ...formData, disposition: e.target.value })}
              placeholder="e.g., Approved, Rejected, Pending"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

interface MaterialDefinitionPropertyDialogProps {
  open: boolean;
  data: MaterialDefinitionProperty | null;
  onClose: () => void;
  onSave: (data: MaterialDefinitionProperty) => void;
}

interface MaterialClassPropertyDialogProps {
  open: boolean;
  data: MaterialClassProperty | null;
  onClose: () => void;
  onSave: (data: MaterialClassProperty) => void;
}

const MaterialClassPropertyDialog: React.FC<MaterialClassPropertyDialogProps> = ({ open, data, onClose, onSave }) => {
  const [formData, setFormData] = useState<MaterialClassProperty>(
    data || { id: '', propertyName: '', description: '', valueDataType: '', unit: '', minValue: '', maxValue: '' }
  );

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({ id: '', propertyName: '', description: '', valueDataType: '', unit: '', minValue: '', maxValue: '' });
    }
  }, [data, open]);

  const handleSubmit = () => {
    if (!formData.id || !formData.propertyName) {
      alert('ID and Property Name are required');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Material Class Property</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Material Class Property ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Property Name"
              value={formData.propertyName}
              onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField
              fullWidth
              label="Value Data Type"
              value={formData.valueDataType}
              onChange={(e) => setFormData({ ...formData, valueDataType: e.target.value })}
            />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField
              fullWidth
              label="Unit"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField
              fullWidth
              label="Min Value"
              value={formData.minValue}
              onChange={(e) => setFormData({ ...formData, minValue: e.target.value })}
            />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField
              fullWidth
              label="Max Value"
              value={formData.maxValue}
              onChange={(e) => setFormData({ ...formData, maxValue: e.target.value })}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

interface MaterialClassPropertyAssignmentDialogProps {
  open: boolean;
  data: MaterialClassPropertyAssignment | null;
  materialClassProperties: MaterialClassProperty[];
  materialDefinitionProperties: MaterialDefinitionProperty[];
  onClose: () => void;
  onSave: (data: MaterialClassPropertyAssignment) => void;
}

const MaterialClassPropertyAssignmentDialog: React.FC<MaterialClassPropertyAssignmentDialogProps> = ({
  open, data, materialClassProperties, materialDefinitionProperties, onClose, onSave
}) => {
  const [formData, setFormData] = useState<MaterialClassPropertyAssignment>(
    data || { id: '', materialClassPropertyId: '', materialDefinitionPropertyId: '' }
  );

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({ id: '', materialClassPropertyId: '', materialDefinitionPropertyId: '' });
    }
  }, [data, open]);

  const handleSubmit = () => {
    if (!formData.materialClassPropertyId || !formData.materialDefinitionPropertyId) {
      alert('Material Class Property and Material Definition Property are required');
      return;
    }

    const generatedId = `${formData.materialClassPropertyId}_${formData.materialDefinitionPropertyId}`;
    onSave({ ...formData, id: formData.id || generatedId });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Material Class Property Assignment</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Material Class Property</InputLabel>
              <Select
                value={formData.materialClassPropertyId}
                label="Material Class Property"
                onChange={(e) => setFormData({ ...formData, materialClassPropertyId: e.target.value })}
              >
                {materialClassProperties.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.id} - {p.propertyName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Material Definition Property</InputLabel>
              <Select
                value={formData.materialDefinitionPropertyId}
                label="Material Definition Property"
                onChange={(e) => setFormData({ ...formData, materialDefinitionPropertyId: e.target.value })}
              >
                {materialDefinitionProperties.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.id} - {p.value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

const MaterialDefinitionPropertyDialog: React.FC<MaterialDefinitionPropertyDialogProps> = ({ open, data, onClose, onSave }) => {
  const [formData, setFormData] = useState<MaterialDefinitionProperty>(
    data || { id: '', value: '', description: '', valueUnitOfMeasure: '' }
  );

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({ id: '', value: '', description: '', valueUnitOfMeasure: '' });
    }
  }, [data, open]);

  const handleSubmit = () => {
    if (!formData.id || !formData.value) {
      alert('ID and Value are required');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Material Definition Property</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Property ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Value"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Unit of Measure"
              value={formData.valueUnitOfMeasure}
              onChange={(e) => setFormData({ ...formData, valueUnitOfMeasure: e.target.value })}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};

interface MaterialDefinitionPropertyAssignmentDialogProps {
  open: boolean;
  data: MaterialDefinitionPropertyAssignment | null;
  materials: Material[];
  materialDefinitionProperties: MaterialDefinitionProperty[];
  onClose: () => void;
  onSave: (data: MaterialDefinitionPropertyAssignment) => void;
}

const MaterialDefinitionPropertyAssignmentDialog: React.FC<MaterialDefinitionPropertyAssignmentDialogProps> = ({ 
  open, data, materials, materialDefinitionProperties, onClose, onSave 
}) => {
  const [formData, setFormData] = useState<MaterialDefinitionPropertyAssignment>(
    data || { pk: '', id: '', materialDefinitionPropertyId: '', materialDefinitionId: '', value: '', description: '', valueUnitOfMeasure: '' }
  );

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({ pk: '', id: '', materialDefinitionPropertyId: '', materialDefinitionId: '', value: '', description: '', valueUnitOfMeasure: '' });
    }
  }, [data, open]);

  const handlePropertyChange = (propertyId: string) => {
    const selectedProp = materialDefinitionProperties.find(p => p.id === propertyId);
    if (selectedProp) {
      setFormData({ 
        ...formData, 
        materialDefinitionPropertyId: propertyId,
        id: propertyId, // Use property id as the assignment id
        value: selectedProp.value,
        description: selectedProp.description,
        valueUnitOfMeasure: selectedProp.valueUnitOfMeasure
      });
    }
  };

  const handleSubmit = () => {
    if (!formData.materialDefinitionPropertyId || !formData.materialDefinitionId) {
      alert('Property and Material Definition are required');
      return;
    }
    // Generate pk if not present (for new records)
    if (!formData.pk) {
      formData.pk = `${Date.now()}`;
    }
    // Generate id if not present
    if (!formData.id) {
      formData.id = formData.materialDefinitionPropertyId;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Material Definition Property Assignment</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Material Definition</InputLabel>
              <Select
                value={formData.materialDefinitionId}
                label="Material Definition"
                onChange={(e) => setFormData({ ...formData, materialDefinitionId: e.target.value })}
              >
                {materials.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.name} ({m.id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Property</InputLabel>
              <Select
                value={formData.materialDefinitionPropertyId}
                label="Property"
                onChange={(e) => handlePropertyChange(e.target.value)}
                disabled={!!data}
              >
                {materialDefinitionProperties.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.id} - {p.description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Value"
              value={formData.value}
              disabled
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              disabled
              multiline
              rows={2}
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Unit of Measure"
              value={formData.valueUnitOfMeasure}
              disabled
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};

interface EquipmentClassDialogProps {
  open: boolean;
  data: EquipmentClass | null;
  equipmentClasses: EquipmentClass[];
  onClose: () => void;
  onSave: (data: EquipmentClass) => void;
}

const EquipmentClassDialog: React.FC<EquipmentClassDialogProps> = ({ open, data, equipmentClasses, onClose, onSave }) => {
  const [formData, setFormData] = useState<EquipmentClass>(
    data || { id: '', name: '', description: '', parentId: '' }
  );

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({ id: '', name: '', description: '', parentId: '' });
    }
  }, [data, open]);

  const handleSubmit = () => {
    if (!formData.id || !formData.name) {
      alert('ID and Name are required');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Equipment Class</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Class ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Class Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
            />
          </Grid>
          <Grid xs={12}>
            <FormControl fullWidth>
              <InputLabel>Parent Class (Optional)</InputLabel>
              <Select
                value={formData.parentId || ''}
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value || undefined })}
                label="Parent Class (Optional)"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {equipmentClasses
                  .filter(cls => cls.id !== formData.id) // Prevent self-reference
                  .map((cls) => (
                  <MenuItem key={cls.id} value={cls.id}>
                    {cls.name} ({cls.id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

interface EquipmentDialogProps {
  open: boolean;
  data: Equipment | null;
  equipmentClasses: EquipmentClass[];
  productionLines: ProductionLine[];
  plants: Plant[];
  equipment: Equipment[];
  onClose: () => void;
  onSave: (data: Equipment) => void;
}

const EquipmentDialog: React.FC<EquipmentDialogProps> = ({ open, data, equipmentClasses, productionLines, plants, equipment, onClose, onSave }) => {
  const [formData, setFormData] = useState<Equipment>(
    data || { id: '', name: '', classId: '', className: '', description: '', productionLineId: '', parentEquipmentId: '' }
  );

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({ id: '', name: '', classId: '', className: '', description: '', productionLineId: '', parentEquipmentId: '' });
    }
  }, [data, open]);

  const handleClassChange = (classId: string) => {
    const selectedClass = equipmentClasses.find(ec => ec.id === classId);
    setFormData({ 
      ...formData, 
      classId, 
      className: selectedClass?.name || '' 
    });
  };

  const handleSubmit = () => {
    if (!formData.id || !formData.name || !formData.classId) {
      alert('ID, Name, and Class are required');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Equipment</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Equipment ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Equipment Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Grid>
          <Grid xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Equipment Class</InputLabel>
              <Select
                value={formData.classId}
                label="Equipment Class"
                onChange={(e) => handleClassChange(e.target.value)}
              >
                {equipmentClasses.map((ec) => (
                  <MenuItem key={ec.id} value={ec.id}>
                    {ec.name} ({ec.id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12}>
            <FormControl fullWidth>
              <InputLabel>Production Line (Optional)</InputLabel>
              <Select
                value={formData.productionLineId || ''}
                label="Production Line (Optional)"
                onChange={(e) => setFormData({ ...formData, productionLineId: e.target.value })}
              >
                <MenuItem value="">
                  <em>Not assigned</em>
                </MenuItem>
                {productionLines.map((pl) => {
                  const plant = plants.find(p => p.id === pl.plantId);
                  return (
                    <MenuItem key={pl.id} value={pl.id}>
                      {pl.name} - {plant?.name || 'Unknown Plant'}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12}>
            <FormControl fullWidth>
              <InputLabel>Parent Equipment (Optional)</InputLabel>
              <Select
                value={formData.parentEquipmentId || ''}
                label="Parent Equipment (Optional)"
                onChange={(e) => setFormData({ ...formData, parentEquipmentId: e.target.value })}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {equipment
                  .filter(eq => eq.id !== formData.id)
                  .map((eq) => (
                    <MenuItem key={eq.id} value={eq.id}>
                      {eq.name} ({eq.id})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

interface EquipmentPropertyDialogProps {
  open: boolean;
  data: EquipmentProperty | null;
  onClose: () => void;
  onSave: (data: EquipmentProperty) => void;
}

const EquipmentPropertyDialog: React.FC<EquipmentPropertyDialogProps> = ({ open, data, onClose, onSave }) => {
  const [formData, setFormData] = useState<EquipmentProperty>(
    data || { id: '', name: '', description: '', valueDataType: 'DECIMAL', unit: '', minValue: undefined, maxValue: undefined }
  );

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({ id: '', name: '', description: '', valueDataType: 'DECIMAL', unit: '', minValue: undefined, maxValue: undefined });
    }
  }, [data, open]);

  const handleSubmit = () => {
    if (!formData.id || !formData.name || !formData.valueDataType) {
      alert('ID, Name, and Data Type are required');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Equipment Property</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Property ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Property Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Grid>
          <Grid xs={6}>
            <FormControl fullWidth required>
              <InputLabel>Data Type</InputLabel>
              <Select
                value={formData.valueDataType}
                label="Data Type"
                onChange={(e) => setFormData({ ...formData, valueDataType: e.target.value })}
              >
                <MenuItem value="DECIMAL">DECIMAL</MenuItem>
                <MenuItem value="INTEGER">INTEGER</MenuItem>
                <MenuItem value="STRING">STRING</MenuItem>
                <MenuItem value="BOOLEAN">BOOLEAN</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={6}>
            <TextField
              fullWidth
              label="Unit"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            />
          </Grid>
          <Grid xs={6}>
            <TextField
              fullWidth
              label="Min Value"
              type={formData.valueDataType === 'DECIMAL' || formData.valueDataType === 'INTEGER' ? 'number' : 'text'}
              value={formData.minValue ?? ''}
              onChange={(e) => {
                const isNumeric = formData.valueDataType === 'DECIMAL' || formData.valueDataType === 'INTEGER';
                setFormData({ ...formData, minValue: e.target.value ? (isNumeric ? parseFloat(e.target.value) : e.target.value) : undefined });
              }}
            />
          </Grid>
          <Grid xs={6}>
            <TextField
              fullWidth
              label="Max Value"
              type={formData.valueDataType === 'DECIMAL' || formData.valueDataType === 'INTEGER' ? 'number' : 'text'}
              value={formData.maxValue ?? ''}
              onChange={(e) => {
                const isNumeric = formData.valueDataType === 'DECIMAL' || formData.valueDataType === 'INTEGER';
                setFormData({ ...formData, maxValue: e.target.value ? (isNumeric ? parseFloat(e.target.value) : e.target.value) : undefined });
              }}
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

interface EquipmentPropertyAssignmentDialogProps {
  open: boolean;
  data: EquipmentPropertyAssignment | null;
  equipment: Equipment[];
  processSegments: ProcessSegment[];
  equipmentProperties: EquipmentProperty[];
  onClose: () => void;
  onSave: (data: EquipmentPropertyAssignment) => void;
}

const EquipmentPropertyAssignmentDialog: React.FC<EquipmentPropertyAssignmentDialogProps> = ({ open, data, equipment, processSegments, equipmentProperties, onClose, onSave }) => {
  const [formData, setFormData] = useState<EquipmentPropertyAssignment>(
    data || { id: '', equipmentId: '', processSegmentId: '', equipmentPropertyId: '', samplingMode: 'Periodic', samplingIntervalSeconds: undefined }
  );

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({ id: '', equipmentId: '', processSegmentId: '', equipmentPropertyId: '', samplingMode: 'Periodic', samplingIntervalSeconds: undefined });
    }
  }, [data, open]);

  const handleSubmit = () => {
    if (!formData.id || !formData.equipmentId || !formData.processSegmentId || !formData.equipmentPropertyId || !formData.samplingMode) {
      alert('All fields except Sampling Interval are required');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Equipment Property Assignment</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Assignment ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Equipment</InputLabel>
              <Select
                value={formData.equipmentId}
                label="Equipment"
                onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
              >
                {equipment.map((eq) => (
                  <MenuItem key={eq.id} value={eq.id}>
                    {eq.id} - {eq.className}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Process Segment</InputLabel>
              <Select
                value={formData.processSegmentId}
                label="Process Segment"
                onChange={(e) => setFormData({ ...formData, processSegmentId: e.target.value })}
              >
                {processSegments.map((ps) => (
                  <MenuItem key={ps.id} value={ps.id}>
                    {ps.name} ({ps.id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Equipment Property</InputLabel>
              <Select
                value={formData.equipmentPropertyId}
                label="Equipment Property"
                onChange={(e) => setFormData({ ...formData, equipmentPropertyId: e.target.value })}
              >
                {equipmentProperties.map((ep) => (
                  <MenuItem key={ep.id} value={ep.id}>
                    {ep.name} ({ep.valueDataType})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={6}>
            <FormControl fullWidth required>
              <InputLabel>Sampling Mode</InputLabel>
              <Select
                value={formData.samplingMode}
                label="Sampling Mode"
                onChange={(e) => setFormData({ ...formData, samplingMode: e.target.value })}
              >
                <MenuItem value="Periodic">Periodic</MenuItem>
                <MenuItem value="OnDemand">On Demand</MenuItem>
                <MenuItem value="Continuous">Continuous</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={6}>
            <TextField
              fullWidth
              label="Sampling Interval (seconds)"
              type="number"
              value={formData.samplingIntervalSeconds ?? ''}
              onChange={(e) => setFormData({ ...formData, samplingIntervalSeconds: e.target.value ? parseInt(e.target.value) : undefined })}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

interface ProcessSegmentDialogProps {
  open: boolean;
  data: ProcessSegment | null;
  materials: Material[];
  onClose: () => void;
  onSave: (data: ProcessSegment) => void;
}

const ProcessSegmentDialog: React.FC<ProcessSegmentDialogProps> = ({ open, data, materials, onClose, onSave }) => {
  const [formData, setFormData] = useState<ProcessSegment>(
    data || { id: '', productMaterialId: '', name: '', sequence: 10, durationHours: 1.0 }
  );

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({ id: '', productMaterialId: '', name: '', sequence: 10, durationHours: 1.0 });
    }
  }, [data, open]);

  const handleSubmit = () => {
    if (!formData.id || !formData.name) {
      alert('ID and Name are required');
      return;
    }
    onSave(formData);
  };

  const finishedProducts = materials.filter(m => m.classId === 'FINISHEDPRODUCT');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Process Segment</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Process Segment ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Segment Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Grid>
          <Grid xs={12}>
            <FormControl fullWidth>
              <InputLabel>Product Material</InputLabel>
              <Select
                value={formData.productMaterialId}
                label="Product Material"
                onChange={(e) => setFormData({ ...formData, productMaterialId: e.target.value })}
              >
                <MenuItem value="">
                  <em>None (maintenance segment)</em>
                </MenuItem>
                {finishedProducts.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.name} ({m.id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={6}>
            <TextField
              fullWidth
              label="Sequence"
              type="number"
              value={formData.sequence}
              onChange={(e) => setFormData({ ...formData, sequence: parseInt(e.target.value) || 0 })}
              required
            />
          </Grid>
          <Grid xs={6}>
            <TextField
              fullWidth
              label="Duration (hours)"
              type="number"
              inputProps={{ step: 0.1 }}
              value={formData.durationHours}
              onChange={(e) => setFormData({ ...formData, durationHours: parseFloat(e.target.value) || 0 })}
              required
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

interface SegmentBOMDialogProps {
  open: boolean;
  data: SegmentMaterialBOM | null;
  processSegments: ProcessSegment[];
  equipment: Equipment[];
  equipmentUsages: EquipmentUsage[];
  materials: Material[];
  onClose: () => void;
  onSave: (data: SegmentMaterialBOM) => void;
}

const SegmentBOMDialog: React.FC<SegmentBOMDialogProps> = ({ open, data, processSegments, equipment, equipmentUsages, materials, onClose, onSave }) => {
  const [formData, setFormData] = useState<SegmentMaterialBOM>(
    data || { id: '', processSegmentId: '', materialId: '', qtyPerUnit: 0, uom: '', materialUse: 'CONSUME' }
  );
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');

  React.useEffect(() => {
    if (data) {
      setFormData(data);
      // Set the product based on the segment
      const segment = processSegments.find(ps => ps.id === data.processSegmentId);
      if (segment) {
        setSelectedProduct(segment.productMaterialId);
      }

      // Best-effort preselect equipment linked to this segment
      const usage = equipmentUsages.find(eu => eu.processSegmentId === data.processSegmentId);
      setSelectedEquipment(usage?.equipmentId || '');
    } else {
      setFormData({ id: '', processSegmentId: '', materialId: '', qtyPerUnit: 0, uom: '', materialUse: 'CONSUME' });
      setSelectedEquipment('');
      setSelectedProduct('');
    }
  }, [data, open, processSegments, equipmentUsages]);

  const handleMaterialChange = (materialId: string) => {
    const selectedMaterial = materials.find(m => m.id === materialId);
    setFormData({ 
      ...formData, 
      materialId,
      uom: selectedMaterial?.defaultUoM || ''
    });
  };

  const handleEquipmentChange = (equipmentId: string) => {
    setSelectedEquipment(equipmentId);
    // Clear segment selection when equipment changes
    setFormData({ ...formData, processSegmentId: '' });
  };

  const handleSubmit = () => {
    if (!formData.id || !selectedEquipment || !formData.processSegmentId || !formData.materialId) {
      alert('All fields are required');
      return;
    }
    onSave(formData);
  };

  // Filter segments by selected equipment using equipment usage assignments.
  const filteredSegments = selectedEquipment
    ? processSegments.filter(ps =>
        equipmentUsages.some(eu => eu.equipmentId === selectedEquipment && eu.processSegmentId === ps.id)
      )
    : processSegments;

  // Get selected segment info for display
  const selectedSegment = processSegments.find(ps => ps.id === formData.processSegmentId);
  const selectedProductInfo = selectedSegment 
    ? materials.find(m => m.id === selectedSegment.productMaterialId)
    : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} BOM Line</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          BOM lines define materials required for a specific process segment.
          For maintenance BOMs: select equipment first, then a segment assigned to that equipment, then the material.
        </Alert>
        
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="BOM Line ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
              helperText="Unique identifier for this BOM line (e.g., BOM-001)"
            />
          </Grid>
          
          <Grid xs={12}>
            <FormControl fullWidth required>
              <InputLabel>1. Select Equipment</InputLabel>
              <Select
                value={selectedEquipment}
                label="1. Select Equipment"
                onChange={(e) => handleEquipmentChange(e.target.value)}
              >
                <MenuItem value="">
                  <em>-- Select equipment --</em>
                </MenuItem>
                {equipment.map((eq) => (
                  <MenuItem key={eq.id} value={eq.id}>
                    {eq.name} ({eq.id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid xs={12}>
            <FormControl fullWidth required disabled={!selectedEquipment}>
              <InputLabel>2. Select Process Segment</InputLabel>
              <Select
                value={formData.processSegmentId}
                label="2. Select Process Segment"
                onChange={(e) => setFormData({ ...formData, processSegmentId: e.target.value })}
              >
                <MenuItem value="">
                  <em>-- Select a segment --</em>
                </MenuItem>
                {filteredSegments
                  .sort((a, b) => a.sequence - b.sequence)
                  .map((ps) => (
                    <MenuItem key={ps.id} value={ps.id}>
                      [{ps.sequence}] {ps.name} - {ps.durationHours}h ({ps.id})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            {selectedSegment && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Equipment: {equipment.find(eq => eq.id === selectedEquipment)?.name || selectedEquipment}
                {' | '}Product: {selectedProductInfo?.name || 'None (maintenance)'}
                {' | '}Segment: {selectedSegment.name} (Seq: {selectedSegment.sequence})
              </Typography>
            )}
          </Grid>
          
          <Grid xs={12}>
            <FormControl fullWidth required>
              <InputLabel>3. Select Material</InputLabel>
              <Select
                value={formData.materialId}
                label="3. Select Material"
                onChange={(e) => handleMaterialChange(e.target.value)}
              >
                <MenuItem value="">
                  <em>-- Select a material --</em>
                </MenuItem>
                {materials
                  .sort((a, b) => {
                    // Sort: Raw materials first, then in-process, then finished products
                    const order = { RAWMATERIAL: 1, INPROCESSMATERIAL: 2, FINISHEDPRODUCT: 3 };
                    return (order[a.classId as keyof typeof order] || 999) - (order[b.classId as keyof typeof order] || 999);
                  })
                  .map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                          label={m.className} 
                          size="small" 
                          color={
                            m.classId === 'RAWMATERIAL' ? 'primary' :
                            m.classId === 'INPROCESSMATERIAL' ? 'default' : 'success'
                          }
                        />
                        <span>{m.name} ({m.defaultUoM})</span>
                      </Box>
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid xs={6}>
            <TextField
              fullWidth
              label="4. Qty Per Unit"
              type="number"
              inputProps={{ step: 0.001, min: 0 }}
              value={formData.qtyPerUnit}
              onChange={(e) => setFormData({ ...formData, qtyPerUnit: parseFloat(e.target.value) || 0 })}
              required
              helperText="Amount needed per 1 unit of product"
            />
          </Grid>
          <Grid xs={6}>
            <TextField
              fullWidth
              label="Unit of Measure"
              value={formData.uom}
              onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
              required
              helperText="Auto-filled from material"
            />
          </Grid>
          <Grid xs={12}>
            <FormControl fullWidth required>
              <InputLabel>5. Material Use</InputLabel>
              <Select
                value={formData.materialUse || 'CONSUME'}
                label="5. Material Use"
                onChange={(e) => setFormData({ ...formData, materialUse: e.target.value })}
              >
                <MenuItem value="CONSUME">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label="CONSUME" size="small" color="warning" />
                    <span>Material consumed (input)</span>
                  </Box>
                </MenuItem>
                <MenuItem value="PRODUCE">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label="PRODUCE" size="small" color="success" />
                    <span>Material produced (output)</span>
                  </Box>
                </MenuItem>
                <MenuItem value="SCRAP">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label="SCRAP" size="small" color="error" />
                    <span>Scrap material (waste)</span>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

interface EquipmentUsageDialogProps {
  open: boolean;
  data: EquipmentUsage | null;
  processSegments: ProcessSegment[];
  equipment: Equipment[];
  onClose: () => void;
  onSave: (data: EquipmentUsage) => void;
}

interface EquipmentUsageDialogProps {
  open: boolean;
  data: EquipmentUsage | null;
  processSegments: ProcessSegment[];
  equipment: Equipment[];
  materials: Material[];
  onClose: () => void;
  onSave: (data: EquipmentUsage) => void;
}

const EquipmentUsageDialog: React.FC<EquipmentUsageDialogProps> = ({ open, data, processSegments, equipment, materials, onClose, onSave }) => {
  const [formData, setFormData] = useState<EquipmentUsage>(
    data || { id: '', processSegmentId: '', equipmentId: '', role: 'Primary', capacityPerRun: 0 }
  );

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({ id: '', processSegmentId: '', equipmentId: '', role: 'Primary', capacityPerRun: 0 });
    }
  }, [data, open]);

  const handleSubmit = () => {
    if (!formData.id || !formData.processSegmentId || !formData.equipmentId) {
      alert('All fields are required');
      return;
    }
    onSave(formData);
  };

  // Get the selected process segment and its product
  const selectedSegment = processSegments.find(ps => ps.id === formData.processSegmentId);
  const productMaterial = materials.find(m => m.id === selectedSegment?.productMaterialId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Equipment Usage</DialogTitle>
      <DialogContent>
        {selectedSegment && productMaterial && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Adding Equipment Usage for: <strong>{productMaterial.name}</strong> → <strong>{selectedSegment.name}</strong>
          </Alert>
        )}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Equipment Usage ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Process Segment</InputLabel>
              <Select
                value={formData.processSegmentId}
                label="Process Segment"
                onChange={(e) => setFormData({ ...formData, processSegmentId: e.target.value })}
              >
                {processSegments.map((ps) => {
                  const product = materials.find(m => m.id === ps.productMaterialId);
                  return (
                    <MenuItem key={ps.id} value={ps.id}>
                      {product?.name} → {ps.name} ({ps.id})
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Equipment</InputLabel>
              <Select
                value={formData.equipmentId}
                label="Equipment"
                onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
              >
                {equipment.map((e) => (
                  <MenuItem key={e.id} value={e.id}>
                    {e.id} ({e.className})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={6}>
            <TextField
              fullWidth
              label="Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              required
            />
          </Grid>
          <Grid xs={6}>
            <TextField
              fullWidth
              label="Capacity Per Run (EA)"
              type="number"
              value={formData.capacityPerRun}
              onChange={(e) => setFormData({ ...formData, capacityPerRun: parseInt(e.target.value) || 0 })}
              required
              helperText="Max units per batch"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

// Plant Tab Component
interface PlantTabProps {
  data: Plant[];
  onAdd: () => void;
  onEdit: (item: Plant) => void;
  onDelete: (id: string) => void;
}

const PlantTab: React.FC<PlantTabProps> = ({ data, onAdd, onEdit, onDelete }) => {
  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6">Plants</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
          Add Plant
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id}>
                <TableCell><Chip label={row.id} size="small" /></TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.location}</TableCell>
                <TableCell>{row.description}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => onEdit(row)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => onDelete(row.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// Production Line Tab Component
interface ProductionLineTabProps {
  data: ProductionLine[];
  plants: Plant[];
  onAdd: () => void;
  onEdit: (item: ProductionLine) => void;
  onDelete: (id: string) => void;
}

const ProductionLineTab: React.FC<ProductionLineTabProps> = ({ data, plants, onAdd, onEdit, onDelete }) => {
  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6">Production Lines</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
          Add Production Line
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Plant</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => {
              const plant = plants.find(p => p.id === row.plantId);
              return (
                <TableRow key={row.id}>
                  <TableCell><Chip label={row.id} size="small" /></TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>
                    <Chip 
                      label={plant?.name || row.plantId} 
                      size="small" 
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => onEdit(row)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => onDelete(row.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// Line Equipment Tab Component
interface LineEquipmentTabProps {
  data: LineEquipment[];
  productionLines: ProductionLine[];
  plants: Plant[];
  equipment: Equipment[];
  onAdd: () => void;
  onEdit: (item: LineEquipment) => void;
  onDelete: (id: string) => void;
}

const LineEquipmentTab: React.FC<LineEquipmentTabProps> = ({ data, productionLines, plants, equipment, onAdd, onEdit, onDelete }) => {
  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6">Line Equipment</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
          Add Line Equipment
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Plant ID</TableCell>
              <TableCell>Production Line</TableCell>
              <TableCell>Plant (from Line)</TableCell>
              <TableCell>Equipment</TableCell>
              <TableCell>Sequence</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => {
              const prodLine = productionLines.find(pl => pl.id === row.productionLineId);
              const plant = plants.find(p => p.id === prodLine?.plantId);
              const directPlant = plants.find(p => p.id === row.plantId);
              const equip = equipment.find(e => e.id === row.equipmentId);
              return (
                <TableRow key={row.id}>
                  <TableCell><Chip label={row.id} size="small" /></TableCell>
                  <TableCell>
                    {row.plantId ? (
                      <Chip 
                        label={directPlant?.name || row.plantId} 
                        size="small" 
                        color="info"
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={prodLine?.name || row.productionLineId} 
                      size="small" 
                      color="secondary"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={plant?.name || 'Unknown'} 
                      size="small" 
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={equip?.id || row.equipmentId} 
                      size="small"
                    />
                    {equip && (
                      <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                        ({equip.className})
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{row.sequence}</TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => onEdit(row)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => onDelete(row.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// Plant Dialog Component
interface PlantDialogProps {
  open: boolean;
  data: Plant | null;
  onClose: () => void;
  onSave: (data: Plant) => void;
}

const PlantDialog: React.FC<PlantDialogProps> = ({ open, data, onClose, onSave }) => {
  const [formData, setFormData] = useState<Plant>(
    data || { id: '', name: '', location: '', description: '' }
  );

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({ id: '', name: '', location: '', description: '' });
    }
  }, [data, open]);

  const handleSubmit = () => {
    if (!formData.id || !formData.name) {
      alert('ID and Name are required');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Plant</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Plant ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Plant Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

// Production Line Dialog Component
interface ProductionLineDialogProps {
  open: boolean;
  data: ProductionLine | null;
  plants: Plant[];
  onClose: () => void;
  onSave: (data: ProductionLine) => void;
}

const ProductionLineDialog: React.FC<ProductionLineDialogProps> = ({ open, data, plants, onClose, onSave }) => {
  const [formData, setFormData] = useState<ProductionLine>(
    data || { id: '', plantId: '', name: '', description: '' }
  );

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({ id: '', plantId: '', name: '', description: '' });
    }
  }, [data, open]);

  const handleSubmit = () => {
    if (!formData.id || !formData.name || !formData.plantId) {
      alert('ID, Name, and Plant are required');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Production Line</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Production Line ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Production Line Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Grid>
          <Grid xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Plant</InputLabel>
              <Select
                value={formData.plantId}
                label="Plant"
                onChange={(e) => setFormData({ ...formData, plantId: e.target.value })}
              >
                {plants.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name} ({p.id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

// Line Equipment Dialog Component
interface LineEquipmentDialogProps {
  open: boolean;
  data: LineEquipment | null;
  productionLines: ProductionLine[];
  plants: Plant[];
  equipment: Equipment[];
  onClose: () => void;
  onSave: (data: LineEquipment) => void;
}

const LineEquipmentDialog: React.FC<LineEquipmentDialogProps> = ({ open, data, productionLines, plants, equipment, onClose, onSave }) => {
  const [formData, setFormData] = useState<LineEquipment>(
    data || { id: '', productionLineId: '', equipmentId: '', sequence: 10, description: '', plantId: '' }
  );

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({ id: '', productionLineId: '', equipmentId: '', sequence: 10, description: '', plantId: '' });
    }
  }, [data, open]);

  const handleSubmit = () => {
    if (!formData.id || !formData.productionLineId || !formData.equipmentId) {
      alert('ID, Production Line, and Equipment are required');
      return;
    }
    onSave(formData);
  };

  const selectedProdLine = productionLines.find(pl => pl.id === formData.productionLineId);
  const selectedPlant = plants.find(p => p.id === selectedProdLine?.plantId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Line Equipment</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Line Equipment ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Plant</InputLabel>
              <Select
                value={formData.plantId}
                label="Plant"
                onChange={(e) => setFormData({ ...formData, plantId: e.target.value })}
              >
                {plants.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name} ({p.id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Production Line</InputLabel>
              <Select
                value={formData.productionLineId}
                label="Production Line"
                onChange={(e) => setFormData({ ...formData, productionLineId: e.target.value })}
              >
                {productionLines.map((pl) => {
                  const plant = plants.find(p => p.id === pl.plantId);
                  return (
                    <MenuItem key={pl.id} value={pl.id}>
                      {pl.name} - {plant?.name || 'Unknown Plant'}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            {selectedProdLine && selectedPlant && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Line: {selectedProdLine.name} | Plant: {selectedPlant.name}
              </Typography>
            )}
          </Grid>
          <Grid xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Equipment</InputLabel>
              <Select
                value={formData.equipmentId}
                label="Equipment"
                onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
              >
                {equipment.map((e) => (
                  <MenuItem key={e.id} value={e.id}>
                    {e.id} - {e.className}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Sequence"
              type="number"
              value={formData.sequence}
              onChange={(e) => setFormData({ ...formData, sequence: parseInt(e.target.value) || 0 })}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

// Shift Dialog Component
interface ShiftDialogProps {
  open: boolean;
  data: Shift | null;
  onClose: () => void;
  onSave: (data: Shift) => void;
}

const ShiftDialog: React.FC<ShiftDialogProps> = ({ open, data, onClose, onSave }) => {
  const [formData, setFormData] = useState<Shift>(
    data || { id: '', shiftNumber: 1, shiftName: '', startTime: '', endTime: '', description: '' }
  );

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({ id: '', shiftNumber: 1, shiftName: '', startTime: '', endTime: '', description: '' });
    }
  }, [data, open]);

  const handleSubmit = () => {
    if (!formData.id || !formData.shiftNumber || !formData.shiftName || !formData.startTime || !formData.endTime) {
      alert('ID, Shift Number, Shift Name, Start Time, and End Time are required');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Shift</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Shift ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Shift Number</InputLabel>
              <Select
                value={formData.shiftNumber}
                label="Shift Number"
                onChange={(e) => setFormData({ ...formData, shiftNumber: e.target.value as number })}
              >
                <MenuItem value={1}>1</MenuItem>
                <MenuItem value={2}>2</MenuItem>
                <MenuItem value={3}>3</MenuItem>
                <MenuItem value={4}>4</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Shift Name"
              value={formData.shiftName}
              onChange={(e) => setFormData({ ...formData, shiftName: e.target.value })}
              required
            />
          </Grid>
          <Grid xs={6}>
            <TextField
              fullWidth
              label="Start Time"
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
          <Grid xs={6}>
            <TextField
              fullWidth
              label="End Time"
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

// Crew Dialog Component
interface CrewDialogProps {
  open: boolean;
  data: Crew | null;
  onClose: () => void;
  onSave: (data: Crew) => void;
}

const CrewDialog: React.FC<CrewDialogProps> = ({ open, data, onClose, onSave }) => {
  const [formData, setFormData] = useState<Crew>(
    data || { id: '', crewName: '', peopleCount: 0, skills: '', description: '' }
  );

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({ id: '', crewName: '', peopleCount: 0, skills: '', description: '' });
    }
  }, [data, open]);

  const handleSubmit = () => {
    if (!formData.id || !formData.crewName || formData.peopleCount <= 0) {
      alert('ID, Crew Name, and People Count (>0) are required');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Crew</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Crew ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Crew Name"
              value={formData.crewName}
              onChange={(e) => setFormData({ ...formData, crewName: e.target.value })}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="People Count"
              type="number"
              value={formData.peopleCount}
              onChange={(e) => setFormData({ ...formData, peopleCount: parseInt(e.target.value) || 0 })}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Skills"
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              helperText="Comma-separated list of skills"
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

interface PersonClassDialogProps {
  open: boolean;
  data: PersonClass | null;
  onClose: () => void;
  onSave: (data: PersonClass) => void;
}

const PersonClassDialog: React.FC<PersonClassDialogProps> = ({ open, data, onClose, onSave }) => {
  const [formData, setFormData] = useState<PersonClass>(data || { id: '', name: '', description: '' });

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({ id: '', name: '', description: '' });
    }
  }, [data, open]);

  const handleSubmit = () => {
    if (!formData.id || !formData.name) {
      alert('ID and Name are required');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Person Class</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Person Class ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

interface PersonnelCapabilityDialogProps {
  open: boolean;
  data: PersonnelCapability | null;
  onClose: () => void;
  onSave: (data: PersonnelCapability) => void;
}

const PersonnelCapabilityDialog: React.FC<PersonnelCapabilityDialogProps> = ({ open, data, onClose, onSave }) => {
  const [formData, setFormData] = useState<PersonnelCapability>(
    data || { id: '', capabilityName: '', description: '' }
  );

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({ id: '', capabilityName: '', description: '' });
    }
  }, [data, open]);

  const handleSubmit = () => {
    if (!formData.id || !formData.capabilityName) {
      alert('ID and Capability Name are required');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Personnel Capability</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Capability ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Capability Name"
              value={formData.capabilityName}
              onChange={(e) => setFormData({ ...formData, capabilityName: e.target.value })}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

interface EmployeeDialogProps {
  open: boolean;
  data: Employee | null;
  personClasses: PersonClass[];
  personnelCapabilities: PersonnelCapability[];
  onClose: () => void;
  onSave: (data: Employee) => void;
}

const EmployeeDialog: React.FC<EmployeeDialogProps> = ({
  open,
  data,
  personClasses,
  personnelCapabilities,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Employee>(
    data || {
      id: '',
      employeeName: '',
      personClassId: '',
      personnelCapabilityId: '',
      email: '',
      phoneNumber: '',
      description: '',
    }
  );

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({
        id: '',
        employeeName: '',
        personClassId: '',
        personnelCapabilityId: '',
        email: '',
        phoneNumber: '',
        description: '',
      });
    }
  }, [data, open]);

  const handleSubmit = () => {
    if (!formData.id || !formData.employeeName || !formData.personClassId || !formData.personnelCapabilityId) {
      alert('ID, Employee Name, Person Class, and Capability are required');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Employee</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={6}>
            <TextField
              fullWidth
              label="Employee ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={6}>
            <TextField
              fullWidth
              label="Employee Name"
              value={formData.employeeName}
              onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
              required
            />
          </Grid>
          <Grid xs={6}>
            <FormControl fullWidth required>
              <InputLabel>Person Class</InputLabel>
              <Select
                value={formData.personClassId}
                label="Person Class"
                onChange={(e) => setFormData({ ...formData, personClassId: e.target.value })}
              >
                {personClasses.map((pc) => (
                  <MenuItem key={pc.id} value={pc.id}>
                    {pc.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={6}>
            <FormControl fullWidth required>
              <InputLabel>Personnel Capability</InputLabel>
              <Select
                value={formData.personnelCapabilityId}
                label="Personnel Capability"
                onChange={(e) => setFormData({ ...formData, personnelCapabilityId: e.target.value })}
              >
                {personnelCapabilities.map((pc) => (
                  <MenuItem key={pc.id} value={pc.id}>
                    {pc.capabilityName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={6}>
            <TextField
              fullWidth
              label="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </Grid>
          <Grid xs={6}>
            <TextField
              fullWidth
              label="Phone Number"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

// Operations Event Class Dialog Component
interface OperationsEventClassDialogProps {
  open: boolean;
  data: OperationsEventClass | null;
  onClose: () => void;
  onSave: (data: OperationsEventClass) => void;
}

const OperationsEventClassDialog: React.FC<OperationsEventClassDialogProps> = ({ open, data, onClose, onSave }) => {
  const [formData, setFormData] = useState<OperationsEventClass>(
    data || { OperationsEventClassID: '', ClassName: '', Description: '' }
  );

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({ OperationsEventClassID: '', ClassName: '', Description: '' });
    }
  }, [data, open]);

  const handleSubmit = () => {
    if (!formData.OperationsEventClassID || !formData.ClassName) {
      alert('Class ID and Class Name are required');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Operations Event Class</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Class ID"
              value={formData.OperationsEventClassID}
              onChange={(e) => setFormData({ ...formData, OperationsEventClassID: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Class Name"
              value={formData.ClassName}
              onChange={(e) => setFormData({ ...formData, ClassName: e.target.value })}
              required
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.Description}
              onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
              multiline
              rows={3}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

// Operations Event Record Dialog Component
interface OperationsEventRecordDialogProps {
  open: boolean;
  data: OperationsEventRecord | null;
  operationEventDefinitions: OperationEventDefinition[];
  onClose: () => void;
  onSave: (data: OperationsEventRecord) => void;
}

const OperationsEventRecordDialog: React.FC<OperationsEventRecordDialogProps> = ({ open, data, operationEventDefinitions, onClose, onSave }) => {
  const [formData, setFormData] = useState<OperationsEventRecord>(data || { 
    id: '', 
    OperationsEventRecordID: '', 
    OperationsEventDefinitionID: '', 
    Severity: '', 
    Status: '', 
    Comments: '' 
  });

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      const newId = `OER-${Date.now()}`;
      setFormData({ 
        id: newId, 
        OperationsEventRecordID: newId, 
        OperationsEventDefinitionID: '', 
        Severity: '', 
        Status: '', 
        Comments: '' 
      });
    }
  }, [data, open]);

  const handleSubmit = () => {
    if (!formData.OperationsEventRecordID || !formData.OperationsEventDefinitionID) {
      alert('Record ID and Event Definition are required');
      return;
    }
    onSave({ ...formData, id: formData.OperationsEventRecordID });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Operations Event Record</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={6}>
            <TextField
              fullWidth
              label="Record ID"
              value={formData.OperationsEventRecordID}
              onChange={(e) => setFormData({ ...formData, OperationsEventRecordID: e.target.value, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={6}>
            <FormControl fullWidth required>
              <InputLabel>Event Definition</InputLabel>
              <Select
                value={formData.OperationsEventDefinitionID}
                onChange={(e) => setFormData({ ...formData, OperationsEventDefinitionID: e.target.value })}
                label="Event Definition"
              >
                {operationEventDefinitions.map((oed) => (
                  <MenuItem key={oed.id} value={oed.id}>
                    {oed.description} ({oed.eventCode})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={6}>
            <FormControl fullWidth>
              <InputLabel>Severity</InputLabel>
              <Select
                value={formData.Severity}
                onChange={(e) => setFormData({ ...formData, Severity: e.target.value })}
                label="Severity"
              >
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Critical">Critical</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={6}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.Status}
                onChange={(e) => setFormData({ ...formData, Status: e.target.value })}
                label="Status"
              >
                <MenuItem value="Open">Open</MenuItem>
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="Resolved">Resolved</MenuItem>
                <MenuItem value="Closed">Closed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Comments"
              value={formData.Comments}
              onChange={(e) => setFormData({ ...formData, Comments: e.target.value })}
              multiline
              rows={3}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

// Operations Event Entry Dialog Component
interface OperationsEventEntryDialogProps {
  open: boolean;
  data: OperationsEventEntry | null;
  operationsEventRecords: OperationsEventRecord[];
  onClose: () => void;
  onSave: (data: OperationsEventEntry) => void;
}

const OperationsEventEntryDialog: React.FC<OperationsEventEntryDialogProps> = ({ open, data, operationsEventRecords, onClose, onSave }) => {
  const [formData, setFormData] = useState<OperationsEventEntry>(data || { 
    id: '', 
    OperationsEventEntryID: '', 
    OperationsEventRecordID: '', 
    EntryType: '', 
    Description: '' 
  });

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      const newId = `OEE-${Date.now()}`;
      setFormData({ 
        id: newId, 
        OperationsEventEntryID: newId, 
        OperationsEventRecordID: '', 
        EntryType: '', 
        Description: '' 
      });
    }
  }, [data, open]);

  const handleSubmit = () => {
    if (!formData.OperationsEventEntryID || !formData.OperationsEventRecordID) {
      alert('Entry ID and Event Record are required');
      return;
    }
    onSave({ ...formData, id: formData.OperationsEventEntryID });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Operations Event Entry</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={6}>
            <TextField
              fullWidth
              label="Entry ID"
              value={formData.OperationsEventEntryID}
              onChange={(e) => setFormData({ ...formData, OperationsEventEntryID: e.target.value, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={6}>
            <FormControl fullWidth required>
              <InputLabel>Event Record</InputLabel>
              <Select
                value={formData.OperationsEventRecordID}
                onChange={(e) => setFormData({ ...formData, OperationsEventRecordID: e.target.value })}
                label="Event Record"
              >
                {operationsEventRecords.map((oer) => (
                  <MenuItem key={oer.OperationsEventRecordID} value={oer.OperationsEventRecordID}>
                    {oer.OperationsEventRecordID} - {oer.Status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12}>
            <FormControl fullWidth>
              <InputLabel>Entry Type</InputLabel>
              <Select
                value={formData.EntryType}
                onChange={(e) => setFormData({ ...formData, EntryType: e.target.value })}
                label="Entry Type"
              >
                <MenuItem value="Note">Note</MenuItem>
                <MenuItem value="Action">Action</MenuItem>
                <MenuItem value="Resolution">Resolution</MenuItem>
                <MenuItem value="Follow-up">Follow-up</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.Description}
              onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
              multiline
              rows={4}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

// Operation Event Definition Dialog Component
interface OperationEventDefinitionDialogProps {
  open: boolean;
  data: OperationEventDefinition | null;
  onClose: () => void;
  onSave: (data: OperationEventDefinition) => void;
}

const OperationEventDefinitionDialog: React.FC<OperationEventDefinitionDialogProps> = ({ open, data, onClose, onSave }) => {
  const [formData, setFormData] = useState<OperationEventDefinition>(
    data || { 
      id: '', 
      eventCategory: '', 
      eventCode: '', 
      description: '', 
      causesDowntime: false, 
      causesScrap: false, 
      rootCauseType: '',
      eventType: '' 
    }
  );

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({ 
        id: '', 
        eventCategory: '', 
        eventCode: '', 
        description: '', 
        causesDowntime: false, 
        causesScrap: false, 
        rootCauseType: '',
        eventType: '' 
      });
    }
  }, [data, open]);

  const handleSubmit = () => {
    if (!formData.id || !formData.eventCode) {
      alert('ID and Event Code are required');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Operation Event Definition</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={6}>
            <TextField
              fullWidth
              label="Event Definition ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={6}>
            <TextField
              fullWidth
              label="Event Code"
              value={formData.eventCode}
              onChange={(e) => setFormData({ ...formData, eventCode: e.target.value })}
              required
            />
          </Grid>
          <Grid xs={6}>
            <TextField
              fullWidth
              label="Event Category"
              value={formData.eventCategory}
              onChange={(e) => setFormData({ ...formData, eventCategory: e.target.value })}
            />
          </Grid>
          <Grid xs={6}>
            <TextField
              fullWidth
              label="Root Cause Type"
              value={formData.rootCauseType}
              onChange={(e) => setFormData({ ...formData, rootCauseType: e.target.value })}
            />
          </Grid>
          <Grid xs={6}>
            <TextField
              fullWidth
              label="Event Type"
              value={formData.eventType}
              onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
            />
          </Grid>
          <Grid xs={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.causesDowntime}
                  onChange={(e) => setFormData({ ...formData, causesDowntime: e.target.checked })}
                />
              }
              label="Causes Downtime"
            />
          </Grid>
          <Grid xs={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.causesScrap}
                  onChange={(e) => setFormData({ ...formData, causesScrap: e.target.checked })}
                />
              }
              label="Causes Scrap"
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

// Shift Crew Assignment Dialog Component
interface ShiftCrewAssignmentDialogProps {
  open: boolean;
  data: ShiftCrewAssignment | null;
  shifts: Shift[];
  crews: Crew[];
  onClose: () => void;
  onSave: (data: ShiftCrewAssignment) => void;
}

const ShiftCrewAssignmentDialog: React.FC<ShiftCrewAssignmentDialogProps> = ({ open, data, shifts, crews, onClose, onSave }) => {
  const [formData, setFormData] = useState<ShiftCrewAssignment>(
    data || { id: '', shiftId: '', crewId: '', effectiveDate: '', expiryDate: '' }
  );

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({ id: '', shiftId: '', crewId: '', effectiveDate: '', expiryDate: '' });
    }
  }, [data, open]);

  const handleSubmit = () => {
    if (!formData.id || !formData.shiftId || !formData.crewId || !formData.effectiveDate) {
      alert('ID, Shift, Crew, and Effective Date are required');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Shift-Crew Assignment</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Assignment ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Shift</InputLabel>
              <Select
                value={formData.shiftId}
                label="Shift"
                onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
              >
                {shifts.map((shift) => (
                  <MenuItem key={shift.id} value={shift.id}>
                    Shift {shift.shiftNumber}: {shift.shiftName} ({shift.startTime} - {shift.endTime})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Crew</InputLabel>
              <Select
                value={formData.crewId}
                label="Crew"
                onChange={(e) => setFormData({ ...formData, crewId: e.target.value })}
              >
                {crews.map((crew) => (
                  <MenuItem key={crew.id} value={crew.id}>
                    {crew.crewName} ({crew.peopleCount} people)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={6}>
            <TextField
              fullWidth
              label="Effective Date"
              type="date"
              value={formData.effectiveDate}
              onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
          <Grid xs={6}>
            <TextField
              fullWidth
              label="Expiry Date"
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

// Hierarchy Scope Dialog Component
interface HierarchyScopeDialogProps {
  open: boolean;
  data: HierarchyScope | null;
  plants: Plant[];
  productionLines: ProductionLine[];
  onClose: () => void;
  onSave: (data: HierarchyScope) => void;
}

const HierarchyScopeDialog: React.FC<HierarchyScopeDialogProps> = ({ open, data, plants, productionLines, onClose, onSave }) => {
  const equipmentLevels = [
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

  const [formData, setFormData] = useState<HierarchyScope>(
    data || { id: '', equipmentID: '', equipmentLevel: 'Site' }
  );

  React.useEffect(() => {
    if (data) {
      setFormData(data);
    } else {
      setFormData({ id: '', equipmentID: '', equipmentLevel: 'Site' });
    }
  }, [data, open]);

  const handleSubmit = () => {
    if (!formData.id || !formData.equipmentID || !formData.equipmentLevel) {
      alert('All fields are required');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{data ? 'Edit' : 'Add'} Hierarchy Scope</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Hierarchy Scope ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Equipment Level</InputLabel>
              <Select
                value={formData.equipmentLevel}
                label="Equipment Level"
                onChange={(e) => setFormData({ ...formData, equipmentLevel: e.target.value, equipmentID: '' })}
              >
                {equipmentLevels.map((level) => (
                  <MenuItem key={level} value={level}>{level}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12}>
            {formData.equipmentLevel === 'Site' ? (
              <FormControl fullWidth required>
                <InputLabel>Plant</InputLabel>
                <Select
                  value={formData.equipmentID}
                  label="Plant"
                  onChange={(e) => setFormData({ ...formData, equipmentID: e.target.value })}
                >
                  {plants.map((plant) => (
                    <MenuItem key={plant.id} value={plant.id}>{plant.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : formData.equipmentLevel === 'Production Line' ? (
              <FormControl fullWidth required>
                <InputLabel>Production Line</InputLabel>
                <Select
                  value={formData.equipmentID}
                  label="Production Line"
                  onChange={(e) => setFormData({ ...formData, equipmentID: e.target.value })}
                >
                  {productionLines.map((line) => (
                    <MenuItem key={line.id} value={line.id}>{line.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField
                fullWidth
                label="Equipment ID"
                value={formData.equipmentID}
                onChange={(e) => setFormData({ ...formData, equipmentID: e.target.value })}
                required
              />
            )}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

// Operation Event Definition Tab Component
interface OperationEventDefinitionTabProps {
  data: OperationEventDefinition[];
  onAdd: () => void;
  onEdit: (item: OperationEventDefinition) => void;
  onDelete: (id: string) => void;
}

const OperationEventDefinitionTab: React.FC<OperationEventDefinitionTabProps> = ({ data, onAdd, onEdit, onDelete }) => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Operation Event Definitions ({data.length})</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
          Add Event Definition
        </Button>
      </Box>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>ID</strong></TableCell>
              <TableCell><strong>Event Category</strong></TableCell>
              <TableCell><strong>Event Code</strong></TableCell>
              <TableCell><strong>Description</strong></TableCell>
              <TableCell><strong>Causes Downtime</strong></TableCell>
              <TableCell><strong>Causes Scrap</strong></TableCell>
              <TableCell><strong>Root Cause Type</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.id}</TableCell>
                <TableCell>
                  <Chip 
                    label={item.eventCategory} 
                    color={item.eventCategory.includes('Downtime') ? 'error' : 'warning'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{item.eventCode}</TableCell>
                <TableCell>{item.description}</TableCell>
                <TableCell>
                  <Chip 
                    label={item.causesDowntime ? 'Yes' : 'No'} 
                    color={item.causesDowntime ? 'error' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={item.causesScrap ? 'Yes' : 'No'} 
                    color={item.causesScrap ? 'warning' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{item.rootCauseType}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => onEdit(item)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => onDelete(item.id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// Operation Event Definition Segment Assignment Tab Component
interface OperationEventDefSegmentAssignmentTabProps {
  data: OperationEventDefSegmentAssignment[];
  operationEventDefinitions: OperationEventDefinition[];
  processSegments: ProcessSegment[];
  onAdd: () => void;
  onEdit: (item: OperationEventDefSegmentAssignment) => void;
  onDelete: (id: string) => void;
}

const OperationEventDefSegmentAssignmentTab: React.FC<OperationEventDefSegmentAssignmentTabProps> = ({ 
  data, 
  operationEventDefinitions, 
  processSegments, 
  onAdd, 
  onEdit, 
  onDelete 
}) => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Event-Segment Assignments ({data.length})</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
          Add Assignment
        </Button>
      </Box>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>ID</strong></TableCell>
              <TableCell><strong>Event Definition</strong></TableCell>
              <TableCell><strong>Event Code</strong></TableCell>
              <TableCell><strong>Process Segment</strong></TableCell>
              <TableCell><strong>Start/End</strong></TableCell>
              <TableCell><strong>Mandatory</strong></TableCell>
              <TableCell><strong>Primary Segment</strong></TableCell>
              <TableCell><strong>Notes</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item) => {
              const eventDef = operationEventDefinitions.find(oed => oed.id === item.operationsEventDefinitionId);
              const segment = processSegments.find(ps => ps.id === item.processSegmentId);
              return (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{eventDef?.description || item.operationsEventDefinitionId}</TableCell>
                  <TableCell>
                    <Chip label={eventDef?.eventCode || 'N/A'} size="small" />
                  </TableCell>
                  <TableCell>{segment?.name || item.processSegmentId}</TableCell>
                  <TableCell>
                    <Chip 
                      label={item.startOrEndEvent || 'Start'} 
                      color={item.startOrEndEvent === 'End' ? 'secondary' : 'info'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={item.isMandatory ? 'Yes' : 'No'} 
                      color={item.isMandatory ? 'error' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={item.isPrimarySegment ? 'Primary' : 'Secondary'} 
                      color={item.isPrimarySegment ? 'primary' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{item.notes}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => onEdit(item)} color="primary">
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => onDelete(item.id)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default MasterDataManager;

