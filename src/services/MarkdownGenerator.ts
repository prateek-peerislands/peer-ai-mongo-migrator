import fs from 'fs';
import path from 'path';
import { ComprehensivePostgreSQLSchema, ViewSchema, FunctionSchema, TriggerSchema, RelationshipSchema } from './SchemaService.js';
import { TableSchema, IndexSchema, ColumnSchema, ForeignKeySchema } from '../types/index.js';
import { SemanticRelationship, DataFlowPattern, BusinessProcess, BusinessRule, ImpactMatrix } from '../types/index.js';
import { ERDiagramGenerator } from './ERDiagramGenerator.js';

export class MarkdownGenerator {
  private projectRoot: string;
  private erDiagramGenerator: ERDiagramGenerator;

  constructor() {
    this.projectRoot = process.cwd();
    this.erDiagramGenerator = new ERDiagramGenerator();
  }

  /**
   * Generate comprehensive PostgreSQL schema documentation
   */
  async generatePostgreSQLSchemaMarkdown(schema: ComprehensivePostgreSQLSchema): Promise<string> {
    try {
      console.log('📝 Generating PostgreSQL schema documentation...');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `postgres-schema-${timestamp}.md`;
      const filepath = path.join(this.projectRoot, filename);
      
      const markdown = this.buildMarkdownContent(schema);
      
      // Write to file
      fs.writeFileSync(filepath, markdown, 'utf8');
      
      console.log(`✅ Schema documentation generated: ${filename}`);
      return filepath;
    } catch (error) {
      console.error('❌ Failed to generate schema documentation:', error);
      throw error;
    }
  }

  /**
   * Build the complete Markdown content
   */
  private buildMarkdownContent(schema: ComprehensivePostgreSQLSchema): string {
    let content = '';

    // Header
    content += this.generateHeader(schema);
    
    // Table of Contents
    content += this.generateTableOfContents(schema);
    
    // Schema Overview
    content += this.generateSchemaOverview(schema);
    
    // Tables Section
    content += this.generateTablesSection(schema.tables);
    
    // Views Section
    content += this.generateViewsSection(schema.views);
    
    // Functions Section
    content += this.generateFunctionsSection(schema.functions);
    
    // Triggers Section
    content += this.generateTriggersSection(schema.triggers);
    
    // Indexes Section
    content += this.generateIndexesSection(schema.indexes);
    
    // Relationships Section
    content += this.generateRelationshipsSection(schema.relationships);
    
    // NEW: Enhanced relationship sections for "Relationship beyond DDL"
    content += this.generateSemanticRelationshipsSection(schema.semanticRelationships);
    content += this.generateDataFlowSection(schema.dataFlowPatterns);
    content += this.generateBusinessProcessSection(schema.businessProcesses);
    content += this.generateBusinessRulesSection(schema.businessRules);
    content += this.generateImpactMatrixSection(schema.impactMatrix);
    
    // DDL Section
    content += this.generateDDLSection(schema);
    
    // Enhanced ER Diagrams
    content += this.generateEnhancedERDiagrams(schema);
    
    // Footer
    content += this.generateFooter();

    return content;
  }

  /**
   * Generate document header
   */
  private generateHeader(schema: ComprehensivePostgreSQLSchema): string {
    return `# PostgreSQL Schema Documentation

**Generated:** ${schema.summary.lastAnalyzed.toLocaleString()}
**Database:** PostgreSQL
**Analysis Type:** Comprehensive Schema Analysis

---

`;
  }

  /**
   * Generate table of contents
   */
  private generateTableOfContents(schema: ComprehensivePostgreSQLSchema): string {
    let toc = '## 📋 Table of Contents\n\n';

    if (schema.tables.length > 0) {
      toc += '- [Tables](#tables)\n';
      schema.tables.forEach(table => {
        toc += `  - [${table.name}](#table-${table.name.toLowerCase()})\n`;
      });
    }

    if (schema.views.length > 0) {
      toc += '- [Views](#views)\n';
      schema.views.forEach(view => {
        toc += `  - [${view.name}](#view-${view.name.toLowerCase()})\n`;
      });
    }

    if (schema.functions.length > 0) {
      toc += '- [Functions](#functions)\n';
      schema.functions.forEach(func => {
        toc += `  - [${func.name}](#function-${func.name.toLowerCase()})\n`;
      });
    }

    if (schema.triggers.length > 0) {
      toc += '- [Triggers](#triggers)\n';
      schema.triggers.forEach(trigger => {
        toc += `  - [${trigger.name}](#trigger-${trigger.name.toLowerCase()})\n`;
      });
    }

    if (schema.indexes.length > 0) {
      toc += '- [Indexes](#indexes)\n';
    }

    if (schema.relationships.length > 0) {
      toc += '- [Relationships](#relationships)\n';
    }

    // NEW: Enhanced relationship sections
    if (schema.semanticRelationships && schema.semanticRelationships.length > 0) {
      toc += '- [Semantic Relationships](#semantic-relationships)\n';
    }

    if (schema.dataFlowPatterns && schema.dataFlowPatterns.length > 0) {
      toc += '- [Data Flow Patterns](#data-flow-patterns)\n';
    }

    if (schema.businessProcesses && schema.businessProcesses.length > 0) {
      toc += '- [Business Processes](#business-processes)\n';
    }

    if (schema.businessRules && schema.businessRules.length > 0) {
      toc += '- [Business Rules](#business-rules)\n';
    }

    if (schema.impactMatrix && schema.impactMatrix.length > 0) {
      toc += '- [Impact Matrix](#impact-matrix)\n';
    }

    toc += '- [DDL Statements](#ddl-statements)\n';
    toc += '- [Database Diagrams](#database-diagrams)\n\n---\n\n';

    return toc;
  }

