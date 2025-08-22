/**
 * Real MCP Server - Actually connects to databases and executes real queries
 * This replaces the simulated MCP Bridge with real database connectivity
 */

import { Client } from 'pg';
import { MongoClient, Db, Collection } from 'mongodb';
import { DatabaseConfig } from '../types/index.js';

export interface MCPToolCall {
  toolName: string;
  parameters: any;
}

export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class RealMCPServer {
  private static instance: RealMCPServer | null = null;
  private postgresClient: Client | null = null;
  private mongoClient: MongoClient | null = null;
  private mongoDb: Db | null = null;
  private config: DatabaseConfig;
  private initialized: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  static getInstance(config: DatabaseConfig): RealMCPServer {
    if (!RealMCPServer.instance) {
      RealMCPServer.instance = new RealMCPServer(config);
    }
    return RealMCPServer.instance;
  }

  /**
   * Initialize the MCP server with real database connections
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize PostgreSQL connection
      if (this.config.postgresql) {
        await this.initializePostgreSQL();
      }
      
      // Initialize MongoDB connection
      if (this.config.mongodb) {
        await this.initializeMongoDB();
      }
      
      this.initialized = true;
      console.log('✅ Real MCP Server initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Real MCP Server:', error);
      throw error;
    }
  }

  /**
   * Initialize PostgreSQL connection
   */
  private async initializePostgreSQL(): Promise<void> {
    try {
      const { host, port, database, username, password } = this.config.postgresql!;
      
      this.postgresClient = new Client({
        host,
        port,
        database,
        user: username,
        password
      });
      
      await this.postgresClient.connect();
      console.log(`✅ Connected to PostgreSQL: ${database} (${host}:${port})`);
    } catch (error) {
      console.error('❌ Failed to connect to PostgreSQL:', error);
      throw error;
    }
  }

  /**
   * Initialize MongoDB connection
   */
  private async initializeMongoDB(): Promise<void> {
    try {
      const { connectionString } = this.config.mongodb!;
      
      this.mongoClient = new MongoClient(connectionString);
      await this.mongoClient.connect();
      
      // Test connection by listing databases
      const adminDb = this.mongoClient.db('admin');
      const result = await adminDb.admin().listDatabases();
      const databases = result.databases.map(db => db.name);
      
      console.log(`✅ Connected to MongoDB: ${databases.join(', ')}`);
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  /**
   * Handle MCP tool calls
   */
  async handleToolCall(toolName: string, parameters: any): Promise<MCPToolResult> {
    try {
      // Route to appropriate handler based on tool name
      if (toolName.startsWith('mcp_postgresql_')) {
        return await this.handlePostgreSQLTool(toolName, parameters);
      } else if (toolName.startsWith('mcp_MongoDB_')) {
        return await this.handleMongoDBTool(toolName, parameters);
      } else {
        return {
          success: false,
          error: `Unknown MCP tool: ${toolName}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Tool call failed: ${error}`
      };
    }
  }

  // PostgreSQL MCP Tool Implementations
  private async handlePostgreSQLTool(toolName: string, parameters: any): Promise<MCPToolResult> {
    switch (toolName) {
      case 'mcp_postgresql_read_query':
        return await this.handlePostgreSQLReadQuery(parameters.query);
      case 'mcp_postgresql_write_query':
        return await this.handlePostgreSQLWriteQuery(parameters.query);
      case 'mcp_postgresql_list_tables':
        return await this.handlePostgreSQLListTables();
      case 'mcp_postgresql_describe_table':
        return await this.handlePostgreSQLDescribeTable(parameters.table_name);
      case 'mcp_postgresql_create_table':
        return await this.handlePostgreSQLCreateTable(parameters.query);
      case 'mcp_postgresql_alter_table':
        return await this.handlePostgreSQLAlterTable(parameters.query);
      case 'mcp_postgresql_drop_table':
        return await this.handlePostgreSQLDropTable(parameters.table_name);
      case 'mcp_postgresql_export_query':
        return await this.handlePostgreSQLExportQuery(parameters.query, parameters.format);
      default:
        return {
          success: false,
          error: `Unknown PostgreSQL MCP tool: ${toolName}`
        };
    }
  }

  private async handlePostgreSQLReadQuery(query: string): Promise<MCPToolResult> {
    try {
      if (!this.postgresClient) {
        throw new Error('PostgreSQL client not initialized');
      }

      const result = await this.postgresClient.query(query);
      
      return {
        success: true,
        data: result.rows
      };
    } catch (error) {
      return {
        success: false,
        error: `PostgreSQL read query failed: ${error}`
      };
    }
  }

  private async handlePostgreSQLWriteQuery(query: string): Promise<MCPToolResult> {
    try {
      if (!this.postgresClient) {
        throw new Error('PostgreSQL client not initialized');
      }

      const result = await this.postgresClient.query(query);
      
      return {
        success: true,
        data: {
          rowCount: result.rowCount,
          message: 'Write query executed successfully'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `PostgreSQL write query failed: ${error}`
      };
    }
  }

  private async handlePostgreSQLListTables(): Promise<MCPToolResult> {
    try {
      if (!this.postgresClient) {
        throw new Error('PostgreSQL client not initialized');
      }

      const query = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `;
      
      const result = await this.postgresClient.query(query);
      const tables = result.rows.map(row => row.table_name);
      
      return {
        success: true,
        data: tables
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list PostgreSQL tables: ${error}`
      };
    }
  }

  private async handlePostgreSQLDescribeTable(tableName: string): Promise<MCPToolResult> {
    try {
      if (!this.postgresClient) {
        throw new Error('PostgreSQL client not initialized');
      }

      // Get table columns
      const columnsQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          ordinal_position
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `;
      
      const columnsResult = await this.postgresClient.query(columnsQuery, [tableName]);
      
      // Get primary key
      const pkQuery = `
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY' 
          AND tc.table_schema = 'public' 
          AND tc.table_name = $1
      `;
      
      const pkResult = await this.postgresClient.query(pkQuery, [tableName]);
      
      // Get foreign keys
      const fkQuery = `
        SELECT 
          kcu.column_name,
          ccu.table_name AS referenced_table,
          ccu.column_name AS referenced_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_schema = 'public' 
          AND tc.table_name = $1
      `;
      
      const fkResult = await this.postgresClient.query(fkQuery, [tableName]);
      
      const columns = columnsResult.rows.map((col: any) => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        isPrimary: pkResult.rows.some((pk: any) => pk.column_name === col.column_name),
        isForeign: fkResult.rows.some((fk: any) => fk.column_name === col.column_name)
      }));
      
      return {
        success: true,
        data: {
          name: tableName,
          columns: columns,
          primaryKey: pkResult.rows[0]?.column_name || null,
          foreignKeys: fkResult.rows.map((fk: any) => ({
            column: fk.column_name,
            referencedTable: fk.referenced_table,
            referencedColumn: fk.referenced_column
          }))
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to describe PostgreSQL table: ${error}`
      };
    }
  }

  private async handlePostgreSQLCreateTable(query: string): Promise<MCPToolResult> {
    try {
      if (!this.postgresClient) {
        throw new Error('PostgreSQL client not initialized');
      }

      const result = await this.postgresClient.query(query);
      
      return {
        success: true,
        data: {
          message: 'Table created successfully',
          query: query
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create PostgreSQL table: ${error}`
      };
    }
  }

  private async handlePostgreSQLAlterTable(query: string): Promise<MCPToolResult> {
    try {
      if (!this.postgresClient) {
        throw new Error('PostgreSQL client not initialized');
      }

      const result = await this.postgresClient.query(query);
      
      return {
        success: true,
        data: {
          message: 'Table altered successfully',
          query: query
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to alter PostgreSQL table: ${error}`
      };
    }
  }

  private async handlePostgreSQLDropTable(tableName: string): Promise<MCPToolResult> {
    try {
      if (!this.postgresClient) {
        throw new Error('PostgreSQL client not initialized');
      }

      const query = `DROP TABLE IF EXISTS ${tableName} CASCADE`;
      const result = await this.postgresClient.query(query);
      
      return {
        success: true,
        data: {
          message: 'Table dropped successfully',
          tableName: tableName
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to drop PostgreSQL table: ${error}`
      };
    }
  }

  private async handlePostgreSQLExportQuery(query: string, format: string): Promise<MCPToolResult> {
    try {
      if (!this.postgresClient) {
        throw new Error('PostgreSQL client not initialized');
      }

      const result = await this.postgresClient.query(query);
      
      let exportedData: any;
      switch (format.toLowerCase()) {
        case 'json':
          exportedData = JSON.stringify(result.rows, null, 2);
          break;
        case 'csv':
          // Simple CSV conversion
          const headers = Object.keys(result.rows[0] || {});
          const csvRows = [headers.join(',')];
          for (const row of result.rows) {
            csvRows.push(headers.map(header => `"${row[header]}"`).join(','));
          }
          exportedData = csvRows.join('\n');
          break;
        default:
          exportedData = result.rows;
      }
      
      return {
        success: true,
        data: {
          format: format,
          data: exportedData,
          rowCount: result.rows.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to export PostgreSQL query: ${error}`
      };
    }
  }

  // MongoDB MCP Tool Implementations
  private async handleMongoDBTool(toolName: string, parameters: any): Promise<MCPToolResult> {
    switch (toolName) {
      case 'mcp_MongoDB_connect':
        return await this.handleMongoDBConnect(parameters.connectionString);
      case 'mcp_MongoDB_list-databases':
        return await this.handleMongoDBListDatabases();
      case 'mcp_MongoDB_list-collections':
        return await this.handleMongoDBListCollections(parameters.database);
      case 'mcp_MongoDB_find':
        return await this.handleMongoDBFind(parameters.database, parameters.collection, parameters.filter);
      case 'mcp_MongoDB_count':
        return await this.handleMongoDBCount(parameters.database, parameters.collection, parameters.query);
      case 'mcp_MongoDB_insert-many':
        return await this.handleMongoDBInsertMany(parameters.database, parameters.collection, parameters.documents);
      case 'mcp_MongoDB_update-many':
        return await this.handleMongoDBUpdateMany(parameters.database, parameters.collection, parameters.filter, parameters.update);
      case 'mcp_MongoDB_delete-many':
        return await this.handleMongoDBDeleteMany(parameters.database, parameters.collection, parameters.filter);
      case 'mcp_MongoDB_aggregate':
        return await this.handleMongoDBAggregate(parameters.database, parameters.collection, parameters.pipeline);
      case 'mcp_MongoDB_create-collection':
        return await this.handleMongoDBCreateCollection(parameters.database, parameters.collection);
      case 'mcp_MongoDB_drop-collection':
        return await this.handleMongoDBDropCollection(parameters.database, parameters.collection);
      case 'mcp_MongoDB_create-index':
        return await this.handleMongoDBCreateIndex(parameters.database, parameters.collection, parameters.keys, parameters.name);
      case 'mcp_MongoDB_collection-schema':
        return await this.handleMongoDBCollectionSchema(parameters.database, parameters.collection);
      case 'mcp_MongoDB_explain':
        return await this.handleMongoDBExplain(parameters.database, parameters.collection, parameters.method);
      default:
        return {
          success: false,
          error: `Unknown MongoDB MCP tool: ${toolName}`
        };
    }
  }

  private async handleMongoDBConnect(connectionString: string): Promise<MCPToolResult> {
    try {
      if (!this.mongoClient) {
        throw new Error('MongoDB client not initialized');
      }

      // MongoDB is already connected, just return success
      return {
        success: true,
        data: { message: 'MongoDB connected' }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to connect to MongoDB: ${error}`
      };
    }
  }

  private async handleMongoDBListDatabases(): Promise<MCPToolResult> {
    try {
      if (!this.mongoClient) {
        throw new Error('MongoDB client not initialized');
      }

      const adminDb = this.mongoClient.db('admin');
      const result = await adminDb.admin().listDatabases();
      const databases = result.databases.map(db => db.name);
      
      return {
        success: true,
        data: databases
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list MongoDB databases: ${error}`
      };
    }
  }

  private async handleMongoDBListCollections(database: string): Promise<MCPToolResult> {
    try {
      if (!this.mongoClient) {
        throw new Error('MongoDB client not initialized');
      }

      const db = this.mongoClient.db(database);
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map(col => col.name);
      
      return {
        success: true,
        data: collectionNames
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list MongoDB collections: ${error}`
      };
    }
  }

  private async handleMongoDBFind(database: string, collection: string, filter: any): Promise<MCPToolResult> {
    try {
      if (!this.mongoClient) {
        throw new Error('MongoDB client not initialized');
      }

      const db = this.mongoClient.db(database);
      const coll = db.collection(collection);
      
      const documents = await coll.find(filter || {}).limit(10).toArray();
      
      return {
        success: true,
        data: documents
      };
    } catch (error) {
      return {
        success: false,
        error: `MongoDB find failed: ${error}`
      };
    }
  }

  private async handleMongoDBCount(database: string, collection: string, query?: any): Promise<MCPToolResult> {
    try {
      if (!this.mongoClient) {
        throw new Error('MongoDB client not initialized');
      }

      const db = this.mongoClient.db(database);
      const coll = db.collection(collection);
      
      const count = await coll.countDocuments(query || {});
      
      return {
        success: true,
        data: count
      };
    } catch (error) {
      return {
        success: false,
        error: `MongoDB count failed: ${error}`
      };
    }
  }

  private async handleMongoDBInsertMany(database: string, collection: string, documents: any[]): Promise<MCPToolResult> {
    try {
      if (!this.mongoClient) {
        throw new Error('MongoDB client not initialized');
      }

      const db = this.mongoClient.db(database);
      const coll = db.collection(collection);
      
      const result = await coll.insertMany(documents);
      
      return {
        success: true,
        data: {
          insertedCount: result.insertedCount,
          insertedIds: Object.values(result.insertedIds)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `MongoDB insert failed: ${error}`
      };
    }
  }

  private async handleMongoDBUpdateMany(database: string, collection: string, filter: any, update: any): Promise<MCPToolResult> {
    try {
      if (!this.mongoClient) {
        throw new Error('MongoDB client not initialized');
      }

      const db = this.mongoClient.db(database);
      const coll = db.collection(collection);
      
      const result = await coll.updateMany(filter, update);
      
      return {
        success: true,
        data: {
          modifiedCount: result.modifiedCount,
          matchedCount: result.matchedCount
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `MongoDB update failed: ${error}`
      };
    }
  }

  private async handleMongoDBDeleteMany(database: string, collection: string, filter: any): Promise<MCPToolResult> {
    try {
      if (!this.mongoClient) {
        throw new Error('MongoDB client not initialized');
      }

      const db = this.mongoClient.db(database);
      const coll = db.collection(collection);
      
      const result = await coll.deleteMany(filter);
      
      return {
        success: true,
        data: {
          deletedCount: result.deletedCount
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `MongoDB delete failed: ${error}`
      };
    }
  }

  private async handleMongoDBAggregate(database: string, collection: string, pipeline: any[]): Promise<MCPToolResult> {
    try {
      if (!this.mongoClient) {
        throw new Error('MongoDB client not initialized');
      }

      const db = this.mongoClient.db(database);
      const coll = db.collection(collection);
      
      const documents = await coll.aggregate(pipeline).toArray();
      
      return {
        success: true,
        data: documents
      };
    } catch (error) {
      return {
        success: false,
        error: `MongoDB aggregate failed: ${error}`
      };
    }
  }

  private async handleMongoDBCreateCollection(database: string, collection: string): Promise<MCPToolResult> {
    try {
      if (!this.mongoClient) {
        throw new Error('MongoDB client not initialized');
      }

      const db = this.mongoClient.db(database);
      await db.createCollection(collection);
      
      return {
        success: true,
        data: {
          message: 'Collection created successfully',
          database: database,
          collection: collection
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create MongoDB collection: ${error}`
      };
    }
  }

  private async handleMongoDBDropCollection(database: string, collection: string): Promise<MCPToolResult> {
    try {
      if (!this.mongoClient) {
        throw new Error('MongoDB client not initialized');
      }

      const db = this.mongoClient.db(database);
      await db.dropCollection(collection);
      
      return {
        success: true,
        data: {
          message: 'Collection dropped successfully',
          database: database,
          collection: collection
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to drop MongoDB collection: ${error}`
      };
    }
  }

  private async handleMongoDBCreateIndex(database: string, collection: string, keys: any, name?: string): Promise<MCPToolResult> {
    try {
      if (!this.mongoClient) {
        throw new Error('MongoDB client not initialized');
      }

      const db = this.mongoClient.db(database);
      const coll = db.collection(collection);
      
      const result = await coll.createIndex(keys, { name });
      
      return {
        success: true,
        data: {
          message: 'Index created successfully',
          indexName: result,
          keys: keys
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create MongoDB index: ${error}`
      };
    }
  }

  private async handleMongoDBCollectionSchema(database: string, collection: string): Promise<MCPToolResult> {
    try {
      if (!this.mongoClient) {
        throw new Error('MongoDB client not initialized');
      }

      const db = this.mongoClient.db(database);
      const coll = db.collection(collection);
      
      // Get a sample of documents to infer schema
      const sampleDocs = await coll.find({}).limit(100).toArray();
      
      // Analyze the schema from sample documents
      const schema: any = {};
      const fieldTypes: { [key: string]: Set<string> } = {};
      
      for (const doc of sampleDocs) {
        for (const [key, value] of Object.entries(doc)) {
          if (!fieldTypes[key]) {
            fieldTypes[key] = new Set();
          }
          fieldTypes[key].add(typeof value);
        }
      }
      
      // Convert to schema format
      for (const [field, types] of Object.entries(fieldTypes)) {
        schema[field] = {
          type: Array.from(types),
          required: true // Assume required for now
        };
      }
      
      return {
        success: true,
        data: {
          database: database,
          collection: collection,
          schema: schema,
          sampleSize: sampleDocs.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get MongoDB collection schema: ${error}`
      };
    }
  }

  private async handleMongoDBExplain(database: string, collection: string, method: any): Promise<MCPToolResult> {
    try {
      if (!this.mongoClient) {
        throw new Error('MongoDB client not initialized');
      }

      const db = this.mongoClient.db(database);
      const coll = db.collection(collection);
      
      let result: any;
      
      if (method.name === 'find') {
        const cursor = coll.find(method.arguments.filter || {});
        if (method.arguments.limit) cursor.limit(method.arguments.limit);
        if (method.arguments.sort) cursor.sort(method.arguments.sort);
        result = await cursor.explain('executionStats');
      } else if (method.name === 'aggregate') {
        result = await coll.aggregate(method.arguments.pipeline).explain('executionStats');
      } else if (method.name === 'count') {
        // For count, we need to use a different approach since countDocuments doesn't return a cursor
        const countResult = await coll.countDocuments(method.arguments.query || {});
        result = {
          method: 'count',
          count: countResult,
          query: method.arguments.query || {}
        };
      } else {
        throw new Error(`Unsupported method for explain: ${method.name}`);
      }
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to explain MongoDB operation: ${error}`
      };
    }
  }

  /**
   * Get available MCP tools
   */
  getAvailableTools(): string[] {
    return [
      'mcp_postgresql_read_query',
      'mcp_postgresql_write_query',
      'mcp_postgresql_list_tables',
      'mcp_postgresql_describe_table',
      'mcp_postgresql_create_table',
      'mcp_postgresql_alter_table',
      'mcp_postgresql_drop_table',
      'mcp_postgresql_export_query',
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
    ];
  }

  /**
   * Cleanup database connections
   */
  async cleanup(): Promise<void> {
    try {
      if (this.postgresClient) {
        await this.postgresClient.end();
        console.log('✅ PostgreSQL connection closed');
      }
      
      if (this.mongoClient) {
        await this.mongoClient.close();
        console.log('✅ MongoDB connection closed');
      }
      
      console.log('✅ Real MCP Server cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }
}
