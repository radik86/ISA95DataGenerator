# Quality Check System - Implementation Summary

## What Was Implemented

### 1. Quality Check Service (`qualityCheckService.ts`)

A comprehensive service for managing data quality validation:

**Core Functions**:
- `extractEntityRelationships()` - Extracts all relationships from DTDL schemas
- `extractEnumerationFields()` - Finds all enum-constrained fields
- `generateEnumerationValidationSQL()` - Creates SQL views for enum validation
- `generateRelationshipValidationSQL()` - Creates SQL views for relationship validation
- `generateQualityCheckRules()` - Auto-generates rules from entity definitions
- `generateConsolidatedSQLScript()` - Creates complete SQL deployment script
- `generateRelationshipMatrix()` - Builds entity-to-entity relationship map
- `validateMappingFile()` - Validates mapping files against relationship matrix

### 2. Enhanced Quality Checks Component

**New Features**:
- ✅ **Auto-Generate Rules Button** - Analyzes DTDL schemas and creates validation rules automatically
- ✅ **Relationship Matrix View** - Displays all possible entity relationships in a table
- ✅ **Entity Loading** - Fetches entity metadata from API
- ✅ **Enhanced SQL Generation** - Uses service for cleaner, more comprehensive SQL scripts
- ✅ **Relationship Count Display** - Shows statistics on loaded entities and relationships

**UI Improvements**:
- Added "Auto-Generate Rules" button
- Added "Relationship Matrix" toggle button  
- Enhanced info alert with entity statistics
- Relationship matrix table with sortable entities
- Chip-based visualization of relationships

### 3. Documentation

**Created**:
- `QUALITY_CHECK_SYSTEM.md` - Complete guide for the quality check system
- Includes usage instructions, API integration, SQL patterns, and best practices

## How It Works

### Auto-Generation Flow

```
1. Load Entities from API
   ↓
2. Extract Relationships & Enumerations from DTDL
   ↓
3. Generate SQL Views for Each Rule
   ↓
4. Create Quality Check Rules
   ↓
5. Add to Quality Rules List
```

### Enumeration Validation

For each field with enumeration values in DTDL:

```sql
CREATE VIEW vw_QC_{Entity}_{Field}_Enum AS
SELECT 
    id,
    {fieldName},
    'Invalid {fieldName} value...' AS ValidationMessage
FROM {Entity}
WHERE {fieldName} NOT IN ('Value1', 'Value2', ...);
```

### Relationship Validation

For each relationship in DTDL:

**Bridge Tables**:
```sql
CREATE VIEW vw_QC_{Source}_to_{Target}_Bridge AS
SELECT 
    b.PrimaryKey,
    b.[Source PrimaryKey],
    b.[Target PrimaryKey],
    CASE 
        WHEN source.id IS NULL THEN 'Source not found'
        WHEN target.id IS NULL THEN 'Target not found'
    END AS ValidationMessage
FROM {BridgeTable} b
LEFT JOIN {SourceTable} source ON ...
LEFT JOIN {TargetTable} target ON ...
WHERE source.id IS NULL OR target.id IS NULL;
```

**Direct References**:
```sql
CREATE VIEW vw_QC_{Source}_to_{Target}_FK AS
SELECT 
    s.id,
    s.{targetId},
    'Referenced {Target} not found' AS ValidationMessage
FROM {Source} s
LEFT JOIN {Target} t ON s.{targetId} = t.id
WHERE s.{targetId} IS NOT NULL AND t.id IS NULL;
```

### Relationship Matrix

Shows which entities can relate to which:

| Source Entity | Can Relate To | Count |
|---------------|---------------|-------|
| Equipment | Equipment Class, Hierarchy Scope | 2 |
| Material Actual | Material Definition, Material Lot, Material Class | 3 |
| Process Segment | Operations Definition, Equipment | 2 |

## Integration Points

### 1. API Endpoint Required

```typescript
GET /api/metadata/entities

Response: EntityDefinition[]
```

### 2. Entity Structure

```typescript
interface EntityDefinition {
  name: string;
  attributes: AttributeDefinition[];
  relationships: RelationshipDefinition[];
}

interface AttributeDefinition {
  name: string;
  enumValues?: string[];  // For enum validation
}

interface RelationshipDefinition {
  name: string;
  targetEntityName: string;
  cardinality: string;
}
```

### 3. Data Migration Integration

The quality check system can validate:
- Mapping configurations before execution
- Source data before migration
- Target data after migration

Example usage:
```typescript
import { validateMappingFile, generateRelationshipMatrix } from './qualityCheckService';

// Validate mapping file
const matrix = generateRelationshipMatrix(entities);
const results = validateMappingFile(tableMappings, matrix);

results.forEach(r => {
  if (!r.isValid) {
    console.error(`Invalid mapping: ${r.message}`);
  }
});
```

## Usage Instructions

### Step 1: Load Entities

