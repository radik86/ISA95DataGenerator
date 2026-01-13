import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Snackbar,
  Menu,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Tooltip,
  Stack,
  Autocomplete,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  UploadFile as UploadFileIcon,
  Refresh as RefreshIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  Description as DescriptionIcon,
  TableChart as TableChartIcon,
} from '@mui/icons-material';
import { masterDataDB } from '../services/masterDataDB';
import { processDataDB } from '../services/processDataDB';
import { migrationConfigDB } from '../services/migrationConfigDB';
import { entitiesApi } from '../api/client';
import { EntityDefinition, AttributeDefinition, RuleType } from '../types';

// ISA95 Entity Definitions for migration
interface ISA95Entity {
  name: string;
  tableName: string;
  fields: ISA95Field[];
  primaryKey?: string;
  relationships?: EntityRelationship[];
}

interface EntityRelationship {
  name: string;
  displayName: string;
  targetEntityName: string;
  description?: string;
}

interface ISA95Field {
  name: string;
  type: string;
  required: boolean;
  description: string;
  enumValues?: string[];
  isPrimaryKey?: boolean;
}

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  transformation?: string;
  fieldRule?: FieldRuleConfig;
}

interface FieldRuleConfig {
  ruleType: string;
  parameters: any;
}

interface FieldMapping {
  fieldName: string;
  sourceColumn?: string;
  generate: boolean;
  transformation?: string;
  fieldRule?: FieldRuleConfig;
}

interface TableMapping {
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
  relationshipType?: string; // For bridge tables
}

interface DataSource {
  name: string;
  tables: SourceTable[];
}

interface SourceTable {
  name: string;
  columns: SourceColumn[];
  rowCount: number;
}

interface SourceColumn {
  name: string;
  type: string;
  sample?: string;
}

