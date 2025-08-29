import { TableSchema, ColumnSchema, ForeignKeySchema, CollectionSchema, FieldSchema, IndexSchema } from '../types/index.js';
import { PostgreSQLService } from './PostgreSQLService.js';
import { SemanticRelationship, DataFlowPattern, BusinessProcess, BusinessRule } from '../types/index.js';

export interface IntelligentCollectionDesign {
  name: string;
  fields: FieldSchema[];
  embeddedDocuments: EmbeddedDocument[];
  indexes: IndexSchema[];
  optimizationStrategy: 'read_heavy' | 'write_heavy' | 'balanced';
  migrationComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedEffort: number; // hours
  businessJustification: string;
}

export interface EmbeddedDocument {
  name: string;
  sourceTables: string[];
  fields: FieldSchema[];
  relationshipType: 'one_to_one' | 'one_to_many' | 'many_to_many';
  embeddingStrategy: 'full_embed' | 'partial_embed' | 'reference';
  businessLogic: string;
}

export interface ForeignKeyAnalysis {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  relationshipStrength: 'strong' | 'weak' | 'optional';
  usageFrequency: 'high' | 'medium' | 'low';
  embeddingRecommendation: 'embed' | 'reference' | 'hybrid';
  businessContext: string;
}

export interface IntelligentDesignStrategy {
  collections: IntelligentCollectionDesign[];
  embeddedDocuments: EmbeddedDocument[];
  relationships: ForeignKeyAnalysis[];
  optimizationRecommendations: string[];
  migrationSteps: MigrationStep[];
  estimatedTotalEffort: number;
}

export interface MigrationStep {
  step: number;
  action: string;
  description: string;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedTime: number; // hours
  dependencies: string[];
  codeExamples: string[];
}

export class IntelligentMongoDBDesigner {
  private postgresqlService: PostgreSQLService;

  constructor(postgresqlService: PostgreSQLService) {
    this.postgresqlService = postgresqlService;
  }

  /**
   * Design intelligent MongoDB collections based on PostgreSQL schema analysis
   */
  async designIntelligentCollections(
    postgresSchema: TableSchema[],
    intelligenceData?: {
      storedProcedures?: any[];
      queryPatterns?: any[];
      performanceMetrics?: any[];
      businessWorkflows?: any[];
    }
  ): Promise<IntelligentDesignStrategy> {
    try {
      console.log('🧠 Starting intelligent MongoDB collection design...');
      
      // Step 1: Analyze foreign key relationships
      const foreignKeyAnalysis = await this.analyzeForeignKeyRelationships(postgresSchema);
      console.log(`✅ Analyzed ${foreignKeyAnalysis.length} foreign key relationships`);
      
      // Step 2: Identify embedding opportunities
      const embeddingOpportunities = await this.identifyEmbeddingOpportunities(foreignKeyAnalysis);
      console.log(`✅ Identified ${embeddingOpportunities.length} embedding opportunities`);
      
      // Step 3: Design intelligent collections
      const intelligentCollections = await this.designCollections(postgresSchema, embeddingOpportunities);
      console.log(`✅ Designed ${intelligentCollections.length} intelligent collections`);
      
      // Step 4: Generate migration strategy
      const migrationStrategy = await this.generateMigrationStrategy(intelligentCollections, embeddingOpportunities);
      
      // Step 5: Create optimization recommendations
      const optimizationRecommendations = await this.generateOptimizationRecommendations(
        intelligentCollections,
        intelligenceData
      );
      
      const strategy: IntelligentDesignStrategy = {
        collections: intelligentCollections,
        embeddedDocuments: embeddingOpportunities,
        relationships: foreignKeyAnalysis,
        optimizationRecommendations,
        migrationSteps: migrationStrategy,
        estimatedTotalEffort: migrationStrategy.reduce((sum, step) => sum + step.estimatedTime, 0)
      };
      
      console.log('🎉 Intelligent MongoDB design completed successfully');
      return strategy;
      
    } catch (error) {
      console.error('❌ Intelligent MongoDB design failed:', error);
      throw error;
    }
  }

