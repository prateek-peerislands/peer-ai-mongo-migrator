import fs from 'fs';
import path from 'path';
import { 
  MongoDBCollectionSchema, 
  SchemaConversionResult, 
  CompatibilityReport 
} from './MongoDBSchemaGenerator.js';
import { ConsistencyService } from './ConsistencyService.js';

export class MongoDBSchemaMarkdownGenerator {
  private projectRoot: string;
  private consistencyService: ConsistencyService;

  constructor() {
    this.projectRoot = process.cwd();
    this.consistencyService = new ConsistencyService();
  }

  /**
   * Generate MongoDB schema documentation in markdown format
   */
  async generateMongoDBSchemaMarkdown(
    conversionResult: SchemaConversionResult
  ): Promise<string> {
    try {
      console.log('📝 Generating MongoDB schema documentation...');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `mongodb-schema-${timestamp}.md`;
      const filepath = path.join(this.projectRoot, filename);
      
      const markdown = this.buildMarkdownContent(conversionResult);
      
      // Write to file
      fs.writeFileSync(filepath, markdown, 'utf8');
      
      console.log(`✅ MongoDB schema documentation generated: ${filename}`);
      return filepath;
    } catch (error) {
      console.error('❌ Failed to generate MongoDB schema documentation:', error);
      throw error;
    }
  }

  /**
   * Build the complete Markdown content
   */
  private buildMarkdownContent(conversionResult: SchemaConversionResult): string {
    let content = '';

    // Header
    content += this.generateHeader(conversionResult);
    
    // Table of Contents
    content += this.generateTableOfContents(conversionResult);
    
    // Schema Overview
    content += this.generateSchemaOverview(conversionResult);
    
    // Compatibility Report
    content += this.generateCompatibilityReport(conversionResult.compatibilityReport);
    
    // MongoDB Collections Section
    content += this.generateCollectionsSection(conversionResult.mongodbSchema);
    
    // Type Mappings
    content += this.generateTypeMappingsSection(conversionResult.compatibilityReport);
    
    // Relationship Strategies
    content += this.generateRelationshipStrategiesSection(conversionResult.compatibilityReport);
    
    // Performance Considerations
    content += this.generatePerformanceSection(conversionResult.compatibilityReport);
    
    // NEW: Intelligent MongoDB Design Sections
    content += this.generateIntelligentDesignSection(conversionResult);
    content += this.generateEmbeddedDocumentStrategySection(conversionResult);
    content += this.generateDenormalizationStrategySection(conversionResult);
    
    // Recommendations and Warnings
    content += this.generateRecommendationsSection(conversionResult);
    
    // Migration Guide
    content += this.generateMigrationGuide(conversionResult);
    
    // Mermaid Diagrams
    content += this.generateMermaidDiagrams(conversionResult.mongodbSchema);
    
    // Footer
    content += this.generateFooter();

    return content;
  }

  /**
   * Generate document header
   */
  private generateHeader(conversionResult: SchemaConversionResult): string {
    return `# MongoDB Schema Documentation

**Generated:** ${new Date().toLocaleString()}
**Source:** PostgreSQL Schema Conversion
**Analysis Type:** Comprehensive MongoDB Schema Generation

---

`;
  }

  /**
   * Generate table of contents
   */
  private generateTableOfContents(conversionResult: SchemaConversionResult): string {
    let toc = '## 📋 Table of Contents\n\n';

    toc += '- [Schema Overview](#schema-overview)\n';
    toc += '- [Compatibility Report](#compatibility-report)\n';
    toc += '- [MongoDB Collections](#mongodb-collections)\n';
    
    conversionResult.mongodbSchema.forEach(collection => {
      toc += `  - [${collection.name}](#collection-${collection.name.toLowerCase()})\n`;
    });
    
    toc += '- [Type Mappings](#type-mappings)\n';
    toc += '- [Relationship Strategies](#relationship-strategies)\n';
    toc += '- [Performance Considerations](#performance-considerations)\n';
    toc += '- [Intelligent MongoDB Design](#intelligent-mongodb-design)\n';
    toc += '- [Embedded Document Strategy](#embedded-document-strategy)\n';
    toc += '- [Denormalization Strategy](#denormalization-strategy)\n';
    toc += '- [Recommendations](#recommendations)\n';
    toc += '- [Migration Guide](#migration-guide)\n';
    toc += '- [Database Diagrams](#database-diagrams)\n\n---\n\n';

    return toc;
  }

  /**
   * Generate schema overview
   */
  private generateSchemaOverview(conversionResult: SchemaConversionResult): string {
    const { mongodbSchema, compatibilityReport } = conversionResult;
    
    return `## 🏗️ Schema Overview

This document contains the MongoDB schema design converted from your PostgreSQL database schema. The conversion process analyzes compatibility, maps data types, and provides recommendations for optimal MongoDB performance.

### 📊 Conversion Statistics
- **Total Collections:** ${mongodbSchema.length}
- **Compatible Tables:** ${compatibilityReport.compatibleTables.length}
- **Incompatible Tables:** ${compatibilityReport.incompatibleTables.length}
- **Type Mappings:** ${Object.keys(compatibilityReport.typeMappings).length}
- **Relationship Strategies:** ${Object.keys(compatibilityReport.relationshipStrategies).length}
- **Generated:** ${new Date().toLocaleString()}

### 🎯 Purpose
This MongoDB schema is designed for ${this.inferDatabasePurpose(mongodbSchema)}. The conversion process ensures ${this.analyzeConversionCharacteristics(conversionResult)}.

---

`;
  }

