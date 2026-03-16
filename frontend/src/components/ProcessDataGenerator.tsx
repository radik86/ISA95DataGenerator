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

interface EquipmentPropertyTracking {
  id: string;
  segmentResponseId: string;
  equipmentId: string;
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

const ProcessDataGenerator: React.FC = () => {
  const MAX_DAILY_ORDERS = 20;
  const MAX_UTILIZATION_PERCENT = 200;
  const PREVIEW_ROW_LIMIT = 200;
  const MAX_TRACKING_RECORDS_TO_SAVE = 20000;

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

    // Maintenance actual state
    const [savedMaintenanceRequests, setSavedMaintenanceRequests] = useState<any[]>([]);
    const [selectedMaintenanceRequestId, setSelectedMaintenanceRequestId] = useState('');
    const [generatedMaintenanceResponse, setGeneratedMaintenanceResponse] = useState<OperationsResponse | null>(null);
    const [maintenanceSegmentResponses, setMaintenanceSegmentResponses] = useState<SegmentResponse[]>([]);
    const [maintenanceMaterialActuals, setMaintenanceMaterialActuals] = useState<SegmentMaterialActual[]>([]);
    const [maintenanceEquipmentActuals, setMaintenanceEquipmentActuals] = useState<SegmentEquipmentActual[]>([]);
    const [maintenanceActualTimestamp, setMaintenanceActualTimestamp] = useState<Date | null>(null);
    const [maintenancePlanReference, setMaintenancePlanReference] = useState<OperationsRequest | null>(null);
    const [maintenanceSegReqReference, setMaintenanceSegReqReference] = useState<SegmentRequirement[]>([]);

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
      setSnackbar({ open: true, message, severity });
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
      setMaintenanceActualTimestamp(null);
      setMaintenancePlanReference(null);
      setMaintenanceSegReqReference([]);
      return;
    }

    try {
      const [allResponses, allSegmentResponses, allMaterialActuals, allEquipmentActuals, requestData] = await Promise.all([
        processDataApi.getAll('operationsResponses'),
        processDataApi.getAll('segmentResponses'),
        processDataApi.getAll('segmentMaterialActuals'),
        processDataApi.getAll('segmentEquipmentActuals'),
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

        setGeneratedMaintenanceResponse(selectedResponse);
        setMaintenanceSegmentResponses(segResponses);
        setMaintenanceMaterialActuals(matActuals);
        setMaintenanceEquipmentActuals(eqActuals);
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
      const [mat, eq, ps, bom, eu, le, pl, p, eprop, epa, ecpa, oed, oedsa, oedp, oedpa, oert, oeet, shft, crw, sca, hs, mBoms] = await Promise.all([
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

      console.log('[Master Data] Loaded:', {
        materials: mat.length,
        equipment: eq.length,
        processSegments: ps.length,
        segmentBOMs: bom.length,
        maintenanceBOMs: mBoms.length,
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
        
        // Create an operations event record for each event
        const recordId = `OER-${opsEvent.id.replace('OPS-EVENT-', '')}`;
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
            const entryId = `OEE-${recordId.replace('OER-', '')}-${String(entryCount).padStart(2, '0')}`;
            
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
            };
            generatedOperationsEventEntries.push(operationsEventEntry);
          }
        }
        
        // If no templates found, create a default entry
        if (entryCount === 0) {
          const entryId = `OEE-${recordId.replace('OER-', '')}-01`;
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
          };
          generatedOperationsEventEntries.push(operationsEventEntry);
          entryCount = 1;
        }
        
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

            const trackingId = `PROP-TRACK-${eqActual.id}-${assignment.equipmentPropertyId}-${i.toString().padStart(4, '0')}`;

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
              segmentResponseId: eqActual.segmentResponseId,
              equipmentId: eqActual.equipmentId,
              equipmentPropertyId: assignment.equipmentPropertyId,
              equipmentPropertyName: property.name,
              equipmentClassId: equipmentClassId,
              equipmentClassPropertyId: equipmentClassPropertyId,
              value: value,
              uom: property.unit || '',
              createdTimestamp: sampleTime.toISOString().slice(0, 19).replace('T', ' '),
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

              const trackingId = `PROP-TRACK-${eqActual.id}-CHILD-${childEq.id}-${assignment.equipmentPropertyId}-${i.toString().padStart(4, '0')}`;

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
                segmentResponseId: eqActual.segmentResponseId,
                equipmentId: childEq.id,
                equipmentPropertyId: assignment.equipmentPropertyId,
                equipmentPropertyName: property.name,
                equipmentClassId: childEquipmentClassId,
                equipmentClassPropertyId: childEquipmentClassPropertyId,
                value: value,
                uom: property.unit || '',
                createdTimestamp: sampleTime.toISOString().slice(0, 19).replace('T', ' '),
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
      
      // Generate Test Results for produced material lots
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

      showSnackbar(`Generated actual data: ${generatedSegResponses.length} segment responses, ${generatedMatActuals.length} material actuals, ${generatedEqActuals.length} equipment actuals, ${generatedPropertyTracking.length} property tracking records, ${generatedOperationsEvents.length} operations events, ${generatedOperationsEventProperties.length} event properties, ${generatedSegmentData.length} segment data records, ${generatedMaterialLots.length} material lots, ${generatedMaterialSublots.length} material sublots, ${generatedTestResults.length} test results`, 'success');
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
      requirementType: mb.materialUse || 'CONSUME',
      operationsType: 'Maintenance',
    }));

