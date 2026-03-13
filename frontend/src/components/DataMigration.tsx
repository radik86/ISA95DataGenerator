import React, { useState, useEffect, useRef } from 'react';
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
  Switch,
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
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';
import { masterDataApi } from '../services/masterDataApi';
import { processDataApi } from '../services/processDataApi';
import { migrationConfigApi } from '../services/migrationConfigApi';
import { migrationApi } from '../services/migrationApi';
import { entitiesApi } from '../api/client';
import { EntityDefinition, AttributeDefinition, RuleType, FieldRule, JoinCondition } from '../types';

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
  bridgeEntity1JoinFields?: BridgeJoinField[]; // Multiple join fields for Entity 1 lookup
  bridgeEntity1UsePKRule?: boolean; // If true, use the PK rule from bridgeEntity1's mapping
  bridgeEntity2?: string;
  bridgeEntity2Column?: string;
  bridgeEntity2JoinFields?: BridgeJoinField[]; // Multiple join fields for Entity 2 lookup
  bridgeEntity2UsePKRule?: boolean; // If true, use the PK rule from bridgeEntity2's mapping
  relationshipType?: string; // For bridge tables
  filters?: TableFilter[]; // Add filters for source table
}

interface BridgeJoinField {
  bridgeField: string; // Field from bridge table
  bridgePrefix?: string; // Optional prefix to concatenate to bridge field value
  bridgeSuffix?: string; // Optional suffix to concatenate to bridge field value
  entityField: string; // Field from entity table to match against
  entityPrefix?: string; // Optional prefix to concatenate to entity field value
  entitySuffix?: string; // Optional suffix to concatenate to entity field value
}

interface TableFilter {
  column: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'is_null' | 'is_not_null' | 'is_empty' | 'is_not_empty';
  value?: string;
  enabled: boolean;
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

const MASTER_STORE_MAP: Record<string, string> = {
  'material_classes': 'materialClasses',
  'materials': 'materials',
  'material_lots': 'materialLots',
  'material_sublots': 'materialSublots',
  'material_definition_properties': 'materialDefinitionProperties',
  'material_class_properties': 'materialClassProperties',
  'material_class_properties_assignments': 'materialClassPropertiesAssignments',
  'material_definition_property_assignments': 'materialDefinitionPropertyAssignments',
  'equipment_classes': 'equipmentClasses',
  'equipment': 'equipment',
  'equipment_properties': 'equipmentProperties',
  'equipment_property_assignments': 'equipmentPropertyAssignments',
  'equipment_class_properties': 'equipmentClassProperties',
  'equipment_class_property_assignments': 'equipmentClassPropertyAssignments',
  'plants': 'plants',
  'production_lines': 'productionLines',
  'process_segments': 'processSegments',
  'line_equipment': 'lineEquipment',
  'segment_boms': 'segmentBOMs',
  'equipment_usages': 'equipmentUsages',
  'operation_event_definitions': 'operationEventDefinitions',
  'operation_event_def_segment_assignments': 'operationEventDefSegmentAssignments',
  'operation_event_definition_properties': 'operationEventDefinitionProperties',
  'operation_event_definition_property_assignments': 'operationEventDefinitionPropertyAssignments',
  'hierarchy_scopes': 'hierarchyScopes',
  'hierarchy_scope_parent_child': 'hierarchyScopeParentChild',
  'shifts': 'shifts',
  'crews': 'crews',
  'shift_crew_assignments': 'shiftCrewAssignments',
  'operations_event_classes': 'operationsEventClasses',
};

const PROCESS_STORE_MAP: Record<string, string> = {
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
  'operations_events': 'operationsEvents',
  'operations_event_records': 'operationsEventRecords',
  'operations_event_entries': 'operationsEventEntries',
  'operations_event_properties': 'operationsEventProperties',
  'segment_data': 'segmentData',
};

const DataMigration: React.FC = () => {
  const hasLoadedMappingsRef = useRef(false);
  const sourceDataCacheRef = useRef<Record<string, any[]>>({});
  const [activeStep, setActiveStep] = useState(0);
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const [tableMappings, setTableMappings] = useState<TableMapping[]>([]);
  const [loadedMappingsCount, setLoadedMappingsCount] = useState<number | null>(null);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [maxSplitFileSizeMB, setMaxSplitFileSizeMB] = useState(10);
  const [uploadChunkSize, setUploadChunkSize] = useState(5000);
  const [separateMasterProcessFiles, setSeparateMasterProcessFiles] = useState(false);
  const [migrationLoadMode, setMigrationLoadMode] = useState<'full' | 'delta'>('delta');
  const [sourceIncludeTimestampSuffix, setSourceIncludeTimestampSuffix] = useState(false);
  const [sourceSplitFiles, setSourceSplitFiles] = useState(false);
  const [migrationLog, setMigrationLog] = useState<string[]>([]);
  const [failedMigrationItems, setFailedMigrationItems] = useState<string[]>([]);
  const [skippedMigrationItems, setSkippedMigrationItems] = useState<string[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [selectedSourceTable, setSelectedSourceTable] = useState('');
  const [selectedTargetEntity, setSelectedTargetEntity] = useState('');
  const [mappingDialog, setMappingDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
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
  const [importedTablesData, setImportedTablesData] = useState<{ [tableName: string]: any[] }>({});
  const [bridgeDialog, setBridgeDialog] = useState(false);
  const [isBridgeMode, setIsBridgeMode] = useState(false);
  const [bridgeEntity1, setBridgeEntity1] = useState('');
  const [bridgeEntity1Column, setBridgeEntity1Column] = useState('');
  const [bridgeEntity1JoinFields, setBridgeEntity1JoinFields] = useState<BridgeJoinField[]>([{ bridgeField: '', entityField: '' }]);
  const [bridgeEntity1UsePKRule, setBridgeEntity1UsePKRule] = useState(false);
  const [bridgeEntity2, setBridgeEntity2] = useState('');
  const [bridgeEntity2Column, setBridgeEntity2Column] = useState('');
  const [bridgeEntity2JoinFields, setBridgeEntity2JoinFields] = useState<BridgeJoinField[]>([{ bridgeField: '', entityField: '' }]);
  const [bridgeEntity2UsePKRule, setBridgeEntity2UsePKRule] = useState(false);
  const [bridgeName, setBridgeName] = useState('');
  const [relationshipType, setRelationshipType] = useState('related');
  const [bridgePreview, setBridgePreview] = useState<any[]>([]);
  const [showBridgePreview, setShowBridgePreview] = useState(false);
  const [availableRelationships, setAvailableRelationships] = useState<string[]>([]);
  const [expandedMappings, setExpandedMappings] = useState<Set<number>>(new Set());
  const [expandedBridgeMappings, setExpandedBridgeMappings] = useState<Set<number>>(new Set());
  const [editingBridgeIndex, setEditingBridgeIndex] = useState<number | null>(null);
  
  // Bridge table source data previews
  const [bridgeSourcePreview, setBridgeSourcePreview] = useState<any[]>([]);
  const [entity1SourcePreview, setEntity1SourcePreview] = useState<any[]>([]);
  const [entity2SourcePreview, setEntity2SourcePreview] = useState<any[]>([]);
  const [showSourcePreviews, setShowSourcePreviews] = useState(false);
  
  // Table filtering and sorting
  const [tableFilter, setTableFilter] = useState('');
  const [tableSortBy, setTableSortBy] = useState<'name' | 'rows'>('name');
  const [tableSortOrder, setTableSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Mapping filtering and sorting
  const [mappingFilter, setMappingFilter] = useState('');
  const [mappingSortBy, setMappingSortBy] = useState<'source' | 'target'>('source');
  const [mappingSortOrder, setMappingSortOrder] = useState<'asc' | 'desc'>('asc');
  
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
  
  // IfThen rule parameters
  const [ifThenSourceField, setIfThenSourceField] = useState('');
  const [ifThenSourceFields, setIfThenSourceFields] = useState<string[]>([]);
  const [ifThenCondition, setIfThenCondition] = useState('');
  const [ifThenTrueValue, setIfThenTrueValue] = useState('');
  const [ifThenFalseValue, setIfThenFalseValue] = useState('');
  
  // Case rule parameters
  const [caseSourceField, setCaseSourceField] = useState('');
  const [caseCases, setCaseCases] = useState<Array<{ case: string; value: string }>>([{ case: '', value: '' }]);
  const [caseDefaultValue, setCaseDefaultValue] = useState('');
  const [caseDefaultValueType, setCaseDefaultValueType] = useState<'static' | 'field'>('static');
  const [caseDefaultFieldName, setCaseDefaultFieldName] = useState('');
  
  // Coalesce rule parameters
  const [coalesceSourceFields, setCoalesceSourceFields] = useState<string[]>(['']);
  const [coalesceDefaultValue, setCoalesceDefaultValue] = useState('');
  
  // Concat rule parameters
  const [concatSourceFields, setConcatSourceFields] = useState<string[]>(['']);
  const [concatSeparator, setConcatSeparator] = useState('');
  const [concatPrefix, setConcatPrefix] = useState('');
  const [concatSuffix, setConcatSuffix] = useState('');
  
  // Lookup rule parameters
  const [lookupSourceTable, setLookupSourceTable] = useState('');
  const [lookupJoinType, setLookupJoinType] = useState<'field' | 'composite' | 'concatenation'>('field');
  const [lookupLocalField, setLookupLocalField] = useState('');
  const [lookupSourceField, setLookupSourceField] = useState('');
  const [lookupLocalFields, setLookupLocalFields] = useState<string[]>(['']);
  const [lookupSourceFields, setLookupSourceFields] = useState<string[]>(['']);
  const [lookupLocalExpression, setLookupLocalExpression] = useState('');
  const [lookupSourceExpression, setLookupSourceExpression] = useState('');
  const [lookupReturnField, setLookupReturnField] = useState('');
  const [lookupDefaultValue, setLookupDefaultValue] = useState('');
  const [lookupMultipleMatchBehavior, setLookupMultipleMatchBehavior] = useState<'first' | 'last' | 'random' | 'error'>('first');
  
  // Multiple Lookups rule parameters
  const [multipleLookupSteps, setMultipleLookupSteps] = useState<Array<{
    lookupTable: string;
    joinType: 'field' | 'composite' | 'concatenation';
    localField: string;
    sourceField: string;
    localFields: string[];
    sourceFields: string[];
    localExpression: string;
    sourceExpression: string;
    returnField: string;
    isIntermediateStep: boolean;
  }>>([{
    lookupTable: '',
    joinType: 'field',
    localField: '',
    sourceField: '',
    localFields: [''],
    sourceFields: [''],
    localExpression: '',
    sourceExpression: '',
    returnField: '',
    isIntermediateStep: true
  }]);
  const [multipleLookupsDefaultValue, setMultipleLookupsDefaultValue] = useState('');
  const [multipleLookupsMultipleMatchBehavior, setMultipleLookupsMultipleMatchBehavior] = useState<'first' | 'last' | 'random' | 'error'>('first');
  
  // Preview state
  const [previewDialog, setPreviewDialog] = useState(false);
  const [previewMappingIndex, setPreviewMappingIndex] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  
  // Field rule preview state
  const [fieldRulePreviewData, setFieldRulePreviewData] = useState<Array<{source: any, transformed: string}>>([]);
  const [showFieldRulePreview, setShowFieldRulePreview] = useState(false);

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

  // Filter dialog states
  const [filterDialog, setFilterDialog] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<{
    mappingIndex: number;
    filterIndex: number;
  } | null>(null);
  const [pkPrefixValue, setPkPrefixValue] = useState('');
  const [pkSuffixValue, setPkSuffixValue] = useState('');
  const [pkSeqStart, setPkSeqStart] = useState(1);
  const [pkSeqEnd, setPkSeqEnd] = useState(100);
  const [pkSeqPadding, setPkSeqPadding] = useState(3);
  const [pkCompositeFields, setPkCompositeFields] = useState<string[]>([]);
  const [pkCompositeSeparator, setPkCompositeSeparator] = useState('-');
  const [pkCompositeConcatFields, setPkCompositeConcatFields] = useState<Array<{fieldName: string; prefix?: string; suffix?: string}>>([]);
  const [pkCompositeConcatSeparator, setPkCompositeConcatSeparator] = useState('-');
  const [pkCompositeConcatGlobalPrefix, setPkCompositeConcatGlobalPrefix] = useState('');
  const [pkCompositeConcatGlobalSuffix, setPkCompositeConcatGlobalSuffix] = useState('');

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
    // Load data with retry mechanism
    const loadWithRetry = async (retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          await loadCurrentDataAsSource();
          await loadSavedMappings();
          break; // Success, exit retry loop
        } catch (error) {
          console.error(`Data loading attempt ${i + 1} failed:`, error);
          if (i === retries - 1) {
            // Last attempt failed
            setSnackbar({
              open: true,
              message: 'Failed to load data sources. Please refresh the page.',
              severity: 'error',
            });
          } else {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          }
        }
      }
    };

    loadWithRetry();
  }, []);

  // Load saved mappings from IndexedDB
  const loadSavedMappings = async () => {
    try {
      const savedMappings = await migrationConfigApi.loadCurrentMappings();
      if (savedMappings.length > 0) {
        // Ensure each mapping has sourceTimeStamp field if it doesn't already
        const updatedMappings = savedMappings.map(mapping => {
          const hasSourceTimestamp = mapping.fieldMappings.some(
            fm => fm.fieldName === 'sourceTimeStamp'
          );
          
          if (!hasSourceTimestamp) {
            // Add sourceTimeStamp field to existing mappings
            return {
              ...mapping,
              fieldMappings: [
                ...mapping.fieldMappings,
                {
                  fieldName: 'sourceTimeStamp',
                  sourceColumn: undefined,
                  generate: false,
                }
              ]
            };
          }
          
          return mapping;
        });
        
        setTableMappings(updatedMappings);
        setLoadedMappingsCount(updatedMappings.length);
        console.log(`Loaded ${updatedMappings.length} saved mappings from database (updated with sourceTimeStamp field)`);
      } else {
        setLoadedMappingsCount(0);
      }
    } catch (error) {
      console.error('Error loading saved mappings:', error);
    } finally {
      hasLoadedMappingsRef.current = true;
    }
  };