  /**
   * Analyze foreign key relationships to understand table dependencies
   */
  private async analyzeForeignKeyRelationships(schema: TableSchema[]): Promise<ForeignKeyAnalysis[]> {
    const relationships: ForeignKeyAnalysis[] = [];
    
    for (const table of schema) {
      if (table.foreignKeys && table.foreignKeys.length > 0) {
        for (const fk of table.foreignKeys) {
          const targetTable = schema.find(t => t.name === fk.referencedTable);
          if (targetTable) {
            const relationship = await this.analyzeRelationshipStrength(table, targetTable, fk);
            relationships.push(relationship);
          }
        }
      }
    }
    
    return relationships;
  }

  /**
   * Analyze the strength and characteristics of a foreign key relationship
   */
  private async analyzeRelationshipStrength(
    sourceTable: TableSchema,
    targetTable: TableSchema,
    foreignKey: ForeignKeySchema
  ): Promise<ForeignKeyAnalysis> {
    // Analyze table sizes and relationship patterns
    const sourceSize = await this.getTableSize(sourceTable.name);
    const targetSize = await this.getTableSize(targetTable.name);
    
    // Determine relationship strength based on cardinality and usage
    let relationshipStrength: 'strong' | 'weak' | 'optional' = 'weak';
    let usageFrequency: 'high' | 'medium' | 'low' = 'medium';
    let embeddingRecommendation: 'embed' | 'reference' | 'hybrid' = 'reference';
    
    // Analyze cardinality
    if (sourceSize > targetSize * 10) {
      // Many-to-one relationship (many source records point to few target records)
      relationshipStrength = 'strong';
      embeddingRecommendation = 'embed';
    } else if (sourceSize < targetSize * 0.1) {
      // One-to-many relationship (few source records, many target records)
      relationshipStrength = 'weak';
      embeddingRecommendation = 'reference';
    } else {
      // Balanced relationship
      relationshipStrength = 'weak';
      embeddingRecommendation = 'hybrid';
    }
    
    // Determine usage frequency based on table characteristics
    if (sourceTable.columns.length > 10 || targetTable.columns.length > 10) {
      usageFrequency = 'high';
    } else if (sourceTable.columns.length > 5 || targetTable.columns.length > 5) {
      usageFrequency = 'medium';
    } else {
      usageFrequency = 'low';
    }
    
    return {
      sourceTable: sourceTable.name,
      sourceColumn: foreignKey.column,
      targetTable: targetTable.name,
      targetColumn: foreignKey.referencedColumn,
      relationshipStrength,
      usageFrequency,
      embeddingRecommendation,
      businessContext: this.generateBusinessContext(sourceTable, targetTable, foreignKey)
    };
  }

  /**
   * Get table size (record count) for relationship analysis
   */
  private async getTableSize(tableName: string): Promise<number> {
    try {
      const result = await this.postgresqlService.executeQuery(`SELECT COUNT(*) as count FROM ${tableName}`);
      return result.data?.[0]?.count || 0;
    } catch (error) {
      console.warn(`⚠️ Could not get size for table ${tableName}:`, error);
      return 1000; // Default assumption
    }
  }

  /**
   * Generate business context for a relationship
   */
  private generateBusinessContext(
    sourceTable: TableSchema,
    targetTable: TableSchema,
    foreignKey: ForeignKeySchema
  ): string {
    const sourceName = sourceTable.name.toLowerCase();
    const targetName = targetTable.name.toLowerCase();
    
    // Generate meaningful business context based on table names
    if (sourceName.includes('order') && targetName.includes('user')) {
      return 'Orders belong to users - strong ownership relationship';
    } else if (sourceName.includes('user') && targetName.includes('profile')) {
      return 'User profile information - one-to-one relationship';
    } else if (sourceName.includes('item') && targetName.includes('category')) {
      return 'Items belong to categories - classification relationship';
    } else if (sourceName.includes('city') && targetName.includes('country')) {
      return 'Cities belong to countries - geographical hierarchy';
    } else {
      return `${sourceTable.name} references ${targetTable.name} - business relationship`;
    }
  }