    const eqReqs: SegmentEquipmentRequirement[] = sortedBoms.map((mb, index) => {
      const eqData = equipment.find((e) => e.id === maintenancePlanFormData.equipmentId);
      return {
        id: `MNT-ER-${requestId}-${index + 1}`,
        segmentRequirementId: segReqs[index].id,
        lineId: maintenancePlanFormData.lineId,
        equipmentClassId: eqData?.equipmentClassId || '',
        equipmentId: maintenancePlanFormData.equipmentId,
        requirementType: 'MUST_USE',
        plannedQuantity: 1,
        unitOfMeasure: 'Machine',
        operationsType: 'Maintenance',
      };
    });

    setGeneratedMaintenanceRequest(request);
    setMaintenanceSegmentRequirements(segReqs);
    setMaintenanceMaterialRequirements(matReqs);
    setMaintenanceEquipmentRequirements(eqReqs);
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

      const matActuals: SegmentMaterialActual[] = (orData.materialRequirements || []).map((mr: any, index: number) => ({
        id: `MNT-MACT-${respId}-${index + 1}`,
        segmentResponseId: segRespBySegReq.get(mr.segmentRequirementId)?.id || '',
        materialId: mr.materialId,
        materialLotId: `MNT-LOT-${timestamp.getTime()}-${index + 1}`,
        actualQty: mr.requiredQty || 1,
        qtyUoM: mr.qtyUoM || 'EA',
        direction: 'CONSUME',
        operationsType: 'Maintenance',
      })).filter((m) => !!m.segmentResponseId);

      const eqActuals: SegmentEquipmentActual[] = (orData.equipmentRequirements || []).map((er: any, index: number) => ({
        id: `MNT-EACT-${respId}-${index + 1}`,
        segmentResponseId: segRespBySegReq.get(er.segmentRequirementId)?.id || '',
        equipmentId: er.equipmentId,
        actualQuantity: 1,
        actualStartDateTime: baseReq.plannedStartDateTime,
        actualEndDateTime: baseReq.plannedEndDateTime,
        unitOfMeasure: 'Machine',
        operationsType: 'Maintenance',
      })).filter((e) => !!e.segmentResponseId);

      setGeneratedMaintenanceResponse(response);
      setMaintenanceSegmentResponses(segResponses);
      setMaintenanceMaterialActuals(matActuals);
      setMaintenanceEquipmentActuals(eqActuals);
      setMaintenanceActualTimestamp(timestamp);
      setMaintenancePlanReference(orData.operationsRequest);
      setMaintenanceSegReqReference(orData.segmentRequirements || []);

