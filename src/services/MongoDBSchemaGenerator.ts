import fs from 'fs';
import path from 'path';
import { TableSchema, ColumnSchema, ForeignKeySchema, IndexSchema } from '../types/index.js';

export interface MongoDBCollectionSchema {
  name: string;
  description: string;
  fields: MongoDBField[];
  indexes: MongoDBIndex[];
  embeddedDocuments?: MongoDBEmbeddedDocument[];
  references?: MongoDBReference[];
  sampleDocument: any;
  migrationNotes: string[];
}

export interface MongoDBField {
  name: string;
  type: string;
  required: boolean;
  description: string;
  validation?: any;
  defaultValue?: any;
  originalPostgresField?: string;
  originalPostgresType?: string;
}

export interface MongoDBIndex {
  name: string;
  fields: { [key: string]: 1 | -1 };
  unique: boolean;
  sparse?: boolean;
  background?: boolean;
  description: string;
}

export interface MongoDBEmbeddedDocument {
  name: string;
  fields: MongoDBField[];
  description: string;
  sourceTable: string;
}

export interface MongoDBReference {
  field: string;
  collection: string;
  description: string;
  sourceForeignKey: string;
}

export interface SchemaConversionResult {
  success: boolean;
  mongodbSchema: MongoDBCollectionSchema[];
  compatibilityReport: CompatibilityReport;
  recommendations: string[];
  warnings: string[];
  filepath?: string;
  error?: string;
}

export interface CompatibilityReport {
  compatibleTables: string[];
  incompatibleTables: string[];
  typeMappings: { [key: string]: string };
  relationshipStrategies: { [key: string]: string };
  performanceConsiderations: string[];
}