  /**
   * Identify opportunities for embedding documents
   */
  private async identifyEmbeddingOpportunities(relationships: ForeignKeyAnalysis[]): Promise<EmbeddedDocument[]> {
    const embeddingOpportunities: EmbeddedDocument[] = [];
    
    for (const relationship of relationships) {
      if (relationship.embeddingRecommendation === 'embed') {
        const embeddedDoc = await this.createEmbeddedDocument(relationship);
        if (embeddedDoc) {
          embeddingOpportunities.push(embeddedDoc);
        }
      }
    }
    
    return embeddingOpportunities;
  }

  /**
   * Create an embedded document design based on a relationship
   */
  private async createEmbeddedDocument(relationship: ForeignKeyAnalysis): Promise<EmbeddedDocument | null> {
    try {
      // Get the target table schema to understand what fields to embed
      const targetTable = await this.postgresqlService.getTableSchema(relationship.targetTable);
      if (!targetTable) return null;
      
      // Determine embedding strategy based on relationship characteristics
      let embeddingStrategy: 'full_embed' | 'partial_embed' | 'reference' = 'full_embed';
      let relationshipType: 'one_to_one' | 'one_to_many' | 'many_to_many' = 'one_to_one';
      
      if (relationship.relationshipStrength === 'strong') {
        embeddingStrategy = 'full_embed';
        relationshipType = 'one_to_many';
      } else if (relationship.usageFrequency === 'high') {
        embeddingStrategy = 'partial_embed';
        relationshipType = 'one_to_one';
      } else {
        embeddingStrategy = 'reference';
        relationshipType = 'one_to_many';
      }
      
      // Create embedded document fields
      const fields: FieldSchema[] = targetTable.columns.map(col => ({
        name: col.name,
        type: this.mapPostgreSQLToMongoDBType(col.type),
        required: !col.nullable,
        default: col.defaultValue
      }));
      
      return {
        name: relationship.targetTable.toLowerCase(),
        sourceTables: [relationship.sourceTable, relationship.targetTable],
        fields,
        relationshipType,
        embeddingStrategy,
        businessLogic: relationship.businessContext
      };
      
    } catch (error) {
      console.warn(`⚠️ Could not create embedded document for ${relationship.targetTable}:`, error);
      return null;
    }
  }

  /**
   * Design intelligent MongoDB collections
   */
  private async designCollections(
    postgresSchema: TableSchema[],
    embeddingOpportunities: EmbeddedDocument[]
  ): Promise<IntelligentCollectionDesign[]> {
    const collections: IntelligentCollectionDesign[] = [];
    
    for (const table of postgresSchema) {
      // Check if this table should be embedded in another collection
      const shouldBeEmbedded = embeddingOpportunities.some(opp => 
        opp.sourceTables.includes(table.name)
      );
      
      if (!shouldBeEmbedded) {
        // This table becomes a standalone collection
        const collection = await this.designStandaloneCollection(table, embeddingOpportunities);
        collections.push(collection);
      }
    }
    
    return collections;
  }