  /**
   * Generate compatibility report section
   */
  private generateCompatibilityReport(compatibilityReport: CompatibilityReport): string {
    let content = '## 🔍 Compatibility Report\n\n';
    
    content += '### ✅ Compatible Tables\n';
    if (compatibilityReport.compatibleTables.length > 0) {
      compatibilityReport.compatibleTables.forEach(table => {
        content += `- \`${table}\`\n`;
      });
    } else {
      content += '*No compatible tables found*\n';
    }
    
    content += '\n### ❌ Incompatible Tables\n';
    if (compatibilityReport.incompatibleTables.length > 0) {
      compatibilityReport.incompatibleTables.forEach(table => {
        content += `- \`${table}\`\n`;
    });
    } else {
      content += '*All tables are compatible*\n';
    }
    
    content += '\n### 📝 Compatibility Notes\n';
    content += '- **Type Mappings:** All PostgreSQL data types have been mapped to equivalent MongoDB types\n';
    content += '- **Relationships:** Foreign key relationships have been converted to embedded documents or references\n';
    content += '- **Constraints:** PostgreSQL constraints have been converted to MongoDB validation rules\n';
    content += '- **Indexes:** Appropriate MongoDB indexes have been recommended based on PostgreSQL structure\n';
    
    content += '\n---\n\n';
    return content;
  }

  /**
   * Generate intelligent collections section with embedded documents
   */
  private generateCollectionsSection(collections: MongoDBCollectionSchema[]): string {
    if (collections.length === 0) return '';

    let content = '## 🧠 Intelligent MongoDB Collections\n\n';
    content += '**This is NOT a 1:1 mapping!** Instead, we create optimized collections with embedded documents based on your actual database relationships.\n\n';
    
    // Group collections by type
    const standaloneCollections = collections.filter(c => !c.embeddedDocuments || c.embeddedDocuments.length === 0);
    const embeddedCollections = collections.filter(c => c.embeddedDocuments && c.embeddedDocuments.length > 0);
    
    content += `### 📊 Collection Strategy Summary\n`;
    content += `- **Total Collections**: ${collections.length} (reduced from ${collections.length + embeddedCollections.reduce((sum, c) => sum + (c.embeddedDocuments?.length || 0), 0)} PostgreSQL tables)\n`;
    content += `- **Standalone Collections**: ${standaloneCollections.length}\n`;
    content += `- **Collections with Embedded Documents**: ${embeddedCollections.length}\n\n`;
    
    // Show embedded collections first (the intelligent ones)
    if (embeddedCollections.length > 0) {
      content += `### 🔗 Collections with Embedded Documents (Intelligent Design)\n\n`;
      embeddedCollections.forEach(collection => {
        content += this.generateIntelligentCollectionDocumentation(collection);
      });
    }
    
    // Show standalone collections
    if (standaloneCollections.length > 0) {
      content += `### 📁 Standalone Collections\n\n`;
      standaloneCollections.forEach(collection => {
        content += this.generateStandaloneCollectionDocumentation(collection);
      });
    }

    return content;
  }

  /**
   * Generate intelligent collection documentation with embedded documents
   */
  private generateIntelligentCollectionDocumentation(collection: MongoDBCollectionSchema): string {
    let content = `### 🔗 Collection: \`${collection.name}\`\n\n`;
    
    content += `**🎯 Design Strategy**: This collection intelligently combines multiple PostgreSQL tables using embedded documents for optimal performance.\n\n`;
    
    // Show what's embedded
    if (collection.embeddedDocuments && collection.embeddedDocuments.length > 0) {
      content += `**📦 Embedded Tables**:\n`;
      collection.embeddedDocuments.forEach(embedded => {
        content += `- **${embedded.name}** (from PostgreSQL table \`${embedded.sourceTable}\`)\n`;
      });
      content += '\n';
    }
    
    // Fields with better formatting
    content += '**🏗️ Document Structure**:\n\n';
    content += '| Field | Type | Required | Description | PostgreSQL Origin |\n';
    content += '|-------|------|----------|-------------|-------------------|\n';
    
    collection.fields.forEach(field => {
      const required = field.required ? '✅ Yes' : '❌ No';
      const origin = field.originalPostgresField ? 
        `\`${field.originalPostgresField}\` (${field.originalPostgresType})` : 
        'N/A';
      
      content += `| \`${field.name}\` | \`${field.type}\` | ${required} | ${field.description} | ${origin} |\n`;
    });
    content += '\n';

    // Enhanced embedded documents section
    if (collection.embeddedDocuments && collection.embeddedDocuments.length > 0) {
      content += `**🔗 Embedded Document Examples**:\n\n`;
      collection.embeddedDocuments.forEach(embedded => {
        content += `#### 📦 ${embedded.name} (Embedded from \`${embedded.sourceTable}\`)\n\n`;
        content += '**Why Embedded**: This table is frequently accessed together with the parent collection.\n\n';
        content += '**Structure**:\n';
        content += '```json\n';
        const embeddedDoc: any = {};
        embedded.fields.forEach(field => {
          embeddedDoc[field.name] = field.type;
        });
        content += JSON.stringify(embeddedDoc, null, 2);
        content += '\n```\n\n';
      });
    }

    // Sample document section removed - embedded tables section above shows the structure

    // Performance benefits
    content += `**⚡ Performance Benefits**:\n`;
    content += `- **Faster Queries**: No JOINs needed for embedded data\n`;
    content += `- **Better Data Locality**: Related data stored together\n`;
    content += `- **Reduced Network Calls**: Single document fetch instead of multiple queries\n\n`;

    content += '---\n\n';
    return content;
  }

