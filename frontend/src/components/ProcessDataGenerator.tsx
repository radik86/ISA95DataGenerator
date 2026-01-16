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
} from '@mui/material';
import {
  PlayArrow as GenerateIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  GetApp as GetAppIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { masterDataDB } from '../services/masterDataDB';
import { processDataDB } from '../services/processDataDB';

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
}

interface SegmentRequirement {
  id: string;
  operationsRequestId: string;
  processSegmentId: string;
  sequence: number;
  earliestStartDateTime: string;
  latestEndDateTime: string;
  targetQuantity: number;
  quantityUoM: string;
}

interface SegmentMaterialRequirement {
  id: string;
  segmentRequirementId: string;
  materialId: string;
  requiredQty: number;
  qtyUoM: string;
  requirementType: string;
}

interface SegmentEquipmentRequirement {
  id: string;
  segmentRequirementId: string;
  lineId: string;
  equipmentClassId: string;
  equipmentId: string;
  requirementType: string;
  plannedDurationHours: number;
}

// Actual Data Interfaces
interface OperationsResponse {
  id: string;
  operationsRequestId: string;
  description: string;
  actualStartDateTime: string;
  actualEndDateTime: string;
  actualQuantity: number;
  quantityUoM: string;
  status: string;
}

interface SegmentResponse {
  id: string;
  segmentRequirementId: string;
  operationsResponseId: string;
  processSegmentId: string;
  actualStartDateTime: string;
  actualEndDateTime: string;
  actualQuantity: number;
  quantityUoM: string;
  status: string;
}

interface SegmentMaterialActual {
  id: string;
  segmentResponseId: string;
  materialId: string;
  materialLotId: string;
  actualQty: number;
  qtyUoM: string;
  direction: 'CONSUME' | 'PRODUCE' | 'Scrap';
}

interface SegmentEquipmentActual {
  id: string;
  segmentResponseId: string;
  equipmentId: string;
  actualDurationHours: number;
  actualStartDateTime: string;
  actualEndDateTime: string;
}

interface EquipmentPropertyTracking {
  id: string;
  segmentResponseId: string;
  equipmentId: string;
  equipmentPropertyId: string;
  value: number;
  uom: string;
  createdTimestamp: string;
}

interface OperationsEvent {
  id: string;
  segmentResponseId: string;
  operationsEventDefinitionId: string;
  effectiveTimestamp: string;
  notes: string;
}

interface TestResult {
  id: string;
  materialLotId: string;
  description: string;
  evaluationDate: string;
  evaluatedCriterionResult: string;
}

