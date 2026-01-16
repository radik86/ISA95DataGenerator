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
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  PlayArrow as RunIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
} from '@mui/icons-material';

// Quality Rule Interfaces
interface QualityRule {
  id: string;
  name: string;
  category: 'Range Validation' | 'Enumeration Validation' | 'Relationship Validation' | 'Reference Integrity' | 'Custom';
  description: string;
  sqlCode: string;
  severity: 'Error' | 'Warning' | 'Info';
  isActive: boolean;
  entityName?: string;
  fieldName?: string;
  createdDate: string;
  lastModified: string;
}

const QualityChecks: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [qualityRules, setQualityRules] = useState<QualityRule[]>([]);
  const [ruleDialog, setRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<QualityRule | null>(null);
  const [sqlPreview, setSqlPreview] = useState('');
  const [showSqlDialog, setShowSqlDialog] = useState(false);

  useEffect(() => {
    generateDefaultRules();
  }, []);

  const generateDefaultRules = () => {
    const defaultRules: QualityRule[] = [
      // Range Validation Rules
      {
        id: 'range_001',
        name: 'Job Response Start Date Validation',
        category: 'Range Validation',
        description: 'Validates that Job Response start date is not earlier than Job Order start date',
        sqlCode: `CREATE VIEW vw_QC_Job_Response_StartDate AS
SELECT 
    jr.id AS Job_Response_Id,
    jr.startTime AS ResponseStartTime,
    jo.startTime AS OrderStartTime,
    'Job Response start date cannot be earlier than Job Order start date' AS ValidationMessage
FROM Job_Response jr
INNER JOIN Job_Order jo ON jr.jobOrderId = jo.id
WHERE jr.startTime < jo.startTime;`,
        severity: 'Error',
        isActive: true,
        entityName: 'Job Response',
        fieldName: 'startTime',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      {
        id: 'range_002',
        name: 'Job Response End Date Validation',
        category: 'Range Validation',
        description: 'Validates that Job Response end date is not earlier than start date',
        sqlCode: `CREATE VIEW vw_QC_Job_Response_EndDate AS
SELECT 
    id AS Job_Response_Id,
    startTime,
    endTime,
    'Job Response end date cannot be earlier than start date' AS ValidationMessage
FROM Job_Response
WHERE endTime < startTime;`,
        severity: 'Error',
        isActive: true,
        entityName: 'Job Response',
        fieldName: 'endTime',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      {
        id: 'range_003',
        name: 'Material Lot Quantity Validation',
        category: 'Range Validation',
        description: 'Validates that Material Lot quantity is greater than zero',
        sqlCode: `CREATE VIEW vw_QC_Material_Lot_Quantity AS
SELECT 
    id AS Material_Lot_Id,
    lotQuantity,
    'Material Lot quantity must be greater than zero' AS ValidationMessage
FROM Material_Lot
WHERE lotQuantity <= 0;`,
        severity: 'Error',
        isActive: true,
        entityName: 'Material Lot',
        fieldName: 'lotQuantity',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      
      // Enumeration Validation Rules
      {
        id: 'enum_001',
        name: 'Material Use Enumeration Validation',
        category: 'Enumeration Validation',
        description: 'Validates that materialUse field contains only valid enumeration values',
        sqlCode: `CREATE VIEW vw_QC_Material_Use_Enum AS
SELECT 
    id AS Material_Actual_Id,
    materialUse,
    'Invalid materialUse value. Must be one of: Consumable, Material consumed, Material produced, By-Product produced, Co-Product produced, Yield produced, Destructive sample, Returned sample, Retained sample, Inventoried, Scrap, Waste' AS ValidationMessage
FROM Material_Actual
WHERE materialUse NOT IN (
    'Consumable', 'Material consumed', 'Material produced', 
    'By-Product produced', 'Co-Product produced', 'Yield produced',
    'Destructive sample', 'Returned sample', 'Retained sample',
    'Inventoried', 'Scrap', 'Waste'
);`,
        severity: 'Error',
        isActive: true,
        entityName: 'Material Actual',
        fieldName: 'materialUse',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      {
        id: 'enum_002',
        name: 'Storage Location Type Enumeration Validation',
        category: 'Enumeration Validation',
        description: 'Validates that storageLocationType contains valid enumeration values',
        sqlCode: `CREATE VIEW vw_QC_Storage_Location_Type_Enum AS
SELECT 
    id AS Material_Actual_Id,
    storageLocationType,
    'Invalid storageLocationType value. Must be one of: Operational location, Equipment, Physical asset, Description' AS ValidationMessage
FROM Material_Actual
WHERE storageLocationType IS NOT NULL 
  AND storageLocationType NOT IN ('Operational location', 'Equipment', 'Physical asset', 'Description');`,
        severity: 'Error',
        isActive: true,
        entityName: 'Material Actual',
        fieldName: 'storageLocationType',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      {
        id: 'enum_003',
        name: 'Equipment Level Enumeration Validation',
        category: 'Enumeration Validation',
        description: 'Validates that Equipment level contains valid enumeration values',
        sqlCode: `CREATE VIEW vw_QC_Equipment_Level_Enum AS
SELECT 
    id AS Equipment_Id,
    equipmentLevel,
    'Invalid equipmentLevel value. Must be one of: Enterprise, Site, Area, Process Cell, Unit, Production Line, Work Cell, Production Unit, Storage Zone, Storage Unit, Work Center, Work Unit, Equipment Module, Control Module, Other' AS ValidationMessage
FROM Equipment
WHERE equipmentLevel NOT IN (
    'Enterprise', 'Site', 'Area', 'Process Cell', 'Unit', 
    'Production Line', 'Work Cell', 'Production Unit', 
    'Storage Zone', 'Storage Unit', 'Work Center', 
    'Work Unit', 'Equipment Module', 'Control Module', 'Other'
);`,
        severity: 'Error',
        isActive: true,
        entityName: 'Equipment',
        fieldName: 'equipmentLevel',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },

      // Relationship Validation Rules (Bridge Table Integrity)
      {
        id: 'rel_001',
        name: 'Equipment to Equipment Class Bridge Validation',
        category: 'Relationship Validation',
        description: 'Validates that Equipment to Equipment Class bridge mappings reference valid entities',
        sqlCode: `CREATE VIEW vw_QC_Equipment_Equipment_Class_Bridge AS
SELECT 
    b.PrimaryKey AS BridgeRecordId,
    b.[Source type] AS SourceType,
    b.[Source PrimaryKey] AS SourcePrimaryKey,
    b.[Target Type] AS TargetType,
    b.[Target PrimaryKey] AS TargetPrimaryKey,
    CASE 
        WHEN e.id IS NULL THEN 'Source Equipment not found: ' + CAST(b.[Source PrimaryKey] AS NVARCHAR)
        WHEN ec.id IS NULL THEN 'Target Equipment Class not found: ' + CAST(b.[Target PrimaryKey] AS NVARCHAR)
    END AS ValidationMessage
FROM Equipment_to_Equipment_Class_mapping b
LEFT JOIN Equipment e ON b.[Source PrimaryKey] = e.PrimaryKey
LEFT JOIN Equipment_Class ec ON b.[Target PrimaryKey] = ec.PrimaryKey
WHERE e.id IS NULL OR ec.id IS NULL;`,
        severity: 'Error',
        isActive: true,
        entityName: 'Equipment_to_Equipment_Class_mapping',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      {
        id: 'rel_002',
        name: 'Material Actual to Material Lot Bridge Validation',
        category: 'Relationship Validation',
        description: 'Validates that Material Actual to Material Lot bridge mappings reference valid entities',
        sqlCode: `CREATE VIEW vw_QC_Material_Actual_Material_Lot_Bridge AS
SELECT 
    b.PrimaryKey AS BridgeRecordId,
    b.[Source type] AS SourceType,
    b.[Source PrimaryKey] AS SourcePrimaryKey,
    b.[Target Type] AS TargetType,
    b.[Target PrimaryKey] AS TargetPrimaryKey,
    CASE 
        WHEN ma.id IS NULL THEN 'Source Material Actual not found: ' + CAST(b.[Source PrimaryKey] AS NVARCHAR)
        WHEN ml.id IS NULL THEN 'Target Material Lot not found: ' + CAST(b.[Target PrimaryKey] AS NVARCHAR)
    END AS ValidationMessage
FROM Material_Actual_to_Material_Lot_mapping b
LEFT JOIN Material_Actual ma ON b.[Source PrimaryKey] = ma.PrimaryKey
LEFT JOIN Material_Lot ml ON b.[Target PrimaryKey] = ml.PrimaryKey
WHERE ma.id IS NULL OR ml.id IS NULL;`,
        severity: 'Error',
        isActive: true,
        entityName: 'Material_Actual_to_Material_Lot_mapping',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      {
        id: 'rel_002a',
        name: 'Material Actual to Material Definition Bridge Validation',
        category: 'Relationship Validation',
        description: 'Validates that Material Actual to Material Definition bridge mappings reference valid entities',
        sqlCode: `CREATE VIEW vw_QC_Material_Actual_Material_Definition_Bridge AS
SELECT 
    b.PrimaryKey AS BridgeRecordId,
    b.[Source type] AS SourceType,
    b.[Source PrimaryKey] AS SourcePrimaryKey,
    b.[Target Type] AS TargetType,
    b.[Target PrimaryKey] AS TargetPrimaryKey,
    CASE 
        WHEN ma.id IS NULL THEN 'Source Material Actual not found: ' + CAST(b.[Source PrimaryKey] AS NVARCHAR)
        WHEN md.id IS NULL THEN 'Target Material Definition not found: ' + CAST(b.[Target PrimaryKey] AS NVARCHAR)
    END AS ValidationMessage
FROM Material_Actual_to_Material_Definition_mapping b
LEFT JOIN Material_Actual ma ON b.[Source PrimaryKey] = ma.PrimaryKey
LEFT JOIN Material_Definition md ON b.[Target PrimaryKey] = md.PrimaryKey
WHERE ma.id IS NULL OR md.id IS NULL;`,
        severity: 'Error',
        isActive: true,
        entityName: 'Material_Actual_to_Material_Definition_mapping',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      {
        id: 'rel_002b',
        name: 'Material Actual to Material Class Bridge Validation',
        category: 'Relationship Validation',
        description: 'Validates that Material Actual to Material Class bridge mappings reference valid entities',
        sqlCode: `CREATE VIEW vw_QC_Material_Actual_Material_Class_Bridge AS
SELECT 
    b.PrimaryKey AS BridgeRecordId,
    b.[Source type] AS SourceType,
    b.[Source PrimaryKey] AS SourcePrimaryKey,
    b.[Target Type] AS TargetType,
    b.[Target PrimaryKey] AS TargetPrimaryKey,
    CASE 
        WHEN ma.id IS NULL THEN 'Source Material Actual not found: ' + CAST(b.[Source PrimaryKey] AS NVARCHAR)
        WHEN mc.id IS NULL THEN 'Target Material Class not found: ' + CAST(b.[Target PrimaryKey] AS NVARCHAR)
    END AS ValidationMessage
FROM Material_Actual_to_Material_Class_mapping b
LEFT JOIN Material_Actual ma ON b.[Source PrimaryKey] = ma.PrimaryKey
LEFT JOIN Material_Class mc ON b.[Target PrimaryKey] = mc.PrimaryKey
WHERE ma.id IS NULL OR mc.id IS NULL;`,
        severity: 'Error',
        isActive: true,
        entityName: 'Material_Actual_to_Material_Class_mapping',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      {
        id: 'rel_002c',
        name: 'Equipment Actual to Equipment Bridge Validation',
        category: 'Relationship Validation',
        description: 'Validates that Equipment Actual to Equipment bridge mappings reference valid entities',
        sqlCode: `CREATE VIEW vw_QC_Equipment_Actual_Equipment_Bridge AS
SELECT 
    b.PrimaryKey AS BridgeRecordId,
    b.[Source type] AS SourceType,
    b.[Source PrimaryKey] AS SourcePrimaryKey,
    b.[Target Type] AS TargetType,
    b.[Target PrimaryKey] AS TargetPrimaryKey,
    CASE 
        WHEN ea.id IS NULL THEN 'Source Equipment Actual not found: ' + CAST(b.[Source PrimaryKey] AS NVARCHAR)
        WHEN e.id IS NULL THEN 'Target Equipment not found: ' + CAST(b.[Target PrimaryKey] AS NVARCHAR)
    END AS ValidationMessage
FROM Equipment_Actual_to_Equipment_mapping b
LEFT JOIN Equipment_Actual ea ON b.[Source PrimaryKey] = ea.PrimaryKey
LEFT JOIN Equipment e ON b.[Target PrimaryKey] = e.PrimaryKey
WHERE ea.id IS NULL OR e.id IS NULL;`,
        severity: 'Error',
        isActive: true,
        entityName: 'Equipment_Actual_to_Equipment_mapping',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      {
        id: 'rel_002d',
        name: 'Personnel Actual to Person Bridge Validation',
        category: 'Relationship Validation',
        description: 'Validates that Personnel Actual to Person bridge mappings reference valid entities',
        sqlCode: `CREATE VIEW vw_QC_Personnel_Actual_Person_Bridge AS
SELECT 
    b.PrimaryKey AS BridgeRecordId,
    b.[Source type] AS SourceType,
    b.[Source PrimaryKey] AS SourcePrimaryKey,
    b.[Target Type] AS TargetType,
    b.[Target PrimaryKey] AS TargetPrimaryKey,
    CASE 
        WHEN pa.id IS NULL THEN 'Source Personnel Actual not found: ' + CAST(b.[Source PrimaryKey] AS NVARCHAR)
        WHEN p.id IS NULL THEN 'Target Person not found: ' + CAST(b.[Target PrimaryKey] AS NVARCHAR)
    END AS ValidationMessage
FROM Personnel_Actual_to_Person_mapping b
LEFT JOIN Personnel_Actual pa ON b.[Source PrimaryKey] = pa.PrimaryKey
LEFT JOIN Person p ON b.[Target PrimaryKey] = p.PrimaryKey
WHERE pa.id IS NULL OR p.id IS NULL;`,
        severity: 'Error',
        isActive: true,
        entityName: 'Personnel_Actual_to_Person_mapping',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      {
        id: 'rel_002e',
        name: 'Physical Asset Actual to Physical Asset Bridge Validation',
        category: 'Relationship Validation',
        description: 'Validates that Physical Asset Actual to Physical Asset bridge mappings reference valid entities',
        sqlCode: `CREATE VIEW vw_QC_Physical_Asset_Actual_Physical_Asset_Bridge AS
SELECT 
    b.PrimaryKey AS BridgeRecordId,
    b.[Source type] AS SourceType,
    b.[Source PrimaryKey] AS SourcePrimaryKey,
    b.[Target Type] AS TargetType,
    b.[Target PrimaryKey] AS TargetPrimaryKey,
    CASE 
        WHEN paa.id IS NULL THEN 'Source Physical Asset Actual not found: ' + CAST(b.[Source PrimaryKey] AS NVARCHAR)
        WHEN pa.id IS NULL THEN 'Target Physical Asset not found: ' + CAST(b.[Target PrimaryKey] AS NVARCHAR)
    END AS ValidationMessage
FROM Physical_Asset_Actual_to_Physical_Asset_mapping b
LEFT JOIN Physical_Asset_Actual paa ON b.[Source PrimaryKey] = paa.PrimaryKey
LEFT JOIN Physical_Asset pa ON b.[Target PrimaryKey] = pa.PrimaryKey
WHERE paa.id IS NULL OR pa.id IS NULL;`,
        severity: 'Error',
        isActive: true,
        entityName: 'Physical_Asset_Actual_to_Physical_Asset_mapping',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      {
        id: 'rel_002f',
        name: 'Job Order to Process Segment Bridge Validation',
        category: 'Relationship Validation',
        description: 'Validates that Job Order to Process Segment bridge mappings reference valid entities',
        sqlCode: `CREATE VIEW vw_QC_Job_Order_Process_Segment_Bridge AS
SELECT 
    b.PrimaryKey AS BridgeRecordId,
    b.[Source type] AS SourceType,
    b.[Source PrimaryKey] AS SourcePrimaryKey,
    b.[Target Type] AS TargetType,
    b.[Target PrimaryKey] AS TargetPrimaryKey,
    CASE 
        WHEN jo.id IS NULL THEN 'Source Job Order not found: ' + CAST(b.[Source PrimaryKey] AS NVARCHAR)
        WHEN ps.id IS NULL THEN 'Target Process Segment not found: ' + CAST(b.[Target PrimaryKey] AS NVARCHAR)
    END AS ValidationMessage
FROM Job_Order_to_Process_Segment_mapping b
LEFT JOIN Job_Order jo ON b.[Source PrimaryKey] = jo.PrimaryKey
LEFT JOIN Process_Segment ps ON b.[Target PrimaryKey] = ps.PrimaryKey
WHERE jo.id IS NULL OR ps.id IS NULL;`,
        severity: 'Error',
        isActive: true,
        entityName: 'Job_Order_to_Process_Segment_mapping',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      {
        id: 'rel_002g',
        name: 'Process Segment to Operations Definition Bridge Validation',
        category: 'Relationship Validation',
        description: 'Validates that Process Segment to Operations Definition bridge mappings reference valid entities',
        sqlCode: `CREATE VIEW vw_QC_Process_Segment_Operations_Definition_Bridge AS
SELECT 
    b.PrimaryKey AS BridgeRecordId,
    b.[Source type] AS SourceType,
    b.[Source PrimaryKey] AS SourcePrimaryKey,
    b.[Target Type] AS TargetType,
    b.[Target PrimaryKey] AS TargetPrimaryKey,
    CASE 
        WHEN ps.id IS NULL THEN 'Source Process Segment not found: ' + CAST(b.[Source PrimaryKey] AS NVARCHAR)
        WHEN od.id IS NULL THEN 'Target Operations Definition not found: ' + CAST(b.[Target PrimaryKey] AS NVARCHAR)
    END AS ValidationMessage
FROM Process_Segment_to_Operations_Definition_mapping b
LEFT JOIN Process_Segment ps ON b.[Source PrimaryKey] = ps.PrimaryKey
LEFT JOIN Operations_Definition od ON b.[Target PrimaryKey] = od.PrimaryKey
WHERE ps.id IS NULL OR od.id IS NULL;`,
        severity: 'Error',
        isActive: true,
        entityName: 'Process_Segment_to_Operations_Definition_mapping',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      {
        id: 'rel_002h',
        name: 'Generic Bridge Table Source Validation',
        category: 'Relationship Validation',
        description: 'Generic validation for any bridge table - checks if Source Type and Source PrimaryKey are consistent',
        sqlCode: `CREATE VIEW vw_QC_BridgeTable_SourceConsistency AS
-- This is a template for generic bridge table validation
-- Replace {BridgeTableName} with actual bridge table name
-- Replace {SourceEntityTable} with actual source entity table name
SELECT 
    b.PrimaryKey AS BridgeRecordId,
    b.[Source type] AS SourceType,
    b.[Source PrimaryKey] AS SourcePrimaryKey,
    b.[Target Type] AS TargetType,
    'Source entity PK not found in ' + b.[Source type] + ' table' AS ValidationMessage
FROM {BridgeTableName} b
WHERE NOT EXISTS (
    SELECT 1 FROM {SourceEntityTable} s WHERE s.id = b.[Source PrimaryKey]
);`,
        severity: 'Error',
        isActive: false,
        entityName: 'Generic_Bridge_Table',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      {
        id: 'rel_002i',
        name: 'Generic Bridge Table Target Validation',
        category: 'Relationship Validation',
        description: 'Generic validation for any bridge table - checks if Target Type and Target PrimaryKey are consistent',
        sqlCode: `CREATE VIEW vw_QC_BridgeTable_TargetConsistency AS
-- This is a template for generic bridge table validation
-- Replace {BridgeTableName} with actual bridge table name
-- Replace {TargetEntityTable} with actual target entity table name
SELECT 
    b.PrimaryKey AS BridgeRecordId,
    b.[Source type] AS SourceType,
    b.[Target Type] AS TargetType,
    b.[Target PrimaryKey] AS TargetPrimaryKey,
    'Target entity PK not found in ' + b.[Target Type] + ' table' AS ValidationMessage
FROM {BridgeTableName} b
WHERE NOT EXISTS (
    SELECT 1 FROM {TargetEntityTable} t WHERE t.id = b.[Target PrimaryKey]
);`,
        severity: 'Error',
        isActive: false,
        entityName: 'Generic_Bridge_Table',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      {
        id: 'rel_003',
        name: 'Material Lot Parent Relationship Validation',
        category: 'Relationship Validation',
        description: 'Validates that Material Lot parent references exist and are not circular',
        sqlCode: `CREATE VIEW vw_QC_Material_Lot_Parent AS
SELECT 
    ml.id AS Material_Lot_Id,
    ml.parentLotId,
    'Parent Material Lot not found or circular reference detected' AS ValidationMessage
FROM Material_Lot ml
LEFT JOIN Material_Lot parent ON ml.parentLotId = parent.id
WHERE ml.parentLotId IS NOT NULL 
  AND (parent.id IS NULL OR ml.id = ml.parentLotId);`,
        severity: 'Error',
        isActive: true,
        entityName: 'Material Lot',
        fieldName: 'parentLotId',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      {
        id: 'rel_004',
        name: 'Equipment Parent Relationship Validation',
        category: 'Relationship Validation',
        description: 'Validates that Equipment parent references exist and are not circular',
        sqlCode: `CREATE VIEW vw_QC_Equipment_Parent AS
SELECT 
    e.id AS Equipment_Id,
    e.parentEquipmentId,
    'Parent Equipment not found or circular reference detected' AS ValidationMessage
FROM Equipment e
LEFT JOIN Equipment parent ON e.parentEquipmentId = parent.id
WHERE e.parentEquipmentId IS NOT NULL 
  AND (parent.id IS NULL OR e.id = e.parentEquipmentId);`,
        severity: 'Error',
        isActive: true,
        entityName: 'Equipment',
        fieldName: 'parentEquipmentId',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },

      // Reference Integrity Rules
      {
        id: 'ref_001',
        name: 'Material Actual to Material Definition Reference',
        category: 'Reference Integrity',
        description: 'Validates that Material Actual references valid Material Definition',
        sqlCode: `CREATE VIEW vw_QC_Material_Actual_To_Definition AS
SELECT 
    ma.id AS Material_Actual_Id,
    ma.materialDefinitionId,
    'Referenced Material Definition not found' AS ValidationMessage
FROM Material_Actual ma
LEFT JOIN Material_Definition md ON ma.materialDefinitionId = md.id
WHERE ma.materialDefinitionId IS NOT NULL AND md.id IS NULL;`,
        severity: 'Error',
        isActive: true,
        entityName: 'Material Actual',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      {
        id: 'ref_002',
        name: 'Equipment Actual to Equipment Reference',
        category: 'Reference Integrity',
        description: 'Validates that Equipment Actual references valid Equipment',
        sqlCode: `CREATE VIEW vw_QC_Equipment_Actual_To_Equipment AS
SELECT 
    ea.id AS Equipment_Actual_Id,
    ea.equipmentId,
    'Referenced Equipment not found' AS ValidationMessage
FROM Equipment_Actual ea
LEFT JOIN Equipment e ON ea.equipmentId = e.id
WHERE ea.equipmentId IS NOT NULL AND e.id IS NULL;`,
        severity: 'Error',
        isActive: true,
        entityName: 'Equipment Actual',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      {
        id: 'ref_003',
        name: 'Material Sublot to Material Lot Reference',
        category: 'Reference Integrity',
        description: 'Validates that Material Sublot references valid Material Lot',
        sqlCode: `CREATE VIEW vw_QC_Material_Sublot_To_Lot AS
SELECT 
    ms.id AS Material_Sublot_Id,
    ms.materialLotId,
    'Referenced Material Lot not found' AS ValidationMessage
FROM Material_Sublot ms
LEFT JOIN Material_Lot ml ON ms.materialLotId = ml.id
WHERE ms.materialLotId IS NOT NULL AND ml.id IS NULL;`,
        severity: 'Error',
        isActive: true,
        entityName: 'Material Sublot',
        fieldName: 'materialLotId',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
    ];

    setQualityRules(defaultRules);
  };

  const handleAddRule = () => {
    setEditingRule(null);
    setRuleDialog(true);
  };

  const handleEditRule = (rule: QualityRule) => {
    setEditingRule(rule);
    setRuleDialog(true);
  };

  const handleDeleteRule = (ruleId: string) => {
    if (confirm('Delete this quality rule?')) {
      setQualityRules(prev => prev.filter(r => r.id !== ruleId));
    }
  };

  const handleSaveRule = (rule: QualityRule) => {
    if (editingRule) {
      setQualityRules(prev => prev.map(r => r.id === rule.id ? { ...rule, lastModified: new Date().toISOString() } : r));
    } else {
      const newRule = {
        ...rule,
        id: `custom_${Date.now()}`,
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      };
      setQualityRules(prev => [...prev, newRule]);
    }
    setRuleDialog(false);
  };

  const handleToggleRule = (ruleId: string) => {
    setQualityRules(prev => prev.map(r => 
      r.id === ruleId ? { ...r, isActive: !r.isActive, lastModified: new Date().toISOString() } : r
    ));
  };

  const generateSqlScript = () => {
    const activeRules = qualityRules.filter(r => r.isActive);
    let script = `-- ISA-95 Data Quality Check Views\n`;
    script += `-- Generated: ${new Date().toLocaleString()}\n`;
    script += `-- Total Rules: ${activeRules.length}\n\n`;

    activeRules.forEach((rule, index) => {
      script += `-- ============================================\n`;
      script += `-- Rule ${index + 1}: ${rule.name}\n`;
      script += `-- Category: ${rule.category}\n`;
      script += `-- Severity: ${rule.severity}\n`;
      script += `-- Description: ${rule.description}\n`;
      script += `-- ============================================\n\n`;
      script += `${rule.sqlCode}\n\n`;
    });

    // Add summary view
    script += `-- ============================================\n`;
    script += `-- Summary View: All Quality Check Results\n`;
    script += `-- ============================================\n\n`;
    script += `CREATE VIEW vw_QC_Summary AS\n`;
    
    const unionQueries = activeRules.map((rule, index) => {
      const viewName = rule.sqlCode.match(/CREATE VIEW (\w+)/)?.[1] || `vw_${rule.id}`;
      return `${index > 0 ? 'UNION ALL\n' : ''}SELECT 
    '${rule.id}' AS RuleId,
    '${rule.name}' AS RuleName,
    '${rule.category}' AS Category,
    '${rule.severity}' AS Severity,
    *
FROM ${viewName}`;
    });

    script += unionQueries.join('\n') + ';\n\n';

    setSqlPreview(script);
    setShowSqlDialog(true);
  };

  const downloadSqlScript = () => {
    const blob = new Blob([sqlPreview], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ISA95_Quality_Checks_${new Date().toISOString().split('T')[0]}.sql`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getRulesByCategory = (category: string) => {
    return qualityRules.filter(r => r.category === category);
  };

  const categories = ['Range Validation', 'Enumeration Validation', 'Relationship Validation', 'Reference Integrity', 'Custom'];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Data Quality Checks</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<CodeIcon />}
            onClick={generateSqlScript}
            sx={{ mr: 2 }}
          >
            Generate SQL Script
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddRule}
          >
            Add Custom Rule
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Quality checks validate data integrity, enumeration values, relationships, and business rules.
        Active rules: {qualityRules.filter(r => r.isActive).length} / {qualityRules.length}
      </Alert>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`All Rules (${qualityRules.length})`} />
          <Tab label={`Range (${getRulesByCategory('Range Validation').length})`} />
          <Tab label={`Enumerations (${getRulesByCategory('Enumeration Validation').length})`} />
          <Tab label={`Relationships (${getRulesByCategory('Relationship Validation').length})`} />
          <Tab label={`References (${getRulesByCategory('Reference Integrity').length})`} />
        </Tabs>
      </Paper>

      {tabValue === 0 && (
        <Box>
          {categories.map(category => {
            const rules = getRulesByCategory(category);
            if (rules.length === 0) return null;
            return (
              <Accordion key={category} defaultExpanded={category === 'Range Validation'}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">
                    {category} ({rules.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell width="5%">Active</TableCell>
                          <TableCell width="20%">Rule Name</TableCell>
                          <TableCell width="35%">Description</TableCell>
                          <TableCell width="15%">Entity</TableCell>
                          <TableCell width="10%">Severity</TableCell>
                          <TableCell width="15%" align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rules.map(rule => (
                          <TableRow key={rule.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={rule.isActive}
                                onChange={() => handleToggleRule(rule.id)}
                              />
                            </TableCell>
                            <TableCell>{rule.name}</TableCell>
                            <TableCell>
                              <Typography variant="body2">{rule.description}</Typography>
                            </TableCell>
                            <TableCell>
                              {rule.entityName && (
                                <Chip label={rule.entityName} size="small" color="primary" />
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={rule.severity} 
                                size="small" 
                                color={rule.severity === 'Error' ? 'error' : rule.severity === 'Warning' ? 'warning' : 'info'}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <IconButton size="small" onClick={() => handleEditRule(rule)}>
                                <EditIcon />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => handleDeleteRule(rule.id)}>
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}

      {tabValue > 0 && (
        <RuleCategoryView 
          rules={getRulesByCategory(categories[tabValue - 1])}
          onEdit={handleEditRule}
          onDelete={handleDeleteRule}
          onToggle={handleToggleRule}
        />
      )}

      <QualityRuleDialog
        open={ruleDialog}
        rule={editingRule}
        onClose={() => setRuleDialog(false)}
        onSave={handleSaveRule}
      />

      <Dialog open={showSqlDialog} onClose={() => setShowSqlDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          SQL Quality Check Script
          <IconButton
            onClick={downloadSqlScript}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <DownloadIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={25}
            value={sqlPreview}
            variant="outlined"
            InputProps={{
              readOnly: true,
              sx: { fontFamily: 'monospace', fontSize: '0.875rem' }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSqlDialog(false)}>Close</Button>
          <Button variant="contained" onClick={downloadSqlScript} startIcon={<DownloadIcon />}>
            Download SQL
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

interface RuleCategoryViewProps {
  rules: QualityRule[];
  onEdit: (rule: QualityRule) => void;
  onDelete: (ruleId: string) => void;
  onToggle: (ruleId: string) => void;
}

const RuleCategoryView: React.FC<RuleCategoryViewProps> = ({ rules, onEdit, onDelete, onToggle }) => {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell width="5%">Active</TableCell>
            <TableCell width="20%">Rule Name</TableCell>
            <TableCell width="35%">Description</TableCell>
            <TableCell width="15%">Entity/Field</TableCell>
            <TableCell width="10%">Severity</TableCell>
            <TableCell width="15%" align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rules.map(rule => (
            <TableRow key={rule.id}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={rule.isActive}
                  onChange={() => onToggle(rule.id)}
                />
              </TableCell>
              <TableCell>{rule.name}</TableCell>
              <TableCell>
                <Typography variant="body2">{rule.description}</Typography>
              </TableCell>
              <TableCell>
                {rule.entityName && (
                  <Box>
                    <Chip label={rule.entityName} size="small" color="primary" sx={{ mb: 0.5 }} />
                    {rule.fieldName && (
                      <Typography variant="caption" display="block">
                        {rule.fieldName}
                      </Typography>
                    )}
                  </Box>
                )}
              </TableCell>
              <TableCell>
                <Chip 
                  label={rule.severity} 
                  size="small" 
                  color={rule.severity === 'Error' ? 'error' : rule.severity === 'Warning' ? 'warning' : 'info'}
                />
              </TableCell>
              <TableCell align="right">
                <IconButton size="small" onClick={() => onEdit(rule)}>
                  <EditIcon />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => onDelete(rule.id)}>
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

interface QualityRuleDialogProps {
  open: boolean;
  rule: QualityRule | null;
  onClose: () => void;
  onSave: (rule: QualityRule) => void;
}

const QualityRuleDialog: React.FC<QualityRuleDialogProps> = ({ open, rule, onClose, onSave }) => {
  const [formData, setFormData] = useState<Omit<QualityRule, 'id' | 'createdDate' | 'lastModified'>>({
    name: '',
    category: 'Custom',
    description: '',
    sqlCode: '',
    severity: 'Warning',
    isActive: true,
    entityName: '',
    fieldName: '',
  });

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        category: rule.category,
        description: rule.description,
        sqlCode: rule.sqlCode,
        severity: rule.severity,
        isActive: rule.isActive,
        entityName: rule.entityName || '',
        fieldName: rule.fieldName || '',
      });
    } else {
      setFormData({
        name: '',
        category: 'Custom',
        description: '',
        sqlCode: '',
        severity: 'Warning',
        isActive: true,
        entityName: '',
        fieldName: '',
      });
    }
  }, [rule, open]);

  const handleSubmit = () => {
    if (!formData.name || !formData.description || !formData.sqlCode) {
      alert('Name, Description, and SQL Code are required');
      return;
    }

    const ruleToSave: QualityRule = rule 
      ? { ...rule, ...formData }
      : { 
          ...formData, 
          id: '',
          createdDate: '',
          lastModified: '',
        } as QualityRule;

    onSave(ruleToSave);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{rule ? 'Edit' : 'Add'} Quality Rule</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Rule Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                label="Category"
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              >
                <MenuItem value="Range Validation">Range Validation</MenuItem>
                <MenuItem value="Enumeration Validation">Enumeration Validation</MenuItem>
                <MenuItem value="Relationship Validation">Relationship Validation</MenuItem>
                <MenuItem value="Reference Integrity">Reference Integrity</MenuItem>
                <MenuItem value="Custom">Custom</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth required>
              <InputLabel>Severity</InputLabel>
              <Select
                value={formData.severity}
                label="Severity"
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
              >
                <MenuItem value="Error">Error</MenuItem>
                <MenuItem value="Warning">Warning</MenuItem>
                <MenuItem value="Info">Info</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Entity Name (Optional)"
              value={formData.entityName}
              onChange={(e) => setFormData({ ...formData, entityName: e.target.value })}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Field Name (Optional)"
              value={formData.fieldName}
              onChange={(e) => setFormData({ ...formData, fieldName: e.target.value })}
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
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="SQL Code"
              value={formData.sqlCode}
              onChange={(e) => setFormData({ ...formData, sqlCode: e.target.value })}
              multiline
              rows={12}
              required
              placeholder="CREATE VIEW vw_QC_YourRule AS..."
              InputProps={{
                sx: { fontFamily: 'monospace', fontSize: '0.875rem' }
              }}
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

export default QualityChecks;
