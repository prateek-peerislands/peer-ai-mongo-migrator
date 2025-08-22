// Migration analysis types for Spring Boot to Node.js + MongoDB migration

export interface SourceCodeAnalysis {
  sourcePath: string;
  projectName: string;
  analysisDate: Date;
  entities: FileAnalysis[];
  repositories: FileAnalysis[];
  controllers: FileAnalysis[];
  services: FileAnalysis[];
  configuration: ConfigurationAnalysis;
  projectStructure: ProjectStructureAnalysis;
  totalFiles: number;
  migrationComplexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface FileAnalysis {
  filePath: string;
  fileName: string;
  fileType: 'ENTITY' | 'REPOSITORY' | 'CONTROLLER' | 'SERVICE' | 'CONFIG';
  complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  annotations: AnnotationAnalysis[];
  imports: string[];
  dependencies: string[];
  methods: MethodAnalysis[];
  fields: FieldAnalysis[];
  relationships: RelationshipAnalysis[];
  migrationNotes: string[];
  estimatedEffort: number; // in hours
}

export interface AnnotationAnalysis {
  name: string;
  parameters: Record<string, any>;
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  migrationAction: string;
}

export interface MethodAnalysis {
  name: string;
  returnType: string;
  parameters: ParameterAnalysis[];
  complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  migrationAction: string;
}

export interface ParameterAnalysis {
  name: string;
  type: string;
  required: boolean;
}

export interface FieldAnalysis {
  name: string;
  type: string;
  annotations: AnnotationAnalysis[];
  nullable: boolean;
  defaultValue?: any;
  migrationAction: string;
}

export interface RelationshipAnalysis {
  type: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_ONE' | 'MANY_TO_MANY';
  targetEntity: string;
  mappedBy?: string;
  cascade: string[];
  fetch: 'LAZY' | 'EAGER';
  migrationStrategy: string;
}

export interface ConfigurationAnalysis {
  properties?: Record<string, string>;
  pom?: PomAnalysis;
  springBootVersion?: string;
  javaVersion?: string;
}

export interface PomAnalysis {
  groupId: string;
  artifactId: string;
  version: string;
  dependencies: DependencyAnalysis[];
  properties: Record<string, string>;
}

export interface DependencyAnalysis {
  groupId: string;
  artifactId: string;
  version: string;
  scope?: string;
  migrationAction: string;
}

export interface ProjectStructureAnalysis {
  mainJavaPath: string;
  mainResourcesPath: string;
  testPath: string;
  configPath: string;
  layers: string[];
}

export interface MigrationPlan {
  summary: MigrationSummary;
  phases: MigrationPhase[];
  riskAssessment: RiskAssessment;
  costEstimation: CostEstimation;
  recommendations: string[];
  timeline: TimelineEstimation;
}

export interface MigrationSummary {
  totalEffort: number; // in hours
  complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedDuration: string; // e.g., "6-8 weeks"
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  businessImpact: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface MigrationPhase {
  name: string;
  description: string;
  duration: string;
  effort: number; // in hours
  dependencies: string[];
  deliverables: string[];
  risks: string[];
  mitigation: string[];
}

export interface RiskAssessment {
  highRisks: RiskItem[];
  mediumRisks: RiskItem[];
  lowRisks: RiskItem[];
  mitigationStrategies: string[];
}

export interface RiskItem {
  description: string;
  probability: 'LOW' | 'MEDIUM' | 'HIGH';
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  mitigation: string;
}

export interface CostEstimation {
  developmentCost: number;
  infrastructureCost: number;
  operationalCost: number;
  totalCost: number;
  currency: string;
  assumptions: string[];
}

export interface TimelineEstimation {
  startDate: Date;
  endDate: Date;
  phases: PhaseTimeline[];
  criticalPath: string[];
  bufferTime: number; // in days
}

export interface PhaseTimeline {
  phaseName: string;
  startDate: Date;
  endDate: Date;
  duration: number; // in days
  milestones: Milestone[];
}

export interface Milestone {
  name: string;
  date: Date;
  description: string;
  deliverables: string[];
}

export interface MigrationAnalysis {
  sourceCodeAnalysis: SourceCodeAnalysis;
  migrationPlan: MigrationPlan;
  generatedAt: Date;
  version: string;
}

// Node.js + MongoDB specific types
export interface NodeJsArchitecture {
  projectStructure: NodeJsProjectStructure;
  dependencies: NodeJsDependencies;
  configuration: NodeJsConfiguration;
  databaseSchema: MongoDBSchema;
}

export interface NodeJsProjectStructure {
  rootFiles: string[];
  directories: DirectoryStructure[];
  entryPoint: string;
  packageManager: 'npm' | 'yarn' | 'pnpm';
}

export interface DirectoryStructure {
  name: string;
  purpose: string;
  files: string[];
  subdirectories: DirectoryStructure[];
}

export interface NodeJsDependencies {
  production: DependencyInfo[];
  development: DependencyInfo[];
  scripts: Record<string, string>;
}

export interface DependencyInfo {
  name: string;
  version: string;
  purpose: string;
  migrationFrom?: string;
}

export interface NodeJsConfiguration {
  environment: Record<string, string>;
  database: DatabaseConfig;
  server: ServerConfig;
  middleware: string[];
}

export interface DatabaseConfig {
  connectionString: string;
  databaseName: string;
  options: Record<string, any>;
}

export interface ServerConfig {
  port: number;
  host: string;
  cors: boolean;
  compression: boolean;
}

export interface MongoDBSchema {
  collections: CollectionSchema[];
  indexes: IndexSchema[];
  relationships: MongoRelationship[];
}

export interface CollectionSchema {
  name: string;
  fields: MongoField[];
  validation: ValidationRule[];
  indexes: string[];
}

export interface MongoField {
  name: string;
  type: string;
  required: boolean;
  default?: any;
  validation?: ValidationRule[];
}

export interface ValidationRule {
  type: string;
  value: any;
  message: string;
}

export interface IndexSchema {
  name: string;
  fields: string[];
  type: 'single' | 'compound' | 'text' | 'unique';
  options: Record<string, any>;
}

export interface MongoRelationship {
  type: 'embedded' | 'reference';
  sourceCollection: string;
  targetCollection: string;
  strategy: string;
  description: string;
}