  // Save mappings to IndexedDB whenever they change
  useEffect(() => {
    if (!hasLoadedMappingsRef.current) {
      return;
    }

    const saveMappings = async () => {
      try {
        await migrationConfigApi.saveCurrentMappings(tableMappings);
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
      setLoadError(false);
      console.log('[DataMigration] Loading all tables from Master Data and Process Data databases...');
      
      // Get all available stores dynamically from both databases
      const masterDataStores = [
        'materialClasses', 'materials', 'materialLots', 'materialSublots',
        'materialClassProperties', 'materialClassPropertiesAssignments',
        'materialDefinitionProperties', 'materialDefinitionPropertyAssignments',
        'equipmentClasses', 'equipment', 'equipmentProperties', 
        'equipmentPropertyAssignments', 'plants', 'productionLines',
        'lineEquipment', 'processSegments', 'segmentBOMs', 'equipmentUsages',
        'operationEventDefinitions', 'operationEventDefSegmentAssignments',
        'operationEventDefinitionProperties', 'operationEventDefinitionPropertyAssignments',
        'operationsEventClasses',
        'shifts', 'crews', 'shiftCrewAssignments',
        'hierarchyScopes', 'hierarchyScopeParentChild'
      ];
      
      const processDataStores = [
        'operationsRequests', 'segmentRequirements', 
        'segmentMaterialRequirements', 'segmentEquipmentRequirements',
        'operationsResponses', 'segmentResponses', 
        'segmentMaterialActuals', 'segmentEquipmentActuals',
        'equipmentPropertyTracking', 'testResults', 'operationsEvents', 
        'operationsEventRecords', 'operationsEventEntries', 'operationsEventProperties', 'segmentData'
      ];
      
      // Load only metadata counts up front. Full table data is loaded lazily.
      const masterDataResults: { [key: string]: any[] } = {};
      console.log('[DataMigration] Loading master/process summaries...');
      const processDataResults: { [key: string]: any[] } = {};
      const [masterSummary, processSummary] = await Promise.all([
        masterDataApi.getSummary(masterDataStores),
        processDataApi.getSummary(processDataStores as any),
      ]);

      for (const storeName of masterDataStores) {
        const count = Number(masterSummary?.[storeName] || 0);
        // Keep only count metadata to avoid allocating huge sparse arrays.
        masterDataResults[storeName] = ({ length: Math.max(0, count) } as any[]);
      }

      for (const storeName of processDataStores) {
        const count = Number(processSummary?.[storeName] || 0);
        // Keep only count metadata to avoid allocating huge sparse arrays.
        processDataResults[storeName] = ({ length: Math.max(0, count) } as any[]);
      }
      
      sourceDataCacheRef.current = {};
      console.log('[DataMigration] Summaries loaded, building table metadata...');
      
      // For backwards compatibility, keep these variables
      const materialClasses = masterDataResults['materialClasses'];
      const materials = masterDataResults['materials'];
      const materialLots = masterDataResults['materialLots'];
      const materialSublots = masterDataResults['materialSublots'];
      console.log('[DataMigration] Material Sublots count:', materialSublots?.length || 0);
      const materialDefinitionProperties = masterDataResults['materialDefinitionProperties'];
      const materialDefinitionPropertyAssignments = masterDataResults['materialDefinitionPropertyAssignments'];
      const materialClassProperties = masterDataResults['materialClassProperties'];
      const materialClassPropertiesAssignments = masterDataResults['materialClassPropertiesAssignments'];
      const equipmentClasses = masterDataResults['equipmentClasses'];
      const equipment = masterDataResults['equipment'];
      const equipmentProperties = masterDataResults['equipmentProperties'];
      const equipmentPropertyAssignments = masterDataResults['equipmentPropertyAssignments'];
      const equipmentClassProperties = masterDataResults['equipmentClassProperties'];
      const equipmentClassPropertyAssignments = masterDataResults['equipmentClassPropertiesAssignments'];
      const plants = masterDataResults['plants'];
      const productionLines = masterDataResults['productionLines'];
      const processSegments = masterDataResults['processSegments'];
      const operationsRequests = processDataResults['operationsRequests'];
      const segmentRequirements = processDataResults['segmentRequirements'];
      const segmentMaterialRequirements = processDataResults['segmentMaterialRequirements'];
      const segmentEquipmentRequirements = processDataResults['segmentEquipmentRequirements'];
      const operationsResponses = processDataResults['operationsResponses'];
      const segmentResponses = processDataResults['segmentResponses'];
      const segmentMaterialActuals = processDataResults['segmentMaterialActuals'];
      const segmentEquipmentActuals = processDataResults['segmentEquipmentActuals'];
      const equipmentPropertyTracking = processDataResults['equipmentPropertyTracking'];
      const testResults = processDataResults['testResults'];
      const operationsEvents = processDataResults['operationsEvents'];
      const operationsEventRecords = processDataResults['operationsEventRecords'];
      const operationsEventEntries = processDataResults['operationsEventEntries'];
      const operationsEventProperties = processDataResults['operationsEventProperties'];
      const segmentData = processDataResults['segmentData'];

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
              { name: 'supplierOrProducerId', type: 'string', sample: materialLots[0]?.supplierOrProducerId },
              { name: 'supplierOrProducerName', type: 'string', sample: materialLots[0]?.supplierOrProducerName },
              { name: 'producedByProcessSegmentId', type: 'string', sample: materialLots[0]?.producedByProcessSegmentId },
              { name: 'parentLotId', type: 'string', sample: materialLots[0]?.parentLotId },
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
          name: 'material_definition_properties',
          rowCount: materialDefinitionProperties?.length || 0,
          columns: [
            { name: 'id', type: 'string', sample: materialDefinitionProperties?.[0]?.id },
            { name: 'value', type: 'string', sample: materialDefinitionProperties?.[0]?.value },
            { name: 'description', type: 'string', sample: materialDefinitionProperties?.[0]?.description },
            { name: 'valueUnitOfMeasure', type: 'string', sample: materialDefinitionProperties?.[0]?.valueUnitOfMeasure },
          ],
        },
        {
          name: 'material_class_properties',
          rowCount: materialClassProperties?.length || 0,
          columns: [
            { name: 'id', type: 'string', sample: materialClassProperties?.[0]?.id },
            { name: 'propertyName', type: 'string', sample: materialClassProperties?.[0]?.propertyName },
            { name: 'description', type: 'string', sample: materialClassProperties?.[0]?.description },
            { name: 'valueDataType', type: 'string', sample: materialClassProperties?.[0]?.valueDataType },
            { name: 'unit', type: 'string', sample: materialClassProperties?.[0]?.unit },
            { name: 'minValue', type: 'string', sample: materialClassProperties?.[0]?.minValue },
            { name: 'maxValue', type: 'string', sample: materialClassProperties?.[0]?.maxValue },
          ],
        },
        {
          name: 'material_class_properties_assignments',
          rowCount: materialClassPropertiesAssignments?.length || 0,
          columns: [
            { name: 'id', type: 'string', sample: materialClassPropertiesAssignments?.[0]?.id },
            { name: 'materialClassPropertyId', type: 'string', sample: materialClassPropertiesAssignments?.[0]?.materialClassPropertyId },
            { name: 'materialDefinitionPropertyId', type: 'string', sample: materialClassPropertiesAssignments?.[0]?.materialDefinitionPropertyId },
          ],
        },
        {
          name: 'material_definition_property_assignments',
          rowCount: materialDefinitionPropertyAssignments?.length || 0,
          columns: [
            { name: 'id', type: 'string', sample: materialDefinitionPropertyAssignments?.[0]?.id },
            { name: 'materialDefinitionPropertyId', type: 'string', sample: materialDefinitionPropertyAssignments?.[0]?.materialDefinitionPropertyId },
            { name: 'materialDefinitionId', type: 'string', sample: materialDefinitionPropertyAssignments?.[0]?.materialDefinitionId },
            { name: 'value', type: 'string', sample: materialDefinitionPropertyAssignments?.[0]?.value },
            { name: 'description', type: 'string', sample: materialDefinitionPropertyAssignments?.[0]?.description },
            { name: 'valueUnitOfMeasure', type: 'string', sample: materialDefinitionPropertyAssignments?.[0]?.valueUnitOfMeasure },
          ],
        },
        {
          name: 'equipment_classes',
          rowCount: equipmentClasses.length,
          columns: [
            { name: 'id', type: 'string', sample: equipmentClasses[0]?.id },
            { name: 'name', type: 'string', sample: equipmentClasses[0]?.name },
            { name: 'description', type: 'string', sample: equipmentClasses[0]?.description },
            { name: 'parentId', type: 'string', sample: equipmentClasses[0]?.parentId },
          ],
        },
        {
          name: 'equipment',
          rowCount: equipment.length,
          columns: [
            { name: 'id', type: 'string', sample: equipment[0]?.id },
            { name: 'name', type: 'string', sample: equipment[0]?.name },
            { name: 'classId', type: 'string', sample: equipment[0]?.classId },
            { name: 'className', type: 'string', sample: equipment[0]?.className },
            { name: 'description', type: 'string', sample: equipment[0]?.description },
            { name: 'productionLineId', type: 'string', sample: equipment[0]?.productionLineId },
            { name: 'parentEquipmentId', type: 'string', sample: equipment[0]?.parentEquipmentId },
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
            { name: 'minValue', type: 'string', sample: equipmentProperties[0]?.minValue?.toString() },
            { name: 'maxValue', type: 'string', sample: equipmentProperties[0]?.maxValue?.toString() },
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
          name: 'equipment_class_properties',
          rowCount: equipmentClassProperties?.length || 0,
          columns: [
            { name: 'id', type: 'string', sample: equipmentClassProperties?.[0]?.id },
            { name: 'equipmentClassId', type: 'string', sample: equipmentClassProperties?.[0]?.equipmentClassId },
            { name: 'propertyName', type: 'string', sample: equipmentClassProperties?.[0]?.propertyName },
            { name: 'description', type: 'string', sample: equipmentClassProperties?.[0]?.description },
            { name: 'valueDataType', type: 'string', sample: equipmentClassProperties?.[0]?.valueDataType },
            { name: 'unit', type: 'string', sample: equipmentClassProperties?.[0]?.unit },
            { name: 'minValue', type: 'string', sample: equipmentClassProperties?.[0]?.minValue?.toString() },
            { name: 'maxValue', type: 'string', sample: equipmentClassProperties?.[0]?.maxValue?.toString() },
          ],
        },
        {
          name: 'equipment_class_property_assignments',
          rowCount: equipmentClassPropertyAssignments?.length || 0,
          columns: [
            { name: 'id', type: 'string', sample: equipmentClassPropertyAssignments?.[0]?.id },
            { name: 'equipmentClassPropertyId', type: 'string', sample: equipmentClassPropertyAssignments?.[0]?.equipmentClassPropertyId },
            { name: 'equipmentPropertyId', type: 'string', sample: equipmentClassPropertyAssignments?.[0]?.equipmentPropertyId },
            { name: 'propertyName', type: 'string', sample: equipmentClassPropertyAssignments?.[0]?.propertyName },
            { name: 'description', type: 'string', sample: equipmentClassPropertyAssignments?.[0]?.description },
            { name: 'valueDataType', type: 'string', sample: equipmentClassPropertyAssignments?.[0]?.valueDataType },
            { name: 'unit', type: 'string', sample: equipmentClassPropertyAssignments?.[0]?.unit },
            { name: 'minValue', type: 'string', sample: equipmentClassPropertyAssignments?.[0]?.minValue?.toString() },
            { name: 'maxValue', type: 'string', sample: equipmentClassPropertyAssignments?.[0]?.maxValue?.toString() },
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
            { name: 'plantId', type: 'string', sample: operationsRequests[0]?.plantId },
            { name: 'lineId', type: 'string', sample: operationsRequests[0]?.lineId },
            { name: 'plannedStartDateTime', type: 'datetime', sample: operationsRequests[0]?.plannedStartDateTime },
            { name: 'plannedEndDateTime', type: 'datetime', sample: operationsRequests[0]?.plannedEndDateTime },
            { name: 'operationsType', type: 'string', sample: operationsRequests[0]?.operationsType },
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
            { name: 'equipmentId', type: 'string', sample: segmentRequirements[0]?.equipmentId },
            { name: 'sequence', type: 'number', sample: segmentRequirements[0]?.sequence?.toString() },
            { name: 'earliestStartDateTime', type: 'datetime', sample: segmentRequirements[0]?.earliestStartDateTime },
            { name: 'latestEndDateTime', type: 'datetime', sample: segmentRequirements[0]?.latestEndDateTime },
            { 
              name: 'durationHours', 
              type: 'number', 
              sample: segmentRequirements[0]?.earliestStartDateTime && segmentRequirements[0]?.latestEndDateTime
                ? ((new Date(segmentRequirements[0].latestEndDateTime).getTime() - new Date(segmentRequirements[0].earliestStartDateTime).getTime()) / (1000 * 60 * 60)).toFixed(2)
                : '0'
            },
            { name: 'targetQuantity', type: 'number', sample: segmentRequirements[0]?.targetQuantity?.toString() },
            { name: 'quantityUoM', type: 'string', sample: segmentRequirements[0]?.quantityUoM },
            { name: 'operationsType', type: 'string', sample: segmentRequirements[0]?.operationsType },
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
            { name: 'requirementType', type: 'string', sample: segmentMaterialRequirements[0]?.requirementType },
            { name: 'operationsType', type: 'string', sample: segmentMaterialRequirements[0]?.operationsType },
          ],
        },
        {
          name: 'segment_equipment_requirements',
          rowCount: segmentEquipmentRequirements.length,
          columns: [
            { name: 'id', type: 'string', sample: segmentEquipmentRequirements[0]?.id },
            { name: 'segmentRequirementId', type: 'string', sample: segmentEquipmentRequirements[0]?.segmentRequirementId },
            { name: 'equipmentId', type: 'string', sample: segmentEquipmentRequirements[0]?.equipmentId },
            { name: 'plannedQuantity', type: 'number', sample: segmentEquipmentRequirements[0]?.plannedQuantity?.toString() },
            { name: 'unitOfMeasure', type: 'string', sample: segmentEquipmentRequirements[0]?.unitOfMeasure },
            { name: 'operationsType', type: 'string', sample: segmentEquipmentRequirements[0]?.operationsType },
          ],
        },
        {
          name: 'operations_responses',
          rowCount: operationsResponses.length,
          columns: [
            { name: 'id', type: 'string', sample: operationsResponses[0]?.id },
            { name: 'operationsRequestId', type: 'string', sample: operationsResponses[0]?.operationsRequestId },
            { name: 'plantId', type: 'string', sample: operationsResponses[0]?.plantId },
            { name: 'productionLineId', type: 'string', sample: operationsResponses[0]?.productionLineId },
            { name: 'actualStartDateTime', type: 'datetime', sample: operationsResponses[0]?.actualStartDateTime },
            { name: 'actualEndDateTime', type: 'datetime', sample: operationsResponses[0]?.actualEndDateTime },
            { name: 'operationsType', type: 'string', sample: operationsResponses[0]?.operationsType },
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
            { name: 'equipmentId', type: 'string', sample: segmentResponses[0]?.equipmentId },
            { name: 'actualStartDateTime', type: 'datetime', sample: segmentResponses[0]?.actualStartDateTime },
            { name: 'actualEndDateTime', type: 'datetime', sample: segmentResponses[0]?.actualEndDateTime },
            { name: 'operationsType', type: 'string', sample: segmentResponses[0]?.operationsType },
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
            { name: 'operationsType', type: 'string', sample: segmentMaterialActuals[0]?.operationsType },
          ],
        },
        {
          name: 'segment_equipment_actuals',
          rowCount: segmentEquipmentActuals.length,
          columns: [
            { name: 'id', type: 'string', sample: segmentEquipmentActuals[0]?.id },
            { name: 'segmentResponseId', type: 'string', sample: segmentEquipmentActuals[0]?.segmentResponseId },
            { name: 'equipmentId', type: 'string', sample: segmentEquipmentActuals[0]?.equipmentId },
            { name: 'actualQuantity', type: 'number', sample: segmentEquipmentActuals[0]?.actualQuantity?.toString() },
            { name: 'unitOfMeasure', type: 'string', sample: segmentEquipmentActuals[0]?.unitOfMeasure },
            { name: 'operationsType', type: 'string', sample: segmentEquipmentActuals[0]?.operationsType },
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
            { name: 'equipmentPropertyName', type: 'string', sample: equipmentPropertyTracking[0]?.equipmentPropertyName },
            { name: 'equipmentClassId', type: 'string', sample: equipmentPropertyTracking[0]?.equipmentClassId },
            { name: 'equipmentClassPropertyId', type: 'string', sample: equipmentPropertyTracking[0]?.equipmentClassPropertyId },
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
        {
          name: 'operations_events',
          rowCount: operationsEvents?.length || 0,
          columns: [
            { name: 'id', type: 'string', sample: operationsEvents?.[0]?.id },
            { name: 'segmentResponseId', type: 'string', sample: operationsEvents?.[0]?.segmentResponseId },
            { name: 'operationsEventDefinitionId', type: 'string', sample: operationsEvents?.[0]?.operationsEventDefinitionId },
            { name: 'effectiveTimestamp', type: 'datetime', sample: operationsEvents?.[0]?.effectiveTimestamp },
            { name: 'notes', type: 'string', sample: operationsEvents?.[0]?.notes },
            { name: 'eventType', type: 'string', sample: operationsEvents?.[0]?.eventType },
            { name: 'operationsType', type: 'string', sample: operationsEvents?.[0]?.operationsType },
            { name: 'equipmentId', type: 'string', sample: operationsEvents?.[0]?.equipmentId },
            { name: 'hierarchyScope', type: 'string', sample: operationsEvents?.[0]?.hierarchyScope },
          ],
        },
        {
          name: 'operations_event_records',
          rowCount: operationsEventRecords?.length || 0,
          columns: [
            { name: 'id', type: 'string', sample: operationsEventRecords?.[0]?.id },
            { name: 'operationsEventId', type: 'string', sample: operationsEventRecords?.[0]?.operationsEventId },
            { name: 'operationsEventDefinitionId', type: 'string', sample: operationsEventRecords?.[0]?.operationsEventDefinitionId },
            { name: 'severity', type: 'string', sample: operationsEventRecords?.[0]?.severity },
            { name: 'status', type: 'string', sample: operationsEventRecords?.[0]?.status },
            { name: 'effectiveTime', type: 'datetime', sample: operationsEventRecords?.[0]?.effectiveTime },
            { name: 'segmentResponseId', type: 'string', sample: operationsEventRecords?.[0]?.segmentResponseId },
            { name: 'equipmentId', type: 'string', sample: operationsEventRecords?.[0]?.equipmentId },
            { name: 'comments', type: 'string', sample: operationsEventRecords?.[0]?.comments },
            { name: 'eventType', type: 'string', sample: operationsEventRecords?.[0]?.eventType },
          ],
        },
        {
          name: 'operations_event_entries',
          rowCount: operationsEventEntries?.length || 0,
          columns: [
            { name: 'id', type: 'string', sample: operationsEventEntries?.[0]?.id },
            { name: 'operationsEventRecordId', type: 'string', sample: operationsEventEntries?.[0]?.operationsEventRecordId },
            { name: 'entryType', type: 'string', sample: operationsEventEntries?.[0]?.entryType },
            { name: 'effectiveTime', type: 'datetime', sample: operationsEventEntries?.[0]?.effectiveTime },
            { name: 'segmentResponseId', type: 'string', sample: operationsEventEntries?.[0]?.segmentResponseId },
            { name: 'equipmentId', type: 'string', sample: operationsEventEntries?.[0]?.equipmentId },
            { name: 'description', type: 'string', sample: operationsEventEntries?.[0]?.description },
          ],
        },
        {
          name: 'operations_event_properties',
          rowCount: operationsEventProperties?.length || 0,
          columns: [
            { name: 'id', type: 'string', sample: operationsEventProperties?.[0]?.id },
            { name: 'operationsEventId', type: 'string', sample: operationsEventProperties?.[0]?.operationsEventId },
            { name: 'operationsEventDefinitionPropertyId', type: 'string', sample: operationsEventProperties?.[0]?.operationsEventDefinitionPropertyId },
            { name: 'value', type: 'string', sample: operationsEventProperties?.[0]?.value },
            { name: 'valueUnitOfMeasure', type: 'string', sample: operationsEventProperties?.[0]?.valueUnitOfMeasure },
            { name: 'effectiveTime', type: 'datetime', sample: operationsEventProperties?.[0]?.effectiveTime },
          ],
        },
        {
          name: 'segment_data',
          rowCount: segmentData?.length || 0,
          columns: [
            { name: 'id', type: 'string', sample: segmentData?.[0]?.id },
            { name: 'segmentResponseId', type: 'string', sample: segmentData?.[0]?.segmentResponseId },
            { name: 'recordType', type: 'string', sample: segmentData?.[0]?.recordType },
            { name: 'shiftId', type: 'string', sample: segmentData?.[0]?.shiftId },
            { name: 'crewId', type: 'string', sample: segmentData?.[0]?.crewId },
            { name: 'startDateTime', type: 'datetime', sample: segmentData?.[0]?.startDateTime },
            { name: 'endDateTime', type: 'datetime', sample: segmentData?.[0]?.endDateTime },
            { name: 'notes', type: 'string', sample: segmentData?.[0]?.notes },
          ],
        },
      ];
      
      // Add additional tables from newly loaded stores
      const additionalTables: SourceTable[] = [];
      
      // Add lineEquipment if available
      if (masterDataResults['lineEquipment']?.length > 0) {
        const lineEquipment = masterDataResults['lineEquipment'];
        additionalTables.push({
          name: 'line_equipment',
          rowCount: lineEquipment.length,
          columns: [
            { name: 'id', type: 'string', sample: lineEquipment[0]?.id },
            { name: 'productionLineId', type: 'string', sample: lineEquipment[0]?.productionLineId },
            { name: 'equipmentId', type: 'string', sample: lineEquipment[0]?.equipmentId },
          ],
        });
      }
      
      // Add segmentBOMs if available
      if (masterDataResults['segmentBOMs']?.length > 0) {
        const segmentBOMs = masterDataResults['segmentBOMs'];
        additionalTables.push({
          name: 'segment_boms',
          rowCount: segmentBOMs.length,
          columns: [
            { name: 'id', type: 'string', sample: segmentBOMs[0]?.id },
            { name: 'processSegmentId', type: 'string', sample: segmentBOMs[0]?.processSegmentId },
            { name: 'materialId', type: 'string', sample: segmentBOMs[0]?.materialId },
            { name: 'quantity', type: 'number', sample: segmentBOMs[0]?.quantity?.toString() },
            { name: 'quantityUoM', type: 'string', sample: segmentBOMs[0]?.quantityUoM },
            { name: 'materialUse', type: 'string', sample: segmentBOMs[0]?.materialUse },
          ],
        });
      }
      
      // Add equipmentUsages if available
      if (masterDataResults['equipmentUsages']?.length > 0) {
        const equipmentUsages = masterDataResults['equipmentUsages'];
        additionalTables.push({
          name: 'equipment_usages',
          rowCount: equipmentUsages.length,
          columns: [
            { name: 'id', type: 'string', sample: equipmentUsages[0]?.id },
            { name: 'processSegmentId', type: 'string', sample: equipmentUsages[0]?.processSegmentId },
            { name: 'equipmentId', type: 'string', sample: equipmentUsages[0]?.equipmentId },
            { name: 'durationHours', type: 'number', sample: equipmentUsages[0]?.durationHours?.toString() },
          ],
        });
      }
      
      // Add operationEventDefinitions if available
      if (masterDataResults['operationEventDefinitions']?.length > 0) {
        const operationEventDefinitions = masterDataResults['operationEventDefinitions'];
        additionalTables.push({
          name: 'operation_event_definitions',
          rowCount: operationEventDefinitions.length,
          columns: [
            { name: 'id', type: 'string', sample: operationEventDefinitions[0]?.id },
            { name: 'eventCode', type: 'string', sample: operationEventDefinitions[0]?.eventCode },
            { name: 'description', type: 'string', sample: operationEventDefinitions[0]?.description },
            { name: 'eventCategory', type: 'string', sample: operationEventDefinitions[0]?.eventCategory },
            { name: 'rootCauseType', type: 'string', sample: operationEventDefinitions[0]?.rootCauseType },
            { name: 'eventType', type: 'string', sample: operationEventDefinitions[0]?.eventType },
            { name: 'causesDowntime', type: 'boolean', sample: String(operationEventDefinitions[0]?.causesDowntime) },
            { name: 'causesScrap', type: 'boolean', sample: String(operationEventDefinitions[0]?.causesScrap) },
          ],
        });
      }
      
      // Add operationEventDefSegmentAssignments if available
      if (masterDataResults['operationEventDefSegmentAssignments']?.length > 0) {
        const assignments = masterDataResults['operationEventDefSegmentAssignments'];
        additionalTables.push({
          name: 'operation_event_def_segment_assignments',
          rowCount: assignments.length,
          columns: [
            { name: 'id', type: 'string', sample: assignments[0]?.id },
            { name: 'operationEventDefinitionId', type: 'string', sample: assignments[0]?.operationEventDefinitionId },
            { name: 'processSegmentId', type: 'string', sample: assignments[0]?.processSegmentId },
            { name: 'startOrEndEvent', type: 'string', sample: assignments[0]?.startOrEndEvent },
            { name: 'isMandatory', type: 'boolean', sample: assignments[0]?.isMandatory },
            { name: 'isPrimarySegment', type: 'boolean', sample: assignments[0]?.isPrimarySegment },
            { name: 'notes', type: 'string', sample: assignments[0]?.notes },
          ],
        });
      }

      // Add operationEventDefinitionProperties if available
      if (masterDataResults['operationEventDefinitionProperties']?.length > 0) {
        const properties = masterDataResults['operationEventDefinitionProperties'];
        additionalTables.push({
          name: 'operation_event_definition_properties',
          rowCount: properties.length,
          columns: [
            { name: 'id', type: 'string', sample: properties[0]?.id },
            { name: 'possibleValues', type: 'string', sample: properties[0]?.possibleValues },
            { name: 'valueUnitOfMeasure', type: 'string', sample: properties[0]?.valueUnitOfMeasure },
          ],
        });
      }

      // Add operationEventDefinitionPropertyAssignments if available
      if (masterDataResults['operationEventDefinitionPropertyAssignments']?.length > 0) {
        const assignments = masterDataResults['operationEventDefinitionPropertyAssignments'];
        additionalTables.push({
          name: 'operation_event_definition_property_assignments',
          rowCount: assignments.length,
          columns: [
            { name: 'id', type: 'string', sample: assignments[0]?.id },
            { name: 'operationsEventDefinitionId', type: 'string', sample: assignments[0]?.operationsEventDefinitionId },
            { name: 'operationsEventDefinitionPropertyId', type: 'string', sample: assignments[0]?.operationsEventDefinitionPropertyId },
            { name: 'value', type: 'string', sample: assignments[0]?.value },
            { name: 'valueUnitOfMeasure', type: 'string', sample: assignments[0]?.valueUnitOfMeasure },
          ],
        });
      }
      
      // Add operationsEvents if available
      if (processDataResults['operationsEvents']?.length > 0) {
        const operationsEvents = processDataResults['operationsEvents'];
        additionalTables.push({
          name: 'operations_events',
          rowCount: operationsEvents.length,
          columns: [
            { name: 'id', type: 'string', sample: operationsEvents[0]?.id },
            { name: 'segmentResponseId', type: 'string', sample: operationsEvents[0]?.segmentResponseId },
            { name: 'operationsEventDefinitionId', type: 'string', sample: operationsEvents[0]?.operationsEventDefinitionId },
            { name: 'effectiveTimestamp', type: 'datetime', sample: operationsEvents[0]?.effectiveTimestamp },
            { name: 'notes', type: 'string', sample: operationsEvents[0]?.notes },
            { name: 'eventType', type: 'string', sample: operationsEvents[0]?.eventType },
            { name: 'equipmentId', type: 'string', sample: operationsEvents[0]?.equipmentId },
            { name: 'hierarchyScope', type: 'string', sample: operationsEvents[0]?.hierarchyScope },
          ],
        });
      }

      // Add segmentData (shifts and crews) if available
      if (processDataResults['segmentData']?.length > 0) {
        const segmentData = processDataResults['segmentData'];
        additionalTables.push({
          name: 'segment_data',
          rowCount: segmentData.length,
          columns: [
            { name: 'id', type: 'string', sample: segmentData[0]?.id },
            { name: 'segmentResponseId', type: 'string', sample: segmentData[0]?.segmentResponseId },
            { name: 'recordType', type: 'string', sample: segmentData[0]?.recordType },
            { name: 'shiftId', type: 'string', sample: segmentData[0]?.shiftId },
            { name: 'crewId', type: 'string', sample: segmentData[0]?.crewId },
            { name: 'startDateTime', type: 'datetime', sample: segmentData[0]?.startDateTime },
            { name: 'endDateTime', type: 'datetime', sample: segmentData[0]?.endDateTime },
            { name: 'notes', type: 'string', sample: segmentData[0]?.notes },
          ],
        });
      }

      // Add operations event classes if available
      if (masterDataResults['operationsEventClasses']?.length > 0) {
        const operationsEventClasses = masterDataResults['operationsEventClasses'];
        additionalTables.push({
          name: 'operations_event_classes',
          rowCount: operationsEventClasses.length,
          columns: [
            { name: 'OperationsEventClassID', type: 'string', sample: operationsEventClasses[0]?.OperationsEventClassID },
            { name: 'ClassName', type: 'string', sample: operationsEventClasses[0]?.ClassName },
            { name: 'Description', type: 'string', sample: operationsEventClasses[0]?.Description },
          ],
        });
      }

      // Add hierarchyScopes if available
      if (masterDataResults['hierarchyScopes']?.length > 0) {
        const hierarchyScopes = masterDataResults['hierarchyScopes'];
        additionalTables.push({
          name: 'hierarchy_scopes',
          rowCount: hierarchyScopes.length,
          columns: [
            { name: 'id', type: 'string', sample: hierarchyScopes[0]?.id },
            { name: 'equipmentID', type: 'string', sample: hierarchyScopes[0]?.equipmentID },
            { name: 'equipmentLevel', type: 'string', sample: hierarchyScopes[0]?.equipmentLevel },
          ],
        });
      }

      // Add shifts if available
      if (masterDataResults['shifts']?.length > 0) {
        const shifts = masterDataResults['shifts'];
        additionalTables.push({
          name: 'shifts',
          rowCount: shifts.length,
          columns: [
            { name: 'id', type: 'string', sample: shifts[0]?.id },
            { name: 'shiftNumber', type: 'string', sample: shifts[0]?.shiftNumber },
            { name: 'shiftName', type: 'string', sample: shifts[0]?.shiftName },
            { name: 'startTime', type: 'string', sample: shifts[0]?.startTime },
            { name: 'endTime', type: 'string', sample: shifts[0]?.endTime },
            { name: 'description', type: 'string', sample: shifts[0]?.description },
          ],
        });
      }

      // Add crews if available
      if (masterDataResults['crews']?.length > 0) {
        const crews = masterDataResults['crews'];
        additionalTables.push({
          name: 'crews',
          rowCount: crews.length,
          columns: [
            { name: 'id', type: 'string', sample: crews[0]?.id },
            { name: 'crewName', type: 'string', sample: crews[0]?.crewName },
            { name: 'peopleCount', type: 'number', sample: crews[0]?.peopleCount },
            { name: 'skills', type: 'string', sample: crews[0]?.skills },
            { name: 'description', type: 'string', sample: crews[0]?.description },
          ],
        });
      }

      // Add shift crew assignments if available
      if (masterDataResults['shiftCrewAssignments']?.length > 0) {
        const shiftCrewAssignments = masterDataResults['shiftCrewAssignments'];
        additionalTables.push({
          name: 'shift_crew_assignments',
          rowCount: shiftCrewAssignments.length,
          columns: [
            { name: 'id', type: 'string', sample: shiftCrewAssignments[0]?.id },
            { name: 'shiftId', type: 'string', sample: shiftCrewAssignments[0]?.shiftId },
            { name: 'crewId', type: 'string', sample: shiftCrewAssignments[0]?.crewId },
            { name: 'effectiveDate', type: 'string', sample: shiftCrewAssignments[0]?.effectiveDate },
            { name: 'expiryDate', type: 'string', sample: shiftCrewAssignments[0]?.expiryDate },
          ],
        });
      }

      // Add hierarchyScopeParentChild if available
      if (masterDataResults['hierarchyScopeParentChild']?.length > 0) {
        const hierarchyScopeParentChild = masterDataResults['hierarchyScopeParentChild'];
        additionalTables.push({
          name: 'hierarchy_scope_parent_child',
          rowCount: hierarchyScopeParentChild.length,
          columns: [
            { name: 'id', type: 'string', sample: hierarchyScopeParentChild[0]?.id },
            { name: 'parentEquipmentLevel', type: 'string', sample: hierarchyScopeParentChild[0]?.parentEquipmentLevel },
            { name: 'parentEquipmentID', type: 'string', sample: hierarchyScopeParentChild[0]?.parentEquipmentID },
            { name: 'childEquipmentLevel', type: 'string', sample: hierarchyScopeParentChild[0]?.childEquipmentLevel },
            { name: 'childEquipmentID', type: 'string', sample: hierarchyScopeParentChild[0]?.childEquipmentID },
          ],
        });
      }
      
      console.log(`[DataMigration] Loaded ${tables.length} base tables + ${additionalTables.length} additional tables`);

      const source: DataSource = {
        name: 'Current Application Data (Master + Process)',
        tables: [...tables, ...additionalTables, ...importedTables],
      };

      setDataSource(source);
      setLoading(false);
      setLoadError(false);
      console.log(`[DataMigration] Data source refreshed with ${source.tables.length} total tables`);
    } catch (error) {
      console.error('Failed to load data source:', error);
      setLoadError(true);
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
      setImportedTablesData(prev => ({ ...prev, [tableName]: parsedData }));
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
    setImportedTablesData(prev => {
      const newData = { ...prev };
      delete newData[tableName];
      return newData;
    });
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
        // Try multiple matching strategies
        const matchingField = targetEntity.fields.find(
          f => {
            const fieldLower = f.name.toLowerCase();
            const colLower = col.name.toLowerCase();
            
            // Strategy 1: Direct match (case-insensitive)
            if (fieldLower === colLower) return true;
            
            // Strategy 2: snake_case to camelCase conversion
            const colCamelCase = colLower.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            if (fieldLower === colCamelCase) return true;
            
            // Strategy 3: camelCase to snake_case conversion
            const fieldSnakeCase = fieldLower.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
            if (fieldSnakeCase === colLower) return true;
            
            return false;
          }
        );
        
        if (matchingField) {
          console.log(`[Auto-Mapping] Matched column "${col.name}" to field "${matchingField.name}"`);
        } else {
          console.log(`[Auto-Mapping] No match found for column "${col.name}"`);
        }
        
        return matchingField ? {
          sourceColumn: col.name,
          targetField: matchingField.name,
        } : null;
      })
      .filter(m => m !== null) as ColumnMapping[];
    
    console.log(`[Auto-Mapping] Created ${autoMappings.length} auto-mappings for ${selectedTargetEntity}`);

    // Initialize field mappings for all target fields
    const fieldMappings: FieldMapping[] = targetEntity.fields.map(field => {
      const autoMappedColumn = autoMappings.find(m => m.targetField === field.name);
      return {
        fieldName: field.name,
        sourceColumn: autoMappedColumn?.sourceColumn,
        generate: field.required || !!autoMappedColumn, // Auto-enable required fields or auto-mapped fields
      };
    });

    // Add PrimaryKey as a separate field
    fieldMappings.push({
      fieldName: 'PrimaryKey',
      sourceColumn: undefined,
      generate: false, // Will be generated by PK rule
    });

    // Add sourceTimeStamp as a regular field
    fieldMappings.push({
      fieldName: 'sourceTimeStamp',
      sourceColumn: undefined,
      generate: false, // Off by default
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
    // Validate required fields
    if (!selectedSourceTable || !bridgeEntity1 || !bridgeEntity2 || !bridgeName) {
      showSnackbar('Please fill all required bridge table fields', 'error');
      return;
    }
    
    // Validate Entity 1 has at least one complete join field
    const validEntity1Joins = bridgeEntity1JoinFields.filter(f => f.bridgeField && f.entityField);
    if (validEntity1Joins.length === 0) {
      showSnackbar('Please configure at least one join field for Entity 1', 'error');
      return;
    }
    
    // Validate Entity 2 has at least one complete join field
    const validEntity2Joins = bridgeEntity2JoinFields.filter(f => f.bridgeField && f.entityField);
    if (validEntity2Joins.length === 0) {
      showSnackbar('Please configure at least one join field for Entity 2', 'error');
      return;
    }
    
    // Check if entity mappings exist
    const entity1Mapping = tableMappings.find(m => m.targetEntity === bridgeEntity1);
    const entity2Mapping = tableMappings.find(m => m.targetEntity === bridgeEntity2);
    
    if (!entity1Mapping) {
      showSnackbar(`Entity mapping for ${bridgeEntity1} not found. Please create it in Step 2 first.`, 'error');
      return;
    }
    
    if (!entity2Mapping) {
      showSnackbar(`Entity mapping for ${bridgeEntity2} not found. Please create it in Step 2 first.`, 'error');
      return;
    }

    const sourceTable = dataSource?.tables.find(t => t.name === selectedSourceTable);
    if (!sourceTable) return;

    const entity1 = isa95Entities.find(e => e.tableName === bridgeEntity1 || e.name === bridgeEntity1);
    const entity2 = isa95Entities.find(e => e.tableName === bridgeEntity2 || e.name === bridgeEntity2);

    if (!entity1 || !entity2) return;

    // Create field mappings for bridge table with proper structure
    const fieldMappings: FieldMapping[] = [
      {
        fieldName: 'Source type',
        sourceColumn: undefined,
        generate: true,
        fieldRule: { ruleType: RuleType.Static, parameters: { value: entity1.name } }
      },
      {
        fieldName: 'Source PrimaryKey',
        sourceColumn: bridgeEntity1Column, // Lookup column from source
        generate: true,
      },
      {
        fieldName: 'Target Type',
        sourceColumn: undefined,
        generate: true,
        fieldRule: { ruleType: RuleType.Static, parameters: { value: entity2.name } }
      },
      {
        fieldName: 'Target PrimaryKey',
        sourceColumn: bridgeEntity2Column, // Lookup column from source
        generate: true,
      },
      {
        fieldName: 'Relationship Type',
        sourceColumn: undefined,
        generate: true,
        fieldRule: { ruleType: RuleType.Static, parameters: { value: relationshipType || 'related' } }
      },
      {
        fieldName: 'PrimaryKey',
        sourceColumn: undefined,
        generate: false,
      },
      {
        fieldName: 'sourceTimeStamp',
        sourceColumn: undefined,
        generate: false,
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
      bridgeEntity1JoinFields: bridgeEntity1JoinFields.filter(f => f.bridgeField && f.entityField), // Only save non-empty join fields
      bridgeEntity1UsePKRule: bridgeEntity1UsePKRule,
      bridgeEntity2: bridgeEntity2,
      bridgeEntity2Column: bridgeEntity2Column,
      bridgeEntity2JoinFields: bridgeEntity2JoinFields.filter(f => f.bridgeField && f.entityField), // Only save non-empty join fields
      bridgeEntity2UsePKRule: bridgeEntity2UsePKRule,
      relationshipType: relationshipType || 'related',
    };

    if (editingBridgeIndex !== null) {
      // Update existing mapping
      const updated = [...tableMappings];
      updated[editingBridgeIndex] = newMapping;
      setTableMappings(updated);
      showSnackbar('Bridge mapping updated successfully', 'success');
    } else {
      // Add new mapping
      setTableMappings([...tableMappings, newMapping]);
      showSnackbar('Bridge mapping added successfully', 'success');
    }
    
    setBridgeDialog(false);
    setSelectedSourceTable('');
    setBridgeEntity1('');
    setBridgeEntity1Column('');
    setBridgeEntity1JoinFields([{ bridgeField: '', entityField: '' }]);
    setBridgeEntity1UsePKRule(false);
    setBridgeEntity2('');
    setBridgeEntity2Column('');
    setBridgeEntity2JoinFields([{ bridgeField: '', entityField: '' }]);
    setBridgeEntity2UsePKRule(false);
    setBridgeName('');
    setRelationshipType('related');
    setEditingBridgeIndex(null);
    setIsBridgeMode(false);
    setEditingBridgeIndex(null);
    // Reset source previews
    setBridgeSourcePreview([]);
    setEntity1SourcePreview([]);
    setEntity2SourcePreview([]);
    setShowSourcePreviews(false);
  };

  // Update available relationships based on selected entities
  const updateAvailableRelationships = () => {
    if (!bridgeEntity1 || !bridgeEntity2) {
      setAvailableRelationships([]);
      return;
    }

    const entity1 = isa95Entities.find(e => e.tableName === bridgeEntity1 || e.name === bridgeEntity1);
    const entity2 = isa95Entities.find(e => e.tableName === bridgeEntity2 || e.name === bridgeEntity2);
    
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

  // Load source data previews for bridge dialog
  const handleLoadBridgeSourcePreviews = async () => {
    try {
      const getTableData = async (tableName: string): Promise<any[]> => loadSourceData(tableName, { limit: 1000 });

      // Load bridge source table data
      if (selectedSourceTable) {
        console.log('[Bridge Preview] Loading bridge source table:', selectedSourceTable);
        const bridgeData = await getTableData(selectedSourceTable);
        console.log('[Bridge Preview] Bridge source data loaded:', bridgeData.length, 'rows');
        if (bridgeData.length > 0) {
          console.log('[Bridge Preview] Sample bridge row:', bridgeData[0]);
        }
        setBridgeSourcePreview(bridgeData.slice(0, 10));
      }

      // Load Entity 1 TRANSFORMED data (with field rules, PK rules, and filters applied)
      if (bridgeEntity1) {
        // Find ALL mappings for this entity (there can be multiple source tables for the same target entity)
        const entity1Mappings = tableMappings.filter(m => !m.isBridge && m.targetEntity === bridgeEntity1);
        console.log('[Bridge Preview] Entity 1 mapping lookup:', { 
          bridgeEntity1, 
          entity1MappingsCount: entity1Mappings.length,
          entity1Mappings: entity1Mappings.map(m => ({ target: m.targetEntity, source: m.sourceTable })),
          allNonBridgeMappings: tableMappings.filter(m => !m.isBridge).map(m => ({ target: m.targetEntity, source: m.sourceTable }))
        });
        
        if (entity1Mappings.length > 0) {
          // Combine data from all mappings for this entity
          const allEntity1Transformed: any[] = [];
          
          for (const entity1Mapping of entity1Mappings) {
            let entity1SourceData = await getTableData(entity1Mapping.sourceTable);
            
            // Apply filters if they exist
            const enabledFilters = entity1Mapping.filters?.filter(f => f.enabled) || [];
            if (enabledFilters.length > 0) {
              entity1SourceData = applyFilters(entity1SourceData, enabledFilters);
              console.log(`[Bridge Preview] Entity 1 from ${entity1Mapping.sourceTable}: after filters ${entity1SourceData.length} rows`);
            }
            
            console.log(`[Bridge Preview] Entity 1 loading from source: ${entity1Mapping.sourceTable}, rows: ${entity1SourceData.length}`);
            
            if (entity1SourceData.length > 0) {
              // Transform entity data with field rules, PK rules, and filters
              const entity1Transformed = entity1SourceData.map((srcRecord: any) => {
                const transformed: any = {};
                entity1Mapping.fieldMappings?.forEach((fm) => {
                  if (fm.generate) {
                    if (fm.fieldRule) {
                      transformed[fm.fieldName] = generateValueFromRule(fm.fieldRule, srcRecord, 0, transformed);
                    } else if (fm.sourceColumn) {
                      transformed[fm.fieldName] = srcRecord[fm.sourceColumn];
                    }
                  }
                });
                if (entity1Mapping.primaryKeyRule) {
                  transformed['PrimaryKey'] = generateValueFromRule(entity1Mapping.primaryKeyRule, srcRecord, 0, transformed);
                }
                return transformed;
              });
              
              allEntity1Transformed.push(...entity1Transformed);
              console.log(`[Bridge Preview] Entity 1 from ${entity1Mapping.sourceTable}: added ${entity1Transformed.length} transformed rows`);
            }
          }
          
          console.log('[Bridge Preview] Entity 1 total transformed rows:', allEntity1Transformed.length, 'sample:', allEntity1Transformed[0]);
          setEntity1SourcePreview(allEntity1Transformed.slice(0, 10));
        } else {
          console.warn('[Bridge Preview] No non-bridge mapping found for Entity 1:', bridgeEntity1, 'Available entities:', tableMappings.filter(m => !m.isBridge).map(m => m.targetEntity));
          setEntity1SourcePreview([]);
        }
      }

      // Load Entity 2 TRANSFORMED data (with field rules, PK rules, and filters applied)
      if (bridgeEntity2) {
        // Find ALL mappings for this entity (there can be multiple source tables for the same target entity)
        const entity2Mappings = tableMappings.filter(m => !m.isBridge && m.targetEntity === bridgeEntity2);
        console.log('[Bridge Preview] Entity 2 mapping lookup:', { 
          bridgeEntity2, 
          entity2MappingsCount: entity2Mappings.length,
          entity2Mappings: entity2Mappings.map(m => ({ target: m.targetEntity, source: m.sourceTable })),
          allNonBridgeMappings: tableMappings.filter(m => !m.isBridge).map(m => ({ target: m.targetEntity, source: m.sourceTable }))
        });
        
        if (entity2Mappings.length > 0) {
          // Combine data from all mappings for this entity
          const allEntity2Transformed: any[] = [];
          
          for (const entity2Mapping of entity2Mappings) {
            let entity2SourceData = await getTableData(entity2Mapping.sourceTable);
            
            // Apply filters if they exist
            const enabledFilters = entity2Mapping.filters?.filter(f => f.enabled) || [];
            if (enabledFilters.length > 0) {
              entity2SourceData = applyFilters(entity2SourceData, enabledFilters);
              console.log(`[Bridge Preview] Entity 2 from ${entity2Mapping.sourceTable}: after filters ${entity2SourceData.length} rows`);
            }
            
            console.log(`[Bridge Preview] Entity 2 loading from source: ${entity2Mapping.sourceTable}, rows: ${entity2SourceData.length}`);
            
            if (entity2SourceData.length > 0) {
              // Transform entity data with field rules, PK rules, and filters
              const entity2Transformed = entity2SourceData.map((srcRecord: any) => {
                const transformed: any = {};
                entity2Mapping.fieldMappings?.forEach((fm) => {
                  if (fm.generate) {
                    if (fm.fieldRule) {
                      transformed[fm.fieldName] = generateValueFromRule(fm.fieldRule, srcRecord, 0, transformed);
                    } else if (fm.sourceColumn) {
                      transformed[fm.fieldName] = srcRecord[fm.sourceColumn];
                    }
                  }
                });
                if (entity2Mapping.primaryKeyRule) {
                  transformed['PrimaryKey'] = generateValueFromRule(entity2Mapping.primaryKeyRule, srcRecord, 0, transformed);
                }
                return transformed;
              });
              
              allEntity2Transformed.push(...entity2Transformed);
              console.log(`[Bridge Preview] Entity 2 from ${entity2Mapping.sourceTable}: added ${entity2Transformed.length} transformed rows`);
            }
          }
          
          console.log('[Bridge Preview] Entity 2 total transformed rows:', allEntity2Transformed.length, 'sample:', allEntity2Transformed[0]);
          setEntity2SourcePreview(allEntity2Transformed.slice(0, 10));
        } else {
          console.warn('[Bridge Preview] No non-bridge mapping found for Entity 2:', bridgeEntity2, 'Available entities:', tableMappings.filter(m => !m.isBridge).map(m => m.targetEntity));
          setEntity2SourcePreview([]);
        }
      }

      setShowSourcePreviews(true);
    } catch (error) {
      console.error('[Bridge Preview] Error loading source data:', error);
      showSnackbar('Error loading source data previews', 'error');
    }
  };

  const handleGenerateBridgePreview = async () => {
    console.log('[Bridge Preview] Generating bridge table preview:', {
      selectedSourceTable,
      bridgeEntity1,
      bridgeEntity2,
      bridgeEntity1JoinFields,
      bridgeEntity2JoinFields,
      bridgeEntity1UsePKRule,
      bridgeEntity2UsePKRule
    });
    if (!selectedSourceTable || !bridgeEntity1 || !bridgeEntity2) {
      return;
    }
    
    // Validate that join fields are configured for each entity
    const hasEntity1JoinFields = bridgeEntity1JoinFields.some(f => f.bridgeField && f.entityField);
    const hasEntity2JoinFields = bridgeEntity2JoinFields.some(f => f.bridgeField && f.entityField);
    
    if (!hasEntity1JoinFields) {
      showSnackbar('Please configure join fields for Entity 1', 'error');
      return;
    }
    if (!hasEntity2JoinFields) {
      showSnackbar('Please configure join fields for Entity 2', 'error');
      return;
    }

    try {
      const sourceData = await loadSourceData(selectedSourceTable);
      const entity1 = isa95Entities.find(e => e.tableName === bridgeEntity1 || e.name === bridgeEntity1);
      const entity2 = isa95Entities.find(e => e.tableName === bridgeEntity2 || e.name === bridgeEntity2);
      
      if (!entity1 || !entity2) return;

      // Find ALL entity mappings for join-based lookups (there can be multiple source tables for same target entity)
      const entity1Mappings = tableMappings.filter(m => !m.isBridge && m.targetEntity === bridgeEntity1);
      const entity2Mappings = tableMappings.filter(m => !m.isBridge && m.targetEntity === bridgeEntity2);
      
      console.log('[Bridge Dialog Preview] Entity mappings found:', {
        entity1MappingsCount: entity1Mappings.length,
        entity2MappingsCount: entity2Mappings.length
      });
      
      // Load and transform entity data for lookups - combine data from ALL mappings
      let entity1TransformedData: any[] = [];
      let entity2TransformedData: any[] = [];
      
      if (entity1Mappings.length > 0 && bridgeEntity1JoinFields.filter(f => f.bridgeField && f.entityField).length > 0) {
        for (const entity1Mapping of entity1Mappings) {
          let entity1SourceData = await loadSourceData(entity1Mapping.sourceTable);
          
          // Apply filters if they exist
          const enabledFilters = entity1Mapping.filters?.filter(f => f.enabled) || [];
          if (enabledFilters.length > 0) {
            entity1SourceData = applyFilters(entity1SourceData, enabledFilters);
            console.log(`[Bridge Dialog Preview] Entity 1 from ${entity1Mapping.sourceTable}: after filters ${entity1SourceData.length} rows`);
          }
          
          const transformed = entity1SourceData.map((srcRecord: any) => {
            const entityTransformed: any = {};
            entity1Mapping.fieldMappings?.forEach((fm) => {
              if (fm.generate) {
                if (fm.fieldRule) {
                  entityTransformed[fm.fieldName] = generateValueFromRule(fm.fieldRule, srcRecord, 0, entityTransformed);
                } else if (fm.sourceColumn) {
                  entityTransformed[fm.fieldName] = srcRecord[fm.sourceColumn];
                }
              }
            });
            if (entity1Mapping.primaryKeyRule) {
              entityTransformed['PrimaryKey'] = generateValueFromRule(entity1Mapping.primaryKeyRule, srcRecord, 0, entityTransformed);
            }
            return entityTransformed;
          });
          
          entity1TransformedData.push(...transformed);
        }
        console.log('[Bridge Dialog Preview] Entity 1 total transformed:', entity1TransformedData.length, 'sample:', entity1TransformedData[0]);
      }
      
      if (entity2Mappings.length > 0 && bridgeEntity2JoinFields.filter(f => f.bridgeField && f.entityField).length > 0) {
        for (const entity2Mapping of entity2Mappings) {
          let entity2SourceData = await loadSourceData(entity2Mapping.sourceTable);
          
          // Apply filters if they exist
          const enabledFilters = entity2Mapping.filters?.filter(f => f.enabled) || [];
          if (enabledFilters.length > 0) {
            entity2SourceData = applyFilters(entity2SourceData, enabledFilters);
            console.log(`[Bridge Dialog Preview] Entity 2 from ${entity2Mapping.sourceTable}: after filters ${entity2SourceData.length} rows`);
          }
          
          const transformed = entity2SourceData.map((srcRecord: any) => {
            const entityTransformed: any = {};
            entity2Mapping.fieldMappings?.forEach((fm) => {
              if (fm.generate) {
                if (fm.fieldRule) {
                  entityTransformed[fm.fieldName] = generateValueFromRule(fm.fieldRule, srcRecord, 0, entityTransformed);
                } else if (fm.sourceColumn) {
                  entityTransformed[fm.fieldName] = srcRecord[fm.sourceColumn];
                }
              }
            });
            if (entity2Mapping.primaryKeyRule) {
              entityTransformed['PrimaryKey'] = generateValueFromRule(entity2Mapping.primaryKeyRule, srcRecord, 0, entityTransformed);
            }
            return entityTransformed;
          });
          
          entity2TransformedData.push(...transformed);
        }
        console.log('[Bridge Dialog Preview] Entity 2 total transformed:', entity2TransformedData.length, 'sample:', entity2TransformedData[0]);
      }

      // Get first 5 records for preview with join lookups
      const validJoinFields1 = bridgeEntity1JoinFields.filter(f => f.bridgeField && f.entityField);
      const validJoinFields2 = bridgeEntity2JoinFields.filter(f => f.bridgeField && f.entityField);
      
      console.log('[Bridge Preview] Join fields:', { 
        validJoinFields1: validJoinFields1.map(jf => `${jf.bridgeField}=${jf.entityField}`), 
        validJoinFields2: validJoinFields2.map(jf => `${jf.bridgeField}=${jf.entityField}`)
      });
      console.log('[Bridge Preview] Entity 1 data count:', entity1TransformedData.length, 'sample:', entity1TransformedData[0]);
      console.log('[Bridge Preview] Entity 1 available field names:', entity1TransformedData.length > 0 ? Object.keys(entity1TransformedData[0]) : 'no data');
      console.log('[Bridge Preview] Entity 2 data count:', entity2TransformedData.length, 'sample:', entity2TransformedData[0]);
      console.log('[Bridge Preview] Entity 2 available field names:', entity2TransformedData.length > 0 ? Object.keys(entity2TransformedData[0]) : 'no data');
      console.log('[Bridge Preview] Bridge source data count:', sourceData.length, 'sample:', sourceData[0]);
      console.log('[Bridge Preview] Bridge source available field names:', sourceData.length > 0 ? Object.keys(sourceData[0]) : 'no data');
      
      const previewData = sourceData.slice(0, 5).map((record: any, idx: number) => {
        let sourcePK: string = '(No join configured)';
        let targetPK: string = '(No join configured)';
        
        // Lookup Source PrimaryKey via join - use loose comparison with string conversion
        if (validJoinFields1.length > 0 && entity1TransformedData.length > 0) {
          const matchingEntity1 = entity1TransformedData.find((entityRecord: any) => {
            return validJoinFields1.every(joinField => {
              // Apply prefix/suffix to bridge field value
              let bridgeValue = String(record[joinField.bridgeField] ?? '').trim();
              if (joinField.bridgePrefix) bridgeValue = joinField.bridgePrefix + bridgeValue;
              if (joinField.bridgeSuffix) bridgeValue = bridgeValue + joinField.bridgeSuffix;
              bridgeValue = bridgeValue.toLowerCase();
              
              // Apply prefix/suffix to entity field value
              let entityValue = String(entityRecord[joinField.entityField] ?? '').trim();
              if (joinField.entityPrefix) entityValue = joinField.entityPrefix + entityValue;
              if (joinField.entitySuffix) entityValue = entityValue + joinField.entitySuffix;
              entityValue = entityValue.toLowerCase();
              
              const match = bridgeValue === entityValue;
              if (idx === 0) {
                console.log(`[Bridge Preview] Entity 1 Join check: bridge.${joinField.bridgeField}="${bridgeValue}" vs entity.${joinField.entityField}="${entityValue}" => ${match}`);
              }
              return match;
            });
          });
          if (idx === 0 && !matchingEntity1) {
            console.log('[Bridge Preview] Entity 1 - No match found. Sample entity field values:', 
              entity1TransformedData.slice(0, 3).map(e => validJoinFields1.map(jf => `${jf.entityField}="${e[jf.entityField]}"`).join(', '))
            );
          }
          sourcePK = matchingEntity1?.['PrimaryKey'] || '(No match found)';
        }
        
        // Lookup Target PrimaryKey via join - use loose comparison with string conversion
        if (validJoinFields2.length > 0 && entity2TransformedData.length > 0) {
          const matchingEntity2 = entity2TransformedData.find((entityRecord: any) => {
            return validJoinFields2.every(joinField => {
              // Apply prefix/suffix to bridge field value
              let bridgeValue = String(record[joinField.bridgeField] ?? '').trim();
              if (joinField.bridgePrefix) bridgeValue = joinField.bridgePrefix + bridgeValue;
              if (joinField.bridgeSuffix) bridgeValue = bridgeValue + joinField.bridgeSuffix;
              bridgeValue = bridgeValue.toLowerCase();
              
              // Apply prefix/suffix to entity field value
              let entityValue = String(entityRecord[joinField.entityField] ?? '').trim();
              if (joinField.entityPrefix) entityValue = joinField.entityPrefix + entityValue;
              if (joinField.entitySuffix) entityValue = entityValue + joinField.entitySuffix;
              entityValue = entityValue.toLowerCase();
              
              const match = bridgeValue === entityValue;
              if (idx === 0) {
                console.log(`[Bridge Preview] Entity 2 Join check: bridge.${joinField.bridgeField}="${bridgeValue}" vs entity.${joinField.entityField}="${entityValue}" => ${match}`);
              }
              return match;
            });
          });
          if (idx === 0 && !matchingEntity2) {
            console.log('[Bridge Preview] Entity 2 - No match found. Sample entity field values:', 
              entity2TransformedData.slice(0, 3).map(e => validJoinFields2.map(jf => `${jf.entityField}="${e[jf.entityField]}"`).join(', '))
            );
          }
          targetPK = matchingEntity2?.['PrimaryKey'] || '(No match found)';
        }
        
        return {
          sourceRecord: record,
          bridgeMapping: {
            'Source type': entity1.name,
            'Source PrimaryKey': sourcePK,
            'Target Type': entity2.name,
            'Target PrimaryKey': targetPK,
            'Relationship Type': relationshipType || 'related'
          }
        };
      });

      setBridgePreview(previewData);
      console.log('[Bridge Preview] Bridge preview generated for dialog:', {
        previewCount: previewData.length,
        entity1: entity1?.name,
        entity2: entity2?.name,
        sampleSourcePK: previewData[0]?.bridgeMapping?.['Source PrimaryKey'],
        sampleTargetPK: previewData[0]?.bridgeMapping?.['Target PrimaryKey']
      });
      setShowBridgePreview(true);
    } catch (error) {
      console.error('[Bridge Preview] Error generating preview:', error);
      showSnackbar('Failed to generate preview', 'error');
    }
  };

  const handleGenerateBridgeMappingPreview = async (mappingIndex: number) => {
    try {
      const mapping = tableMappings[mappingIndex];
      if (!mapping || !mapping.isBridge) return;

      let sourceData = await loadSourceData(mapping.sourceTable);
      
      // Apply filters to bridge table source data if they exist
      const enabledFilters = mapping.filters?.filter(f => f.enabled) || [];
      if (enabledFilters.length > 0) {
        sourceData = applyFilters(sourceData, enabledFilters);
        console.log(`[Bridge Mapping Preview] Bridge table ${mapping.sourceTable}: after filters ${sourceData.length} rows`);
      }
      
      const entity1 = isa95Entities.find(e => e.tableName === mapping.bridgeEntity1 || e.name === mapping.bridgeEntity1);
      const entity2 = isa95Entities.find(e => e.tableName === mapping.bridgeEntity2 || e.name === mapping.bridgeEntity2);
      
      if (!entity1 || !entity2) return;

      // Find ALL entity mappings for join-based lookups (there can be multiple source tables for same target entity)
      const entity1Mappings = tableMappings.filter(m => !m.isBridge && m.targetEntity === mapping.bridgeEntity1);
      const entity2Mappings = tableMappings.filter(m => !m.isBridge && m.targetEntity === mapping.bridgeEntity2);
      
      console.log('[Bridge Mapping Preview] Entity mappings found:', {
        entity1: mapping.bridgeEntity1,
        entity1MappingsCount: entity1Mappings.length,
        entity1Sources: entity1Mappings.map(m => m.sourceTable),
        entity2: mapping.bridgeEntity2,
        entity2MappingsCount: entity2Mappings.length,
        entity2Sources: entity2Mappings.map(m => m.sourceTable)
      });
      
      // Load and transform entity data for lookups - combine data from ALL mappings
      let entity1TransformedData: any[] = [];
      let entity2TransformedData: any[] = [];
      
      const validJoinFields1 = mapping.bridgeEntity1JoinFields?.filter(f => f.bridgeField && f.entityField) || [];
      const validJoinFields2 = mapping.bridgeEntity2JoinFields?.filter(f => f.bridgeField && f.entityField) || [];
      
      if (entity1Mappings.length > 0 && validJoinFields1.length > 0) {
        for (const entity1Mapping of entity1Mappings) {
          let entity1SourceData = await loadSourceData(entity1Mapping.sourceTable);
          
          // Apply filters if they exist
          const enabledFilters = entity1Mapping.filters?.filter(f => f.enabled) || [];
          if (enabledFilters.length > 0) {
            entity1SourceData = applyFilters(entity1SourceData, enabledFilters);
            console.log(`[Bridge Mapping Preview] Entity 1 from ${entity1Mapping.sourceTable}: after filters ${entity1SourceData.length} rows`);
          }
          
          console.log(`[Bridge Mapping Preview] Loading Entity 1 from: ${entity1Mapping.sourceTable}, rows: ${entity1SourceData.length}`);
          
          const transformed = entity1SourceData.map((srcRecord: any) => {
            const entityTransformed: any = {};
            entity1Mapping.fieldMappings?.forEach((fm) => {
              if (fm.generate) {
                if (fm.fieldRule) {
                  entityTransformed[fm.fieldName] = generateValueFromRule(fm.fieldRule, srcRecord, 0, entityTransformed);
                } else if (fm.sourceColumn) {
                  entityTransformed[fm.fieldName] = srcRecord[fm.sourceColumn];
                }
              }
            });
            if (entity1Mapping.primaryKeyRule) {
              entityTransformed['PrimaryKey'] = generateValueFromRule(entity1Mapping.primaryKeyRule, srcRecord, 0, entityTransformed);
            }
            return entityTransformed;
          });
          
          entity1TransformedData.push(...transformed);
        }
        console.log(`[Bridge Mapping Preview] Entity 1 total transformed: ${entity1TransformedData.length} rows`);
      }
      
      if (entity2Mappings.length > 0 && validJoinFields2.length > 0) {
        for (const entity2Mapping of entity2Mappings) {
          let entity2SourceData = await loadSourceData(entity2Mapping.sourceTable);
          
          // Apply filters if they exist
          const enabledFilters = entity2Mapping.filters?.filter(f => f.enabled) || [];
          if (enabledFilters.length > 0) {
            entity2SourceData = applyFilters(entity2SourceData, enabledFilters);
            console.log(`[Bridge Mapping Preview] Entity 2 from ${entity2Mapping.sourceTable}: after filters ${entity2SourceData.length} rows`);
          }
          
          console.log(`[Bridge Mapping Preview] Loading Entity 2 from: ${entity2Mapping.sourceTable}, rows: ${entity2SourceData.length}`);
          
          const transformed = entity2SourceData.map((srcRecord: any) => {
            const entityTransformed: any = {};
            entity2Mapping.fieldMappings?.forEach((fm) => {
              if (fm.generate) {
                if (fm.fieldRule) {
                  entityTransformed[fm.fieldName] = generateValueFromRule(fm.fieldRule, srcRecord, 0, entityTransformed);
                } else if (fm.sourceColumn) {
                  entityTransformed[fm.fieldName] = srcRecord[fm.sourceColumn];
                }
              }
            });
            if (entity2Mapping.primaryKeyRule) {
              entityTransformed['PrimaryKey'] = generateValueFromRule(entity2Mapping.primaryKeyRule, srcRecord, 0, entityTransformed);
            }
            return entityTransformed;
          });
          
          entity2TransformedData.push(...transformed);
        }
        console.log(`[Bridge Mapping Preview] Entity 2 total transformed: ${entity2TransformedData.length} rows`);
      }

      // Generate preview rows for bridge table with join lookups
      const previewRows = sourceData.slice(0, 5);

      const previews = previewRows.map((row, idx) => {
        let sourceEntityId: string = '(No join configured)';
        let targetEntityId: string = '(No join configured)';
        
        // Lookup Source Entity ID via join - use loose comparison with string conversion
        if (validJoinFields1.length > 0 && entity1TransformedData.length > 0) {
          const matchingEntity1 = entity1TransformedData.find((entityRecord: any) => {
            return validJoinFields1.every(joinField => {
              // Apply prefix/suffix to bridge field value
              let bridgeValue = String(row[joinField.bridgeField] ?? '').trim();
              if (joinField.bridgePrefix) bridgeValue = joinField.bridgePrefix + bridgeValue;
              if (joinField.bridgeSuffix) bridgeValue = bridgeValue + joinField.bridgeSuffix;
              bridgeValue = bridgeValue.toLowerCase();
              
              // Apply prefix/suffix to entity field value
              let entityValue = String(entityRecord[joinField.entityField] ?? '').trim();
              if (joinField.entityPrefix) entityValue = joinField.entityPrefix + entityValue;
              if (joinField.entitySuffix) entityValue = entityValue + joinField.entitySuffix;
              entityValue = entityValue.toLowerCase();
              
              return bridgeValue === entityValue;
            });
          });
          sourceEntityId = matchingEntity1?.['PrimaryKey'] || '(No match found)';
        }
        
        // Lookup Target Entity ID via join - use loose comparison with string conversion
        if (validJoinFields2.length > 0 && entity2TransformedData.length > 0) {
          const matchingEntity2 = entity2TransformedData.find((entityRecord: any) => {
            return validJoinFields2.every(joinField => {
              // Apply prefix/suffix to bridge field value
              let bridgeValue = String(row[joinField.bridgeField] ?? '').trim();
              if (joinField.bridgePrefix) bridgeValue = joinField.bridgePrefix + bridgeValue;
              if (joinField.bridgeSuffix) bridgeValue = bridgeValue + joinField.bridgeSuffix;
              bridgeValue = bridgeValue.toLowerCase();
              
              // Apply prefix/suffix to entity field value
              let entityValue = String(entityRecord[joinField.entityField] ?? '').trim();
              if (joinField.entityPrefix) entityValue = joinField.entityPrefix + entityValue;
              if (joinField.entitySuffix) entityValue = entityValue + joinField.entitySuffix;
              entityValue = entityValue.toLowerCase();
              
              return bridgeValue === entityValue;
            });
          });
          targetEntityId = matchingEntity2?.['PrimaryKey'] || '(No match found)';
        }
        
        return {
          _sourceRow: idx + 1,
          'Source Entity Type': entity1.name,
          'Source Entity ID': sourceEntityId,
          'Target Entity Type': entity2.name,
          'Target Entity ID': targetEntityId,
          'Relationship Type': mapping.relationshipType || 'related',
          'Bridge Table': mapping.targetEntity
        };
      });

      setPreviewData(previews);
      setPreviewMappingIndex(mappingIndex);
      console.log('[Bridge Mapping Preview] Bridge preview generated:', {
        previewCount: previews.length,
        entity1: previews[0]?.['Source Entity Type'],
        entity2: previews[0]?.['Target Entity Type'],
        joinFields1: validJoinFields1,
        joinFields2: validJoinFields2,
        samplePreview: previews[0]
      });
      setPreviewDialog(true);
    } catch (error) {
      console.error('[Bridge Mapping Preview] Error generating bridge preview:', error);
      showSnackbar('Failed to generate bridge preview', 'error');
    }
  };

  const handleRemoveMapping = (index: number) => {
    setTableMappings(tableMappings.filter((_, i) => i !== index));
  };

  const handleAddFilter = (mappingIndex: number) => {
    const updated = [...tableMappings];
    if (!updated[mappingIndex].filters) {
      updated[mappingIndex].filters = [];
    }
    const newFilterIndex = updated[mappingIndex].filters.length;
    updated[mappingIndex].filters.push({
      column: '',
      operator: 'equals',
      value: '',
      enabled: true,
    });
    setTableMappings(updated);
    setSelectedFilter({ mappingIndex, filterIndex: newFilterIndex });
    setFilterDialog(true);
  };

  const handleRemoveFilter = (mappingIndex: number, filterIndex: number) => {
    const updated = [...tableMappings];
    if (updated[mappingIndex].filters) {
      updated[mappingIndex].filters.splice(filterIndex, 1);
      setTableMappings(updated);
    }
  };

  const handleUpdateFilter = (mappingIndex: number, filterIndex: number, field: keyof TableFilter, value: any) => {
    const updated = [...tableMappings];
    if (updated[mappingIndex].filters && updated[mappingIndex].filters[filterIndex]) {
      updated[mappingIndex].filters[filterIndex] = {
        ...updated[mappingIndex].filters[filterIndex],
        [field]: value,
      };
      setTableMappings(updated);
    }
  };

  const handleToggleFilter = (mappingIndex: number, filterIndex: number, enabled: boolean) => {
    handleUpdateFilter(mappingIndex, filterIndex, 'enabled', enabled);
  };

  const applyFilters = (data: any[], filters: TableFilter[]): any[] => {
    if (!filters || filters.length === 0) return data;

    return data.filter(record => {
      return filters.every(filter => {
        if (!filter.enabled) return true;

        const value = record[filter.column];
        const filterValue = filter.value;

        switch (filter.operator) {
          case 'equals':
            return value == filterValue;
          case 'not_equals':
            return value != filterValue;
          case 'contains':
            return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
          case 'not_contains':
            return !String(value).toLowerCase().includes(String(filterValue).toLowerCase());
          case 'starts_with':
            return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
          case 'ends_with':
            return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
          case 'greater_than':
            return Number(value) > Number(filterValue);
          case 'less_than':
            return Number(value) < Number(filterValue);
          case 'is_null':
            return value === null || value === undefined || value === '';
          case 'is_not_null':
            return value !== null && value !== undefined && value !== '';
          case 'is_empty':
            return value === null || value === undefined || String(value).trim() === '';
          case 'is_not_empty':
            return value !== null && value !== undefined && String(value).trim() !== '';
          default:
            return true;
        }
      });
    });
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
    
    console.log('[Field Rule Dialog] Opening field rule dialog:', {
      mappingIndex,
      fieldName,
      sourceTable: mapping?.sourceTable,
      targetEntity: mapping?.targetEntity,
      currentSourceColumn: fieldMapping?.sourceColumn,
      hasExistingRule: !!fieldMapping?.fieldRule
    });
    
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
    
    // Pre-populate source field from source column if available
    if (fieldMapping?.sourceColumn) {
      setIfThenSourceField(fieldMapping.sourceColumn);
      setCaseSourceField(fieldMapping.sourceColumn);
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
        case RuleType.IfThen:
          setIfThenSourceField(params?.sourceField || fieldMapping?.sourceColumn || '');
          // Ensure arrays have valid values (no undefined elements)
          setIfThenSourceFields(Array.isArray(params?.sourceFields) && params.sourceFields.length > 0 
            ? params.sourceFields.filter((f: any) => f !== undefined && f !== null) 
            : []);
          setIfThenCondition(params?.condition || '');
          setIfThenTrueValue(params?.trueValue || '');
          setIfThenFalseValue(params?.falseValue || '');
          break;
        case RuleType.Case:
          setCaseSourceField(params?.sourceField || fieldMapping?.sourceColumn || '');
          // Ensure arrays have valid case objects (no undefined elements)
          setCaseCases(Array.isArray(params?.cases) && params.cases.length > 0 
            ? params.cases.filter((c: any) => c !== undefined && c !== null && typeof c === 'object') 
            : [{ case: '', value: '' }]);
          setCaseDefaultValue(params?.defaultValue || '');
          setCaseDefaultValueType(params?.defaultFieldName ? 'field' : 'static');
          setCaseDefaultFieldName(params?.defaultFieldName || '');
          break;
        case RuleType.Coalesce:
          // Ensure arrays have valid values (no undefined elements)
          setCoalesceSourceFields(Array.isArray(params?.sourceFields) && params.sourceFields.length > 0 
            ? params.sourceFields.filter((f: any) => f !== undefined && f !== null) 
            : ['']);
          setCoalesceDefaultValue(params?.defaultValue || '');
          break;
        case RuleType.Concat:
          // Ensure arrays have valid values (no undefined elements)
          setConcatSourceFields(Array.isArray(params?.sourceFields) && params.sourceFields.length > 0 
            ? params.sourceFields.filter((f: any) => f !== undefined && f !== null) 
            : ['']);
          setConcatSeparator(params?.separator || '');
          setConcatPrefix(params?.prefix || '');
          setConcatSuffix(params?.suffix || '');
          break;
        case RuleType.Lookup:
          // Support both saved format (sourceTable + joinConditions) and legacy format (lookupTable + flat fields)
          setLookupSourceTable(params?.sourceTable || params?.lookupTable || '');
          setLookupReturnField(params?.returnField || '');
          setLookupDefaultValue(params?.defaultValue || '');
          setLookupMultipleMatchBehavior(params?.multipleMatchBehavior || 'first');
          
          // Restore join configuration from joinConditions array (saved format)
          if (params?.joinConditions && params.joinConditions.length > 0) {
            const joinCond = params.joinConditions[0];
            setLookupJoinType(joinCond.type || 'field');
            if (joinCond.type === 'field') {
              setLookupLocalField(joinCond.localField || '');
              setLookupSourceField(joinCond.sourceField || '');
              setLookupLocalFields(['']);
              setLookupSourceFields(['']);
            } else if (joinCond.type === 'composite') {
              setLookupLocalField('');
              setLookupSourceField('');
              setLookupLocalFields(Array.isArray(joinCond.localFields) && joinCond.localFields.length > 0
                ? joinCond.localFields.filter((f: any) => f !== undefined && f !== null)
                : ['']);
              setLookupSourceFields(Array.isArray(joinCond.sourceFields) && joinCond.sourceFields.length > 0
                ? joinCond.sourceFields.filter((f: any) => f !== undefined && f !== null)
                : ['']);
            } else if (joinCond.type === 'concatenation') {
              setLookupLocalField('');
              setLookupSourceField(joinCond.sourceField || '');
              setLookupLocalExpression(joinCond.localExpression || '');
              setLookupSourceExpression(joinCond.sourceExpression || '');
              setLookupLocalFields(['']);
              setLookupSourceFields(['']);
            }
          } else {
            // Legacy/preview flat format fallback
            setLookupJoinType(params?.joinType || 'field');
            setLookupLocalField(params?.sourceField || '');
            setLookupSourceField(params?.matchField || '');
            setLookupLocalFields(Array.isArray(params?.localFields) && params.localFields.length > 0
              ? params.localFields.filter((f: any) => f !== undefined && f !== null)
              : ['']);
            setLookupSourceFields(Array.isArray(params?.matchFields) && params.matchFields.length > 0
              ? params.matchFields.filter((f: any) => f !== undefined && f !== null)
              : ['']);
          }
          break;
        case RuleType.MultipleLookups:
          // Load multiple lookup steps
          if (params?.lookupSteps && Array.isArray(params.lookupSteps) && params.lookupSteps.length > 0) {
            const loadedSteps = params.lookupSteps.map((step: any) => {
              const joinCond = step.joinConditions?.[0];
              return {
                lookupTable: step.lookupTable || '',
                joinType: joinCond?.type || 'field',
                localField: joinCond?.type === 'field' ? (joinCond.localField || '') : '',
                sourceField: joinCond?.type === 'field' ? (joinCond.sourceField || '') : '',
                localFields: joinCond?.type === 'composite' 
                  ? (Array.isArray(joinCond.localFields) ? joinCond.localFields.filter((f: any) => f) : [''])
                  : [''],
                sourceFields: joinCond?.type === 'composite'
                  ? (Array.isArray(joinCond.sourceFields) ? joinCond.sourceFields.filter((f: any) => f) : [''])
                  : [''],
                localExpression: joinCond?.type === 'concatenation' ? (joinCond.localExpression || '') : '',
                sourceExpression: joinCond?.type === 'concatenation' ? (joinCond.sourceExpression || '') : '',
                returnField: step.returnField || '',
                isIntermediateStep: step.isIntermediateStep !== false,
              };
            });
            setMultipleLookupSteps(loadedSteps);
          } else {
            // Default to one empty step
            setMultipleLookupSteps([{
              lookupTable: '',
              joinType: 'field',
              localField: '',
              sourceField: '',
              localFields: [''],
              sourceFields: [''],
              localExpression: '',
              sourceExpression: '',
              returnField: '',
              isIntermediateStep: true
            }]);
          }
          setMultipleLookupsDefaultValue(params?.defaultValue || '');
          setMultipleLookupsMultipleMatchBehavior(params?.multipleMatchBehavior || 'first');
          break;
      }
    } else {
      // Auto-select Enumeration if field is Enum type
      if (field?.type === 'Enum') {
        setFieldRuleType(RuleType.Enumeration);
        // Auto-select first enum value by default - handle both object and string formats
        const firstEnum = field.enumValues?.[0];
        const defaultValue = firstEnum 
          ? (typeof firstEnum === 'object' ? (firstEnum as any).enumValue : firstEnum)
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
    setIfThenSourceField('');
    setIfThenSourceFields([]);
    setIfThenCondition('');
    setIfThenTrueValue('');
    setIfThenFalseValue('');
    setCaseSourceField('');
    setCaseCases([{ case: '', value: '' }]);
    setCaseDefaultValue('');
    setCaseDefaultValueType('static');
    setCaseDefaultFieldName('');
    setCoalesceSourceFields(['']);
    setCoalesceDefaultValue('');
    setConcatSourceFields(['']);
    setConcatSeparator('');
    setConcatPrefix('');
    setConcatSuffix('');
    setLookupSourceTable('');
    setLookupLocalField('');
    setLookupSourceField('');
    setLookupReturnField('');
    setLookupDefaultValue('');
    setLookupMultipleMatchBehavior('first');
    setLookupJoinType('field');
    setLookupLocalFields(['']);
    setLookupSourceFields(['']);
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
      case RuleType.IfThen:
        const hasSourceFields = ifThenSourceFields.length > 0 && ifThenSourceFields.some(f => f.trim());
        const hasSourceField = ifThenSourceField && ifThenSourceField.trim();
        
        console.log('[IfThen Rule Save] Building parameters:', {
          ifThenSourceField,
          ifThenSourceFields,
          hasSourceField,
          hasSourceFields,
          ifThenCondition,
          ifThenTrueValue,
          ifThenFalseValue
        });
        
        if (!hasSourceFields && !hasSourceField) {
          showSnackbar('Please select at least one source field', 'error');
          return;
        }
        if (!ifThenCondition.trim() || !ifThenTrueValue.trim() || !ifThenFalseValue.trim()) {
          showSnackbar('Please fill in condition, true value, and false value', 'error');
          return;
        }
        parameters = { 
          sourceField: ifThenSourceField || undefined,
          sourceFields: hasSourceFields ? ifThenSourceFields.filter(f => f.trim()) : undefined,
          condition: ifThenCondition, 
          trueValue: ifThenTrueValue, 
          falseValue: ifThenFalseValue 
        };
        
        console.log('[IfThen Rule Save] Final parameters:', parameters);
        break;
      case RuleType.Case:
        if (!caseSourceField) {
          showSnackbar('Please select a source field', 'error');
          return;
        }
        const validCases = caseCases.filter(c => c.case.trim() && c.value.trim());
        if (validCases.length === 0) {
          showSnackbar('Please add at least one valid case', 'error');
          return;
        }
        parameters = { 
          sourceField: caseSourceField,
          cases: validCases,
          defaultValue: caseDefaultValueType === 'static' ? (caseDefaultValue || undefined) : undefined,
          defaultFieldName: caseDefaultValueType === 'field' ? (caseDefaultFieldName || undefined) : undefined,
        };
        break;
      case RuleType.Coalesce:
        const validCoalesceFields = coalesceSourceFields.filter(f => f.trim());
        if (validCoalesceFields.length === 0) {
          showSnackbar('Please select at least one source field', 'error');
          return;
        }
        parameters = {
          sourceFields: validCoalesceFields,
          defaultValue: coalesceDefaultValue || undefined
        };
        break;
      case RuleType.Concat:
        const validConcatFields = concatSourceFields.filter(f => f.trim());
        if (validConcatFields.length === 0) {
          showSnackbar('Please select at least one source field', 'error');
          return;
        }
        parameters = {
          sourceFields: validConcatFields,
          separator: concatSeparator || undefined,
          prefix: concatPrefix || undefined,
          suffix: concatSuffix || undefined
        };
        break;
      case RuleType.Lookup:
        if (!lookupSourceTable.trim()) {
          showSnackbar('Please specify a source table', 'error');
          return;
        }
        if (!lookupReturnField.trim()) {
          showSnackbar('Please specify a return field', 'error');
          return;
        }
        const joinConditions = [];
        if (lookupJoinType === 'field') {
          if (!lookupLocalField.trim() || !lookupSourceField.trim()) {
            showSnackbar('Please specify both local and source fields for join', 'error');
            return;
          }
          joinConditions.push({
            type: 'field',
            localField: lookupLocalField,
            sourceField: lookupSourceField,
          });
        } else if (lookupJoinType === 'composite') {
          const validLocalFields = lookupLocalFields.filter(f => f.trim());
          const validSourceFields = lookupSourceFields.filter(f => f.trim());
          if (validLocalFields.length === 0 || validSourceFields.length === 0) {
            showSnackbar('Please specify at least one field pair for composite join', 'error');
            return;
          }
          joinConditions.push({
            type: 'composite',
            localFields: validLocalFields,
            sourceFields: validSourceFields,
          });
        } else if (lookupJoinType === 'concatenation') {
          if (!lookupLocalExpression.trim()) {
            showSnackbar('Please specify a local expression', 'error');
            return;
          }
          joinConditions.push({
            type: 'concatenation',
            localExpression: lookupLocalExpression,
            sourceExpression: lookupSourceExpression || undefined,
            sourceField: lookupSourceField || undefined,
          });
        }
        parameters = {
          sourceTable: lookupSourceTable,
          joinConditions,
          returnField: lookupReturnField,
          defaultValue: lookupDefaultValue || undefined,
          multipleMatchBehavior: lookupMultipleMatchBehavior,
        };
        break;
      case RuleType.MultipleLookups:
        if (multipleLookupSteps.length === 0) {
          showSnackbar('Please add at least one lookup step', 'error');
          return;
        }
        // Validate each step
        for (let i = 0; i < multipleLookupSteps.length; i++) {
          const step = multipleLookupSteps[i];
          if (!step.lookupTable.trim()) {
            showSnackbar(`Step ${i + 1}: Please select a lookup table`, 'error');
            return;
          }
          if (!step.returnField.trim()) {
            showSnackbar(`Step ${i + 1}: Please select a return field`, 'error');
            return;
          }
          // Validate join conditions
          if (step.joinType === 'field') {
            if (!step.localField || !step.sourceField) {
              showSnackbar(`Step ${i + 1}: Please configure field join`, 'error');
              return;
            }
          } else if (step.joinType === 'composite') {
            const validLocal = step.localFields.filter(f => f && f.trim());
            const validSource = step.sourceFields.filter(f => f && f.trim());
            if (validLocal.length === 0 || validSource.length === 0) {
              showSnackbar(`Step ${i + 1}: Please configure composite join`, 'error');
              return;
            }
          } else if (step.joinType === 'concatenation') {
            if (!step.localExpression || !step.sourceExpression) {
              showSnackbar(`Step ${i + 1}: Please configure concatenation expressions`, 'error');
              return;
            }
          }
        }
        // Build lookup steps array
        const lookupSteps = multipleLookupSteps.map((step, index) => {
          const joinConditions: JoinCondition[] = [];
          if (step.joinType === 'field') {
            joinConditions.push({
              type: 'field',
              localField: step.localField,
              sourceField: step.sourceField,
            });
          } else if (step.joinType === 'composite') {
            joinConditions.push({
              type: 'composite',
              localFields: step.localFields.filter(f => f && f.trim()),
              sourceFields: step.sourceFields.filter(f => f && f.trim()),
            });
          } else if (step.joinType === 'concatenation') {
            joinConditions.push({
              type: 'concatenation',
              localExpression: step.localExpression,
              sourceExpression: step.sourceExpression,
            });
          }
          return {
            lookupTable: step.lookupTable,
            joinConditions,
            returnField: step.returnField,
            isIntermediateStep: index < multipleLookupSteps.length - 1,
          };
        });
        parameters = {
          lookupSteps,
          defaultValue: multipleLookupsDefaultValue || undefined,
          multipleMatchBehavior: multipleLookupsMultipleMatchBehavior,
        };
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
      
      // If IfThen or Case rule and sourceColumn is not set, set it from the rule's sourceField
      if ((fieldRuleType === RuleType.IfThen || fieldRuleType === RuleType.Case) && !fieldMapping.sourceColumn) {
        const sourceField = fieldRuleType === RuleType.IfThen ? ifThenSourceField : caseSourceField;
        if (sourceField) {
          fieldMapping.sourceColumn = sourceField;
        }
      }
      
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
    const mapping = tableMappings[index];
    console.log('[Table Mapping] Accordion toggled:', {
      index,
      isBridge,
      sourceTable: mapping?.sourceTable,
      targetEntity: mapping?.targetEntity,
      isExpanding: isBridge ? !expandedBridgeMappings.has(index) : !expandedMappings.has(index)
    });
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
        case RuleType.CompositeConcat:
          setPkCompositeConcatFields(params?.fields || []);
          setPkCompositeConcatSeparator(params?.separator || '-');
          setPkCompositeConcatGlobalPrefix(params?.globalPrefix || '');
          setPkCompositeConcatGlobalSuffix(params?.globalSuffix || '');
          break;
        case RuleType.Lookup:
          // Restore lookup parameters from saved format (sourceTable + joinConditions)
          setLookupSourceTable(params?.sourceTable || params?.lookupTable || '');
          setLookupReturnField(params?.returnField || '');
          setLookupDefaultValue(params?.defaultValue || '');
          setLookupMultipleMatchBehavior(params?.multipleMatchBehavior || 'first');
          
          if (params?.joinConditions && params.joinConditions.length > 0) {
            const joinCond = params.joinConditions[0];
            setLookupJoinType(joinCond.type || 'field');
            if (joinCond.type === 'field') {
              setLookupLocalField(joinCond.localField || '');
              setLookupSourceField(joinCond.sourceField || '');
              setLookupLocalFields(['']);
              setLookupSourceFields(['']);
            } else if (joinCond.type === 'composite') {
              setLookupLocalField('');
              setLookupSourceField('');
              setLookupLocalFields(Array.isArray(joinCond.localFields) && joinCond.localFields.length > 0
                ? joinCond.localFields.filter((f: any) => f !== undefined && f !== null)
                : ['']);
              setLookupSourceFields(Array.isArray(joinCond.sourceFields) && joinCond.sourceFields.length > 0
                ? joinCond.sourceFields.filter((f: any) => f !== undefined && f !== null)
                : ['']);
            } else if (joinCond.type === 'concatenation') {
              setLookupLocalField('');
              setLookupSourceField(joinCond.sourceField || '');
              setLookupLocalExpression(joinCond.localExpression || '');
              setLookupSourceExpression(joinCond.sourceExpression || '');
              setLookupLocalFields(['']);
              setLookupSourceFields(['']);
            }
          } else {
            setLookupJoinType('field');
          }
          break;
      }
    } else {
      // Default to Composite with mandatory fields pre-selected
      setPkRuleType('Composite' as any);
      
      // Auto-populate with mandatory fields from target entity
      const targetEntity = isa95Entities.find(e => e.tableName === mapping?.targetEntity);
      if (targetEntity) {
        const mandatoryFields = targetEntity.fields
          .filter(f => f.required === true)
          .map(f => f.name);
        
        console.log('[PK Rule Dialog] Auto-populating mandatory fields:', {
          targetEntity: targetEntity.name,
          mandatoryFields
        });
        
        setPkCompositeFields(mandatoryFields);
        setPkCompositeSeparator('-');
      }
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
    setPkCompositeConcatFields([]);
    setPkCompositeConcatSeparator('-');
    setPkCompositeConcatGlobalPrefix('');
    setPkCompositeConcatGlobalSuffix('');
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
      case RuleType.CompositeConcat:
        if (pkCompositeConcatFields.length === 0) {
          showSnackbar('Please add at least one field for composite key with concat', 'error');
          return;
        }
        parameters = { 
          fields: pkCompositeConcatFields, 
          separator: pkCompositeConcatSeparator,
          globalPrefix: pkCompositeConcatGlobalPrefix,
          globalSuffix: pkCompositeConcatGlobalSuffix
        };
        break;
      case RuleType.Lookup:
        // Validate lookup parameters
        if (!lookupSourceTable) {
          showSnackbar('Please select a source table for lookup', 'error');
          return;
        }
        if (!lookupReturnField) {
          showSnackbar('Please select a return field for lookup', 'error');
          return;
        }
        // Validate join condition based on type
        if (lookupJoinType === 'field' && (!lookupLocalField || !lookupSourceField)) {
          showSnackbar('Please configure both local and source fields for the join', 'error');
          return;
        }
        if (lookupJoinType === 'composite' && (lookupLocalFields.filter(f => f).length === 0 || lookupSourceFields.filter(f => f).length === 0)) {
          showSnackbar('Please configure at least one field pair for composite join', 'error');
          return;
        }
        if (lookupJoinType === 'concatenation' && (!lookupLocalExpression || !lookupSourceExpression)) {
          showSnackbar('Please configure both local and source expressions for concatenation join', 'error');
          return;
        }

        // Build join conditions array
        const pkLookupJoinConditions: JoinCondition[] = [];
        if (lookupJoinType === 'field') {
          pkLookupJoinConditions.push({
            type: 'field',
            localField: lookupLocalField,
            sourceField: lookupSourceField,
          });
        } else if (lookupJoinType === 'composite') {
          pkLookupJoinConditions.push({
            type: 'composite',
            localFields: lookupLocalFields.filter(f => f),
            sourceFields: lookupSourceFields.filter(f => f),
          });
        } else if (lookupJoinType === 'concatenation') {
          pkLookupJoinConditions.push({
            type: 'concatenation',
            localExpression: lookupLocalExpression,
            sourceExpression: lookupSourceExpression,
          });
        }

        parameters = {
          sourceTable: lookupSourceTable,
          joinConditions: pkLookupJoinConditions,
          returnField: lookupReturnField,
          defaultValue: lookupDefaultValue || undefined,
          multipleMatchBehavior: lookupMultipleMatchBehavior,
        };
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
      case RuleType.IfThen:
        const fields = params?.sourceFields?.length > 0 ? params.sourceFields.join(', ') : params?.sourceField;
        return `If ${fields} ${params?.condition} ? ${params?.trueValue} : ${params?.falseValue}`;
      case RuleType.Case:
        return `Case(${params?.sourceField}, ${params?.cases?.length || 0} cases)`;
      case RuleType.Coalesce:
        return `Coalesce(${params?.sourceFields?.slice(0, 3).join(', ')}${params?.sourceFields?.length > 3 ? '...' : ''})`;
      case RuleType.Concat:
        const sep = params?.separator ? `'${params.separator}'` : "''";
        return `Concat(${params?.sourceFields?.slice(0, 3).join(', ')}${params?.sourceFields?.length > 3 ? '...' : ''} with ${sep})`;
      case 'Composite':
        const compositeFields = params?.fields || [];
        if (compositeFields.length === 0) return 'Composite(no fields)';
        if (compositeFields.length <= 3) {
          return `Composite: ${compositeFields.join(', ')}`;
        }
        return `Composite: ${compositeFields.slice(0, 3).join(', ')} +${compositeFields.length - 3} more`;
      case RuleType.CompositeConcat:
        const fieldNames = params?.fields?.map((f: any) => f.fieldName).join(', ') || '';
        return `CompositeConcat(${fieldNames})`;
      case RuleType.Lookup:
        return `Lookup(${params?.sourceTable}.${params?.returnField})`;
      case RuleType.MultipleLookups:
        const stepCount = params?.lookupSteps?.length || 0;
        const tables = params?.lookupSteps?.map((s: any) => s.lookupTable).slice(0, 2).join(' → ') || '';
        return `${stepCount} Chained: ${tables}${stepCount > 2 ? '...' : ''}`;
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
      case RuleType.IfThen:
        const ifThenFields = params?.sourceFields?.length > 0 
          ? `[${params.sourceFields.slice(0, 2).join(', ')}${params.sourceFields.length > 2 ? '...' : ''}]`
          : params?.sourceField ? `[${params.sourceField}]` : '';
        return `${ifThenFields} If(${params?.condition}) ? ${params?.trueValue} : ${params?.falseValue}`;
      case RuleType.Case:
        const caseCount = params?.cases?.length || 0;
        const caseSource = params?.sourceField ? `[${params.sourceField}] ` : '';
        return `${caseSource}${caseCount} case${caseCount !== 1 ? 's' : ''}${params?.defaultValue ? ' + default' : ''}`;
      case RuleType.Coalesce:
        const coalesceFields = params?.sourceFields?.slice(0, 3).join(', ') || '';
        return `First of: ${coalesceFields}${params?.sourceFields?.length > 3 ? '...' : ''}`;
      case RuleType.Concat:
        const concatFields = params?.sourceFields?.slice(0, 3).join(', ') || '';
        const sep = params?.separator ? ` with '${params.separator}'` : '';
        return `Concat: ${concatFields}${params?.sourceFields?.length > 3 ? '...' : ''}${sep}`;
      case RuleType.Lookup:
        return `Lookup: ${params?.sourceTable}.${params?.returnField}`;
      case RuleType.MultipleLookups:
        const stepCount = params?.lookupSteps?.length || 0;
        const tables = params?.lookupSteps?.map((s: any) => s.lookupTable).slice(0, 2).join(' → ') || '';
        return `${stepCount} Chained Lookup${stepCount !== 1 ? 's' : ''}: ${tables}${stepCount > 2 ? '...' : ''}`;
      default:
        return fieldRule.ruleType;
    }
  };

  const generatePreviewData = async (mappingIndex: number) => {
    const mapping = tableMappings[mappingIndex];
    console.log('[Preview] Generating preview for table mapping:', {
      mappingIndex,
      sourceTable: mapping?.sourceTable,
      targetEntity: mapping?.targetEntity,
      fieldMappingsCount: mapping?.fieldMappings?.length,
      isBridge: mapping?.isBridge
    });
    if (!mapping) return;

    const sourceTable = dataSource?.tables.find(t => t.name === mapping.sourceTable);
    if (!sourceTable) return;

    try {
      const getTableDataFunc = async (tableName: string, limit = 500): Promise<any[]> =>
        loadSourceData(tableName, { limit });

      const sourceData = await getTableDataFunc(mapping.sourceTable, 1000);
      
      // Apply filters if configured
      let filteredSourceData = sourceData;
      if (mapping.filters && mapping.filters.length > 0) {
        const enabledFilters = mapping.filters.filter(f => f.enabled);
        if (enabledFilters.length > 0) {
          filteredSourceData = applyFilters(sourceData, enabledFilters);
        }
      }
      
      const previewRows = filteredSourceData.slice(0, 5); // Preview first 5 rows

      // Generate preview with field mappings applied
      const previews = await Promise.all(previewRows.map(async (row, idx) => {
        const previewRow: any = { _sourceRow: idx + 1 };
        
        // Special handling for bridge tables - use join-based lookup
        if (mapping.isBridge && mapping.bridgeEntity1 && mapping.bridgeEntity2) {
          const entity1 = isa95Entities.find(e => e.tableName === mapping.bridgeEntity1 || e.name === mapping.bridgeEntity1);
          const entity2 = isa95Entities.find(e => e.tableName === mapping.bridgeEntity2 || e.name === mapping.bridgeEntity2);
          
          if (entity1 && entity2) {
            previewRow['Source type'] = entity1.name;
            previewRow['Source PrimaryKey'] = '[Lookup from Entity 1]';
            previewRow['Target Type'] = entity2.name;
            previewRow['Target PrimaryKey'] = '[Lookup from Entity 2]';
            previewRow['Relationship Type'] = mapping.relationshipType || 'related';
            
            // Try to perform actual lookups for preview
            const entity1Mapping = tableMappings.find(m => m.targetEntity === mapping.bridgeEntity1);
            const entity2Mapping = tableMappings.find(m => m.targetEntity === mapping.bridgeEntity2);
            
            // Entity 1 lookup
            if (entity1Mapping && mapping.bridgeEntity1JoinFields && mapping.bridgeEntity1JoinFields.length > 0) {
              try {
                const entity1SourceData = await loadSourceData(entity1Mapping.sourceTable, { limit: 1000 });
                const entity1TransformedData = entity1SourceData.slice(0, 100).map((srcRecord: any) => {
                  const entityTransformed: any = {};
                  entity1Mapping.fieldMappings?.forEach((fm) => {
                    if (fm.generate) {
                      if (fm.fieldRule) {
                        entityTransformed[fm.fieldName] = applyFieldRuleForPreview(fm.fieldRule, srcRecord, 0);
                      } else if (fm.sourceColumn) {
                        entityTransformed[fm.fieldName] = srcRecord[fm.sourceColumn];
                      }
                    }
                  });
                  if (entity1Mapping.primaryKeyRule) {
                    entityTransformed['PrimaryKey'] = applyFieldRuleForPreview(entity1Mapping.primaryKeyRule, srcRecord, 0, entityTransformed);
                  }
                  return entityTransformed;
                });
                
                const matchingEntity1 = entity1TransformedData.find((entityRecord: any) => {
                  return mapping.bridgeEntity1JoinFields!.every(joinField => {
                    const bridgeValue = String(row[joinField.bridgeField] ?? '').trim().toLowerCase();
                    const entityValue = String(entityRecord[joinField.entityField] ?? '').trim().toLowerCase();
                    return bridgeValue === entityValue;
                  });
                });
                
                if (matchingEntity1 && matchingEntity1['PrimaryKey']) {
                  previewRow['Source PrimaryKey'] = matchingEntity1['PrimaryKey'];
                }
              } catch (error) {
                console.error('[Preview Bridge] Error looking up Entity 1:', error);
              }
            }
            
            // Entity 2 lookup
            if (entity2Mapping && mapping.bridgeEntity2JoinFields && mapping.bridgeEntity2JoinFields.length > 0) {
              try {
                const entity2SourceData = await loadSourceData(entity2Mapping.sourceTable, { limit: 1000 });
                const entity2TransformedData = entity2SourceData.slice(0, 100).map((srcRecord: any) => {
                  const entityTransformed: any = {};
                  entity2Mapping.fieldMappings?.forEach((fm) => {
                    if (fm.generate) {
                      if (fm.fieldRule) {
                        entityTransformed[fm.fieldName] = applyFieldRuleForPreview(fm.fieldRule, srcRecord, 0);
                      } else if (fm.sourceColumn) {
                        entityTransformed[fm.fieldName] = srcRecord[fm.sourceColumn];
                      }
                    }
                  });
                  if (entity2Mapping.primaryKeyRule) {
                    entityTransformed['PrimaryKey'] = applyFieldRuleForPreview(entity2Mapping.primaryKeyRule, srcRecord, 0, entityTransformed);
                  }
                  return entityTransformed;
                });
                
                const matchingEntity2 = entity2TransformedData.find((entityRecord: any) => {
                  return mapping.bridgeEntity2JoinFields!.every(joinField => {
                    const bridgeValue = String(row[joinField.bridgeField] ?? '').trim().toLowerCase();
                    const entityValue = String(entityRecord[joinField.entityField] ?? '').trim().toLowerCase();
                    return bridgeValue === entityValue;
                  });
                });
                
                if (matchingEntity2 && matchingEntity2['PrimaryKey']) {
                  previewRow['Target PrimaryKey'] = matchingEntity2['PrimaryKey'];
                }
              } catch (error) {
                console.error('[Preview Bridge] Error looking up Entity 2:', error);
              }
            }
            
            // Apply bridge PK rule if configured
            if (mapping.primaryKeyRule) {
              previewRow['PrimaryKey'] = applyFieldRuleForPreview(mapping.primaryKeyRule, row, idx, previewRow);
            }
          }
        } else {
          // Normal entity mapping - apply field mappings
          // Pre-load lookup tables for this mapping
          const previewLookupTables = new Map<string, any[]>();
          for (const fm of mapping.fieldMappings) {
            if (fm.generate && fm.fieldRule?.ruleType === RuleType.Lookup) {
              const params = fm.fieldRule.parameters as any;
              const lookupTableName = params?.sourceTable || params?.lookupTable;
              if (lookupTableName && !previewLookupTables.has(lookupTableName)) {
                const lookupData = await getTableDataFunc(lookupTableName);
                previewLookupTables.set(lookupTableName, lookupData);
              }
            }
          }
          // Also check PK rule for lookup
          if (mapping.primaryKeyRule?.ruleType === RuleType.Lookup) {
            const pkParams = mapping.primaryKeyRule.parameters as any;
            const pkLookupTable = pkParams?.sourceTable || pkParams?.lookupTable;
            if (pkLookupTable && !previewLookupTables.has(pkLookupTable)) {
              const lookupData = await getTableDataFunc(pkLookupTable);
              previewLookupTables.set(pkLookupTable, lookupData);
            }
          }

          mapping.fieldMappings.forEach(fieldMapping => {
            if (!fieldMapping.generate) return;

            if (fieldMapping.sourceColumn) {
              // Direct column mapping
              previewRow[fieldMapping.fieldName] = row[fieldMapping.sourceColumn];
            } else if (fieldMapping.fieldRule) {
              // Special handling for Lookup rule in preview
              if (fieldMapping.fieldRule.ruleType === RuleType.Lookup) {
                const params = fieldMapping.fieldRule.parameters as any;
                // Resolve field names from joinConditions (saved format) or flat params (preview format)
                let localField = params?.sourceField;
                let matchField = params?.matchField;
                const lookupTableName = params?.sourceTable || params?.lookupTable;
                
                if (params?.joinConditions && params.joinConditions.length > 0) {
                  const joinCond = params.joinConditions[0];
                  if (joinCond.type === 'field') {
                    localField = joinCond.localField;
                    matchField = joinCond.sourceField;
                  } else if (joinCond.type === 'composite') {
                    localField = joinCond.localFields?.[0];
                    matchField = joinCond.sourceFields?.[0];
                  }
                }
                
                const sourceValue = row[localField];
                const lookupData = previewLookupTables.get(lookupTableName);
                
                if (lookupData && sourceValue) {
                  const matchingRecord = lookupData.find((r: any) => 
                    String(r[matchField] || '').toLowerCase().trim() === String(sourceValue).toLowerCase().trim()
                  );
                  previewRow[fieldMapping.fieldName] = matchingRecord?.[params?.returnField] ?? params?.defaultValue ?? '';
                } else {
                  previewRow[fieldMapping.fieldName] = params?.defaultValue || '';
                }
              } else {
                // Apply other rules
                previewRow[fieldMapping.fieldName] = applyFieldRuleForPreview(fieldMapping.fieldRule, row, idx);
              }
            } else {
              previewRow[fieldMapping.fieldName] = '';
            }
          });
          
          // Apply primary key rule using the transformed row
          if (mapping.primaryKeyRule) {
            if (mapping.primaryKeyRule.ruleType === RuleType.Lookup) {
              const params = mapping.primaryKeyRule.parameters as any;
              let localField = params?.sourceField;
              let matchField = params?.matchField;
              const lookupTableName = params?.sourceTable || params?.lookupTable;
              
              if (params?.joinConditions && params.joinConditions.length > 0) {
                const joinCond = params.joinConditions[0];
                if (joinCond.type === 'field') {
                  localField = joinCond.localField;
                  matchField = joinCond.sourceField;
                } else if (joinCond.type === 'composite') {
                  localField = joinCond.localFields?.[0];
                  matchField = joinCond.sourceFields?.[0];
                }
              }
              
              const sourceValue = row[localField];
              const lookupData = previewLookupTables.get(lookupTableName);
              
              if (lookupData && sourceValue) {
                const matchingRecord = lookupData.find((r: any) => 
                  String(r[matchField] || '').toLowerCase().trim() === String(sourceValue).toLowerCase().trim()
                );
                previewRow['PrimaryKey'] = matchingRecord?.[params?.returnField] ?? params?.defaultValue ?? '';
              } else {
                previewRow['PrimaryKey'] = params?.defaultValue || '';
              }
            } else {
              previewRow['PrimaryKey'] = applyFieldRuleForPreview(mapping.primaryKeyRule, row, idx, previewRow);
            }
          }
        }

        return previewRow;
      }));

      setPreviewData(previews);
      setPreviewMappingIndex(mappingIndex);
      console.log('[Preview] Preview data generated successfully:', {
        previewRecords: previews.length,
        sampleRecord: previews[0]
      });
      setPreviewDialog(true);
    } catch (error) {
      console.error('[Preview] Error generating preview:', error);
      showSnackbar('Error generating preview', 'error');
    }
  };

  const applyFieldRuleForPreview = (fieldRule: FieldRuleConfig, sourceRow: any, rowIndex: number, transformedRow?: any): any => {
    const params = fieldRule.parameters as any;
    
    switch (fieldRule.ruleType) {
      case RuleType.Static:
        return params?.value || '';
      
      case RuleType.Sequence:
        return (params?.start || 1) + (rowIndex * (params?.increment || 1));
      
      case RuleType.PrefixSequence:
        const seqNum = (params?.start || 1) + rowIndex;
        const paddedNum = params?.padding ? String(seqNum).padStart(params.padding, '0') : String(seqNum);
        return `${params?.prefix || ''}${paddedNum}${params?.suffix || ''}`;
      
      case RuleType.Range:
        const min = params?.min || 0;
        const max = params?.max || 100;
        return Math.floor(Math.random() * (max - min + 1)) + min;
      
      case RuleType.Examples:
        const values = params?.values || [];
        return values[rowIndex % values.length] || '';
      
      case RuleType.Pattern:
        return `[Pattern: ${params?.regex || ''}]`;
      
      case RuleType.Enumeration:
        return params?.value || '';
      
      case 'Composite':
        // For Composite, use the transformed row (ISA-95 entity fields)
        if (!transformedRow) return '';
        const compositeFields = params?.fields || [];
        const compositeValues = compositeFields.map((fieldName: string) => {
          return transformedRow[fieldName] !== undefined ? transformedRow[fieldName] : '';
        });
        return compositeValues.join(params?.separator || '-');
      
      case RuleType.CompositeConcat:
        // For CompositeConcat, use the transformed row (ISA-95 entity fields)
        if (!transformedRow) return '';
        const concatParts = (params?.fields || []).map((field: any) => {
          const fieldValue = transformedRow[field.fieldName] !== undefined ? transformedRow[field.fieldName] : '';
          return `${field.prefix || ''}${fieldValue}${field.suffix || ''}`;
        });
        return `${params?.globalPrefix || ''}${concatParts.join(params?.separator || '-')}${params?.globalSuffix || ''}`;
      
      case RuleType.IfThen:
        // Prioritize Primary Source Field over Additional Fields (matches migration logic)
        let sourceField = '';
        let sourceValue = '';
        
        // Priority 1: Use Primary Source Field if set
        if (params?.sourceField && params.sourceField.trim()) {
          sourceField = params.sourceField;
          sourceValue = String(sourceRow[sourceField] !== undefined ? sourceRow[sourceField] : '');
        }
        // Priority 2: Fall back to Additional Source Fields
        else if (params?.sourceFields && params.sourceFields.length > 0) {
          sourceField = params.sourceFields[0];
          sourceValue = sourceField ? String(sourceRow[sourceField] !== undefined ? sourceRow[sourceField] : '') : '';
        }
        
        console.log('[IfThen Preview] Row', rowIndex, '- Evaluating condition:', {
          sourceField,
          sourceValue,
          condition: params?.condition,
          availableFields: Object.keys(sourceRow),
          sourceRowData: sourceRow
        });
        
        const condition = params?.condition || '';
        const matches = evaluateCondition(sourceValue, condition);
        const result = matches ? (params?.trueValue || '') : (params?.falseValue || '');
        
        console.log('[IfThen Preview] Row', rowIndex, '- Result:', {
          conditionMet: matches,
          willReturn: result,
          trueValue: params?.trueValue,
          falseValue: params?.falseValue
        });
        
        return result;
      
      case RuleType.Case:
        const caseSourceField = params?.sourceField;
        
        // Try to find the source field value (case-insensitive field name matching)
        let caseSourceValue = '';
        if (caseSourceField && sourceRow) {
          const sourceFieldLower = caseSourceField.toLowerCase();
          for (const key in sourceRow) {
            if (key.toLowerCase() === sourceFieldLower) {
              caseSourceValue = String(sourceRow[key] || '').trim(); // Trim whitespace
              break;
            }
          }
        }
        
        const cases = params?.cases || [];
        
        // Find matching case (case-insensitive, trimmed comparison)
        for (const caseItem of cases) {
          const caseCondition = String(caseItem.case || '').trim();
          if (caseCondition && caseSourceValue.toLowerCase() === caseCondition.toLowerCase()) {
            return caseItem.value;
          }
        }
        // No match — resolve default: field reference takes priority over static value
        if (params?.defaultFieldName && sourceRow) {
          const fieldVal = sourceRow[params.defaultFieldName];
          return fieldVal !== undefined && fieldVal !== null ? String(fieldVal) : '';
        }
        return params?.defaultValue || '';
      
      case RuleType.Coalesce:
        // Return first non-null, non-empty value from source fields
        if (!sourceRow || !params?.sourceFields) {
          return params?.defaultValue || '';
        }
        for (const field of params.sourceFields) {
          const value = sourceRow[field];
          if (value !== undefined && value !== null && String(value).trim()) {
            return value;
          }
        }
        return params?.defaultValue || '';
      
      case RuleType.Concat:
        // Concatenate multiple source fields
        if (!sourceRow || !params?.sourceFields) {
          return '';
        }
        const concatValues = params.sourceFields
          .map((field: string) => String(sourceRow[field] || ''))
          .filter((v: string) => v.trim()); // Only include non-empty values
        
        const concatenated = concatValues.join(params?.separator || '');
        return `${params?.prefix || ''}${concatenated}${params?.suffix || ''}`;
      
      case RuleType.Lookup:
        // Lookup preview is handled separately in generateFieldRulePreview
        return '[Lookup preview - see below]';
      
      case RuleType.MultipleLookups:
        // MultipleLookups preview is handled separately in generateFieldRulePreview
        return '[Multiple Lookups preview - see below]';
      
      default:
        return '';
    }
  };

  const evaluateCondition = (value: any, condition: string): boolean => {
    const strValue = String(value).toLowerCase();
    const conditionLower = condition.toLowerCase();

    // Null/empty checks
    if (conditionLower === 'isnull' || conditionLower === 'isempty') {
      return value === null || value === undefined || String(value).trim() === '';
    }
    if (conditionLower === 'isnotnull' || conditionLower === 'isnotempty') {
      return value !== null && value !== undefined && String(value).trim() !== '';
    }

    if (conditionLower.startsWith('contains:')) {
      const searchTerm = conditionLower.substring(9).trim();
      return strValue.includes(searchTerm);
    }
    if (conditionLower.startsWith('equals:')) {
      const compareValue = conditionLower.substring(7).trim();
      return strValue === compareValue;
    }
    if (conditionLower.startsWith('startswith:')) {
      const prefix = conditionLower.substring(11).trim();
      return strValue.startsWith(prefix);
    }
    if (conditionLower.startsWith('endswith:')) {
      const suffix = conditionLower.substring(9).trim();
      return strValue.endsWith(suffix);
    }

    // Numeric comparisons
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue)) {
      if (condition.startsWith('>=')) {
        const compareValue = parseFloat(condition.substring(2).trim());
        return !isNaN(compareValue) && numericValue >= compareValue;
      }
      if (condition.startsWith('<=')) {
        const compareValue = parseFloat(condition.substring(2).trim());
        return !isNaN(compareValue) && numericValue <= compareValue;
      }
      if (condition.startsWith('>')) {
        const compareValue = parseFloat(condition.substring(1).trim());
        return !isNaN(compareValue) && numericValue > compareValue;
      }
      if (condition.startsWith('<')) {
        const compareValue = parseFloat(condition.substring(1).trim());
        return !isNaN(compareValue) && numericValue < compareValue;
      }
    }

    return false;
  };

  const generateFieldRulePreview = async () => {
    console.log('[Field Rule Preview] Generating field rule preview:', {
      selectedFieldForRule,
      ruleType: fieldRuleType
    });
    if (!selectedFieldForRule) {
      return;
    }

    const mappingIndex = selectedFieldForRule.mappingIndex;
    const mapping = tableMappings[mappingIndex];
    if (!mapping) {
      return;
    }

    const sourceTableName = mapping.sourceTable;
    if (!sourceTableName) {
      return;
    }

    try {
      const sourceData = await loadSourceData(sourceTableName, { limit: 5 });
      const previewRows = sourceData.slice(0, 5); // Preview first 5 rows

      // Create a temporary field rule from current dialog state
      const tempRule: FieldRuleConfig = {
        ruleType: fieldRuleType,
        parameters: {}
      };

      // Set rule parameters based on selected rule type
      switch (fieldRuleType) {
        case RuleType.Static:
          tempRule.parameters = { value: staticValue };
          break;
        case RuleType.Range:
          tempRule.parameters = {
            min: rangeMin,
            max: rangeMax
          };
          break;
        case RuleType.Examples:
          tempRule.parameters = {
            values: exampleValues
          };
          break;
        case RuleType.Pattern:
          tempRule.parameters = {
            regex: pattern
          };
          break;
        case RuleType.Sequence:
          tempRule.parameters = {
            start: sequenceStart,
            increment: sequenceIncrement
          };
          break;
        case RuleType.PrefixSequence:
          tempRule.parameters = {
            prefix: prefixValue,
            suffix: suffixValue,
            start: seqStart,
            end: seqEnd,
            padding: seqPadding
          };
          break;
        case RuleType.Enumeration:
          tempRule.parameters = {
            value: staticValue  // Uses staticValue for selected enum
          };
          break;
        case RuleType.IfThen:
          const hasIfThenSourceFields = ifThenSourceFields.length > 0 && ifThenSourceFields.some(f => f.trim());
          tempRule.parameters = {
            sourceField: ifThenSourceField || undefined,
            sourceFields: hasIfThenSourceFields ? ifThenSourceFields.filter(f => f.trim()) : undefined,
            condition: ifThenCondition,
            trueValue: ifThenTrueValue,
            falseValue: ifThenFalseValue
          };
          break;
        case RuleType.Case:
          tempRule.parameters = {
            sourceField: caseSourceField,
            cases: caseCases,
            defaultValue: caseDefaultValueType === 'static' ? (caseDefaultValue || undefined) : undefined,
            defaultFieldName: caseDefaultValueType === 'field' ? (caseDefaultFieldName || undefined) : undefined,
          };
          break;
        case RuleType.Coalesce:
          tempRule.parameters = {
            sourceFields: coalesceSourceFields.filter(f => f),
            defaultValue: coalesceDefaultValue
          };
          break;
        case RuleType.Concat:
          tempRule.parameters = {
            sourceFields: concatSourceFields.filter(f => f),
            separator: concatSeparator,
            prefix: concatPrefix,
            suffix: concatSuffix
          };
          break;
        case RuleType.Lookup:
          tempRule.parameters = {
            sourceField: lookupLocalField,        // Field from entity's source table
            lookupTable: lookupSourceTable,
            matchField: lookupSourceField,        // Field from lookup table to match
            returnField: lookupReturnField,
            defaultValue: lookupDefaultValue,
            multipleMatchBehavior: lookupMultipleMatchBehavior
          };
          break;
        case RuleType.MultipleLookups:
          // Build lookup steps from current state
          const lookupSteps = multipleLookupSteps.map((step, index) => {
            const joinConditions: any[] = [];
            if (step.joinType === 'field') {
              joinConditions.push({
                type: 'field',
                localField: step.localField,
                sourceField: step.sourceField,
              });
            } else if (step.joinType === 'composite') {
              joinConditions.push({
                type: 'composite',
                localFields: step.localFields.filter(f => f && f.trim()),
                sourceFields: step.sourceFields.filter(f => f && f.trim()),
              });
            } else if (step.joinType === 'concatenation') {
              joinConditions.push({
                type: 'concatenation',
                localExpression: step.localExpression,
                sourceExpression: step.sourceExpression,
              });
            }
            return {
              lookupTable: step.lookupTable,
              joinConditions,
              returnField: step.returnField,
              isIntermediateStep: index < multipleLookupSteps.length - 1,
            };
          });
          tempRule.parameters = {
            lookupSteps,
            defaultValue: multipleLookupsDefaultValue,
            multipleMatchBehavior: multipleLookupsMultipleMatchBehavior,
          };
          break;
      }

      // For Lookup rules, pre-load the lookup table data
      let lookupData: any[] = [];
      const lookupTables = new Map<string, any[]>();
      
      if (tempRule.ruleType === RuleType.Lookup && tempRule.parameters?.lookupTable) {
        try {
          lookupData = await getTableDataFunc(tempRule.parameters.lookupTable);
          console.log('[Field Rule Preview] Loaded lookup table:', {
            table: tempRule.parameters.lookupTable,
            rowCount: lookupData.length,
            sampleRow: lookupData[0]
          });
        } catch (error) {
          console.error('[Field Rule Preview] Error loading lookup table:', error);
        }
      }
      
      // For MultipleLookups rules, pre-load all lookup tables
      if (tempRule.ruleType === RuleType.MultipleLookups && tempRule.parameters?.lookupSteps) {
        try {
          for (const step of tempRule.parameters.lookupSteps) {
            if (step.lookupTable && !lookupTables.has(step.lookupTable)) {
              const data = await getTableDataFunc(step.lookupTable);
              lookupTables.set(step.lookupTable, data);
              console.log('[Field Rule Preview] Loaded lookup table for chained lookup:', {
                table: step.lookupTable,
                rowCount: data.length
              });
            }
          }
        } catch (error) {
          console.error('[Field Rule Preview] Error loading lookup tables for chained lookup:', error);
        }
      }

      // Generate preview data by applying the rule to each source row
      const preview = previewRows.map((row, idx) => {
        let transformed;
        
        // Special handling for Lookup to show actual values
        if (tempRule.ruleType === RuleType.Lookup && lookupData.length > 0) {
          const params = tempRule.parameters as any;
          const sourceValue = row[params.sourceField];
          
          console.log(`[Preview Lookup ${idx}] Source value:`, {
            sourceField: params.sourceField,
            sourceValue,
            matchField: params.matchField,
            returnField: params.returnField
          });
          
          // Find matching record in lookup table
          if (sourceValue) {
            const matchedRecord = lookupData.find(lookupRow => {
              const lookupValue = lookupRow[params.matchField];
              const match = String(lookupValue || '').trim().toLowerCase() === String(sourceValue).trim().toLowerCase();
              if (idx === 0) {
                console.log(`[Preview Lookup ${idx}] Comparing:`, {
                  lookupValue,
                  sourceValue,
                  match
                });
              }
              return match;
            });
            
            if (matchedRecord) {
              transformed = matchedRecord[params.returnField] || params.defaultValue || '';
              console.log(`[Preview Lookup ${idx}] Match found:`, {
                matchedRecord,
                returnFieldValue: transformed
              });
            } else {
              transformed = params.defaultValue || '';
              console.log(`[Preview Lookup ${idx}] No match, using default:`, transformed);
            }
          } else {
            transformed = params.defaultValue || '';
            console.log(`[Preview Lookup ${idx}] Empty source value, using default:`, transformed);
          }
        } else if (tempRule.ruleType === RuleType.MultipleLookups && lookupTables.size > 0) {
          // Handle Multiple Lookups (chained) preview
          const params = tempRule.parameters as MultipleLookupsParameters;
          let currentValue: any = null;
          let success = true;

          // Execute lookups sequentially
          for (let stepIdx = 0; stepIdx < params.lookupSteps.length; stepIdx++) {
            const step = params.lookupSteps[stepIdx];
            const lookupData = lookupTables.get(step.lookupTable);

            if (!lookupData || lookupData.length === 0) {
              if (idx === 0) {
                console.log(`[Preview MultipleLookups ${idx}] Step ${stepIdx + 1} - Lookup table empty:`, step.lookupTable);
              }
              success = false;
              break;
            }

            let matchValue: any;

            // For first step, use source record fields
            // For subsequent steps, use previous lookup result
            if (stepIdx === 0) {
              // Extract match value from source record
              const joinConditions = step.joinConditions || [];
              
              if (joinConditions.length === 1 && joinConditions[0].type === 'field') {
                // Single field join
                const localField = joinConditions[0].localField;
                matchValue = row[localField];
              } else if (joinConditions.length > 1 && joinConditions.every(jc => jc.type === 'field')) {
                // Composite join
                const keyParts = joinConditions.map(jc => {
                  const val = row[jc.localField];
                  return val !== null && val !== undefined ? String(val) : '';
                });
                matchValue = keyParts.join('|||');
              } else if (joinConditions.length === 1 && joinConditions[0].type === 'concatenation') {
                // Concatenation join
                const localExpr = joinConditions[0].localExpression;
                if (localExpr) {
                  const parts = localExpr.split('+').map(p => p.trim());
                  matchValue = parts.map(part => {
                    if (part.startsWith('{') && part.endsWith('}')) {
                      const fieldName = part.slice(1, -1);
                      return row[fieldName] || '';
                    } else {
                      return part.replace(/['"]/g, '');
                    }
                  }).join('');
                }
              }
            } else {
              // Use previous lookup result
              matchValue = currentValue;
            }

            if (idx === 0) {
              console.log(`[Preview MultipleLookups ${idx}] Step ${stepIdx + 1} - Match value:`, matchValue);
            }

            if (!matchValue) {
              success = false;
              if (idx === 0) {
                console.log(`[Preview MultipleLookups ${idx}] Step ${stepIdx + 1} - Empty match value`);
              }
              break;
            }

            // Find matching record in lookup table
            let matchedRecord: any = null;
            const joinConditions = step.joinConditions || [];

            if (joinConditions.length === 1 && joinConditions[0].type === 'field') {
              // Single field join
              const sourceField = joinConditions[0].sourceField;
              matchedRecord = lookupData.find((record: any) => 
                String(record[sourceField]) === String(matchValue)
              );
            } else if (joinConditions.length > 1 && joinConditions.every(jc => jc.type === 'field')) {
              // Composite join
              matchedRecord = lookupData.find((record: any) => {
                const recordKeyParts = joinConditions.map(jc => {
                  const val = record[jc.sourceField];
                  return val !== null && val !== undefined ? String(val) : '';
                });
                const recordKey = recordKeyParts.join('|||');
                return recordKey === matchValue;
              });
            } else if (joinConditions.length === 1 && joinConditions[0].type === 'concatenation') {
              // Concatenation join
              const sourceExpr = joinConditions[0].sourceExpression;
              if (sourceExpr) {
                matchedRecord = lookupData.find((record: any) => {
                  const parts = sourceExpr.split('+').map(p => p.trim());
                  const recordValue = parts.map(part => {
                    if (part.startsWith('{') && part.endsWith('}')) {
                      const fieldName = part.slice(1, -1);
                      return record[fieldName] || '';
                    } else {
                      return part.replace(/['"]/g, '');
                    }
                  }).join('');
                  return recordValue === matchValue;
                });
              }
            }

            if (matchedRecord) {
              currentValue = matchedRecord[step.returnField];
              if (idx === 0) {
                console.log(`[Preview MultipleLookups ${idx}] Step ${stepIdx + 1} - Match found, return value:`, currentValue);
              }
            } else {
              success = false;
              if (idx === 0) {
                console.log(`[Preview MultipleLookups ${idx}] Step ${stepIdx + 1} - No match found`);
              }
              break;
            }
          }

          // Set final transformed value
          if (success && currentValue !== null && currentValue !== undefined) {
            transformed = currentValue;
          } else {
            transformed = params.defaultValue || '';
          }

          if (idx === 0) {
            console.log(`[Preview MultipleLookups ${idx}] Final result:`, transformed);
          }
        } else {
          transformed = applyFieldRuleForPreview(tempRule, row, idx);
        }
        
        return {
          source: row,
          transformed: transformed
        };
      });

      setFieldRulePreviewData(preview);
      console.log('[Field Rule Preview] Field rule preview generated:', {
        previewCount: preview.length,
        sampleTransformation: preview[0]
      });
      setShowFieldRulePreview(true);
    } catch (error) {
      console.error('[Field Rule Preview] Error generating field rule preview:', error);
    }
  };

  const executeMigration = async () => {
    setMigrationProgress(0);
    setMigrationLog([]);
    setFailedMigrationItems([]);
    setSkippedMigrationItems([]);

    const log = (message: string) => {
      setMigrationLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    try {
      log('Starting data migration...');
      log('⏳ Please select output directory in the file picker dialog...');
      console.log('[Migration] Waiting for directory picker...');

      // Request directory access for saving CSV files
      let directoryHandle: any;
      try {
        // @ts-ignore - File System Access API
        if (!window.showDirectoryPicker) {
          throw new Error('File System Access API not supported in this browser');
        }
        // @ts-ignore - File System Access API
        directoryHandle = await window.showDirectoryPicker();
        log('✓ Output directory selected');
        console.log('[Migration] Directory selected successfully');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Directory selection cancelled or not supported';
        log(`❌ ${errorMsg}`);
        console.error('[Migration] Directory picker error:', error);
        showSnackbar(errorMsg, 'error');
        setLoading(false);
        return;
      }

      // Now start the loading indicator after directory is selected
      setLoading(true);

      // Cache for transformed entity data to avoid reloading for each bridge record
      const entityDataCache = new Map<string, any[]>();
      // Cache for indexed lookups - dramatically speeds up bridge table joins
      const entityIndexCache = new Map<string, Map<string, any>>();

      // Helper function to load and transform entity data with caching
      // Handles MULTIPLE mappings for same target entity (e.g., equipment + equipment_child -> Equipment)
      const getTransformedEntityData = async (targetEntity: string): Promise<any[]> => {
        const combinedCacheKey = `COMBINED_${targetEntity}`;
        
        if (entityDataCache.has(combinedCacheKey)) {
          console.log(`[Cache Hit] Using cached combined data for ${targetEntity}`);
          return entityDataCache.get(combinedCacheKey)!;
        }

        console.log(`[Cache Miss] Loading and transforming ALL data for entity: ${targetEntity}`);
        
        // Find ALL mappings for this target entity (can be multiple source tables)
        const entityMappings = tableMappings.filter((m: any) => !m.isBridge && m.targetEntity === targetEntity);
        
        if (entityMappings.length === 0) {
          console.warn(`[getTransformedEntityData] No mappings found for entity: ${targetEntity}`);
          return [];
        }
        
        console.log(`[getTransformedEntityData] Found ${entityMappings.length} mapping(s) for ${targetEntity}:`, 
          entityMappings.map((m: any) => m.sourceTable));
        
        // Combine data from ALL mappings for this entity
        const allTransformedData: any[] = [];
        
        for (const entityMapping of entityMappings) {
          let entitySourceData = await loadSourceData(entityMapping.sourceTable);
          
          // CRITICAL: Apply filters from entity mapping to match filtered entity data
          if (entityMapping.filters && entityMapping.filters.length > 0) {
            const enabledFilters = entityMapping.filters.filter((f: any) => f.enabled);
            if (enabledFilters.length > 0) {
              const originalCount = entitySourceData.length;
              entitySourceData = applyFilters(entitySourceData, enabledFilters);
              console.log(`[Bridge Entity Filters] ${entityMapping.sourceTable}->${targetEntity}: Applied ${enabledFilters.length} filter(s): ${originalCount} → ${entitySourceData.length} records`);
            }
          }
          
          // Apply field mappings to get transformed entity data
          const entityTransformedData = entitySourceData.map((srcRecord: any) => {
            const entityTransformed: any = {};
            
            // Apply all field mappings
            entityMapping.fieldMappings?.forEach((fm: any) => {
              if (fm.generate) {
                if (fm.fieldRule) {
                  const ruleValue = generateValueFromRule(fm.fieldRule, srcRecord, 0, entityTransformed);
                  entityTransformed[fm.fieldName] = ruleValue;
                } else if (fm.sourceColumn) {
                  entityTransformed[fm.fieldName] = srcRecord[fm.sourceColumn];
                }
              }
            });
            
            // Apply PK rule if configured
            if (entityMapping.primaryKeyRule) {
              const pkValue = generateValueFromRule(entityMapping.primaryKeyRule, srcRecord, 0, entityTransformed);
              entityTransformed['PrimaryKey'] = pkValue;
            }
            
            return entityTransformed;
          });

          allTransformedData.push(...entityTransformedData);
          console.log(`[getTransformedEntityData] ${entityMapping.sourceTable}->${targetEntity}: added ${entityTransformedData.length} transformed records`);
        }

        console.log(`[getTransformedEntityData] Total combined records for ${targetEntity}: ${allTransformedData.length}`);
        entityDataCache.set(combinedCacheKey, allTransformedData);
        return allTransformedData;
      };
      
      // Helper to build indexed lookup for faster bridge joins
      const getEntityIndex = (entityData: any[], joinFields: any[], cacheKey: string): Map<string, any> => {
        if (entityIndexCache.has(cacheKey)) {
          return entityIndexCache.get(cacheKey)!;
        }
        
        const index = new Map<string, any>();
        entityData.forEach(record => {
          // Create composite key from join fields
          const keyParts = joinFields.map(jf => {
            let value = String(record[jf.entityField] ?? '').trim();
            if (jf.entityPrefix) value = jf.entityPrefix + value;
            if (jf.entitySuffix) value = value + jf.entitySuffix;
            return value.toLowerCase();
          });
          const compositeKey = keyParts.join('||');
          index.set(compositeKey, record);
        });
        
        entityIndexCache.set(cacheKey, index);
        console.log(`[Index Created] ${cacheKey}: ${index.size} entries`);
        return index;
      };

      let failedMappingsCount = 0;
      let successfulMappingsCount = 0;
      const failedItems: string[] = [];
      const skippedItems: string[] = [];
      
      // Track memory usage
      const logMemoryUsage = () => {
        if (performance && (performance as any).memory) {
          const memInfo = (performance as any).memory;
          console.log('[Memory] Usage:', {
            usedMB: (memInfo.usedJSHeapSize / (1024 * 1024)).toFixed(2),
            totalMB: (memInfo.totalJSHeapSize / (1024 * 1024)).toFixed(2),
            limitMB: (memInfo.jsHeapSizeLimit / (1024 * 1024)).toFixed(2),
            usagePercent: ((memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100).toFixed(2) + '%'
          });
        }
      };
      
      // CRITICAL: Reorder mappings to process tables by size (smallest first)
      // This prevents memory crashes from processing huge tables early
      // Bridge tables are processed last as they require joins and consume more memory
      const sortedMappings = [...tableMappings].sort((a, b) => {
        // Step 1: Non-bridge tables first (0), bridge tables last (1)
        const aOrder = a.isBridge ? 1 : 0;
        const bOrder = b.isBridge ? 1 : 0;
        if (aOrder !== bOrder) return aOrder - bOrder;
        
        // Step 2: Within each category (regular or bridge), sort by table size (smallest first)
        const aTable = dataSource?.tables.find(t => t.name === a.sourceTable);
        const bTable = dataSource?.tables.find(t => t.name === b.sourceTable);
        const aSize = aTable?.rowCount || 0;
        const bSize = bTable?.rowCount || 0;
        return aSize - bSize; // Ascending order: small tables first
      });
      
      log('Processing order: Small tables first, large tables last, bridge tables at the end');
      const bridgeCount = sortedMappings.filter(m => m.isBridge).length;
      const regularCount = sortedMappings.length - bridgeCount;
      log(`  → ${regularCount} regular table(s), ${bridgeCount} bridge table(s)`);
      log(`  → Sorted by row count to minimize memory usage`);

      for (let i = 0; i < sortedMappings.length; i++) {
        const mapping = sortedMappings[i];
        if (!mapping.enabled) {
          log(`Skipping disabled mapping: ${mapping.sourceTable} -> ${mapping.targetEntity}`);
          skippedItems.push(`${mapping.sourceTable} → ${mapping.targetEntity} | Disabled mapping`);
          continue;
        }

        const mappingStartTime = Date.now();
        logMemoryUsage();

        try {
          log(`Processing [${i + 1}/${sortedMappings.length}]: ${mapping.sourceTable} -> ${mapping.targetEntity}`);
          console.log(`[Migration] Processing mapping ${i + 1}/${sortedMappings.length}:`, {
            sourceTable: mapping.sourceTable,
            targetEntity: mapping.targetEntity,
            isBridge: mapping.isBridge,
            fieldMappingsCount: mapping.fieldMappings?.length || 0
          });
          
          // Special logging for material_sublots
          if (mapping.sourceTable === 'material_sublots') {
            console.log('🔍 [Material Sublots] Starting migration for material_sublots:', {
              targetEntity: mapping.targetEntity,
              enabled: mapping.enabled,
              fieldMappings: mapping.fieldMappings,
              primaryKeyRule: mapping.primaryKeyRule
            });
          }

          // Get source data
          const sourceTable = dataSource?.tables.find(t => t.name === mapping.sourceTable);
          if (!sourceTable) {
            log(`❌ Error: Source table ${mapping.sourceTable} not found`);
            console.error(`[Migration] Source table not found in dataSource.tables:`, {
              lookingFor: mapping.sourceTable,
              availableTables: dataSource?.tables.map(t => t.name)
            });
            skippedItems.push(`${mapping.sourceTable} → ${mapping.targetEntity} | Source table not found`);
            continue;
          }

          // Load actual data from IndexedDB or imported source
          const sourceData = await loadSourceData(mapping.sourceTable);
          log(`Loaded ${sourceData.length} records from ${mapping.sourceTable}`);
          console.log(`[Migration] Source data loaded:`, {
            sourceTable: mapping.sourceTable,
            recordCount: sourceData.length,
            sampleRecord: sourceData[0]
          });
          
          // Special logging for material_sublots data
          if (mapping.sourceTable === 'material_sublots') {
            console.log('🔍 [Material Sublots] Loaded source data:', {
              count: sourceData.length,
              allRecords: sourceData,
              sampleFields: sourceData[0] ? Object.keys(sourceData[0]) : []
            });
          }

          // Apply filters if configured
          // NOTE: For bridge tables, these filters only affect which BRIDGE RECORDS are processed
          // Entity lookups use filters from their own entity mappings (not bridge filters)
          let filteredData = sourceData;
          if (mapping.filters && mapping.filters.length > 0) {
            const enabledFilters = mapping.filters.filter(f => f.enabled);
            if (enabledFilters.length > 0) {
              filteredData = applyFilters(sourceData, enabledFilters);
              log(`Applied ${enabledFilters.length} filter(s): ${sourceData.length} → ${filteredData.length} records`);
              if (mapping.isBridge) {
                console.log(`[Bridge Filters] Filters applied to bridge source data only (entity lookups use their own filters):`, 
                  enabledFilters.map(f => ({ field: f.field, operator: f.operator, value: f.value })));
              }
            }
          }
          
          // Warn about large bridge table datasets
          if (mapping.isBridge && filteredData.length > 50000) {
            log(`⚠️  Warning: Large bridge table dataset (${filteredData.length} records). This may take several minutes...`);
            console.warn(`[Bridge Warning] Processing ${filteredData.length} bridge records. Consider filtering or splitting the data.`);
          }
          
          // Warn about large bridge table datasets
          if (mapping.isBridge && filteredData.length > 50000) {
            log(`⚠️  Warning: Large bridge table dataset (${filteredData.length} records). This may take several minutes...`);
            console.warn(`[Bridge Warning] Processing ${filteredData.length} bridge records. Consider filtering or splitting the data.`);
          }
          
          // Warn about large bridge table datasets
          if (mapping.isBridge && filteredData.length > 50000) {
            log(`⚠️  Warning: Large bridge table dataset (${filteredData.length} records). This may take several minutes...`);
            console.warn(`[Bridge Warning] Processing ${filteredData.length} bridge records. Consider filtering or splitting the data.`);
          }

          // Get entity for file naming
          const targetEntity = isa95Entities.find(e => e.tableName === mapping.targetEntity);

          // Initialize sequence counters for PK rule
          let pkSequenceCounter = 0;
          console.log(`[${mapping.targetEntity}] Starting transformation with primaryKeyRule:`, {
            hasPrimaryKeyRule: !!mapping.primaryKeyRule,
            ruleType: mapping.primaryKeyRule?.ruleType,
            parameters: mapping.primaryKeyRule?.parameters
          });
          
          if (mapping.primaryKeyRule) {
            const pkParams = mapping.primaryKeyRule.parameters as any;
            if (mapping.primaryKeyRule.ruleType === RuleType.Sequence) {
              pkSequenceCounter = pkParams?.start || 1;
            } else if (mapping.primaryKeyRule.ruleType === RuleType.PrefixSequence) {
            pkSequenceCounter = pkParams?.start || 1;
          }
        }

        // Transform data based on field mappings
        // Process in smaller batches to avoid Promise.all memory issues with large datasets
        // Use even smaller batches for bridge tables due to complex lookups
        const transformedData: any[] = [];
        
        // Dynamic batch sizing based on dataset size and type
        let TRANSFORM_BATCH_SIZE;
        if (mapping.isBridge) {
          // Ultra-small batches for huge bridge tables
          if (filteredData.length > 50000) {
            TRANSFORM_BATCH_SIZE = 100; // Very large datasets
            log(`  Using ultra-small batches (${TRANSFORM_BATCH_SIZE}) for large bridge table`);
          } else if (filteredData.length > 20000) {
            TRANSFORM_BATCH_SIZE = 250; // Large datasets
          } else {
            TRANSFORM_BATCH_SIZE = 500; // Normal bridge tables
          }
        } else {
          TRANSFORM_BATCH_SIZE = 5000; // Regular tables
        }
        
        // Helper to yield to browser to prevent UI freeze
        const yieldToBrowser = () => new Promise(resolve => setTimeout(resolve, 0));
        
        for (let batchStart = 0; batchStart < filteredData.length; batchStart += TRANSFORM_BATCH_SIZE) {
          const batchEnd = Math.min(batchStart + TRANSFORM_BATCH_SIZE, filteredData.length);
          const batch = filteredData.slice(batchStart, batchEnd);
          
          // Aggressive memory management for last 10% of processing
          const progressPercent = (i + (batchStart / filteredData.length)) / sortedMappings.length;
          if (progressPercent > 0.9) {
            // In final 10%, clear caches more aggressively every 1000 records
            if (batchStart > 0 && batchStart % 1000 === 0) {
              console.log(`[Memory - Final Stage ${(progressPercent * 100).toFixed(1)}%] Aggressive cache clearing at batch ${batchStart}`);
              const entitiesToKeep = mapping.isBridge ? [mapping.bridgeEntity1, mapping.bridgeEntity2] : [];
              const allCacheKeys = Array.from(entityDataCache.keys());
              allCacheKeys.forEach(key => {
                if (!entitiesToKeep.some(entity => key.includes(entity))) {
                  entityDataCache.delete(key);
                }
              });
              // Also clear index cache for non-current entities
              const allIndexKeys = Array.from(entityIndexCache.keys());
              allIndexKeys.forEach(key => {
                if (!entitiesToKeep.some(entity => key.includes(entity))) {
                  entityIndexCache.delete(key);
                }
              });
            }
          }
          
          // For large bridge tables, clear caches more frequently
          if (mapping.isBridge && filteredData.length > 50000 && batchStart > 0 && batchStart % 5000 === 0) {
            console.log(`[Memory] Clearing caches at batch ${batchStart} to prevent memory buildup`);
            // Clear only non-essential cached data
            const entitiesToKeep = [mapping.bridgeEntity1, mapping.bridgeEntity2];
            const allCacheKeys = Array.from(entityDataCache.keys());
            allCacheKeys.forEach(key => {
              if (!entitiesToKeep.some(entity => key.includes(entity))) {
                entityDataCache.delete(key);
              }
            });
          }
          
          // Yield to browser every batch to prevent freezing
          await yieldToBrowser();
          
          try {
            const batchTransformed = await Promise.all(batch.map(async (record: any, batchIndex: number) => {
              const recordIndex = batchStart + batchIndex;
              const transformed: any = {};
              
              try {
          
          // Special handling for bridge tables
          if (mapping.isBridge && mapping.bridgeEntity1 && mapping.bridgeEntity2) {
            const entity1 = isa95Entities.find(e => e.tableName === mapping.bridgeEntity1 || e.name === mapping.bridgeEntity1);
            const entity2 = isa95Entities.find(e => e.tableName === mapping.bridgeEntity2 || e.name === mapping.bridgeEntity2);
            
            if (entity1 && entity2) {
              // Bridge table structure: initialize columns in strict order
              // Required order: Source type, Source PrimaryKey, Target Type, Target PrimaryKey, Relationship Type
              transformed['Source type'] = entity1.name;
              transformed['Source PrimaryKey'] = ''; // Will be looked up from entity1 data
              transformed['Target Type'] = entity2.name;
              transformed['Target PrimaryKey'] = ''; // Will be looked up from entity2 data
              transformed['Relationship Type'] = mapping.relationshipType || 'related';
              
              // NEW APPROACH: Use join conditions to lookup PKs from entity mappings
              // Find ALL entity mappings for both entities (can be multiple source tables per entity)
              
              // Load entity1 data and perform join lookup (using cache to avoid repeated loads)
              if (mapping.bridgeEntity1JoinFields && mapping.bridgeEntity1JoinFields.length > 0) {
                try {
                  // Get cached/transformed entity1 data (combines ALL mappings for this entity)
                  const entity1TransformedData = await getTransformedEntityData(mapping.bridgeEntity1);
                  
                  // Get or create indexed lookup for fast joins
                  const entity1IndexKey = `${mapping.bridgeEntity1}_index`;
                  const entity1Index = getEntityIndex(entity1TransformedData, mapping.bridgeEntity1JoinFields, entity1IndexKey);
                  
                  // Only log first few records to avoid console spam
                  if (recordIndex < 3) {
                    console.log(`[Bridge ${recordIndex}] Entity1 lookup (indexed):`, {
                      entity1Name: mapping.bridgeEntity1,
                      indexSize: entity1Index.size,
                      joinFields: mapping.bridgeEntity1JoinFields
                    });
                  }
                  
                  // Build lookup key from bridge record
                  const lookupKeyParts = mapping.bridgeEntity1JoinFields.map((joinField: any) => {
                    let bridgeValue = String(record[joinField.bridgeField] ?? '').trim();
                    if (joinField.bridgePrefix) bridgeValue = joinField.bridgePrefix + bridgeValue;
                    if (joinField.bridgeSuffix) bridgeValue = bridgeValue + joinField.bridgeSuffix;
                    return bridgeValue.toLowerCase();
                  });
                  const lookupKey = lookupKeyParts.join('||');
                  
                  // Use indexed lookup (O(1) instead of O(n))
                  const matchingEntity1Record = entity1Index.get(lookupKey);
                  
                  if (matchingEntity1Record && matchingEntity1Record['PrimaryKey']) {
                    transformed['Source PrimaryKey'] = matchingEntity1Record['PrimaryKey'];
                    if (recordIndex < 3) {
                      console.log(`[Bridge ${recordIndex}] ✓ Entity1 PK found (indexed):`, matchingEntity1Record['PrimaryKey']);
                    }
                  } else {
                    // Enhanced diagnostic logging for failed lookups
                    if (recordIndex < 3) {
                      console.warn(`[Bridge ${recordIndex}] ❌ No matching Entity 1 record found`);
                      console.warn(`  Bridge record:`, record);
                      console.warn(`  Join fields config:`, mapping.bridgeEntity1JoinFields);
                      console.warn(`  Built lookup key:`, lookupKey);
                      console.warn(`  Entity1 index size:`, entity1Index.size);
                      console.warn(`  Sample Entity1 index keys (first 5):`, Array.from(entity1Index.keys()).slice(0, 5));
                      console.warn(`  Entity1 target:`, mapping.bridgeEntity1);
                    }
                    transformed['Source PrimaryKey'] = '';
                  }
                } catch (error) {
                  console.error('[Bridge Join] Error loading Entity 1 data:', error);
                  transformed['Source PrimaryKey'] = '';
                }
              } else {
                console.warn('[Bridge Mapping] No Entity 1 join fields configured');
                transformed['Source PrimaryKey'] = '';
              }
              
              // Load entity2 data and perform join lookup (using cache to avoid repeated loads)
              if (mapping.bridgeEntity2JoinFields && mapping.bridgeEntity2JoinFields.length > 0) {
                try {
                  // Get cached/transformed entity2 data (combines ALL mappings for this entity)
                  const entity2TransformedData = await getTransformedEntityData(mapping.bridgeEntity2);
                  
                  // Get or create indexed lookup for fast joins
                  const entity2IndexKey = `${mapping.bridgeEntity2}_index`;
                  const entity2Index = getEntityIndex(entity2TransformedData, mapping.bridgeEntity2JoinFields, entity2IndexKey);
                  
                  // Only log first few records to avoid console spam
                  if (recordIndex < 3) {
                    console.log(`[Bridge ${recordIndex}] Entity2 lookup (indexed):`, {
                      entity2Name: mapping.bridgeEntity2,
                      indexSize: entity2Index.size,
                      joinFields: mapping.bridgeEntity2JoinFields
                    });
                  }
                  
                  // Build lookup key from bridge record
                  const lookupKeyParts = mapping.bridgeEntity2JoinFields.map((joinField: any) => {
                    let bridgeValue = String(record[joinField.bridgeField] ?? '').trim();
                    if (joinField.bridgePrefix) bridgeValue = joinField.bridgePrefix + bridgeValue;
                    if (joinField.bridgeSuffix) bridgeValue = bridgeValue + joinField.bridgeSuffix;
                    return bridgeValue.toLowerCase();
                  });
                  const lookupKey = lookupKeyParts.join('||');
                  
                  // Use indexed lookup (O(1) instead of O(n))
                  const matchingEntity2Record = entity2Index.get(lookupKey);
                  
                  if (matchingEntity2Record && matchingEntity2Record['PrimaryKey']) {
                    transformed['Target PrimaryKey'] = matchingEntity2Record['PrimaryKey'];
                    if (recordIndex < 3) {
                      console.log(`[Bridge ${recordIndex}] ✓ Entity2 PK found (indexed):`, matchingEntity2Record['PrimaryKey']);
                    }
                  } else {
                    // Enhanced diagnostic logging for failed lookups
                    if (recordIndex < 3 || transformed['Source PrimaryKey'] === 'OPS-EVENT-SEG-RESP-PLANT01MUNICH-LINE-01-202601010030-RUN1-498-OED-PROC-TEMPDEV-937') {
                      console.warn(`[Bridge ${recordIndex}] ❌ No matching Entity 2 record found`);
                      console.warn(`  Bridge record:`, record);
                      console.warn(`  Join fields config:`, mapping.bridgeEntity2JoinFields);
                      console.warn(`  Built lookup key:`, lookupKey);
                      console.warn(`  Entity2 index size:`, entity2Index.size);
                      console.warn(`  Sample Entity2 index keys (first 5):`, Array.from(entity2Index.keys()).slice(0, 5));
                      console.warn(`  Entity2 target:`, mapping.bridgeEntity2);
                    }
                    transformed['Target PrimaryKey'] = '';
                  }
                } catch (error) {
                  console.error('[Bridge Join] Error loading Entity 2 data:', error);
                  transformed['Target PrimaryKey'] = '';
                }
              } else {
                console.warn('[Bridge Mapping] No Entity 2 join fields configured');
                transformed['Target PrimaryKey'] = '';
              }
              
              // Generate PrimaryKey for bridge table if PK rule is configured
              if (mapping.primaryKeyRule) {
                console.log(`[${mapping.targetEntity}] Generating bridge PrimaryKey with rule:`, {
                  ruleType: mapping.primaryKeyRule.ruleType,
                  parameters: mapping.primaryKeyRule.parameters,
                  currentSequenceCounter: pkSequenceCounter
                });
                
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
                    const fieldValues = (pkParams?.fields || []).map((fieldName: string) => {
                      return record[fieldName] || '';
                    });
                    pkValue = fieldValues.join(pkParams?.separator || '-');
                    break;
                  case RuleType.CompositeConcat:
                    const concatParts = (pkParams?.fields || []).map((field: any) => {
                      const fieldValue = record[field.fieldName] || '';
                      return `${field.prefix || ''}${fieldValue}${field.suffix || ''}`;
                    });
                    pkValue = `${pkParams?.globalPrefix || ''}${concatParts.join(pkParams?.separator || '-')}${pkParams?.globalSuffix || ''}`;
                    break;
                  default:
                    pkValue = recordIndex + 1;
                }

                console.log(`[${mapping.targetEntity}] Generated bridge PrimaryKey value:`, pkValue);
                transformed['PrimaryKey'] = pkValue;
              } else {
                console.log(`[${mapping.targetEntity}] WARNING: No primaryKeyRule configured for this mapping`);
              }
            }
          } else {
            // Pre-load lookup tables for this mapping if any field uses Lookup rule
            const lookupTables = new Map<string, any[]>();
            for (const fm of mapping.fieldMappings) {
              if (fm.generate && fm.fieldRule?.ruleType === RuleType.Lookup) {
                const params = fm.fieldRule.parameters as any;
                // Support both saved format (sourceTable) and preview format (lookupTable)
                const lookupTableName = params?.sourceTable || params?.lookupTable;
                if (lookupTableName && !lookupTables.has(lookupTableName)) {
                  const lookupData = await loadSourceData(lookupTableName);
                  lookupTables.set(lookupTableName, lookupData);
                  console.log(`[Lookup] Pre-loaded lookup table: ${lookupTableName} (${lookupData.length} records)`);
                }
              }
              // Pre-load all lookup tables for MultipleLookups rule
              if (fm.generate && fm.fieldRule?.ruleType === RuleType.MultipleLookups) {
                const params = fm.fieldRule.parameters as any;
                if (params?.lookupSteps && Array.isArray(params.lookupSteps)) {
                  for (const step of params.lookupSteps) {
                    const lookupTableName = step.lookupTable;
                    if (lookupTableName && !lookupTables.has(lookupTableName)) {
                      const lookupData = await loadSourceData(lookupTableName);
                      lookupTables.set(lookupTableName, lookupData);
                      console.log(`[MultipleLookups] Pre-loaded lookup table: ${lookupTableName} (${lookupData.length} records)`);
                    }
                  }
                }
              }
            }
            // Also pre-load lookup table for PK rule if it's a Lookup
            if (mapping.primaryKeyRule?.ruleType === RuleType.Lookup) {
              const pkParams = mapping.primaryKeyRule.parameters as any;
              const pkLookupTableName = pkParams?.sourceTable || pkParams?.lookupTable;
              if (pkLookupTableName && !lookupTables.has(pkLookupTableName)) {
                const lookupData = await loadSourceData(pkLookupTableName);
                lookupTables.set(pkLookupTableName, lookupData);
                console.log(`[Lookup] Pre-loaded PK lookup table: ${pkLookupTableName} (${lookupData.length} records)`);
              }
            }
            
            // Process each field mapping normally
            mapping.fieldMappings.forEach(fm => {
              if (fm.generate) {
                console.log(`[${mapping.targetEntity}] Processing field mapping:`, {
                  fieldName: fm.fieldName,
                  hasSourceColumn: !!fm.sourceColumn,
                  sourceColumn: fm.sourceColumn,
                  hasFieldRule: !!fm.fieldRule,
                  fieldRuleType: fm.fieldRule?.ruleType
                });
                
                // Priority: Field rule first, then direct mapping, then empty value
                if (fm.fieldRule) {
                  // Special handling for Lookup rule
                  if (fm.fieldRule.ruleType === RuleType.Lookup) {
                    const params = fm.fieldRule.parameters as any;
                    
                    // Resolve field names from joinConditions (saved format) or flat params (preview format)
                    let localField = params?.sourceField; // preview format
                    let matchField = params?.matchField;  // preview format
                    const lookupTableName = params?.sourceTable || params?.lookupTable;
                    
                    // Check joinConditions for the saved format
                    if (params?.joinConditions && params.joinConditions.length > 0) {
                      const joinCond = params.joinConditions[0];
                      if (joinCond.type === 'field') {
                        localField = joinCond.localField;
                        matchField = joinCond.sourceField;
                      } else if (joinCond.type === 'composite') {
                        // For composite, use first field pair
                        localField = joinCond.localFields?.[0];
                        matchField = joinCond.sourceFields?.[0];
                      }
                    }
                    
                    const sourceValue = record[localField];
                    const lookupData = lookupTables.get(lookupTableName);
                    
                    if (recordIndex < 3) {
                      console.log(`[Lookup] Resolving field ${fm.fieldName}:`, {
                        localField, matchField, lookupTableName,
                        sourceValue, returnField: params?.returnField,
                        hasLookupData: !!lookupData, lookupDataSize: lookupData?.length
                      });
                    }
                    
                    if (!lookupData) {
                      console.warn(`[Lookup] Table not loaded: ${lookupTableName}`);
                      transformed[fm.fieldName] = params?.defaultValue || '';
                    } else if (!sourceValue && sourceValue !== 0) {
                      transformed[fm.fieldName] = params?.defaultValue || '';
                      if (recordIndex < 3) {
                        console.warn(`[Lookup] Empty source value for field: ${localField}`);
                      }
                    } else {
                      // Perform lookup
                      const returnField = params?.returnField;
                      
                      // Support composite join (match on multiple fields)
                      let matchingRecord: any = null;
                      if (params?.joinConditions?.[0]?.type === 'composite') {
                        const joinCond = params.joinConditions[0];
                        const localFields = joinCond.localFields || [];
                        const sourceFields = joinCond.sourceFields || [];
                        matchingRecord = lookupData.find((r: any) => {
                          return localFields.every((lf: string, i: number) => {
                            const sf = sourceFields[i];
                            return sf && String(r[sf] || '').toLowerCase().trim() === String(record[lf] || '').toLowerCase().trim();
                          });
                        });
                      } else {
                        matchingRecord = lookupData.find((r: any) => 
                          String(r[matchField] || '').toLowerCase().trim() === String(sourceValue).toLowerCase().trim()
                        );
                      }
                      
                      if (matchingRecord && matchingRecord[returnField] !== undefined) {
                        transformed[fm.fieldName] = matchingRecord[returnField];
                        if (recordIndex < 3) {
                          console.log(`[Lookup] Match found: ${sourceValue} -> ${matchingRecord[returnField]}`);
                        }
                      } else {
                        transformed[fm.fieldName] = params?.defaultValue || '';
                        if (recordIndex < 3) {
                          console.warn(`[Lookup] No match found for: ${sourceValue} in ${lookupTableName}.${matchField}`);
                        }
                      }
                    }
                  } else if (fm.fieldRule.ruleType === RuleType.MultipleLookups) {
                    // Handle Multiple Lookups (chained lookups)
                    const params = fm.fieldRule.parameters as any;
                    let currentValue: any = null;
                    let lookupSuccess = true;
                    
                    if (!params?.lookupSteps || params.lookupSteps.length === 0) {
                      console.warn(`[MultipleLookups] No lookup steps defined for field: ${fm.fieldName}`);
                      transformed[fm.fieldName] = params?.defaultValue || '';
                    } else {
                      // Execute each lookup step in sequence
                      for (let stepIndex = 0; stepIndex < params.lookupSteps.length; stepIndex++) {
                        const step = params.lookupSteps[stepIndex];
                        const lookupData = lookupTables.get(step.lookupTable);
                        
                        if (!lookupData) {
                          console.warn(`[MultipleLookups Step ${stepIndex + 1}] Table not loaded: ${step.lookupTable}`);
                          lookupSuccess = false;
                          break;
                        }
                        
                        // Determine the value to use for matching
                        let matchValue: any;
                        if (stepIndex === 0) {
                          // First step: use value from source record
                          const joinCond = step.joinConditions?.[0];
                          if (joinCond?.type === 'field') {
                            matchValue = record[joinCond.localField];
                          } else if (joinCond?.type === 'composite') {
                            // For composite, build composite key from source fields
                            matchValue = joinCond.localFields?.map((f: string) => record[f]).join('|');
                          } else if (joinCond?.type === 'concatenation') {
                            // Evaluate local expression against source record
                            matchValue = joinCond.localExpression;
                            for (const key in record) {
                              matchValue = matchValue.replace(new RegExp(`\\{${key}\\}`, 'g'), record[key] || '');
                            }
                          }
                        } else {
                          // Subsequent steps: use result from previous lookup
                          matchValue = currentValue;
                        }
                        
                        if (recordIndex < 3) {
                          console.log(`[MultipleLookups Step ${stepIndex + 1}] Looking up:`, {
                            table: step.lookupTable,
                            matchValue,
                            returnField: step.returnField
                          });
                        }
                        
                        // Perform the lookup
                        const joinCond = step.joinConditions?.[0];
                        let matchingRecord: any = null;
                        
                        if (joinCond?.type === 'field') {
                          const sourceField = joinCond.sourceField;
                          matchingRecord = lookupData.find((r: any) =>
                            String(r[sourceField] || '').toLowerCase().trim() === String(matchValue).toLowerCase().trim()
                          );
                        } else if (joinCond?.type === 'composite') {
                          const sourceFields = joinCond.sourceFields || [];
                          matchingRecord = lookupData.find((r: any) => {
                            const compositeKey = sourceFields.map((sf: string) => r[sf] || '').join('|');
                            return compositeKey.toLowerCase().trim() === String(matchValue).toLowerCase().trim();
                          });
                        } else if (joinCond?.type === 'concatenation') {
                          matchingRecord = lookupData.find((r: any) => {
                            let sourceExpression = joinCond.sourceExpression || '';
                            for (const key in r) {
                              sourceExpression = sourceExpression.replace(new RegExp(`\\{${key}\\}`, 'g'), r[key] || '');
                            }
                            return sourceExpression.toLowerCase().trim() === String(matchValue).toLowerCase().trim();
                          });
                        }
                        
                        if (matchingRecord && matchingRecord[step.returnField] !== undefined) {
                          currentValue = matchingRecord[step.returnField];
                          if (recordIndex < 3) {
                            console.log(`[MultipleLookups Step ${stepIndex + 1}] Match found: ${matchValue} -> ${currentValue}`);
                          }
                        } else {
                          if (recordIndex < 3) {
                            console.warn(`[MultipleLookups Step ${stepIndex + 1}] No match found for: ${matchValue} in ${step.lookupTable}`);
                          }
                          lookupSuccess = false;
                          break;
                        }
                      }
                      
                      // Set final value
                      if (lookupSuccess && currentValue !== null) {
                        transformed[fm.fieldName] = currentValue;
                      } else {
                        transformed[fm.fieldName] = params?.defaultValue || '';
                      }
                    }
                  } else {
                    // Generate value using field rule, passing source record for conditional rules
                    console.log(`[${mapping.targetEntity}] Using field rule for ${fm.fieldName}:`, fm.fieldRule);
                    transformed[fm.fieldName] = generateValueFromRule(fm.fieldRule, record, recordIndex, transformed);
                  }
                } else if (fm.sourceColumn) {
                  // Map from source column, use empty string if undefined/null
                  let value = record[fm.sourceColumn];
                  if (value === undefined || value === null) {
                    value = '';
                    console.log(`[${mapping.targetEntity}] Direct mapping (empty): ${fm.fieldName} from ${fm.sourceColumn} (source value was undefined/null)`);
                  } else {
                    console.log(`[${mapping.targetEntity}] Direct mapping: ${fm.fieldName} = ${value} (from ${fm.sourceColumn})`);
                  }
                  transformed[fm.fieldName] = value;
                } else {
                  // No source column or rule, but field is marked for generation - include empty value
                  console.log(`[${mapping.targetEntity}] No mapping source for ${fm.fieldName}, including empty value`);
                  transformed[fm.fieldName] = '';
                }
              }
            });
            
            // Generate PrimaryKey field for regular (non-bridge) mappings if PK rule is configured
            if (mapping.primaryKeyRule) {
              console.log(`[${mapping.targetEntity}] Generating PrimaryKey with rule:`, {
                ruleType: mapping.primaryKeyRule.ruleType,
                parameters: mapping.primaryKeyRule.parameters,
                currentSequenceCounter: pkSequenceCounter
              });
              
              const pkParams = mapping.primaryKeyRule.parameters as any;
              let pkValue: any;

              switch (mapping.primaryKeyRule.ruleType) {
                case RuleType.Static:
                  console.log(`[${mapping.targetEntity}] Using Static rule, value:`, pkParams?.value);
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
                  console.log(`[${mapping.targetEntity}] Using Sequence rule, counter:`, pkSequenceCounter, 'increment:', pkParams?.increment);
                  pkValue = pkSequenceCounter;
                  pkSequenceCounter += pkParams?.increment || 1;
                  break;
                case RuleType.PrefixSequence:
                  console.log(`[${mapping.targetEntity}] Using PrefixSequence rule, counter:`, pkSequenceCounter, 'prefix:', pkParams?.prefix, 'suffix:', pkParams?.suffix, 'padding:', pkParams?.padding);
                  const padding = pkParams?.padding || 0;
                  const numStr = padding > 0 ? String(pkSequenceCounter).padStart(padding, '0') : String(pkSequenceCounter);
                  pkValue = `${pkParams?.prefix || ''}${numStr}${pkParams?.suffix || ''}`;
                  pkSequenceCounter += 1;
                  break;
                case 'Composite':
                  // Composite key: concatenate values from ISA-95 entity fields
                  // These fields should already be in the transformed object
                  console.log(`[${mapping.targetEntity}] Using Composite rule, fields:`, pkParams?.fields, 'separator:', pkParams?.separator, 'transformed fields:', Object.keys(transformed));
                  const fieldValues = (pkParams?.fields || []).map((fieldName: string) => {
                    // Get value from the transformed object (which has ISA-95 entity field names)
                    const value = transformed[fieldName] !== undefined ? transformed[fieldName] : '';
                    console.log(`[${mapping.targetEntity}] Composite field '${fieldName}' value from transformed:`, value);
                    return value;
                  });
                  pkValue = fieldValues.join(pkParams?.separator || '-');
                  console.log(`[${mapping.targetEntity}] Composite result:`, pkValue);
                  break;
                case RuleType.CompositeConcat:
                  // Composite + Concat: concatenate field values with individual prefix/suffix patterns
                  console.log(`[${mapping.targetEntity}] Using CompositeConcat rule, fields:`, pkParams?.fields, 'transformed fields:', Object.keys(transformed));
                  const concatParts = (pkParams?.fields || []).map((field: any) => {
                    // Get value from transformed object (ISA-95 entity field names)
                    const fieldValue = transformed[field.fieldName] !== undefined ? transformed[field.fieldName] : '';
                    const result = `${field.prefix || ''}${fieldValue}${field.suffix || ''}`;
                    console.log(`[${mapping.targetEntity}] CompositeConcat field '${field.fieldName}' from transformed: ${fieldValue} → ${result}`);
                    return result;
                  });
                  pkValue = `${pkParams?.globalPrefix || ''}${concatParts.join(pkParams?.separator || '-')}${pkParams?.globalSuffix || ''}`;
                  console.log(`[${mapping.targetEntity}] CompositeConcat result:`, pkValue);
                  break;
                case RuleType.Lookup:
                  // Lookup PK value from another table
                  let pkLocalField = pkParams?.sourceField;
                  let pkMatchField = pkParams?.matchField;
                  const pkLookupTableName = pkParams?.sourceTable || pkParams?.lookupTable;
                  
                  if (pkParams?.joinConditions && pkParams.joinConditions.length > 0) {
                    const joinCond = pkParams.joinConditions[0];
                    if (joinCond.type === 'field') {
                      pkLocalField = joinCond.localField;
                      pkMatchField = joinCond.sourceField;
                    } else if (joinCond.type === 'composite') {
                      pkLocalField = joinCond.localFields?.[0];
                      pkMatchField = joinCond.sourceFields?.[0];
                    }
                  }
                  
                  const pkSourceValue = record[pkLocalField];
                  const pkLookupData = lookupTables.get(pkLookupTableName);
                  
                  if (pkLookupData && pkSourceValue) {
                    const pkMatchingRecord = pkLookupData.find((r: any) => 
                      String(r[pkMatchField] || '').toLowerCase().trim() === String(pkSourceValue).toLowerCase().trim()
                    );
                    pkValue = pkMatchingRecord?.[pkParams?.returnField] ?? pkParams?.defaultValue ?? '';
                  } else {
                    pkValue = pkParams?.defaultValue || '';
                  }
                  console.log(`[${mapping.targetEntity}] Lookup PK result:`, pkValue);
                  break;
                default:
                  console.log(`[${mapping.targetEntity}] Using default rule (recordIndex + 1), rule type was:`, mapping.primaryKeyRule.ruleType);
                  pkValue = recordIndex + 1;
              }

              // Always add to PrimaryKey field
              console.log(`[${mapping.targetEntity}] Generated PrimaryKey value:`, pkValue);
              transformed['PrimaryKey'] = pkValue;
            }
          }
          
              // Log the final transformed record for debugging
              if (mapping.isBridge && recordIndex < 3) {
                console.log(`[Bridge Record ${recordIndex}] Final transformed:`, transformed);
              }
              
              return transformed;
              } catch (recordError) {
                console.error(`[Transform Error] Record ${recordIndex}:`, recordError, record);
                // Return empty object on error to avoid crashing entire batch
                return {};
              }
            }));
            
            transformedData.push(...batchTransformed);
            
            // Log progress for large datasets or bridge tables
            if (filteredData.length > 10000 || (mapping.isBridge && filteredData.length > 1000)) {
              const progressPercent = ((batchEnd / filteredData.length) * 100).toFixed(1);
              log(`Transformed ${batchEnd}/${filteredData.length} records (${progressPercent}%)...`);
              
              // Update overall migration progress more frequently for bridge tables
              if (mapping.isBridge && batchEnd % 2000 === 0) {
                const overallProgress = ((i + (batchEnd / filteredData.length)) / sortedMappings.length) * 100;
                setMigrationProgress(overallProgress);
              }
            }
          } catch (batchError) {
            console.error(`[Transform Error] Batch ${batchStart}-${batchEnd}:`, batchError);
            log(`⚠️  Error transforming batch, attempting to continue...`);
            // Continue with next batch
          }
        }

        log(`Transformed ${transformedData.length} records`);
        console.log(`[Migration] Transformation complete for ${mapping.targetEntity}:`, {
          isBridge: mapping.isBridge,
          transformedCount: transformedData.length,
          sampleTransformed: transformedData[0],
          allEmpty: transformedData.every(row => Object.keys(row).length === 0)
        });

        // Get entity display name for file naming (targetEntity already defined above)
        const entityDisplayName = targetEntity?.name || mapping.targetEntity;

        // Special logging for material_sublots before CSV save
        if (mapping.sourceTable === 'material_sublots') {
          console.log('🔍 [Material Sublots] About to save CSV:', {
            entityDisplayName,
            transformedRecordCount: transformedData.length,
            transformedData: transformedData,
            isBridge: mapping.isBridge
          });
        }
        
        // Save to ISA95 format as CSV
        log(`Exporting to CSV: ${entityDisplayName}...`);
        console.log(`[Migration] Saving CSV for ${entityDisplayName}:`, {
          recordCount: transformedData.length,
          isBridge: mapping.isBridge,
          sampleRecord: transformedData[0],
          columns: transformedData[0] ? Object.keys(transformedData[0]) : []
        });
        
        try {
          await saveToISA95CSV(entityDisplayName, transformedData, directoryHandle, mapping.isBridge, maxSplitFileSizeMB);
          log(`✓ Completed: ${mapping.sourceTable} -> ${entityDisplayName} (${transformedData.length} records)`);
          
          // Small delay between file saves to prevent directory handle staleness
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (csvError) {
          console.error(`[CSV Save Error] Failed to save ${entityDisplayName}:`, csvError);
          log(`❌ Error saving CSV for ${entityDisplayName}: ${csvError.message}`);
          failedMappingsCount++;
          failedItems.push(`${mapping.sourceTable} → ${mapping.targetEntity} | ${csvError.message}`);
          
          // Try to recover and continue with next mapping
          const errorMsg = `Failed to save ${entityDisplayName}: ${csvError.message}. Continuing with remaining mappings...`;
          showSnackbar(errorMsg, 'error');
          
          // Clear memory and continue
          entityDataCache.clear();
          entityIndexCache.clear();
          await yieldToBrowser();
          continue;
        }
        
        // Special logging for material_sublots after CSV save
        if (mapping.sourceTable === 'material_sublots') {
          console.log('✅ [Material Sublots] CSV save completed for material_sublots');
        }

        const mappingDuration = ((Date.now() - mappingStartTime) / 1000).toFixed(2);
        log(`⏱️  Mapping took ${mappingDuration}s`);
        successfulMappingsCount++;

        // Clear entity cache for this mapping to free memory
        const cacheKeys = Array.from(entityDataCache.keys());
        const relatedCacheKeys = cacheKeys.filter(key => 
          key.includes(mapping.bridgeEntity1 || '') || 
          key.includes(mapping.bridgeEntity2 || '')
        );
        relatedCacheKeys.forEach(key => entityDataCache.delete(key));
        
        // Also clear related index caches
        const indexKeys = Array.from(entityIndexCache.keys());
        const relatedIndexKeys = indexKeys.filter(key =>
          key.includes(mapping.bridgeEntity1 || '') ||
          key.includes(mapping.bridgeEntity2 || '')
        );
        relatedIndexKeys.forEach(key => entityIndexCache.delete(key));
        
        // Force garbage collection hint (browser may or may not honor)
        if (i % 5 === 0 && (entityDataCache.size > 10 || entityIndexCache.size > 10)) {
          console.log('[Memory] Clearing caches, sizes were:', {
            dataCache: entityDataCache.size,
            indexCache: entityIndexCache.size
          });
          entityDataCache.clear();
          entityIndexCache.clear();
        }
        
        // For very large bridge tables, force cache clear after completion
        if (mapping.isBridge && filteredData.length > 50000) {
          console.log('[Memory] Forcing cache clear after large bridge table');
          entityDataCache.clear();
          entityIndexCache.clear();
        }

        setMigrationProgress(((i + 1) / sortedMappings.length) * 100);
        } catch (mappingError) {
          // Log error for this specific mapping but continue with others
          const errorMessage = mappingError instanceof Error ? mappingError.message : String(mappingError);
          const errorStack = mappingError instanceof Error ? mappingError.stack : '';
          
          // Check if it's a memory-related error
          const isMemoryError = errorMessage.toLowerCase().includes('memory') || 
                               errorMessage.toLowerCase().includes('heap') ||
                               errorMessage.toLowerCase().includes('out of');
          
          if (isMemoryError) {
            log(`❌ MEMORY ERROR: ${mapping.sourceTable} -> ${mapping.targetEntity}`);
            log(`⚠️  Try reducing the dataset size or processing this table separately`);
            console.error('[Memory Error] Clearing all caches and attempting to continue...');
            entityDataCache.clear();
            entityIndexCache.clear();
          }
          
          log(`❌ Failed to process ${mapping.sourceTable} -> ${mapping.targetEntity}: ${errorMessage}`);
          console.error(`[Migration Error] Mapping failed for ${mapping.sourceTable}:`, {
            error: mappingError,
            stack: errorStack,
            mapping: mapping,
            isMemoryError
          });
          failedMappingsCount++;
          failedItems.push(`${mapping.sourceTable} → ${mapping.targetEntity} | ${errorMessage}`);
          
          // Clear cache on error to free memory
          entityDataCache.clear();
          entityIndexCache.clear();
          
          // Continue with next mapping instead of crashing
        }
      }
      
      // Final cleanup
      entityDataCache.clear();
      entityIndexCache.clear();
      logMemoryUsage();

      // Final summary
      log('─────────────────────────────────');
      log(`Migration complete! ✓ ${successfulMappingsCount} successful, ❌ ${failedMappingsCount} failed`);
      if (failedMappingsCount > 0) {
        log('⚠️  Please review the errors above');
      }

      setFailedMigrationItems(failedItems);
      setSkippedMigrationItems(skippedItems);

      log('Migration completed successfully!');
      showSnackbar('Migration completed successfully', 'success');
    } catch (error) {
      console.error('Migration failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      log(`❌ Error: Migration failed - ${errorMessage}`);
      if (errorStack) {
        log(`Stack trace: ${errorStack}`);
      }
      showSnackbar(`Migration failed: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  //  SERVER-SIDE MIGRATION (V2) — All heavy processing on backend
  // ═══════════════════════════════════════════════════════════════
  const parseIssueListsFromServerLog = (serverLog: string[]) => {
    const failedItems = new Set<string>();
    const skippedItems = new Set<string>();
    let section: 'failed' | 'skipped' | null = null;
    let currentMapping: { source: string; target: string } | null = null;

    const normalizeLogLine = (rawLine: string) =>
      rawLine
        .replace(/^\d{1,2}:\d{2}:\d{2}\s?(AM|PM)?\s*:\s*/i, '')
        .replace(/^\[Server\]\s*/i, '')
        .replace(/^\d{2}:\d{2}:\d{2}:\s*/, '')
        .trim();

    for (const rawLine of serverLog) {
      const line = normalizeLogLine(rawLine);

      const mappingMatch = line.match(/^\[\d+\/\d+\]\s+(.+?)\s*(?:→|->)\s*(.+?)(?:\s+\(BRIDGE\))?$/);
      if (mappingMatch) {
        currentMapping = {
          source: mappingMatch[1].trim(),
          target: mappingMatch[2].trim(),
        };
      }

      if (line.toLowerCase() === 'failed mappings:') {
        section = 'failed';
        continue;
      }

      if (line.toLowerCase() === 'skipped mappings:') {
        section = 'skipped';
        continue;
      }

      if (!section) {
        if (line.includes('empty or not found') && line.includes('skipping') && currentMapping) {
          skippedItems.add(`${currentMapping.source} → ${currentMapping.target} | Source table empty or not found`);
        }

        if (line.startsWith('❌ Failed:') && currentMapping) {
          const reason = line.replace(/^❌\s*Failed:\s*/i, '').trim();
          failedItems.add(`${currentMapping.source} → ${currentMapping.target} | ${reason || 'Processing failed'}`);
        }

        continue;
      }

      if (line.startsWith('- ')) {
        const item = line.substring(2).trim();
        if (item) {
          if (section === 'failed') {
            failedItems.add(item);
          } else {
            skippedItems.add(item);
          }
        }
      } else {
        section = null;
      }
    }

    return {
      failedItems: Array.from(failedItems),
      skippedItems: Array.from(skippedItems),
    };
  };

  const parseIssueCountsFromMigrationLog = (logLines: string[]) => {
    let failedCount = 0;
    let skippedCount = 0;

    const normalizeLogLine = (rawLine: string) =>
      rawLine
        .replace(/^\d{1,2}:\d{2}:\d{2}\s?(AM|PM)?\s*:\s*/i, '')
        .replace(/^\[Server\]\s*/i, '')
        .replace(/^\d{2}:\d{2}:\d{2}:\s*/, '')
        .trim();

    for (const rawLine of logLines) {
      const line = normalizeLogLine(rawLine);

      const summaryMatch = line.match(/Migration complete!.*❌\s*(\d+)\s*failed,\s*⚠\s*(\d+)\s*skipped/i);
      if (summaryMatch) {
        failedCount = parseInt(summaryMatch[1] || '0', 10);
        skippedCount = parseInt(summaryMatch[2] || '0', 10);
      }
    }

    return { failedCount, skippedCount };
  };

  const executeServerMigration = async () => {
    setMigrationProgress(0);
    setMigrationLog([]);
    setFailedMigrationItems([]);
    setSkippedMigrationItems([]);
    setLoading(true);

    const log = (message: string) => {
      setMigrationLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    let sessionId: string | null = null;

    try {
      // 1. Create migration session on server
      log('Creating migration session on server...');
      const session = await migrationApi.createSession(`Migration_${new Date().toISOString()}`);
      sessionId = session.id;
      log(`✓ Session created: ${sessionId}`);

      // 2. Collect and upload ALL source data from IndexedDB to SQL Server
      log('Uploading source data to SQL Server...');

      // Determine which stores are actually referenced by the mappings
      const referencedTables = new Set<string>();
      for (const m of tableMappings) {
        if (m.enabled && m.sourceTable) referencedTables.add(m.sourceTable);
        // Also include lookup tables referenced by field rules
        for (const fm of (m.fieldMappings || [])) {
          if (fm.fieldRule?.ruleType === 'Lookup') {
            const p = fm.fieldRule.parameters as any;
            const lt = p?.sourceTable || p?.lookupTable;
            if (lt) referencedTables.add(lt);
          }
          if (fm.fieldRule?.ruleType === 'MultipleLookups') {
            const p = fm.fieldRule.parameters as any;
            for (const step of (p?.lookupSteps || [])) {
              if (step.lookupTable) referencedTables.add(step.lookupTable);
            }
          }
        }
        // Include PK lookup tables
        if (m.primaryKeyRule?.ruleType === 'Lookup') {
          const p = m.primaryKeyRule.parameters as any;
          const lt = p?.sourceTable || p?.lookupTable;
          if (lt) referencedTables.add(lt);
        }
      }

      log(`${referencedTables.size} source table(s) needed`);

      const hasImportedReferencedTables = Array.from(referencedTables)
        .some((tableName) => (importedTablesData[tableName]?.length ?? 0) > 0);
      const preferServerSideSource = migrationLoadMode === 'full' && !hasImportedReferencedTables;

      // Upload each referenced store in partitions to avoid huge browser memory spikes.
      let uploadedCount = 0;
      let totalUploadedRecords = 0;
      const PARTITION_UPLOAD_SIZE = Math.min(20000, Math.max(200, Math.floor(uploadChunkSize || 2000)));
      const UPLOAD_LOG_EVERY_PARTS = 10;
      const uploadedStoreNames = new Set<string>();

      if (preferServerSideSource) {
        log(`Mode: ${migrationLoadMode}. Using backend source stores directly; upload chunk size (${PARTITION_UPLOAD_SIZE}) is ignored in this mode.`);
        setMigrationProgress(30);
      } else {
        log(`Mode: ${migrationLoadMode}. Upload chunk size: ${PARTITION_UPLOAD_SIZE} records/request`);
        if (migrationLoadMode === 'full' && hasImportedReferencedTables) {
          log('Imported source tables are present, so frontend upload remains enabled for those mappings.');
        }
      }

      const shouldIncludeForDeltaMigration = (record: any): boolean => {
        const lastMigrationAt = record?.LastDataMigrationAt ?? record?.lastDataMigrationAt;
        if (lastMigrationAt === null || lastMigrationAt === undefined) return true;
        if (typeof lastMigrationAt === 'string' && lastMigrationAt.trim() === '') return true;
        return false;
      };

      for (const tableName of referencedTables) {
        if (preferServerSideSource) break;

        try {
          let data: any[] = [];
          let storeNameForUpdate: string | null = null;
          const processStoreName = PROCESS_STORE_MAP[tableName];

          // For process stores, stream pages directly to upload to avoid loading huge tables in browser memory.
          if (processStoreName) {
            storeNameForUpdate = processStoreName;
            let lastId: number | null = null;
            let partSequence = 1;
            let uploadedForTable = 0;
            let expectedForTable = 0;
            const startMs = Date.now();

            while (true) {
              const page = await processDataApi.getPageKeyset(processStoreName as any, lastId, PARTITION_UPLOAD_SIZE);
              const pageItems = page.items || [];
              if (pageItems.length === 0) break;

              const pageToUpload = migrationLoadMode === 'delta'
                ? pageItems.filter(shouldIncludeForDeltaMigration)
                : pageItems;

              if (pageToUpload.length > 0) {
                const nowIso = new Date().toISOString();
                const part = pageToUpload.map((record) => ({
                  ...record,
                  DataGeneratedAt: record?.DataGeneratedAt ?? record?.dataGeneratedAt ?? record?.createdAt ?? nowIso,
                  LastDataMigrationAt: record?.LastDataMigrationAt ?? record?.lastDataMigrationAt ?? null,
                }));

                const partStoreName = `${tableName}__part_${String(partSequence).padStart(4, '0')}`;
                await migrationApi.uploadStoreData(sessionId, partStoreName, part);
                uploadedForTable += part.length;
                expectedForTable += pageToUpload.length;

                if (partSequence === 1 || partSequence % UPLOAD_LOG_EVERY_PARTS === 0) {
                  const elapsedSec = Math.max(1, Math.floor((Date.now() - startMs) / 1000));
                  const rps = Math.floor(uploadedForTable / elapsedSec);
                  log(`    ... ${tableName}: uploaded ${uploadedForTable} records in ${partSequence} part(s) (~${rps} rec/s)`);
                }

                partSequence++;
              }

              lastId = page.nextLastId ?? lastId;
              if (!page.hasMore) break;
            }

            if (uploadedForTable !== expectedForTable) {
              throw new Error(
                `Chunk upload mismatch for ${tableName}: uploaded ${uploadedForTable}, expected ${expectedForTable}`
              );
            }

            if (uploadedForTable > 0) {
              uploadedCount++;
              totalUploadedRecords += uploadedForTable;
              log(`  ↑ ${tableName}: ${uploadedForTable} records (${migrationLoadMode}, paged)`);
              uploadedStoreNames.add(storeNameForUpdate);
            } else {
              log(`  ⚠ ${tableName}: no records to upload for ${migrationLoadMode} mode`);
            }

            const uploadProgress = (uploadedCount / referencedTables.size) * 30;
            setMigrationProgress(uploadProgress);
            continue;
          }

          // Try master data store
          const masterStoreName = MASTER_STORE_MAP[tableName];
          if (masterStoreName) {
            data = await loadSourceData(tableName);
            storeNameForUpdate = masterStoreName;
          }

          // Try imported tables
          if (data.length === 0 && importedTablesData[tableName]) {
            data = importedTablesData[tableName];
          }

          const recordsToUpload = migrationLoadMode === 'delta'
            ? data.filter(shouldIncludeForDeltaMigration)
            : data;

          if (recordsToUpload.length > 0) {
            const totalParts = Math.ceil(recordsToUpload.length / PARTITION_UPLOAD_SIZE);
            let uploadedForTable = 0;
            const startMs = Date.now();

            for (let partIndex = 0; partIndex < totalParts; partIndex++) {
              const partStart = partIndex * PARTITION_UPLOAD_SIZE;
              const partEnd = Math.min(partStart + PARTITION_UPLOAD_SIZE, recordsToUpload.length);
              const part = recordsToUpload.slice(partStart, partEnd).map((record) => ({
                ...record,
                DataGeneratedAt: record?.DataGeneratedAt ?? record?.dataGeneratedAt ?? record?.createdAt ?? new Date().toISOString(),
                LastDataMigrationAt: record?.LastDataMigrationAt ?? record?.lastDataMigrationAt ?? null,
              }));

              const partStoreName = totalParts > 1
                ? `${tableName}__part_${String(partIndex + 1).padStart(4, '0')}`
                : tableName;

              await migrationApi.uploadStoreData(sessionId, partStoreName, part);
              uploadedForTable += part.length;

              const currentPart = partIndex + 1;
              if (currentPart === 1 || currentPart % UPLOAD_LOG_EVERY_PARTS === 0 || currentPart === totalParts) {
                const elapsedSec = Math.max(1, Math.floor((Date.now() - startMs) / 1000));
                const rps = Math.floor(uploadedForTable / elapsedSec);
                log(`    ... ${tableName}: uploaded ${uploadedForTable}/${recordsToUpload.length} records (${currentPart}/${totalParts} parts, ~${rps} rec/s)`);
              }
            }

            if (uploadedForTable !== recordsToUpload.length) {
              throw new Error(
                `Chunk upload mismatch for ${tableName}: uploaded ${uploadedForTable}, expected ${recordsToUpload.length}`
              );
            }

            uploadedCount++;
            totalUploadedRecords += recordsToUpload.length;
            log(`  ↑ ${tableName}: ${recordsToUpload.length}/${data.length} records (${migrationLoadMode})`);

            if (storeNameForUpdate) uploadedStoreNames.add(storeNameForUpdate);
          } else {
            log(`  ⚠ ${tableName}: no records to upload for ${migrationLoadMode} mode`);
          }
        } catch (uploadErr: any) {
          log(`  ❌ ${tableName}: upload failed — ${uploadErr.message}`);
          console.error(`Upload failed for ${tableName}:`, uploadErr);
          throw uploadErr;
        }

        // Update progress during upload phase (0-30%)
        const uploadProgress = (uploadedCount / referencedTables.size) * 30;
        setMigrationProgress(uploadProgress);
      }

      if (!preferServerSideSource) {
        log(`✓ Uploaded ${uploadedCount} stores (${totalUploadedRecords} total records) to SQL Server`);
      }

      // 3. Execute migration on the server
      log('Starting server-side migration processing...');
      await migrationApi.executeMigration(
        sessionId,
        tableMappings,
        maxSplitFileSizeMB,
        separateMasterProcessFiles,
        sourceIncludeTimestampSuffix,
        sourceSplitFiles,
        preferServerSideSource,
        true,
      );
      log('Migration processing started on server');

      // 4. Poll for progress
      let lastLogIndex = 0;
      const pollInterval = 8000; // 8 seconds
      let completed = false;

      while (!completed) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        try {
          const status = await migrationApi.getStatus(sessionId);

          // Show new log messages
          if (status.log && status.log.length > lastLogIndex) {
            for (let li = lastLogIndex; li < status.log.length; li++) {
              log(`[Server] ${status.log[li]}`);
            }
            lastLogIndex = status.log.length;
          }

          if (status.log && status.log.length > 0) {
            const { failedItems, skippedItems } = parseIssueListsFromServerLog(status.log);
            setFailedMigrationItems(failedItems);
            setSkippedMigrationItems(skippedItems);
          }

          // Update progress (30-100% range for server processing)
          const serverProgress = 30 + (status.progressPercentage * 0.7);
          setMigrationProgress(serverProgress);

          if (status.status === 'Completed' || status.status === 'CompletedWithErrors') {
            completed = true;

            if (uploadedStoreNames.size > 0) {
              log(`INFO: Skipped LastDataMigrationAt bulk restamp for ${uploadedStoreNames.size} store(s) to prevent browser memory spikes`);
            }

            if (status.status === 'CompletedWithErrors') {
              log('⚠ Migration completed with some errors — check the log above');
              showSnackbar('Migration completed with errors', 'warning');
            } else {
              log('✓ Migration completed successfully!');
              showSnackbar('Migration completed successfully', 'success');
            }
          } else if (status.status === 'Failed') {
            completed = true;
            throw new Error(status.errorMessage || 'Migration failed on server');
          } else if (status.status === 'Cancelled') {
            completed = true;
            log('Migration was cancelled');
            showSnackbar('Migration cancelled', 'info');
          }
        } catch (pollErr: any) {
          // If just a network blip, continue polling
          if (pollErr.message?.includes('Migration failed')) throw pollErr;
          console.warn('Poll error, retrying...', pollErr);
        }
      }

      // 5. Download the result ZIP
      log('Downloading migration output files...');
      setMigrationProgress(95);
      const blob = await migrationApi.downloadZip(sessionId);
      migrationApi.triggerDownload(blob, `migration_${new Date().toISOString().replace(/[:]/g, '-')}.zip`);
      log('✓ Output files downloaded');
      setMigrationProgress(100);

    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`❌ Error: ${errorMessage}`);
      showSnackbar(`Migration failed: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateValueFromRule = (fieldRule: FieldRuleConfig, sourceRecord?: any, index?: number, transformedRecord?: any): any => {
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
      case 'Composite':
        // For Composite PK, use the transformed record (ISA-95 entity fields)
        if (!transformedRecord) {
          console.warn('⚠️ Composite rule: transformedRecord not provided');
          return '';
        }
        const compositeFields = params?.fields || [];
        if (compositeFields.length === 0) {
          console.warn('⚠️ Composite rule: no fields configured');
          return '';
        }
        const compositeValues = compositeFields.map((fieldName: string) => {
          const value = transformedRecord[fieldName];
          return value !== undefined && value !== null ? String(value) : '';
        });
        const compositePK = compositeValues.join(params?.separator || '-');
        console.log('✅ Composite PK generated:', {
          fields: compositeFields,
          values: compositeValues,
          separator: params?.separator || '-',
          result: compositePK
        });
        return compositePK;
      case RuleType.CompositeConcat:
        // For CompositeConcat PK, use the transformed record (ISA-95 entity fields)
        if (!transformedRecord) {
          console.warn('⚠️ CompositeConcat rule: transformedRecord not provided');
          return '';
        }
        const concatFields = params?.fields || [];
        if (concatFields.length === 0) {
          console.warn('⚠️ CompositeConcat rule: no fields configured');
          return '';
        }
        const concatParts = concatFields.map((field: any) => {
          const fieldValue = transformedRecord[field.fieldName];
          const value = fieldValue !== undefined && fieldValue !== null ? String(fieldValue) : '';
          return `${field.prefix || ''}${value}${field.suffix || ''}`;
        });
        const compositeConcatPK = `${params?.globalPrefix || ''}${concatParts.join(params?.separator || '-')}${params?.globalSuffix || ''}`;
        console.log('✅ CompositeConcat PK generated:', {
          fields: concatFields,
          parts: concatParts,
          result: compositeConcatPK
        });
        return compositeConcatPK;
      case RuleType.Sequence:
        // For sequences, we'd need to track state - simplified here
        return (params?.start || 1);
      case RuleType.PrefixSequence:
        const start = params?.start || 1;
        const padding = params?.padding || 0;
        const numStr = padding > 0 ? String(start).padStart(padding, '0') : String(start);
        return `${params?.prefix || ''}${numStr}${params?.suffix || ''}`;
      case RuleType.IfThen:
        // Enhanced IfThen with multiple source fields support
        if (!sourceRecord) {
          console.log('[IfThen] No source record, returning falseValue:', params?.falseValue);
          return params?.falseValue || '';
        }
        
        // Support for multiple source fields - PREFER sourceField (Primary) over sourceFields (Additional)
        let sourceValueForCondition = '';
        let conditionFieldName = '';
        
        // Priority 1: Use Primary Source Field if set
        if (params?.sourceField && params.sourceField.trim()) {
          conditionFieldName = params.sourceField;
          sourceValueForCondition = String(sourceRecord[params.sourceField] !== undefined ? sourceRecord[params.sourceField] : '');
        }
        // Priority 2: Fall back to Additional Source Fields if Primary is not set
        else if (params?.sourceFields && params.sourceFields.length > 0) {
          // Use first field from the array (matches preview logic)
          conditionFieldName = params.sourceFields[0];
          sourceValueForCondition = conditionFieldName ? String(sourceRecord[conditionFieldName] !== undefined ? sourceRecord[conditionFieldName] : '') : '';
        }
        
        console.log('[IfThen] Evaluating condition:', {
          conditionFieldName,
          sourceValue: sourceValueForCondition,
          condition: params?.condition,
          availableFields: Object.keys(sourceRecord),
          sourceFieldValue: conditionFieldName ? sourceRecord[conditionFieldName] : 'N/A'
        });
        
        // Don't return early for empty strings - they should be evaluated by the condition
        // (e.g., "isnull" or "isempty" conditions need to check empty strings)
        
        const conditionMet = evaluateCondition(sourceValueForCondition, params?.condition || '');
        console.log('[IfThen] Condition met:', conditionMet, 'will return:', conditionMet ? params?.trueValue : params?.falseValue);
        
        // Process true/false values with field placeholders
        const resultValue = conditionMet ? (params?.trueValue || '') : (params?.falseValue || '');
        const finalValue = replaceFieldPlaceholders(resultValue, sourceRecord);
        console.log('[IfThen] Final value after placeholder replacement:', finalValue);
        return finalValue;
        
      case RuleType.Case:
        // Match source field value against cases
        if (!sourceRecord || !params?.sourceField) {
          console.warn('❌ Case rule: missing sourceRecord or sourceField', { sourceRecord, sourceField: params?.sourceField });
          return params?.defaultValue || '';
        }
        
        // Try to find the source field value (case-insensitive field name matching)
        let caseSourceValue = '';
        let foundFieldName = '';
        const sourceFieldLower = params.sourceField.toLowerCase();
        for (const key in sourceRecord) {
          if (key.toLowerCase() === sourceFieldLower) {
            caseSourceValue = String(sourceRecord[key] || '').trim(); // Trim whitespace
            foundFieldName = key;
            break;
          }
        }
        
        const cases = params?.cases || [];
        
        console.log('🔍 Case rule evaluation:', {
          configuredSourceField: params.sourceField,
          foundFieldName: foundFieldName,
          rawSourceValue: sourceRecord[foundFieldName],
          trimmedSourceValue: caseSourceValue,
          casesCount: cases.length,
          cases: cases.map((c: any) => ({ case: c.case, value: c.value })),
          availableFields: Object.keys(sourceRecord),
          defaultValue: params?.defaultValue
        });
        
        if (!caseSourceValue) {
          console.warn('⚠️ Case rule: source field value is empty after lookup');
          return params?.defaultValue || '';
        }
        
        // Find matching case (case-insensitive, trimmed comparison)
        for (const caseItem of cases) {
          const caseCondition = String(caseItem.case || '').trim();
          const caseValue = caseItem.value;
          
          console.log(`  🔎 Comparing: "${caseSourceValue.toLowerCase()}" === "${caseCondition.toLowerCase()}"`, {
            match: caseSourceValue.toLowerCase() === caseCondition.toLowerCase(),
            willReturn: caseValue
          });
          
          if (caseCondition && caseSourceValue.toLowerCase() === caseCondition.toLowerCase()) {
            console.log('✅ Case matched!', { condition: caseItem.case, result: caseItem.value });
            return caseValue || '';
          }
        }
        
        // No match found — resolve default: field reference takes priority over static value
        console.log('❌ No case matched, defaultFieldName:', params?.defaultFieldName, 'defaultValue:', params?.defaultValue);
        if (params?.defaultFieldName && sourceRecord) {
          const fieldVal = sourceRecord[params.defaultFieldName];
          return fieldVal !== undefined && fieldVal !== null ? String(fieldVal) : '';
        }
        return params?.defaultValue || '';
        
      case RuleType.Coalesce:
        // Return first non-null, non-empty value from source fields
        if (!sourceRecord || !params?.sourceFields) {
          return params?.defaultValue || '';
        }
        for (const field of params.sourceFields) {
          const value = sourceRecord[field];
          if (value !== undefined && value !== null && String(value).trim()) {
            return value;
          }
        }
        return params?.defaultValue || '';
        
      case RuleType.Concat:
        // Concatenate multiple source fields
        if (!sourceRecord || !params?.sourceFields) {
          return '';
        }
        const concatValues = params.sourceFields
          .map((field: string) => String(sourceRecord[field] || ''))
          .filter((v: string) => v.trim()); // Only include non-empty values
        
        const concatenated = concatValues.join(params?.separator || '');
        return `${params?.prefix || ''}${concatenated}${params?.suffix || ''}`;
      
      case RuleType.Lookup:
        // Lookup value from another table
        // Resolve field names from joinConditions (saved format) or flat params (preview format)
        let lookupLocalField = params?.sourceField; // preview format: flat sourceField
        let lookupMatchField = params?.matchField;  // preview format: flat matchField
        const lookupTableName = params?.sourceTable || params?.lookupTable;
        
        // Check joinConditions for the saved format
        if (params?.joinConditions && params.joinConditions.length > 0) {
          const joinCond = params.joinConditions[0];
          if (joinCond.type === 'field') {
            lookupLocalField = joinCond.localField;
            lookupMatchField = joinCond.sourceField;
          } else if (joinCond.type === 'composite') {
            lookupLocalField = joinCond.localFields?.[0];
            lookupMatchField = joinCond.sourceFields?.[0];
          }
        }
        
        if (!sourceRecord || !lookupLocalField) {
          console.warn('❌ Lookup rule: missing sourceRecord or localField');
          return params?.defaultValue || '';
        }
        
        // Get the value from the local field
        const lookupValue = sourceRecord[lookupLocalField];
        if (!lookupValue && lookupValue !== 0) {
          console.warn('❌ Lookup rule: source field value is empty', {
            localField: lookupLocalField,
            availableFields: Object.keys(sourceRecord)
          });
          return params?.defaultValue || '';
        }
        
        // Note: This is a synchronous function - actual lookup requires pre-loaded data
        // During migration execution, lookup is handled inline with pre-loaded tables
        // For other callers, return a descriptive placeholder
        return `[Lookup: ${lookupTableName}.${params?.returnField}]`;
        
      default:
        return '';
    }
  };

  // Helper function to replace {fieldName} placeholders with actual field values
  const replaceFieldPlaceholders = (template: string, sourceRecord: any): string => {
    if (!template || !sourceRecord) return template;
    
    return template.replace(/\{([^}]+)\}/g, (match, fieldName) => {
      const value = sourceRecord[fieldName.trim()];
      return value !== undefined && value !== null ? String(value) : '';
    });
  };

  const loadSourceData = async (
    tableName: string,
    options?: { limit?: number; forceRefresh?: boolean },
  ): Promise<any[]> => {
    const limit = options?.limit;
    const forceRefresh = options?.forceRefresh === true;

    // Check if it's an imported table first
    if (importedTablesData[tableName]) {
      const imported = importedTablesData[tableName];
      return typeof limit === 'number' ? imported.slice(0, limit) : imported;
    }

    if (!forceRefresh) {
      const cached = sourceDataCacheRef.current[tableName];
      if (cached) {
        return typeof limit === 'number' ? cached.slice(0, limit) : cached;
      }
    }

    const masterStoreName = MASTER_STORE_MAP[tableName];
    if (masterStoreName) {
      const data = await masterDataApi.getAll(masterStoreName);
      sourceDataCacheRef.current[tableName] = data;
      return typeof limit === 'number' ? data.slice(0, limit) : data;
    }

    const processStoreName = PROCESS_STORE_MAP[tableName];
    if (processStoreName) {
      if (typeof limit === 'number' && limit > 0) {
        const page = await processDataApi.getPage(processStoreName as any, 0, limit);
        return page.items || [];
      }

      const data = await processDataApi.getAll(processStoreName);
      
      // Add computed fields for segment_requirements
      if (tableName === 'segment_requirements') {
        const mapped = data.map((record: any) => ({
          ...record,
          durationHours: record.earliestStartDateTime && record.latestEndDateTime
            ? (new Date(record.latestEndDateTime).getTime() - new Date(record.earliestStartDateTime).getTime()) / (1000 * 60 * 60)
            : 0
        }));
        sourceDataCacheRef.current[tableName] = mapped;
        return typeof limit === 'number' ? mapped.slice(0, limit) : mapped;
      }
      
      sourceDataCacheRef.current[tableName] = data;
      return typeof limit === 'number' ? data.slice(0, limit) : data;
    }

    throw new Error(`Unknown table: ${tableName}`);
  };

  const saveToISA95CSV = async (entityName: string, data: any[], directoryHandle: any, isBridge: boolean = false, splitSizeMB: number = 10): Promise<void> => {
    console.log(`[CSV Save] Attempting to save ${entityName}:`, {
      isBridge,
      dataLength: data.length,
      sampleRecord: data[0],
      hasData: data.length > 0,
      estimatedSizeMB: ((JSON.stringify(data[0] || {}).length * data.length) / (1024 * 1024)).toFixed(2)
    });
    
    if (data.length === 0) {
      console.warn(`[CSV Save] Skipping ${entityName} - no data to save`);
      return;
    }

    const clampedSplitSizeMB = Math.min(10, Math.max(1, Number(splitSizeMB) || 10));
    const maxFileSizeBytes = clampedSplitSizeMB * 1024 * 1024;

    const estimatedBytesPerRecord = Math.max(
      100,
      Math.ceil((JSON.stringify(data[0] || {}).length + 2) * 1.2)
    );
    const recordsPerFile = Math.max(1, Math.floor(maxFileSizeBytes / estimatedBytesPerRecord));
    
    // Check if we need to split into multiple files
    if (data.length > recordsPerFile) {
      const fileCount = Math.ceil(data.length / recordsPerFile);
      console.log(`[CSV Save] Large table detected (${data.length} records). Splitting into ${fileCount} files by ~${clampedSplitSizeMB}MB...`);
      
      // Save each chunk as a separate file
      for (let fileIndex = 0; fileIndex < fileCount; fileIndex++) {
        const startIdx = fileIndex * recordsPerFile;
        const endIdx = Math.min(startIdx + recordsPerFile, data.length);
        const chunk = data.slice(startIdx, endIdx);
        
        // Add suffix to filename: EntityName_01, EntityName_02, etc.
        const fileSuffix = String(fileIndex + 1).padStart(2, '0');
        const chunkEntityName = `${entityName}_${fileSuffix}`;
        
        console.log(`[CSV Save] Saving chunk ${fileIndex + 1}/${fileCount}: ${chunkEntityName} (${chunk.length} records)`);
        
        // Save this chunk (using the same logic as below but for the chunk)
        await saveToISA95CSVSingleFile(chunkEntityName, chunk, directoryHandle, isBridge);
      }
      
      console.log(`[CSV Save] Successfully split ${entityName} into ${fileCount} files`);
      return;
    }
    
    // For tables under threshold, save as single file
    await saveToISA95CSVSingleFile(entityName, data, directoryHandle, isBridge);
  };

  // Helper function to save a single CSV file (no splitting)
  const saveToISA95CSVSingleFile = async (entityName: string, data: any[], directoryHandle: any, isBridge: boolean = false): Promise<void> => {
    // Use smaller chunks for very large datasets to avoid memory pressure
    const CHUNK_SIZE = data.length > 50000 ? 500 : 1000;

    // Format any date/datetime value as yyyy-MM-ddTHH:mm:ss.fffZ (ISO 8601 UTC with milliseconds)
    const toDateTimeFormat = (v: Date | string): string => {
      try {
        const d = v instanceof Date ? v : new Date(v as string);
        if (!isNaN(d.getTime())) return d.toISOString();
      } catch { /* fall through */ }
      return String(v);
    };
    
    let writable: any = null;
    const timestamp = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+/, '');
    const fileName = `${entityName}_${timestamp}.csv`;

    try {
      // Get all column names from the data
      let columns = Object.keys(data[0]);
      
      // Ensure PrimaryKey is first if it exists
      if (columns.includes('PrimaryKey')) {
        columns = ['PrimaryKey', ...columns.filter(col => col !== 'PrimaryKey')];
      }
      
      // Get the target directory handle (create mapping subfolder if bridge table)
      let targetDirectoryHandle = directoryHandle;
      if (isBridge) {
        // @ts-ignore - File System Access API
        targetDirectoryHandle = await directoryHandle.getDirectoryHandle('mapping', { create: true });
      }
      
      // Verify permission before file operation (helps prevent stale handle errors)
      // @ts-ignore - File System Access API
      const permission = await targetDirectoryHandle.queryPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        // @ts-ignore
        const requestResult = await targetDirectoryHandle.requestPermission({ mode: 'readwrite' });
        if (requestResult !== 'granted') {
          throw new Error('Write permission denied');
        }
      }
      
      // @ts-ignore - File System Access API
      const fileHandle = await targetDirectoryHandle.getFileHandle(fileName, { create: true });
      // @ts-ignore
      writable = await fileHandle.createWritable();
      
      // Write header
      await writable.write(columns.join(',') + '\n');
      
      // Process data in chunks to avoid memory issues
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, Math.min(i + CHUNK_SIZE, data.length));
        const csvRows: string[] = [];
        
        for (const row of chunk) {
          try {
            const values = columns.map(col => {
              const value = row[col];
              // Handle values that need quoting (contain commas, quotes, or newlines)
              if (value === null || value === undefined) {
                return '';
              }

              // Apply yyyy-MM-ddTHH:mm:ss.fffZ format for Date objects
              if (value instanceof Date) {
                return toDateTimeFormat(value);
              }

              const stringValue = String(value);

              // Apply yyyy-MM-ddTHH:mm:ss.fffZ format for datetime strings
              if (stringValue.match(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/)) {
                return toDateTimeFormat(stringValue);
              }

              if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
              }
              return stringValue;
            });
            csvRows.push(values.join(','));
          } catch (rowError) {
            console.error(`[CSV Save] Error processing row ${i}:`, rowError, row);
            // Continue with next row instead of failing entire export
          }
        }
        
        // Write chunk to file
        if (csvRows.length > 0) {
          await writable.write(csvRows.join('\n') + '\n');
          
          // For very large datasets, null out the csvRows array to help GC
          csvRows.length = 0;
        }
        
        // Log progress for large datasets
        if (data.length > 10000 && (i + CHUNK_SIZE) % 10000 === 0) {
          console.log(`[CSV Save] Progress: ${Math.min(i + CHUNK_SIZE, data.length)}/${data.length} rows written`);
        }
        
        // Yield to browser to prevent UI freeze on huge files
        if (i % 5000 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      await writable.close();
      writable = null;
      
      console.log(`[CSV Save] Successfully saved ${data.length} rows to ${fileName}`);
    } catch (error) {
      console.error('[CSV Save] Failed to save CSV:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Attempt to close writable if it's still open
      if (writable) {
        try {
          await writable.close();
        } catch (closeError) {
          console.error('[CSV Save] Error closing writable:', closeError);
        }
      }
      
      throw new Error(`Failed to save CSV file "${fileName}": ${errorMessage}`);
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
        // Entity-to-entity relationship format (strict column order)
        csvRows.push('Source type,Source PrimaryKey,Target Type,Target PrimaryKey,Relationship Type');
        
        bridgeMappings.forEach(mapping => {
          const entity1 = isa95Entities.find(e => e.tableName === mapping.bridgeEntity1 || e.name === mapping.bridgeEntity1);
          const entity2 = isa95Entities.find(e => e.tableName === mapping.bridgeEntity2 || e.name === mapping.bridgeEntity2);
          // Note: This exports the configuration template. Actual PrimaryKey values will be populated during data generation
          csvRows.push(
            `"${entity1?.name || mapping.bridgeEntity1}","[Generated]","${entity2?.name || mapping.bridgeEntity2}","[Generated]","${mapping.relationshipType || ''}"`
          );
        });
      }
      
      if (type === 'source-to-entity' || (type === 'all' && sourceMappings.length > 0)) {
        // Source to entity format
        if (csvRows.length > 0) csvRows.push(''); // Empty line separator
        csvRows.push('Source Table,Target Entity,Target Field,Generate,Source Column,Field Rule Type,Field Rule Params,Primary Key Rule Type,Primary Key Rule Params,Enabled');
        
        sourceMappings.forEach(mapping => {
          const targetEntity = isa95Entities.find(e => e.tableName === mapping.targetEntity);
          const pkRuleType = mapping.primaryKeyRule?.ruleType || '';
          const pkRuleParams = mapping.primaryKeyRule ? JSON.stringify(mapping.primaryKeyRule.parameters).replace(/"/g, '""') : '';
          
          mapping.fieldMappings.forEach(fieldMapping => {
            csvRows.push(
              `"${mapping.sourceTable}","${targetEntity?.name || mapping.targetEntity}","${fieldMapping.fieldName}","${fieldMapping.generate}","${fieldMapping.sourceColumn || ''}","${fieldMapping.fieldRule?.ruleType || ''}","${fieldMapping.fieldRule ? JSON.stringify(fieldMapping.fieldRule.parameters).replace(/"/g, '""') : ''}","${pkRuleType}","${pkRuleParams}","${mapping.enabled}"`
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
          showSnackbar('Source-to-entity CSV import not yet supported. Please use JSON format.', 'error');
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
        showSnackbar('No mappings found in file', 'error');
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
          
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Loading data sources...</Typography>
            </Box>
          )}
          
          {loadError && !loading && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Failed to load data sources. 
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => loadCurrentDataAsSource()}
                sx={{ ml: 2 }}
              >
                Retry
              </Button>
            </Alert>
          )}
          
          {dataSource && !loading ? (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Data source loaded: {dataSource.name} ({dataSource.tables.length} tables)
              </Alert>

              {/* Filter and Sort Controls */}
              <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  label="Filter tables"
                  size="small"
                  value={tableFilter}
                  onChange={(e) => setTableFilter(e.target.value)}
                  placeholder="Search by name..."
                  sx={{ flexGrow: 1, maxWidth: 400 }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={tableSortBy}
                    label="Sort By"
                    onChange={(e) => setTableSortBy(e.target.value as 'name' | 'rows')}
                  >
                    <MenuItem value="name">Table Name</MenuItem>
                    <MenuItem value="rows">Row Count</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Order</InputLabel>
                  <Select
                    value={tableSortOrder}
                    label="Order"
                    onChange={(e) => setTableSortOrder(e.target.value as 'asc' | 'desc')}
                  >
                    <MenuItem value="asc">Ascending</MenuItem>
                    <MenuItem value="desc">Descending</MenuItem>
                  </Select>
                </FormControl>
              </Box>

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
                    {dataSource.tables
                      .filter(table => 
                        tableFilter === '' || 
                        table.name.toLowerCase().includes(tableFilter.toLowerCase())
                      )
                      .sort((a, b) => {
                        if (tableSortBy === 'name') {
                          const comparison = a.name.localeCompare(b.name);
                          return tableSortOrder === 'asc' ? comparison : -comparison;
                        } else {
                          const comparison = a.rowCount - b.rowCount;
                          return tableSortOrder === 'asc' ? comparison : -comparison;
                        }
                      })
                      .map((table) => {
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
          ) : !loading && !loadError ? (
            <Alert severity="info">
              No data source available. Click "Reload Data Source" below.
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => loadCurrentDataAsSource()}
                sx={{ ml: 2 }}
              >
                Load Now
              </Button>
            </Alert>
          ) : null}
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
                    await migrationConfigApi.clearCurrentMappings();
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

          {loadedMappingsCount !== null && (
            <Alert severity={loadedMappingsCount > 0 ? 'success' : 'info'} sx={{ mb: 2 }}>
              Loaded {loadedMappingsCount} saved mapping{loadedMappingsCount === 1 ? '' : 's'} from database.
            </Alert>
          )}

          {/* Mapping filter and sort controls */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
            <TextField
              label="Filter Mappings"
              value={mappingFilter}
              onChange={(e) => setMappingFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 200 }}
              placeholder="Filter by source or target..."
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={mappingSortBy}
                onChange={(e) => setMappingSortBy(e.target.value as 'source' | 'target')}
                label="Sort By"
              >
                <MenuItem value="source">Source Table</MenuItem>
                <MenuItem value="target">Target Entity</MenuItem>
              </Select>
            </FormControl>
            <IconButton
              onClick={() => setMappingSortOrder(mappingSortOrder === 'asc' ? 'desc' : 'asc')}
              size="small"
            >
              {mappingSortOrder === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
            </IconButton>
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
                    {(dataSource?.tables || []).map(table => (
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
              {tableMappings
                .filter(mapping => !mapping.isBridge)
                .filter(mapping => 
                  mappingFilter === '' || 
                  mapping.sourceTable.toLowerCase().includes(mappingFilter.toLowerCase()) ||
                  mapping.targetEntity.toLowerCase().includes(mappingFilter.toLowerCase())
                )
                .sort((a, b) => {
                  let aValue, bValue;
                  if (mappingSortBy === 'source') {
                    aValue = a.sourceTable;
                    bValue = b.sourceTable;
                  } else {
                    aValue = a.targetEntity;
                    bValue = b.targetEntity;
                  }
                  const comparison = aValue.localeCompare(bValue);
                  return mappingSortOrder === 'asc' ? comparison : -comparison;
                })
                .map((mapping, filteredIndex) => {
                  // Find original index for state management
                  const originalIndex = tableMappings.findIndex(m => m === mapping);
                  
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
                        <Switch
                          checked={mapping.enabled !== false}
                          onChange={(e) => {
                            e.stopPropagation();
                            const newMappings = [...tableMappings];
                            newMappings[originalIndex].enabled = e.target.checked;
                            setTableMappings(newMappings);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          size="small"
                        />
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
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            generatePreviewData(originalIndex);
                          }}
                          sx={{ mr: 1 }}
                        >
                          Preview
                        </Button>
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
                              <Chip label={isa95Entities.find(e => e.tableName === mapping.bridgeEntity1 || e.name === mapping.bridgeEntity1)?.name || mapping.bridgeEntity1} color="primary" size="small" />
                              <Typography variant="body2">
                                ← Join: {mapping.bridgeEntity1JoinFields?.filter(f => f.bridgeField && f.entityField).map(f => `${f.bridgeField} = ${f.entityField}`).join(', ') || '(not configured)'}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip label={isa95Entities.find(e => e.tableName === mapping.bridgeEntity2 || e.name === mapping.bridgeEntity2)?.name || mapping.bridgeEntity2} color="secondary" size="small" />
                              <Typography variant="body2">
                                ← Join: {mapping.bridgeEntity2JoinFields?.filter(f => f.bridgeField && f.entityField).map(f => `${f.bridgeField} = ${f.entityField}`).join(', ') || '(not configured)'}
                              </Typography>
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
                            {mapping.primaryKeyRule && (
                              <Tooltip title={getFieldRuleSummary(mapping.primaryKeyRule)}>
                                <Chip 
                                  label={mapping.primaryKeyRule.ruleType} 
                                  size="small" 
                                  color="primary"
                                  variant="outlined"
                                />
                              </Tooltip>
                            )}
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
                            {mapping.primaryKeyRule && (
                              <Tooltip title={getFieldRuleSummary(mapping.primaryKeyRule)}>
                                <Chip 
                                  label={mapping.primaryKeyRule.ruleType} 
                                  size="small" 
                                  color="primary"
                                  variant="outlined"
                                />
                              </Tooltip>
                            )}
                          </Box>

                          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mt: 3 }}>
                            Source Table Filters
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                            Filter source table records based on column values (applied before migration)
                          </Typography>

                          <Box sx={{ mb: 3 }}>
                            {mapping.filters && mapping.filters.length > 0 ? (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                                {mapping.filters.map((filter, filterIndex) => (
                                  <Box 
                                    key={filterIndex} 
                                    sx={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: 1, 
                                      p: 1, 
                                      border: 1, 
                                      borderColor: 'divider', 
                                      borderRadius: 1,
                                      cursor: 'pointer',
                                      '&:hover': { bgcolor: 'action.hover' }
                                    }}
                                    onClick={() => {
                                      setSelectedFilter({ mappingIndex: originalIndex, filterIndex });
                                      setFilterDialog(true);
                                    }}
                                  >
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          checked={filter.enabled}
                                          onChange={(e) => handleToggleFilter(originalIndex, filterIndex, e.target.checked)}
                                          size="small"
                                        />
                                      }
                                      label=""
                                    />
                                    <Chip label={filter.column} size="small" color="primary" />
                                    <Chip label={filter.operator.replace('_', ' ')} size="small" variant="outlined" />
                                    {filter.operator !== 'is_null' && filter.operator !== 'is_not_null' && filter.operator !== 'is_empty' && filter.operator !== 'is_not_empty' && (
                                      <Chip label={`"${filter.value || ''}"`} size="small" variant="outlined" />
                                    )}
                                    <IconButton
                                      size="small"
                                      onClick={() => handleRemoveFilter(originalIndex, filterIndex)}
                                      color="error"
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
                                No filters configured - all records will be migrated
                              </Typography>
                            )}

                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<AddIcon />}
                              onClick={() => handleAddFilter(originalIndex)}
                            >
                              Add Filter
                            </Button>
                          </Box>

                          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mt: 1 }}>
                            Field Configuration
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                            Check fields to generate, assign source columns, or set field rules
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
                                      {fieldMapping.fieldName === 'sourceTimeStamp' && (
                                        <Chip label="Timestamp" size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
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
                                    ) : fieldMapping.fieldName === 'sourceTimeStamp' ? (
                                      <Typography variant="caption" color="text.secondary" display="block">
                                        Timestamp tracking when data was extracted from source system
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
                                        {(sourceTable?.columns || []).map(col => (
                                          <MenuItem key={col.name} value={col.name}>
                                            {col.name} ({col.type})
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
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

          {/* Bridge mapping filter and sort controls */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
            <TextField
              label="Filter Bridge Mappings"
              value={mappingFilter}
              onChange={(e) => setMappingFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 200 }}
              placeholder="Filter by source or entities..."
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={mappingSortBy}
                onChange={(e) => setMappingSortBy(e.target.value as 'source' | 'target')}
                label="Sort By"
              >
                <MenuItem value="source">Source Table</MenuItem>
                <MenuItem value="target">Bridge Name</MenuItem>
              </Select>
            </FormControl>
            <IconButton
              onClick={() => setMappingSortOrder(mappingSortOrder === 'asc' ? 'desc' : 'asc')}
              size="small"
            >
              {mappingSortOrder === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
            </IconButton>
          </Box>

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
                  {(dataSource?.tables || []).map(table => (
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
                    const capitalizedEntity1 = entity1Name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    setBridgeEntity1(e.target.value);
                    // Auto-generate bridge name if both entities are selected
                    if (bridgeEntity2) {
                      const entity2Name = isa95Entities.find(ent => ent.tableName === bridgeEntity2)?.name || '';
                      const capitalizedEntity2 = entity2Name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                      setBridgeName(`${capitalizedEntity1}_to_${capitalizedEntity2}_mapping`);
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
                    const capitalizedEntity2 = entity2Name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    setBridgeEntity2(e.target.value);
                    // Auto-generate bridge name if both entities are selected
                    if (bridgeEntity1) {
                      const entity1Name = isa95Entities.find(ent => ent.tableName === bridgeEntity1)?.name || '';
                      const capitalizedEntity1 = entity1Name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                      setBridgeName(`${capitalizedEntity1}_to_${capitalizedEntity2}_mapping`);
                    }
                  }}
                  label="Second ISA95 Entity"
                >
                  {isa95Entities.filter(e => tableMappings.some(m => m.targetEntity === e.tableName && !m.isBridge)).map(entity => (
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
              {tableMappings
                .filter(mapping => mapping.isBridge)
                .filter(mapping => 
                  mappingFilter === '' || 
                  mapping.sourceTable.toLowerCase().includes(mappingFilter.toLowerCase()) ||
                  mapping.targetEntity.toLowerCase().includes(mappingFilter.toLowerCase()) ||
                  (isa95Entities.find(e => e.tableName === mapping.bridgeEntity1 || e.name === mapping.bridgeEntity1)?.name || '').toLowerCase().includes(mappingFilter.toLowerCase()) ||
                  (isa95Entities.find(e => e.tableName === mapping.bridgeEntity2 || e.name === mapping.bridgeEntity2)?.name || '').toLowerCase().includes(mappingFilter.toLowerCase())
                )
                .sort((a, b) => {
                  let aValue, bValue;
                  if (mappingSortBy === 'source') {
                    aValue = a.sourceTable;
                    bValue = b.sourceTable;
                  } else {
                    aValue = a.targetEntity;
                    bValue = b.targetEntity;
                  }
                  const comparison = aValue.localeCompare(bValue);
                  return mappingSortOrder === 'asc' ? comparison : -comparison;
                })
                .map((mapping, filteredIndex) => {
                  // Find original index for state management
                  const originalIndex = tableMappings.findIndex(m => m === mapping);
                  
                  const sourceTable = dataSource?.tables.find(t => t.name === mapping.sourceTable);
                  const entity1 = isa95Entities.find(e => e.tableName === mapping.bridgeEntity1 || e.name === mapping.bridgeEntity1);
                  const entity2 = isa95Entities.find(e => e.tableName === mapping.bridgeEntity2 || e.name === mapping.bridgeEntity2);

                  return (
                    <Accordion 
                      key={originalIndex}
                      expanded={expandedBridgeMappings.has(originalIndex)}
                      onChange={() => handleAccordionToggle(originalIndex, true)}
                    >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                        <Switch
                          checked={mapping.enabled !== false}
                          onChange={(e) => {
                            e.stopPropagation();
                            const newMappings = [...tableMappings];
                            newMappings[originalIndex].enabled = e.target.checked;
                            setTableMappings(newMappings);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          size="small"
                        />
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
                        <Box sx={{ flexGrow: 1 }} />
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateBridgeMappingPreview(originalIndex);
                          }}
                          sx={{ mr: 1 }}
                        >
                          Preview
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Set editing mode and populate fields
                            setEditingBridgeIndex(originalIndex);
                            const mapping = tableMappings[originalIndex];
                            setSelectedSourceTable(mapping.sourceTable);
                            setBridgeEntity1(mapping.bridgeEntity1 || '');
                            setBridgeEntity1Column(mapping.bridgeEntity1Column || '');
                            setBridgeEntity1JoinFields(mapping.bridgeEntity1JoinFields || [{ bridgeField: '', entityField: '' }]);
                            setBridgeEntity1UsePKRule(mapping.bridgeEntity1UsePKRule || false);
                            setBridgeEntity2(mapping.bridgeEntity2 || '');
                            setBridgeEntity2Column(mapping.bridgeEntity2Column || '');
                            setBridgeEntity2JoinFields(mapping.bridgeEntity2JoinFields || [{ bridgeField: '', entityField: '' }]);
                            setBridgeEntity2UsePKRule(mapping.bridgeEntity2UsePKRule || false);
                            setBridgeName(mapping.targetEntity);
                            setRelationshipType(mapping.relationshipType || 'related');
                            setBridgeDialog(true);
                          }}
                          sx={{ mr: 1 }}
                        >
                          Edit
                        </Button>
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
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        This bridge table maps relationships between {entity1?.name} and {entity2?.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <Chip 
                          label={`${entity1?.name} via join: ${mapping.bridgeEntity1JoinFields?.filter(f => f.bridgeField && f.entityField).map(f => f.bridgeField).join(', ') || 'not configured'}`} 
                          size="small" 
                          color="primary"
                        />
                        <Chip 
                          label={`${entity2?.name} via join: ${mapping.bridgeEntity2JoinFields?.filter(f => f.bridgeField && f.entityField).map(f => f.bridgeField).join(', ') || 'not configured'}`} 
                          size="small" 
                          color="primary"
                        />
                      </Box>

                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mt: 3 }}>
                        Source Table Filters
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                        Filter source table records based on column values (applied before migration)
                      </Typography>

                      <Box sx={{ mb: 3 }}>
                        {mapping.filters && mapping.filters.length > 0 ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                            {mapping.filters.map((filter, filterIndex) => (
                              <Box 
                                key={filterIndex} 
                                sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: 1, 
                                  p: 1, 
                                  border: 1, 
                                  borderColor: 'divider', 
                                  borderRadius: 1,
                                  cursor: 'pointer',
                                  '&:hover': { bgcolor: 'action.hover' }
                                }}
                                onClick={() => {
                                  setSelectedFilter({ mappingIndex: originalIndex, filterIndex });
                                  setFilterDialog(true);
                                }}
                              >
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={filter.enabled}
                                      onChange={(e) => handleToggleFilter(originalIndex, filterIndex, e.target.checked)}
                                      size="small"
                                    />
                                  }
                                  label=""
                                />
                                <Chip label={filter.column} size="small" color="primary" />
                                <Chip label={filter.operator.replace('_', ' ')} size="small" variant="outlined" />
                                {filter.operator !== 'is_null' && filter.operator !== 'is_not_null' && filter.operator !== 'is_empty' && filter.operator !== 'is_not_empty' && (
                                  <Chip label={`"${filter.value || ''}"`} size="small" variant="outlined" />
                                )}
                                <IconButton
                                  size="small"
                                  onClick={() => handleRemoveFilter(originalIndex, filterIndex)}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
                            No filters configured - all records will be migrated
                          </Typography>
                        )}

                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => handleAddFilter(originalIndex)}
                        >
                          Add Filter
                        </Button>
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

          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Output Split Settings
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                label="Max split file size (MB)"
                type="number"
                size="small"
                value={maxSplitFileSizeMB}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (Number.isNaN(value)) return;
                  setMaxSplitFileSizeMB(Math.min(10, Math.max(1, value)));
                }}
                inputProps={{ min: 1, max: 10, step: 1 }}
                sx={{ width: 220 }}
              />
              <Typography variant="caption" color="text.secondary">
                Server and browser migration split large CSV files using this limit (max 10 MB).
              </Typography>
            </Box>
            <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="migration-load-mode-label">Data load mode</InputLabel>
                <Select
                  labelId="migration-load-mode-label"
                  value={migrationLoadMode}
                  label="Data load mode"
                  onChange={(e) => setMigrationLoadMode(e.target.value as 'full' | 'delta')}
                >
                  <MenuItem value="delta">Delta (never migrated only)</MenuItem>
                  <MenuItem value="full">Full (all records)</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary">
                Delta uploads only rows where `LastDataMigrationAt` is empty or null.
              </Typography>
            </Box>
            <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                label="Upload chunk size (records)"
                type="number"
                size="small"
                value={uploadChunkSize}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (Number.isNaN(value)) return;
                  setUploadChunkSize(Math.min(20000, Math.max(200, Math.floor(value))));
                }}
                inputProps={{ min: 200, max: 20000, step: 100 }}
                sx={{ width: 260 }}
              />
              <Typography variant="caption" color="text.secondary">
                Larger chunks increase throughput for very large tables. Recommended: 2000-10000 for stable machines.
              </Typography>
            </Box>
            <Box sx={{ mt: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={separateMasterProcessFiles}
                    onChange={(e) => setSeparateMasterProcessFiles(e.target.checked)}
                  />
                }
                label="Export source master/process data"
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
                This only applies to source data export. When enabled, source tables are exported to `source/master` and `source/process`; ISA95 output is unaffected.
              </Typography>
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Source CSV Settings
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={sourceIncludeTimestampSuffix}
                    onChange={(e) => setSourceIncludeTimestampSuffix(e.target.checked)}
                  />
                }
                label="Add timestamp suffix to source CSV file names"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={sourceSplitFiles}
                    onChange={(e) => setSourceSplitFiles(e.target.checked)}
                  />
                }
                label="Split source CSV files by max split file size"
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
                Disabled by default: source files are exported as a single file per source table without timestamp suffix.
              </Typography>
            </Box>
          </Paper>

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

          {(() => {
            const parsedFromVisibleLog = parseIssueListsFromServerLog(migrationLog);
            const effectiveFailedItems = failedMigrationItems.length > 0 ? failedMigrationItems : parsedFromVisibleLog.failedItems;
            const effectiveSkippedItems = skippedMigrationItems.length > 0 ? skippedMigrationItems : parsedFromVisibleLog.skippedItems;
            const { failedCount, skippedCount } = parseIssueCountsFromMigrationLog(migrationLog);

            const shouldShowSummary =
              effectiveFailedItems.length > 0 ||
              effectiveSkippedItems.length > 0 ||
              failedCount > 0 ||
              skippedCount > 0;

            if (!shouldShowSummary) {
              return null;
            }

            return (
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Migration Issues Summary
              </Typography>

              {(effectiveFailedItems.length > 0 || failedCount > 0) && (
                <Box sx={{ mb: (effectiveSkippedItems.length > 0 || skippedCount > 0) ? 2 : 0 }}>
                  <Typography variant="body2" color="error" sx={{ fontWeight: 600, mb: 1 }}>
                    Failed Mappings ({Math.max(failedCount, effectiveFailedItems.length)})
                  </Typography>
                  {effectiveFailedItems.map((item, index) => (
                    <Typography key={`failed-${index}`} variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
                      • {item}
                    </Typography>
                  ))}
                  {effectiveFailedItems.length === 0 && failedCount > 0 && (
                    <Typography variant="caption" display="block" sx={{ fontStyle: 'italic' }}>
                      Details not returned by server log for this run.
                    </Typography>
                  )}
                </Box>
              )}

              {(effectiveSkippedItems.length > 0 || skippedCount > 0) && (
                <Box>
                  <Typography variant="body2" color="warning.main" sx={{ fontWeight: 600, mb: 1 }}>
                    Skipped Mappings ({Math.max(skippedCount, effectiveSkippedItems.length)})
                  </Typography>
                  {effectiveSkippedItems.map((item, index) => (
                    <Typography key={`skipped-${index}`} variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
                      • {item}
                    </Typography>
                  ))}
                  {effectiveSkippedItems.length === 0 && skippedCount > 0 && (
                    <Typography variant="caption" display="block" sx={{ fontStyle: 'italic' }}>
                      Details not returned by server log for this run.
                    </Typography>
                  )}
                </Box>
              )}
            </Paper>
            );
          })()}

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<PlayIcon />}
              onClick={executeServerMigration}
              disabled={loading}
            >
              Start Migration (Server)
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              startIcon={<PlayIcon />}
              onClick={executeServerMigration}
              disabled={loading}
              title="Process entirely in the browser (may crash on large datasets)"
            >
              Browser-side (Legacy)
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
                <MenuItem value={RuleType.IfThen}>If-Then (Conditional)</MenuItem>
                <MenuItem value={RuleType.Case}>Case (Switch/Case)</MenuItem>
                <MenuItem value={RuleType.Coalesce}>Coalesce (First Non-Empty)</MenuItem>
                <MenuItem value={RuleType.Concat}>Concatenate Fields</MenuItem>
                <MenuItem value={RuleType.Lookup}>Lookup (From Table)</MenuItem>
                <MenuItem value={RuleType.MultipleLookups}>Multiple Lookups (Chained)</MenuItem>
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
                        const displayValue = typeof value === 'object' ? ((value as any).displayName || (value as any).enumValue || (value as any).name) : value;
                        const actualValue = typeof value === 'object' ? (value as any).enumValue : value;
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

            {/* IfThen Parameters */}
            {fieldRuleType === RuleType.IfThen && selectedFieldForRule && (() => {
              const mappingIndex = selectedFieldForRule.mappingIndex;
              const fieldMapping = tableMappings[mappingIndex]?.fieldMappings.find(
                f => f.fieldName === selectedFieldForRule.fieldName
              );
              const hasSourceColumn = !!fieldMapping?.sourceColumn;
              const sourceTable = dataSource?.tables.find(t => t.name === tableMappings[mappingIndex]?.sourceTable);
              
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Alert severity="info">
                    <strong>IfThen Rule:</strong> Conditional logic based on source field values.
                    {hasSourceColumn && (
                      <>
                        <br /><br />
                        <strong>⚠️ Condition evaluates against:</strong> <code>{fieldMapping.sourceColumn}</code>
                      </>
                    )}
                    <br /><br />
                    <strong>Condition formats:</strong>
                    <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                      <li><code>equals:value</code> - Exact match (e.g., equals:Active)</li>
                      <li><code>isnull</code> - Checks if field is null or empty (e.g., isnull)</li>
                      <li><code>isnotnull</code> - Checks if field has a value (e.g., isnotnull)</li>
                      <li><code>contains:text</code> - Contains substring (e.g., contains:error)</li>
                      <li><code>startswith:text</code> - Starts with (e.g., startswith:PRD-)</li>
                      <li><code>endswith:text</code> - Ends with (e.g., endswith:.com)</li>
                      <li><code>&gt; 100</code> - Greater than (numeric)</li>
                      <li><code>&lt; 50</code> - Less than (numeric)</li>
                      <li><code>&gt;= 100</code> - Greater or equal (numeric)</li>
                      <li><code>&lt;= 50</code> - Less or equal (numeric)</li>
                    </ul>
                    <strong>Field placeholders:</strong> Use <code>{'{fieldName}'}</code> in true/false values to reference any source field.
                    <br />
                    <strong>Example:</strong> Condition: <code>contains:error</code>, True Value: <code>Failed - {'{status}'}</code>, False Value: <code>Success - {'{result}'}</code>
                  </Alert>
                  
                  {!hasSourceColumn && (
                    <>
                      <FormControl fullWidth>
                        <InputLabel>Primary Source Field</InputLabel>
                        <Select
                          value={ifThenSourceField}
                          onChange={(e) => setIfThenSourceField(e.target.value)}
                          label="Primary Source Field"
                        >
                          <MenuItem value="">
                            <em>Select a source field</em>
                          </MenuItem>
                          {(sourceTable?.columns || []).map((col) => (
                            <MenuItem key={col.name} value={col.name}>
                              {col.name} ({col.type})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      
                      <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                        Additional Fields (Optional)
                      </Typography>
                      {ifThenSourceFields.map((field, index) => (
                        <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          <FormControl fullWidth>
                            <InputLabel>Additional Field {index + 1}</InputLabel>
                            <Select
                              value={field || ''}
                              onChange={(e) => {
                                const newFields = [...ifThenSourceFields];
                                newFields[index] = e.target.value;
                                setIfThenSourceFields(newFields);
                              }}
                              label={`Additional Field ${index + 1}`}
                            >
                              <MenuItem value="">
                                <em>Select a field</em>
                              </MenuItem>
                              {(sourceTable?.columns || []).map((col) => (
                                <MenuItem key={col.name} value={col.name}>
                                  {col.name} ({col.type})
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <IconButton
                            onClick={() => {
                              setIfThenSourceFields(ifThenSourceFields.filter((_, i) => i !== index));
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      ))}
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => setIfThenSourceFields([...ifThenSourceFields, ''])}
                        size="small"
                      >
                        Add Additional Field
                      </Button>
                    </>
                  )}
                  
                <TextField
                  fullWidth
                  label={`Condition (evaluates ${hasSourceColumn ? `"${fieldMapping.sourceColumn}"` : 'primary source field'})`}
                  value={ifThenCondition}
                  onChange={(e) => setIfThenCondition(e.target.value)}
                  placeholder="e.g., equals:Active, isnull, contains:error, > 100"
                  helperText="Format: equals:value | isnull | isnotnull | contains:text | startswith:text | endswith:text | > 100 | < 50 | >= 100 | <= 50"
                  sx={{ mt: 2 }}
                />
                <TextField
                  fullWidth
                  label="Value if True"
                  value={ifThenTrueValue}
                  onChange={(e) => setIfThenTrueValue(e.target.value)}
                  placeholder="e.g., High Priority, {status}-Completed"
                  helperText="Use {fieldName} syntax to insert field values. Example: Status: {status}, Result: {result}"
                />
                <TextField
                  fullWidth
                  label="Value if False"
                  value={ifThenFalseValue}
                  onChange={(e) => setIfThenFalseValue(e.target.value)}
                  placeholder="e.g., Normal, {status}-Pending"
                  helperText="Use {fieldName} syntax to insert field values. Example: Default - {name}"
                />
              </Box>
              );
            })()}

            {/* Case Parameters */}
            {fieldRuleType === RuleType.Case && selectedFieldForRule && (() => {
              const mappingIndex = selectedFieldForRule.mappingIndex;
              const fieldMapping = tableMappings[mappingIndex]?.fieldMappings.find(
                f => f.fieldName === selectedFieldForRule.fieldName
              );
              const hasSourceColumn = !!fieldMapping?.sourceColumn;
              const targetEntityName = tableMappings[mappingIndex]?.targetEntity;
              const targetEntity = isa95Entities.find(e => e.tableName === targetEntityName);
              const targetField = targetEntity?.fields.find(f => f.name === selectedFieldForRule.fieldName);
              const hasEnumValues = targetField?.enumValues && targetField.enumValues.length > 0;
              const targetEnumValues = targetField?.enumValues || [];
              const sourceTable = dataSource?.tables.find(t => t.name === tableMappings[mappingIndex]?.sourceTable);
              
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {hasSourceColumn ? (
                    <Alert severity="success">
                      Using source field: <strong>{fieldMapping.sourceColumn}</strong>
                      {hasEnumValues && ' • Target field is an enumeration'}
                    </Alert>
                  ) : (
                    <Alert severity="info">
                      Select the source field and define case-value pairs. The first matching case will be used.
                      {hasEnumValues && ' Target field is an enumeration - result values will use dropdown selects.'}
                    </Alert>
                  )}
                  {!hasSourceColumn && (
                    <FormControl fullWidth>
                      <InputLabel>Source Field</InputLabel>
                      <Select
                        value={caseSourceField}
                        onChange={(e) => setCaseSourceField(e.target.value)}
                        label="Source Field"
                      >
                        <MenuItem value="">
                          <em>Select a source field</em>
                        </MenuItem>
                        {(sourceTable?.columns || []).map((col: any) => (
                          <MenuItem key={col.name} value={col.name}>
                            {col.name} ({col.type})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                  <Typography variant="subtitle2" gutterBottom>
                    Case Conditions
                  </Typography>
                  {caseCases.map((caseItem, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                      <TextField
                        fullWidth
                        label="Case"
                        value={caseItem?.case || ''}
                        onChange={(e) => {
                          const newCases = [...caseCases];
                          newCases[index].case = e.target.value;
                          setCaseCases(newCases);
                        }}
                        placeholder="Case value to match"
                      />
                      {hasEnumValues ? (
                        <FormControl fullWidth>
                          <InputLabel>Result Value</InputLabel>
                          <Select
                            value={caseItem?.value || ''}
                            onChange={(e) => {
                              const newCases = [...caseCases];
                              newCases[index].value = e.target.value;
                              setCaseCases(newCases);
                            }}
                            label="Result Value"
                          >
                            {targetEnumValues.map((value, idx) => {
                              const displayValue = typeof value === 'object' ? ((value as any).displayName || (value as any).enumValue || (value as any).name) : value;
                              const actualValue = typeof value === 'object' ? (value as any).enumValue : value;
                              return (
                                <MenuItem key={idx} value={actualValue}>
                                  {displayValue}
                                </MenuItem>
                              );
                            })}
                          </Select>
                        </FormControl>
                      ) : (
                        <TextField
                          fullWidth
                          label="Result Value"
                          value={caseItem?.value || ''}
                          onChange={(e) => {
                            const newCases = [...caseCases];
                            newCases[index].value = e.target.value;
                            setCaseCases(newCases);
                          }}
                          placeholder="Value to return"
                        />
                      )}
                      <IconButton
                        color="error"
                        onClick={() => {
                          if (caseCases.length > 1) {
                          setCaseCases(caseCases.filter((_, i) => i !== index));
                        }
                      }}
                      disabled={caseCases.length === 1}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setCaseCases([...caseCases, { case: '', value: '' }])}
                  size="small"
                >
                  Add Case
                </Button>
                {/* Default value: static string OR a source field reference */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2">Default (if no case matches)</Typography>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={caseDefaultValueType === 'field'}
                          onChange={(e) => {
                            setCaseDefaultValueType(e.target.checked ? 'field' : 'static');
                            setCaseDefaultValue('');
                            setCaseDefaultFieldName('');
                          }}
                        />
                      }
                      label={<Typography variant="caption">Use source field</Typography>}
                      sx={{ ml: 0 }}
                    />
                  </Box>
                  {caseDefaultValueType === 'field' ? (
                    <FormControl fullWidth>
                      <InputLabel>Default Source Field</InputLabel>
                      <Select
                        value={caseDefaultFieldName}
                        onChange={(e) => setCaseDefaultFieldName(e.target.value)}
                        label="Default Source Field"
                      >
                        <MenuItem value=""><em>None</em></MenuItem>
                        {(sourceTable?.columns || []).map((col: any) => (
                          <MenuItem key={col.name} value={col.name}>
                            {col.name} ({col.type})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : hasEnumValues ? (
                    <FormControl fullWidth>
                      <InputLabel>Default Value (Optional)</InputLabel>
                      <Select
                        value={caseDefaultValue}
                        onChange={(e) => setCaseDefaultValue(e.target.value)}
                        label="Default Value (Optional)"
                      >
                        <MenuItem value="">
                          <em>None</em>
                        </MenuItem>
                        {targetEnumValues.map((value, idx) => {
                          const displayValue = typeof value === 'object' ? ((value as any).displayName || (value as any).enumValue || (value as any).name) : value;
                          const actualValue = typeof value === 'object' ? (value as any).enumValue : value;
                          return (
                            <MenuItem key={idx} value={actualValue}>
                              {displayValue}
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>
                  ) : (
                    <TextField
                      fullWidth
                      label="Default Value (Optional)"
                      value={caseDefaultValue}
                      onChange={(e) => setCaseDefaultValue(e.target.value)}
                      placeholder="Value if no cases match"
                      helperText="Optional: static value to use if none of the cases match"
                    />
                  )}
                </Box>
              </Box>
              );
            })()}

            {/* Coalesce Parameters */}
            {fieldRuleType === RuleType.Coalesce && selectedFieldForRule && (() => {
              const mappingIndex = selectedFieldForRule.mappingIndex;
              const sourceTable = dataSource?.tables.find(t => t.name === tableMappings[mappingIndex]?.sourceTable);
              
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Alert severity="info">
                    The Coalesce rule returns the first non-null, non-empty value from the selected fields.
                  </Alert>
                  <Typography variant="subtitle2" gutterBottom>
                    Source Fields (in priority order)
                  </Typography>
                  {coalesceSourceFields.map((field, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ minWidth: 30 }}>
                        {index + 1}.
                      </Typography>
                      <FormControl fullWidth>
                        <InputLabel>Field {index + 1}</InputLabel>
                        <Select
                          value={field || ''}
                          onChange={(e) => {
                            const newFields = [...coalesceSourceFields];
                            newFields[index] = e.target.value;
                            setCoalesceSourceFields(newFields);
                          }}
                          label={`Field ${index + 1}`}
                        >
                          <MenuItem value="">
                            <em>Select a field</em>
                          </MenuItem>
                          {(sourceTable?.columns || []).map((col) => (
                            <MenuItem key={col.name} value={col.name}>
                              {col.name} ({col.type})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <IconButton
                        onClick={() => {
                          setCoalesceSourceFields(coalesceSourceFields.filter((_, i) => i !== index));
                        }}
                        disabled={coalesceSourceFields.length <= 1}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setCoalesceSourceFields([...coalesceSourceFields, ''])}
                    size="small"
                  >
                    Add Field
                  </Button>
                  <TextField
                    fullWidth
                    label="Default Value (Optional)"
                    value={coalesceDefaultValue}
                    onChange={(e) => setCoalesceDefaultValue(e.target.value)}
                    placeholder="Value if all fields are null/empty"
                    helperText="Optional: Value to use if all fields are null or empty"
                  />
                </Box>
              );
            })()}

            {/* Concat Parameters */}
            {fieldRuleType === RuleType.Concat && selectedFieldForRule && (() => {
              const mappingIndex = selectedFieldForRule.mappingIndex;
              const sourceTable = dataSource?.tables.find(t => t.name === tableMappings[mappingIndex]?.sourceTable);
              
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Alert severity="info">
                    The Concat rule concatenates values from multiple source fields.
                  </Alert>
                  <Typography variant="subtitle2" gutterBottom>
                    Source Fields to Concatenate
                  </Typography>
                  {concatSourceFields.map((field, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ minWidth: 30 }}>
                        {index + 1}.
                      </Typography>
                      <FormControl fullWidth>
                        <InputLabel>Field {index + 1}</InputLabel>
                        <Select
                          value={field || ''}
                          onChange={(e) => {
                            const newFields = [...concatSourceFields];
                            newFields[index] = e.target.value;
                            setConcatSourceFields(newFields);
                          }}
                          label={`Field ${index + 1}`}
                        >
                          <MenuItem value="">
                            <em>Select a field</em>
                          </MenuItem>
                          {(sourceTable?.columns || []).map((col) => (
                            <MenuItem key={col.name} value={col.name}>
                              {col.name} ({col.type})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <IconButton
                        onClick={() => {
                          setConcatSourceFields(concatSourceFields.filter((_, i) => i !== index));
                        }}
                        disabled={concatSourceFields.length <= 1}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setConcatSourceFields([...concatSourceFields, ''])}
                    size="small"
                  >
                    Add Field
                  </Button>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      fullWidth
                      label="Separator (Optional)"
                      value={concatSeparator}
                      onChange={(e) => setConcatSeparator(e.target.value)}
                      placeholder="e.g., ' ', '-', ','"
                      helperText="Character(s) to insert between values"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      fullWidth
                      label="Prefix (Optional)"
                      value={concatPrefix}
                      onChange={(e) => setConcatPrefix(e.target.value)}
                      placeholder="Text before result"
                    />
                    <TextField
                      fullWidth
                      label="Suffix (Optional)"
                      value={concatSuffix}
                      onChange={(e) => setConcatSuffix(e.target.value)}
                      placeholder="Text after result"
                    />
                  </Box>
                </Box>
              );
            })()}

            {/* Lookup Rule Configuration */}
            {fieldRuleType === RuleType.Lookup && selectedFieldForRule && (() => {
              const mappingIndex = selectedFieldForRule.mappingIndex;
              const currentSourceTable = dataSource?.tables.find(t => t.name === tableMappings[mappingIndex]?.sourceTable);
              
              return (
                <Box sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Lookup Configuration
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Look up a value from another source table based on join conditions.
                  </Typography>
                  
                  {/* Source Table Selection */}
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Lookup Table</InputLabel>
                    <Select
                      value={lookupSourceTable}
                      onChange={(e) => setLookupSourceTable(e.target.value)}
                      label="Lookup Table"
                    >
                      {(dataSource?.tables || []).map((table) => (
                        <MenuItem key={table.name} value={table.name}>
                          {table.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Join Type Selection */}
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Join Type</InputLabel>
                    <Select
                      value={lookupJoinType}
                      onChange={(e) => setLookupJoinType(e.target.value as 'field' | 'composite' | 'concatenation')}
                      label="Join Type"
                    >
                      <MenuItem value="field">Single Field</MenuItem>
                      <MenuItem value="composite">Composite (Multiple Fields)</MenuItem>
                      <MenuItem value="concatenation">Concatenation (Expression)</MenuItem>
                    </Select>
                  </FormControl>

                  {/* Single Field Join */}
                  {lookupJoinType === 'field' && (
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <FormControl fullWidth>
                        <InputLabel>Local Field (from source table)</InputLabel>
                        <Select
                          value={lookupLocalField}
                          onChange={(e) => setLookupLocalField(e.target.value)}
                          label="Local Field (from source table)"
                        >
                          {(currentSourceTable?.columns || []).map((col) => (
                              <MenuItem key={col.name} value={col.name}>
                                {col.name}
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                      <FormControl fullWidth>
                        <InputLabel>Lookup Field (from lookup table)</InputLabel>
                        <Select
                          value={lookupSourceField}
                          onChange={(e) => setLookupSourceField(e.target.value)}
                          label="Lookup Field (from lookup table)"
                        >
                          {(lookupSourceTable ? dataSource?.tables
                            .find(t => t.name === lookupSourceTable)?.columns || [] : []).map((col) => (
                              <MenuItem key={col.name} value={col.name}>
                                {col.name}
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                    </Box>
                  )}

                  {/* Composite Join */}
                  {lookupJoinType === 'composite' && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Configure multiple field pairs for the join condition:
                      </Typography>
                      {lookupLocalFields.map((localField, index) => (
                        <Box key={index} sx={{ display: 'flex', gap: 2, mb: 1 }}>
                          <FormControl fullWidth>
                            <InputLabel>Local Field {index + 1} (source)</InputLabel>
                            <Select
                              value={localField || ''}
                              onChange={(e) => {
                                const newLocalFields = [...lookupLocalFields];
                                newLocalFields[index] = e.target.value;
                                setLookupLocalFields(newLocalFields);
                              }}
                              label={`Local Field ${index + 1} (source)`}
                            >
                              {(currentSourceTable?.columns || []).map((col) => (
                                  <MenuItem key={col.name} value={col.name}>
                                    {col.name}
                                  </MenuItem>
                                ))}
                            </Select>
                          </FormControl>
                          <FormControl fullWidth>
                            <InputLabel>Lookup Field {index + 1}</InputLabel>
                            <Select
                              value={lookupSourceFields[index] || ''}
                              onChange={(e) => {
                                const newSourceFields = [...lookupSourceFields];
                                newSourceFields[index] = e.target.value;
                                setLookupSourceFields(newSourceFields);
                              }}
                              label={`Lookup Field ${index + 1}`}
                            >
                              {(lookupSourceTable ? dataSource?.tables
                                .find(t => t.name === lookupSourceTable)?.columns || [] : []).map((col) => (
                                  <MenuItem key={col.name} value={col.name}>
                                    {col.name}
                                  </MenuItem>
                                ))}
                            </Select>
                          </FormControl>
                          <IconButton 
                            onClick={() => {
                              const newLocalFields = lookupLocalFields.filter((_, i) => i !== index);
                              const newSourceFields = lookupSourceFields.filter((_, i) => i !== index);
                              setLookupLocalFields(newLocalFields.length > 0 ? newLocalFields : ['']);
                              setLookupSourceFields(newSourceFields.length > 0 ? newSourceFields : ['']);
                            }}
                            disabled={lookupLocalFields.length === 1}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      ))}
                      <Button 
                        startIcon={<AddIcon />} 
                        onClick={() => {
                          setLookupLocalFields([...lookupLocalFields, '']);
                          setLookupSourceFields([...lookupSourceFields, '']);
                        }}
                        size="small"
                      >
                        Add Field Pair
                      </Button>
                    </Box>
                  )}

                  {/* Concatenation Join */}
                  {lookupJoinType === 'concatenation' && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Use expressions with field placeholders (e.g., {'{field1}'}-{'{field2}'}):
                      </Typography>
                      <TextField
                        fullWidth
                        label="Local Expression"
                        value={lookupLocalExpression}
                        onChange={(e) => setLookupLocalExpression(e.target.value)}
                        placeholder="{equipmentId}-{timestamp}"
                        sx={{ mb: 1 }}
                      />
                      <TextField
                        fullWidth
                        label="Source Expression"
                        value={lookupSourceExpression}
                        onChange={(e) => setLookupSourceExpression(e.target.value)}
                        placeholder="{id}-{date}"
                      />
                    </Box>
                  )}

                  {/* Return Field */}
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Return Field</InputLabel>
                    <Select
                      value={lookupReturnField}
                      onChange={(e) => setLookupReturnField(e.target.value)}
                      label="Return Field"
                    >
                      {(lookupSourceTable ? dataSource?.tables
                        .find(t => t.name === lookupSourceTable)?.columns || [] : []).map((col) => (
                          <MenuItem key={col.name} value={col.name}>
                            {col.name}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>

                  {/* Default Value */}
                  <TextField
                    fullWidth
                    label="Default Value (if no match found)"
                    value={lookupDefaultValue}
                    onChange={(e) => setLookupDefaultValue(e.target.value)}
                    placeholder="N/A"
                    sx={{ mb: 2 }}
                  />

                  {/* Multiple Match Behavior */}
                  <FormControl fullWidth>
                    <InputLabel>If Multiple Matches</InputLabel>
                    <Select
                      value={lookupMultipleMatchBehavior}
                      onChange={(e) => setLookupMultipleMatchBehavior(e.target.value as 'first' | 'last' | 'error')}
                      label="If Multiple Matches"
                    >
                      <MenuItem value="first">Use First Match</MenuItem>
                      <MenuItem value="last">Use Last Match</MenuItem>
                      <MenuItem value="error">Throw Error</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              );
            })()}

            {/* Multiple Lookups Rule Configuration */}
            {fieldRuleType === RuleType.MultipleLookups && selectedFieldForRule && (() => {
              const mappingIndex = selectedFieldForRule.mappingIndex;
              const currentSourceTable = dataSource?.tables.find(t => t.name === tableMappings[mappingIndex]?.sourceTable);
              
              return (
                <Box sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Multiple Lookups Configuration (Chained Lookups)
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <strong>Chain multiple lookup operations:</strong> The result of one lookup is used as the input for the next lookup.
                    <br />
                    Example: Source Table → Lookup Table 1 → Lookup Table 2 → Final Value
                  </Alert>
                  
                  {/* Lookup Steps */}
                  {multipleLookupSteps.map((step, stepIndex) => (
                    <Paper key={stepIndex} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2">
                          {stepIndex === 0 ? 'Step 1 (Initial Lookup)' : `Step ${stepIndex + 1}`}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const newSteps = multipleLookupSteps.filter((_, i) => i !== stepIndex);
                            setMultipleLookupSteps(newSteps.length > 0 ? newSteps : [{
                              lookupTable: '',
                              joinType: 'field',
                              localField: '',
                              sourceField: '',
                              localFields: [''],
                              sourceFields: [''],
                              localExpression: '',
                              sourceExpression: '',
                              returnField: '',
                              isIntermediateStep: true
                            }]);
                          }}
                          disabled={multipleLookupSteps.length === 1}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                      
                      {/* Source Table Selection */}
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Lookup Table</InputLabel>
                        <Select
                          value={step.lookupTable}
                          onChange={(e) => {
                            const newSteps = [...multipleLookupSteps];
                            newSteps[stepIndex].lookupTable = e.target.value;
                            setMultipleLookupSteps(newSteps);
                          }}
                          label="Lookup Table"
                        >
                          {(dataSource?.tables || []).map((table) => (
                            <MenuItem key={table.name} value={table.name}>
                              {table.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {/* Join Type Selection */}
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Join Type</InputLabel>
                        <Select
                          value={step.joinType}
                          onChange={(e) => {
                            const newSteps = [...multipleLookupSteps];
                            newSteps[stepIndex].joinType = e.target.value as 'field' | 'composite' | 'concatenation';
                            setMultipleLookupSteps(newSteps);
                          }}
                          label="Join Type"
                        >
                          <MenuItem value="field">Single Field</MenuItem>
                          <MenuItem value="composite">Composite (Multiple Fields)</MenuItem>
                          <MenuItem value="concatenation">Concatenation (Expression)</MenuItem>
                        </Select>
                      </FormControl>

                      {/* Single Field Join */}
                      {step.joinType === 'field' && (
                        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                          <FormControl fullWidth>
                            <InputLabel>{stepIndex === 0 ? 'Local Field (from source table)' : 'Field from Previous Step'}</InputLabel>
                            <Select
                              value={step.localField}
                              onChange={(e) => {
                                const newSteps = [...multipleLookupSteps];
                                newSteps[stepIndex].localField = e.target.value;
                                setMultipleLookupSteps(newSteps);
                              }}
                              label={stepIndex === 0 ? 'Local Field (from source table)' : 'Field from Previous Step'}
                            >
                              {stepIndex === 0 ? (
                                (currentSourceTable?.columns || []).map((col) => (
                                  <MenuItem key={col.name} value={col.name}>
                                    {col.name}
                                  </MenuItem>
                                ))
                              ) : (
                                <MenuItem value="_PREVIOUS_RESULT_">
                                  [Use Previous Lookup Result]
                                </MenuItem>
                              )}
                            </Select>
                          </FormControl>
                          <FormControl fullWidth>
                            <InputLabel>Match Field (in lookup table)</InputLabel>
                            <Select
                              value={step.sourceField}
                              onChange={(e) => {
                                const newSteps = [...multipleLookupSteps];
                                newSteps[stepIndex].sourceField = e.target.value;
                                setMultipleLookupSteps(newSteps);
                              }}
                              label="Match Field (in lookup table)"
                            >
                              {(step.lookupTable ? dataSource?.tables
                                .find(t => t.name === step.lookupTable)?.columns || [] : []).map((col) => (
                                  <MenuItem key={col.name} value={col.name}>
                                    {col.name}
                                  </MenuItem>
                                ))}
                            </Select>
                          </FormControl>
                        </Box>
                      )}

                      {/* Composite Join */}
                      {step.joinType === 'composite' && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Configure multiple field pairs for the join condition:
                          </Typography>
                          {step.localFields.map((localField, fieldIndex) => (
                            <Box key={fieldIndex} sx={{ display: 'flex', gap: 2, mb: 1 }}>
                              <FormControl fullWidth>
                                <InputLabel>{stepIndex === 0 ? `Local Field ${fieldIndex + 1}` : 'Previous Result'}</InputLabel>
                                <Select
                                  value={localField || ''}
                                  onChange={(e) => {
                                    const newSteps = [...multipleLookupSteps];
                                    newSteps[stepIndex].localFields[fieldIndex] = e.target.value;
                                    setMultipleLookupSteps(newSteps);
                                  }}
                                  label={stepIndex === 0 ? `Local Field ${fieldIndex + 1}` : 'Previous Result'}
                                >
                                  {stepIndex === 0 ? (
                                    (currentSourceTable?.columns || []).map((col) => (
                                      <MenuItem key={col.name} value={col.name}>
                                        {col.name}
                                      </MenuItem>
                                    ))
                                  ) : (
                                    <MenuItem value="_PREVIOUS_RESULT_">
                                      [Use Previous Lookup Result]
                                    </MenuItem>
                                  )}
                                </Select>
                              </FormControl>
                              <FormControl fullWidth>
                                <InputLabel>Lookup Field {fieldIndex + 1}</InputLabel>
                                <Select
                                  value={step.sourceFields[fieldIndex] || ''}
                                  onChange={(e) => {
                                    const newSteps = [...multipleLookupSteps];
                                    newSteps[stepIndex].sourceFields[fieldIndex] = e.target.value;
                                    setMultipleLookupSteps(newSteps);
                                  }}
                                  label={`Lookup Field ${fieldIndex + 1}`}
                                >
                                  {(step.lookupTable ? dataSource?.tables
                                    .find(t => t.name === step.lookupTable)?.columns || [] : []).map((col) => (
                                      <MenuItem key={col.name} value={col.name}>
                                        {col.name}
                                      </MenuItem>
                                    ))}
                                </Select>
                              </FormControl>
                              <IconButton 
                                onClick={() => {
                                  const newSteps = [...multipleLookupSteps];
                                  newSteps[stepIndex].localFields = newSteps[stepIndex].localFields.filter((_, i) => i !== fieldIndex);
                                  newSteps[stepIndex].sourceFields = newSteps[stepIndex].sourceFields.filter((_, i) => i !== fieldIndex);
                                  if (newSteps[stepIndex].localFields.length === 0) {
                                    newSteps[stepIndex].localFields = [''];
                                    newSteps[stepIndex].sourceFields = [''];
                                  }
                                  setMultipleLookupSteps(newSteps);
                                }}
                                disabled={step.localFields.length === 1}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          ))}
                          <Button 
                            startIcon={<AddIcon />} 
                            onClick={() => {
                              const newSteps = [...multipleLookupSteps];
                              newSteps[stepIndex].localFields.push('');
                              newSteps[stepIndex].sourceFields.push('');
                              setMultipleLookupSteps(newSteps);
                            }}
                            size="small"
                          >
                            Add Field Pair
                          </Button>
                        </Box>
                      )}

                      {/* Concatenation Join */}
                      {step.joinType === 'concatenation' && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Use expressions with field placeholders (e.g., {'{field1}'}-{'{field2}'}):
                          </Typography>
                          <TextField
                            fullWidth
                            label={stepIndex === 0 ? 'Local Expression' : 'Expression (use {_PREVIOUS_RESULT_} for previous value)'}
                            value={step.localExpression}
                            onChange={(e) => {
                              const newSteps = [...multipleLookupSteps];
                              newSteps[stepIndex].localExpression = e.target.value;
                              setMultipleLookupSteps(newSteps);
                            }}
                            placeholder={stepIndex === 0 ? "{equipmentId}-{timestamp}" : "{_PREVIOUS_RESULT_}-{field}"}
                            sx={{ mb: 1 }}
                          />
                          <TextField
                            fullWidth
                            label="Lookup Table Expression"
                            value={step.sourceExpression}
                            onChange={(e) => {
                              const newSteps = [...multipleLookupSteps];
                              newSteps[stepIndex].sourceExpression = e.target.value;
                              setMultipleLookupSteps(newSteps);
                            }}
                            placeholder="{id}-{date}"
                          />
                        </Box>
                      )}

                      {/* Return Field */}
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>{stepIndex === multipleLookupSteps.length - 1 ? 'Final Return Field' : 'Return Field (for next step)'}</InputLabel>
                        <Select
                          value={step.returnField}
                          onChange={(e) => {
                            const newSteps = [...multipleLookupSteps];
                            newSteps[stepIndex].returnField = e.target.value;
                            // Automatically mark as intermediate if not last step
                            newSteps[stepIndex].isIntermediateStep = stepIndex < multipleLookupSteps.length - 1;
                            setMultipleLookupSteps(newSteps);
                          }}
                          label={stepIndex === multipleLookupSteps.length - 1 ? 'Final Return Field' : 'Return Field (for next step)'}
                        >
                          {(step.lookupTable ? dataSource?.tables
                            .find(t => t.name === step.lookupTable)?.columns || [] : []).map((col) => (
                              <MenuItem key={col.name} value={col.name}>
                                {col.name}
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                      
                      {stepIndex < multipleLookupSteps.length - 1 && (
                        <Alert severity="info" icon={<ArrowForwardIcon />}>
                          The value from <strong>{step.returnField || '[Return Field]'}</strong> will be used as input for the next lookup step.
                        </Alert>
                      )}
                    </Paper>
                  ))}

                  {/* Add Step Button */}
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setMultipleLookupSteps([...multipleLookupSteps, {
                        lookupTable: '',
                        joinType: 'field',
                        localField: '_PREVIOUS_RESULT_',
                        sourceField: '',
                        localFields: ['_PREVIOUS_RESULT_'],
                        sourceFields: [''],
                        localExpression: '{_PREVIOUS_RESULT_}',
                        sourceExpression: '',
                        returnField: '',
                        isIntermediateStep: true
                      }]);
                    }}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    Add Another Lookup Step
                  </Button>

                  {/* Default Value */}
                  <TextField
                    fullWidth
                    label="Default Value (if any lookup fails)"
                    value={multipleLookupsDefaultValue}
                    onChange={(e) => setMultipleLookupsDefaultValue(e.target.value)}
                    placeholder="N/A"
                    sx={{ mb: 2 }}
                  />

                  {/* Multiple Match Behavior */}
                  <FormControl fullWidth>
                    <InputLabel>If Multiple Matches</InputLabel>
                    <Select
                      value={multipleLookupsMultipleMatchBehavior}
                      onChange={(e) => setMultipleLookupsMultipleMatchBehavior(e.target.value as 'first' | 'last' | 'error')}
                      label="If Multiple Matches"
                    >
                      <MenuItem value="first">Use First Match</MenuItem>
                      <MenuItem value="last">Use Last Match</MenuItem>
                      <MenuItem value="error">Throw Error</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              );
            })()}
          </Box>

          {/* Field Rule Preview Section */}
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Button
                variant="outlined"
                onClick={generateFieldRulePreview}
                startIcon={<VisibilityIcon />}
              >
                Generate Preview
              </Button>
              {showFieldRulePreview && (
                <IconButton
                  size="small"
                  onClick={() => setShowFieldRulePreview(false)}
                  title="Hide preview"
                >
                  <CloseIcon />
                </IconButton>
              )}
            </Box>

            {showFieldRulePreview && fieldRulePreviewData.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Preview - First {fieldRulePreviewData.length} rows
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Source Data</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Transformed Value</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {fieldRulePreviewData.map((row, index) => {
                        // Determine which source fields to display based on rule type
                        let sourceFieldsToShow: string[] = [];
                        if (fieldRuleType === RuleType.IfThen) {
                          sourceFieldsToShow = ifThenSourceFields.filter(f => f);
                        } else if (fieldRuleType === RuleType.Coalesce) {
                          sourceFieldsToShow = coalesceSourceFields.filter(f => f);
                        } else if (fieldRuleType === RuleType.Concat) {
                          sourceFieldsToShow = concatSourceFields.filter(f => f);
                        } else if (fieldRuleType === RuleType.Case) {
                          sourceFieldsToShow = caseSourceField ? [caseSourceField] : [];
                        }
                        
                        return (
                          <TableRow key={index}>
                            <TableCell>
                              <Box sx={{ fontSize: '0.875rem' }}>
                                {fieldRuleType === RuleType.Sequence || fieldRuleType === RuleType.Static ? (
                                  <em style={{ color: '#666' }}>N/A (generated value)</em>
                                ) : fieldRuleType === RuleType.Lookup ? (
                                  <>
                                    {lookupLocalField && (
                                      <div>
                                        <strong>Local Field ({lookupLocalField}):</strong> {String(row.source[lookupLocalField] ?? 'null')}
                                      </div>
                                    )}
                                    {lookupSourceField && lookupSourceTable && (
                                      <div style={{ marginTop: '4px', color: '#1976d2', fontSize: '0.85rem' }}>
                                        <strong>↓ Matching against:</strong> {lookupSourceTable}.{lookupSourceField}
                                      </div>
                                    )}
                                    {lookupReturnField && (
                                      <div style={{ marginTop: '2px', color: '#666', fontSize: '0.8rem' }}>
                                        <em>Returning: {lookupReturnField}</em>
                                      </div>
                                    )}
                                  </>
                                ) : sourceFieldsToShow.length > 0 ? (
                                  sourceFieldsToShow.map((field, idx) => (
                                    <div key={idx}>
                                      <strong>{field}:</strong> {String(row.source[field] ?? 'null')}
                                    </div>
                                  ))
                                ) : (
                                  <em style={{ color: '#666' }}>Complete configuration to see source data</em>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <strong>{row.transformed}</strong>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {showFieldRulePreview && fieldRulePreviewData.length === 0 && (
              <Alert severity="info">
                No source data available for preview.
              </Alert>
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
                <MenuItem value={RuleType.CompositeConcat}>Composite + Concat (Fields with Patterns)</MenuItem>
                <MenuItem value={RuleType.Lookup}>Lookup (From Table)</MenuItem>
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
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel>Select Fields</InputLabel>
                    <Select
                      multiple
                      value={pkCompositeFields}
                      onChange={(e) => setPkCompositeFields(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                      label="Select Fields"
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => {
                            const field = isa95Entities.find(e => e.tableName === tableMappings[selectedMappingForPK]?.targetEntity)?.fields.find(f => f.name === value);
                            return (
                              <Chip 
                                key={value} 
                                label={value} 
                                size="small"
                                color={field?.required ? "primary" : "default"}
                              />
                            );
                          })}
                        </Box>
                      )}
                    >
                      {(() => {
                        const targetEntity = isa95Entities.find(e => e.tableName === tableMappings[selectedMappingForPK]?.targetEntity);
                        const sourceTable = dataSource?.tables.find(t => t.name === tableMappings[selectedMappingForPK]?.sourceTable);
                        
                        // Show target entity fields if available, otherwise fall back to source table columns
                        const fieldsToShow = targetEntity?.fields || sourceTable?.columns.map(col => ({
                          name: col.name,
                          type: col.type,
                          isPrimaryKey: false,
                          required: false,
                          description: ''
                        })) || [];
                        
                        return fieldsToShow.map((field) => (
                          <MenuItem key={field.name} value={field.name}>
                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                              <span>{field.name} ({field.type})</span>
                              {field.required && (
                                <Chip 
                                  label="Required" 
                                  size="small" 
                                  color="primary" 
                                  sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                                />
                              )}
                            </Box>
                          </MenuItem>
                        ));
                      })()}
                    </Select>
                  </FormControl>
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={() => setPkCompositeFields([])}
                    disabled={pkCompositeFields.length === 0}
                    sx={{ mt: 1 }}
                  >
                    Reset
                  </Button>
                </Box>
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

            {/* CompositeConcat Parameters */}
            {pkRuleType === RuleType.CompositeConcat && selectedMappingForPK !== null && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Build a composite primary key by combining multiple fields, each with optional prefix/suffix patterns.
                </Alert>
                
                {/* Global Prefix/Suffix */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Global Prefix (Optional)"
                    value={pkCompositeConcatGlobalPrefix}
                    onChange={(e) => setPkCompositeConcatGlobalPrefix(e.target.value)}
                    placeholder="e.g., PK-"
                    helperText="Prefix for entire composite key"
                  />
                  <TextField
                    fullWidth
                    label="Global Suffix (Optional)"
                    value={pkCompositeConcatGlobalSuffix}
                    onChange={(e) => setPkCompositeConcatGlobalSuffix(e.target.value)}
                    placeholder="e.g., -2024"
                    helperText="Suffix for entire composite key"
                  />
                </Box>

                <TextField
                  fullWidth
                  label="Field Separator"
                  value={pkCompositeConcatSeparator}
                  onChange={(e) => setPkCompositeConcatSeparator(e.target.value)}
                  placeholder="-"
                  helperText="Character(s) to separate field values"
                />

                {/* Fields with individual concat parameters */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Fields with Patterns
                  </Typography>
                  {pkCompositeConcatFields.map((field, index) => (
                    <Paper key={index} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FormControl fullWidth>
                            <InputLabel>Field</InputLabel>
                            <Select
                              value={field.fieldName || ''}
                              onChange={(e) => {
                                const updated = [...pkCompositeConcatFields];
                                updated[index].fieldName = e.target.value;
                                setPkCompositeConcatFields(updated);
                              }}
                              label="Field"
                            >
                              {(() => {
                                const targetEntity = isa95Entities.find(e => e.tableName === tableMappings[selectedMappingForPK]?.targetEntity);
                                const sourceTable = dataSource?.tables.find(t => t.name === tableMappings[selectedMappingForPK]?.sourceTable);
                                
                                // Show target entity fields if available, otherwise fall back to source table columns
                                const fieldsToShow = targetEntity?.fields || sourceTable?.columns.map(col => ({
                                  name: col.name,
                                  type: col.type,
                                  required: false,
                                  description: ''
                                })) || [];
                                
                                return fieldsToShow.map((field) => (
                                  <MenuItem key={field.name} value={field.name}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                                      <span>{field.name} ({field.type})</span>
                                      {field.required && (
                                        <Chip 
                                          label="Required" 
                                          size="small" 
                                          color="primary" 
                                          sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                                        />
                                      )}
                                    </Box>
                                  </MenuItem>
                                ));
                              })()}
                            </Select>
                          </FormControl>
                          <IconButton
                            color="error"
                            onClick={() => {
                              const updated = pkCompositeConcatFields.filter((_, i) => i !== index);
                              setPkCompositeConcatFields(updated);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <TextField
                            fullWidth
                            label="Field Prefix (Optional)"
                            value={field.prefix || ''}
                            onChange={(e) => {
                              const updated = [...pkCompositeConcatFields];
                              updated[index].prefix = e.target.value;
                              setPkCompositeConcatFields(updated);
                            }}
                            placeholder="e.g., LOT_"
                          />
                          <TextField
                            fullWidth
                            label="Field Suffix (Optional)"
                            value={field.suffix || ''}
                            onChange={(e) => {
                              const updated = [...pkCompositeConcatFields];
                              updated[index].suffix = e.target.value;
                              setPkCompositeConcatFields(updated);
                            }}
                            placeholder="e.g., _END"
                          />
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setPkCompositeConcatFields([...pkCompositeConcatFields, { fieldName: '' }]);
                    }}
                    fullWidth
                  >
                    Add Field
                  </Button>
                </Box>

                {/* Example output */}
                {pkCompositeConcatFields.length > 0 && pkCompositeConcatFields.every(f => f.fieldName) && (
                  <Alert severity="success" sx={{ mt: 1 }}>
                    <Typography variant="body2" gutterBottom><strong>Example:</strong></Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {pkCompositeConcatGlobalPrefix}
                      {pkCompositeConcatFields.map((f, i) => 
                        `${f.prefix || ''}{${f.fieldName}}${f.suffix || ''}`
                      ).join(pkCompositeConcatSeparator || '-')}
                      {pkCompositeConcatGlobalSuffix}
                    </Typography>
                  </Alert>
                )}
              </Box>
            )}

            {/* Lookup Parameters for PK Rule */}
            {pkRuleType === RuleType.Lookup && selectedMappingForPK !== null && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Look up the primary key value from another source table based on join conditions.
                </Alert>
                
                {/* Source Table Selection */}
                <FormControl fullWidth>
                  <InputLabel>Source Table (Lookup From)</InputLabel>
                  <Select
                    value={lookupSourceTable}
                    onChange={(e) => setLookupSourceTable(e.target.value)}
                    label="Source Table (Lookup From)"
                  >
                    {(dataSource?.tables || []).map((table) => (
                      <MenuItem key={table.name} value={table.name}>
                        {table.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Join Type Selection */}
                <FormControl fullWidth>
                  <InputLabel>Join Type</InputLabel>
                  <Select
                    value={lookupJoinType}
                    onChange={(e) => setLookupJoinType(e.target.value as 'field' | 'composite' | 'concatenation')}
                    label="Join Type"
                  >
                    <MenuItem value="field">Single Field</MenuItem>
                    <MenuItem value="composite">Composite (Multiple Fields)</MenuItem>
                    <MenuItem value="concatenation">Concatenation (Expression)</MenuItem>
                  </Select>
                </FormControl>

                {/* Single Field Join */}
                {lookupJoinType === 'field' && (
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl fullWidth>
                      <InputLabel>Local Field</InputLabel>
                      <Select
                        value={lookupLocalField}
                        onChange={(e) => setLookupLocalField(e.target.value)}
                        label="Local Field"
                      >
                        {(dataSource?.tables.find(t => t.name === tableMappings[selectedMappingForPK]?.sourceTable)?.columns || []).map((col) => (
                            <MenuItem key={col.name} value={col.name}>
                              {col.name}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                    <FormControl fullWidth>
                      <InputLabel>Source Field</InputLabel>
                      <Select
                        value={lookupSourceField}
                        onChange={(e) => setLookupSourceField(e.target.value)}
                        label="Source Field"
                      >
                        {(lookupSourceTable ? dataSource?.tables.find(t => t.name === lookupSourceTable)?.columns || [] : []).map((col) => (
                            <MenuItem key={col.name} value={col.name}>
                              {col.name}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  </Box>
                )}

                {/* Composite Join */}
                {lookupJoinType === 'composite' && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Configure multiple field pairs for the join condition:
                    </Typography>
                    {lookupLocalFields.map((localField, index) => (
                      <Box key={index} sx={{ display: 'flex', gap: 2, mb: 1 }}>
                        <FormControl fullWidth>
                          <InputLabel>Local Field {index + 1}</InputLabel>
                          <Select
                            value={localField || ''}
                            onChange={(e) => {
                              const newLocalFields = [...lookupLocalFields];
                              newLocalFields[index] = e.target.value;
                              setLookupLocalFields(newLocalFields);
                            }}
                            label={`Local Field ${index + 1}`}
                          >
                            {(dataSource?.tables.find(t => t.name === tableMappings[selectedMappingForPK]?.sourceTable)?.columns || []).map((col) => (
                                <MenuItem key={col.name} value={col.name}>
                                  {col.name}
                                </MenuItem>
                              ))}
                          </Select>
                        </FormControl>
                        <FormControl fullWidth>
                          <InputLabel>Source Field {index + 1}</InputLabel>
                          <Select
                            value={lookupSourceFields[index] || ''}
                            onChange={(e) => {
                              const newSourceFields = [...lookupSourceFields];
                              newSourceFields[index] = e.target.value;
                              setLookupSourceFields(newSourceFields);
                            }}
                            label={`Source Field ${index + 1}`}
                          >
                            {(lookupSourceTable ? dataSource?.tables.find(t => t.name === lookupSourceTable)?.columns || [] : []).map((col) => (
                                <MenuItem key={col.name} value={col.name}>
                                  {col.name}
                                </MenuItem>
                              ))}
                          </Select>
                        </FormControl>
                        <IconButton 
                          onClick={() => {
                            const newLocalFields = lookupLocalFields.filter((_, i) => i !== index);
                            const newSourceFields = lookupSourceFields.filter((_, i) => i !== index);
                            setLookupLocalFields(newLocalFields.length > 0 ? newLocalFields : ['']);
                            setLookupSourceFields(newSourceFields.length > 0 ? newSourceFields : ['']);
                          }}
                          disabled={lookupLocalFields.length === 1}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    ))}
                    <Button 
                      startIcon={<AddIcon />} 
                      onClick={() => {
                        setLookupLocalFields([...lookupLocalFields, '']);
                        setLookupSourceFields([...lookupSourceFields, '']);
                      }}
                      size="small"
                    >
                      Add Field Pair
                    </Button>
                  </Box>
                )}

                {/* Concatenation Join */}
                {lookupJoinType === 'concatenation' && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Use expressions with field placeholders (e.g., {'{field1}'}-{'{field2}'}):
                    </Typography>
                    <TextField
                      fullWidth
                      label="Local Expression"
                      value={lookupLocalExpression}
                      onChange={(e) => setLookupLocalExpression(e.target.value)}
                      placeholder="{equipmentId}-{timestamp}"
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      fullWidth
                      label="Source Expression"
                      value={lookupSourceExpression}
                      onChange={(e) => setLookupSourceExpression(e.target.value)}
                      placeholder="{id}-{date}"
                    />
                  </Box>
                )}

                {/* Return Field */}
                <FormControl fullWidth>
                  <InputLabel>Return Field (Value to Use as PK)</InputLabel>
                  <Select
                    value={lookupReturnField}
                    onChange={(e) => setLookupReturnField(e.target.value)}
                    label="Return Field (Value to Use as PK)"
                  >
                    {(lookupSourceTable ? dataSource?.tables.find(t => t.name === lookupSourceTable)?.columns || [] : []).map((col) => (
                        <MenuItem key={col.name} value={col.name}>
                          {col.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>

                {/* Default Value */}
                <TextField
                  fullWidth
                  label="Default Value (if no match found)"
                  value={lookupDefaultValue}
                  onChange={(e) => setLookupDefaultValue(e.target.value)}
                  placeholder="N/A"
                />

                {/* Multiple Match Behavior */}
                <FormControl fullWidth>
                  <InputLabel>If Multiple Matches</InputLabel>
                  <Select
                    value={lookupMultipleMatchBehavior}
                    onChange={(e) => setLookupMultipleMatchBehavior(e.target.value as 'first' | 'last' | 'error')}
                    label="If Multiple Matches"
                  >
                    <MenuItem value="first">Use First Match</MenuItem>
                    <MenuItem value="last">Use Last Match</MenuItem>
                    <MenuItem value="error">Throw Error</MenuItem>
                  </Select>
                </FormControl>

                {/* Summary */}
                {lookupSourceTable && lookupReturnField && (
                  <Alert severity="success" sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      <strong>Summary:</strong> Look up "{lookupReturnField}" from "{lookupSourceTable}"
                      {lookupJoinType === 'field' && lookupLocalField && lookupSourceField && (
                        <> where local.{lookupLocalField} = source.{lookupSourceField}</>
                      )}
                      {lookupJoinType === 'composite' && (
                        <> using composite join on {lookupLocalFields.filter(f => f).length} field(s)</>
                      )}
                      {lookupJoinType === 'concatenation' && (
                        <> using expression join</>
                      )}
                    </Typography>
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

      {/* Filter Configuration Dialog */}
      <Dialog
        open={filterDialog}
        onClose={() => setFilterDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Configure Filter
          {selectedFilter && (
            <Typography variant="caption" display="block" color="text.secondary">
              Mapping: {tableMappings[selectedFilter.mappingIndex]?.sourceTable} → {isa95Entities.find(e => e.tableName === tableMappings[selectedFilter.mappingIndex]?.targetEntity)?.name || tableMappings[selectedFilter.mappingIndex]?.targetEntity}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {selectedFilter && (
              <>
                <FormControl fullWidth>
                  <InputLabel>Column</InputLabel>
                  <Select
                    value={tableMappings[selectedFilter.mappingIndex]?.filters?.[selectedFilter.filterIndex]?.column || ''}
                    onChange={(e) => handleUpdateFilter(selectedFilter.mappingIndex, selectedFilter.filterIndex, 'column', e.target.value)}
                    label="Column"
                  >
                    {(dataSource?.tables
                      .find(t => t.name === tableMappings[selectedFilter.mappingIndex]?.sourceTable)
                      ?.columns || []).map(column => (
                        <MenuItem key={column.name} value={column.name}>
                          {column.name} ({column.type})
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Operator</InputLabel>
                  <Select
                    value={tableMappings[selectedFilter.mappingIndex]?.filters?.[selectedFilter.filterIndex]?.operator || 'equals'}
                    onChange={(e) => handleUpdateFilter(selectedFilter.mappingIndex, selectedFilter.filterIndex, 'operator', e.target.value)}
                    label="Operator"
                  >
                    <MenuItem value="equals">Equals</MenuItem>
                    <MenuItem value="not_equals">Not Equals</MenuItem>
                    <MenuItem value="contains">Contains</MenuItem>
                    <MenuItem value="not_contains">Not Contains</MenuItem>
                    <MenuItem value="starts_with">Starts With</MenuItem>
                    <MenuItem value="ends_with">Ends With</MenuItem>
                    <MenuItem value="greater_than">Greater Than</MenuItem>
                    <MenuItem value="less_than">Less Than</MenuItem>
                    <MenuItem value="is_null">Is Null</MenuItem>
                    <MenuItem value="is_not_null">Is Not Null</MenuItem>
                    <MenuItem value="is_empty">Is Empty</MenuItem>
                    <MenuItem value="is_not_empty">Is Not Empty</MenuItem>
                  </Select>
                </FormControl>

                {tableMappings[selectedFilter.mappingIndex]?.filters?.[selectedFilter.filterIndex]?.operator !== 'is_null' &&
                 tableMappings[selectedFilter.mappingIndex]?.filters?.[selectedFilter.filterIndex]?.operator !== 'is_not_null' &&
                 tableMappings[selectedFilter.mappingIndex]?.filters?.[selectedFilter.filterIndex]?.operator !== 'is_empty' &&
                 tableMappings[selectedFilter.mappingIndex]?.filters?.[selectedFilter.filterIndex]?.operator !== 'is_not_empty' &&
                 tableMappings[selectedFilter.mappingIndex]?.filters?.[selectedFilter.filterIndex]?.operator !== 'is_empty' &&
                 tableMappings[selectedFilter.mappingIndex]?.filters?.[selectedFilter.filterIndex]?.operator !== 'is_not_empty' && (
                  <TextField
                    fullWidth
                    label="Value"
                    value={tableMappings[selectedFilter.mappingIndex]?.filters?.[selectedFilter.filterIndex]?.value || ''}
                    onChange={(e) => handleUpdateFilter(selectedFilter.mappingIndex, selectedFilter.filterIndex, 'value', e.target.value)}
                    placeholder="Enter filter value"
                  />
                )}

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={tableMappings[selectedFilter.mappingIndex]?.filters?.[selectedFilter.filterIndex]?.enabled || false}
                      onChange={(e) => handleUpdateFilter(selectedFilter.mappingIndex, selectedFilter.filterIndex, 'enabled', e.target.checked)}
                    />
                  }
                  label="Enable Filter"
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFilterDialog(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              setFilterDialog(false);
              setSelectedFilter(null);
            }} 
            variant="contained" 
            color="primary"
          >
            Save Filter
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bridge Table Creation Dialog */}
      <Dialog
        open={bridgeDialog}
        onClose={() => setBridgeDialog(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{ sx: { minHeight: '80vh' } }}
      >
        <DialogTitle>{editingBridgeIndex !== null ? 'Edit Bridge Table Mapping' : 'Create Bridge Table Mapping'}</DialogTitle>
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
                {(dataSource?.tables || []).map(table => (
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
                    const capitalizedEntity1 = entity1Name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    setBridgeEntity1(e.target.value);
                    setBridgeEntity1Column('');
                    // Auto-generate bridge name if both entities are selected
                    if (bridgeEntity2) {
                      const entity2Name = isa95Entities.find(ent => ent.tableName === bridgeEntity2)?.name || '';
                      const capitalizedEntity2 = entity2Name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                      setBridgeName(`${capitalizedEntity1}_to_${capitalizedEntity2}_mapping`);
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
            </Box>

            {/* Entity 1 Join Configuration */}
            {bridgeEntity1 && selectedSourceTable && (
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {isa95Entities.find(e => e.tableName === bridgeEntity1)?.name} Join Configuration
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  Define how to join the bridge table to the {isa95Entities.find(e => e.tableName === bridgeEntity1)?.name} entity table to lookup its Primary Key
                </Typography>
                
                {bridgeEntity1JoinFields.map((joinField, index) => (
                  <Box key={index} sx={{ mb: 2, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                      <FormControl sx={{ flex: 1 }}>
                        <InputLabel size="small">Bridge Table Field</InputLabel>
                        <Select
                          size="small"
                          value={joinField.bridgeField}
                          onChange={(e) => {
                            const updated = [...bridgeEntity1JoinFields];
                            updated[index].bridgeField = e.target.value;
                            setBridgeEntity1JoinFields(updated);
                          }}
                          label="Bridge Table Field"
                        >
                          {(dataSource?.tables.find(t => t.name === selectedSourceTable)?.columns || []).map(col => (
                            <MenuItem key={col.name} value={col.name}>{col.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Typography>=</Typography>
                      <FormControl sx={{ flex: 1 }}>
                        <InputLabel size="small">Entity Field</InputLabel>
                        <Select
                          size="small"
                          value={joinField.entityField}
                          onChange={(e) => {
                            const updated = [...bridgeEntity1JoinFields];
                            updated[index].entityField = e.target.value;
                            setBridgeEntity1JoinFields(updated);
                          }}
                          label="Entity Field"
                        >
                          {(() => {
                            const entity1Mapping = tableMappings.find(m => m.targetEntity === bridgeEntity1);
                            if (!entity1Mapping) return <MenuItem value="">Entity mapping not found</MenuItem>;
                            return entity1Mapping.fieldMappings
                              .filter(fm => fm.generate)
                              .map(fm => (
                                <MenuItem key={fm.fieldName} value={fm.fieldName}>{fm.fieldName}</MenuItem>
                              ));
                          })()}
                        </Select>
                      </FormControl>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setBridgeEntity1JoinFields(bridgeEntity1JoinFields.filter((_, i) => i !== index));
                        }}
                        disabled={bridgeEntity1JoinFields.length === 1}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <TextField
                        size="small"
                        label="Bridge Field Prefix"
                        placeholder="e.g., LOT-"
                        value={joinField.bridgePrefix || ''}
                        onChange={(e) => {
                          const updated = [...bridgeEntity1JoinFields];
                          updated[index].bridgePrefix = e.target.value;
                          setBridgeEntity1JoinFields(updated);
                        }}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        size="small"
                        label="Bridge Field Suffix"
                        placeholder="e.g., -2024"
                        value={joinField.bridgeSuffix || ''}
                        onChange={(e) => {
                          const updated = [...bridgeEntity1JoinFields];
                          updated[index].bridgeSuffix = e.target.value;
                          setBridgeEntity1JoinFields(updated);
                        }}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        size="small"
                        label="Entity Field Prefix"
                        placeholder="e.g., MAT-"
                        value={joinField.entityPrefix || ''}
                        onChange={(e) => {
                          const updated = [...bridgeEntity1JoinFields];
                          updated[index].entityPrefix = e.target.value;
                          setBridgeEntity1JoinFields(updated);
                        }}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        size="small"
                        label="Entity Field Suffix"
                        placeholder="e.g., _ID"
                        value={joinField.entitySuffix || ''}
                        onChange={(e) => {
                          const updated = [...bridgeEntity1JoinFields];
                          updated[index].entitySuffix = e.target.value;
                          setBridgeEntity1JoinFields(updated);
                        }}
                        sx={{ flex: 1 }}
                      />
                    </Box>
                  </Box>
                ))}
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setBridgeEntity1JoinFields([...bridgeEntity1JoinFields, { bridgeField: '', entityField: '' }])}
                >
                  Add Join Field
                </Button>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Second Entity</InputLabel>
                <Select
                  value={bridgeEntity2}
                  onChange={(e) => {
                    const entity2Name = isa95Entities.find(ent => ent.tableName === e.target.value)?.name || '';
                    const capitalizedEntity2 = entity2Name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    setBridgeEntity2(e.target.value);
                    setBridgeEntity2Column('');
                    setBridgeEntity2UsePKRule(false);
                    // Auto-generate bridge name if both entities are selected
                    if (bridgeEntity1) {
                      const entity1Name = isa95Entities.find(ent => ent.tableName === bridgeEntity1)?.name || '';
                      const capitalizedEntity1 = entity1Name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                      setBridgeName(`${capitalizedEntity1}_to_${capitalizedEntity2}_mapping`);
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
            </Box>

            {/* Entity 2 Join Configuration */}
            {bridgeEntity2 && selectedSourceTable && (
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {isa95Entities.find(e => e.tableName === bridgeEntity2)?.name} Join Configuration
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  Define how to join the bridge table to the {isa95Entities.find(e => e.tableName === bridgeEntity2)?.name} entity table to lookup its Primary Key
                </Typography>
                
                {bridgeEntity2JoinFields.map((joinField, index) => (
                  <Box key={index} sx={{ mb: 2, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                      <FormControl sx={{ flex: 1 }}>
                        <InputLabel size="small">Bridge Table Field</InputLabel>
                        <Select
                          size="small"
                          value={joinField.bridgeField}
                          onChange={(e) => {
                            const updated = [...bridgeEntity2JoinFields];
                            updated[index].bridgeField = e.target.value;
                            setBridgeEntity2JoinFields(updated);
                          }}
                          label="Bridge Table Field"
                        >
                          {(dataSource?.tables.find(t => t.name === selectedSourceTable)?.columns || []).map(col => (
                            <MenuItem key={col.name} value={col.name}>{col.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Typography>=</Typography>
                      <FormControl sx={{ flex: 1 }}>
                        <InputLabel size="small">Entity Field</InputLabel>
                        <Select
                          size="small"
                          value={joinField.entityField}
                          onChange={(e) => {
                            const updated = [...bridgeEntity2JoinFields];
                            updated[index].entityField = e.target.value;
                            setBridgeEntity2JoinFields(updated);
                          }}
                          label="Entity Field"
                        >
                          {(() => {
                            const entity2Mapping = tableMappings.find(m => m.targetEntity === bridgeEntity2);
                            if (!entity2Mapping) return <MenuItem value="">Entity mapping not found</MenuItem>;
                            return entity2Mapping.fieldMappings
                              .filter(fm => fm.generate)
                              .map(fm => (
                                <MenuItem key={fm.fieldName} value={fm.fieldName}>{fm.fieldName}</MenuItem>
                              ));
                          })()}
                        </Select>
                      </FormControl>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setBridgeEntity2JoinFields(bridgeEntity2JoinFields.filter((_, i) => i !== index));
                        }}
                        disabled={bridgeEntity2JoinFields.length === 1}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <TextField
                        size="small"
                        label="Bridge Field Prefix"
                        placeholder="e.g., LOT-"
                        value={joinField.bridgePrefix || ''}
                        onChange={(e) => {
                          const updated = [...bridgeEntity2JoinFields];
                          updated[index].bridgePrefix = e.target.value;
                          setBridgeEntity2JoinFields(updated);
                        }}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        size="small"
                        label="Bridge Field Suffix"
                        placeholder="e.g., -2024"
                        value={joinField.bridgeSuffix || ''}
                        onChange={(e) => {
                          const updated = [...bridgeEntity2JoinFields];
                          updated[index].bridgeSuffix = e.target.value;
                          setBridgeEntity2JoinFields(updated);
                        }}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        size="small"
                        label="Entity Field Prefix"
                        placeholder="e.g., PROP-"
                        value={joinField.entityPrefix || ''}
                        onChange={(e) => {
                          const updated = [...bridgeEntity2JoinFields];
                          updated[index].entityPrefix = e.target.value;
                          setBridgeEntity2JoinFields(updated);
                        }}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        size="small"
                        label="Entity Field Suffix"
                        placeholder="e.g., _ID"
                        value={joinField.entitySuffix || ''}
                        onChange={(e) => {
                          const updated = [...bridgeEntity2JoinFields];
                          updated[index].entitySuffix = e.target.value;
                          setBridgeEntity2JoinFields(updated);
                        }}
                        sx={{ flex: 1 }}
                      />
                    </Box>
                  </Box>
                ))}
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setBridgeEntity2JoinFields([...bridgeEntity2JoinFields, { bridgeField: '', entityField: '' }])}
                >
                  Add Join Field
                </Button>
              </Box>
            )}

            {/* Source Tables Preview Section */}
            {selectedSourceTable && (bridgeEntity1 || bridgeEntity2) && (
              <Box sx={{ border: '1px solid', borderColor: 'info.main', borderRadius: 1, p: 2, bgcolor: 'info.50' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2">
                    Source Tables Preview (Compare Values)
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleLoadBridgeSourcePreviews}
                  >
                    {showSourcePreviews ? 'Refresh' : 'Load Preview'}
                  </Button>
                </Box>
                
                {showSourcePreviews && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Entity 1 Source Table Preview */}
                    {bridgeEntity1 && entity1SourcePreview.length > 0 && (
                      <Box>
                        <Typography variant="caption" fontWeight="bold" color="success.main" display="block" gutterBottom>
                          1. Entity 1 ({isa95Entities.find(e => e.tableName === bridgeEntity1)?.name}) Source: {tableMappings.find(m => m.targetEntity === bridgeEntity1)?.sourceTable} (First {entity1SourcePreview.length} rows)
                        </Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                {Object.keys(entity1SourcePreview[0]).map(col => (
                                  <TableCell key={col} sx={{ fontWeight: 'bold', bgcolor: 'success.50', fontSize: '0.75rem' }}>
                                    {col}
                                  </TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {entity1SourcePreview.map((row, idx) => (
                                <TableRow key={idx}>
                                  {Object.keys(row).map(col => (
                                    <TableCell key={col} sx={{ fontSize: '0.7rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {String(row[col] ?? '')}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    )}
                    {bridgeEntity1 && entity1SourcePreview.length === 0 && (
                      <Alert severity="warning" sx={{ py: 0.5 }}>
                        1. Entity 1 ({isa95Entities.find(e => e.tableName === bridgeEntity1)?.name}): No mapping found or no data available. 
                        Please ensure you have created a mapping for this entity first.
                      </Alert>
                    )}

                    {/* Bridge Source Table Preview */}
                    {bridgeSourcePreview.length > 0 && (
                      <Box>
                        <Typography variant="caption" fontWeight="bold" color="primary.main" display="block" gutterBottom>
                          2. Bridge Table: {selectedSourceTable} (First {bridgeSourcePreview.length} rows)
                        </Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                {Object.keys(bridgeSourcePreview[0]).map(col => (
                                  <TableCell key={col} sx={{ fontWeight: 'bold', bgcolor: 'primary.50', fontSize: '0.75rem' }}>
                                    {col}
                                  </TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {bridgeSourcePreview.map((row, idx) => (
                                <TableRow key={idx}>
                                  {Object.keys(row).map(col => (
                                    <TableCell key={col} sx={{ fontSize: '0.7rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {String(row[col] ?? '')}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    )}
                    {selectedSourceTable && bridgeSourcePreview.length === 0 && (
                      <Alert severity="error" sx={{ py: 0.5 }}>
                        2. Bridge Table ({selectedSourceTable}): No data found! Check that this table exists in your data source or IndexedDB.
                      </Alert>
                    )}

                    {/* Entity 2 Source Table Preview */}
                    {bridgeEntity2 && entity2SourcePreview.length > 0 && (
                      <Box>
                        <Typography variant="caption" fontWeight="bold" color="warning.main" display="block" gutterBottom>
                          3. Entity 2 ({isa95Entities.find(e => e.tableName === bridgeEntity2)?.name}) Source: {tableMappings.find(m => m.targetEntity === bridgeEntity2)?.sourceTable} (First {entity2SourcePreview.length} rows)
                        </Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                {Object.keys(entity2SourcePreview[0]).map(col => (
                                  <TableCell key={col} sx={{ fontWeight: 'bold', bgcolor: 'warning.50', fontSize: '0.75rem' }}>
                                    {col}
                                  </TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {entity2SourcePreview.map((row, idx) => (
                                <TableRow key={idx}>
                                  {Object.keys(row).map(col => (
                                    <TableCell key={col} sx={{ fontSize: '0.7rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {String(row[col] ?? '')}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    )}
                    {bridgeEntity2 && entity2SourcePreview.length === 0 && (
                      <Alert severity="warning" sx={{ py: 0.5 }}>
                        3. Entity 2 ({isa95Entities.find(e => e.tableName === bridgeEntity2)?.name}): No mapping found or no data available. 
                        Please ensure you have created a mapping for this entity first.
                      </Alert>
                    )}

                    {bridgeSourcePreview.length === 0 && entity1SourcePreview.length === 0 && entity2SourcePreview.length === 0 && (
                      <Alert severity="warning">No data found in any source tables. Check browser console for details.</Alert>
                    )}
                  </Box>
                )}
              </Box>
            )}

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

            {bridgeEntity1 && bridgeEntity2 && 
              bridgeEntity1JoinFields.filter(f => f.bridgeField && f.entityField).length > 0 && 
              bridgeEntity2JoinFields.filter(f => f.bridgeField && f.entityField).length > 0 && 
              bridgeName && (
              <>
                <Alert severity="success">
                  Will create: <strong>{bridgeName}</strong> with structure:
                  <br />• Source type: {isa95Entities.find(e => e.tableName === bridgeEntity1)?.name}
                  <br />• Source PrimaryKey (via join: {bridgeEntity1JoinFields.filter(f => f.bridgeField && f.entityField).map(f => `${f.bridgeField}=${f.entityField}`).join(', ')})
                  <br />• Target Type: {isa95Entities.find(e => e.tableName === bridgeEntity2)?.name}
                  <br />• Target PrimaryKey (via join: {bridgeEntity2JoinFields.filter(f => f.bridgeField && f.entityField).map(f => `${f.bridgeField}=${f.entityField}`).join(', ')})
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
                          {!bridgeEntity1UsePKRule && bridgeEntity1Column && (
                            <Chip 
                              label={`${bridgeEntity1Column}: ${preview.sourceRecord[bridgeEntity1Column]}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          )}
                          {bridgeEntity1UsePKRule && (
                            <Chip 
                              label="Entity 1: Using PK Rule"
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          )}
                          {!bridgeEntity2UsePKRule && bridgeEntity2Column && (
                            <Chip 
                              label={`${bridgeEntity2Column}: ${preview.sourceRecord[bridgeEntity2Column]}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          )}
                          {bridgeEntity2UsePKRule && (
                            <Chip 
                              label="Entity 2: Using PK Rule"
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          )}
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
            disabled={
              !selectedSourceTable || 
              !bridgeEntity1 || 
              !bridgeEntity2 || 
              !bridgeEntity1JoinFields.some(f => f.bridgeField && f.entityField) || 
              !bridgeEntity2JoinFields.some(f => f.bridgeField && f.entityField) || 
              !bridgeName
            }
          >
            {editingBridgeIndex !== null ? 'Update Bridge Mapping' : 'Create Bridge Mapping'}
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

      {/* Preview Dialog */}
      <Dialog
        open={previewDialog}
        onClose={() => setPreviewDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {previewMappingIndex !== null && tableMappings[previewMappingIndex] && tableMappings[previewMappingIndex].isBridge 
            ? 'Bridge Table Preview' 
            : 'Mapping Preview'
          }
          {previewMappingIndex !== null && tableMappings[previewMappingIndex] && (
            <Typography variant="body2" color="text.secondary">
              {tableMappings[previewMappingIndex].isBridge ? (
                `${tableMappings[previewMappingIndex].targetEntity} (${tableMappings[previewMappingIndex].sourceTable})`
              ) : (
                `${tableMappings[previewMappingIndex].sourceTable} → ${
                  isa95Entities.find(e => e.tableName === tableMappings[previewMappingIndex].targetEntity)?.name || 
                  tableMappings[previewMappingIndex].targetEntity
                }`
              )}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            {previewMappingIndex !== null && tableMappings[previewMappingIndex] && tableMappings[previewMappingIndex].isBridge
              ? 'Preview of first 5 rows showing the bridge table relationships that will be created'
              : 'Preview of first 5 rows showing how source data will be transformed to ISA95 entities'
            }
          </Alert>
          {previewData.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Row</TableCell>
                    {Object.keys(previewData[0]).filter(k => k !== '_sourceRow').map(key => (
                      <TableCell key={key} sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                        {key}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewData.map((row, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>{row._sourceRow}</TableCell>
                      {Object.keys(row).filter(k => k !== '_sourceRow').map(key => (
                        <TableCell key={key}>
                          {row[key] !== null && row[key] !== undefined ? String(row[key]) : '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="warning">No preview data available</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
        </>
      )}
    </Box>
  );
};

export default DataMigration;
