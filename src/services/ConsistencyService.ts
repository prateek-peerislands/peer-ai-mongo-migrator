import { ComprehensivePostgreSQLSchema } from './SchemaService.js';
import { SchemaConversionResult } from './MongoDBSchemaGenerator.js';

/**
 * Service to ensure consistency across all markdown files
 * This prevents different examples, strategies, and terminology in different files
 */
export class ConsistencyService {
  
  /**
   * Get the standard collection design strategy for MongoDB
   * This method is now PORTABLE and DYNAMIC - no hardcoded table names!
   */
  getStandardCollectionStrategy(schema?: ComprehensivePostgreSQLSchema): any {
    // If no schema provided, return generic strategy
    if (!schema) {
      return this.getGenericStrategy();
    }
    
    // Analyze the actual schema to create dynamic strategy
    return this.createDynamicStrategy(schema);
  }

  /**
   * Create a generic, portable strategy that works for any database
   */
  private getGenericStrategy(): any {
    return {
      // Generic patterns that work for any database
      main_entities: {
        description: "Main entity collection with embedded related data",
        strategy: "EMBEDDED",
        reason: "Related data that's frequently accessed together should be embedded"
      },
      
      reference_data: {
        description: "Reference data collection (standalone)",
        strategy: "STANDALONE",
        reason: "Reference data accessed independently"
      },
      
      transaction_data: {
        description: "Transaction collection with references",
        strategy: "REFERENCED",
        reason: "Large related tables, frequently updated, accessed independently"
      }
    };
  }

  /**
   * Create dynamic strategy based on actual database schema
   */
  private createDynamicStrategy(schema: ComprehensivePostgreSQLSchema): any {
    const strategy: any = {};
    
    // Analyze foreign key relationships to identify embedding opportunities
    const relationships = this.analyzeRelationships(schema);
    
    // Group tables by their relationship patterns
    const mainTables = this.identifyMainTables(schema, relationships);
    const referenceTables = this.identifyReferenceTables(schema, relationships);
    const junctionTables = this.identifyJunctionTables(schema, relationships);
    
    // Create collections for main tables with embedded documents
    mainTables.forEach(table => {
      const embeddedTables = this.findEmbeddableTables(table, relationships);
      const collectionName = this.pluralize(table.name);
      
      strategy[collectionName] = {
        description: `${table.name} collection with embedded related data`,
        postgresTables: [table.name, ...embeddedTables.map(t => t.name)],
        embeddedDocuments: embeddedTables.map(t => t.name),
        strategy: "EMBEDDED",
        reason: `Related tables (${embeddedTables.map(t => t.name).join(', ')}) are frequently accessed together with ${table.name}`
      };
    });
    
    // Create standalone collections for reference tables
    referenceTables.forEach(table => {
      const collectionName = this.pluralize(table.name);
      strategy[collectionName] = {
        description: `${table.name} collection (standalone)`,
        postgresTables: [table.name],
        embeddedDocuments: [],
        strategy: "STANDALONE",
        reason: "Reference data accessed independently"
      };
    });
    
    return strategy;
  }

  /**
   * Analyze relationships in the schema
   */
  private analyzeRelationships(schema: ComprehensivePostgreSQLSchema): any[] {
    const relationships: any[] = [];
    
    schema.tables.forEach(table => {
      if (table.foreignKeys) {
        table.foreignKeys.forEach(fk => {
          relationships.push({
            sourceTable: table.name,
            sourceColumn: fk.column,
            targetTable: fk.referencedTable,
            targetColumn: fk.referencedColumn,
            relationshipType: this.determineRelationshipType(table, fk, schema)
          });
        });
      }
    });
    
    return relationships;
  }

  /**
   * Identify main tables (tables that have many foreign keys pointing to them)
   */
  private identifyMainTables(schema: ComprehensivePostgreSQLSchema, relationships: any[]): any[] {
    const tableReferences: { [key: string]: number } = {};
    
    // Count how many times each table is referenced
    relationships.forEach(rel => {
      tableReferences[rel.targetTable] = (tableReferences[rel.targetTable] || 0) + 1;
    });
    
    // Main tables are those referenced by many others
    return schema.tables.filter(table => 
      tableReferences[table.name] && tableReferences[table.name] >= 2
    );
  }

  /**
   * Identify reference tables (tables that are referenced but don't reference others much)
   */
  private identifyReferenceTables(schema: ComprehensivePostgreSQLSchema, relationships: any[]): any[] {
    const tableReferences: { [key: string]: number } = {};
    
    relationships.forEach(rel => {
      tableReferences[rel.targetTable] = (tableReferences[rel.targetTable] || 0) + 1;
    });
    
    return schema.tables.filter(table => 
      tableReferences[table.name] && tableReferences[table.name] <= 1
    );
  }