  /**
   * Generate schema overview
   */
  private generateSchemaOverview(schema: ComprehensivePostgreSQLSchema): string {
    return `## 🏗️ Schema Overview

This database contains a comprehensive set of database objects designed for efficient data management and application support.

### 📊 Statistics
- **Total Tables:** ${schema.summary.totalTables}
- **Total Views:** ${schema.summary.totalViews}
- **Total Functions:** ${schema.summary.totalFunctions}
- **Total Triggers:** ${schema.summary.totalTriggers}
- **Total Indexes:** ${schema.summary.totalIndexes}
- **Total Relationships:** ${schema.summary.totalRelationships}
- **Last Analyzed:** ${schema.summary.lastAnalyzed.toLocaleString()}

### 🎯 Purpose
This database appears to be designed for ${this.inferDatabasePurpose(schema)}. The schema demonstrates ${this.analyzeSchemaCharacteristics(schema)}.

### 🧠 Enhanced Relationship Analysis
This comprehensive analysis goes beyond traditional DDL relationships to provide business context and insights:

${schema.semanticRelationships && schema.semanticRelationships.length > 0 ? `- **Semantic Relationships:** ${schema.semanticRelationships.length} business relationships discovered` : ''}
${schema.dataFlowPatterns && schema.dataFlowPatterns.length > 0 ? `- **Data Flow Patterns:** ${schema.dataFlowPatterns.length} workflow patterns identified` : ''}
${schema.businessProcesses && schema.businessProcesses.length > 0 ? `- **Business Processes:** ${schema.businessProcesses.length} operational processes mapped` : ''}
${schema.businessRules && schema.businessRules.length > 0 ? `- **Business Rules:** ${schema.businessRules.length} governance rules extracted` : ''}
${schema.impactMatrix && schema.impactMatrix.length > 0 ? `- **Impact Matrix:** Risk assessment for all ${schema.impactMatrix.length} tables` : ''}

---

`;
  }

  /**
   * Generate tables section
   */
  private generateTablesSection(tables: TableSchema[]): string {
    if (tables.length === 0) return '';

    let content = '## 📋 Tables\n\n';
    content += 'The following tables form the core data structure of the database:\n\n';

    tables.forEach(table => {
      content += this.generateTableDocumentation(table);
    });

    return content;
  }

  /**
   * Generate individual table documentation
   */
  private generateTableDocumentation(table: TableSchema): string {
    let content = `### Table: \`${table.name}\`\n\n`;

    // Purpose inference
    content += `**Purpose:** ${this.inferTablePurpose(table.name)}\n\n`;

    // Columns
    content += '**Columns:**\n\n';
    content += '| Column | Type | Nullable | Default | Primary | Foreign | Description |\n';
    content += '|--------|------|----------|---------|---------|---------|-------------|\n';

    table.columns.forEach((column: ColumnSchema) => {
      const primary = column.isPrimary ? '🔑' : '';
      const foreign = column.isForeign ? '🔗' : '';
      const nullable = column.nullable ? 'YES' : 'NO';
      const defaultValue = column.defaultValue || '';
      
      content += `| \`${column.name}\` | \`${column.type}\` | ${nullable} | ${defaultValue} | ${primary} | ${foreign} | ${this.inferColumnPurpose(column.name, table.name)} |\n`;
    });

    content += '\n';

    // Primary Key
    if (table.primaryKey) {
      content += `**Primary Key:** \`${table.primaryKey}\`\n\n`;
    }

    // Foreign Keys
    if (table.foreignKeys && table.foreignKeys.length > 0) {
      content += '**Foreign Keys:**\n\n';
      table.foreignKeys.forEach((fk: ForeignKeySchema) => {
        content += `- \`${fk.column}\` → \`${fk.referencedTable}.${fk.referencedColumn}\`\n`;
      });
      content += '\n';
    }

    // DDL
    content += '**DDL:**\n\n';
    content += '```sql\n';
    content += this.generateTableDDL(table);
    content += '\n```\n\n';

    content += '---\n\n';
    return content;
  }

  /**
   * Generate views section
   */
  private generateViewsSection(views: ViewSchema[]): string {
    if (views.length === 0) return '';

    let content = '## 👁️ Views\n\n';
    content += 'The following views provide simplified access to complex data relationships:\n\n';

    views.forEach(view => {
      content += `### View: \`${view.name}\`\n\n`;
      content += `**Purpose:** ${this.inferViewPurpose(view.name)}\n\n`;
      content += `**Dependencies:** ${view.dependencies.join(', ') || 'None'}\n\n`;
      
      if (view.columns.length > 0) {
        content += '**Columns:**\n\n';
        content += '| Column | Type | Nullable | Default |\n';
        content += '|--------|------|----------|---------|\n';
        view.columns.forEach((col: ColumnSchema) => {
          const nullable = col.nullable ? 'YES' : 'NO';
          const defaultValue = col.defaultValue || '';
          content += `| \`${col.name}\` | \`${col.type}\` | ${nullable} | ${defaultValue} |\n`;
        });
        content += '\n';
      }

      content += '**Definition:**\n\n';
      content += '```sql\n';
      content += view.definition;
      content += '\n```\n\n';
      content += '---\n\n';
    });

    return content;
  }

  /**
   * Generate functions section
   */
  private generateFunctionsSection(functions: FunctionSchema[]): string {
    if (functions.length === 0) return '';

    let content = '## ⚙️ Functions\n\n';
    content += 'The following functions provide business logic and data manipulation capabilities:\n\n';

    functions.forEach(func => {
      content += `### Function: \`${func.name}\`\n\n`;
      content += `**Purpose:** ${this.inferFunctionPurpose(func.name)}\n\n`;
      content += `**Return Type:** \`${func.returnType}\`\n`;
      content += `**Language:** ${func.language}\n`;
      content += `**Volatility:** ${func.volatility}\n\n`;

      if (func.parameters.length > 0) {
        content += '**Parameters:**\n\n';
        content += '| Parameter | Type | Mode | Default |\n';
        content += '|-----------|------|------|---------|\n';
        func.parameters.forEach(param => {
          const defaultValue = param.default || '';
          content += `| \`${param.name}\` | \`${param.type}\` | ${param.mode} | ${defaultValue} |\n`;
        });
        content += '\n';
      }

      content += '**Definition:**\n\n';
      content += '```sql\n';
      content += func.definition;
      content += '\n```\n\n';
      content += '---\n\n';
    });

    return content;
  }