  /**
   * Design a standalone MongoDB collection
   */
  private async designStandaloneCollection(
    table: TableSchema,
    embeddingOpportunities: EmbeddedDocument[]
  ): Promise<IntelligentCollectionDesign> {
    // Find embedded documents that belong to this table
    const embeddedDocs = embeddingOpportunities.filter(opp => 
      opp.sourceTables.includes(table.name)
    );
    
    // Create collection fields
    const fields: FieldSchema[] = table.columns.map(col => ({
      name: col.name,
      type: this.mapPostgreSQLToMongoDBType(col.type),
      required: !col.nullable,
      default: col.defaultValue
    }));
    
    // Add embedded document fields
    const embeddedDocuments: EmbeddedDocument[] = [];
    for (const embeddedDoc of embeddedDocs) {
      embeddedDocuments.push(embeddedDoc);
    }
    
    // Determine optimization strategy
    const optimizationStrategy = this.determineOptimizationStrategy(table);
    
    // Calculate migration complexity
    const migrationComplexity = this.calculateMigrationComplexity(table, embeddedDocuments);
    
    // Estimate effort
    const estimatedEffort = this.estimateMigrationEffort(table, embeddedDocuments);
    
    return {
      name: table.name.toLowerCase(),
      fields,
      embeddedDocuments,
      indexes: this.designIndexes(table),
      optimizationStrategy,
      migrationComplexity,
      estimatedEffort,
      businessJustification: this.generateBusinessJustification(table, embeddedDocuments)
    };
  }

  /**
   * Map PostgreSQL types to MongoDB types
   */
  private mapPostgreSQLToMongoDBType(postgresType: string): string {
    const typeMap: { [key: string]: string } = {
      'integer': 'number',
      'bigint': 'number',
      'smallint': 'number',
      'decimal': 'number',
      'numeric': 'number',
      'real': 'number',
      'double precision': 'number',
      'text': 'string',
      'varchar': 'string',
      'char': 'string',
      'boolean': 'boolean',
      'timestamp': 'date',
      'timestamptz': 'date',
      'date': 'date',
      'time': 'string',
      'json': 'object',
      'jsonb': 'object',
      'uuid': 'string',
      'bytea': 'binary'
    };
    
    return typeMap[postgresType.toLowerCase()] || 'string';
  }

  /**
   * Determine optimization strategy for a collection
   */
  private determineOptimizationStrategy(table: TableSchema): 'read_heavy' | 'write_heavy' | 'balanced' {
    // Analyze table characteristics to determine optimization strategy
    const hasManyIndexes = table.foreignKeys && table.foreignKeys.length > 2;
    const hasComplexStructure = table.columns.length > 8;
    
    if (hasManyIndexes && hasComplexStructure) {
      return 'read_heavy'; // Optimize for queries
    } else if (table.columns.length < 5) {
      return 'write_heavy'; // Optimize for inserts/updates
    } else {
      return 'balanced'; // Balanced optimization
    }
  }

  /**
   * Calculate migration complexity
   */
  private calculateMigrationComplexity(
    table: TableSchema,
    embeddedDocuments: EmbeddedDocument[]
  ): 'LOW' | 'MEDIUM' | 'HIGH' {
    let complexity = 0;
    
    // Base complexity from table structure
    complexity += table.columns.length * 0.5;
    complexity += (table.foreignKeys?.length || 0) * 2;
    complexity += embeddedDocuments.length * 3;
    
    // Additional complexity factors
    if (table.columns.some(col => col.type.includes('json'))) complexity += 2;
    if (table.columns.some(col => col.type.includes('timestamp'))) complexity += 1;
    
    if (complexity < 5) return 'LOW';
    if (complexity < 10) return 'MEDIUM';
    return 'HIGH';
  }

  /**
   * Estimate migration effort in hours
   */
  private estimateMigrationEffort(
    table: TableSchema,
    embeddedDocuments: EmbeddedDocument[]
  ): number {
    let effort = 2; // Base effort
    
    // Add effort based on complexity
    effort += table.columns.length * 0.2;
    effort += (table.foreignKeys?.length || 0) * 0.5;
    effort += embeddedDocuments.length * 1.5;
    
    // Round to nearest 0.5 hour
    return Math.round(effort * 2) / 2;
  }

