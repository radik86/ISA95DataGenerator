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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { masterDataDB } from '../services/masterDataDB';
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
  minValue?: number;
  maxValue?: number;
}

interface EquipmentPropertyAssignment {
  id: string;
  equipmentId: string;
  processSegmentId: string;
  equipmentPropertyId: string;
  samplingMode: string;
  samplingIntervalSeconds?: number;
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

const MasterDataManager: React.FC = () => {
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

  // Load data from IndexedDB on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      // Check if database has data
      const materialClassesData = await masterDataDB.getAll('materialClasses');
      
      // If no data, load from templates
      if (materialClassesData.length === 0) {
        await handleLoadTemplates();
        return;
      }

      // Load all data from database
      const [mc, m, ml, ms, ec, e, ep, epa, ps, bom, eu, p, pl, le, hs, hsf, hspc, oed, oedsa, sh, cr, sca] = await Promise.all([
        masterDataDB.getAll('materialClasses'),
        masterDataDB.getAll('materials'),
        masterDataDB.getAll('materialLots'),
        masterDataDB.getAll('materialSublots'),
        masterDataDB.getAll('equipmentClasses'),
        masterDataDB.getAll('equipment'),
        masterDataDB.getAll('equipmentProperties'),
        masterDataDB.getAll('equipmentPropertyAssignments'),
        masterDataDB.getAll('processSegments'),
        masterDataDB.getAll('segmentBOMs'),
        masterDataDB.getAll('equipmentUsages'),
        masterDataDB.getAll('plants'),
        masterDataDB.getAll('productionLines'),
        masterDataDB.getAll('lineEquipment'),
        masterDataDB.getAll('hierarchyScopes'),
        masterDataDB.getAll('hierarchyScopesFlat'),
        masterDataDB.getAll('hierarchyScopeParentChild'),
        masterDataDB.getAll('operationEventDefinitions'),
        masterDataDB.getAll('operationEventDefSegmentAssignments'),
        masterDataDB.getAll('shifts'),
        masterDataDB.getAll('crews'),
        masterDataDB.getAll('shiftCrewAssignments'),
      ]);

      setMaterialClasses(mc);
      setMaterials(m);
      setMaterialLots(ml);
      setMaterialSublots(ms);
      setEquipmentClasses(ec);
      setEquipment(e);
      setEquipmentProperties(ep);
      setEquipmentPropertyAssignments(epa);
      setProcessSegments(ps);
      setSegmentBOMs(bom);
      setEquipmentUsages(eu);
      setPlants(p);
      setProductionLines(pl);
      setLineEquipment(le);
      setHierarchyScopes(hs);
      setHierarchyScopesFlat(hsf);
      setHierarchyScopeParentChild(hspc);
      setOperationEventDefinitions(oed);
      setOperationEventDefSegmentAssignments(oedsa);
      setShifts(sh);
      setCrews(cr);
      setShiftCrewAssignments(sca);
      
      console.log('Loaded data counts:', {
        equipmentProperties: ep.length,
        equipmentPropertyAssignments: epa.length,
        equipment: e.length,
        shifts: sh.length,
        crews: cr.length,
        shiftCrewAssignments: sca.length
      });
      
      setLoading(false);
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
        await masterDataDB.update('materialClasses', data);
        setMaterialClasses(prev => prev.map(mc => mc.id === data.id ? data : mc));
        showSnackbar('Material class updated', 'success');
      } else {
        await masterDataDB.add('materialClasses', data);
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
      await masterDataDB.delete('materialClasses', id);
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
        await masterDataDB.update('materials', data);
        setMaterials(prev => prev.map(m => m.id === data.id ? data : m));
        showSnackbar('Material updated', 'success');
      } else {
        await masterDataDB.add('materials', data);
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
      await masterDataDB.delete('materials', id);
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
        await masterDataDB.update('materialLots', data);
        setMaterialLots(prev => prev.map(ml => ml.id === data.id ? data : ml));
        showSnackbar('Material lot updated', 'success');
      } else {
        await masterDataDB.add('materialLots', data);
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
      await masterDataDB.delete('materialLots', id);
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
        await masterDataDB.update('materialSublots', data);
        setMaterialSublots(prev => prev.map(ms => ms.id === data.id ? data : ms));
        showSnackbar('Material sublot updated', 'success');
      } else {
        await masterDataDB.add('materialSublots', data);
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
      await masterDataDB.delete('materialSublots', id);
      setMaterialSublots(prev => prev.filter(ms => ms.id !== id));
      showSnackbar('Material sublot deleted', 'success');
    } catch (error) {
      console.error('Failed to delete material sublot:', error);
      showSnackbar('Failed to delete material sublot', 'error');
    }
  };

  // Equipment Class Handlers
  const handleSaveEquipmentClass = async (data: EquipmentClass) => {
    try {
      if (editingEquipmentClass) {
        await masterDataDB.update('equipmentClasses', data);
        setEquipmentClasses(prev => prev.map(ec => ec.id === data.id ? data : ec));
        showSnackbar('Equipment class updated', 'success');
      } else {
        await masterDataDB.add('equipmentClasses', data);
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
      await masterDataDB.delete('equipmentClasses', id);
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
        await masterDataDB.update('equipment', data);
        setEquipment(prev => prev.map(e => e.id === data.id ? data : e));
        showSnackbar('Equipment updated', 'success');
      } else {
        await masterDataDB.add('equipment', data);
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
      await masterDataDB.delete('equipment', id);
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
        await masterDataDB.update('equipmentProperties', data);
        setEquipmentProperties(prev => prev.map(ep => ep.id === data.id ? data : ep));
        showSnackbar('Equipment property updated', 'success');
      } else {
        await masterDataDB.add('equipmentProperties', data);
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
      await masterDataDB.delete('equipmentProperties', id);
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
        await masterDataDB.update('equipmentPropertyAssignments', data);
        setEquipmentPropertyAssignments(prev => prev.map(epa => epa.id === data.id ? data : epa));
        showSnackbar('Equipment property assignment updated', 'success');
      } else {
        await masterDataDB.add('equipmentPropertyAssignments', data);
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
      await masterDataDB.delete('equipmentPropertyAssignments', id);
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
        await masterDataDB.update('processSegments', data);
        setProcessSegments(prev => prev.map(ps => ps.id === data.id ? data : ps));
        showSnackbar('Process segment updated', 'success');
      } else {
        await masterDataDB.add('processSegments', data);
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
      await masterDataDB.delete('processSegments', id);
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
        await masterDataDB.update('segmentBOMs', data);
        setSegmentBOMs(prev => prev.map(bom => bom.id === data.id ? data : bom));
        showSnackbar('BOM line updated', 'success');
      } else {
        await masterDataDB.add('segmentBOMs', data);
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
      await masterDataDB.delete('segmentBOMs', id);
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
        await masterDataDB.update('equipmentUsages', data);
        setEquipmentUsages(prev => prev.map(eu => eu.id === data.id ? data : eu));
        showSnackbar('Equipment usage updated', 'success');
      } else {
        await masterDataDB.add('equipmentUsages', data);
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
      await masterDataDB.delete('equipmentUsages', id);
      setEquipmentUsages(prev => prev.filter(eu => eu.id !== id));
      showSnackbar('Equipment usage deleted', 'success');
    } catch (error) {
      console.error('Failed to delete equipment usage:', error);
      showSnackbar('Failed to delete equipment usage', 'error');
    }
  };

  // Operation Event Definition Handlers
  const handleDeleteOperationEventDefinition = async (id: string) => {
    if (!confirm('Delete this operation event definition?')) return;
    try {
      await masterDataDB.delete('operationEventDefinitions', id);
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
      await masterDataDB.delete('operationEventDefSegmentAssignments', id);
      setOperationEventDefSegmentAssignments(prev => prev.filter(oedsa => oedsa.id !== id));
      showSnackbar('Event-segment assignment deleted', 'success');
    } catch (error) {
      console.error('Failed to delete event-segment assignment:', error);
      showSnackbar('Failed to delete event-segment assignment', 'error');
    }
  };

  // Plant Handlers
  const handleSavePlant = async (data: Plant) => {
    try {
      if (editingPlant) {
        await masterDataDB.update('plants', data);
        setPlants(prev => prev.map(p => p.id === data.id ? data : p));
        showSnackbar('Plant updated', 'success');
      } else {
        await masterDataDB.add('plants', data);
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
      await masterDataDB.delete('plants', id);
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
        await masterDataDB.update('productionLines', data);
        setProductionLines(prev => prev.map(pl => pl.id === data.id ? data : pl));
        showSnackbar('Production line updated', 'success');
      } else {
        await masterDataDB.add('productionLines', data);
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
      await masterDataDB.delete('productionLines', id);
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
        await masterDataDB.update('lineEquipment', data);
        setLineEquipment(prev => prev.map(le => le.id === data.id ? data : le));
        showSnackbar('Line equipment updated', 'success');
      } else {
        await masterDataDB.add('lineEquipment', data);
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
      await masterDataDB.delete('lineEquipment', id);
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
        await masterDataDB.update('shifts', data);
        setShifts(prev => prev.map(s => s.id === data.id ? data : s));
        showSnackbar('Shift updated', 'success');
      } else {
        await masterDataDB.add('shifts', data);
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
      await masterDataDB.delete('shifts', id);
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
        await masterDataDB.update('crews', data);
        setCrews(prev => prev.map(c => c.id === data.id ? data : c));
        showSnackbar('Crew updated', 'success');
      } else {
        await masterDataDB.add('crews', data);
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
      await masterDataDB.delete('crews', id);
      setCrews(prev => prev.filter(c => c.id !== id));
      showSnackbar('Crew deleted', 'success');
    } catch (error) {
      console.error('Failed to delete crew:', error);
      showSnackbar('Failed to delete crew', 'error');
    }
  };

  // Shift-Crew Assignment Handlers
  const handleSaveShiftCrewAssignment = async (data: ShiftCrewAssignment) => {
    try {
      if (editingShiftCrewAssignment) {
        await masterDataDB.update('shiftCrewAssignments', data);
        setShiftCrewAssignments(prev => prev.map(sca => sca.id === data.id ? data : sca));
        showSnackbar('Shift-crew assignment updated', 'success');
      } else {
        await masterDataDB.add('shiftCrewAssignments', data);
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
      await masterDataDB.delete('shiftCrewAssignments', id);
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

        // Export Equipment Classes
        const ecHeaders = 'EquipmentClassID,EquipmentClassName,EquipmentClassDescription';
        const ecRows = equipmentClasses.map(ec => `${ec.id},${ec.name},${ec.description || ''}`).join('\n');
        const ecCsv = `${ecHeaders}\n${ecRows}`;
        const ecFileHandle = await dirHandle.getFileHandle('equipment_classes.csv', { create: true });
        const ecWritable = await ecFileHandle.createWritable();
        await ecWritable.write(ecCsv);
        await ecWritable.close();

        // Export Equipment
        const eHeaders = 'EquipmentID,EquipmentName,EquipmentClassID,EquipmentDescription';
        const eRows = equipment.map(e => `${e.id},${e.name},${e.classId},${e.description || ''}`).join('\n');
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

      // Export Equipment Classes
      const ecHeaders = 'EquipmentClassID,EquipmentClassName,EquipmentClassDescription';
      const ecRows = equipmentClasses.map(ec => `${ec.id},${ec.name},${ec.description || ''}`).join('\n');
      downloadCSV(`${ecHeaders}\n${ecRows}`, 'equipment_classes.csv');

      // Export Equipment
      const eHeaders = 'EquipmentID,EquipmentName,EquipmentClassID,EquipmentDescription';
      const eRows = equipment.map(e => `${e.id},${e.name},${e.classId},${e.description || ''}`).join('\n');
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
              Reset to Templates
            </Button>
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

            {tabValue === 5 && (
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

            {tabValue === 6 && (
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

            {tabValue === 7 && (
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
                                await masterDataDB.delete('hierarchyScopes', row.id);
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

            {tabValue === 8 && (
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
                            const hs = await masterDataDB.getAll('hierarchyScopes');
                            const hspc = await masterDataDB.getAll('hierarchyScopeParentChild');
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

            {tabValue === 9 && (
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
          </Box>
        </Box>
      )}

      {/* Operations Category */}
      {categoryTab === 3 && (
        <Box>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
            <Tab label="Operation Event Definitions" />
            <Tab label="Event-Segment Assignments" />
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
          </Box>
        </Box>
      )}

      {/* Personnel Information Category */}
      {categoryTab === 4 && (
        <Box>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
            <Tab label="Shifts" />
            <Tab label="Crews" />
            <Tab label="Shift-Crew Assignments" />
          </Tabs>

          <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
            {tabValue === 0 && (
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

            {tabValue === 1 && (
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

            {tabValue === 2 && (
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

      <EquipmentClassDialog
        open={equipmentClassDialog}
        data={editingEquipmentClass}
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
        materials={materials}
        onClose={() => {
          setBomDialog(false);
          setEditingBOM(null);
        }}
        onSave={handleSaveBOM}
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
            await masterDataDB.update('hierarchyScopes', data);
            setHierarchyScopes(prev => prev.map(h => h.id === data.id ? data : h));
          } else {
            await masterDataDB.add('hierarchyScopes', data);
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

      <CrewDialog
        open={crewDialog}
        data={editingCrew}
        onClose={() => {
          setCrewDialog(false);
          setEditingCrew(null);
        }}
        onSave={handleSaveCrew}
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
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id}>
                <TableCell><Chip label={row.id} size="small" /></TableCell>
                <TableCell>{row.name}</TableCell>
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
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id}>
                <TableCell><Chip label={row.id} size="small" /></TableCell>
                <TableCell>{row.name}</TableCell>
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
        uniqueProducts.set(ps.productMaterialId, material?.name || ps.productMaterialId);
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
        const productName = materials.find(m => m.id === productId)?.name || productId;
        
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
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Class ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Class Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={12}>
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
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Material ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Material Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={12}>
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
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Default UoM"
              value={formData.defaultUoM}
              onChange={(e) => setFormData({ ...formData, defaultUoM: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={12}>
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
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Lot ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
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
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Quantity"
              type="number"
              value={formData.lotQuantity}
              onChange={(e) => setFormData({ ...formData, lotQuantity: parseFloat(e.target.value) || 0 })}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="UoM"
              value={formData.lotUoM}
              onChange={(e) => setFormData({ ...formData, lotUoM: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Received DateTime"
              type="datetime-local"
              value={formData.receivedDateTime}
              onChange={(e) => setFormData({ ...formData, receivedDateTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Produced DateTime"
              type="datetime-local"
              value={formData.producedDateTime}
              onChange={(e) => setFormData({ ...formData, producedDateTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Supplier/Producer ID"
              value={formData.supplierOrProducerId}
              onChange={(e) => setFormData({ ...formData, supplierOrProducerId: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Supplier/Producer Name"
              value={formData.supplierOrProducerName}
              onChange={(e) => setFormData({ ...formData, supplierOrProducerName: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Produced By Process Segment ID"
              value={formData.producedByProcessSegmentId}
              onChange={(e) => setFormData({ ...formData, producedByProcessSegmentId: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
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
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Sublot ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
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
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Quantity"
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Unit of Measure"
              value={formData.quantityUnitOfMeasure}
              onChange={(e) => setFormData({ ...formData, quantityUnitOfMeasure: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Storage Location"
              value={formData.storageLocation}
              onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              placeholder="e.g., Available, Reserved, Quarantined"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
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

interface EquipmentClassDialogProps {
  open: boolean;
  data: EquipmentClass | null;
  onClose: () => void;
  onSave: (data: EquipmentClass) => void;
}

const EquipmentClassDialog: React.FC<EquipmentClassDialogProps> = ({ open, data, onClose, onSave }) => {
  const [formData, setFormData] = useState<EquipmentClass>(
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
      <DialogTitle>{data ? 'Edit' : 'Add'} Equipment Class</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Class ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Class Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={12}>
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
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Equipment ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Equipment Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={12}>
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
          <Grid item xs={12}>
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
          <Grid item xs={12}>
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
          <Grid item xs={12}>
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
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Property ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Property Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={6}>
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
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Unit"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Min Value"
              type="number"
              value={formData.minValue ?? ''}
              onChange={(e) => setFormData({ ...formData, minValue: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Max Value"
              type="number"
              value={formData.maxValue ?? ''}
              onChange={(e) => setFormData({ ...formData, maxValue: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
          </Grid>
          <Grid item xs={12}>
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
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Assignment ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid item xs={12}>
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
          <Grid item xs={12}>
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
          <Grid item xs={12}>
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
          <Grid item xs={6}>
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
          <Grid item xs={6}>
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
    if (!formData.id || !formData.name || !formData.productMaterialId) {
      alert('ID, Name, and Product Material are required');
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
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Process Segment ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Segment Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Product Material</InputLabel>
              <Select
                value={formData.productMaterialId}
                label="Product Material"
                onChange={(e) => setFormData({ ...formData, productMaterialId: e.target.value })}
              >
                {finishedProducts.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.name} ({m.id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Sequence"
              type="number"
              value={formData.sequence}
              onChange={(e) => setFormData({ ...formData, sequence: parseInt(e.target.value) || 0 })}
              required
            />
          </Grid>
          <Grid item xs={6}>
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
  materials: Material[];
  onClose: () => void;
  onSave: (data: SegmentMaterialBOM) => void;
}

const SegmentBOMDialog: React.FC<SegmentBOMDialogProps> = ({ open, data, processSegments, materials, onClose, onSave }) => {
  const [formData, setFormData] = useState<SegmentMaterialBOM>(
    data || { id: '', processSegmentId: '', materialId: '', qtyPerUnit: 0, uom: '', materialUse: 'CONSUME' }
  );
  const [selectedProduct, setSelectedProduct] = useState<string>('');

  React.useEffect(() => {
    if (data) {
      setFormData(data);
      // Set the product based on the segment
      const segment = processSegments.find(ps => ps.id === data.processSegmentId);
      if (segment) {
        setSelectedProduct(segment.productMaterialId);
      }
    } else {
      setFormData({ id: '', processSegmentId: '', materialId: '', qtyPerUnit: 0, uom: '', materialUse: 'CONSUME' });
      setSelectedProduct('');
    }
  }, [data, open, processSegments]);

  const handleMaterialChange = (materialId: string) => {
    const selectedMaterial = materials.find(m => m.id === materialId);
    setFormData({ 
      ...formData, 
      materialId,
      uom: selectedMaterial?.defaultUoM || ''
    });
  };

  const handleProductChange = (productId: string) => {
    setSelectedProduct(productId);
    // Clear segment selection when product changes
    setFormData({ ...formData, processSegmentId: '' });
  };

  const handleSubmit = () => {
    if (!formData.id || !formData.processSegmentId || !formData.materialId) {
      alert('All fields are required');
      return;
    }
    onSave(formData);
  };

  // Get finished products for product selection
  const finishedProducts = materials.filter(m => m.classId === 'FINISHEDPRODUCT');

  // Filter segments by selected product
  const filteredSegments = selectedProduct 
    ? processSegments.filter(ps => ps.productMaterialId === selectedProduct)
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
          BOM lines define materials required for a specific process segment of a product.
          Select the product first, then the process segment, then the material and quantity.
        </Alert>
        
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
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
          
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>1. Select Product</InputLabel>
              <Select
                value={selectedProduct}
                label="1. Select Product"
                onChange={(e) => handleProductChange(e.target.value)}
              >
                <MenuItem value="">
                  <em>-- Select a product --</em>
                </MenuItem>
                {finishedProducts.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.name} ({m.id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth required disabled={!selectedProduct}>
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
                Product: {selectedProductInfo?.name} | Segment: {selectedSegment.name} (Seq: {selectedSegment.sequence})
              </Typography>
            )}
          </Grid>
          
          <Grid item xs={12}>
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

          <Grid item xs={6}>
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
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Unit of Measure"
              value={formData.uom}
              onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
              required
              helperText="Auto-filled from material"
            />
          </Grid>
          <Grid item xs={12}>
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
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Equipment Usage ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid item xs={12}>
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
          <Grid item xs={12}>
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
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={6}>
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
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Plant ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Plant Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
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
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Production Line ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Production Line Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={12}>
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
          <Grid item xs={12}>
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
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Line Equipment ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid item xs={12}>
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
          <Grid item xs={12}>
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
          <Grid item xs={12}>
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
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Sequence"
              type="number"
              value={formData.sequence}
              onChange={(e) => setFormData({ ...formData, sequence: parseInt(e.target.value) || 0 })}
              required
            />
          </Grid>
          <Grid item xs={12}>
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
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Shift ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid item xs={12}>
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
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Shift Name"
              value={formData.shiftName}
              onChange={(e) => setFormData({ ...formData, shiftName: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={6}>
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
          <Grid item xs={6}>
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
          <Grid item xs={12}>
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
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Crew ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Crew Name"
              value={formData.crewName}
              onChange={(e) => setFormData({ ...formData, crewName: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="People Count"
              type="number"
              value={formData.peopleCount}
              onChange={(e) => setFormData({ ...formData, peopleCount: parseInt(e.target.value) || 0 })}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Skills"
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              helperText="Comma-separated list of skills"
            />
          </Grid>
          <Grid item xs={12}>
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
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Assignment ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid item xs={12}>
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
          <Grid item xs={12}>
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
          <Grid item xs={6}>
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
          <Grid item xs={6}>
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
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Hierarchy Scope ID"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!data}
              required
            />
          </Grid>
          <Grid item xs={12}>
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
          <Grid item xs={12}>
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
                  <TableCell>{segment?.segmentName || item.processSegmentId}</TableCell>
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

