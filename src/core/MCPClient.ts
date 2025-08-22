import { DatabaseConfig } from '../types/index.js';
import { RealMCPServer } from '../server/RealMCPServer.js';

export interface MCPToolCall {
  toolName: string;
  parameters: any;
}

export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime?: number;
  mcpTool?: string;
}

export interface MCPHealthStatus {
  postgresql: {
    status: 'healthy' | 'unhealthy' | 'unknown';
    lastCheck: Date;
    responseTime: number;
    error?: string;
  };
  mongodb: {
    status: 'healthy' | 'unhealthy' | 'unknown';
    lastCheck: Date;
    responseTime: number;
    error?: string;
  };
}

export class MCPClient {
  private config: DatabaseConfig;
  private mcpServer!: RealMCPServer;
  private healthStatus: MCPHealthStatus;
  private retryAttempts: number = 3;
  private retryDelay: number = 1000; // 1 second

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.mcpServer = RealMCPServer.getInstance(config);
    this.healthStatus = {
      postgresql: { status: 'unknown', lastCheck: new Date(), responseTime: 0 },
      mongodb: { status: 'unknown', lastCheck: new Date(), responseTime: 0 }
    };
  }

  /**
   * Initialize the MCP client
   */
  async initialize(): Promise<void> {
    try {
      // Initialize the Real MCP Server
      this.mcpServer = RealMCPServer.getInstance(this.config);
      await this.mcpServer.initialize();
      
      // Perform initial health check silently
      await this.performHealthCheck();
      
    } catch (error) {
      console.error('❌ Failed to initialize MCP client:', error);
      throw error;
    }
  }

  /**
   * Perform health check on all MCP services
   */
  async performHealthCheck(): Promise<MCPHealthStatus> {
    // Check PostgreSQL health
    try {
      const startTime = Date.now();
      const result = await this.callPostgreSQLTool('mcp_postgresql_list_tables', {});
      const responseTime = Date.now() - startTime;
      
      this.healthStatus.postgresql = {
        status: result.success ? 'healthy' : 'unhealthy',
        lastCheck: new Date(),
        responseTime,
        error: result.success ? undefined : result.error
      };
    } catch (error) {
      this.healthStatus.postgresql = {
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime: 0,
        error: String(error)
      };
    }

    // Check MongoDB health
    try {
      const startTime = Date.now();
      const result = await this.callMongoDBTool('mcp_MongoDB_list-databases', {});
      const responseTime = Date.now() - startTime;
      
      this.healthStatus.mongodb = {
        status: result.success ? 'healthy' : 'unhealthy',
        lastCheck: new Date(),
        responseTime,
        error: result.success ? undefined : result.error
      };
    } catch (error) {
      this.healthStatus.mongodb = {
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime: 0,
        error: String(error)
      };
    }

    return this.healthStatus;
  }

  /**
   * Get current health status
   */
  getHealthStatus(): MCPHealthStatus {
    return this.healthStatus;
  }

  /**
   * Call a PostgreSQL MCP tool with retry logic
   */
  async callPostgreSQLTool(toolName: string, parameters: any): Promise<MCPToolResult> {
    return await this.callToolWithRetry(
      () => this.callPostgreSQLToolInternal(toolName, parameters),
      `PostgreSQL MCP tool: ${toolName}`
    );
  }

  /**
   * Call a MongoDB MCP tool with retry logic
   */
  async callMongoDBTool(toolName: string, parameters: any): Promise<MCPToolResult> {
    return await this.callToolWithRetry(
      () => this.callMongoDBToolInternal(toolName, parameters),
      `MongoDB MCP tool: ${toolName}`
    );
  }

  /**
   * Generic retry mechanism for MCP tool calls
   */
  private async callToolWithRetry<T>(
    toolCall: () => Promise<T>,
    toolName: string
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await toolCall();
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Attempt ${attempt}/${this.retryAttempts} failed for ${toolName}: ${error}`);
        
        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * attempt); // Exponential backoff
        }
      }
    }
    
    throw new Error(`All ${this.retryAttempts} attempts failed for ${toolName}. Last error: ${lastError?.message}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Internal PostgreSQL MCP tool call implementation
   */
  private async callPostgreSQLToolInternal(toolName: string, parameters: any): Promise<MCPToolResult> {
    try {
      // Map to the actual MCP tools available in this chat
      switch (toolName) {
        case 'mcp_postgresql_read_query':
          return await this.callPostgreSQLReadQuery(parameters.query);
        case 'mcp_postgresql_write_query':
          return await this.callPostgreSQLWriteQuery(parameters.query);
        case 'mcp_postgresql_list_tables':
          return await this.callPostgreSQLListTables();
        case 'mcp_postgresql_describe_table':
          return await this.callPostgreSQLDescribeTable(parameters.table_name);
        case 'mcp_postgresql_create_table':
          return await this.callPostgreSQLCreateTable(parameters.query);
        case 'mcp_postgresql_alter_table':
          return await this.callPostgreSQLAlterTable(parameters.query);
        case 'mcp_postgresql_drop_table':
          return await this.callPostgreSQLDropTable(parameters.table_name);
        case 'mcp_postgresql_export_query':
          return await this.callPostgreSQLExportQuery(parameters.query, parameters.format);
        default:
          throw new Error(`Unknown PostgreSQL MCP tool: ${toolName}`);
      }
    } catch (error) {
      return {
        success: false,
        error: `PostgreSQL MCP tool call failed: ${error}`,
        mcpTool: toolName
      };
    }
  }

  /**
   * Internal MongoDB MCP tool call implementation
   */
  private async callMongoDBToolInternal(toolName: string, parameters: any): Promise<MCPToolResult> {
    try {
      // Map to the actual MCP tools available in this chat
      switch (toolName) {
        case 'mcp_MongoDB_connect':
          return await this.callMongoDBConnect(parameters.connectionString);
        case 'mcp_MongoDB_list-databases':
          return await this.callMongoDBListDatabases();
        case 'mcp_MongoDB_list-collections':
          return await this.callMongoDBListCollections(parameters.database);
        case 'mcp_MongoDB_find':
          return await this.callMongoDBFind(parameters.database, parameters.collection, parameters.filter);
        case 'mcp_MongoDB_count':
          return await this.callMongoDBCount(parameters.database, parameters.collection, parameters.query);
        case 'mcp_MongoDB_insert-many':
          return await this.callMongoDBInsertMany(parameters.database, parameters.collection, parameters.documents);
        case 'mcp_MongoDB_update-many':
          return await this.callMongoDBUpdateMany(parameters.database, parameters.collection, parameters.filter, parameters.update);
        case 'mcp_MongoDB_delete-many':
          return await this.callMongoDBDeleteMany(parameters.database, parameters.collection, parameters.filter);
        case 'mcp_MongoDB_aggregate':
          return await this.callMongoDBAggregate(parameters.database, parameters.collection, parameters.pipeline);
        case 'mcp_MongoDB_create-collection':
          return await this.callMongoDBCreateCollection(parameters.database, parameters.collection);
        case 'mcp_MongoDB_drop-collection':
          return await this.callMongoDBDropCollection(parameters.database, parameters.collection);
        case 'mcp_MongoDB_create-index':
          return await this.callMongoDBCreateIndex(parameters.database, parameters.collection, parameters.keys, parameters.name);
        case 'mcp_MongoDB_collection-schema':
          return await this.callMongoDBCollectionSchema(parameters.database, parameters.collection);
        case 'mcp_MongoDB_explain':
          return await this.callMongoDBExplain(parameters.database, parameters.collection, parameters.method);
        default:
          throw new Error(`Unknown MongoDB MCP tool: ${toolName}`);
      }
    } catch (error) {
      return {
        success: false,
        error: `MongoDB MCP tool call failed: ${error}`,
        mcpTool: toolName
      };
    }
  }

  // PostgreSQL MCP Tool Implementations
  private async callPostgreSQLReadQuery(query: string): Promise<MCPToolResult> {
    try {
      // Use the Real MCP Server to call the tool
      const result = await this.mcpServer.handleToolCall('mcp_postgresql_read_query', { query });
      return {
        ...result,
        mcpTool: 'mcp_postgresql_read_query'
      };
    } catch (error) {
      return {
        success: false,
        error: `PostgreSQL read query failed: ${error}`,
        mcpTool: 'mcp_postgresql_read_query'
      };
    }
  }

  private async callPostgreSQLWriteQuery(query: string): Promise<MCPToolResult> {
    try {
      // Use the Real MCP Server to call the tool
      const result = await this.mcpServer.handleToolCall('mcp_postgresql_write_query', { query });
      return {
        ...result,
        mcpTool: 'mcp_postgresql_write_query'
      };
    } catch (error) {
      return {
        success: false,
        error: `PostgreSQL write query failed: ${error}`,
        mcpTool: 'mcp_postgresql_write_query'
      };
    }
  }

  private async callPostgreSQLListTables(): Promise<MCPToolResult> {
    try {
      // Use the Real MCP Server to call the tool
      const result = await this.mcpServer.handleToolCall('mcp_postgresql_list_tables', {});
      return {
        ...result,
        mcpTool: 'mcp_postgresql_list_tables'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list PostgreSQL tables: ${error}`,
        mcpTool: 'mcp_postgresql_list_tables'
      };
    }
  }

  private async callPostgreSQLDescribeTable(tableName: string): Promise<MCPToolResult> {
    try {
      // Use the Real MCP Server to call the tool
      const result = await this.mcpServer.handleToolCall('mcp_postgresql_describe_table', { table_name: tableName });
      return {
        ...result,
        mcpTool: 'mcp_postgresql_describe_table'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to describe PostgreSQL table: ${error}`,
        mcpTool: 'mcp_postgresql_describe_table'
      };
    }
  }

  private async callPostgreSQLCreateTable(query: string): Promise<MCPToolResult> {
    try {
      // Use the Real MCP Server to call the tool
      const result = await this.mcpServer.handleToolCall('mcp_postgresql_create_table', { query });
      return {
        ...result,
        mcpTool: 'mcp_postgresql_create_table'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create PostgreSQL table: ${error}`,
        mcpTool: 'mcp_postgresql_create_table'
      };
    }
  }

  private async callPostgreSQLAlterTable(query: string): Promise<MCPToolResult> {
    try {
      // Use the Real MCP Server to call the tool
      const result = await this.mcpServer.handleToolCall('mcp_postgresql_alter_table', { query });
      return {
        ...result,
        mcpTool: 'mcp_postgresql_alter_table'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to alter PostgreSQL table: ${error}`,
        mcpTool: 'mcp_postgresql_alter_table'
      };
    }
  }

  private async callPostgreSQLDropTable(tableName: string): Promise<MCPToolResult> {
    try {
      // Use the Real MCP Server to call the tool
      const result = await this.mcpServer.handleToolCall('mcp_postgresql_drop_table', { table_name: tableName });
      return {
        ...result,
        mcpTool: 'mcp_postgresql_drop_table'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to drop PostgreSQL table: ${error}`,
        mcpTool: 'mcp_postgresql_drop_table'
      };
    }
  }

  private async callPostgreSQLExportQuery(query: string, format: string): Promise<MCPToolResult> {
    try {
      // Use the Real MCP Server to call the tool
      const result = await this.mcpServer.handleToolCall('mcp_postgresql_export_query', { query, format });
      return {
        ...result,
        mcpTool: 'mcp_postgresql_export_query'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to export PostgreSQL query: ${error}`,
        mcpTool: 'mcp_postgresql_export_query'
      };
    }
  }

  // MongoDB MCP Tool Implementations
  private async callMongoDBConnect(connectionString: string): Promise<MCPToolResult> {
    try {
      // Use the Real MCP Server to call the tool
      const result = await this.mcpServer.handleToolCall('mcp_MongoDB_connect', { connectionString });
      return {
        ...result,
        mcpTool: 'mcp_MongoDB_connect'
      };
    } catch (error) {
      return {
        success: false,
        error: `MongoDB connection failed: ${error}`,
        mcpTool: 'mcp_MongoDB_connect'
      };
    }
  }

  private async callMongoDBListDatabases(): Promise<MCPToolResult> {
    try {
      // Use the Real MCP Server to call the tool
      const result = await this.mcpServer.handleToolCall('mcp_MongoDB_list-databases', {});
      return {
        ...result,
        mcpTool: 'mcp_MongoDB_list-databases'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list MongoDB databases: ${error}`,
        mcpTool: 'mcp_MongoDB_list-databases'
      };
    }
  }

  private async callMongoDBListCollections(database: string): Promise<MCPToolResult> {
    try {
      // Use the Real MCP Server to call the tool
      const result = await this.mcpServer.handleToolCall('mcp_MongoDB_list-collections', { database });
      return {
        ...result,
        mcpTool: 'mcp_MongoDB_list-collections'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list MongoDB collections: ${error}`,
        mcpTool: 'mcp_MongoDB_list-collections'
      };
    }
  }

  private async callMongoDBFind(database: string, collection: string, filter: any): Promise<MCPToolResult> {
    try {
      // Use the Real MCP Server to call the tool
      const result = await this.mcpServer.handleToolCall('mcp_MongoDB_find', { database, collection, filter });
      return {
        ...result,
        mcpTool: 'mcp_MongoDB_find'
      };
    } catch (error) {
      return {
        success: false,
        error: `MongoDB find failed: ${error}`,
        mcpTool: 'mcp_MongoDB_find'
      };
    }
  }

  private async callMongoDBCount(database: string, collection: string, query?: any): Promise<MCPToolResult> {
    try {
      // Use the Real MCP Server to call the tool
      const result = await this.mcpServer.handleToolCall('mcp_MongoDB_count', { database, collection, query });
      return {
        ...result,
        mcpTool: 'mcp_MongoDB_count'
      };
    } catch (error) {
      return {
        success: false,
        error: `MongoDB count failed: ${error}`,
        mcpTool: 'mcp_MongoDB_count'
      };
    }
  }

  private async callMongoDBInsertMany(database: string, collection: string, documents: any[]): Promise<MCPToolResult> {
    try {
      // Use the Real MCP Server to call the tool
      const result = await this.mcpServer.handleToolCall('mcp_MongoDB_insert-many', { database, collection, documents });
      return {
        ...result,
        mcpTool: 'mcp_MongoDB_insert-many'
      };
    } catch (error) {
      return {
        success: false,
        error: `MongoDB insert failed: ${error}`,
        mcpTool: 'mcp_MongoDB_insert-many'
      };
    }
  }

  private async callMongoDBUpdateMany(database: string, collection: string, filter: any, update: any): Promise<MCPToolResult> {
    try {
      // Use the Real MCP Server to call the tool
      const result = await this.mcpServer.handleToolCall('mcp_MongoDB_update-many', { database, collection, filter, update });
      return {
        ...result,
        mcpTool: 'mcp_MongoDB_update-many'
      };
    } catch (error) {
      return {
        success: false,
        error: `MongoDB update failed: ${error}`,
        mcpTool: 'mcp_MongoDB_update-many'
      };
    }
  }

  private async callMongoDBDeleteMany(database: string, collection: string, filter: any): Promise<MCPToolResult> {
    try {
      // Use the Real MCP Server to call the tool
      const result = await this.mcpServer.handleToolCall('mcp_MongoDB_delete-many', { database, collection, filter });
      return {
        ...result,
        mcpTool: 'mcp_MongoDB_delete-many'
      };
    } catch (error) {
      return {
        success: false,
        error: `MongoDB delete failed: ${error}`,
        mcpTool: 'mcp_MongoDB_delete-many'
      };
    }
  }

  private async callMongoDBAggregate(database: string, collection: string, pipeline: any[]): Promise<MCPToolResult> {
    try {
      // Use the Real MCP Server to call the tool
      const result = await this.mcpServer.handleToolCall('mcp_MongoDB_aggregate', { database, collection, pipeline });
      return {
        ...result,
        mcpTool: 'mcp_MongoDB_aggregate'
      };
    } catch (error) {
      return {
        success: false,
        error: `MongoDB aggregate failed: ${error}`,
        mcpTool: 'mcp_MongoDB_aggregate'
      };
    }
  }

  private async callMongoDBCreateCollection(database: string, collection: string): Promise<MCPToolResult> {
    try {
      // Use the Real MCP Server to call the tool
      const result = await this.mcpServer.handleToolCall('mcp_MongoDB_create-collection', { database, collection });
      return {
        ...result,
        mcpTool: 'mcp_MongoDB_create-collection'
      };
    } catch (error) {
      return {
        success: false,
        error: `MongoDB create collection failed: ${error}`,
        mcpTool: 'mcp_MongoDB_create-collection'
      };
    }
  }

  private async callMongoDBDropCollection(database: string, collection: string): Promise<MCPToolResult> {
    try {
      // Use the Real MCP Server to call the tool
      const result = await this.mcpServer.handleToolCall('mcp_MongoDB_drop-collection', { database, collection });
      return {
        ...result,
        mcpTool: 'mcp_MongoDB_drop-collection'
      };
    } catch (error) {
      return {
        success: false,
        error: `MongoDB drop collection failed: ${error}`,
        mcpTool: 'mcp_MongoDB_drop-collection'
      };
    }
  }

  private async callMongoDBCreateIndex(database: string, collection: string, keys: any, name?: string): Promise<MCPToolResult> {
    try {
      // Use the Real MCP Server to call the tool
      const result = await this.mcpServer.handleToolCall('mcp_MongoDB_create-index', { database, collection, keys, name });
      return {
        ...result,
        mcpTool: 'mcp_MongoDB_create-index'
      };
    } catch (error) {
      return {
        success: false,
        error: `MongoDB create index failed: ${error}`,
        mcpTool: 'mcp_MongoDB_create-index'
      };
    }
  }

  private async callMongoDBCollectionSchema(database: string, collection: string): Promise<MCPToolResult> {
    try {
      // Use the Real MCP Server to call the tool
      const result = await this.mcpServer.handleToolCall('mcp_MongoDB_collection-schema', { database, collection });
      return {
        ...result,
        mcpTool: 'mcp_MongoDB_collection-schema'
      };
    } catch (error) {
      return {
        success: false,
        error: `MongoDB collection schema failed: ${error}`,
        mcpTool: 'mcp_MongoDB_collection-schema'
      };
    }
  }

  private async callMongoDBExplain(database: string, collection: string, method: any): Promise<MCPToolResult> {
    try {
      // Use the Real MCP Server to call the tool
      const result = await this.mcpServer.handleToolCall('mcp_MongoDB_explain', { database, collection, method });
      return {
        ...result,
        mcpTool: 'mcp_MongoDB_explain'
      };
    } catch (error) {
      return {
        success: false,
        error: `MongoDB explain failed: ${error}`,
        mcpTool: 'mcp_MongoDB_explain'
      };
    }
  }

  /**
   * Get available MCP tools
   */
  getAvailableTools(): { postgresql: string[], mongodb: string[] } {
    return {
      postgresql: [
        'mcp_postgresql_read_query',
        'mcp_postgresql_write_query',
        'mcp_postgresql_list_tables',
        'mcp_postgresql_describe_table',
        'mcp_postgresql_create_table',
        'mcp_postgresql_alter_table',
        'mcp_postgresql_drop_table',
        'mcp_postgresql_export_query'
      ],
      mongodb: [
        'mcp_MongoDB_connect',
        'mcp_MongoDB_list-databases',
        'mcp_MongoDB_list-collections',
        'mcp_MongoDB_find',
        'mcp_MongoDB_count',
        'mcp_MongoDB_insert-many',
        'mcp_MongoDB_update-many',
        'mcp_MongoDB_delete-many',
        'mcp_MongoDB_aggregate',
        'mcp_MongoDB_create-collection',
        'mcp_MongoDB_drop-collection',
        'mcp_MongoDB_create-index',
        'mcp_MongoDB_collection-schema',
        'mcp_MongoDB_explain'
      ]
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.mcpServer.cleanup();
  }
}