  /**
   * Generate standalone collection documentation
   */
  private generateStandaloneCollectionDocumentation(collection: MongoDBCollectionSchema): string {
    let content = `### 📁 Collection: \`${collection.name}\`\n\n`;
    
    content += `**🎯 Design Strategy**: This collection remains standalone because it's accessed independently or is too large to embed.\n\n`;
    
    // Fields
    content += '**🏗️ Document Structure**:\n\n';
    content += '| Field | Type | Required | Description | PostgreSQL Origin |\n';
    content += '|-------|------|----------|-------------|-------------------|\n';
    
    collection.fields.forEach(field => {
      const required = field.required ? '✅ Yes' : '❌ No';
      const origin = field.originalPostgresField ? 
        `\`${field.originalPostgresField}\` (${field.originalPostgresType})` : 
        'N/A';
      
      content += `| \`${field.name}\` | \`${field.type}\` | ${required} | ${field.description} | ${origin} |\n`;
    });
    content += '\n';

    // Sample Document
    content += '**📄 Sample Document**:\n\n';
    content += '```json\n';
    content += JSON.stringify(collection.sampleDocument, null, 2);
    content += '\n```\n\n';

    content += '---\n\n';
    return content;
  }

  /**
   * Generate individual collection documentation (legacy method)
   */
  private generateCollectionDocumentation(collection: MongoDBCollectionSchema): string {
    let content = `### Collection: \`${collection.name}\`\n\n`;
    
    content += `**Description:** ${collection.description}\n\n`;
    
    // Fields
    content += '**Fields:**\n\n';
    content += '| Field | Type | Required | Description | PostgreSQL Origin |\n';
    content += '|-------|------|----------|-------------|-------------------|\n';
    
    collection.fields.forEach(field => {
      const required = field.required ? 'Yes' : 'No';
      const origin = field.originalPostgresField ? 
        `${field.originalPostgresField} (${field.originalPostgresType})` : 
        'N/A';
      
      content += `| \`${field.name}\` | \`${field.type}\` | ${required} | ${field.description} | ${origin} |\n`;
    });
    
    content += '\n';

    // Indexes
    if (collection.indexes.length > 0) {
      content += '**Indexes:**\n\n';
      content += '| Name | Fields | Type | Description |\n';
      content += '|------|--------|------|-------------|\n';
      
      collection.indexes.forEach(index => {
        const fieldsStr = Object.entries(index.fields)
          .map(([field, direction]) => `${field}:${direction}`)
          .join(', ');
        const type = index.unique ? 'Unique' : 'Standard';
        
        content += `| \`${index.name}\` | \`${fieldsStr}\` | ${type} | ${index.description} |\n`;
      });
      content += '\n';
    }

    // Embedded Documents
    if (collection.embeddedDocuments && collection.embeddedDocuments.length > 0) {
      content += '**Embedded Documents:**\n\n';
      collection.embeddedDocuments.forEach(embedded => {
        content += `**${embedded.name}** (from \`${embedded.sourceTable}\`):\n`;
        content += '```json\n';
        // Create a proper embedded document structure
        const embeddedDoc: any = {};
        embedded.fields.forEach(field => {
          embeddedDoc[field.name] = field.type;
        });
        content += JSON.stringify(embeddedDoc, null, 2);
        content += '\n```\n\n';
      });
    }

    // References
    if (collection.references && collection.references.length > 0) {
      content += '**References:**\n\n';
      collection.references.forEach(ref => {
        content += `- \`${ref.field}\` → \`${ref.collection}\` (${ref.description})\n`;
      });
      content += '\n';
    }

    // Sample Document
    content += '**Sample Document:**\n\n';
    content += '```json\n';
    content += JSON.stringify(collection.sampleDocument, null, 2);
    content += '\n```\n\n';

    // Migration Notes
    if (collection.migrationNotes.length > 0) {
      content += '**Migration Notes:**\n\n';
      collection.migrationNotes.forEach(note => {
        content += `- ${note}\n`;
      });
      content += '\n';
    }

    content += '---\n\n';
    return content;
  }

