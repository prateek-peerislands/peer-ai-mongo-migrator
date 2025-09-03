import { ComprehensivePostgreSQLSchema, RelationshipSchema } from './SchemaService.js';
import { TableSchema, ColumnSchema, ForeignKeySchema, IndexSchema } from '../types/index.js';
import fs from 'fs';
import path from 'path';

export interface ERDiagramOptions {
  format: 'mermaid' | 'plantuml' | 'dbml' | 'json';
  includeIndexes: boolean;
  includeConstraints: boolean;
  includeDataTypes: boolean;
  includeCardinality: boolean;
  includeDescriptions: boolean;
  outputPath?: string;
  diagramStyle?: 'detailed' | 'simplified' | 'minimal';
}

export interface ERDiagramResult {
  success: boolean;
  content: string;
  filePath?: string;
  error?: string;
  metadata: {
    tables: number;
    relationships: number;
    indexes: number;
    format: string;
    generatedAt: Date;
  };
}

export class ERDiagramGenerator {
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
  }

  /**
   * Generate comprehensive ER diagram
   */
  async generateERDiagram(
    schema: ComprehensivePostgreSQLSchema, 
    options: ERDiagramOptions = { format: 'mermaid', includeIndexes: true, includeConstraints: true, includeDataTypes: true, includeCardinality: true, includeDescriptions: false, diagramStyle: 'detailed' }
  ): Promise<ERDiagramResult> {
    try {
      console.log('🗺️ Generating comprehensive ER diagram...');
      
      let content: string;
      let filePath: string | undefined;

      switch (options.format) {
        case 'mermaid':
          content = this.generateMermaidDiagram(schema, options);
          break;
        case 'plantuml':
          content = this.generatePlantUMLDiagram(schema, options);
          break;
        case 'dbml':
          content = this.generateDBMLDiagram(schema, options);
          break;
        case 'json':
          content = this.generateJSONDiagram(schema, options);
          break;
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      // Save to file if output path is specified
      if (options.outputPath) {
        filePath = await this.saveDiagramToFile(content, options.format, options.outputPath);
      } else {
        filePath = await this.saveDiagramToFile(content, options.format);
      }

      const metadata = {
        tables: schema.tables.length,
        relationships: schema.relationships.length,
        indexes: schema.indexes.length,
        format: options.format,
        generatedAt: new Date()
      };

      console.log(`✅ ER diagram generated successfully (${options.format.toUpperCase()})`);
      console.log(`   Tables: ${metadata.tables}, Relationships: ${metadata.relationships}, Indexes: ${metadata.indexes}`);

      return {
        success: true,
        content,
        filePath,
        metadata
      };

    } catch (error) {
      console.error('❌ Failed to generate ER diagram:', error);
      return {
        success: false,
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          tables: 0,
          relationships: 0,
          indexes: 0,
          format: options.format,
          generatedAt: new Date()
        }
      };
    }
  }

  /**
   * Generate enhanced Mermaid ER diagram
   */
  private generateMermaidDiagram(schema: ComprehensivePostgreSQLSchema, options: ERDiagramOptions): string {
    let content = '### Entity-Relationship Diagram (Mermaid)\n\n';
    content += '```mermaid\nerDiagram\n';
    
    // Generate entities (tables)
    schema.tables.forEach(table => {
      content += `    ${table.name} {\n`;
      
      // Add columns with enhanced information
      table.columns.forEach(col => {
        let columnLine = `        ${col.type} ${col.name}`;
        
        // Add constraints and metadata
        if (col.isPrimary) columnLine += ' 🔑';
        if (col.isForeign) columnLine += ' 🔗';
        if (!col.nullable) columnLine += ' NOT NULL';
        if (col.defaultValue !== undefined) columnLine += ` DEFAULT ${col.defaultValue}`;
        
        content += columnLine + '\n';
      });
      
      content += '    }\n';
    });

    // Generate relationships with cardinality
    schema.relationships.forEach(rel => {
      const cardinality = this.determineCardinality(rel);
      content += `    ${rel.sourceTable} ${cardinality.source} ${cardinality.target} ${rel.targetTable} : "${rel.sourceColumn} -> ${rel.targetColumn}"\n`;
    });

    content += '```\n\n';

    // Add table relationship graph
    content += '### Table Relationship Graph\n\n';
    content += '```mermaid\ngraph TD\n';
    content += '    %% Table Nodes\n';
    
    schema.tables.forEach(table => {
      const primaryKeys = table.columns.filter(col => col.isPrimary).map(col => col.name);
      const foreignKeys = table.columns.filter(col => col.isForeign).map(col => col.name);
      
      let nodeStyle = '';
      if (primaryKeys.length > 0) nodeStyle = ':::primaryTable';
      else if (foreignKeys.length > 0) nodeStyle = ':::foreignTable';
      else nodeStyle = ':::regularTable';
      
      content += `    ${table.name}[${table.name}<br/>${table.columns.length} columns]${nodeStyle}\n`;
    });

    content += '\n    %% Relationships\n';
    schema.relationships.forEach(rel => {
      content += `    ${rel.sourceTable} -->|FK: ${rel.sourceColumn}| ${rel.targetTable}\n`;
    });

    // Add CSS classes for styling
    content += '\n    %% Styling\n';
    content += '    classDef primaryTable fill:#e1f5fe,stroke:#01579b,stroke-width:2px\n';
    content += '    classDef foreignTable fill:#f3e5f5,stroke:#4a148c,stroke-width:2px\n';
    content += '    classDef regularTable fill:#f1f8e9,stroke:#33691e,stroke-width:1px\n';
    content += '```\n\n';

    return content;
  }

  /**
   * Generate PlantUML ER diagram
   */
  private generatePlantUMLDiagram(schema: ComprehensivePostgreSQLSchema, options: ERDiagramOptions): string {
    let content = '@startuml\n';
    content += '!theme plain\n';
    content += 'skinparam linetype ortho\n';
    content += 'skinparam classAttributeIconSize 0\n\n';
    
    // Generate entities
    schema.tables.forEach(table => {
      content += `entity "${table.name}" {\n`;
      
      table.columns.forEach(col => {
        let columnLine = `  * ${col.name} : ${col.type}`;
        if (col.isPrimary) columnLine += ' <<PK>>';
        if (col.isForeign) columnLine += ' <<FK>>';
        if (!col.nullable) columnLine += ' <<NOT NULL>>';
        content += columnLine + '\n';
      });
      
      content += '}\n\n';
    });

    // Generate relationships
    schema.relationships.forEach(rel => {
      const cardinality = this.determineCardinality(rel);
      content += `"${rel.sourceTable}" ${cardinality.source}--${cardinality.target} "${rel.targetTable}" : ${rel.sourceColumn} -> ${rel.targetColumn}\n`;
    });

    content += '@enduml';
    return content;
  }

  /**
   * Generate DBML (Database Markup Language) diagram
   */
  private generateDBMLDiagram(schema: ComprehensivePostgreSQLSchema, options: ERDiagramOptions): string {
    let content = '// Database Schema Definition\n';
    content += `// Generated: ${new Date().toISOString()}\n`;
    content += `// Tables: ${schema.tables.length}, Relationships: ${schema.relationships.length}\n\n`;
    
    // Generate table definitions
    schema.tables.forEach(table => {
      content += `Table ${table.name} {\n`;
      
      table.columns.forEach(col => {
        let columnLine = `  ${col.name} ${col.type}`;
        if (col.isPrimary) columnLine += ' [pk]';
        if (col.isForeign) columnLine += ' [ref: > ${this.getReferencedTable(col, schema)}.${this.getReferencedColumn(col, schema)}]';
        if (!col.nullable) columnLine += ' [not null]';
        if (col.defaultValue !== undefined) columnLine += ` [default: ${col.defaultValue}]`;
        content += columnLine + '\n';
      });
      
      content += '}\n\n';
    });

    // Generate indexes
    if (options.includeIndexes) {
      content += '// Indexes\n';
      schema.indexes.forEach(index => {
        content += `Index ${index.name} on ${index.table} (${index.fields.join(', ')})`;
        if (index.unique) content += ' [unique]';
        if (index.primary) content += ' [pk]';
        content += '\n';
      });
      content += '\n';
    }

    return content;
  }

  /**
   * Generate JSON representation of the ER diagram
   */
  private generateJSONDiagram(schema: ComprehensivePostgreSQLSchema, options: ERDiagramOptions): string {
    const diagramData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        format: 'json',
        version: '1.0'
      },
      database: {
        tables: schema.tables.map(table => ({
          name: table.name,
          columns: table.columns.map(col => ({
            name: col.name,
            type: col.type,
            isPrimary: col.isPrimary,
            isForeign: col.isForeign,
            nullable: col.nullable,
            defaultValue: col.defaultValue
          })),
          primaryKey: table.primaryKey,
          foreignKeys: table.foreignKeys
        })),
        relationships: schema.relationships.map(rel => ({
          sourceTable: rel.sourceTable,
          sourceColumn: rel.sourceColumn,
          targetTable: rel.targetTable,
          targetColumn: rel.targetColumn,
          constraintName: rel.constraintName,
          deleteRule: rel.deleteRule,
          updateRule: rel.updateRule
        })),
        indexes: schema.indexes.map(index => ({
          name: index.name,
          table: index.table,
          fields: index.fields,
          unique: index.unique,
          primary: index.primary,
          clustered: index.clustered
        })),
        views: schema.views,
        functions: schema.functions,
        triggers: schema.triggers
      }
    };

    return JSON.stringify(diagramData, null, 2);
  }

  /**
   * Determine relationship cardinality
   */
  private determineCardinality(relationship: RelationshipSchema): { source: string; target: string } {
    // This is a simplified approach - in a real implementation, you might want to analyze
    // the actual data to determine true cardinality
    return {
      source: '||--o{',
      target: '||--o{'
    };
  }

  /**
   * Get referenced table for foreign key
   */
  private getReferencedTable(column: ColumnSchema, schema: ComprehensivePostgreSQLSchema): string {
    const fk = schema.relationships.find(rel => 
      rel.sourceTable === column.name || rel.sourceColumn === column.name
    );
    return fk ? fk.targetTable : 'unknown';
  }

  /**
   * Get referenced column for foreign key
   */
  private getReferencedColumn(column: ColumnSchema, schema: ComprehensivePostgreSQLSchema): string {
    const fk = schema.relationships.find(rel => 
      rel.sourceTable === column.name || rel.sourceColumn === column.name
    );
    return fk ? fk.targetColumn : 'unknown';
  }

  /**
   * Save diagram to file
   */
  private async saveDiagramToFile(content: string, format: string, customPath?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `er-diagram-${timestamp}.${this.getFileExtension(format)}`;
    
    let filePath: string;
    if (customPath) {
      filePath = path.join(customPath, filename);
    } else {
      filePath = path.join(this.projectRoot, filename);
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  }

  /**
   * Get file extension for format
   */
  private getFileExtension(format: string): string {
    switch (format) {
      case 'mermaid': return 'md';
      case 'plantuml': return 'puml';
      case 'dbml': return 'dbml';
      case 'json': return 'json';
      default: return 'txt';
    }
  }

  /**
   * Generate comprehensive ER diagram documentation
   */
  async generateERDocumentation(schema: ComprehensivePostgreSQLSchema): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `er-diagram-documentation-${timestamp}.md`;
    const filepath = path.join('/Users/prateek/Desktop/peer-ai-mongo-documents', filename);
    
    let content = `# Entity-Relationship Diagram Documentation

**Generated:** ${new Date().toLocaleString()}
**Database:** PostgreSQL
**Analysis Type:** Comprehensive ER Diagram Analysis

---

## 📊 Schema Overview

- **Total Tables:** ${schema.tables.length}
- **Total Relationships:** ${schema.relationships.length}
- **Total Indexes:** ${schema.indexes.length}
- **Total Views:** ${schema.views.length}
- **Total Functions:** ${schema.functions.length}
- **Total Triggers:** ${schema.triggers.length}

---

## 🗺️ ER Diagrams

### 1. Mermaid ER Diagram

${this.generateMermaidDiagram(schema, { format: 'mermaid', includeIndexes: true, includeConstraints: true, includeDataTypes: true, includeCardinality: true, includeDescriptions: false, diagramStyle: 'detailed' })}

### 2. PlantUML ER Diagram

\`\`\`plantuml
${this.generatePlantUMLDiagram(schema, { format: 'plantuml', includeIndexes: true, includeConstraints: true, includeDataTypes: true, includeCardinality: true, includeDescriptions: false, diagramStyle: 'detailed' })}
\`\`\`

### 3. DBML Schema Definition

\`\`\`dbml
${this.generateDBMLDiagram(schema, { format: 'dbml', includeIndexes: true, includeConstraints: true, includeDataTypes: true, includeCardinality: true, includeDescriptions: false, diagramStyle: 'detailed' })}
\`\`\`

---

## 📋 Table Details

${schema.tables.map(table => `
### ${table.name}

**Columns:**
${table.columns.map(col => `- \`${col.name}\` (${col.type})${col.isPrimary ? ' 🔑 Primary Key' : ''}${col.isForeign ? ' 🔗 Foreign Key' : ''}${!col.nullable ? ' NOT NULL' : ''}`).join('\n')}

**Primary Key:** ${table.primaryKey || 'None'}
**Foreign Keys:** ${table.foreignKeys && table.foreignKeys.length > 0 ? table.foreignKeys.map(fk => `\`${fk.column}\` → \`${fk.referencedTable}.\`${fk.referencedColumn}\``).join(', ') : 'None'}

`).join('\n')}

---

## 🔗 Relationship Details

${schema.relationships.map(rel => `
### ${rel.sourceTable}.${rel.sourceColumn} → ${rel.targetTable}.${rel.targetColumn}

- **Constraint:** ${rel.constraintName}
- **Delete Rule:** ${rel.deleteRule}
- **Update Rule:** ${rel.updateRule}

`).join('\n')}

---

## 📈 Index Information

${schema.indexes.map(index => `
### ${index.name}

- **Table:** ${index.table}
- **Fields:** ${index.fields.join(', ')}
- **Unique:** ${index.unique ? 'Yes' : 'No'}
- **Primary:** ${index.primary ? 'Yes' : 'No'}
- **Clustered:** ${index.clustered ? 'Yes' : 'No'}

`).join('\n')}

---

## 🎨 Diagram Usage

### Mermaid
- Use in GitHub, GitLab, or any Markdown viewer that supports Mermaid
- Copy the Mermaid code block to [Mermaid Live Editor](https://mermaid.live/)

### PlantUML
- Use in [PlantUML Online Server](http://www.plantuml.com/plantuml/uml/)
- Or install PlantUML locally for offline generation

### DBML
- Use in [dbdiagram.io](https://dbdiagram.io/) for interactive diagrams
- Or use with DBML tools for code generation

---

*Generated by PeerAI MongoMigrator v2.0 with Enhanced ER Diagram Generator*
`;

    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`✅ ER diagram documentation generated: ${filename}`);
    return filepath;
  }
}
