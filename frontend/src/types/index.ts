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
  Enumeration = 'Enumeration'
}

export type RuleParameters = 
  | RangeParameters 
  | ExamplesParameters 
  | PatternParameters 
  | StaticParameters 
  | SequenceParameters
  | PrefixSequenceParameters
  | EnumerationParameters;

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