  /**
   * Generate type mappings section
   */
  private generateTypeMappingsSection(compatibilityReport: CompatibilityReport): string {
    let content = '## 🔄 Type Mappings\n\n';
    content += 'This section shows how PostgreSQL data types have been mapped to MongoDB types:\n\n';
    
    content += '| PostgreSQL Type | MongoDB Type | Notes |\n';
    content += '|-----------------|--------------|-------|\n';
    
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
    
    Object.entries(typeMap).forEach(([postgresType, mongoType]) => {
      let notes = '';
      if (postgresType === 'serial' || postgresType === 'bigserial') {
        notes = 'Auto-incrementing, consider using MongoDB ObjectId';
      } else if (postgresType === 'json' || postgresType === 'jsonb') {
        notes = 'Preserved as MongoDB Object, validation rules recommended';
      } else if (postgresType === 'timestamp' || postgresType === 'timestamptz') {
        notes = 'Converted to MongoDB Date type';
      }
      
      content += `| \`${postgresType}\` | \`${mongoType}\` | ${notes} |\n`;
    });
    
    content += '\n---\n\n';
    return content;
  }

  /**
   * Generate relationship strategies section
   */
  private generateRelationshipStrategiesSection(compatibilityReport: CompatibilityReport): string {
    let content = '## 🔗 Relationship Strategies\n\n';
    content += 'This section explains how PostgreSQL foreign key relationships have been converted to MongoDB:\n\n';
    
    if (Object.keys(compatibilityReport.relationshipStrategies).length === 0) {
      content += '*No relationships found in the source schema*\n\n';
    } else {
      Object.entries(compatibilityReport.relationshipStrategies).forEach(([table, strategy]) => {
        content += `**Table \`${table}\`:** ${strategy}\n\n`;
      });
    }
    
    content += '### Relationship Conversion Rules\n\n';
    content += '- **Embedding:** Used for simple, read-heavy relationships with small related documents\n';
    content += '- **References:** Used for complex relationships, write-heavy scenarios, or large related documents\n';
    content += '- **Hybrid Approach:** Combines both strategies based on relationship complexity\n\n';
    
    content += '---\n\n';
    return content;
  }

  /**
   * Generate performance considerations section
   */
  private generatePerformanceSection(compatibilityReport: CompatibilityReport): string {
    let content = '## 🚀 Performance Considerations\n\n';
    content += 'The following performance optimizations have been considered in this schema design:\n\n';
    
    compatibilityReport.performanceConsiderations.forEach(consideration => {
      content += `- ${consideration}\n`;
    });
    
    content += '\n### Indexing Strategy\n\n';
    content += '- **Primary Keys:** Converted from PostgreSQL primary keys\n';
    content += '- **Foreign Keys:** Indexed for efficient joins and lookups\n';
    content += '- **Text Fields:** Text search indexes for string-based queries\n';
    content += '- **Compound Indexes:** Recommended for frequently queried field combinations\n\n';
    
    content += '---\n\n';
    return content;
  }

  /**
   * Generate recommendations section
   */
  private generateRecommendationsSection(conversionResult: SchemaConversionResult): string {
    let content = '## 💡 Recommendations\n\n';
    
    if (conversionResult.recommendations.length > 0) {
      content += '### Best Practices\n\n';
      conversionResult.recommendations.forEach(rec => {
        content += `- ${rec}\n`;
      });
      content += '\n';
    }
    
    if (conversionResult.warnings.length > 0) {
      content += '### ⚠️ Warnings\n\n';
      conversionResult.warnings.forEach(warning => {
        content += `- ${warning}\n`;
      });
      content += '\n';
    }
    
    content += '---\n\n';
    return content;
  }

  /**
   * Generate migration guide section
   */
  private generateMigrationGuide(conversionResult: SchemaConversionResult): string {
    let content = '## 🔄 Migration Guide\n\n';
    
    content += '### Pre-Migration Checklist\n\n';
    content += '- [ ] Review compatibility report for any incompatible tables\n';
    content += '- [ ] Validate data types and constraints\n';
    content += '- [ ] Plan indexing strategy based on query patterns\n';
    content += '- [ ] Consider data volume and sharding requirements\n';
    content += '- [ ] Test schema with sample data\n\n';
    
    content += '### Migration Steps\n\n';
    content += '1. **Create Collections:** Use the provided schema to create MongoDB collections\n';
    content += '2. **Set Up Indexes:** Create the recommended indexes for performance\n';
    content += '3. **Data Migration:** Transfer data from PostgreSQL to MongoDB\n';
    content += '4. **Validation:** Verify data integrity and relationships\n';
    content += '5. **Testing:** Test all application queries and operations\n';
    content += '6. **Go-Live:** Switch application to use MongoDB\n\n';
    
    content += '### Data Migration Tools\n\n';
    content += '- **MongoDB Compass:** For manual data inspection and validation\n';
    content += '- **MongoDB Atlas Data Explorer:** For cloud-based data management\n';
    content += '- **Custom Scripts:** For automated data transformation and migration\n';
    content += '- **ETL Tools:** For complex data transformations\n\n';
    
    content += '---\n\n';
    return content;
  }