  /**
   * Generate triggers section
   */
  private generateTriggersSection(triggers: TriggerSchema[]): string {
    if (triggers.length === 0) return '';

    let content = '## 🔔 Triggers\n\n';
    content += 'The following triggers automate data integrity and business logic:\n\n';

    triggers.forEach(trigger => {
      content += `### Trigger: \`${trigger.name}\`\n\n`;
      content += `**Table:** \`${trigger.table}\`\n`;
      content += `**Event:** ${trigger.event}\n`;
      content += `**Timing:** ${trigger.timing}\n`;
      content += `**Function:** \`${trigger.function}\`\n`;
      content += `**Purpose:** ${this.inferTriggerPurpose(trigger.name, trigger.table)}\n\n`;

      content += '**Definition:**\n\n';
      content += '```sql\n';
      content += trigger.definition;
      content += '\n```\n\n';
      content += '---\n\n';
    });

    return content;
  }

  /**
   * Generate indexes section
   */
  private generateIndexesSection(indexes: IndexSchema[]): string {
    if (indexes.length === 0) return '';

    let content = '## 🔑 Indexes\n\n';
    content += 'The following indexes optimize query performance and enforce data integrity:\n\n';

    // Group by table
    const tableIndexes = new Map<string, IndexSchema[]>();
    indexes.forEach(index => {
      const tableName = index.table || 'unknown';
      if (!tableIndexes.has(tableName)) {
        tableIndexes.set(tableName, []);
      }
      tableIndexes.get(tableName)!.push(index);
    });

    for (const [tableName, tableIndexList] of tableIndexes) {
      content += `### Table: \`${tableName}\`\n\n`;
      
      content += '| Index Name | Fields | Type | Purpose |\n';
      content += '|------------|--------|------|---------|\n';
      
      tableIndexList.forEach(index => {
        const type = this.getIndexType(index);
        const purpose = this.inferIndexPurpose(index);
        
        // Ensure fields is an array and handle it safely
        let fieldsDisplay = 'Unknown';
        if (index.fields && Array.isArray(index.fields)) {
          fieldsDisplay = index.fields.join(', ');
        } else if (index.fields && typeof index.fields === 'string') {
          fieldsDisplay = index.fields;
        } else if (index.fields && typeof index.fields === 'object') {
          // Handle PostgreSQL array types that might not be properly converted
          try {
            fieldsDisplay = JSON.stringify(index.fields);
          } catch (e) {
            fieldsDisplay = 'Complex field structure';
          }
        }
        
        content += `| \`${index.name}\` | \`${fieldsDisplay}\` | ${type} | ${purpose} |\n`;
      });
      
      content += '\n---\n\n';
    }

    return content;
  }

  /**
   * Generate relationships section
   */
  private generateRelationshipsSection(relationships: RelationshipSchema[]): string {
    if (relationships.length === 0) return '';

    let content = '## 🔗 Relationships\n\n';
    content += 'The following relationships define referential integrity between tables:\n\n';

    content += '| Source Table | Source Column | Target Table | Target Column | Delete Rule | Update Rule |\n';
    content += '|--------------|---------------|--------------|---------------|-------------|-------------|\n';

    relationships.forEach(rel => {
      content += `| \`${rel.sourceTable}\` | \`${rel.sourceColumn}\` | \`${rel.targetTable}\` | \`${rel.targetColumn}\` | ${rel.deleteRule} | ${rel.updateRule} |\n`;
    });

    content += '\n**Relationship Diagram:**\n\n';
    content += '```mermaid\nerDiagram\n';
    
    // Group by source table
    const tableRelationships = new Map<string, RelationshipSchema[]>();
    relationships.forEach(rel => {
      if (!tableRelationships.has(rel.sourceTable)) {
        tableRelationships.set(rel.sourceTable, []);
      }
      tableRelationships.get(rel.sourceTable)!.push(rel);
    });

    for (const [sourceTable, rels] of tableRelationships) {
      rels.forEach(rel => {
        content += `    ${rel.sourceTable} ||--o{ ${rel.targetTable} : "${rel.sourceColumn} -> ${rel.targetColumn}"\n`;
      });
    }

    content += '```\n\n---\n\n';
    return content;
  }

  /**
   * NEW: Generate semantic relationships section
   */
  private generateSemanticRelationshipsSection(semanticRelationships: SemanticRelationship[]): string {
    if (!semanticRelationships || semanticRelationships.length === 0) return '';

    let content = '## 🧠 Semantic Relationships\n\n';
    content += 'Beyond the structural foreign key constraints, these tables have the following business relationships:\n\n';

    semanticRelationships.forEach(rel => {
      content += `### ${rel.sourceTable} → ${rel.targetTable}\n\n`;
      content += `**Business Purpose:** ${rel.businessPurpose}\n\n`;
      content += `**Relationship Type:** ${rel.relationshipType}\n`;
      content += `**Data Flow Direction:** ${rel.dataFlowDirection}\n`;
      content += `**Confidence Level:** ${Math.round(rel.confidence * 100)}%\n\n`;

      if (rel.businessRules.length > 0) {
        content += '**Business Rules:**\n';
        rel.businessRules.forEach(rule => {
          content += `- ${rule}\n`;
        });
        content += '\n';
      }

      if (rel.usagePatterns.length > 0) {
        content += '**Usage Patterns:**\n';
        rel.usagePatterns.forEach(pattern => {
          content += `- ${pattern}\n`;
        });
        content += '\n';
      }

      content += '**Impact Analysis:**\n';
      content += `- **Criticality:** ${rel.impactAnalysis.criticality}\n`;
      content += `- **Business Impact:** ${rel.impactAnalysis.businessImpact}\n`;
      content += `- **Data Integrity Risk:** ${rel.impactAnalysis.dataIntegrityRisk}\n\n`;

      content += '---\n\n';
    });

    return content;
  }

