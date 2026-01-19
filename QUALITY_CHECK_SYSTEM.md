# ISA-95 Data Quality Check System

## Overview

The Quality Check System provides comprehensive data validation for ISA-95 entities, including:
- **Enumeration Validation**: Ensures fields contain only valid enum values
- **Relationship Validation**: Verifies entity-to-entity relationships and bridge table integrity
- **Reference Integrity**: Validates foreign key references
- **Range Validation**: Checks numeric ranges and date logic
- **Custom Rules**: User-defined validation logic

## Features

### 1. Auto-Generated Rules from DTDL Schemas

The system automatically generates validation rules by analyzing ISA-95 entity DTDL schemas:

**Enumeration Rules**:
- Extracts all fields with enumeration constraints
- Generates SQL views to detect invalid enum values
- Example: `equipmentLevel` must be one of: Enterprise, Site, Area, Work Center, etc.

**Relationship Rules**:
- Identifies all relationships defined in DTDL
- Creates validation views for bridge tables and foreign keys
- Validates both source and target entity references

### 2. Relationship Matrix

The system builds a comprehensive matrix showing all possible entity relationships:

```
Source Entity → Target Entities
Equipment → Equipment Class, Hierarchy Scope, Operational Location
Material Actual → Material Definition, Material Lot, Material Class
Process Segment → Operations Definition, Equipment, Material
```

**Usage**:
- Click "Relationship Matrix" button to view all possible relationships
- Use for mapping validation and data modeling
- Helps understand entity dependencies

### 3. SQL View Generation

Generates production-ready SQL Server views for data quality monitoring:

```sql
-- Enumeration Validation Example
CREATE VIEW vw_QC_Equipment_equipmentLevel_Enum AS
SELECT 
    id AS Equipment_Id,
    equipmentLevel,
    'Invalid equipmentLevel value...' AS ValidationMessage
FROM Equipment
WHERE equipmentLevel NOT IN ('Enterprise', 'Site', 'Area'...);

-- Relationship Validation Example
CREATE VIEW vw_QC_Material_Actual_to_Material_Lot AS
SELECT 
    b.PrimaryKey AS BridgeRecordId,
    b.[Source PrimaryKey],
    b.[Target PrimaryKey],
    CASE 
        WHEN ma.id IS NULL THEN 'Source not found'
        WHEN ml.id IS NULL THEN 'Target not found'
    END AS ValidationMessage
FROM Material_Actual_to_Material_Lot_mapping b
LEFT JOIN Material_Actual ma ON b.[Source PrimaryKey] = ma.PrimaryKey
LEFT JOIN Material_Lot ml ON b.[Target PrimaryKey] = ml.PrimaryKey
WHERE ma.id IS NULL OR ml.id IS NULL;
```

### 4. Consolidated Summary View

A master view combining all quality check results:

```sql
CREATE VIEW vw_QC_AllViolations AS
SELECT 
    RuleId,
    RuleName,
    Category,
    Severity,
    EntityName,
    *
FROM vw_QC_Equipment_equipmentLevel_Enum
UNION ALL
SELECT * FROM vw_QC_Material_Actual_to_Material_Lot
...
```

## Usage Guide

### Step 1: Load Entities

The system automatically loads entity definitions from the API:
```
GET /api/metadata/entities
```

### Step 2: Auto-Generate Rules

1. Click **"Auto-Generate Rules"** button
2. System analyzes DTDL schemas
3. Creates enumeration and relationship validation rules
4. Rules are added to the quality check list

### Step 3: Review and Customize Rules

- Browse rules by category (tabs)
- Toggle rules on/off with checkboxes
- Edit SQL code for custom logic
- Add custom validation rules

### Step 4: Generate SQL Script

1. Click **"Generate SQL Script"**
2. Review generated SQL
3. Click **"Download"** to save as `.sql` file
4. Execute in SQL Server database

### Step 5: Monitor Quality

Query the views to find data quality issues:

```sql
-- View all violations
SELECT * FROM vw_QC_AllViolations
WHERE Severity = 'Error'
ORDER BY Category, EntityName;

-- View specific rule violations
SELECT * FROM vw_QC_Equipment_equipmentLevel_Enum;

-- Count violations by category
SELECT 
    Category,
    Severity,
    COUNT(*) as ViolationCount
FROM vw_QC_AllViolations
GROUP BY Category, Severity;
```

## Quality Check Categories

### 1. Enumeration Validation

Validates fields against allowed enum values defined in DTDL schemas.

**Auto-Generated For**:
- All fields with `enumValues` in DTDL
- Example fields: `equipmentLevel`, `materialUse`, `operationalLocationType`

**SQL Pattern**:
```sql
WHERE fieldName NOT IN ('AllowedValue1', 'AllowedValue2', ...)
```

### 2. Relationship Validation

Ensures entity relationships are correctly established.

**Bridge Table Validation**:
- Verifies source entity exists
- Verifies target entity exists
- Checks bridge record integrity

**Direct Relationship Validation**:
- Validates foreign key references
- Checks parent-child relationships
- Detects circular references

### 3. Reference Integrity

Validates that referenced entities exist.

**Examples**:
- Material Actual → Material Definition
- Equipment Actual → Equipment
- Material Sublot → Material Lot

### 4. Range Validation

