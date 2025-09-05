import { DatabaseConfig, QueryResult, CrossDatabaseResult, TableSchema, CollectionSchema, MigrationOptions } from '../types/index.js';
import { PostgreSQLService } from '../services/PostgreSQLService.js';
import { MongoDBService } from '../services/MongoDBService.js';
import { SchemaService } from '../services/SchemaService.js';
import { MigrationService } from '../services/MigrationService.js';
import { MarkdownGenerator } from '../services/MarkdownGenerator.js';
import { MongoDBSchemaGenerator } from '../services/MongoDBSchemaGenerator.js';
import { MongoDBSchemaMarkdownGenerator } from '../services/MongoDBSchemaMarkdownGenerator.js';
import { PostgreSQLSchemaFileParser } from '../services/PostgreSQLSchemaFileParser.js';
import { IntelligentMongoDBDesigner } from '../services/IntelligentMongoDBDesigner.js';
import { StoredProcedureAnalyzer } from '../services/StoredProcedureAnalyzer.js';
import { QueryPatternAnalyzer } from '../services/QueryPatternAnalyzer.js';
import { EnhancedMigrationService } from '../services/EnhancedMigrationService.js';
import { MCPClient, MCPHealthStatus } from './MCPClient.js';
import chalk from 'chalk';

export interface DatabaseStatus {
  postgresql: {
    connected: boolean;
    tableCount: number;
    lastQuery?: string;
    lastQueryTime?: Date;
    health: MCPHealthStatus['postgresql'];
  };
  mongodb: {
    connected: boolean;
    collectionCount: number;
    lastOperation?: string;
    lastOperationTime?: Date;
    health: MCPHealthStatus['mongodb'];
  };
  lastHealthCheck: Date;
}

export interface CrossDatabaseQueryOptions {
  postgresQuery: string;
  mongoQuery: any;
  mongoDatabase: string;
  mongoCollection: string;
  joinStrategy?: 'inner' | 'left' | 'right' | 'full';
  joinKey?: string;
  limit?: number;
  timeout?: number;
}

export interface SchemaComparisonResult {
  postgresqlSchema: TableSchema[];
  mongodbSchema: CollectionSchema[];
  differences: {
    missingInMongo: string[];
    missingInPostgres: string[];
    typeMismatches: Array<{
      field: string;
      postgresType: string;
      mongoType: string;
    }>;
    recommendations: string[];
  };
}

export class MCPAgent {
  private postgresqlService: PostgreSQLService;
  private mongodbService: MongoDBService;
  private schemaService: SchemaService;
  private migrationService: MigrationService;
  private markdownGenerator: MarkdownGenerator;
  private mongoDBSchemaGenerator: MongoDBSchemaGenerator;
  private mongoDBSchemaMarkdownGenerator: MongoDBSchemaMarkdownGenerator;
  private postgreSQLSchemaFileParser: PostgreSQLSchemaFileParser;
  private mcpClient: MCPClient;
  private intelligentMongoDBDesigner: IntelligentMongoDBDesigner;
  private storedProcedureAnalyzer: StoredProcedureAnalyzer;
  private queryPatternAnalyzer: QueryPatternAnalyzer;
  private enhancedMigrationService: EnhancedMigrationService;
  private config: DatabaseConfig;
  private status: DatabaseStatus;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.postgresqlService = new PostgreSQLService();
    this.mongodbService = new MongoDBService();
    this.schemaService = new SchemaService();
    this.migrationService = new MigrationService();
    this.markdownGenerator = new MarkdownGenerator();
    this.mongoDBSchemaGenerator = new MongoDBSchemaGenerator();
    this.mongoDBSchemaMarkdownGenerator = new MongoDBSchemaMarkdownGenerator();
    this.postgreSQLSchemaFileParser = new PostgreSQLSchemaFileParser();
    this.mcpClient = new MCPClient(config);
    