  /**
   * Design indexes for the collection
   */
  private designIndexes(table: TableSchema): IndexSchema[] {
    const indexes: IndexSchema[] = [];
    
    // Primary key index
    if (table.primaryKey) {
      indexes.push({
        name: `${table.name}_pkey`,
        fields: [table.primaryKey],
        unique: true,
        primary: true
      });
    }
    
    // Foreign key indexes
    if (table.foreignKeys) {
      for (const fk of table.foreignKeys) {
        indexes.push({
          name: `${table.name}_${fk.column}_idx`,
          fields: [fk.column],
          unique: false
        });
      }
    }
    
    // Common query field indexes
    const commonFields = ['created_at', 'updated_at', 'status', 'type'];
    for (const field of commonFields) {
      if (table.columns.some(col => col.name === field)) {
        indexes.push({
          name: `${table.name}_${field}_idx`,
          fields: [field],
          unique: false
        });
      }
    }
    
    return indexes;
  }

  /**
   * Generate business justification for the design
   */
  private generateBusinessJustification(
    table: TableSchema,
    embeddedDocuments: EmbeddedDocument[]
  ): string {
    let justification = `Collection ${table.name} designed for ${table.columns.length} fields`;
    
    if (embeddedDocuments.length > 0) {
      justification += ` with ${embeddedDocuments.length} embedded documents`;
    }
    
    if (table.foreignKeys && table.foreignKeys.length > 0) {
      justification += `. Contains ${table.foreignKeys.length} relationship(s)`;
    }
    
    return justification;
  }

  /**
   * Generate migration strategy
   */
  private async generateMigrationStrategy(
    collections: IntelligentCollectionDesign[],
    embeddedDocuments: EmbeddedDocument[]
  ): Promise<MigrationStep[]> {
    const steps: MigrationStep[] = [];
    let stepNumber = 1;
    
    // Step 1: Analyze current PostgreSQL structure
    steps.push({
      step: stepNumber++,
      action: 'Analyze PostgreSQL Schema',
      description: 'Extract current table structures, relationships, and constraints',
      complexity: 'LOW',
      estimatedTime: 1,
      dependencies: [],
      codeExamples: [
        '-- Analyze table structure',
        'SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = \'public\';',
        '',
        '-- Analyze foreign keys',
        'SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name FROM information_schema.table_constraints AS tc JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name WHERE tc.constraint_type = \'FOREIGN KEY\';'
      ]
    });
    
    // Step 2: Design MongoDB collections
    steps.push({
      step: stepNumber++,
      action: 'Design MongoDB Collections',
      description: 'Create intelligent collection design with embedded documents',
      complexity: 'MEDIUM',
      estimatedTime: 2,
      dependencies: ['Analyze PostgreSQL Schema'],
      codeExamples: [
        '// Example collection design',
        'const userCollection = {',
        '  name: "users",',
        '  fields: ["id", "name", "email", "created_at"],',
        '  embeddedDocuments: [{',
        '    name: "profile",',
        '    fields: ["bio", "avatar", "preferences"]',
        '  }]',
        '};'
      ]
    });
    
    // Step 3: Create data migration scripts
    steps.push({
      step: stepNumber++,
      action: 'Create Data Migration Scripts',
      description: 'Develop scripts to migrate data from PostgreSQL to MongoDB with embedded documents',
      complexity: 'HIGH',
      estimatedTime: 4,
      dependencies: ['Design MongoDB Collections'],
      codeExamples: [
        '// Example migration script',
        'async function migrateUsers() {',
        '  const users = await postgres.query("SELECT * FROM users");',
        '  for (const user of users) {',
        '    const profile = await postgres.query("SELECT * FROM profiles WHERE user_id = $1", [user.id]);',
        '    const mongoUser = {',
        '      ...user,',
        '      profile: profile[0] || {}',
        '    };',
        '    await mongo.collection("users").insertOne(mongoUser);',
        '  }',
        '}'
      ]
    });
    
    // Step 4: Update application code
    steps.push({
      step: stepNumber++,
      action: 'Update Application Code',
      description: 'Modify Spring Boot entities, repositories, and services for MongoDB',
      complexity: 'HIGH',
      estimatedTime: 6,
      dependencies: ['Create Data Migration Scripts'],
      codeExamples: [
        '// Before: JPA Entity',
        '@Entity',
        '@Table(name = "users")',
        'public class User {',
        '  @Id @GeneratedValue',
        '  private Long id;',
        '  private String name;',
        '  @OneToOne(mappedBy = "user")',
        '  private Profile profile;',
        '}',
        '',
        '// After: MongoDB Document',
        '@Document(collection = "users")',
        'public class User {',
        '  @Id',
        '  private String id;',
        '  private String name;',
        '  private Profile profile; // Embedded document',
        '}'
      ]
    });
    
    // Step 5: Update configuration
    steps.push({
      step: stepNumber++,
      action: 'Update Configuration',
      description: 'Modify application.properties, dependencies, and database configuration',
      complexity: 'MEDIUM',
      estimatedTime: 2,
      dependencies: ['Update Application Code'],
      codeExamples: [
        '// pom.xml changes',
        '<dependency>',
        '  <groupId>org.springframework.boot</groupId>',
        '  <artifactId>spring-boot-starter-data-mongodb</artifactId>',
        '</dependency>',
        '',
        '// application.properties',
        'spring.data.mongodb.uri=mongodb://localhost:27017/mydb',
        'spring.data.mongodb.database=mydb'
      ]
    });
    
    // Step 6: Testing and validation
    steps.push({
      step: stepNumber++,
      action: 'Testing and Validation',
      description: 'Test data integrity, performance, and application functionality',
      complexity: 'MEDIUM',
      estimatedTime: 3,
      dependencies: ['Update Configuration'],
      codeExamples: [
        '// Test data integrity',
        'const migratedCount = await mongo.collection("users").countDocuments();',
        'const originalCount = await postgres.query("SELECT COUNT(*) FROM users");',
        'assert.strictEqual(migratedCount, originalCount.rows[0].count);',
        '',
        '// Test embedded documents',
        'const user = await mongo.collection("users").findOne({ "profile.bio": { $exists: true } });',
        'assert.ok(user.profile && user.profile.bio);'
      ]
    });
    
    return steps;
  }