const DataMigration: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const [tableMappings, setTableMappings] = useState<TableMapping[]>([]);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [migrationLog, setMigrationLog] = useState<string[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [selectedSourceTable, setSelectedSourceTable] = useState('');
  const [selectedTargetEntity, setSelectedTargetEntity] = useState('');
  const [mappingDialog, setMappingDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [isa95Entities, setIsa95Entities] = useState<ISA95Entity[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(true);
  const [fieldRuleDialog, setFieldRuleDialog] = useState(false);
  const [selectedFieldForRule, setSelectedFieldForRule] = useState<{
    mappingIndex: number;
    fieldName: string;
  } | null>(null);
  const [fieldRuleType, setFieldRuleType] = useState<RuleType>(RuleType.Examples);
  const [importDialog, setImportDialog] = useState(false);
  const [importedTables, setImportedTables] = useState<SourceTable[]>([]);
  const [bridgeDialog, setBridgeDialog] = useState(false);
  const [isBridgeMode, setIsBridgeMode] = useState(false);
  const [bridgeEntity1, setBridgeEntity1] = useState('');
  const [bridgeEntity1Column, setBridgeEntity1Column] = useState('');
  const [bridgeEntity2, setBridgeEntity2] = useState('');
  const [bridgeEntity2Column, setBridgeEntity2Column] = useState('');
  const [bridgeName, setBridgeName] = useState('');
  const [relationshipType, setRelationshipType] = useState('related');
  const [bridgePreview, setBridgePreview] = useState<any[]>([]);
  const [showBridgePreview, setShowBridgePreview] = useState(false);
  const [availableRelationships, setAvailableRelationships] = useState<string[]>([]);
  const [expandedMappings, setExpandedMappings] = useState<Set<number>>(new Set());
  const [expandedBridgeMappings, setExpandedBridgeMappings] = useState<Set<number>>(new Set());
  
  // Rule parameters matching FieldRuleEditor
  const [rangeMin, setRangeMin] = useState(0);
  const [rangeMax, setRangeMax] = useState(100);
  const [exampleValues, setExampleValues] = useState<string[]>([]);
  const [newExampleValue, setNewExampleValue] = useState('');
  const [pattern, setPattern] = useState('');
  const [staticValue, setStaticValue] = useState('');
  const [sequenceStart, setSequenceStart] = useState(1);
  const [sequenceIncrement, setSequenceIncrement] = useState(1);
  const [prefixValue, setPrefixValue] = useState('');
  const [suffixValue, setSuffixValue] = useState('');
  const [seqStart, setSeqStart] = useState(1);
  const [seqEnd, setSeqEnd] = useState(100);
  const [seqPadding, setSeqPadding] = useState(0);
  const [enumValues, setEnumValues] = useState<string[]>([]);

  // Primary Key rule dialog states
  const [pkRuleDialog, setPkRuleDialog] = useState(false);
  const [selectedMappingForPK, setSelectedMappingForPK] = useState<number | null>(null);
  const [pkRuleType, setPkRuleType] = useState<RuleType>(RuleType.Sequence);
  const [pkRangeMin, setPkRangeMin] = useState(0);
  const [pkRangeMax, setPkRangeMax] = useState(100);
  const [pkExampleValues, setPkExampleValues] = useState<string[]>([]);
  const [pkNewExampleValue, setPkNewExampleValue] = useState('');
  const [pkPattern, setPkPattern] = useState('');
  const [pkStaticValue, setPkStaticValue] = useState('');
  const [pkSequenceStart, setPkSequenceStart] = useState(1);
  const [pkSequenceIncrement, setPkSequenceIncrement] = useState(1);
  const [pkPrefixValue, setPkPrefixValue] = useState('');
  const [pkSuffixValue, setPkSuffixValue] = useState('');
  const [pkSeqStart, setPkSeqStart] = useState(1);
  const [pkSeqEnd, setPkSeqEnd] = useState(100);
  const [pkSeqPadding, setPkSeqPadding] = useState(3);
  const [pkCompositeFields, setPkCompositeFields] = useState<string[]>([]);
  const [pkCompositeSeparator, setPkCompositeSeparator] = useState('-');

  // Load ISA95 entities from backend on mount
  useEffect(() => {
    const loadISA95Entities = async () => {
      try {
        setLoadingEntities(true);
        const response = await entitiesApi.getAll();
        const entities = response.data;
        
        // Transform EntityDefinition[] to ISA95Entity[]
        const transformedEntities: ISA95Entity[] = [];
        
        for (const entity of entities) {
          // Get full structure for each entity
          const structureResponse = await entitiesApi.getStructure(entity.name);
          const fullEntity = structureResponse.data as EntityDefinition & {
            attributes: AttributeDefinition[];
          };
          
          // Find primary key field
          const primaryKeyField = fullEntity.attributes.find(attr => attr.isPrimaryKey);
          
          const isa95Entity: ISA95Entity = {
            name: fullEntity.displayName || fullEntity.name,
            tableName: fullEntity.name.replace(/\s+/g, ''), // Remove spaces for table name
            primaryKey: primaryKeyField?.name,
            fields: fullEntity.attributes.map((attr: AttributeDefinition) => ({
              name: attr.name,
              type: attr.schema || 'string',
              required: attr.isRequired || false,
              description: attr.description || '',
              enumValues: attr.enumValues,
              isPrimaryKey: attr.isPrimaryKey,
            })),
            relationships: fullEntity.relationships?.map(rel => ({
              name: rel.name,
              displayName: rel.displayName || rel.name,
              targetEntityName: rel.targetEntityName || rel.TargetEntityName || '',
              description: rel.description,
            })) || [],
          };
          
          transformedEntities.push(isa95Entity);
        }
        
        setIsa95Entities(transformedEntities);
        console.log(`Loaded ${transformedEntities.length} ISA95 entities from backend`);
        console.log('Entities loaded:', transformedEntities.map(e => ({ 
          name: e.name, 
          tableName: e.tableName,
          fieldCount: e.fields.length,
          fields: e.fields.map(f => f.name).slice(0, 3)
        })));
      } catch (error) {
        console.error('Error loading ISA95 entities:', error);
        setSnackbar({
          open: true,
          message: 'Failed to load ISA95 entities from backend',
          severity: 'error',
        });
      } finally {
        setLoadingEntities(false);
      }
    };

    loadISA95Entities();
  }, []);

  const steps = ['Select Data Source', 'Source to Entity Mapping', 'Entity to Entity Mapping', 'Migrate Data'];

  useEffect(() => {
    loadCurrentDataAsSource();
    loadSavedMappings();
  }, []);

  // Load saved mappings from IndexedDB
  const loadSavedMappings = async () => {
    try {
      const savedMappings = await migrationConfigDB.loadCurrentMappings();
      if (savedMappings.length > 0) {
        setTableMappings(savedMappings);
        console.log(`Loaded ${savedMappings.length} saved mappings from database`);
      }
    } catch (error) {
      console.error('Error loading saved mappings:', error);
    }
  };

  // Save mappings to IndexedDB whenever they change
  useEffect(() => {
    const saveMappings = async () => {
      try {
        await migrationConfigDB.saveCurrentMappings(tableMappings);
        console.log(`Saved ${tableMappings.length} mappings to database`);
      } catch (error) {
        console.error('Error saving mappings:', error);
      }
    };

    // Always save, even if empty, to persist deletions
    saveMappings();
  }, [tableMappings]);

  // Update available relationships when bridge entities change
  useEffect(() => {
    updateAvailableRelationships();
  }, [bridgeEntity1, bridgeEntity2, isa95Entities]);

  const loadCurrentDataAsSource = async () => {
    try {
      setLoading(true);
      // Load current application data as example data source (Master Data)
      const materialClasses = await masterDataDB.getAll('materialClasses');
      const materials = await masterDataDB.getAll('materials');
      const materialLots = await masterDataDB.getAll('materialLots');
      const materialSublots = await masterDataDB.getAll('materialSublots');
      const equipmentClasses = await masterDataDB.getAll('equipmentClasses');
      const equipment = await masterDataDB.getAll('equipment');
      const equipmentProperties = await masterDataDB.getAll('equipmentProperties');
      const equipmentPropertyAssignments = await masterDataDB.getAll('equipmentPropertyAssignments');
      const plants = await masterDataDB.getAll('plants');
      const productionLines = await masterDataDB.getAll('productionLines');
      const processSegments = await masterDataDB.getAll('processSegments');

      // Load Process Data
      const operationsRequests = await processDataDB.getAll('operationsRequests');
      const segmentRequirements = await processDataDB.getAll('segmentRequirements');
      const segmentMaterialRequirements = await processDataDB.getAll('segmentMaterialRequirements');
      const segmentEquipmentRequirements = await processDataDB.getAll('segmentEquipmentRequirements');
      const operationsResponses = await processDataDB.getAll('operationsResponses');
      const segmentResponses = await processDataDB.getAll('segmentResponses');
      const segmentMaterialActuals = await processDataDB.getAll('segmentMaterialActuals');
      const segmentEquipmentActuals = await processDataDB.getAll('segmentEquipmentActuals');
      const equipmentPropertyTracking = await processDataDB.getAll('equipmentPropertyTracking');
      const testResults = await processDataDB.getAll('testResults');

      const tables: SourceTable[] = [
        // Master Data Tables
        {
          name: 'material_classes',
          rowCount: materialClasses.length,
          columns: [
            { name: 'id', type: 'string', sample: materialClasses[0]?.id },
            { name: 'name', type: 'string', sample: materialClasses[0]?.name },
            { name: 'description', type: 'string', sample: materialClasses[0]?.description },
          ],
        },
        {
          name: 'materials',
          rowCount: materials.length,
          columns: [
            { name: 'id', type: 'string', sample: materials[0]?.id },
            { name: 'name', type: 'string', sample: materials[0]?.name },
            { name: 'classId', type: 'string', sample: materials[0]?.classId },
            { name: 'description', type: 'string', sample: materials[0]?.description },
          ],
        },
        {
          name: 'material_lots',
          rowCount: materialLots.length,
          columns: [
            { name: 'id', type: 'string', sample: materialLots[0]?.id },
            { name: 'materialId', type: 'string', sample: materialLots[0]?.materialId },
            { name: 'lotQuantity', type: 'number', sample: materialLots[0]?.lotQuantity?.toString() },
            { name: 'lotUoM', type: 'string', sample: materialLots[0]?.lotUoM },
            { name: 'receivedDateTime', type: 'datetime', sample: materialLots[0]?.receivedDateTime },
            { name: 'producedDateTime', type: 'datetime', sample: materialLots[0]?.producedDateTime },
            { name: 'status', type: 'string', sample: materialLots[0]?.status },
          ],
        },
        {
          name: 'material_sublots',
          rowCount: materialSublots.length,
          columns: [
            { name: 'id', type: 'string', sample: materialSublots[0]?.id },
            { name: 'materialLotId', type: 'string', sample: materialSublots[0]?.materialLotId },
            { name: 'quantity', type: 'number', sample: String(materialSublots[0]?.quantity) },
            { name: 'quantityUnitOfMeasure', type: 'string', sample: materialSublots[0]?.quantityUnitOfMeasure },
            { name: 'storageLocation', type: 'string', sample: materialSublots[0]?.storageLocation },
            { name: 'status', type: 'string', sample: materialSublots[0]?.status },
            { name: 'disposition', type: 'string', sample: materialSublots[0]?.disposition },
          ],
        },
        {
          name: 'equipment_classes',
          rowCount: equipmentClasses.length,
          columns: [
            { name: 'id', type: 'string', sample: equipmentClasses[0]?.id },
            { name: 'name', type: 'string', sample: equipmentClasses[0]?.name },
            { name: 'description', type: 'string', sample: equipmentClasses[0]?.description },
          ],
        },
        {
          name: 'equipment',
          rowCount: equipment.length,
          columns: [
            { name: 'id', type: 'string', sample: equipment[0]?.id },
            { name: 'classId', type: 'string', sample: equipment[0]?.classId },
          ],
        },
        {
          name: 'equipment_properties',
          rowCount: equipmentProperties.length,
          columns: [
            { name: 'id', type: 'string', sample: equipmentProperties[0]?.id },
            { name: 'name', type: 'string', sample: equipmentProperties[0]?.name },
            { name: 'description', type: 'string', sample: equipmentProperties[0]?.description },
            { name: 'valueDataType', type: 'string', sample: equipmentProperties[0]?.valueDataType },
            { name: 'unit', type: 'string', sample: equipmentProperties[0]?.unit },
            { name: 'minValue', type: 'number', sample: equipmentProperties[0]?.minValue?.toString() },
            { name: 'maxValue', type: 'number', sample: equipmentProperties[0]?.maxValue?.toString() },
          ],
        },
        {
          name: 'equipment_property_assignments',
          rowCount: equipmentPropertyAssignments.length,
          columns: [
            { name: 'id', type: 'string', sample: equipmentPropertyAssignments[0]?.id },
            { name: 'equipmentId', type: 'string', sample: equipmentPropertyAssignments[0]?.equipmentId },
            { name: 'processSegmentId', type: 'string', sample: equipmentPropertyAssignments[0]?.processSegmentId },
            { name: 'equipmentPropertyId', type: 'string', sample: equipmentPropertyAssignments[0]?.equipmentPropertyId },
            { name: 'samplingMode', type: 'string', sample: equipmentPropertyAssignments[0]?.samplingMode },
            { name: 'samplingIntervalSeconds', type: 'number', sample: equipmentPropertyAssignments[0]?.samplingIntervalSeconds?.toString() },
          ],
        },
        {
          name: 'plants',
          rowCount: plants.length,
          columns: [
            { name: 'id', type: 'string', sample: plants[0]?.id },
            { name: 'name', type: 'string', sample: plants[0]?.name },
          ],
        },
        {
          name: 'production_lines',
          rowCount: productionLines.length,
          columns: [
            { name: 'id', type: 'string', sample: productionLines[0]?.id },
            { name: 'name', type: 'string', sample: productionLines[0]?.name },
            { name: 'plantId', type: 'string', sample: productionLines[0]?.plantId },
          ],
        },
        {
          name: 'process_segments',
          rowCount: processSegments.length,
          columns: [
            { name: 'id', type: 'string', sample: processSegments[0]?.id },
            { name: 'name', type: 'string', sample: processSegments[0]?.name },
          ],
        },
        // Process Data Tables
        {
          name: 'operations_requests',
          rowCount: operationsRequests.length,
          columns: [
            { name: 'id', type: 'string', sample: operationsRequests[0]?.id },
            { name: 'description', type: 'string', sample: operationsRequests[0]?.description },
            { name: 'plannedStartDateTime', type: 'datetime', sample: operationsRequests[0]?.plannedStartDateTime },
            { name: 'plannedEndDateTime', type: 'datetime', sample: operationsRequests[0]?.plannedEndDateTime },
            { name: 'status', type: 'string', sample: operationsRequests[0]?.status },
          ],
        },
        {
          name: 'segment_requirements',
          rowCount: segmentRequirements.length,
          columns: [
            { name: 'id', type: 'string', sample: segmentRequirements[0]?.id },
            { name: 'operationsRequestId', type: 'string', sample: segmentRequirements[0]?.operationsRequestId },
            { name: 'processSegmentId', type: 'string', sample: segmentRequirements[0]?.processSegmentId },
            { name: 'earliestStartDateTime', type: 'datetime', sample: segmentRequirements[0]?.earliestStartDateTime },
          ],
        },
        {
          name: 'segment_material_requirements',
          rowCount: segmentMaterialRequirements.length,
          columns: [
            { name: 'id', type: 'string', sample: segmentMaterialRequirements[0]?.id },
            { name: 'segmentRequirementId', type: 'string', sample: segmentMaterialRequirements[0]?.segmentRequirementId },
            { name: 'materialId', type: 'string', sample: segmentMaterialRequirements[0]?.materialId },
            { name: 'requiredQty', type: 'number', sample: segmentMaterialRequirements[0]?.requiredQty?.toString() },
            { name: 'qtyUoM', type: 'string', sample: segmentMaterialRequirements[0]?.qtyUoM },
          ],
        },
        {
          name: 'segment_equipment_requirements',
          rowCount: segmentEquipmentRequirements.length,
          columns: [
            { name: 'id', type: 'string', sample: segmentEquipmentRequirements[0]?.id },
            { name: 'segmentRequirementId', type: 'string', sample: segmentEquipmentRequirements[0]?.segmentRequirementId },
            { name: 'equipmentId', type: 'string', sample: segmentEquipmentRequirements[0]?.equipmentId },
            { name: 'plannedDurationHours', type: 'number', sample: segmentEquipmentRequirements[0]?.plannedDurationHours?.toString() },
          ],
        },
        {
          name: 'operations_responses',
          rowCount: operationsResponses.length,
          columns: [
            { name: 'id', type: 'string', sample: operationsResponses[0]?.id },
            { name: 'operationsRequestId', type: 'string', sample: operationsResponses[0]?.operationsRequestId },
            { name: 'actualStartDateTime', type: 'datetime', sample: operationsResponses[0]?.actualStartDateTime },
            { name: 'actualEndDateTime', type: 'datetime', sample: operationsResponses[0]?.actualEndDateTime },
            { name: 'status', type: 'string', sample: operationsResponses[0]?.status },
          ],
        },
        {
          name: 'segment_responses',
          rowCount: segmentResponses.length,
          columns: [
            { name: 'id', type: 'string', sample: segmentResponses[0]?.id },
            { name: 'operationsResponseId', type: 'string', sample: segmentResponses[0]?.operationsResponseId },
            { name: 'segmentRequirementId', type: 'string', sample: segmentResponses[0]?.segmentRequirementId },
            { name: 'actualStartDateTime', type: 'datetime', sample: segmentResponses[0]?.actualStartDateTime },
            { name: 'actualEndDateTime', type: 'datetime', sample: segmentResponses[0]?.actualEndDateTime },
          ],
        },
        {
          name: 'segment_material_actuals',
          rowCount: segmentMaterialActuals.length,
          columns: [
            { name: 'id', type: 'string', sample: segmentMaterialActuals[0]?.id },
            { name: 'segmentResponseId', type: 'string', sample: segmentMaterialActuals[0]?.segmentResponseId },
            { name: 'materialId', type: 'string', sample: segmentMaterialActuals[0]?.materialId },
            { name: 'materialLotId', type: 'string', sample: segmentMaterialActuals[0]?.materialLotId },
            { name: 'actualQty', type: 'number', sample: segmentMaterialActuals[0]?.actualQty?.toString() },
            { name: 'qtyUoM', type: 'string', sample: segmentMaterialActuals[0]?.qtyUoM },
            { name: 'direction', type: 'string', sample: segmentMaterialActuals[0]?.direction },
          ],
        },
        {
          name: 'segment_equipment_actuals',
          rowCount: segmentEquipmentActuals.length,
          columns: [
            { name: 'id', type: 'string', sample: segmentEquipmentActuals[0]?.id },
            { name: 'segmentResponseId', type: 'string', sample: segmentEquipmentActuals[0]?.segmentResponseId },
            { name: 'equipmentId', type: 'string', sample: segmentEquipmentActuals[0]?.equipmentId },
            { name: 'actualDurationHours', type: 'number', sample: segmentEquipmentActuals[0]?.actualDurationHours?.toString() },
          ],
        },
        {
          name: 'equipment_property_tracking',
          rowCount: equipmentPropertyTracking.length,
          columns: [
            { name: 'id', type: 'string', sample: equipmentPropertyTracking[0]?.id },
            { name: 'segmentResponseId', type: 'string', sample: equipmentPropertyTracking[0]?.segmentResponseId },
            { name: 'equipmentId', type: 'string', sample: equipmentPropertyTracking[0]?.equipmentId },
            { name: 'equipmentPropertyId', type: 'string', sample: equipmentPropertyTracking[0]?.equipmentPropertyId },
            { name: 'value', type: 'number', sample: equipmentPropertyTracking[0]?.value?.toString() },
            { name: 'uom', type: 'string', sample: equipmentPropertyTracking[0]?.uom },
            { name: 'createdTimestamp', type: 'datetime', sample: equipmentPropertyTracking[0]?.createdTimestamp },
          ],
        },
        {
          name: 'test_results',
          rowCount: testResults.length,
          columns: [
            { name: 'id', type: 'string', sample: testResults[0]?.id },
            { name: 'materialLotId', type: 'string', sample: testResults[0]?.materialLotId },
            { name: 'description', type: 'string', sample: testResults[0]?.description },
            { name: 'evaluationDate', type: 'datetime', sample: testResults[0]?.evaluationDate },
            { name: 'evaluatedCriterionResult', type: 'string', sample: testResults[0]?.evaluatedCriterionResult },
          ],
        },
      ];

      const source: DataSource = {
        name: 'Current Application Data (Master + Process)',
        tables: [...tables, ...importedTables],
      };

      setDataSource(source);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load data source:', error);
      showSnackbar('Failed to load data source', 'error');
      setLoading(false);
    }
  };

  const handleImportTable = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const text = await file.text();
      
      let parsedData: any[] = [];
      let tableName = file.name.replace(/\.(csv|json)$/i, '');

      if (file.name.endsWith('.csv')) {
        // Parse CSV
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
          showSnackbar('CSV file is empty', 'error');
          setLoading(false);
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim());
        parsedData = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = values[index] || '';
          });
          return obj;
        });
      } else if (file.name.endsWith('.json')) {
        // Parse JSON
        const jsonData = JSON.parse(text);
        if (Array.isArray(jsonData)) {
          parsedData = jsonData;
        } else if (jsonData && typeof jsonData === 'object') {
          // If it's an object, try to find an array property
          const arrayKey = Object.keys(jsonData).find(key => Array.isArray(jsonData[key]));
          if (arrayKey) {
            parsedData = jsonData[arrayKey];
            tableName = arrayKey;
          } else {
            parsedData = [jsonData];
          }
        }
      }

      if (parsedData.length === 0) {
        showSnackbar('No data found in file', 'error');
        setLoading(false);
        return;
      }

      // Extract column structure from first record
      const firstRecord = parsedData[0];
      const columns: SourceColumn[] = Object.keys(firstRecord).map(key => {
        const value = firstRecord[key];
        let type = 'string';
        
        if (typeof value === 'number') {
          type = 'number';
        } else if (value && !isNaN(Date.parse(value))) {
          type = 'datetime';
        } else if (value === 'true' || value === 'false' || typeof value === 'boolean') {
          type = 'boolean';
        }

        return {
          name: key,
          type,
          sample: String(value),
        };
      });

      const newTable: SourceTable = {
        name: tableName,
        rowCount: parsedData.length,
        columns,
      };

      setImportedTables(prev => [...prev, newTable]);
      showSnackbar(`Imported table "${tableName}" with ${parsedData.length} rows`, 'success');
      setImportDialog(false);
      setLoading(false);

      // Reload data source to include imported table
      if (dataSource) {
        await loadCurrentDataAsSource();
      }
    } catch (error) {
      console.error('Failed to import table:', error);
      showSnackbar('Failed to import table', 'error');
      setLoading(false);
    }
  };

  const handleRemoveImportedTable = (tableName: string) => {
    setImportedTables(prev => prev.filter(t => t.name !== tableName));
    if (dataSource) {
      setDataSource({
        ...dataSource,
        tables: dataSource.tables.filter(t => t.name !== tableName),
      });
    }
    showSnackbar(`Removed imported table "${tableName}"`, 'success');
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleNext = () => {
    if (activeStep === 0 && !dataSource) {
      showSnackbar('Please load a data source first', 'error');
      return;
    }
    if (activeStep === 1 && tableMappings.filter(m => !m.isBridge).length === 0) {
      showSnackbar('Please add at least one source to entity mapping', 'error');
      return;
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleAddMapping = () => {
    if (!selectedSourceTable || !selectedTargetEntity) {
      showSnackbar('Please select both source table and target entity', 'error');
      return;
    }

    const sourceTable = dataSource?.tables.find(t => t.name === selectedSourceTable);
    const targetEntity = isa95Entities.find(e => e.tableName === selectedTargetEntity);

    console.log('Creating mapping:', { 
      selectedSourceTable, 
      selectedTargetEntity, 
      sourceTable: sourceTable?.name,
      targetEntity: targetEntity?.name,
      targetEntityTableName: targetEntity?.tableName,
      targetEntityFields: targetEntity?.fields.map(f => f.name)
    });

    if (!sourceTable || !targetEntity) {
      showSnackbar('Source table or target entity not found', 'error');
      return;
    }

    // Auto-map columns with matching names
    const autoMappings: ColumnMapping[] = sourceTable.columns
      .map(col => {
        const matchingField = targetEntity.fields.find(
          f => f.name.toLowerCase() === col.name.toLowerCase() ||
               f.name.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase() === col.name.toLowerCase()
        );
        return matchingField ? {
          sourceColumn: col.name,
          targetField: matchingField.name,
        } : null;
      })
      .filter(m => m !== null) as ColumnMapping[];

    // Initialize field mappings for all target fields
    const fieldMappings: FieldMapping[] = targetEntity.fields.map(field => {
      const autoMappedColumn = autoMappings.find(m => m.targetField === field.name);
      return {
        fieldName: field.name,
        sourceColumn: autoMappedColumn?.sourceColumn,
        generate: field.required || !!autoMappedColumn, // Auto-enable required fields or auto-mapped fields
        transformation: autoMappedColumn?.transformation,
      };
    });

    // Add PrimaryKey as a separate field
    fieldMappings.push({
      fieldName: 'PrimaryKey',
      sourceColumn: undefined,
      generate: false, // Will be generated by PK rule
      transformation: undefined,
    });

    const newMapping: TableMapping = {
      sourceTable: selectedSourceTable,
      targetEntity: selectedTargetEntity,
      mappings: autoMappings,
      fieldMappings: fieldMappings,
      enabled: true,
      primaryKeyField: 'PrimaryKey',
    };

    setTableMappings([...tableMappings, newMapping]);
    setSelectedSourceTable('');
    setSelectedTargetEntity('');
    showSnackbar('Mapping added successfully', 'success');
  };

  const handleAddBridgeMapping = () => {
    if (!selectedSourceTable || !bridgeEntity1 || !bridgeEntity2 || !bridgeEntity1Column || !bridgeEntity2Column || !bridgeName) {
      showSnackbar('Please fill all bridge table fields', 'error');
      return;
    }

    const sourceTable = dataSource?.tables.find(t => t.name === selectedSourceTable);
    if (!sourceTable) return;

    const entity1 = isa95Entities.find(e => e.tableName === bridgeEntity1);
    const entity2 = isa95Entities.find(e => e.tableName === bridgeEntity2);

    if (!entity1 || !entity2) return;

    // Create field mappings for bridge table with proper structure
    const fieldMappings: FieldMapping[] = [
      {
        fieldName: 'Source type',
        sourceColumn: undefined,
        generate: true,
        transformation: undefined,
        fieldRule: { ruleType: RuleType.Static, parameters: { value: entity1.name } }
      },
      {
        fieldName: 'Source PrimaryKey',
        sourceColumn: bridgeEntity1Column, // Lookup column from source
        generate: true,
        transformation: undefined,
      },
      {
        fieldName: 'Target Type',
        sourceColumn: undefined,
        generate: true,
        transformation: undefined,
        fieldRule: { ruleType: RuleType.Static, parameters: { value: entity2.name } }
      },
      {
        fieldName: 'Target PrimaryKey',
        sourceColumn: bridgeEntity2Column, // Lookup column from source
        generate: true,
        transformation: undefined,
      },
      {
        fieldName: 'Relationship Type',
        sourceColumn: undefined,
        generate: true,
        transformation: undefined,
        fieldRule: { ruleType: RuleType.Static, parameters: { value: relationshipType || 'related' } }
      },
      {
        fieldName: 'PrimaryKey',
        sourceColumn: undefined,
        generate: false,
        transformation: undefined,
      }
    ];

    const newMapping: TableMapping = {
      sourceTable: selectedSourceTable,
      targetEntity: bridgeName,
      mappings: [],
      fieldMappings: fieldMappings,
      enabled: true,
      primaryKeyField: 'PrimaryKey',
      isBridge: true,
      bridgeEntity1: bridgeEntity1,
      bridgeEntity1Column: bridgeEntity1Column,
      bridgeEntity2: bridgeEntity2,
      bridgeEntity2Column: bridgeEntity2Column,
      relationshipType: relationshipType || 'related',
    };

    setTableMappings([...tableMappings, newMapping]);
    setBridgeDialog(false);
    setSelectedSourceTable('');
    setBridgeEntity1('');
    setBridgeEntity1Column('');
    setBridgeEntity2('');
    setBridgeEntity2Column('');
    setBridgeName('');
    setRelationshipType('related');
    setBridgeEntity2Column('');
    setBridgeName('');
    setIsBridgeMode(false);
    showSnackbar('Bridge mapping added successfully', 'success');
  };

  // Update available relationships based on selected entities
  const updateAvailableRelationships = () => {
    if (!bridgeEntity1 || !bridgeEntity2) {
      setAvailableRelationships([]);
      return;
    }

    const entity1 = isa95Entities.find(e => e.tableName === bridgeEntity1);
    const entity2 = isa95Entities.find(e => e.tableName === bridgeEntity2);
    
    if (!entity1 || !entity2) {
      setAvailableRelationships([]);
      return;
    }

    const relationships: string[] = [];
    
    // Helper function to extract entity name from DTDL target format
    const extractEntityName = (target: string): string => {
      // Remove DTDL prefix and version suffix
      let name = target.replace(/^dtmi:digitaltwins:isa95:/g, '');
      name = name.replace(/;\d+$/g, '');
      // Remove spaces to match tableName format
      return name.replace(/\s+/g, '');
    };
    
    // Get relationships from entity1 to entity2
    entity1.relationships?.forEach(rel => {
      const targetName = extractEntityName(rel.targetEntityName);
      const entity2TableName = entity2.tableName;
      const entity2NameNoSpace = entity2.name.replace(/\s+/g, '');
      
      if (targetName === entity2TableName || 
          targetName === entity2NameNoSpace ||
          targetName.toLowerCase() === entity2TableName.toLowerCase()) {
        // Use the actual relationship name, not displayName
        const relationshipName = rel.name;
        if (!relationships.includes(relationshipName)) {
          relationships.push(relationshipName);
        }
      }
    });
    
    // Get relationships from entity2 to entity1
    entity2.relationships?.forEach(rel => {
      const targetName = extractEntityName(rel.targetEntityName);
      const entity1TableName = entity1.tableName;
      const entity1NameNoSpace = entity1.name.replace(/\s+/g, '');
      
      if (targetName === entity1TableName || 
          targetName === entity1NameNoSpace ||
          targetName.toLowerCase() === entity1TableName.toLowerCase()) {
        // Use the actual relationship name, not displayName
        const relationshipName = rel.name;
        if (!relationships.includes(relationshipName)) {
          relationships.push(relationshipName);
        }
      }
    });
    
    setAvailableRelationships(relationships);
  };

  const handleGenerateBridgePreview = async () => {
    if (!selectedSourceTable || !bridgeEntity1 || !bridgeEntity2 || !bridgeEntity1Column || !bridgeEntity2Column) {
      return;
    }

    try {
      const sourceData = await loadSourceData(selectedSourceTable);
      const entity1 = isa95Entities.find(e => e.tableName === bridgeEntity1);
      const entity2 = isa95Entities.find(e => e.tableName === bridgeEntity2);
      
      if (!entity1 || !entity2) return;

      // Get first 5 records for preview
      const previewData = sourceData.slice(0, 5).map((record: any) => ({
        sourceRecord: record,
        bridgeMapping: {
          'Source type': entity1.name,
          'Source PrimaryKey': record[bridgeEntity1Column] || '(empty)',
          'Target Type': entity2.name,
          'Target PrimaryKey': record[bridgeEntity2Column] || '(empty)',
          'Relationship Type': relationshipType || 'related'
        }
      }));

      setBridgePreview(previewData);
      setShowBridgePreview(true);
    } catch (error) {
      console.error('Error generating preview:', error);
      showSnackbar('Failed to generate preview', 'error');
    }
  };

  const handleRemoveMapping = (index: number) => {
    setTableMappings(tableMappings.filter((_, i) => i !== index));
  };

  const handleUpdateMapping = (mappingIndex: number, columnIndex: number, field: keyof ColumnMapping, value: string) => {
    const updated = [...tableMappings];
    updated[mappingIndex].mappings[columnIndex] = {
      ...updated[mappingIndex].mappings[columnIndex],
      [field]: value,
    };
    setTableMappings(updated);
  };

  const handleAddColumnMapping = (mappingIndex: number) => {
    const updated = [...tableMappings];
    updated[mappingIndex].mappings.push({
      sourceColumn: '',
      targetField: '',
    });
    setTableMappings(updated);
  };

  const handleRemoveColumnMapping = (mappingIndex: number, columnIndex: number) => {
    const updated = [...tableMappings];
    updated[mappingIndex].mappings.splice(columnIndex, 1);
    setTableMappings(updated);
  };

  const handleToggleFieldGenerate = (mappingIndex: number, fieldName: string) => {
    const updated = [...tableMappings];
    const fieldMapping = updated[mappingIndex].fieldMappings.find(f => f.fieldName === fieldName);
    if (fieldMapping) {
      fieldMapping.generate = !fieldMapping.generate;
      setTableMappings(updated);
    }
  };

  const handleUpdateFieldMapping = (mappingIndex: number, fieldName: string, field: keyof FieldMapping, value: any) => {
    const updated = [...tableMappings];
    const fieldMapping = updated[mappingIndex].fieldMappings.find(f => f.fieldName === fieldName);
    if (fieldMapping) {
      (fieldMapping as any)[field] = value;
      setTableMappings(updated);
    }
  };

  const handleOpenFieldRuleDialog = (mappingIndex: number, fieldName: string) => {
    const mapping = tableMappings[mappingIndex];
    const fieldMapping = mapping.fieldMappings.find(f => f.fieldName === fieldName);
    
    setSelectedFieldForRule({ mappingIndex, fieldName });
    
    // Reset all parameters first
    resetRuleParameters();
    
    // Load enum values for the field if it's an Enum type
    const targetEntity = isa95Entities.find(e => e.tableName === mapping.targetEntity);
    const field = targetEntity?.fields.find(f => f.name === fieldName);
    if (field?.type === 'Enum' && field?.enumValues) {
      setEnumValues(field.enumValues);
    } else {
      setEnumValues([]);
    }
    
    if (fieldMapping?.fieldRule) {
      const ruleType = fieldMapping.fieldRule.ruleType as RuleType;
      setFieldRuleType(ruleType);
      
      const params = fieldMapping.fieldRule.parameters as any;
      switch (ruleType) {
        case RuleType.Range:
          setRangeMin(params?.min || 0);
          setRangeMax(params?.max || 100);
          break;
        case RuleType.Examples:
          setExampleValues(params?.values || []);
          break;
        case RuleType.Pattern:
          setPattern(params?.regex || '');
          break;
        case RuleType.Static:
          setStaticValue(params?.value || '');
          break;
        case RuleType.Sequence:
          setSequenceStart(params?.start || 1);
          setSequenceIncrement(params?.increment || 1);
          break;
        case RuleType.PrefixSequence:
          setPrefixValue(params?.prefix || '');
          setSuffixValue(params?.suffix || '');
          setSeqStart(params?.start || 1);
          setSeqEnd(params?.end || 100);
          setSeqPadding(params?.padding || 0);
          break;
        case RuleType.Enumeration:
          // Load selected enum value from saved rule
          setStaticValue(params?.value || '');
          break;
      }
    } else {
      // Auto-select Enumeration if field is Enum type
      if (field?.type === 'Enum') {
        setFieldRuleType(RuleType.Enumeration);
        // Auto-select first enum value by default - handle both object and string formats
        const firstEnum = field.enumValues?.[0];
        const defaultValue = firstEnum 
          ? (typeof firstEnum === 'object' ? firstEnum.enumValue : firstEnum)
          : '';
        setStaticValue(defaultValue);
      } else {
        setFieldRuleType(RuleType.Examples);
      }
    }
    
    setFieldRuleDialog(true);
  };
  
  const resetRuleParameters = () => {
    setRangeMin(0);
    setRangeMax(100);
    setExampleValues([]);
    setNewExampleValue('');
    setPattern('');
    setStaticValue('');
    setSequenceStart(1);
    setSequenceIncrement(1);
    setPrefixValue('');
    setSuffixValue('');
    setSeqStart(1);
    setSeqEnd(100);
    setSeqPadding(0);
    setEnumValues([]);
  };

  const handleSaveFieldRule = () => {
    if (!selectedFieldForRule) return;

    let parameters: any;
    switch (fieldRuleType) {
      case RuleType.Range:
        parameters = { min: rangeMin, max: rangeMax };
        break;
      case RuleType.Examples:
        if (exampleValues.length === 0) {
          showSnackbar('Please add at least one example value', 'error');
          return;
        }
        parameters = { values: exampleValues };
        break;
      case RuleType.Pattern:
        if (!pattern.trim()) {
          showSnackbar('Please enter a regex pattern', 'error');
          return;
        }
        parameters = { regex: pattern };
        break;
      case RuleType.Static:
        if (!staticValue.trim()) {
          showSnackbar('Please enter a static value', 'error');
          return;
        }
        parameters = { value: staticValue };
        break;
      case RuleType.Sequence:
        parameters = { start: sequenceStart, increment: sequenceIncrement };
        break;
      case RuleType.PrefixSequence:
        parameters = { 
          prefix: prefixValue, 
          suffix: suffixValue, 
          start: seqStart, 
          end: seqEnd,
          padding: seqPadding > 0 ? seqPadding : undefined
        };
        break;
      case RuleType.Enumeration:
        if (!staticValue) {
          showSnackbar('Please select an enum value', 'error');
          return;
        }
        parameters = { value: staticValue };
        break;
      default:
        showSnackbar('Invalid rule type', 'error');
        return;
    }

    const updated = [...tableMappings];
    const fieldMapping = updated[selectedFieldForRule.mappingIndex].fieldMappings.find(
      f => f.fieldName === selectedFieldForRule.fieldName
    );

    if (fieldMapping) {
      fieldMapping.fieldRule = {
        ruleType: fieldRuleType as string,
        parameters: parameters,
      };
      setTableMappings(updated);
      setFieldRuleDialog(false);
      showSnackbar('Field rule configured', 'success');
    }
  };
  
  const handleAddExampleValue = () => {
    if (newExampleValue.trim()) {
      setExampleValues([...exampleValues, newExampleValue.trim()]);
      setNewExampleValue('');
    }
  };

  const handleRemoveExampleValue = (index: number) => {
    setExampleValues(exampleValues.filter((_, i) => i !== index));
  };

  // Primary Key Rule Handlers
  const handleExpandAll = (isBridge: boolean) => {
    if (isBridge) {
      const bridgeMappingIndices = tableMappings
        .map((m, i) => m.isBridge ? i : -1)
        .filter(i => i !== -1);
      setExpandedBridgeMappings(new Set(bridgeMappingIndices));
    } else {
      const regularMappingIndices = tableMappings
        .map((m, i) => !m.isBridge ? i : -1)
        .filter(i => i !== -1);
      setExpandedMappings(new Set(regularMappingIndices));
    }
  };

  const handleCollapseAll = (isBridge: boolean) => {
    if (isBridge) {
      setExpandedBridgeMappings(new Set());
    } else {
      setExpandedMappings(new Set());
    }
  };

  const handleAccordionToggle = (index: number, isBridge: boolean) => {
    if (isBridge) {
      const newExpanded = new Set(expandedBridgeMappings);
      if (newExpanded.has(index)) {
        newExpanded.delete(index);
      } else {
        newExpanded.add(index);
      }
      setExpandedBridgeMappings(newExpanded);
    } else {
      const newExpanded = new Set(expandedMappings);
      if (newExpanded.has(index)) {
        newExpanded.delete(index);
      } else {
        newExpanded.add(index);
      }
      setExpandedMappings(newExpanded);
    }
  };

  const handleOpenPKRuleDialog = (mappingIndex: number) => {
    setSelectedMappingForPK(mappingIndex);
    
    // Reset all PK parameters first
    resetPKRuleParameters();
    
    const mapping = tableMappings[mappingIndex];
    if (mapping?.primaryKeyRule) {
      const ruleType = mapping.primaryKeyRule.ruleType as RuleType | 'Composite';
      setPkRuleType(ruleType as any);
      
      const params = mapping.primaryKeyRule.parameters as any;
      switch (ruleType) {
        case RuleType.Range:
          setPkRangeMin(params?.min || 0);
          setPkRangeMax(params?.max || 100);
          break;
        case RuleType.Examples:
          setPkExampleValues(params?.values || []);
          break;
        case RuleType.Pattern:
          setPkPattern(params?.regex || '');
          break;
        case RuleType.Static:
          setPkStaticValue(params?.value || '');
          break;
        case RuleType.Sequence:
          setPkSequenceStart(params?.start || 1);
          setPkSequenceIncrement(params?.increment || 1);
          break;
        case RuleType.PrefixSequence:
          setPkPrefixValue(params?.prefix || '');
          setPkSuffixValue(params?.suffix || '');
          setPkSeqStart(params?.start || 1);
          setPkSeqEnd(params?.end || 100);
          setPkSeqPadding(params?.padding || 3);
          break;
        case 'Composite':
          setPkCompositeFields(params?.fields || []);
          setPkCompositeSeparator(params?.separator || '-');
          break;
      }
    } else {
      setPkRuleType(RuleType.Sequence);
    }
    
    setPkRuleDialog(true);
  };
  
  const resetPKRuleParameters = () => {
    setPkRangeMin(0);
    setPkRangeMax(100);
    setPkExampleValues([]);
    setPkNewExampleValue('');
    setPkPattern('');
    setPkStaticValue('');
    setPkSequenceStart(1);
    setPkSequenceIncrement(1);
    setPkPrefixValue('');
    setPkSuffixValue('');
    setPkSeqStart(1);
    setPkSeqEnd(100);
    setPkSeqPadding(3);
    setPkCompositeFields([]);
    setPkCompositeSeparator('-');
  };

  const handleSavePKRule = () => {
    if (selectedMappingForPK === null) return;

    let parameters: any;
    switch (pkRuleType) {
      case RuleType.Range:
        parameters = { min: pkRangeMin, max: pkRangeMax };
        break;
      case RuleType.Examples:
        if (pkExampleValues.length === 0) {
          showSnackbar('Please add at least one example value', 'error');
          return;
        }
        parameters = { values: pkExampleValues };
        break;
      case RuleType.Pattern:
        if (!pkPattern.trim()) {
          showSnackbar('Please enter a regex pattern', 'error');
          return;
        }
        parameters = { regex: pkPattern };
        break;
      case RuleType.Static:
        if (!pkStaticValue.trim()) {
          showSnackbar('Please enter a static value', 'error');
          return;
        }
        parameters = { value: pkStaticValue };
        break;
      case RuleType.Sequence:
        parameters = { start: pkSequenceStart, increment: pkSequenceIncrement };
        break;
      case RuleType.PrefixSequence:
        parameters = { 
          prefix: pkPrefixValue, 
          suffix: pkSuffixValue, 
          start: pkSeqStart, 
          end: pkSeqEnd,
          padding: pkSeqPadding > 0 ? pkSeqPadding : undefined
        };
        break;
      case 'Composite' as any:
        if (pkCompositeFields.length === 0) {
          showSnackbar('Please select at least one field for composite key', 'error');
          return;
        }
        parameters = { fields: pkCompositeFields, separator: pkCompositeSeparator };
        break;
      default:
        showSnackbar('Invalid rule type', 'error');
        return;
    }

    const updated = [...tableMappings];
    updated[selectedMappingForPK].primaryKeyRule = {
      ruleType: pkRuleType === 'Composite' as any ? 'Composite' : pkRuleType as string,
      parameters: parameters,
    };
    setTableMappings(updated);
    setPkRuleDialog(false);
    showSnackbar('Primary key rule configured', 'success');
  };

  const handleAddPKExampleValue = () => {
    if (pkNewExampleValue.trim()) {
      setPkExampleValues([...pkExampleValues, pkNewExampleValue.trim()]);
      setPkNewExampleValue('');
    }
  };

  const handleRemovePKExampleValue = (index: number) => {
    setPkExampleValues(pkExampleValues.filter((_, i) => i !== index));
  };

  const handleRemovePKRule = (mappingIndex: number) => {
    const updated = [...tableMappings];
    delete updated[mappingIndex].primaryKeyRule;
    setTableMappings(updated);
    showSnackbar('Primary key rule removed', 'success');
  };

  const getPKRuleSummary = (rule: FieldRuleConfig): string => {
    const ruleType = rule.ruleType as RuleType | 'Composite';
    const params = rule.parameters as any;
    
    switch (ruleType) {
      case RuleType.Range:
        return `Range(${params?.min}-${params?.max})`;
      case RuleType.Examples:
        return `Examples(${params?.values?.slice(0, 2).join(', ')}...)`;
      case RuleType.Pattern:
        return `Pattern(${params?.regex})`;
      case RuleType.Static:
        return `Static(${params?.value})`;
      case RuleType.Sequence:
        return `Sequence(start=${params?.start}, inc=${params?.increment})`;
      case RuleType.PrefixSequence:
        return `${params?.prefix}[${params?.start}-${params?.end}]${params?.suffix || ''}`;
      case 'Composite':
        return `Composite(${params?.fields?.join(params?.separator || '-')})`;
      default:
        return ruleType as string;
    }
  };


  const handleRemoveFieldRule = (mappingIndex: number, fieldName: string) => {
    const updated = [...tableMappings];
    const fieldMapping = updated[mappingIndex].fieldMappings.find(f => f.fieldName === fieldName);
    if (fieldMapping) {
      fieldMapping.fieldRule = undefined;
      setTableMappings(updated);
      showSnackbar('Field rule removed', 'success');
    }
  };

  const getFieldRuleSummary = (fieldRule: FieldRuleConfig) => {
    const params = fieldRule.parameters as any;
    switch (fieldRule.ruleType) {
      case RuleType.Range:
        return `${params?.min || 0} - ${params?.max || 100}`;
      case RuleType.Examples:
        return `${params?.values?.length || 0} values`;
      case RuleType.Pattern:
        return params?.regex || 'Pattern';
      case RuleType.Static:
        return params?.value || 'Static';
      case RuleType.Sequence:
        return `Start: ${params?.start || 1}, Inc: ${params?.increment || 1}`;
      case RuleType.PrefixSequence:
        return `${params?.prefix || ''}[${params?.start || 1}-${params?.end || 100}]${params?.suffix || ''}`;
      case RuleType.Enumeration:
        return params?.value || 'Enum';
      default:
        return fieldRule.ruleType;
    }
  };

  const executeMigration = async () => {
    setLoading(true);
    setMigrationProgress(0);
    setMigrationLog([]);

    const log = (message: string) => {
      setMigrationLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    try {
      log('Starting data migration...');

      // Request directory access for saving CSV files
      let directoryHandle: any;
      try {
        // @ts-ignore - File System Access API
        directoryHandle = await window.showDirectoryPicker();
        log('Output directory selected');
      } catch (error) {
        log('Directory selection cancelled or not supported');
        showSnackbar('Please select an output directory', 'error');
        setLoading(false);
        return;
      }

      for (let i = 0; i < tableMappings.length; i++) {
        const mapping = tableMappings[i];
        if (!mapping.enabled) {
          log(`Skipping disabled mapping: ${mapping.sourceTable} -> ${mapping.targetEntity}`);
          continue;
        }

        log(`Processing: ${mapping.sourceTable} -> ${mapping.targetEntity}`);

        // Get source data
        const sourceTable = dataSource?.tables.find(t => t.name === mapping.sourceTable);
        if (!sourceTable) {
          log(`Error: Source table ${mapping.sourceTable} not found`);
          continue;
        }

        // Load actual data from IndexedDB or imported source
        const sourceData = await loadSourceData(mapping.sourceTable);
        log(`Loaded ${sourceData.length} records from ${mapping.sourceTable}`);

        // Get entity for file naming
        const targetEntity = isa95Entities.find(e => e.tableName === mapping.targetEntity);

        // Initialize sequence counters for PK rule
        let pkSequenceCounter = 0;
        if (mapping.primaryKeyRule) {
          const pkParams = mapping.primaryKeyRule.parameters as any;
          if (mapping.primaryKeyRule.ruleType === RuleType.Sequence) {
            pkSequenceCounter = pkParams?.start || 1;
          } else if (mapping.primaryKeyRule.ruleType === RuleType.PrefixSequence) {
            pkSequenceCounter = pkParams?.start || 1;
          }
        }

        // Transform data based on field mappings
        const transformedData = sourceData.map((record: any, recordIndex: number) => {
          const transformed: any = {};
          
          // Special handling for bridge tables
          if (mapping.isBridge && mapping.bridgeEntity1 && mapping.bridgeEntity2 && 
              mapping.bridgeEntity1Column && mapping.bridgeEntity2Column) {
            const entity1 = isa95Entities.find(e => e.tableName === mapping.bridgeEntity1);
            const entity2 = isa95Entities.find(e => e.tableName === mapping.bridgeEntity2);
            
            if (entity1 && entity2) {
              // Bridge table structure: lookup values from source, actual PKs come from generated entity files
              transformed['Source type'] = entity1.name;
              transformed['Source PrimaryKey'] = record[mapping.bridgeEntity1Column] || '';
              transformed['Target Type'] = entity2.name;
              transformed['Target PrimaryKey'] = record[mapping.bridgeEntity2Column] || '';
              transformed['Relationship Type'] = mapping.relationshipType || 'related';
            }
          } else {
            // Process each field mapping normally
            mapping.fieldMappings.forEach(fm => {
              if (fm.generate) {
                if (fm.sourceColumn && record[fm.sourceColumn] !== undefined) {
                  let value = record[fm.sourceColumn];
                  
                  // Apply transformation if specified
                  if (fm.transformation) {
                    try {
                      value = eval(fm.transformation)(value);
                    } catch (error) {
                      log(`Warning: Transformation failed for ${fm.fieldName}: ${error}`);
                    }
                  }
                  
                  transformed[fm.fieldName] = value;
                } else if (fm.fieldRule) {
                  // Generate value using field rule
                  transformed[fm.fieldName] = generateValueFromRule(fm.fieldRule);
                }
              }
            });
          }

          // Generate PrimaryKey field if PK rule is configured
          if (mapping.primaryKeyRule) {
            const pkParams = mapping.primaryKeyRule.parameters as any;
            let pkValue: any;

            switch (mapping.primaryKeyRule.ruleType) {
              case RuleType.Static:
                pkValue = pkParams?.value || '';
                break;
              case RuleType.Range:
                const min = pkParams?.min || 0;
                const max = pkParams?.max || 100;
                pkValue = Math.random() * (max - min) + min;
                break;
              case RuleType.Examples:
                const values = pkParams?.values || [];
                pkValue = values[Math.floor(Math.random() * values.length)];
                break;
              case RuleType.Pattern:
                pkValue = pkParams?.regex || '';
                break;
              case RuleType.Sequence:
                pkValue = pkSequenceCounter;
                pkSequenceCounter += pkParams?.increment || 1;
                break;
              case RuleType.PrefixSequence:
                const padding = pkParams?.padding || 0;
                const numStr = padding > 0 ? String(pkSequenceCounter).padStart(padding, '0') : String(pkSequenceCounter);
                pkValue = `${pkParams?.prefix || ''}${numStr}${pkParams?.suffix || ''}`;
                pkSequenceCounter += 1;
                break;
              case 'Composite':
                // Composite key: concatenate values from specified fields
                const fieldValues = (pkParams?.fields || []).map((fieldName: string) => {
                  return transformed[fieldName] || '';
                });
                pkValue = fieldValues.join(pkParams?.separator || '-');
                break;
              default:
                pkValue = recordIndex + 1;
            }

            // Always add to PrimaryKey field
            transformed['PrimaryKey'] = pkValue;
          }
          
          return transformed;
        });

        log(`Transformed ${transformedData.length} records`);

        // Get entity display name for file naming (targetEntity already defined above)
        const entityDisplayName = targetEntity?.name || mapping.targetEntity;

        // Save to ISA95 format as CSV
        log(`Exporting to CSV: ${entityDisplayName}...`);
        await saveToISA95CSV(entityDisplayName, transformedData, directoryHandle);
        
        log(`✓ Completed: ${mapping.sourceTable} -> ${entityDisplayName} (${transformedData.length} records)`);

        setMigrationProgress(((i + 1) / tableMappings.length) * 100);
      }

      log('Migration completed successfully!');
      showSnackbar('Migration completed successfully', 'success');
    } catch (error) {
      console.error('Migration failed:', error);
      log(`Error: Migration failed - ${error}`);
      showSnackbar('Migration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateValueFromRule = (fieldRule: FieldRuleConfig): any => {
    const params = fieldRule.parameters as any;
    switch (fieldRule.ruleType) {
      case RuleType.Static:
        return params?.value || '';
      case RuleType.Range:
        const min = params?.min || 0;
        const max = params?.max || 100;
        return Math.random() * (max - min) + min;
      case RuleType.Examples:
        const values = params?.values || [];
        return values[Math.floor(Math.random() * values.length)];
      case RuleType.Enumeration:
        return params?.value || '';
      case RuleType.Pattern:
        // Simple pattern generation - in real scenario, use a regex generator
        return params?.regex || '';
      case RuleType.Sequence:
        // For sequences, we'd need to track state - simplified here
        return (params?.start || 1);
      case RuleType.PrefixSequence:
        const start = params?.start || 1;
        const padding = params?.padding || 0;
        const numStr = padding > 0 ? String(start).padStart(padding, '0') : String(start);
        return `${params?.prefix || ''}${numStr}${params?.suffix || ''}`;
      default:
        return '';
    }
  };

  const loadSourceData = async (tableName: string): Promise<any[]> => {
    // Check if it's an imported table first
    const importedTable = importedTables.find(t => t.name === tableName);
    if (importedTable) {
      // For imported tables, we need to load the actual data
      // This is a simplified version - in reality, you'd store the imported data
      return [];
    }

    // Map table names to IndexedDB stores
    const masterStoreMap: { [key: string]: string } = {
      'material_classes': 'materialClasses',
      'materials': 'materials',
      'material_lots': 'materialLots',
      'material_sublots': 'materialSublots',
      'equipment_classes': 'equipmentClasses',
      'equipment': 'equipment',
      'equipment_properties': 'equipmentProperties',
      'equipment_property_assignments': 'equipmentPropertyAssignments',
      'plants': 'plants',
      'production_lines': 'productionLines',
      'process_segments': 'processSegments',
    };

    const processStoreMap: { [key: string]: string } = {
      'operations_requests': 'operationsRequests',
      'segment_requirements': 'segmentRequirements',
      'segment_material_requirements': 'segmentMaterialRequirements',
      'segment_equipment_requirements': 'segmentEquipmentRequirements',
      'operations_responses': 'operationsResponses',
      'segment_responses': 'segmentResponses',
      'segment_material_actuals': 'segmentMaterialActuals',
      'segment_equipment_actuals': 'segmentEquipmentActuals',
      'equipment_property_tracking': 'equipmentPropertyTracking',
      'test_results': 'testResults',
    };

    const masterStoreName = masterStoreMap[tableName];
    if (masterStoreName) {
      return await masterDataDB.getAll(masterStoreName);
    }

    const processStoreName = processStoreMap[tableName];
    if (processStoreName) {
      return await processDataDB.getAll(processStoreName);
    }

    throw new Error(`Unknown table: ${tableName}`);
  };

  const saveToISA95CSV = async (entityName: string, data: any[], directoryHandle: any): Promise<void> => {
    if (data.length === 0) {
      return;
    }

    // Get all column names from the data
    let columns = Object.keys(data[0]);
    
    // Ensure PrimaryKey is first if it exists
    if (columns.includes('PrimaryKey')) {
      columns = ['PrimaryKey', ...columns.filter(col => col !== 'PrimaryKey')];
    }
    
    // Create CSV content
    const csvRows: string[] = [];
    
    // Header row
    csvRows.push(columns.join(','));
    
    // Data rows
    data.forEach(row => {
      const values = columns.map(col => {
        const value = row[col];
        // Handle values that need quoting (contain commas, quotes, or newlines)
        if (value === null || value === undefined) {
          return '';
        }
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    const fileName = `${entityName}.csv`;

    try {
      // @ts-ignore - File System Access API
      const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
      // @ts-ignore
      const writable = await fileHandle.createWritable();
      await writable.write(csvContent);
      await writable.close();
    } catch (error) {
      console.error('Failed to save CSV:', error);
      // Fallback to download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const exportMappingConfiguration = (format: 'json' | 'csv', type: 'source-to-entity' | 'entity-to-entity' | 'all' = 'all') => {
    const sourceMappings = tableMappings.filter(m => !m.isBridge);
    const bridgeMappings = tableMappings.filter(m => m.isBridge);
    
    let mappingsToExport = tableMappings;
    let filePrefix = 'all_mappings';
    
    if (type === 'source-to-entity') {
      mappingsToExport = sourceMappings;
      filePrefix = 'source_to_entity_mappings';
    } else if (type === 'entity-to-entity') {
      mappingsToExport = bridgeMappings;
      filePrefix = 'entity_to_entity_mappings';
    }

    const config = {
      version: '1.0',
      source: dataSource?.name,
      exportType: type,
      mappings: mappingsToExport,
      exportDate: new Date().toISOString(),
    };

    if (format === 'json') {
      const json = JSON.stringify(config, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filePrefix}_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      showSnackbar(`${type === 'all' ? 'All' : type === 'source-to-entity' ? 'Source-to-Entity' : 'Entity-to-Entity'} configuration exported as JSON`, 'success');
    } else {
      // CSV format
      const csvRows: string[] = [];
      
      if (type === 'entity-to-entity' || (type === 'all' && bridgeMappings.length > 0)) {
        // Bridge table format
        csvRows.push('Bridge Table Name,Source Table,First Entity,First Entity Column,Second Entity,Second Entity Column,Relationship Type,Enabled');
        
        bridgeMappings.forEach(mapping => {
          const entity1 = isa95Entities.find(e => e.tableName === mapping.bridgeEntity1);
          const entity2 = isa95Entities.find(e => e.tableName === mapping.bridgeEntity2);
          csvRows.push(
            `"${mapping.targetEntity}","${mapping.sourceTable}","${entity1?.name || mapping.bridgeEntity1}","${mapping.bridgeEntity1Column || ''}","${entity2?.name || mapping.bridgeEntity2}","${mapping.bridgeEntity2Column || ''}","${mapping.relationshipType || ''}","${mapping.enabled}"`
          );
        });
      }
      
      if (type === 'source-to-entity' || (type === 'all' && sourceMappings.length > 0)) {
        // Source to entity format
        if (csvRows.length > 0) csvRows.push(''); // Empty line separator
        csvRows.push('Source Table,Target Entity,Target Field,Generate,Source Column,Transformation,Field Rule Type,Field Rule Params,Primary Key Rule Type,Primary Key Rule Params,Enabled');
        
        sourceMappings.forEach(mapping => {
          const targetEntity = isa95Entities.find(e => e.tableName === mapping.targetEntity);
          const pkRuleType = mapping.primaryKeyRule?.ruleType || '';
          const pkRuleParams = mapping.primaryKeyRule ? JSON.stringify(mapping.primaryKeyRule.parameters).replace(/"/g, '""') : '';
          
          mapping.fieldMappings.forEach(fieldMapping => {
            csvRows.push(
              `"${mapping.sourceTable}","${targetEntity?.name || mapping.targetEntity}","${fieldMapping.fieldName}","${fieldMapping.generate}","${fieldMapping.sourceColumn || ''}","${fieldMapping.transformation || ''}","${fieldMapping.fieldRule?.ruleType || ''}","${fieldMapping.fieldRule ? JSON.stringify(fieldMapping.fieldRule.parameters).replace(/"/g, '""') : ''}","${pkRuleType}","${pkRuleParams}","${mapping.enabled}"`
            );
          });
        });
      }
      
      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filePrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      showSnackbar(`${type === 'all' ? 'All' : type === 'source-to-entity' ? 'Source-to-Entity' : 'Entity-to-Entity'} configuration exported as CSV`, 'success');
    }
  };

  const importMappingConfiguration = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let importedMappings: TableMapping[] = [];

      if (file.name.endsWith('.json')) {
        // Parse JSON format
        const config = JSON.parse(text);
        importedMappings = config.mappings || [];
      } else if (file.name.endsWith('.csv')) {
        // Parse CSV format
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          showSnackbar('Invalid CSV file format', 'error');
          return;
        }

        const header = lines[0].toLowerCase();
        
        if (header.includes('bridge table name')) {
          // Bridge table format
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            
            const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || [];
            if (values.length >= 7) {
              const bridgeMapping: TableMapping = {
                targetEntity: values[0],
                sourceTable: values[1],
                bridgeEntity1: isa95Entities.find(e => e.name === values[2])?.tableName || values[2],
                bridgeEntity1Column: values[3],
                bridgeEntity2: isa95Entities.find(e => e.name === values[4])?.tableName || values[4],
                bridgeEntity2Column: values[5],
                relationshipType: values[6],
                enabled: values[7] === 'true',
                isBridge: true,
                mappings: [],
                fieldMappings: [],
              };
              importedMappings.push(bridgeMapping);
            }
          }
        } else {
          // Source to entity format - not implemented for CSV yet
          showSnackbar('Source-to-entity CSV import not yet supported. Please use JSON format.', 'info');
          return;
        }
      } else {
        showSnackbar('Unsupported file format. Please use .json or .csv', 'error');
        return;
      }

      if (importedMappings.length > 0) {
        setTableMappings([...tableMappings, ...importedMappings]);
        showSnackbar(`Successfully imported ${importedMappings.length} mapping(s)`, 'success');
      } else {
        showSnackbar('No mappings found in file', 'warning');
      }
    } catch (error) {
      console.error('Error importing mappings:', error);
      showSnackbar('Failed to import mappings configuration', 'error');
    }

    // Reset file input
    event.target.value = '';
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          ISA95 Data Migration
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Map and migrate data from source systems to ISA95 entity format
        </Typography>
      </Paper>

      {loadingEntities ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Loading ISA95 entities from backend...
            </Typography>
          </Box>
        </Box>
      ) : (
        <>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Step 1: Select Data Source */}
          {activeStep === 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Data Source
              </Typography>
          
          {dataSource ? (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Data source loaded: {dataSource.name} ({dataSource.tables.length} tables)
              </Alert>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Table Name</TableCell>
                      <TableCell>Columns</TableCell>
                      <TableCell>Row Count</TableCell>
                      <TableCell>Sample Data</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dataSource.tables.map((table) => {
                      const isImported = importedTables.some(t => t.name === table.name);
                      return (
                        <TableRow key={table.name}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip 
                                label={table.name} 
                                size="small" 
                                color={isImported ? 'secondary' : 'primary'} 
                              />
                              {isImported && (
                                <Chip 
                                  label="Imported" 
                                  size="small" 
                                  variant="outlined" 
                                  color="secondary"
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {table.columns.map(col => (
                              <Chip key={col.name} label={`${col.name} (${col.type})`} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                            ))}
                          </TableCell>
                          <TableCell>{table.rowCount}</TableCell>
                          <TableCell>
                            {table.columns[0]?.sample && (
                              <Typography variant="caption" color="text.secondary">
                                {table.columns[0].name}: {table.columns[0].sample}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {isImported && (
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleRemoveImportedTable(table.name)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button
                  startIcon={<RefreshIcon />}
                  onClick={loadCurrentDataAsSource}
                  variant="outlined"
                >
                  Reload Data Source
                </Button>
                <Button
                  startIcon={<UploadFileIcon />}
                  onClick={() => setImportDialog(true)}
                  variant="outlined"
                  color="secondary"
                >
                  Import Table
                </Button>
              </Box>
            </Box>
          ) : (
            <Alert severity="info">
              Loading data source...
            </Alert>
          )}
        </Paper>
      )}

      {/* Step 2: Source to Entity Mapping */}
      {activeStep === 1 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Source to Entity Mappings ({tableMappings.filter(m => !m.isBridge).length})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleExpandAll(false)}
                disabled={tableMappings.filter(m => !m.isBridge).length === 0}
              >
                Expand All
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleCollapseAll(false)}
                disabled={tableMappings.filter(m => !m.isBridge).length === 0}
              >
                Collapse All
              </Button>
              <Button
                startIcon={<DeleteIcon />}
                onClick={async () => {
                  if (window.confirm('Clear all mappings? This will remove all configured source-to-entity and bridge table mappings.')) {
                    setTableMappings([]);
                    await migrationConfigDB.clearCurrentMappings();
                    showSnackbar('All mappings cleared', 'success');
                  }
                }}
                variant="outlined"
                color="error"
                disabled={tableMappings.length === 0}
              >
                Clear All
              </Button>
              <input
                accept=".json,.csv"
                style={{ display: 'none' }}
                id="import-mapping-file"
                type="file"
                onChange={importMappingConfiguration}
              />
              <label htmlFor="import-mapping-file">
                <Button
                  startIcon={<UploadIcon />}
                  component="span"
                  variant="outlined"
                >
                  Import Config
                </Button>
              </label>
              <Button
                startIcon={<DownloadIcon />}
                onClick={(e) => setExportMenuAnchor(e.currentTarget)}
                variant="outlined"
                disabled={tableMappings.length === 0}
              >
                Export Config
              </Button>
            </Box>
          </Box>

          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Source Table</InputLabel>
                  <Select
                    value={selectedSourceTable}
                    onChange={(e) => setSelectedSourceTable(e.target.value)}
                    label="Source Table"
                  >
                    {dataSource?.tables.map(table => (
                      <MenuItem key={table.name} value={table.name}>
                        {table.name} ({table.rowCount} rows)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ flex: '0 0 auto' }}>
                <ArrowForwardIcon />
              </Box>
              <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Target ISA95 Entity</InputLabel>
                  <Select
                    value={selectedTargetEntity}
                    onChange={(e) => setSelectedTargetEntity(e.target.value)}
                    label="Target ISA95 Entity"
                  >
                    {isa95Entities.map(entity => (
                      <MenuItem key={entity.tableName} value={entity.tableName}>
                        {entity.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ flex: '0 0 auto' }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddMapping}
                  disabled={!selectedSourceTable || !selectedTargetEntity}
                >
                  Add Mapping
                </Button>
              </Box>
            </Box>
          </Paper>

          {tableMappings.filter(m => !m.isBridge).length === 0 ? (
            <Alert severity="info">
              No source to entity mappings configured yet. Add your first mapping above.
            </Alert>
          ) : (
            <Box>
              {tableMappings.map((mapping, originalIndex) => {
                if (mapping.isBridge) return null;
                
                const sourceTable = dataSource?.tables.find(t => t.name === mapping.sourceTable);
                const targetEntity = isa95Entities.find(e => e.tableName === mapping.targetEntity);

                return (
                  <Accordion 
                    key={originalIndex}
                    expanded={expandedMappings.has(originalIndex)}
                    onChange={() => handleAccordionToggle(originalIndex, false)}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                        <Chip label={mapping.sourceTable} color="primary" size="small" />
                        <ArrowForwardIcon fontSize="small" />
                        <Chip label={targetEntity?.name || mapping.targetEntity} color="secondary" size="small" />
                        <Chip 
                          label="PK: PrimaryKey" 
                          size="small" 
                          color="primary"
                          variant="outlined"
                        />
                        {mapping.isBridge && (
                          <Chip 
                            label="Bridge Table" 
                            size="small" 
                            color="info"
                            variant="outlined"
                          />
                        )}
                        {mapping.primaryKeyRule && (
                          <Chip 
                            label={`Rule: ${getPKRuleSummary(mapping.primaryKeyRule)}`} 
                            size="small" 
                            color="success"
                            variant="outlined"
                            onDelete={(e) => {
                              e.stopPropagation();
                              handleRemovePKRule(originalIndex);
                            }}
                          />
                        )}
                        <Box sx={{ flexGrow: 1 }} />
                        <Chip 
                          label={mapping.isBridge ? '2 entity refs' : `${mapping.mappings.length} mappings`} 
                          size="small" 
                          variant="outlined"
                        />
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveMapping(originalIndex);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      {mapping.isBridge ? (
                        <Box>
                          <Alert severity="info" sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>Bridge Table</Typography>
                            This mapping creates a bridge table between two ISA95 entities.
                          </Alert>
                          <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip label={isa95Entities.find(e => e.tableName === mapping.bridgeEntity1)?.name || mapping.bridgeEntity1} color="primary" size="small" />
                              <Typography variant="body2">← Column: {mapping.bridgeEntity1Column}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip label={isa95Entities.find(e => e.tableName === mapping.bridgeEntity2)?.name || mapping.bridgeEntity2} color="secondary" size="small" />
                              <Typography variant="body2">← Column: {mapping.bridgeEntity2Column}</Typography>
                            </Box>
                          </Box>
                          <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                            <TextField
                              label="Primary Key Field Name"
                              value="PrimaryKey"
                              size="small"
                              disabled
                              sx={{ minWidth: 200 }}
                              helperText="Separate field for primary key generation"
                            />
                            <Button
                              variant="outlined"
                              color="primary"
                              size="small"
                              startIcon={<AddIcon />}
                              onClick={() => handleOpenPKRuleDialog(originalIndex)}
                            >
                              {mapping.primaryKeyRule ? 'Edit Primary Key Rule' : 'Configure Primary Key Rule'}
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <Box>
                          <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                            <TextField
                              label="Primary Key Field Name"
                              value="PrimaryKey"
                              size="small"
                              disabled
                              sx={{ minWidth: 200 }}
                              helperText="Separate field for primary key generation"
                            />
                            <Button
                              variant="outlined"
                              color="primary"
                              size="small"
                              startIcon={<AddIcon />}
                              onClick={() => handleOpenPKRuleDialog(originalIndex)}
                            >
                              {mapping.primaryKeyRule ? 'Edit Primary Key Rule' : 'Configure Primary Key Rule'}
                            </Button>
                          </Box>

                          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mt: 1 }}>
                            Field Configuration
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                            Check fields to generate, assign source columns, configure transformations, or set field rules
                          </Typography>
                        </Box>
                      )}

                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell width={50}>Generate</TableCell>
                              <TableCell>Target Field</TableCell>
                              <TableCell>Type</TableCell>
                              <TableCell>Source Column</TableCell>
                              <TableCell>Transformation</TableCell>
                              <TableCell>Field Rule</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {mapping.fieldMappings.map((fieldMapping, fieldIndex) => {
                              const field = targetEntity?.fields.find(f => f.name === fieldMapping.fieldName);
                              return (
                                <TableRow key={fieldIndex}>
                                  <TableCell>
                                    <Checkbox
                                      checked={fieldMapping.generate}
                                      onChange={() => handleToggleFieldGenerate(originalIndex, fieldMapping.fieldName)}
                                      size="small"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Typography variant="body2">{fieldMapping.fieldName}</Typography>
                                      {fieldMapping.fieldName === 'PrimaryKey' && (
                                        <Chip label="Generated PK" size="small" color="success" sx={{ height: 18, fontSize: '0.65rem' }} />
                                      )}
                                      {field?.isPrimaryKey && (
                                        <Chip label="PK" size="small" color="primary" sx={{ height: 18, fontSize: '0.65rem' }} />
                                      )}
                                      {field?.required && (
                                        <Chip label="Required" size="small" color="error" sx={{ height: 18, fontSize: '0.65rem' }} />
                                      )}
                                    </Box>
                                    {fieldMapping.fieldName === 'PrimaryKey' ? (
                                      <Typography variant="caption" color="text.secondary" display="block">
                                        Separate primary key field generated by configured rule
                                      </Typography>
                                    ) : field?.description ? (
                                      <Typography variant="caption" color="text.secondary" display="block">
                                        {field.description.substring(0, 80)}{field.description.length > 80 ? '...' : ''}
                                      </Typography>
                                    ) : null}
                                  </TableCell>
                                  <TableCell>
                                    <Chip label={field?.type || 'string'} size="small" variant="outlined" />
                                  </TableCell>
                                  <TableCell>
                                    <FormControl fullWidth size="small">
                                      <Select
                                        value={fieldMapping.sourceColumn || ''}
                                        onChange={(e) => handleUpdateFieldMapping(originalIndex, fieldMapping.fieldName, 'sourceColumn', e.target.value)}
                                        displayEmpty
                                      >
                                        <MenuItem value="">
                                          <em>No source (use rule/transformation)</em>
                                        </MenuItem>
                                        {sourceTable?.columns.map(col => (
                                          <MenuItem key={col.name} value={col.name}>
                                            {col.name} ({col.type})
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                  </TableCell>
                                  <TableCell>
                                    <TextField
                                      fullWidth
                                      size="small"
                                      placeholder="e.g., (val) => val.toUpperCase()"
                                      value={fieldMapping.transformation || ''}
                                      onChange={(e) => handleUpdateFieldMapping(originalIndex, fieldMapping.fieldName, 'transformation', e.target.value)}
                                      disabled={!fieldMapping.generate}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                      {fieldMapping.fieldRule ? (
                                        <>
                                          <Tooltip title={getFieldRuleSummary(fieldMapping.fieldRule)}>
                                            <Chip 
                                              label={fieldMapping.fieldRule.ruleType}
                                              size="small"
                                              color="primary"
                                              onClick={() => handleOpenFieldRuleDialog(originalIndex, fieldMapping.fieldName)}
                                              onDelete={() => handleRemoveFieldRule(originalIndex, fieldMapping.fieldName)}
                                              sx={{ cursor: 'pointer' }}
                                            />
                                          </Tooltip>
                                        </>
                                      ) : (
                                        <Button
                                          size="small"
                                          startIcon={<AddIcon />}
                                          onClick={() => handleOpenFieldRuleDialog(originalIndex, fieldMapping.fieldName)}
                                          disabled={!fieldMapping.generate}
                                        >
                                          Add Rule
                                        </Button>
                                      )}
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          )}
        </Paper>
      )}

      {/* Step 3: Entity to Entity Mapping */}
      {activeStep === 2 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Entity to Entity Mappings (Bridge Tables) ({tableMappings.filter(m => m.isBridge).length})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleExpandAll(true)}
                disabled={tableMappings.filter(m => m.isBridge).length === 0}
              >
                Expand All
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleCollapseAll(true)}
                disabled={tableMappings.filter(m => m.isBridge).length === 0}
              >
                Collapse All
              </Button>
              <input
                accept=".json,.csv"
                style={{ display: 'none' }}
                id="import-bridge-mapping-file"
                type="file"
                onChange={importMappingConfiguration}
              />
              <label htmlFor="import-bridge-mapping-file">
                <Button
                  startIcon={<UploadIcon />}
                  component="span"
                  variant="outlined"
                >
                  Import Config
                </Button>
              </label>
              <Button
                startIcon={<DownloadIcon />}
                onClick={(e) => setExportMenuAnchor(e.currentTarget)}
                variant="outlined"
                disabled={tableMappings.length === 0}
              >
                Export Config
              </Button>
            </Box>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            Bridge tables create many-to-many relationships between two ISA95 entities. They reference the PrimaryKey fields defined in the previous step.
          </Alert>

          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Create New Bridge Table
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Source Table</InputLabel>
                <Select
                  value={selectedSourceTable}
                  onChange={(e) => setSelectedSourceTable(e.target.value)}
                  label="Source Table"
                >
                  {dataSource?.tables.map(table => (
                    <MenuItem key={table.name} value={table.name}>
                      {table.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>First ISA95 Entity</InputLabel>
                <Select
                  value={bridgeEntity1}
                  onChange={(e) => {
                    const entity1Name = isa95Entities.find(ent => ent.tableName === e.target.value)?.name || '';
                    setBridgeEntity1(e.target.value);
                    // Auto-generate bridge name if both entities are selected
                    if (bridgeEntity2) {
                      const entity2Name = isa95Entities.find(ent => ent.tableName === bridgeEntity2)?.name || '';
                      setBridgeName(`${entity1Name}_to_${entity2Name}_mapping`);
                    }
                  }}
                  label="First ISA95 Entity"
                >
                  {isa95Entities.filter(e => tableMappings.some(m => m.targetEntity === e.tableName && !m.isBridge)).map(entity => (
                    <MenuItem key={entity.tableName} value={entity.tableName}>
                      {entity.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Second ISA95 Entity</InputLabel>
                <Select
                  value={bridgeEntity2}
                  onChange={(e) => {
                    const entity2Name = isa95Entities.find(ent => ent.tableName === e.target.value)?.name || '';
                    setBridgeEntity2(e.target.value);
                    // Auto-generate bridge name if both entities are selected
                    if (bridgeEntity1) {
                      const entity1Name = isa95Entities.find(ent => ent.tableName === bridgeEntity1)?.name || '';
                      setBridgeName(`${entity1Name}_to_${entity2Name}_mapping`);
                    }
                  }}
                  label="Second ISA95 Entity"
                >
                  {isa95Entities.filter(e => tableMappings.some(m => m.targetEntity === e.tableName && !m.isBridge) && e.tableName !== bridgeEntity1).map(entity => (
                    <MenuItem key={entity.tableName} value={entity.tableName}>
                      {entity.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ flex: '0 0 auto' }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setBridgeDialog(true)}
                  disabled={!selectedSourceTable || !bridgeEntity1 || !bridgeEntity2}
                >
                  Create Bridge
                </Button>
              </Box>
            </Box>
          </Paper>

          {tableMappings.filter(m => m.isBridge).length === 0 ? (
            <Alert severity="info">
              No bridge table mappings configured yet. Create your first bridge table above.
            </Alert>
          ) : (
            <Box>
              {tableMappings.map((mapping, originalIndex) => {
                if (!mapping.isBridge) return null;
                
                const sourceTable = dataSource?.tables.find(t => t.name === mapping.sourceTable);
                const entity1 = isa95Entities.find(e => e.tableName === mapping.bridgeEntity1);
                const entity2 = isa95Entities.find(e => e.tableName === mapping.bridgeEntity2);

                return (
                  <Accordion 
                    key={originalIndex}
                    expanded={expandedBridgeMappings.has(originalIndex)}
                    onChange={() => handleAccordionToggle(originalIndex, true)}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                        <Chip label={mapping.sourceTable} color="primary" size="small" />
                        <ArrowForwardIcon fontSize="small" />
                        <Chip label={entity1?.name || mapping.bridgeEntity1} color="secondary" size="small" />
                        <Chip label="↔" size="small" />
                        <Chip label={entity2?.name || mapping.bridgeEntity2} color="secondary" size="small" />
                        <Chip 
                          label="Bridge Table" 
                          size="small" 
                          color="info"
                          variant="outlined"
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        This bridge table maps relationships between {entity1?.name} and {entity2?.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <Chip 
                          label={`${entity1?.name} from column: ${mapping.bridgeEntity1Column}`} 
                          size="small" 
                          color="primary"
                        />
                        <Chip 
                          label={`${entity2?.name} from column: ${mapping.bridgeEntity2Column}`} 
                          size="small" 
                          color="primary"
                        />
                      </Box>
                      <Button
                        startIcon={<DeleteIcon />}
                        onClick={() => handleRemoveMapping(originalIndex)}
                        color="error"
                        sx={{ mt: 2 }}
                      >
                        Remove Mapping
                      </Button>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          )}
        </Paper>
      )}

      {/* Step 4: Migrate Data */}
      {activeStep === 3 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Ready to Migrate
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                startIcon={<DownloadIcon />}
                onClick={(e) => setExportMenuAnchor(e.currentTarget)}
                variant="outlined"
                disabled={tableMappings.length === 0}
              >
                Export Config
              </Button>
            </Box>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            {tableMappings.filter(m => m.enabled).length} table mappings will be processed
          </Alert>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Source</TableCell>
                  <TableCell>Target</TableCell>
                  <TableCell>Mappings</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tableMappings.map((mapping, index) => (
                  <TableRow key={index}>
                    <TableCell>{mapping.sourceTable}</TableCell>
                    <TableCell>{isa95Entities.find(e => e.tableName === mapping.targetEntity)?.name}</TableCell>
                    <TableCell>{mapping.mappings.length} fields</TableCell>
                    <TableCell>
                      {mapping.enabled ? (
                        <Chip label="Enabled" color="success" size="small" />
                      ) : (
                        <Chip label="Disabled" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {loading && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Migration Progress: {Math.round(migrationProgress)}%
              </Typography>
              <LinearProgress variant="determinate" value={migrationProgress} />
            </Box>
          )}

          {migrationLog.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2, mb: 3, maxHeight: 300, overflow: 'auto', bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom>
                Migration Log
              </Typography>
              {migrationLog.map((log, index) => (
                <Typography key={index} variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
                  {log}
                </Typography>
              ))}
            </Paper>
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<PlayIcon />}
              onClick={executeMigration}
              disabled={loading}
            >
              Start Migration
            </Button>
            {migrationProgress === 100 && (
              <Chip icon={<CheckCircleIcon />} label="Migration Complete" color="success" />
            )}
          </Box>
        </Paper>
      )}

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={activeStep === steps.length - 1}
        >
          Next
        </Button>
      </Box>

      {/* Export Configuration Menu - Available on all steps */}
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={() => setExportMenuAnchor(null)}
      >
        <MenuItem onClick={() => { exportMappingConfiguration('json', 'all'); setExportMenuAnchor(null); }}>
          <ListItemIcon>
            <DescriptionIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Export All as JSON" secondary={`${tableMappings.length} total mappings`} />
        </MenuItem>
        <MenuItem onClick={() => { exportMappingConfiguration('csv', 'all'); setExportMenuAnchor(null); }}>
          <ListItemIcon>
            <TableChartIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Export All as CSV" secondary={`${tableMappings.length} total mappings`} />
        </MenuItem>
        <MenuItem disabled={tableMappings.filter(m => !m.isBridge).length === 0} onClick={() => { exportMappingConfiguration('json', 'source-to-entity'); setExportMenuAnchor(null); }}>
          <ListItemIcon>
            <DescriptionIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Export Source-to-Entity as JSON" secondary={`${tableMappings.filter(m => !m.isBridge).length} mappings`} />
        </MenuItem>
        <MenuItem disabled={tableMappings.filter(m => !m.isBridge).length === 0} onClick={() => { exportMappingConfiguration('csv', 'source-to-entity'); setExportMenuAnchor(null); }}>
          <ListItemIcon>
            <TableChartIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Export Source-to-Entity as CSV" secondary={`${tableMappings.filter(m => !m.isBridge).length} mappings`} />
        </MenuItem>
        <MenuItem disabled={tableMappings.filter(m => m.isBridge).length === 0} onClick={() => { exportMappingConfiguration('json', 'entity-to-entity'); setExportMenuAnchor(null); }}>
          <ListItemIcon>
            <DescriptionIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Export Entity-to-Entity as JSON" secondary={`${tableMappings.filter(m => m.isBridge).length} bridge tables`} />
        </MenuItem>
        <MenuItem disabled={tableMappings.filter(m => m.isBridge).length === 0} onClick={() => { exportMappingConfiguration('csv', 'entity-to-entity'); setExportMenuAnchor(null); }}>
          <ListItemIcon>
            <TableChartIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Export Entity-to-Entity as CSV" secondary={`${tableMappings.filter(m => m.isBridge).length} bridge tables`} />
        </MenuItem>
      </Menu>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />

      {/* Field Rule Configuration Dialog */}
      <Dialog
        open={fieldRuleDialog}
        onClose={() => setFieldRuleDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Configure Field Rule
          {selectedFieldForRule && (
            <Typography variant="caption" display="block" color="text.secondary">
              Field: {selectedFieldForRule.fieldName}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Rule Type</InputLabel>
              <Select
                value={fieldRuleType}
                onChange={(e) => setFieldRuleType(e.target.value as RuleType)}
                label="Rule Type"
              >
                <MenuItem value={RuleType.Range}>Range</MenuItem>
                <MenuItem value={RuleType.Examples}>Examples</MenuItem>
                <MenuItem value={RuleType.Pattern}>Pattern (Regex)</MenuItem>
                <MenuItem value={RuleType.Static}>Static Value</MenuItem>
                <MenuItem value={RuleType.Sequence}>Sequence</MenuItem>
                <MenuItem value={RuleType.PrefixSequence}>Prefix + Sequence</MenuItem>
                <MenuItem value={RuleType.Enumeration}>Enumeration</MenuItem>
              </Select>
            </FormControl>

            {/* Range Parameters */}
            {fieldRuleType === RuleType.Range && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Minimum Value"
                  value={rangeMin}
                  onChange={(e) => setRangeMin(parseFloat(e.target.value))}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Maximum Value"
                  value={rangeMax}
                  onChange={(e) => setRangeMax(parseFloat(e.target.value))}
                />
              </Box>
            )}

            {/* Examples Parameters */}
            {fieldRuleType === RuleType.Examples && (
              <Box>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    fullWidth
                    label="Add Example Value"
                    value={newExampleValue}
                    onChange={(e) => setNewExampleValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddExampleValue()}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleAddExampleValue}
                  >
                    Add
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {exampleValues.map((value, index) => (
                    <Chip
                      key={index}
                      label={value}
                      onDelete={() => handleRemoveExampleValue(index)}
                      sx={{ mb: 1 }}
                    />
                  ))}
                </Box>
                {exampleValues.length === 0 && (
                  <Typography variant="caption" color="text.secondary">
                    Add at least one example value
                  </Typography>
                )}
              </Box>
            )}

            {/* Pattern Parameters */}
            {fieldRuleType === RuleType.Pattern && (
              <TextField
                fullWidth
                label="Regular Expression Pattern"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="^[A-Z]{3}-\\d{4}$"
                helperText="Enter a valid regex pattern for value generation"
              />
            )}

            {/* Static Parameters */}
            {fieldRuleType === RuleType.Static && (
              <TextField
                fullWidth
                label="Static Value"
                value={staticValue}
                onChange={(e) => setStaticValue(e.target.value)}
                helperText="This value will be used for all instances"
              />
            )}

            {/* Sequence Parameters */}
            {fieldRuleType === RuleType.Sequence && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Start Value"
                  value={sequenceStart}
                  onChange={(e) => setSequenceStart(parseInt(e.target.value))}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Increment"
                  value={sequenceIncrement}
                  onChange={(e) => setSequenceIncrement(parseInt(e.target.value))}
                />
              </Box>
            )}

            {/* PrefixSequence Parameters */}
            {fieldRuleType === RuleType.PrefixSequence && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Prefix (Optional)"
                    value={prefixValue}
                    onChange={(e) => setPrefixValue(e.target.value)}
                    placeholder="e.g., MAT-"
                    helperText="Fixed text before the number"
                  />
                  <TextField
                    fullWidth
                    label="Suffix (Optional)"
                    value={suffixValue}
                    onChange={(e) => setSuffixValue(e.target.value)}
                    placeholder="e.g., -A"
                    helperText="Fixed text after the number"
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Start Number"
                    value={seqStart}
                    onChange={(e) => setSeqStart(parseInt(e.target.value))}
                    helperText="First number in sequence"
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label="End Number"
                    value={seqEnd}
                    onChange={(e) => setSeqEnd(parseInt(e.target.value))}
                    helperText="Last number in sequence"
                  />
                </Box>
                <TextField
                  fullWidth
                  type="number"
                  label="Padding (Optional)"
                  value={seqPadding}
                  onChange={(e) => setSeqPadding(parseInt(e.target.value))}
                  placeholder="0"
                  helperText="Number of digits with leading zeros (e.g., 3 = 001, 002, 003)"
                />
                <Alert severity="info" sx={{ mt: 1 }}>
                  Example: Prefix="MAT-", Start=1, End=100, Padding=3, Suffix="-A" → MAT-001-A, MAT-002-A, ..., MAT-100-A
                </Alert>
              </Box>
            )}

            {/* Enumeration Parameters */}
            {fieldRuleType === RuleType.Enumeration && (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  The rule will use the selected enum value for all generated records.
                </Alert>
                {enumValues.length > 0 ? (
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Select a value:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {enumValues.map((value, index) => {
                        const displayValue = typeof value === 'object' ? (value.displayName || value.enumValue || value.name) : value;
                        const actualValue = typeof value === 'object' ? value.enumValue : value;
                        return (
                          <Chip
                            key={index}
                            label={displayValue}
                            size="small"
                            color={staticValue === actualValue ? 'primary' : 'default'}
                            onClick={() => setStaticValue(actualValue)}
                            variant={staticValue === actualValue ? 'filled' : 'outlined'}
                          />
                        );
                      })}
                    </Box>
                    {staticValue && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        Selected: {staticValue}
                      </Alert>
                    )}
                  </Box>
                ) : (
                  <Alert severity="warning">
                    No enum values found for this field. Please ensure the field is an Enum type.
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFieldRuleDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveFieldRule} variant="contained" color="primary">
            Save Rule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Primary Key Rule Configuration Dialog */}
      <Dialog
        open={pkRuleDialog}
        onClose={() => setPkRuleDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Configure Primary Key Rule
          {selectedMappingForPK !== null && (
            <Typography variant="caption" display="block" color="text.secondary">
              Mapping: {tableMappings[selectedMappingForPK]?.sourceTable} → {isa95Entities.find(e => e.tableName === tableMappings[selectedMappingForPK]?.targetEntity)?.name || tableMappings[selectedMappingForPK]?.targetEntity}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {selectedMappingForPK !== null && (
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Target Entity:</strong> {isa95Entities.find(e => e.tableName === tableMappings[selectedMappingForPK]?.targetEntity)?.name || tableMappings[selectedMappingForPK]?.targetEntity}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Configure how primary key values should be generated for all records in this mapping.
                </Typography>
              </Alert>
            )}

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Rule Type</InputLabel>
              <Select
                value={pkRuleType}
                onChange={(e) => setPkRuleType(e.target.value as RuleType)}
                label="Rule Type"
              >
                <MenuItem value={RuleType.Range}>Range</MenuItem>
                <MenuItem value={RuleType.Examples}>Examples</MenuItem>
                <MenuItem value={RuleType.Pattern}>Pattern (Regex)</MenuItem>
                <MenuItem value={RuleType.Static}>Static Value</MenuItem>
                <MenuItem value={RuleType.Sequence}>Sequence</MenuItem>
                <MenuItem value={RuleType.PrefixSequence}>Prefix + Sequence</MenuItem>
                <MenuItem value={'Composite' as any}>Composite (Multiple Fields)</MenuItem>
              </Select>
            </FormControl>

            {/* Range Parameters */}
            {pkRuleType === RuleType.Range && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Minimum Value"
                  value={pkRangeMin}
                  onChange={(e) => setPkRangeMin(parseFloat(e.target.value))}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Maximum Value"
                  value={pkRangeMax}
                  onChange={(e) => setPkRangeMax(parseFloat(e.target.value))}
                />
              </Box>
            )}

            {/* Examples Parameters */}
            {pkRuleType === RuleType.Examples && (
              <Box>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    fullWidth
                    label="Add Example Value"
                    value={pkNewExampleValue}
                    onChange={(e) => setPkNewExampleValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddPKExampleValue()}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleAddPKExampleValue}
                  >
                    Add
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {pkExampleValues.map((value, index) => (
                    <Chip
                      key={index}
                      label={value}
                      onDelete={() => handleRemovePKExampleValue(index)}
                      sx={{ mb: 1 }}
                    />
                  ))}
                </Box>
                {pkExampleValues.length === 0 && (
                  <Typography variant="caption" color="text.secondary">
                    Add at least one example value
                  </Typography>
                )}
              </Box>
            )}

            {/* Pattern Parameters */}
            {pkRuleType === RuleType.Pattern && (
              <TextField
                fullWidth
                label="Regular Expression Pattern"
                value={pkPattern}
                onChange={(e) => setPkPattern(e.target.value)}
                placeholder="^[A-Z]{3}-\\d{4}$"
                helperText="Enter a valid regex pattern for value generation"
              />
            )}

            {/* Static Parameters */}
            {pkRuleType === RuleType.Static && (
              <TextField
                fullWidth
                label="Static Value"
                value={pkStaticValue}
                onChange={(e) => setPkStaticValue(e.target.value)}
                helperText="This value will be used for all primary keys"
              />
            )}

            {/* Sequence Parameters */}
            {pkRuleType === RuleType.Sequence && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Start Value"
                  value={pkSequenceStart}
                  onChange={(e) => setPkSequenceStart(parseInt(e.target.value))}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Increment"
                  value={pkSequenceIncrement}
                  onChange={(e) => setPkSequenceIncrement(parseInt(e.target.value))}
                />
              </Box>
            )}

            {/* PrefixSequence Parameters */}
            {pkRuleType === RuleType.PrefixSequence && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Prefix (Optional)"
                    value={pkPrefixValue}
                    onChange={(e) => setPkPrefixValue(e.target.value)}
                    placeholder="e.g., ID-"
                    helperText="Fixed text before the number"
                  />
                  <TextField
                    fullWidth
                    label="Suffix (Optional)"
                    value={pkSuffixValue}
                    onChange={(e) => setPkSuffixValue(e.target.value)}
                    placeholder="e.g., -2024"
                    helperText="Fixed text after the number"
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Start Number"
                    value={pkSeqStart}
                    onChange={(e) => setPkSeqStart(parseInt(e.target.value))}
                    helperText="First number in sequence"
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label="End Number"
                    value={pkSeqEnd}
                    onChange={(e) => setPkSeqEnd(parseInt(e.target.value))}
                    helperText="Last number in sequence"
                  />
                </Box>
                <TextField
                  fullWidth
                  type="number"
                  label="Padding (Optional)"
                  value={pkSeqPadding}
                  onChange={(e) => setPkSeqPadding(parseInt(e.target.value))}
                  placeholder="3"
                  helperText="Number of digits with leading zeros (e.g., 3 = 001, 002, 003)"
                />
                <Alert severity="info" sx={{ mt: 1 }}>
                  Example: Prefix="ID-", Start=1, End=1000, Padding=4, Suffix="" → ID-0001, ID-0002, ..., ID-1000
                </Alert>
              </Box>
            )}

            {/* Composite Parameters */}
            {pkRuleType === ('Composite' as any) && selectedMappingForPK !== null && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Select fields to combine into a composite primary key. The values will be concatenated with the separator.
                </Alert>
                <FormControl fullWidth>
                  <InputLabel>Select Fields</InputLabel>
                  <Select
                    multiple
                    value={pkCompositeFields}
                    onChange={(e) => setPkCompositeFields(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                    label="Select Fields"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {dataSource?.tables.find(t => t.name === tableMappings[selectedMappingForPK]?.sourceTable)?.columns.map((col) => (
                      <MenuItem key={col.name} value={col.name}>
                        {col.name} ({col.type})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Separator"
                  value={pkCompositeSeparator}
                  onChange={(e) => setPkCompositeSeparator(e.target.value)}
                  placeholder="-"
                  helperText="Character(s) to separate field values"
                />
                {pkCompositeFields.length > 0 && (
                  <Alert severity="success" sx={{ mt: 1 }}>
                    Example: {pkCompositeFields.join(pkCompositeSeparator || '-')}
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPkRuleDialog(false)}>Cancel</Button>
          <Button onClick={handleSavePKRule} variant="contained" color="primary">
            Save Rule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bridge Table Creation Dialog */}
      <Dialog
        open={bridgeDialog}
        onClose={() => setBridgeDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create Bridge Table Mapping</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Alert severity="info">
              Create a bridge/junction table that maps between two ISA95 entities using their primary keys.
            </Alert>

            <FormControl fullWidth>
              <InputLabel>Source Table</InputLabel>
              <Select
                value={selectedSourceTable}
                onChange={(e) => setSelectedSourceTable(e.target.value)}
                label="Source Table"
              >
                {dataSource?.tables.map(table => (
                  <MenuItem key={table.name} value={table.name}>
                    {table.name} ({table.rowCount} rows)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Bridge Table Name"
              value={bridgeName}
              onChange={(e) => setBridgeName(e.target.value)}
              placeholder="e.g., Material Lot_to_Equipment_mapping"
              helperText="Auto-generated from selected entities, but you can modify it"
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>First Entity</InputLabel>
                <Select
                  value={bridgeEntity1}
                  onChange={(e) => {
                    const entity1Name = isa95Entities.find(ent => ent.tableName === e.target.value)?.name || '';
                    setBridgeEntity1(e.target.value);
                    setBridgeEntity1Column('');
                    // Auto-generate bridge name if both entities are selected
                    if (bridgeEntity2) {
                      const entity2Name = isa95Entities.find(ent => ent.tableName === bridgeEntity2)?.name || '';
                      setBridgeName(`${entity1Name}_to_${entity2Name}_mapping`);
                    }
                    // Update available relationships after state is set
                    setTimeout(() => updateAvailableRelationships(), 0);
                  }}
                  label="First Entity"
                >
                  {isa95Entities.map(entity => (
                    <MenuItem key={entity.tableName} value={entity.tableName}>
                      {entity.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Source Column for Entity 1</InputLabel>
                <Select
                  value={bridgeEntity1Column}
                  onChange={(e) => setBridgeEntity1Column(e.target.value)}
                  label="Source Column for Entity 1"
                  disabled={!selectedSourceTable}
                >
                  {dataSource?.tables.find(t => t.name === selectedSourceTable)?.columns.map(col => (
                    <MenuItem key={col.name} value={col.name}>
                      {col.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Second Entity</InputLabel>
                <Select
                  value={bridgeEntity2}
                  onChange={(e) => {
                    const entity2Name = isa95Entities.find(ent => ent.tableName === e.target.value)?.name || '';
                    setBridgeEntity2(e.target.value);
                    setBridgeEntity2Column('');
                    // Auto-generate bridge name if both entities are selected
                    if (bridgeEntity1) {
                      const entity1Name = isa95Entities.find(ent => ent.tableName === bridgeEntity1)?.name || '';
                      setBridgeName(`${entity1Name}_to_${entity2Name}_mapping`);
                    }
                    // Update available relationships after state is set
                    setTimeout(() => updateAvailableRelationships(), 0);
                  }}
                  label="Second Entity"
                >
                  {isa95Entities.map(entity => (
                    <MenuItem key={entity.tableName} value={entity.tableName}>
                      {entity.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Source Column for Entity 2</InputLabel>
                <Select
                  value={bridgeEntity2Column}
                  onChange={(e) => setBridgeEntity2Column(e.target.value)}
                  label="Source Column for Entity 2"
                  disabled={!selectedSourceTable}
                >
                  {dataSource?.tables.find(t => t.name === selectedSourceTable)?.columns.map(col => (
                    <MenuItem key={col.name} value={col.name}>
                      {col.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Autocomplete
              freeSolo
              options={availableRelationships}
              value={relationshipType}
              onInputChange={(event, newValue) => setRelationshipType(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Relationship Type"
                  placeholder="e.g., containsMaterial, uses, produces"
                  helperText={
                    availableRelationships.length > 0
                      ? `${availableRelationships.length} relationship(s) found from entity graph, or type custom value`
                      : "Type a custom relationship value"
                  }
                />
              )}
            />

            {bridgeEntity1 && bridgeEntity2 && bridgeEntity1Column && bridgeEntity2Column && bridgeName && (
              <>
                <Alert severity="success">
                  Will create: <strong>{bridgeName}</strong> with structure:
                  <br />• Source type: {isa95Entities.find(e => e.tableName === bridgeEntity1)?.name}
                  <br />• Source PrimaryKey (lookup from {bridgeEntity1Column})
                  <br />• Target Type: {isa95Entities.find(e => e.tableName === bridgeEntity2)?.name}
                  <br />• Target PrimaryKey (lookup from {bridgeEntity2Column})
                  <br />• Relationship Type: {relationshipType || 'related'}
                </Alert>
                
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={handleGenerateBridgePreview}
                    fullWidth
                  >
                    {showBridgePreview ? 'Refresh Preview' : 'Show Preview'}
                  </Button>
                </Box>

                {showBridgePreview && bridgePreview.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Preview (First {bridgePreview.length} records):
                    </Typography>
                    {bridgePreview.map((preview, idx) => (
                      <Paper key={idx} variant="outlined" sx={{ p: 2, mb: 1, bgcolor: 'grey.50' }}>
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                          Source Record #{idx + 1}:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                          <Chip 
                            label={`${bridgeEntity1Column}: ${preview.sourceRecord[bridgeEntity1Column]}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          <Chip 
                            label={`${bridgeEntity2Column}: ${preview.sourceRecord[bridgeEntity2Column]}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                          Bridge Table Output:
                        </Typography>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Source type</TableCell>
                                <TableCell>Source PrimaryKey</TableCell>
                                <TableCell>Target Type</TableCell>
                                <TableCell>Target PrimaryKey</TableCell>
                                <TableCell>Relationship Type</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              <TableRow>
                                <TableCell>{preview.bridgeMapping['Source type']}</TableCell>
                                <TableCell><strong>{preview.bridgeMapping['Source PrimaryKey']}</strong></TableCell>
                                <TableCell>{preview.bridgeMapping['Target Type']}</TableCell>
                                <TableCell><strong>{preview.bridgeMapping['Target PrimaryKey']}</strong></TableCell>
                                <TableCell>{preview.bridgeMapping['Relationship Type']}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Paper>
                    ))}
                  </Box>
                )}
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBridgeDialog(false)}>Cancel</Button>
          <Button
            onClick={handleAddBridgeMapping}
            variant="contained"
            disabled={!selectedSourceTable || !bridgeEntity1 || !bridgeEntity2 || !bridgeEntity1Column || !bridgeEntity2Column || !bridgeName}
          >
            Create Bridge Mapping
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Table Dialog */}
      <Dialog
        open={importDialog}
        onClose={() => setImportDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Import External Table</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Upload a CSV or JSON file to import as a data source table.
            </Alert>
            <Typography variant="body2" gutterBottom>
              <strong>Supported formats:</strong>
            </Typography>
            <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
              <li><strong>CSV:</strong> First row must contain column headers</li>
              <li><strong>JSON:</strong> Array of objects or object with array property</li>
            </Typography>
            <Box sx={{ mt: 3 }}>
              <input
                accept=".csv,.json"
                style={{ display: 'none' }}
                id="import-file-input"
                type="file"
                onChange={handleImportTable}
              />
              <label htmlFor="import-file-input">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={<UploadFileIcon />}
                  fullWidth
                >
                  Choose File
                </Button>
              </label>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
        </>
      )}
    </Box>
  );
};

export default DataMigration;