  /**
   * NEW: Generate data flow patterns section
   */
  private generateDataFlowSection(dataFlowPatterns: DataFlowPattern[]): string {
    if (!dataFlowPatterns || dataFlowPatterns.length === 0) return '';

    let content = '## 🌊 Data Flow Patterns\n\n';
    content += 'The following patterns show how data flows through the system in business processes:\n\n';

    dataFlowPatterns.forEach(pattern => {
      content += `### ${pattern.name}\n\n`;
      content += `**Description:** ${pattern.description}\n\n`;
      content += `**Business Process:** ${pattern.businessProcess}\n`;
      content += `**Frequency:** ${pattern.frequency}\n`;
      content += `**Data Volume:** ${pattern.dataVolume}\n`;
      content += `**Performance Impact:** ${pattern.performanceImpact}\n\n`;

      content += '**Tables Involved:**\n';
      pattern.tables.forEach(table => {
        content += `- \`${table}\`\n`;
      });
      content += '\n';

      content += '**Flow Sequence:**\n';
      pattern.flowSequence.forEach(step => {
        content += `${step.step}. **${step.action}** on \`${step.table}\`\n`;
        content += `   - ${step.description}\n`;
        if (step.dependencies.length > 0) {
          content += `   - Dependencies: ${step.dependencies.join(', ')}\n`;
        }
        content += '\n';
      });

      content += '---\n\n';
    });

    return content;
  }

  /**
   * NEW: Generate business processes section
   */
  private generateBusinessProcessSection(businessProcesses: BusinessProcess[]): string {
    if (!businessProcesses || businessProcesses.length === 0) return '';

    let content = '## 🏢 Business Processes\n\n';
    content += 'The following business processes are supported by this database:\n\n';

    businessProcesses.forEach(process => {
      content += `### ${process.name}\n\n`;
      content += `**Description:** ${process.description}\n\n`;
      content += `**Owner:** ${process.owner}\n`;
      content += `**Trigger:** ${process.trigger}\n`;
      content += `**Criticality:** ${process.criticality}\n`;
      content += `**Estimated Duration:** ${process.estimatedDuration}\n\n`;

      content += '**Stakeholders:**\n';
      process.stakeholders.forEach(stakeholder => {
        content += `- ${stakeholder}\n`;
      });
      content += '\n';

      content += '**Tables Involved:**\n';
      process.tables.forEach(table => {
        content += `- \`${table}\`\n`;
      });
      content += '\n';

      content += '**Process Steps:**\n';
      process.steps.forEach(step => {
        content += `${step.stepNumber}. **${step.action}** on \`${step.table}\`\n`;
        content += `   - ${step.description}\n`;
        if (step.businessRules.length > 0) {
          content += `   - Business Rules: ${step.businessRules.join(', ')}\n`;
        }
        if (step.dependencies.length > 0) {
          content += `   - Dependencies: ${step.dependencies.join(', ')}\n`;
        }
        content += '\n';
      });

      if (process.businessRules.length > 0) {
        content += '**Business Rules:**\n';
        process.businessRules.forEach(rule => {
          content += `- ${rule}\n`;
        });
        content += '\n';
      }

      content += '---\n\n';
    });

    return content;
  }

  /**
   * NEW: Generate business rules section
   */
  private generateBusinessRulesSection(businessRules: BusinessRule[]): string {
    if (!businessRules || businessRules.length === 0) return '';

    let content = '## 📋 Business Rules\n\n';
    content += 'The following business rules govern data integrity and business logic:\n\n';

    // Group rules by category
    const rulesByCategory = new Map<string, BusinessRule[]>();
    businessRules.forEach(rule => {
      if (!rulesByCategory.has(rule.category)) {
        rulesByCategory.set(rule.category, []);
      }
      rulesByCategory.get(rule.category)!.push(rule);
    });

    for (const [category, rules] of rulesByCategory) {
      const categoryName = category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      content += `### ${categoryName}\n\n`;

      rules.forEach(rule => {
        content += `#### ${rule.name}\n\n`;
        content += `**Description:** ${rule.description}\n\n`;
        content += `**Rule Type:** ${rule.ruleType}\n`;
        content += `**Enforcement:** ${rule.enforcement}\n`;
        content += `**Impact:** ${rule.impact}\n\n`;

        if (rule.tables.length > 0) {
          content += '**Tables:**\n';
          rule.tables.forEach(table => {
            content += `- \`${table}\`\n`;
          });
          content += '\n';
        }

        if (rule.columns.length > 0) {
          content += '**Columns:**\n';
          rule.columns.forEach(column => {
            content += `- \`${column}\`\n`;
          });
          content += '\n';
        }

        content += '**Rule Definition:**\n';
        content += `${rule.ruleDefinition}\n\n`;

        if (rule.dependencies.length > 0) {
          content += '**Dependencies:**\n';
          rule.dependencies.forEach(dep => {
            content += `- ${dep}\n`;
          });
          content += '\n';
        }

        content += '---\n\n';
      });
    }

    return content;
  }

  /**
   * NEW: Generate impact matrix section
   */
  private generateImpactMatrixSection(impactMatrix: ImpactMatrix[]): string {
    if (!impactMatrix || impactMatrix.length === 0) return '';

    let content = '## 📊 Impact Matrix\n\n';
    content += 'The following matrix shows the business impact and risk assessment for each table:\n\n';

    content += '| Table | Business Criticality | Data Quality Impact | Business Process Impact | Compliance Impact |\n';
    content += '|-------|---------------------|---------------------|------------------------|-------------------|\n';

    impactMatrix.forEach(impact => {
      content += `| \`${impact.tableName}\` | ${impact.businessCriticality} | ${impact.dataQualityImpact.substring(0, 50)}... | ${impact.businessProcessImpact.substring(0, 50)}... | ${impact.complianceImpact.substring(0, 50)}... |\n`;
    });

    content += '\n';

    // Detailed impact analysis for each table
    impactMatrix.forEach(impact => {
      content += `### Table: \`${impact.tableName}\`\n\n`;
      content += `**Business Criticality:** ${impact.businessCriticality}\n\n`;
      content += `**Data Quality Impact:** ${impact.dataQualityImpact}\n`;
      content += `**Business Process Impact:** ${impact.businessProcessImpact}\n`;
      content += `**Compliance Impact:** ${impact.complianceImpact}\n\n`;

      if (impact.riskFactors.length > 0) {
        content += '**Risk Factors:**\n';
        impact.riskFactors.forEach(risk => {
          content += `- ${risk}\n`;
        });
        content += '\n';
      }

      if (impact.mitigationStrategies.length > 0) {
        content += '**Mitigation Strategies:**\n';
        impact.mitigationStrategies.forEach(strategy => {
          content += `- ${strategy}\n`;
        });
        content += '\n';
      }

      content += '---\n\n';
    });

    return content;
  }