  /**
   * Identify junction tables (many-to-many relationship tables)
   */
  private identifyJunctionTables(schema: ComprehensivePostgreSQLSchema, relationships: any[]): any[] {
    return schema.tables.filter(table => 
      table.foreignKeys && table.foreignKeys.length >= 2
    );
  }

  /**
   * Find tables that can be embedded in a main table
   */
  private findEmbeddableTables(mainTable: any, relationships: any[]): any[] {
    const embeddableTables: any[] = [];
    
    relationships.forEach(rel => {
      if (rel.sourceTable === mainTable.name) {
        // Check if this table is small enough to embed
        const targetTable = this.findTableByName(rel.targetTable, relationships);
        if (targetTable && this.isEmbeddable(targetTable)) {
          embeddableTables.push(targetTable);
        }
      }
    });
    
    return embeddableTables;
  }

  /**
   * Determine if a table is suitable for embedding
   */
  private isEmbeddable(table: any): boolean {
    // Small tables with few columns are good candidates for embedding
    return table.columns && table.columns.length <= 5;
  }

  /**
   * Find table by name
   */
  private findTableByName(name: string, relationships: any[]): any {
    // This would need to be implemented based on your schema structure
    return null;
  }

  /**
   * Determine relationship type
   */
  private determineRelationshipType(table: any, fk: any, schema: ComprehensivePostgreSQLSchema): string {
    // Analyze if it's one-to-one, one-to-many, or many-to-many
    return "one-to-many"; // Default
  }

  /**
   * Simple pluralization helper
   */
  private pluralize(name: string): string {
    return name.endsWith('y') ? name.slice(0, -1) + 'ies' : name + 's';
  }

  /**
   * Get standard embedded document examples
   * This method is now PORTABLE and DYNAMIC - no hardcoded examples!
   */
  getStandardEmbeddedExamples(schema?: ComprehensivePostgreSQLSchema): any {
    if (!schema) {
      return this.getGenericEmbeddedExamples();
    }
    
    return this.createDynamicEmbeddedExamples(schema);
  }

  /**
   * Create generic embedded examples that work for any database
   */
  private getGenericEmbeddedExamples(): any {
    return {
      main_entity_related_data: {
        name: "related_data",
        sourceTable: "related_table",
        description: "Related data embedded in main entity documents",
        fields: [
          { name: "name", type: "string", description: "Related data name" },
          { name: "last_update", type: "date", description: "Last update timestamp" }
        ],
        reason: "1:1 relationship, always needed with main entity data"
      }
    };
  }

  /**
   * Create dynamic embedded examples based on actual schema
   */
  private createDynamicEmbeddedExamples(schema: ComprehensivePostgreSQLSchema): any {
    const examples: any = {};
    
    // Analyze the schema to find embedding opportunities
    const relationships = this.analyzeRelationships(schema);
    
    relationships.forEach(rel => {
      const sourceTable = schema.tables.find(t => t.name === rel.sourceTable);
      const targetTable = schema.tables.find(t => t.name === rel.targetTable);
      
      if (sourceTable && targetTable && this.isEmbeddable(targetTable)) {
        const key = `${sourceTable.name}_${targetTable.name}`;
        examples[key] = {
          name: targetTable.name,
          sourceTable: targetTable.name,
          description: `${targetTable.name} information embedded in ${sourceTable.name} documents`,
          fields: this.extractTableFields(targetTable),
          reason: this.determineEmbeddingReason(rel, sourceTable, targetTable)
        };
      }
    });
    
    return examples;
  }

  /**
   * Extract fields from a table for embedding examples
   */
  private extractTableFields(table: any): any[] {
    if (!table.columns) return [];
    
    return table.columns.map((col: any) => ({
      name: col.name,
      type: col.type,
      description: col.description || `${col.name} field`
    }));
  }

  /**
   * Determine why a table should be embedded
   */
  private determineEmbeddingReason(relationship: any, sourceTable: any, targetTable: any): string {
    if (relationship.relationshipType === "one-to-one") {
      return "1:1 relationship, always needed with main entity data";
    } else if (relationship.relationshipType === "one-to-many") {
      return "1:many relationship, frequently accessed together";
    } else {
      return "Related data frequently accessed together";
    }
  }

  /**
   * Get standard MongoDB document examples
   * This method is now PORTABLE and DYNAMIC - no hardcoded examples!
   */
  getStandardDocumentExamples(schema?: ComprehensivePostgreSQLSchema): any {
    if (!schema) {
      return this.getGenericDocumentExamples();
    }
    
    return this.createDynamicDocumentExamples(schema);
  }

  /**
   * Create generic document examples that work for any database
   */
  private getGenericDocumentExamples(): any {
    return {
      main_entity: {
        id: "example_id",
        name: "Example Entity",
        description: "Example description",
        created_at: "2025-08-26T10:00:00Z",
        updated_at: "2025-08-26T10:00:00Z",
        embedded_data: {
          name: "Embedded Example",
          type: "example_type"
        }
      }
    };
  }

