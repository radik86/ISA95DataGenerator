import { EntityDefinition } from '../types';

export interface EntityRelationship {
  sourceEntity: string;
  targetEntity: string;
  relationshipName: string;
  cardinality: string;
  isRequired: boolean;
}

export interface EnumerationField {
  entityName: string;
  fieldName: string;
  allowedValues: string[];
}

export interface QualityCheckRule {
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

/**
 * Extracts all relationships from entity definitions
 */
export function extractEntityRelationships(entities: EntityDefinition[]): EntityRelationship[] {
  const relationships: EntityRelationship[] = [];

  entities.forEach(entity => {
    entity.relationships?.forEach(rel => {
      const targetName = rel.targetEntityName || rel.TargetEntityName;
      if (targetName) {
        relationships.push({
          sourceEntity: entity.name,
          targetEntity: targetName,
          relationshipName: rel.name,
          cardinality: typeof rel.cardinality === 'string' ? rel.cardinality : 'OneToMany',
          isRequired: false // Could be enhanced to check if relationship is mandatory
        });
      }
    });
  });

  return relationships;
}

/**
 * Extracts all enumeration fields from entity definitions
 */
export function extractEnumerationFields(entities: EntityDefinition[]): EnumerationField[] {
  const enumerations: EnumerationField[] = [];

  entities.forEach(entity => {
    entity.attributes?.forEach(attr => {
      if (attr.enumValues && attr.enumValues.length > 0) {
        enumerations.push({
          entityName: entity.name,
          fieldName: attr.name,
          allowedValues: attr.enumValues
        });
      }
    });
  });

  return enumerations;
}

/**
 * Extracts enumeration fields from DTDL schema contents
 */
export function extractEnumerationsFromDTDL(dtdlSchemas: any[]): EnumerationField[] {
  const enumerations: EnumerationField[] = [];

  dtdlSchemas.forEach(schema => {
    const entityName = schema.displayName || schema.name;
    
    if (schema.contents) {
      schema.contents.forEach((content: any) => {
        // Check for Property with Enum schema
        if (content['@type'] === 'Property' && content.schema && typeof content.schema === 'object') {
          if (content.schema['@type'] === 'Enum' && content.schema.enumValues) {
            const values = content.schema.enumValues.map((ev: any) => ev.enumValue || ev.name);
            enumerations.push({
              entityName: entityName,
              fieldName: content.name,
              allowedValues: values
            });
          }
        }
        
        // Check for nested contents (like in Component)
        if (content.contents) {
          content.contents.forEach((nested: any) => {
            if (nested['@type'] === 'Property' && nested.schema && typeof nested.schema === 'object') {
              if (nested.schema['@type'] === 'Enum' && nested.schema.enumValues) {
                const values = nested.schema.enumValues.map((ev: any) => ev.enumValue || ev.name);
                enumerations.push({
                  entityName: entityName,
                  fieldName: nested.name,
                  allowedValues: values
                });
              }
            }
          });
        }
      });
    }
    
    // Also check columns array (for non-DTDL format)
    if (schema.columns) {
      schema.columns.forEach((column: any) => {
        if (column.enumValues && column.enumValues.length > 0) {
          // Ensure all values are strings
          const values = column.enumValues.map((v: any) => 
            typeof v === 'string' ? v : (v?.enumValue || v?.name || String(v))
          );
          enumerations.push({
            entityName: entityName,
            fieldName: column.name,
            allowedValues: values
          });
        }
      });
    }
  });

  return enumerations;
}

/**
 * Generates enumeration validation SQL view for a field
 */
export function generateEnumerationValidationSQL(enumField: EnumerationField): string {
  const tableName = enumField.entityName.replace(/\s+/g, '_');
  const fieldName = enumField.fieldName;
  const viewName = `vw_QC_${tableName}_${fieldName}_Enum`;
  
  const valuesList = enumField.allowedValues.map(v => `'${v.replace(/'/g, "''")}'`).join(', ');
  
  return `CREATE VIEW ${viewName} AS
SELECT 
    id AS ${tableName}_Id,
    ${fieldName},
    'Invalid ${fieldName} value. Must be one of: ${enumField.allowedValues.join(', ')}' AS ValidationMessage
FROM ${tableName}
WHERE ${fieldName} IS NOT NULL 
  AND ${fieldName} NOT IN (${valuesList});`;
}

/**
 * Generates relationship validation SQL view
 */
export function generateRelationshipValidationSQL(relationship: EntityRelationship): string {
  const sourceTable = relationship.sourceEntity.replace(/\s+/g, '_');
  const targetTable = relationship.targetEntity.replace(/\s+/g, '_');
  const relationshipSafeName = relationship.relationshipName.replace(/\s+/g, '_');
  const viewName = `vw_QC_${sourceTable}_to_${targetTable}_${relationshipSafeName}`;
  
  // For bridge tables
  if (sourceTable.includes('_to_') && sourceTable.includes('_mapping')) {
    return `CREATE VIEW ${viewName} AS
SELECT 
    b.PrimaryKey AS BridgeRecordId,
    b.[Source type] AS SourceType,
    b.[Source PrimaryKey] AS SourcePrimaryKey,
    b.[Target Type] AS TargetType,
    b.[Target PrimaryKey] AS TargetPrimaryKey,
    CASE 
        WHEN s.id IS NULL THEN 'Source entity not found: ' + CAST(b.[Source PrimaryKey] AS NVARCHAR)
        WHEN t.id IS NULL THEN 'Target entity not found: ' + CAST(b.[Target PrimaryKey] AS NVARCHAR)
    END AS ValidationMessage
FROM ${sourceTable} b
LEFT JOIN ${relationship.sourceEntity.replace(/\s+/g, '_')} s ON b.[Source PrimaryKey] = s.PrimaryKey
LEFT JOIN ${relationship.targetEntity.replace(/\s+/g, '_')} t ON b.[Target PrimaryKey] = t.PrimaryKey
WHERE s.id IS NULL OR t.id IS NULL;`;
  }
  
  // For direct relationships with foreign keys
  const fkField = `${relationship.targetEntity.toLowerCase().replace(/\s+/g, '')}Id`;
  return `CREATE VIEW ${viewName} AS
SELECT 
    s.id AS ${sourceTable}_Id,
    s.${fkField},
    'Referenced ${relationship.targetEntity} not found' AS ValidationMessage
FROM ${sourceTable} s
LEFT JOIN ${targetTable} t ON s.${fkField} = t.id
WHERE s.${fkField} IS NOT NULL AND t.id IS NULL;`;
}

/**
 * Generates all quality check rules based on entity definitions
 */
export function generateQualityCheckRules(entities: EntityDefinition[]): QualityCheckRule[] {
  const rules: QualityCheckRule[] = [];
  let idCounter = 1;

  // Generate enumeration validation rules
  const enumerations = extractEnumerationFields(entities);
  enumerations.forEach(enumField => {
    rules.push({
      id: `enum_${String(idCounter++).padStart(3, '0')}`,
      name: `${enumField.entityName} - ${enumField.fieldName} Enumeration Validation`,
      category: 'Enumeration Validation',
      description: `Validates that ${enumField.fieldName} field contains only valid enumeration values: ${enumField.allowedValues.join(', ')}`,
      sqlCode: generateEnumerationValidationSQL(enumField),
      severity: 'Error',
      isActive: true,
      entityName: enumField.entityName,
      fieldName: enumField.fieldName,
      createdDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    });
  });

  // Generate relationship validation rules
  const relationships = extractEntityRelationships(entities);
  relationships.forEach(rel => {
    rules.push({
      id: `rel_${String(idCounter++).padStart(3, '0')}`,
      name: `${rel.sourceEntity} to ${rel.targetEntity} Relationship Validation`,
      category: 'Relationship Validation',
      description: `Validates that ${rel.sourceEntity} correctly references ${rel.targetEntity} through ${rel.relationshipName} relationship`,
      sqlCode: generateRelationshipValidationSQL(rel),
      severity: 'Error',
      isActive: true,
      entityName: rel.sourceEntity,
      createdDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    });
  });

  return rules;
}

/**
 * Generates quality check rules from DTDL schemas
 */
export function generateQualityCheckRulesFromDTDL(dtdlSchemas: any[]): QualityCheckRule[] {
  const rules: QualityCheckRule[] = [];
  let idCounter = 1;

  // Generate enumeration validation rules from DTDL
  const enumerations = extractEnumerationsFromDTDL(dtdlSchemas);
  enumerations.forEach(enumField => {
    rules.push({
      id: `enum_dtdl_${String(idCounter++).padStart(3, '0')}`,
      name: `${enumField.entityName} - ${enumField.fieldName} Enumeration Validation`,
      category: 'Enumeration Validation',
      description: `Validates that ${enumField.fieldName} field contains only valid enumeration values: ${enumField.allowedValues.join(', ')}`,
      sqlCode: generateEnumerationValidationSQL(enumField),
      severity: 'Error',
      isActive: true,
      entityName: enumField.entityName,
      fieldName: enumField.fieldName,
      createdDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    });
  });

  return rules;
}

/**
 * Generates a comprehensive enumeration validation SQL script
 */
export function generateEnumerationValidationScript(enumerations: EnumerationField[]): string {
  let script = `-- ============================================
-- ISA-95 Enumeration Validation Views
-- Generated: ${new Date().toISOString()}
-- Total Enumeration Fields: ${enumerations.length}
-- ============================================
--
-- This script creates SQL views to validate enumeration fields
-- Each view returns records with invalid enumeration values
--

`;

  // Generate DROP statements
  script += `-- Drop existing views\n`;
  enumerations.forEach(enumField => {
    const tableName = enumField.entityName.replace(/\s+/g, '_');
    const viewName = `vw_QC_${tableName}_${enumField.fieldName}_Enum`;
    script += `IF OBJECT_ID('${viewName}', 'V') IS NOT NULL DROP VIEW ${viewName};\n`;
  });
  script += `GO\n\n`;

  // Generate CREATE statements
  enumerations.forEach(enumField => {
    script += `-- Entity: ${enumField.entityName}\n`;
    script += `-- Field: ${enumField.fieldName}\n`;
    script += `-- Allowed Values: ${enumField.allowedValues.join(', ')}\n`;
    script += generateEnumerationValidationSQL(enumField);
    script += `\nGO\n\n`;
  });

  // Generate summary view for all enumeration violations
  script += `-- ============================================\n`;
  script += `-- Summary View: All Enumeration Violations\n`;
  script += `-- ============================================\n\n`;
  script += `IF OBJECT_ID('vw_QC_AllEnumerationViolations', 'V') IS NOT NULL DROP VIEW vw_QC_AllEnumerationViolations;\n`;
  script += `GO\n\n`;
  script += `CREATE VIEW vw_QC_AllEnumerationViolations AS\n`;

  const unionStatements = enumerations.map((enumField, index) => {
    const tableName = enumField.entityName.replace(/\s+/g, '_');
    const viewName = `vw_QC_${tableName}_${enumField.fieldName}_Enum`;
    return `${index > 0 ? 'UNION ALL\n' : ''}SELECT 
    '${enumField.entityName}' AS EntityName,
    '${enumField.fieldName}' AS FieldName,
    'Enumeration Validation' AS ValidationType,
    CAST(${tableName}_Id AS NVARCHAR(255)) AS RecordId,
    ${enumField.fieldName} AS InvalidValue,
    ValidationMessage
FROM ${viewName}`;
  });

  script += unionStatements.join('\n');
  script += `;\nGO\n\n`;

  // Generate statistics view
  script += `-- ============================================\n`;
  script += `-- Statistics View: Enumeration Violation Counts\n`;
  script += `-- ============================================\n\n`;
  script += `IF OBJECT_ID('vw_QC_EnumerationViolationStats', 'V') IS NOT NULL DROP VIEW vw_QC_EnumerationViolationStats;\n`;
  script += `GO\n\n`;
  script += `CREATE VIEW vw_QC_EnumerationViolationStats AS\n`;
  script += `SELECT 
    EntityName,
    FieldName,
    COUNT(*) AS ViolationCount,
    COUNT(DISTINCT InvalidValue) AS DistinctInvalidValues
FROM vw_QC_AllEnumerationViolations
GROUP BY EntityName, FieldName;\n`;
  script += `GO\n`;

  return script;
}

/**
 * Generate a general enumeration validation system with metadata table
 * This creates a metadata-driven approach for validating all enumerations
 */
export function generateGeneralEnumerationValidationScript(enumerations: EnumerationField[]): string {
  let script = `-- ============================================
-- ISA-95 General Enumeration Validation System
-- Generated: ${new Date().toISOString()}
-- Total Enumeration Fields: ${enumerations.length}
-- ============================================
--
-- This script creates a metadata-driven enumeration validation system
-- 1. Metadata table with entity-field-value mappings
-- 2. General validation view using dynamic SQL
-- 3. Helper stored procedure for validation
--

-- ============================================
-- Step 1: Create Enumeration Metadata View
-- ============================================

IF OBJECT_ID('vw_QC_EnumerationMetadata', 'V') IS NOT NULL DROP VIEW vw_QC_EnumerationMetadata;
GO

CREATE VIEW vw_QC_EnumerationMetadata AS
`;

  // Generate SELECT UNION ALL for each enumeration field
  const metadataStatements: string[] = [];
  enumerations.forEach(enumField => {
    const tableName = enumField.entityName.replace(/\s+/g, '_');
    enumField.allowedValues.forEach(value => {
      // Ensure value is a string
      const stringValue = typeof value === 'string' ? value : String(value);
      const escapedValue = stringValue.replace(/'/g, "''");
      metadataStatements.push(
        `SELECT '${enumField.entityName}' AS EntityName, '${tableName}' AS EntityTable, '${enumField.fieldName}' AS FieldName, '${escapedValue}' AS AllowedValue`
      );
    });
  });

  script += metadataStatements.join('\nUNION ALL\n');
  script += `;\nGO\n\n`;

  // Create metadata grouped view
  script += `-- ============================================
-- Step 2: Create Metadata Grouped View
-- ============================================

IF OBJECT_ID('vw_QC_EnumerationMetadataGrouped', 'V') IS NOT NULL DROP VIEW vw_QC_EnumerationMetadataGrouped;
GO

CREATE VIEW vw_QC_EnumerationMetadataGrouped AS
SELECT 
    EntityName,
    EntityTable,
    FieldName,
    STRING_AGG(AllowedValue, ', ') WITHIN GROUP (ORDER BY AllowedValue) AS AllowedValues,
    COUNT(*) AS AllowedValueCount
FROM vw_QC_EnumerationMetadata
GROUP BY EntityName, EntityTable, FieldName;
GO

`;

  // Create the general validation stored procedure
  script += `-- ============================================
-- Step 3: Create General Validation Stored Procedure
-- ============================================

IF OBJECT_ID('sp_QC_ValidateAllEnumerations', 'P') IS NOT NULL DROP PROCEDURE sp_QC_ValidateAllEnumerations;
GO

CREATE PROCEDURE sp_QC_ValidateAllEnumerations
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Temporary table to store all violations
    CREATE TABLE #EnumerationViolations (
        EntityName NVARCHAR(255),
        EntityTable NVARCHAR(255),
        FieldName NVARCHAR(255),
        RecordId NVARCHAR(255),
        InvalidValue NVARCHAR(500),
        AllowedValues NVARCHAR(MAX)
    );
    
    -- Cursor to iterate through each entity-field combination
    DECLARE @EntityName NVARCHAR(255);
    DECLARE @EntityTable NVARCHAR(255);
    DECLARE @FieldName NVARCHAR(255);
    DECLARE @AllowedValues NVARCHAR(MAX);
    DECLARE @SQL NVARCHAR(MAX);
    
    DECLARE enum_cursor CURSOR FOR
    SELECT EntityName, EntityTable, FieldName, AllowedValues
    FROM vw_QC_EnumerationMetadataGrouped;
    
    OPEN enum_cursor;
    FETCH NEXT FROM enum_cursor INTO @EntityName, @EntityTable, @FieldName, @AllowedValues;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- Build dynamic SQL to check violations
        SET @SQL = N'
        INSERT INTO #EnumerationViolations (EntityName, EntityTable, FieldName, RecordId, InvalidValue, AllowedValues)
        SELECT 
            ''' + @EntityName + ''' AS EntityName,
            ''' + @EntityTable + ''' AS EntityTable,
            ''' + @FieldName + ''' AS FieldName,
            CAST(id AS NVARCHAR(255)) AS RecordId,
            ' + QUOTENAME(@FieldName) + ' AS InvalidValue,
            ''' + REPLACE(@AllowedValues, '''', '''''') + ''' AS AllowedValues
        FROM ' + QUOTENAME(@EntityTable) + '
        WHERE ' + QUOTENAME(@FieldName) + ' IS NOT NULL
        AND ' + QUOTENAME(@FieldName) + ' NOT IN (
            SELECT AllowedValue 
            FROM vw_QC_EnumerationMetadata 
            WHERE EntityTable = ''' + @EntityTable + ''' 
            AND FieldName = ''' + @FieldName + '''
        );';
        
        -- Execute dynamic SQL
        BEGIN TRY
            EXEC sp_executesql @SQL;
        END TRY
        BEGIN CATCH
            -- Log error but continue
            PRINT 'Error validating ' + @EntityTable + '.' + @FieldName + ': ' + ERROR_MESSAGE();
        END CATCH
        
        FETCH NEXT FROM enum_cursor INTO @EntityName, @EntityTable, @FieldName, @AllowedValues;
    END
    
    CLOSE enum_cursor;
    DEALLOCATE enum_cursor;
    
    -- Return results
    SELECT 
        EntityName,
        EntityTable,
        FieldName,
        RecordId,
        InvalidValue,
        'Invalid enumeration value. Allowed values: ' + AllowedValues AS ValidationMessage
    FROM #EnumerationViolations
    ORDER BY EntityName, FieldName, RecordId;
    
    DROP TABLE #EnumerationViolations;
END
GO

`;

  // Create a view that calls the stored procedure (SQL Server doesn't support this directly)
  // So we create a function instead
  script += `-- ============================================
-- Step 4: Create General Validation View (UNION ALL approach)
-- ============================================

IF OBJECT_ID('vw_QC_GeneralEnumerationValidation', 'V') IS NOT NULL DROP VIEW vw_QC_GeneralEnumerationValidation;
GO

CREATE VIEW vw_QC_GeneralEnumerationValidation AS
`;

  // Generate UNION ALL for all enumerations
  const unionStatements = enumerations.map((enumField, index) => {
    const tableName = enumField.entityName.replace(/\s+/g, '_');
    const allowedValuesList = enumField.allowedValues.map(v => {
      const stringValue = typeof v === 'string' ? v : String(v);
      return `'${stringValue.replace(/'/g, "''")}'`;
    }).join(', ');
    
    // Create display string for error message
    const allowedValuesDisplay = enumField.allowedValues.map(v => 
      typeof v === 'string' ? v : String(v)
    ).join(', ');
    
    return `${index > 0 ? '\nUNION ALL\n' : ''}
-- ${enumField.entityName}.${enumField.fieldName}
SELECT 
    '${enumField.entityName}' AS EntityName,
    '${tableName}' AS EntityTable,
    '${enumField.fieldName}' AS FieldName,
    CAST(id AS NVARCHAR(255)) AS RecordId,
    ${enumField.fieldName} AS InvalidValue,
    'Invalid enumeration value. Allowed: ${allowedValuesDisplay}' AS ValidationMessage
FROM ${tableName}
WHERE ${enumField.fieldName} IS NOT NULL
AND ${enumField.fieldName} NOT IN (${allowedValuesList})`;
  });

  script += unionStatements.join('');
  script += `;\nGO\n\n`;

  // Create summary statistics view
  script += `-- ============================================
-- Step 5: Create Summary Statistics View
-- ============================================

IF OBJECT_ID('vw_QC_GeneralEnumerationStats', 'V') IS NOT NULL DROP VIEW vw_QC_GeneralEnumerationStats;
GO

CREATE VIEW vw_QC_GeneralEnumerationStats AS
SELECT 
    EntityName,
    EntityTable,
    FieldName,
    COUNT(*) AS ViolationCount,
    COUNT(DISTINCT InvalidValue) AS DistinctInvalidValues,
    STRING_AGG(DISTINCT InvalidValue, ', ') AS InvalidValuesList
FROM vw_QC_GeneralEnumerationValidation
GROUP BY EntityName, EntityTable, FieldName;
GO

`;

  // Add usage instructions
  script += `-- ============================================
-- Usage Instructions
-- ============================================
--
-- 1. View all enumeration violations:
--    SELECT * FROM vw_QC_GeneralEnumerationValidation;
--
-- 2. View violation statistics:
--    SELECT * FROM vw_QC_GeneralEnumerationStats;
--
-- 3. View metadata (all allowed values):
--    SELECT * FROM vw_QC_EnumerationMetadata;
--
-- 4. View metadata grouped (entity-field with all values):
--    SELECT * FROM vw_QC_EnumerationMetadataGrouped;
--
-- 5. Run stored procedure for dynamic validation:
--    EXEC sp_QC_ValidateAllEnumerations;
--
-- 6. Check violations for specific entity:
--    SELECT * FROM vw_QC_GeneralEnumerationValidation 
--    WHERE EntityName = 'Equipment requirement';
--
-- 7. View all allowed values for a specific field:
--    SELECT * FROM vw_QC_EnumerationMetadata
--    WHERE EntityName = 'Equipment requirement' AND FieldName = 'equipmentLevel';
--
-- Note: All enumeration metadata is defined in views and cannot be modified at runtime.
-- To update allowed values, regenerate this script with the updated DTDL schemas.
--
-- ============================================
`;

  return script;
}

/**
 * Generates a consolidated SQL script with all validation views
 */
export function generateConsolidatedSQLScript(rules: QualityCheckRule[]): string {
  const header = `-- ISA-95 Data Quality Validation Views
-- Generated: ${new Date().toISOString()}
-- Total Rules: ${rules.length}
--
-- This script creates SQL views for data quality validation
-- Each view returns records that violate a specific quality rule
--

`;

  const dropStatements = rules
    .filter(r => r.isActive)
    .map(r => {
      const match = r.sqlCode.match(/CREATE VIEW (\S+)/);
      const viewName = match ? match[1] : null;
      return viewName ? `IF OBJECT_ID('${viewName}', 'V') IS NOT NULL DROP VIEW ${viewName};\nGO\n` : '';
    })
    .join('');

  const createStatements = rules
    .filter(r => r.isActive)
    .map(r => `-- ${r.name}\n-- Category: ${r.category}\n-- Entity: ${r.entityName || 'N/A'}\n${r.sqlCode}\nGO\n`)
    .join('\n');

  const summary = `
-- Summary View: All Quality Check Violations
IF OBJECT_ID('vw_QC_AllViolations', 'V') IS NOT NULL DROP VIEW vw_QC_AllViolations;
GO

CREATE VIEW vw_QC_AllViolations AS
${rules
  .filter(r => r.isActive)
  .map((r, idx) => {
    const match = r.sqlCode.match(/CREATE VIEW (\S+)/);
    const viewName = match ? match[1] : null;
    if (!viewName) return '';
    
    return `${idx > 0 ? 'UNION ALL\n' : ''}SELECT 
    '${r.id}' AS RuleId,
    '${r.name.replace(/'/g, "''")}' AS RuleName,
    '${r.category}' AS Category,
    '${r.severity}' AS Severity,
    '${r.entityName || ''}' AS EntityName,
    * 
FROM ${viewName}`;
  })
  .filter(s => s)
  .join('\n')}
GO
`;

