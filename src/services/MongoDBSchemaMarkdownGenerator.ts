import fs from 'fs';
import path from 'path';
import { 
  MongoDBCollectionSchema, 
  SchemaConversionResult, 
  CompatibilityReport 
} from './MongoDBSchemaGenerator.js';
import { ConsistencyService } from './ConsistencyService.js';
import { UnifiedERDiagramGenerator } from './UnifiedERDiagramGenerator.js';
import { DualLocationFileWriter } from '../utils/DualLocationFileWriter.js';

export class MongoDBSchemaMarkdownGenerator {
  private projectRoot: string;
  private consistencyService: ConsistencyService;
  private erDiagramGenerator: UnifiedERDiagramGenerator;

  constructor() {
    this.projectRoot = process.cwd();
    this.consistencyService = new ConsistencyService();
    this.erDiagramGenerator = new UnifiedERDiagramGenerator();
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
      const filename = `proposed-mongodb-schema-${timestamp}.md`;
      
      const markdown = await this.buildMarkdownContent(conversionResult);
      
      // Write to both central location and current project directory
      const { centralPath, projectPath } = DualLocationFileWriter.writeToBothLocations(filename, markdown);
      
      console.log(`✅ MongoDB schema documentation generated: ${filename}`);
      return centralPath; // Return central path as primary location
    } catch (error) {
      console.error('❌ Failed to generate MongoDB schema documentation:', error);
      throw error;
    }
  }

  /**
   * Build the complete Markdown content
   */
  private async buildMarkdownContent(conversionResult: SchemaConversionResult): Promise<string> {
    let content = '';

    // Header
    content += this.generateHeader(conversionResult);
    
    // Interactive ER Diagram Viewer (moved to the beginning)
    content += await this.generateInteractiveERDiagramViewer(conversionResult);
    
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
    
    // NEW: Metadata Analysis Section (MongoDB equivalent)
    content += this.generateMongoDBMetadataAnalysisSection(conversionResult);
    
    // NEW: Intelligent MongoDB Design Sections
    content += this.generateIntelligentDesignSection(conversionResult);
    content += this.generateEmbeddedDocumentStrategySection(conversionResult);
    content += this.generateDenormalizationStrategySection(conversionResult);
    
    // Detailed Collection Analysis
    content += this.generateDetailedCollectionAnalysis(conversionResult.mongodbSchema);
    
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
   * Generate interactive ER diagram viewer at the beginning of the document
   */
  private async generateInteractiveERDiagramViewer(conversionResult: SchemaConversionResult): Promise<string> {
    let content = '## 🌐 Interactive MongoDB ER Diagram Viewer\n\n';
    content += '> **🎯 Click the button below to open the interactive MongoDB ER diagram in your browser**\n\n';
    
    try {
      // Generate MongoDB ER diagram
      const erResult = await this.erDiagramGenerator.generateMongoDBERDiagram(
        conversionResult.mongodbSchema,
        {
          format: 'mermaid',
          includeIndexes: true,
          includeConstraints: true,
          includeDataTypes: true,
          includeCardinality: true,
          includeDescriptions: false,
          showEmbeddedDocuments: true,
          outputPath: undefined // We'll handle the file path manually
        }
      );

      if (erResult.success && erResult.content) {
        // Create HTML viewer and get the file path
        const htmlContent = this.createEmbeddedHTMLViewer(erResult.content, conversionResult);
        
        // Save the HTML file to both locations
        const fileName = `mongodb_er_diagram_${Date.now()}.html`;
        const { centralPath, projectPath } = DualLocationFileWriter.writeDiagramToBothLocations(fileName, htmlContent);
        const filePath = centralPath; // Use central path for the link
        
        // Add the interactive link at the beginning
        content += `**📱 [🖱️ Click to View Interactive MongoDB ER Diagram](file://${filePath})**\n\n`;
        content += `**💻 Or run this command to open directly:** \`open ${filePath}\`\n\n`;
        content += '---\n\n';
        
      } else {
        throw new Error(erResult.error || 'Failed to generate ER diagram');
      }
      
    } catch (error) {
      console.error('❌ Failed to generate interactive MongoDB ER diagram viewer:', error);
      content += '> **⚠️ Could not generate interactive MongoDB ER diagram viewer** - Please use the `er-diagram` command instead.\n\n';
      content += '---\n\n';
    }
    
    return content;
  }

  /**
   * Create embedded HTML viewer for MongoDB ER diagrams
   */
  private createEmbeddedHTMLViewer(mermaidCode: string, conversionResult: SchemaConversionResult): string {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MongoDB ER Diagram - ${conversionResult.mongodbSchema.length} Collections</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e9ecef;
        }
        .header h1 {
            color: #2c3e50;
            margin: 0;
            font-size: 2.5em;
        }
        .header p {
            color: #6c757d;
            margin: 10px 0 0 0;
            font-size: 1.1em;
        }
        .stats {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        .stat {
            text-align: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            min-width: 120px;
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #28a745;
        }
        .stat-label {
            color: #6c757d;
            font-size: 0.9em;
        }
        .diagram-container {
            margin: 30px 0;
            text-align: center;
        }
        .mermaid {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .info {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .info h3 {
            margin: 0 0 10px 0;
            color: #1976d2;
        }
        .info p {
            margin: 0;
            color: #424242;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍃 MongoDB ER Diagram</h1>
            <p>Interactive Entity-Relationship Diagram for MongoDB Collections</p>
            <div class="stats">
                <div class="stat">
                    <div class="stat-number">${conversionResult.mongodbSchema.length}</div>
                    <div class="stat-label">Collections</div>
                </div>
            </div>
        </div>
        
        <div class="info">
            <h3>📊 Intelligent MongoDB Collection Strategy</h3>
            <p>This diagram shows the intelligent consolidation of 22 PostgreSQL tables into ${conversionResult.mongodbSchema.length} optimized MongoDB collections. The design follows MongoDB best practices for document modeling.</p>
            <p><strong>Consolidation Strategy:</strong></p>
            <ul>
                ${this.generateDynamicCollectionStrategy(conversionResult.mongodbSchema)}
            </ul>
            <p><strong>Benefits:</strong> Reduced complexity, improved query performance, and better data locality for MongoDB operations.</p>
        </div>
        
        <div class="diagram-container">
            <div class="mermaid">
${mermaidCode.replace('```mermaid\n', '').replace('\n```', '')}
            </div>
        </div>
        
        <div class="info">
            <h3>🔍 How to Use This Diagram</h3>
            <p><strong>Zoom:</strong> Use mouse wheel or pinch gestures</p>
            <p><strong>Pan:</strong> Click and drag to move around</p>
            <p><strong>Download:</strong> Right-click on the diagram to save as image</p>
            <p><strong>Full Screen:</strong> Click on the diagram to expand</p>
        </div>
    </div>

    <script>
        mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true
            },
            er: {
                useMaxWidth: true
            }
        });
    </script>
</body>
</html>`;

    return html;
  }

  /**
   * Generate dynamic collection strategy based on actual MongoDB schema
   */
  private generateDynamicCollectionStrategy(collections: MongoDBCollectionSchema[]): string {
    if (!collections || collections.length === 0) {
      return '<li><strong>No collections found</strong> - Schema analysis required</li>';
    }

    return collections.map(collection => {
      const embeddedDocs = collection.embeddedDocuments || [];
      const references = collection.references || [];
      
      let strategy = '';
      
      if (embeddedDocs.length > 0) {
        const embeddedNames = embeddedDocs.map(doc => doc.name).join(', ');
        strategy = `Embeds ${embeddedNames} information`;
      } else if (references.length > 0) {
        const refNames = references.map(ref => ref.targetCollection).join(', ');
        strategy = `References ${refNames} data`;
      } else {
        strategy = 'Standalone collection with core business data';
      }
      
      return `<li><strong>${collection.name} Collection:</strong> ${strategy}</li>`;
    }).join('\n                ');
  }

  /**
   * Generate document header
   */
  private generateHeader(conversionResult: SchemaConversionResult): string {
    return `# Proposed MongoDB Schema Design

**Generated:** ${new Date().toLocaleString()}
**Source:** PostgreSQL Schema Conversion
**Analysis Type:** Comprehensive MongoDB Schema Migration Proposal

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

This document proposes a MongoDB schema design converted from your PostgreSQL database schema. The conversion process analyzes compatibility, maps data types, and provides recommendations for optimal MongoDB performance.

### 📊 Proposed Conversion Statistics
- **Proposed Collections:** ${mongodbSchema.length}
- **Compatible Tables:** ${compatibilityReport.compatibleTables.length}
- **Incompatible Tables:** ${compatibilityReport.incompatibleTables.length}
- **Type Mappings:** ${Object.keys(compatibilityReport.typeMappings).length}
- **Relationship Strategies:** ${Object.keys(compatibilityReport.relationshipStrategies).length}
- **Generated:** ${new Date().toLocaleString()}

### 🎯 Proposed Purpose
This proposed MongoDB schema is designed for ${this.inferDatabasePurpose(mongodbSchema)}. The conversion process ensures ${this.analyzeConversionCharacteristics(conversionResult)}.

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
    
    content += '\n### 📝 Proposed Compatibility Notes\n';
    content += '- **Type Mappings:** All PostgreSQL data types have been mapped to equivalent MongoDB types\n';
    content += '- **Relationships:** Foreign key relationships are proposed to be converted to embedded documents or references\n';
    content += '- **Constraints:** PostgreSQL constraints are proposed to be converted to MongoDB validation rules\n';
    content += '- **Indexes:** Appropriate MongoDB indexes are recommended based on PostgreSQL structure\n';
    
    content += '\n---\n\n';
    return content;
  }

  /**
   * Generate intelligent collections section with embedded documents
   */
  private generateCollectionsSection(collections: MongoDBCollectionSchema[]): string {
    if (collections.length === 0) return '';

    let content = '## 🧠 Proposed Intelligent MongoDB Collections\n\n';
    content += '**This is NOT a 1:1 mapping!** Instead, we propose creating optimized collections with embedded documents based on your actual database relationships.\n\n';
    
    // Group collections by type
    const standaloneCollections = collections.filter(c => !c.embeddedDocuments || c.embeddedDocuments.length === 0);
    const embeddedCollections = collections.filter(c => c.embeddedDocuments && c.embeddedDocuments.length > 0);
    
    content += `### 📊 Proposed Collection Strategy Summary\n`;
    content += `- **Proposed Collections**: ${collections.length} (reduced from ${collections.length + embeddedCollections.reduce((sum, c) => sum + (c.embeddedDocuments?.length || 0), 0)} PostgreSQL tables)\n`;
    content += `- **Standalone Collections**: ${standaloneCollections.length}\n`;
    content += `- **Collections with Embedded Documents**: ${embeddedCollections.length}\n\n`;
    
    // Show embedded collections first (the intelligent ones)
    if (embeddedCollections.length > 0) {
      content += `### 🔗 Proposed Collections with Embedded Documents (Intelligent Design)\n\n`;
      embeddedCollections.forEach(collection => {
        content += this.generateIntelligentCollectionDocumentation(collection);
      });
    }
    
    // Show standalone collections
    if (standaloneCollections.length > 0) {
      content += `### 📁 Proposed Standalone Collections\n\n`;
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
    let content = '## 🔄 Proposed Type Mappings\n\n';
    content += 'This section shows how PostgreSQL data types are proposed to be mapped to MongoDB types:\n\n';
    
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
    let content = '## 🔗 Proposed Relationship Strategies\n\n';
    content += 'This section explains how PostgreSQL foreign key relationships are proposed to be converted to MongoDB:\n\n';
    
    if (Object.keys(compatibilityReport.relationshipStrategies).length === 0) {
      content += '*No relationships found in the source schema*\n\n';
    } else {
      Object.entries(compatibilityReport.relationshipStrategies).forEach(([table, strategy]) => {
        content += `**Table \`${table}\`:** ${strategy}\n\n`;
      });
    }
    
    content += '### Proposed Relationship Conversion Rules\n\n';
    content += '- **Embedding:** Recommended for simple, read-heavy relationships with small related documents\n';
    content += '- **References:** Recommended for complex relationships, write-heavy scenarios, or large related documents\n';
    content += '- **Hybrid Approach:** Combines both strategies based on relationship complexity\n\n';
    
    content += '---\n\n';
    return content;
  }

  /**
   * Generate performance considerations section
   */
  private generatePerformanceSection(compatibilityReport: CompatibilityReport): string {
    let content = '## 🚀 Proposed Performance Considerations\n\n';
    content += 'The following performance optimizations are proposed to be considered in this schema design:\n\n';
    
    compatibilityReport.performanceConsiderations.forEach(consideration => {
      content += `- ${consideration}\n`;
    });
    
    content += '\n### Proposed Indexing Strategy\n\n';
    content += '- **Primary Keys:** Proposed to be converted from PostgreSQL primary keys\n';
    content += '- **Foreign Keys:** Recommended to be indexed for efficient joins and lookups\n';
    content += '- **Text Fields:** Text search indexes recommended for string-based queries\n';
    content += '- **Compound Indexes:** Recommended for frequently queried field combinations\n\n';
    
    content += '---\n\n';
    return content;
  }

  /**
   * Generate recommendations section
   */
  private generateRecommendationsSection(conversionResult: SchemaConversionResult): string {
    let content = '## 💡 Proposed Recommendations\n\n';
    
    if (conversionResult.recommendations.length > 0) {
      content += '### Proposed Best Practices\n\n';
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
    let content = '## 🔄 Proposed Migration Guide\n\n';
    
    content += '### Proposed Pre-Migration Checklist\n\n';
    content += '- [ ] Review compatibility report for any incompatible tables\n';
    content += '- [ ] Validate data types and constraints\n';
    content += '- [ ] Plan indexing strategy based on query patterns\n';
    content += '- [ ] Consider data volume and sharding requirements\n';
    content += '- [ ] Test proposed schema with sample data\n\n';
    
    content += '### Proposed Migration Steps\n\n';
    content += '1. **Create Collections:** Use the proposed schema to create MongoDB collections\n';
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
   * Generate detailed collection analysis section
   */
  private generateDetailedCollectionAnalysis(collections: MongoDBCollectionSchema[]): string {
    if (collections.length === 0) return '';

    let content = '## 📋 Detailed Collection Analysis\n\n';
    content += '> **🔍 In-depth analysis of each MongoDB collection with field details, embedded documents, and relationships**\n\n';

    collections.forEach((collection, index) => {
      content += `### ${index + 1}. ${collection.name}\n\n`;
      
      // Collection overview
      content += `**Description:** ${collection.description}\n\n`;
      
      // Field analysis
      content += `#### 📊 Fields (${collection.fields.length})\n\n`;
      content += '| Field Name | Type | Required | Unique | Indexed | Description |\n';
      content += '|------------|------|----------|--------|---------|-------------|\n';
      
      collection.fields.forEach(field => {
        const required = field.required ? '✅' : '❌';
        const unique = '❌'; // MongoDB fields don't have unique property at field level
        const indexed = '❌'; // MongoDB fields don't have indexed property at field level
        const description = field.description || '-';
        
        content += `| \`${field.name}\` | \`${field.type}\` | ${required} | ${unique} | ${indexed} | ${description} |\n`;
      });
      
      content += '\n';

      // Embedded documents analysis
      if (collection.embeddedDocuments && collection.embeddedDocuments.length > 0) {
        content += `#### 🔗 Embedded Documents (${collection.embeddedDocuments.length})\n\n`;
        
        collection.embeddedDocuments.forEach(embedded => {
          content += `**${embedded.name}**\n`;
          content += `- **Source Table:** \`${embedded.sourceTable}\`\n`;
          content += `- **Description:** ${embedded.description}\n`;
          
          if (embedded.fields && embedded.fields.length > 0) {
            content += `- **Fields:** \`${embedded.fields.join('`, `')}\`\n`;
          }
          content += '\n';
        });
      }

      // References analysis
      if (collection.references && collection.references.length > 0) {
        content += `#### 🔗 References (${collection.references.length})\n\n`;
        
        collection.references.forEach(ref => {
          content += `**${ref.field}** → **${ref.collection}**\n`;
          content += `- **Description:** ${ref.description}\n`;
          content += `- **Source Foreign Key:** \`${ref.sourceForeignKey}\`\n\n`;
        });
      }

      // Indexes analysis
      if (collection.indexes && collection.indexes.length > 0) {
        content += `#### 📈 Indexes (${collection.indexes.length})\n\n`;
        
        collection.indexes.forEach(index => {
          content += `**${index.name}**\n`;
          const fieldNames = Object.keys(index.fields);
          content += `- **Fields:** \`${fieldNames.join('`, `')}\`\n`;
          content += `- **Unique:** ${index.unique ? '✅' : '❌'}\n`;
          content += `- **Sparse:** ${index.sparse ? '✅' : '❌'}\n\n`;
        });
      }

      // Sample document
      if (collection.sampleDocument) {
        content += `#### 📄 Sample Document Structure\n\n`;
        content += '```json\n';
        content += JSON.stringify(collection.sampleDocument, null, 2);
        content += '\n```\n\n';
      }

      // Migration notes
      if (collection.migrationNotes && collection.migrationNotes.length > 0) {
        content += `#### 📝 Migration Notes\n\n`;
        collection.migrationNotes.forEach(note => {
          content += `- ${note}\n`;
        });
        content += '\n';
      }

      content += '---\n\n';
    });

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
    
    // Check for common business domain patterns
    if (collectionNames.some(name => this.matchesPattern(name, ['user', 'customer', 'client', 'member']))) {
      return 'user management and customer relationship management';
    } else if (collectionNames.some(name => this.matchesPattern(name, ['order', 'product', 'item', 'inventory']))) {
      return 'e-commerce and order management';
    } else if (collectionNames.some(name => this.matchesPattern(name, ['content', 'media', 'asset', 'resource']))) {
      return 'content and media management';
    } else if (collectionNames.some(name => this.matchesPattern(name, ['transaction', 'payment', 'billing', 'financial']))) {
      return 'financial and transaction management';
    } else {
      return 'general business operations and data management';
    }
  }

  /**
   * Check if a collection name matches any of the given patterns
   */
  private matchesPattern(collectionName: string, patterns: string[]): boolean {
    return patterns.some(pattern => collectionName.includes(pattern));
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
   * Generate reference strategy section
   */
  private generateReferenceStrategySection(conversionResult: SchemaConversionResult): string {
    let content = '\n## 🔗 Reference Strategy\n\n';
    
    content += '### When to Use References\n';
    content += '- **Large related tables** (>10 columns) to avoid document bloat\n';
    content += '- **Frequently updated data** to maintain data consistency\n';
    content += '- **Many-to-many relationships** for flexibility\n';
    content += '- **Data accessed independently** from parent documents\n\n';
    
    content += '### Actual Reference Examples\n';
    const actualReferences = this.getActualReferenceExamples(conversionResult);
    
    if (actualReferences.length > 0) {
      actualReferences.forEach((ref, index) => {
        content += `\n#### 🔗 ${ref.name} (Referenced from \`${ref.sourceTable}\`)\n`;
        content += `**Purpose**: ${ref.description}\n`;
        content += `**Strategy**: ${ref.strategy}\n`;
        content += `**Reference Field**: ${ref.referenceField}\n`;
      });
    } else {
      content += '\n*No reference examples available for this schema*\n';
    }
    
    return content;
  }

  /**
   * Get actual reference examples from conversion result
   */
  private getActualReferenceExamples(conversionResult: SchemaConversionResult): any[] {
    const examples: any[] = [];
    
    // Extract actual examples from the conversion result
    const strategies = conversionResult.compatibilityReport.relationshipStrategies;
    
    Object.entries(strategies).forEach(([tableName, strategy]: [string, any]) => {
      if (strategy.strategy === 'REFERENCED' && strategy.referencedTables) {
        strategy.referencedTables.forEach((referencedTable: any) => {
          examples.push({
            name: referencedTable.name,
            sourceTable: tableName,
            description: `Referenced data from ${referencedTable.name} table`,
            strategy: strategy.strategy,
            referenceField: referencedTable.referenceField || 'id'
          });
        });
      }
    });
    
    return examples;
  }

  /**
   * Generate comprehensive example section based on actual data
   */
  private generateComprehensiveExampleSection(conversionResult: SchemaConversionResult): string {
    let content = '\n## 📚 Comprehensive Examples\n\n';
    
    // Generate examples based on actual conversion results
    const strategies = conversionResult.compatibilityReport.relationshipStrategies;
    
    if (Object.keys(strategies).length === 0) {
      content += '*No conversion examples available for this schema*\n';
      return content;
    }
    
    // Show first few examples
    let exampleCount = 0;
    Object.entries(strategies).forEach(([tableName, strategy]: [string, any]) => {
      if (exampleCount >= 3) return; // Limit to 3 examples
      
      content += this.generateCollectionExample(tableName, strategy);
      exampleCount++;
    });
    
    return content;
  }

  /**
   * Generate example for a specific collection
   */
  private generateCollectionExample(tableName: string, strategy: any): string {
    let content = `#### 🔗 ${tableName.charAt(0).toUpperCase() + tableName.slice(1)} Collection\n`;
    content += `**Strategy**: ${strategy.strategy}\n\n`;
    
    if (strategy.strategy === 'EMBEDDED' && strategy.embeddedTables) {
      content += '**Embedded Tables**:\n';
      strategy.embeddedTables.forEach((table: any) => {
        content += `- \`${table.name}\`: ${table.reason || 'Frequently accessed together'}\n`;
      });
    } else if (strategy.strategy === 'REFERENCED' && strategy.referencedTables) {
      content += '**Referenced Tables**:\n';
      strategy.referencedTables.forEach((table: any) => {
        content += `- \`${table.name}\`: ${table.reason || 'Large table, accessed independently'}\n`;
      });
    }
    
    content += '\n**Benefits**:\n';
    if (strategy.strategy === 'EMBEDDED') {
      content += '- Single query gets complete data\n';
      content += '- Better data locality\n';
      content += '- Reduced JOIN operations\n';
    } else if (strategy.strategy === 'REFERENCED') {
      content += '- Avoids document bloat\n';
      content += '- Maintains data consistency\n';
      content += '- Flexible relationship handling\n';
    }
    
    content += '\n';
    return content;
  }



  /**
   * NEW: Generate MongoDB Metadata Analysis Section
   */
  private generateMongoDBMetadataAnalysisSection(conversionResult: SchemaConversionResult): string {
    let content = '\n## 📊 Metadata Analysis (MongoDB Migration)\n\n';
    content += 'This section provides comprehensive analysis of how PostgreSQL metadata and statistics should be handled in MongoDB, including performance considerations, storage optimization, and monitoring strategies.\n\n';

    // Database Size Analysis
    const totalTables = conversionResult.compatibilityReport?.compatibleTables?.length || 0;
    const totalCollections = conversionResult.mongodbSchema?.length || 0;
    
    content += `### 🗄️ Database Migration Overview\n\n`;
    content += `- **PostgreSQL Tables:** ${totalTables}\n`;
    content += `- **MongoDB Collections:** ${totalCollections}\n`;
    content += `- **Migration Complexity:** ${this.assessMigrationComplexity(conversionResult)}\n\n`;

    // Collection Statistics
    if (conversionResult.mongodbSchema && conversionResult.mongodbSchema.length > 0) {
      content += `### 📋 Collection Statistics\n\n`;
      content += `| Collection Name | Estimated Documents | Storage Strategy | Indexes | Performance Level |\n`;
      content += `|-----------------|-------------------|------------------|---------|------------------|\n`;
      
      conversionResult.mongodbSchema.forEach((collection: any) => {
        const docCount = this.estimateDocumentCount(collection);
        const storageStrategy = this.determineStorageStrategy(collection);
        const indexCount = collection.indexes?.length || 0;
        const performanceLevel = this.assessPerformanceLevel(collection);
        
        content += `| ${collection.name} | ${docCount.toLocaleString()} | ${storageStrategy} | ${indexCount} | ${performanceLevel} |\n`;
      });
      content += `\n`;
    }

    // Performance Considerations
    content += `### ⚡ Performance Considerations\n\n`;
    content += `**Query Performance:**\n`;
    content += `- Design proper indexes for common query patterns\n`;
    content += `- Use compound indexes for multi-field queries\n`;
    content += `- Consider partial indexes for filtered queries\n`;
    content += `- Monitor query performance with MongoDB Profiler\n\n`;

    content += `**Storage Optimization:**\n`;
    content += `- Use appropriate data types (ObjectId, Date, etc.)\n`;
    content += `- Implement data compression for large documents\n`;
    content += `- Consider sharding for large collections\n`;
    content += `- Use GridFS for large binary data\n\n`;

    content += `**Memory Management:**\n`;
    content += `- Configure appropriate cache size\n`;
    content += `- Monitor memory usage and page faults\n`;
    content += `- Use wiredTiger storage engine for better compression\n`;
    content += `- Implement proper connection pooling\n\n`;

    // Monitoring and Maintenance
    content += `### 🔍 Monitoring and Maintenance\n\n`;
    content += `**Key Metrics to Monitor:**\n`;
    content += `- Query execution time and frequency\n`;
    content += `- Index usage and efficiency\n`;
    content += `- Memory usage and cache hit ratio\n`;
    content += `- Disk I/O and storage utilization\n`;
    content += `- Connection count and pool utilization\n\n`;

    content += `**Maintenance Tasks:**\n`;
    content += `- Regular index optimization and cleanup\n`;
    content += `- Database statistics updates\n`;
    content += `- Log rotation and cleanup\n`;
    content += `- Backup and recovery testing\n`;
    content += `- Performance tuning based on usage patterns\n\n`;

    // Data Quality and Consistency
    content += `### 🎯 Data Quality and Consistency\n\n`;
    content += `**Data Validation:**\n`;
    content += `- Implement MongoDB schema validation\n`;
    content += `- Use application-level validation for complex rules\n`;
    content += `- Implement data integrity checks\n`;
    content += `- Monitor data quality metrics\n\n`;

    content += `**Consistency Strategies:**\n`;
    content += `- Use MongoDB transactions for ACID compliance\n`;
    content += `- Implement eventual consistency where appropriate\n`;
    content += `- Use change streams for real-time synchronization\n`;
    content += `- Implement proper error handling and retry logic\n\n`;

    // Security Considerations
    content += `### 🔒 Security Considerations\n\n`;
    content += `**Access Control:**\n`;
    content += `- Implement role-based access control (RBAC)\n`;
    content += `- Use MongoDB's built-in authentication\n`;
    content += `- Implement network security and encryption\n`;
    content += `- Regular security audits and updates\n\n`;

    content += `**Data Protection:**\n`;
    content += `- Encrypt sensitive data at rest and in transit\n`;
    content += `- Implement proper backup and recovery procedures\n`;
    content += `- Use MongoDB's field-level encryption for sensitive fields\n`;
    content += `- Implement audit logging for compliance\n\n`;

    // Migration Recommendations
    content += `### 💡 Migration Recommendations\n\n`;
    content += `**Phase 1: Preparation**\n`;
    content += `- Analyze current PostgreSQL usage patterns\n`;
    content += `- Design MongoDB schema and indexes\n`;
    content += `- Set up MongoDB cluster and monitoring\n`;
    content += `- Implement data migration scripts\n\n`;

    content += `**Phase 2: Migration**\n`;
    content += `- Migrate data in batches\n`;
    content += `- Implement application changes\n`;
    content += `- Test functionality and performance\n`;
    content += `- Validate data integrity\n\n`;

    content += `**Phase 3: Optimization**\n`;
    content += `- Monitor performance and optimize queries\n`;
    content += `- Tune indexes and configuration\n`;
    content += `- Implement proper monitoring and alerting\n`;
    content += `- Document operational procedures\n\n`;

    return content;
  }

  // Helper methods for MongoDB metadata analysis
  private assessMigrationComplexity(conversionResult: SchemaConversionResult): string {
    const tables = conversionResult.compatibilityReport?.compatibleTables || [];
    const functions: string[] = []; // Not available in CompatibilityReport
    const triggers: string[] = []; // Not available in CompatibilityReport
    
    let complexityScore = 0;
    
    // Table complexity
    if (tables.length > 50) complexityScore += 3;
    else if (tables.length > 20) complexityScore += 2;
    else if (tables.length > 10) complexityScore += 1;
    
    // Function complexity
    if (functions.length > 20) complexityScore += 2;
    else if (functions.length > 10) complexityScore += 1;
    
    // Trigger complexity
    if (triggers.length > 10) complexityScore += 2;
    else if (triggers.length > 5) complexityScore += 1;
    
    if (complexityScore >= 6) return 'HIGH';
    if (complexityScore >= 3) return 'MEDIUM';
    return 'LOW';
  }

  private estimateDocumentCount(collection: any): number {
    // This is a rough estimate based on collection characteristics
    // In a real implementation, you'd analyze the actual data
    const fields = collection.fields?.length || 0;
    const relationships = collection.relationships?.length || 0;
    
    // Base estimate: 1000 documents per field, adjusted for relationships
    let estimate = fields * 1000;
    
    // Adjust for relationships (more relationships = more complex data)
    if (relationships > 5) estimate *= 2;
    else if (relationships > 2) estimate *= 1.5;
    
    return Math.max(estimate, 100); // Minimum 100 documents
  }

  private determineStorageStrategy(collection: any): string {
    const fields = collection.fields?.length || 0;
    const relationships = collection.relationships?.length || 0;
    
    if (fields > 20 || relationships > 5) {
      return 'SHARDED';
    } else if (fields > 10 || relationships > 2) {
      return 'INDEXED';
    } else {
      return 'STANDARD';
    }
  }

  private assessPerformanceLevel(collection: any): string {
    const fields = collection.fields?.length || 0;
    const relationships = collection.relationships?.length || 0;
    const indexes = collection.indexes?.length || 0;
    
    let score = 0;
    
    // More fields = more complex queries
    if (fields > 15) score += 2;
    else if (fields > 8) score += 1;
    
    // More relationships = more JOINs
    if (relationships > 3) score += 2;
    else if (relationships > 1) score += 1;
    
    // Fewer indexes = potential performance issues
    if (indexes < 2) score += 1;
    
    if (score >= 4) return 'HIGH';
    if (score >= 2) return 'MEDIUM';
    return 'LOW';
  }
}