      setLoading(false);
      showSnackbar(`Maintenance actual generated: ${segResponses.length} segment responses`, 'success');
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
  };

  const resetMaintenanceActual = () => {
    setSelectedMaintenanceRequestId('');
    setGeneratedMaintenanceResponse(null);
    setMaintenanceSegmentResponses([]);
    setMaintenanceMaterialActuals([]);
    setMaintenanceEquipmentActuals([]);
    setMaintenanceActualTimestamp(null);
    setMaintenancePlanReference(null);
    setMaintenanceSegReqReference([]);
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

      let trackingRecordsToSave = equipmentPropertyTracking;
      if (equipmentPropertyTracking.length > MAX_TRACKING_RECORDS_TO_SAVE) {
        const step = Math.ceil(equipmentPropertyTracking.length / MAX_TRACKING_RECORDS_TO_SAVE);
        trackingRecordsToSave = equipmentPropertyTracking
          .filter((_, index) => index % step === 0)
          .slice(0, MAX_TRACKING_RECORDS_TO_SAVE);

        showSnackbar(
          `EquipmentPropertyTracking reduced for save: ${equipmentPropertyTracking.length} generated, ${trackingRecordsToSave.length} persisted`,
          'success',
        );
      }

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
          entity: 'TestResult',
          save: () => processDataApi.upsertStoreRecords('testResults', testResults),
        },
        {
          entity: 'MaterialLot',
          save: async () => {
            if (generatedMaterialLotsForDisplay.length === 0) return 0;
            const result = await masterDataApi.bulkAdd('materialLots', generatedMaterialLotsForDisplay);
            return result.succeeded;
          },
        },
        {
          entity: 'MaterialSublot',
          save: async () => {
            if (generatedMaterialSublotsForDisplay.length === 0) return 0;
            const result = await masterDataApi.bulkAdd('materialSublots', generatedMaterialSublotsForDisplay);
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
        'segmentEquipmentRequirements'
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
      
      setLoading(false);
      showSnackbar(`Cleaned up ${orphanedMatReqs.length} material and ${orphanedEqReqs.length} equipment orphaned records`, 'success');
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

      console.log(`[Delete Plan] Found ${segmentReqs.length} segment requirements, ${materialReqs.length} material requirements, ${equipmentReqs.length} equipment requirements`);
      
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
      
      // 3. Delete segment requirements
      for (const sr of segmentReqs) {
        await processDataApi.delete('segmentRequirements', sr.id);
      }
      console.log(`[Delete Plan] Deleted ${segmentReqs.length} segment requirements`);
      
      // 4. Delete the operations request itself
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
      
      // 3. Delete operations events
      for (const segId of segmentResponseIds) {
        const events = storedOperationsEvents.filter(oe => oe.segmentResponseId === segId);
        for (const evt of events) {
          await processDataApi.delete('operationsEvents', evt.id);
        }
        console.log(`[Delete] Deleted ${events.length} operations events for segment ${segId}`);
      }
      
      // 4. Delete segment data (shifts and crews)
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

    // Create downloads based on type
    if (type === 'all') {
      downloadCSV(orCsv, 'operations_response.csv');
      downloadCSV(srCsv, 'segment_responses.csv');
      downloadCSV(maCsv, 'segment_material_actuals.csv');
      downloadCSV(eaCsv, 'segment_equipment_actuals.csv');
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

    const lineEquipmentIds = lineEquipment
      .filter(le => le.productionLineId === lineId && le.plantId === plantId)
      .map(le => le.equipmentId);

    let currentTime = new Date(planStart);
    let previousSegmentFirstRunEnd: Date | null = null;

    productSegments.forEach((segment, index) => {
      const segReqId = `SR-${plantId}-${lineId}-${dateTimeStr}-${String(index + 1).padStart(3, '0')}-${segment.id}`;
      const segmentDuration = Number(segment.durationHours) || 2;
      const eqUsages = equipmentUsages.filter(
        eu => eu.processSegmentId === segment.id && lineEquipmentIds.includes(eu.equipmentId),
      );
      const equipmentCapacity = eqUsages.length > 0 ? Math.max(1, Number(eqUsages[0].capacityPerRun) || 1) : quantity;
      const requiredRuns = Math.max(1, Math.ceil(quantity / equipmentCapacity));
      const totalDuration = segmentDuration * requiredRuns;

      let segmentStartTime: Date;
      if (index === 0) segmentStartTime = new Date(currentTime);
      else if (previousSegmentFirstRunEnd) segmentStartTime = new Date(previousSegmentFirstRunEnd);
      else segmentStartTime = new Date(currentTime);

      const firstRunEnd = new Date(segmentStartTime.getTime() + segmentDuration * 60 * 60 * 1000);
      let allRunsEnd = new Date(segmentStartTime.getTime() + totalDuration * 60 * 60 * 1000);
      if (index > 0 && currentTime > allRunsEnd) {
        allRunsEnd = new Date(currentTime.getTime() + segmentDuration * 60 * 60 * 1000);
      }

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

      previousSegmentFirstRunEnd = firstRunEnd;
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
            id: `PROP-TRACK-${eqActual.id}-${assignment.equipmentPropertyId}-${i.toString().padStart(4, '0')}`,
            segmentResponseId: eqActual.segmentResponseId,
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

        const recordId = `OER-${eventId.replace('OPS-EVENT-', '')}`;
        generatedOperationsEventRecords.push({
          id: recordId,
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
          id: `OEE-${recordId.replace('OER-', '')}-01`,
          operationsEventRecordId: recordId,
          entryType: 'Production',
          description: `Entry for ${eventId}`,
          effectiveTime: toDbDateTime(new Date(eventTime.getTime() + 5 * 60 * 1000)),
          segmentResponseId: segResp.id,
          equipmentId: eqId,
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
      
      showSnackbar(`Generated ${generatedSegReqs.length} segment requirements with ${generatedMatReqs.length} material and ${generatedEqReqs.length} equipment requirements`, 'success');
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
        equipmentRequirements
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

    // Create downloads based on type
    if (type === 'all') {
      downloadCSV(orCsv, 'operations_requests.csv');
      downloadCSV(srCsv, 'segment_requirements.csv');
      downloadCSV(mrCsv, 'segment_material_requirements.csv');
      downloadCSV(erCsv, 'segment_equipment_requirements.csv');
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

  const exportMaintenancePlanToCSV = (type: 'all' | 'operations' | 'segments' | 'materials' | 'equipment') => {
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

    if (type === 'all') {
      downloadCSV(orCsv, 'maintenance_operations_request.csv');
      downloadCSV(srCsv, 'maintenance_segment_requirements.csv');
      downloadCSV(mrCsv, 'maintenance_material_requirements.csv');
      downloadCSV(erCsv, 'maintenance_equipment_requirements.csv');
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
    }
  };

  const exportMaintenanceActualToCSV = (type: 'all' | 'response' | 'segments' | 'materials' | 'equipment') => {
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

    if (type === 'all') {
      downloadCSV(orCsv, 'maintenance_operations_response.csv');
      downloadCSV(srCsv, 'maintenance_segment_responses.csv');
      downloadCSV(maCsv, 'maintenance_material_actuals.csv');
      downloadCSV(eaCsv, 'maintenance_equipment_actuals.csv');
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
      // Load all segment requirements, material requirements, and equipment requirements from database
      const allSegmentRequirements = await processDataApi.getAll('segmentRequirements');
      const allMaterialRequirements = await processDataApi.getAll('segmentMaterialRequirements');
      const allEquipmentRequirements = await processDataApi.getAll('segmentEquipmentRequirements');

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

      // Download all files
      downloadCSV(orCsv, 'all_operations_requests.csv');
      downloadCSV(srCsv, 'all_segment_requirements.csv');
      downloadCSV(mrCsv, 'all_segment_material_requirements.csv');
      downloadCSV(erCsv, 'all_segment_equipment_requirements.csv');

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

      // Create a single JSON object with all plan data
      const planDataExport = {
        exportDate: new Date().toISOString(),
        dataType: 'ISA95_Plan_Data',
        version: '1.0',
        operationsRequests: savedOperationsRequests,
        segmentRequirements: allSegmentRequirements,
        segmentMaterialRequirements: allMaterialRequirements,
        segmentEquipmentRequirements: allEquipmentRequirements
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
    setGenerationTimestamp(null);
    setDataVersion(1);
  };

  const finishedProducts = materials.filter(m => m.classId === 'FINISHEDPRODUCT');
  const linesForPlant = productionLines.filter(pl => pl.plantId === formData.plantId);

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
            startIcon={<RefreshIcon />}
            onClick={
              mainTab === 0
                ? (activeTab === 0 ? resetForm : resetActualData)
                : (maintenanceActiveTab === 0 ? resetMaintenancePlan : resetMaintenanceActual)
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
                : (maintenanceActiveTab === 0 ? saveMaintenancePlanToDatabase : saveMaintenanceActualToDatabase)
            }
            disabled={
              mainTab === 0
                ? (activeTab === 0 ? segmentRequirements.length === 0 : segmentResponses.length === 0)
                : (maintenanceActiveTab === 0 ? maintenanceSegmentRequirements.length === 0 : maintenanceSegmentResponses.length === 0)
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
          </Tabs>

          {maintenanceActiveTab === 0 && (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                Create maintenance plan orders from Maintenance BOM by equipment. This generates operations requests, segment requirements, material requirements, and equipment requirements.
              </Alert>

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
                              onChange={(e) => setMaintenancePlanFormData({ ...maintenancePlanFormData, plantId: e.target.value, lineId: '' })}
                            >
                              {plants.map((plant) => (
                                <MenuItem key={plant.id} value={plant.id}>{plant.name || plant.id}</MenuItem>
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
                                .filter((line) => line.plantId === maintenancePlanFormData.plantId)
                                .map((line) => (
                                  <MenuItem key={line.id} value={line.id}>{line.name || line.lineName || line.id}</MenuItem>
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
                            >
                              {equipment.map((eq) => (
                                <MenuItem key={eq.id} value={eq.id}>{eq.name || eq.id}</MenuItem>
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
                Generate maintenance actual data from a saved maintenance order. It creates operations request execution data with segment, material, and equipment actuals.
              </Alert>

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

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => exportMaintenanceActualToCSV('all')}>
                      Export All Maintenance Actual CSV
                    </Button>
                  </Box>
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