  return header + dropStatements + '\n' + createStatements + '\n' + summary;
}

/**
 * Creates a relationship matrix showing all possible entity relationships
 */
export function generateRelationshipMatrix(entities: EntityDefinition[]): Record<string, string[]> {
  const matrix: Record<string, string[]> = {};

  entities.forEach(entity => {
    const relatedEntities = new Set<string>();
    
    entity.relationships?.forEach(rel => {
      const targetName = rel.targetEntityName || rel.TargetEntityName;
      if (targetName) {
        relatedEntities.add(targetName);
      }
    });

    matrix[entity.name] = Array.from(relatedEntities);
  });

  return matrix;
}

/**
 * Validates a mapping file against possible relationships
 */
export function validateMappingFile(
  mappings: Array<{ sourceEntity: string; targetEntity: string; relationshipName: string }>,
  relationshipMatrix: Record<string, string[]>
): Array<{ mapping: any; isValid: boolean; message: string }> {
  return mappings.map(mapping => {
    const allowedTargets = relationshipMatrix[mapping.sourceEntity] || [];
    const isValid = allowedTargets.includes(mapping.targetEntity);
    
    return {
      mapping,
      isValid,
      message: isValid 
        ? 'Valid relationship' 
        : `Invalid relationship: ${mapping.sourceEntity} cannot relate to ${mapping.targetEntity}. Allowed targets: ${allowedTargets.join(', ') || 'none'}`
    };
  });
}
