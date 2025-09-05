import { ComprehensivePostgreSQLSchema } from './SchemaService.js';
import { MongoDBCollectionSchema } from './MongoDBSchemaGenerator.js';
import { SourceCodeAnalysis, MigrationPlan } from '../types/migration-types.js';
import { DualLocationFileWriter } from '../utils/DualLocationFileWriter.js';
import fs from 'fs';
import path from 'path';

export interface UnifiedERDiagramOptions {
  format: 'mermaid' | 'plantuml' | 'dbml' | 'json';
  includeIndexes: boolean;
  includeConstraints: boolean;
  includeDataTypes: boolean;
  includeCardinality: boolean;
  includeDescriptions: boolean;
  outputPath?: string;
  diagramStyle?: 'detailed' | 'simplified' | 'minimal';
  showMigrationStrategy?: boolean;
  showEmbeddedDocuments?: boolean;
}

export interface UnifiedERDiagramResult {
  success: boolean;
  content: string;
  filePath?: string;
  metadata?: {
    tables?: number;
    collections?: number;
    relationships?: number;
    embeddedDocuments?: number;
    migrationStrategies?: number;
  };
  error?: string;
}

export interface ConsistencyValidationResult {
  isValid: boolean;
  postgresqlTables: number;
  mongodbCollections: number;
  migrationCollections: number;
  mismatches: string[];
  warnings: string[];
}

