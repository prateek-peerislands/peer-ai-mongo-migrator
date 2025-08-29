import { QueryResult, TableSchema, ColumnSchema, ForeignKeySchema } from '../types/index.js';
import { MCPClient } from '../core/MCPClient.js';

export class PostgreSQLService {
  private connected: boolean = false;
  private tableCount: number = 0;
  private mcpClient!: MCPClient;

  constructor() {}

  /**
   * Initialize the PostgreSQL service
   */
  async initialize(config: any): Promise<void> {
    try {
      // Initialize MCP client
      this.mcpClient = new MCPClient(config);
      
      // Initialize the MCP server
      try {
        await this.mcpClient.initialize();
      } catch (mcpError) {
        console.warn('⚠️ MCP client initialization failed, continuing without MCP');
        this.connected = false;
        return;
      }
      
      // Test connection by listing tables using MCP tool
      try {
        const tables = await this.listTables();
        this.tableCount = tables.length;
        this.connected = true;
        console.log(`✅ PostgreSQL: ${this.tableCount} tables available`);
      } catch (tableError) {
        this.connected = true;
        this.tableCount = 0;
      }
    } catch (error) {
      console.error('❌ Failed to initialize PostgreSQL MCP service:', error);
      this.connected = false;
      throw error;
    }
  }

  /**
   * Execute a PostgreSQL query using MCP tools
   */
  async executeQuery(query: string): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      let result: any;
      
      if (this.isReadQuery(query)) {
        // Use read query tool for SELECT statements
        result = await this.executeReadQuery(query);
      } else {
        // Use write query tool for INSERT, UPDATE, DELETE statements
        result = await this.executeWriteQuery(query);
      }

      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        data: result,
        executionTime,
        rowCount: Array.isArray(result) ? result.length : 1
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        error: `Query execution failed: ${error}`,
        executionTime
      };
    }
  }

  /**
   * Execute a read query (SELECT) using MCP tool
   */
  private async executeReadQuery(query: string): Promise<any> {
    try {
      // Use the actual MCP PostgreSQL read tool
      const result = await this.mcpClient.callPostgreSQLTool('mcp_postgresql_read_query', { query });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result.data;
    } catch (error) {
      throw new Error(`MCP PostgreSQL read query failed: ${error}`);
    }
  }

  /**
   * Execute a write query (INSERT, UPDATE, DELETE) using MCP tool
   */
  private async executeWriteQuery(query: string): Promise<any> {
    try {
      // Use the actual MCP PostgreSQL write tool
      const result = await this.mcpClient.callPostgreSQLTool('mcp_postgresql_write_query', { query });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result.data;
    } catch (error) {
      throw new Error(`MCP PostgreSQL write query failed: ${error}`);
    }
  }

  /**
   * Check if a query is a read query
   */
  private isReadQuery(query: string): boolean {
    const trimmedQuery = query.trim().toLowerCase();
    return trimmedQuery.startsWith('select');
  }

  /**
   * List all tables using MCP tool
   */
  async listTables(): Promise<string[]> {
    try {
      // Use the actual MCP PostgreSQL list tables tool
      const result = await this.mcpClient.callPostgreSQLTool('mcp_postgresql_list_tables', {});
      
      if (!result.success) {
        console.error('Failed to list tables via MCP:', result.error);
        return [];
      }
      
      return result.data;
    } catch (error) {
      console.error('Failed to list tables via MCP:', error);
      return [];
    }
  }

  /**
   * Get table schema using MCP tool
   */
  async getTableSchema(tableName: string): Promise<TableSchema | null> {
    try {
      // Use the actual MCP PostgreSQL describe table tool
      const result = await this.mcpClient.callPostgreSQLTool('mcp_postgresql_describe_table', { 
        table_name: tableName 
      });
      
      if (!result.success) {
        console.error(`Failed to get schema for table ${tableName} via MCP:`, result.error);
        return null;
      }
      
      // Transform the MCP result to our TableSchema format
      const mcpData = result.data;
      
      // Check if we're getting the new structured format (object with columns array)
      if (mcpData && typeof mcpData === 'object' && mcpData.columns && Array.isArray(mcpData.columns)) {
        // New structured format - use it directly
        return {
          name: tableName,
          columns: mcpData.columns.map((col: any) => ({
            name: col.name,
            type: col.type,
            nullable: col.nullable,
            defaultValue: col.defaultValue,
            isPrimaryKey: col.isPrimary
          })),
          primaryKey: mcpData.primaryKey,
          foreignKeys: mcpData.foreignKeys || []
        };
      }
      
      // Check if we're getting the old array format
      if (Array.isArray(mcpData)) {
        // Old array format - transform it
        const columns: ColumnSchema[] = mcpData.map((col: any) => ({
          name: col.name,
          type: col.type,
          nullable: !col.notnull,
          defaultValue: col.default_value,
          isPrimaryKey: col.primary_key
        }));
        
        // Find primary key columns
        const primaryKeyColumns = columns.filter(col => col.isPrimary).map(col => col.name);
        const primaryKey = primaryKeyColumns.length > 0 ? primaryKeyColumns[0] : undefined;
        
        // Get foreign keys by querying the information schema
        const foreignKeys = await this.getForeignKeys(tableName);
        
        return {
          name: tableName,
          columns,
          primaryKey,
          foreignKeys
        };
      }
      
      console.error(`Unexpected MCP response format for table ${tableName}:`, mcpData);
      return null;
    } catch (error) {
      console.error(`Failed to get schema for table ${tableName} via MCP:`, error);
      return null;
    }
  }

  /**
   * Get foreign keys for a table
   */
  private async getForeignKeys(tableName: string): Promise<ForeignKeySchema[]> {
    try {
      const schemaName = this.getSchemaName();
      const query = `
        SELECT 
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS referenced_table,
          ccu.column_name AS referenced_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = '${tableName}'
        AND tc.table_schema = '${schemaName}'
        ORDER BY kcu.ordinal_position
      `;
      
      // Use executeReadQuery for SELECT queries
      const result = await this.executeReadQuery(query);
      
      return (result || []).map((row: any) => ({
        columnName: row.column_name,
        referencedTable: row.referenced_table,
        referencedColumn: row.referenced_column,
        constraintName: row.constraint_name
      }));
    } catch (error) {
      console.warn(`Failed to get foreign keys for table ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Get the current schema name (configurable)
   */
  private getSchemaName(): string {
    // This should be configurable via environment variables or configuration
    return process.env.POSTGRES_SCHEMA || 'public';
  }

  /**
   * Get table count
   */
  async getTableCount(): Promise<number> {
    return this.tableCount;
  }

  /**
   * Check if service is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Cleanup connections
   */
  async cleanup(): Promise<void> {
    this.connected = false;
    this.tableCount = 0;
    console.log('✅ PostgreSQL service cleaned up');
  }
}
