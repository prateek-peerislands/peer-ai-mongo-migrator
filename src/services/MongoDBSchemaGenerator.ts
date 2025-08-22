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
        isCompatible = false;
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
   * Convert PostgreSQL tables to MongoDB collections
   */
  private async convertTablesToCollections(
    postgresSchema: TableSchema[]
  ): Promise<MongoDBCollectionSchema[]> {
    const collections: MongoDBCollectionSchema[] = [];

    for (const table of postgresSchema) {
      const collection = await this.convertTableToCollection(table, postgresSchema);
      collections.push(collection);
    }

    return collections;
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

    // Handle foreign keys and relationships
    if (table.foreignKeys && table.foreignKeys.length > 0) {
      for (const fk of table.foreignKeys) {
        const referencedTable = allTables.find(t => t.name === fk.referencedTable);
        if (referencedTable) {
          const relationship = this.handleForeignKeyRelationship(
            table,
            fk,
            referencedTable
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
    referencedTable: TableSchema
  ): { type: 'embed' | 'reference'; embeddedDoc?: MongoDBEmbeddedDocument; reference?: MongoDBReference } {
    // Simple heuristic: embed if referenced table is small, reference if large
    const shouldEmbed = referencedTable.columns.length <= 5 && 
                       (!referencedTable.foreignKeys || referencedTable.foreignKeys.length === 0);

    if (shouldEmbed) {
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
}