const ProcessDataGenerator: React.FC = () => {
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
  const [productionLines, setProductionLines] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [equipmentProperties, setEquipmentProperties] = useState<any[]>([]);
  const [equipmentPropertyAssignments, setEquipmentPropertyAssignments] = useState<any[]>([]);
  const [operationEventDefinitions, setOperationEventDefinitions] = useState<any[]>([]);
  const [operationEventDefSegmentAssignments, setOperationEventDefSegmentAssignments] = useState<any[]>([]);

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
  const [storedTestResults, setStoredTestResults] = useState<any[]>([]);
  const [storedEquipmentPropertyTracking, setStoredEquipmentPropertyTracking] = useState<any[]>([]);

  // Data overview filters and expansion states
  const [planDataExpanded, setPlanDataExpanded] = useState(false);
  const [actualDataExpanded, setActualDataExpanded] = useState(false);
  const [planDataFilter, setPlanDataFilter] = useState('');
  const [actualDataFilter, setActualDataFilter] = useState('');
  const [materialActualsFilter, setMaterialActualsFilter] = useState<'ALL' | 'CONSUME' | 'PRODUCE' | 'Scrap'>('ALL');
  const [segmentResponsesFilter, setSegmentResponsesFilter] = useState('');

  const loadSavedOperationsRequests = async () => {
    try {
      const requests = await processDataDB.getAll('operationsRequests');
      setSavedOperationsRequests(requests);
    } catch (error) {
      console.error('Failed to load operations requests:', error);
    }
  };

  const loadStoredActualData = async () => {
    try {
      const [opsResp, segResp, matAct, eqAct, opsEvt, tests, eqProp] = await Promise.all([
        processDataDB.getAll('operationsResponses'),
        processDataDB.getAll('segmentResponses'),
        processDataDB.getAll('segmentMaterialActuals'),
        processDataDB.getAll('segmentEquipmentActuals'),
        processDataDB.getAll('operationsEvents'),
        processDataDB.getAll('testResults'),
        processDataDB.getAll('equipmentPropertyTracking'),
      ]);

      setStoredOperationsResponses(opsResp);
      setStoredSegmentResponses(segResp);
      setStoredMaterialActuals(matAct);
      setStoredEquipmentActuals(eqAct);
      setStoredOperationsEvents(opsEvt);
      setStoredTestResults(tests);
      setStoredEquipmentPropertyTracking(eqProp);

      console.log('[Stored Actual Data] Loaded:', {
        operationsResponses: opsResp.length,
        segmentResponses: segResp.length,
        materialActuals: matAct.length,
        equipmentActuals: eqAct.length,
        operationsEvents: opsEvt.length,
        testResults: tests.length,
        equipmentPropertyTracking: eqProp.length,
      });
    } catch (error) {
      console.error('Failed to load stored actual data:', error);
    }
  };

  const loadMasterData = async () => {
    try {
      setLoading(true);
      const [mat, eq, ps, bom, eu, pl, p, eprop, epa, oed, oedsa] = await Promise.all([
        masterDataDB.getAll('materials'),
        masterDataDB.getAll('equipment'),
        masterDataDB.getAll('processSegments'),
        masterDataDB.getAll('segmentBOMs'),
        masterDataDB.getAll('equipmentUsages'),
        masterDataDB.getAll('productionLines'),
        masterDataDB.getAll('plants'),
        masterDataDB.getAll('equipmentProperties'),
        masterDataDB.getAll('equipmentPropertyAssignments'),
        masterDataDB.getAll('operationEventDefinitions'),
        masterDataDB.getAll('operationEventDefSegmentAssignments'),
      ]);

      setMaterials(mat);
      setEquipment(eq);
      setProcessSegments(ps);
      setSegmentBOMs(bom);
      setEquipmentUsages(eu);
      setProductionLines(pl);
      setPlants(p);
      setEquipmentProperties(eprop);
      setEquipmentPropertyAssignments(epa);
      setOperationEventDefinitions(oed);
      setOperationEventDefSegmentAssignments(oedsa);
      
      console.log('[Master Data] Loaded:', {
        operationEventDefinitions: oed.length,
        operationEventDefSegmentAssignments: oedsa.length
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to load master data:', error);
      showSnackbar('Failed to load master data', 'error');
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  useEffect(() => {
    loadMasterData();
    loadSavedOperationsRequests();
    loadStoredActualData();
  }, []);

  const generateActualData = async () => {
    if (!selectedOperationsRequestId || !actualProductQuantity) {
      showSnackbar('Please select an operations request and enter actual quantity', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Load the operations request and its requirements
      const orData = await processDataDB.getOperationsRequestWithRequirements(selectedOperationsRequestId);
      if (!orData) {
        showSnackbar('Operations request not found', 'error');
        setLoading(false);
        return;
      }

      const timestamp = new Date();
      setActualGenerationTimestamp(timestamp);
      
      // Store reference data for display
      setReferenceOperationsRequest(orData.operationsRequest);
      setReferenceSegmentRequirements(orData.segmentRequirements);

      // Generate Operations Response ID
      const opsResponseId = `OPS-RESP-${timestamp.toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

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
        const eqUsages = equipmentUsages.filter(eu => eu.processSegmentId === segReq.processSegmentId);
        const equipmentCapacity = eqUsages.length > 0 ? eqUsages[0].capacityPerRun : 100;
        
        console.log(`[Seq ${segReq.sequence}] Process segment: ${processSegment.name}, Duration: ${segmentDuration}h, Equipment capacity: ${equipmentCapacity}`);
        
        // Calculate number of runs needed
        const runsNeeded = Math.ceil(actualProductQuantity / equipmentCapacity);
        
        console.log(`[Seq ${segReq.sequence}] Runs needed: ${runsNeeded} (${actualProductQuantity} units / ${equipmentCapacity} capacity)`);
        
        // Create multiple segment responses based on equipment capacity
        for (let run = 0; run < runsNeeded; run++) {
          const segRespId = `SEG-RESP-${segReq.id}-RUN${run + 1}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
          
          // Calculate quantity for this run
          const remainingQty = actualProductQuantity - (run * equipmentCapacity);
          const runQuantity = Math.min(equipmentCapacity, remainingQty);
          
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
          
          // Calculate duration for this run
          const runDuration = segmentDuration;
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
            actualStartDateTime: runStartTime.toISOString().slice(0, 19).replace('T', ' '),
            actualEndDateTime: endTime.toISOString().slice(0, 19).replace('T', ' '),
            actualQuantity: runQuantity,
            quantityUoM: segReq.quantityUoM,
            status: 'Completed',
          };
          generatedSegResponses.push(segResp);

          // Generate Material Actuals from BOMs for this run
          const bomLines = segmentBOMs.filter(bom => bom.processSegmentId === segReq.processSegmentId);
          
          for (const bom of bomLines) {
            const material = materials.find(m => m.id === bom.materialId);
            const matActualId = `MAT-ACT-${segRespId}-${bom.materialId}-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;
            
            // Generate material lot ID
            const materialLotId = `LOT-${opsResponseId}-${bom.materialId}-R${run + 1}`;
            
            // Determine direction from BOM MaterialUse field
            let direction = 'Material consumed'; // default
            if (bom.materialUse) {
              const materialUse = bom.materialUse.toUpperCase();
              if (materialUse === 'PRODUCE' || materialUse === 'PRODUCED') {
                direction = 'Material produced';
              } else if (materialUse === 'SCRAP') {
                direction = 'Scrap';
              } else {
                direction = 'Material consumed';
              }
            }
            
            const isOutput = direction === 'Material produced' || direction === 'Scrap';
            
            const matActual: SegmentMaterialActual = {
              id: matActualId,
              segmentResponseId: segRespId,
              materialId: bom.materialId,
              materialLotId: materialLotId,
              actualQty: bom.qtyPerUnit * runQuantity,
              qtyUoM: bom.uom,
              direction: direction,
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
            
            const finishedProductLotId = `LOT-${opsResponseId}-${orData.operationsRequest.productMaterialId}-R${run + 1}`;
            
            const finishedProductActual: SegmentMaterialActual = {
              id: `MAT-ACT-${segRespId}-FINAL-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`,
              segmentResponseId: segRespId,
              materialId: orData.operationsRequest.productMaterialId,
              materialLotId: finishedProductLotId,
              actualQty: finishedGoodQuantity,
              qtyUoM: orData.operationsRequest.quantityUoM,
              direction: 'Material produced',
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
              const scrapLotId = `LOT-SCRAP-${opsResponseId}-${orData.operationsRequest.productMaterialId}-R${run + 1}`;
              
              const scrapProductActual: SegmentMaterialActual = {
                id: `MAT-ACT-${segRespId}-SCRAP-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`,
                segmentResponseId: segRespId,
                materialId: orData.operationsRequest.productMaterialId,
                materialLotId: scrapLotId,
                actualQty: scrapQuantity,
                qtyUoM: orData.operationsRequest.quantityUoM,
                direction: 'Scrap',
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
            const eqActualId = `EQ-ACT-${segRespId}-${eqUsage.equipmentId}-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;
            
            const eqActual: SegmentEquipmentActual = {
              id: eqActualId,
              segmentResponseId: segRespId,
              equipmentId: eqUsage.equipmentId,
              actualDurationHours: runDuration,
              actualStartDateTime: runStartTime.toISOString().slice(0, 19).replace('T', ' '),
              actualEndDateTime: endTime.toISOString().slice(0, 19).replace('T', ' '),
            };
            generatedEqActuals.push(eqActual);
          }
        }
      }

      // Generate Operations Events per segment requirement (not per run)
      // Only create downtime events if production delay was defined
      // Only create scrap events if scrap percentage was defined
      console.log(`[Operations Events] Checking segment requirements - scrap=${scrapProducedPercent}, delay=${productionDelayMinutes}`);
      
      for (const segReq of sortedSegReqs) {
        const shouldGenerateEvents = scrapProducedPercent > 0 || productionDelayMinutes > 0;
        
        if (!shouldGenerateEvents) {
          continue;
        }
        
        console.log(`[Operations Events] Processing segment ${segReq.processSegmentId}`);
        
        // Find event definitions assigned to this segment
        let segmentEventAssignments = operationEventDefSegmentAssignments.filter(
          oedsa => oedsa.processSegmentId === segReq.processSegmentId
        );
        
        // Filter based on what conditions are met
        segmentEventAssignments = segmentEventAssignments.filter(assignment => {
          const eventDef = operationEventDefinitions.find(oed => oed.id === assignment.operationsEventDefinitionId);
          if (!eventDef) return false;
          
          // Include downtime events only if production delay is defined
          const includeForDowntime = productionDelayMinutes > 0 && eventDef.causesDowntime;
          
          // Include scrap events only if scrap percentage is defined
          const includeForScrap = scrapProducedPercent > 0 && eventDef.causesScrap;
          
          return includeForDowntime || includeForScrap;
        });
        
        console.log(`[Operations Events] Found ${segmentEventAssignments.length} matching event assignments for segment`);
        
        if (segmentEventAssignments.length > 0) {
          // Randomly select 1-3 events per segment requirement
          const numEvents = Math.floor(Math.random() * 3) + 1; // 1 to 3
          const shuffled = [...segmentEventAssignments].sort(() => 0.5 - Math.random());
          const selectedAssignments = shuffled.slice(0, Math.min(numEvents, segmentEventAssignments.length));
          
          console.log(`[Operations Events] Generating ${selectedAssignments.length} events for segment`);
          
          // Find any segment response for this segment requirement to use for timestamp range
          const segmentResponses = generatedSegResponses.filter(sr => sr.segmentRequirementId === segReq.id);
          if (segmentResponses.length === 0) continue;
          
          // Use the first and last segment response times as the range
          const startTime = new Date(segmentResponses[0].actualStartDateTime.replace(' ', 'T') + 'Z');
          const endTime = new Date(segmentResponses[segmentResponses.length - 1].actualEndDateTime.replace(' ', 'T') + 'Z');
          
          for (const assignment of selectedAssignments) {
            const eventDef = operationEventDefinitions.find(
              oed => oed.id === assignment.operationsEventDefinitionId
            );
            
            // Generate random timestamp between segment start and end
            const startTimeMs = startTime.getTime();
            const endTimeMs = endTime.getTime();
            const randomTimeMs = startTimeMs + Math.random() * (endTimeMs - startTimeMs);
            const eventTime = new Date(randomTimeMs);
            
            // Use the first segment response id for this segment requirement
            const segRespId = segmentResponses[0].id;
            
            const operationsEvent: OperationsEvent = {
              id: `OPS-EVENT-${segReq.processSegmentId}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
              segmentResponseId: segRespId,
              operationsEventDefinitionId: assignment.operationsEventDefinitionId,
              effectiveTimestamp: eventTime.toISOString().slice(0, 19).replace('T', ' '),
              notes: `${eventDef?.description || 'Event'} - ${assignment.notes}`,
            };
            generatedOperationsEvents.push(operationsEvent);
            console.log(`[Operations Events] Created event: ${operationsEvent.id} (${eventDef?.eventCode})`);
          }
        } else {
          console.log(`[Operations Events] No matching event assignments found for segment ${segReq.processSegmentId}`);
        }
      }

      // Generate Equipment Property Tracking data
      // Each tracking record is timestamped between the equipment actual's start and end times
      const generatedPropertyTracking: EquipmentPropertyTracking[] = [];
      const SAMPLING_INTERVAL_SECONDS = 30;

      for (const eqActual of generatedEqActuals) {
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

            // Generate value within min/max range
            const minValue = property.minValue ?? 0;
            const maxValue = property.maxValue ?? 100;
            const value = minValue + Math.random() * (maxValue - minValue);

            const trackingId = `PROP-TRACK-${eqActual.id}-${assignment.equipmentPropertyId}-${i.toString().padStart(4, '0')}`;

            const tracking: EquipmentPropertyTracking = {
              id: trackingId,
              segmentResponseId: eqActual.segmentResponseId,
              equipmentId: eqActual.equipmentId,
              equipmentPropertyId: assignment.equipmentPropertyId,
              value: Math.round(value * 100) / 100, // Round to 2 decimal places
              uom: property.unit || '',
              createdTimestamp: sampleTime.toISOString().slice(0, 19).replace('T', ' '),
            };

            generatedPropertyTracking.push(tracking);
          }
        }
      }

      console.log(`Generated ${generatedPropertyTracking.length} equipment property tracking records`);

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
        actualStartDateTime: operationsStartTime.toISOString().slice(0, 19).replace('T', ' '),
        actualEndDateTime: operationsEndTime.toISOString().slice(0, 19).replace('T', ' '),
        actualQuantity: actualProductQuantity,
        quantityUoM: orData.operationsRequest.quantityUoM,
        status: 'Completed',
      };

      console.log(`Operations Response: Start=${opsResponse.actualStartDateTime}, End=${opsResponse.actualEndDateTime}`);

      setGeneratedOperationsResponse(opsResponse);
      setSegmentResponses(generatedSegResponses);
      setMaterialActuals(generatedMatActuals);
      setEquipmentActuals(generatedEqActuals);
      setEquipmentPropertyTracking(generatedPropertyTracking);
      setOperationsEvents(generatedOperationsEvents);
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

      showSnackbar(`Generated actual data: ${generatedSegResponses.length} segment responses, ${generatedMatActuals.length} material actuals, ${generatedEqActuals.length} equipment actuals, ${generatedPropertyTracking.length} property tracking records, ${generatedOperationsEvents.length} operations events, ${generatedMaterialLots.length} material lots, ${generatedMaterialSublots.length} material sublots, ${generatedTestResults.length} test results`, 'success');
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
    setGeneratedOperationsResponse(null);
    setSegmentResponses([]);
    setMaterialActuals([]);
    setEquipmentActuals([]);
    setEquipmentPropertyTracking([]);
    setOperationsEvents([]);
    setTestResults([]);
    setGeneratedMaterialLotsForDisplay([]);
    setGeneratedMaterialSublotsForDisplay([]);
    setActualGenerationTimestamp(null);
  };

  const checkOperationsRequestData = async () => {
    if (!selectedOperationsRequestId) {
      showSnackbar('Please select an operations request first', 'error');
      return;
    }

    try {
      const orData = await processDataDB.getOperationsRequestWithRequirements(selectedOperationsRequestId);
      if (!orData) {
        showSnackbar('Operations request not found in database', 'error');
        return;
      }

      // Handle potentially undefined arrays
      const segmentReqs = orData.segmentRequirements || [];
      const materialReqs = orData.segmentMaterialRequirements || [];
      const equipmentReqs = orData.segmentEquipmentRequirements || [];

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
      
      // Save actual data to process data DB
      await processDataDB.saveActualData(
        generatedOperationsResponse,
        segmentResponses,
        materialActuals,
        equipmentActuals,
        equipmentPropertyTracking,
        testResults,
        operationsEvents
      );
      
      // Save material lots to master data
      if (generatedMaterialLotsForDisplay.length > 0) {
        for (const lot of generatedMaterialLotsForDisplay) {
          await masterDataDB.add('materialLots', lot);
        }
        console.log(`Saved ${generatedMaterialLotsForDisplay.length} material lots to master data`);
      }
      
      // Save material sublots to master data
      if (generatedMaterialSublotsForDisplay.length > 0) {
        for (const sublot of generatedMaterialSublotsForDisplay) {
          await masterDataDB.add('materialSublots', sublot);
        }
        console.log(`Saved ${generatedMaterialSublotsForDisplay.length} material sublots to master data`);
      }
      
      setLoading(false);
      showSnackbar('Actual data saved to database successfully', 'success');
      
      // Reload stored actual data to update the overview
      await loadStoredActualData();
    } catch (error) {
      console.error('Failed to save actual data:', error);
      showSnackbar('Failed to save actual data to database', 'error');
      setLoading(false);
    }
  };

  const cleanupDatabase = async () => {
    if (!window.confirm('Are you sure you want to delete all process data (operations requests, responses, segment data, etc.)? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      console.log('[Process Data Generator] Cleaning up process data database...');
      
      // Clear all process data stores
      const stores = [
        'operationsRequests',
        'segmentRequirements',
        'segmentMaterialRequirements',
        'segmentEquipmentRequirements',
        'operationsResponses',
        'segmentResponses',
        'segmentMaterialActuals',
        'segmentEquipmentActuals',
        'equipmentPropertyTracking',
        'testResults',
        'operationsEvents'
      ];
      
      for (const store of stores) {
        try {
          await processDataDB.clear(store as any);
          console.log(`[Cleanup] Cleared ${store}`);
        } catch (error) {
          console.error(`[Cleanup] Failed to clear ${store}:`, error);
        }
      }
      
      // Reset UI state
      setSavedOperationsRequests([]);
      setSelectedOperationsRequestId('');
      setGeneratedOperationsResponse(null);
      setSegmentResponses([]);
      setMaterialActuals([]);
      setEquipmentActuals([]);
      setEquipmentPropertyTracking([]);
      setOperationsEvents([]);
      setTestResults([]);
      setGeneratedMaterialLotsForDisplay([]);
      setGeneratedMaterialSublotsForDisplay([]);
      setActualGenerationTimestamp(null);
      setReferenceOperationsRequest(null);
      setReferenceSegmentRequirements([]);
      
      // Reload stored data to update overview
      await loadSavedOperationsRequests();
      await loadStoredActualData();
      
      setLoading(false);
      showSnackbar('Process data database cleaned up successfully', 'success');
    } catch (error) {
      console.error('Failed to cleanup database:', error);
      showSnackbar('Failed to cleanup database', 'error');
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
      const orData = await processDataDB.getOperationsRequestWithRequirements(operationsRequestId);
      if (!orData) {
        showSnackbar('Operations request not found', 'error');
        setLoading(false);
        return;
      }

      const segmentReqs = orData.segmentRequirements || [];
      const materialReqs = orData.segmentMaterialRequirements || [];
      const equipmentReqs = orData.segmentEquipmentRequirements || [];

      console.log(`[Delete Plan] Found ${segmentReqs.length} segment requirements, ${materialReqs.length} material requirements, ${equipmentReqs.length} equipment requirements`);
      
      // Delete all related data in order
      // 1. Delete segment material requirements
      for (const mr of materialReqs) {
        await processDataDB.delete('segmentMaterialRequirements', mr.id);
      }
      console.log(`[Delete Plan] Deleted ${materialReqs.length} segment material requirements`);
      
      // 2. Delete segment equipment requirements
      for (const er of equipmentReqs) {
        await processDataDB.delete('segmentEquipmentRequirements', er.id);
      }
      console.log(`[Delete Plan] Deleted ${equipmentReqs.length} segment equipment requirements`);
      
      // 3. Delete segment requirements
      for (const sr of segmentReqs) {
        await processDataDB.delete('segmentRequirements', sr.id);
      }
      console.log(`[Delete Plan] Deleted ${segmentReqs.length} segment requirements`);
      
      // 4. Delete the operations request itself
      await processDataDB.delete('operationsRequests', operationsRequestId);
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
          await processDataDB.delete('segmentMaterialActuals', ma.id);
        }
        console.log(`[Delete] Deleted ${matActuals.length} material actuals for segment ${segId}`);
      }
      
      // 2. Delete equipment actuals
      for (const segId of segmentResponseIds) {
        const eqActuals = storedEquipmentActuals.filter(ea => ea.segmentResponseId === segId);
        for (const ea of eqActuals) {
          await processDataDB.delete('segmentEquipmentActuals', ea.id);
        }
        console.log(`[Delete] Deleted ${eqActuals.length} equipment actuals for segment ${segId}`);
      }
      
      // 3. Delete operations events
      for (const segId of segmentResponseIds) {
        const events = storedOperationsEvents.filter(oe => oe.segmentResponseId === segId);
        for (const evt of events) {
          await processDataDB.delete('operationsEvents', evt.id);
        }
        console.log(`[Delete] Deleted ${events.length} operations events for segment ${segId}`);
      }
      
      // 4. Delete equipment property tracking
      for (const segId of segmentResponseIds) {
        const tracking = storedEquipmentPropertyTracking.filter(ept => ept.segmentResponseId === segId);
        for (const t of tracking) {
          await processDataDB.delete('equipmentPropertyTracking', t.id);
        }
        console.log(`[Delete] Deleted ${tracking.length} equipment property tracking records for segment ${segId}`);
      }
      
      // 5. Delete segment responses
      for (const sr of segmentResponsesToDelete) {
        await processDataDB.delete('segmentResponses', sr.id);
      }
      console.log(`[Delete] Deleted ${segmentResponsesToDelete.length} segment responses`);
      
      // 6. Delete the operations response itself
      await processDataDB.delete('operationsResponses', operationsResponseId);
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

  const exportActualToCSV = (type: 'all' | 'response' | 'segments' | 'materials' | 'equipment' | 'propertytracking' | 'lots' | 'testresults') => {
    if (!generatedOperationsResponse || segmentResponses.length === 0) {
      showSnackbar('No actual data to export', 'error');
      return;
    }

    // Export Operations Response
    const orCsv = `OperationsResponseID,OperationsRequestID,Description,ActualStartDateTime,ActualEndDateTime,ActualQuantity,QuantityUoM,Status\n${generatedOperationsResponse.id},${generatedOperationsResponse.operationsRequestId},${generatedOperationsResponse.description},${generatedOperationsResponse.actualStartDateTime},${generatedOperationsResponse.actualEndDateTime},${generatedOperationsResponse.actualQuantity},${generatedOperationsResponse.quantityUoM},${generatedOperationsResponse.status}`;

    // Export Segment Responses
    const srHeaders = 'SegmentResponseID,SegmentRequirementID,OperationsResponseID,ProcessSegmentID,ActualStartDateTime,ActualEndDateTime,ActualQuantity,QuantityUoM,Status';
    const srRows = segmentResponses.map(sr => 
      `${sr.id},${sr.segmentRequirementId},${sr.operationsResponseId},${sr.processSegmentId},${sr.actualStartDateTime},${sr.actualEndDateTime},${sr.actualQuantity},${sr.quantityUoM},${sr.status}`
    ).join('\n');
    const srCsv = `${srHeaders}\n${srRows}`;

    // Export Material Actuals
    const maHeaders = 'SegmentMaterialActualID,SegmentResponseID,MaterialID,MaterialLotID,ActualQty,QtyUoM,Direction';
    const maRows = materialActuals.map(ma => 
      `${ma.id},${ma.segmentResponseId},${ma.materialId},${ma.materialLotId},${ma.actualQty},${ma.qtyUoM},${ma.direction}`
    ).join('\n');
    const maCsv = `${maHeaders}\n${maRows}`;

    // Export Equipment Actuals
    const eaHeaders = 'SegmentEquipmentActualID,SegmentResponseID,EquipmentID,ActualDurationHours,ActualStartDateTime,ActualEndDateTime';
    const eaRows = equipmentActuals.map(ea => 
      `${ea.id},${ea.segmentResponseId},${ea.equipmentId},${ea.actualDurationHours},${ea.actualStartDateTime},${ea.actualEndDateTime}`
    ).join('\n');
    const eaCsv = `${eaHeaders}\n${eaRows}`;

    // Export Equipment Property Tracking
    const eptHeaders = 'PropertyTrackingID,SegmentResponseID,EquipmentID,EquipmentPropertyID,Value,UoM,CreatedTimestamp';
    const eptRows = equipmentPropertyTracking.map(ept => 
      `${ept.id},${ept.segmentResponseId},${ept.equipmentId},${ept.equipmentPropertyId},${ept.value},${ept.uom},${ept.createdTimestamp}`
    ).join('\n');
    const eptCsv = `${eptHeaders}\n${eptRows}`;

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

  const generateProcessData = () => {
    if (!formData.productMaterialId || !formData.lineId || !formData.plannedQuantity) {
      showSnackbar('Please fill in all required fields', 'error');
      return;
    }

    try {
      const timestamp = new Date();
      setGenerationTimestamp(timestamp);
      setDataVersion(1);

      // Generate Operations Request ID
      const orId = `OR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
      
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

      productSegments.forEach((segment, index) => {
        const segReqId = `SR-${orId.split('-')[1]}-${String(index + 1).padStart(3, '0')}-${segment.id}`;
        
        // Calculate segment timing
        const segmentDuration = segment.durationHours || 2;
        const endTime = new Date(currentTime.getTime() + segmentDuration * 60 * 60 * 1000);

        // Create Segment Requirement
        const segReq: SegmentRequirement = {
          id: segReqId,
          operationsRequestId: orId,
          processSegmentId: segment.id,
          sequence: (index + 1) * 10,
          earliestStartDateTime: currentTime.toISOString().slice(0, 19).replace('T', ' '),
          latestEndDateTime: endTime.toISOString().slice(0, 19).replace('T', ' '),
          targetQuantity: formData.plannedQuantity,
          quantityUoM: formData.quantityUoM,
        };
        generatedSegReqs.push(segReq);

        // Generate Material Requirements based on BOM
        const bomLines = segmentBOMs.filter(bom => bom.processSegmentId === segment.id);
        bomLines.forEach((bom, bomIndex) => {
          const material = materials.find(m => m.id === bom.materialId);
          const matReqId = `SMR-${segReqId}-${String(bomIndex + 1).padStart(3, '0')}`;
          
          const matReq: SegmentMaterialRequirement = {
            id: matReqId,
            segmentRequirementId: segReqId,
            materialId: bom.materialId,
            requiredQty: bom.qtyPerUnit * formData.plannedQuantity,
            qtyUoM: bom.uom,
            requirementType: material?.classId === 'FINISHEDPRODUCT' ? 'Output' : 
                           material?.classId === 'INPROCESSMATERIAL' ? 'Input' : 'Consumable',
          };
          generatedMatReqs.push(matReq);
        });

        // Generate Equipment Requirements based on Equipment Usage
        const eqUsages = equipmentUsages.filter(eu => eu.processSegmentId === segment.id);
        eqUsages.forEach((usage, eqIndex) => {
          const eqReqId = `SER-${segReqId}-${String(eqIndex + 1).padStart(3, '0')}`;
          const equipmentItem = equipment.find(e => e.id === usage.equipmentId);
          
          // Calculate required runs based on capacity
          const requiredRuns = Math.ceil(formData.plannedQuantity / usage.capacityPerRun);
          const totalDuration = (segment.durationHours || 2) * requiredRuns;

          const eqReq: SegmentEquipmentRequirement = {
            id: eqReqId,
            segmentRequirementId: segReqId,
            lineId: formData.lineId,
            equipmentClassId: equipmentItem?.classId || '',
            equipmentId: usage.equipmentId,
            requirementType: 'SpecificAsset',
            plannedDurationHours: totalDuration,
          };
          generatedEqReqs.push(eqReq);
        });

        // Move to next segment start time
        currentTime = new Date(endTime);
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
      
      await processDataDB.saveGeneratedData(
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
    const orCsv = `OperationsRequestID,Description,PlantID,LineID,ProductMaterialID,PlannedQuantity,QuantityUoM,PlannedStartDateTime,PlannedEndDateTime,Priority,Status
${generatedOperationsRequest.id},${generatedOperationsRequest.description},${generatedOperationsRequest.plantId},${generatedOperationsRequest.lineId},${generatedOperationsRequest.productMaterialId},${generatedOperationsRequest.plannedQuantity},${generatedOperationsRequest.quantityUoM},${generatedOperationsRequest.plannedStartDateTime},${generatedOperationsRequest.plannedEndDateTime},${generatedOperationsRequest.priority},${generatedOperationsRequest.status}`;

    // Export Segment Requirements
    const srHeaders = 'SegmentRequirementID,OperationsRequestID,ProcessSegmentID,Sequence,EarliestStartDateTime,LatestEndDateTime,TargetQuantity,QuantityUoM';
    const srRows = segmentRequirements.map(sr => 
      `${sr.id},${sr.operationsRequestId},${sr.processSegmentId},${sr.sequence},${sr.earliestStartDateTime},${sr.latestEndDateTime},${sr.targetQuantity},${sr.quantityUoM}`
    ).join('\n');
    const srCsv = `${srHeaders}\n${srRows}`;

    // Export Material Requirements
    const mrHeaders = 'SegmentMaterialReqID,SegmentRequirementID,MaterialID,RequiredQty,QtyUoM,RequirementType';
    const mrRows = materialRequirements.map(mr => 
      `${mr.id},${mr.segmentRequirementId},${mr.materialId},${mr.requiredQty},${mr.qtyUoM},${mr.requirementType}`
    ).join('\n');
    const mrCsv = `${mrHeaders}\n${mrRows}`;

    // Export Equipment Requirements
    const erHeaders = 'SegmentEquipmentReqID,SegmentRequirementID,LineID,EquipmentClassID,EquipmentID,RequirementType,PlannedDurationHours';
    const erRows = equipmentRequirements.map(er => 
      `${er.id},${er.segmentRequirementId},${er.lineId},${er.equipmentClassId},${er.equipmentId},${er.requirementType},${er.plannedDurationHours}`
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

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
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
        <CircularProgress />
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
            onClick={cleanupDatabase}
            sx={{ mr: 1 }}
          >
            Cleanup DB
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={activeTab === 0 ? resetForm : resetActualData}
            sx={{ mr: 1 }}
          >
            Reset
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={activeTab === 0 ? saveToDatabase : saveActualToDatabase}
            disabled={activeTab === 0 ? segmentRequirements.length === 0 : segmentResponses.length === 0}
            sx={{ mr: 1 }}
          >
            Save to DB
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => activeTab === 0 ? exportToCSV('all') : exportActualToCSV('all')}
            disabled={activeTab === 0 ? segmentRequirements.length === 0 : segmentResponses.length === 0}
          >
            Export All CSV
          </Button>
        </Box>
      </Box>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tab label="📋 Plan Data" />
        <Tab label="✅ Actual Data" />
      </Tabs>

      {/* Plan Data Tab */}
      {activeTab === 0 && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            Generate process data based on operations requests. Select a product and production line to automatically create 
            segment requirements with material and equipment requirements based on master data (BOMs, equipment usage, capacities).
          </Alert>

          {/* Plan Data Overview */}
          {savedOperationsRequests.length > 0 && (
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.lighter' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  📊 Saved Plan Data Overview
                </Typography>
                <Button
                  size="small"
                  onClick={() => setPlanDataExpanded(!planDataExpanded)}
                  variant="outlined"
                >
                  {planDataExpanded ? 'Collapse' : 'Expand All'}
                </Button>
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
                <Grid item xs={12} md={6}>
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
                <Grid item xs={12} md={6}>
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
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Operations Request
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Produce Baguettes"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
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

                <Grid item xs={12} sm={6}>
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

                <Grid item xs={12}>
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

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Planned Quantity"
                    type="number"
                    required
                    value={formData.plannedQuantity}
                    onChange={(e) => setFormData({ ...formData, plannedQuantity: parseInt(e.target.value) || 0 })}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="UoM"
                    value={formData.quantityUoM}
                    onChange={(e) => setFormData({ ...formData, quantityUoM: e.target.value })}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
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

                <Grid item xs={12} sm={6}>
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

                <Grid item xs={12}>
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
        <Grid item xs={12} md={6}>
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
                    <Chip label={`${equipmentRequirements.length} Equipment Requirements`} color="info" sx={{ mb: 1 }} />
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
                    <TableCell>Sequence</TableCell>
                    <TableCell>Start</TableCell>
                    <TableCell>End</TableCell>
                    <TableCell>Quantity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {segmentRequirements.map((sr) => {
                    const segment = processSegments.find(ps => ps.id === sr.processSegmentId);
                    return (
                      <TableRow key={sr.id}>
                        <TableCell>{sr.id}</TableCell>
                        <TableCell>{segment?.name || sr.processSegmentId}</TableCell>
                        <TableCell>{sr.sequence}</TableCell>
                        <TableCell>{sr.earliestStartDateTime}</TableCell>
                        <TableCell>{sr.latestEndDateTime}</TableCell>
                        <TableCell>{sr.targetQuantity} {sr.quantityUoM}</TableCell>
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
                    <TableCell>Duration (hrs)</TableCell>
                    <TableCell>Type</TableCell>
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
                        <TableCell>{er.plannedDurationHours.toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip label={er.requirementType} size="small" color="info" />
                        </TableCell>
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
      {activeTab === 1 && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            Generate actual production data based on saved operations requests. Select an operations request and enter the actual quantity produced.
          </Alert>

          {/* Actual Data Overview */}
          {(savedOperationsRequests.length > 0 || storedOperationsResponses.length > 0 || generatedOperationsResponse) && (
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
              
              {actualDataExpanded && storedOperationsResponses.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Filter by Operations Response ID"
                        placeholder="Search by response ID..."
                        value={actualDataFilter}
                        onChange={(e) => setActualDataFilter(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
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
                <Grid item xs={12} md={6}>
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
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    Stored Actual Data (Database):
                  </Typography>
                  {storedOperationsResponses.length > 0 ? (
                    <Box>
                      <Typography variant="body2" color="text.primary" gutterBottom>
                        <strong>{storedOperationsResponses.length}</strong> operations responses stored
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                        <Chip label={`${storedOperationsResponses.length} Responses`} size="small" color="primary" />
                        <Chip label={`${storedSegmentResponses.length} Segments`} size="small" color="success" />
                        <Chip label={`${storedMaterialActuals.length} Materials`} size="small" color="warning" />
                        <Chip label={`${storedEquipmentActuals.length} Equipment`} size="small" color="info" />
                        <Chip label={`${storedOperationsEvents.length} Events`} size="small" color="error" />
                        <Chip label={`${storedTestResults.length} Tests`} size="small" color="secondary" />
                      </Box>
                      
                      <Box sx={{ maxHeight: actualDataExpanded ? 400 : 150, overflowY: 'auto', pr: 1 }}>
                        {storedOperationsResponses
                          .filter(resp => !actualDataFilter || resp.id?.toLowerCase().includes(actualDataFilter.toLowerCase()))
                          .slice(0, actualDataExpanded ? undefined : 2)
                          .map((resp) => {
                            const respSegments = storedSegmentResponses.filter(sr => sr.operationsResponseId === resp.id);
                            const respMaterials = storedMaterialActuals.filter(ma => {
                              const segment = storedSegmentResponses.find(sr => sr.id === ma.segmentResponseId);
                              return segment?.operationsResponseId === resp.id &&
                                     (materialActualsFilter === 'ALL' || ma.direction === materialActualsFilter);
                            });
                            const respEquipment = storedEquipmentActuals.filter(ea => {
                              const segment = storedSegmentResponses.find(sr => sr.id === ea.segmentResponseId);
                              return segment?.operationsResponseId === resp.id;
                            });
                            const respEvents = storedOperationsEvents.filter(oe => {
                              const segment = storedSegmentResponses.find(sr => sr.id === oe.segmentResponseId);
                              return segment?.operationsResponseId === resp.id;
                            });
                            
                            return (
                              <Box key={resp.id} sx={{ ml: 2, mb: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1, position: 'relative' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" display="block">
                                      <strong>{resp.id}</strong>
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      Request: {resp.operationsRequestId}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      Actual: {resp.actualQuantity} {resp.quantityUoM} | Status: {resp.status}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      {new Date(resp.actualStartDateTime).toLocaleString()} → {new Date(resp.actualEndDateTime).toLocaleString()}
                                    </Typography>
                                  </Box>
                                  <Tooltip title="Delete this operations response">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => deleteOperationsResponse(resp.id)}
                                      sx={{ ml: 1 }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                                <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  <Chip label={`${respSegments.length} Seg`} size="small" sx={{ height: 18, fontSize: '0.65rem' }} color="success" />
                                  <Chip label={`${respMaterials.length} Mat`} size="small" sx={{ height: 18, fontSize: '0.65rem' }} color="warning" />
                                  <Chip label={`${respEquipment.length} Eq`} size="small" sx={{ height: 18, fontSize: '0.65rem' }} color="info" />
                                  <Chip label={`${respEvents.length} Evt`} size="small" sx={{ height: 18, fontSize: '0.65rem' }} color="error" />
                                </Box>
                                
                                {/* Expanded view - show segment responses */}
                                {actualDataExpanded && respSegments.length > 0 && (
                                  <Box sx={{ mt: 1, ml: 1 }}>
                                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                      <strong>Segments:</strong>
                                    </Typography>
                                    {respSegments.map((sr, idx) => {
                                      const segment = processSegments.find(ps => ps.id === sr.processSegmentId);
                                      const segMatActs = storedMaterialActuals.filter(ma => ma.segmentResponseId === sr.id);
                                      const segEqActs = storedEquipmentActuals.filter(ea => ea.segmentResponseId === sr.id);
                                      
                                      return (
                                        <Box key={sr.id} sx={{ ml: 1, mb: 0.5, p: 0.5, bgcolor: 'background.default', borderRadius: 0.5, fontSize: '0.7rem' }}>
                                          <Typography variant="caption" display="block" sx={{ fontSize: '0.7rem' }}>
                                            {idx + 1}. {segment?.name || sr.processSegmentId}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>
                                            Qty: {sr.actualQuantity} {sr.quantityUoM} | {segMatActs.length} mat, {segEqActs.length} eq
                                          </Typography>
                                        </Box>
                                      );
                                    })}
                                  </Box>
                                )}
                              </Box>
                            );
                          })}
                      </Box>
                      {!actualDataExpanded && storedOperationsResponses.length > 2 && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 2, display: 'block', mt: 1 }}>
                          ...and {storedOperationsResponses.length - 2} more responses
                        </Typography>
                      )}
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
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Generate Actual Data
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
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
                        <Grid item xs={12}>
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
                        <Grid item xs={12}>
                          <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
                            Click "Check Operations Request Data" to verify that this operations request has segment requirements before generating actual data.
                          </Alert>
                        </Grid>
                      </>
                    )}

                    {selectedOperationsRequestId && (
                      <>
                        <Grid item xs={12}>
                          <Alert severity="info" size="small">
                            Selected: {savedOperationsRequests.find(or => or.id === selectedOperationsRequestId)?.description}
                          </Alert>
                        </Grid>

                        <Grid item xs={12} sm={8}>
                          <TextField
                            fullWidth
                            label="Actual Product Quantity"
                            type="number"
                            required
                            value={actualProductQuantity}
                            onChange={(e) => setActualProductQuantity(parseInt(e.target.value) || 0)}
                          />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            label="UoM"
                            disabled
                            value={savedOperationsRequests.find(or => or.id === selectedOperationsRequestId)?.quantityUoM || 'EA'}
                          />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            label="Scrap Produced %"
                            type="number"
                            value={scrapProducedPercent}
                            onChange={(e) => setScrapProducedPercent(parseFloat(e.target.value) || 0)}
                            inputProps={{ min: 0, max: 100, step: 0.1 }}
                          />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            label="Production Delay (minutes)"
                            type="number"
                            value={productionDelayMinutes}
                            onChange={(e) => setProductionDelayMinutes(parseInt(e.target.value) || 0)}
                            inputProps={{ min: 0, step: 1 }}
                            helperText="Delay before starting production"
                          />
                        </Grid>

                        <Grid item xs={12}>
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

                        <Grid item xs={12}>
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
            <Grid item xs={12} md={6}>
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
                        <Chip label={`${segmentResponses.length} Segment Responses`} color="success" sx={{ mr: 1, mb: 1 }} />
                        <Chip label={`${materialActuals.length} Material Actuals`} color="warning" sx={{ mr: 1, mb: 1 }} />
                        <Chip label={`${equipmentActuals.length} Equipment Actuals`} color="info" sx={{ mr: 1, mb: 1 }} />
                        <Chip label={`${equipmentPropertyTracking.length} Property Tracking`} color="secondary" sx={{ mr: 1, mb: 1 }} />
                        <Chip label={`${operationsEvents.length} Operations Events`} color="error" sx={{ mr: 1, mb: 1 }} />
                        <Chip label={`${generatedMaterialLotsForDisplay.length} Material Lots`} color="success" sx={{ mr: 1, mb: 1 }} />
                        <Chip label={`${generatedMaterialSublotsForDisplay.length} Material Sublots`} color="success" sx={{ mr: 1, mb: 1 }} />
                        <Chip label={`${testResults.length} Test Results`} color="info" sx={{ mb: 1 }} />
                      </Box>

                      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                        Segment Responses:
                      </Typography>
                      {segmentResponses.map((sr, idx) => {
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
                          <TableCell>Description</TableCell>
                          <TableCell>Actual Start</TableCell>
                          <TableCell>Actual End</TableCell>
                          <TableCell>Actual Quantity</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>{generatedOperationsResponse.id}</TableCell>
                          <TableCell>{generatedOperationsResponse.operationsRequestId}</TableCell>
                          <TableCell>{generatedOperationsResponse.description}</TableCell>
                          <TableCell>{generatedOperationsResponse.actualStartDateTime}</TableCell>
                          <TableCell>{generatedOperationsResponse.actualEndDateTime}</TableCell>
                          <TableCell>{generatedOperationsResponse.actualQuantity} {generatedOperationsResponse.quantityUoM}</TableCell>
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
                          <TableCell>Sequence</TableCell>
                          <TableCell>Earliest Start</TableCell>
                          <TableCell>Latest End</TableCell>
                          <TableCell>Target Quantity</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {referenceSegmentRequirements.map(sr => {
                          const segment = processSegments.find(ps => ps.id === sr.processSegmentId);
                          return (
                            <TableRow key={sr.id}>
                              <TableCell>{sr.id}</TableCell>
                              <TableCell>{segment?.name || sr.processSegmentId}</TableCell>
                              <TableCell>{sr.sequence}</TableCell>
                              <TableCell>{sr.earliestStartDateTime}</TableCell>
                              <TableCell>{sr.latestEndDateTime}</TableCell>
                              <TableCell>{sr.targetQuantity} {sr.quantityUoM}</TableCell>
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
                        <TableCell>Actual Start</TableCell>
                        <TableCell>Actual End</TableCell>
                        <TableCell>Actual Quantity</TableCell>
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
                        .map((sr) => {
                          const segment = processSegments.find(ps => ps.id === sr.processSegmentId);
                          return (
                            <TableRow key={sr.id}>
                              <TableCell>{sr.id}</TableCell>
                              <TableCell>{segment?.name || sr.processSegmentId}</TableCell>
                              <TableCell>{sr.actualStartDateTime}</TableCell>
                              <TableCell>{sr.actualEndDateTime}</TableCell>
                              <TableCell>{sr.actualQuantity} {sr.quantityUoM}</TableCell>
                              <TableCell>
                                <Chip label={sr.status} size="small" color="success" />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </TableContainer>
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
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {materialActuals
                        .filter(ma => materialActualsFilter === 'ALL' || ma.direction === materialActualsFilter)
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
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </TableContainer>
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
                        <TableCell>Duration (hrs)</TableCell>
                        <TableCell>Start</TableCell>
                        <TableCell>End</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {equipmentActuals.map((ea) => {
                        const equipmentItem = equipment.find(e => e.id === ea.equipmentId);
                        return (
                          <TableRow key={ea.id}>
                            <TableCell>{ea.id}</TableCell>
                            <TableCell>{ea.segmentResponseId}</TableCell>
                            <TableCell>{equipmentItem?.id || ea.equipmentId}</TableCell>
                            <TableCell>{ea.actualDurationHours.toFixed(2)}</TableCell>
                            <TableCell>{ea.actualStartDateTime}</TableCell>
                            <TableCell>{ea.actualEndDateTime}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
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
                          <TableCell>Property</TableCell>
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
                              <TableCell>{property?.name || ept.equipmentPropertyId}</TableCell>
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
                          <TableCell>Event Definition</TableCell>
                          <TableCell>Event Code</TableCell>
                          <TableCell>Event Category</TableCell>
                          <TableCell>Effective Timestamp</TableCell>
                          <TableCell>Notes</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {operationsEvents.map((event) => {
                          const eventDef = operationEventDefinitions.find(oed => oed.id === event.operationsEventDefinitionId);
                          return (
                            <TableRow key={event.id}>
                              <TableCell>{event.id}</TableCell>
                              <TableCell>{event.segmentResponseId}</TableCell>
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
                              <TableCell>{event.effectiveTimestamp}</TableCell>
                              <TableCell>{event.notes}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
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
                      {generatedMaterialLotsForDisplay.map((lot) => {
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
                      {generatedMaterialSublotsForDisplay.map((sublot) => {
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
                      {testResults.map((tr) => (
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
              </Paper>
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
