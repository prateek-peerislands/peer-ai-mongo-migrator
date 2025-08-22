import { QueryResult, MigrationOptions } from '../types/index.js';
import { PostgreSQLService } from './PostgreSQLService.js';
import { MongoDBService } from './MongoDBService.js';

export class MigrationService {
  constructor() {}

  /**
   * Migrate data from PostgreSQL to MongoDB
   */
  async migratePostgreSQLToMongoDB(
    postgresService: PostgreSQLService,
    mongoService: MongoDBService,
    options: MigrationOptions
  ): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🚀 Starting migration: ${options.sourceTable} → ${options.targetCollection}`);
      
      // Step 1: Get data from PostgreSQL
      const postgresData = await this.fetchPostgreSQLData(postgresService, options.sourceTable);
      if (!postgresData.success) {
        throw new Error(`Failed to fetch PostgreSQL data: ${postgresData.error}`);
      }

      // Step 2: Transform data for MongoDB
      const transformedData = this.transformDataForMongoDB(postgresData.data, options.transformRules);
      
      // Step 3: Insert data into MongoDB
      const mongoResult = await this.insertMongoDBData(
        mongoService, 
        options.targetCollection, 
        transformedData
      );

      if (!mongoResult.success) {
        throw new Error(`Failed to insert MongoDB data: ${mongoResult.error}`);
      }

      // Step 4: Validate migration if requested
      if (options.validateData) {
        const validationResult = await this.validateMigration(
          postgresService,
          mongoService,
          options.sourceTable,
          options.targetCollection
        );
        
        if (!validationResult.valid) {
          console.warn('⚠️ Migration validation failed:', validationResult.issues);
        }
      }

      const executionTime = Date.now() - startTime;
      
      console.log(`✅ Migration completed successfully in ${executionTime}ms`);
      console.log(`   Records migrated: ${transformedData.length}`);
      
      return {
        success: true,
        data: {
          sourceTable: options.sourceTable,
          targetCollection: options.targetCollection,
          recordsMigrated: transformedData.length,
          executionTime
        },
        executionTime,
        rowCount: transformedData.length
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ Migration failed: ${error}`);
      
      return {
        success: false,
        error: `Migration failed: ${error}`,
        executionTime
      };
    }
  }

  /**
   * Fetch data from PostgreSQL table
   */
  private async fetchPostgreSQLData(postgresService: PostgreSQLService, tableName: string): Promise<QueryResult> {
    try {
      const query = `SELECT * FROM ${tableName}`;
      return await postgresService.executeQuery(query);
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch data from ${tableName}: ${error}`,
        executionTime: 0
      };
    }
  }

  /**
   * Transform PostgreSQL data for MongoDB
   */
  private transformDataForMongoDB(data: any[], transformRules?: Record<string, string>): any[] {
    return data.map(row => {
      const transformed: any = {};
      
      for (const [key, value] of Object.entries(row)) {
        let transformedKey = key;
        let transformedValue = value;
        
        // Apply transformation rules if provided
        if (transformRules && transformRules[key]) {
          transformedKey = transformRules[key];
        }
        
        // Handle special cases
        if (value === null || value === undefined) {
          transformedValue = null;
        } else if (typeof value === 'string' && value.trim() === '') {
          transformedValue = null;
        } else if (typeof value === 'number' && isNaN(value)) {
          transformedValue = null;
        }
        
        // Convert snake_case to camelCase if no transform rule
        if (!transformRules || !transformRules[key]) {
          transformedKey = this.snakeToCamelCase(key);
        }
        
        transformed[transformedKey] = transformedValue;
      }
      
      return transformed;
    });
  }

  /**
   * Convert snake_case to camelCase
   */
  private snakeToCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
  }

  /**
   * Insert data into MongoDB collection
   */
  private async insertMongoDBData(
    mongoService: MongoDBService, 
    collectionName: string, 
    data: any[]
  ): Promise<QueryResult> {
    try {
      // Use batch processing for large datasets
      const batchSize = 1000;
      const batches = this.chunkArray(data, batchSize);
      
      let totalInserted = 0;
      
      for (const batch of batches) {
        const result = await mongoService.executeOperation('insert', 'dvdrental', collectionName, batch);
        if (result.success) {
          totalInserted += batch.length;
          console.log(`   Inserted batch: ${batch.length} records (Total: ${totalInserted})`);
        } else {
          throw new Error(`Batch insert failed: ${result.error}`);
        }
      }
      
      return {
        success: true,
        data: { insertedCount: totalInserted },
        executionTime: 0,
        rowCount: totalInserted
      };
      
    } catch (error) {
      return {
        success: false,
        error: `MongoDB insert failed: ${error}`,
        executionTime: 0
      };
    }
  }

  /**
   * Split array into chunks for batch processing
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Validate migration by comparing record counts
   */
  private async validateMigration(
    postgresService: PostgreSQLService,
    mongoService: MongoDBService,
    sourceTable: string,
    targetCollection: string
  ): Promise<{ valid: boolean; issues: string[] }> {
    try {
      const issues: string[] = [];
      
      // Get PostgreSQL record count
      const postgresCountQuery = `SELECT COUNT(*) as count FROM ${sourceTable}`;
      const postgresCountResult = await postgresService.executeQuery(postgresCountQuery);
      
      if (!postgresCountResult.success) {
        issues.push(`Failed to get PostgreSQL count: ${postgresCountResult.error}`);
        return { valid: false, issues };
      }
      
      const postgresCount = postgresCountResult.data[0]?.count || 0;
      
      // Get MongoDB record count
      const mongoCountResult = await mongoService.executeOperation('count', 'dvdrental', targetCollection, {});
      
      if (!mongoCountResult.success) {
        issues.push(`Failed to get MongoDB count: ${mongoCountResult.error}`);
        return { valid: false, issues };
      }
      
      const mongoCount = mongoCountResult.data || 0;
      
      // Compare counts
      if (postgresCount !== mongoCount) {
        issues.push(`Record count mismatch: PostgreSQL (${postgresCount}) vs MongoDB (${mongoCount})`);
      }
      
      return {
        valid: issues.length === 0,
        issues
      };
      
    } catch (error) {
      return {
        valid: false,
        issues: [`Validation failed: ${error}`]
      };
    }
  }

  /**
   * Generate migration report
   */
  async generateMigrationReport(
    sourceTable: string,
    targetCollection: string,
    recordsMigrated: number,
    executionTime: number
  ): Promise<string> {
    let report = '=== Migration Report ===\n\n';
    
    report += `Source Table: ${sourceTable}\n`;
    report += `Target Collection: ${targetCollection}\n`;
    report += `Records Migrated: ${recordsMigrated}\n`;
    report += `Execution Time: ${executionTime}ms\n`;
    report += `Migration Speed: ${Math.round(recordsMigrated / (executionTime / 1000))} records/second\n\n`;
    
    report += `Status: ✅ Success\n`;
    
    return report;
  }
}
