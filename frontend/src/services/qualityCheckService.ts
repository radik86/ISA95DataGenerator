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