  /**
   * Generate DDL section
   */
  private generateDDLSection(schema: ComprehensivePostgreSQLSchema): string {
    let content = '## 📝 DDL Statements\n\n';
    content += 'Complete Data Definition Language statements for all database objects:\n\n';

    // Tables DDL
    if (schema.tables.length > 0) {
      content += '### Tables\n\n';
      schema.tables.forEach(table => {
        content += `#### Table: \`${table.name}\`\n\n`;
        content += '```sql\n';
        content += this.generateTableDDL(table);
        content += '\n```\n\n';
      });
    }

    // Views DDL
    if (schema.views.length > 0) {
      content += '### Views\n\n';
      schema.views.forEach(view => {
        content += `#### View: \`${view.name}\`\n\n`;
        content += '```sql\n';
        content += view.definition;
        content += '\n```\n\n';
      });
    }

    // Functions DDL
    if (schema.functions.length > 0) {
      content += '### Functions\n\n';
      schema.functions.forEach(func => {
        content += `#### Function: \`${func.name}\`\n\n`;
        content += '```sql\n';
        content += func.definition;
        content += '\n```\n\n';
      });
    }

    // Triggers DDL
    if (schema.triggers.length > 0) {
      content += '### Triggers\n\n';
      schema.triggers.forEach(trigger => {
        content += `#### Trigger: \`${trigger.name}\`\n\n`;
        content += '```sql\n';
        content += trigger.definition;
        content += '\n```\n\n';
      });
    }

    return content;
  }

  /**
   * Generate enhanced ER diagrams with multiple formats
   */
  private generateEnhancedERDiagrams(schema: ComprehensivePostgreSQLSchema): string {
    let content = '## 🗺️ Enhanced Entity-Relationship Diagrams\n\n';
    content += '> **💡 Interactive Viewing:** Click the buttons below to view rendered diagrams in your browser!\n\n';

    // Generate comprehensive ER diagram using our new service
    try {
      // For now, use the basic diagrams since the enhanced generator is async
      // TODO: Make this method async to properly handle the enhanced generator
      const basicDiagrams = this.generateBasicMermaidDiagrams(schema);
      
      // Add embedded HTML viewer for the main ER diagram
      content += this.generateEmbeddedHTMLViewer(schema, basicDiagrams);
      

      
    } catch (error) {
      console.warn('⚠️ ER diagram generation failed:', error);
      content += '> **⚠️ Diagram generation failed** - Please use the `er-diagram` command for interactive diagram generation.\n\n';
    }



    // Add helpful viewing instructions
    content += '### 📖 How to View the ER Diagram\n\n';
    content += '**🌐 Interactive HTML Viewer (Recommended):**\n';
    content += '- **Click the button above** to open the interactive ER diagram in your browser\n';
    content += '- **Fully interactive** - zoom, pan, and explore relationships\n';
    content += '- **Download options** - save as SVG or PNG\n\n';
    content += '**📱 Alternative Viewing Methods:**\n';
    content += '- **VS Code:** Install "Mermaid Preview" extension\n';
    content += '- **Online:** Use [Mermaid Live Editor](https://mermaid.live/)\n';
    content += '- **Note:** The diagram is only available in the HTML viewer for the best interactive experience\n\n';

    return content;
  }

  /**
   * Generate basic Mermaid diagrams as fallback
   */
  private generateBasicMermaidDiagrams(schema: ComprehensivePostgreSQLSchema): string {
    let content = '### Basic Entity-Relationship Diagram\n\n';
    
    // First try a simple ER diagram that should work in GitHub
    content += '```mermaid\nerDiagram\n';
    
    // Add tables as entities with proper Mermaid syntax
    schema.tables.forEach(table => {
      // Clean table name and ensure it's valid for Mermaid
      const cleanTableName = table.name.replace(/[^a-zA-Z0-9_]/g, '_');
      content += `    ${cleanTableName} {\n`;
      
      // Only add a few key columns to keep it simple
      const keyColumns = table.columns.slice(0, 3); // Limit to 3 columns
      keyColumns.forEach(col => {
        // Use simple, clean data types for Mermaid
        let cleanType = 'string';
        if (col.type.includes('int') || col.type.includes('integer')) cleanType = 'int';
        else if (col.type.includes('decimal') || col.type.includes('numeric')) cleanType = 'decimal';
        else if (col.type.includes('boolean')) cleanType = 'boolean';
        else if (col.type.includes('date') || col.type.includes('timestamp')) cleanType = 'date';
        
        // Clean column name to avoid Mermaid syntax issues
        const cleanColName = col.name.replace(/[^a-zA-Z0-9_]/g, '_');
        content += `        ${cleanType} ${cleanColName}\n`;
      });
      content += '    }\n';
    });

    // Add relationships with proper Mermaid syntax
    schema.relationships.forEach(rel => {
      const sourceTable = rel.sourceTable.replace(/[^a-zA-Z0-9_]/g, '_');
      const targetTable = rel.targetTable.replace(/[^a-zA-Z0-9_]/g, '_');
      const sourceColumn = rel.sourceColumn.replace(/[^a-zA-Z0-9_]/g, '_');
      const targetColumn = rel.targetColumn.replace(/[^a-zA-Z0-9_]/g, '_');
      content += `    ${sourceTable} ||--o{ ${targetTable} : "${sourceColumn} -> ${targetColumn}"\n`;
    });

    content += '```\n\n';



    return content;
  }