export class UnifiedERDiagramGenerator {
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
  }

  /**
   * Generate ER diagram for PostgreSQL schema
   */
  async generatePostgreSQLERDiagram(
    schema: ComprehensivePostgreSQLSchema,
    options: UnifiedERDiagramOptions
  ): Promise<UnifiedERDiagramResult> {
    try {
      console.log(`🗺️ Generating PostgreSQL ER diagram in ${options.format.toUpperCase()} format...`);
      
      let content: string;
      let metadata: any = {};

      switch (options.format) {
        case 'mermaid':
          content = this.generatePostgreSQLMermaidDiagram(schema, options);
          metadata = {
            tables: schema.tables.length,
            relationships: schema.relationships.length,
            indexes: schema.indexes.length
          };
          break;
        case 'plantuml':
          content = this.generatePostgreSQLPlantUMLDiagram(schema, options);
          break;
        case 'dbml':
          content = this.generatePostgreSQLDBMLDiagram(schema, options);
          break;
        case 'json':
          content = this.generatePostgreSQLJSONDiagram(schema, options);
          break;
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      // Save to file if output path is specified
      let filePath: string | undefined;
      if (options.outputPath) {
        filePath = await this.saveDiagramToFile(content, options.format, options.outputPath);
      } else {
        filePath = await this.saveDiagramToFile(content, options.format);
      }

      return {
        success: true,
        content,
        filePath,
        metadata
      };

    } catch (error) {
      console.error('❌ PostgreSQL ER diagram generation failed:', error);
      return {
        success: false,
        content: '',
        error: `PostgreSQL ER diagram generation failed: ${error}`
      };
    }
  }

  /**
   * Generate ER diagram for MongoDB schema
   */
  async generateMongoDBERDiagram(
    collections: MongoDBCollectionSchema[],
    options: UnifiedERDiagramOptions
  ): Promise<UnifiedERDiagramResult> {
    try {
      console.log(`🗺️ Generating MongoDB ER diagram in ${options.format.toUpperCase()} format...`);
      
      let content: string;
      let metadata: any = {};

      switch (options.format) {
        case 'mermaid':
          content = this.generateMongoDBMermaidDiagram(collections, options);
          metadata = {
            collections: collections.length,
            embeddedDocuments: collections.reduce((sum, c) => sum + (c.embeddedDocuments?.length || 0), 0),
            references: collections.reduce((sum, c) => sum + (c.references?.length || 0), 0)
          };
          break;
        case 'plantuml':
          content = this.generateMongoDBPlantUMLDiagram(collections, options);
          break;
        case 'dbml':
          content = this.generateMongoDBDBMLDiagram(collections, options);
          break;
        case 'json':
          content = this.generateMongoDBJSONDiagram(collections, options);
          break;
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      // Save to file if output path is specified
      let filePath: string | undefined;
      if (options.outputPath) {
        filePath = await this.saveDiagramToFile(content, options.format, options.outputPath);
      } else {
        filePath = await this.saveDiagramToFile(content, options.format);
      }

      return {
        success: true,
        content,
        filePath,
        metadata
      };

    } catch (error) {
      console.error('❌ MongoDB ER diagram generation failed:', error);
      return {
        success: false,
        content: '',
        error: `MongoDB ER diagram generation failed: ${error}`
      };
    }
  }

  /**
   * Generate ER diagram for migration analysis
   */
  async generateMigrationERDiagram(
    analysis: SourceCodeAnalysis,
    plan: MigrationPlan,
    options: UnifiedERDiagramOptions
  ): Promise<UnifiedERDiagramResult> {
    try {
      console.log(`🗺️ Generating Migration ER diagram in ${options.format.toUpperCase()} format...`);
      
      let content: string;
      let metadata: any = {};

      switch (options.format) {
        case 'mermaid':
          content = this.generateMigrationMermaidDiagram(analysis, plan, options);
          metadata = {
            entities: analysis.entities.length,
            collections: plan.phases.reduce((sum, phase) => sum + (phase as any).collections?.length || 0, 0),
            migrationStrategies: plan.phases.reduce((sum, phase) => 
              sum + ((phase as any).collections?.filter((t: any) => t.migrationStrategy)?.length || 0), 0
            )
          };
          break;
        case 'plantuml':
          content = this.generateMigrationPlantUMLDiagram(analysis, plan, options);
          break;
        case 'dbml':
          content = this.generateMigrationDBMLDiagram(analysis, plan, options);
          break;
        case 'json':
          content = this.generateMigrationJSONDiagram(analysis, plan, options);
          break;
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      // Save to file if output path is specified
      let filePath: string | undefined;
      if (options.outputPath) {
        filePath = await this.saveDiagramToFile(content, options.format, options.outputPath);
      } else {
        filePath = await this.saveDiagramToFile(content, options.format);
      }

      return {
        success: true,
        content,
        filePath,
        metadata
      };

    } catch (error) {
      console.error('❌ Migration ER diagram generation failed:', error);
      return {
        success: false,
        content: '',
        error: `Migration ER diagram generation failed: ${error}`
      };
    }
  }

  /**
   * Validate consistency across all document types
   */
  validateConsistency(
    postgresqlSchema?: ComprehensivePostgreSQLSchema,
    mongodbCollections?: MongoDBCollectionSchema[],
    migrationPlan?: MigrationPlan
  ): ConsistencyValidationResult {
    const result: ConsistencyValidationResult = {
      isValid: true,
      postgresqlTables: 0,
      mongodbCollections: 0,
      migrationCollections: 0,
      mismatches: [],
      warnings: []
    };

    try {
      // Count PostgreSQL tables
      if (postgresqlSchema) {
        result.postgresqlTables = postgresqlSchema.tables.length;
      }

      // Count MongoDB collections
      if (mongodbCollections) {
        result.mongodbCollections = mongodbCollections.length;
      }

      // Count migration collections
      if (migrationPlan) {
        result.migrationCollections = migrationPlan.phases.reduce((sum, phase) => sum + ((phase as any).collections?.length || 0), 0);
      }

      // Validate consistency
      if (postgresqlSchema && mongodbCollections) {
        const postgresTableNames = new Set(postgresqlSchema.tables.map(t => t.name.toLowerCase()));
        const mongoCollectionNames = new Set(mongodbCollections.map(c => c.name.toLowerCase()));

        // Check for tables without MongoDB equivalents
        for (const tableName of postgresTableNames) {
          if (!mongoCollectionNames.has(tableName)) {
            result.mismatches.push(`PostgreSQL table '${tableName}' has no MongoDB collection equivalent`);
          }
        }

        // Check for MongoDB collections without PostgreSQL equivalents
        for (const collectionName of mongoCollectionNames) {
          if (!postgresTableNames.has(collectionName)) {
            result.warnings.push(`MongoDB collection '${collectionName}' has no PostgreSQL table equivalent`);
          }
        }
      }

      // Validate migration plan consistency
      if (mongodbCollections && migrationPlan) {
        const mongoCollectionNames = new Set(mongodbCollections.map(c => c.name.toLowerCase()));
        const migrationTableNames = new Set(
          migrationPlan.phases.flatMap(phase => (phase as any).collections?.map((t: any) => t.name?.toLowerCase() || t.toLowerCase()) || [])
        );

        for (const collectionName of mongoCollectionNames) {
          if (!migrationTableNames.has(collectionName)) {
            result.mismatches.push(`MongoDB collection '${collectionName}' not found in migration plan`);
          }
        }

        for (const tableName of migrationTableNames) {
          if (!mongoCollectionNames.has(tableName)) {
            result.mismatches.push(`Migration table '${tableName}' not found in MongoDB collections`);
          }
        }
      }

      result.isValid = result.mismatches.length === 0;

    } catch (error) {
      result.isValid = false;
      result.mismatches.push(`Consistency validation failed: ${error}`);
    }

    return result;
  }

  /**
   * Generate PostgreSQL Mermaid diagram
   */
  private generatePostgreSQLMermaidDiagram(schema: ComprehensivePostgreSQLSchema, options: UnifiedERDiagramOptions): string {
    let content = '```mermaid\n';
    content += 'erDiagram\n\n';

    // Add tables
    schema.tables.forEach(table => {
      const sanitizedTableName = this.sanitizeMermaidName(table.name);
      content += `    ${sanitizedTableName} {\n`;
      table.columns.forEach(col => {
        const sanitizedColumnName = this.sanitizeMermaidName(col.name);
        const sanitizedType = this.sanitizeMermaidType(col.type);
        let columnLine = `        ${sanitizedType} ${sanitizedColumnName}`;
        if (col.isPrimary) columnLine += ' PK';
        if (col.isForeign) columnLine += ' FK';
        if (!col.nullable) columnLine += ' "NOT NULL"';
        content += columnLine + '\n';
      });
      content += '    }\n\n';
    });

    // Add relationships
    schema.relationships.forEach(rel => {
      const cardinality = this.determineCardinality(rel);
      const sanitizedSourceTable = this.sanitizeMermaidName(rel.sourceTable);
      const sanitizedTargetTable = this.sanitizeMermaidName(rel.targetTable);
      const sanitizedSourceColumn = this.sanitizeMermaidName(rel.sourceColumn);
      const sanitizedTargetColumn = this.sanitizeMermaidName(rel.targetColumn);
      content += `    ${sanitizedSourceTable} ||--${cardinality.source} ${sanitizedTargetTable} : "${sanitizedSourceColumn} -> ${sanitizedTargetColumn}"\n`;
    });

    content += '```\n';
    return content;
  }

  /**
   * Generate MongoDB Mermaid diagram
   */
  private generateMongoDBMermaidDiagram(collections: MongoDBCollectionSchema[], options: UnifiedERDiagramOptions): string {
    let content = '```mermaid\n';
    content += 'erDiagram\n\n';

    // Add collections with intelligent consolidation
    collections.forEach(collection => {
      const sanitizedName = this.sanitizeMermaidName(collection.name);
      content += `    ${sanitizedName} {\n`;
      
      // Add main fields (only essential ones to keep diagram clean)
      const mainFields = collection.fields.filter(field => 
        field.name === '_id' || 
        field.name.includes('id') || 
        field.name.includes('name') || 
        field.name.includes('title') ||
        field.name.includes('date') ||
        field.name.includes('amount') ||
        field.name.includes('rate') ||
        field.name.includes('duration') ||
        field.name.includes('length') ||
        field.name.includes('cost') ||
        field.name.includes('rating') ||
        field.name.includes('active') ||
        field.name.includes('email') ||
        field.name.includes('phone') ||
        field.name.includes('address') ||
        field.name.includes('district') ||
        field.name.includes('postal_code')
      );

      mainFields.forEach(field => {
        const sanitizedFieldName = this.sanitizeMermaidName(field.name);
        const sanitizedType = this.sanitizeMermaidType(field.type);
        let fieldLine = `        ${sanitizedType} ${sanitizedFieldName}`;
        
        // Add field annotations
        if (field.name === '_id') fieldLine += ' PK';
        if (field.required) fieldLine += ' "REQUIRED"';
        
        content += fieldLine + '\n';
      });

      // Add embedded documents as clean objects
      if (options.showEmbeddedDocuments && collection.embeddedDocuments) {
        collection.embeddedDocuments.forEach(embedded => {
          const sanitizedEmbeddedName = this.sanitizeMermaidName(embedded.name);
          content += `        object ${sanitizedEmbeddedName} "EMBEDDED"\n`;
          
          // Add only key embedded fields to keep diagram clean
          if (embedded.fields && embedded.fields.length > 0) {
            const keyEmbeddedFields = embedded.fields.filter(field => 
              field.name.includes('id') || 
              field.name.includes('name') || 
              field.name.includes('title') ||
              field.name.includes('date') ||
              field.name.includes('address') ||
              field.name.includes('city') ||
              field.name.includes('country') ||
              field.name.includes('language') ||
              field.name.includes('category') ||
              field.name.includes('actor')
            );
            
            keyEmbeddedFields.forEach(embeddedField => {
              const sanitizedEmbeddedFieldName = this.sanitizeMermaidName(embeddedField.name);
              content += `        string ${sanitizedEmbeddedName}_${sanitizedEmbeddedFieldName} "EMBEDDED_FIELD"\n`;
            });
          }
        });
      }

      content += '    }\n\n';
    });

    // Add references between collections with detailed relationship information
    collections.forEach(collection => {
      if (collection.references) {
        collection.references.forEach(ref => {
          const sanitizedSourceName = this.sanitizeMermaidName(collection.name);
          const sanitizedTargetName = this.sanitizeMermaidName(ref.collection);
          const sanitizedFieldName = this.sanitizeMermaidName(ref.field);
          const sanitizedTargetFieldName = this.sanitizeMermaidName('_id');
          
          // Add relationship with description
          const relationshipDesc = ref.description ? `"${ref.description}"` : `"${sanitizedFieldName} -> ${sanitizedTargetFieldName}"`;
          content += `    ${sanitizedSourceName} ||--o{ ${sanitizedTargetName} : ${relationshipDesc}\n`;
        });
      }
    });

    // Add embedded document relationships (showing which collections embed which documents)
    if (options.showEmbeddedDocuments) {
      collections.forEach(collection => {
        if (collection.embeddedDocuments) {
          collection.embeddedDocuments.forEach(embedded => {
            const sanitizedCollectionName = this.sanitizeMermaidName(collection.name);
            const sanitizedEmbeddedName = this.sanitizeMermaidName(embedded.name);
            
            // Show embedding relationship
            content += `    ${sanitizedCollectionName} ||--|| ${sanitizedEmbeddedName} : "EMBEDS"\n`;
          });
        }
      });
    }

    content += '```\n';
    return content;
  }

  /**
   * Generate Migration Mermaid diagram
   */
  private generateMigrationMermaidDiagram(analysis: SourceCodeAnalysis, plan: MigrationPlan, options: UnifiedERDiagramOptions): string {
    let content = '```mermaid\n';
    content += 'erDiagram\n\n';

    // Add collections from migration plan
    plan.phases.forEach(phase => {
      const collections = (phase as any).collections || [];
      collections.forEach((table: any) => {
        const tableName = typeof table === 'string' ? table : table.name;
        const sanitizedTableName = this.sanitizeMermaidName(tableName);
        content += `    ${sanitizedTableName} {\n`;
        content += `        string _id PK\n`;
        content += `        string migrated_at\n`;
        content += `        string source_table\n`;
        
        if (options.showMigrationStrategy && table.migrationStrategy) {
          const sanitizedStrategy = this.sanitizeMermaidName(table.migrationStrategy);
          content += `        string migration_strategy "${sanitizedStrategy}"\n`;
        }
        
        content += '    }\n\n';
      });
    });

    // Add relationships based on dependencies
    plan.phases.forEach(phase => {
      const collections = (phase as any).collections || [];
      collections.forEach((table: any) => {
        if (table.dependencies && table.dependencies.length > 0) {
          const tableName = typeof table === 'string' ? table : table.name;
          const sanitizedTableName = this.sanitizeMermaidName(tableName);
          table.dependencies.forEach((dep: any) => {
            const sanitizedDepName = this.sanitizeMermaidName(dep);
            content += `    ${sanitizedDepName} ||--o{ ${sanitizedTableName} : "dependency"\n`;
          });
        }
      });
    });

    content += '```\n';
    return content;
  }

  /**
   * Generate PlantUML diagrams (placeholder implementations)
   */
  private generatePostgreSQLPlantUMLDiagram(schema: ComprehensivePostgreSQLSchema, options: UnifiedERDiagramOptions): string {
    // Implementation for PlantUML format
    return '// PlantUML implementation for PostgreSQL\n';
  }

  private generateMongoDBPlantUMLDiagram(collections: MongoDBCollectionSchema[], options: UnifiedERDiagramOptions): string {
    // Implementation for PlantUML format
    return '// PlantUML implementation for MongoDB\n';
  }

  private generateMigrationPlantUMLDiagram(analysis: SourceCodeAnalysis, plan: MigrationPlan, options: UnifiedERDiagramOptions): string {
    // Implementation for PlantUML format
    return '// PlantUML implementation for Migration\n';
  }

  /**
   * Generate DBML diagrams (placeholder implementations)
   */
  private generatePostgreSQLDBMLDiagram(schema: ComprehensivePostgreSQLSchema, options: UnifiedERDiagramOptions): string {
    // Implementation for DBML format
    return '// DBML implementation for PostgreSQL\n';
  }

  private generateMongoDBDBMLDiagram(collections: MongoDBCollectionSchema[], options: UnifiedERDiagramOptions): string {
    // Implementation for DBML format
    return '// DBML implementation for MongoDB\n';
  }

  private generateMigrationDBMLDiagram(analysis: SourceCodeAnalysis, plan: MigrationPlan, options: UnifiedERDiagramOptions): string {
    // Implementation for DBML format
    return '// DBML implementation for Migration\n';
  }

  /**
   * Generate JSON diagrams (placeholder implementations)
   */
  private generatePostgreSQLJSONDiagram(schema: ComprehensivePostgreSQLSchema, options: UnifiedERDiagramOptions): string {
    // Implementation for JSON format
    return '// JSON implementation for PostgreSQL\n';
  }

  private generateMongoDBJSONDiagram(collections: MongoDBCollectionSchema[], options: UnifiedERDiagramOptions): string {
    // Implementation for JSON format
    return '// JSON implementation for MongoDB\n';
  }

  private generateMigrationJSONDiagram(analysis: SourceCodeAnalysis, plan: MigrationPlan, options: UnifiedERDiagramOptions): string {
    // Implementation for JSON format
    return '// JSON implementation for Migration\n';
  }

  /**
   * Determine relationship cardinality
   */
  private determineCardinality(relationship: any): { source: string; target: string } {
    // Simplified cardinality determination
    // In a real implementation, this would analyze the actual relationship constraints
    return {
      source: 'o{',
      target: '||'
    };
  }

  /**
   * Save diagram to file
   */
  private async saveDiagramToFile(content: string, format: string, customPath?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const extension = format === 'json' ? 'json' : format === 'plantuml' ? 'puml' : 'md';
    const filename = `er_diagram_${timestamp}.${extension}`;
    
    if (customPath) {
      // If custom path is provided, use it directly
      const filePath = path.join(customPath, filename);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content, 'utf8');
      return filePath;
    } else {
      // Use dual location writing for default behavior
      const { centralPath, projectPath } = DualLocationFileWriter.writeDiagramToBothLocations(filename, content);
      return centralPath; // Return central path as primary location
    }
  }

  /**
   * Sanitize names for Mermaid syntax
   */
  private sanitizeMermaidName(name: string): string {
    // Remove special characters and replace with underscores
    return name
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .replace(/_+/g, '_'); // Replace multiple underscores with single
  }

  /**
   * Sanitize types for Mermaid syntax
   */
  private sanitizeMermaidType(type: string): string {
    // Map MongoDB types to Mermaid-compatible types
    const typeMap: { [key: string]: string } = {
      'ObjectId': 'string',
      'String': 'string',
      'Number': 'number',
      'Date': 'date',
      'Boolean': 'boolean',
      'Array': 'array',
      'Object': 'object',
      'Mixed': 'mixed',
      'Decimal128': 'decimal',
      'Int32': 'int',
      'Int64': 'long',
      'Double': 'double'
    };

    const sanitizedType = typeMap[type] || 'string';
    return this.sanitizeMermaidName(sanitizedType);
  }
}