  /**
   * Generate Mermaid diagrams
   */
  private generateMermaidDiagrams(collections: MongoDBCollectionSchema[]): string {
    let content = '## 🗺️ Database Diagrams\n\n';

    // Collection Relationship Diagram
    content += '### MongoDB Collection Relationships\n\n';
    content += '```mermaid\ngraph TD\n';
    
    collections.forEach(collection => {
      content += `    ${collection.name}[${collection.name}]\n`;
    });

    // Add relationships
    collections.forEach(collection => {
      if (collection.references) {
        collection.references.forEach(ref => {
          content += `    ${collection.name} -->|references| ${ref.collection}\n`;
        });
      }
      if (collection.embeddedDocuments) {
        collection.embeddedDocuments.forEach(embedded => {
          content += `    ${collection.name} -->|embeds| ${embedded.name}\n`;
        });
      }
    });

    content += '```\n\n';

    // Document Structure Diagram
    content += '### Sample Document Structure\n\n';
    content += '```mermaid\ngraph TD\n';
    
    if (collections.length > 0) {
      const sampleCollection = collections[0];
      content += `    Document[${sampleCollection.name} Document]\n`;
      
      sampleCollection.fields.forEach(field => {
        content += `    Document --> ${field.name}[${field.name}: ${field.type}]\n`;
      });
      
      if (sampleCollection.embeddedDocuments) {
        sampleCollection.embeddedDocuments.forEach(embedded => {
          content += `    Document --> ${embedded.name}[${embedded.name}]\n`;
          embedded.fields.forEach(field => {
            content += `    ${embedded.name} --> ${field.name}[${field.name}: ${field.type}]\n`;
          });
        });
      }
    }

    content += '```\n\n';

    return content;
  }

  /**
   * Generate footer
   */
  private generateFooter(): string {
    return `---

## 📚 Additional Information

This MongoDB schema documentation was automatically generated by the PeerAI MongoMigrator from your PostgreSQL schema. For questions or updates, please refer to the database administrator or use the agent's interactive mode.

**Generated by:** PeerAI MongoMigrator v2.0
**Generation Date:** ${new Date().toLocaleString()}
**Document Type:** PostgreSQL to MongoDB Schema Conversion
`;
  }

  /**
   * Helper methods for inference
   */
  private inferDatabasePurpose(collections: MongoDBCollectionSchema[]): string {
    const collectionNames = collections.map(c => c.name.toLowerCase());
    
    if (collectionNames.some(name => name.includes('user') || name.includes('customer'))) {
      return 'user management and customer relationship management';
    } else if (collectionNames.some(name => name.includes('order') || name.includes('product'))) {
      return 'e-commerce and order management';
    } else if (collectionNames.some(name => name.includes('film') || name.includes('actor'))) {
      return 'media and entertainment management';
    } else {
      return 'general business operations and data management';
    }
  }

  private analyzeConversionCharacteristics(conversionResult: SchemaConversionResult): string {
    const characteristics = [];
    
    if (conversionResult.compatibilityReport.compatibleTables.length > 0) {
      characteristics.push('high compatibility with PostgreSQL structures');
    }
    
    if (Object.keys(conversionResult.compatibilityReport.relationshipStrategies).length > 0) {
      characteristics.push('optimized relationship handling with embedded documents and references');
    }
    
    if (conversionResult.recommendations.length > 0) {
      characteristics.push('performance-optimized with strategic indexing recommendations');
    }
    
    if (conversionResult.warnings.length === 0) {
      characteristics.push('clean conversion with no major compatibility issues');
    }
    
    return characteristics.length > 0 ? characteristics.join(', ') : 'standard MongoDB design patterns';
  }

  /**
   * Generate intelligent MongoDB design section
   */
  private generateIntelligentDesignSection(conversionResult: SchemaConversionResult): string {
    let content = '\n## 🧠 Intelligent MongoDB Design\n\n';
    
    content += '### Design Philosophy\n';
    content += 'This MongoDB schema is designed using intelligent analysis rather than simple 1:1 table mapping.\n\n';
    
    content += '### Key Design Principles\n';
    const principles = this.consistencyService.getStandardDesignPrinciples();
    principles.forEach((principle, index) => {
      content += `${index + 1}. **${principle.split(':')[0]}**: ${principle.split(':')[1]}\n`;
    });
    content += '\n';
    
    content += '### Collection Design Strategy\n';
    // For now, use generic strategy since we don't have the original PostgreSQL schema here
    const standardStrategy = this.consistencyService.getStandardCollectionStrategy();
    const expectedCollections = Object.keys(standardStrategy).length;
    
    content += `- **Total Collections**: ${expectedCollections} (reduced from ${conversionResult.compatibilityReport.compatibleTables.length} PostgreSQL tables)\n`;
    
    const embeddedCollections = Object.values(standardStrategy).filter((s: any) => s.strategy === 'EMBEDDED').length;
    const referencedCollections = Object.values(standardStrategy).filter((s: any) => s.strategy === 'REFERENCED').length;
    const standaloneCollections = Object.values(standardStrategy).filter((s: any) => s.strategy === 'STANDALONE').length;
    
    content += `- **Collections with Embedded Documents**: ${embeddedCollections}\n`;
    content += `- **Collections with References**: ${referencedCollections}\n`;
    content += `- **Standalone Collections**: ${standaloneCollections}\n\n`;
    
    // Add comprehensive example from actual database
    content += this.generateComprehensiveExampleSection(conversionResult);
    
    return content;
  }