Checks numeric ranges and date logic.

**Examples**:
- Quantities > 0
- End date >= Start date
- Response dates within request dates

### 5. Custom Rules

User-defined validation logic for business-specific requirements.

## Mapping File Validation

The system can validate mapping files against the relationship matrix:

```typescript
import { validateMappingFile, generateRelationshipMatrix } from './qualityCheckService';

const mappings = [
  { sourceEntity: 'Equipment', targetEntity: 'Equipment Class', relationshipName: 'correspondsTo' },
  { sourceEntity: 'Material Actual', targetEntity: 'Material Lot', relationshipName: 'isAssociatedWith' }
];

const matrix = generateRelationshipMatrix(entities);
const validationResults = validateMappingFile(mappings, matrix);

validationResults.forEach(result => {
  console.log(`${result.mapping.sourceEntity} → ${result.mapping.targetEntity}: ${result.isValid ? 'VALID' : 'INVALID'}`);
  if (!result.isValid) {
    console.log(`  Error: ${result.message}`);
  }
});
```

## API Integration

### Entity Metadata Endpoint

The system expects an API endpoint providing entity metadata:

```json
GET /api/metadata/entities

Response:
[
  {
    "name": "Equipment",
    "displayName": "Equipment",
    "attributes": [
      {
        "name": "equipmentLevel",
        "schema": "string",
        "enumValues": ["Enterprise", "Site", "Area", "Work Center", "Work Unit"]
      }
    ],
    "relationships": [
      {
        "name": "correspondsToEquipmentClass",
        "targetEntityName": "Equipment Class",
        "cardinality": "ManyToMany"
      }
    ]
  }
]
```

### Required Entity Fields

Each entity must include:
- `name`: Entity name
- `attributes`: Array of field definitions
  - `name`: Field name
  - `enumValues` (optional): Array of allowed values
- `relationships`: Array of relationship definitions
  - `name`: Relationship name
  - `targetEntityName`: Target entity name
  - `cardinality`: OneToOne, OneToMany, ManyToMany

## Service Functions

### `extractEntityRelationships(entities)`

Extracts all relationships from entity definitions.

**Returns**: Array of `EntityRelationship` objects

### `extractEnumerationFields(entities)`

Extracts all fields with enumeration constraints.

**Returns**: Array of `EnumerationField` objects

### `generateEnumerationValidationSQL(enumField)`

Generates SQL view for enumeration validation.

**Returns**: SQL CREATE VIEW statement

### `generateRelationshipValidationSQL(relationship)`

Generates SQL view for relationship validation.

**Returns**: SQL CREATE VIEW statement

### `generateQualityCheckRules(entities)`

Generates complete set of quality check rules.

**Returns**: Array of `QualityCheckRule` objects

### `generateConsolidatedSQLScript(rules)`

Generates full SQL script with all views and summary view.

**Returns**: Complete SQL script as string

### `generateRelationshipMatrix(entities)`

Creates a matrix of possible entity relationships.

**Returns**: Record<string, string[]> - source entity → target entities

### `validateMappingFile(mappings, relationshipMatrix)`

Validates mapping file against relationship matrix.

**Returns**: Array of validation results with isValid and message

## Best Practices

### 1. Regular Quality Monitoring

- Schedule automated quality check execution
- Review violations daily
- Track trends over time

### 2. Rule Management

- Keep enumeration rules synchronized with DTDL
- Update relationship rules when schema changes
- Document custom business rules

### 3. SQL View Maintenance

- Recreate views after schema changes
- Index referenced columns for performance
- Consider materialized views for large datasets

### 4. Severity Levels

- **Error**: Data that violates core ISA-95 standards
- **Warning**: Potential issues or inconsistencies
- **Info**: Recommendations for data quality improvement

### 5. Performance Optimization

For large datasets:
- Add indexes on foreign key columns
- Use filtered indexes for specific rules
- Consider partitioning large tables
- Run quality checks during off-peak hours

## Integration with Data Migration

The quality check system integrates with the Data Migration component:

1. **Pre-Migration Validation**:
   - Verify source data quality before migration
   - Identify issues early in the process

2. **Post-Migration Validation**:
   - Run quality checks on migrated data
   - Ensure mapping rules preserved data integrity

3. **Continuous Monitoring**:
   - Schedule regular quality check execution
   - Alert on new violations

## Troubleshooting

### Issue: Auto-Generate Rules Button Disabled

**Solution**: 
- Ensure API endpoint `/api/metadata/entities` is accessible
- Verify entities are loading correctly
- Check browser console for errors

### Issue: SQL Views Failing to Create

**Solution**:
- Verify table names match entity names
- Check SQL Server permissions
- Ensure no conflicting view names

### Issue: Too Many False Positives

**Solution**:
- Review and refine enumeration values
- Adjust rule severity levels
- Add business-specific filters to SQL

## Future Enhancements

- Real-time quality monitoring dashboard
- Automated remediation suggestions
- Machine learning-based anomaly detection
- Integration with data lineage tracking
- Quality score calculation
- Historical trend analysis
- Email alerts for critical violations

## Support

For questions or issues:
1. Check the relationship matrix for valid entity connections
2. Review the generated SQL views
3. Verify entity metadata is loading correctly
4. Consult ISA-95 Part 2 specifications for standard requirements
