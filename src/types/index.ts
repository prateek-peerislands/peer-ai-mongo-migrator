// Database connection configurations
export interface DatabaseConfig {
  postgresql?: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
  mongodb?: {
    connectionString: string;
    database?: string;
  };
}

// MCP Server configurations
export interface MCPServerConfig {
  postgresql: {
    enabled: boolean;
    tools: string[];
  };
  mongodb: {
    enabled: boolean;
    tools: string[];
  };
}

// Query result types
export interface QueryResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime?: number;
  rowCount?: number;
}

// Cross-database query result
export interface CrossDatabaseResult {
  postgresql?: QueryResult;
  mongodb?: QueryResult;
  combined?: any;
  error?: string;
  executionTime?: number;
  joinStrategy?: 'inner' | 'left' | 'right' | 'full';
  joinKey?: string;
}

// Schema information
export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  primaryKey?: string;
  foreignKeys?: ForeignKeySchema[];
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  isPrimary?: boolean;
  isForeign?: boolean;
}

export interface ForeignKeySchema {
  column: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface CollectionSchema {
  name: string;
  fields: FieldSchema[];
  indexes?: IndexSchema[];
}

export interface FieldSchema {
  name: string;
  type: string;
  required: boolean;
  default?: any;
}

export interface IndexSchema {
  name: string;
  fields: string[];
  unique: boolean;
  table?: string;
  accessMethod?: string;
  clustered?: boolean;
  primary?: boolean;
}

// Migration options
export interface MigrationOptions {
  sourceTable: string;
  targetCollection: string;
  batchSize?: number;
  transformRules?: Record<string, string>;
  validateData?: boolean;
}

// NEW: Enhanced relationship interfaces for "Relationship beyond DDL"
export interface SemanticRelationship {
  sourceTable: string;
  targetTable: string;
  relationshipType: 'business' | 'logical' | 'temporal' | 'hierarchical' | 'workflow';
  businessPurpose: string;
  dataFlowDirection: 'unidirectional' | 'bidirectional' | 'circular';
  businessRules: string[];
  usagePatterns: string[];
  impactAnalysis: {
    criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    businessImpact: string;
    dataIntegrityRisk: string;
  };
  confidence: number; // 0-1, how confident we are in this analysis
}

export interface DataFlowPattern {
  id: string;
  name: string;
  description: string;
  tables: string[];
  flowSequence: Array<{
    step: number;
    table: string;
    action: 'read' | 'write' | 'validate' | 'process';
    description: string;
    dependencies: string[];
  }>;
  businessProcess: string;
  frequency: 'low' | 'medium' | 'high' | 'continuous';
  dataVolume: 'small' | 'medium' | 'large';
  performanceImpact: 'minimal' | 'moderate' | 'significant';
}

export interface BusinessProcess {
  id: string;
  name: string;
  description: string;
  owner: string;
  trigger: string;
  steps: Array<{
    stepNumber: number;
    action: string;
    table: string;
    description: string;
    businessRules: string[];
    dependencies: string[];
  }>;
  tables: string[];
  businessRules: string[];
  criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedDuration: string;
  stakeholders: string[];
}

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  category: 'data_integrity' | 'business_logic' | 'validation' | 'workflow' | 'compliance';
  tables: string[];
  columns: string[];
  ruleType: 'constraint' | 'validation' | 'workflow' | 'calculation';
  ruleDefinition: string;
  enforcement: 'database' | 'application' | 'business_process';
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dependencies: string[];
}

export interface ImpactMatrix {
  tableName: string;
  businessCriticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dataQualityImpact: string;
  businessProcessImpact: string;
  complianceImpact: string;
  riskFactors: string[];
  mitigationStrategies: string[];
}

// CLI command options
export interface CLICommand {
  command: string;
  description: string;
  options?: string[];
  action: (...args: any[]) => Promise<void>;
}
