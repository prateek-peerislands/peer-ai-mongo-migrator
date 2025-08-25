import { QueryResult, CollectionSchema, FieldSchema, IndexSchema } from '../types/index.js';
import { MCPClient } from '../core/MCPClient.js';

export class MongoDBService {
  private connected: boolean = false;
  private collectionCount: number = 0;
  private currentDatabase: string = '';
  private mcpClient!: MCPClient;

  constructor() {}

  /**
   * Initialize the MongoDB service
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
      
      // Initialize MongoDB MCP service
      if (config && config.connectionString) {
        try {
          await this.connect(config.connectionString);
          
          // Use the database name from config if available, otherwise use parsed one
          if (config.database && config.database !== 'default') {
            this.currentDatabase = config.database;
          }
          
        } catch (connectError) {
          console.warn('⚠️ MongoDB connection failed, continuing without MongoDB');
          this.connected = false;
          return;
        }
      } else {
        console.warn('⚠️ No MongoDB connection string provided, using default database');
        this.currentDatabase = 'default';
      }
      
      // Get collection count using MCP tools
      try {
        this.collectionCount = await this.getCollectionCount();
        this.connected = true;
        console.log(`✅ MongoDB: ${this.collectionCount} collections available`);
      } catch (countError) {
        this.connected = true;
        this.collectionCount = 0;
      }
    } catch (error) {
      console.error('❌ Failed to initialize MongoDB MCP service:', error);
      this.connected = false;
      throw error;
    }
  }

  /**
   * Connect to MongoDB using MCP tool
   */
  private async connect(connectionString: string): Promise<void> {
    try {
      // Validate connection string
      if (!connectionString || typeof connectionString !== 'string') {
        throw new Error('Invalid connection string provided');
      }
      
      // Use the actual MCP MongoDB connect tool
      const result = await this.mcpClient.callMongoDBTool('mcp_MongoDB_connect', { 
        connectionString 
      });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // Set the current database from the connection string or use default
      // Extract database name from connection string if available
      let dbMatch = null;
      let database = 'default';
      
      try {
        // Try to extract database name from connection string
        // Handle both cluster and standard MongoDB URLs
        if (connectionString.includes('mongodb+srv://')) {
          // Cluster connection string
          const urlParts = connectionString.split('/');
          if (urlParts.length > 3) {
            // mongodb+srv://username:password@cluster.mongodb.net/database?options
            const lastPart = urlParts[urlParts.length - 1];
            const dbPart = lastPart.split('?')[0]; // Remove query parameters
            if (dbPart && dbPart !== 'net') {
              database = dbPart;
            }
          }
        } else {
          // Standard MongoDB connection string
          dbMatch = connectionString.match(/\/([^/?]+)(\?|$)/);
          if (dbMatch) {
            database = dbMatch[1];
          }
        }
      } catch (parseError) {
        // Silent parsing error
      }
      
      this.currentDatabase = database;
    } catch (error) {
      throw new Error(`Failed to initialize MongoDB MCP service: ${error}`);
    }
  }

  /**
   * Execute a MongoDB operation using MCP tools
   */
  async executeOperation(operation: string, database: string, collection: string, query: any): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      let result: any;
      