  /**
   * Generate migration steps dynamically based on actual schema
   */
  private generateMigrationSteps(collections: IntelligentCollectionDesign[]): any[] {
    const steps = [];
    let stepNumber = 1;

    // Step 1: Data preparation
    steps.push({
      step: stepNumber++,
      action: 'Data Preparation',
      description: 'Prepare and validate source data for migration',
      complexity: 'MEDIUM',
      estimatedTime: 2,
      dependencies: [],
      codeExamples: [
        '// Validate data integrity before migration',
        'const validationResult = await validateSourceData(sourceTables);',
        'if (!validationResult.isValid) {',
        '  throw new Error("Source data validation failed");',
        '}'
      ]
    });

    // Step 2: Create MongoDB collections
    steps.push({
      step: stepNumber++,
      action: 'Create MongoDB Collections',
      description: 'Create target MongoDB collections with proper indexes',
      complexity: 'MEDIUM',
      estimatedTime: 3,
      dependencies: ['Data Preparation'],
      codeExamples: [
        '// Create collections with proper structure',
        'for (const collection of collections) {',
        '  await mongo.createCollection(collection.name);',
        '  if (collection.indexes.length > 0) {',
        '    await createIndexes(collection.name, collection.indexes);',
        '  }',
        '}'
      ]
    });

    // Step 3: Create data migration scripts
    steps.push({
      step: stepNumber++,
      action: 'Create Data Migration Scripts',
      description: 'Generate scripts to migrate data from PostgreSQL to MongoDB',
      complexity: 'HIGH',
      estimatedTime: 4,
      dependencies: ['Create MongoDB Collections'],
      codeExamples: [
        '// Generate migration script for each collection',
        'for (const collection of collections) {',
        '  const script = generateMigrationScript(collection);',
        '  await saveMigrationScript(collection.name, script);',
        '}'
      ]
    });

    // Step 4: Update application code
    steps.push({
      step: stepNumber++,
      action: 'Update Application Code',
      description: 'Modify application entities, repositories, and services for MongoDB',
      complexity: 'HIGH',
      estimatedTime: 6,
      dependencies: ['Create Data Migration Scripts'],
      codeExamples: [
        '// Update entity annotations for MongoDB',
        '// Before: JPA Entity',
        '@Entity',
        '@Table(name = "table_name")',
        'public class Entity {',
        '  @Id @GeneratedValue',
        '  private Long id;',
        '}',
        '',
        '// After: MongoDB Document',
        '@Document(collection = "collection_name")',
        'public class Entity {',
        '  @Id',
        '  private String id;',
        '}'
      ]
    });

    // Step 5: Update configuration
    steps.push({
      step: stepNumber++,
      action: 'Update Configuration',
      description: 'Modify application configuration for MongoDB',
      complexity: 'MEDIUM',
      estimatedTime: 2,
      dependencies: ['Update Application Code'],
      codeExamples: [
        '// Update dependencies',
        '<dependency>',
        '  <groupId>org.springframework.boot</groupId>',
        '  <artifactId>spring-boot-starter-data-mongodb</artifactId>',
        '</dependency>',
        '',
        '// Update application properties',
        'spring.data.mongodb.uri=mongodb://localhost:27017/database_name',
        'spring.data.mongodb.database=database_name'
      ]
    });

    // Step 6: Testing and validation
    steps.push({
      step: stepNumber++,
      action: 'Testing and Validation',
      description: 'Test data integrity, performance, and application functionality',
      complexity: 'MEDIUM',
      estimatedTime: 3,
      dependencies: ['Update Configuration'],
      codeExamples: [
        '// Test data integrity',
        'const migratedCount = await mongo.collection("collection_name").countDocuments();',
        'const originalCount = await postgres.query("SELECT COUNT(*) FROM table_name");',
        'assert.strictEqual(migratedCount, originalCount.rows[0].count);',
        '',
        '// Test embedded documents',
        'const doc = await mongo.collection("collection_name").findOne({ "embedded_field": { $exists: true } });',
        'assert.ok(doc.embedded_field);'
      ]
    });

    return steps;
  }