  /**
   * Generate embedded HTML viewer for ER diagrams
   */
  private generateEmbeddedHTMLViewer(schema: ComprehensivePostgreSQLSchema, mermaidCode: string): string {
    let content = '### 🌐 Interactive Diagram Viewer\n\n';
    content += '> **🎯 Click the button below to open the interactive ER diagram in your browser**\n\n';
    
    // Create a simple HTML viewer that can be embedded
    console.log('🔍 Debug: Mermaid code being passed to HTML viewer:', mermaidCode.substring(0, 200) + '...');
    const htmlContent = this.createEmbeddedHTMLViewer(mermaidCode, schema);
    
    // Save the HTML file and provide a link
    try {
      const fileName = `er_diagram_${Date.now()}.html`;
      const filePath = path.join(this.projectRoot, 'diagrams', fileName);
      
      // Ensure diagrams directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, htmlContent, 'utf8');
      
      content += `**📱 [🖱️ Click to View Interactive ER Diagram](file://${filePath})**\n\n`;
      content += `**💻 Or run this command to open directly:** \`open ${filePath}\`\n\n`;

      
    } catch (error) {
      console.error('❌ Failed to generate HTML viewer:', error);
      content += '> **⚠️ Could not generate HTML viewer** - Please use the `er-diagram` command instead.\n\n';
    }
    
    return content;
  }

  /**
   * Create embedded HTML viewer content
   */
  private createEmbeddedHTMLViewer(mermaidCode: string, schema: ComprehensivePostgreSQLSchema): string {
    // Extract Mermaid code from markdown blocks
    const mermaidBlockRegex = /```mermaid\s*([\s\S]*?)```/g;
    const mermaidBlocks: string[] = [];
    let match;
    
    while ((match = mermaidBlockRegex.exec(mermaidCode)) !== null) {
      mermaidBlocks.push(match[1].trim());
    }
    
    if (mermaidBlocks.length === 0) {
      return '<p>No Mermaid diagrams found</p>';
    }
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PostgreSQL Schema ER Diagram - Interactive Viewer</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@11.10.1/dist/mermaid.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 1.1em;
        }
        .nav-tabs {
            display: flex;
            background: #f8f9fa;
            border-bottom: 1px solid #e1e5e9;
            overflow-x: auto;
        }
        .nav-tab {
            padding: 15px 25px;
            cursor: pointer;
            border: none;
            background: none;
            border-bottom: 3px solid transparent;
            font-size: 1em;
            font-weight: 500;
            color: #666;
            transition: all 0.3s ease;
            white-space: nowrap;
        }
        .nav-tab:hover {
            background: #e9ecef;
            color: #333;
        }
        .nav-tab.active {
            border-bottom-color: #4a90e2;
            color: #4a90e2;
            background: white;
        }
        .tab-content {
            display: none;
            padding: 30px;
            min-height: 500px;
        }
        .tab-content.active {
            display: block;
        }
        .diagram-container {
            background: #fafbfc;
            border: 1px solid #e1e5e9;
            border-radius: 8px;
            padding: 25px;
            margin: 20px 0;
            text-align: center;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
            min-height: 700px;
            overflow: auto;
            position: relative;
        }
        .zoom-controls {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 1000;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 5px;
        }
        .zoom-btn {
            background: #4a90e2;
            color: white;
            border: none;
            padding: 5px 10px;
            margin: 0 2px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        }
        .zoom-btn:hover {
            background: #357abd;
        }
        .mermaid {
            display: block;
            width: 100%;
            height: auto;
            min-height: 600px;
            text-align: center;
        }
        .mermaid svg {
            width: 100% !important;
            height: auto !important;
            max-width: none !important;
            min-width: 800px !important;
        }
        .info-box {
            background: #e3f2fd;
            border: 1px solid #2196f3;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
        }
        .info-box h3 {
            margin: 0 0 15px 0;
            color: #1976d2;
        }
        .download-section {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .download-btn {
            display: inline-block;
            background: #4a90e2;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 0 10px;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        .download-btn:hover {
            background: #357abd;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #e1e5e9;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #4a90e2;
            margin-bottom: 5px;
        }
        .stat-label {
            color: #666;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🗺️ PostgreSQL Schema ER Diagram</h1>
            <p>Interactive Entity-Relationship Diagrams for Database Schema Analysis</p>
        </div>

        <div class="info-box">
            <h3>💡 Interactive Features</h3>
            <p>This viewer provides fully interactive ER diagrams. You can zoom, pan, and explore the relationships between tables.</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${schema.tables.length}</div>
                <div class="stat-label">Tables</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${schema.relationships.length}</div>
                <div class="stat-label">Relationships</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${schema.views.length}</div>
                <div class="stat-label">Views</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${schema.functions.length}</div>
                <div class="stat-label">Functions</div>
            </div>
        </div>

        <div class="nav-tabs">
            <button class="nav-tab active" onclick="showTab(0)">
                🏗️ ER Diagram
            </button>
        </div>

        <div class="tab-content active" id="tab-0">
            <div class="diagram-container">
                <div class="zoom-controls">
                    <button class="zoom-btn" onclick="zoomIn(0)">🔍+</button>
                    <button class="zoom-btn" onclick="zoomOut(0)">🔍-</button>
                    <button class="zoom-btn" onclick="resetZoom(0)">🔄</button>
                </div>
                <div class="mermaid" id="mermaid-0">
${mermaidBlocks[0] || 'No diagram available'}
                </div>
            </div>
        </div>

        <div class="download-section">
            <h3>📥 Download Options</h3>
            <p>Save your diagrams in different formats for presentations or documentation</p>
            <a href="#" onclick="downloadSVG()" class="download-btn">📥 Download SVG</a>
            <a href="#" onclick="downloadPNG()" class="download-btn">📥 Download PNG</a>
        </div>
    </div>

    <script>
        // Initialize Mermaid
        mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            securityLevel: 'loose',
            fontFamily: 'Arial, sans-serif',
            fontSize: 18,
            themeVariables: {
                primaryColor: '#4a90e2',
                primaryTextColor: '#333',
                primaryBorderColor: '#4a90e2',
                lineColor: '#333',
                secondaryColor: '#f0f0f0',
                tertiaryColor: '#e1f5fe'
            },
            er: {
                diagramPadding: 20,
                layoutDirection: 'TB',
                minEntityWidth: 200,
                minEntityHeight: 100,
                entityPadding: 15,
                stroke: '#333',
                fill: '#f9f9f9',
                fontSize: 16
            },
            flowchart: {
                diagramPadding: 20,
                nodeSpacing: 50,
                rankSpacing: 50,
                curve: 'basis'
            },
            logLevel: 1,
            errorHandler: function(error) {
                console.error('Mermaid error:', error);
                // Show error message in the diagram container
                const activeTab = document.querySelector('.tab-content.active');
                if (activeTab) {
                    const container = activeTab.querySelector('.diagram-container');
                    if (container) {
                        container.innerHTML = '<div style="color: red; padding: 20px; text-align: center;"><h3>⚠️ Diagram Rendering Error</h3><p>There was an issue rendering this diagram. Please check the console for details.</p></div>';
                    }
                }
            }
        });

