import fs from 'fs';
import path from 'path';
import { 
  MongoDBCollectionSchema, 
  SchemaConversionResult, 
  CompatibilityReport 
} from './MongoDBSchemaGenerator.js';

export class MongoDBSchemaMarkdownGenerator {
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
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
   * Generate collections section
   */
  private generateCollectionsSection(collections: MongoDBCollectionSchema[]): string {
    if (collections.length === 0) return '';

    let content = '## 📋 MongoDB Collections\n\n';
    content += 'The following collections form the MongoDB equivalent of your PostgreSQL database:\n\n';

    collections.forEach(collection => {
      content += this.generateCollectionDocumentation(collection);
    });

    return content;
  }

  /**
   * Generate individual collection documentation
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
}