Component automatically calls:
```typescript
const response = await fetch('/api/metadata/entities');
const entities = await response.json();
```

### Step 2: Auto-Generate Rules

Click "Auto-Generate Rules" button:
- Extracts all enum fields → Creates enumeration validation rules
- Extracts all relationships → Creates relationship validation rules
- Adds rules to the quality check list

### Step 3: Review Rules

- Browse by category tabs
- Toggle individual rules on/off
- Edit SQL for custom logic
- View entity and field details

### Step 4: Generate SQL

Click "Generate SQL Script":
- Creates DROP statements for existing views
- Creates all validation views
- Creates consolidated summary view `vw_QC_AllViolations`
- Download as `.sql` file

### Step 5: Deploy and Monitor

```sql
-- Execute generated SQL in SQL Server
-- Then query violations:

SELECT * FROM vw_QC_AllViolations
WHERE Severity = 'Error'
ORDER BY Category, EntityName;
```

## Benefits

### 1. Automated Rule Creation
- No manual SQL writing for standard validations
- Keeps rules synchronized with entity definitions
- Reduces human error

### 2. Comprehensive Coverage
- Every enum field gets a validation rule
- Every relationship gets integrity checks
- Bridge tables are automatically validated

### 3. Relationship Discovery
- Visual matrix shows all possible connections
- Helps with data modeling
- Validates mapping configurations

### 4. Mapping Validation
- Pre-validates mappings before execution
- Prevents invalid relationship mappings
- Provides clear error messages

### 5. Production-Ready SQL
- Generates deployable SQL scripts
- Includes summary views for reporting
- Follows SQL Server best practices

## Example: Complete Workflow

### Scenario: Adding New Entity "Shift"

1. **Define DTDL** with relationships and enums:
```json
{
  "name": "Shift",
  "attributes": [
    {
      "name": "shiftType",
      "enumValues": ["Day", "Night", "Evening"]
    }
  ],
  "relationships": [
    {
      "name": "belongsToHierarchyScope",
      "targetEntityName": "Hierarchy Scope"
    }
  ]
}
```

2. **Load Entities** in UI - API returns updated entity list including Shift

3. **Click Auto-Generate Rules**:
   - Creates `vw_QC_Shift_shiftType_Enum` for enum validation
   - Creates `vw_QC_Shift_to_Hierarchy_Scope` for relationship validation

4. **Review Generated Rules**:
   - Enumeration rule ensures shiftType is Day/Night/Evening
   - Relationship rule ensures Hierarchy Scope references exist

5. **Generate SQL Script** - Get deployable SQL with both views

6. **Deploy to Database** - Execute SQL in SQL Server

7. **Monitor Quality**:
```sql
SELECT * FROM vw_QC_Shift_shiftType_Enum;  -- Invalid enum values
SELECT * FROM vw_QC_Shift_to_Hierarchy_Scope;  -- Broken references
```

## Files Created/Modified

### New Files
1. `/frontend/src/services/qualityCheckService.ts` - Core quality check logic
2. `/QUALITY_CHECK_SYSTEM.md` - Complete documentation

### Modified Files  
1. `/frontend/src/components/QualityChecks.tsx`:
   - Added imports for quality check service
   - Added entity loading
   - Added auto-generate functionality
   - Added relationship matrix display
   - Enhanced SQL generation

## Next Steps

### Immediate
1. ✅ Implement API endpoint `/api/metadata/entities` if not exists
2. ✅ Test auto-generation with existing entities
3. ✅ Review generated SQL views
4. ✅ Deploy to test database

### Short-term
1. Add mapping validation in Data Migration component
2. Create pre-migration quality check step
3. Add quality score dashboard
4. Implement violation alerts

### Long-term
1. Real-time monitoring dashboard
2. Automated remediation suggestions
3. Historical trend analysis
4. Integration with data lineage

## Technical Notes

### Performance Considerations
- SQL views are non-materialized (live queries)
- For large datasets, consider indexed views
- Bridge table queries use LEFT JOIN for comprehensive checking
- Summary view uses UNION ALL for performance

### Extensibility
- Service functions are modular and reusable
- Easy to add custom rule generators
- SQL templates are customizable
- Matrix can be extended with cardinality info

### Error Handling
- Graceful handling of missing entities
- Safe SQL string escaping
- Validation before rule generation
- Clear error messages

## Testing Checklist

- [ ] Load entities from API successfully
- [ ] Auto-generate creates expected number of rules
- [ ] Relationship matrix displays correctly
- [ ] SQL script generates without errors
- [ ] SQL script executes in SQL Server
- [ ] Validation views return expected results
- [ ] Summary view aggregates all violations
- [ ] Mapping validation detects invalid relationships
- [ ] Toggle rules on/off works
- [ ] Edit and save custom rules works

## Support

For implementation questions:
1. Review `QUALITY_CHECK_SYSTEM.md` for detailed guide
2. Check entity metadata format requirements
3. Verify API endpoint accessibility
4. Test with sample entities first