  /**
   * Create dynamic document examples based on actual schema
   */
  private createDynamicDocumentExamples(schema: ComprehensivePostgreSQLSchema): any {
    const examples: any = {};
    
    // Create examples for each main table
    const mainTables = this.identifyMainTables(schema, this.analyzeRelationships(schema));
    
    mainTables.forEach(table => {
      const collectionName = this.pluralize(table.name);
      examples[collectionName] = this.createTableExample(table, schema);
    });
    
    return examples;
  }

  /**
   * Create an example document for a specific table
   */
  private createTableExample(table: any, schema: ComprehensivePostgreSQLSchema): any {
    const example: any = {
      _id: "example_object_id",
      [table.name + "_id"]: 1
    };
    
    // Add sample fields based on table columns
    if (table.columns) {
      table.columns.forEach((col: any) => {
        example[col.name] = this.generateSampleValue(col.type, col.name);
      });
    }
    
    // Add embedded documents if applicable
    const relationships = this.analyzeRelationships(schema);
    const embeddedTables = this.findEmbeddableTables(table, relationships);
    
    embeddedTables.forEach(embeddedTable => {
      example[embeddedTable.name] = this.createEmbeddedExample(embeddedTable);
    });
    
    return example;
  }

  /**
   * Generate sample values for different data types
   */
  private generateSampleValue(type: string, fieldName: string): any {
    const lowerType = type.toLowerCase();
    
    if (lowerType.includes('varchar') || lowerType.includes('text') || lowerType.includes('char')) {
      return `Sample ${fieldName}`;
    } else if (lowerType.includes('int') || lowerType.includes('numeric')) {
      return 1;
    } else if (lowerType.includes('date') || lowerType.includes('timestamp')) {
      return "2025-08-26T10:00:00Z";
    } else if (lowerType.includes('boolean')) {
      return true;
    } else if (lowerType.includes('array')) {
      return ["Sample Item 1", "Sample Item 2"];
    } else {
      return `Sample ${fieldName}`;
    }
  }

  /**
   * Create embedded document example
   */
  private createEmbeddedExample(table: any): any {
    const example: any = {};
    
    if (table.columns) {
      table.columns.forEach((col: any) => {
        example[col.name] = this.generateSampleValue(col.type, col.name);
      });
    }
    
    return example;
  }

  /**
   * Get standard terminology
   */
  getStandardTerminology(): any {
    return {
      collection: "MongoDB collection",
      document: "MongoDB document",
      embedded: "Embedded document",
      reference: "Document reference",
      denormalization: "Strategic denormalization",
      performance: "Query performance",
      optimization: "Schema optimization",
      migration: "Database migration",
      transformation: "Schema transformation"
    };
  }

  /**
   * Get standard design principles
   */
  getStandardDesignPrinciples(): string[] {
    return [
      "Embed Frequently Accessed Data: Related data that's queried together is embedded",
      "Reference Large Collections: Large tables are referenced to avoid document bloat",
      "Optimize for Read Patterns: Schema is optimized for your most common query patterns",
      "Balance Normalization: Strategic denormalization for performance without data redundancy"
    ];
  }

  /**
   * Get standard performance benefits
   */
  getStandardPerformanceBenefits(): string[] {
    return [
      "Faster Queries: No JOINs needed for embedded data",
      "Better Data Locality: Related data stored together",
      "Reduced Network Calls: Single document fetch instead of multiple queries",
      "Atomic Updates: Update related data in single operation",
      "Improved Caching: Better cache hit rates with embedded data"
    ];
  }

  /**
   * Get standard migration strategies
   */
  getStandardMigrationStrategies(): any {
    return {
      embedded: "Convert to embedded documents within parent collections",
      referenced: "Convert to ObjectId references with separate collections",
      hybrid: "Combine embedding for small data, references for large data",
      standalone: "Keep as separate collection for independent access"
    };
  }

  /**
   * Validate consistency across all services
   */
  validateConsistency(schema: ComprehensivePostgreSQLSchema, conversionResult: SchemaConversionResult): string[] {
    const issues: string[] = [];
    
    // Check collection count consistency
    const expectedCollections = Object.keys(this.getStandardCollectionStrategy()).length;
    if (conversionResult.mongodbSchema.length !== expectedCollections) {
      issues.push(`Collection count mismatch: Expected ${expectedCollections}, got ${conversionResult.mongodbSchema.length}`);
    }
    
    // Check collection names consistency
    const standardNames = Object.keys(this.getStandardCollectionStrategy());
    const actualNames = conversionResult.mongodbSchema.map((c: any) => c.name);
    
    standardNames.forEach(name => {
      if (!actualNames.includes(name)) {
        issues.push(`Missing standard collection: ${name}`);
      }
    });
    
    return issues;
  }
}