    this.intelligentMongoDBDesigner = new IntelligentMongoDBDesigner(this.postgresqlService);
    this.storedProcedureAnalyzer = new StoredProcedureAnalyzer(this.postgresqlService);
    this.queryPatternAnalyzer = new QueryPatternAnalyzer(this.postgresqlService);
    this.enhancedMigrationService = new EnhancedMigrationService(
      this.postgresqlService,
      this.intelligentMongoDBDesigner,
      this.storedProcedureAnalyzer,
      this.queryPatternAnalyzer,
      this.schemaService
    );
    this.status = {
      postgresql: {
        connected: false,
        tableCount: 0,
        health: { status: 'unknown', lastCheck: new Date(), responseTime: 0 }
      },
      mongodb: {
        connected: false,
        collectionCount: 0,
        health: { status: 'unknown', lastCheck: new Date(), responseTime: 0 }
      },
      lastHealthCheck: new Date()
    };
  }

  /**
   * Initialize the agent and connect to databases
   */
  async initialize(): Promise<void> {
    try {
      // Initialize MCP client first
      await this.mcpClient.initialize();
      
      if (this.config.postgresql) {
        try {
          await this.postgresqlService.initialize(this.config.postgresql);
          this.status.postgresql.connected = true;
          
          // Set PostgreSQL service reference in SchemaService
          this.schemaService.setPostgreSQLService(this.postgresqlService);
          
          // Get table count
          const tables = await this.postgresqlService.listTables();
          this.status.postgresql.tableCount = tables.length;
        } catch (error) {
          console.warn('⚠️ PostgreSQL service initialization failed, continuing without PostgreSQL');
          this.status.postgresql.connected = false;
          this.status.postgresql.tableCount = 0;
        }
      }
      
      if (this.config.mongodb) {
        try {
          await this.mongodbService.initialize(this.config.mongodb);
          this.status.mongodb.connected = true;
          
          // Get collection count
          const collections = await this.mongodbService.listCollections(this.config.mongodb.database || 'default');
          this.status.mongodb.collectionCount = collections.length;
        } catch (error) {
          console.warn('⚠️ MongoDB service initialization failed, continuing without MongoDB');
          this.status.mongodb.connected = false;
          this.status.mongodb.collectionCount = 0;
        }
      }
      
      // Start health monitoring
      this.startHealthChecks();
      
      // Check if at least one service is connected
      if (this.status.postgresql.connected || this.status.mongodb.connected) {
        console.log('✅ MCP Agent ready (some services may be unavailable)');
      } else {
        console.warn('⚠️ MCP Agent initialized but no database services are connected');
      }
    } catch (error) {
      console.error('❌ Failed to initialize MCP Agent:', error);
      throw error;
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Only check health every 5 minutes instead of constantly
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 300000); // 300 seconds = 5 minutes
  }

  /**
   * Perform a manual health check (called by user or on demand)
   */
  async performManualHealthCheck(): Promise<void> {
    console.log('🏥 Performing manual health check...');
    await this.performHealthCheck();
  }

  /**
   * Perform health check
   */
  async performHealthCheck(): Promise<void> {
    try {
      const healthStatus = await this.mcpClient.performHealthCheck();
      
      this.status.postgresql.health = healthStatus.postgresql;
      this.status.mongodb.health = healthStatus.mongodb;
      this.status.lastHealthCheck = new Date();
      
      // Update connection status based on health
      this.status.postgresql.connected = healthStatus.postgresql.status === 'healthy';
      this.status.mongodb.connected = healthStatus.mongodb.status === 'healthy';
      
      console.log('🏥 Health check completed:', {
        postgresql: this.status.postgresql.health.status,
        mongodb: this.status.mongodb.health.status
      });
    } catch (error) {
      console.error('❌ Health check failed:', error);
    }
  }

  /**
   * Get current database status
   */
  getStatus(): DatabaseStatus {
    return this.status;
  }

  /**
   * Execute a PostgreSQL query
   */
  async executePostgreSQLQuery(query: string): Promise<QueryResult> {
    try {
      const startTime = Date.now();
      
      // Determine which MCP tool is being used based on query type
      let mcpTool = 'mcp_postgresql_read_query';
      if (query.trim().toUpperCase().startsWith('INSERT') || 
          query.trim().toUpperCase().startsWith('UPDATE') || 
          query.trim().toUpperCase().startsWith('DELETE') ||
          query.trim().toUpperCase().startsWith('CREATE') ||
          query.trim().toUpperCase().startsWith('ALTER') ||
          query.trim().toUpperCase().startsWith('DROP')) {
        mcpTool = 'mcp_postgresql_write_query';
      }
      
      console.log(chalk.gray(`Using MCP Tool: ${mcpTool}`));
      
      const result = await this.postgresqlService.executeQuery(query);
      const executionTime = Date.now() - startTime;
      
      // Update status
      this.status.postgresql.lastQuery = query;
      this.status.postgresql.lastQueryTime = new Date();
      
      return {
        ...result,
        executionTime
      };
    } catch (error) {
      return {
        success: false,
        error: `PostgreSQL query failed: ${error}`,
        executionTime: 0
      };
    }
  }

  /**
   * Execute a MongoDB operation
   */
  async executeMongoDBOperation(operation: string, database: string, collection: string, query: any): Promise<QueryResult> {
    try {
      const startTime = Date.now();
      
      // Map operation to MCP tool name
      const mcpToolMap: { [key: string]: string } = {
        'find': 'mcp_MongoDB_find',
        'count': 'mcp_MongoDB_count',
        'insert': 'mcp_MongoDB_insert-many',
        'insert-many': 'mcp_MongoDB_insert-many',
        'update': 'mcp_MongoDB_update-many',
        'update-many': 'mcp_MongoDB_update-many',
        'delete': 'mcp_MongoDB_delete-many',
        'delete-many': 'mcp_MongoDB_delete-many',
        'aggregate': 'mcp_MongoDB_aggregate',
        'create-collection': 'mcp_MongoDB_create-collection',
        'drop-collection': 'mcp_MongoDB_drop-collection',
        'create-index': 'mcp_MongoDB_create-index',
        'collection-schema': 'mcp_MongoDB_collection-schema',
        'explain': 'mcp_MongoDB_explain'
      };
      
      const mcpTool = mcpToolMap[operation] || 'mcp_MongoDB_find';
      console.log(chalk.gray(`Using MCP Tool: ${mcpTool}`));
      
      const result = await this.mongodbService.executeOperation(operation, database, collection, query);
      const executionTime = Date.now() - startTime;
      
      // Update status
      this.status.mongodb.lastOperation = `${operation} on ${database}.${collection}`;
      this.status.mongodb.lastOperationTime = new Date();
      
      return {
        ...result,
        executionTime
      };
    } catch (error) {
      return {
        success: false,
        error: `MongoDB operation failed: ${error}`,
        executionTime: 0
      };
    }
  }

  /**
   * Execute cross-database query with advanced join strategies
   */
  async executeCrossDatabaseQuery(options: CrossDatabaseQueryOptions): Promise<CrossDatabaseResult> {
    try {
      const startTime = Date.now();
      
      // Execute both queries in parallel
      const [postgresResult, mongoResult] = await Promise.all([
        this.executePostgreSQLQuery(options.postgresQuery),
        this.executeMongoDBOperation('find', options.mongoDatabase, options.mongoCollection, options.mongoQuery)
      ]);

      // Perform cross-database join based on strategy
      let combinedData: any = {};
      
      if (options.joinStrategy && options.joinKey) {
        combinedData = await this.performCrossDatabaseJoin(
          postgresResult.data || [],
          mongoResult.data || [],
          options.joinKey,
          options.joinStrategy
        );
      } else {
        // Simple combination
        combinedData = {
          postgresql: postgresResult.data,
          mongodb: mongoResult.data
        };
      }

      const executionTime = Date.now() - startTime;
      
      return {
        postgresql: postgresResult,
        mongodb: mongoResult,
        combined: combinedData,
        executionTime,
        joinStrategy: options.joinStrategy,
        joinKey: options.joinKey
      };
    } catch (error) {
      return {
        error: `Cross-database query failed: ${error}`,
        executionTime: 0
      };
    }
  }

  /**
   * Perform cross-database join operation
   */
  private async performCrossDatabaseJoin(
    postgresData: any[],
    mongoData: any[],
    joinKey: string,
    strategy: 'inner' | 'left' | 'right' | 'full'
  ): Promise<any> {
    const result: any[] = [];
    const mongoMap = new Map();
    
    // Create index on MongoDB data
    for (const mongoDoc of mongoData) {
      const key = mongoDoc[joinKey];
      if (key !== undefined) {
        if (!mongoMap.has(key)) {
          mongoMap.set(key, []);
        }
        mongoMap.get(key).push(mongoDoc);
      }
    }
    
    // Perform join based on strategy
    for (const postgresRow of postgresData) {
      const key = postgresRow[joinKey];
      const mongoMatches = mongoMap.get(key) || [];
      
      if (strategy === 'inner' && mongoMatches.length === 0) {
        continue; // Skip if no matches in inner join
      }
      
      if (mongoMatches.length === 0) {
        // Left join - include postgres data with null mongo data
        result.push({
          postgresql: postgresRow,
          mongodb: null,
          joinKey: key
        });
      } else {
        // Include all matches
        for (const mongoMatch of mongoMatches) {
          result.push({
            postgresql: postgresRow,
            mongodb: mongoMatch,
            joinKey: key
          });
        }
      }
    }
    
    // Handle right and full joins
    if (strategy === 'right' || strategy === 'full') {
      const processedKeys = new Set(postgresData.map(row => row[joinKey]));
      
      for (const mongoDoc of mongoData) {
        const key = mongoDoc[joinKey];
        if (!processedKeys.has(key)) {
          result.push({
            postgresql: null,
            mongodb: mongoDoc,
            joinKey: key
          });
        }
      }
    }
    
    return result;
  }

  /**
   * Get PostgreSQL schema
   */
  async getPostgreSQLSchema(): Promise<TableSchema[]> {
    try {
      return await this.schemaService.getPostgreSQLSchema();
    } catch (error) {
      console.error('Failed to get PostgreSQL schema:', error);
      return [];
    }
  }

  /**
   * Get MongoDB schema for a specific database
   */
  async getMongoDBSchema(database: string): Promise<CollectionSchema[]> {
    try {
      return await this.schemaService.getMongoDBSchema(this.mongodbService, database);
    } catch (error) {
      console.error('Failed to get MongoDB schema:', error);
      return [];
    }
  }

  /**
   * Get MongoDB service instance
   */
  getMongoDBService(): MongoDBService {
    return this.mongodbService;
  }

  /**
   * Compare schemas between PostgreSQL and MongoDB
   */
  async compareSchemas(database: string): Promise<SchemaComparisonResult> {
    try {
      const [postgresSchema, mongoSchema] = await Promise.all([
        this.getPostgreSQLSchema(),
        this.getMongoDBSchema(database)
      ]);
      
      const differences = this.analyzeSchemaDifferences(postgresSchema, mongoSchema);
      
      return {
        postgresqlSchema: postgresSchema,
        mongodbSchema: mongoSchema,
        differences
      };
    } catch (error) {
      throw new Error(`Schema comparison failed: ${error}`);
    }
  }

  /**
   * Analyze differences between PostgreSQL and MongoDB schemas
   */
  private analyzeSchemaDifferences(
    postgresSchema: TableSchema[],
    mongoSchema: CollectionSchema[]
  ): SchemaComparisonResult['differences'] {
    const postgresTables = new Set(postgresSchema.map(t => t.name));
    const mongoCollections = new Set(mongoSchema.map(c => c.name));
    
    const missingInMongo = Array.from(postgresTables).filter(t => !mongoCollections.has(t));
    const missingInPostgres = Array.from(mongoCollections).filter(c => !postgresTables.has(c));
    
    const typeMismatches: Array<{
      field: string;
      postgresType: string;
      mongoType: string;
    }> = [];
    
    // Find common tables/collections and analyze type differences
    for (const postgresTable of postgresSchema) {
      const mongoCollection = mongoSchema.find(c => c.name === postgresTable.name);
      if (mongoCollection) {
        for (const postgresColumn of postgresTable.columns) {
          const mongoField = mongoCollection.fields.find(f => f.name === postgresColumn.name);
          if (mongoField && this.hasTypeMismatch(postgresColumn.type, mongoField.type)) {
            typeMismatches.push({
              field: `${postgresTable.name}.${postgresColumn.name}`,
              postgresType: postgresColumn.type,
              mongoType: mongoField.type
            });
          }
        }
      }
    }
    
    const recommendations = this.generateSchemaRecommendations(
      missingInMongo,
      missingInPostgres,
      typeMismatches
    );
    
    return {
      missingInMongo,
      missingInPostgres,
      typeMismatches,
      recommendations
    };
  }

  /**
   * Check if there's a type mismatch between PostgreSQL and MongoDB
   */
  private hasTypeMismatch(postgresType: string, mongoType: string): boolean {
    // Simple type mapping - this could be more sophisticated
    const typeMap: { [key: string]: string[] } = {
      'integer': ['number', 'int'],
      'bigint': ['number', 'long'],
      'text': ['string'],
      'varchar': ['string'],
      'boolean': ['boolean', 'bool'],
      'timestamp': ['date', 'datetime'],
      'numeric': ['number', 'decimal'],
      'json': ['object', 'document']
    };
    
    const compatibleTypes = typeMap[postgresType.toLowerCase()] || [];
    return !compatibleTypes.includes(mongoType.toLowerCase());
  }

  /**
   * Generate schema recommendations
   */
  private generateSchemaRecommendations(
    missingInMongo: string[],
    missingInPostgres: string[],
    typeMismatches: Array<{ field: string; postgresType: string; mongoType: string }>
  ): string[] {
    const recommendations: string[] = [];
    
    if (missingInMongo.length > 0) {
      recommendations.push(`Create MongoDB collections for missing tables: ${missingInMongo.join(', ')}`);
    }
    
    if (missingInPostgres.length > 0) {
      recommendations.push(`Create PostgreSQL tables for missing collections: ${missingInPostgres.join(', ')}`);
    }
    
    if (typeMismatches.length > 0) {
      recommendations.push(`Review type mappings for fields: ${typeMismatches.map(m => m.field).join(', ')}`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Schemas are well-aligned between databases');
    }
    
    return recommendations;
  }

  /**
   * Validate PostgreSQL schema integrity
   */
  async validatePostgreSQLSchema(): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const schema = await this.getPostgreSQLSchema();
      const issues: string[] = [];
      const recommendations: string[] = [];
      
      for (const table of schema) {
        // Check for primary keys
        if (!table.primaryKey) {
          issues.push(`Table '${table.name}' has no primary key`);
          recommendations.push(`Add a primary key to table '${table.name}'`);
        }
        
        // Check for naming conventions
        if (!/^[a-z_][a-z0-9_]*$/.test(table.name)) {
          issues.push(`Table '${table.name}' doesn't follow naming conventions`);
          recommendations.push(`Rename table '${table.name}' to follow snake_case convention`);
        }
        
        // Check column naming
        for (const column of table.columns) {
          if (!/^[a-z_][a-z0-9_]*$/.test(column.name)) {
            issues.push(`Column '${table.name}.${column.name}' doesn't follow naming conventions`);
            recommendations.push(`Rename column '${table.name}.${column.name}' to follow snake_case convention`);
          }
        }
      }
      
      return {
        valid: issues.length === 0,
        issues,
        recommendations
      };
    } catch (error) {
      return {
        valid: false,
        issues: [`Schema validation failed: ${error}`],
        recommendations: ['Check database connection and permissions']
      };
    }
  }

  /**
   * Migrate data from PostgreSQL to MongoDB
   */
  async migrateData(options: MigrationOptions): Promise<{
    success: boolean;
    migratedCount: number;
    errors: string[];
    duration: number;
  }> {
    try {
      const startTime = Date.now();
      const result = await this.migrationService.migratePostgreSQLToMongoDB(
        this.postgresqlService,
        this.mongodbService,
        options
      );
      const duration = Date.now() - startTime;
      
      return {
        success: result.success,
        migratedCount: result.data?.recordsMigrated || 0,
        errors: result.error ? [result.error] : [],
        duration
      };
    } catch (error) {
      return {
        success: false,
        migratedCount: 0,
        errors: [`Migration failed: ${error}`],
        duration: 0
      };
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    postgresql: {
      averageQueryTime: number;
      totalQueries: number;
      slowQueries: number;
    };
    mongodb: {
      averageOperationTime: number;
      totalOperations: number;
      slowOperations: number;
    };
  }> {
    // This would typically integrate with actual monitoring tools
    // For now, return basic metrics
    return {
      postgresql: {
        averageQueryTime: 0,
        totalQueries: 0,
        slowQueries: 0
      },
      mongodb: {
        averageOperationTime: 0,
        totalOperations: 0,
        slowOperations: 0
      }
    };
  }

  /**
   * Compare both databases and identify common and unique tables/collections
   */
  async compareDatabases(): Promise<{
    common: string[];
    postgresqlOnly: string[];
    mongodbOnly: string[];
    summary: string;
  }> {
    try {
      console.log('🔍 Comparing both databases...');
      
      // Get PostgreSQL tables
      const postgresTables = await this.postgresqlService.listTables();
      
      // Get MongoDB collections
      const mongoCollections = await this.mongodbService.listCollections('default');
      
      // Find common names (case-insensitive)
      const common: string[] = [];
      const postgresqlOnly: string[] = [];
      const mongodbOnly: string[] = [];
      
      // Check which PostgreSQL tables have MongoDB equivalents
      for (const table of postgresTables) {
        const hasMongoEquivalent = mongoCollections.some(
          collection => collection.toLowerCase() === table.toLowerCase()
        );
        
        if (hasMongoEquivalent) {
          common.push(table);
        } else {
          postgresqlOnly.push(table);
        }
      }
      
      // Check which MongoDB collections have PostgreSQL equivalents
      for (const collection of mongoCollections) {
        const hasPostgresEquivalent = postgresTables.some(
          (table: string) => table.toLowerCase() === (collection as string).toLowerCase()
        );
        
        if (!hasPostgresEquivalent) {
          mongodbOnly.push(collection as string);
        }
      }
      
      // Generate summary
      const summary = `
📊 Database Comparison Summary:

🔗 Common Tables/Collections (${common.length}):
${common.length > 0 ? common.map(name => `  • ${name}`).join('\n') : '  None found'}

🐘 PostgreSQL Only (${postgresqlOnly.length}):
${postgresqlOnly.length > 0 ? postgresqlOnly.map(name => `  • ${name}`).join('\n') : '  None found'}

🍃 MongoDB Only (${mongodbOnly.length}):
${mongodbOnly.length > 0 ? mongodbOnly.map(name => `  • ${name}`).join('\n') : '  None found'}

💡 Migration Opportunities:
${common.length > 0 ? `  • ${common.length} tables can be migrated from PostgreSQL to MongoDB` : '  • No common tables found for migration'}
${postgresqlOnly.length > 0 ? `  • ${postgresqlOnly.length} PostgreSQL tables could be added to MongoDB` : '  • No PostgreSQL tables have MongoDB equivalents'}
${mongodbOnly.length > 0 ? `  • ${mongodbOnly.length} MongoDB collections could be added to PostgreSQL` : '  • All MongoDB collections have PostgreSQL equivalents'}
      `.trim();
      
      return {
        common,
        postgresqlOnly,
        mongodbOnly,
        summary
      };
    } catch (error) {
      console.error('Failed to compare databases:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive database state comparison with record counts and differences
   */
  async getComprehensiveDatabaseState(): Promise<{
    postgresqlTables: Array<{ name: string; recordCount: number }>;
    mongodbCollections: Array<{ name: string; documentCount: number }>;
    commonEntities: Array<{
      name: string;
      postgresqlCount: number;
      mongodbCount: number;
      difference: number;
      status: 'synced' | 'postgresql_ahead' | 'mongodb_ahead' | 'missing_in_mongo' | 'missing_in_postgres';
    }>;
    postgresqlOnly: Array<{ name: string; recordCount: number }>;
    mongodbOnly: Array<{ name: string; documentCount: number }>;
    summary: string;
    totalPostgresqlRecords: number;
    totalMongoDBDocuments: number;
    overallSyncStatus: 'synced' | 'partially_synced' | 'out_of_sync';
  }> {
    try {
      console.log('🔍 Getting comprehensive database state...');
      
      // Get PostgreSQL tables with record counts
      const postgresTables = await this.postgresqlService.listTables();
      const postgresqlTables: Array<{ name: string; recordCount: number }> = [];
      
      for (const table of postgresTables) {
        try {
          const countResult = await this.postgresqlService.executeQuery(`SELECT COUNT(*) as count FROM ${table}`);
          if (countResult.success && countResult.data && countResult.data[0]) {
            postgresqlTables.push({
              name: table,
              recordCount: parseInt(countResult.data[0].count) || 0
            });
          } else {
            postgresqlTables.push({ name: table, recordCount: 0 });
          }
        } catch (error) {
          console.warn(`Failed to get count for table ${table}:`, error);
          postgresqlTables.push({ name: table, recordCount: 0 });
        }
      }
      
      // Get MongoDB collections with document counts
      const mongoCollections = await this.mongodbService.listCollections('default');
      const mongodbCollections: Array<{ name: string; documentCount: number }> = [];
      
      for (const collection of mongoCollections) {
        try {
          const countResult = await this.mongodbService.executeOperation('count', 'default', collection, {});
          if (countResult.success) {
            mongodbCollections.push({
              name: collection as string,
              documentCount: countResult.data || 0
            });
          } else {
            mongodbCollections.push({ name: collection as string, documentCount: 0 });
          }
        } catch (error) {
          console.warn(`Failed to get count for collection ${collection}:`, error);
          mongodbCollections.push({ name: collection as string, documentCount: 0 });
        }
      }
      
      // Analyze common entities and differences
      const commonEntities: Array<{
        name: string;
        postgresqlCount: number;
        mongodbCount: number;
        difference: number;
        status: 'synced' | 'postgresql_ahead' | 'mongodb_ahead' | 'missing_in_mongo' | 'missing_in_postgres';
      }> = [];
      
      const postgresqlOnly: Array<{ name: string; recordCount: number }> = [];
      const mongodbOnly: Array<{ name: string; documentCount: number }> = [];
      
      // Check PostgreSQL tables
      for (const postgresTable of postgresqlTables) {
        const mongoCollection = mongodbCollections.find(c => 
          c.name.toLowerCase() === postgresTable.name.toLowerCase()
        );
        
        if (mongoCollection) {
          // Common entity - analyze differences
          const difference = postgresTable.recordCount - mongoCollection.documentCount;
          let status: 'synced' | 'postgresql_ahead' | 'mongodb_ahead';
          
          if (difference === 0) {
            status = 'synced';
          } else if (difference > 0) {
            status = 'postgresql_ahead';
          } else {
            status = 'mongodb_ahead';
          }
          
          commonEntities.push({
            name: postgresTable.name,
            postgresqlCount: postgresTable.recordCount,
            mongodbCount: mongoCollection.documentCount,
            difference: Math.abs(difference),
            status
          });
        } else {
          // PostgreSQL only
          postgresqlOnly.push(postgresTable);
        }
      }
      
      // Check MongoDB collections
      for (const mongoCollection of mongodbCollections) {
        const postgresTable = postgresqlTables.find(t => 
          t.name.toLowerCase() === mongoCollection.name.toLowerCase()
        );
        
        if (!postgresTable) {
          // MongoDB only
          mongodbOnly.push(mongoCollection);
        }
      }
      
      // Calculate totals and overall status
      const totalPostgresqlRecords = postgresqlTables.reduce((sum, table) => sum + table.recordCount, 0);
      const totalMongoDBDocuments = mongodbCollections.reduce((sum, collection) => sum + collection.documentCount, 0);
      
      let overallSyncStatus: 'synced' | 'partially_synced' | 'out_of_sync';
      const syncedCount = commonEntities.filter(e => e.status === 'synced').length;
      const totalCommon = commonEntities.length;
      
      if (totalCommon === 0) {
        overallSyncStatus = 'out_of_sync';
      } else if (syncedCount === totalCommon && postgresqlOnly.length === 0 && mongodbOnly.length === 0) {
        overallSyncStatus = 'synced';
      } else if (syncedCount > 0) {
        overallSyncStatus = 'partially_synced';
      } else {
        overallSyncStatus = 'out_of_sync';
      }
      
      // Generate comprehensive summary
      const summary = this.generateComprehensiveDatabaseSummary({
        commonEntities,
        postgresqlOnly,
        mongodbOnly,
        totalPostgresqlRecords,
        totalMongoDBDocuments,
        overallSyncStatus
      });
      
      return {
        postgresqlTables,
        mongodbCollections,
        commonEntities,
        postgresqlOnly,
        mongodbOnly,
        summary,
        totalPostgresqlRecords,
        totalMongoDBDocuments,
        overallSyncStatus
      };
      
    } catch (error) {
      console.error('Failed to get comprehensive database state:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive database summary
   */
  private generateComprehensiveDatabaseSummary(data: {
    commonEntities: Array<{ name: string; postgresqlCount: number; mongodbCount: number; difference: number; status: string }>;
    postgresqlOnly: Array<{ name: string; recordCount: number }>;
    mongodbOnly: Array<{ name: string; documentCount: number }>;
    totalPostgresqlRecords: number;
    totalMongoDBDocuments: number;
    overallSyncStatus: string;
  }): string {
    const { commonEntities, postgresqlOnly, mongodbOnly, totalPostgresqlRecords, totalMongoDBDocuments, overallSyncStatus } = data;
    
    let summary = `📊 Comprehensive Database State Comparison\n\n`;
    
    // Overall status
    const statusEmoji = overallSyncStatus === 'synced' ? '✅' : overallSyncStatus === 'partially_synced' ? '⚠️' : '❌';
    summary += `${statusEmoji} Overall Sync Status: ${overallSyncStatus.replace('_', ' ').toUpperCase()}\n`;
    summary += `📈 Total Records: PostgreSQL (${totalPostgresqlRecords}) vs MongoDB (${totalMongoDBDocuments})\n\n`;
    
    // Common entities with differences
    if (commonEntities.length > 0) {
      summary += `🔗 Common Tables/Collections (${commonEntities.length}):\n`;
      commonEntities.forEach(entity => {
        const statusEmoji = entity.status === 'synced' ? '✅' : '⚠️';
        const differenceText = entity.difference > 0 ? 
          `${entity.difference} records ${entity.status === 'postgresql_ahead' ? 'missing in MongoDB' : 'missing in PostgreSQL'}` :
          'synced';
        
        summary += `  ${statusEmoji} ${entity.name}: PostgreSQL (${entity.postgresqlCount}) ↔ MongoDB (${entity.mongodbCount}) - ${differenceText}\n`;
      });
      summary += '\n';
    }
    
    // PostgreSQL only tables
    if (postgresqlOnly.length > 0) {
      summary += `❌ Missing in MongoDB (${postgresqlOnly.length}):\n`;
      postgresqlOnly.forEach(table => {
        summary += `  • ${table.name} (${table.recordCount} records) - No MongoDB equivalent\n`;
      });
      summary += '\n';
    }
    
    // MongoDB only collections
    if (mongodbOnly.length > 0) {
      summary += `❌ Missing in PostgreSQL (${mongodbOnly.length}):\n`;
      mongodbOnly.forEach(collection => {
        summary += `  • ${collection.name} (${collection.documentCount} documents) - No PostgreSQL equivalent\n`;
      });
      summary += '\n';
    }
    
    // Recommendations
    summary += `💡 Recommendations:\n`;
    if (postgresqlOnly.length > 0) {
      summary += `  • Create MongoDB collections for ${postgresqlOnly.length} missing tables\n`;
    }
    if (mongodbOnly.length > 0) {
      summary += `  • Create PostgreSQL tables for ${mongodbOnly.length} missing collections\n`;
    }
    
    const outOfSyncCount = commonEntities.filter(e => e.status !== 'synced').length;
    if (outOfSyncCount > 0) {
      summary += `  • Synchronize data for ${outOfSyncCount} out-of-sync entities\n`;
    }
    
    if (postgresqlOnly.length === 0 && mongodbOnly.length === 0 && outOfSyncCount === 0) {
      summary += `  • Databases are fully synchronized! 🎉\n`;
    }
    
    return summary;
  }

  /**
   * Analyze PostgreSQL schema comprehensively and generate markdown documentation
   */
  async analyzePostgreSQLSchema(): Promise<{
    success: boolean;
    filepath?: string;
    error?: string;
    summary?: any;
  }> {
    try {
      console.log('🔍 Starting comprehensive PostgreSQL schema analysis...');
      
      // Check if PostgreSQL is connected
      if (!this.status.postgresql.connected) {
        throw new Error('PostgreSQL is not connected. Please check your connection settings.');
      }

      // Extract comprehensive schema
      const schema = await this.schemaService.getComprehensivePostgreSQLSchema();
      
      // Generate markdown documentation (which now includes enhanced ER diagrams)
      const filepath = await this.markdownGenerator.generatePostgreSQLSchemaMarkdown(schema);
      
      console.log('✅ PostgreSQL schema analysis completed successfully');
      console.log('🗺️ Enhanced ER diagrams are included in the documentation');
      
      return {
        success: true,
        filepath,
        summary: schema.summary
      };
    } catch (error) {
      console.error('❌ PostgreSQL schema analysis failed:', error);
      return {
        success: false,
        error: `Schema analysis failed: ${error}`
      };
    }
  }

  /**
   * Generate ER diagram separately (for direct ER diagram requests)
   */
  async generateERDiagram(
    format: 'mermaid' | 'plantuml' | 'dbml' | 'json' = 'mermaid',
    options?: {
      includeIndexes?: boolean;
      includeConstraints?: boolean;
      includeDataTypes?: boolean;
      includeCardinality?: boolean;
      includeDescriptions?: boolean;
      outputPath?: string;
      diagramStyle?: 'detailed' | 'simplified' | 'minimal';
    }
  ): Promise<{
    success: boolean;
    filepath?: string;
    error?: string;
    metadata?: any;
  }> {
    try {
      console.log(`🗺️ Generating ER diagram in ${format.toUpperCase()} format...`);
      
      // Check if PostgreSQL is connected
      if (!this.status.postgresql.connected) {
        throw new Error('PostgreSQL is not connected. Please check your connection settings.');
      }

      // Generate ER diagram using the schema service
      const result = await this.schemaService.generateERDiagram(format, options);
      
      if (result.success) {
        console.log(`✅ ER diagram generated successfully in ${format.toUpperCase()} format`);
        return {
          success: true,
          filepath: result.filePath,
          metadata: result.metadata
        };
      } else {
        throw new Error(result.error || 'Failed to generate ER diagram');
      }
      
    } catch (error) {
      console.error('❌ ER diagram generation failed:', error);
      return {
        success: false,
        error: `ER diagram generation failed: ${error}`
      };
    }
  }

  /**
   * Generate comprehensive ER diagram documentation
   */
  async generateERDocumentation(): Promise<{
    success: boolean;
    filepath?: string;
    error?: string;
    metadata?: any;
  }> {
    try {
      console.log('📚 Generating comprehensive ER diagram documentation...');
      
      // Check if PostgreSQL is connected
      if (!this.status.postgresql.connected) {
        throw new Error('PostgreSQL is not connected. Please check your connection settings.');
      }

      // Generate ER documentation using the schema service
      const filepath = await this.schemaService.generateERDocumentation();
      
      console.log('✅ ER diagram documentation generated successfully');
      return {
        success: true,
        filepath,
        metadata: {
          generatedAt: new Date(),
          type: 'ER Documentation'
        }
      };
      
    } catch (error) {
      console.error('❌ ER diagram documentation generation failed:', error);
      return {
        success: false,
        error: `ER diagram documentation generation failed: ${error}`
      };
    }
  }

  /**
   * Generate MongoDB schema from PostgreSQL schema
   */
  async generateMongoDBSchemaFromPostgreSQL(): Promise<{
    success: boolean;
    filepath?: string;
    error?: string;
    postgresSchema?: any;
    mongodbSchema?: any;
    compatibilityReport?: any;
  }> {
    try {
      console.log('🔍 Starting PostgreSQL to MongoDB schema conversion...');
      
      let postgresSchema: any;
      let sourceInfo: string = '';
      
      // First, try to find and parse existing PostgreSQL schema file
      const fileAvailability = this.postgreSQLSchemaFileParser.isPostgreSQLSchemaFileAvailable(24); // 24 hours
      
      if (fileAvailability.available && fileAvailability.filepath) {
        try {
          postgresSchema = await this.postgreSQLSchemaFileParser.parsePostgreSQLSchemaFile(fileAvailability.filepath);
          sourceInfo = `Parsed from existing file: ${fileAvailability.filepath}`;
        } catch (parseError) {
          console.warn(`⚠️ Failed to parse existing schema file, will generate new one: ${parseError}`);
          fileAvailability.available = false;
        }
      }
      
      // If no recent file or parsing failed, generate new PostgreSQL schema
      if (!fileAvailability.available || !postgresSchema) {
        console.log('📝 No recent PostgreSQL schema file found, generating new one...');
        
        if (!this.status.postgresql.connected) {
          throw new Error('PostgreSQL is not connected. Please check your connection settings.');
        }
        
        postgresSchema = await this.schemaService.getComprehensivePostgreSQLSchema();
        sourceInfo = 'Generated from live PostgreSQL database';
        console.log(`✅ Generated new PostgreSQL schema with ${postgresSchema.tables.length} tables`);
      }
      
      // Validate that we have table information
      if (!postgresSchema.tables || postgresSchema.tables.length === 0) {
        throw new Error('No tables found in PostgreSQL schema');
      }
      
      // Converting PostgreSQL tables to MongoDB collections...
      
      // Generate MongoDB schema
      const conversionResult = await this.mongoDBSchemaGenerator.generateMongoDBSchemaFromPostgreSQL(
        postgresSchema.tables
      );
      
      if (!conversionResult.success) {
        throw new Error(`MongoDB schema generation failed: ${conversionResult.error}`);
      }
      
      // Generate markdown documentation
      const filepath = await this.mongoDBSchemaMarkdownGenerator.generateMongoDBSchemaMarkdown(conversionResult);
      
      console.log('✅ PostgreSQL to MongoDB schema conversion completed successfully');
      
      return {
        success: true,
        filepath,
        postgresSchema: {
          tables: postgresSchema.tables,
          source: sourceInfo,
          totalTables: postgresSchema.tables.length
        },
        mongodbSchema: {
          collections: conversionResult.mongodbSchema,
          totalCollections: conversionResult.mongodbSchema.length
        },
        compatibilityReport: conversionResult.compatibilityReport
      };
    } catch (error) {
      console.error('❌ PostgreSQL to MongoDB schema conversion failed:', error);
      return {
        success: false,
        error: `Schema conversion failed: ${error}`
      };
    }
  }

  /**
   * Get comprehensive PostgreSQL schema without generating markdown
   */
  async getComprehensivePostgreSQLSchema(): Promise<any> {
    try {
      if (!this.status.postgresql.connected) {
        throw new Error('PostgreSQL is not connected');
      }
      
      return await this.schemaService.getComprehensivePostgreSQLSchema();
    } catch (error) {
      console.error('Failed to get comprehensive schema:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    await this.mcpClient.cleanup();
    console.log('✅ MCP Agent cleanup completed');
  }

  /**
   * List MongoDB collections using MCP tools
   */
  async listMongoDBCollections(database: string): Promise<string[]> {
    try {
      return await this.mongodbService.listCollections(database);
    } catch (error) {
      console.error(`Failed to list MongoDB collections in ${database}:`, error);
      return [];
    }
  }

  /**
   * Analyze PostgreSQL dependencies and generate migration order
   */
  async analyzeMigrationDependencies(): Promise<{
    phases: Array<{
      phase: number;
      name: string;
      description: string;
      tables: Array<{
        name: string;
        recordCount: number;
        dependencies: string[];
        migrationStrategy: 'standalone' | 'embedded' | 'referenced';
        reason: string;
        needsMigration: boolean;
        currentMongoDBCount: number;
      }>;
    }>;
    summary: string;
    totalPhases: number;
    totalTablesToMigrate: number;
  }> {
    try {
      console.log('🔍 Analyzing PostgreSQL dependencies for migration ordering...');
      
      // Get current database state to see what's already migrated
      const currentState = await this.getComprehensiveDatabaseState();
      
      // Get comprehensive schema with foreign keys
      const schema = await this.schemaService.getComprehensivePostgreSQLSchema();
      
      // Build dependency graph
      const dependencyGraph = this.buildDependencyGraph(schema.tables);
      
      // Generate migration phases with current state awareness
      const phases = await this.generateMigrationPhasesWithState(dependencyGraph, schema.tables, currentState);
      
      // Count tables that actually need migration
      const totalTablesToMigrate = phases.reduce((total, phase) => 
        total + phase.tables.filter(table => table.needsMigration).length, 0
      );
      
      // Generate summary
      const summary = this.generateMigrationOrderSummary(phases, totalTablesToMigrate);
      
      return {
        phases,
        summary,
        totalPhases: phases.length,
        totalTablesToMigrate
      };
      
    } catch (error) {
      console.error('Failed to analyze migration dependencies:', error);
      throw error;
    }
  }

  /**
   * Build dependency graph from PostgreSQL schema
   */
  private buildDependencyGraph(tables: any[]): Map<string, { dependencies: string[]; dependents: string[] }> {
    const graph = new Map();
    
    // Initialize graph with ALL tables (including those without foreign keys)
    for (const table of tables) {
      graph.set(table.name, { dependencies: [], dependents: [] });
    }
    
    // Build relationships for tables that have foreign keys
    for (const table of tables) {
      if (table.foreignKeys && table.foreignKeys.length > 0) {
        for (const fk of table.foreignKeys) {
          const referencedTable = fk.referencedTable;
          
          // Add dependency
          if (graph.has(table.name)) {
            graph.get(table.name).dependencies.push(referencedTable);
          }
          
          // Add dependent
          if (graph.has(referencedTable)) {
            graph.get(referencedTable).dependents.push(table.name);
          }
        }
      }
      // Tables without foreign keys will remain with empty dependencies array
      // This is correct - they are independent tables
    }
    
    return graph;
  }

  /**
   * Generate migration phases based on dependencies with current state awareness
   */
  private async generateMigrationPhasesWithState(dependencyGraph: Map<string, any>, tables: any[], currentState: any): Promise<Array<{
    phase: number;
    name: string;
    description: string;
    tables: Array<{
      name: string;
      recordCount: number;
      dependencies: string[];
      migrationStrategy: 'standalone' | 'embedded' | 'referenced';
      reason: string;
      needsMigration: boolean;
      currentMongoDBCount: number;
    }>;
  }>> {
    const phases: Array<{
      phase: number;
      name: string;
      description: string;
      tables: Array<{
        name: string;
        recordCount: number;
        dependencies: string[];
        migrationStrategy: 'standalone' | 'embedded' | 'referenced';
        reason: string;
        needsMigration: boolean;
        currentMongoDBCount: number;
      }>;
    }> = [];
    
    // Phase 1: Independent tables (no foreign keys)
    const phase1Tables: Array<{
      name: string;
      recordCount: number;
      dependencies: string[];
      migrationStrategy: 'standalone' | 'embedded' | 'referenced';
      reason: string;
      needsMigration: boolean;
      currentMongoDBCount: number;
    }> = [];
    for (const table of tables) {
      if (!table.foreignKeys || table.foreignKeys.length === 0) {
        const recordCount = await this.getTableRecordCount(table.name);
        
        // Check if table already exists in MongoDB
        const mongoCollection = currentState.mongodbCollections.find((c: any) => c.name === table.name);
        const currentMongoDBCount = mongoCollection ? mongoCollection.documentCount : 0;
        const needsMigration = currentMongoDBCount === 0 || currentMongoDBCount !== recordCount;
        
        phase1Tables.push({
          name: table.name,
          recordCount,
          dependencies: [],
          migrationStrategy: this.determineMigrationStrategy(table, 'independent'),
          reason: needsMigration ? 'No dependencies - can migrate first' : 'Already migrated and synced',
          needsMigration,
          currentMongoDBCount
        });
      }
    }
    
    if (phase1Tables.length > 0) {
      phases.push({
        phase: 1,
        name: 'Independent Tables',
        description: 'Tables with no foreign key dependencies - safe to migrate first',
        tables: phase1Tables
      });
    }
    
    // Phase 2: Tables with dependencies that can be resolved from Phase 1
    const phase2Tables: Array<{
      name: string;
      recordCount: number;
      dependencies: string[];
      migrationStrategy: 'standalone' | 'embedded' | 'referenced';
      reason: string;
      needsMigration: boolean;
      currentMongoDBCount: number;
    }> = [];
    for (const table of tables) {
      if (table.foreignKeys && table.foreignKeys.length > 0) {
        // Check if ALL dependencies are either in Phase 1 or are the table itself (self-reference)
        const allDependenciesMet = table.foreignKeys.every((fk: any) => 
          phase1Tables.some(t => t.name === fk.referencedTable) ||
          fk.referencedTable === table.name // Handle self-references
        );
        
        if (allDependenciesMet) {
          const recordCount = await this.getTableRecordCount(table.name);
          
          // Check if table already exists in MongoDB
          const mongoCollection = currentState.mongodbCollections.find((c: { name: string; documentCount: number }) => c.name === table.name);
          const currentMongoDBCount = mongoCollection ? mongoCollection.documentCount : 0;
          const needsMigration = currentMongoDBCount === 0 || currentMongoDBCount !== recordCount;
          
          phase2Tables.push({
            name: table.name,
            recordCount,
            dependencies: table.foreignKeys.map((fk: any) => fk.referencedTable),
            migrationStrategy: this.determineMigrationStrategy(table, 'dependent'),
            reason: needsMigration ? 'All dependencies met from Phase 1' : 'Already migrated and synced',
            needsMigration,
            currentMongoDBCount
          });
        }
      }
    }
    
    // Phase 3: Tables with mixed dependencies (some from Phase 1, some from Phase 2)
    const phase3Tables: Array<{
      name: string;
      recordCount: number;
      dependencies: string[];
      migrationStrategy: 'standalone' | 'embedded' | 'referenced';
      reason: string;
      needsMigration: boolean;
      currentMongoDBCount: number;
    }> = [];
    for (const table of tables) {
      if (table.foreignKeys && table.foreignKeys.length > 0) {
        // Check if table has dependencies from both Phase 1 and Phase 2
        const phase1Dependencies = table.foreignKeys.filter((fk: any) => 
          phase1Tables.some(t => t.name === fk.referencedTable)
        );
        const phase2Dependencies = table.foreignKeys.filter((fk: any) => 
          phase2Tables.some(t => t.name === fk.referencedTable)
        );
        
        // Include if table has dependencies from both phases
        if (phase1Dependencies.length > 0 && phase2Dependencies.length > 0) {
          const recordCount = await this.getTableRecordCount(table.name);
          
          // Check if table already exists in MongoDB
          const mongoCollection = currentState.mongodbCollections.find((c: { name: string; documentCount: number }) => c.name === table.name);
          const currentMongoDBCount = mongoCollection ? mongoCollection.documentCount : 0;
          const needsMigration = currentMongoDBCount === 0 || currentMongoDBCount !== recordCount;
          
          phase3Tables.push({
            name: table.name,
            recordCount,
            dependencies: table.foreignKeys.map((fk: any) => fk.referencedTable),
            migrationStrategy: this.determineMigrationStrategy(table, 'mixed'),
            reason: needsMigration ? 'Mixed dependencies from Phase 1 and Phase 2' : 'Already migrated and synced',
            needsMigration,
            currentMongoDBCount
          });
        }
      }
    }
    
    // Phase 4: Tables with dependencies that can be resolved from previous phases
    const phase4Tables: Array<{
      name: string;
      recordCount: number;
      dependencies: string[];
      migrationStrategy: 'standalone' | 'embedded' | 'referenced';
      reason: string;
      needsMigration: boolean;
      currentMongoDBCount: number;
    }> = [];
    for (const table of tables) {
      if (table.foreignKeys && table.foreignKeys.length > 0) {
        // Check if ALL dependencies are resolved from previous phases
        const allDependenciesMet = table.foreignKeys.every((fk: any) => 
          phase1Tables.some(t => t.name === fk.referencedTable) ||
          phase2Tables.some(t => t.name === fk.referencedTable) ||
          phase3Tables.some(t => t.name === fk.referencedTable) ||
          fk.referencedTable === table.name // Handle self-references
        );
        
        // Only include if not already in previous phases
        const alreadyIncluded = phase1Tables.some(t => t.name === table.name) ||
                               phase2Tables.some(t => t.name === table.name) ||
                               phase3Tables.some(t => t.name === table.name);
        
        if (allDependenciesMet && !alreadyIncluded) {
          const recordCount = await this.getTableRecordCount(table.name);
          
          // Check if table already exists in MongoDB
          const mongoCollection = currentState.mongodbCollections.find((c: { name: string; documentCount: number }) => c.name === table.name);
          const currentMongoDBCount = mongoCollection ? mongoCollection.documentCount : 0;
          const needsMigration = currentMongoDBCount === 0 || currentMongoDBCount !== recordCount;
          
          phase4Tables.push({
            name: table.name,
            recordCount,
            dependencies: table.foreignKeys.map((fk: any) => fk.referencedTable),
            migrationStrategy: this.determineMigrationStrategy(table, 'dependent'),
            reason: needsMigration ? 'All dependencies met from previous phases' : 'Already migrated and synced',
            needsMigration,
            currentMongoDBCount
          });
        }
      }
    }
    
    if (phase2Tables.length > 0) {
      phases.push({
        phase: 2,
        name: 'Dependent Tables',
        description: 'Tables with dependencies on Phase 1 tables',
        tables: phase2Tables
      });
    }
    
    if (phase3Tables.length > 0) {
      phases.push({
        phase: 3,
        name: 'Mixed Dependencies',
        description: 'Tables with dependencies from both Phase 1 and Phase 2',
        tables: phase3Tables
      });
    }
    
    if (phase4Tables.length > 0) {
      phases.push({
        phase: 4,
        name: 'Resolved Dependencies',
        description: 'Tables with dependencies resolved from previous phases',
        tables: phase4Tables
      });
    }
    

    
    // Phase 5: Complex relationships (many-to-many, etc.)
    const phase5Tables: Array<{
      name: string;
      recordCount: number;
      dependencies: string[];
      migrationStrategy: 'standalone' | 'embedded' | 'referenced';
      reason: string;
      needsMigration: boolean;
      currentMongoDBCount: number;
    }> = [];
    for (const table of tables) {
      if (table.foreignKeys && table.foreignKeys.length > 0) {
        // Check if table has dependencies that are not in Phase 1, 2, 3, or 4
        const hasComplexDependencies = table.foreignKeys.some((fk: any) => 
          !phase1Tables.some(t => t.name === fk.referencedTable) &&
          !phase2Tables.some(t => t.name === fk.referencedTable) &&
          !phase3Tables.some(t => t.name === fk.referencedTable) &&
          !phase4Tables.some(t => t.name === fk.referencedTable)
        );
        
        if (hasComplexDependencies) {
          const recordCount = await this.getTableRecordCount(table.name);
          
          // Check if table already exists in MongoDB
          const mongoCollection = currentState.mongodbCollections.find((c: { name: string; documentCount: number }) => c.name === table.name);
          const currentMongoDBCount = mongoCollection ? mongoCollection.documentCount : 0;
          const needsMigration = currentMongoDBCount === 0 || currentMongoDBCount !== recordCount;
          
          phase5Tables.push({
            name: table.name,
            recordCount,
            dependencies: table.foreignKeys.map((fk: any) => fk.referencedTable),
            migrationStrategy: this.determineMigrationStrategy(table, 'complex'),
            reason: needsMigration ? 'Complex dependencies requiring careful ordering' : 'Already migrated and synced',
            needsMigration,
            currentMongoDBCount
          });
        }
      }
    }
    
    if (phase5Tables.length > 0) {
      phases.push({
        phase: 5,
        name: 'Complex Relationships',
        description: 'Tables with complex dependency relationships',
        tables: phase5Tables
      });
    }
    
    return phases;
  }

  /**
   * Determine migration strategy for a table
   */
  private determineMigrationStrategy(table: any, phaseType: string): 'standalone' | 'embedded' | 'referenced' {
    // Small lookup tables should be standalone + embedded
    if (table.recordCount < 100) {
      return 'standalone';
    }
    
    // Junction tables should be embedded in parent documents
    if (table.name.includes('_') && table.foreignKeys && table.foreignKeys.length === 2) {
      return 'embedded';
    }
    
    // Large tables with relationships should use references
    if (table.foreignKeys && table.foreignKeys.length > 0) {
      return 'referenced';
    }
    
    // Default to standalone
    return 'standalone';
  }

  /**
   * Get table record count (cached or fetch)
   */
  private async getTableRecordCount(tableName: string): Promise<number> {
    try {
      // Fetch actual record count from PostgreSQL
      const countResult = await this.postgresqlService.executeQuery(`SELECT COUNT(*) as count FROM ${tableName}`);
      if (countResult.success && countResult.data && countResult.data[0]) {
        return parseInt(countResult.data[0].count) || 0;
      }
      return 0;
    } catch (error) {
      console.warn(`Failed to get count for table ${tableName}:`, error);
      return 0;
    }
  }



  /**
   * Generate migration order summary
   */
  private generateMigrationOrderSummary(phases: any[], totalTablesToMigrate: number): string {
    let summary = `🚀 PostgreSQL to MongoDB Migration Plan\n\n`;
    summary += `📊 Total Phases: ${phases.length}\n`;
    summary += `📋 Tables to Migrate: ${totalTablesToMigrate}\n\n`;
    
    for (const phase of phases) {
      // Only show tables that need migration
      const tablesToMigrate = phase.tables.filter((table: any) => table.needsMigration);
      
      if (tablesToMigrate.length > 0) {
        summary += `📋 Phase ${phase.phase}: ${phase.name}\n`;
        summary += `   ${phase.description}\n`;
        summary += `   Tables to Migrate (${tablesToMigrate.length}):\n`;
        
        for (const table of tablesToMigrate) {
          const strategyEmoji = table.migrationStrategy === 'standalone' ? '📁' : 
                              table.migrationStrategy === 'embedded' ? '🔗' : '🔗';
          const statusEmoji = table.currentMongoDBCount > 0 ? '⚠️' : '❌';
          summary += `     ${strategyEmoji} ${table.name} (${table.recordCount} records) - ${table.migrationStrategy.toUpperCase()}\n`;
          if (table.currentMongoDBCount > 0) {
            summary += `        Current MongoDB: ${table.currentMongoDBCount} documents ${statusEmoji}\n`;
          }
          if (table.dependencies.length > 0) {
            summary += `        Dependencies: ${table.dependencies.join(', ')}\n`;
          }
        }
        summary += '\n';
      }
    }
    
    if (totalTablesToMigrate === 0) {
      summary += `🎉 All tables are already migrated and synchronized!\n`;
    } else {
      summary += `💡 Migration Strategy:\n`;
      summary += `   📁 Standalone: Independent collections (language, category, country)\n`;
      summary += `   🔗 Embedded: Data embedded in parent documents (film with embedded category)\n`;
      summary += `   🔗 Referenced: Large tables with document references (customer with address refs)\n`;
    }
    
    return summary;
  }

  /**
   * Migrate a specific table to MongoDB
   */
  async migrateTableToMongoDB(tableName: string, strategy: 'standalone' | 'embedded' | 'referenced'): Promise<{
    success: boolean;
    migratedCount: number;
    collectionName: string;
    strategy: string;
    duration: number;
    error?: string;
  }> {
    try {
      console.log(`🚀 Starting migration of table: ${tableName} using ${strategy} strategy`);
      
      const startTime = Date.now();
      
      // Get table data from PostgreSQL
      const postgresData = await this.postgresqlService.executeQuery(`SELECT * FROM ${tableName}`);
      if (!postgresData.success) {
        throw new Error(`Failed to fetch data from ${tableName}: ${postgresData.error}`);
      }
      
      const records = postgresData.data || [];
      console.log(`📊 Found ${records.length} records in ${tableName}`);
      
      // Transform data based on strategy
      let transformedData: any[];
      let collectionName: string;
      
      switch (strategy) {
        case 'standalone':
          transformedData = this.transformForStandaloneCollection(records, tableName);
          collectionName = tableName;
          break;
        case 'embedded':
          transformedData = this.transformForEmbeddedDocuments(records, tableName);
          collectionName = tableName;
          break;
        case 'referenced':
          transformedData = this.transformForReferencedDocuments(records, tableName);
          collectionName = tableName;
          break;
        default:
          throw new Error(`Unknown migration strategy: ${strategy}`);
      }
      
      // Create collection first if it doesn't exist
      try {
        await this.mongodbService.executeOperation('create-collection', 'default', collectionName, {});
      } catch (error) {
        // Collection might already exist, continue
        console.log(`Collection ${collectionName} might already exist, continuing...`);
      }
      
      // Insert into MongoDB using MCP tools
      const mongoResult = await this.mongodbService.executeOperation('insert', 'default', collectionName, transformedData);
      if (!mongoResult.success) {
        throw new Error(`Failed to insert into MongoDB: ${mongoResult.error}`);
      }
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ Successfully migrated ${tableName} to MongoDB`);
      console.log(`   Collection: ${collectionName}`);
      console.log(`   Records: ${transformedData.length}`);
      console.log(`   Strategy: ${strategy}`);
      console.log(`   Duration: ${duration}ms`);
      
      return {
        success: true,
        migratedCount: transformedData.length,
        collectionName,
        strategy,
        duration
      };
      
    } catch (error) {
      console.error(`❌ Failed to migrate table ${tableName}:`, error);
      return {
        success: false,
        migratedCount: 0,
        collectionName: tableName,
        strategy,
        duration: 0,
        error: String(error)
      };
    }
  }

  /**
   * Transform data for standalone collection
   */
  private transformForStandaloneCollection(records: any[], tableName: string): any[] {
    return records.map(record => ({
      ...record,
      _id: record.id || record[`${tableName}_id`] || record[`${tableName}_id`] || record.id,
      migrated_at: new Date().toISOString(),
      source_table: tableName
    }));
  }

  /**
   * Transform data for embedded documents
   */
  private transformForEmbeddedDocuments(records: any[], tableName: string): any[] {
    // This would be more complex in practice
    // For now, return as standalone but mark for embedding
    return records.map(record => ({
      ...record,
      _id: record.id || record[`${tableName}_id`] || record[`${tableName}_id`] || record.id,
      migrated_at: new Date().toISOString(),
      source_table: tableName,
      migration_note: 'Marked for embedding in parent documents'
    }));
  }

  /**
   * Transform data for referenced documents
   */
  private transformForReferencedDocuments(records: any[], tableName: string): any[] {
    // This would handle foreign key references
    return records.map(record => ({
      ...record,
      _id: record.id || record[`${tableName}_id`] || record[`${tableName}_id`] || record.id,
      migrated_at: new Date().toISOString(),
      source_table: tableName,
      migration_note: 'Marked for reference handling'
    }));
  }
}
