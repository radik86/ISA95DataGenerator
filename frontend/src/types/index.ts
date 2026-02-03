// TypeScript models mirroring backend .NET models

export interface EntityDefinition {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  context?: string;
  attributes: AttributeDefinition[];
  relationships: RelationshipDefinition[];
}

export interface AttributeDefinition {
  name: string;
  displayName?: string;
  schema: string;
  description?: string;
  isRequired: boolean;
  isPrimaryKey: boolean;
  canBePrimaryKey: boolean;
  minValue?: number;
  maxValue?: number;
  enumValues?: string[];
}

export interface RelationshipDefinition {
  name: string;
  displayName?: string;
  targetEntityName?: string;  // camelCase from frontend
  TargetEntityName?: string;  // PascalCase from backend API
  targetEntityId?: string;    // camelCase - the @id reference
  TargetEntityId?: string;    // PascalCase - the @id reference from backend
  cardinality: Cardinality | string;  // Can be enum or string from API
  direction: RelationshipDirection | string;
  description?: string;
}

export enum Cardinality {
  OneToOne = 'OneToOne',
  OneToMany = 'OneToMany',
  ManyToOne = 'ManyToOne',
  ManyToMany = 'ManyToMany'
}

export enum RelationshipDirection {
  Outgoing = 'Outgoing',
  Incoming = 'Incoming',
  Bidirectional = 'Bidirectional'
}

export interface PrimaryKeyRule {
  entityName: string;
  formatTemplate?: string;
  fieldNames: string[];
  prefix?: string;
  suffix?: string;
  separator?: string;
  useSequence: boolean;
  startingSequence?: number;
  sequencePadding?: number;
}

export interface FieldRule {
  entityName: string;
  fieldName: string;
  ruleType: RuleType;
  parameters: RuleParameters;
}

export enum RuleType {
  Range = 'Range',
  Examples = 'Examples',
  Pattern = 'Pattern',
  Static = 'Static',
  Sequence = 'Sequence',
  PrefixSequence = 'PrefixSequence',
  Enumeration = 'Enumeration',
  IfThen = 'IfThen',
  Case = 'Case',
  Coalesce = 'Coalesce',
  Concat = 'Concat',
  CompositeConcat = 'CompositeConcat'
}

export type RuleParameters = 
  | RangeParameters 
  | ExamplesParameters 
  | PatternParameters 
  | StaticParameters 
  | SequenceParameters
  | PrefixSequenceParameters
  | EnumerationParameters
  | IfThenParameters
  | CaseParameters
  | CoalesceParameters
  | ConcatParameters
  | CompositeConcatParameters;

export interface RangeParameters {
  min: number;
  max: number;
}

export interface ExamplesParameters {
  values: string[];
}

export interface PatternParameters {
  regex: string;
}

export interface StaticParameters {
  value: string;
}

export interface SequenceParameters {
  start: number;
  increment: number;
}

export interface PrefixSequenceParameters {
  prefix?: string;
  suffix?: string;
  start: number;
  end: number;
  padding?: number;
}

export interface EnumerationParameters {
  values: string[]; // The enumeration values to choose from
}

export interface IfThenParameters {
  sourceField?: string; // Optional source field to evaluate
  sourceFields?: string[]; // Optional multiple source fields for complex conditions
  condition: string; // The condition to evaluate (e.g., a field name or value to check)
  trueValue: any; // Value to use when condition is true (can reference {field} placeholders)
  falseValue: any; // Value to use when condition is false (can reference {field} placeholders)
}

export interface CaseParameters {
  sourceField?: string; // Optional source field to evaluate
  cases: Array<{
    case: string; // The case condition or value to match
    value: any; // The value to return for this case
  }>;
  defaultValue?: any; // Optional default value if no cases match
}

export interface CoalesceParameters {
  sourceFields: string[]; // Array of source fields to check in order, returns first non-null/non-empty value
  defaultValue?: string; // Optional default value if all fields are null/empty
}

export interface ConcatParameters {
  sourceFields: string[]; // Array of source fields to concatenate
  separator?: string; // Optional separator between values (default: '')
  prefix?: string; // Optional prefix for the result
  suffix?: string; // Optional suffix for the result
}

export interface CompositeConcatParameters {
  fields: Array<{
    fieldName: string; // Source field name
    prefix?: string; // Optional prefix for this field's value
    suffix?: string; // Optional suffix for this field's value
  }>; // Array of fields with individual concat parameters
  separator?: string; // Separator between concatenated field values
  globalPrefix?: string; // Optional prefix for entire composite key
  globalSuffix?: string; // Optional suffix for entire composite key
}

export interface DataGenerationRequest {
  rootEntityName: string;
  includedRelatedEntities: string[];
  instanceCount: number;
  seed?: number;
  maxDepth: number;
  primaryKeyRules: PrimaryKeyRule[];
  fieldRules: FieldRule[];
  excludedFields: string[]; // Format: "EntityName.FieldName"
  entityInstanceCounts?: Record<string, number>; // Entity-specific instance counts
  relationshipCardinalities?: Array<{
    sourceEntity: string;
    targetEntity: string;
    relationshipName: string;
    cardinality: number;
  }>;
}

export interface DataGenerationResponse {
  generatedData: Record<string, any[]>;
  mappingFile: MappingFile;
  totalInstancesGenerated: number;
}

export interface MappingFile {
  generatedDate: string;
  rootEntity: string;
  totalEntities: number;
  mappings: MappingEntry[];
}

export interface MappingEntry {
  sourceType: string;
  targetType: string;
  relationshipName: string;
  cardinality: string;
}

export interface EntityGraphNode {
  entity: EntityDefinition;
  relatedEntities: Record<string, EntityDefinition>;
}

export interface DataGenerationScenario {
  id?: string;
  name: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
  rootEntityName: string;
  includedRelatedEntities: string[];
  instanceCount: number;
  seed: number;
  maxDepth: number;
  primaryKeyRules: ScenarioPrimaryKeyRule[];
  fieldRules: ScenarioFieldRule[];
}

export interface ScenarioPrimaryKeyRule {
  entityName: string;
  attributeName: string;
  ruleType: string;
  parameters: string;
}

export interface ScenarioFieldRule {
  entityName: string;
  fieldName: string;
  ruleType: string;
  parameters: string;
}