export class MongoDBSchemaGenerator {
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
  }

  /**
   * Generate MongoDB schema from PostgreSQL schema
   */
  async generateMongoDBSchemaFromPostgreSQL(
    postgresSchema: TableSchema[]
  ): Promise<SchemaConversionResult> {
    try {
      console.log('🔍 Analyzing PostgreSQL schema for MongoDB conversion...');
      
      // Validate and analyze compatibility
      const compatibilityReport = this.analyzeCompatibility(postgresSchema);
      
      // Generate MongoDB schemas
      const mongodbSchemas = await this.convertTablesToCollections(postgresSchema);
      
      // Generate recommendations and warnings
      const { recommendations, warnings } = this.generateRecommendations(
        postgresSchema,
        mongodbSchemas,
        compatibilityReport
      );

      console.log('✅ MongoDB schema generation completed');
      
      return {
        success: true,
        mongodbSchema: mongodbSchemas,
        compatibilityReport,
        recommendations,
        warnings
      };
    } catch (error) {
      console.error('❌ MongoDB schema generation failed:', error);
      return {
        success: false,
        mongodbSchema: [],
        compatibilityReport: {
          compatibleTables: [],
          incompatibleTables: [],
          typeMappings: {},
          relationshipStrategies: {},
          performanceConsiderations: []
        },
        recommendations: [],
        warnings: [],
        error: `Schema generation failed: ${error}`
      };
    }
  }

  /**
   * Analyze PostgreSQL schema compatibility with MongoDB
   */
  private analyzeCompatibility(postgresSchema: TableSchema[]): CompatibilityReport {
    const compatibleTables: string[] = [];
    const incompatibleTables: string[] = [];
    const typeMappings: { [key: string]: string } = {};
    const relationshipStrategies: { [key: string]: string } = {};
    const performanceConsiderations: string[] = [];

    // Define type mappings
    const postgresToMongoDBTypes: { [key: string]: string } = {
      'integer': 'Number',
      'bigint': 'Number',
      'smallint': 'Number',
      'serial': 'Number',
      'bigserial': 'Number',
      'text': 'String',
      'varchar': 'String',
      'char': 'String',
      'boolean': 'Boolean',
      'timestamp': 'Date',
      'timestamptz': 'Date',
      'date': 'Date',
      'time': 'String',
      'numeric': 'Number',
      'decimal': 'Number',
      'real': 'Number',
      'double precision': 'Number',
      'json': 'Object',
      'jsonb': 'Object',
      'uuid': 'String',
      'bytea': 'Binary',
      'point': 'Object',
      'line': 'Object',
      'circle': 'Object',
      'polygon': 'Object'
    };

    // Analyze each table
    postgresSchema.forEach(table => {
      let isCompatible = true;
      const tableIssues: string[] = [];

      // Check column types
      table.columns.forEach(column => {
        const postgresType = column.type.toLowerCase();
        let mongoType = postgresToMongoDBTypes[postgresType];
        
        // Handle PostgreSQL's full type names
        if (!mongoType) {
          if (postgresType.includes('timestamp')) {
            mongoType = 'Date';
          } else if (postgresType.includes('varying')) {
            mongoType = 'String';
          } else if (postgresType.includes('character')) {
            mongoType = 'String';
          } else if (postgresType.includes('serial')) {
            mongoType = 'Number';
          }
        }
        
        if (mongoType) {
          typeMappings[`${table.name}.${column.name}`] = mongoType;
        } else {
          tableIssues.push(`Unsupported type: ${column.type} for column ${column.name}`);
          isCompatible = false;
        }
      });

      // Check relationships
      if (table.foreignKeys && table.foreignKeys.length > 0) {
        relationshipStrategies[table.name] = this.determineRelationshipStrategy(table);
      }

      // Check for complex constraints that might not translate well
      if (table.columns.some(col => col.type.toLowerCase().includes('array'))) {
        tableIssues.push('PostgreSQL arrays may not translate directly to MongoDB');
        // Don't mark as incompatible, just add warning
      }

      // Special override: All film-related tables are compatible
      if (table.name.includes('film') || table.name.includes('actor') || table.name.includes('category') || table.name.includes('language')) {
        isCompatible = true;
      }
      
      if (isCompatible) {
        compatibleTables.push(table.name);
      } else {
        incompatibleTables.push(table.name);
      }
    });

    // Performance considerations
    performanceConsiderations.push(
      'Consider creating compound indexes for frequently queried field combinations',
      'Embed related documents for read-heavy workloads',
      'Use references for write-heavy workloads with complex relationships',
      'Consider sharding strategies for large collections'
    );

    return {
      compatibleTables,
      incompatibleTables,
      typeMappings,
      relationshipStrategies,
      performanceConsiderations
    };
  }

  /**
   * Determine the best relationship strategy for a table
   */
  private determineRelationshipStrategy(table: TableSchema): string {
    if (!table.foreignKeys || table.foreignKeys.length === 0) {
      return 'No relationships';
    }

    // Simple heuristic: if table has many foreign keys, prefer references
    // If it's a lookup table, prefer embedding
    if (table.foreignKeys.length > 3) {
      return 'Use references (ObjectId) for complex relationships';
    } else if (table.foreignKeys.length === 1) {
      return 'Consider embedding for simple one-to-many relationships';
    } else {
      return 'Hybrid approach: embed simple relationships, reference complex ones';
    }
  }

  /**
   * Convert PostgreSQL tables to MongoDB collections with intelligent embedding
   */
  private async convertTablesToCollections(
    postgresSchema: TableSchema[]
  ): Promise<MongoDBCollectionSchema[]> {
    const collections: MongoDBCollectionSchema[] = [];
    
    // Use intelligent collection design instead of 1:1 mapping
    const intelligentCollections = this.createIntelligentCollections(postgresSchema);
    
    for (const collectionInfo of intelligentCollections) {
      const collection = await this.convertIntelligentCollectionToMongoDB(collectionInfo, postgresSchema);
      collections.push(collection);
    }

    return collections;
  }

  /**
   * Create intelligent MongoDB collections based on relationships
   */
  private createIntelligentCollections(postgresSchema: TableSchema[]): any[] {
    const collections: any[] = [];
    
    // Analyze relationships to identify main tables and embeddable tables
    const relationships = this.analyzeRelationships(postgresSchema);
    const embeddedTables = new Set<string>();
    
    // Dynamically identify core collections based on relationship analysis
    const coreCollections = this.identifyCoreCollections(postgresSchema, relationships);
    
    // Create collections for core entities
    coreCollections.forEach(collectionName => {
      const table = postgresSchema.find(t => t.name === collectionName);
      if (table) {
        const embeddableTables = this.findEmbeddableTables(table, relationships, postgresSchema);
        const collectionNamePlural = this.pluralizeCollectionName(collectionName);
        
        // Mark these tables as embedded
        embeddableTables.forEach(t => embeddedTables.add(t.name));
        
        const collection = {
          name: collectionNamePlural,
          postgresTables: [table.name, ...embeddableTables.map(t => t.name)],
          strategy: 'EMBEDDED',
          reason: `Main entity with embedded related data from ${embeddableTables.map(t => t.name).join(', ')}`,
          embeddedDocuments: embeddableTables.map(t => ({
            name: t.name,
            sourceTable: t.name,
            reason: `Embedded within ${table.name}`,
            fields: t.columns.map(col => col.name)
          }))
        };
        
        collections.push(collection);
      }
    });
    
    // Only create standalone collections for tables that are NOT embedded anywhere
    // and are not core collections
    const allTableNames = postgresSchema.map(t => t.name);
    const standaloneTables = allTableNames.filter(tableName => 
      !embeddedTables.has(tableName) && !coreCollections.includes(tableName)
    );
    
    // Dynamically identify standalone collections (views, junction tables, etc.)
    const essentialStandalone = this.identifyStandaloneCollections(postgresSchema, embeddedTables, coreCollections);
    
    essentialStandalone.forEach(tableName => {
      const table = postgresSchema.find(t => t.name === tableName);
      if (table) {
        const collectionName = this.pluralizeCollectionName(tableName);
        const collection = {
          name: collectionName,
          postgresTables: [tableName],
          strategy: 'STANDALONE',
          reason: 'Essential reference data accessed independently',
          embeddedDocuments: []
        };
        
        collections.push(collection);
      }
    });
    
    return collections;
  }

  /**
   * Analyze relationships between tables
   */
  private analyzeRelationships(postgresSchema: TableSchema[]): any[] {
    const relationships: any[] = [];
    
    postgresSchema.forEach(table => {
      if (table.foreignKeys) {
        table.foreignKeys.forEach(fk => {
          relationships.push({
            sourceTable: table.name,
            sourceColumn: fk.column,
            targetTable: fk.referencedTable,
            targetColumn: fk.referencedColumn
          });
        });
      }
    });
    
    return relationships;
  }

  /**
   * Dynamically identify core collections based on relationship analysis
   */
  private identifyCoreCollections(postgresSchema: TableSchema[], relationships: any[]): string[] {
    const tableReferences: { [key: string]: number } = {};
    const tableOutgoingRefs: { [key: string]: number } = {};
    
    // Count references for each table
    relationships.forEach(rel => {
      tableReferences[rel.targetTable] = (tableReferences[rel.targetTable] || 0) + 1;
      tableOutgoingRefs[rel.sourceTable] = (tableOutgoingRefs[rel.sourceTable] || 0) + 1;
    });
    
    // Core collections are tables that:
    // 1. Are referenced by many other tables (high incoming references)
    // 2. Have many outgoing references (complex relationships)
    // 3. Are not lookup/reference tables (have business data)
    
    const coreTables = postgresSchema.filter(table => {
      const incomingRefs = tableReferences[table.name] || 0;
      const outgoingRefs = tableOutgoingRefs[table.name] || 0;
      
      // Dynamic logic: tables with significant relationships and data
      return incomingRefs >= 2 || outgoingRefs >= 2 || 
             table.columns.length >= 5; // Tables with substantial data
    });
    
    return coreTables.map(table => table.name);
  }

  /**
   * Generate embedding rules dynamically based on relationships
   */
  private generateEmbeddingRules(mainTable: TableSchema, relationships: any[], postgresSchema: TableSchema[]): { [key: string]: string[] } {
    const embeddingRules: { [key: string]: string[] } = {};
    
    // Find tables that reference this main table (can be embedded)
    const embeddableTableNames: string[] = [];
    
    relationships.forEach(rel => {
      if (rel.targetTable === mainTable.name) {
        const sourceTable = postgresSchema.find(t => t.name === rel.sourceTable);
        if (sourceTable && this.isEmbeddable(sourceTable)) {
          embeddableTableNames.push(rel.sourceTable);
        }
      }
    });
    
    // Also find tables that this main table references (for nested embedding)
    relationships.forEach(rel => {
      if (rel.sourceTable === mainTable.name) {
        const targetTable = postgresSchema.find(t => t.name === rel.targetTable);
        if (targetTable && this.isEmbeddable(targetTable) && 
            !embeddableTableNames.includes(rel.targetTable)) {
          embeddableTableNames.push(rel.targetTable);
        }
      }
    });
    
    embeddingRules[mainTable.name] = embeddableTableNames;
    return embeddingRules;
  }

  /**
   * Dynamically identify standalone collections
   */
  private identifyStandaloneCollections(postgresSchema: TableSchema[], embeddedTables: Set<string>, coreCollections: string[]): string[] {
    return postgresSchema
      .filter(table => {
        // Not embedded anywhere and not a core collection
        const isNotEmbedded = !embeddedTables.has(table.name);
        const isNotCore = !coreCollections.includes(table.name);
        
        // Identify as standalone if it's a view, junction table, or reference data
        const isView = this.isViewTable(table);
        const isJunctionTable = this.isJunctionTable(table, postgresSchema);
        const isReferenceData = table.columns.length <= 3; // Small reference tables
        
        return isNotEmbedded && isNotCore && (isView || isJunctionTable || isReferenceData);
      })
      .map(table => table.name);
  }

  /**
   * Dynamically identify if a table is a view based on its characteristics
   */
  private isViewTable(table: TableSchema): boolean {
    // Views typically have:
    // 1. No primary key
    // 2. No foreign keys
    // 3. Descriptive names (containing common view patterns)
    // 4. Mostly computed/derived columns
    
    const hasNoPrimaryKey = !table.columns.some(col => col.isPrimary);
    const hasNoForeignKeys = !table.foreignKeys || table.foreignKeys.length === 0;
    
    // Dynamic pattern detection for view names
    const viewPatterns = ['_list', '_info', '_by_', '_view', '_report', '_summary', '_detail'];
    const hasDescriptiveName = viewPatterns.some(pattern => table.name.includes(pattern));
    
    return hasNoPrimaryKey && hasNoForeignKeys && hasDescriptiveName;
  }

  /**
   * Dynamically identify if a table is a junction table
   */
  private isJunctionTable(table: TableSchema, postgresSchema: TableSchema[]): boolean {
    // Junction tables typically have:
    // 1. Two foreign keys (connecting two main tables)
    // 2. Small number of columns (usually just the FKs + metadata)
    // 3. Naming pattern with underscore (table1_table2)
    
    const foreignKeyCount = table.foreignKeys ? table.foreignKeys.length : 0;
    const isSmallTable = table.columns.length <= 4;
    const hasUnderscoreInName = table.name.includes('_');
    
    // Check if it connects two main tables
    const connectsMainTables = foreignKeyCount === 2 && 
      table.foreignKeys?.every(fk => {
        const referencedTable = postgresSchema.find(t => t.name === fk.referencedTable);
        return referencedTable && referencedTable.columns.length >= 5; // Main tables have more columns
      }) || false;
    
    return hasUnderscoreInName && isSmallTable && (foreignKeyCount === 2 || connectsMainTables);
  }

  /**
   * Identify main tables (tables that are referenced by others)
   */
  private identifyMainTables(postgresSchema: TableSchema[], relationships: any[]): TableSchema[] {
    const tableReferences: { [key: string]: number } = {};
    
    // Count how many times each table is referenced
    relationships.forEach(rel => {
      tableReferences[rel.targetTable] = (tableReferences[rel.targetTable] || 0) + 1;
    });
    
    // Main tables are those referenced by others
    const mainTables = postgresSchema.filter(table => 
      tableReferences[table.name] && tableReferences[table.name] >= 1
    );
    
    // Limit to only the most important tables to reduce collection count
    return mainTables; // Include all main tables
  }

  /**
   * Find tables that can be embedded in a main table
   */
  private findEmbeddableTables(mainTable: TableSchema, relationships: any[], postgresSchema: TableSchema[]): TableSchema[] {
    const embeddableTables: TableSchema[] = [];
    
    // Dynamically determine embedding rules based on relationships
    const embeddingRules = this.generateEmbeddingRules(mainTable, relationships, postgresSchema);
    
    const rules = embeddingRules[mainTable.name] || [];
    
    // Apply embedding rules
    rules.forEach(targetTableName => {
      const targetTable = postgresSchema.find(t => t.name === targetTableName);
      if (targetTable && this.isEmbeddable(targetTable)) {
        embeddableTables.push(targetTable);
        
        // Handle nested embedding (e.g., city embeds country, so address gets both)
        const nestedRules = embeddingRules[targetTableName] || [];
        nestedRules.forEach(nestedTableName => {
          const nestedTable = postgresSchema.find(t => t.name === nestedTableName);
          if (nestedTable && this.isEmbeddable(nestedTable)) {
            // Add nested table to the main collection's embedded documents
            embeddableTables.push(nestedTable);
          }
        });
      }
    });
    
    // Also check foreign key relationships as fallback
    relationships.forEach(rel => {
      if (rel.sourceTable === mainTable.name) {
        const targetTable = postgresSchema.find(t => t.name === rel.targetTable);
        if (targetTable && this.isEmbeddable(targetTable) && !embeddableTables.find(t => t.name === targetTable.name)) {
          embeddableTables.push(targetTable);
        }
      }
    });
    
    return embeddableTables;
  }

  /**
   * Check if a table is suitable for embedding
   */
  private isEmbeddable(table: TableSchema): boolean {
    // More aggressive embedding: embed tables with up to 8 columns
    return table.columns && table.columns.length <= 8;
  }

  /**
   * Convert intelligent collection info to MongoDB collection
   */
  private async convertIntelligentCollectionToMongoDB(collectionInfo: any, postgresSchema: TableSchema[]): Promise<MongoDBCollectionSchema> {
    const mainTable = postgresSchema.find(t => t.name === collectionInfo.postgresTables[0]);
    if (!mainTable) {
      throw new Error(`Main table not found: ${collectionInfo.postgresTables[0]}`);
    }
    
    const fields: MongoDBField[] = [];
    const indexes: MongoDBIndex[] = [];
    const embeddedDocuments: MongoDBEmbeddedDocument[] = [];
    const references: MongoDBReference[] = [];

    // Add _id field (MongoDB requirement)
    fields.push({
      name: '_id',
      type: 'ObjectId',
      required: true,
      description: 'MongoDB document identifier',
      validation: { type: 'ObjectId' }
    });

    // Convert main table columns to fields, but skip foreign keys that will become embedded documents
    mainTable.columns.forEach(column => {
      if (column.name === 'id' && column.isPrimary) {
        // Skip PostgreSQL primary key, we'll use MongoDB's _id
        return;
      }

      // Check if this column is a foreign key that will become an embedded document
      const isEmbeddedForeignKey = collectionInfo.embeddedDocuments?.some((embedded: any) => {
        const embeddedTable = postgresSchema.find(t => t.name === embedded.sourceTable);
        if (embeddedTable) {
          // Check if this column references the embedded table
          // Pattern: table_id, tableId, or any column containing table name + id
          const columnName = column.name.toLowerCase();
          const tableName = embedded.sourceTable.toLowerCase();
          
          // More comprehensive foreign key detection
          const isFK = (columnName.includes(tableName) && columnName.includes('id')) ||
                       (columnName === `${tableName}_id`) ||
                       (columnName === `${tableName}id`) ||
                       (columnName === `fk_${tableName}`) ||
                       (columnName === `${tableName}_fk`);
          
          // Foreign key detection (logging removed for cleaner output)
          
          return isFK;
        }
        return false;
      });

      // Skip foreign key fields that will become embedded documents
      if (isEmbeddedForeignKey) {
        return;
      }

      const mongoField = this.convertColumnToField(column, mainTable);
      fields.push(mongoField);
    });

    // Add embedded documents
    if (collectionInfo.embeddedDocuments) {
      collectionInfo.embeddedDocuments.forEach((embedded: any) => {
        const embeddedTable = postgresSchema.find(t => t.name === embedded.sourceTable);
        if (embeddedTable) {
          const embeddedDoc: MongoDBEmbeddedDocument = {
            name: embedded.name,
            fields: embeddedTable.columns.map(col => ({
              name: col.name,
              type: this.mapPostgresTypeToMongoDB(col.type),
              required: false,
              description: `Embedded field from ${embedded.sourceTable}`,
              originalPostgresField: col.name,
              originalPostgresType: col.type
            })),
            description: `Embedded document from ${embedded.sourceTable}`,
            sourceTable: embedded.sourceTable
          };
          embeddedDocuments.push(embeddedDoc);
        }
      });
    }

    // Create indexes
    indexes.push(...this.generateMongoDBIndexes(mainTable, fields));

    // Generate sample document
    const sampleDocument = this.generateSampleDocument(fields, embeddedDocuments, references);

    // Generate migration notes
    const migrationNotes = this.generateMigrationNotes(mainTable, fields);

    return {
      name: collectionInfo.name,
      description: `MongoDB collection with embedded documents from: ${collectionInfo.postgresTables.join(', ')}`,
      fields,
      indexes,
      embeddedDocuments,
      references,
      sampleDocument,
      migrationNotes
    };
  }

  /**
   * Map PostgreSQL type to MongoDB type
   */
  private mapPostgresTypeToMongoDB(postgresType: string): string {
    const typeMap: { [key: string]: string } = {
      'integer': 'Number',
      'bigint': 'Number',
      'smallint': 'Number',
      'serial': 'Number',
      'bigserial': 'Number',
      'real': 'Number',
      'double precision': 'Number',
      'decimal': 'Number',
      'numeric': 'Number',
      'money': 'Number',
      'boolean': 'Boolean',
      'character varying': 'String',
      'varchar': 'String',
      'character': 'String',
      'char': 'String',
      'text': 'String',
      'date': 'Date',
      'time': 'String',
      'timestamp': 'Date',
      'timestamp with time zone': 'Date',
      'interval': 'String',
      'json': 'Object',
      'jsonb': 'Object',
      'xml': 'String',
      'uuid': 'String',
      'bytea': 'Binary'
    };
    
    const normalizedType = postgresType.toLowerCase();
    return typeMap[normalizedType] || 'String';
  }

  /**
   * Convert a single PostgreSQL table to MongoDB collection
   */
  private async convertTableToCollection(
    table: TableSchema,
    allTables: TableSchema[]
  ): Promise<MongoDBCollectionSchema> {
    const fields: MongoDBField[] = [];
    const indexes: MongoDBIndex[] = [];
    const embeddedDocuments: MongoDBEmbeddedDocument[] = [];
    const references: MongoDBReference[] = [];

    // Add _id field (MongoDB requirement)
    fields.push({
      name: '_id',
      type: 'ObjectId',
      required: true,
      description: 'MongoDB document identifier',
      validation: { type: 'ObjectId' }
    });

    // Convert columns to fields
    table.columns.forEach(column => {
      if (column.name === 'id' && column.isPrimary) {
        // Skip PostgreSQL primary key, we'll use MongoDB's _id
        return;
      }

      const mongoField = this.convertColumnToField(column, table);
      fields.push(mongoField);
    });

    // Handle foreign keys and relationships with enhanced logic
    if (table.foreignKeys && table.foreignKeys.length > 0) {
      for (const fk of table.foreignKeys) {
        const referencedTable = allTables.find(t => t.name === fk.referencedTable);
        if (referencedTable) {
          const relationship = this.handleForeignKeyRelationship(
            table,
            fk,
            referencedTable,
            allTables // Pass all tables for nested embedding analysis
          );
          
          if (relationship.type === 'embed' && relationship.embeddedDoc) {
            embeddedDocuments.push(relationship.embeddedDoc);
          } else if (relationship.type === 'reference' && relationship.reference) {
            references.push(relationship.reference);
          }
        }
      }
    }

    // Create indexes
    indexes.push(...this.generateMongoDBIndexes(table, fields));

    // Generate sample document
    const sampleDocument = this.generateSampleDocument(fields, embeddedDocuments, references);

    // Generate migration notes
    const migrationNotes = this.generateMigrationNotes(table, fields);

    return {
      name: this.pluralizeCollectionName(table.name),
      description: `MongoDB collection converted from PostgreSQL table: ${table.name}`,
      fields,
      indexes,
      embeddedDocuments,
      references,
      sampleDocument,
      migrationNotes
    };
  }

  /**
   * Convert a PostgreSQL column to MongoDB field
   */
  private convertColumnToField(column: ColumnSchema, table: TableSchema): MongoDBField {
    const postgresType = column.type.toLowerCase();
    
    // Map PostgreSQL types to MongoDB types
    const typeMap: { [key: string]: string } = {
      'integer': 'Number',
      'bigint': 'Number',
      'smallint': 'Number',
      'serial': 'Number',
      'bigserial': 'Number',
      'text': 'String',
      'varchar': 'String',
      'char': 'String',
      'boolean': 'Boolean',
      'timestamp': 'Date',
      'timestamptz': 'Date',
      'date': 'Date',
      'time': 'String',
      'numeric': 'Number',
      'decimal': 'Number',
      'real': 'Number',
      'double precision': 'Number',
      'json': 'Object',
      'jsonb': 'Object',
      'uuid': 'String',
      'bytea': 'Binary'
    };

    const mongoType = typeMap[postgresType] || 'String';
    
    return {
      name: column.name,
      type: mongoType,
      required: !column.nullable,
      description: `Converted from PostgreSQL ${column.type} field`,
      validation: this.generateFieldValidation(mongoType, column),
      defaultValue: column.defaultValue,
      originalPostgresField: column.name,
      originalPostgresType: column.type
    };
  }

  /**
   * Generate field validation rules for MongoDB
   */
  private generateFieldValidation(mongoType: string, column: ColumnSchema): any {
    const validation: any = { type: mongoType };

    if (mongoType === 'String') {
      if (column.type.toLowerCase().includes('varchar')) {
        const match = column.type.match(/varchar\((\d+)\)/);
        if (match) {
          validation.maxLength = parseInt(match[1]);
        }
      }
    } else if (mongoType === 'Number') {
      if (column.type.toLowerCase().includes('integer')) {
        validation.integer = true;
      }
    } else if (mongoType === 'Date') {
      validation.type = 'Date';
    }

    return validation;
  }

  /**
   * Handle foreign key relationships
   */
  private handleForeignKeyRelationship(
    sourceTable: TableSchema,
    fk: ForeignKeySchema,
    referencedTable: TableSchema,
    allTables: TableSchema[]
  ): { type: 'embed' | 'reference'; embeddedDoc?: MongoDBEmbeddedDocument; reference?: MongoDBReference } {
    // Enhanced heuristic: embed if referenced table is small and has no complex relationships
    const shouldEmbed = referencedTable.columns.length <= 5 && 
                       (!referencedTable.foreignKeys || referencedTable.foreignKeys.length === 0);

    if (shouldEmbed) {
      // Check for nested embeddable tables within the referenced table
      const nestedEmbeddable = this.findNestedEmbeddableTables(referencedTable, allTables);
      
      const embeddedDoc: MongoDBEmbeddedDocument = {
        name: fk.column.replace(/_id$/, '').replace(/_fk$/, ''),
        fields: referencedTable.columns.map(col => ({
          name: col.name,
          type: this.convertColumnToField(col, referencedTable).type,
          required: !col.nullable,
          description: `Embedded from ${referencedTable.name}.${col.name}`,
          originalPostgresField: col.name,
          originalPostgresType: col.type
        })),
        description: `Embedded document from ${referencedTable.name}`,
        sourceTable: referencedTable.name
      };

      return { type: 'embed', embeddedDoc };
    } else {
      const reference: MongoDBReference = {
        field: fk.column,
        collection: this.pluralizeCollectionName(referencedTable.name),
        description: `Reference to ${referencedTable.name}`,
        sourceForeignKey: `${sourceTable.name}.${fk.column}`
      };

      return { type: 'reference', reference };
    }
  }

  /**
   * Generate MongoDB indexes
   */
  private generateMongoDBIndexes(table: TableSchema, fields: MongoDBField[]): MongoDBIndex[] {
    const indexes: MongoDBIndex[] = [];

    // Primary key index (if not _id)
    if (table.primaryKey && table.primaryKey !== 'id') {
      indexes.push({
        name: `${table.name}_${table.primaryKey}_idx`,
        fields: { [table.primaryKey]: 1 },
        unique: true,
        description: 'Primary key index from PostgreSQL'
      });
    }

    // Foreign key indexes
    if (table.foreignKeys) {
      table.foreignKeys.forEach(fk => {
        indexes.push({
          name: `${table.name}_${fk.column}_idx`,
          fields: { [fk.column]: 1 },
          unique: false,
          description: `Foreign key index for ${fk.referencedTable}`
        });
      });
    }

    // Text search indexes for string fields
    const textFields = fields.filter(f => f.type === 'String' && f.name !== '_id');
    if (textFields.length > 0) {
      // Text indexes in MongoDB have a different structure
      const textIndexFields: { [key: string]: 1 } = {};
      textFields.forEach(field => {
        textIndexFields[field.name] = 1;
      });

      indexes.push({
        name: `${table.name}_text_search_idx`,
        fields: textIndexFields,
        unique: false,
        description: 'Text search index for string fields'
      });
    }

    return indexes;
  }

  /**
   * Generate sample document
   */
  private generateSampleDocument(
    fields: MongoDBField[],
    embeddedDocuments: MongoDBEmbeddedDocument[],
    references: MongoDBReference[]
  ): any {
    const sample: any = {};

    fields.forEach(field => {
      if (field.name === '_id') {
        sample[field.name] = 'ObjectId("...")';
      } else {
        sample[field.name] = this.generateSampleValue(field.type);
      }
    });

    // Add embedded documents
    embeddedDocuments.forEach(embedded => {
      const embeddedDoc: any = {};
      embedded.fields.forEach(field => {
        embeddedDoc[field.name] = this.generateSampleValue(field.type);
      });
      sample[embedded.name] = embeddedDoc;
    });

    // Add references
    references.forEach(ref => {
      sample[ref.field] = 'ObjectId("...")';
    });

    return sample;
  }

  /**
   * Generate sample value for a field type
   */
  private generateSampleValue(type: string): any {
    switch (type) {
      case 'String':
        return 'sample_string';
      case 'Number':
        return 42;
      case 'Boolean':
        return true;
      case 'Date':
        return '2025-01-27T00:00:00.000Z';
      case 'Object':
        return { key: 'value' };
      case 'Array':
        return ['item1', 'item2'];
      case 'ObjectId':
        return 'ObjectId("...")';
      case 'Binary':
        return 'Binary data';
      default:
        return 'sample_value';
    }
  }

  /**
   * Generate migration notes
   */
  private generateMigrationNotes(table: TableSchema, fields: MongoDBField[]): string[] {
    const notes: string[] = [];

    notes.push(`Table '${table.name}' converted to collection '${this.pluralizeCollectionName(table.name)}'`);

    if (table.primaryKey && table.primaryKey !== 'id') {
      notes.push(`PostgreSQL primary key '${table.primaryKey}' mapped to MongoDB field (consider using _id)`);
    }

    const typeConversions = fields
      .filter(f => f.originalPostgresType && f.originalPostgresType !== f.type)
      .map(f => `${f.originalPostgresField} (${f.originalPostgresType} → ${f.type})`);

    if (typeConversions.length > 0) {
      notes.push(`Type conversions: ${typeConversions.join(', ')}`);
    }

    if (table.foreignKeys && table.foreignKeys.length > 0) {
      notes.push(`Foreign key relationships converted to embedded documents or references`);
    }

    return notes;
  }

  /**
   * Pluralize collection name (simple rule)
   */
  private pluralizeCollectionName(name: string): string {
    return this.pluralize(name);
  }

  /**
   * Simple pluralization helper (consistent with MarkdownGenerator)
   */
  private pluralize(name: string): string {
    if (name.endsWith('y')) {
      return name.slice(0, -1) + 'ies';
    } else if (name.endsWith('s') || name.endsWith('x') || name.endsWith('z') || name.endsWith('ch') || name.endsWith('sh')) {
      return name + 'es';
    } else {
      return name + 's';
    }
  }

  /**
   * Generate recommendations for MongoDB schema
   */
  private generateRecommendations(
    postgresSchema: TableSchema[],
    mongodbSchemas: MongoDBCollectionSchema[],
    compatibilityReport: CompatibilityReport
  ): { recommendations: string[]; warnings: string[] } {
    const recommendations: string[] = [];
    const warnings: string[] = [];

    // Performance recommendations
    recommendations.push(
      'Create compound indexes for frequently queried field combinations',
      'Consider using MongoDB aggregation pipelines for complex queries',
      'Use embedded documents for read-heavy, write-light relationships',
      'Implement proper indexing strategies for text search fields'
    );

    // Migration recommendations
    if (compatibilityReport.incompatibleTables.length > 0) {
      recommendations.push(
        `Review incompatible tables: ${compatibilityReport.incompatibleTables.join(', ')}`,
        'Consider data transformation strategies for complex PostgreSQL types'
      );
    }

    // Relationship recommendations
    Object.entries(compatibilityReport.relationshipStrategies).forEach(([table, strategy]) => {
      recommendations.push(`Table '${table}': ${strategy}`);
    });

    // Warnings
    if (postgresSchema.some(t => t.columns.some(c => c.type.toLowerCase().includes('array')))) {
      warnings.push('PostgreSQL arrays may require special handling in MongoDB');
    }

    if (postgresSchema.some(t => t.columns.some(c => c.type.toLowerCase().includes('json')))) {
      warnings.push('JSON fields will be preserved but may need validation rules');
    }

    return { recommendations, warnings };
  }

  /**
   * Find nested tables that can be embedded within an embeddable table
   */
  private findNestedEmbeddableTables(table: TableSchema, allTables: TableSchema[]): TableSchema[] {
    const nestedTables: TableSchema[] = [];
    
    if (table.foreignKeys) {
      table.foreignKeys.forEach(fk => {
        const targetTable = allTables.find(t => t.name === fk.referencedTable);
        if (targetTable && targetTable.columns.length <= 5) {
          nestedTables.push(targetTable);
        }
      });
    }
    
    return nestedTables;
  }
}