        function showTab(index) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.classList.remove('active');
            });

            // Show selected tab
            document.getElementById('tab-' + index).classList.add('active');
            document.querySelectorAll('.nav-tab')[index].classList.add('active');
        }

        // Download functions
        function downloadSVG() {
            const activeTab = document.querySelector('.tab-content.active');
            const svg = activeTab.querySelector('svg');
            if (svg) {
                const svgData = new XMLSerializer().serializeToString(svg);
                const blob = new Blob([svgData], {type: 'image/svg+xml'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'postgresql_schema_er_diagram.svg';
                a.click();
                URL.revokeObjectURL(url);
            }
        }

        function downloadPNG() {
            const activeTab = document.querySelector('.tab-content.active');
            const svg = activeTab.querySelector('svg');
            if (svg) {
                const svgData = new XMLSerializer().serializeToString(svg);
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                img.onload = function() {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    const pngUrl = canvas.toDataURL('image/png');
                    const a = document.createElement('a');
                    a.href = pngUrl;
                    a.download = 'postgresql_schema_er_diagram.png';
                    a.click();
                };
                
                img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
            }
        }

        // Zoom functions
        let zoomLevels = {};
        
        function zoomIn(tabIndex) {
            if (!zoomLevels[tabIndex]) zoomLevels[tabIndex] = 1;
            zoomLevels[tabIndex] = Math.min(zoomLevels[tabIndex] * 1.2, 3);
            applyZoom(tabIndex);
        }
        
        function zoomOut(tabIndex) {
            if (!zoomLevels[tabIndex]) zoomLevels[tabIndex] = 1;
            zoomLevels[tabIndex] = Math.max(zoomLevels[tabIndex] / 1.2, 0.5);
            applyZoom(tabIndex);
        }
        
        function resetZoom(tabIndex) {
            zoomLevels[tabIndex] = 1;
            applyZoom(tabIndex);
        }
        
        function applyZoom(tabIndex) {
            const mermaidDiv = document.getElementById('mermaid-' + tabIndex);
            if (mermaidDiv) {
                const svg = mermaidDiv.querySelector('svg');
                if (svg) {
                    svg.style.transform = 'scale(' + zoomLevels[tabIndex] + ')';
                    svg.style.transformOrigin = 'center center';
                }
            }
        }
    </script>
</body>
</html>`;

    return html;
  }

  /**
   * Generate additional diagram formats
   */
  private generateAdditionalDiagramFormats(schema: ComprehensivePostgreSQLSchema): string {
    let content = '### Additional Diagram Formats\n\n';
    content += '> **📊 Multiple Formats Available:** The following diagrams are provided in different formats for various tools and viewers.\n\n';

    // PlantUML
    content += '#### PlantUML ER Diagram\n\n';
    content += '```plantuml\n';
    content += '@startuml\n';
    content += '!theme plain\n';
    content += 'skinparam linetype ortho\n\n';
    
    schema.tables.forEach(table => {
      content += `entity "${table.name}" {\n`;
      table.columns.forEach(col => {
        let columnLine = `  * ${col.name} : ${col.type}`;
        if (col.isPrimary) columnLine += ' <<PK>>';
        if (col.isForeign) columnLine += ' <<FK>>';
        content += columnLine + '\n';
      });
      content += '}\n\n';
    });

    schema.relationships.forEach(rel => {
      content += `"${rel.sourceTable}" ||--o{ "${rel.targetTable}" : ${rel.sourceColumn} -> ${rel.targetColumn}\n`;
    });

    content += '@enduml\n```\n\n';

    // DBML
    content += '#### DBML Schema Definition\n\n';
    content += '```dbml\n';
    content += '// Database Schema Definition\n';
    content += `// Tables: ${schema.tables.length}, Relationships: ${schema.relationships.length}\n\n`;
    
    schema.tables.forEach(table => {
      content += `Table ${table.name} {\n`;
      table.columns.forEach(col => {
        let columnLine = `  ${col.name} ${col.type}`;
        if (col.isPrimary) columnLine += ' [pk]';
        if (col.isForeign) columnLine += ' [ref]';
        if (!col.nullable) columnLine += ' [not null]';
        content += columnLine + '\n';
      });
      content += '}\n\n';
    });

    content += '```\n\n';

    return content;
  }

  /**
   * Generate footer
   */
  private generateFooter(): string {
    return `---

## 📚 Additional Information

This documentation was automatically generated by the PeerAI MongoMigrator. For questions or updates, please refer to the database administrator or use the agent's interactive mode.

**Generated by:** PeerAI MongoMigrator v2.0
**Generation Date:** ${new Date().toLocaleString()}
`;
  }

  /**
   * Generate table DDL
   */
  private generateTableDDL(table: TableSchema): string {
    let ddl = `CREATE TABLE "${table.name}" (\n`;
    
    const columns = table.columns.map(col => {
      let colDef = `  "${col.name}" ${col.type}`;
      if (!col.nullable) colDef += ' NOT NULL';
      if (col.defaultValue !== undefined) colDef += ` DEFAULT ${col.defaultValue}`;
      return colDef;
    });

    ddl += columns.join(',\n');
    
    if (table.primaryKey) {
      ddl += `,\n  PRIMARY KEY ("${table.primaryKey}")`;
    }

    if (table.foreignKeys && table.foreignKeys.length > 0) {
      table.foreignKeys.forEach((fk: ForeignKeySchema) => {
        ddl += `,\n  CONSTRAINT "${fk.column}_fkey" FOREIGN KEY ("${fk.column}") REFERENCES "${fk.referencedTable}" ("${fk.referencedColumn}")`;
      });
    }

    ddl += '\n);';
    return ddl;
  }

  /**
   * Helper methods for inference
   */
  private inferDatabasePurpose(schema: ComprehensivePostgreSQLSchema): string {
    const tableNames = schema.tables.map(t => t.name.toLowerCase());
    
    if (tableNames.some(name => name.includes('user') || name.includes('customer'))) {
      return 'user management and customer relationship management';
    } else if (tableNames.some(name => name.includes('order') || name.includes('product'))) {
      return 'e-commerce and order management';
    } else if (tableNames.some(name => name.includes('film') || name.includes('actor'))) {
      return 'media and entertainment management';
    } else {
      return 'general business operations and data management';
    }
  }

  private analyzeSchemaCharacteristics(schema: ComprehensivePostgreSQLSchema): string {
    const characteristics = [];
    
    if (schema.relationships.length > 0) {
      characteristics.push('well-normalized structure with proper referential integrity');
    }
    if (schema.indexes.length > schema.tables.length) {
      characteristics.push('optimized for read performance with strategic indexing');
    }
    if (schema.views.length > 0) {
      characteristics.push('abstraction layers for complex data access');
    }
    if (schema.functions.length > 0) {
      characteristics.push('business logic encapsulation at the database level');
    }
    
    return characteristics.length > 0 ? characteristics.join(', ') : 'standard relational database design';
  }

  private inferTablePurpose(tableName: string): string {
    const name = tableName.toLowerCase();
    
    if (name.includes('user') || name.includes('customer')) return 'Stores user/customer information and profiles';
    if (name.includes('order') || name.includes('purchase')) return 'Manages order and transaction data';
    if (name.includes('product') || name.includes('item')) return 'Contains product catalog and inventory information';
    if (name.includes('film') || name.includes('movie')) return 'Stores media content and metadata';
    if (name.includes('actor') || name.includes('performer')) return 'Manages performer and talent information';
    if (name.includes('category') || name.includes('type')) return 'Defines classification and categorization data';
    if (name.includes('log') || name.includes('audit')) return 'Tracks system events and audit trails';
    
    return 'Stores business data and supports application functionality';
  }

  private inferColumnPurpose(columnName: string, tableName: string): string {
    const name = columnName.toLowerCase();
    const table = tableName.toLowerCase();
    
    if (name.includes('id')) return 'Unique identifier for the record';
    if (name.includes('name')) return 'Human-readable name or title';
    if (name.includes('created') || name.includes('date')) return 'Timestamp of record creation';
    if (name.includes('updated') || name.includes('modified')) return 'Timestamp of last modification';
    if (name.includes('status')) return 'Current state or condition';
    if (name.includes('type')) return 'Classification or categorization';
    if (name.includes('description')) return 'Detailed explanation or notes';
    
    return 'Business data field';
  }

  private inferViewPurpose(viewName: string): string {
    const name = viewName.toLowerCase();
    
    if (name.includes('summary') || name.includes('report')) return 'Provides aggregated or summarized data for reporting';
    if (name.includes('active') || name.includes('current')) return 'Shows only currently active or relevant records';
    if (name.includes('detail') || name.includes('full')) return 'Combines related data from multiple tables';
    
    return 'Simplifies access to complex data relationships';
  }

  private inferFunctionPurpose(functionName: string): string {
    const name = functionName.toLowerCase();
    
    if (name.includes('get') || name.includes('fetch')) return 'Retrieves data based on parameters';
    if (name.includes('insert') || name.includes('add')) return 'Creates new records';
    if (name.includes('update') || name.includes('modify')) return 'Modifies existing records';
    if (name.includes('delete') || name.includes('remove')) return 'Removes records';
    if (name.includes('validate') || name.includes('check')) return 'Performs data validation';
    if (name.includes('calculate') || name.includes('compute')) return 'Performs calculations or computations';
    
    return 'Executes business logic or data manipulation';
  }

  private inferTriggerPurpose(triggerName: string, tableName: string): string {
    const name = triggerName.toLowerCase();
    const table = tableName.toLowerCase();
    
    if (name.includes('audit') || name.includes('log')) return 'Tracks changes for audit purposes';
    if (name.includes('validate') || name.includes('check')) return 'Ensures data integrity and validation';
    if (name.includes('update') || name.includes('modify')) return 'Automatically updates related data';
    if (name.includes('notify') || name.includes('alert')) return 'Sends notifications or alerts';
    
    return 'Automates data integrity and business logic';
  }

  private getIndexType(index: IndexSchema): string {
    if (index.primary) return 'Primary Key';
    if (index.unique) return 'Unique';
    if (index.clustered) return 'Clustered';
    return 'Standard';
  }

  private inferIndexPurpose(index: IndexSchema): string {
    if (index.primary) return 'Enforces primary key constraint and optimizes joins';
    if (index.unique) return 'Ensures data uniqueness and optimizes equality searches';
    if (index.fields.length === 1) return 'Optimizes queries on single column';
    if (index.fields.length > 1) return 'Optimizes composite queries and sorting';
    return 'Improves query performance on indexed columns';
  }
}