  /**
   * Generate optimization recommendations based on actual collection characteristics
   */
  private async generateOptimizationRecommendations(
    collections: IntelligentCollectionDesign[],
    intelligenceData?: any
  ): Promise<string[]> {
    const recommendations: string[] = [];
    
    // Collection-specific recommendations based on actual characteristics
    for (const collection of collections) {
      if (collection.optimizationStrategy === 'read_heavy') {
        recommendations.push(`Collection ${collection.name}: Add compound indexes for frequently queried field combinations`);
      } else if (collection.optimizationStrategy === 'write_heavy') {
        recommendations.push(`Collection ${collection.name}: Minimize indexes to optimize write performance`);
      }
      
      if (collection.embeddedDocuments && collection.embeddedDocuments.length > 3) {
        recommendations.push(`Collection ${collection.name}: Consider splitting large embedded documents for better performance`);
      }
      
      if (collection.fields.length > 20) {
        recommendations.push(`Collection ${collection.name}: Consider denormalization for frequently accessed fields`);
      }
    }
    
    // General recommendations based on actual schema
    if (collections.length > 10) {
      recommendations.push('Use MongoDB aggregation pipeline for complex queries instead of multiple database calls');
    }
    
    if (collections.some(c => c.embeddedDocuments && c.embeddedDocuments.length > 0)) {
      recommendations.push('Implement connection pooling for better performance under high load');
    }
    
    if (collections.some(c => c.embeddedDocuments && c.embeddedDocuments.length > 0)) {
      recommendations.push('Use MongoDB transactions for operations that require atomicity across multiple collections');
    }
    
    return recommendations;
  }
}