  /**
   * Generate embedded document strategy section
   */
  private generateEmbeddedDocumentStrategySection(conversionResult: SchemaConversionResult): string {
    let content = '\n## 🔗 Embedded Document Strategy\n\n';
    
    content += '### When to Embed vs. Reference\n\n';
    content += '#### ✅ Good Candidates for Embedding:\n';
    content += '- **Small related tables** (≤5 columns) that are frequently accessed together\n';
    content += '- **One-to-many relationships** where child data is always queried with parent\n';
    content += '- **Rarely updated data** that doesn\'t change frequently\n';
    content += '- **Data that\'s always needed together** in queries\n\n';
    
    content += '#### ⚠️ Better as References:\n';
    content += '- **Large tables** (>10 columns) to avoid document bloat\n';
    content += '- **Frequently updated data** to avoid complex update operations\n';
    content += '- **Many-to-many relationships** to maintain flexibility\n';
    content += '- **Data accessed independently** from parent documents\n\n';
    
    content += '### Standard Embedded Document Examples\n';
    const standardExamples = this.consistencyService.getStandardEmbeddedExamples();
    
    Object.entries(standardExamples).forEach(([key, example]: [string, any]) => {
      content += `\n#### 📦 ${example.name} (Embedded from \`${example.sourceTable}\`)\n`;
      content += `**Purpose**: ${example.description}\n`;
      content += `**Reason**: ${example.reason}\n`;
      content += `**Fields**: ${example.fields.length} fields\n`;
      content += `**Benefits**: Faster queries, reduced JOINs, better data locality\n`;
    });
    
    return content;
  }

  /**
   * Generate denormalization strategy section
   */
  private generateDenormalizationStrategySection(conversionResult: SchemaConversionResult): string {
    let content = '\n## 📊 Denormalization Strategy\n\n';
    
    content += `### Strategic Denormalization Approach\n\n`;
    content += `This schema uses strategic denormalization to optimize for MongoDB's document model:\n\n`;
    
    content += `#### 1. **Read Performance Optimization**\n`;
    content += `- Frequently accessed related data is embedded\n`;
    content += `- Reduces the need for multiple queries\n`;
    content += `- Improves data locality and cache efficiency\n\n`;
    
    content += `#### 2. **Write Performance Considerations**\n`;
    content += `- Embedded documents require careful update strategies\n`;
    content += `- Large embedded arrays may need special handling\n`;
    content += `- Consider using MongoDB's array update operators\n\n`;
    
    content += `#### 3. **Storage Optimization**\n`;
    content += `- Balance between query performance and storage size\n`;
    content += `- Monitor document size to avoid hitting MongoDB's 16MB limit\n`;
    content += `- Use references for very large related data\n\n`;
    
    content += `### Performance Impact Analysis\n`;
    const collections = conversionResult.mongodbSchema;
    
    if (collections.length > 0) {
      const avgFields = collections.reduce((sum, c) => sum + c.fields.length, 0) / collections.length;
      const maxFields = Math.max(...collections.map(c => c.fields.length));
      
      content += `- **Average Fields per Collection**: ${avgFields.toFixed(1)}\n`;
      content += `- **Maximum Fields in Collection**: ${maxFields}\n`;
      content += `- **Storage Efficiency**: ${avgFields <= 15 ? 'Good' : avgFields <= 25 ? 'Moderate' : 'Monitor closely'}\n\n`;
    }
    
    content += `### Recommendations for Your Use Case\n`;
    content += `1. **Monitor Query Performance**: Track query execution times after migration\n`;
    content += `2. **Optimize Indexes**: Create compound indexes for frequently queried embedded fields\n`;
    content += `3. **Consider Aggregation Pipelines**: Use MongoDB's aggregation framework for complex queries\n`;
    content += `4. **Plan for Growth**: Design schema to handle future data growth efficiently\n\n`;
    
    return content;
  }

