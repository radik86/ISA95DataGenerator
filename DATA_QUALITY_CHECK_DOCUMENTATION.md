# ISA-95 Data Quality Check System - Comprehensive Documentation

**Version**: 1.0  
**Last Updated**: April 29, 2026  
**Status**: Production Ready

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture & Components](#architecture--components)
3. [Core Building Blocks](#core-building-blocks)
4. [How to Configure Rules](#how-to-configure-rules)
5. [How to Maintain the System](#how-to-maintain-the-system)
6. [How to Use the Quality Check System](#how-to-use-the-quality-check-system)
7. [Rule Types & Examples](#rule-types--examples)
8. [SQL View Generation & Deployment](#sql-view-generation--deployment)
9. [Troubleshooting & Best Practices](#troubleshooting--best-practices)
10. [API Integration](#api-integration)
11. [Performance Optimization](#performance-optimization)

---

## System Overview

The **Data Quality Check System** is an automated validation framework that ensures ISA-95 entity data files meets business rules, enumeration constraints, and referential integrity requirements. It enables:

- **Automatic rule generation** from DTDL entity schemas
- **SQL view creation** for production data validation
- **Relationship mapping** across all ISA-95 entities
- **Custom rule definition** for business-specific validations
- **Pre-migration validation** to ensure data integrity during transformation

### Key Statistics

| Component | Count | Purpose |
|-----------|-------|---------|
| Enumeration Fields | 100+ | Fields with constrained values |
| Relationship Types | 150+ | Entity-to-entity connections |
| Supported Entities | 70+ | ISA-95 domain model coverage |
| Rule Categories | 5 | Rule classification types |

---

## Architecture & Components

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Material-UI)            │
├─────────────────────────────────────────────────────────────┤
│  QualityChecks Component (.tsx)                              │
│  ├─ Rule Management UI                                       │
│  ├─ Entity Loading                                           │
│  ├─ Relationship Matrix                                      │
│  └─ SQL Preview & Generation                                │
├─────────────────────────────────────────────────────────────┤
│  Service Layer (TypeScript Services)                         │
│  ├─ qualityCheckService.ts                                   │
│  │  ├─ Rule Generation                                       │
│  │  ├─ SQL Generation                                        │
│  │  ├─ Mapping Validation                                    │
│  │  └─ Relationship Extraction                               │
├─────────────────────────────────────────────────────────────┤
│  API Integration Layer                                        │
│  ├─ GET /api/metadata/entities                               │
│  ├─ GET /InbuiltEntitiesDTDL/*.json                          │
│  └─ Data Lake Connection                                     │
├─────────────────────────────────────────────────────────────┤
│  Backend (SQL Server)                                         │
│  ├─ Enumeration Validation Views                             │
│  ├─ Relationship Validation Views                            │
│  ├─ Reference Integrity Views                               │
│  └─ Summary Aggregation Views                                │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

#### 1. **Frontend Components** (React UI Layer)

**File**: `frontend/src/components/QualityChecks.tsx`

**Responsibilities**:
- Display quality check rules in tabbed interface
- Load entity metadata from API
- Trigger rule generation
- Display relationship matrix
- Generate and preview SQL scripts
- Download SQL scripts

**Key State Variables**:
```typescript
const [qualityRules, setQualityRules] = useState<QualityRule[]>([]);
const [entities, setEntities] = useState<EntityDefinition[]>([]);
const [relationshipMatrix, setRelationshipMatrix] = useState<Record<string, string[]>>({});
const [dtdlSchemas, setDtdlSchemas] = useState<any[]>([]);
const [tabValue, setTabValue] = useState(0);  // 0: Rules, 1: Matrix, 2: SQL
```

**Key UI Sections**:
- **Rule Management Tab**: View and edit all quality check rules by category
- **Relationship Matrix Tab**: Entity relationship visualization
- **SQL Preview Tab**: Generated SQL script preview and download
- **Rule Dialog**: Create and edit individual rules with syntax validation

#### 2. **Service Layer** (Business Logic)

**File**: `frontend/src/services/qualityCheckService.ts`

**Core Interfaces**:

```typescript
interface QualityCheckRule {
  id: string;
  name: string;
  category: 'Range Validation' | 'Enumeration Validation' 
           | 'Relationship Validation' | 'Reference Integrity' | 'Custom';
  description: string;
  sqlCode: string;
  severity: 'Error' | 'Warning' | 'Info';
  isActive: boolean;
  entityName?: string;
  fieldName?: string;
  createdDate: string;
  lastModified: string;
}

interface EntityRelationship {
  sourceEntity: string;
  targetEntity: string;
  relationshipName: string;
  cardinality: string;
  isRequired: boolean;
}

interface EnumerationField {
  entityName: string;
  fieldName: string;
  allowedValues: string[];
}
```

**Core Functions**:

| Function | Purpose | Input | Output |
|----------|---------|-------|--------|
| `extractEntityRelationships()` | Parse entity definitions for all relationships | `EntityDefinition[]` | `EntityRelationship[]` |
| `extractEnumerationFields()` | Find all enum-constrained fields | `EntityDefinition[]` | `EnumerationField[]` |
| `extractEnumerationsFromDTDL()` | Parse DTDL JSON schemas for enums | `any[]` (DTDL files) | `EnumerationField[]` |
| `generateEnumerationValidationSQL()` | Create SQL view for enum validation | `EnumerationField` | SQL string |
| `generateRelationshipValidationSQL()` | Create SQL view for relationship validation | `EntityRelationship` | SQL string |
| `generateQualityCheckRules()` | Auto-generate all rules from entities | `EntityDefinition[]` | `QualityCheckRule[]` |
| `generateConsolidatedSQLScript()` | Create complete deployment SQL | `QualityCheckRule[]` | SQL script string |
| `generateRelationshipMatrix()` | Build entity-to-entity map | `EntityDefinition[]` | `Record<string, string[]>` |
| `validateMappingFile()` | Validate data mappings against relationships | Mappings + matrix | Validation results |

---

## Core Building Blocks

### 1. Rule Definition Structure

Each quality check rule defines a single validation constraint:

```typescript
{
  id: "enum_001",
  name: "Equipment - equipmentLevel Enumeration Validation",
  category: "Enumeration Validation",
  description: "Validates that equipmentLevel contains only: Enterprise, Site, Area, Work Center, Equipment",
  sqlCode: `CREATE VIEW vw_QC_Equipment_equipmentLevel_Enum AS
SELECT 
    id AS Equipment_Id,
    equipmentLevel,
    'Invalid equipmentLevel value. Must be one of: Enterprise, Site, Area, Work Center, Equipment' AS ValidationMessage
FROM Equipment
WHERE equipmentLevel IS NOT NULL 
  AND equipmentLevel NOT IN ('Enterprise', 'Site', 'Area', 'Work Center', 'Equipment');`,
  severity: "Error",
  isActive: true,
  entityName: "Equipment",
  fieldName: "equipmentLevel",
  createdDate: "2026-04-29T10:00:00Z",
  lastModified: "2026-04-29T10:00:00Z"
}
```

### 2. SQL View Generation Pattern

All rules generate SQL Server views following a consistent pattern:

#### Enumeration Validation View

```sql
CREATE VIEW vw_QC_{EntityName}_{FieldName}_Enum AS
SELECT 
    id,
    {fieldName},
    'Invalid {fieldName} value. Must be one of: {values}' AS ValidationMessage
FROM {EntityName}
WHERE {fieldName} IS NOT NULL 
  AND {fieldName} NOT IN ({allowedValues});
```

**Example**:
```sql
CREATE VIEW vw_QC_Equipment_equipmentLevel_Enum AS
SELECT 
    id,
    equipmentLevel,
    'Invalid equipmentLevel value. Must be one of: Enterprise, Site, Area, Work Center, Equipment' AS ValidationMessage
FROM Equipment
WHERE equipmentLevel IS NOT NULL 
  AND equipmentLevel NOT IN ('Enterprise', 'Site', 'Area', 'Work Center', 'Equipment');
```

#### Relationship Validation View (Direct FK)

```sql
CREATE VIEW vw_QC_{SourceEntity}_to_{TargetEntity} AS
SELECT 
    s.id AS {SourceEntity}_Id,
    s.{targetEntityId},
    'Referenced {TargetEntity} not found' AS ValidationMessage
FROM {SourceEntity} s
LEFT JOIN {TargetEntity} t ON s.{targetEntityId} = t.id
WHERE s.{targetEntityId} IS NOT NULL AND t.id IS NULL;
```

#### Bridge Table Validation View

```sql
CREATE VIEW vw_QC_{BridgeTable}_References AS
SELECT 
    b.id AS BridgeRecordId,
    b.sourceId,
    b.targetId,
    CASE 
        WHEN source.id IS NULL THEN 'Source entity not found'
        WHEN target.id IS NULL THEN 'Target entity not found'
    END AS ValidationMessage
FROM {BridgeTable} b
LEFT JOIN {SourceEntity} source ON b.sourceId = source.id
LEFT JOIN {TargetEntity} target ON b.targetId = target.id
WHERE source.id IS NULL OR target.id IS NULL;
```

### 3. Data Flow

```
User Interaction
    ↓
[Click "Auto-Generate Rules"]
    ↓
Load DTDL Schemas + Entity Metadata
    ↓
Extract Enumerations & Relationships
    ↓
Generate SQL Views
    ↓
Create QualityCheckRule Objects
    ↓
Add to Rule List
    ↓
Display in UI
    ↓
[User clicks "Generate SQL Script"]
    ↓
Consolidate All Active Rules
    ↓
Create DROP statements
    ↓
Create CREATE VIEW statements
    ↓
Create Summary View (vw_QC_AllViolations)
    ↓
[Download SQL File]
    ↓
Execute in SQL Server
    ↓
Query Views to find violations
```

---

## How to Configure Rules

### 1. Automatic Rule Generation (Recommended)

#### Step 1: Load Entities

Click **"Auto-Generate All"** button:

```typescript
// System automatically calls
const response = await fetch('/api/metadata/entities');
const entities = await response.json();
```

The system loads entity definitions with:
- Entity names and descriptions
- Enumeration field definitions
- Relationship configurations
- Cardinality constraints

#### Step 2: Generate Rules from DTDL

Click **"Auto-Generate Enumerations from DTDL"** button:

```typescript
// System parses DTDL schemas from InbuiltEntitiesDTDL folder
// Extracts all enumeration constraints
// Generates validation rules automatically
const generatedRules = generateQualityCheckRulesFromDTDL(dtdlSchemas);
setQualityRules(prev => [...prev, ...generatedRules]);
```

**Result**: System creates validation rules for:
- All enumeration fields (e.g., equipmentLevel, materialClass)
- All relationship references (e.g., Equipment → EquipmentClass)
- All bridge table mappings (e.g., EquipmentPropertyMapping)

### 2. Manual Rule Addition

#### Creating a Custom Rule

1. Click **"Add Rule"** button
2. Fill in rule details:

```typescript
{
  name: "Material Lot - Minimum Quantity Validation",
  category: "Range Validation",
  description: "Validates that material lot quantity is >= 1",
  severity: "Warning",
  entityName: "MaterialLot",
  fieldName: "quantity",
  sqlCode: `CREATE VIEW vw_QC_MaterialLot_Quantity_Range AS
SELECT 
    id,
    quantity,
    'Quantity must be >= 1. Current value: ' + CAST(quantity AS VARCHAR) AS ValidationMessage
FROM MaterialLot
WHERE quantity < 1 OR quantity IS NULL;`
}
```

3. Click **"Save Rule"**
4. Rule is added to the quality checks list with status `isActive: true`

### 3. Modifying Existing Rules

#### Edit SQL Code

1. Click **Edit** button for any rule
2. Modify SQL in the "SQL Code" text area
3. Click **"Save"** to apply changes

**Validation Tips**:
- Keep view names as: `vw_QC_{description}`
- Always return `id` or primary key
- Always return `ValidationMessage` column
- Use safe SQL escaping for string values

#### Toggle Rules On/Off

Use the checkbox in the "Active" column:
- ✓ Rule is included in generated SQL script
- ✗ Rule is excluded (useful for testing or temporary disable)

### 4. Rule Configuration Best Practices

#### Rule Naming Convention

```
vw_QC_{EntityName}_{FieldName}_{Type}

Examples:
- vw_QC_Equipment_equipmentLevel_Enum
- vw_QC_MaterialLot_quantity_Range
- vw_QC_Equipment_to_EquipmentClass_FK
```

#### Severity Levels

| Level | Usage | SQL Include | Impact |
|-------|-------|-----------|--------|
| **Error** | Must-fix critical violations | Always | Blocks migration |
| **Warning** | Should-fix potential issues | Always | Requires review |
| **Info** | Informational recommendations | Depends on filter | Review recommended |

#### Active vs. Inactive Rules

```typescript
// Active rules are included in generated SQL
const activeRules = qualityRules.filter(r => r.isActive);
const script = generateConsolidatedSQLScript(activeRules);

// Inactive rules are disabled for testing
const inactiveRule = qualityRules.find(r => r.name === "CustomRule");
inactiveRule.isActive = false;  // Excluded from next SQL generation
```

---

## How to Maintain the System

### 1. Rule Maintenance Strategy

#### Regular Review Cycle

**Monthly**:
1. Review rule violation statistics
2. Update rule SQL based on business changes
3. Add new rules for emerging business requirements
4. Archive obsolete rules

**Quarterly**:
1. Analyze rule effectiveness (false positive rate)
2. Refine rule SQL for performance
3. Update documentation
4. Train team on new rules

#### Adding New Entities to Quality Checks

When a new ISA-95 entity is added:

1. **Create DTDL definition**: `InbuiltEntitiesDTDL/NewEntity.json`
   ```json
   {
     "name": "NewEntity",
     "attributes": [
       {
         "name": "statusField",
         "enumValues": ["Active", "Inactive"]
       }
     ],
     "relationships": [
       {
         "name": "relatesTo",
         "targetEntityName": "ExistingEntity"
       }
     ]
   }
   ```

2. **Load in Quality Checks UI**: System automatically detects new DTDL files

3. **Generate rules**: Click "Auto-Generate" to create validation rules

4. **Test rules**: Execute SQL script in test database first

5. **Deploy to production**: Move SQL script to production database

#### Updating Enumeration Values

When enum values change in DTDL:

```json
{
  "name": "equipmentLevel",
  "enumValues": [
    "Enterprise",
    "Site", 
    "Area",
    "Work Center",
    "Equipment",
    "Sub-Equipment"  // NEW: Added sub-equipment level
  ]
}
```

1. Update DTDL file
2. Refresh Quality Checks page
3. Regenerate rules (old views will be recreated)
4. Execute new SQL script:

```sql
-- Old view is dropped and recreated
IF OBJECT_ID('vw_QC_Equipment_equipmentLevel_Enum', 'V') IS NOT NULL 
  DROP VIEW vw_QC_Equipment_equipmentLevel_Enum;
GO

-- New view includes updated enum values
CREATE VIEW vw_QC_Equipment_equipmentLevel_Enum AS
SELECT ...
WHERE equipmentLevel NOT IN ('Enterprise', 'Site', 'Area', 'Work Center', 'Equipment', 'Sub-Equipment');
```

### 2. Performance Maintenance

#### SQL View Indexing Strategy

For frequently queried rules, add indexes:

```sql
-- Add index on columns referenced in WHERE clause
CREATE INDEX idx_Equipment_equipmentLevel 
ON Equipment(equipmentLevel) 
WHERE equipmentLevel IS NOT NULL;

-- Add index on foreign key columns
CREATE INDEX idx_MaterialLot_materialClassId 
ON MaterialLot(materialClassId);
```

#### View Query Performance

Monitor view performance:

```sql
-- Check execution plans for slow views
SET STATISTICS IO ON;
SELECT TOP 100 * FROM vw_QC_Equipment_to_EquipmentClass_FK;
SET STATISTICS IO OFF;

-- Query optimization by entity
SELECT 
    o.name AS ViewName,
    (SELECT COUNT(*) FROM sys.sql_dependencies WHERE object_id = o.object_id) AS DependencyCount
FROM sys.objects o
WHERE o.name LIKE 'vw_QC_%'
ORDER BY ViewName;
```

#### Materialized View Optimization

For high-volume checks, consider materialized views:

```sql
-- Create indexed view (materialized)
CREATE VIEW vw_QC_AllEnumerationViolations_Materialized WITH SCHEMABINDING AS
SELECT 
    'Equipment' AS EntityName,
    'equipmentLevel' AS FieldName,
    COUNT(*) AS ViolationCount
FROM dbo.Equipment
WHERE equipmentLevel NOT IN ('Enterprise', 'Site', 'Area', 'Work Center', 'Equipment')
GROUP BY 'Equipment', 'equipmentLevel'
UNION ALL
-- ... other violations ...
GO

-- Create clustered index to materialize
CREATE CLUSTERED INDEX idx_QC_Violations_Materialized 
ON vw_QC_AllEnumerationViolations_Materialized(EntityName, FieldName);
```

### 3. Backup and Recovery

#### Export Rules Configuration

```typescript
// Export current rules to JSON
const rulesBackup = {
  timestamp: new Date().toISOString(),
  version: "1.0",
  ruleCount: qualityRules.length,
  rules: qualityRules
};

const blob = new Blob([JSON.stringify(rulesBackup, null, 2)], { type: 'application/json' });
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `quality_rules_backup_${new Date().toISOString().split('T')[0]}.json`;
a.click();
```

#### Restore Rules Configuration

```typescript
// Import rules from JSON
const file = document.getElementById('file-input').files[0];
const text = await file.text();
const backup = JSON.parse(text);
setQualityRules(backup.rules);
```

---

## How to Use the Quality Check System

### Workflow: Complete Quality Check Process

#### Phase 1: Initialization

```
1. Open Quality Checks component
   ↓
2. System automatically:
   - Loads entities from /api/metadata/entities
   - Loads DTDL schemas from InbuiltEntitiesDTDL/
   - Displays entity statistics
```

#### Phase 2: Rule Generation & Review

```
1. Click "Auto-Generate All" button
   ↓
2. System generates rules:
   - Enumeration validation rules for all enum fields
   - Relationship validation rules for all relationships
   - Bridge table validation rules
   ↓
3. Rules appear in Rule Management tab
   ↓
4. Review rules by category:
   - Enumeration Validation (click tab)
   - Relationship Validation (click tab)
   - Reference Integrity (click tab)
   ↓
5. Toggle problematic rules off if needed
   ↓
6. View Relationship Matrix:
   - Click "Relationship Matrix" button
   - See all entity-to-entity connections
   - Identify unmapped relationships
```

#### Phase 3: SQL Generation & Deployment

```
1. Ensure desired rules are Active (checked)
   ↓
2. Click "Generate SQL Script" button
   ↓
3. SQL preview appears in dialog:
   - DROP statements for old views
   - CREATE VIEW statements for new rules
   - Summary views (vw_QC_AllViolations)
   ↓
4. Review SQL for correctness
   ↓
5. Click "Download" to save as .sql file
   ↓
6. Open SQL Server Management Studio
   ↓
7. Connect to target database
   ↓
8. Execute SQL script:
   - Open downloaded .sql file
   - Run entire script (Ctrl+A, F5)
   ↓
9. Views are created in database
```

#### Phase 4: Validation & Monitoring

```
1. Query views to find violations:
   
   -- All violations
   SELECT * FROM vw_QC_AllViolations
   ORDER BY Severity DESC, Category;
   
   ↓
   
2. Filter by severity:
   
   -- Critical errors
   SELECT * FROM vw_QC_AllViolations
   WHERE Severity = 'Error'
   ORDER BY EntityName;
   
   ↓
   
3. Analyze by entity:
   
   -- Equipment violations
   SELECT * FROM vw_QC_Equipment_equipmentLevel_Enum;
   SELECT * FROM vw_QC_Equipment_to_EquipmentClass_FK;
   
   ↓
   
4. View statistics:
   
   -- Violation counts
   SELECT EntityName, Category, COUNT(*) AS ViolationCount
   FROM vw_QC_AllViolations
   GROUP BY EntityName, Category
   ORDER BY ViolationCount DESC;
   
   ↓
   
5. Fix violations in source system
   ↓
   
6. Re-run views to verify fixes
```

### Use Case Examples

#### Use Case 1: Pre-Migration Data Validation

**Scenario**: Migrating Equipment data from legacy system

```
Step 1: Generate Quality Rules
- Click "Auto-Generate All"
- System creates Equipment enumeration & relationship rules

Step 2: Prepare SQL Script
- Select only Equipment-related rules
- Click "Generate SQL Script"
- Download SQL file

Step 3: Execute in Target Database
- Create views in data warehouse
- Run views against extracted Equipment data

Step 4: Analyze Violations
SELECT * FROM vw_QC_Equipment_equipmentLevel_Enum
WHERE equipmentLevel = 'INVALID_VALUE';

Step 5: Remediate
- Update invalid enum values in source
- Re-run views to confirm fixes
```

#### Use Case 2: Continuous Data Quality Monitoring

**Scenario**: Weekly quality checks on production data

```
Step 1: Set Up Scheduled SQL Job
- Create SQL Agent job to run daily at 2 AM
- Execute all vw_QC_* views

Step 2: Create Summary Report
SELECT 
    CAST(GETDATE() AS DATE) AS CheckDate,
    COUNT(*) AS TotalViolations,
    SUM(CASE WHEN Severity = 'Error' THEN 1 ELSE 0 END) AS ErrorCount,
    SUM(CASE WHEN Severity = 'Warning' THEN 1 ELSE 0 END) AS WarningCount
FROM vw_QC_AllViolations;

Step 3: Alert on Threshold
- If ErrorCount > 10, send alert email
- Include violation details in email

Step 4: Weekly Review
- Review trends in violation counts
- Investigate spikes in errors
- Update rules if needed
```

#### Use Case 3: Custom Business Rule

**Scenario**: Material lot quantity must not exceed material definition max quantity

```
Step 1: Create Custom Rule
- Click "Add Rule" button
- Fill in details:
  * Name: "Material Lot - Exceed Max Quantity"
  * Category: "Range Validation"
  * Severity: "Warning"
  * SQL Code:

CREATE VIEW vw_QC_MaterialLot_ExceedMaxQty AS
SELECT 
    ml.id,
    ml.materialDefinitionId,
    ml.quantity,
    md.maximumQuantity,
    'Lot quantity (' + CAST(ml.quantity AS VARCHAR) + 
    ') exceeds max (' + CAST(md.maximumQuantity AS VARCHAR) + ')' AS ValidationMessage
FROM MaterialLot ml
JOIN MaterialDefinition md ON ml.materialDefinitionId = md.id
WHERE ml.quantity > md.maximumQuantity;

Step 2: Save and Generate SQL
- Rule is added to list
- Generate SQL script includes this view
- Execute in database

Step 3: Monitor
- Run regularly to catch violations
- Fix underlying data issues
```

---

## Rule Types & Examples

### Type 1: Enumeration Validation

**Purpose**: Validate that constrained fields contain only allowed values

**When Used**: Every field with predefined options

**SQL Pattern**:
```sql
CREATE VIEW vw_QC_{Entity}_{Field}_Enum AS
SELECT 
    id,
    {field},
    'Invalid value: ' + CAST({field} AS VARCHAR) AS ValidationMessage
FROM {Entity}
WHERE {field} IS NOT NULL 
  AND {field} NOT IN ({allowedValues});
```

**Example Rule**: Equipment Level Validation
```typescript
{
  id: "enum_001",
  name: "Equipment - equipmentLevel Enumeration Validation",
  category: "Enumeration Validation",
  description: "Validates equipmentLevel is one of: Enterprise, Site, Area, Work Center, Equipment",
  sqlCode: `CREATE VIEW vw_QC_Equipment_equipmentLevel_Enum AS
SELECT 
    id,
    equipmentLevel,
    'Invalid equipmentLevel: ' + equipmentLevel AS ValidationMessage
FROM Equipment
WHERE equipmentLevel NOT IN ('Enterprise', 'Site', 'Area', 'Work Center', 'Equipment');`,
  severity: "Error",
  isActive: true,
  entityName: "Equipment",
  fieldName: "equipmentLevel"
}
```

**Query Results**:
```sql
SELECT * FROM vw_QC_Equipment_equipmentLevel_Enum;

-- Results:
-- id                | equipmentLevel  | ValidationMessage
-- EQ-001            | INVALID_LEVEL   | Invalid equipmentLevel: INVALID_LEVEL
-- EQ-002            | NULL            | [NULL not included]
```

### Type 2: Relationship Validation (Foreign Key)

**Purpose**: Ensure referenced entities exist

**When Used**: Every foreign key relationship

**SQL Pattern**:
```sql
CREATE VIEW vw_QC_{Source}_to_{Target}_FK AS
SELECT 
    s.id AS {Source}_Id,
    s.{targetId},
    'Referenced {Target} not found' AS ValidationMessage
FROM {Source} s
LEFT JOIN {Target} t ON s.{targetId} = t.id
WHERE s.{targetId} IS NOT NULL AND t.id IS NULL;
```

**Example Rule**: Material Lot References Material Definition
```typescript
{
  id: "rel_001",
  name: "Material Lot to Material Definition Relationship Validation",
  category: "Relationship Validation",
  description: "Validates that Material Lot references existing Material Definition",
  sqlCode: `CREATE VIEW vw_QC_MaterialLot_to_MaterialDefinition_FK AS
SELECT 
    ml.id AS MaterialLot_Id,
    ml.materialDefinitionId,
    'Referenced Material Definition not found' AS ValidationMessage
FROM MaterialLot ml
LEFT JOIN MaterialDefinition md ON ml.materialDefinitionId = md.id
WHERE ml.materialDefinitionId IS NOT NULL AND md.id IS NULL;`,
  severity: "Error",
  isActive: true,
  entityName: "MaterialLot"
}
```

### Type 3: Reference Integrity (Bridge Tables)

**Purpose**: Validate both sides of many-to-many relationships

**When Used**: Bridge/mapping tables

**SQL Pattern**:
```sql
CREATE VIEW vw_QC_{BridgeTable}_References AS
SELECT 
    b.id,
    b.sourceId,
    b.targetId,
    CASE 
        WHEN s.id IS NULL THEN 'Source entity not found'
        WHEN t.id IS NULL THEN 'Target entity not found'
    END AS ValidationMessage
FROM {BridgeTable} b
LEFT JOIN {SourceEntity} s ON b.sourceId = s.id
LEFT JOIN {TargetEntity} t ON b.targetId = t.id
WHERE s.id IS NULL OR t.id IS NULL;
```

**Example Rule**: Equipment to Class Bridge Table
```sql
CREATE VIEW vw_QC_EquipmentToClass_References AS
SELECT 
    ec.id,
    ec.equipmentId,
    ec.equipmentClassId,
    CASE 
        WHEN e.id IS NULL THEN 'Equipment ref not found'
        WHEN c.id IS NULL THEN 'EquipmentClass ref not found'
    END AS ValidationMessage
FROM EquipmentToEquipmentClassMapping ec
LEFT JOIN Equipment e ON ec.equipmentId = e.id
LEFT JOIN EquipmentClass c ON ec.equipmentClassId = c.id
WHERE e.id IS NULL OR c.id IS NULL;
```

### Type 4: Range Validation

**Purpose**: Validate numeric or date ranges

**When Used**: Numeric fields with business constraints

**SQL Pattern**:
```sql
CREATE VIEW vw_QC_{Entity}_{Field}_Range AS
SELECT 
    id,
    {field},
    'Invalid value. Expected: {minValue} to {maxValue}' AS ValidationMessage
FROM {Entity}
WHERE {field} < {minValue} OR {field} > {maxValue};
```

**Example Rule**: Material Lot Quantity Range
```sql
CREATE VIEW vw_QC_MaterialLot_quantity_Range AS
SELECT 
    id,
    quantity,
    'Quantity must be between 1 and 999999' AS ValidationMessage
FROM MaterialLot
WHERE quantity < 1 OR quantity > 999999 OR quantity IS NULL;
```

### Type 5: Custom Business Rules

**Purpose**: Validate complex business logic

**When Used**: Context-dependent rules

**Example**: Material lot cannot be created before its parent material definition

```sql
CREATE VIEW vw_QC_MaterialLot_CreatedAfterDefinition AS
SELECT 
    ml.id AS MaterialLot_Id,
    ml.materialDefinitionId,
    ml.createdAt AS LotCreatedDate,
    md.createdAt AS DefinitionCreatedDate,
    'Lot created before definition' AS ValidationMessage
FROM MaterialLot ml
JOIN MaterialDefinition md ON ml.materialDefinitionId = md.id
WHERE ml.createdAt < md.createdAt;
```

---

## SQL View Generation & Deployment

### Complete SQL Generation Process

#### Step 1: Single Rule SQL

Each rule generates a DELETE + CREATE statement:

```sql
IF OBJECT_ID('vw_QC_Equipment_equipmentLevel_Enum', 'V') IS NOT NULL 
  DROP VIEW vw_QC_Equipment_equipmentLevel_Enum;
GO

CREATE VIEW vw_QC_Equipment_equipmentLevel_Enum AS
SELECT 
    id,
    equipmentLevel,
    'Invalid equipmentLevel value' AS ValidationMessage
FROM Equipment
WHERE equipmentLevel NOT IN ('Enterprise', 'Site', 'Area', 'Work Center', 'Equipment');
GO
```

#### Step 2: Consolidated SQL Script

All active rules combined in dependency order:

```sql
-- ============================================
-- ISA-95 Data Quality Check Script
-- Generated: 2026-04-29T10:30:00Z
-- Total Rules: 147
-- ============================================

-- Drop all existing quality check views
IF OBJECT_ID('vw_QC_Equipment_equipmentLevel_Enum', 'V') IS NOT NULL 
  DROP VIEW vw_QC_Equipment_equipmentLevel_Enum;
GO

-- [... more DROP statements ...]

-- Create all validation views
CREATE VIEW vw_QC_Equipment_equipmentLevel_Enum AS
SELECT 
    id,
    equipmentLevel,
    'Invalid equipmentLevel' AS ValidationMessage
FROM Equipment
WHERE equipmentLevel NOT IN ('Enterprise', 'Site', 'Area', 'Work Center', 'Equipment');
GO

-- [... more CREATE VIEW statements ...]

-- ============================================
-- Summary View: All Quality Check Violations
-- ============================================

IF OBJECT_ID('vw_QC_AllViolations', 'V') IS NOT NULL 
  DROP VIEW vw_QC_AllViolations;
GO

CREATE VIEW vw_QC_AllViolations AS
SELECT 
    'enum_001' AS RuleId,
    'Equipment - equipmentLevel Enumeration' AS RuleName,
    'Enumeration Validation' AS Category,
    'Error' AS Severity,
    'Equipment' AS EntityName,
    equipment_Id,
    ValidationMessage
FROM vw_QC_Equipment_equipmentLevel_Enum
UNION ALL
SELECT 
    'rel_001' AS RuleId,
    'Material Lot to Material Definition' AS RuleName,
    'Relationship Validation' AS Category,
    'Error' AS Severity,
    'MaterialLot' AS EntityName,
    MaterialLot_Id,
    ValidationMessage
FROM vw_QC_MaterialLot_to_MaterialDefinition_FK
-- [... more UNION ALL statements ...]
GO
```

#### Step 3: Deployment to Database

1. **Generate Script** (in UI):
   - Click "Generate SQL Script" button
   - Click "Download" to save file

2. **Review Script**:
   - Check view names are correct
   - Verify entity table names exist in database
   - Check for any syntax errors

3. **Execute Script**:

```powershell
# PowerShell: Execute SQL script
$sqlFilePath = "C:\path\to\ISA95_Quality_Checks_2026-04-29.sql"
$serverInstance = "MY-SERVER\SQLSERVER"
$database = "ISA95DataLake"

sqlcmd -S $serverInstance -d $database -i $sqlFilePath -o quality_check_execution.log

# Check results
type quality_check_execution.log
```

OR in SQL Server Management Studio:

```sql
-- Open .sql file in SSMS
-- Connect to target database
-- Press F5 to execute entire script
-- Views are now created and ready for querying
```

### Viewing Query Results

#### Summary of All Violations

```sql
-- All violations across all rules
SELECT * FROM vw_QC_AllViolations
ORDER BY Severity DESC, EntityName, RuleName;

-- Results show:
-- RuleId | RuleName | Category | Severity | EntityName | EntityId | ValidationMessage
-- enum_001 | Equipment - equipmentLevel | Enumeration Validation | Error | Equipment | EQ-001 | Invalid equipmentLevel: INVALID_LEVEL
```

#### Filter by Severity

```sql
-- Critical errors only
SELECT * FROM vw_QC_AllViolations
WHERE Severity = 'Error'
ORDER BY EntityName;

-- Warnings and info
SELECT * FROM vw_QC_AllViolations
WHERE Severity IN ('Warning', 'Info')
ORDER BY EntityName;
```

#### Aggregated Statistics

```sql
-- Violation counts by entity
SELECT 
    EntityName,
    COUNT(*) AS TotalViolations,
    SUM(CASE WHEN Severity = 'Error' THEN 1 ELSE 0 END) AS Errors,
    SUM(CASE WHEN Severity = 'Warning' THEN 1 ELSE 0 END) AS Warnings
FROM vw_QC_AllViolations
GROUP BY EntityName
ORDER BY TotalViolations DESC;
```

---

## Troubleshooting & Best Practices

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "API endpoint not found" | DTDL files not in InbuiltEntitiesDTDL | Copy JSON files to folder; refresh page |
| "View name not found" | View hasn't been created in database | Execute SQL script to create views |
| "Invalid enum values" | DTDL definitions out of sync | Regenerate rules from latest DTDL |
| "NULL values in query" | Views don't exclude NULLs | Add `WHERE field IS NOT NULL` to SQL |
| "No violations found" | Data is clean | Check view executes without errors |
| "Slow view performance" | Large tables without indexes | Add indexes on FK columns |

### Best Practices

#### 1. Rule Management

✓ **DO**:
- Generate rules from latest DTDL schemas
- Keep enumeration values in sync with DTDL
- Test rules in non-production first
- Document custom business rules
- Review rules quarterly

✗ **DON'T**:
- Manually edit generated rule SQL
- Create duplicate rules for same constraint
- Leave obsolete rules active
- Ignore WARNING severity rules
- Deploy untested SQL to production

#### 2. Performance

✓ **DO**:
- Add indexes on frequently queried columns
- Run views in off-peak hours for first deployments
- Use materialized views for high-volume checks
- Archive old violations for reporting
- Monitor view execution time

✗ **DON'T**:
- Query large views without WHERE clause
- Run all rules simultaneously on production database
- Query vw_QC_AllViolations repeatedly in loops
- Forget to drop old views before creating new ones

#### 3. Data Quality

✓ **DO**:
- Fix violations found by quality checks
- Set ERROR severity for must-fix violations
- Document why violations exist (if expected)
- Trend violation metrics over time
- Escalate ERROR severity violations promptly

✗ **DON'T**:
- Ignore ERROR severity violations
- Assume violations are only in new data
- Skip validation before migrations
- Create overly complex rules
- Hard-code entity names in custom rules (use parameters)

#### 4. Maintenance

✓ **DO**:
- Back up rule configurations
- Version control DTDL definitions
- Test rule changes before deployment
- Keep SQL view naming consistent
- Document when rules are updated

✗ **DON'T**:
- Manually delete views (use rule deactivation)
- Modify rule SQL without testing
- Forget to update documentation
- Deploy multiple rule versions simultaneously
- Leave debugging SQL in production

---

## API Integration

### Required API Endpoints

#### 1. Entity Metadata Endpoint

**URL**: `GET /api/metadata/entities`

**Response**:
```json
[
  {
    "name": "Equipment",
    "description": "Equipment entity",
    "attributes": [
      {
        "name": "equipmentLevel",
        "enumValues": ["Enterprise", "Site", "Area", "Work Center", "Equipment"]
      }
    ],
    "relationships": [
      {
        "name": "belongsTo",
        "targetEntityName": "EquipmentClass",
        "cardinality": "ManyToOne"
      }
    ]
  }
]
```

#### 2. DTDL Files Endpoint

**Location**: `/InbuiltEntitiesDTDL/`

**Files Loaded**:
- `Equipment.json`
- `MaterialLot.json`
- `OperationsSegment.json`
- `PersonnelActual.json`
- `PhysicalAsset.json`
- [70+ more entity definitions]

**File Format**:
```json
{
  "name": "Equipment",
  "displayName": "Equipment",
  "contents": [
    {
      "@type": "Property",
      "name": "equipmentLevel",
      "schema": {
        "@type": "Enum",
        "enumValues": [
          { "enumValue": "Enterprise", "name": "Enterprise" },
          { "enumValue": "Site", "name": "Site" }
        ]
      }
    }
  ]
}
```

### Integration Example

```typescript
// Load entities and DTDL for quality check generation
export async function loadQualityCheckData() {
  try {
    // Load entity definitions
    const entityResponse = await fetch('/api/metadata/entities');
    const entities = await entityResponse.json();
    
    // Load DTDL schemas
    const dtdlFiles = [
      'Equipment.json', 'MaterialLot.json', 'OperationsSegment.json'
      // ... more files
    ];
    
    const dtdlSchemas = await Promise.all(
      dtdlFiles.map(file => 
        fetch(`/InbuiltEntitiesDTDL/${file}`).then(r => r.json())
      )
    );
    
    // Generate quality check rules
    const rules = generateQualityCheckRules(entities);
    const dtdlRules = generateQualityCheckRulesFromDTDL(dtdlSchemas);
    
    return { entities, dtdlSchemas, rules: [...rules, ...dtdlRules] };
  } catch (error) {
    console.error('Error loading quality check data:', error);
    throw error;
  }
}
```

---

## Performance Optimization

### Query Optimization Techniques

#### 1. Index Strategy

```sql
-- For frequently queried columns
CREATE INDEX idx_Equipment_equipmentLevel ON Equipment(equipmentLevel)
WHERE equipmentLevel IS NOT NULL;

-- For foreign keys
CREATE INDEX idx_MaterialLot_materialDefinitionId 
ON MaterialLot(materialDefinitionId);

-- For composite queries
CREATE INDEX idx_MaterialLot_CreatedAtDefId 
ON MaterialLot(materialDefinitionId, createdAt);
```

#### 2. View Performance Monitoring

```sql
-- Check view creation time
SET STATISTICS TIME ON;
SELECT * FROM vw_QC_AllViolations WHERE Severity = 'Error';
SET STATISTICS TIME OFF;

-- Results show:
-- SQL Server parse and compile time: 123 ms
-- SQL Server Execution Times: CPU = 456 ms, elapsed = 500 ms
```

#### 3. Materialized View Caching

For expensive summary views, create indexed versions:

```sql
-- Create materialized view with clustered index
CREATE VIEW vw_QC_ViolationStats_Materialized WITH SCHEMABINDING AS
SELECT 
    EntityName,
    Severity,
    COUNT(*) AS ViolationCount
FROM dbo.vw_QC_AllViolations
GROUP BY EntityName, Severity;
GO

CREATE CLUSTERED INDEX idx_Stats ON vw_QC_ViolationStats_Materialized(EntityName, Severity);
GO
```

### Scaling Recommendations

| Scale | Approach | Tools |
|-------|----------|-------|
| **Small** (<100K records) | Run all views live | Native SQL views |
| **Medium** (100K-1M) | Scheduled view refresh | SQL Agent jobs |
| **Large** (1M+) | Materialized summary | Indexed views, partitions |
| **Enterprise** (10M+) | Distributed validation | Azure Synapse, Spark |

#### Batch Violation Processing

```sql
-- Process violations in batches
DECLARE @BatchSize INT = 1000;
DECLARE @BatchNumber INT = 1;

WHILE @BatchNumber <= (SELECT MAX(BatchNum) FROM (
  SELECT ROW_NUMBER() OVER (ORDER BY id) / @BatchSize + 1 AS BatchNum 
  FROM vw_QC_AllViolations
) AS Batches)
BEGIN
  INSERT INTO ViolationLog
  SELECT * FROM vw_QC_AllViolations
  WHERE ROW_NUMBER() OVER (ORDER BY id) / @BatchSize + 1 = @BatchNumber;
  
  SET @BatchNumber = @BatchNumber + 1;
END
```

---

## Summary

The **Data Quality Check System** provides a comprehensive, scalable foundation for validating ISA-95 entities:

- **Automated generation** from DTDL schemas
- **Flexible rule configuration** for custom business logic
- **Production-ready SQL** views for deployment
- **Comprehensive monitoring** capabilities
- **Best-practice patterns** for maintenance

By following this documentation, teams can implement enterprise-grade data quality validation, ensuring data integrity throughout the ISA-95 data ecosystem.

---

## Appendix: Quick Reference

### Common Commands

```typescript
// Generate all rules
const rules = generateQualityCheckRules(entities);

// Generate from DTDL
const dtdlRules = generateQualityCheckRulesFromDTDL(dtdlSchemas);

// Create SQL script
const sql = generateConsolidatedSQLScript(rules);

// Download SQL
const blob = new Blob([sql], { type: 'text/plain' });
const url = window.URL.createObjectURL(blob);
// ... trigger download
```

### SQL Query Templates

```sql
-- All violations
SELECT * FROM vw_QC_AllViolations;

-- By entity
SELECT * FROM vw_QC_AllViolations WHERE EntityName = 'Equipment';

-- Critical only
SELECT * FROM vw_QC_AllViolations WHERE Severity = 'Error';

-- Statistics
SELECT EntityName, COUNT(*) AS Count
FROM vw_QC_AllViolations
GROUP BY EntityName;
```

### File Locations

- **Service**: `frontend/src/services/qualityCheckService.ts`
- **Component**: `frontend/src/components/QualityChecks.tsx`
- **DTDL Files**: `InbuiltEntitiesDTDL/*.json`
- **Generated SQL**: Download from UI (e.g., `ISA95_Quality_Checks_2026-04-29.sql`)

