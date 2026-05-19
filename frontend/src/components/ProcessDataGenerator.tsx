import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  LinearProgress,
  Snackbar,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  PlayArrow as GenerateIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  GetApp as GetAppIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { masterDataApi } from '../services/masterDataApi';
import { processDataApi } from '../services/processDataApi';
import * as XLSX from 'xlsx';

// Interfaces
interface OperationsRequest {
  id: string;
  description: string;
  plantId: string;
  lineId: string;
  productMaterialId: string;
  plannedQuantity: number;
  quantityUoM: string;
  plannedStartDateTime: string;
  plannedEndDateTime: string;
  priority: number;
  status: string;
  operationsType?: 'Production' | 'Maintenance';
}

interface SegmentRequirement {
  id: string;
  operationsRequestId: string;
  processSegmentId: string;
  equipmentId?: string;
  sequence: number;
  earliestStartDateTime: string;
  latestEndDateTime: string;
  targetQuantity: number;
  quantityUoM: string;
  operationsType?: 'Production' | 'Maintenance';
}

interface SegmentMaterialRequirement {
  id: string;
  segmentRequirementId: string;
  materialId: string;
  requiredQty: number;
  qtyUoM: string;
  requirementType: string;
  operationsType?: 'Production' | 'Maintenance';
}

interface SegmentEquipmentRequirement {
  id: string;
  segmentRequirementId: string;
  lineId: string;
  equipmentClassId: string;
  equipmentId: string;
  requirementType: string;
  plannedQuantity: number;
  unitOfMeasure?: string;
  operationsType?: 'Production' | 'Maintenance';
}

interface SegmentPersonnelRequirement {
  id: string;
  segmentRequirementId: string;
  employeeId?: string;
  personClassId?: string;
  quantity: number;
  quantityUnitOfMeasure: string;
  personnelUse: string;
  operationsType?: 'Production' | 'Maintenance';
}

// Actual Data Interfaces
interface OperationsResponse {
  id: string;
  operationsRequestId: string;
  description: string;
  plantId: string;
  productionLineId: string;
  actualStartDateTime: string;
  actualEndDateTime: string;
  actualQuantity: number;
  quantityUoM: string;
  status: string;
  operationsType?: 'Production' | 'Maintenance';
}

interface SegmentResponse {
  id: string;
  segmentRequirementId: string;
  operationsResponseId: string;
  processSegmentId: string;
  equipmentId?: string;
  actualStartDateTime: string;
  actualEndDateTime: string;
  actualQuantity: number;
  quantityUoM: string;
  status: string;
  operationsType?: 'Production' | 'Maintenance';
}

interface SegmentMaterialActual {
  id: string;
  segmentResponseId: string;
  materialId: string;
  materialLotId: string;
  actualQty: number;
  qtyUoM: string;
  direction: 'CONSUME' | 'PRODUCE' | 'Scrap';
  operationsType?: 'Production' | 'Maintenance';
}

interface SegmentEquipmentActual {
  id: string;
  segmentResponseId: string;
  equipmentId: string;
  actualQuantity: number;
  actualStartDateTime: string;
  actualEndDateTime: string;
  unitOfMeasure?: string;
  operationsType?: 'Production' | 'Maintenance';
}

interface SegmentPersonnelActual {
  id: string;
  segmentResponseId: string;
  employeeId?: string;
  personClassId?: string;
  actualQuantity: number;
  quantityUnitOfMeasure: string;
  personnelUse: string;
  actualStartDateTime: string;
  actualEndDateTime: string;
  operationsType?: 'Production' | 'Maintenance';
}

interface EquipmentPropertyTracking {
  id: string;
  __recordId?: string;
  segmentResponseId: string;
  plantId: string;
  lineId: string;
  equipmentId: string;
  parentEquipmentId?: string;
  equipmentPropertyId: string;
  equipmentPropertyName: string;
  equipmentClassId: string;
  equipmentClassPropertyId: string;
  value: number | string;
  uom: string;
  createdTimestamp: string;
}

interface OperationsEvent {
  id: string;
  segmentResponseId: string;
  operationsEventDefinitionId: string;
  effectiveTimestamp: string;
  notes: string;
  eventType: string;
  equipmentId: string;
  hierarchyScope: string;
  operationsType?: 'Production' | 'Maintenance';
}

interface OperationsEventRecord {
  id: string;
  operationsEventId: string;
  operationsEventDefinitionId: string;
  severity: string;
  status: string;
  comments: string;
  effectiveTime: string;
  segmentResponseId: string;
  equipmentId: string;
  eventType: string;
}

interface OperationsEventEntry {
  id: string;
  operationsEventRecordId: string;
  entryType: string;
  description: string;
  effectiveTime: string;
  segmentResponseId: string;
  equipmentId: string;
  informationObjectType?: string;
}

interface SegmentData {
  id: string;
  segmentResponseId: string;
  recordType: 'shift' | 'crew';
  shiftId?: string;
  crewId?: string;
  startDateTime: string;
  endDateTime: string;
  notes?: string;
}

interface TestResult {
  id: string;
  materialLotId: string;
  description: string;
  evaluationDate: string;
  evaluatedCriterionResult: string;
}

interface PersonClass {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  employeeName: string;
  personClassId?: string;
}

const ProcessDataGenerator: React.FC = () => {
  const MAX_DAILY_ORDERS = 20;
  const MAX_UTILIZATION_PERCENT = 200;
  const PREVIEW_ROW_LIMIT = 200;

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Master data
  const [materials, setMaterials] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [processSegments, setProcessSegments] = useState<any[]>([]);
  const [segmentBOMs, setSegmentBOMs] = useState<any[]>([]);
  const [equipmentUsages, setEquipmentUsages] = useState<any[]>([]);
  const [lineEquipment, setLineEquipment] = useState<any[]>([]);
  const [productionLines, setProductionLines] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [equipmentProperties, setEquipmentProperties] = useState<any[]>([]);
  const [equipmentPropertyAssignments, setEquipmentPropertyAssignments] = useState<any[]>([]);
  const [equipmentClassPropertyAssignments, setEquipmentClassPropertyAssignments] = useState<any[]>([]);
  const [operationEventDefinitions, setOperationEventDefinitions] = useState<any[]>([]);
  const [operationEventDefSegmentAssignments, setOperationEventDefSegmentAssignments] = useState<any[]>([]);
  const [operationEventDefinitionProperties, setOperationEventDefinitionProperties] = useState<any[]>([]);
  const [operationEventDefinitionPropertyAssignments, setOperationEventDefinitionPropertyAssignments] = useState<any[]>([]);
  const [operationsEventRecordsTemplates, setOperationsEventRecordsTemplates] = useState<any[]>([]);
  const [operationsEventEntriesTemplates, setOperationsEventEntriesTemplates] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [crews, setCrews] = useState<any[]>([]);
  const [shiftCrewAssignments, setShiftCrewAssignments] = useState<any[]>([]);
  const [hierarchyScopes, setHierarchyScopes] = useState<any[]>([]);
  const [personClasses, setPersonClasses] = useState<PersonClass[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Form data for operations request
  const [formData, setFormData] = useState<OperationsRequest>({
    id: '',
    description: '',
    plantId: '',
    lineId: '',
    productMaterialId: '',
    plannedQuantity: 0,
    quantityUoM: 'EA',
    plannedStartDateTime: '',
    plannedEndDateTime: '',
    priority: 1,
    status: 'Planned',
  });
  const [scrapProducedPercent, setScrapProducedPercent] = useState<number>(0);
  const [productionDelayMinutes, setProductionDelayMinutes] = useState<number>(0);
  const [downtimeDelayMinutes, setDowntimeDelayMinutes] = useState<number>(0);

  // Generated data
  const [generatedOperationsRequest, setGeneratedOperationsRequest] = useState<OperationsRequest | null>(null);
  const [segmentRequirements, setSegmentRequirements] = useState<SegmentRequirement[]>([]);
  const [materialRequirements, setMaterialRequirements] = useState<SegmentMaterialRequirement[]>([]);
  const [equipmentRequirements, setEquipmentRequirements] = useState<SegmentEquipmentRequirement[]>([]);
  const [personnelRequirements, setPersonnelRequirements] = useState<SegmentPersonnelRequirement[]>([]);
  const [generationTimestamp, setGenerationTimestamp] = useState<Date | null>(null);
  const [dataVersion, setDataVersion] = useState<number>(1);

  // Actual data
  const [savedOperationsRequests, setSavedOperationsRequests] = useState<any[]>([]);
  const [selectedOperationsRequestId, setSelectedOperationsRequestId] = useState<string>('');
  const [actualProductQuantity, setActualProductQuantity] = useState<number>(0);
  const [generatedOperationsResponse, setGeneratedOperationsResponse] = useState<OperationsResponse | null>(null);
  const [segmentResponses, setSegmentResponses] = useState<SegmentResponse[]>([]);
  const [materialActuals, setMaterialActuals] = useState<SegmentMaterialActual[]>([]);
  const [equipmentActuals, setEquipmentActuals] = useState<SegmentEquipmentActual[]>([]);
  const [personnelActuals, setPersonnelActuals] = useState<SegmentPersonnelActual[]>([]);
  const [equipmentPropertyTracking, setEquipmentPropertyTracking] = useState<EquipmentPropertyTracking[]>([]);
  const [operationsEvents, setOperationsEvents] = useState<OperationsEvent[]>([]);
  const [operationsEventRecords, setOperationsEventRecords] = useState<OperationsEventRecord[]>([]);
  const [operationsEventEntries, setOperationsEventEntries] = useState<OperationsEventEntry[]>([]);
  const [operationsEventProperties, setOperationsEventProperties] = useState<any[]>([]);
  const [segmentData, setSegmentData] = useState<SegmentData[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [generatedMaterialLotsForDisplay, setGeneratedMaterialLotsForDisplay] = useState<any[]>([]);
  const [generatedMaterialSublotsForDisplay, setGeneratedMaterialSublotsForDisplay] = useState<any[]>([]);
  const [actualGenerationTimestamp, setActualGenerationTimestamp] = useState<Date | null>(null);
  const [referenceOperationsRequest, setReferenceOperationsRequest] = useState<OperationsRequest | null>(null);
  const [referenceSegmentRequirements, setReferenceSegmentRequirements] = useState<SegmentRequirement[]>([]);
  
  // Stored actual data from database
  const [storedOperationsResponses, setStoredOperationsResponses] = useState<any[]>([]);
  const [storedSegmentResponses, setStoredSegmentResponses] = useState<any[]>([]);
  const [storedMaterialActuals, setStoredMaterialActuals] = useState<any[]>([]);
  const [storedEquipmentActuals, setStoredEquipmentActuals] = useState<any[]>([]);
  const [storedPersonnelActuals, setStoredPersonnelActuals] = useState<any[]>([]);
  const [storedOperationsEvents, setStoredOperationsEvents] = useState<any[]>([]);
  const [storedOperationsEventRecords, setStoredOperationsEventRecords] = useState<any[]>([]);
  const [storedOperationsEventEntries, setStoredOperationsEventEntries] = useState<any[]>([]);
  const [storedSegmentData, setStoredSegmentData] = useState<any[]>([]);
  const [storedTestResults, setStoredTestResults] = useState<any[]>([]);
  const [storedEquipmentPropertyTracking, setStoredEquipmentPropertyTracking] = useState<any[]>([]);
  const [storedActualSummary, setStoredActualSummary] = useState<Record<string, number>>({});
  const [isStoredActualDataLoading, setIsStoredActualDataLoading] = useState(false);
  const [hasLoadedStoredActualData, setHasLoadedStoredActualData] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{
    active: boolean;
    currentEntity: string;
    currentStep: number;
    totalSteps: number;
    recordsSaved: number;
    perEntity: Array<{ entity: string; saved: number }>;
  }>({
    active: false,
    currentEntity: '',
    currentStep: 0,
    totalSteps: 0,
    recordsSaved: 0,
    perEntity: [],
  });

  // Data overview filters and expansion states
  const [planDataExpanded, setPlanDataExpanded] = useState(false);
  const [actualDataExpanded, setActualDataExpanded] = useState(false);
  const [planDataFilter, setPlanDataFilter] = useState('');
  const [actualDataFilter, setActualDataFilter] = useState('');
  const [materialActualsFilter, setMaterialActualsFilter] = useState<'ALL' | 'CONSUME' | 'PRODUCE' | 'Scrap'>('ALL');
  const [segmentResponsesFilter, setSegmentResponsesFilter] = useState('');
  const [maintenancePlanDataExpanded, setMaintenancePlanDataExpanded] = useState(false);
  const [maintenanceActualDataExpanded, setMaintenanceActualDataExpanded] = useState(false);
  const [maintenancePlanDataFilter, setMaintenancePlanDataFilter] = useState('');

  // Automated batch generation inputs (plan + actual)
  const [batchStartDate, setBatchStartDate] = useState('');
  const [batchEndDate, setBatchEndDate] = useState('');
  const [batchPlantId, setBatchPlantId] = useState('');
  const [batchLineId, setBatchLineId] = useState('');
  const [batchIncludeScrap, setBatchIncludeScrap] = useState(true);
  const [batchIncludeDelays, setBatchIncludeDelays] = useState(true);
  const [batchMinDailyOrders, setBatchMinDailyOrders] = useState(1);
  const [batchMaxDailyOrders, setBatchMaxDailyOrders] = useState(3);
  const [batchTargetUtilizationPercent, setBatchTargetUtilizationPercent] = useState(100);

    // Main tab navigation
    const [mainTab, setMainTab] = useState(0); // 0=Production, 1=Maintenance
    const [maintenanceActiveTab, setMaintenanceActiveTab] = useState(0); // 0=Plan, 1=Actual

    // Maintenance master data
    const [maintenanceBOMs, setMaintenanceBOMs] = useState<any[]>([]);

    // Maintenance plan form
    const [maintenancePlanFormData, setMaintenancePlanFormData] = useState({
      description: '',
      plantId: '',
      lineId: '',
      equipmentId: '',
      plannedStartDateTime: '',
      plannedEndDateTime: '',
      priority: 1,
    });

    // Maintenance plan generated data
    const [generatedMaintenanceRequest, setGeneratedMaintenanceRequest] = useState<OperationsRequest | null>(null);
    const [maintenanceSegmentRequirements, setMaintenanceSegmentRequirements] = useState<SegmentRequirement[]>([]);
    const [maintenanceMaterialRequirements, setMaintenanceMaterialRequirements] = useState<SegmentMaterialRequirement[]>([]);
    const [maintenanceEquipmentRequirements, setMaintenanceEquipmentRequirements] = useState<SegmentEquipmentRequirement[]>([]);
    const [maintenancePersonnelRequirements, setMaintenancePersonnelRequirements] = useState<SegmentPersonnelRequirement[]>([]);

    // Maintenance actual state
    const [savedMaintenanceRequests, setSavedMaintenanceRequests] = useState<any[]>([]);
    const [selectedMaintenanceRequestId, setSelectedMaintenanceRequestId] = useState('');
    const [generatedMaintenanceResponse, setGeneratedMaintenanceResponse] = useState<OperationsResponse | null>(null);
    const [maintenanceSegmentResponses, setMaintenanceSegmentResponses] = useState<SegmentResponse[]>([]);
    const [maintenanceMaterialActuals, setMaintenanceMaterialActuals] = useState<SegmentMaterialActual[]>([]);
    const [maintenanceEquipmentActuals, setMaintenanceEquipmentActuals] = useState<SegmentEquipmentActual[]>([]);
    const [maintenancePersonnelActuals, setMaintenancePersonnelActuals] = useState<SegmentPersonnelActual[]>([]);
    const [maintenanceActualTimestamp, setMaintenanceActualTimestamp] = useState<Date | null>(null);
    const [maintenancePlanReference, setMaintenancePlanReference] = useState<OperationsRequest | null>(null);
    const [maintenanceSegReqReference, setMaintenanceSegReqReference] = useState<SegmentRequirement[]>([]);

    // Unplanned maintenance state
    const [unplannedStoredEvents, setUnplannedStoredEvents] = useState<any[]>([]);
    const [unplannedEventsLoading, setUnplannedEventsLoading] = useState(false);
    const [unplannedEventFilter, setUnplannedEventFilter] = useState({ operationsType: '', operationsEventType: '', search: '' });
    const [selectedUnplannedEventId, setSelectedUnplannedEventId] = useState('');
    const [unplannedSegmentId, setUnplannedSegmentId] = useState('');
    const [unplannedEquipmentId, setUnplannedEquipmentId] = useState('');
    const [unplannedMaterialIds, setUnplannedMaterialIds] = useState<string[]>([]);
    const [unplannedPersonnelIds, setUnplannedPersonnelIds] = useState<string[]>([]);
    const [unplannedStartDateTime, setUnplannedStartDateTime] = useState('');
    const [unplannedEndDateTime, setUnplannedEndDateTime] = useState('');
    const [generatedUnplannedResponse, setGeneratedUnplannedResponse] = useState<OperationsResponse | null>(null);
    const [generatedUnplannedSegmentResponse, setGeneratedUnplannedSegmentResponse] = useState<SegmentResponse | null>(null);
    const [unplannedMaterialActuals, setUnplannedMaterialActuals] = useState<SegmentMaterialActual[]>([]);
    const [unplannedEquipmentActuals, setUnplannedEquipmentActuals] = useState<SegmentEquipmentActual[]>([]);
    const [unplannedPersonnelActuals, setUnplannedPersonnelActuals] = useState<SegmentPersonnelActual[]>([]);
    const [unplannedOpsEvents, setUnplannedOpsEvents] = useState<OperationsEvent[]>([]);
    const [unplannedOpsEventRecords, setUnplannedOpsEventRecords] = useState<OperationsEventRecord[]>([]);
    const [unplannedOpsEventEntries, setUnplannedOpsEventEntries] = useState<OperationsEventEntry[]>([]);
    const [unplannedTimestamp, setUnplannedTimestamp] = useState<Date | null>(null);
    const [storedUnplannedDataLoading, setStoredUnplannedDataLoading] = useState(false);
    const [storedUnplannedResponses, setStoredUnplannedResponses] = useState<OperationsResponse[]>([]);
    const [storedUnplannedSegmentResponses, setStoredUnplannedSegmentResponses] = useState<SegmentResponse[]>([]);
    const [storedUnplannedMaterialActuals, setStoredUnplannedMaterialActuals] = useState<SegmentMaterialActual[]>([]);
    const [storedUnplannedEquipmentActuals, setStoredUnplannedEquipmentActuals] = useState<SegmentEquipmentActual[]>([]);
    const [storedUnplannedPersonnelActuals, setStoredUnplannedPersonnelActuals] = useState<SegmentPersonnelActual[]>([]);
    const [storedUnplannedOpsEvents, setStoredUnplannedOpsEvents] = useState<OperationsEvent[]>([]);
    const [storedUnplannedOpsEventRecords, setStoredUnplannedOpsEventRecords] = useState<OperationsEventRecord[]>([]);
    const [storedUnplannedOpsEventEntries, setStoredUnplannedOpsEventEntries] = useState<OperationsEventEntry[]>([]);
    const [selectedStoredUnplannedResponseId, setSelectedStoredUnplannedResponseId] = useState('');

    const filteredSavedMaintenanceRequests = savedMaintenanceRequests.filter((req) =>
      !maintenancePlanDataFilter ||
      req.id?.toLowerCase().includes(maintenancePlanDataFilter.toLowerCase()) ||
      req.description?.toLowerCase().includes(maintenancePlanDataFilter.toLowerCase()) ||
      req.productMaterialId?.toLowerCase().includes(maintenancePlanDataFilter.toLowerCase())
    );

    const selectedMaintenanceOrder = savedMaintenanceRequests.find((req) => req.id === selectedMaintenanceRequestId) || null;

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
      setSnackbar({ open: true, message, severity });
    };

    const sanitizeOperationsEventArtifactKey = (value: string | undefined | null): string => {
      const normalized = (value || '')
        .toString()
        .trim()
        .replace(/[^A-Za-z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');

      return normalized || 'UNKNOWN';
    };

    const createPrefixedUuid = (prefix: 'OER' | 'OEE'): string => `${prefix}-${crypto.randomUUID()}`;

    const createUniqueRecordId = (records: OperationsEventRecord[]): string => {
      let candidate = createPrefixedUuid('OER');
      while (records.some((record) => record.id === candidate)) {
        candidate = createPrefixedUuid('OER');
      }
      return candidate;
    };

    const createUniqueEntryId = (entries: OperationsEventEntry[]): string => {
      let candidate = createPrefixedUuid('OEE');
      while (entries.some((entry) => entry.id === candidate)) {
        candidate = createPrefixedUuid('OEE');
      }
      return candidate;
    };

    const appendRelatedOperationsEventArtifacts = ({
      opsEvent,
      eventDef,
      baseRecordId,
      effectiveTime,
      segmentResponse,
      relatedEquipmentActuals,
      generatedOperationsEventRecords,
      generatedOperationsEventEntries,
      dedupeByEntityId = false,
    }: {
      opsEvent: OperationsEvent;
      eventDef: any;
      baseRecordId: string;
      effectiveTime: string;
      segmentResponse?: SegmentResponse;
      relatedEquipmentActuals: SegmentEquipmentActual[];
      generatedOperationsEventRecords: OperationsEventRecord[];
      generatedOperationsEventEntries: OperationsEventEntry[];
      dedupeByEntityId?: boolean;
    }) => {
      if (!segmentResponse) {
        return;
      }

      const processSegmentName = processSegments.find(
        (processSegment) => processSegment.id === segmentResponse.processSegmentId,
      )?.name || segmentResponse.processSegmentId || 'segment';

      const createRelatedRecordAndEntry = ({
        scope,
        key,
        description,
        segmentResponseId,
        equipmentId,
        entryOffsetMinutes,
      }: {
        scope: 'SEG' | 'EQ';
        key: string;
        description: string;
        segmentResponseId: string;
        equipmentId: string;
        entryOffsetMinutes: number;
      }) => {
        const artifactKey = sanitizeOperationsEventArtifactKey(key);

        if (dedupeByEntityId) {
          const hasRecord = generatedOperationsEventRecords.some((record) =>
            record.operationsEventId === opsEvent.id &&
            record.segmentResponseId === segmentResponseId &&
            record.equipmentId === equipmentId,
          );
          const hasEntry = generatedOperationsEventEntries.some((entry) =>
            entry.segmentResponseId === segmentResponseId &&
            entry.equipmentId === equipmentId &&
            entry.informationObjectType === (scope === 'SEG' ? 'SegmentResponse' : 'Equipment'),
          );
          if (hasRecord || hasEntry) {
            return;
          }
        }

        const recordId = createUniqueRecordId(generatedOperationsEventRecords);

        const entryTimestamp = new Date(effectiveTime.replace(' ', 'T') + 'Z');
        entryTimestamp.setUTCMinutes(entryTimestamp.getUTCMinutes() + entryOffsetMinutes);

        generatedOperationsEventRecords.push({
          id: recordId,
          operationsEventId: opsEvent.id,
          operationsEventDefinitionId: opsEvent.operationsEventDefinitionId,
          severity: eventDef?.severity || 'Medium',
          status: 'Closed',
          comments: description,
          effectiveTime,
          segmentResponseId,
          equipmentId,
          eventType: opsEvent.eventType || 'Alarm',
        });

        const entryId = createUniqueEntryId(generatedOperationsEventEntries);

        generatedOperationsEventEntries.push({
          id: entryId,
          operationsEventRecordId: recordId,
          entryType: opsEvent.operationsType || 'Production',
          description,
          effectiveTime: toDbDateTime(entryTimestamp),
          segmentResponseId,
          equipmentId,
          informationObjectType: scope === 'SEG' ? 'SegmentResponse' : 'Equipment',
        });
      };

      createRelatedRecordAndEntry({
        scope: 'SEG',
        key: segmentResponse.id,
        description: `Segment response ${segmentResponse.id} for ${processSegmentName}`,
        segmentResponseId: segmentResponse.id,
        equipmentId: segmentResponse.equipmentId || relatedEquipmentActuals[0]?.equipmentId || opsEvent.equipmentId,
        entryOffsetMinutes: 1,
      });

      relatedEquipmentActuals.forEach((equipmentActual, index) => {
        createRelatedRecordAndEntry({
          scope: 'EQ',
          key: equipmentActual.equipmentId,
          description: `Equipment actual ${equipmentActual.equipmentId} for segment response ${equipmentActual.segmentResponseId}`,
          segmentResponseId: equipmentActual.segmentResponseId,
          equipmentId: equipmentActual.equipmentId,
          entryOffsetMinutes: index + 2,
        });
      });
    };

  const loadSavedOperationsRequests = async () => {
    try {
      const requests = await processDataApi.getAll('operationsRequests');
      setSavedOperationsRequests(requests);
    } catch (error) {
      console.error('Failed to load operations requests:', error);
    }
  };

  const loadSavedMaintenanceRequests = async () => {
    try {
      const requests = await processDataApi.getAll('operationsRequests');
      const maintenanceIds = new Set((maintenanceBOMs || []).map((m) => m.materialId));
      const filtered = requests.filter((req: any) => {
        const type = (req.operationsType || '').toString().toLowerCase();
        return type === 'maintenance' || maintenanceIds.has(req.productMaterialId);
      });
      setSavedMaintenanceRequests(filtered);
    } catch (error) {
      console.error('Failed to load maintenance operations requests:', error);
    }
  };

  const loadMaintenanceActualDataForRequest = async (maintenanceRequestId: string) => {
    if (!maintenanceRequestId) {
      setGeneratedMaintenanceResponse(null);
      setMaintenanceSegmentResponses([]);
      setMaintenanceMaterialActuals([]);
      setMaintenanceEquipmentActuals([]);
      setMaintenancePersonnelActuals([]);
      setOperationsEvents([]);
      setOperationsEventRecords([]);
      setOperationsEventEntries([]);
      setOperationsEventProperties([]);
      setMaintenanceActualTimestamp(null);
      setMaintenancePlanReference(null);
      setMaintenanceSegReqReference([]);
      return;
    }

    try {
      const [allResponses, allSegmentResponses, allMaterialActuals, allEquipmentActuals, allPersonnelActuals, allOperationsEvents, allOperationsEventRecords, allOperationsEventEntries, requestData] = await Promise.all([
        processDataApi.getAll('operationsResponses'),
        processDataApi.getAll('segmentResponses'),
        processDataApi.getAll('segmentMaterialActuals'),
        processDataApi.getAll('segmentEquipmentActuals'),
        processDataApi.getAll('segmentPersonnelActuals'),
        processDataApi.getAll('operationsEvents'),
        processDataApi.getAll('operationsEventRecords'),
        processDataApi.getAll('operationsEventEntries'),
        processDataApi.getOperationsRequestWithRequirements(maintenanceRequestId),
      ]);

      const matchingResponses = (allResponses as any[])
        .filter((resp) => {
          if (resp.operationsRequestId !== maintenanceRequestId) return false;
          const type = (resp.operationsType || '').toString().toLowerCase();
          return type === 'maintenance' || type === '';
        })
        .sort((a, b) => {
          const aTs = Date.parse(a.actualEndDateTime || a.actualStartDateTime || '') || 0;
          const bTs = Date.parse(b.actualEndDateTime || b.actualStartDateTime || '') || 0;
          return bTs - aTs;
        });

      if (matchingResponses.length === 0) {
        setGeneratedMaintenanceResponse(null);
        setMaintenanceSegmentResponses([]);
        setMaintenanceMaterialActuals([]);
        setMaintenanceEquipmentActuals([]);
        setMaintenancePersonnelActuals([]);
        setOperationsEvents([]);
        setOperationsEventRecords([]);
        setOperationsEventEntries([]);
        setOperationsEventProperties([]);
        setMaintenanceActualTimestamp(null);
      } else {
        const selectedResponse = matchingResponses[0];
        const segResponses = (allSegmentResponses as any[])
          .filter((sr) => sr.operationsResponseId === selectedResponse.id);
        const segIds = new Set(segResponses.map((sr) => sr.id));
        const matActuals = (allMaterialActuals as any[])
          .filter((ma) => segIds.has(ma.segmentResponseId));
        const eqActuals = (allEquipmentActuals as any[])
          .filter((ea) => segIds.has(ea.segmentResponseId));
        const persActuals = (allPersonnelActuals as any[])
          .filter((pa) => segIds.has(pa.segmentResponseId));
        const opsEvents = (allOperationsEvents as any[])
          .filter((opsEvent) => segIds.has(opsEvent.segmentResponseId));
        const opsEventIds = new Set(opsEvents.map((opsEvent) => opsEvent.id));
        const opsEventRecords = (allOperationsEventRecords as any[])
          .filter((opsEventRecord) => opsEventIds.has(opsEventRecord.operationsEventId));
        const opsEventRecordIds = new Set(opsEventRecords.map((opsEventRecord) => opsEventRecord.id));
        const opsEventEntries = (allOperationsEventEntries as any[])
          .filter((opsEventEntry) => opsEventRecordIds.has(opsEventEntry.operationsEventRecordId));

        setGeneratedMaintenanceResponse(selectedResponse);
        setMaintenanceSegmentResponses(segResponses);
        setMaintenanceMaterialActuals(matActuals);
        setMaintenanceEquipmentActuals(eqActuals);
        setMaintenancePersonnelActuals(persActuals);
        setOperationsEvents(opsEvents);
        setOperationsEventRecords(opsEventRecords);
        setOperationsEventEntries(opsEventEntries);
        setOperationsEventProperties([]);
        setMaintenanceActualTimestamp(new Date());
      }

      if (requestData?.operationsRequest) {
        setMaintenancePlanReference(requestData.operationsRequest as any);
        setMaintenanceSegReqReference((requestData.segmentRequirements || []) as any);
      }
    } catch (error) {
      console.error('Failed to load maintenance actual data for selected request:', error);
    }
  };

  const loadStoredActualData = async () => {
    setIsStoredActualDataLoading(true);
    try {
      const summaryStores: any[] = [
        'operationsResponses',
        'segmentResponses',
        'segmentMaterialActuals',
        'segmentEquipmentActuals',
        'segmentPersonnelActuals',
        'operationsEvents',
        'operationsEventRecords',
        'operationsEventEntries',
        'operationsEventProperties',
        'segmentData',
        'testResults',
        'equipmentPropertyTracking',
      ];

      const summary = await processDataApi.getSummary(summaryStores);
      setStoredActualSummary(summary);

      console.log('[Stored Actual Summary] Loaded:', summary);
    } catch (error) {
      console.error('Failed to load stored actual data:', error);
    } finally {
      setIsStoredActualDataLoading(false);
      setHasLoadedStoredActualData(true);
    }
  };

  const loadMasterData = async () => {
    try {
      setLoading(true);
      const backfillGeneratedAt = toDbDateTime(new Date());
      const backfillRunId = `BF-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
      const backfillMarker = `[BACKFILL_OER_OEE:${backfillRunId}|${backfillGeneratedAt}]`;
      const [mat, eq, ps, bom, eu, le, pl, p, eprop, epa, ecpa, oed, oedsa, oedp, oedpa, oert, oeet, shft, crw, sca, hs, mBoms, personCls, emp] = await Promise.all([
        masterDataApi.getAll('materials'),
        masterDataApi.getAll('equipment'),
        masterDataApi.getAll('processSegments'),
        masterDataApi.getAll('segmentBOMs'),
        masterDataApi.getAll('equipmentUsages'),
        masterDataApi.getAll('lineEquipment'),
        masterDataApi.getAll('productionLines'),
        masterDataApi.getAll('plants'),
        masterDataApi.getAll('equipmentProperties'),
        masterDataApi.getAll('equipmentPropertyAssignments'),
        masterDataApi.getAll('equipmentClassPropertiesAssignments'),
        masterDataApi.getAll('operationEventDefinitions'),
        masterDataApi.getAll('operationEventDefSegmentAssignments'),
        masterDataApi.getAll('operationEventDefinitionProperties'),
        masterDataApi.getAll('operationEventDefinitionPropertyAssignments'),
        masterDataApi.getAll('operationsEventRecords'),
        masterDataApi.getAll('operationsEventEntries'),
        masterDataApi.getAll('shifts'),
        masterDataApi.getAll('crews'),
        masterDataApi.getAll('shiftCrewAssignments'),
        masterDataApi.getAll('hierarchyScopes'),
        masterDataApi.getAll('maintenanceBOMs'),
        masterDataApi.getAll('personClasses'),
        masterDataApi.getAll('employees'),
      ]);

      setMaterials(mat);
      setEquipment(eq);
      setProcessSegments(ps);
      setSegmentBOMs(bom);
      setEquipmentUsages(eu);
      setLineEquipment(le);
      setProductionLines(pl);
      setPlants(p);
      setEquipmentProperties(eprop);
      setEquipmentPropertyAssignments(epa);
      setEquipmentClassPropertyAssignments(ecpa);
      setOperationEventDefinitions(oed);
      setOperationEventDefSegmentAssignments(oedsa);
      setOperationEventDefinitionProperties(oedp);
      setOperationEventDefinitionPropertyAssignments(oedpa);
      setOperationsEventRecordsTemplates(oert);
      setOperationsEventEntriesTemplates(oeet);
      setShifts(shft);
      setCrews(crw);
      setShiftCrewAssignments(sca);
      setHierarchyScopes(hs);
      setMaintenanceBOMs(mBoms);
      setPersonClasses(personCls as PersonClass[]);
      setEmployees(emp as Employee[]);

      console.log('[Master Data] Loaded:', {
        materials: mat.length,
        equipment: eq.length,
        processSegments: ps.length,
        segmentBOMs: bom.length,
        maintenanceBOMs: mBoms.length,
        personClasses: personCls.length,
        employees: emp.length,
        equipmentProperties: eprop.length,
        equipmentPropertyAssignments: epa.length,
        equipmentClassPropertyAssignments: ecpa.length,
        sampleEquipmentClassPropertyAssignments: ecpa.slice(0, 3),
        operationEventDefinitions: oed.length,
        operationEventDefSegmentAssignments: oedsa.length,
        operationEventDefinitionProperties: oedp.length,
        operationEventDefinitionPropertyAssignments: oedpa.length,
        operationsEventRecordsTemplates: oert.length,
        operationsEventEntriesTemplates: oeet.length,
        shifts: shft.length,
        crews: crw.length,
        shiftCrewAssignments: sca.length,
      });

      const sampleDowntimeEvents = oed.filter((e) => e.causesDowntime).slice(0, 3);
      const sampleScrapEvents = oed.filter((e) => e.causesScrap).slice(0, 3);
      console.log('[Master Data] Sample events with causesDowntime=true:', sampleDowntimeEvents.map((e) => `${e.eventCode} (${e.causesDowntime})`));
      console.log('[Master Data] Sample events with causesScrap=true:', sampleScrapEvents.map((e) => `${e.eventCode} (${e.causesScrap})`));
      console.log('[Master Data] Total events with causesDowntime=true:', oed.filter((e) => e.causesDowntime).length);
      console.log('[Master Data] Total events with causesScrap=true:', oed.filter((e) => e.causesScrap).length);

      setLoading(false);
    } catch (error) {
      console.error('Failed to load master data:', error);
      showSnackbar('Failed to load master data', 'error');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
    loadSavedOperationsRequests();
    loadSavedMaintenanceRequests();
    loadStoredActualData();
  }, []);

  useEffect(() => {
    loadSavedMaintenanceRequests();
  }, [maintenanceBOMs]);

  useEffect(() => {
    loadMaintenanceActualDataForRequest(selectedMaintenanceRequestId);
  }, [selectedMaintenanceRequestId]);

  useEffect(() => {
    if (mainTab === 1 && maintenanceActiveTab === 2) {
      loadStoredUnplannedMaintenanceData();
    }
  }, [mainTab, maintenanceActiveTab]);

  const generateActualData = async () => {
    if (!selectedOperationsRequestId || !actualProductQuantity) {
      showSnackbar('Please select an operations request and enter actual quantity', 'error');
      return;
    }

    try {
      setLoading(true);

      // Load the operations request and its requirements
      const orData = await processDataApi.getOperationsRequestWithRequirements(selectedOperationsRequestId);
      if (!orData) {
        setLoading(false);
        return;
      }

      const timestamp = new Date();
      setActualGenerationTimestamp(timestamp);
      
      // Store reference data for display
      setReferenceOperationsRequest(orData.operationsRequest);
      setReferenceSegmentRequirements(orData.segmentRequirements);
      
      // Load segment equipment requirements
      const segmentEquipmentRequirements = orData.equipmentRequirements || [];

      // Generate Operations Response ID with plant, line, date and time
      const plantId = orData.operationsRequest.plantId;
      const lineId = orData.operationsRequest.lineId;
      const dateTimeStr = `${timestamp.toISOString().slice(0, 10).replace(/-/g, '')}${String(timestamp.getHours()).padStart(2, '0')}${String(timestamp.getMinutes()).padStart(2, '0')}`;
      const opsResponseId = `OPS-RESP-${plantId}-${lineId}-${dateTimeStr}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

      // Generate Segment Responses
      const generatedSegResponses: SegmentResponse[] = [];
      const generatedMatActuals: SegmentMaterialActual[] = [];
      const generatedEqActuals: SegmentEquipmentActual[] = [];
      const generatedPersonnelActuals: SegmentPersonnelActual[] = [];
      const generatedMaterialLots: any[] = []; // Store material lots to be created in master data
      const generatedMaterialSublots: any[] = []; // Store material sublots to be created in master data
      const generatedOperationsEvents: OperationsEvent[] = [];

      // Track end times for each sequence number to enable parallel processing
      const sequenceEndTimes = new Map<number, Date>();
      
      // Track overall start and end times for operations response
      let operationsStartTime: Date | null = null;
      let operationsEndTime: Date | null = null;
      
      // Sort segment requirements by sequence to process in order
      const sortedSegReqs = [...orData.segmentRequirements].sort((a, b) => a.sequence - b.sequence);

      console.log(`[Actual Data Generation] Processing ${sortedSegReqs.length} segment requirements`);
      console.log(`[Actual Data Generation] Actual quantity: ${actualProductQuantity}`);
      
      if (sortedSegReqs.length === 0) {
        throw new Error('No segment requirements found for this operations request. Please ensure the operations request has segment requirements defined.');
      }

      for (const segReq of sortedSegReqs) {
        // Get process segment for duration
        const processSegment = processSegments.find(ps => ps.id === segReq.processSegmentId);
        if (!processSegment) {
          console.error(`[Seq ${segReq.sequence}] ERROR: Process segment not found for ID: ${segReq.processSegmentId}`);
          throw new Error(`Process segment "${segReq.processSegmentId}" not found in master data. Please ensure all process segments are loaded.`);
        }
        const segmentDuration = processSegment?.durationHours || 2;
        
        // Get equipment usage for capacity calculation
        // Filter by process segment AND by equipment assigned to the selected plant and production line
        const lineEquipmentIds = lineEquipment
          .filter(le => le.productionLineId === lineId && le.plantId === plantId)
          .map(le => le.equipmentId);
        const eqUsages = equipmentUsages.filter(eu => 
          eu.processSegmentId === segReq.processSegmentId && 
          lineEquipmentIds.includes(eu.equipmentId)
        );
        const equipmentCapacity = eqUsages.length > 0 ? eqUsages[0].capacityPerRun : 100;
        
        console.log(`[Seq ${segReq.sequence}] Process segment: ${processSegment.name}, Duration: ${segmentDuration}h, Equipment capacity: ${equipmentCapacity}`);
        
        // Calculate number of runs needed
        const runsNeeded = Math.ceil(actualProductQuantity / equipmentCapacity);
        
        console.log(`[Seq ${segReq.sequence}] Runs needed: ${runsNeeded} (${actualProductQuantity} units / ${equipmentCapacity} capacity)`);
        
        // Create multiple segment responses based on equipment capacity
        for (let run = 0; run < runsNeeded; run++) {
          
          // Calculate start time based on TWO key dependencies:
          // 1. Previous run of same sequence (equipment must be free)
          // 2. Same run number of previous sequence (process flow - material must be ready)
          let runStartTime: Date;
          
          // Dependency 1: Previous run of same sequence must complete (equipment constraint)
          let equipmentAvailableTime: Date | null = null;
          if (run > 0) {
            // Find the previous run of this same sequence (run is 0-indexed, so previous run is run-1)
            const searchPattern = `-RUN${run}-`;
            const prevRunOfSameSeq = generatedSegResponses.find(sr =>
              sr.segmentRequirementId === segReq.id &&
              sr.id.includes(searchPattern)
            );
            console.log(`[Seq ${segReq.sequence} Run ${run + 1}] Searching for previous run with pattern: ${searchPattern}, Found:`, prevRunOfSameSeq ? prevRunOfSameSeq.id : 'NONE');
            if (prevRunOfSameSeq) {
              // Parse as UTC by appending 'Z' to treat the stored time as UTC
              equipmentAvailableTime = new Date(prevRunOfSameSeq.actualEndDateTime.replace(' ', 'T') + 'Z');
              console.log(`[Seq ${segReq.sequence} Run ${run + 1}] Equipment available after Run ${run} ends at:`, equipmentAvailableTime.toISOString());
            } else {
              console.log(`[Seq ${segReq.sequence} Run ${run + 1}] WARNING: Could not find previous run!`);
            }
          }
          
          // Dependency 2: Same run of previous sequence must complete (process flow constraint)
          let materialReadyTime: Date | null = null;
          const prevSequence = segReq.sequence - 10;
          const prevSegReq = sortedSegReqs.find(s => s.sequence === prevSequence);
          if (prevSegReq) {
            // Find the same run number of the previous sequence
            const prevSeqSameRun = generatedSegResponses.find(sr =>
              sr.segmentRequirementId === prevSegReq.id &&
              sr.id.includes(`-RUN${run + 1}-`)
            );
            if (prevSeqSameRun) {
              // Parse as UTC by appending 'Z' to treat the stored time as UTC
              materialReadyTime = new Date(prevSeqSameRun.actualEndDateTime.replace(' ', 'T') + 'Z');
              console.log(`[Seq ${segReq.sequence} Run ${run + 1}] Material ready after Seq ${prevSequence} Run ${run + 1} ends at:`, materialReadyTime.toISOString());
            }
          }
          
          // Start time is the LATEST of:
          // - Equipment available (previous run of same sequence completes)
          // - Material ready (same run of previous sequence completes)
          // - Segment requirement earliest start time (if first run of this sequence)
          if (equipmentAvailableTime && materialReadyTime) {
            runStartTime = equipmentAvailableTime > materialReadyTime ? equipmentAvailableTime : materialReadyTime;
            console.log(`[Seq ${segReq.sequence} Run ${run + 1}] Using max of equipment (${equipmentAvailableTime.toISOString()}) and material (${materialReadyTime.toISOString()}): ${runStartTime.toISOString()}`);
          } else if (equipmentAvailableTime) {
            runStartTime = equipmentAvailableTime;
            console.log(`[Seq ${segReq.sequence} Run ${run + 1}] Using equipment available time: ${runStartTime.toISOString()}`);
          } else if (materialReadyTime) {
            runStartTime = materialReadyTime;
            console.log(`[Seq ${segReq.sequence} Run ${run + 1}] Using material ready time: ${runStartTime.toISOString()}`);
          } else {
            // First run of this sequence - use segment requirement's earliest start time
            runStartTime = new Date(segReq.earliestStartDateTime.replace(' ', 'T') + 'Z');
            console.log(`[Seq ${segReq.sequence} Run ${run + 1}] First run, using segment requirement earliest start: ${runStartTime.toISOString()}`);
            
            // Apply production delay ONLY to the very first segment response (first sequence, first run)
            if (segReq.sequence === 10 && run === 0 && productionDelayMinutes > 0) {
              runStartTime = new Date(runStartTime.getTime() + productionDelayMinutes * 60 * 1000);
              console.log(`[Seq ${segReq.sequence} Run ${run + 1}] Applied production delay of ${productionDelayMinutes} minutes. New start: ${runStartTime.toISOString()}`);
            }
          }
          
          // Now create the segment response ID using the calculated runStartTime
          const runDateTime = runStartTime;
          const runDateTimeStr = `${runDateTime.toISOString().slice(0, 10).replace(/-/g, '')}${String(runDateTime.getHours()).padStart(2, '0')}${String(runDateTime.getMinutes()).padStart(2, '0')}`;
          const segRespId = `SEG-RESP-${plantId}-${lineId}-${runDateTimeStr}-RUN${run + 1}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
          
          // Calculate quantity for this run
          const remainingQty = actualProductQuantity - (run * equipmentCapacity);
          const runQuantity = Math.min(equipmentCapacity, remainingQty);
          
          // Calculate duration for this run
          let runDuration = segmentDuration;
          
          // Apply downtime delay to extend the duration
          if (downtimeDelayMinutes > 0) {
            const downtimeDelayHours = downtimeDelayMinutes / 60;
            runDuration += downtimeDelayHours;
            console.log(`[Seq ${segReq.sequence} Run ${run + 1}] Applied downtime delay of ${downtimeDelayMinutes} minutes (${downtimeDelayHours.toFixed(2)}h). New duration: ${runDuration}h`);
          }
          
          const endTime = new Date(runStartTime.getTime() + runDuration * 60 * 60 * 1000);
          
          console.log(`[Seq ${segReq.sequence} Run ${run + 1}] FINAL: Start=${runStartTime.toISOString()}, End=${endTime.toISOString()}, Duration=${runDuration}h`);
          
          // Update operations response overall timing
          if (!operationsStartTime || runStartTime < operationsStartTime) {
            operationsStartTime = runStartTime;
          }
          if (!operationsEndTime || endTime > operationsEndTime) {
            operationsEndTime = endTime;
          }
          
          // Update sequence end time tracker
          if (!sequenceEndTimes.has(segReq.sequence) || endTime > sequenceEndTimes.get(segReq.sequence)!) {
            sequenceEndTimes.set(segReq.sequence, endTime);
          }

          // Create Segment Response
          const segResp: SegmentResponse = {
            id: segRespId,
            segmentRequirementId: segReq.id,
            operationsResponseId: opsResponseId,
            processSegmentId: segReq.processSegmentId,
            equipmentId: eqUsages.length > 0 ? eqUsages[0].equipmentId : undefined,
            actualStartDateTime: runStartTime.toISOString().slice(0, 19).replace('T', ' '),
            actualEndDateTime: endTime.toISOString().slice(0, 19).replace('T', ' '),
            actualQuantity: runQuantity,
            quantityUoM: segReq.quantityUoM,
            status: 'Completed',
            operationsType: 'Production',
          };
          generatedSegResponses.push(segResp);

          // Generate Material Actuals from BOMs for this run
          const bomLines = segmentBOMs.filter(bom => bom.processSegmentId === segReq.processSegmentId);
          
          for (const bom of bomLines) {
            const material = materials.find(m => m.id === bom.materialId);
            const matActualDateTime = `${runStartTime.toISOString().slice(0, 10).replace(/-/g, '')}${String(runStartTime.getHours()).padStart(2, '0')}${String(runStartTime.getMinutes()).padStart(2, '0')}`;
            const matActualId = `MAT-ACT-${plantId}-${lineId}-${matActualDateTime}-${bom.materialId}-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;
            
            // Generate material lot ID
            const materialLotId = `LOT-${plantId}-${lineId}-${matActualDateTime}-${bom.materialId}-R${run + 1}`;
            
            // Determine direction from BOM MaterialUse field
            let direction: 'CONSUME' | 'PRODUCE' | 'Scrap' = 'CONSUME'; // default
            if (bom.materialUse) {
              const materialUse = bom.materialUse.toUpperCase();
              if (materialUse === 'PRODUCE' || materialUse === 'PRODUCED') {
                direction = 'PRODUCE';
              } else if (materialUse === 'SCRAP') {
                direction = 'Scrap';
              } else {
                direction = 'CONSUME';
              }
            }
            
            const isOutput = direction === 'PRODUCE' || direction === 'Scrap';
            
            const matActual: SegmentMaterialActual = {
              id: matActualId,
              segmentResponseId: segRespId,
              materialId: bom.materialId,
              materialLotId: materialLotId,
              actualQty: bom.qtyPerUnit * runQuantity,
              qtyUoM: bom.uom,
              direction: direction,
              operationsType: 'Production',
            };
            generatedMatActuals.push(matActual);
            
            // Create material lot record for produced and in-process materials
            if (isOutput) {
              const materialLot = {
                id: materialLotId,
                materialId: bom.materialId,
                lotQuantity: bom.qtyPerUnit * runQuantity,
                lotUoM: bom.uom,
                producedDateTime: endTime.toISOString().slice(0, 19).replace('T', ' '),
                producedByProcessSegmentId: segReq.processSegmentId,
                supplierOrProducerId: segRespId,
                supplierOrProducerName: `Segment Response ${segRespId}`,
                status: 'Available',
              };
              generatedMaterialLots.push(materialLot);
            }
          }

          // Add finished product to material actuals if this is the last segment
          const isLastSegment = segReq.sequence === Math.max(...orData.segmentRequirements.map(sr => sr.sequence));
          if (isLastSegment) {
            // Calculate scrap quantity first (extracted from total production)
            const scrapQuantity = scrapProducedPercent > 0 ? (runQuantity * scrapProducedPercent) / 100 : 0;
            const finishedGoodQuantity = runQuantity - scrapQuantity;
            
            const finishedDateTime = `${endTime.toISOString().slice(0, 10).replace(/-/g, '')}${String(endTime.getHours()).padStart(2, '0')}${String(endTime.getMinutes()).padStart(2, '0')}`;
            const finishedProductLotId = `LOT-${plantId}-${lineId}-${finishedDateTime}-${orData.operationsRequest.productMaterialId}-R${run + 1}`;
            
            const finishedProductActual: SegmentMaterialActual = {
              id: `MAT-ACT-${plantId}-${lineId}-${finishedDateTime}-FINAL-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`,
              segmentResponseId: segRespId,
              materialId: orData.operationsRequest.productMaterialId,
              materialLotId: finishedProductLotId,
              actualQty: finishedGoodQuantity,
              qtyUoM: orData.operationsRequest.quantityUoM,
              direction: 'PRODUCE',
              operationsType: 'Production',
            };
            generatedMatActuals.push(finishedProductActual);
            
            // Create material lot record for finished product
            const finishedProductLot = {
              id: finishedProductLotId,
              materialId: orData.operationsRequest.productMaterialId,
              lotQuantity: finishedGoodQuantity,
              lotUoM: orData.operationsRequest.quantityUoM,
              producedDateTime: endTime.toISOString().slice(0, 19).replace('T', ' '),
              producedByProcessSegmentId: segReq.processSegmentId,
              supplierOrProducerId: segRespId,
              supplierOrProducerName: `Segment Response ${segRespId}`,
              status: 'Available',
            };
            generatedMaterialLots.push(finishedProductLot);
            
            // Create sublots for finished product (100 EA per sublot)
            const sublotSize = 100;
            const numSublots = Math.ceil(finishedGoodQuantity / sublotSize);
            
            for (let sublotIdx = 0; sublotIdx < numSublots; sublotIdx++) {
              const remainingQty = finishedGoodQuantity - (sublotIdx * sublotSize);
              const sublotQty = Math.min(sublotSize, remainingQty);
              
              const sublotId = `${finishedProductLotId}-SUB${String(sublotIdx + 1).padStart(3, '0')}`;
              
              const sublot = {
                id: sublotId,
                materialLotId: finishedProductLotId,  // Parent lot reference
                quantity: sublotQty,
                quantityUnitOfMeasure: orData.operationsRequest.quantityUoM,
                producedDateTime: endTime.toISOString().slice(0, 19).replace('T', ' '),
                status: 'Available',
              };
              generatedMaterialSublots.push(sublot);
            }
            
            console.log(`[Sublots] Created ${numSublots} sublots for finished product lot ${finishedProductLotId}`);
            
            // Create scrap material lot if scrap percentage is specified
            if (scrapProducedPercent > 0) {
              const scrapLotId = `LOT-SCRAP-${plantId}-${lineId}-${finishedDateTime}-${orData.operationsRequest.productMaterialId}-R${run + 1}`;
              
              const scrapProductActual: SegmentMaterialActual = {
                id: `MAT-ACT-${plantId}-${lineId}-${finishedDateTime}-SCRAP-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`,
                segmentResponseId: segRespId,
                materialId: orData.operationsRequest.productMaterialId,
                materialLotId: scrapLotId,
                actualQty: scrapQuantity,
                qtyUoM: orData.operationsRequest.quantityUoM,
                direction: 'Scrap',
                operationsType: 'Production',
              };
              generatedMatActuals.push(scrapProductActual);
              
              const scrapProductLot = {
                id: scrapLotId,
                materialId: orData.operationsRequest.productMaterialId,
                lotQuantity: scrapQuantity,
                lotUoM: orData.operationsRequest.quantityUoM,
                producedDateTime: endTime.toISOString().slice(0, 19).replace('T', ' '),
                producedByProcessSegmentId: segReq.processSegmentId,
                supplierOrProducerId: segRespId,
                supplierOrProducerName: `Segment Response ${segRespId}`,
                status: 'Scrap',
              };
              generatedMaterialLots.push(scrapProductLot);
            }
          }

          // Generate Equipment Actuals for this run
          for (const eqUsage of eqUsages) {
            const eqActualDateTime = `${runStartTime.toISOString().slice(0, 10).replace(/-/g, '')}${String(runStartTime.getHours()).padStart(2, '0')}${String(runStartTime.getMinutes()).padStart(2, '0')}`;
            const eqActualId = `EQ-ACT-${plantId}-${lineId}-${eqActualDateTime}-${eqUsage.equipmentId}-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;
            
            const eqActual: SegmentEquipmentActual = {
              id: eqActualId,
              segmentResponseId: segRespId,
              equipmentId: eqUsage.equipmentId,
              actualQuantity: runDuration,
              actualStartDateTime: runStartTime.toISOString().slice(0, 19).replace('T', ' '),
              actualEndDateTime: endTime.toISOString().slice(0, 19).replace('T', ' '),
              unitOfMeasure: 'Hours',
              operationsType: 'Production',
            };
            generatedEqActuals.push(eqActual);
          }
        }
      }

      // Generate Operations Events per segment requirement (not per run)
      // Always generate mandatory events
      // Conditional events (downtime, scrap) only if conditions are met
      console.log(`[Operations Events] Starting generation - scrap=${scrapProducedPercent}%, delay=${productionDelayMinutes} min`);
      console.log(`[Operations Events] Total segment requirements: ${sortedSegReqs.length}`);
      console.log(`[Operations Events] Total event definitions: ${operationEventDefinitions.length}`);
      console.log(`[Operations Events] Total event-segment assignments: ${operationEventDefSegmentAssignments.length}`);
      console.log(`[Operations Events] Checking segment requirements - scrap=${scrapProducedPercent}, delay=${productionDelayMinutes}`);
      
      for (const segReq of sortedSegReqs) {
        console.log(`[Operations Events] Processing segment ${segReq.processSegmentId}`);
        
        // Find all event definitions assigned to this segment
        let segmentEventAssignments = operationEventDefSegmentAssignments.filter(
          oedsa => oedsa.processSegmentId === segReq.processSegmentId
        );
        
        console.log(`[Operations Events] Found ${segmentEventAssignments.length} event assignments for segment`);
        
        // Debug: Log all assignments with their isMandatory values
        segmentEventAssignments.forEach(a => {
          console.log(`[Operations Events] Assignment ${a.id}: isMandatory = ${a.isMandatory} (type: ${typeof a.isMandatory}), startOrEnd = ${a.startOrEndEvent}`);
        });
        
        // Separate mandatory and conditional events (handle both boolean and string values)
        const mandatoryAssignments = segmentEventAssignments.filter(a => 
          a.isMandatory === true || a.isMandatory === 'TRUE' || a.isMandatory === 'true' || a.isMandatory === 'True'
        );
        const conditionalAssignments = segmentEventAssignments.filter(a => 
          !(a.isMandatory === true || a.isMandatory === 'TRUE' || a.isMandatory === 'true' || a.isMandatory === 'True')
        );
        
        console.log(`[Operations Events] ${mandatoryAssignments.length} mandatory, ${conditionalAssignments.length} conditional events`);
        
        // Filter conditional events based on conditions (downtime, scrap)
        const filteredConditionalAssignments = conditionalAssignments.filter(assignment => {
          const eventDef = operationEventDefinitions.find(oed => oed.id === assignment.operationsEventDefinitionId);
          if (!eventDef) {
            console.log(`[Operations Events] Event definition not found for assignment ${assignment.id}`);
            return false;
          }
          
          // Include downtime events only if production delay is defined
          const includeForDowntime = productionDelayMinutes > 0 && eventDef.causesDowntime;
          
          // Include scrap events only if scrap percentage is defined
          const includeForScrap = scrapProducedPercent > 0 && eventDef.causesScrap;
          
          const shouldInclude = includeForDowntime || includeForScrap;
          
          console.log(`[Operations Events] Event ${eventDef.eventCode}: causesDowntime=${eventDef.causesDowntime}, causesScrap=${eventDef.causesScrap}, includeForDowntime=${includeForDowntime}, includeForScrap=${includeForScrap}, shouldInclude=${shouldInclude}`);
          
          return shouldInclude;
        });
        
        console.log(`[Operations Events] ${filteredConditionalAssignments.length} conditional events match conditions`);
        
        // Combine mandatory events with randomly selected conditional events
        let selectedAssignments = [...mandatoryAssignments];
        
        if (filteredConditionalAssignments.length > 0) {
          // Randomly select 1-3 conditional events
          const numConditionalEvents = Math.floor(Math.random() * 3) + 1;
          const shuffled = [...filteredConditionalAssignments].sort(() => 0.5 - Math.random());
          const selectedConditional = shuffled.slice(0, Math.min(numConditionalEvents, filteredConditionalAssignments.length));
          selectedAssignments = [...selectedAssignments, ...selectedConditional];
        }
        
        console.log(`[Operations Events] Total ${selectedAssignments.length} events to generate (${mandatoryAssignments.length} mandatory + ${selectedAssignments.length - mandatoryAssignments.length} conditional)`);
        
        if (selectedAssignments.length > 0) {
          // Find segment responses for this segment requirement
          const segmentResponses = generatedSegResponses.filter(sr => sr.segmentRequirementId === segReq.id);
          if (segmentResponses.length === 0) continue;
          
          // Process each segment response
          for (const segResp of segmentResponses) {
            const startTime = new Date(segResp.actualStartDateTime.replace(' ', 'T') + 'Z');
            const endTime = new Date(segResp.actualEndDateTime.replace(' ', 'T') + 'Z');
            const durationMs = endTime.getTime() - startTime.getTime();
            
            // Find equipment actual for this segment response to get equipmentId
            const eqActualForSegment = generatedEqActuals.find(ea => ea.segmentResponseId === segResp.id);
            const equipmentIdValue = eqActualForSegment?.equipmentId || '';
            
            // Lookup HierarchyScope ID by equipment ID
            console.log(`[HierarchyScope Debug] Equipment ID from actual: "${equipmentIdValue}"`);
            console.log(`[HierarchyScope Debug] Total hierarchyScopes: ${hierarchyScopes.length}`);
            console.log(`[HierarchyScope Debug] Sample hierarchyScopes:`, hierarchyScopes.slice(0, 3).map(hs => ({ id: hs.id, equipmentID: hs.equipmentID })));
            const hierarchyScopeRecord = hierarchyScopes.find(hs => hs.equipmentID === equipmentIdValue);
            console.log(`[HierarchyScope Debug] Found record:`, hierarchyScopeRecord);
            const hierarchyScopeValue = hierarchyScopeRecord?.id || '';
            
            for (const assignment of selectedAssignments) {
              const eventDef = operationEventDefinitions.find(
                oed => oed.id === assignment.operationsEventDefinitionId
              );
              
              // Determine event timestamp based on StartOrEndEvent
              let eventTime: Date;
              const startOrEnd = (assignment.startOrEndEvent || 'Start').toLowerCase();
              
              if (startOrEnd === 'end') {
                // End events occur near the end of the segment (last 10%)
                const nearEndMs = endTime.getTime() - (durationMs * 0.1 * Math.random());
                eventTime = new Date(nearEndMs);
              } else {
                // Start events occur near the beginning of the segment (first 10%)
                const nearStartMs = startTime.getTime() + (durationMs * 0.1 * Math.random());
                eventTime = new Date(nearStartMs);
              }
              
              const operationsEvent: OperationsEvent = {
                id: `OPS-EVENT-${segResp.id}-${assignment.operationsEventDefinitionId}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
                segmentResponseId: segResp.id,
                operationsEventDefinitionId: assignment.operationsEventDefinitionId,
                effectiveTimestamp: eventTime.toISOString().slice(0, 19).replace('T', ' '),
                notes: `${eventDef?.description || 'Event'} (${startOrEnd === 'end' ? 'End' : 'Start'}) - ${assignment.notes}`,
                eventType: eventDef?.eventType || 'Alarm',
                equipmentId: equipmentIdValue,
                hierarchyScope: hierarchyScopeValue,
                operationsType: 'Production',
              };
              generatedOperationsEvents.push(operationsEvent);
              console.log(`[Operations Events] Created ${assignment.isMandatory ? 'MANDATORY' : 'conditional'} event: ${operationsEvent.id} (${eventDef?.eventCode}) at ${startOrEnd}`);
            }
          }
        } else {
          console.log(`[Operations Events] No events to generate for segment ${segReq.processSegmentId}`);
        }
      }

      console.log(`[Operations Events] TOTAL GENERATED: ${generatedOperationsEvents.length} operations events`);

      // Generate Operations Event Records and Entries based on Operations Events
      const generatedOperationsEventRecords: OperationsEventRecord[] = [];
      const generatedOperationsEventEntries: OperationsEventEntry[] = [];
      console.log('[Operations Event Records] Starting generation');
      
      for (const opsEvent of generatedOperationsEvents) {
        // Get the event definition to determine severity
        const eventDef = operationEventDefinitions.find(
          oed => oed.id === opsEvent.operationsEventDefinitionId
        );
        
        // Get segment response and equipment for this event
        const segResp = generatedSegResponses.find(sr => sr.id === opsEvent.segmentResponseId);
        const segReq = sortedSegReqs.find(sr => sr.id === segResp?.segmentRequirementId);
        const eqReqs = segmentEquipmentRequirements.filter(ser => ser.segmentRequirementId === segReq?.id);
        const selectedEquipment = eqReqs.length > 0 ? eqReqs[Math.floor(Math.random() * eqReqs.length)].equipmentId : equipment[0]?.id || 'EQUIP-001';
        const relatedEquipmentActuals = generatedEqActuals.filter(ea => ea.segmentResponseId === opsEvent.segmentResponseId);
        
        // Create an operations event record for each event
        const recordId = createUniqueRecordId(generatedOperationsEventRecords);
        const operationsEventRecord: OperationsEventRecord = {
          id: recordId,
          operationsEventId: opsEvent.id,
          operationsEventDefinitionId: opsEvent.operationsEventDefinitionId,
          severity: eventDef?.severity || 'Medium',
          status: Math.random() > 0.3 ? 'Closed' : 'Open',
          comments: `Event occurred at ${opsEvent.effectiveTimestamp} - ${opsEvent.notes}`,
          effectiveTime: opsEvent.effectiveTimestamp,
          segmentResponseId: opsEvent.segmentResponseId,
          equipmentId: selectedEquipment,
          eventType: opsEvent.eventType || 'Alarm',
        };
        generatedOperationsEventRecords.push(operationsEventRecord);
        
        // Find entry templates for this event definition ID from master data
        const recordTemplates = operationsEventRecordsTemplates.filter(
          rt => rt.OperationsEventDefinitionID === opsEvent.operationsEventDefinitionId
        );
        
        // For each matching record template, find corresponding entry templates
        let entryCount = 0;
        for (const recordTemplate of recordTemplates) {
          const entryTemplates = operationsEventEntriesTemplates.filter(
            et => et.OperationsEventRecordID === recordTemplate.OperationsEventRecordID
          );
          
          // Create entries based on templates
          for (let i = 0; i < entryTemplates.length; i++) {
            const template = entryTemplates[i];
            entryCount++;
            const entryId = createUniqueEntryId(generatedOperationsEventEntries);
            
            // Add a few minutes to the event time for each entry
            const eventTime = new Date(opsEvent.effectiveTimestamp.replace(' ', 'T') + 'Z');
            const entryTime = new Date(eventTime.getTime() + (entryCount) * 5 * 60000); // Add 5 minutes per entry
            
            const operationsEventEntry: OperationsEventEntry = {
              id: entryId,
              operationsEventRecordId: recordId,
              entryType: template.EntryType || 'Production',
              description: template.Description || `Entry for ${eventDef?.eventCode || 'event'}`,
              effectiveTime: entryTime.toISOString().slice(0, 19).replace('T', ' '),
              segmentResponseId: operationsEventRecord.segmentResponseId,
              equipmentId: operationsEventRecord.equipmentId,
              informationObjectType: 'SegmentResponse',
            };
            generatedOperationsEventEntries.push(operationsEventEntry);
          }
        }
        
        // If no templates found, create a default entry
        if (entryCount === 0) {
          const entryId = createUniqueEntryId(generatedOperationsEventEntries);
          const eventTime = new Date(opsEvent.effectiveTimestamp.replace(' ', 'T') + 'Z');
          const entryTime = new Date(eventTime.getTime() + 5 * 60000);
          
          const operationsEventEntry: OperationsEventEntry = {
            id: entryId,
            operationsEventRecordId: recordId,
            entryType: 'Production',
            description: `Entry for ${eventDef?.eventCode || 'event'}`,
            effectiveTime: entryTime.toISOString().slice(0, 19).replace('T', ' '),
            segmentResponseId: operationsEventRecord.segmentResponseId,
            equipmentId: operationsEventRecord.equipmentId,
            informationObjectType: 'SegmentResponse',
          };
          generatedOperationsEventEntries.push(operationsEventEntry);
          entryCount = 1;
        }

        appendRelatedOperationsEventArtifacts({
          opsEvent,
          eventDef,
          baseRecordId: recordId,
          effectiveTime: opsEvent.effectiveTimestamp,
          segmentResponse: segResp,
          relatedEquipmentActuals,
          generatedOperationsEventRecords,
          generatedOperationsEventEntries,
          dedupeByEntityId: true,
        });
        
        console.log(`[Operations Event Records] Created record ${recordId} with ${entryCount} entries (from templates)`);
      }
      
      console.log(`[Operations Event Records] Total: ${generatedOperationsEventRecords.length} records, ${generatedOperationsEventEntries.length} entries`);
      
      // Verify the relationships between records and entries
      console.log('[Operations Event Records] Verifying record-entry relationships...');
      const recordIds = new Set(generatedOperationsEventRecords.map(r => r.id));
      const orphanedEntries = generatedOperationsEventEntries.filter(entry => !recordIds.has(entry.operationsEventRecordId));
      if (orphanedEntries.length > 0) {
        console.error(`[Operations Event Records] Found ${orphanedEntries.length} orphaned entries!`, orphanedEntries);
      } else {
        console.log(`[Operations Event Records] ✓ All ${generatedOperationsEventEntries.length} entries are properly linked to their records`);
      }
      
      // Log sample relationships
      if (generatedOperationsEventRecords.length > 0) {
        const sampleRecord = generatedOperationsEventRecords[0];
        const relatedEntries = generatedOperationsEventEntries.filter(e => e.operationsEventRecordId === sampleRecord.id);
        console.log(`[Operations Event Records] Sample: Record ${sampleRecord.id} has ${relatedEntries.length} entries:`, relatedEntries.map(e => e.id));
      }

      // Generate Operations Event Properties
      const generatedOperationsEventProperties: any[] = [];
      console.log('[Operations Event Properties] Starting generation');
      
      for (const opsEvent of generatedOperationsEvents) {
        // Find all property assignments for this event's definition
        const propertyAssignments = operationEventDefinitionPropertyAssignments.filter(
          pa => pa.operationsEventDefinitionId === opsEvent.operationsEventDefinitionId
        );
        
        if (propertyAssignments.length === 0) {
          console.log(`[Operations Event Properties] No property assignments found for event ${opsEvent.id} (definition: ${opsEvent.operationsEventDefinitionId})`);
          continue;
        }
        
        // For each assignment, create an operation event property
        for (const assignment of propertyAssignments) {
          const property = operationEventDefinitionProperties.find(
            p => p.id === assignment.operationsEventDefinitionPropertyId
          );
          
          if (!property) {
            console.warn(`[Operations Event Properties] Property ${assignment.operationsEventDefinitionPropertyId} not found for assignment`);
            continue;
          }
          
          // Create a unique ID for this operation event property
          const propId = `OEP-${opsEvent.id.replace('OPS-EVENT-', '')}-${property.id}`;
          
          const operationsEventProperty = {
            id: propId,
            operationsEventId: opsEvent.id,
            operationsEventDefinitionPropertyId: property.id,
            value: assignment.value,
            valueUnitOfMeasure: assignment.valueUnitOfMeasure,
            effectiveTime: opsEvent.effectiveTimestamp,
          };
          
          generatedOperationsEventProperties.push(operationsEventProperty);
        }
        
        console.log(`[Operations Event Properties] Created ${propertyAssignments.length} properties for event ${opsEvent.id}`);
      }
      
      console.log(`[Operations Event Properties] Total: ${generatedOperationsEventProperties.length} properties`);

      // Generate Segment Data (Shift and Crew Assignments)
      const generatedSegmentData: SegmentData[] = [];
      console.log('[Segment Data] Starting shift and crew assignment generation');
      
      // Get the overall start and end time from ALL segment responses (operations response level)
      if (generatedSegResponses.length > 0) {
        const allStartTimes = generatedSegResponses.map(sr => new Date(sr.actualStartDateTime.replace(' ', 'T') + 'Z'));
        const allEndTimes = generatedSegResponses.map(sr => new Date(sr.actualEndDateTime.replace(' ', 'T') + 'Z'));
        
        const operationsStartTime = new Date(Math.min(...allStartTimes.map(d => d.getTime())));
        const operationsEndTime = new Date(Math.max(...allEndTimes.map(d => d.getTime())));
        
        console.log(`[Segment Data] Operations time range: ${operationsStartTime.toISOString()} to ${operationsEndTime.toISOString()}`);
        
        const currentDate = new Date(); // For checking expiry dates
        
        // Find which shift(s) cover the entire operations time period
        const coveringShifts: { shift: any; startDateTime: Date; endDateTime: Date }[] = [];
        
        for (const shift of shifts) {
          // Parse shift times
          const [startHour, startMinute] = shift.startTime.split(':').map(Number);
          const [endHour, endMinute] = shift.endTime.split(':').map(Number);
          
          // Check each day in the operations period
          const currentDay = new Date(operationsStartTime);
          currentDay.setHours(0, 0, 0, 0); // Start from beginning of day
          
          while (currentDay <= operationsEndTime) {
            const shiftStart = new Date(currentDay);
            shiftStart.setHours(startHour, startMinute, 0, 0);
            
            const shiftEnd = new Date(currentDay);
            shiftEnd.setHours(endHour, endMinute, 0, 0);
            
            // Handle overnight shifts (end time before start time)
            if (endHour < startHour || (endHour === startHour && endMinute < startMinute)) {
              shiftEnd.setDate(shiftEnd.getDate() + 1);
            }
            
            // Check if this shift overlaps with operations period
            if (shiftStart < operationsEndTime && shiftEnd > operationsStartTime) {
              coveringShifts.push({
                shift,
                startDateTime: shiftStart,
                endDateTime: shiftEnd,
              });
            }
            
            // Move to next day
            currentDay.setDate(currentDay.getDate() + 1);
          }
        }
        
        console.log(`[Segment Data] Found ${coveringShifts.length} shift periods covering the entire operations time range`);
        
        // Deduplicate shifts by shift ID and time pattern (startTime-endTime)
        const uniqueShifts = new Map<string, { shift: any; startDateTime: Date; endDateTime: Date }>();
        for (const coveringShift of coveringShifts) {
          const shiftKey = `${coveringShift.shift.id}-${coveringShift.shift.startTime}-${coveringShift.shift.endTime}`;
          if (!uniqueShifts.has(shiftKey)) {
            uniqueShifts.set(shiftKey, coveringShift);
          }
        }
        
        const deduplicatedShifts = Array.from(uniqueShifts.values());
        console.log(`[Segment Data] After deduplication: ${deduplicatedShifts.length} unique shifts`);
        
        // For EACH segment response, find which shift(s) actually cover its specific time range
        for (const segResp of generatedSegResponses) {
          const segStartTime = new Date(segResp.actualStartDateTime.replace(' ', 'T') + 'Z');
          const segEndTime = new Date(segResp.actualEndDateTime.replace(' ', 'T') + 'Z');
          
          console.log(`[Segment Data] Processing segment ${segResp.id}: ${segStartTime.toISOString()} to ${segEndTime.toISOString()}`);
          
          // Find shifts that overlap with this specific segment response time range
          const segmentCoveringShifts = coveringShifts.filter(cs => {
            // Check if this shift overlaps with the segment response time
            return cs.startDateTime < segEndTime && cs.endDateTime > segStartTime;
          });
          
          // Deduplicate for this segment (same shift appearing multiple times)
          const uniqueSegmentShifts = new Map<string, { shift: any; startDateTime: Date; endDateTime: Date }>();
          for (const coveringShift of segmentCoveringShifts) {
            const shiftKey = `${coveringShift.shift.id}-${coveringShift.shift.startTime}-${coveringShift.shift.endTime}`;
            if (!uniqueSegmentShifts.has(shiftKey)) {
              // Calculate actual overlap with this specific segment
              const overlapStart = new Date(Math.max(coveringShift.startDateTime.getTime(), segStartTime.getTime()));
              const overlapEnd = new Date(Math.min(coveringShift.endDateTime.getTime(), segEndTime.getTime()));
              uniqueSegmentShifts.set(shiftKey, {
                shift: coveringShift.shift,
                startDateTime: overlapStart,
                endDateTime: overlapEnd,
              });
            }
          }
          
          const shiftsForThisSegment = Array.from(uniqueSegmentShifts.values());
          console.log(`[Segment Data] Segment ${segResp.id} matches ${shiftsForThisSegment.length} shift(s)`);
          
          // Create segment data records for each matching shift
          for (const coveringShift of shiftsForThisSegment) {
            // Create shift record for this segment response
            const shiftSegmentData: SegmentData = {
              id: `SEG-DATA-SHIFT-${segResp.id}-${coveringShift.shift.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              segmentResponseId: segResp.id,
              recordType: 'shift',
              shiftId: coveringShift.shift.id,
              startDateTime: coveringShift.startDateTime.toISOString().slice(0, 19).replace('T', ' '),
              endDateTime: coveringShift.endDateTime.toISOString().slice(0, 19).replace('T', ' '),
              notes: `${coveringShift.shift.shiftName} (Shift ${coveringShift.shift.shiftNumber})`,
            };
            generatedSegmentData.push(shiftSegmentData);
            console.log(`[Segment Data] Assigned shift ${coveringShift.shift.shiftName} to segment ${segResp.id}`);
            
            // Find crew assignments for this shift that are valid at the current date
            const applicableCrewAssignments = shiftCrewAssignments.filter(sca => {
              if (sca.shiftId !== coveringShift.shift.id) return false;
              
              // Check if assignment is effective at the current date
              const effectiveDate = new Date(sca.effectiveDate);
              const expiryDate = sca.expiryDate ? new Date(sca.expiryDate) : new Date('2099-12-31');
              
              // Assignment must be valid at current date
              return currentDate >= effectiveDate && currentDate <= expiryDate;
            });
            
            console.log(`[Segment Data] Shift ${coveringShift.shift.shiftName}: Found ${applicableCrewAssignments.length} applicable crew assignments (total shift crew assignments: ${shiftCrewAssignments.filter(sca => sca.shiftId === coveringShift.shift.id).length})`);
            
            if (applicableCrewAssignments.length === 0 && shiftCrewAssignments.filter(sca => sca.shiftId === coveringShift.shift.id).length > 0) {
              const assignmentsForThisShift = shiftCrewAssignments.filter(sca => sca.shiftId === coveringShift.shift.id);
              console.log(`[Segment Data] WARNING: Shift ${coveringShift.shift.shiftName} has crew assignments but none are valid for current date ${currentDate.toISOString()}`);
              console.log(`[Segment Data] Sample crew assignment for this shift:`, assignmentsForThisShift[0]);
            }
            
            // Create crew records for each assigned crew for this segment response
            for (const crewAssignment of applicableCrewAssignments) {
              const crew = crews.find(c => c.id === crewAssignment.crewId);
              if (crew) {
                const crewSegmentData: SegmentData = {
                  id: `SEG-DATA-CREW-${segResp.id}-${crew.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  segmentResponseId: segResp.id,
                  recordType: 'crew',
                  crewId: crew.id,
                  startDateTime: coveringShift.startDateTime.toISOString().slice(0, 19).replace('T', ' '),
                  endDateTime: coveringShift.endDateTime.toISOString().slice(0, 19).replace('T', ' '),
                  notes: `${crew.crewName} - ${crew.peopleCount} people`,
                };
                generatedSegmentData.push(crewSegmentData);
                console.log(`[Segment Data] Assigned crew ${crew.crewName} to segment ${segResp.id} for shift ${coveringShift.shift.shiftName}`);
              }
            }
          }
        }
        
        console.log(`[Segment Data] Generated ${generatedSegmentData.length} segment data records for ${generatedSegResponses.length} segment responses`);
      }
      
      console.log(`[Segment Data] Total generated: ${generatedSegmentData.length} segment data records (shifts and crews)`);
      setSegmentData(generatedSegmentData);

      // Generate Equipment Property Tracking data
      // Each tracking record is timestamped between the equipment actual's start and end times
      const generatedPropertyTracking: EquipmentPropertyTracking[] = [];
      const SAMPLING_INTERVAL_SECONDS = 30;

      for (let eqActualIndex = 0; eqActualIndex < generatedEqActuals.length; eqActualIndex++) {
        const eqActual = generatedEqActuals[eqActualIndex];
        // Find property assignments for this equipment and process segment
        const segResp = generatedSegResponses.find(sr => sr.id === eqActual.segmentResponseId);
        if (!segResp) continue;

        const propertyAssignments = equipmentPropertyAssignments.filter(
          epa => epa.equipmentId === eqActual.equipmentId && 
                 epa.processSegmentId === segResp.processSegmentId
        );

        for (const assignment of propertyAssignments) {
          // Find the property definition to get min/max ranges
          const property = equipmentProperties.find(ep => ep.id === assignment.equipmentPropertyId);
          if (!property) continue;

          // Calculate sampling interval (use assignment's interval if specified, otherwise default to 30 seconds)
          const samplingInterval = assignment.samplingIntervalSeconds || SAMPLING_INTERVAL_SECONDS;

          // Parse start and end times from equipment actual (which matches segment response times)
          const startTime = new Date(eqActual.actualStartDateTime.replace(' ', 'T') + 'Z');
          const endTime = new Date(eqActual.actualEndDateTime.replace(' ', 'T') + 'Z');
          const durationMs = endTime.getTime() - startTime.getTime();

          // Generate tracking records at specified intervals between equipment start and end times
          const numSamples = Math.floor(durationMs / (samplingInterval * 1000)) + 1;

          for (let i = 0; i < numSamples; i++) {
            const sampleTime = new Date(startTime.getTime() + (i * samplingInterval * 1000));
            
            // Don't generate samples after the equipment end time
            if (sampleTime > endTime) break;

            // Generate value based on property data type
            let value: number | string;
            
            if (property.valueDataType === 'DECIMAL' || property.valueDataType === 'INTEGER') {
              // For numeric types, generate random value within min/max range
              const minValue = typeof property.minValue === 'number' ? property.minValue : 0;
              const maxValue = typeof property.maxValue === 'number' ? property.maxValue : 100;
              const numericValue = minValue + Math.random() * (maxValue - minValue);
              value = property.valueDataType === 'INTEGER' ? Math.round(numericValue) : Math.round(numericValue * 100) / 100;
            } else if (property.valueDataType === 'STRING') {
              // For string types, use minValue if available (could be comma-separated list), otherwise maxValue
              if (property.minValue && typeof property.minValue === 'string') {
                const possibleValues = property.minValue.split(',').map(v => v.trim());
                value = possibleValues[Math.floor(Math.random() * possibleValues.length)];
              } else if (property.maxValue && typeof property.maxValue === 'string') {
                value = property.maxValue;
              } else {
                value = 'N/A';
              }
            } else if (property.valueDataType === 'BOOLEAN') {
              // For boolean types, randomly choose true or false
              value = Math.random() > 0.5 ? 'true' : 'false';
            } else {
              value = 'N/A';
            }

            const trackingId = `PROP-TRACK-${plantId}-${lineId}-${eqActual.equipmentId}-${assignment.equipmentPropertyId}`;
            const createdTimestamp = sampleTime.toISOString().slice(0, 19).replace('T', ' ');
            const timestampSuffix = createdTimestamp.replace(/[- :]/g, '');
            const recordId = `PROP-TRACK-${eqActual.id}-${assignment.equipmentPropertyId}-${timestampSuffix}`;

            // Find equipment class from equipment
            const eqItem = equipment.find(e => e.id === eqActual.equipmentId);
            const equipmentClassId = eqItem?.classId || '';
            
            // Find equipment class property ID from assignment
            const classPropertyAssignment = equipmentClassPropertyAssignments.find(
              ecpa => ecpa.equipmentPropertyId === assignment.equipmentPropertyId
            );
            const equipmentClassPropertyId = classPropertyAssignment?.equipmentClassPropertyId || '';
            
            // Debug logging for first iteration to check data
            if (i === 0 && eqActualIndex === 0) {
              console.log('[Equipment Property Tracking Debug]', {
                equipmentPropertyId: assignment.equipmentPropertyId,
                equipmentClassPropertyAssignmentsCount: equipmentClassPropertyAssignments.length,
                sampleAssignments: equipmentClassPropertyAssignments.slice(0, 3),
                foundAssignment: classPropertyAssignment,
                equipmentClassPropertyId: equipmentClassPropertyId
              });
            }

            const tracking: EquipmentPropertyTracking = {
              id: trackingId,
              __recordId: recordId,
              segmentResponseId: eqActual.segmentResponseId,
              plantId: plantId,
              lineId: lineId,
              equipmentId: eqActual.equipmentId,
              equipmentPropertyId: assignment.equipmentPropertyId,
              equipmentPropertyName: property.name,
              equipmentClassId: equipmentClassId,
              equipmentClassPropertyId: equipmentClassPropertyId,
              value: value,
              uom: property.unit || '',
              createdTimestamp: createdTimestamp,
            };

            generatedPropertyTracking.push(tracking);
          }
        }

        // Generate property tracking for child equipment of this parent equipment
        // Find child equipment where parent equipment ID matches
        // Note: CSV uses 'equipmentParentId' but database might have different casing
        const childEquipment = equipment.filter(eq => 
          eq.equipmentParentId === eqActual.equipmentId || 
          eq.parentEquipmentId === eqActual.equipmentId ||
          (eq as any).EquipmentParentId === eqActual.equipmentId
        );
        
        console.log(`[Child Equipment] Parent equipment ${eqActual.equipmentId}: Found ${childEquipment.length} child equipment`);
        if (childEquipment.length > 0) {
          console.log(`[Child Equipment] Child IDs:`, childEquipment.map(ce => ce.id));
        } else {
          // Debug: Check what fields are actually available
          const sampleEq = equipment[0];
          if (sampleEq) {
            console.log(`[Child Equipment] DEBUG - Sample equipment keys:`, Object.keys(sampleEq));
          }
        }
        
        for (const childEq of childEquipment) {
          // Find property assignments for this child equipment and process segment
          const childPropertyAssignments = equipmentPropertyAssignments.filter(
            epa => epa.equipmentId === childEq.id && 
                   epa.processSegmentId === segResp.processSegmentId
          );

          console.log(`[Child Equipment] Child ${childEq.id} in segment ${segResp.processSegmentId}: Found ${childPropertyAssignments.length} property assignments`);

          for (const assignment of childPropertyAssignments) {
            // Find the property definition to get min/max ranges
            const property = equipmentProperties.find(ep => ep.id === assignment.equipmentPropertyId);
            if (!property) continue;

            // Calculate sampling interval (use assignment's interval if specified, otherwise default to 30 seconds)
            const samplingInterval = assignment.samplingIntervalSeconds || SAMPLING_INTERVAL_SECONDS;

            // Use the parent equipment's start and end times
            const startTime = new Date(eqActual.actualStartDateTime.replace(' ', 'T') + 'Z');
            const endTime = new Date(eqActual.actualEndDateTime.replace(' ', 'T') + 'Z');
            const durationMs = endTime.getTime() - startTime.getTime();

            // Generate tracking records at specified intervals using parent equipment's time range
            const numSamples = Math.floor(durationMs / (samplingInterval * 1000)) + 1;

            for (let i = 0; i < numSamples; i++) {
              const sampleTime = new Date(startTime.getTime() + (i * samplingInterval * 1000));
              
              // Don't generate samples after the equipment end time
              if (sampleTime > endTime) break;

              // Generate value based on property data type
              let value: number | string;
              
              if (property.valueDataType === 'DECIMAL' || property.valueDataType === 'INTEGER') {
                // For numeric types, generate random value within min/max range
                const minValue = typeof property.minValue === 'number' ? property.minValue : 0;
                const maxValue = typeof property.maxValue === 'number' ? property.maxValue : 100;
                const numericValue = minValue + Math.random() * (maxValue - minValue);
                value = property.valueDataType === 'INTEGER' ? Math.round(numericValue) : Math.round(numericValue * 100) / 100;
              } else if (property.valueDataType === 'STRING') {
                // For string types, use minValue if available (could be comma-separated list), otherwise maxValue
                if (property.minValue && typeof property.minValue === 'string') {
                  const possibleValues = property.minValue.split(',').map(v => v.trim());
                  value = possibleValues[Math.floor(Math.random() * possibleValues.length)];
                } else if (property.maxValue && typeof property.maxValue === 'string') {
                  value = property.maxValue;
                } else {
                  value = 'N/A';
                }
              } else if (property.valueDataType === 'BOOLEAN') {
                // For boolean types, randomly choose true or false
                value = Math.random() > 0.5 ? 'true' : 'false';
              } else {
                value = 'N/A';
              }

              const trackingId = `PROP-TRACK-${plantId}-${lineId}-${eqActual.equipmentId}-CHILD-${childEq.id}-${assignment.equipmentPropertyId}`;
              const createdTimestamp = sampleTime.toISOString().slice(0, 19).replace('T', ' ');
              const timestampSuffix = createdTimestamp.replace(/[- :]/g, '');
              const recordId = `PROP-TRACK-${eqActual.id}-CHILD-${childEq.id}-${assignment.equipmentPropertyId}-${timestampSuffix}`;

              // Find equipment class from child equipment
              const childEqItem = equipment.find(e => e.id === childEq.id);
              const childEquipmentClassId = childEqItem?.classId || '';
              
              // Find equipment class property ID from assignment
              const childClassPropertyAssignment = equipmentClassPropertyAssignments.find(
                ecpa => ecpa.equipmentPropertyId === assignment.equipmentPropertyId
              );
              const childEquipmentClassPropertyId = childClassPropertyAssignment?.equipmentClassPropertyId || '';

              const tracking: EquipmentPropertyTracking = {
                id: trackingId,
                __recordId: recordId,
                segmentResponseId: eqActual.segmentResponseId,
                plantId: plantId,
                lineId: lineId,
                parentEquipmentId: eqActual.equipmentId,
                equipmentId: childEq.id,
                equipmentPropertyId: assignment.equipmentPropertyId,
                equipmentPropertyName: property.name,
                equipmentClassId: childEquipmentClassId,
                equipmentClassPropertyId: childEquipmentClassPropertyId,
                value: value,
                uom: property.unit || '',
                createdTimestamp: createdTimestamp,
              };

              generatedPropertyTracking.push(tracking);
            }
          }
        }
      }

      const parentTrackingCount = generatedPropertyTracking.filter(t => !t.id.includes('CHILD')).length;
      const childTrackingCount = generatedPropertyTracking.filter(t => t.id.includes('CHILD')).length;
      console.log(`Generated ${generatedPropertyTracking.length} equipment property tracking records (${parentTrackingCount} parent, ${childTrackingCount} child)`);

      // Create Operations Response using tracked earliest start and latest end
      if (!operationsStartTime || !operationsEndTime) {
        console.error('[Actual Data Generation] ERROR: No segment responses were generated');
        console.error('[Actual Data Generation] Debug info:', {
          sortedSegReqs: sortedSegReqs.length,
          generatedSegResponses: generatedSegResponses.length,
          actualProductQuantity,
          operationsStartTime,
          operationsEndTime
        });
        throw new Error('No segment responses were generated. This could be due to: \n1. No segment requirements defined for the operations request\n2. Equipment capacity configuration is invalid\n3. Process segment data is missing');
      }

      const opsResponse: OperationsResponse = {
        id: opsResponseId,
        operationsRequestId: selectedOperationsRequestId,
        description: orData.operationsRequest.description,
        plantId: plantId,
        productionLineId: lineId,
        actualStartDateTime: operationsStartTime.toISOString().slice(0, 19).replace('T', ' '),
        actualEndDateTime: operationsEndTime.toISOString().slice(0, 19).replace('T', ' '),
        actualQuantity: actualProductQuantity,
        quantityUoM: orData.operationsRequest.quantityUoM,
        status: 'Completed',
        operationsType: 'Production',
      };

      console.log(`Operations Response: Start=${opsResponse.actualStartDateTime}, End=${opsResponse.actualEndDateTime}`);

      setGeneratedOperationsResponse(opsResponse);
      setSegmentResponses(generatedSegResponses);
      setMaterialActuals(generatedMatActuals);
      setEquipmentActuals(generatedEqActuals);
      setEquipmentPropertyTracking(generatedPropertyTracking);
      setOperationsEvents(generatedOperationsEvents);
      setOperationsEventRecords(generatedOperationsEventRecords);
      setOperationsEventEntries(generatedOperationsEventEntries);
      setOperationsEventProperties(generatedOperationsEventProperties);
      setGeneratedMaterialLotsForDisplay(generatedMaterialLots);

      // Generate Personnel Actuals from personnel requirements
      const persReqs: SegmentPersonnelRequirement[] = orData.personnelRequirements || [];
      for (const segResp of generatedSegResponses) {
        const relatedPersReqs = persReqs.filter((pr: SegmentPersonnelRequirement) => pr.segmentRequirementId === segResp.segmentRequirementId);
        for (const pr of relatedPersReqs) {
          const employee = employees.find(e => e.personClassId === pr.personClassId);
          generatedPersonnelActuals.push({
            id: `PERS-ACT-${segResp.id}-${pr.personClassId || pr.id}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
            segmentResponseId: segResp.id,
            employeeId: employee?.id,
            personClassId: pr.personClassId,
            actualQuantity: pr.quantity || 1,
            quantityUnitOfMeasure: pr.quantityUnitOfMeasure || 'Person',
            personnelUse: pr.personnelUse || 'Production',
            actualStartDateTime: segResp.actualStartDateTime,
            actualEndDateTime: segResp.actualEndDateTime,
            operationsType: 'Production',
          });
        }
      }
      setPersonnelActuals(generatedPersonnelActuals);
      const generatedTestResults: TestResult[] = [];
      for (const lot of generatedMaterialLots) {
        const testResultId = `TEST-${lot.id}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        
        // Calculate evaluation date: 10-30 minutes after production
        const lotProducedTime = new Date(lot.producedDateTime.replace(' ', 'T'));
        const minutesToAdd = Math.floor(Math.random() * 21) + 10; // Random between 10 and 30
        const evaluationTime = new Date(lotProducedTime.getTime() + minutesToAdd * 60000);
        
        // Determine if this is a scrap lot
        const isScrapLot = lot.status === 'Scrap';
        
        const testResult: TestResult = {
          id: testResultId,
          materialLotId: lot.id,
          description: isScrapLot ? 'Failed due to temperature inconsistency' : 'Good',
          evaluationDate: evaluationTime.toISOString().slice(0, 19).replace('T', ' '),
          evaluatedCriterionResult: isScrapLot ? 'Fail' : (Math.random() > 0.1 ? 'Pass' : 'Fail'),
        };
        generatedTestResults.push(testResult);
      }
      setTestResults(generatedTestResults);
      console.log(`Generated ${generatedTestResults.length} test results for material lots`);
      
      // Store lots and sublots in state for later saving
      setGeneratedMaterialLotsForDisplay(generatedMaterialLots);
      setGeneratedMaterialSublotsForDisplay(generatedMaterialSublots);
      console.log(`Generated ${generatedMaterialLots.length} material lots and ${generatedMaterialSublots.length} sublots (will be saved when 'Save to DB' is clicked)`);
      
      setLoading(false);

      showSnackbar(`Generated actual data: ${generatedSegResponses.length} segment responses, ${generatedMatActuals.length} material actuals, ${generatedEqActuals.length} equipment actuals, ${generatedPersonnelActuals.length} personnel actuals, ${generatedPropertyTracking.length} property tracking records, ${generatedOperationsEvents.length} operations events, ${generatedOperationsEventProperties.length} event properties, ${generatedSegmentData.length} segment data records, ${generatedMaterialLots.length} material lots, ${generatedMaterialSublots.length} material sublots, ${generatedTestResults.length} test results`, 'success');
    } catch (error) {
      console.error('Error generating actual data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate actual data';
      showSnackbar(errorMessage, 'error');
      setLoading(false);
    }
  };

  const resetActualData = () => {
    setSelectedOperationsRequestId('');
    setActualProductQuantity(0);
    setProductionDelayMinutes(0);
    setDowntimeDelayMinutes(0);
    setGeneratedOperationsResponse(null);
    setSegmentResponses([]);
    setMaterialActuals([]);
    setEquipmentActuals([]);
    setEquipmentPropertyTracking([]);
    setOperationsEvents([]);
    setOperationsEventRecords([]);
    setOperationsEventEntries([]);
    setOperationsEventProperties([]);
    setSegmentData([]);
    setPersonnelActuals([]);
    setTestResults([]);
    setGeneratedMaterialLotsForDisplay([]);
    setGeneratedMaterialSublotsForDisplay([]);
    setActualGenerationTimestamp(null);
  };

  const generateMaintenancePlanData = async () => {
    if (!maintenancePlanFormData.equipmentId || !maintenancePlanFormData.plantId || !maintenancePlanFormData.lineId) {
      showSnackbar('Please select plant, line and equipment for maintenance plan', 'error');
      return;
    }

    const equipmentBoms = maintenanceBOMs.filter((b) => b.equipmentId === maintenancePlanFormData.equipmentId);
    if (equipmentBoms.length === 0) {
      showSnackbar('No maintenance BOM entries found for selected equipment', 'error');
      return;
    }

    const now = new Date();
    const start = maintenancePlanFormData.plannedStartDateTime || now.toISOString();
    const end = maintenancePlanFormData.plannedEndDateTime || new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
    const stamp = `${now.toISOString().slice(0, 10).replace(/-/g, '')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    const sortedBoms = [...equipmentBoms].sort((a, b) => {
      const seqA = processSegments.find((ps) => ps.id === a.processSegmentId)?.sequence ?? Number.MAX_SAFE_INTEGER;
      const seqB = processSegments.find((ps) => ps.id === b.processSegmentId)?.sequence ?? Number.MAX_SAFE_INTEGER;
      return seqA - seqB;
    });

    const requestId = `MNT-REQ-${maintenancePlanFormData.plantId}-${maintenancePlanFormData.lineId}-${stamp}`;
    const request: OperationsRequest = {
      id: requestId,
      description: maintenancePlanFormData.description || `Maintenance order for ${maintenancePlanFormData.equipmentId}`,
      plantId: maintenancePlanFormData.plantId,
      lineId: maintenancePlanFormData.lineId,
      productMaterialId: sortedBoms[0].materialId || maintenancePlanFormData.equipmentId,
      plannedQuantity: 1,
      quantityUoM: 'EA',
      plannedStartDateTime: start,
      plannedEndDateTime: end,
      priority: maintenancePlanFormData.priority,
      status: 'Planned',
      operationsType: 'Maintenance',
    };

    const segReqs: SegmentRequirement[] = sortedBoms.map((mb, index) => {
      const segment = processSegments.find((ps) => ps.id === mb.processSegmentId);
      return {
        id: `MNT-SR-${requestId}-${index + 1}`,
        operationsRequestId: requestId,
        processSegmentId: mb.processSegmentId,
        equipmentId: maintenancePlanFormData.equipmentId,
        sequence: segment?.sequence ?? (index + 1) * 10,
        earliestStartDateTime: start,
        latestEndDateTime: end,
        targetQuantity: 1,
        quantityUoM: 'EA',
        operationsType: 'Maintenance',
      };
    });

    const matReqs: SegmentMaterialRequirement[] = sortedBoms.map((mb, index) => ({
      id: `MNT-MR-${requestId}-${index + 1}`,
      segmentRequirementId: segReqs[index].id,
      materialId: mb.materialId,
      requiredQty: Number(mb.qtyPerUnit) || 1,
      qtyUoM: mb.uom || 'EA',
        requirementType: 'consumed',
        operationsType: 'Maintenance' as const,
      }));

      const eqReqs: SegmentEquipmentRequirement[] = sortedBoms.map((mb, index) => ({
        id: `MNT-ER-${requestId}-${index + 1}`,
        segmentRequirementId: segReqs[index].id,
        lineId: maintenancePlanFormData.lineId,
        equipmentClassId: '',
        equipmentId: maintenancePlanFormData.equipmentId,
        requirementType: 'Equipment',
        plannedQuantity: 1,
        unitOfMeasure: 'Machine',
        operationsType: 'Maintenance' as const,
      }));

      const personnelReqs: SegmentPersonnelRequirement[] = sortedBoms
        .filter((mb) => Number(mb.personQuantity) > 0)
        .map((mb, index) => ({
          id: `MNT-PR-${requestId}-${index + 1}`,
          segmentRequirementId: segReqs[index].id,
          employeeId: mb.employeeId || '',
          personClassId: mb.personClassId || '',
          quantity: Number(mb.personQuantity) || 1,
          quantityUnitOfMeasure: mb.personQuantityUoM || 'Person',
          personnelUse: 'MaintenanceWork',
          operationsType: 'Maintenance' as const,
        }));

    setGeneratedMaintenanceRequest(request);
    setMaintenanceSegmentRequirements(segReqs);
    setMaintenanceMaterialRequirements(matReqs);
    setMaintenanceEquipmentRequirements(eqReqs);
    setMaintenancePersonnelRequirements(personnelReqs);
    showSnackbar(`Maintenance plan generated: ${segReqs.length} segments`, 'success');
  };

  const saveMaintenancePlanToDatabase = async () => {
    if (!generatedMaintenanceRequest || maintenanceSegmentRequirements.length === 0) {
      showSnackbar('No maintenance plan data to save', 'error');
      return;
    }

    try {
      setLoading(true);
      await processDataApi.saveGeneratedData(
        generatedMaintenanceRequest,
        maintenanceSegmentRequirements,
        maintenanceMaterialRequirements,
        maintenanceEquipmentRequirements,
        maintenancePersonnelRequirements,
      );
      await loadSavedMaintenanceRequests();
      await loadSavedOperationsRequests();
      setLoading(false);
      showSnackbar('Maintenance plan data saved to database successfully', 'success');
    } catch (error: any) {
      console.error('Failed to save maintenance plan data:', error);
      showSnackbar(`Failed to save maintenance plan data: ${error?.message || error}`, 'error');
      setLoading(false);
    }
  };

  const generateMaintenanceActualData = async () => {
    if (!selectedMaintenanceRequestId) {
      showSnackbar('Please select a maintenance order first', 'error');
      return;
    }

    try {
      setLoading(true);
      const orData = await processDataApi.getOperationsRequestWithRequirements(selectedMaintenanceRequestId);
      if (!orData) {
        showSnackbar('Maintenance order not found', 'error');
        setLoading(false);
        return;
      }

      const timestamp = new Date();
      const respId = `MNT-RESP-${timestamp.toISOString().slice(0, 19).replace(/[-:T]/g, '')}`;
      const baseReq = orData.operationsRequest;

      const response: OperationsResponse = {
        id: respId,
        operationsRequestId: baseReq.id,
        description: `Maintenance execution for ${baseReq.description}`,
        plantId: baseReq.plantId,
        productionLineId: baseReq.lineId,
        actualStartDateTime: baseReq.plannedStartDateTime,
        actualEndDateTime: baseReq.plannedEndDateTime,
        actualQuantity: 1,
        quantityUoM: baseReq.quantityUoM || 'EA',
        status: 'Completed',
        operationsType: 'Maintenance',
      };

      const segResponses: SegmentResponse[] = (orData.segmentRequirements || []).map((sr: any, index: number) => ({
        id: `MNT-SRESP-${respId}-${index + 1}`,
        segmentRequirementId: sr.id,
        operationsResponseId: respId,
        processSegmentId: sr.processSegmentId,
        equipmentId: sr.equipmentId,
        actualStartDateTime: sr.earliestStartDateTime,
        actualEndDateTime: sr.latestEndDateTime,
        actualQuantity: 1,
        quantityUoM: sr.quantityUoM || 'EA',
        status: 'Completed',
        operationsType: 'Maintenance',
      }));

      const segRespBySegReq = new Map(segResponses.map((sr) => [sr.segmentRequirementId, sr]));

      const matActuals: SegmentMaterialActual[] = (orData.materialRequirements || []).map((mr: any, index: number): SegmentMaterialActual => ({
        id: `MNT-MACT-${respId}-${index + 1}`,
        segmentResponseId: segRespBySegReq.get(mr.segmentRequirementId)?.id || '',
        materialId: mr.materialId,
        materialLotId: `MNT-LOT-${timestamp.getTime()}-${index + 1}`,
        actualQty: mr.requiredQty || 1,
        qtyUoM: mr.qtyUoM || 'EA',
        direction: 'CONSUME' as const,
        operationsType: 'Maintenance' as const,
      })).filter((m) => !!m.segmentResponseId);

      const eqActuals: SegmentEquipmentActual[] = (orData.equipmentRequirements || []).map((er: any, index: number): SegmentEquipmentActual => ({
        id: `MNT-EACT-${respId}-${index + 1}`,
        segmentResponseId: segRespBySegReq.get(er.segmentRequirementId)?.id || '',
        equipmentId: er.equipmentId,
        actualQuantity: 1,
        actualStartDateTime: baseReq.plannedStartDateTime,
        actualEndDateTime: baseReq.plannedEndDateTime,
        unitOfMeasure: 'Machine',
        operationsType: 'Maintenance' as const,
      })).filter((e) => !!e.segmentResponseId);

      const persActuals: SegmentPersonnelActual[] = (orData.personnelRequirements || []).map((pr: any, index: number): SegmentPersonnelActual => ({
        id: `MNT-PACT-${respId}-${index + 1}`,
        segmentResponseId: segRespBySegReq.get(pr.segmentRequirementId)?.id || '',
        employeeId: pr.employeeId || '',
        personClassId: pr.personClassId || '',
        actualQuantity: pr.quantity || 1,
        quantityUnitOfMeasure: pr.quantityUnitOfMeasure || 'Person',
        personnelUse: pr.personnelUse || 'MaintenanceWork',
        actualStartDateTime: baseReq.plannedStartDateTime,
        actualEndDateTime: baseReq.plannedEndDateTime,
        operationsType: 'Maintenance' as const,
      })).filter((p) => !!p.segmentResponseId);

      const generatedMaintenanceOperationsEvents: OperationsEvent[] = [];
      const generatedMaintenanceOperationsEventRecords: OperationsEventRecord[] = [];
      const generatedMaintenanceOperationsEventEntries: OperationsEventEntry[] = [];

      for (const segResp of segResponses) {
        const segmentAssignments = operationEventDefSegmentAssignments.filter(
          (assignment) => assignment.processSegmentId === segResp.processSegmentId,
        );

        if (segmentAssignments.length === 0) {
          continue;
        }

        const mandatoryAssignments = segmentAssignments.filter(
          (assignment) =>
            assignment.isMandatory === true ||
            assignment.isMandatory === 'TRUE' ||
            assignment.isMandatory === 'true' ||
            assignment.isMandatory === 'True',
        );

        const selectedAssignments = mandatoryAssignments.length > 0 ? mandatoryAssignments : segmentAssignments;
        const segStart = new Date(segResp.actualStartDateTime.replace(' ', 'T') + 'Z');
        const segEnd = new Date(segResp.actualEndDateTime.replace(' ', 'T') + 'Z');
        const durationMs = Math.max(segEnd.getTime() - segStart.getTime(), 0);
        const relatedEquipmentActuals = eqActuals.filter((equipmentActual) => equipmentActual.segmentResponseId === segResp.id);
        const equipmentId = relatedEquipmentActuals[0]?.equipmentId || segResp.equipmentId || '';
        const hierarchyScopeRecord = hierarchyScopes.find((hierarchyScope) => hierarchyScope.equipmentID === equipmentId);

        for (const assignment of selectedAssignments) {
          const eventDef = operationEventDefinitions.find(
            (definition) => definition.id === assignment.operationsEventDefinitionId,
          );

          const startOrEnd = (assignment.startOrEndEvent || 'Start').toLowerCase();
          const eventTime = startOrEnd === 'end'
            ? new Date(segEnd.getTime() - Math.floor(durationMs * 0.1 * Math.random()))
            : new Date(segStart.getTime() + Math.floor(durationMs * 0.1 * Math.random()));

          const opsEvent: OperationsEvent = {
            id: `OPS-EVENT-${segResp.id}-${assignment.operationsEventDefinitionId}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
            segmentResponseId: segResp.id,
            operationsEventDefinitionId: assignment.operationsEventDefinitionId,
            effectiveTimestamp: toDbDateTime(eventTime),
            notes: `${eventDef?.description || 'Maintenance event'} - ${(assignment.notes || '').toString()}`,
            eventType: eventDef?.eventType || 'Alarm',
            equipmentId,
            hierarchyScope: hierarchyScopeRecord?.id || '',
            operationsType: 'Maintenance',
          };
          generatedMaintenanceOperationsEvents.push(opsEvent);

          const recordId = createUniqueRecordId(generatedMaintenanceOperationsEventRecords);
          generatedMaintenanceOperationsEventRecords.push({
            id: recordId,
            operationsEventId: opsEvent.id,
            operationsEventDefinitionId: opsEvent.operationsEventDefinitionId,
            severity: eventDef?.severity || 'Medium',
            status: 'Closed',
            comments: `Maintenance event occurred at ${opsEvent.effectiveTimestamp} - ${opsEvent.notes}`,
            effectiveTime: opsEvent.effectiveTimestamp,
            segmentResponseId: segResp.id,
            equipmentId,
            eventType: opsEvent.eventType || 'Alarm',
          });

          const recordTemplates = operationsEventRecordsTemplates.filter(
            (template) => template.OperationsEventDefinitionID === opsEvent.operationsEventDefinitionId,
          );

          let entryCount = 0;
          for (const recordTemplate of recordTemplates) {
            const entryTemplates = operationsEventEntriesTemplates.filter(
              (template) => template.OperationsEventRecordID === recordTemplate.OperationsEventRecordID,
            );

            for (const entryTemplate of entryTemplates) {
              entryCount += 1;
              const entryTime = new Date(eventTime.getTime() + entryCount * 5 * 60000);
              generatedMaintenanceOperationsEventEntries.push({
                id: createUniqueEntryId(generatedMaintenanceOperationsEventEntries),
                operationsEventRecordId: recordId,
                entryType: entryTemplate.EntryType || 'Maintenance',
                description: entryTemplate.Description || `Entry for ${eventDef?.eventCode || 'maintenance event'}`,
                effectiveTime: toDbDateTime(entryTime),
                segmentResponseId: segResp.id,
                equipmentId,
                informationObjectType: 'SegmentResponse',
              });
            }
          }

          if (entryCount === 0) {
            generatedMaintenanceOperationsEventEntries.push({
              id: createUniqueEntryId(generatedMaintenanceOperationsEventEntries),
              operationsEventRecordId: recordId,
              entryType: 'Maintenance',
              description: `Entry for ${eventDef?.eventCode || 'maintenance event'}`,
              effectiveTime: toDbDateTime(new Date(eventTime.getTime() + 5 * 60000)),
              segmentResponseId: segResp.id,
              equipmentId,
              informationObjectType: 'SegmentResponse',
            });
          }

          appendRelatedOperationsEventArtifacts({
            opsEvent,
            eventDef,
            baseRecordId: recordId,
            effectiveTime: opsEvent.effectiveTimestamp,
            segmentResponse: segResp,
            relatedEquipmentActuals,
            generatedOperationsEventRecords: generatedMaintenanceOperationsEventRecords,
            generatedOperationsEventEntries: generatedMaintenanceOperationsEventEntries,
            dedupeByEntityId: true,
          });
        }
      }

      setGeneratedMaintenanceResponse(response);
      setMaintenanceSegmentResponses(segResponses);
      setMaintenanceMaterialActuals(matActuals);
      setMaintenanceEquipmentActuals(eqActuals);
      setMaintenancePersonnelActuals(persActuals);
      setOperationsEvents(generatedMaintenanceOperationsEvents);
      setOperationsEventRecords(generatedMaintenanceOperationsEventRecords);
      setOperationsEventEntries(generatedMaintenanceOperationsEventEntries);
      setOperationsEventProperties([]);
      setMaintenanceActualTimestamp(timestamp);
      setMaintenancePlanReference(orData.operationsRequest);
      setMaintenanceSegReqReference(orData.segmentRequirements || []);

      setLoading(false);
      showSnackbar(`Maintenance actual generated: ${segResponses.length} segment responses, ${generatedMaintenanceOperationsEvents.length} operations events, ${generatedMaintenanceOperationsEventRecords.length} event records, ${generatedMaintenanceOperationsEventEntries.length} event entries`, 'success');
    } catch (error) {
      console.error('Failed to generate maintenance actual data:', error);
      showSnackbar('Failed to generate maintenance actual data', 'error');
      setLoading(false);
    }
  };

  const saveMaintenanceActualToDatabase = async () => {
    if (!generatedMaintenanceResponse || maintenanceSegmentResponses.length === 0) {
      showSnackbar('No maintenance actual data to save', 'error');
      return;
    }

    try {
      setLoading(true);
      await processDataApi.upsertStoreRecords('operationsResponses', [generatedMaintenanceResponse]);
      if (maintenanceSegmentResponses.length > 0) {
        await processDataApi.upsertStoreRecords('segmentResponses', maintenanceSegmentResponses);
      }
      if (maintenanceMaterialActuals.length > 0) {
        await processDataApi.upsertStoreRecords('segmentMaterialActuals', maintenanceMaterialActuals);
      }
      if (maintenanceEquipmentActuals.length > 0) {
        await processDataApi.upsertStoreRecords('segmentEquipmentActuals', maintenanceEquipmentActuals);
      }
      if (maintenancePersonnelActuals.length > 0) {
        await processDataApi.upsertStoreRecords('segmentPersonnelActuals', maintenancePersonnelActuals);
      }
      if (operationsEvents.length > 0) {
        await processDataApi.upsertStoreRecords('operationsEvents', operationsEvents);
      }
      if (operationsEventRecords.length > 0) {
        await processDataApi.upsertStoreRecords('operationsEventRecords', operationsEventRecords);
      }
      if (operationsEventEntries.length > 0) {
        await processDataApi.upsertStoreRecords('operationsEventEntries', operationsEventEntries);
      }
      if (operationsEventProperties.length > 0) {
        await processDataApi.upsertStoreRecords('operationsEventProperties', operationsEventProperties);
      }
      await loadStoredActualData();
      setLoading(false);
      showSnackbar('Maintenance actual data saved to database successfully', 'success');
    } catch (error) {
      console.error('Failed to save maintenance actual data:', error);
      showSnackbar('Failed to save maintenance actual data', 'error');
      setLoading(false);
    }
  };

  const resetMaintenancePlan = () => {
    setGeneratedMaintenanceRequest(null);
    setMaintenanceSegmentRequirements([]);
    setMaintenanceMaterialRequirements([]);
    setMaintenanceEquipmentRequirements([]);
    setMaintenancePersonnelRequirements([]);
  };

  const resetMaintenanceActual = () => {
    setSelectedMaintenanceRequestId('');
    setGeneratedMaintenanceResponse(null);
    setMaintenanceSegmentResponses([]);
    setMaintenanceMaterialActuals([]);
    setMaintenanceEquipmentActuals([]);
    setMaintenancePersonnelActuals([]);
    setOperationsEvents([]);
    setOperationsEventRecords([]);
    setOperationsEventEntries([]);
    setOperationsEventProperties([]);
    setMaintenanceActualTimestamp(null);
    setMaintenancePlanReference(null);
    setMaintenanceSegReqReference([]);
  };

  // ── Unplanned Maintenance ──────────────────────────────────────────────────

  const loadUnplannedStoredEvents = async () => {
    setUnplannedEventsLoading(true);
    try {
      const events = await processDataApi.getAll('operationsEvents');
      setUnplannedStoredEvents(events as any[]);
    } catch (error) {
      console.error('Failed to load operations events for unplanned maintenance tab:', error);
      showSnackbar('Failed to load operations events', 'error');
    } finally {
      setUnplannedEventsLoading(false);
    }
  };

  const loadStoredUnplannedMaintenanceData = async () => {
    setStoredUnplannedDataLoading(true);
    try {
      const [allResponsesRaw, allSegmentResponsesRaw, allMaterialActualsRaw, allEquipmentActualsRaw, allPersonnelActualsRaw, allOpsEventsRaw, allOpsEventRecordsRaw, allOpsEventEntriesRaw] = await Promise.all([
        processDataApi.getAll('operationsResponses'),
        processDataApi.getAll('segmentResponses'),
        processDataApi.getAll('segmentMaterialActuals'),
        processDataApi.getAll('segmentEquipmentActuals'),
        processDataApi.getAll('segmentPersonnelActuals'),
        processDataApi.getAll('operationsEvents'),
        processDataApi.getAll('operationsEventRecords'),
        processDataApi.getAll('operationsEventEntries'),
      ]);

      const allResponses = (allResponsesRaw || []) as OperationsResponse[];
      const allSegmentResponses = (allSegmentResponsesRaw || []) as SegmentResponse[];
      const allMaterialActuals = (allMaterialActualsRaw || []) as SegmentMaterialActual[];
      const allEquipmentActuals = (allEquipmentActualsRaw || []) as SegmentEquipmentActual[];
      const allPersonnelActuals = (allPersonnelActualsRaw || []) as SegmentPersonnelActual[];
      const allOpsEvents = (allOpsEventsRaw || []) as OperationsEvent[];
      const allOpsEventRecords = (allOpsEventRecordsRaw || []) as OperationsEventRecord[];
      const allOpsEventEntries = (allOpsEventEntriesRaw || []) as OperationsEventEntry[];

      const unplannedResponses = allResponses
        .filter((response) => {
          const operationsType = (response.operationsType || '').toString().toLowerCase();
          const responseId = (response.id || '').toString();
          const description = (response.description || '').toString().toLowerCase();
          return operationsType === 'maintenance' && (
            responseId.startsWith('UNPL-RESP-') ||
            description.includes('unplanned maintenance')
          );
        })
        .sort((a, b) => {
          const aTs = Date.parse(a.actualStartDateTime || a.actualEndDateTime || '') || 0;
          const bTs = Date.parse(b.actualStartDateTime || b.actualEndDateTime || '') || 0;
          return bTs - aTs;
        });

      const responseIds = new Set(unplannedResponses.map((response) => response.id));
      const unplannedSegmentResponses = allSegmentResponses.filter((segmentResponse) => responseIds.has(segmentResponse.operationsResponseId));
      const segmentIds = new Set(unplannedSegmentResponses.map((segmentResponse) => segmentResponse.id));

      const unplannedMaterialActuals = allMaterialActuals.filter((materialActual) => segmentIds.has(materialActual.segmentResponseId));
      const unplannedEquipmentActuals = allEquipmentActuals.filter((equipmentActual) => segmentIds.has(equipmentActual.segmentResponseId));
      const unplannedPersonnelActuals = allPersonnelActuals.filter((personnelActual) => segmentIds.has(personnelActual.segmentResponseId));
      const unplannedOpsEvents = allOpsEvents.filter((opsEvent) => segmentIds.has(opsEvent.segmentResponseId));
      const opsEventIds = new Set(unplannedOpsEvents.map((opsEvent) => opsEvent.id));

      const unplannedOpsEventRecords = allOpsEventRecords.filter(
        (record) => segmentIds.has(record.segmentResponseId) || opsEventIds.has(record.operationsEventId),
      );
      const opsEventRecordIds = new Set(unplannedOpsEventRecords.map((record) => record.id));

      const unplannedOpsEventEntries = allOpsEventEntries.filter(
        (entry) => segmentIds.has(entry.segmentResponseId) || opsEventRecordIds.has(entry.operationsEventRecordId),
      );

      setStoredUnplannedResponses(unplannedResponses);
      setStoredUnplannedSegmentResponses(unplannedSegmentResponses);
      setStoredUnplannedMaterialActuals(unplannedMaterialActuals);
      setStoredUnplannedEquipmentActuals(unplannedEquipmentActuals);
      setStoredUnplannedPersonnelActuals(unplannedPersonnelActuals);
      setStoredUnplannedOpsEvents(unplannedOpsEvents);
      setStoredUnplannedOpsEventRecords(unplannedOpsEventRecords);
      setStoredUnplannedOpsEventEntries(unplannedOpsEventEntries);

      setSelectedStoredUnplannedResponseId((prevId) => {
        if (prevId && unplannedResponses.some((response) => response.id === prevId)) {
          return prevId;
        }
        return unplannedResponses[0]?.id || '';
      });
    } catch (error) {
      console.error('Failed to load stored unplanned maintenance data:', error);
      showSnackbar('Failed to load stored unplanned maintenance data', 'error');
    } finally {
      setStoredUnplannedDataLoading(false);
    }
  };

  const generateUnplannedMaintenanceData = async () => {
    if (!selectedUnplannedEventId) {
      showSnackbar('Please select an operations event first', 'error');
      return;
    }
    if (!unplannedSegmentId) {
      showSnackbar('Please select a process segment', 'error');
      return;
    }
    if (!unplannedEquipmentId) {
      showSnackbar('Please select equipment', 'error');
      return;
    }
    if (!unplannedStartDateTime || !unplannedEndDateTime) {
      showSnackbar('Please specify start and end date/time', 'error');
      return;
    }

    try {
      setLoading(true);

      const selectedEvent = unplannedStoredEvents.find((e) => e.id === selectedUnplannedEventId);
      if (!selectedEvent) {
        showSnackbar('Selected operations event not found', 'error');
        setLoading(false);
        return;
      }

      const timestamp = new Date();
      const stamp = timestamp.toISOString().slice(0, 19).replace(/[-:T]/g, '');
      const respId = `UNPL-RESP-${stamp}`;
      const segRespId = `UNPL-SRESP-${respId}-001`;

      const plantId = selectedEvent.hierarchyScope || '';

      // Operations Response
      const unplannedResponse: OperationsResponse = {
        id: respId,
        operationsRequestId: '',
        description: `Unplanned maintenance execution triggered by event ${selectedEvent.id}`,
        plantId,
        productionLineId: '',
        actualStartDateTime: unplannedStartDateTime,
        actualEndDateTime: unplannedEndDateTime,
        actualQuantity: 1,
        quantityUoM: 'EA',
        status: 'Completed',
        operationsType: 'Maintenance',
      };

      // Segment Response
      const segmentResponse: SegmentResponse = {
        id: segRespId,
        segmentRequirementId: '',
        operationsResponseId: respId,
        processSegmentId: unplannedSegmentId,
        equipmentId: unplannedEquipmentId,
        actualStartDateTime: unplannedStartDateTime,
        actualEndDateTime: unplannedEndDateTime,
        actualQuantity: 1,
        quantityUoM: 'EA',
        status: 'Completed',
        operationsType: 'Maintenance',
      };

      // Material Actuals
      const matActuals: SegmentMaterialActual[] = unplannedMaterialIds.map((materialId, index) => ({
        id: `UNPL-MACT-${respId}-${String(index + 1).padStart(2, '0')}`,
        segmentResponseId: segRespId,
        materialId,
        materialLotId: `UNPL-LOT-${stamp}-${String(index + 1).padStart(2, '0')}`,
        actualQty: 1,
        qtyUoM: 'EA',
        direction: 'CONSUME' as const,
        operationsType: 'Maintenance' as const,
      }));

      // Equipment Actual
      const eqActuals: SegmentEquipmentActual[] = [{
        id: `UNPL-EACT-${respId}-01`,
        segmentResponseId: segRespId,
        equipmentId: unplannedEquipmentId,
        actualQuantity: 1,
        actualStartDateTime: unplannedStartDateTime,
        actualEndDateTime: unplannedEndDateTime,
        unitOfMeasure: 'Machine',
        operationsType: 'Maintenance' as const,
      }];

      // Personnel Actuals
      const persActuals: SegmentPersonnelActual[] = unplannedPersonnelIds.map((employeeId, index) => ({
        id: `UNPL-PACT-${respId}-${String(index + 1).padStart(2, '0')}`,
        segmentResponseId: segRespId,
        employeeId,
        personClassId: employees.find((emp) => emp.id === employeeId)?.personClassId || '',
        actualQuantity: 1,
        quantityUnitOfMeasure: 'Person',
        personnelUse: 'MaintenanceWork',
        actualStartDateTime: unplannedStartDateTime,
        actualEndDateTime: unplannedEndDateTime,
        operationsType: 'Maintenance' as const,
      }));

      const genOpsEvents: OperationsEvent[] = [];
      const genOpsEventRecords: OperationsEventRecord[] = [];
      const genOpsEventEntries: OperationsEventEntry[] = [];

      // For the SELECTED existing operations event: add a new record and entry linked to the new segment response
      const existingEventDef = operationEventDefinitions.find(
        (def) => def.id === selectedEvent.operationsEventDefinitionId,
      );
      genOpsEventRecords.push({
        id: segRespId,
        operationsEventId: selectedEvent.id,
        operationsEventDefinitionId: selectedEvent.operationsEventDefinitionId || '',
        severity: existingEventDef?.severity || 'Medium',
        status: 'Closed',
        comments: `Unplanned maintenance segment response ${segRespId} linked to this event`,
        effectiveTime: unplannedStartDateTime,
        segmentResponseId: segRespId,
        equipmentId: unplannedEquipmentId,
        eventType: selectedEvent.eventType || 'Alarm',
      });
      genOpsEventEntries.push({
        id: segRespId,
        operationsEventRecordId: segRespId,
        entryType: 'Maintenance',
        description: `Unplanned maintenance segment response ${segRespId} – ${processSegments.find((ps) => ps.id === unplannedSegmentId)?.name || unplannedSegmentId}`,
        effectiveTime: unplannedStartDateTime,
        segmentResponseId: segRespId,
        equipmentId: unplannedEquipmentId,
        informationObjectType: 'SegmentResponse',
      });

      // For the NEW segment response: create new OpsEvent + records + entries from event definition assignments
      const segmentAssignments = operationEventDefSegmentAssignments.filter(
        (assignment) => assignment.processSegmentId === unplannedSegmentId,
      );

      const selectedAssignments = segmentAssignments.filter(
        (a) =>
          a.isMandatory === true ||
          a.isMandatory === 'TRUE' ||
          a.isMandatory === 'true' ||
          a.isMandatory === 'True',
      );
      const assignmentsToProcess = selectedAssignments.length > 0 ? selectedAssignments : segmentAssignments;

      const hierarchyScopeRecord = hierarchyScopes.find((hs) => hs.equipmentID === unplannedEquipmentId);
      const startDt = new Date(unplannedStartDateTime.replace(' ', 'T'));
      const endDt = new Date(unplannedEndDateTime.replace(' ', 'T'));
      const durationMs = Math.max(endDt.getTime() - startDt.getTime(), 0);

      for (const assignment of assignmentsToProcess) {
        const eventDef = operationEventDefinitions.find(
          (def) => def.id === assignment.operationsEventDefinitionId,
        );

        const startOrEnd = (assignment.startOrEndEvent || 'Start').toLowerCase();
        const eventTime = startOrEnd === 'end'
          ? new Date(endDt.getTime() - Math.floor(durationMs * 0.1 * Math.random()))
          : new Date(startDt.getTime() + Math.floor(durationMs * 0.1 * Math.random()));

        const newOpsEvent: OperationsEvent = {
          id: `OPS-EVENT-${segRespId}-${assignment.operationsEventDefinitionId}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
          segmentResponseId: segRespId,
          operationsEventDefinitionId: assignment.operationsEventDefinitionId,
          effectiveTimestamp: toDbDateTime(eventTime),
          notes: `${eventDef?.description || 'Unplanned maintenance event'} - ${(assignment.notes || '').toString()}`,
          eventType: eventDef?.eventType || 'Alarm',
          equipmentId: unplannedEquipmentId,
          hierarchyScope: hierarchyScopeRecord?.id || '',
          operationsType: 'Maintenance',
        };
        genOpsEvents.push(newOpsEvent);

        const recordId = createUniqueRecordId(genOpsEventRecords);
        genOpsEventRecords.push({
          id: recordId,
          operationsEventId: newOpsEvent.id,
          operationsEventDefinitionId: newOpsEvent.operationsEventDefinitionId,
          severity: eventDef?.severity || 'Medium',
          status: 'Closed',
          comments: `Unplanned maintenance event at ${newOpsEvent.effectiveTimestamp}`,
          effectiveTime: newOpsEvent.effectiveTimestamp,
          segmentResponseId: segRespId,
          equipmentId: unplannedEquipmentId,
          eventType: newOpsEvent.eventType || 'Alarm',
        });

        const recordTemplates = operationsEventRecordsTemplates.filter(
          (t) => t.OperationsEventDefinitionID === newOpsEvent.operationsEventDefinitionId,
        );
        let entryCount = 0;
        for (const recordTemplate of recordTemplates) {
          const entryTemplates = operationsEventEntriesTemplates.filter(
            (t) => t.OperationsEventRecordID === recordTemplate.OperationsEventRecordID,
          );
          for (const entryTemplate of entryTemplates) {
            entryCount += 1;
            const entryTime = new Date(eventTime.getTime() + entryCount * 5 * 60000);
            genOpsEventEntries.push({
              id: createUniqueEntryId(genOpsEventEntries),
              operationsEventRecordId: recordId,
              entryType: entryTemplate.EntryType || 'Maintenance',
              description: entryTemplate.Description || `Entry for ${eventDef?.eventCode || 'unplanned maintenance event'}`,
              effectiveTime: toDbDateTime(entryTime),
              segmentResponseId: segRespId,
              equipmentId: unplannedEquipmentId,
              informationObjectType: 'SegmentResponse',
            });
          }
        }
        if (entryCount === 0) {
          genOpsEventEntries.push({
            id: createUniqueEntryId(genOpsEventEntries),
            operationsEventRecordId: recordId,
            entryType: 'Maintenance',
            description: `Entry for ${eventDef?.eventCode || 'unplanned maintenance event'}`,
            effectiveTime: toDbDateTime(new Date(eventTime.getTime() + 5 * 60000)),
            segmentResponseId: segRespId,
            equipmentId: unplannedEquipmentId,
            informationObjectType: 'SegmentResponse',
          });
        }

        appendRelatedOperationsEventArtifacts({
          opsEvent: newOpsEvent,
          eventDef,
          baseRecordId: recordId,
          effectiveTime: newOpsEvent.effectiveTimestamp,
          segmentResponse: segmentResponse,
          relatedEquipmentActuals: eqActuals,
          generatedOperationsEventRecords: genOpsEventRecords,
          generatedOperationsEventEntries: genOpsEventEntries,
          dedupeByEntityId: true,
        });
      }

      setGeneratedUnplannedResponse(unplannedResponse);
      setGeneratedUnplannedSegmentResponse(segmentResponse);
      setUnplannedMaterialActuals(matActuals);
      setUnplannedEquipmentActuals(eqActuals);
      setUnplannedPersonnelActuals(persActuals);
      setUnplannedOpsEvents(genOpsEvents);
      setUnplannedOpsEventRecords(genOpsEventRecords);
      setUnplannedOpsEventEntries(genOpsEventEntries);
      setUnplannedTimestamp(timestamp);

      setLoading(false);
      showSnackbar(
        `Unplanned maintenance generated: 1 segment response, ${matActuals.length} material actuals, ${eqActuals.length} equipment actuals, ${persActuals.length} personnel actuals, ${genOpsEvents.length} ops events, ${genOpsEventRecords.length} records, ${genOpsEventEntries.length} entries`,
        'success',
      );
    } catch (error: any) {
      console.error('Failed to generate unplanned maintenance data:', error);
      showSnackbar(`Failed to generate unplanned maintenance data: ${error?.message || error}`, 'error');
      setLoading(false);
    }
  };

  const saveUnplannedMaintenanceToDatabase = async () => {
    if (!generatedUnplannedResponse || !generatedUnplannedSegmentResponse) {
      showSnackbar('No unplanned maintenance data to save', 'error');
      return;
    }
    try {
      setLoading(true);
      await processDataApi.upsertStoreRecords('operationsResponses', [generatedUnplannedResponse]);
      await processDataApi.upsertStoreRecords('segmentResponses', [generatedUnplannedSegmentResponse]);
      if (unplannedMaterialActuals.length > 0) {
        await processDataApi.upsertStoreRecords('segmentMaterialActuals', unplannedMaterialActuals);
      }
      if (unplannedEquipmentActuals.length > 0) {
        await processDataApi.upsertStoreRecords('segmentEquipmentActuals', unplannedEquipmentActuals);
      }
      if (unplannedPersonnelActuals.length > 0) {
        await processDataApi.upsertStoreRecords('segmentPersonnelActuals', unplannedPersonnelActuals);
      }
      if (unplannedOpsEvents.length > 0) {
        await processDataApi.upsertStoreRecords('operationsEvents', unplannedOpsEvents);
      }
      if (unplannedOpsEventRecords.length > 0) {
        await processDataApi.upsertStoreRecords('operationsEventRecords', unplannedOpsEventRecords);
      }
      if (unplannedOpsEventEntries.length > 0) {
        await processDataApi.upsertStoreRecords('operationsEventEntries', unplannedOpsEventEntries);
      }
      await loadStoredActualData();
      await loadStoredUnplannedMaintenanceData();
      setLoading(false);
      showSnackbar('Unplanned maintenance data saved to database successfully', 'success');
    } catch (error: any) {
      console.error('Failed to save unplanned maintenance data:', error);
      showSnackbar(`Failed to save unplanned maintenance data: ${error?.message || error}`, 'error');
      setLoading(false);
    }
  };

  const resetUnplannedMaintenance = () => {
    setSelectedUnplannedEventId('');
    setUnplannedSegmentId('');
    setUnplannedEquipmentId('');
    setUnplannedMaterialIds([]);
    setUnplannedPersonnelIds([]);
    setUnplannedStartDateTime('');
    setUnplannedEndDateTime('');
    setGeneratedUnplannedResponse(null);
    setGeneratedUnplannedSegmentResponse(null);
    setUnplannedMaterialActuals([]);
    setUnplannedEquipmentActuals([]);
    setUnplannedPersonnelActuals([]);
    setUnplannedOpsEvents([]);
    setUnplannedOpsEventRecords([]);
    setUnplannedOpsEventEntries([]);
    setUnplannedTimestamp(null);
  };

  const backfillOperationsEventArtifactsForExistingData = async () => {
    if (!window.confirm('Run one-time backfill for existing Operations Event Records/Entries (Production + Maintenance)? Existing records will not be modified.')) {
      return;
    }

    try {
      setLoading(true);

      const backfillGeneratedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const backfillRunId = `BF-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
      const backfillMarker = `[BACKFILL_OER_OEE:${backfillRunId}|${backfillGeneratedAt}]`;

      const [allOperationsEventsRaw, allSegmentResponsesRaw, allEquipmentActualsRaw, allOperationsEventRecordsRaw, allOperationsEventEntriesRaw] = await Promise.all([
        processDataApi.getAll('operationsEvents'),
        processDataApi.getAll('segmentResponses'),
        processDataApi.getAll('segmentEquipmentActuals'),
        processDataApi.getAll('operationsEventRecords'),
        processDataApi.getAll('operationsEventEntries'),
      ]);

      const allOperationsEvents = (allOperationsEventsRaw || []) as OperationsEvent[];
      const allSegmentResponses = (allSegmentResponsesRaw || []) as SegmentResponse[];
      const allEquipmentActuals = (allEquipmentActualsRaw || []) as SegmentEquipmentActual[];
      const existingRecords = (allOperationsEventRecordsRaw || []) as OperationsEventRecord[];
      const existingEntries = (allOperationsEventEntriesRaw || []) as OperationsEventEntry[];

      const segmentResponseById = new Map(allSegmentResponses.map((segmentResponse) => [segmentResponse.id, segmentResponse]));
      const workingRecords = [...existingRecords];
      const workingEntries = [...existingEntries];

      const existingRecordIds = new Set(existingRecords.map((record) => record.id));
      const existingEntryIds = new Set(existingEntries.map((entry) => entry.id));

      let processedEvents = 0;
      let skippedEvents = 0;

      for (const opsEvent of allOperationsEvents) {
        const segmentResponse = segmentResponseById.get(opsEvent.segmentResponseId);
        if (!segmentResponse) {
          skippedEvents += 1;
          continue;
        }

        const eventDef = operationEventDefinitions.find((definition) => definition.id === opsEvent.operationsEventDefinitionId);
        const relatedEquipmentActuals = allEquipmentActuals.filter((equipmentActual) => equipmentActual.segmentResponseId === segmentResponse.id);

        appendRelatedOperationsEventArtifacts({
          opsEvent,
          eventDef,
          baseRecordId: `OER-${opsEvent.id.replace('OPS-EVENT-', '')}`,
          effectiveTime: opsEvent.effectiveTimestamp,
          segmentResponse,
          relatedEquipmentActuals,
          generatedOperationsEventRecords: workingRecords,
          generatedOperationsEventEntries: workingEntries,
          dedupeByEntityId: true,
        });

        processedEvents += 1;
      }

      const recordsToInsert = workingRecords
        .filter((record) => !existingRecordIds.has(record.id))
        .map((record) => ({
          ...record,
          comments: record.comments ? `${record.comments} ${backfillMarker}` : backfillMarker,
        }));
      const entriesToInsert = workingEntries
        .filter((entry) => !existingEntryIds.has(entry.id))
        .map((entry) => ({
          ...entry,
          description: entry.description ? `${entry.description} ${backfillMarker}` : backfillMarker,
        }));

      if (recordsToInsert.length > 0) {
        await processDataApi.upsertStoreRecords('operationsEventRecords', recordsToInsert);
      }
      if (entriesToInsert.length > 0) {
        await processDataApi.upsertStoreRecords('operationsEventEntries', entriesToInsert);
      }

      await loadStoredActualData();
      setLoading(false);
      showSnackbar(
        `Backfill completed (${backfillRunId}). Events processed: ${processedEvents}, skipped: ${skippedEvents}, new records: ${recordsToInsert.length}, new entries: ${entriesToInsert.length}.`,
        'success',
      );
    } catch (error: any) {
      console.error('Failed to backfill operations event artifacts:', error);
      showSnackbar(`Failed to backfill operations event artifacts: ${error?.message || error}`, 'error');
      setLoading(false);
    }
  };

  const backfillCrewSegmentData = async () => {
    if (!window.confirm('Backfill missing CREW segment data records for existing segment responses? Only missing records will be added. Existing records will not be modified.')) {
      return;
    }

    try {
      setLoading(true);

      const backfillRunId = `BF-CREW-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;

      if (shiftCrewAssignments.length === 0) {
        showSnackbar('No shift-crew assignments found in master data. Please ensure master data is loaded.', 'warning');
        setLoading(false);
        return;
      }

      // Load all existing segment data from the database
      const existingSegmentDataRaw = await processDataApi.getAll('segmentData');
      const shiftSegData = existingSegmentDataRaw.filter((sd: any) => sd.recordType === 'shift');

      // Build a set of (segmentResponseId-crewId) keys that already have CREW records to avoid duplicates
      const existingCrewKeys = new Set<string>(
        existingSegmentDataRaw
          .filter((sd: any) => sd.recordType === 'crew')
          .map((sd: any) => `${sd.segmentResponseId}-${sd.crewId}`),
      );

      const newCrewRecords: SegmentData[] = [];

      for (const shiftSd of shiftSegData) {
        if (!shiftSd.shiftId) continue;

        // Use the segment's actual date for validity check (not today's date)
        const segmentDate = new Date(shiftSd.startDateTime.replace(' ', 'T'));

        const applicableCrewAssignments = shiftCrewAssignments.filter((sca: any) => {
          if (sca.shiftId !== shiftSd.shiftId) return false;
          const effectiveDate = new Date(sca.effectiveDate);
          const expiryDate = sca.expiryDate ? new Date(sca.expiryDate) : new Date('2099-12-31');
          return segmentDate >= effectiveDate && segmentDate <= expiryDate;
        });

        for (const crewAssignment of applicableCrewAssignments) {
          const crew = crews.find((c: any) => c.id === crewAssignment.crewId);
          if (!crew) continue;

          const key = `${shiftSd.segmentResponseId}-${crew.id}`;
          if (existingCrewKeys.has(key)) continue;
          existingCrewKeys.add(key); // prevent duplicates within this run

          newCrewRecords.push({
            id: `SEG-DATA-CREW-${shiftSd.segmentResponseId}-${crew.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            segmentResponseId: shiftSd.segmentResponseId,
            recordType: 'crew',
            crewId: crew.id,
            startDateTime: shiftSd.startDateTime,
            endDateTime: shiftSd.endDateTime,
            notes: `${crew.crewName} - ${crew.peopleCount} people`,
          });
        }
      }

      if (newCrewRecords.length > 0) {
        await processDataApi.upsertStoreRecords('segmentData', newCrewRecords);
      }

      await loadStoredActualData();
      setLoading(false);
      showSnackbar(
        `Backfill completed (${backfillRunId}). Shift records processed: ${shiftSegData.length}, new CREW records added: ${newCrewRecords.length}.`,
        'success',
      );
    } catch (error: any) {
      console.error('Failed to backfill crew segment data:', error);
      showSnackbar(`Failed to backfill crew segment data: ${error?.message || error}`, 'error');
      setLoading(false);
    }
  };

  const backfillPersonnelRequirementsForExistingData = async () => {
    if (!window.confirm('Backfill missing Personnel Requirements for existing Segment Requirements? One record per person class will be created for each Segment Requirement that is missing them. Existing records will not be modified.')) {
      return;
    }
    if (personClasses.length === 0) {
      showSnackbar('No person classes available. Load master data first.', 'error');
      return;
    }
    try {
      setLoading(true);
      const [allSegReqs, allPersReqs] = await Promise.all([
        processDataApi.getAll('segmentRequirements'),
        processDataApi.getAll('segmentPersonnelRequirements'),
      ]);

      const segReqsWithPersonnel = new Set((allPersReqs as SegmentPersonnelRequirement[]).map((pr) => pr.segmentRequirementId));
      const segReqsMissing = (allSegReqs as SegmentRequirement[]).filter(
        (sr) => sr.operationsType === 'Production' && !segReqsWithPersonnel.has(sr.id),
      );

      if (segReqsMissing.length === 0) {
        showSnackbar('All production segment requirements already have personnel requirements.', 'info');
        setLoading(false);
        return;
      }

      const newPersReqs: SegmentPersonnelRequirement[] = [];
      for (const sr of segReqsMissing) {
        personClasses
          .filter(pc => !pc.name.toLowerCase().includes('maintenance') && !pc.id.toUpperCase().includes('MAINT'))
          .forEach((pc, pcIndex) => {
          const employee = employees.find(e => e.personClassId === pc.id);
          newPersReqs.push({
            id: `SPR-BACKFILL-${sr.id}-${String(pcIndex + 1).padStart(3, '0')}-${pc.id}`,
            segmentRequirementId: sr.id,
            employeeId: employee?.id,
            personClassId: pc.id,
            quantity: 1,
            quantityUnitOfMeasure: 'Person',
            personnelUse: 'Production',
            operationsType: 'Production',
          });
        });
      }

      await processDataApi.upsertStoreRecords('segmentPersonnelRequirements', newPersReqs);
      setLoading(false);
      showSnackbar(`Backfill completed: ${newPersReqs.length} personnel requirement(s) added for ${segReqsMissing.length} segment requirement(s).`, 'success');
    } catch (error: any) {
      console.error('Failed to backfill personnel requirements:', error);
      showSnackbar(`Failed to backfill personnel requirements: ${error?.message || error}`, 'error');
      setLoading(false);
    }
  };

  const backfillPersonnelActualsForExistingData = async () => {
    if (!window.confirm('Backfill missing Personnel Actuals for existing Segment Responses? One record per personnel requirement will be created for each Segment Response that is missing them. Existing records will not be modified.')) {
      return;
    }
    try {
      setLoading(true);
      const [allSegResponses, allPersActuals, allPersReqs] = await Promise.all([
        processDataApi.getAll('segmentResponses'),
        processDataApi.getAll('segmentPersonnelActuals'),
        processDataApi.getAll('segmentPersonnelRequirements'),
      ]);

      const segRespIdsThatHavePersonnel = new Set((allPersActuals as SegmentPersonnelActual[]).map((pa) => pa.segmentResponseId));
      const segRespsMissing = (allSegResponses as SegmentResponse[]).filter(
        (sr) => (sr.operationsType === 'Production' || !sr.operationsType) && !segRespIdsThatHavePersonnel.has(sr.id),
      );

      if (segRespsMissing.length === 0) {
        showSnackbar('All production segment responses already have personnel actuals.', 'info');
        setLoading(false);
        return;
      }

      // Build lookup: segmentRequirementId -> SegmentPersonnelRequirement[]
      const persReqsBySegReqId = new Map<string, SegmentPersonnelRequirement[]>();
      for (const pr of allPersReqs as SegmentPersonnelRequirement[]) {
        const list = persReqsBySegReqId.get(pr.segmentRequirementId) || [];
        list.push(pr);
        persReqsBySegReqId.set(pr.segmentRequirementId, list);
      }

      // Build lookup: segmentResponseId -> segmentRequirementId (from segment responses themselves)
      const segReqIdBySegRespId = new Map<string, string>();
      for (const sr of allSegResponses as SegmentResponse[]) {
        if (sr.segmentRequirementId) {
          segReqIdBySegRespId.set(sr.id, sr.segmentRequirementId);
        }
      }

      const newPersActuals: SegmentPersonnelActual[] = [];
      for (const segResp of segRespsMissing) {
        const segReqId = segReqIdBySegRespId.get(segResp.id);
        const relatedPersReqs = segReqId ? (persReqsBySegReqId.get(segReqId) || []) : [];

        if (relatedPersReqs.length === 0) {
          // No personnel requirements; generate one per person class as fallback
          personClasses
            .filter(pc => !pc.name.toLowerCase().includes('maintenance') && !pc.id.toUpperCase().includes('MAINT'))
            .forEach((pc) => {
            const employee = employees.find(e => e.personClassId === pc.id);
            newPersActuals.push({
              id: `PERS-ACT-BACKFILL-${segResp.id}-${pc.id}`,
              segmentResponseId: segResp.id,
              employeeId: employee?.id,
              personClassId: pc.id,
              actualQuantity: 1,
              quantityUnitOfMeasure: 'Person',
              personnelUse: 'Production',
              actualStartDateTime: segResp.actualStartDateTime,
              actualEndDateTime: segResp.actualEndDateTime,
              operationsType: 'Production',
            });
          });
        } else {
          for (const pr of relatedPersReqs) {
            const employee = employees.find(e => e.personClassId === pr.personClassId);
            newPersActuals.push({
              id: `PERS-ACT-BACKFILL-${segResp.id}-${pr.personClassId || pr.id}`,
              segmentResponseId: segResp.id,
              employeeId: employee?.id,
              personClassId: pr.personClassId,
              actualQuantity: pr.quantity || 1,
              quantityUnitOfMeasure: pr.quantityUnitOfMeasure || 'Person',
              personnelUse: pr.personnelUse || 'Production',
              actualStartDateTime: segResp.actualStartDateTime,
              actualEndDateTime: segResp.actualEndDateTime,
              operationsType: 'Production',
            });
          }
        }
      }

      if (newPersActuals.length === 0) {
        showSnackbar('No new personnel actuals to add. All segment responses already covered.', 'info');
        setLoading(false);
        return;
      }

      await processDataApi.upsertStoreRecords('segmentPersonnelActuals', newPersActuals);
      setLoading(false);
      showSnackbar(`Backfill completed: ${newPersActuals.length} personnel actual(s) added for ${segRespsMissing.length} segment response(s).`, 'success');
    } catch (error: any) {
      console.error('Failed to backfill personnel actuals:', error);
      showSnackbar(`Failed to backfill personnel actuals: ${error?.message || error}`, 'error');
      setLoading(false);
    }
  };

  const checkOperationsRequestData = async () => {
    if (!selectedOperationsRequestId) {
      showSnackbar('Please select an operations request first', 'error');
      return;
    }

    try {
      const orData = await processDataApi.getOperationsRequestWithRequirements(selectedOperationsRequestId);
      if (!orData) {
        showSnackbar('Operations request not found in database', 'error');
        return;
      }

      // Handle potentially undefined arrays
      const segmentReqs = orData.segmentRequirements || [];
      const materialReqs = orData.materialRequirements || [];
      const equipmentReqs = orData.equipmentRequirements || [];

      console.log('[Check OR Data]', {
        operationsRequest: orData.operationsRequest,
        segmentRequirements: segmentReqs.length,
        segmentMaterialRequirements: materialReqs.length,
        segmentEquipmentRequirements: equipmentReqs.length
      });

      let message = `Operations Request: ${orData.operationsRequest.id}\n`;
      message += `Description: ${orData.operationsRequest.description}\n`;
      message += `Product: ${orData.operationsRequest.productMaterialId}\n`;
      message += `Quantity: ${orData.operationsRequest.plannedQuantity} ${orData.operationsRequest.quantityUoM}\n\n`;
      message += `Segment Requirements: ${segmentReqs.length}\n`;
      message += `Material Requirements: ${materialReqs.length}\n`;
      message += `Equipment Requirements: ${equipmentReqs.length}`;

      if (segmentReqs.length === 0) {
        message += '\n\n⚠️ WARNING: No segment requirements found!\n\n';
        message += 'This operations request cannot be used to generate actual data.\n\n';
        message += 'SOLUTION:\n';
        message += '1. Go to the "Plan Data" tab\n';
        message += '2. Enter the same product and configuration\n';
        message += '3. Click "Generate Plan Data"\n';
        message += '4. Click "Save to Database"\n';
        message += '5. Return to this tab and select the operations request again';
      }

      alert(message);
      
      if (segmentReqs.length > 0) {
        showSnackbar('Operations request data is valid and ready for actual data generation', 'success');
      } else {
        showSnackbar('Operations request is missing segment requirements - cannot generate actual data', 'error');
      }
    } catch (error) {
      console.error('Failed to check operations request data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to check operations request data';
      showSnackbar(errorMessage, 'error');
    }
  };

  const saveActualToDatabase = async () => {
    if (!generatedOperationsResponse || segmentResponses.length === 0) {
      showSnackbar('No actual data to save', 'error');
      return;
    }

    try {
      setLoading(true);

      const trackingRecordsToSave = equipmentPropertyTracking;

      const entitySteps: Array<{
        entity: string;
        save: () => Promise<number>;
      }> = [
        {
          entity: 'OperationsResponse',
          save: () => processDataApi.upsertStoreRecords('operationsResponses', [generatedOperationsResponse]),
        },
        {
          entity: 'SegmentResponse',
          save: () => processDataApi.upsertStoreRecords('segmentResponses', segmentResponses),
        },
        {
          entity: 'SegmentMaterialActual',
          save: () => processDataApi.upsertStoreRecords('segmentMaterialActuals', materialActuals),
        },
        {
          entity: 'SegmentEquipmentActual',
          save: () => processDataApi.upsertStoreRecords('segmentEquipmentActuals', equipmentActuals),
        },
        {
          entity: 'EquipmentPropertyTracking',
          save: () => processDataApi.upsertStoreRecords('equipmentPropertyTracking', trackingRecordsToSave),
        },
        {
          entity: 'OperationsEvent',
          save: () => processDataApi.upsertStoreRecords('operationsEvents', operationsEvents),
        },
        {
          entity: 'OperationsEventRecord',
          save: () => processDataApi.upsertStoreRecords('operationsEventRecords', operationsEventRecords),
        },
        {
          entity: 'OperationsEventEntry',
          save: () => processDataApi.upsertStoreRecords('operationsEventEntries', operationsEventEntries),
        },
        {
          entity: 'OperationsEventProperty',
          save: () => processDataApi.upsertStoreRecords('operationsEventProperties', operationsEventProperties),
        },
        {
          entity: 'SegmentData',
          save: () => processDataApi.upsertStoreRecords('segmentData', segmentData),
        },
        {
          entity: 'SegmentPersonnelActual',
          save: () => processDataApi.upsertStoreRecords('segmentPersonnelActuals', personnelActuals),
        },
        {
          entity: 'TestResult',
          save: () => processDataApi.upsertStoreRecords('testResults', testResults),
        },
        {
          entity: 'MaterialLot',
          save: async () => {
            if (generatedMaterialLotsForDisplay.length === 0) return 0;
            const result = await masterDataApi.bulkAdd('materialLots', generatedMaterialLotsForDisplay);
            if (result.failed > 0) {
              throw new Error(`Failed to save ${result.failed} material lot record(s) to master data`);
            }
            await processDataApi.upsertStoreRecords('materialLots' as any, generatedMaterialLotsForDisplay);
            return result.succeeded;
          },
        },
        {
          entity: 'MaterialSublot',
          save: async () => {
            if (generatedMaterialSublotsForDisplay.length === 0) return 0;
            const result = await masterDataApi.bulkAdd('materialSublots', generatedMaterialSublotsForDisplay);
            if (result.failed > 0) {
              throw new Error(`Failed to save ${result.failed} material sublot record(s) to master data`);
            }
            await processDataApi.upsertStoreRecords('materialSublots' as any, generatedMaterialSublotsForDisplay);
            return result.succeeded;
          },
        },
      ];

      const executableSteps = entitySteps.filter((step) => {
        if (step.entity === 'MaterialLot') return generatedMaterialLotsForDisplay.length > 0;
        if (step.entity === 'MaterialSublot') return generatedMaterialSublotsForDisplay.length > 0;
        if (step.entity === 'TestResult') return testResults.length > 0;
        if (step.entity === 'OperationsEvent') return operationsEvents.length > 0;
        if (step.entity === 'OperationsEventRecord') return operationsEventRecords.length > 0;
        if (step.entity === 'OperationsEventEntry') return operationsEventEntries.length > 0;
        if (step.entity === 'OperationsEventProperty') return operationsEventProperties.length > 0;
        if (step.entity === 'EquipmentPropertyTracking') return trackingRecordsToSave.length > 0;
        if (step.entity === 'SegmentData') return segmentData.length > 0;
        if (step.entity === 'SegmentPersonnelActual') return personnelActuals.length > 0;
        if (step.entity === 'SegmentMaterialActual') return materialActuals.length > 0;
        if (step.entity === 'SegmentEquipmentActual') return equipmentActuals.length > 0;
        if (step.entity === 'SegmentResponse') return segmentResponses.length > 0;
        return true;
      });

      setSaveProgress({
        active: true,
        currentEntity: '',
        currentStep: 0,
        totalSteps: executableSteps.length,
        recordsSaved: 0,
        perEntity: [],
      });

      let runningTotalSaved = 0;
      const perEntity: Array<{ entity: string; saved: number }> = [];

      for (let i = 0; i < executableSteps.length; i++) {
        const step = executableSteps[i];
        setSaveProgress((prev) => ({
          ...prev,
          currentEntity: step.entity,
          currentStep: i + 1,
        }));

        const savedCount = await step.save();
        runningTotalSaved += savedCount;
        perEntity.push({ entity: step.entity, saved: savedCount });

        setSaveProgress((prev) => ({
          ...prev,
          recordsSaved: runningTotalSaved,
          perEntity: [...perEntity],
        }));
      }
      
      setLoading(false);
      setSaveProgress((prev) => ({ ...prev, active: false }));
      showSnackbar('Actual data saved to database successfully', 'success');
      
      // Reload stored actual data to update the overview
      await loadStoredActualData();
    } catch (error) {
      console.error('Failed to save actual data:', error);
      const errorText = error instanceof Error ? error.message : String(error);
      if (errorText.includes('Error Number:1105') || errorText.toLowerCase().includes('filegroup is full')) {
        showSnackbar('Database is full. Clear actual data and retry, or increase SQL database file size/autogrowth.', 'error');
      } else {
        showSnackbar('Failed to save actual data to database', 'error');
      }
      setSaveProgress((prev) => ({ ...prev, active: false }));
      setLoading(false);
    }
  };

  const cleanupPlanData = async () => {
    if (!window.confirm('Are you sure you want to delete all PLAN data (operations requests, segment requirements, etc.)? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      console.log('[Process Data Generator] Cleaning up plan data...');
      
      // Clear plan data stores
      const planStores = [
        'operationsRequests',
        'segmentRequirements',
        'segmentMaterialRequirements',
        'segmentEquipmentRequirements',
        'segmentPersonnelRequirements'
      ];
      
      for (const store of planStores) {
        try {
          await processDataApi.clear(store as any);
          console.log(`[Cleanup Plan] Cleared ${store}`);
        } catch (error) {
          console.error(`[Cleanup Plan] Failed to clear ${store}:`, error);
        }
      }
      
      // Reset plan UI state
      setSavedOperationsRequests([]);
      setSelectedOperationsRequestId('');
      setReferenceOperationsRequest(null);
      setReferenceSegmentRequirements([]);
      
      // Reload stored data to update overview
      await loadSavedOperationsRequests();
      
      setLoading(false);
      showSnackbar('Plan data cleared successfully', 'success');
    } catch (error) {
      console.error('Failed to cleanup plan data:', error);
      showSnackbar('Failed to cleanup plan data', 'error');
      setLoading(false);
    }
  };

  const cleanupOrphanedPlanRecords = async () => {
    if (!window.confirm('This will delete material and equipment requirements that have no matching segment requirement. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      console.log('[Process Data Generator] Cleaning up orphaned plan records...');
      
      // Get all segment requirements
      const segmentReqs = await processDataApi.getAll('segmentRequirements');
      const validSegReqIds = new Set(segmentReqs.map((sr: any) => sr.id));
      
      console.log(`[Cleanup Orphans] Found ${validSegReqIds.size} valid segment requirements`);
      
      // Clean up orphaned material requirements
      const allMatReqs = await processDataApi.getAll('segmentMaterialRequirements');
      const orphanedMatReqs = allMatReqs.filter((mr: any) => !validSegReqIds.has(mr.segmentRequirementId));
      
      for (const matReq of orphanedMatReqs) {
        await processDataApi.delete('segmentMaterialRequirements', matReq.id);
      }
      console.log(`[Cleanup Orphans] Deleted ${orphanedMatReqs.length} orphaned material requirements`);
      
      // Clean up orphaned equipment requirements
      const allEqReqs = await processDataApi.getAll('segmentEquipmentRequirements');
      const orphanedEqReqs = allEqReqs.filter((er: any) => !validSegReqIds.has(er.segmentRequirementId));
      
      for (const eqReq of orphanedEqReqs) {
        await processDataApi.delete('segmentEquipmentRequirements', eqReq.id);
      }
      console.log(`[Cleanup Orphans] Deleted ${orphanedEqReqs.length} orphaned equipment requirements`);

      const allPersonnelReqs = await processDataApi.getAll('segmentPersonnelRequirements');
      const orphanedPersonnelReqs = allPersonnelReqs.filter((pr: any) => !validSegReqIds.has(pr.segmentRequirementId));

      for (const personnelReq of orphanedPersonnelReqs) {
        await processDataApi.delete('segmentPersonnelRequirements', personnelReq.id);
      }
      console.log(`[Cleanup Orphans] Deleted ${orphanedPersonnelReqs.length} orphaned personnel requirements`);
      
      setLoading(false);
      showSnackbar(`Cleaned up ${orphanedMatReqs.length} material, ${orphanedEqReqs.length} equipment, and ${orphanedPersonnelReqs.length} personnel orphaned records`, 'success');
    } catch (error) {
      console.error('Failed to cleanup orphaned records:', error);
      showSnackbar('Failed to cleanup orphaned records', 'error');
      setLoading(false);
    }
  };

  const cleanupActualData = async () => {
    if (!window.confirm('Are you sure you want to delete all ACTUAL data (operations responses, segment responses, material actuals, etc.)? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      console.log('[Process Data Generator] Cleaning up actual data...');
      
      // Clear actual data stores
      const actualStores = [
        'operationsResponses',
        'segmentResponses',
        'segmentMaterialActuals',
        'segmentEquipmentActuals',
        'segmentPersonnelActuals',
        'equipmentPropertyTracking',
        'testResults',
        'operationsEvents',
        'operationsEventRecords',
        'operationsEventEntries',
        'operationsEventProperties',
        'segmentData'
      ];
      
      for (const store of actualStores) {
        try {
          await processDataApi.clear(store as any);
          console.log(`[Cleanup Actual] Cleared ${store}`);
        } catch (error) {
          console.error(`[Cleanup Actual] Failed to clear ${store}:`, error);
        }
      }
      
      // Reset actual UI state
      setGeneratedOperationsResponse(null);
      setSegmentResponses([]);
      setMaterialActuals([]);
      setEquipmentActuals([]);
      setEquipmentPropertyTracking([]);
      setOperationsEvents([]);
      setOperationsEventRecords([]);
      setOperationsEventEntries([]);
      setOperationsEventProperties([]);
      setTestResults([]);
      setGeneratedMaterialLotsForDisplay([]);
      setGeneratedMaterialSublotsForDisplay([]);
      setActualGenerationTimestamp(null);
      
      // Reload stored data to update overview
      await loadStoredActualData();
      
      setLoading(false);
      showSnackbar('Actual data cleared successfully', 'success');
    } catch (error) {
      console.error('Failed to cleanup actual data:', error);
      showSnackbar('Failed to cleanup actual data', 'error');
      setLoading(false);
    }
  };

  const deleteOperationsRequest = async (operationsRequestId: string) => {
    if (!window.confirm(`Are you sure you want to delete operations request "${operationsRequestId}" and all its related data? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      console.log(`[Delete Plan] Deleting operations request: ${operationsRequestId}`);
      
      // Load all related data for this operations request
      const orData = await processDataApi.getOperationsRequestWithRequirements(operationsRequestId);
      if (!orData) {
        showSnackbar('Operations request not found', 'error');
        setLoading(false);
        return;
      }

      const segmentReqs = orData.segmentRequirements || [];
      const materialReqs = orData.materialRequirements || [];
      const equipmentReqs = orData.equipmentRequirements || [];
      const personnelReqs = orData.personnelRequirements || [];

      console.log(`[Delete Plan] Found ${segmentReqs.length} segment requirements, ${materialReqs.length} material requirements, ${equipmentReqs.length} equipment requirements, ${personnelReqs.length} personnel requirements`);
      
      // Delete all related data in order
      // 1. Delete segment material requirements
      for (const mr of materialReqs) {
        await processDataApi.delete('segmentMaterialRequirements', mr.id);
      }
      console.log(`[Delete Plan] Deleted ${materialReqs.length} segment material requirements`);
      
      // 2. Delete segment equipment requirements
      for (const er of equipmentReqs) {
        await processDataApi.delete('segmentEquipmentRequirements', er.id);
      }
      console.log(`[Delete Plan] Deleted ${equipmentReqs.length} segment equipment requirements`);
      
      // 3. Delete segment personnel requirements
      for (const pr of personnelReqs) {
        await processDataApi.delete('segmentPersonnelRequirements', pr.id);
      }
      console.log(`[Delete Plan] Deleted ${personnelReqs.length} segment personnel requirements`);

      // 4. Delete segment requirements
      for (const sr of segmentReqs) {
        await processDataApi.delete('segmentRequirements', sr.id);
      }
      console.log(`[Delete Plan] Deleted ${segmentReqs.length} segment requirements`);
      
      // 5. Delete the operations request itself
      await processDataApi.delete('operationsRequests', operationsRequestId);
      console.log(`[Delete Plan] Deleted operations request ${operationsRequestId}`);
      
      // Reload saved operations requests to update the overview
      await loadSavedOperationsRequests();
      
      setLoading(false);
      showSnackbar(`Operations request "${operationsRequestId}" deleted successfully`, 'success');
    } catch (error) {
      console.error('Failed to delete operations request:', error);
      showSnackbar('Failed to delete operations request', 'error');
      setLoading(false);
    }
  };

  const deleteOperationsResponse = async (operationsResponseId: string) => {
    if (!window.confirm(`Are you sure you want to delete operations response "${operationsResponseId}" and all its related data? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      console.log(`[Delete] Deleting operations response: ${operationsResponseId}`);
      
      // Find all segment responses for this operations response
      const segmentResponsesToDelete = storedSegmentResponses.filter(sr => sr.operationsResponseId === operationsResponseId);
      const segmentResponseIds = segmentResponsesToDelete.map(sr => sr.id);
      
      console.log(`[Delete] Found ${segmentResponsesToDelete.length} segment responses to delete`);
      
      // Delete all related data in order
      // 1. Delete material actuals related to these segment responses
      for (const segId of segmentResponseIds) {
        const matActuals = storedMaterialActuals.filter(ma => ma.segmentResponseId === segId);
        for (const ma of matActuals) {
          await processDataApi.delete('segmentMaterialActuals', ma.id);
        }
        console.log(`[Delete] Deleted ${matActuals.length} material actuals for segment ${segId}`);
      }
      
      // 2. Delete equipment actuals
      for (const segId of segmentResponseIds) {
        const eqActuals = storedEquipmentActuals.filter(ea => ea.segmentResponseId === segId);
        for (const ea of eqActuals) {
          await processDataApi.delete('segmentEquipmentActuals', ea.id);
        }
        console.log(`[Delete] Deleted ${eqActuals.length} equipment actuals for segment ${segId}`);
      }

      // 3. Delete personnel actuals
      for (const segId of segmentResponseIds) {
        const persActuals = storedPersonnelActuals.filter(pa => pa.segmentResponseId === segId);
        for (const pa of persActuals) {
          await processDataApi.delete('segmentPersonnelActuals', pa.id);
        }
        console.log(`[Delete] Deleted ${persActuals.length} personnel actuals for segment ${segId}`);
      }
      
      // 4. Delete operations events
      for (const segId of segmentResponseIds) {
        const events = storedOperationsEvents.filter(oe => oe.segmentResponseId === segId);
        for (const evt of events) {
          await processDataApi.delete('operationsEvents', evt.id);
        }
        console.log(`[Delete] Deleted ${events.length} operations events for segment ${segId}`);
      }
      
      // 5. Delete segment data (shifts and crews)
      for (const segId of segmentResponseIds) {
        const segData = storedSegmentData.filter(sd => sd.segmentResponseId === segId);
        for (const sd of segData) {
          await processDataApi.delete('segmentData', sd.id);
        }
        console.log(`[Delete] Deleted ${segData.length} segment data records for segment ${segId}`);
      }
      
      // 5. Delete equipment property tracking
      for (const segId of segmentResponseIds) {
        const tracking = storedEquipmentPropertyTracking.filter(ept => ept.segmentResponseId === segId);
        for (const t of tracking) {
          await processDataApi.delete('equipmentPropertyTracking', t.id);
        }
        console.log(`[Delete] Deleted ${tracking.length} equipment property tracking records for segment ${segId}`);
      }
      
      // 6. Delete segment responses
      for (const sr of segmentResponsesToDelete) {
        await processDataApi.delete('segmentResponses', sr.id);
      }
      console.log(`[Delete] Deleted ${segmentResponsesToDelete.length} segment responses`);
      
      // 7. Delete the operations response itself
      await processDataApi.delete('operationsResponses', operationsResponseId);
      console.log(`[Delete] Deleted operations response ${operationsResponseId}`);
      
      // Reload stored data to update the overview
      await loadStoredActualData();
      
      setLoading(false);
      showSnackbar(`Operations response "${operationsResponseId}" deleted successfully`, 'success');
    } catch (error) {
      console.error('Failed to delete operations response:', error);
      showSnackbar('Failed to delete operations response', 'error');
      setLoading(false);
    }
  };

  const exportActualToCSV = (type: 'all' | 'response' | 'segments' | 'materials' | 'equipment' | 'propertytracking' | 'lots' | 'testresults' | 'events') => {
    if (!generatedOperationsResponse || segmentResponses.length === 0) {
      showSnackbar('No actual data to export', 'error');
      return;
    }

    // Export Operations Response
    const orCsv = `OperationsResponseID,OperationsRequestID,PlantID,ProductionLineID,Description,ActualStartDateTime,ActualEndDateTime,ActualQuantity,QuantityUoM,OperationsType,Status\n${generatedOperationsResponse.id},${generatedOperationsResponse.operationsRequestId},${generatedOperationsResponse.plantId},${generatedOperationsResponse.productionLineId},${generatedOperationsResponse.description},${generatedOperationsResponse.actualStartDateTime},${generatedOperationsResponse.actualEndDateTime},${generatedOperationsResponse.actualQuantity},${generatedOperationsResponse.quantityUoM},${generatedOperationsResponse.operationsType || ''},${generatedOperationsResponse.status}`;

    // Export Segment Responses
    const srHeaders = 'SegmentResponseID,SegmentRequirementID,OperationsResponseID,ProcessSegmentID,EquipmentID,ActualStartDateTime,ActualEndDateTime,ActualQuantity,QuantityUoM,OperationsType,Status';
    const srRows = segmentResponses.map(sr => 
      `${sr.id},${sr.segmentRequirementId},${sr.operationsResponseId},${sr.processSegmentId},${sr.equipmentId || ''},${sr.actualStartDateTime},${sr.actualEndDateTime},${sr.actualQuantity},${sr.quantityUoM},${sr.operationsType || ''},${sr.status}`
    ).join('\n');
    const srCsv = `${srHeaders}\n${srRows}`;

    // Export Material Actuals
    const maHeaders = 'SegmentMaterialActualID,SegmentResponseID,MaterialID,MaterialLotID,ActualQty,QtyUoM,Direction,OperationsType';
    const maRows = materialActuals.map(ma => 
      `${ma.id},${ma.segmentResponseId},${ma.materialId},${ma.materialLotId},${ma.actualQty},${ma.qtyUoM},${ma.direction},${ma.operationsType || ''}`
    ).join('\n');
    const maCsv = `${maHeaders}\n${maRows}`;

    // Export Equipment Actuals
    const eaHeaders = 'SegmentEquipmentActualID,SegmentResponseID,EquipmentID,ActualQuantity,UnitOfMeasure,ActualStartDateTime,ActualEndDateTime,OperationsType';
    const eaRows = equipmentActuals.map(ea => 
      `${ea.id},${ea.segmentResponseId},${ea.equipmentId},${ea.actualQuantity},${ea.unitOfMeasure || ''},${ea.actualStartDateTime},${ea.actualEndDateTime},${ea.operationsType || ''}`
    ).join('\n');
    const eaCsv = `${eaHeaders}\n${eaRows}`;

    // Export Equipment Property Tracking
    const eptHeaders = 'PropertyTrackingID,SegmentResponseID,EquipmentID,EquipmentPropertyID,EquipmentClassID,EquipmentClassPropertyID,Value,UoM,CreatedTimestamp';
    const eptRows = equipmentPropertyTracking.map(ept => 
      `${ept.id},${ept.segmentResponseId},${ept.equipmentId},${ept.equipmentPropertyId},${ept.equipmentClassId},${ept.equipmentClassPropertyId},${ept.value},${ept.uom},${ept.createdTimestamp}`
    ).join('\n');
    const eptCsv = `${eptHeaders}\n${eptRows}`;

    // Export Operations Events
    const oeHeaders = 'OperationsEventID,SegmentResponseID,OperationsEventDefinitionID,EffectiveTimestamp,EventType,EquipmentId,HierarchyScope,OperationsType,Notes';
    const oeRows = operationsEvents.map(oe => 
      `${oe.id},${oe.segmentResponseId},${oe.operationsEventDefinitionId},${oe.effectiveTimestamp},${oe.eventType},${oe.equipmentId},${oe.hierarchyScope},${oe.operationsType || ''},"${(oe.notes || '').replace(/"/g, '""')}"`
    ).join('\n');
    const oeCsv = `${oeHeaders}\n${oeRows}`;

    // Export Material Lots
    const lotHeaders = 'MaterialLotID,MaterialID,LotQuantity,LotUoM,ProducedDateTime,ProducedByProcessSegmentID,SupplierOrProducerID,SupplierOrProducerName,Status';
    const lotRows = generatedMaterialLotsForDisplay.map(lot => 
      `${lot.id},${lot.materialId},${lot.lotQuantity},${lot.lotUoM},${lot.producedDateTime},${lot.producedByProcessSegmentId},${lot.supplierOrProducerId},${lot.supplierOrProducerName},${lot.status}`
    ).join('\n');
    const lotCsv = `${lotHeaders}\n${lotRows}`;

    // Export Test Results
    const trHeaders = 'TestResultID,MaterialLotID,Description,EvaluationDate,EvaluatedCriterionResult';
    const trRows = testResults.map(tr => 
      `${tr.id},${tr.materialLotId},${tr.description},${tr.evaluationDate},${tr.evaluatedCriterionResult}`
    ).join('\n');
    const trCsv = `${trHeaders}\n${trRows}`;

    // Export Personnel Actuals
    const paHeaders = 'SegmentPersonnelActualID,SegmentResponseID,EmployeeID,PersonClassID,ActualQuantity,QuantityUnitOfMeasure,PersonnelUse,ActualStartDateTime,ActualEndDateTime,OperationsType';
    const paRows = personnelActuals.map(pa =>
      `${pa.id},${pa.segmentResponseId},${pa.employeeId || ''},${pa.personClassId || ''},${pa.actualQuantity},${pa.quantityUnitOfMeasure},${pa.personnelUse},${pa.actualStartDateTime},${pa.actualEndDateTime},${pa.operationsType || ''}`
    ).join('\n');
    const paCsv = `${paHeaders}\n${paRows}`;

    // Export Person (from employees)
    const personHeaders = 'PersonID,Name,PersonClassID';
    const personRows = employees.map(e =>
      `${e.id},${e.employeeName},${e.personClassId || ''}`
    ).join('\n');
    const personCsv = `${personHeaders}\n${personRows}`;

    // Create downloads based on type
    if (type === 'all') {
      downloadCSV(orCsv, 'operations_response.csv');
      downloadCSV(srCsv, 'segment_responses.csv');
      downloadCSV(maCsv, 'segment_material_actuals.csv');
      downloadCSV(eaCsv, 'segment_equipment_actuals.csv');
      if (personnelActuals.length > 0) {
        downloadCSV(paCsv, 'segment_personnel_actuals.csv');
      }
      if (employees.length > 0) {
        downloadCSV(personCsv, 'person.csv');
      }
      if (equipmentPropertyTracking.length > 0) {
        downloadCSV(eptCsv, 'equipment_property_tracking.csv');
      }
      if (operationsEvents.length > 0) {
        downloadCSV(oeCsv, 'operations_events.csv');
      }
      if (generatedMaterialLotsForDisplay.length > 0) {
        downloadCSV(lotCsv, 'material_lots.csv');
      }
      if (testResults.length > 0) {
        downloadCSV(trCsv, 'test_results.csv');
      }
      showSnackbar('All actual data exported successfully', 'success');
    } else if (type === 'response') {
      downloadCSV(orCsv, 'operations_response.csv');
      showSnackbar('Operations response exported successfully', 'success');
    } else if (type === 'segments') {
      downloadCSV(srCsv, 'segment_responses.csv');
      showSnackbar('Segment responses exported successfully', 'success');
    } else if (type === 'materials') {
      downloadCSV(maCsv, 'segment_material_actuals.csv');
      showSnackbar('Material actuals exported successfully', 'success');
    } else if (type === 'equipment') {
      downloadCSV(eaCsv, 'segment_equipment_actuals.csv');
      showSnackbar('Equipment actuals exported successfully', 'success');
    } else if (type === 'propertytracking') {
      if (equipmentPropertyTracking.length > 0) {
        downloadCSV(eptCsv, 'equipment_property_tracking.csv');
        showSnackbar('Equipment property tracking exported successfully', 'success');
      } else {
        showSnackbar('No equipment property tracking data to export', 'error');
      }
    } else if (type === 'events') {
      if (operationsEvents.length > 0) {
        downloadCSV(oeCsv, 'operations_events.csv');
        showSnackbar('Operations events exported successfully', 'success');
      } else {
        showSnackbar('No operations events to export', 'error');
      }
    } else if (type === 'lots') {
      if (generatedMaterialLotsForDisplay.length > 0) {
        downloadCSV(lotCsv, 'material_lots.csv');
        showSnackbar('Material lots exported successfully', 'success');
      } else {
        showSnackbar('No material lots to export', 'error');
      }
    } else if (type === 'testresults') {
      if (testResults.length > 0) {
        downloadCSV(trCsv, 'test_results.csv');
        showSnackbar('Test results exported successfully', 'success');
      } else {
        showSnackbar('No test results to export', 'error');
      }
    }
  };

  const randomInt = (min: number, max: number): number => {
    const low = Math.ceil(min);
    const high = Math.floor(max);
    return Math.floor(Math.random() * (high - low + 1)) + low;
  };

  const randomFloat = (min: number, max: number): number => Math.random() * (max - min) + min;

  const toDbDateTime = (date: Date): string => date.toISOString().slice(0, 19).replace('T', ' ');

  const listDatesInclusive = (startDateStr: string, endDateStr: string): string[] => {
    const dates: string[] = [];
    const current = new Date(`${startDateStr}T00:00:00`);
    const end = new Date(`${endDateStr}T00:00:00`);
    while (current <= end) {
      dates.push(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const dateFromDateAndHour = (dateStr: string, hour: number, minute = 0): Date => {
    return new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
  };

  const calculateLineDailyCapacity = (plantId: string, lineId: string, productMaterialId: string): number => {
    const productSegments = processSegments
      .filter(ps => ps.productMaterialId === productMaterialId)
      .sort((a, b) => a.sequence - b.sequence);

    if (productSegments.length === 0) return 0;

    const lineEquipmentIds = lineEquipment
      .filter(le => le.productionLineId === lineId && le.plantId === plantId)
      .map(le => le.equipmentId);

    if (lineEquipmentIds.length === 0) return 0;

    let bottleneckPerHour = Number.POSITIVE_INFINITY;

    for (const segment of productSegments) {
      const durationHours = Math.max(0.25, Number(segment.durationHours) || 2);
      const usage = equipmentUsages.find(
        eu => eu.processSegmentId === segment.id && lineEquipmentIds.includes(eu.equipmentId),
      );
      const capacityPerRun = Math.max(1, Number(usage?.capacityPerRun) || 1);
      const segmentPerHour = capacityPerRun / durationHours;
      bottleneckPerHour = Math.min(bottleneckPerHour, segmentPerHour);
    }

    if (!Number.isFinite(bottleneckPerHour)) return 0;

    const productionHoursPerDay = 16;
    return Math.max(1, Math.floor(bottleneckPerHour * productionHoursPerDay));
  };

  const splitDemandIntoOrders = (demandQty: number, maxOrderQty: number): number[] => {
    const orders: number[] = [];
    let remaining = demandQty;

    while (remaining > 0) {
      const upper = Math.min(maxOrderQty, remaining);
      const lower = Math.max(1, Math.min(upper, Math.floor(maxOrderQty * 0.45)));
      const qty = remaining <= maxOrderQty ? remaining : randomInt(lower, upper);
      orders.push(qty);
      remaining -= qty;
    }

    return orders;
  };

  const buildPlanPackage = (
    plantId: string,
    lineId: string,
    productMaterialId: string,
    quantity: number,
    planStart: Date,
    orderSeq: number,
  ): {
    operationsRequest: OperationsRequest;
    segmentRequirements: SegmentRequirement[];
    materialRequirements: SegmentMaterialRequirement[];
    equipmentRequirements: SegmentEquipmentRequirement[];
    endTime: Date;
  } => {
    const dateTimeStr = `${planStart.toISOString().slice(0, 10).replace(/-/g, '')}${String(planStart.getHours()).padStart(2, '0')}${String(planStart.getMinutes()).padStart(2, '0')}`;
    const orId = `OR-${plantId}-${lineId}-${dateTimeStr}-${String(orderSeq).padStart(3, '0')}`;

    const product = materials.find(m => m.id === productMaterialId);
    const productName = product?.name || productMaterialId;

    const productSegments = processSegments
      .filter(ps => ps.productMaterialId === productMaterialId)
      .sort((a, b) => a.sequence - b.sequence);

    if (productSegments.length === 0) {
      throw new Error(`No process segments found for product ${productMaterialId}`);
    }

    const generatedSegReqs: SegmentRequirement[] = [];
    const generatedMatReqs: SegmentMaterialRequirement[] = [];
    const generatedEqReqs: SegmentEquipmentRequirement[] = [];
    const generatedPerReqs: SegmentPersonnelRequirement[] = [];

    const lineEquipmentIds = lineEquipment
      .filter(le => le.productionLineId === lineId && le.plantId === plantId)
      .map(le => le.equipmentId);

    let currentTime = new Date(planStart);
    let previousSegmentRunEnds: Date[] = [];

    productSegments.forEach((segment, index) => {
      const segReqId = `SR-${plantId}-${lineId}-${dateTimeStr}-${String(index + 1).padStart(3, '0')}-${segment.id}`;
      const segmentDuration = Number(segment.durationHours) || 2;
      const eqUsages = equipmentUsages.filter(
        eu => eu.processSegmentId === segment.id && lineEquipmentIds.includes(eu.equipmentId),
      );
      const equipmentCapacity = eqUsages.length > 0 ? Math.max(1, Number(eqUsages[0].capacityPerRun) || 1) : quantity;
      const requiredRuns = Math.max(1, Math.ceil(quantity / equipmentCapacity));
      const totalDuration = segmentDuration * requiredRuns;

      const runEndTimes: Date[] = [];

      for (let run = 0; run < requiredRuns; run++) {
        const equipmentAvailableTime = run > 0 ? runEndTimes[run - 1] : null;
        const upstreamRunIndex = previousSegmentRunEnds.length > 0
          ? Math.min(run, previousSegmentRunEnds.length - 1)
          : -1;
        const materialReadyTime = upstreamRunIndex >= 0
          ? previousSegmentRunEnds[upstreamRunIndex]
          : null;

        let runStartTime: Date;
        if (equipmentAvailableTime && materialReadyTime) {
          runStartTime = equipmentAvailableTime > materialReadyTime
            ? new Date(equipmentAvailableTime)
            : new Date(materialReadyTime);
        } else if (equipmentAvailableTime) {
          runStartTime = new Date(equipmentAvailableTime);
        } else if (materialReadyTime) {
          runStartTime = new Date(materialReadyTime);
        } else {
          runStartTime = new Date(currentTime);
        }

        runEndTimes.push(new Date(runStartTime.getTime() + segmentDuration * 60 * 60 * 1000));
      }

      const segmentStartTime = runEndTimes.length > 0
        ? new Date(runEndTimes[0].getTime() - segmentDuration * 60 * 60 * 1000)
        : new Date(currentTime);
      const allRunsEnd = runEndTimes.length > 0
        ? new Date(runEndTimes[runEndTimes.length - 1])
        : new Date(segmentStartTime.getTime() + totalDuration * 60 * 60 * 1000);

      const segReq: SegmentRequirement = {
        id: segReqId,
        operationsRequestId: orId,
        processSegmentId: segment.id,
        sequence: (index + 1) * 10,
        earliestStartDateTime: toDbDateTime(segmentStartTime),
        latestEndDateTime: toDbDateTime(allRunsEnd),
        targetQuantity: quantity,
        quantityUoM: 'EA',
        operationsType: 'Production',
      };
      generatedSegReqs.push(segReq);

      previousSegmentRunEnds = runEndTimes;
      currentTime = new Date(allRunsEnd);

      const bomLines = segmentBOMs.filter(bom => bom.processSegmentId === segment.id);
      bomLines.forEach((bom, bomIndex) => {
        const material = materials.find(m => m.id === bom.materialId);
        generatedMatReqs.push({
          id: `SMR-${plantId}-${lineId}-${dateTimeStr}-${String(bomIndex + 1).padStart(3, '0')}-${segment.id}`,
          segmentRequirementId: segReqId,
          materialId: bom.materialId,
          requiredQty: (Number(bom.qtyPerUnit) || 0) * quantity,
          qtyUoM: bom.uom || 'EA',
          requirementType:
            material?.classId === 'FINISHEDPRODUCT' ? 'Output' :
            material?.classId === 'INPROCESSMATERIAL' ? 'Input' :
            'Consumable',
          operationsType: 'Production',
        });
      });

      if (index === productSegments.length - 1) {
        generatedMatReqs.push({
          id: `SMR-${plantId}-${lineId}-${dateTimeStr}-OUTPUT-${segment.id}`,
          segmentRequirementId: segReqId,
          materialId: productMaterialId,
          requiredQty: quantity,
          qtyUoM: 'EA',
          requirementType: 'Output',
          operationsType: 'Production',
        });
      }

      eqUsages.forEach((usage, eqIndex) => {
        const equipmentItem = equipment.find(e => e.id === usage.equipmentId);
        const requiredRunsForEquipment = Math.max(1, Math.ceil(quantity / Math.max(1, Number(usage.capacityPerRun) || 1)));
        generatedEqReqs.push({
          id: `SER-${plantId}-${lineId}-${dateTimeStr}-${String(eqIndex + 1).padStart(3, '0')}-${segment.id}`,
          segmentRequirementId: segReqId,
          lineId,
          equipmentClassId: equipmentItem?.classId || '',
          equipmentId: usage.equipmentId,
          requirementType: 'SpecificAsset',
          plannedQuantity: (Number(segment.durationHours) || 2) * requiredRunsForEquipment,
          unitOfMeasure: 'Hours',
          operationsType: 'Production',
        });
        if (eqIndex === 0 && !generatedSegReqs[index].equipmentId) {
          generatedSegReqs[index].equipmentId = usage.equipmentId;
        }
      });

      // Generate Personnel Requirements for this segment
      personClasses
        .filter(pc => !pc.name.toLowerCase().includes('maintenance') && !pc.id.toUpperCase().includes('MAINT'))
        .forEach((pc, pcIndex) => {
        const employee = employees.find(e => e.personClassId === pc.id);
        generatedPerReqs.push({
          id: `SPR-${plantId}-${lineId}-${dateTimeStr}-${String(pcIndex + 1).padStart(3, '0')}-${segment.id}`,
          segmentRequirementId: segReqId,
          employeeId: employee?.id,
          personClassId: pc.id,
          quantity: 1,
          quantityUnitOfMeasure: 'Person',
          personnelUse: 'Production',
          operationsType: 'Production',
        });
      });
    });

    const operationsRequest: OperationsRequest = {
      id: orId,
      description: `Auto plan for ${productName}`,
      plantId,
      lineId,
      productMaterialId,
      plannedQuantity: quantity,
      quantityUoM: 'EA',
      plannedStartDateTime: toDbDateTime(planStart),
      plannedEndDateTime: toDbDateTime(currentTime),
      priority: randomInt(1, 3),
      status: 'Planned',
      operationsType: 'Production',
    };

    return {
      operationsRequest,
      segmentRequirements: generatedSegReqs,
      materialRequirements: generatedMatReqs,
      equipmentRequirements: generatedEqReqs,
      personnelRequirements: generatedPerReqs,
      endTime: currentTime,
    };
  };

  const generateAndSaveActualForOrder = async (
    operationsRequest: OperationsRequest,
    includeScrap: boolean,
    includeDelays: boolean,
  ): Promise<Date | null> => {
    const orData = await processDataApi.getOperationsRequestWithRequirements(operationsRequest.id);
    if (!orData || !orData.segmentRequirements || orData.segmentRequirements.length === 0) return null;

    const sortedSegReqs = [...orData.segmentRequirements].sort((a, b) => a.sequence - b.sequence);
    const lineEquipmentIds = lineEquipment
      .filter(le => le.productionLineId === operationsRequest.lineId && le.plantId === operationsRequest.plantId)
      .map(le => le.equipmentId);

    const scrapPercent = includeScrap ? randomFloat(0, 6) : 0;
    const startDelayMinutes = includeDelays ? randomInt(0, 45) : 0;
    const downtimeDelayMinutes = includeDelays ? randomInt(0, 20) : 0;

    const generatedSegResponses: SegmentResponse[] = [];
    const generatedMatActuals: SegmentMaterialActual[] = [];
    const generatedEqActuals: SegmentEquipmentActual[] = [];
    const generatedPersonnelActuals: SegmentPersonnelActual[] = [];
    const generatedPropertyTracking: EquipmentPropertyTracking[] = [];
    const generatedOperationsEvents: OperationsEvent[] = [];
    const generatedOperationsEventRecords: OperationsEventRecord[] = [];
    const generatedOperationsEventEntries: OperationsEventEntry[] = [];
    const generatedOperationsEventProperties: any[] = [];
    const generatedSegmentData: SegmentData[] = [];
    const generatedTestResults: TestResult[] = [];

    let overallStart: Date | null = null;
    let overallEnd: Date | null = null;
    let timeCursor = new Date(orData.operationsRequest.plannedStartDateTime.replace(' ', 'T'));
    if (startDelayMinutes > 0) {
      timeCursor = new Date(timeCursor.getTime() + startDelayMinutes * 60 * 1000);
    }

    const toIdDateTime = (d: Date): string => {
      const iso = d.toISOString();
      return `${iso.slice(0, 10).replace(/-/g, '')}${iso.slice(11, 13)}${iso.slice(14, 16)}`;
    };

    const opsResponseId = `OPS-RESP-${operationsRequest.plantId}-${operationsRequest.lineId}-${toIdDateTime(timeCursor)}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

    for (const segReq of sortedSegReqs) {
      const segment = processSegments.find(ps => ps.id === segReq.processSegmentId);
      const segmentDuration = Number(segment?.durationHours) || 2;
      const eqUsages = equipmentUsages.filter(
        eu => eu.processSegmentId === segReq.processSegmentId && lineEquipmentIds.includes(eu.equipmentId),
      );
      const capacityPerRun = eqUsages.length > 0 ? Math.max(1, Number(eqUsages[0].capacityPerRun) || 1) : operationsRequest.plannedQuantity;
      const runsNeeded = Math.max(1, Math.ceil(operationsRequest.plannedQuantity / capacityPerRun));

      for (let run = 0; run < runsNeeded; run++) {
        const runQty = Math.min(capacityPerRun, operationsRequest.plannedQuantity - run * capacityPerRun);
        const runStart = new Date(timeCursor);
        const runDuration = segmentDuration + (downtimeDelayMinutes / 60);
        const runEnd = new Date(runStart.getTime() + runDuration * 60 * 60 * 1000);

        const segRespId = `SEG-RESP-${operationsRequest.plantId}-${operationsRequest.lineId}-${toIdDateTime(runStart)}-RUN${run + 1}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        generatedSegResponses.push({
          id: segRespId,
          segmentRequirementId: segReq.id,
          operationsResponseId: opsResponseId,
          processSegmentId: segReq.processSegmentId,
          equipmentId: eqUsages[0]?.equipmentId,
          actualStartDateTime: toDbDateTime(runStart),
          actualEndDateTime: toDbDateTime(runEnd),
          actualQuantity: runQty,
          quantityUoM: operationsRequest.quantityUoM || 'EA',
          status: 'Completed',
          operationsType: 'Production',
        });

        const bomLines = segmentBOMs.filter(b => b.processSegmentId === segReq.processSegmentId);
        for (const bom of bomLines) {
          const materialUse = (bom.materialUse || '').toUpperCase();
          const direction: 'CONSUME' | 'PRODUCE' | 'Scrap' =
            materialUse === 'PRODUCE' || materialUse === 'PRODUCED' ? 'PRODUCE' :
            materialUse === 'SCRAP' ? 'Scrap' :
            'CONSUME';

          const matActualDateTime = toIdDateTime(runStart);
          const matLotId = `LOT-${operationsRequest.plantId}-${operationsRequest.lineId}-${matActualDateTime}-${bom.materialId}-R${run + 1}`;

          generatedMatActuals.push({
            id: `MAT-ACT-${operationsRequest.plantId}-${operationsRequest.lineId}-${matActualDateTime}-${bom.materialId}-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`,
            segmentResponseId: segRespId,
            materialId: bom.materialId,
            materialLotId: matLotId,
            actualQty: (Number(bom.qtyPerUnit) || 0) * runQty,
            qtyUoM: bom.uom || 'EA',
            direction,
            operationsType: 'Production',
          });
        }

        const isLastSegment = segReq.sequence === Math.max(...sortedSegReqs.map(s => s.sequence));
        if (isLastSegment) {
          const scrapQty = includeScrap ? (runQty * scrapPercent) / 100 : 0;
          const producedQty = Math.max(0, runQty - scrapQty);
          const finishedDateTime = toIdDateTime(runEnd);
          const finishedLotId = `LOT-${operationsRequest.plantId}-${operationsRequest.lineId}-${finishedDateTime}-${operationsRequest.productMaterialId}-R${run + 1}`;

          generatedMatActuals.push({
            id: `MAT-ACT-${operationsRequest.plantId}-${operationsRequest.lineId}-${finishedDateTime}-FINAL-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`,
            segmentResponseId: segRespId,
            materialId: operationsRequest.productMaterialId,
            materialLotId: finishedLotId,
            actualQty: producedQty,
            qtyUoM: operationsRequest.quantityUoM || 'EA',
            direction: 'PRODUCE',
            operationsType: 'Production',
          });

          if (scrapQty > 0) {
            generatedMatActuals.push({
              id: `MAT-ACT-${operationsRequest.plantId}-${operationsRequest.lineId}-${finishedDateTime}-SCRAP-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`,
              segmentResponseId: segRespId,
              materialId: operationsRequest.productMaterialId,
              materialLotId: `LOT-SCRAP-${operationsRequest.plantId}-${operationsRequest.lineId}-${finishedDateTime}-${operationsRequest.productMaterialId}-R${run + 1}`,
              actualQty: scrapQty,
              qtyUoM: operationsRequest.quantityUoM || 'EA',
              direction: 'Scrap',
              operationsType: 'Production',
            });
          }
        }

        const eqList = eqUsages.length > 0 ? eqUsages : [{ equipmentId: segReq.equipmentId || '' } as any];
        for (const usage of eqList) {
          if (!usage.equipmentId) continue;
          generatedEqActuals.push({
            id: `EQ-ACT-${operationsRequest.plantId}-${operationsRequest.lineId}-${toIdDateTime(runStart)}-${usage.equipmentId}-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`,
            segmentResponseId: segRespId,
            equipmentId: usage.equipmentId,
            actualQuantity: runDuration,
            actualStartDateTime: toDbDateTime(runStart),
            actualEndDateTime: toDbDateTime(runEnd),
            unitOfMeasure: 'Hours',
            operationsType: 'Production',
          });
        }

        if (!overallStart || runStart < overallStart) overallStart = runStart;
        if (!overallEnd || runEnd > overallEnd) overallEnd = runEnd;
        timeCursor = new Date(runEnd);
      }
    }

    if (!overallStart || !overallEnd) return null;

    // Generate equipment property tracking records for created equipment actuals.
    for (const eqActual of generatedEqActuals) {
      const segResp = generatedSegResponses.find(sr => sr.id === eqActual.segmentResponseId);
      if (!segResp) continue;

      const propAssignments = equipmentPropertyAssignments.filter(
        epa => epa.equipmentId === eqActual.equipmentId && epa.processSegmentId === segResp.processSegmentId,
      );

      for (const assignment of propAssignments) {
        const property = equipmentProperties.find(ep => ep.id === assignment.equipmentPropertyId);
        if (!property) continue;

        const samplingIntervalSeconds = assignment.samplingIntervalSeconds || 60;
        const startTs = new Date(eqActual.actualStartDateTime.replace(' ', 'T') + 'Z');
        const endTs = new Date(eqActual.actualEndDateTime.replace(' ', 'T') + 'Z');
        const durationMs = endTs.getTime() - startTs.getTime();
        const numSamples = Math.max(1, Math.floor(durationMs / (samplingIntervalSeconds * 1000)) + 1);

        const eqItem = equipment.find(e => e.id === eqActual.equipmentId);
        const classAssignment = equipmentClassPropertyAssignments.find(
          ecpa => ecpa.equipmentPropertyId === assignment.equipmentPropertyId,
        );

        for (let i = 0; i < numSamples; i++) {
          const sampleTime = new Date(startTs.getTime() + i * samplingIntervalSeconds * 1000);
          if (sampleTime > endTs) break;

          let value: number | string = 'N/A';
          if (property.valueDataType === 'DECIMAL' || property.valueDataType === 'INTEGER') {
            const minValue = typeof property.minValue === 'number' ? property.minValue : 0;
            const maxValue = typeof property.maxValue === 'number' ? property.maxValue : 100;
            const numericValue = minValue + Math.random() * (maxValue - minValue);
            value = property.valueDataType === 'INTEGER' ? Math.round(numericValue) : Math.round(numericValue * 100) / 100;
          } else if (property.valueDataType === 'BOOLEAN') {
            value = Math.random() > 0.5 ? 'true' : 'false';
          } else if (property.minValue && typeof property.minValue === 'string') {
            const opts = property.minValue.split(',').map((v: string) => v.trim()).filter(Boolean);
            value = opts.length > 0 ? opts[Math.floor(Math.random() * opts.length)] : 'N/A';
          }

          generatedPropertyTracking.push({
            id: `PROP-TRACK-${operationsRequest.plantId}-${operationsRequest.lineId}-${eqActual.equipmentId}-${assignment.equipmentPropertyId}`,
            segmentResponseId: eqActual.segmentResponseId,
            plantId: operationsRequest.plantId,
            lineId: operationsRequest.lineId,
            equipmentId: eqActual.equipmentId,
            equipmentPropertyId: assignment.equipmentPropertyId,
            equipmentPropertyName: property.name,
            equipmentClassId: eqItem?.classId || '',
            equipmentClassPropertyId: classAssignment?.equipmentClassPropertyId || '',
            value,
            uom: property.unit || '',
            createdTimestamp: toDbDateTime(sampleTime),
          });
        }
      }
    }

    // Generate operations events + records + entries + properties for created segment responses.
    for (const segResp of generatedSegResponses) {
      const assignments = operationEventDefSegmentAssignments.filter(
        a => a.processSegmentId === segResp.processSegmentId,
      );

      if (assignments.length === 0) continue;

      const mandatory = assignments.filter(
        (a: any) => a.isMandatory === true || a.isMandatory === 'TRUE' || a.isMandatory === 'true' || a.isMandatory === 'True',
      );
      const conditional = assignments.filter((a: any) => !mandatory.includes(a));
      const selected = [...mandatory];
      if (conditional.length > 0) {
        selected.push(conditional[Math.floor(Math.random() * conditional.length)]);
      }

      const segStart = new Date(segResp.actualStartDateTime.replace(' ', 'T') + 'Z');
      const segEnd = new Date(segResp.actualEndDateTime.replace(' ', 'T') + 'Z');
      const eqId = (generatedEqActuals.find(ea => ea.segmentResponseId === segResp.id)?.equipmentId) || segResp.equipmentId || '';
      const hierarchyScopeRecord = hierarchyScopes.find((hs: any) => hs.equipmentID === eqId);

      for (const assignment of selected) {
        const eventDef = operationEventDefinitions.find(oed => oed.id === assignment.operationsEventDefinitionId);
        const startOrEnd = (assignment.startOrEndEvent || 'Start').toLowerCase();
        const eventTime = startOrEnd === 'end'
          ? new Date(segEnd.getTime() - Math.floor((segEnd.getTime() - segStart.getTime()) * 0.1 * Math.random()))
          : new Date(segStart.getTime() + Math.floor((segEnd.getTime() - segStart.getTime()) * 0.1 * Math.random()));

        const eventId = `OPS-EVENT-${segResp.id}-${assignment.operationsEventDefinitionId}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        generatedOperationsEvents.push({
          id: eventId,
          segmentResponseId: segResp.id,
          operationsEventDefinitionId: assignment.operationsEventDefinitionId,
          effectiveTimestamp: toDbDateTime(eventTime),
          notes: `${eventDef?.description || 'Event'} - ${(assignment.notes || '').toString()}`,
          eventType: eventDef?.eventType || 'Alarm',
          equipmentId: eqId,
          hierarchyScope: hierarchyScopeRecord?.id || '',
          operationsType: 'Production',
        });

        const recordId = createUniqueRecordId(generatedOperationsEventRecords);
        generatedOperationsEventRecords.push({
          id: recordId,
          operationsEventId: eventId,
          operationsEventDefinitionId: assignment.operationsEventDefinitionId,
          severity: eventDef?.severity || 'Medium',
          status: 'Closed',
          comments: `Auto-generated for ${eventId}`,
          effectiveTime: toDbDateTime(eventTime),
          segmentResponseId: segResp.id,
          equipmentId: eqId,
          eventType: eventDef?.eventType || 'Alarm',
        });

        generatedOperationsEventEntries.push({
          id: createUniqueEntryId(generatedOperationsEventEntries),
          operationsEventRecordId: recordId,
          entryType: 'Production',
          description: `Entry for ${eventId}`,
          effectiveTime: toDbDateTime(new Date(eventTime.getTime() + 5 * 60 * 1000)),
          segmentResponseId: segResp.id,
          equipmentId: eqId,
          informationObjectType: 'SegmentResponse',
        });

        appendRelatedOperationsEventArtifacts({
          opsEvent: {
            id: eventId,
            segmentResponseId: segResp.id,
            operationsEventDefinitionId: assignment.operationsEventDefinitionId,
            effectiveTimestamp: toDbDateTime(eventTime),
            notes: `${eventDef?.description || 'Event'} - ${(assignment.notes || '').toString()}`,
            eventType: eventDef?.eventType || 'Alarm',
            equipmentId: eqId,
            hierarchyScope: hierarchyScopeRecord?.id || '',
            operationsType: 'Production',
          },
          eventDef,
          baseRecordId: recordId,
          effectiveTime: toDbDateTime(eventTime),
          segmentResponse: segResp,
          relatedEquipmentActuals: generatedEqActuals.filter((equipmentActual) => equipmentActual.segmentResponseId === segResp.id),
          generatedOperationsEventRecords,
          generatedOperationsEventEntries,
          dedupeByEntityId: true,
        });

        const propAssignments = operationEventDefinitionPropertyAssignments.filter(
          pa => pa.operationsEventDefinitionId === assignment.operationsEventDefinitionId,
        );

        for (const pa of propAssignments) {
          generatedOperationsEventProperties.push({
            id: `OEP-${eventId.replace('OPS-EVENT-', '')}-${pa.operationsEventDefinitionPropertyId}`,
            operationsEventId: eventId,
            operationsEventDefinitionPropertyId: pa.operationsEventDefinitionPropertyId,
            value: pa.value,
            valueUnitOfMeasure: pa.valueUnitOfMeasure,
            effectiveTime: toDbDateTime(eventTime),
          });
        }
      }
    }

    // Generate simplified shift/crew segment data.
    for (const segResp of generatedSegResponses) {
      const segStart = new Date(segResp.actualStartDateTime.replace(' ', 'T') + 'Z');
      const segEnd = new Date(segResp.actualEndDateTime.replace(' ', 'T') + 'Z');
      const matchingShift = shifts[0];
      if (matchingShift) {
        generatedSegmentData.push({
          id: `SEG-DATA-SHIFT-${segResp.id}-${matchingShift.id}-${Math.floor(Math.random() * 1000)}`,
          segmentResponseId: segResp.id,
          recordType: 'shift',
          shiftId: matchingShift.id,
          startDateTime: toDbDateTime(segStart),
          endDateTime: toDbDateTime(segEnd),
          notes: `${matchingShift.shiftName || matchingShift.id}`,
        });

        const crewAssignment = shiftCrewAssignments.find((sca: any) => sca.shiftId === matchingShift.id);
        if (crewAssignment) {
          generatedSegmentData.push({
            id: `SEG-DATA-CREW-${segResp.id}-${crewAssignment.crewId}-${Math.floor(Math.random() * 1000)}`,
            segmentResponseId: segResp.id,
            recordType: 'crew',
            crewId: crewAssignment.crewId,
            startDateTime: toDbDateTime(segStart),
            endDateTime: toDbDateTime(segEnd),
            notes: `Auto-assigned crew ${crewAssignment.crewId}`,
          });
        }
      }
    }

    // Generate test results for produced/scrap material lots.
    for (const mat of generatedMatActuals) {
      if (mat.direction !== 'PRODUCE' && mat.direction !== 'Scrap') continue;
      const now = new Date();
      generatedTestResults.push({
        id: `TEST-${mat.materialLotId}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        materialLotId: mat.materialLotId,
        description: mat.direction === 'Scrap' ? 'Failed due to process variation' : 'Good',
        evaluationDate: toDbDateTime(new Date(now.getTime() + randomInt(10, 30) * 60 * 1000)),
        evaluatedCriterionResult: mat.direction === 'Scrap' ? 'Fail' : 'Pass',
      });
    }

    const operationsResponse: OperationsResponse = {
      id: opsResponseId,
      operationsRequestId: operationsRequest.id,
      description: operationsRequest.description,
      plantId: operationsRequest.plantId,
      productionLineId: operationsRequest.lineId,
      actualStartDateTime: toDbDateTime(overallStart),
      actualEndDateTime: toDbDateTime(overallEnd),
      actualQuantity: operationsRequest.plannedQuantity,
      quantityUoM: operationsRequest.quantityUoM,
      status: 'Completed',
      operationsType: 'Production',
    };

    // Generate Personnel Actuals from personnel requirements
    const persReqs: SegmentPersonnelRequirement[] = orData.personnelRequirements || [];
    for (const segResp of generatedSegResponses) {
      const relatedPersReqs = persReqs.filter((pr: SegmentPersonnelRequirement) => pr.segmentRequirementId === segResp.segmentRequirementId);
      for (const pr of relatedPersReqs) {
        const employee = employees.find(e => e.personClassId === pr.personClassId);
        generatedPersonnelActuals.push({
          id: `PERS-ACT-${segResp.id}-${pr.personClassId || pr.id}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
          segmentResponseId: segResp.id,
          employeeId: employee?.id,
          personClassId: pr.personClassId,
          actualQuantity: pr.quantity || 1,
          quantityUnitOfMeasure: pr.quantityUnitOfMeasure || 'Person',
          personnelUse: pr.personnelUse || 'Production',
          actualStartDateTime: segResp.actualStartDateTime,
          actualEndDateTime: segResp.actualEndDateTime,
          operationsType: 'Production',
        });
      }
    }

    await processDataApi.saveActualData(
      operationsResponse,
      generatedSegResponses,
      generatedMatActuals,
      generatedEqActuals,
      generatedPropertyTracking,
      generatedTestResults,
      generatedOperationsEvents,
      generatedOperationsEventRecords,
      generatedOperationsEventEntries,
      generatedOperationsEventProperties,
      generatedSegmentData,
      generatedPersonnelActuals,
    );

    return overallEnd;
  };

  const generateAutomatedBatchData = async () => {
    if (!batchStartDate || !batchEndDate || !batchPlantId) {
      showSnackbar('Please provide start date, end date, and plant for automated batch generation', 'error');
      return;
    }

    if (new Date(batchStartDate) > new Date(batchEndDate)) {
      showSnackbar('Batch start date must be before or equal to end date', 'error');
      return;
    }

    if (
      batchMinDailyOrders < 1 ||
      batchMaxDailyOrders < 1 ||
      batchMinDailyOrders > batchMaxDailyOrders ||
      batchMinDailyOrders > MAX_DAILY_ORDERS ||
      batchMaxDailyOrders > MAX_DAILY_ORDERS
    ) {
      showSnackbar(`Daily orders: use values between 1 and ${MAX_DAILY_ORDERS}, with min <= max`, 'error');
      return;
    }

    if (batchTargetUtilizationPercent <= 0 || batchTargetUtilizationPercent > MAX_UTILIZATION_PERCENT) {
      showSnackbar(`Target utilization must be between 1% and ${MAX_UTILIZATION_PERCENT}%`, 'error');
      return;
    }

    const dates = listDatesInclusive(batchStartDate, batchEndDate);
    const plantLines = productionLines.filter(
      l => l.plantId === batchPlantId && (!batchLineId || l.id === batchLineId),
    );

    if (plantLines.length === 0) {
      if (batchLineId) {
        showSnackbar('Selected production line is not available for this plant', 'error');
      } else {
        showSnackbar('No production lines found for selected plant', 'error');
      }
      return;
    }

    try {
      setLoading(true);
      let createdOrders = 0;
      let createdDays = 0;
      const lineNextAvailableAt = new Map<string, Date>();

      for (const dateStr of dates) {
        createdDays++;

        for (const line of plantLines) {
          const productPool = materials.filter(m => {
            const hasSegments = processSegments.some(ps => ps.productMaterialId === m.id);
            if (!hasSegments) return false;
            const capacity = calculateLineDailyCapacity(batchPlantId, line.id, m.id);
            return capacity > 0;
          });

          if (productPool.length === 0) continue;

          const lineScheduleKey = `${batchPlantId}::${line.id}`;
          const dayStart = dateFromDateAndHour(dateStr, 6, 0);
          const priorNextAvailable = lineNextAvailableAt.get(lineScheduleKey);
          let lineCursor = priorNextAvailable && priorNextAvailable > dayStart
            ? new Date(priorNextAvailable)
            : dayStart;
          const demandGroups = randomInt(batchMinDailyOrders, batchMaxDailyOrders);

          for (let group = 0; group < demandGroups; group++) {
            const selectedProduct = productPool[randomInt(0, productPool.length - 1)];
            const dailyCapacity = Math.max(1, calculateLineDailyCapacity(batchPlantId, line.id, selectedProduct.id));
            const utilizationFactor = batchTargetUtilizationPercent / 100;
            const targetDailyQty = Math.max(1, Math.floor(dailyCapacity * utilizationFactor));
            const perGroupTarget = Math.max(1, Math.floor(targetDailyQty / demandGroups));
            const demandQty = Math.max(1, Math.floor(perGroupTarget * randomFloat(0.95, 1.05)));
            const maxOrderQty = Math.max(25, Math.floor(dailyCapacity * 0.55));
            const orderQuantities = splitDemandIntoOrders(demandQty, maxOrderQty);

            for (const qty of orderQuantities) {
              const planPackage = buildPlanPackage(batchPlantId, line.id, selectedProduct.id, qty, lineCursor, createdOrders + 1);

              await processDataApi.saveGeneratedData(
                planPackage.operationsRequest,
                planPackage.segmentRequirements,
                planPackage.materialRequirements,
                planPackage.equipmentRequirements,
                planPackage.personnelRequirements,
              );

              const actualEndTime = await generateAndSaveActualForOrder(
                planPackage.operationsRequest,
                batchIncludeScrap,
                batchIncludeDelays,
              );

              createdOrders++;
              const completionAnchor = actualEndTime ?? planPackage.endTime;
              lineCursor = new Date(completionAnchor.getTime() + randomInt(10, 45) * 60 * 1000);
              lineNextAvailableAt.set(lineScheduleKey, lineCursor);
            }
          }
        }
      }

      await loadSavedOperationsRequests();
      await loadStoredActualData();
      showSnackbar(`Automated batch generated successfully: ${createdOrders} orders across ${createdDays} day(s)`, 'success');
    } catch (error: any) {
      console.error('Automated batch generation failed:', error);
      showSnackbar(`Automated batch generation failed: ${error?.message || error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateProcessData = () => {
    if (!formData.productMaterialId || !formData.lineId || !formData.plannedQuantity) {
      showSnackbar('Please fill in all required fields', 'error');
      return;
    }

    try {
      const timestamp = new Date();
      setGenerationTimestamp(timestamp);
      setDataVersion(1);

      // Generate Operations Request ID with plant, line, date and time
      const now = new Date();
      const dateTimeStr = `${now.toISOString().slice(0, 10).replace(/-/g, '')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const orId = `OR-${formData.plantId}-${formData.lineId}-${dateTimeStr}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
      
      // Get process segments for the selected product
      const productSegments = processSegments
        .filter(ps => ps.productMaterialId === formData.productMaterialId)
        .sort((a, b) => a.sequence - b.sequence);

      if (productSegments.length === 0) {
        showSnackbar('No process segments found for selected product', 'error');
        return;
      }

      // Generate Segment Requirements
      const generatedSegReqs: SegmentRequirement[] = [];
      const generatedMatReqs: SegmentMaterialRequirement[] = [];
      const generatedEqReqs: SegmentEquipmentRequirement[] = [];
      const generatedPerReqs: SegmentPersonnelRequirement[] = [];

      // Parse datetime-local format (YYYY-MM-DDTHH:mm) - add :00 for seconds
      const startTime = new Date(formData.plannedStartDateTime + ':00');
      const operationsEndTime = new Date(formData.plannedEndDateTime + ':00');
      let currentTime = new Date(startTime);
      
      // Track when each segment completes its first run (for pipeline logic)
      let previousSegmentFirstRunEnd: Date | null = null;

      productSegments.forEach((segment, index) => {
        const segReqId = `SR-${formData.plantId}-${formData.lineId}-${dateTimeStr}-${String(index + 1).padStart(3, '0')}-${segment.id}`;
        
        // Calculate segment timing with equipment capacity consideration
        const segmentDuration = segment.durationHours || 2;
        
        // Get equipment usage for this segment to determine capacity
        const eqUsage = equipmentUsages.find(eu => eu.processSegmentId === segment.id);
        const equipmentCapacity = eqUsage?.capacityPerRun || formData.plannedQuantity; // fallback to full quantity if no equipment usage
        
        // Calculate required runs based on capacity (same logic as segment responses)
        const requiredRuns = Math.ceil(formData.plannedQuantity / equipmentCapacity);
        
        // Calculate total time needed considering multiple runs
        const totalDuration = segmentDuration * requiredRuns;
        
        // Determine start time:
        // - First segment: use operations request start time
        // - Subsequent segments: can start as soon as first run of previous segment completes (pipeline effect)
        let segmentStartTime: Date;
        if (index === 0) {
          // First segment starts at operations request start time
          segmentStartTime = new Date(currentTime);
        } else if (previousSegmentFirstRunEnd) {
          // Subsequent segments can start when first run of previous segment completes
          segmentStartTime = new Date(previousSegmentFirstRunEnd);
        } else {
          // Fallback (shouldn't happen)
          segmentStartTime = new Date(currentTime);
        }
        
        // Calculate when first run of this segment completes (for next segment's start)
        const firstRunEnd = new Date(segmentStartTime.getTime() + segmentDuration * 60 * 60 * 1000);
        
        // Calculate when ALL runs complete (considering all runs take place sequentially on same equipment)
        let allRunsEnd = new Date(segmentStartTime.getTime() + totalDuration * 60 * 60 * 1000);
        
        // IMPORTANT: Ensure this segment cannot complete before the previous segment completes all its runs
        // This enforces proper sequential dependencies in production (can't package before all baking is done)
        // When previous segment finishes later, the last batch from that segment still needs processing time in this segment
        if (index > 0 && currentTime > allRunsEnd) {
          console.log(`[Plan Generation] Adjusting end time: Segment ${segment.id} would end at ${allRunsEnd.toISOString()}, but previous segment ends at ${currentTime.toISOString()}`);
          // Add this segment's duration for processing the last batch from the previous segment
          allRunsEnd = new Date(currentTime.getTime() + segmentDuration * 60 * 60 * 1000);
          console.log(`[Plan Generation] Adjusted end time to ${allRunsEnd.toISOString()} (previous end + ${segmentDuration}h for last batch processing)`);
        }

        console.log(`[Plan Generation] Segment ${segment.id} (Seq ${(index + 1) * 10}): ${formData.plannedQuantity} units, capacity ${equipmentCapacity}/run, ${requiredRuns} runs needed`);
        console.log(`[Plan Generation]   Start: ${segmentStartTime.toISOString()}, First run ends: ${firstRunEnd.toISOString()}, All runs end: ${allRunsEnd.toISOString()}, Total duration: ${totalDuration}h`);

        // Create Segment Requirement
        const segReq: SegmentRequirement = {
          id: segReqId,
          operationsRequestId: orId,
          processSegmentId: segment.id,
          sequence: (index + 1) * 10,
          earliestStartDateTime: segmentStartTime.toISOString().slice(0, 19).replace('T', ' '),
          latestEndDateTime: allRunsEnd.toISOString().slice(0, 19).replace('T', ' '),
          targetQuantity: formData.plannedQuantity,
          quantityUoM: formData.quantityUoM,
          operationsType: 'Production',
        };
        generatedSegReqs.push(segReq);
        
        // Update for next segment (pipeline effect: next segment can start when this segment's first run completes)
        previousSegmentFirstRunEnd = firstRunEnd;
        
        // Update currentTime to when all runs of this segment complete (for tracking overall timeline)
        currentTime = new Date(allRunsEnd);

        // Generate Material Requirements based on BOM
        const bomLines = segmentBOMs.filter(bom => bom.processSegmentId === segment.id);
        bomLines.forEach((bom, bomIndex) => {
          const material = materials.find(m => m.id === bom.materialId);
          const matReqId = `SMR-${formData.plantId}-${formData.lineId}-${dateTimeStr}-${String(bomIndex + 1).padStart(3, '0')}-${segment.id}`;
          
          const matReq: SegmentMaterialRequirement = {
            id: matReqId,
            segmentRequirementId: segReqId,
            materialId: bom.materialId,
            requiredQty: bom.qtyPerUnit * formData.plannedQuantity,
            qtyUoM: bom.uom,
            requirementType: material?.classId === 'FINISHEDPRODUCT' ? 'Output' : 
                           material?.classId === 'INPROCESSMATERIAL' ? 'Input' : 'Consumable',
            operationsType: 'Production',
          };
          generatedMatReqs.push(matReq);
        });

        // If this is the last segment (highest sequence), add the final product as Output
        const isLastSegment = index === productSegments.length - 1;
        if (isLastSegment) {
          const productMaterial = materials.find(m => m.id === segment.productMaterialId);
          const matReqId = `SMR-${formData.plantId}-${formData.lineId}-${dateTimeStr}-OUTPUT-${segment.id}`;
          
          const outputMatReq: SegmentMaterialRequirement = {
            id: matReqId,
            segmentRequirementId: segReqId,
            materialId: segment.productMaterialId,
            requiredQty: formData.plannedQuantity,
            qtyUoM: formData.quantityUoM,
            requirementType: 'Output',
            operationsType: 'Production',
          };
          generatedMatReqs.push(outputMatReq);
        }

        // Generate Equipment Requirements based on Equipment Usage
        // Filter by process segment AND by equipment assigned to the selected plant and production line
        const lineEquipmentIds = lineEquipment
          .filter(le => le.productionLineId === formData.lineId && le.plantId === formData.plantId)
          .map(le => le.equipmentId);
        const eqUsages = equipmentUsages.filter(eu => 
          eu.processSegmentId === segment.id && 
          lineEquipmentIds.includes(eu.equipmentId)
        );
        eqUsages.forEach((usage, eqIndex) => {
          const eqReqId = `SER-${formData.plantId}-${formData.lineId}-${dateTimeStr}-${String(eqIndex + 1).padStart(3, '0')}-${segment.id}`;
          const equipmentItem = equipment.find(e => e.id === usage.equipmentId);
          
          // Calculate required runs based on capacity (same as above)
          const requiredRuns = Math.ceil(formData.plannedQuantity / usage.capacityPerRun);
          const totalDuration = (segment.durationHours || 2) * requiredRuns;

          const eqReq: SegmentEquipmentRequirement = {
            id: eqReqId,
            segmentRequirementId: segReqId,
            lineId: formData.lineId,
            equipmentClassId: equipmentItem?.classId || '',
            equipmentId: usage.equipmentId,
            requirementType: 'SpecificAsset',
            plannedQuantity: totalDuration,
            unitOfMeasure: 'Hours',
            operationsType: 'Production',
          };
          generatedEqReqs.push(eqReq);

          // Update segment requirement with equipment ID (first equipment)
          if (eqIndex === 0 && !generatedSegReqs[index].equipmentId) {
            generatedSegReqs[index].equipmentId = usage.equipmentId;
          }
        });

        // Generate Personnel Requirements based on available person classes
        personClasses
          .filter(pc => !pc.name.toLowerCase().includes('maintenance') && !pc.id.toUpperCase().includes('MAINT'))
          .forEach((pc, pcIndex) => {
          const employee = employees.find(e => e.personClassId === pc.id);
          generatedPerReqs.push({
            id: `SPR-${formData.plantId}-${formData.lineId}-${dateTimeStr}-${String(pcIndex + 1).padStart(3, '00')}-${segment.id}`,
            segmentRequirementId: segReqId,
            employeeId: employee?.id,
            personClassId: pc.id,
            quantity: 1,
            quantityUnitOfMeasure: 'Person',
            personnelUse: 'Production',
            operationsType: 'Production',
          });
        });

        // Note: currentTime is updated above to allRunsEnd for tracking overall timeline
      });

      // Create complete operations request with properly formatted datetime
      const completeOR: OperationsRequest = {
        id: orId,
        description: formData.description,
        plantId: formData.plantId,
        lineId: formData.lineId,
        productMaterialId: formData.productMaterialId,
        plannedQuantity: formData.plannedQuantity,
        quantityUoM: formData.quantityUoM,
        plannedStartDateTime: startTime.toISOString().slice(0, 19).replace('T', ' '),
        plannedEndDateTime: operationsEndTime.toISOString().slice(0, 19).replace('T', ' '),
        priority: formData.priority,
        status: formData.status,
        operationsType: 'Production',
      };

      setGeneratedOperationsRequest(completeOR);
      setSegmentRequirements(generatedSegReqs);
      setMaterialRequirements(generatedMatReqs);
      setEquipmentRequirements(generatedEqReqs);
      setPersonnelRequirements(generatedPerReqs);
      
      showSnackbar(`Generated ${generatedSegReqs.length} segment requirements with ${generatedMatReqs.length} material, ${generatedEqReqs.length} equipment and ${generatedPerReqs.length} personnel requirements`, 'success');
    } catch (error) {
      console.error('Error generating process data:', error);
      showSnackbar('Failed to generate process data', 'error');
    }
  };

  const saveToDatabase = async () => {
    if (!generatedOperationsRequest || segmentRequirements.length === 0) {
      showSnackbar('No data to save', 'error');
      return;
    }

    try {
      console.log('Starting save to database...');
      setLoading(true);
      
      console.log('Saving operations request:', generatedOperationsRequest);
      console.log('Segment requirements count:', segmentRequirements.length);
      console.log('Material requirements count:', materialRequirements.length);
      console.log('Equipment requirements count:', equipmentRequirements.length);
      
      await processDataApi.saveGeneratedData(
        generatedOperationsRequest,
        segmentRequirements,
        materialRequirements,
        equipmentRequirements,
        personnelRequirements,
      );
      
      console.log('Data saved successfully, reloading operations requests...');
      // Reload the operations requests list for the actual data tab
      await loadSavedOperationsRequests();
      
      setLoading(false);
      console.log('Save complete');
      showSnackbar('Data saved to database successfully', 'success');
    } catch (error) {
      console.error('Failed to save data:', error);
      showSnackbar(`Failed to save data to database: ${error.message}`, 'error');
      setLoading(false);
    }
  };

  const exportToCSV = (type: 'all' | 'operations' | 'segments' | 'materials' | 'equipment') => {
    if (!generatedOperationsRequest || segmentRequirements.length === 0) {
      showSnackbar('No data to export', 'error');
      return;
    }

    // Export Operations Request
    const orCsv = `OperationsRequestID,Description,PlantID,LineID,ProductMaterialID,PlannedQuantity,QuantityUoM,PlannedStartDateTime,PlannedEndDateTime,Priority,OperationsType,Status
  ${generatedOperationsRequest.id},${generatedOperationsRequest.description},${generatedOperationsRequest.plantId},${generatedOperationsRequest.lineId},${generatedOperationsRequest.productMaterialId},${generatedOperationsRequest.plannedQuantity},${generatedOperationsRequest.quantityUoM},${generatedOperationsRequest.plannedStartDateTime},${generatedOperationsRequest.plannedEndDateTime},${generatedOperationsRequest.priority},${generatedOperationsRequest.operationsType || ''},${generatedOperationsRequest.status}`;

    // Export Segment Requirements
    const srHeaders = 'SegmentRequirementID,OperationsRequestID,ProcessSegmentID,EquipmentID,Sequence,EarliestStartDateTime,LatestEndDateTime,TargetQuantity,QuantityUoM,OperationsType';
    const srRows = segmentRequirements.map(sr => 
      `${sr.id},${sr.operationsRequestId},${sr.processSegmentId},${sr.equipmentId || ''},${sr.sequence},${sr.earliestStartDateTime},${sr.latestEndDateTime},${sr.targetQuantity},${sr.quantityUoM},${sr.operationsType || ''}`
    ).join('\n');
    const srCsv = `${srHeaders}\n${srRows}`;

    // Export Material Requirements
    const mrHeaders = 'SegmentMaterialReqID,SegmentRequirementID,MaterialID,RequiredQty,QtyUoM,RequirementType,OperationsType';
    const mrRows = materialRequirements.map(mr => 
      `${mr.id},${mr.segmentRequirementId},${mr.materialId},${mr.requiredQty},${mr.qtyUoM},${mr.requirementType},${mr.operationsType || ''}`
    ).join('\n');
    const mrCsv = `${mrHeaders}\n${mrRows}`;

    // Export Equipment Requirements
    const erHeaders = 'SegmentEquipmentReqID,SegmentRequirementID,LineID,EquipmentClassID,EquipmentID,RequirementType,PlannedQuantity,UnitOfMeasure,OperationsType';
    const erRows = equipmentRequirements.map(er => 
      `${er.id},${er.segmentRequirementId},${er.lineId},${er.equipmentClassId},${er.equipmentId},${er.requirementType},${er.plannedQuantity},${er.unitOfMeasure || ''},${er.operationsType || ''}`
    ).join('\n');
    const erCsv = `${erHeaders}\n${erRows}`;

    // Export Personnel Requirements
    const prHeaders = 'SegmentPersonnelReqID,SegmentRequirementID,EmployeeID,PersonClassID,Quantity,QuantityUnitOfMeasure,PersonnelUse,OperationsType';
    const prRows = personnelRequirements.map(pr =>
      `${pr.id},${pr.segmentRequirementId},${pr.employeeId || ''},${pr.personClassId || ''},${pr.quantity},${pr.quantityUnitOfMeasure},${pr.personnelUse},${pr.operationsType || ''}`
    ).join('\n');
    const prCsv = `${prHeaders}\n${prRows}`;

    // Export Person (from employees)
    const personHeaders = 'PersonID,Name,PersonClassID';
    const personRows = employees.map(e =>
      `${e.id},${e.employeeName},${e.personClassId || ''}`
    ).join('\n');
    const personCsv = `${personHeaders}\n${personRows}`;

    // Create downloads based on type
    if (type === 'all') {
      downloadCSV(orCsv, 'operations_requests.csv');
      downloadCSV(srCsv, 'segment_requirements.csv');
      downloadCSV(mrCsv, 'segment_material_requirements.csv');
      downloadCSV(erCsv, 'segment_equipment_requirements.csv');
      if (personnelRequirements.length > 0) {
        downloadCSV(prCsv, 'segment_personnel_requirements.csv');
      }
      if (employees.length > 0) {
        downloadCSV(personCsv, 'person.csv');
      }
      showSnackbar('All data exported successfully', 'success');
    } else if (type === 'operations') {
      downloadCSV(orCsv, 'operations_requests.csv');
      showSnackbar('Operations request exported successfully', 'success');
    } else if (type === 'segments') {
      downloadCSV(srCsv, 'segment_requirements.csv');
      showSnackbar('Segment requirements exported successfully', 'success');
    } else if (type === 'materials') {
      downloadCSV(mrCsv, 'segment_material_requirements.csv');
      showSnackbar('Material requirements exported successfully', 'success');
    } else if (type === 'equipment') {
      downloadCSV(erCsv, 'segment_equipment_requirements.csv');
      showSnackbar('Equipment requirements exported successfully', 'success');
    }
  };

  const exportMaintenancePlanToCSV = (type: 'all' | 'operations' | 'segments' | 'materials' | 'equipment' | 'personnel') => {
    if (!generatedMaintenanceRequest || maintenanceSegmentRequirements.length === 0) {
      showSnackbar('No maintenance plan data to export', 'error');
      return;
    }

    const orCsv = `OperationsRequestID,Description,PlantID,LineID,ProductMaterialID,PlannedQuantity,QuantityUoM,PlannedStartDateTime,PlannedEndDateTime,Priority,OperationsType,Status
  ${generatedMaintenanceRequest.id},${generatedMaintenanceRequest.description},${generatedMaintenanceRequest.plantId},${generatedMaintenanceRequest.lineId},${generatedMaintenanceRequest.productMaterialId},${generatedMaintenanceRequest.plannedQuantity},${generatedMaintenanceRequest.quantityUoM},${generatedMaintenanceRequest.plannedStartDateTime},${generatedMaintenanceRequest.plannedEndDateTime},${generatedMaintenanceRequest.priority},${generatedMaintenanceRequest.operationsType || ''},${generatedMaintenanceRequest.status}`;

    const srHeaders = 'SegmentRequirementID,OperationsRequestID,ProcessSegmentID,EquipmentID,Sequence,EarliestStartDateTime,LatestEndDateTime,TargetQuantity,QuantityUoM,OperationsType';
    const srRows = maintenanceSegmentRequirements
      .map((sr) => `${sr.id},${sr.operationsRequestId},${sr.processSegmentId},${sr.equipmentId || ''},${sr.sequence},${sr.earliestStartDateTime},${sr.latestEndDateTime},${sr.targetQuantity},${sr.quantityUoM},${sr.operationsType || ''}`)
      .join('\n');
    const srCsv = `${srHeaders}\n${srRows}`;

    const mrHeaders = 'SegmentMaterialReqID,SegmentRequirementID,MaterialID,RequiredQty,QtyUoM,RequirementType,OperationsType';
    const mrRows = maintenanceMaterialRequirements
      .map((mr) => `${mr.id},${mr.segmentRequirementId},${mr.materialId},${mr.requiredQty},${mr.qtyUoM},${mr.requirementType},${mr.operationsType || ''}`)
      .join('\n');
    const mrCsv = `${mrHeaders}\n${mrRows}`;

    const erHeaders = 'SegmentEquipmentReqID,SegmentRequirementID,LineID,EquipmentClassID,EquipmentID,RequirementType,PlannedQuantity,UnitOfMeasure,OperationsType';
    const erRows = maintenanceEquipmentRequirements
      .map((er) => `${er.id},${er.segmentRequirementId},${er.lineId},${er.equipmentClassId},${er.equipmentId},${er.requirementType},${er.plannedQuantity},${er.unitOfMeasure || ''},${er.operationsType || ''}`)
      .join('\n');
    const erCsv = `${erHeaders}\n${erRows}`;

    const prHeaders = 'SegmentPersonnelReqID,SegmentRequirementID,EmployeeID,PersonClassID,Quantity,QuantityUnitOfMeasure,PersonnelUse,OperationsType';
    const prRows = maintenancePersonnelRequirements
      .map((pr) => `${pr.id},${pr.segmentRequirementId},${pr.employeeId || ''},${pr.personClassId || ''},${pr.quantity},${pr.quantityUnitOfMeasure},${pr.personnelUse},${pr.operationsType || ''}`)
      .join('\n');
    const prCsv = `${prHeaders}\n${prRows}`;

    // Export Person (from employees) for maintenance
    const personHeadersMaint = 'PersonID,Name,PersonClassID';
    const personRowsMaint = employees.map(e =>
      `${e.id},${e.employeeName},${e.personClassId || ''}`
    ).join('\n');
    const personCsvMaint = `${personHeadersMaint}\n${personRowsMaint}`;

    if (type === 'all') {
      downloadCSV(orCsv, 'maintenance_operations_request.csv');
      downloadCSV(srCsv, 'maintenance_segment_requirements.csv');
      downloadCSV(mrCsv, 'maintenance_material_requirements.csv');
      downloadCSV(erCsv, 'maintenance_equipment_requirements.csv');
      downloadCSV(prCsv, 'maintenance_personnel_requirements.csv');
      if (employees.length > 0) {
        downloadCSV(personCsvMaint, 'person.csv');
      }
      showSnackbar('All maintenance plan data exported successfully', 'success');
    } else if (type === 'operations') {
      downloadCSV(orCsv, 'maintenance_operations_request.csv');
      showSnackbar('Maintenance operations request exported successfully', 'success');
    } else if (type === 'segments') {
      downloadCSV(srCsv, 'maintenance_segment_requirements.csv');
      showSnackbar('Maintenance segment requirements exported successfully', 'success');
    } else if (type === 'materials') {
      downloadCSV(mrCsv, 'maintenance_material_requirements.csv');
      showSnackbar('Maintenance material requirements exported successfully', 'success');
    } else if (type === 'equipment') {
      downloadCSV(erCsv, 'maintenance_equipment_requirements.csv');
      showSnackbar('Maintenance equipment requirements exported successfully', 'success');
    } else if (type === 'personnel') {
      downloadCSV(prCsv, 'maintenance_personnel_requirements.csv');
      showSnackbar('Maintenance personnel requirements exported successfully', 'success');
    }
  };

  const exportMaintenanceActualToCSV = (type: 'all' | 'response' | 'segments' | 'materials' | 'equipment' | 'personnel') => {
    if (!generatedMaintenanceResponse || maintenanceSegmentResponses.length === 0) {
      showSnackbar('No maintenance actual data to export', 'error');
      return;
    }

    const orCsv = `OperationsResponseID,OperationsRequestID,PlantID,ProductionLineID,Description,ActualStartDateTime,ActualEndDateTime,ActualQuantity,QuantityUoM,OperationsType,Status\n${generatedMaintenanceResponse.id},${generatedMaintenanceResponse.operationsRequestId},${generatedMaintenanceResponse.plantId},${generatedMaintenanceResponse.productionLineId},${generatedMaintenanceResponse.description},${generatedMaintenanceResponse.actualStartDateTime},${generatedMaintenanceResponse.actualEndDateTime},${generatedMaintenanceResponse.actualQuantity},${generatedMaintenanceResponse.quantityUoM},${generatedMaintenanceResponse.operationsType || ''},${generatedMaintenanceResponse.status}`;

    const srHeaders = 'SegmentResponseID,SegmentRequirementID,OperationsResponseID,ProcessSegmentID,EquipmentID,ActualStartDateTime,ActualEndDateTime,ActualQuantity,QuantityUoM,OperationsType,Status';
    const srRows = maintenanceSegmentResponses
      .map((sr) => `${sr.id},${sr.segmentRequirementId},${sr.operationsResponseId},${sr.processSegmentId},${sr.equipmentId || ''},${sr.actualStartDateTime},${sr.actualEndDateTime},${sr.actualQuantity},${sr.quantityUoM},${sr.operationsType || ''},${sr.status}`)
      .join('\n');
    const srCsv = `${srHeaders}\n${srRows}`;

    const maHeaders = 'SegmentMaterialActualID,SegmentResponseID,MaterialID,MaterialLotID,ActualQty,QtyUoM,Direction,OperationsType';
    const maRows = maintenanceMaterialActuals
      .map((ma) => `${ma.id},${ma.segmentResponseId},${ma.materialId},${ma.materialLotId},${ma.actualQty},${ma.qtyUoM},${ma.direction},${ma.operationsType || ''}`)
      .join('\n');
    const maCsv = `${maHeaders}\n${maRows}`;

    const eaHeaders = 'SegmentEquipmentActualID,SegmentResponseID,EquipmentID,ActualQuantity,UnitOfMeasure,ActualStartDateTime,ActualEndDateTime,OperationsType';
    const eaRows = maintenanceEquipmentActuals
      .map((ea) => `${ea.id},${ea.segmentResponseId},${ea.equipmentId},${ea.actualQuantity},${ea.unitOfMeasure || ''},${ea.actualStartDateTime},${ea.actualEndDateTime},${ea.operationsType || ''}`)
      .join('\n');
    const eaCsv = `${eaHeaders}\n${eaRows}`;

    const paHeaders = 'SegmentPersonnelActualID,SegmentResponseID,EmployeeID,PersonClassID,ActualQuantity,QuantityUnitOfMeasure,PersonnelUse,ActualStartDateTime,ActualEndDateTime,OperationsType';
    const paRows = maintenancePersonnelActuals
      .map((pa) => `${pa.id},${pa.segmentResponseId},${pa.employeeId || ''},${pa.personClassId || ''},${pa.actualQuantity},${pa.quantityUnitOfMeasure},${pa.personnelUse},${pa.actualStartDateTime},${pa.actualEndDateTime},${pa.operationsType || ''}`)
      .join('\n');
    const paCsv = `${paHeaders}\n${paRows}`;

    // Export Person (from employees) for maintenance actuals
    const personHeadersMaintAct = 'PersonID,Name,PersonClassID';
    const personRowsMaintAct = employees.map(e =>
      `${e.id},${e.employeeName},${e.personClassId || ''}`
    ).join('\n');
    const personCsvMaintAct = `${personHeadersMaintAct}\n${personRowsMaintAct}`;

    if (type === 'all') {
      downloadCSV(orCsv, 'maintenance_operations_response.csv');
      downloadCSV(srCsv, 'maintenance_segment_responses.csv');
      downloadCSV(maCsv, 'maintenance_material_actuals.csv');
      downloadCSV(eaCsv, 'maintenance_equipment_actuals.csv');
      downloadCSV(paCsv, 'maintenance_personnel_actuals.csv');
      if (employees.length > 0) {
        downloadCSV(personCsvMaintAct, 'person.csv');
      }
      showSnackbar('All maintenance actual data exported successfully', 'success');
    } else if (type === 'response') {
      downloadCSV(orCsv, 'maintenance_operations_response.csv');
      showSnackbar('Maintenance operations response exported successfully', 'success');
    } else if (type === 'segments') {
      downloadCSV(srCsv, 'maintenance_segment_responses.csv');
      showSnackbar('Maintenance segment responses exported successfully', 'success');
    } else if (type === 'materials') {
      downloadCSV(maCsv, 'maintenance_material_actuals.csv');
      showSnackbar('Maintenance material actuals exported successfully', 'success');
    } else if (type === 'equipment') {
      downloadCSV(eaCsv, 'maintenance_equipment_actuals.csv');
      showSnackbar('Maintenance equipment actuals exported successfully', 'success');
    } else if (type === 'personnel') {
      downloadCSV(paCsv, 'maintenance_personnel_actuals.csv');
      showSnackbar('Maintenance personnel actuals exported successfully', 'success');
    }
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportAllSavedPlanData = async () => {
    if (savedOperationsRequests.length === 0) {
      showSnackbar('No saved plan data to export', 'error');
      return;
    }

    try {
      // Load all segment requirements, material requirements, equipment requirements, and personnel requirements from database
      const allSegmentRequirements = await processDataApi.getAll('segmentRequirements');
      const allMaterialRequirements = await processDataApi.getAll('segmentMaterialRequirements');
      const allEquipmentRequirements = await processDataApi.getAll('segmentEquipmentRequirements');
      const allPersonnelRequirements = await processDataApi.getAll('segmentPersonnelRequirements');

      // Export Operations Requests
      const orHeaders = 'OperationsRequestID,Description,PlantID,LineID,ProductMaterialID,PlannedQuantity,QuantityUoM,PlannedStartDateTime,PlannedEndDateTime,Priority,Status';
      const orRows = savedOperationsRequests.map(req => 
        `${req.id},${req.description},${req.plantId},${req.lineId},${req.productMaterialId},${req.plannedQuantity},${req.quantityUoM},${req.plannedStartDateTime},${req.plannedEndDateTime},${req.priority},${req.status}`
      ).join('\n');
      const orCsv = `${orHeaders}\n${orRows}`;

      // Export Segment Requirements
      const srHeaders = 'SegmentRequirementID,OperationsRequestID,ProcessSegmentID,Sequence,EarliestStartDateTime,LatestEndDateTime,TargetQuantity,QuantityUoM';
      const srRows = allSegmentRequirements.map(sr => 
        `${sr.id},${sr.operationsRequestId},${sr.processSegmentId},${sr.sequence},${sr.earliestStartDateTime},${sr.latestEndDateTime},${sr.targetQuantity},${sr.quantityUoM}`
      ).join('\n');
      const srCsv = `${srHeaders}\n${srRows}`;

      // Export Material Requirements
      const mrHeaders = 'SegmentMaterialReqID,SegmentRequirementID,MaterialID,RequiredQty,QtyUoM,RequirementType';
      const mrRows = allMaterialRequirements.map(mr => 
        `${mr.id},${mr.segmentRequirementId},${mr.materialId},${mr.requiredQty},${mr.qtyUoM},${mr.requirementType}`
      ).join('\n');
      const mrCsv = `${mrHeaders}\n${mrRows}`;

      // Export Equipment Requirements
      const erHeaders = 'SegmentEquipmentReqID,SegmentRequirementID,LineID,EquipmentClassID,EquipmentID,RequirementType,PlannedQuantity,UnitOfMeasure';
      const erRows = allEquipmentRequirements.map(er => 
        `${er.id},${er.segmentRequirementId},${er.lineId},${er.equipmentClassId},${er.equipmentId},${er.requirementType},${er.plannedQuantity},${er.unitOfMeasure || ''}`
      ).join('\n');
      const erCsv = `${erHeaders}\n${erRows}`;

      const prHeaders = 'SegmentPersonnelReqID,SegmentRequirementID,EmployeeID,PersonClassID,Quantity,QuantityUnitOfMeasure,PersonnelUse';
      const prRows = allPersonnelRequirements.map(pr => 
        `${pr.id},${pr.segmentRequirementId},${pr.employeeId || ''},${pr.personClassId || ''},${pr.quantity},${pr.quantityUnitOfMeasure},${pr.personnelUse}`
      ).join('\n');
      const prCsv = `${prHeaders}\n${prRows}`;

      // Download all files
      downloadCSV(orCsv, 'all_operations_requests.csv');
      downloadCSV(srCsv, 'all_segment_requirements.csv');
      downloadCSV(mrCsv, 'all_segment_material_requirements.csv');
      downloadCSV(erCsv, 'all_segment_equipment_requirements.csv');
      downloadCSV(prCsv, 'all_segment_personnel_requirements.csv');

      showSnackbar(`Exported ${savedOperationsRequests.length} operations requests with all related data`, 'success');
    } catch (error) {
      console.error('Failed to export plan data:', error);
      showSnackbar('Failed to export plan data', 'error');
    }
  };

  const exportAllPlanDataAsJSON = async () => {
    if (savedOperationsRequests.length === 0) {
      showSnackbar('No saved plan data to export', 'error');
      return;
    }

    try {
      // Load all plan data from database
      const allSegmentRequirements = await processDataApi.getAll('segmentRequirements');
      const allMaterialRequirements = await processDataApi.getAll('segmentMaterialRequirements');
      const allEquipmentRequirements = await processDataApi.getAll('segmentEquipmentRequirements');
      const allPersonnelRequirements = await processDataApi.getAll('segmentPersonnelRequirements');

      // Create a single JSON object with all plan data
      const planDataExport = {
        exportDate: new Date().toISOString(),
        dataType: 'ISA95_Plan_Data',
        version: '1.0',
        operationsRequests: savedOperationsRequests,
        segmentRequirements: allSegmentRequirements,
        segmentMaterialRequirements: allMaterialRequirements,
        segmentEquipmentRequirements: allEquipmentRequirements,
        segmentPersonnelRequirements: allPersonnelRequirements
      };

      // Convert to JSON and download
      const jsonString = JSON.stringify(planDataExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plan_data_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);

      showSnackbar(`Exported ${savedOperationsRequests.length} operations requests as JSON`, 'success');
    } catch (error) {
      console.error('Failed to export plan data as JSON:', error);
      showSnackbar('Failed to export plan data as JSON', 'error');
    }
  };

  const importPlanDataFromJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const text = await file.text();
      const planDataImport = JSON.parse(text);

      // Validate the import structure
      if (!planDataImport.dataType || planDataImport.dataType !== 'ISA95_Plan_Data') {
        throw new Error('Invalid plan data file format');
      }

      // Import operations requests
      for (const req of planDataImport.operationsRequests) {
        await processDataApi.add('operationsRequests', req);
      }

      // Import segment requirements
      for (const sr of planDataImport.segmentRequirements) {
        await processDataApi.add('segmentRequirements', sr);
      }

      // Import material requirements
      for (const mr of planDataImport.segmentMaterialRequirements) {
        await processDataApi.add('segmentMaterialRequirements', mr);
      }

      // Import equipment requirements
      for (const er of planDataImport.segmentEquipmentRequirements) {
        await processDataApi.add('segmentEquipmentRequirements', er);
      }

      // Import personnel requirements
      for (const pr of (planDataImport.segmentPersonnelRequirements || [])) {
        await processDataApi.add('segmentPersonnelRequirements', pr);
      }

      // Reload saved operations requests
      await loadSavedOperationsRequests();

      setLoading(false);
      showSnackbar(`Imported ${planDataImport.operationsRequests.length} operations requests successfully`, 'success');
    } catch (error) {
      console.error('Failed to import plan data:', error);
      showSnackbar('Failed to import plan data. Please check the file format.', 'error');
      setLoading(false);
    }

    // Reset file input
    event.target.value = '';
  };

  const exportToExcel = () => {
    if (!generatedOperationsRequest || segmentRequirements.length === 0) {
      showSnackbar('No data to export', 'error');
      return;
    }

    try {
      const workbook = XLSX.utils.book_new();

      // Operations Request Sheet
      const orData = [{
        'Operations Request ID': generatedOperationsRequest.id,
        'Description': generatedOperationsRequest.description,
        'Plant ID': generatedOperationsRequest.plantId,
        'Line ID': generatedOperationsRequest.lineId,
        'Product Material ID': generatedOperationsRequest.productMaterialId,
        'Planned Quantity': generatedOperationsRequest.plannedQuantity,
        'Quantity UoM': generatedOperationsRequest.quantityUoM,
        'Planned Start Date Time': generatedOperationsRequest.plannedStartDateTime,
        'Planned End Date Time': generatedOperationsRequest.plannedEndDateTime,
        'Priority': generatedOperationsRequest.priority,
        'Status': generatedOperationsRequest.status
      }];
      const orSheet = XLSX.utils.json_to_sheet(orData);
      XLSX.utils.book_append_sheet(workbook, orSheet, 'Operations Request');

      // Segment Requirements Sheet
      const srData = segmentRequirements.map(sr => {
        const segment = processSegments.find(ps => ps.id === sr.processSegmentId);
        return {
          'Segment Requirement ID': sr.id,
          'Operations Request ID': sr.operationsRequestId,
          'Process Segment ID': sr.processSegmentId,
          'Process Segment Name': segment?.name || '',
          'Sequence': sr.sequence,
          'Earliest Start Date Time': sr.earliestStartDateTime,
          'Latest End Date Time': sr.latestEndDateTime,
          'Target Quantity': sr.targetQuantity,
          'Quantity UoM': sr.quantityUoM
        };
      });
      const srSheet = XLSX.utils.json_to_sheet(srData);
      XLSX.utils.book_append_sheet(workbook, srSheet, 'Segment Requirements');

      // Material Requirements Sheet
      const mrData = materialRequirements.map(mr => {
        const material = materials.find(m => m.id === mr.materialId);
        return {
          'Segment Material Req ID': mr.id,
          'Segment Requirement ID': mr.segmentRequirementId,
          'Material ID': mr.materialId,
          'Material Name': material?.name || '',
          'Required Qty': mr.requiredQty,
          'Qty UoM': mr.qtyUoM,
          'Requirement Type': mr.requirementType
        };
      });
      const mrSheet = XLSX.utils.json_to_sheet(mrData);
      XLSX.utils.book_append_sheet(workbook, mrSheet, 'Material Requirements');

      // Equipment Requirements Sheet
      const erData = equipmentRequirements.map(er => {
        const equipmentItem = equipment.find(e => e.id === er.equipmentId);
        return {
          'Segment Equipment Req ID': er.id,
          'Segment Requirement ID': er.segmentRequirementId,
          'Line ID': er.lineId,
          'Equipment Class ID': er.equipmentClassId,
          'Equipment ID': er.equipmentId,
          'Equipment Name': equipmentItem?.name || '',
          'Requirement Type': er.requirementType,
          'Planned Quantity': er.plannedQuantity
        };
      });
      const erSheet = XLSX.utils.json_to_sheet(erData);
      XLSX.utils.book_append_sheet(workbook, erSheet, 'Equipment Requirements');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `Plan_Data_${generatedOperationsRequest.id}_${timestamp}.xlsx`;

      // Write the file
      XLSX.writeFile(workbook, filename);
      showSnackbar('Plan data exported to Excel successfully', 'success');
    } catch (error) {
      console.error('Failed to export to Excel:', error);
      showSnackbar('Failed to export to Excel', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      description: '',
      plantId: '',
      lineId: '',
      productMaterialId: '',
      plannedQuantity: 0,
      quantityUoM: 'EA',
      plannedStartDateTime: '',
      plannedEndDateTime: '',
      priority: 1,
      status: 'Planned',
    });
    setGeneratedOperationsRequest(null);
    setSegmentRequirements([]);
    setMaterialRequirements([]);
    setEquipmentRequirements([]);
    setPersonnelRequirements([]);
    setGenerationTimestamp(null);
    setDataVersion(1);
  };

  const finishedProducts = materials.filter(m => m.classId === 'FINISHEDPRODUCT');
  const linesForPlant = productionLines.filter(pl => pl.plantId === formData.plantId);
  const allMaintenanceEquipmentOptions = (() => {
    const pickField = (obj: any, candidates: string[]): any => {
      if (!obj) return undefined;
      for (const key of candidates) {
        const val = obj[key];
        if (val !== undefined && val !== null && `${val}`.trim() !== '') return val;
      }
      const keys = Object.keys(obj);
      for (const candidate of candidates) {
        const match = keys.find((k) => k.toLowerCase() === candidate.toLowerCase());
        if (match) {
          const val = obj[match];
          if (val !== undefined && val !== null && `${val}`.trim() !== '') return val;
        }
      }
      return undefined;
    };

    const fromEquipment = equipment.map((eq: any) => ({
      id: pickField(eq, ['id', 'equipmentId', 'EquipmentID', 'EquipmentId']),
      name: pickField(eq, ['name', 'equipmentName', 'EquipmentName', 'id', 'equipmentId', 'EquipmentID', 'EquipmentId']),
      raw: eq,
    }));

    const knownIds = new Set(fromEquipment.map((e: any) => e.id).filter(Boolean));
    const fromLineEquipmentOnly = lineEquipment
      .map((le: any) => pickField(le, ['equipmentId', 'EquipmentID', 'EquipmentId']))
      .filter((id: any) => !!id && !knownIds.has(id))
      .map((id: any) => ({ id, name: id, raw: { id, name: id } }));

    return [...fromEquipment, ...fromLineEquipmentOnly]
      .filter((e: any) => !!e.id)
      .map((e: any) => ({ ...e.raw, id: e.id, name: e.name }));
  })();

  const maintenanceEquipmentForPlant = (() => {
    const pickField = (obj: any, candidates: string[]): any => {
      if (!obj) return undefined;
      for (const key of candidates) {
        const val = obj[key];
        if (val !== undefined && val !== null && `${val}`.trim() !== '') return val;
      }
      const keys = Object.keys(obj);
      for (const candidate of candidates) {
        const match = keys.find((k) => k.toLowerCase() === candidate.toLowerCase());
        if (match) {
          const val = obj[match];
          if (val !== undefined && val !== null && `${val}`.trim() !== '') return val;
        }
      }
      return undefined;
    };

    const selectedPlantId = maintenancePlanFormData.plantId;
    if (!selectedPlantId) return [] as any[];

    const lineIdsForPlant = new Set(
      productionLines
        .filter((line: any) => pickField(line, ['plantId', 'PlantID', 'PlantId']) === selectedPlantId)
        .map((line: any) => pickField(line, ['id', 'lineId', 'LineID', 'LineId']))
        .filter(Boolean)
    );

    const equipmentIdsFromLineEquipment = new Set(
      lineEquipment
        .filter((le: any) => {
          const lePlantId = pickField(le, ['plantId', 'PlantID', 'PlantId']);
          const leLineId = pickField(le, ['productionLineId', 'lineId', 'LineID', 'LineId', 'ProductionLineId']);
          return lePlantId === selectedPlantId || (!!leLineId && lineIdsForPlant.has(leLineId));
        })
        .map((le: any) => pickField(le, ['equipmentId', 'EquipmentID', 'EquipmentId']))
        .filter(Boolean)
    );

    const hasDirectPlantMapping = equipment.some((eq: any) => pickField(eq, ['plantId', 'PlantID', 'PlantId']) === selectedPlantId);

    const filtered = equipment.filter((eq: any) => {
      const eqId = pickField(eq, ['id', 'equipmentId', 'EquipmentID', 'EquipmentId']);
      const directPlantMatch = pickField(eq, ['plantId', 'PlantID', 'PlantId']) === selectedPlantId;
      const lineEquipmentMatch = !!eqId && equipmentIdsFromLineEquipment.has(eqId);

      if (hasDirectPlantMapping || equipmentIdsFromLineEquipment.size > 0) {
        return directPlantMatch || lineEquipmentMatch;
      }

      // Fallback for datasets that do not contain plant/line mappings on equipment tables.
      return true;
    });

    const seen = new Set<string>();
    const deduped = filtered.filter((eq: any) => {
      const id = pickField(eq, ['id', 'equipmentId', 'EquipmentID', 'EquipmentId']);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    if (deduped.length > 0) return deduped;

    // Fallback: if equipment records are missing, surface IDs from line-equipment mapping.
    if (equipmentIdsFromLineEquipment.size > 0) {
      return Array.from(equipmentIdsFromLineEquipment).map((id) => ({ id, name: id }));
    }

    // Final safety net: allow selecting from all known equipment options.
    return allMaintenanceEquipmentOptions;
  })();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Box sx={{ width: '100%', maxWidth: 640, px: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <CircularProgress />
          </Box>
          <Typography variant="body1" align="center" gutterBottom>
            {saveProgress.active ? 'Saving actual data to database...' : 'Loading data...'}
          </Typography>
          {saveProgress.active && (
            <>
              <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
                Step {saveProgress.currentStep} of {saveProgress.totalSteps}: {saveProgress.currentEntity}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={saveProgress.totalSteps > 0 ? (saveProgress.currentStep / saveProgress.totalSteps) * 100 : 0}
                sx={{ mb: 2 }}
              />
              <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
                Saved records: {saveProgress.recordsSaved}
              </Typography>
              {saveProgress.perEntity.length > 0 && (
                <Box sx={{ mt: 1, maxHeight: 180, overflowY: 'auto', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  {saveProgress.perEntity.map((item) => (
                    <Typography key={item.entity} variant="caption" display="block">
                      {item.entity}: {item.saved} saved
                    </Typography>
                  ))}
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Process Data Generator
        </Typography>
        <Box>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={cleanupPlanData}
            sx={{ mr: 1 }}
            size="small"
          >
            Clear Plan
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<DeleteIcon />}
            onClick={cleanupOrphanedPlanRecords}
            sx={{ mr: 1 }}
            size="small"
          >
            Clean Orphaned
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={cleanupActualData}
            sx={{ mr: 1 }}
            size="small"
          >
            Clear Actual
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<UploadIcon />}
            onClick={backfillOperationsEventArtifactsForExistingData}
            sx={{ mr: 1 }}
            size="small"
          >
            Backfill OER/OEE
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<UploadIcon />}
            onClick={backfillCrewSegmentData}
            sx={{ mr: 1 }}
            size="small"
          >
            Backfill CREW Segment Data
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<UploadIcon />}
            onClick={backfillPersonnelRequirementsForExistingData}
            sx={{ mr: 1 }}
            size="small"
          >
            Backfill Personnel Requirements
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<UploadIcon />}
            onClick={backfillPersonnelActualsForExistingData}
            sx={{ mr: 1 }}
            size="small"
          >
            Backfill Personnel Actuals
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={
              mainTab === 0
                ? (activeTab === 0 ? resetForm : resetActualData)
                : (maintenanceActiveTab === 0 ? resetMaintenancePlan : maintenanceActiveTab === 1 ? resetMaintenanceActual : resetUnplannedMaintenance)
            }
            sx={{ mr: 1 }}
          >
            Reset
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={
              mainTab === 0
                ? (activeTab === 0 ? saveToDatabase : saveActualToDatabase)
                : (maintenanceActiveTab === 0 ? saveMaintenancePlanToDatabase : maintenanceActiveTab === 1 ? saveMaintenanceActualToDatabase : saveUnplannedMaintenanceToDatabase)
            }
            disabled={
              mainTab === 0
                ? (activeTab === 0 ? segmentRequirements.length === 0 : segmentResponses.length === 0)
                : (maintenanceActiveTab === 0 ? maintenanceSegmentRequirements.length === 0 : maintenanceActiveTab === 1 ? maintenanceSegmentResponses.length === 0 : !generatedUnplannedSegmentResponse)
            }
            sx={{ mr: 1 }}
          >
            Save to DB
          </Button>
          {mainTab === 0 && (
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => activeTab === 0 ? exportToCSV('all') : exportActualToCSV('all')}
              disabled={activeTab === 0 ? segmentRequirements.length === 0 : segmentResponses.length === 0}
              sx={{ mr: 1 }}
            >
              Export All CSV
            </Button>
          )}
          {mainTab === 0 && activeTab === 0 && (
            <Button
              variant="contained"
              color="success"
              startIcon={<GetAppIcon />}
              onClick={exportToExcel}
              disabled={segmentRequirements.length === 0}
            >
              Export to Excel
            </Button>
          )}
        </Box>
      </Box>

      <Tabs value={mainTab} onChange={(e, newValue) => setMainTab(newValue)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tab label="Production" />
        <Tab label="Maintenance" />
      </Tabs>

      {mainTab === 0 && (
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tab label="📋 Plan Data" />
          <Tab label="✅ Actual Data" />
        </Tabs>
      )}

      {/* Plan Data Tab */}
      {mainTab === 0 && activeTab === 0 && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            Generate process data based on operations requests. Select a product and production line to automatically create 
            segment requirements with material and equipment requirements based on master data (BOMs, equipment usage, capacities).
          </Alert>

          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Automated Batch Generation (Plan + Actual)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create multiple days of plan and actual production in one run. The generator chooses random products and splits orders by available line capacity.
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={batchStartDate}
                  onChange={(e) => setBatchStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={batchEndDate}
                  onChange={(e) => setBatchEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Plant</InputLabel>
                  <Select
                    value={batchPlantId}
                    label="Plant"
                    onChange={(e) => {
                      setBatchPlantId(e.target.value);
                      setBatchLineId('');
                    }}
                  >
                    {plants.map((p) => (
                      <MenuItem key={p.id} value={p.id}>{p.name || p.id}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Production Line</InputLabel>
                  <Select
                    value={batchLineId}
                    label="Production Line"
                    onChange={(e) => setBatchLineId(e.target.value)}
                    disabled={!batchPlantId}
                  >
                    <MenuItem value="">All lines in plant</MenuItem>
                    {productionLines
                      .filter((line) => line.plantId === batchPlantId)
                      .map((line) => (
                        <MenuItem key={line.id} value={line.id}>{line.name || line.lineName || line.id}</MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="secondary"
                    startIcon={<GenerateIcon />}
                    onClick={generateAutomatedBatchData}
                    disabled={loading}
                  >
                    Generate Batch Data
                  </Button>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControlLabel
                  control={<Switch checked={batchIncludeScrap} onChange={(e) => setBatchIncludeScrap(e.target.checked)} />}
                  label="Include scrap in actual data"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControlLabel
                  control={<Switch checked={batchIncludeDelays} onChange={(e) => setBatchIncludeDelays(e.target.checked)} />}
                  label="Include production and downtime delays"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Min Daily Orders"
                  type="number"
                  value={batchMinDailyOrders}
                  onChange={(e) => setBatchMinDailyOrders(Math.min(MAX_DAILY_ORDERS, Math.max(1, Number(e.target.value) || 1)))}
                  inputProps={{ min: 1, max: MAX_DAILY_ORDERS, step: 1 }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Max Daily Orders"
                  type="number"
                  value={batchMaxDailyOrders}
                  onChange={(e) => setBatchMaxDailyOrders(Math.min(MAX_DAILY_ORDERS, Math.max(1, Number(e.target.value) || 1)))}
                  inputProps={{ min: 1, max: MAX_DAILY_ORDERS, step: 1 }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Target Utilization %"
                  type="number"
                  value={batchTargetUtilizationPercent}
                  onChange={(e) => setBatchTargetUtilizationPercent(Math.min(MAX_UTILIZATION_PERCENT, Math.max(1, Number(e.target.value) || 1)))}
                  inputProps={{ min: 1, max: MAX_UTILIZATION_PERCENT, step: 1 }}
                  helperText={`100% means ~daily line capacity (max ${MAX_UTILIZATION_PERCENT}%)`}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Plan Data Overview */}
          {savedOperationsRequests.length > 0 && (
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.lighter' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  📊 Saved Plan Data Overview
                </Typography>
                <Box>
                  <input
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    id="import-plan-json-file"
                    onChange={importPlanDataFromJSON}
                  />
                  <label htmlFor="import-plan-json-file">
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      component="span"
                      startIcon={<UploadIcon />}
                      sx={{ mr: 1 }}
                    >
                      Import JSON
                    </Button>
                  </label>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    startIcon={<DownloadIcon />}
                    onClick={exportAllPlanDataAsJSON}
                    sx={{ mr: 1 }}
                  >
                    Export JSON
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    startIcon={<DownloadIcon />}
                    onClick={exportAllSavedPlanData}
                    sx={{ mr: 1 }}
                  >
                    Export CSV
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setPlanDataExpanded(!planDataExpanded)}
                    variant="outlined"
                  >
                    {planDataExpanded ? 'Collapse' : 'Expand All'}
                  </Button>
                </Box>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {planDataExpanded && (
                <Box sx={{ mb: 2 }}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Filter Operations Requests"
                    placeholder="Search by ID, description, or product..."
                    value={planDataFilter}
                    onChange={(e) => setPlanDataFilter(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                </Box>
              )}
              
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Operations Requests:</strong> {savedOperationsRequests.filter(req => 
                      !planDataFilter || 
                      req.id?.toLowerCase().includes(planDataFilter.toLowerCase()) ||
                      req.description?.toLowerCase().includes(planDataFilter.toLowerCase()) ||
                      req.productMaterialId?.toLowerCase().includes(planDataFilter.toLowerCase())
                    ).length} {planDataFilter && `(filtered from ${savedOperationsRequests.length})`}
                  </Typography>
                  <Box sx={{ maxHeight: planDataExpanded ? 500 : 200, overflowY: 'auto', pr: 1 }}>
                    {savedOperationsRequests
                      .filter(req => 
                        !planDataFilter || 
                        req.id?.toLowerCase().includes(planDataFilter.toLowerCase()) ||
                        req.description?.toLowerCase().includes(planDataFilter.toLowerCase()) ||
                        req.productMaterialId?.toLowerCase().includes(planDataFilter.toLowerCase())
                      )
                      .slice(0, planDataExpanded ? undefined : 3)
                      .map((req) => {
                        const plant = plants.find(p => p.id === req.plantId);
                        const line = productionLines.find(l => l.id === req.lineId);
                        const product = materials.find(m => m.id === req.productMaterialId);
                        return (
                          <Box key={req.id} sx={{ ml: 2, mb: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1, position: 'relative' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" display="block">
                                  <strong>{req.id}</strong> - {req.description}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Product: {product?.name || req.productMaterialId} | Qty: {req.plannedQuantity} {req.quantityUoM}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Plant: {plant?.name || req.plantId} | Line: {line?.name || req.lineId}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {new Date(req.plannedStartDateTime).toLocaleString()} → {new Date(req.plannedEndDateTime).toLocaleString()}
                                </Typography>
                              </Box>
                              <Tooltip title="Delete this operations request">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => deleteOperationsRequest(req.id)}
                                  sx={{ ml: 1 }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                        );
                      })}
                  </Box>
                  {!planDataExpanded && savedOperationsRequests.length > 3 && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                      ...and {savedOperationsRequests.length - 3} more
                    </Typography>
                  )}
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Chip label={`${savedOperationsRequests.length} Requests`} color="primary" size="small" />
                    <Chip label="Saved in DB" color="success" size="small" />
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          )}

      <Grid container spacing={3}>
        {/* Operations Request Form */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Operations Request
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Produce Baguettes"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel>Plant</InputLabel>
                    <Select
                      value={formData.plantId}
                      label="Plant"
                      onChange={(e) => setFormData({ ...formData, plantId: e.target.value, lineId: '' })}
                    >
                      {plants.map((plant) => (
                        <MenuItem key={plant.id} value={plant.id}>
                          {plant.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth required disabled={!formData.plantId}>
                    <InputLabel>Production Line</InputLabel>
                    <Select
                      value={formData.lineId}
                      label="Production Line"
                      onChange={(e) => setFormData({ ...formData, lineId: e.target.value })}
                    >
                      {linesForPlant.map((line) => (
                        <MenuItem key={line.id} value={line.id}>
                          {line.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Product</InputLabel>
                    <Select
                      value={formData.productMaterialId}
                      label="Product"
                      onChange={(e) => setFormData({ ...formData, productMaterialId: e.target.value })}
                    >
                      {finishedProducts.map((product) => (
                        <MenuItem key={product.id} value={product.id}>
                          {product.name} ({product.defaultUoM})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Planned Quantity"
                    type="number"
                    required
                    value={formData.plannedQuantity}
                    onChange={(e) => setFormData({ ...formData, plannedQuantity: parseInt(e.target.value) || 0 })}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="UoM"
                    value={formData.quantityUoM}
                    onChange={(e) => setFormData({ ...formData, quantityUoM: e.target.value })}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Start Date/Time"
                    type="datetime-local"
                    required
                    value={formData.plannedStartDateTime}
                    onChange={(e) => setFormData({ ...formData, plannedStartDateTime: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="End Date/Time"
                    type="datetime-local"
                    required
                    value={formData.plannedEndDateTime}
                    onChange={(e) => setFormData({ ...formData, plannedEndDateTime: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid size={12}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={<GenerateIcon />}
                    onClick={generateProcessData}
                  >
                    Generate Process Data
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Generation Summary */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Generation Summary
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {segmentRequirements.length === 0 ? (
                <Alert severity="info">
                  Fill in the operations request form and click "Generate Process Data" to create segment requirements.
                </Alert>
              ) : (
                <Box>
                  {generationTimestamp && (
                    <Box sx={{ mb: 2, p: 1, bgcolor: 'info.lighter', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Generated: {generationTimestamp.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Version: {dataVersion}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Generated Data:
                    </Typography>
                    <Chip label={`${segmentRequirements.length} Segment Requirements`} color="primary" sx={{ mr: 1, mb: 1 }} />
                    <Chip label={`${materialRequirements.length} Material Requirements`} color="secondary" sx={{ mr: 1, mb: 1 }} />
                    <Chip label={`${equipmentRequirements.length} Equipment Requirements`} color="info" sx={{ mr: 1, mb: 1 }} />
                    <Chip label={`${personnelRequirements.length} Personnel Requirements`} color="warning" sx={{ mr: 1, mb: 1 }} />
                    <Chip label={`${operationsEventProperties.length} Event Properties`} color="warning" sx={{ mb: 1 }} />
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                    Process Segments:
                  </Typography>
                  {segmentRequirements.map((sr, idx) => {
                    const segment = processSegments.find(ps => ps.id === sr.processSegmentId);
                    const matReqs = materialRequirements.filter(mr => mr.segmentRequirementId === sr.id);
                    const eqReqs = equipmentRequirements.filter(er => er.segmentRequirementId === sr.id);
                    
                    return (
                      <Box key={sr.id} sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="subtitle2">
                          {idx + 1}. {segment?.name || sr.processSegmentId}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          {sr.earliestStartDateTime} → {sr.latestEndDateTime}
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <Chip label={`${matReqs.length} Materials`} size="small" sx={{ mr: 0.5 }} />
                          <Chip label={`${eqReqs.length} Equipment`} size="small" />
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Results Tables */}
      {segmentRequirements.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Generated Data Details
          </Typography>

          {/* Operations Request Table */}
          {generatedOperationsRequest && (
            <Paper sx={{ mb: 2 }}>
              <Box sx={{ p: 2, bgcolor: 'success.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1">Operations Request</Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<GetAppIcon />}
                  onClick={() => exportToCSV('operations')}
                  sx={{ color: 'white', borderColor: 'white' }}
                >
                  Export CSV
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Plant</TableCell>
                      <TableCell>Line</TableCell>
                      <TableCell>Product</TableCell>
                      <TableCell>Quantity</TableCell>
                      <TableCell>Start</TableCell>
                      <TableCell>End</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Operations Type</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>{generatedOperationsRequest.id}</TableCell>
                      <TableCell>{generatedOperationsRequest.description}</TableCell>
                      <TableCell>{generatedOperationsRequest.plantId}</TableCell>
                      <TableCell>{generatedOperationsRequest.lineId}</TableCell>
                      <TableCell>{generatedOperationsRequest.productMaterialId}</TableCell>
                      <TableCell>{generatedOperationsRequest.plannedQuantity} {generatedOperationsRequest.quantityUoM}</TableCell>
                      <TableCell>{generatedOperationsRequest.plannedStartDateTime}</TableCell>
                      <TableCell>{generatedOperationsRequest.plannedEndDateTime}</TableCell>
                      <TableCell>{generatedOperationsRequest.priority}</TableCell>
                      <TableCell>{generatedOperationsRequest.operationsType || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip label={generatedOperationsRequest.status} size="small" color="primary" />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
          
          {/* Segment Requirements Table */}
          <Paper sx={{ mb: 2 }}>
            <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1">Segment Requirements</Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<GetAppIcon />}
                onClick={() => exportToCSV('segments')}
                sx={{ color: 'white', borderColor: 'white' }}
              >
                Export CSV
              </Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Process Segment</TableCell>
                    <TableCell>Equipment ID</TableCell>
                    <TableCell>Sequence</TableCell>
                    <TableCell>Start</TableCell>
                    <TableCell>End</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Operations Type</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {segmentRequirements.map((sr) => {
                    const segment = processSegments.find(ps => ps.id === sr.processSegmentId);
                    return (
                      <TableRow key={sr.id}>
                        <TableCell>{sr.id}</TableCell>
                        <TableCell>{segment?.name || sr.processSegmentId}</TableCell>
                        <TableCell>{sr.equipmentId || 'N/A'}</TableCell>
                        <TableCell>{sr.sequence}</TableCell>
                        <TableCell>{sr.earliestStartDateTime}</TableCell>
                        <TableCell>{sr.latestEndDateTime}</TableCell>
                        <TableCell>{sr.targetQuantity} {sr.quantityUoM}</TableCell>
                        <TableCell>{sr.operationsType || 'N/A'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Material Requirements Table */}
          <Paper sx={{ mb: 2 }}>
            <Box sx={{ p: 2, bgcolor: 'secondary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1">Material Requirements</Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<GetAppIcon />}
                onClick={() => exportToCSV('materials')}
                sx={{ color: 'white', borderColor: 'white' }}
              >
                Export CSV
              </Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Segment Requirement</TableCell>
                    <TableCell>Material</TableCell>
                    <TableCell>Required Qty</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Operations Type</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {materialRequirements.map((mr) => {
                    const material = materials.find(m => m.id === mr.materialId);
                    return (
                      <TableRow key={mr.id}>
                        <TableCell>{mr.id}</TableCell>
                        <TableCell>{mr.segmentRequirementId}</TableCell>
                        <TableCell>{material?.name || mr.materialId}</TableCell>
                        <TableCell>{mr.requiredQty} {mr.qtyUoM}</TableCell>
                        <TableCell>
                          <Chip 
                            label={mr.requirementType} 
                            size="small" 
                            color={mr.requirementType === 'Output' ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>{mr.operationsType || 'N/A'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Equipment Requirements Table */}
          <Paper>
            <Box sx={{ p: 2, bgcolor: 'info.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1">Equipment Requirements</Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<GetAppIcon />}
                onClick={() => exportToCSV('equipment')}
                sx={{ color: 'white', borderColor: 'white' }}
              >
                Export CSV
              </Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Segment Requirement</TableCell>
                    <TableCell>Equipment</TableCell>
                    <TableCell>Class</TableCell>
                    <TableCell>Planned Quantity</TableCell>
                    <TableCell>UoM</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Operations Type</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {equipmentRequirements.map((er) => {
                    const equipmentItem = equipment.find(e => e.id === er.equipmentId);
                    return (
                      <TableRow key={er.id}>
                        <TableCell>{er.id}</TableCell>
                        <TableCell>{er.segmentRequirementId}</TableCell>
                        <TableCell>{equipmentItem?.id || er.equipmentId}</TableCell>
                        <TableCell>{er.equipmentClassId}</TableCell>
                        <TableCell>{er.plannedQuantity.toFixed(2)}</TableCell>
                        <TableCell>{er.unitOfMeasure || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip label={er.requirementType} size="small" color="info" />
                        </TableCell>
                        <TableCell>{er.operationsType || 'N/A'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Personnel Requirements Table */}
          <Paper>
            <Box sx={{ p: 2, bgcolor: 'secondary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1">Personnel Requirements</Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Segment Requirement</TableCell>
                    <TableCell>Person Class</TableCell>
                    <TableCell>Employee</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>UoM</TableCell>
                    <TableCell>Personnel Use</TableCell>
                    <TableCell>Operations Type</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {personnelRequirements.map((pr) => {
                    const personClass = personClasses.find(pc => pc.id === pr.personClassId);
                    const employee = pr.employeeId ? employees.find(e => e.id === pr.employeeId) : undefined;
                    return (
                      <TableRow key={pr.id}>
                        <TableCell>{pr.id}</TableCell>
                        <TableCell>{pr.segmentRequirementId}</TableCell>
                        <TableCell>{personClass?.name || pr.personClassId || 'N/A'}</TableCell>
                        <TableCell>{employee?.employeeName || pr.employeeId || 'N/A'}</TableCell>
                        <TableCell>{pr.quantity}</TableCell>
                        <TableCell>{pr.quantityUnitOfMeasure || 'Person'}</TableCell>
                        <TableCell>
                          <Chip label={pr.personnelUse} size="small" color="secondary" />
                        </TableCell>
                        <TableCell>{pr.operationsType || 'N/A'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}
        </Box>
      )}

      {/* Actual Data Tab */}
      {mainTab === 0 && activeTab === 1 && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            Generate actual production data based on saved operations requests. Select an operations request and enter the actual quantity produced.
          </Alert>

          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Automated Batch Generation (Plan + Actual)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Use the same batch controls here to auto-generate both plan and actual data over a date range.
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={batchStartDate}
                  onChange={(e) => setBatchStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={batchEndDate}
                  onChange={(e) => setBatchEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Plant</InputLabel>
                  <Select
                    value={batchPlantId}
                    label="Plant"
                    onChange={(e) => {
                      setBatchPlantId(e.target.value);
                      setBatchLineId('');
                    }}
                  >
                    {plants.map((p) => (
                      <MenuItem key={p.id} value={p.id}>{p.name || p.id}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Production Line</InputLabel>
                  <Select
                    value={batchLineId}
                    label="Production Line"
                    onChange={(e) => setBatchLineId(e.target.value)}
                    disabled={!batchPlantId}
                  >
                    <MenuItem value="">All lines in plant</MenuItem>
                    {productionLines
                      .filter((line) => line.plantId === batchPlantId)
                      .map((line) => (
                        <MenuItem key={line.id} value={line.id}>{line.name || line.lineName || line.id}</MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="secondary"
                    startIcon={<GenerateIcon />}
                    onClick={generateAutomatedBatchData}
                    disabled={loading}
                  >
                    Generate Batch Data
                  </Button>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControlLabel
                  control={<Switch checked={batchIncludeScrap} onChange={(e) => setBatchIncludeScrap(e.target.checked)} />}
                  label="Include scrap in actual data"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControlLabel
                  control={<Switch checked={batchIncludeDelays} onChange={(e) => setBatchIncludeDelays(e.target.checked)} />}
                  label="Include production and downtime delays"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Min Daily Orders"
                  type="number"
                  value={batchMinDailyOrders}
                  onChange={(e) => setBatchMinDailyOrders(Math.min(MAX_DAILY_ORDERS, Math.max(1, Number(e.target.value) || 1)))}
                  inputProps={{ min: 1, max: MAX_DAILY_ORDERS, step: 1 }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Max Daily Orders"
                  type="number"
                  value={batchMaxDailyOrders}
                  onChange={(e) => setBatchMaxDailyOrders(Math.min(MAX_DAILY_ORDERS, Math.max(1, Number(e.target.value) || 1)))}
                  inputProps={{ min: 1, max: MAX_DAILY_ORDERS, step: 1 }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Target Utilization %"
                  type="number"
                  value={batchTargetUtilizationPercent}
                  onChange={(e) => setBatchTargetUtilizationPercent(Math.min(MAX_UTILIZATION_PERCENT, Math.max(1, Number(e.target.value) || 1)))}
                  inputProps={{ min: 1, max: MAX_UTILIZATION_PERCENT, step: 1 }}
                  helperText={`100% means ~daily line capacity (max ${MAX_UTILIZATION_PERCENT}%)`}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Actual Data Overview */}
          {(savedOperationsRequests.length > 0 || (storedActualSummary.operationsResponses || 0) > 0 || generatedOperationsResponse || isStoredActualDataLoading || !hasLoadedStoredActualData) && (
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'success.lighter' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  📊 Actual Data Overview (Stored in Database)
                </Typography>
                <Button
                  size="small"
                  onClick={() => setActualDataExpanded(!actualDataExpanded)}
                  variant="outlined"
                >
                  {actualDataExpanded ? 'Collapse' : 'Expand All'}
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {actualDataExpanded && (storedActualSummary.operationsResponses || 0) > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Filter by Operations Response ID"
                        placeholder="Search by response ID..."
                        value={actualDataFilter}
                        onChange={(e) => setActualDataFilter(e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Material Actuals Filter</InputLabel>
                        <Select
                          value={materialActualsFilter}
                          label="Material Actuals Filter"
                          onChange={(e) => setMaterialActualsFilter(e.target.value as any)}
                        >
                          <MenuItem value="ALL">All Materials</MenuItem>
                          <MenuItem value="CONSUME">Consumed Only</MenuItem>
                          <MenuItem value="PRODUCE">Produced Only</MenuItem>
                          <MenuItem value="Scrap">Scrap Only</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Box>
              )}
              
              <Grid container spacing={2}>
                {/* Available Plan Data */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    Available Operations Requests (Plan):
                  </Typography>
                  <Typography variant="body2" color="text.primary" gutterBottom>
                    <strong>{savedOperationsRequests.length}</strong> requests saved in database
                  </Typography>
                  <Box sx={{ maxHeight: actualDataExpanded ? 400 : 150, overflowY: 'auto', pr: 1 }}>
                    {savedOperationsRequests.slice(0, actualDataExpanded ? undefined : 2).map((req) => {
                      const plant = plants.find(p => p.id === req.plantId);
                      const line = productionLines.find(l => l.id === req.lineId);
                      const product = materials.find(m => m.id === req.productMaterialId);
                      return (
                        <Box key={req.id} sx={{ ml: 2, mb: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                          <Typography variant="caption" display="block">
                            <strong>{req.id}</strong> - {req.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Product: {product?.name || req.productMaterialId} | Qty: {req.plannedQuantity} {req.quantityUoM}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Plant: {plant?.name || req.plantId} | Line: {line?.name || req.lineId}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                  {!actualDataExpanded && savedOperationsRequests.length > 2 && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 2, display: 'block', mt: 1 }}>
                      ...and {savedOperationsRequests.length - 2} more
                    </Typography>
                  )}
                </Grid>

                {/* Stored Actual Data from Database */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    Stored Actual Data (Database):
                  </Typography>
                  {isStoredActualDataLoading || !hasLoadedStoredActualData ? (
                    <Typography variant="body2" color="text.secondary">
                      Loading saved actual data overview...
                    </Typography>
                  ) : (storedActualSummary.operationsResponses || 0) > 0 ? (
                    <Box>
                      <Typography variant="body2" color="text.primary" gutterBottom>
                        <strong>{storedActualSummary.operationsResponses || 0}</strong> operations responses stored
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                        <Chip label={`${storedActualSummary.operationsResponses || 0} Responses`} size="small" color="primary" />
                        <Chip label={`${storedActualSummary.segmentResponses || 0} Segments`} size="small" color="success" />
                        <Chip label={`${storedActualSummary.segmentMaterialActuals || 0} Materials`} size="small" color="warning" />
                        <Chip label={`${storedActualSummary.segmentEquipmentActuals || 0} Equipment`} size="small" color="info" />
                        <Chip label={`${storedActualSummary.segmentPersonnelActuals || 0} Personnel`} size="small" color="secondary" />
                        <Chip label={`${storedActualSummary.operationsEvents || 0} Events`} size="small" color="error" />
                        <Chip label={`${storedActualSummary.operationsEventRecords || 0} Event Records`} size="small" color="warning" />
                        <Chip label={`${storedActualSummary.operationsEventEntries || 0} Event Entries`} size="small" color="warning" />
                        <Chip label={`${storedActualSummary.operationsEventProperties || 0} Event Properties`} size="small" color="warning" />
                        <Chip label={`${storedActualSummary.segmentData || 0} Shifts/Crews`} size="small" color="secondary" />
                        <Chip label={`${storedActualSummary.testResults || 0} Tests`} size="small" color="default" />
                        <Chip label={`${storedActualSummary.equipmentPropertyTracking || 0} Property Tracking`} size="small" color="secondary" />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Summary only view. Detailed stored records are not loaded into browser memory.
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No actual data stored in database yet. Generate and save actual data to see it here.
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </Paper>
          )}

          <Grid container spacing={3}>
            {/* Actual Data Form */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Generate Actual Data
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Grid container spacing={2}>
                    <Grid size={12}>
                      <FormControl fullWidth required>
                        <InputLabel>Operations Request</InputLabel>
                        <Select
                          value={selectedOperationsRequestId}
                          label="Operations Request"
                          onChange={(e) => {
                            setSelectedOperationsRequestId(e.target.value);
                            const selected = savedOperationsRequests.find(or => or.id === e.target.value);
                            if (selected) {
                              setActualProductQuantity(selected.plannedQuantity);
                            }
                          }}
                        >
                          {savedOperationsRequests.map((or) => (
                            <MenuItem key={or.id} value={or.id}>
                              {or.id} - {or.description} ({or.plannedQuantity} {or.quantityUoM})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    {selectedOperationsRequestId && (
                      <>
                        <Grid size={12}>
                          <Button
                            fullWidth
                            variant="outlined"
                            color="info"
                            onClick={checkOperationsRequestData}
                            startIcon={<RefreshIcon />}
                          >
                            Check Operations Request Data
                          </Button>
                        </Grid>
                        <Grid size={12}>
                          <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
                            Click "Check Operations Request Data" to verify that this operations request has segment requirements before generating actual data.
                          </Alert>
                        </Grid>
                      </>
                    )}

                    {selectedOperationsRequestId && (
                      <>
                        <Grid size={12}>
                          <Alert severity="info">
                            Selected: {savedOperationsRequests.find(or => or.id === selectedOperationsRequestId)?.description}
                          </Alert>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 8 }}>
                          <TextField
                            fullWidth
                            label="Actual Product Quantity"
                            type="number"
                            required
                            value={actualProductQuantity}
                            onChange={(e) => setActualProductQuantity(parseInt(e.target.value) || 0)}
                          />
                        </Grid>

                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField
                            fullWidth
                            label="UoM"
                            disabled
                            value={savedOperationsRequests.find(or => or.id === selectedOperationsRequestId)?.quantityUoM || 'EA'}
                          />
                        </Grid>

                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField
                            fullWidth
                            label="Scrap Produced %"
                            type="number"
                            value={scrapProducedPercent}
                            onChange={(e) => setScrapProducedPercent(parseFloat(e.target.value) || 0)}
                            inputProps={{ min: 0, max: 100, step: 0.1 }}
                          />
                        </Grid>

                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField
                            fullWidth
                            label="Start Delay (minutes)"
                            type="number"
                            value={productionDelayMinutes}
                            onChange={(e) => setProductionDelayMinutes(parseInt(e.target.value) || 0)}
                            inputProps={{ min: 0, step: 1 }}
                            helperText="Delay before starting production"
                          />
                        </Grid>

                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField
                            fullWidth
                            label="Downtime Delay (minutes)"
                            type="number"
                            value={downtimeDelayMinutes}
                            onChange={(e) => setDowntimeDelayMinutes(parseInt(e.target.value) || 0)}
                            inputProps={{ min: 0, step: 1 }}
                            helperText="Additional delay during production"
                          />
                        </Grid>

                        <Grid size={12}>
                          <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            startIcon={<GenerateIcon />}
                            onClick={generateActualData}
                          >
                            Generate Actual Data
                          </Button>
                        </Grid>

                        <Grid size={12}>
                          <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={resetActualData}
                          >
                            Reset
                          </Button>
                        </Grid>
                      </>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Actual Data Summary */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Generation Summary
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  {segmentResponses.length === 0 ? (
                    <Alert severity="info">
                      Select an operations request and click "Generate Actual Data" to create actual production data.
                    </Alert>
                  ) : (
                    <Box>
                      {actualGenerationTimestamp && (
                        <Box sx={{ mb: 2, p: 1, bgcolor: 'success.lighter', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Generated: {actualGenerationTimestamp.toLocaleString()}
                          </Typography>
                        </Box>
                      )}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Generated Actual Data:
                        </Typography>
                        <Chip label={`${generatedOperationsResponse ? 1 : 0} Operations Responses`} color="primary" sx={{ mr: 1, mb: 1 }} />
                        <Chip label={`${segmentResponses.length} Segment Responses`} color="success" sx={{ mr: 1, mb: 1 }} />
                        <Chip label={`${materialActuals.length} Material Actuals`} color="warning" sx={{ mr: 1, mb: 1 }} />
                        <Chip label={`${equipmentActuals.length} Equipment Actuals`} color="info" sx={{ mr: 1, mb: 1 }} />
                        <Chip label={`${personnelActuals.length} Personnel Actuals`} color="secondary" sx={{ mr: 1, mb: 1 }} />
                        <Chip label={`${equipmentPropertyTracking.length} Property Tracking`} color="secondary" sx={{ mr: 1, mb: 1 }} />
                        <Chip label={`${operationsEvents.length} Operations Events`} color="error" sx={{ mr: 1, mb: 1 }} />
                        <Chip label={`${operationsEventRecords.length} Event Records`} color="warning" sx={{ mr: 1, mb: 1 }} />
                        <Chip label={`${operationsEventEntries.length} Event Entries`} color="warning" sx={{ mr: 1, mb: 1 }} />
                        <Chip label={`${operationsEventProperties.length} Event Properties`} color="warning" sx={{ mr: 1, mb: 1 }} />
                        <Chip label={`${segmentData.length} Segment Data`} color="primary" sx={{ mr: 1, mb: 1 }} />
                        <Chip label={`${generatedMaterialLotsForDisplay.length} Material Lots`} color="success" sx={{ mr: 1, mb: 1 }} />
                        <Chip label={`${generatedMaterialSublotsForDisplay.length} Material Sublots`} color="success" sx={{ mr: 1, mb: 1 }} />
                        <Chip label={`${testResults.length} Test Results`} color="info" sx={{ mb: 1 }} />
                      </Box>

                      <Box sx={{ mb: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Record Counts by Object:
                        </Typography>
                        <Typography variant="caption" display="block">OperationsResponse: {generatedOperationsResponse ? 1 : 0}</Typography>
                        <Typography variant="caption" display="block">SegmentResponse: {segmentResponses.length}</Typography>
                        <Typography variant="caption" display="block">SegmentMaterialActual: {materialActuals.length}</Typography>
                        <Typography variant="caption" display="block">SegmentEquipmentActual: {equipmentActuals.length}</Typography>
                        <Typography variant="caption" display="block">EquipmentPropertyTracking: {equipmentPropertyTracking.length}</Typography>
                        <Typography variant="caption" display="block">OperationsEvent: {operationsEvents.length}</Typography>
                        <Typography variant="caption" display="block">OperationsEventRecord: {operationsEventRecords.length}</Typography>
                        <Typography variant="caption" display="block">OperationsEventEntry: {operationsEventEntries.length}</Typography>
                        <Typography variant="caption" display="block">OperationsEventProperty: {operationsEventProperties.length}</Typography>
                        <Typography variant="caption" display="block">SegmentData: {segmentData.length}</Typography>
                        <Typography variant="caption" display="block">MaterialLot: {generatedMaterialLotsForDisplay.length}</Typography>
                        <Typography variant="caption" display="block">MaterialSublot: {generatedMaterialSublotsForDisplay.length}</Typography>
                        <Typography variant="caption" display="block">TestResult: {testResults.length}</Typography>
                      </Box>

                      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                        Segment Responses:
                      </Typography>
                      {segmentResponses.slice(0, PREVIEW_ROW_LIMIT).map((sr, idx) => {
                        const segment = processSegments.find(ps => ps.id === sr.processSegmentId);
                        const matActs = materialActuals.filter(ma => ma.segmentResponseId === sr.id);
                        const eqActs = equipmentActuals.filter(ea => ea.segmentResponseId === sr.id);
                        
                        return (
                          <Box key={sr.id} sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                            <Typography variant="subtitle2">
                              {idx + 1}. {segment?.name || sr.processSegmentId}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary">
                              {sr.actualStartDateTime} → {sr.actualEndDateTime}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary">
                              Quantity: {sr.actualQuantity} {sr.quantityUoM}
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              <Chip label={`${matActs.length} Materials`} size="small" sx={{ mr: 0.5 }} />
                              <Chip label={`${eqActs.length} Equipment`} size="small" />
                            </Box>
                          </Box>
                        );
                      })}
                      {segmentResponses.length > PREVIEW_ROW_LIMIT && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                          Preview limited to first {PREVIEW_ROW_LIMIT} segment responses. Export CSV for full data.
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Actual Data Details Tables */}
          {segmentResponses.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Actual Data Details
              </Typography>

              {/* Operations Request Reference (Plan Data) */}
              {generatedOperationsResponse && referenceOperationsRequest && (
                <Paper sx={{ mb: 2 }}>
                  <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1">Operations Request (Plan Data - Reference)</Typography>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>ID</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell>Planned Start</TableCell>
                          <TableCell>Planned End</TableCell>
                          <TableCell>Planned Quantity</TableCell>
                          <TableCell>Operations Type</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>{referenceOperationsRequest.id}</TableCell>
                          <TableCell>{referenceOperationsRequest.description}</TableCell>
                          <TableCell>{referenceOperationsRequest.plannedStartDateTime}</TableCell>
                          <TableCell>{referenceOperationsRequest.plannedEndDateTime}</TableCell>
                          <TableCell>{referenceOperationsRequest.plannedQuantity} {referenceOperationsRequest.quantityUoM}</TableCell>
                          <TableCell>{referenceOperationsRequest.operationsType || 'N/A'}</TableCell>
                          <TableCell>
                            <Chip label={referenceOperationsRequest.status} size="small" color="primary" />
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}

              {/* Operations Response Table */}
              {generatedOperationsResponse && (
                <Paper sx={{ mb: 2 }}>
                  <Box sx={{ p: 2, bgcolor: 'success.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1">Operations Response (Actual Data)</Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<GetAppIcon />}
                      onClick={() => exportActualToCSV('response')}
                      sx={{ color: 'white', borderColor: 'white' }}
                    >
                      Export CSV
                    </Button>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>ID</TableCell>
                          <TableCell>Operations Request ID</TableCell>
                          <TableCell>Plant ID</TableCell>
                          <TableCell>Production Line ID</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell>Actual Start</TableCell>
                          <TableCell>Actual End</TableCell>
                          <TableCell>Actual Quantity</TableCell>
                          <TableCell>Operations Type</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>{generatedOperationsResponse.id}</TableCell>
                          <TableCell>{generatedOperationsResponse.operationsRequestId}</TableCell>
                          <TableCell>{generatedOperationsResponse.plantId}</TableCell>
                          <TableCell>{generatedOperationsResponse.productionLineId}</TableCell>
                          <TableCell>{generatedOperationsResponse.description}</TableCell>
                          <TableCell>{generatedOperationsResponse.actualStartDateTime}</TableCell>
                          <TableCell>{generatedOperationsResponse.actualEndDateTime}</TableCell>
                          <TableCell>{generatedOperationsResponse.actualQuantity} {generatedOperationsResponse.quantityUoM}</TableCell>
                          <TableCell>{generatedOperationsResponse.operationsType || 'N/A'}</TableCell>
                          <TableCell>
                            <Chip label={generatedOperationsResponse.status} size="small" color="success" />
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}

              {/* Segment Requirements Reference (Plan Data) */}
              {generatedOperationsResponse && referenceSegmentRequirements.length > 0 && (
                <Paper sx={{ mb: 2 }}>
                  <Box sx={{ p: 2, bgcolor: 'primary.dark', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1">Segment Requirements (Plan Data - Reference)</Typography>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>ID</TableCell>
                          <TableCell>Process Segment</TableCell>
                          <TableCell>Equipment ID</TableCell>
                          <TableCell>Sequence</TableCell>
                          <TableCell>Earliest Start</TableCell>
                          <TableCell>Latest End</TableCell>
                          <TableCell>Target Quantity</TableCell>
                          <TableCell>Operations Type</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {referenceSegmentRequirements.map(sr => {
                          const segment = processSegments.find(ps => ps.id === sr.processSegmentId);
                          return (
                            <TableRow key={sr.id}>
                              <TableCell>{sr.id}</TableCell>
                              <TableCell>{segment?.name || sr.processSegmentId}</TableCell>
                              <TableCell>{sr.equipmentId || 'N/A'}</TableCell>
                              <TableCell>{sr.sequence}</TableCell>
                              <TableCell>{sr.earliestStartDateTime}</TableCell>
                              <TableCell>{sr.latestEndDateTime}</TableCell>
                              <TableCell>{sr.targetQuantity} {sr.quantityUoM}</TableCell>
                              <TableCell>{sr.operationsType || 'N/A'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}

              {/* Segment Responses Table */}
              <Paper sx={{ mb: 2 }}>
                <Box sx={{ p: 2, bgcolor: 'success.dark', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1">Segment Responses (Actual Data) - {segmentResponses.filter(sr => {
                    if (!segmentResponsesFilter) return true;
                    const segment = processSegments.find(ps => ps.id === sr.processSegmentId);
                    return sr.id?.toLowerCase().includes(segmentResponsesFilter.toLowerCase()) ||
                           segment?.name?.toLowerCase().includes(segmentResponsesFilter.toLowerCase());
                  }).length} records</Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<GetAppIcon />}
                    onClick={() => exportActualToCSV('segments')}
                    sx={{ color: 'white', borderColor: 'white' }}
                  >
                    Export CSV
                  </Button>
                </Box>
                <TableContainer sx={{ maxHeight: 500 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Process Segment</TableCell>
                        <TableCell>Equipment ID</TableCell>
                        <TableCell>Actual Start</TableCell>
                        <TableCell>Actual End</TableCell>
                        <TableCell>Actual Quantity</TableCell>
                        <TableCell>Operations Type</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {segmentResponses
                        .filter(sr => {
                          if (!segmentResponsesFilter) return true;
                          const segment = processSegments.find(ps => ps.id === sr.processSegmentId);
                          return sr.id?.toLowerCase().includes(segmentResponsesFilter.toLowerCase()) ||
                                 segment?.name?.toLowerCase().includes(segmentResponsesFilter.toLowerCase());
                        })
                        .slice(0, PREVIEW_ROW_LIMIT)
                        .map((sr) => {
                          const segment = processSegments.find(ps => ps.id === sr.processSegmentId);
                          return (
                            <TableRow key={sr.id}>
                              <TableCell>{sr.id}</TableCell>
                              <TableCell>{segment?.name || sr.processSegmentId}</TableCell>
                              <TableCell>{sr.equipmentId || 'N/A'}</TableCell>
                              <TableCell>{sr.actualStartDateTime}</TableCell>
                              <TableCell>{sr.actualEndDateTime}</TableCell>
                              <TableCell>{sr.actualQuantity} {sr.quantityUoM}</TableCell>
                              <TableCell>{sr.operationsType || 'N/A'}</TableCell>
                              <TableCell>
                                <Chip label={sr.status} size="small" color="success" />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </TableContainer>
                {segmentResponses.filter(sr => {
                  if (!segmentResponsesFilter) return true;
                  const segment = processSegments.find(ps => ps.id === sr.processSegmentId);
                  return sr.id?.toLowerCase().includes(segmentResponsesFilter.toLowerCase()) ||
                         segment?.name?.toLowerCase().includes(segmentResponsesFilter.toLowerCase());
                }).length > PREVIEW_ROW_LIMIT && (
                  <Box sx={{ p: 1.5, bgcolor: 'background.default', textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      Preview limited to first {PREVIEW_ROW_LIMIT} rows. Export CSV for full dataset.
                    </Typography>
                  </Box>
                )}
              </Paper>

              {/* Material Actuals Table */}
              <Paper sx={{ mb: 2 }}>
                <Box sx={{ p: 2, bgcolor: 'warning.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1">Material Actuals - {materialActuals.filter(ma => materialActualsFilter === 'ALL' || ma.direction === materialActualsFilter).length} records</Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<GetAppIcon />}
                    onClick={() => exportActualToCSV('materials')}
                    sx={{ color: 'white', borderColor: 'white' }}
                  >
                    Export CSV
                  </Button>
                </Box>
                <TableContainer sx={{ maxHeight: 500 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Segment Response</TableCell>
                        <TableCell>Material</TableCell>
                        <TableCell>Material Lot</TableCell>
                        <TableCell>Actual Qty</TableCell>
                        <TableCell>Direction</TableCell>
                        <TableCell>Operations Type</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {materialActuals
                        .filter(ma => materialActualsFilter === 'ALL' || ma.direction === materialActualsFilter)
                        .slice(0, PREVIEW_ROW_LIMIT)
                        .map((ma) => {
                          const material = materials.find(m => m.id === ma.materialId);
                          return (
                            <TableRow key={ma.id}>
                              <TableCell>{ma.id}</TableCell>
                              <TableCell>{ma.segmentResponseId}</TableCell>
                              <TableCell>{material?.name || ma.materialId}</TableCell>
                              <TableCell>{ma.materialLotId}</TableCell>
                              <TableCell>{ma.actualQty} {ma.qtyUoM}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={ma.direction} 
                                  size="small" 
                                  color={ma.direction === 'PRODUCE' ? 'success' : ma.direction === 'Scrap' ? 'error' : 'default'}
                                />
                              </TableCell>
                              <TableCell>{ma.operationsType || 'N/A'}</TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </TableContainer>
                {materialActuals.filter(ma => materialActualsFilter === 'ALL' || ma.direction === materialActualsFilter).length > PREVIEW_ROW_LIMIT && (
                  <Box sx={{ p: 1.5, bgcolor: 'background.default', textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      Preview limited to first {PREVIEW_ROW_LIMIT} rows. Export CSV for full dataset.
                    </Typography>
                  </Box>
                )}
              </Paper>

              {/* Equipment Actuals Table */}
              <Paper sx={{ mb: 2 }}>
                <Box sx={{ p: 2, bgcolor: 'info.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1">Equipment Actuals - {equipmentActuals.length} records</Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<GetAppIcon />}
                    onClick={() => exportActualToCSV('equipment')}
                    sx={{ color: 'white', borderColor: 'white' }}
                  >
                    Export CSV
                  </Button>
                </Box>
                <TableContainer sx={{ maxHeight: 500 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Segment Response</TableCell>
                        <TableCell>Equipment</TableCell>
                        <TableCell>Actual Quantity</TableCell>
                        <TableCell>UoM</TableCell>
                        <TableCell>Start</TableCell>
                        <TableCell>End</TableCell>
                        <TableCell>Operations Type</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {equipmentActuals.slice(0, PREVIEW_ROW_LIMIT).map((ea) => {
                        const equipmentItem = equipment.find(e => e.id === ea.equipmentId);
                        return (
                          <TableRow key={ea.id}>
                            <TableCell>{ea.id}</TableCell>
                            <TableCell>{ea.segmentResponseId}</TableCell>
                            <TableCell>{equipmentItem?.id || ea.equipmentId}</TableCell>
                            <TableCell>{ea.actualQuantity.toFixed(2)}</TableCell>
                            <TableCell>{ea.unitOfMeasure || 'N/A'}</TableCell>
                            <TableCell>{ea.actualStartDateTime}</TableCell>
                            <TableCell>{ea.actualEndDateTime}</TableCell>
                            <TableCell>{ea.operationsType || 'N/A'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                {equipmentActuals.length > PREVIEW_ROW_LIMIT && (
                  <Box sx={{ p: 1.5, bgcolor: 'background.default', textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      Preview limited to first {PREVIEW_ROW_LIMIT} rows. Export CSV for full dataset.
                    </Typography>
                  </Box>
                )}
              </Paper>

              {/* Equipment Property Tracking Table */}
              {equipmentPropertyTracking.length > 0 && (
                <Paper sx={{ mb: 2 }}>
                  <Box sx={{ p: 2, bgcolor: 'secondary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1">Equipment Property Tracking (First 50 records)</Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<GetAppIcon />}
                      onClick={() => exportActualToCSV('propertytracking')}
                      sx={{ color: 'white', borderColor: 'white' }}
                    >
                      Export CSV
                    </Button>
                  </Box>
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>ID</TableCell>
                          <TableCell>Equipment</TableCell>
                          <TableCell>Equipment Class</TableCell>
                          <TableCell>Property</TableCell>
                          <TableCell>Class Property</TableCell>
                          <TableCell>Value</TableCell>
                          <TableCell>UoM</TableCell>
                          <TableCell>Timestamp</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {equipmentPropertyTracking.slice(0, 50).map((ept) => {
                          const equipmentItem = equipment.find(e => e.id === ept.equipmentId);
                          const property = equipmentProperties.find(p => p.id === ept.equipmentPropertyId);
                          return (
                            <TableRow key={ept.id}>
                              <TableCell sx={{ fontSize: '0.75rem' }}>{ept.id}</TableCell>
                              <TableCell>{equipmentItem?.name || ept.equipmentId}</TableCell>
                              <TableCell>{ept.equipmentClassId || '-'}</TableCell>
                              <TableCell>{property?.name || ept.equipmentPropertyId}</TableCell>
                              <TableCell>{ept.equipmentClassPropertyId || '-'}</TableCell>
                              <TableCell>{ept.value}</TableCell>
                              <TableCell>{ept.uom}</TableCell>
                              <TableCell>{ept.createdTimestamp}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {equipmentPropertyTracking.length > 50 && (
                    <Box sx={{ p: 2, bgcolor: 'background.default', textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Showing 50 of {equipmentPropertyTracking.length} records. Export CSV to view all.
                      </Typography>
                    </Box>
                  )}
                </Paper>
              )}

              {/* Operations Events Table */}
              {operationsEvents.length > 0 && (
                <Paper sx={{ mb: 2 }}>
                  <Box sx={{ p: 2, bgcolor: 'warning.main', color: 'white' }}>
                    <Typography variant="subtitle1">Operations Events</Typography>
                  </Box>
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Event ID</TableCell>
                          <TableCell>Segment Response</TableCell>
                          <TableCell>Equipment ID</TableCell>
                          <TableCell>Hierarchy Scope</TableCell>
                          <TableCell>Event Definition</TableCell>
                          <TableCell>Event Code</TableCell>
                          <TableCell>Event Category</TableCell>
                          <TableCell>Event Type</TableCell>
                          <TableCell>Operations Type</TableCell>
                          <TableCell>Effective Timestamp</TableCell>
                          <TableCell>Notes</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {operationsEvents.slice(0, PREVIEW_ROW_LIMIT).map((event) => {
                          const eventDef = operationEventDefinitions.find(oed => oed.id === event.operationsEventDefinitionId);
                          return (
                            <TableRow key={event.id}>
                              <TableCell>{event.id}</TableCell>
                              <TableCell>{event.segmentResponseId}</TableCell>
                              <TableCell>{event.equipmentId}</TableCell>
                              <TableCell>{event.hierarchyScope}</TableCell>
                              <TableCell>{eventDef?.description || event.operationsEventDefinitionId}</TableCell>
                              <TableCell>
                                <Chip label={eventDef?.eventCode || 'N/A'} size="small" />
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={eventDef?.eventCategory || 'N/A'} 
                                  color={eventDef?.causesDowntime ? 'error' : 'warning'}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <Chip label={event.eventType || 'N/A'} size="small" color="info" />
                              </TableCell>
                              <TableCell>{event.operationsType || 'N/A'}</TableCell>
                              <TableCell>{event.effectiveTimestamp}</TableCell>
                              <TableCell>{event.notes}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {operationsEvents.length > PREVIEW_ROW_LIMIT && (
                    <Box sx={{ p: 1.5, bgcolor: 'background.default', textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Preview limited to first {PREVIEW_ROW_LIMIT} rows. Export CSV for full dataset.
                      </Typography>
                    </Box>
                  )}
                </Paper>
              )}

              {/* Operations Event Records Table */}
              {operationsEventRecords.length > 0 && (
                <Paper sx={{ mb: 2 }}>
                  <Box sx={{ p: 2, bgcolor: 'warning.dark', color: 'white' }}>
                    <Typography variant="subtitle1">
                      Operations Event Records
                      <Chip label={operationsEventRecords.length} size="small" sx={{ ml: 1, bgcolor: 'white', color: 'warning.dark' }} />
                    </Typography>
                  </Box>
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Record ID</TableCell>
                          <TableCell>Event Definition</TableCell>
                          <TableCell>Severity</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Effective Time</TableCell>
                          <TableCell>Segment Response</TableCell>
                          <TableCell>Equipment</TableCell>
                          <TableCell>Comments</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {operationsEventRecords.slice(0, PREVIEW_ROW_LIMIT).map((record) => {
                          const eventDef = operationEventDefinitions.find(oed => oed.id === record.operationsEventDefinitionId);
                          return (
                            <TableRow key={record.id}>
                              <TableCell>{record.id}</TableCell>
                              <TableCell>{eventDef?.description || record.operationsEventDefinitionId}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={record.severity} 
                                  size="small"
                                  color={record.severity === 'High' ? 'error' : record.severity === 'Medium' ? 'warning' : 'default'}
                                />
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={record.status} 
                                  size="small"
                                  color={record.status === 'Open' ? 'error' : 'success'}
                                />
                              </TableCell>
                              <TableCell>{record.effectiveTime}</TableCell>
                              <TableCell>{record.segmentResponseId}</TableCell>
                              <TableCell>{record.equipmentId}</TableCell>
                              <TableCell>{record.comments}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {operationsEventRecords.length > PREVIEW_ROW_LIMIT && (
                    <Box sx={{ p: 1.5, bgcolor: 'background.default', textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Preview limited to first {PREVIEW_ROW_LIMIT} rows. Export CSV for full dataset.
                      </Typography>
                    </Box>
                  )}
                </Paper>
              )}

              {/* Operations Event Entries Table */}
              {operationsEventEntries.length > 0 && (
                <Paper sx={{ mb: 2 }}>
                  <Box sx={{ p: 2, bgcolor: 'orange', color: 'white' }}>
                    <Typography variant="subtitle1">
                      Operations Event Entries
                      <Chip label={operationsEventEntries.length} size="small" sx={{ ml: 1, bgcolor: 'white', color: 'orange' }} />
                    </Typography>
                  </Box>
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Entry ID</TableCell>
                          <TableCell>Event Record ID</TableCell>
                          <TableCell>Entry Type</TableCell>
                          <TableCell>Effective Time</TableCell>
                          <TableCell>Segment Response</TableCell>
                          <TableCell>Equipment</TableCell>
                          <TableCell>Description</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {operationsEventEntries.slice(0, PREVIEW_ROW_LIMIT).map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>{entry.id}</TableCell>
                            <TableCell>{entry.operationsEventRecordId}</TableCell>
                            <TableCell>
                              <Chip label={entry.entryType} size="small" color="primary" />
                            </TableCell>
                            <TableCell>{entry.effectiveTime}</TableCell>
                            <TableCell>{entry.segmentResponseId}</TableCell>
                            <TableCell>{entry.equipmentId}</TableCell>
                            <TableCell>{entry.description}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {operationsEventEntries.length > PREVIEW_ROW_LIMIT && (
                    <Box sx={{ p: 1.5, bgcolor: 'background.default', textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Preview limited to first {PREVIEW_ROW_LIMIT} rows. Export CSV for full dataset.
                      </Typography>
                    </Box>
                  )}
                </Paper>
              )}

              {/* Operations Event Properties Table */}
              {operationsEventProperties.length > 0 && (
                <Paper sx={{ mb: 2 }}>
                  <Box sx={{ p: 2, bgcolor: 'warning.main', color: 'white' }}>
                    <Typography variant="subtitle1">
                      Operations Event Properties
                      <Chip label={operationsEventProperties.length} size="small" sx={{ ml: 1, bgcolor: 'white', color: 'warning.main' }} />
                    </Typography>
                  </Box>
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Property ID</TableCell>
                          <TableCell>Event ID</TableCell>
                          <TableCell>Property Definition</TableCell>
                          <TableCell>Value</TableCell>
                          <TableCell>Unit of Measure</TableCell>
                          <TableCell>Effective Time</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {operationsEventProperties.slice(0, PREVIEW_ROW_LIMIT).map((prop) => {
                          const propertyDef = operationEventDefinitionProperties.find(p => p.id === prop.operationsEventDefinitionPropertyId);
                          return (
                            <TableRow key={prop.id}>
                              <TableCell>{prop.id}</TableCell>
                              <TableCell>{prop.operationsEventId}</TableCell>
                              <TableCell>
                                <Chip label={propertyDef?.id || prop.operationsEventDefinitionPropertyId} size="small" color="warning" />
                              </TableCell>
                              <TableCell>{prop.value}</TableCell>
                              <TableCell>{prop.valueUnitOfMeasure || 'N/A'}</TableCell>
                              <TableCell>{prop.effectiveTime}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {operationsEventProperties.length > PREVIEW_ROW_LIMIT && (
                    <Box sx={{ p: 1.5, bgcolor: 'background.default', textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Preview limited to first {PREVIEW_ROW_LIMIT} rows. Export CSV for full dataset.
                      </Typography>
                    </Box>
                  )}
                </Paper>
              )}

              {/* Segment Data Table (Shifts and Crews) */}
              {segmentData.length > 0 && (
                <Paper sx={{ mb: 2 }}>
                  <Box sx={{ p: 2, bgcolor: 'secondary.main', color: 'white' }}>
                    <Typography variant="subtitle1">Segment Data (Shifts & Crews)</Typography>
                  </Box>
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>ID</TableCell>
                          <TableCell>Segment Response</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Shift/Crew</TableCell>
                          <TableCell>Start DateTime</TableCell>
                          <TableCell>End DateTime</TableCell>
                          <TableCell>Notes</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {segmentData.slice(0, PREVIEW_ROW_LIMIT).map((sd) => {
                          const shift = sd.recordType === 'shift' ? shifts.find(s => s.id === sd.shiftId) : null;
                          const crew = sd.recordType === 'crew' ? crews.find(c => c.id === sd.crewId) : null;
                          return (
                            <TableRow key={sd.id}>
                              <TableCell>{sd.id}</TableCell>
                              <TableCell>{sd.segmentResponseId}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={sd.recordType.toUpperCase()} 
                                  size="small"
                                  color={sd.recordType === 'shift' ? 'primary' : 'secondary'}
                                />
                              </TableCell>
                              <TableCell>
                                {shift && `Shift ${shift.shiftNumber}: ${shift.shiftName}`}
                                {crew && `${crew.crewName} (${crew.peopleCount} people)`}
                              </TableCell>
                              <TableCell>{sd.startDateTime}</TableCell>
                              <TableCell>{sd.endDateTime}</TableCell>
                              <TableCell>{sd.notes}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {segmentData.length > PREVIEW_ROW_LIMIT && (
                    <Box sx={{ p: 1.5, bgcolor: 'background.default', textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Preview limited to first {PREVIEW_ROW_LIMIT} rows. Export CSV for full dataset.
                      </Typography>
                    </Box>
                  )}
                </Paper>
              )}

              {/* Personnel Actuals Table */}
              {personnelActuals.length > 0 && (
                <Paper sx={{ mb: 2 }}>
                  <Box sx={{ p: 2, bgcolor: 'warning.dark', color: 'white' }}>
                    <Typography variant="subtitle1">Personnel Actuals</Typography>
                  </Box>
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>ID</TableCell>
                          <TableCell>Segment Response</TableCell>
                          <TableCell>Person Class</TableCell>
                          <TableCell>Employee</TableCell>
                          <TableCell>Actual Qty</TableCell>
                          <TableCell>UoM</TableCell>
                          <TableCell>Personnel Use</TableCell>
                          <TableCell>Start DateTime</TableCell>
                          <TableCell>End DateTime</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {personnelActuals.slice(0, PREVIEW_ROW_LIMIT).map((pa) => {
                          const personClass = personClasses.find(pc => pc.id === pa.personClassId);
                          const employee = pa.employeeId ? employees.find(e => e.id === pa.employeeId) : undefined;
                          return (
                            <TableRow key={pa.id}>
                              <TableCell>{pa.id}</TableCell>
                              <TableCell>{pa.segmentResponseId}</TableCell>
                              <TableCell>{personClass?.name || pa.personClassId || 'N/A'}</TableCell>
                              <TableCell>{employee?.employeeName || pa.employeeId || 'N/A'}</TableCell>
                              <TableCell>{pa.actualQuantity}</TableCell>
                              <TableCell>{pa.quantityUnitOfMeasure || 'Person'}</TableCell>
                              <TableCell>
                                <Chip label={pa.personnelUse} size="small" color="warning" />
                              </TableCell>
                              <TableCell>{pa.actualStartDateTime}</TableCell>
                              <TableCell>{pa.actualEndDateTime}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {personnelActuals.length > PREVIEW_ROW_LIMIT && (
                    <Box sx={{ p: 1.5, bgcolor: 'background.default', textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Preview limited to first {PREVIEW_ROW_LIMIT} rows.
                      </Typography>
                    </Box>
                  )}
                </Paper>
              )}

              {/* Material Lots Table */}
              <Paper>
                <Box sx={{ p: 2, bgcolor: 'success.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1">Material Lots</Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<GetAppIcon />}
                    onClick={() => exportActualToCSV('lots')}
                    sx={{ color: 'white', borderColor: 'white' }}
                  >
                    Export CSV
                  </Button>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Lot ID</TableCell>
                        <TableCell>Material</TableCell>
                        <TableCell>Quantity</TableCell>
                        <TableCell>UoM</TableCell>
                        <TableCell>Produced DateTime</TableCell>
                        <TableCell>Process Segment</TableCell>
                        <TableCell>Segment Response</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {generatedMaterialLotsForDisplay.slice(0, PREVIEW_ROW_LIMIT).map((lot) => {
                        const materialItem = materials.find(m => m.id === lot.materialId);
                        return (
                          <TableRow key={lot.id}>
                            <TableCell>{lot.id}</TableCell>
                            <TableCell>{materialItem?.name || lot.materialId}</TableCell>
                            <TableCell>{lot.lotQuantity.toFixed(2)}</TableCell>
                            <TableCell>{lot.lotUoM}</TableCell>
                            <TableCell>{lot.producedDateTime}</TableCell>
                            <TableCell>{lot.producedByProcessSegmentId}</TableCell>
                            <TableCell>{lot.supplierOrProducerId}</TableCell>
                            <TableCell>
                              <Chip 
                                label={lot.status} 
                                size="small" 
                                color="success"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                {generatedMaterialLotsForDisplay.length > PREVIEW_ROW_LIMIT && (
                  <Box sx={{ p: 1.5, bgcolor: 'background.default', textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      Preview limited to first {PREVIEW_ROW_LIMIT} rows. Export CSV for full dataset.
                    </Typography>
                  </Box>
                )}
              </Paper>

              {/* Material Sublots Table */}
              <Paper sx={{ mt: 2 }}>
                <Box sx={{ p: 2, bgcolor: 'success.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1">
                    Material Sublots
                    <Chip label={generatedMaterialSublotsForDisplay.length} size="small" sx={{ ml: 1, bgcolor: 'white', color: 'success.main' }} />
                  </Typography>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Sublot ID</TableCell>
                        <TableCell>Parent Lot ID</TableCell>
                        <TableCell>Material</TableCell>
                        <TableCell>Quantity</TableCell>
                        <TableCell>UoM</TableCell>
                        <TableCell>Produced DateTime</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {generatedMaterialSublotsForDisplay.slice(0, PREVIEW_ROW_LIMIT).map((sublot) => {
                        const parentLot = generatedMaterialLotsForDisplay.find(l => l.id === sublot.materialLotId);
                        const materialItem = materials.find(m => m.id === parentLot?.materialId);
                        return (
                          <TableRow key={sublot.id}>
                            <TableCell>{sublot.id}</TableCell>
                            <TableCell>{sublot.materialLotId}</TableCell>
                            <TableCell>{materialItem?.name || 'N/A'}</TableCell>
                            <TableCell>{sublot.quantity?.toFixed(2) || 0}</TableCell>
                            <TableCell>{sublot.quantityUnitOfMeasure}</TableCell>
                            <TableCell>{sublot.producedDateTime}</TableCell>
                            <TableCell>
                              <Chip 
                                label={sublot.status} 
                                size="small" 
                                color="success"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                {generatedMaterialSublotsForDisplay.length > PREVIEW_ROW_LIMIT && (
                  <Box sx={{ p: 1.5, bgcolor: 'background.default', textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      Preview limited to first {PREVIEW_ROW_LIMIT} rows. Export CSV for full dataset.
                    </Typography>
                  </Box>
                )}
              </Paper>

              {/* Test Results Table */}
              <Paper sx={{ mt: 2 }}>
                <Box sx={{ p: 2, bgcolor: 'info.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1">
                    Test Results
                    <Chip label={testResults.length} size="small" sx={{ ml: 1, bgcolor: 'white', color: 'info.main' }} />
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<GetAppIcon />}
                    onClick={() => exportActualToCSV('testresults')}
                    sx={{ color: 'white', borderColor: 'white' }}
                  >
                    Export CSV
                  </Button>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Test Result ID</TableCell>
                        <TableCell>Material Lot ID</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Evaluation Date</TableCell>
                        <TableCell>Result</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {testResults.slice(0, PREVIEW_ROW_LIMIT).map((tr) => (
                        <TableRow key={tr.id}>
                          <TableCell>{tr.id}</TableCell>
                          <TableCell>{tr.materialLotId}</TableCell>
                          <TableCell>{tr.description}</TableCell>
                          <TableCell>{tr.evaluationDate}</TableCell>
                          <TableCell>
                            <Chip 
                              label={tr.evaluatedCriterionResult} 
                              size="small" 
                              color={tr.evaluatedCriterionResult === 'Pass' ? 'success' : 'error'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {testResults.length > PREVIEW_ROW_LIMIT && (
                  <Box sx={{ p: 1.5, bgcolor: 'background.default', textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      Preview limited to first {PREVIEW_ROW_LIMIT} rows. Export CSV for full dataset.
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Box>
          )}
        </Box>
      )}

      {mainTab === 1 && (
        <Box>
          <Tabs value={maintenanceActiveTab} onChange={(e, newValue) => setMaintenanceActiveTab(newValue)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tab label="Maintenance Plan" />
            <Tab label="Maintenance Actual" />
            <Tab label="⚡ Unplanned" />
          </Tabs>

          {maintenanceActiveTab === 0 && (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                Create maintenance plan orders from Maintenance BOM by equipment. This generates operations requests, segment requirements, material requirements, and equipment requirements.
              </Alert>

              {savedMaintenanceRequests.length > 0 && (
                <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.lighter' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      📊 Saved Maintenance Plan Overview
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => setMaintenancePlanDataExpanded(!maintenancePlanDataExpanded)}
                      variant="outlined"
                    >
                      {maintenancePlanDataExpanded ? 'Collapse' : 'Expand All'}
                    </Button>
                  </Box>
                  <Divider sx={{ mb: 2 }} />

                  {maintenancePlanDataExpanded && (
                    <Box sx={{ mb: 2 }}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Filter Maintenance Orders"
                        placeholder="Search by order ID, description, or material..."
                        value={maintenancePlanDataFilter}
                        onChange={(e) => setMaintenancePlanDataFilter(e.target.value)}
                      />
                    </Box>
                  )}

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 8 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Maintenance Orders:</strong> {filteredSavedMaintenanceRequests.length} {maintenancePlanDataFilter && `(filtered from ${savedMaintenanceRequests.length})`}
                      </Typography>
                      <Box sx={{ maxHeight: maintenancePlanDataExpanded ? 420 : 200, overflowY: 'auto', pr: 1 }}>
                        {filteredSavedMaintenanceRequests
                          .slice(0, maintenancePlanDataExpanded ? undefined : 3)
                          .map((req) => {
                            const plant = plants.find((p) => p.id === req.plantId);
                            const line = productionLines.find((l) => l.id === req.lineId);
                            const material = materials.find((m) => m.id === req.productMaterialId);
                            return (
                              <Box key={req.id} sx={{ ml: 2, mb: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                                <Typography variant="caption" display="block">
                                  <strong>{req.id}</strong> - {req.description}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Material: {material?.name || req.productMaterialId} | Qty: {req.plannedQuantity} {req.quantityUoM}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Plant: {plant?.name || req.plantId} | Line: {line?.name || line?.lineName || req.lineId}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {new Date(req.plannedStartDateTime).toLocaleString()} → {new Date(req.plannedEndDateTime).toLocaleString()}
                                </Typography>
                              </Box>
                            );
                          })}
                      </Box>
                      {!maintenancePlanDataExpanded && filteredSavedMaintenanceRequests.length > 3 && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                          ...and {filteredSavedMaintenanceRequests.length - 3} more
                        </Typography>
                      )}
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        <Chip label={`${savedMaintenanceRequests.length} Orders`} color="primary" size="small" />
                        <Chip
                          label={`${new Set(savedMaintenanceRequests.map((req) => req.productMaterialId).filter(Boolean)).size} Materials`}
                          color="secondary"
                          size="small"
                        />
                        <Chip
                          label={`${new Set(savedMaintenanceRequests.map((req) => req.equipmentId).filter(Boolean)).size} Equipment refs`}
                          color="info"
                          size="small"
                        />
                        <Chip label="Saved in DB" color="success" size="small" />
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              )}

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Maintenance Plan Input</Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Grid container spacing={2}>
                        <Grid size={12}>
                          <TextField
                            fullWidth
                            label="Description"
                            value={maintenancePlanFormData.description}
                            onChange={(e) => setMaintenancePlanFormData({ ...maintenancePlanFormData, description: e.target.value })}
                            placeholder="e.g., PM order for line equipment"
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <FormControl fullWidth>
                            <InputLabel>Plant</InputLabel>
                            <Select
                              value={maintenancePlanFormData.plantId}
                              label="Plant"
                              onChange={(e) => setMaintenancePlanFormData({ ...maintenancePlanFormData, plantId: e.target.value, lineId: '', equipmentId: '' })}
                            >
                              {plants.map((plant) => (
                                <MenuItem key={plant.id ?? plant.plantId ?? plant.PlantID} value={plant.id ?? plant.plantId ?? plant.PlantID}>
                                  {plant.name || plant.plantName || plant.PlantName || plant.id || plant.plantId || plant.PlantID}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <FormControl fullWidth>
                            <InputLabel>Line</InputLabel>
                            <Select
                              value={maintenancePlanFormData.lineId}
                              label="Line"
                              onChange={(e) => setMaintenancePlanFormData({ ...maintenancePlanFormData, lineId: e.target.value })}
                              disabled={!maintenancePlanFormData.plantId}
                            >
                              {productionLines
                                .filter((line) => (line.plantId ?? line.PlantID ?? line.PlantId) === maintenancePlanFormData.plantId)
                                .map((line) => (
                                  <MenuItem key={line.id ?? line.lineId ?? line.LineID ?? line.LineId} value={line.id ?? line.lineId ?? line.LineID ?? line.LineId}>
                                    {line.name || line.lineName || line.LineName || line.id || line.lineId || line.LineID || line.LineId}
                                  </MenuItem>
                                ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <FormControl fullWidth>
                            <InputLabel>Equipment</InputLabel>
                            <Select
                              value={maintenancePlanFormData.equipmentId}
                              label="Equipment"
                              onChange={(e) => setMaintenancePlanFormData({ ...maintenancePlanFormData, equipmentId: e.target.value })}
                              disabled={allMaintenanceEquipmentOptions.length === 0}
                            >
                              {maintenanceEquipmentForPlant
                                .map((eq) => (
                                  <MenuItem
                                    key={eq.id ?? eq.equipmentId ?? eq.EquipmentID ?? eq.EquipmentId}
                                    value={eq.id ?? eq.equipmentId ?? eq.EquipmentID ?? eq.EquipmentId}
                                  >
                                    {eq.name || eq.equipmentName || eq.EquipmentName || eq.id || eq.equipmentId || eq.EquipmentID || eq.EquipmentId}
                                  </MenuItem>
                                ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            fullWidth
                            label="Priority"
                            type="number"
                            value={maintenancePlanFormData.priority}
                            onChange={(e) => setMaintenancePlanFormData({ ...maintenancePlanFormData, priority: Number(e.target.value) || 1 })}
                            inputProps={{ min: 1, max: 10 }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            fullWidth
                            label="Planned Start"
                            type="datetime-local"
                            value={maintenancePlanFormData.plannedStartDateTime ? maintenancePlanFormData.plannedStartDateTime.slice(0, 16) : ''}
                            onChange={(e) => setMaintenancePlanFormData({ ...maintenancePlanFormData, plannedStartDateTime: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            fullWidth
                            label="Planned End"
                            type="datetime-local"
                            value={maintenancePlanFormData.plannedEndDateTime ? maintenancePlanFormData.plannedEndDateTime.slice(0, 16) : ''}
                            onChange={(e) => setMaintenancePlanFormData({ ...maintenancePlanFormData, plannedEndDateTime: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                        <Grid size={12}>
                          <Button fullWidth variant="contained" startIcon={<GenerateIcon />} onClick={generateMaintenancePlanData}>
                            Generate Maintenance Plan
                          </Button>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Generated Maintenance Plan</Typography>
                      <Divider sx={{ mb: 2 }} />
                      {!generatedMaintenanceRequest ? (
                        <Alert severity="info">Generate maintenance plan to preview created order and requirements.</Alert>
                      ) : (
                        <Box>
                          <Typography variant="body2" gutterBottom><strong>Order:</strong> {generatedMaintenanceRequest.id}</Typography>
                          <Typography variant="body2" gutterBottom><strong>Description:</strong> {generatedMaintenanceRequest.description}</Typography>
                          <Typography variant="body2" gutterBottom><strong>Segments:</strong> {maintenanceSegmentRequirements.length}</Typography>
                          <Typography variant="body2" gutterBottom><strong>Material Requirements:</strong> {maintenanceMaterialRequirements.length}</Typography>
                          <Typography variant="body2" gutterBottom><strong>Equipment Requirements:</strong> {maintenanceEquipmentRequirements.length}</Typography>
                          <Typography variant="body2" gutterBottom><strong>Personnel Requirements:</strong> {maintenancePersonnelRequirements.length}</Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {generatedMaintenanceRequest && (
                <Box sx={{ mt: 3 }}>
                  <Paper sx={{ mb: 2 }}>
                    <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1">Maintenance Operations Request</Typography>
                      <Button size="small" variant="outlined" startIcon={<GetAppIcon />} onClick={() => exportMaintenancePlanToCSV('operations')} sx={{ color: 'white', borderColor: 'white' }}>
                        Export CSV
                      </Button>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Plant</TableCell>
                            <TableCell>Line</TableCell>
                            <TableCell>Start</TableCell>
                            <TableCell>End</TableCell>
                            <TableCell>Priority</TableCell>
                            <TableCell>Operations Type</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell>{generatedMaintenanceRequest.id}</TableCell>
                            <TableCell>{generatedMaintenanceRequest.description}</TableCell>
                            <TableCell>{generatedMaintenanceRequest.plantId}</TableCell>
                            <TableCell>{generatedMaintenanceRequest.lineId}</TableCell>
                            <TableCell>{generatedMaintenanceRequest.plannedStartDateTime}</TableCell>
                            <TableCell>{generatedMaintenanceRequest.plannedEndDateTime}</TableCell>
                            <TableCell>{generatedMaintenanceRequest.priority}</TableCell>
                            <TableCell>{generatedMaintenanceRequest.operationsType || 'N/A'}</TableCell>
                            <TableCell>
                              <Chip label={generatedMaintenanceRequest.status} size="small" color="primary" />
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>

                  <Paper sx={{ mb: 2 }}>
                    <Box sx={{ p: 2, bgcolor: 'primary.dark', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1">Maintenance Segment Requirements</Typography>
                      <Button size="small" variant="outlined" startIcon={<GetAppIcon />} onClick={() => exportMaintenancePlanToCSV('segments')} sx={{ color: 'white', borderColor: 'white' }}>
                        Export CSV
                      </Button>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Process Segment</TableCell>
                            <TableCell>Equipment</TableCell>
                            <TableCell>Sequence</TableCell>
                            <TableCell>Start</TableCell>
                            <TableCell>End</TableCell>
                            <TableCell>Operations Type</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {maintenanceSegmentRequirements.map((sr) => {
                            const segment = processSegments.find((ps) => ps.id === sr.processSegmentId);
                            return (
                              <TableRow key={sr.id}>
                                <TableCell>{sr.id}</TableCell>
                                <TableCell>{segment?.name || sr.processSegmentId}</TableCell>
                                <TableCell>{sr.equipmentId || 'N/A'}</TableCell>
                                <TableCell>{sr.sequence}</TableCell>
                                <TableCell>{sr.earliestStartDateTime}</TableCell>
                                <TableCell>{sr.latestEndDateTime}</TableCell>
                                <TableCell>{sr.operationsType || 'N/A'}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>

                  <Paper sx={{ mb: 2 }}>
                    <Box sx={{ p: 2, bgcolor: 'secondary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1">Maintenance Material Requirements</Typography>
                      <Button size="small" variant="outlined" startIcon={<GetAppIcon />} onClick={() => exportMaintenancePlanToCSV('materials')} sx={{ color: 'white', borderColor: 'white' }}>
                        Export CSV
                      </Button>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Segment Requirement</TableCell>
                            <TableCell>Material</TableCell>
                            <TableCell>Required Qty</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Operations Type</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {maintenanceMaterialRequirements.map((mr) => {
                            const material = materials.find((m) => m.id === mr.materialId);
                            return (
                              <TableRow key={mr.id}>
                                <TableCell>{mr.id}</TableCell>
                                <TableCell>{mr.segmentRequirementId}</TableCell>
                                <TableCell>{material?.name || mr.materialId}</TableCell>
                                <TableCell>{mr.requiredQty} {mr.qtyUoM}</TableCell>
                                <TableCell>{mr.requirementType}</TableCell>
                                <TableCell>{mr.operationsType || 'N/A'}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>

                  <Paper sx={{ mb: 2 }}>
                    <Box sx={{ p: 2, bgcolor: 'info.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1">Maintenance Equipment Requirements</Typography>
                      <Button size="small" variant="outlined" startIcon={<GetAppIcon />} onClick={() => exportMaintenancePlanToCSV('equipment')} sx={{ color: 'white', borderColor: 'white' }}>
                        Export CSV
                      </Button>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Segment Requirement</TableCell>
                            <TableCell>Equipment Class</TableCell>
                            <TableCell>Equipment</TableCell>
                            <TableCell>Requirement Type</TableCell>
                            <TableCell>Planned Quantity</TableCell>
                            <TableCell>UoM</TableCell>
                            <TableCell>Operations Type</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {maintenanceEquipmentRequirements.map((er) => (
                            <TableRow key={er.id}>
                              <TableCell>{er.id}</TableCell>
                              <TableCell>{er.segmentRequirementId}</TableCell>
                              <TableCell>{er.equipmentClassId || 'N/A'}</TableCell>
                              <TableCell>{er.equipmentId}</TableCell>
                              <TableCell>{er.requirementType}</TableCell>
                              <TableCell>{er.plannedQuantity}</TableCell>
                              <TableCell>{er.unitOfMeasure || 'N/A'}</TableCell>
                              <TableCell>{er.operationsType || 'N/A'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>

                  <Paper sx={{ mb: 2 }}>
                    <Box sx={{ p: 2, bgcolor: 'warning.dark', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1">Maintenance Personnel Requirements</Typography>
                      <Button size="small" variant="outlined" startIcon={<GetAppIcon />} onClick={() => exportMaintenancePlanToCSV('personnel')} sx={{ color: 'white', borderColor: 'white' }}>
                        Export CSV
                      </Button>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Segment Requirement</TableCell>
                            <TableCell>Employee</TableCell>
                            <TableCell>Person Class</TableCell>
                            <TableCell>Quantity</TableCell>
                            <TableCell>Use</TableCell>
                            <TableCell>Operations Type</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {maintenancePersonnelRequirements.map((pr) => {
                            const employee = employees.find((item) => item.id === pr.employeeId);
                            const personClass = personClasses.find((item) => item.id === pr.personClassId);
                            return (
                              <TableRow key={pr.id}>
                                <TableCell>{pr.id}</TableCell>
                                <TableCell>{pr.segmentRequirementId}</TableCell>
                                <TableCell>{employee?.employeeName || pr.employeeId || 'N/A'}</TableCell>
                                <TableCell>{personClass?.name || pr.personClassId || 'N/A'}</TableCell>
                                <TableCell>{pr.quantity} {pr.quantityUnitOfMeasure}</TableCell>
                                <TableCell>{pr.personnelUse}</TableCell>
                                <TableCell>{pr.operationsType || 'N/A'}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => exportMaintenancePlanToCSV('all')}>
                      Export All Maintenance Plan CSV
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {maintenanceActiveTab === 1 && (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                Generate maintenance actual data from a saved maintenance order. It creates operations request execution data with segment, material, equipment, and operations event actuals.
              </Alert>

              {savedMaintenanceRequests.length > 0 && (
                <Paper sx={{ p: 2, mb: 3, bgcolor: 'success.lighter' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      📊 Maintenance Actual Data Overview
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => setMaintenanceActualDataExpanded(!maintenanceActualDataExpanded)}
                      variant="outlined"
                    >
                      {maintenanceActualDataExpanded ? 'Collapse' : 'Expand All'}
                    </Button>
                  </Box>
                  <Divider sx={{ mb: 2 }} />

                  {maintenanceActualDataExpanded && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Select a maintenance order to inspect existing stored actual records for that order.
                    </Alert>
                  )}

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="subtitle2" gutterBottom color="text.secondary">
                        Available Maintenance Orders:
                      </Typography>
                      <Typography variant="body2" color="text.primary" gutterBottom>
                        <strong>{savedMaintenanceRequests.length}</strong> maintenance orders saved in database
                      </Typography>
                      <Box sx={{ maxHeight: maintenanceActualDataExpanded ? 420 : 160, overflowY: 'auto', pr: 1 }}>
                        {savedMaintenanceRequests
                          .slice(0, maintenanceActualDataExpanded ? undefined : 2)
                          .map((req) => {
                            const material = materials.find((m) => m.id === req.productMaterialId);
                            const isSelected = req.id === selectedMaintenanceRequestId;
                            return (
                              <Box
                                key={req.id}
                                onClick={() => setSelectedMaintenanceRequestId(req.id)}
                                sx={{
                                  ml: 2,
                                  mb: 1,
                                  p: 1,
                                  bgcolor: 'background.paper',
                                  borderRadius: 1,
                                  cursor: 'pointer',
                                  border: isSelected ? 2 : 1,
                                  borderColor: isSelected ? 'success.main' : 'divider'
                                }}
                              >
                                <Typography variant="caption" display="block">
                                  <strong>{req.id}</strong> - {req.description}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Material: {material?.name || req.productMaterialId} | Qty: {req.plannedQuantity} {req.quantityUoM}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {new Date(req.plannedStartDateTime).toLocaleString()} → {new Date(req.plannedEndDateTime).toLocaleString()}
                                </Typography>
                              </Box>
                            );
                          })}
                      </Box>
                      {!maintenanceActualDataExpanded && savedMaintenanceRequests.length > 2 && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 2, display: 'block', mt: 1 }}>
                          ...and {savedMaintenanceRequests.length - 2} more
                        </Typography>
                      )}
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="subtitle2" gutterBottom color="text.secondary">
                        Stored Actual Data For Selected Order:
                      </Typography>
                      {!selectedMaintenanceOrder ? (
                        <Typography variant="body2" color="text.secondary">
                          Select a maintenance order to load its saved response, segment responses, material actuals, and equipment actuals.
                        </Typography>
                      ) : generatedMaintenanceResponse ? (
                        <Box>
                          <Typography variant="body2" color="text.primary" gutterBottom>
                            <strong>{generatedMaintenanceResponse.id}</strong> stored operations response found for {selectedMaintenanceOrder.id}
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                            <Chip label="1 Response" size="small" color="primary" />
                            <Chip label={`${maintenanceSegmentResponses.length} Segments`} size="small" color="success" />
                            <Chip label={`${maintenanceMaterialActuals.length} Materials`} size="small" color="warning" />
                            <Chip label={`${maintenanceEquipmentActuals.length} Equipment`} size="small" color="info" />
                            <Chip label={`${maintenancePersonnelActuals.length} Personnel`} size="small" color="secondary" />
                            <Chip label={`${operationsEvents.length} Events`} size="small" color="error" />
                            <Chip label={`${operationsEventRecords.length} Event Records`} size="small" color="warning" />
                            <Chip label={`${operationsEventEntries.length} Event Entries`} size="small" color="warning" />
                          </Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Response time: {generatedMaintenanceResponse.actualStartDateTime} → {generatedMaintenanceResponse.actualEndDateTime}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Plan reference: {maintenancePlanReference?.id || selectedMaintenanceOrder.id} | Segment requirements: {maintenanceSegReqReference.length}
                          </Typography>
                          {maintenanceActualTimestamp && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              Loaded: {maintenanceActualTimestamp.toLocaleString()}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            No stored actual response found yet for <strong>{selectedMaintenanceOrder.id}</strong>.
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                            <Chip label="0 Responses" size="small" color="default" />
                            <Chip label={`${maintenanceSegReqReference.length} Planned Segments`} size="small" color="secondary" />
                          </Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            The plan exists in the database, but actual execution records have not been saved for this order yet.
                          </Typography>
                        </Box>
                      )}
                    </Grid>
                  </Grid>
                </Paper>
              )}

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Maintenance Actual Input</Typography>
                      <Divider sx={{ mb: 2 }} />
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Maintenance Order</InputLabel>
                        <Select
                          value={selectedMaintenanceRequestId}
                          label="Maintenance Order"
                          onChange={(e) => setSelectedMaintenanceRequestId(e.target.value)}
                        >
                          {savedMaintenanceRequests.map((req) => (
                            <MenuItem key={req.id} value={req.id}>{req.id} - {req.description}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button fullWidth variant="contained" startIcon={<GenerateIcon />} onClick={generateMaintenanceActualData}>
                        Generate Maintenance Actual
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Maintenance Actual Summary</Typography>
                      <Divider sx={{ mb: 2 }} />
                      {!generatedMaintenanceResponse ? (
                        <Alert severity="info">Generate maintenance actual to preview records.</Alert>
                      ) : (
                        <Box>
                          {maintenanceActualTimestamp && (
                            <Typography variant="body2" gutterBottom>
                              <strong>Generated:</strong> {maintenanceActualTimestamp.toLocaleString()}
                            </Typography>
                          )}
                          <Typography variant="body2" gutterBottom><strong>Operations Response:</strong> {generatedMaintenanceResponse.id}</Typography>
                          <Typography variant="body2" gutterBottom><strong>Segment Responses:</strong> {maintenanceSegmentResponses.length}</Typography>
                          <Typography variant="body2" gutterBottom><strong>Material Actuals:</strong> {maintenanceMaterialActuals.length}</Typography>
                          <Typography variant="body2" gutterBottom><strong>Equipment Actuals:</strong> {maintenanceEquipmentActuals.length}</Typography>
                          <Typography variant="body2" gutterBottom><strong>Personnel Actuals:</strong> {maintenancePersonnelActuals.length}</Typography>
                          <Typography variant="body2" gutterBottom><strong>Operations Events:</strong> {operationsEvents.length}</Typography>
                          <Typography variant="body2" gutterBottom><strong>Event Records:</strong> {operationsEventRecords.length}</Typography>
                          <Typography variant="body2" gutterBottom><strong>Event Entries:</strong> {operationsEventEntries.length}</Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {maintenancePlanReference && (
                <Paper sx={{ mt: 3, mb: 2 }}>
                  <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
                    <Typography variant="subtitle1">Maintenance Order Reference</Typography>
                  </Box>
                  <Box sx={{ p: 2 }}>
                    <Typography variant="body2"><strong>ID:</strong> {maintenancePlanReference.id}</Typography>
                    <Typography variant="body2"><strong>Description:</strong> {maintenancePlanReference.description}</Typography>
                    <Typography variant="body2"><strong>Segments:</strong> {maintenanceSegReqReference.length}</Typography>
                  </Box>
                </Paper>
              )}

              {generatedMaintenanceResponse && (
                <Box sx={{ mt: 2 }}>
                  <Paper sx={{ mb: 2 }}>
                    <Box sx={{ p: 2, bgcolor: 'success.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1">Maintenance Operations Response</Typography>
                      <Button size="small" variant="outlined" startIcon={<GetAppIcon />} onClick={() => exportMaintenanceActualToCSV('response')} sx={{ color: 'white', borderColor: 'white' }}>
                        Export CSV
                      </Button>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Request ID</TableCell>
                            <TableCell>Plant</TableCell>
                            <TableCell>Line</TableCell>
                            <TableCell>Start</TableCell>
                            <TableCell>End</TableCell>
                            <TableCell>Operations Type</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell>{generatedMaintenanceResponse.id}</TableCell>
                            <TableCell>{generatedMaintenanceResponse.operationsRequestId}</TableCell>
                            <TableCell>{generatedMaintenanceResponse.plantId}</TableCell>
                            <TableCell>{generatedMaintenanceResponse.productionLineId}</TableCell>
                            <TableCell>{generatedMaintenanceResponse.actualStartDateTime}</TableCell>
                            <TableCell>{generatedMaintenanceResponse.actualEndDateTime}</TableCell>
                            <TableCell>{generatedMaintenanceResponse.operationsType || 'N/A'}</TableCell>
                            <TableCell><Chip label={generatedMaintenanceResponse.status} size="small" color="success" /></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>

                  <Paper sx={{ mb: 2 }}>
                    <Box sx={{ p: 2, bgcolor: 'success.dark', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1">Maintenance Segment Responses</Typography>
                      <Button size="small" variant="outlined" startIcon={<GetAppIcon />} onClick={() => exportMaintenanceActualToCSV('segments')} sx={{ color: 'white', borderColor: 'white' }}>
                        Export CSV
                      </Button>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Process Segment</TableCell>
                            <TableCell>Equipment</TableCell>
                            <TableCell>Start</TableCell>
                            <TableCell>End</TableCell>
                            <TableCell>Operations Type</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {maintenanceSegmentResponses.map((sr) => {
                            const segment = processSegments.find((ps) => ps.id === sr.processSegmentId);
                            return (
                              <TableRow key={sr.id}>
                                <TableCell>{sr.id}</TableCell>
                                <TableCell>{segment?.name || sr.processSegmentId}</TableCell>
                                <TableCell>{sr.equipmentId || 'N/A'}</TableCell>
                                <TableCell>{sr.actualStartDateTime}</TableCell>
                                <TableCell>{sr.actualEndDateTime}</TableCell>
                                <TableCell>{sr.operationsType || 'N/A'}</TableCell>
                                <TableCell><Chip label={sr.status} size="small" color="success" /></TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>

                  <Paper sx={{ mb: 2 }}>
                    <Box sx={{ p: 2, bgcolor: 'warning.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1">Maintenance Material Actuals</Typography>
                      <Button size="small" variant="outlined" startIcon={<GetAppIcon />} onClick={() => exportMaintenanceActualToCSV('materials')} sx={{ color: 'white', borderColor: 'white' }}>
                        Export CSV
                      </Button>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Segment Response</TableCell>
                            <TableCell>Material</TableCell>
                            <TableCell>Lot</TableCell>
                            <TableCell>Qty</TableCell>
                            <TableCell>Direction</TableCell>
                            <TableCell>Operations Type</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {maintenanceMaterialActuals.map((ma) => {
                            const material = materials.find((m) => m.id === ma.materialId);
                            return (
                              <TableRow key={ma.id}>
                                <TableCell>{ma.id}</TableCell>
                                <TableCell>{ma.segmentResponseId}</TableCell>
                                <TableCell>{material?.name || ma.materialId}</TableCell>
                                <TableCell>{ma.materialLotId}</TableCell>
                                <TableCell>{ma.actualQty} {ma.qtyUoM}</TableCell>
                                <TableCell>{ma.direction}</TableCell>
                                <TableCell>{ma.operationsType || 'N/A'}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>

                  <Paper sx={{ mb: 2 }}>
                    <Box sx={{ p: 2, bgcolor: 'info.dark', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1">Maintenance Equipment Actuals</Typography>
                      <Button size="small" variant="outlined" startIcon={<GetAppIcon />} onClick={() => exportMaintenanceActualToCSV('equipment')} sx={{ color: 'white', borderColor: 'white' }}>
                        Export CSV
                      </Button>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Segment Response</TableCell>
                            <TableCell>Equipment</TableCell>
                            <TableCell>Actual Quantity</TableCell>
                            <TableCell>UoM</TableCell>
                            <TableCell>Start</TableCell>
                            <TableCell>End</TableCell>
                            <TableCell>Operations Type</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {maintenanceEquipmentActuals.map((ea) => (
                            <TableRow key={ea.id}>
                              <TableCell>{ea.id}</TableCell>
                              <TableCell>{ea.segmentResponseId}</TableCell>
                              <TableCell>{ea.equipmentId}</TableCell>
                              <TableCell>{ea.actualQuantity}</TableCell>
                              <TableCell>{ea.unitOfMeasure || 'N/A'}</TableCell>
                              <TableCell>{ea.actualStartDateTime}</TableCell>
                              <TableCell>{ea.actualEndDateTime}</TableCell>
                              <TableCell>{ea.operationsType || 'N/A'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>

                  <Paper sx={{ mb: 2 }}>
                    <Box sx={{ p: 2, bgcolor: 'secondary.dark', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1">Maintenance Personnel Actuals</Typography>
                      <Button size="small" variant="outlined" startIcon={<GetAppIcon />} onClick={() => exportMaintenanceActualToCSV('personnel')} sx={{ color: 'white', borderColor: 'white' }}>
                        Export CSV
                      </Button>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Segment Response</TableCell>
                            <TableCell>Employee</TableCell>
                            <TableCell>Person Class</TableCell>
                            <TableCell>Actual Quantity</TableCell>
                            <TableCell>Use</TableCell>
                            <TableCell>Start</TableCell>
                            <TableCell>End</TableCell>
                            <TableCell>Operations Type</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {maintenancePersonnelActuals.map((pa) => {
                            const employee = employees.find((item) => item.id === pa.employeeId);
                            const personClass = personClasses.find((item) => item.id === pa.personClassId);
                            return (
                              <TableRow key={pa.id}>
                                <TableCell>{pa.id}</TableCell>
                                <TableCell>{pa.segmentResponseId}</TableCell>
                                <TableCell>{employee?.employeeName || pa.employeeId || 'N/A'}</TableCell>
                                <TableCell>{personClass?.name || pa.personClassId || 'N/A'}</TableCell>
                                <TableCell>{pa.actualQuantity} {pa.quantityUnitOfMeasure}</TableCell>
                                <TableCell>{pa.personnelUse}</TableCell>
                                <TableCell>{pa.actualStartDateTime}</TableCell>
                                <TableCell>{pa.actualEndDateTime}</TableCell>
                                <TableCell>{pa.operationsType || 'N/A'}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>

                  {operationsEvents.length > 0 && (
                    <Paper sx={{ mb: 2 }}>
                      <Box sx={{ p: 2, bgcolor: 'warning.main', color: 'white' }}>
                        <Typography variant="subtitle1">Maintenance Operations Events</Typography>
                      </Box>
                      <TableContainer sx={{ maxHeight: 350 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell>Event ID</TableCell>
                              <TableCell>Segment Response</TableCell>
                              <TableCell>Equipment ID</TableCell>
                              <TableCell>Hierarchy Scope</TableCell>
                              <TableCell>Event Type</TableCell>
                              <TableCell>Operations Type</TableCell>
                              <TableCell>Effective Timestamp</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {operationsEvents.slice(0, PREVIEW_ROW_LIMIT).map((event) => (
                              <TableRow key={event.id}>
                                <TableCell>{event.id}</TableCell>
                                <TableCell>{event.segmentResponseId}</TableCell>
                                <TableCell>{event.equipmentId}</TableCell>
                                <TableCell>{event.hierarchyScope || 'N/A'}</TableCell>
                                <TableCell>{event.eventType || 'N/A'}</TableCell>
                                <TableCell>{event.operationsType || 'N/A'}</TableCell>
                                <TableCell>{event.effectiveTimestamp}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  )}

                  {operationsEventRecords.length > 0 && (
                    <Paper sx={{ mb: 2 }}>
                      <Box sx={{ p: 2, bgcolor: 'warning.dark', color: 'white' }}>
                        <Typography variant="subtitle1">Maintenance Operations Event Records</Typography>
                      </Box>
                      <TableContainer sx={{ maxHeight: 350 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell>Record ID</TableCell>
                              <TableCell>Operations Event ID</TableCell>
                              <TableCell>Segment Response</TableCell>
                              <TableCell>Equipment ID</TableCell>
                              <TableCell>Event Type</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Effective Time</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {operationsEventRecords.slice(0, PREVIEW_ROW_LIMIT).map((record) => (
                              <TableRow key={record.id}>
                                <TableCell>{record.id}</TableCell>
                                <TableCell>{record.operationsEventId}</TableCell>
                                <TableCell>{record.segmentResponseId}</TableCell>
                                <TableCell>{record.equipmentId || 'N/A'}</TableCell>
                                <TableCell>{record.eventType || 'N/A'}</TableCell>
                                <TableCell>{record.status || 'N/A'}</TableCell>
                                <TableCell>{record.effectiveTime}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  )}

                  {operationsEventEntries.length > 0 && (
                    <Paper sx={{ mb: 2 }}>
                      <Box sx={{ p: 2, bgcolor: 'warning.light', color: 'black' }}>
                        <Typography variant="subtitle1">Maintenance Operations Event Entries</Typography>
                      </Box>
                      <TableContainer sx={{ maxHeight: 350 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell>Entry ID</TableCell>
                              <TableCell>Record ID</TableCell>
                              <TableCell>Segment Response</TableCell>
                              <TableCell>Equipment ID</TableCell>
                              <TableCell>Information Object Type</TableCell>
                              <TableCell>Entry Type</TableCell>
                              <TableCell>Effective Time</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {operationsEventEntries.slice(0, PREVIEW_ROW_LIMIT).map((entry) => (
                              <TableRow key={entry.id}>
                                <TableCell>{entry.id}</TableCell>
                                <TableCell>{entry.operationsEventRecordId}</TableCell>
                                <TableCell>{entry.segmentResponseId || 'N/A'}</TableCell>
                                <TableCell>{entry.equipmentId || 'N/A'}</TableCell>
                                <TableCell>{entry.informationObjectType || 'N/A'}</TableCell>
                                <TableCell>{entry.entryType || 'N/A'}</TableCell>
                                <TableCell>{entry.effectiveTime}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => exportMaintenanceActualToCSV('all')}>
                      Export All Maintenance Actual CSV
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {/* Unplanned Maintenance Tab */}
          {maintenanceActiveTab === 2 && (
            <Box>
              <Alert severity="warning" sx={{ mb: 3 }}>
                Generate unplanned maintenance data by selecting an existing operations event, a process segment, equipment, materials, and personnel. This creates an Operations Response, Segment Response, and all associated actuals and event records — no maintenance order (plan) is required.
              </Alert>

              <Paper sx={{ p: 2, mb: 3, bgcolor: 'warning.lighter' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6">🗄️ Stored Unplanned Maintenance Data (DB)</Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={loadStoredUnplannedMaintenanceData}
                    disabled={storedUnplannedDataLoading}
                  >
                    {storedUnplannedDataLoading ? 'Loading…' : 'Refresh'}
                  </Button>
                </Box>
                <Divider sx={{ mb: 2 }} />

                {storedUnplannedResponses.length === 0 ? (
                  <Alert severity="info">No stored unplanned maintenance data found in DB yet.</Alert>
                ) : (
                  <>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      <Chip size="small" color="warning" label={`Responses: ${storedUnplannedResponses.length}`} />
                      <Chip size="small" color="primary" label={`Segments: ${storedUnplannedSegmentResponses.length}`} />
                      <Chip size="small" color="success" label={`Material Actuals: ${storedUnplannedMaterialActuals.length}`} />
                      <Chip size="small" color="info" label={`Equipment Actuals: ${storedUnplannedEquipmentActuals.length}`} />
                      <Chip size="small" color="secondary" label={`Personnel Actuals: ${storedUnplannedPersonnelActuals.length}`} />
                      <Chip size="small" color="warning" variant="outlined" label={`Ops Events: ${storedUnplannedOpsEvents.length}`} />
                      <Chip size="small" color="warning" variant="outlined" label={`Event Records: ${storedUnplannedOpsEventRecords.length}`} />
                      <Chip size="small" color="warning" variant="outlined" label={`Event Entries: ${storedUnplannedOpsEventEntries.length}`} />
                    </Box>

                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                      <InputLabel>Stored Unplanned Response</InputLabel>
                      <Select
                        value={selectedStoredUnplannedResponseId}
                        label="Stored Unplanned Response"
                        onChange={(e) => setSelectedStoredUnplannedResponseId(e.target.value)}
                      >
                        {storedUnplannedResponses.map((response) => (
                          <MenuItem key={response.id} value={response.id}>
                            {response.id} - {response.description || 'Unplanned maintenance'}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {(() => {
                      const selectedResponse = storedUnplannedResponses.find((response) => response.id === selectedStoredUnplannedResponseId) || null;
                      if (!selectedResponse) return null;

                      const selectedSegmentResponses = storedUnplannedSegmentResponses.filter(
                        (segmentResponse) => segmentResponse.operationsResponseId === selectedResponse.id,
                      );
                      const selectedSegmentIds = new Set(selectedSegmentResponses.map((segmentResponse) => segmentResponse.id));
                      const selectedMaterialActuals = storedUnplannedMaterialActuals.filter((materialActual) => selectedSegmentIds.has(materialActual.segmentResponseId));
                      const selectedEquipmentActuals = storedUnplannedEquipmentActuals.filter((equipmentActual) => selectedSegmentIds.has(equipmentActual.segmentResponseId));
                      const selectedPersonnelActuals = storedUnplannedPersonnelActuals.filter((personnelActual) => selectedSegmentIds.has(personnelActual.segmentResponseId));
                      const selectedOpsEvents = storedUnplannedOpsEvents.filter((opsEvent) => selectedSegmentIds.has(opsEvent.segmentResponseId));
                      const selectedOpsEventIds = new Set(selectedOpsEvents.map((opsEvent) => opsEvent.id));
                      const selectedOpsEventRecords = storedUnplannedOpsEventRecords.filter(
                        (record) => selectedSegmentIds.has(record.segmentResponseId) || selectedOpsEventIds.has(record.operationsEventId),
                      );
                      const selectedOpsEventRecordIds = new Set(selectedOpsEventRecords.map((record) => record.id));
                      const selectedOpsEventEntries = storedUnplannedOpsEventEntries.filter(
                        (entry) => selectedSegmentIds.has(entry.segmentResponseId) || selectedOpsEventRecordIds.has(entry.operationsEventRecordId),
                      );

                      return (
                        <Box>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>{selectedResponse.id}</strong> | {selectedResponse.actualStartDateTime} → {selectedResponse.actualEndDateTime}
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                            <Chip size="small" label={`Segments: ${selectedSegmentResponses.length}`} />
                            <Chip size="small" label={`Material: ${selectedMaterialActuals.length}`} />
                            <Chip size="small" label={`Equipment: ${selectedEquipmentActuals.length}`} />
                            <Chip size="small" label={`Personnel: ${selectedPersonnelActuals.length}`} />
                            <Chip size="small" label={`Events: ${selectedOpsEvents.length}`} />
                            <Chip size="small" label={`Records: ${selectedOpsEventRecords.length}`} />
                            <Chip size="small" label={`Entries: ${selectedOpsEventEntries.length}`} />
                          </Box>

                          <TableContainer sx={{ maxHeight: 220 }}>
                            <Table size="small" stickyHeader>
                              <TableHead>
                                <TableRow>
                                  <TableCell>Segment Response</TableCell>
                                  <TableCell>Process Segment</TableCell>
                                  <TableCell>Equipment</TableCell>
                                  <TableCell>Start</TableCell>
                                  <TableCell>End</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {selectedSegmentResponses.slice(0, PREVIEW_ROW_LIMIT).map((segmentResponse) => (
                                  <TableRow key={segmentResponse.id}>
                                    <TableCell>{segmentResponse.id}</TableCell>
                                    <TableCell>{processSegments.find((processSegment) => processSegment.id === segmentResponse.processSegmentId)?.name || segmentResponse.processSegmentId}</TableCell>
                                    <TableCell>{segmentResponse.equipmentId || 'N/A'}</TableCell>
                                    <TableCell>{segmentResponse.actualStartDateTime}</TableCell>
                                    <TableCell>{segmentResponse.actualEndDateTime}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      );
                    })()}
                  </>
                )}
              </Paper>

              {/* Event Filter + Load */}
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>🔍 Filter &amp; Select Operations Event</Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Operations Type</InputLabel>
                      <Select
                        value={unplannedEventFilter.operationsType}
                        label="Operations Type"
                        onChange={(e) => setUnplannedEventFilter((f) => ({ ...f, operationsType: e.target.value }))}
                      >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="Production">Production</MenuItem>
                        <MenuItem value="Maintenance">Maintenance</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Event Type</InputLabel>
                      <Select
                        value={unplannedEventFilter.operationsEventType}
                        label="Event Type"
                        onChange={(e) => setUnplannedEventFilter((f) => ({ ...f, operationsEventType: e.target.value }))}
                      >
                        <MenuItem value="">All</MenuItem>
                        {[...new Set(unplannedStoredEvents.map((e) => e.eventType).filter(Boolean))].map((t) => (
                          <MenuItem key={t} value={t}>{t}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Search by ID or Description"
                      placeholder="Type to filter..."
                      value={unplannedEventFilter.search}
                      onChange={(e) => setUnplannedEventFilter((f) => ({ ...f, search: e.target.value }))}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 2 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={loadUnplannedStoredEvents}
                      disabled={unplannedEventsLoading}
                    >
                      {unplannedEventsLoading ? 'Loading…' : 'Load Events'}
                    </Button>
                  </Grid>
                </Grid>

                {unplannedStoredEvents.length === 0 ? (
                  <Alert severity="info">Click "Load Events" to fetch operations events from the database.</Alert>
                ) : (
                  (() => {
                    const filteredEvents = unplannedStoredEvents.filter((evt) => {
                      if (unplannedEventFilter.operationsType && evt.operationsType !== unplannedEventFilter.operationsType) return false;
                      if (unplannedEventFilter.operationsEventType && evt.eventType !== unplannedEventFilter.operationsEventType) return false;
                      if (unplannedEventFilter.search) {
                        const s = unplannedEventFilter.search.toLowerCase();
                        if (!evt.id?.toLowerCase().includes(s) && !evt.notes?.toLowerCase().includes(s)) return false;
                      }
                      return true;
                    });
                    return (
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {filteredEvents.length} event(s) matching filters (of {unplannedStoredEvents.length} total)
                        </Typography>
                        <Box sx={{ maxHeight: 280, overflowY: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                          {filteredEvents.slice(0, 200).map((evt) => {
                            const isSelected = evt.id === selectedUnplannedEventId;
                            return (
                              <Box
                                key={evt.id}
                                onClick={() => {
                                  setSelectedUnplannedEventId(evt.id);
                                  // Pre-fill datetimes from event
                                  if (evt.effectiveTimestamp) {
                                    const ts = evt.effectiveTimestamp.replace(' ', 'T');
                                    setUnplannedStartDateTime(evt.effectiveTimestamp);
                                    const endDt = new Date(new Date(ts).getTime() + 2 * 60 * 60 * 1000);
                                    setUnplannedEndDateTime(toDbDateTime(endDt));
                                  }
                                }}
                                sx={{
                                  p: 1.5,
                                  cursor: 'pointer',
                                  bgcolor: isSelected ? 'warning.lighter' : 'background.paper',
                                  borderBottom: 1,
                                  borderColor: 'divider',
                                  border: isSelected ? 2 : undefined,
                                  borderColor: isSelected ? 'warning.main' : 'divider',
                                  '&:hover': { bgcolor: 'action.hover' },
                                }}
                              >
                                <Typography variant="caption" display="block">
                                  <strong>{evt.id}</strong>
                                  {evt.operationsType && <Chip label={evt.operationsType} size="small" sx={{ ml: 1 }} color={evt.operationsType === 'Maintenance' ? 'warning' : 'primary'} />}
                                  {evt.eventType && <Chip label={evt.eventType} size="small" sx={{ ml: 0.5 }} variant="outlined" />}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {evt.notes || '(no description)'} | Equipment: {evt.equipmentId || 'N/A'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Timestamp: {evt.effectiveTimestamp}
                                </Typography>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                    );
                  })()
                )}
              </Paper>

              {/* Form */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>⚙️ Maintenance Parameters</Typography>
                      <Divider sx={{ mb: 2 }} />

                      {selectedUnplannedEventId && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                          Selected event: <strong>{selectedUnplannedEventId}</strong>
                        </Alert>
                      )}

                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Process Segment</InputLabel>
                        <Select
                          value={unplannedSegmentId}
                          label="Process Segment"
                          onChange={(e) => setUnplannedSegmentId(e.target.value)}
                        >
                          <MenuItem value=""><em>Select segment…</em></MenuItem>
                          {processSegments.map((ps) => (
                            <MenuItem key={ps.id} value={ps.id}>
                              {ps.name || ps.id}
                              {ps.operationsType && ` (${ps.operationsType})`}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Equipment</InputLabel>
                        <Select
                          value={unplannedEquipmentId}
                          label="Equipment"
                          onChange={(e) => setUnplannedEquipmentId(e.target.value)}
                        >
                          <MenuItem value=""><em>Select equipment…</em></MenuItem>
                          {equipment.map((eq) => (
                            <MenuItem key={eq.id} value={eq.id}>
                              {eq.name || eq.description || eq.id}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Materials Required</InputLabel>
                        <Select
                          multiple
                          value={unplannedMaterialIds}
                          label="Materials Required"
                          onChange={(e) => setUnplannedMaterialIds(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value as string[])}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {(selected as string[]).map((id) => {
                                const mat = materials.find((m) => m.id === id);
                                return <Chip key={id} label={mat?.name || id} size="small" />;
                              })}
                            </Box>
                          )}
                        >
                          {materials.map((mat) => (
                            <MenuItem key={mat.id} value={mat.id}>{mat.name || mat.id}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Personnel Required</InputLabel>
                        <Select
                          multiple
                          value={unplannedPersonnelIds}
                          label="Personnel Required"
                          onChange={(e) => setUnplannedPersonnelIds(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value as string[])}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {(selected as string[]).map((id) => {
                                const emp = employees.find((e) => e.id === id);
                                return <Chip key={id} label={emp?.employeeName || id} size="small" />;
                              })}
                            </Box>
                          )}
                        >
                          {employees.map((emp) => (
                            <MenuItem key={emp.id} value={emp.id}>{emp.employeeName || emp.id}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <TextField
                        fullWidth
                        size="small"
                        label="Start Date/Time"
                        type="datetime-local"
                        value={unplannedStartDateTime ? unplannedStartDateTime.replace(' ', 'T').slice(0, 16) : ''}
                        onChange={(e) => setUnplannedStartDateTime(e.target.value.replace('T', ' ') + ':00')}
                        InputLabelProps={{ shrink: true }}
                        helperText="Pre-filled from selected event"
                        sx={{ mb: 2 }}
                      />
                      <TextField
                        fullWidth
                        size="small"
                        label="End Date/Time"
                        type="datetime-local"
                        value={unplannedEndDateTime ? unplannedEndDateTime.replace(' ', 'T').slice(0, 16) : ''}
                        onChange={(e) => setUnplannedEndDateTime(e.target.value.replace('T', ' ') + ':00')}
                        InputLabelProps={{ shrink: true }}
                        helperText="Defaults to +2h from event timestamp"
                        sx={{ mb: 2 }}
                      />

                      <Button
                        fullWidth
                        variant="contained"
                        color="warning"
                        startIcon={<GenerateIcon />}
                        onClick={generateUnplannedMaintenanceData}
                        disabled={!selectedUnplannedEventId || !unplannedSegmentId || !unplannedEquipmentId}
                      >
                        Generate Unplanned Maintenance
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>📊 Generation Summary</Typography>
                      <Divider sx={{ mb: 2 }} />
                      {!generatedUnplannedResponse ? (
                        <Alert severity="info">
                          Fill in the form on the left and click "Generate Unplanned Maintenance" to preview data.
                        </Alert>
                      ) : (
                        <Box>
                          {unplannedTimestamp && (
                            <Typography variant="body2" gutterBottom>
                              <strong>Generated:</strong> {unplannedTimestamp.toLocaleString()}
                            </Typography>
                          )}
                          <Typography variant="body2" gutterBottom><strong>Operations Response:</strong> {generatedUnplannedResponse.id}</Typography>
                          <Typography variant="body2" gutterBottom><strong>Segment Response:</strong> {generatedUnplannedSegmentResponse?.id}</Typography>
                          <Typography variant="body2" gutterBottom><strong>Material Actuals:</strong> {unplannedMaterialActuals.length}</Typography>
                          <Typography variant="body2" gutterBottom><strong>Equipment Actuals:</strong> {unplannedEquipmentActuals.length}</Typography>
                          <Typography variant="body2" gutterBottom><strong>Personnel Actuals:</strong> {unplannedPersonnelActuals.length}</Typography>
                          <Typography variant="body2" gutterBottom><strong>Ops Events (for seg. response):</strong> {unplannedOpsEvents.length}</Typography>
                          <Typography variant="body2" gutterBottom><strong>Event Records:</strong> {unplannedOpsEventRecords.length}</Typography>
                          <Typography variant="body2" gutterBottom><strong>Event Entries:</strong> {unplannedOpsEventEntries.length}</Typography>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="caption" color="text.secondary">
                            Includes record &amp; entry on selected event <strong>{selectedUnplannedEventId}</strong> linking to the new segment response.
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Result tables */}
              {generatedUnplannedResponse && (
                <Box sx={{ mt: 2 }}>
                  {/* Operations Response */}
                  <Paper sx={{ mb: 2 }}>
                    <Box sx={{ p: 2, bgcolor: 'warning.main', color: 'white' }}>
                      <Typography variant="subtitle1">Unplanned Operations Response</Typography>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Start</TableCell>
                            <TableCell>End</TableCell>
                            <TableCell>Operations Type</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell>{generatedUnplannedResponse.id}</TableCell>
                            <TableCell>{generatedUnplannedResponse.actualStartDateTime}</TableCell>
                            <TableCell>{generatedUnplannedResponse.actualEndDateTime}</TableCell>
                            <TableCell>{generatedUnplannedResponse.operationsType}</TableCell>
                            <TableCell><Chip label={generatedUnplannedResponse.status} size="small" color="success" /></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>

                  {/* Segment Response */}
                  {generatedUnplannedSegmentResponse && (
                    <Paper sx={{ mb: 2 }}>
                      <Box sx={{ p: 2, bgcolor: 'warning.dark', color: 'white' }}>
                        <Typography variant="subtitle1">Unplanned Segment Response</Typography>
                      </Box>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>ID</TableCell>
                              <TableCell>Process Segment</TableCell>
                              <TableCell>Equipment</TableCell>
                              <TableCell>Start</TableCell>
                              <TableCell>End</TableCell>
                              <TableCell>Operations Type</TableCell>
                              <TableCell>Status</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            <TableRow>
                              <TableCell>{generatedUnplannedSegmentResponse.id}</TableCell>
                              <TableCell>{processSegments.find((ps) => ps.id === generatedUnplannedSegmentResponse.processSegmentId)?.name || generatedUnplannedSegmentResponse.processSegmentId}</TableCell>
                              <TableCell>{generatedUnplannedSegmentResponse.equipmentId}</TableCell>
                              <TableCell>{generatedUnplannedSegmentResponse.actualStartDateTime}</TableCell>
                              <TableCell>{generatedUnplannedSegmentResponse.actualEndDateTime}</TableCell>
                              <TableCell>{generatedUnplannedSegmentResponse.operationsType}</TableCell>
                              <TableCell><Chip label={generatedUnplannedSegmentResponse.status} size="small" color="success" /></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  )}

                  {/* Material Actuals */}
                  {unplannedMaterialActuals.length > 0 && (
                    <Paper sx={{ mb: 2 }}>
                      <Box sx={{ p: 2, bgcolor: 'success.dark', color: 'white' }}>
                        <Typography variant="subtitle1">Material Actuals</Typography>
                      </Box>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>ID</TableCell>
                              <TableCell>Material</TableCell>
                              <TableCell>Lot</TableCell>
                              <TableCell>Qty</TableCell>
                              <TableCell>Direction</TableCell>
                              <TableCell>Operations Type</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {unplannedMaterialActuals.map((ma) => {
                              const mat = materials.find((m) => m.id === ma.materialId);
                              return (
                                <TableRow key={ma.id}>
                                  <TableCell>{ma.id}</TableCell>
                                  <TableCell>{mat?.name || ma.materialId}</TableCell>
                                  <TableCell>{ma.materialLotId}</TableCell>
                                  <TableCell>{ma.actualQty} {ma.qtyUoM}</TableCell>
                                  <TableCell>{ma.direction}</TableCell>
                                  <TableCell>{ma.operationsType}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  )}

                  {/* Equipment Actuals */}
                  <Paper sx={{ mb: 2 }}>
                    <Box sx={{ p: 2, bgcolor: 'info.dark', color: 'white' }}>
                      <Typography variant="subtitle1">Equipment Actuals</Typography>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Equipment</TableCell>
                            <TableCell>Qty</TableCell>
                            <TableCell>Start</TableCell>
                            <TableCell>End</TableCell>
                            <TableCell>Operations Type</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {unplannedEquipmentActuals.map((ea) => (
                            <TableRow key={ea.id}>
                              <TableCell>{ea.id}</TableCell>
                              <TableCell>{ea.equipmentId}</TableCell>
                              <TableCell>{ea.actualQuantity} {ea.unitOfMeasure}</TableCell>
                              <TableCell>{ea.actualStartDateTime}</TableCell>
                              <TableCell>{ea.actualEndDateTime}</TableCell>
                              <TableCell>{ea.operationsType}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>

                  {/* Personnel Actuals */}
                  {unplannedPersonnelActuals.length > 0 && (
                    <Paper sx={{ mb: 2 }}>
                      <Box sx={{ p: 2, bgcolor: 'secondary.dark', color: 'white' }}>
                        <Typography variant="subtitle1">Personnel Actuals</Typography>
                      </Box>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>ID</TableCell>
                              <TableCell>Employee</TableCell>
                              <TableCell>Qty</TableCell>
                              <TableCell>Use</TableCell>
                              <TableCell>Start</TableCell>
                              <TableCell>End</TableCell>
                              <TableCell>Operations Type</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {unplannedPersonnelActuals.map((pa) => {
                              const emp = employees.find((e) => e.id === pa.employeeId);
                              return (
                                <TableRow key={pa.id}>
                                  <TableCell>{pa.id}</TableCell>
                                  <TableCell>{emp?.employeeName || pa.employeeId || 'N/A'}</TableCell>
                                  <TableCell>{pa.actualQuantity} {pa.quantityUnitOfMeasure}</TableCell>
                                  <TableCell>{pa.personnelUse}</TableCell>
                                  <TableCell>{pa.actualStartDateTime}</TableCell>
                                  <TableCell>{pa.actualEndDateTime}</TableCell>
                                  <TableCell>{pa.operationsType}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  )}

                  {/* Operations Events */}
                  {unplannedOpsEvents.length > 0 && (
                    <Paper sx={{ mb: 2 }}>
                      <Box sx={{ p: 2, bgcolor: 'warning.main', color: 'white' }}>
                        <Typography variant="subtitle1">Operations Events (New – for Segment Response)</Typography>
                      </Box>
                      <TableContainer sx={{ maxHeight: 300 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell>Event ID</TableCell>
                              <TableCell>Segment Response</TableCell>
                              <TableCell>Equipment</TableCell>
                              <TableCell>Event Type</TableCell>
                              <TableCell>Operations Type</TableCell>
                              <TableCell>Effective Timestamp</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {unplannedOpsEvents.slice(0, PREVIEW_ROW_LIMIT).map((evt) => (
                              <TableRow key={evt.id}>
                                <TableCell>{evt.id}</TableCell>
                                <TableCell>{evt.segmentResponseId}</TableCell>
                                <TableCell>{evt.equipmentId}</TableCell>
                                <TableCell>{evt.eventType}</TableCell>
                                <TableCell>{evt.operationsType}</TableCell>
                                <TableCell>{evt.effectiveTimestamp}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  )}

                  {/* Operations Event Records */}
                  {unplannedOpsEventRecords.length > 0 && (
                    <Paper sx={{ mb: 2 }}>
                      <Box sx={{ p: 2, bgcolor: 'warning.dark', color: 'white' }}>
                        <Typography variant="subtitle1">Operations Event Records</Typography>
                      </Box>
                      <Alert severity="info" sx={{ m: 1 }}>
                        The record with ID = <strong>{generatedUnplannedSegmentResponse?.id}</strong> is linked to the <em>selected existing event</em> <strong>{selectedUnplannedEventId}</strong>. All other records belong to the newly created operations events.
                      </Alert>
                      <TableContainer sx={{ maxHeight: 300 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell>Record ID</TableCell>
                              <TableCell>Operations Event ID</TableCell>
                              <TableCell>Segment Response</TableCell>
                              <TableCell>Equipment</TableCell>
                              <TableCell>Event Type</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Effective Time</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {unplannedOpsEventRecords.slice(0, PREVIEW_ROW_LIMIT).map((rec) => (
                              <TableRow key={rec.id} sx={{ bgcolor: rec.operationsEventId === selectedUnplannedEventId ? 'warning.lighter' : undefined }}>
                                <TableCell>{rec.id}</TableCell>
                                <TableCell>{rec.operationsEventId}</TableCell>
                                <TableCell>{rec.segmentResponseId}</TableCell>
                                <TableCell>{rec.equipmentId}</TableCell>
                                <TableCell>{rec.eventType}</TableCell>
                                <TableCell>{rec.status}</TableCell>
                                <TableCell>{rec.effectiveTime}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  )}

                  {/* Operations Event Entries */}
                  {unplannedOpsEventEntries.length > 0 && (
                    <Paper sx={{ mb: 2 }}>
                      <Box sx={{ p: 2, bgcolor: 'warning.light', color: 'black' }}>
                        <Typography variant="subtitle1">Operations Event Entries</Typography>
                      </Box>
                      <TableContainer sx={{ maxHeight: 300 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell>Entry ID</TableCell>
                              <TableCell>Record ID</TableCell>
                              <TableCell>Segment Response</TableCell>
                              <TableCell>Equipment</TableCell>
                              <TableCell>Information Object Type</TableCell>
                              <TableCell>Entry Type</TableCell>
                              <TableCell>Effective Time</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {unplannedOpsEventEntries.slice(0, PREVIEW_ROW_LIMIT).map((entry) => (
                              <TableRow key={entry.id}>
                                <TableCell>{entry.id}</TableCell>
                                <TableCell>{entry.operationsEventRecordId}</TableCell>
                                <TableCell>{entry.segmentResponseId}</TableCell>
                                <TableCell>{entry.equipmentId}</TableCell>
                                <TableCell>{entry.informationObjectType || 'N/A'}</TableCell>
                                <TableCell>{entry.entryType}</TableCell>
                                <TableCell>{entry.effectiveTime}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  )}
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}

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

export default ProcessDataGenerator;