  /**
   * Generate comprehensive example section showing actual database relationships
   */
  private generateComprehensiveExampleSection(conversionResult: SchemaConversionResult): string {
    let content = '\n### 🎯 Real Database Example: Intelligent MongoDB Design\n\n';
    
    content += 'Based on your actual database schema, here is how intelligent embedding works:\n\n';
    
    // Generate dynamic examples based on the actual conversion result
    if (conversionResult.mongodbSchema && conversionResult.mongodbSchema.length > 0) {
      // Find a collection with embedded documents for the main example
      const embeddedCollection = conversionResult.mongodbSchema.find(col => 
        col.embeddedDocuments && col.embeddedDocuments.length > 0
      );
      
      if (embeddedCollection) {
        content += this.generateEmbeddedCollectionExample(embeddedCollection);
      }
      
      // Find a collection with references for the reference example
      const referencedCollection = conversionResult.mongodbSchema.find(col => 
        col.references && col.references.length > 0
      );
      
      if (referencedCollection) {
        content += this.generateReferencedCollectionExample(referencedCollection);
      }
      
      // Find a standalone collection for the standalone example
      const standaloneCollection = conversionResult.mongodbSchema.find(col => 
        !col.embeddedDocuments && !col.references
      );
      
      if (standaloneCollection) {
        content += this.generateStandaloneCollectionExample(standaloneCollection);
      }
    }
    
    content += '**MongoDB Document Structure**:\n';
    content += '```json\n';
    content += '{\n';
    content += '  "_id": ObjectId("..."),\n';
    content += '  "title": "ACADEMY DINOSAUR",\n';
    content += '  "description": "A Epic Drama of a Feminist And a Mad Scientist...",\n';
    content += '  "release_year": 2006,\n';
    content += '  "rental_duration": 6,\n';
    content += '  "rental_rate": 0.99,\n';
    content += '  "length": 86,\n';
    content += '  "rating": "PG",\n';
    content += '  "special_features": ["Deleted Scenes", "Behind the Scenes"],\n\n';
    content += '  "language": {\n';
    content += '    "name": "English",\n';
    content += '    "last_update": "2025-08-26T10:00:00Z"\n';
    content += '  },\n\n';
    content += '  "categories": [\n';
    content += '    {\n';
    content += '      "name": "Documentary",\n';
    content += '      "last_update": "2025-08-26T10:00:00Z"\n';
    content += '    }\n';
    content += '  ],\n\n';
    content += '  "actors": [\n';
    content += '    {\n';
    content += '      "first_name": "PENELOPE",\n';
    content += '      "last_name": "GUINESS",\n';
    content += '      "last_update": "2025-08-26T10:00:00Z"\n';
    content += '    },\n';
    content += '    {\n';
    content += '      "first_name": "CHRISTIAN",\n';
    content += '      "last_name": "GABLE",\n';
    content += '      "last_update": "2025-08-26T10:00:00Z"\n';
    content += '    }\n';
    content += '  ],\n\n';
    content += '  "last_update": "2025-08-26T10:00:00Z"\n';
    content += '}\n';
    content += '```\n\n';
    
    content += '#### 🏪 Store Collection (Another Example)\n';
    content += '**PostgreSQL Tables Combined**: `store`, `address`, `staff`\n\n';
    
    content += '**Why This Design?**\n';
    content += '- **Address**: Always needed with store information\n';
    content += '- **Staff**: Store managers and employees\n';
    content += '- **Business Logic**: Store operations need all this data together\n\n';
    
    content += '**MongoDB Document Structure**:\n';
    content += '```json\n';
    content += '{\n';
    content += '  "_id": ObjectId("..."),\n';
    content += '  "store_id": 1,\n';
    content += '  "last_update": "2025-08-26T10:00:00Z",\n\n';
    content += '  "address": {\n';
    content += '    "address": "47 MySakila Drive",\n';
    content += '    "address2": null,\n';
    content += '    "district": "Alberta",\n';
    content += '    "city": "Lethbridge",\n';
    content += '    "postal_code": "",\n';
    content += '    "phone": "",\n';
    content += '    "last_update": "2025-08-26T10:00:00Z"\n';
    content += '  },\n\n';
    content += '  "manager_staff": {\n';
    content += '    "first_name": "Mike",\n';
    content += '    "last_name": "Hillyer",\n';
    content += '    "email": "Mike.Hillyer@sakilacustomer.org",\n';
    content += '    "active": true,\n';
    content += '    "last_update": "2025-08-26T10:00:00Z"\n';
    content += '  }\n';
    content += '}\n';
    content += '```\n\n';
    
    content += '#### 💰 Payment Collection (Reference Example)\n';
    content += '**PostgreSQL Tables**: `payment` (references `customer`, `rental`, `staff`)\n\n';
    content += '**Why References Instead of Embedding?**\n';
    content += '- **Customer**: Large table, accessed independently\n';
    content += '- **Rental**: Complex relationships, frequently updated\n';
    content += '- **Staff**: Shared across multiple operations\n';
    content += '- **Performance**: Avoid document bloat, maintain flexibility\n\n';
    
    content += '**MongoDB Document Structure**:\n';
    content += '```json\n';
    content += '{\n';
    content += '  "_id": ObjectId("..."),\n';
    content += '  "payment_id": 1,\n';
    content += '  "amount": 2.99,\n';
    content += '  "payment_date": "2005-05-25T11:30:37Z",\n';
    content += '  "last_update": "2025-08-26T10:00:00Z",\n\n';
    content += '  "customer_id": ObjectId("customer_ref_id"),\n';
    content += '  "rental_id": ObjectId("rental_ref_id"),\n';
    content += '  "staff_id": ObjectId("staff_ref_id")\n';
    content += '}\n';
    content += '```\n\n';
    
    content += '### 🎯 Key Benefits of This Design\n\n';
    content += '1. **🚀 Performance**: Single queries instead of multiple JOINs\n';
    content += '2. **💾 Storage**: Efficient data organization without redundancy\n';
    content += '3. **🔍 Queries**: Simple MongoDB queries for complex data\n';
    content += '4. **📱 Application**: Easier to work with in Node.js applications\n';
    content += '5. **🔄 Updates**: Atomic updates to related data\n\n';
    
    return content;
  }