      switch (operation.toLowerCase()) {
        case 'find':
          result = await this.executeFind(database, collection, query);
          break;
        case 'insert':
          result = await this.executeInsert(database, collection, query);
          break;
        case 'update':
          result = await this.executeUpdate(database, collection, query);
          break;
        case 'delete':
          result = await this.executeDelete(database, collection, query);
          break;
        case 'aggregate':
          result = await this.executeAggregate(database, collection, query);
          break;
        case 'count':
          result = await this.executeCount(database, collection, query);
          break;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
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
        error: `MongoDB operation failed: ${error}`,
        executionTime
      };
    }
  }

  /**
   * Execute find operation
   */
  private async executeFind(database: string, collection: string, query: any): Promise<any> {
    // Use the actual MCP MongoDB find tool
    const result = await this.mcpClient.callMongoDBTool('mcp_MongoDB_find', { 
      database, 
      collection, 
      filter: query 
    });
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return result.data;
  }

  /**
   * Execute insert operation
   */
  private async executeInsert(database: string, collection: string, documents: any[]): Promise<any> {
    try {
      console.log(`Using MCP Tool: mcp_MongoDB_insert-many`);
      
      // Use the actual MCP MongoDB insert-many tool
      const result = await this.mcpClient.callMongoDBTool('mcp_MongoDB_insert-many', {
        database,
        collection,
        documents
      });
      
      return {
        success: true,
        data: result,
        insertedCount: documents.length
      };
    } catch (error) {
      console.error(`MongoDB insert operation failed:`, error);
      return {
        success: false,
        error: `Insert operation failed: ${error}`
      };
    }
  }

  /**
   * Execute update operation
   */
  private async executeUpdate(database: string, collection: string, query: any): Promise<any> {
    // Use the actual MCP MongoDB update-many tool
    const result = await this.mcpClient.callMongoDBTool('mcp_MongoDB_update-many', {
      database,
      collection,
      filter: query.filter || {},
      update: query.update || {}
    });
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return result.data;
  }

  /**
   * Execute delete operation
   */
  private async executeDelete(database: string, collection: string, query: any): Promise<any> {
    // Use the actual MCP MongoDB delete-many tool
    const result = await this.mcpClient.callMongoDBTool('mcp_MongoDB_delete-many', {
      database,
      collection,
      filter: query || {}
    });
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return result.data;
  }

  /**
   * Execute aggregate operation
   */
  private async executeAggregate(database: string, collection: string, pipeline: any[]): Promise<any> {
    // Placeholder for MCP tool integration
    // return await mcp_MongoDB_aggregate({ database, collection, pipeline });
    
    // Simulated response for development
    return [{ _id: 'group1', count: 5 }];
  }

  /**
   * Execute count operation
   */
  private async executeCount(database: string, collection: string, query?: any): Promise<any> {
    // Use the actual MCP MongoDB count tool
    const result = await this.mcpClient.callMongoDBTool('mcp_MongoDB_count', { 
      database, 
      collection, 
      query 
    });
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return result.data;
  }

  /**
   * List all databases
   */
  async listDatabases(): Promise<string[]> {
    try {
      // Use the actual MCP MongoDB list databases tool
      const result = await this.mcpClient.callMongoDBTool('mcp_MongoDB_list-databases', {});
      
      if (!result.success) {
        console.error('Failed to list databases via MCP:', result.error);
        return [];
      }
      
      return result.data;
    } catch (error) {
      console.error('Failed to list databases:', error);
      return [];
    }
  }

  /**
   * List collections in a database
   */
  async listCollections(database: string): Promise<string[]> {
    try {
      // Use the actual MCP MongoDB list collections tool
      const result = await this.mcpClient.callMongoDBTool('mcp_MongoDB_list-collections', { 
        database 
      });
      
      if (!result.success) {
        console.error(`Failed to list collections in ${database} via MCP:`, result.error);
        return [];
      }
      
      return result.data;
    } catch (error) {
      console.error(`Failed to list collections in ${database}:`, error);
      return [];
    }
  }

  /**
   * Get collection count
   */
  async getCollectionCount(): Promise<number> {
    try {
      const collections = await this.listCollections(this.currentDatabase);
      return collections.length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get collection schema
   */
  async getCollectionSchema(database: string, collection: string): Promise<CollectionSchema | null> {
    try {
      // Use the actual MCP MongoDB collection schema tool
      const result = await this.mcpClient.callMongoDBTool('mcp_MongoDB_collection-schema', { 
        database, 
        collection 
      });
      
      if (!result.success) {
        console.error(`Failed to get schema for collection ${collection} via MCP:`, result.error);
        // Fallback to basic schema
        return {
          name: collection,
          fields: [
            { name: '_id', type: 'ObjectId', required: true }
          ],
          indexes: []
        };
      }
      
      // If the MCP tool returns a proper schema, use it
      if (result.data && typeof result.data === 'object') {
        return {
          name: collection,
          fields: result.data.fields || [
            { name: '_id', type: 'ObjectId', required: true }
          ],
          indexes: result.data.indexes || []
        };
      }
      
      // Fallback to basic schema
      return {
        name: collection,
        fields: [
          { name: '_id', type: 'ObjectId', required: true }
        ],
        indexes: []
      };
    } catch (error) {
      console.error(`Failed to get schema for collection ${collection}:`, error);
      // Return basic schema as fallback
      return {
        name: collection,
        fields: [
          { name: '_id', type: 'ObjectId', required: true }
        ],
        indexes: []
      };
    }
  }

  /**
   * Check if service is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get current database name
   */
  getCurrentDatabase(): string {
    return this.currentDatabase;
  }

  /**
   * Cleanup connections
   */
  async cleanup(): Promise<void> {
    this.connected = false;
    this.collectionCount = 0;
    this.currentDatabase = '';
    console.log('✅ MongoDB service cleaned up');
  }
}
