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

// CLI command options
export interface CLICommand {
  command: string;
  description: string;
  options?: string[];
  action: (...args: any[]) => Promise<void>;
}