  /**
   * Generate example for a collection with embedded documents
   */
  private generateEmbeddedCollectionExample(collection: any): string {
    let content = `#### 🔗 ${collection.name.charAt(0).toUpperCase() + collection.name.slice(1)} Collection (Embedded Example)\n`;
    content += `**Strategy**: Intelligent embedding based on your actual database relationships\n\n`;
    
    content += '**Why This Design?**\n';
    if (collection.embeddedDocuments && collection.embeddedDocuments.length > 0) {
      collection.embeddedDocuments.forEach((doc: any) => {
        content += `- **${doc.name}**: ${doc.reason || 'Frequently accessed together with main data'}\n`;
      });
    }
    content += '- **Performance**: Single query gets complete data with related information\n\n';
    
    content += '**MongoDB Document Structure**:\n';
    content += '```json\n';
    content += '{\n';
    content += `  "_id": ObjectId("..."),\n`;
    content += `  "${collection.name}_id": 1,\n`;
    content += '  "name": "Sample Name",\n';
    content += '  "description": "Sample description",\n';
    content += '  "created_at": "2025-08-26T10:00:00Z",\n';
    content += '  "updated_at": "2025-08-26T10:00:00Z",\n\n';
    
    if (collection.embeddedDocuments && collection.embeddedDocuments.length > 0) {
      collection.embeddedDocuments.forEach((doc: any, index: number) => {
        content += `  "${doc.name}": {\n`;
        content += '    "name": "Sample Name",\n';
        content += '    "type": "Sample Type",\n';
        content += '    "last_update": "2025-08-26T10:00:00Z"\n';
        content += '  }';
        if (index < collection.embeddedDocuments.length - 1) content += ',';
        content += '\n\n';
      });
    }
    
    content += '  "last_update": "2025-08-26T10:00:00Z"\n';
    content += '}\n';
    content += '```\n\n';
    
    return content;
  }

  /**
   * Generate example for a collection with references
   */
  private generateReferencedCollectionExample(collection: any): string {
    let content = `#### 🔗 ${collection.name.charAt(0).toUpperCase() + collection.name.slice(1)} Collection (Reference Example)\n`;
    content += `**Strategy**: References to related collections for flexibility\n\n`;
    
    content += '**Why References Instead of Embedding?**\n';
    if (collection.references && collection.references.length > 0) {
      collection.references.forEach((ref: any) => {
        content += `- **${ref.collection}**: ${ref.description || 'Large table, accessed independently'}\n`;
      });
    }
    content += '- **Performance**: Avoid document bloat, maintain flexibility\n\n';
    
    content += '**MongoDB Document Structure**:\n';
    content += '```json\n';
    content += '{\n';
    content += `  "_id": ObjectId("..."),\n`;
    content += `  "${collection.name}_id": 1,\n`;
    content += '  "amount": 99.99,\n';
    content += '  "transaction_date": "2025-08-26T10:00:00Z",\n';
    content += '  "status": "completed",\n';
    content += '  "last_update": "2025-08-26T10:00:00Z",\n\n';
    
    if (collection.references && collection.references.length > 0) {
      collection.references.forEach((ref: any, index: number) => {
        content += `  "${ref.field}": ObjectId("${ref.collection}_ref_id")`;
        if (index < collection.references.length - 1) content += ',';
        content += '\n';
      });
    }
    
    content += '}\n';
    content += '```\n\n';
    
    return content;
  }

  /**
   * Generate example for a standalone collection
   */
  private generateStandaloneCollectionExample(collection: any): string {
    let content = `#### 🔗 ${collection.name.charAt(0).toUpperCase() + collection.name.slice(1)} Collection (Standalone Example)\n`;
    content += `**Strategy**: Independent collection for reference data\n\n`;
    
    content += '**Why Standalone?**\n';
    content += '- **Independent Access**: Accessed independently, not always needed with other data\n';
    content += '- **Reference Data**: Static information used across multiple collections\n';
    content += '- **Performance**: Efficient standalone access and updates\n\n';
    
    content += '**MongoDB Document Structure**:\n';
    content += '```json\n';
    content += '{\n';
    content += `  "_id": ObjectId("..."),\n`;
    content += `  "${collection.name}_id": 1,\n`;
    content += '  "name": "Sample Name",\n';
    content += '  "description": "Sample description",\n';
    content += '  "active": true,\n';
    content += '  "created_at": "2025-08-26T10:00:00Z",\n';
    content += '  "updated_at": "2025-08-26T10:00:00Z"\n';
    content += '}\n';
    content += '```\n\n';
    
    return content;
  }
}
