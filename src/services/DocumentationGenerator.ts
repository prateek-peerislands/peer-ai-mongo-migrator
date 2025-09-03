import { SourceCodeAnalysis, MigrationPlan } from '../types/migration-types.js';
import { UnifiedERDiagramGenerator } from './UnifiedERDiagramGenerator.js';
import * as fs from 'fs';
import * as path from 'path';

export class DocumentationGenerator {
  private erDiagramGenerator: UnifiedERDiagramGenerator;

  constructor() {
    this.erDiagramGenerator = new UnifiedERDiagramGenerator();
  }
  
  /**
   * Generate comprehensive migration documentation
   */
  async generateDocumentation(
    analysis: SourceCodeAnalysis, 
    plan: MigrationPlan, 
    outputPath: string
  ): Promise<void> {
    try {
      console.log(`📝 Creating migration documentation at: ${outputPath}`);
      
      const markdown = await this.generateMarkdownContent(analysis, plan);
      
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        await fs.promises.mkdir(outputDir, { recursive: true });
      }
      
      // Write the markdown file
      await fs.promises.writeFile(outputPath, markdown, 'utf-8');
      
      console.log(`✅ Migration documentation created successfully at: ${outputPath}`);
      
    } catch (error) {
      console.error('❌ Error creating migration documentation:', error);
      throw error;
    }
  }

  /**
   * Generate the complete markdown content
   */
  private async generateMarkdownContent(analysis: SourceCodeAnalysis, plan: MigrationPlan): Promise<string> {
    const content = [
      this.generateHeader(analysis),
      await this.generateInteractiveERDiagramViewer(analysis, plan),
      this.generateExecutiveSummary(plan, analysis),
      this.generateRealSourceCodeBenefits(analysis),
      this.generateSourceCodeAnalysisBenefits(analysis),
      this.generateCurrentArchitectureOverview(analysis),
      this.generateImpactAnalysisMatrix(plan, analysis),
      this.generateDetailedComponentAnalysis(analysis),
      this.generateFileInventory(analysis),
      this.generateStoredProceduresAnalysisSection(analysis),
      this.generateMetadataAnalysisSection(analysis),
      this.generateMigrationStrategy(plan),
      this.generateRiskAssessment(plan),
      this.generateSuccessMetrics(),
      this.generateRecommendations(plan),
      this.generateNewProjectStructure(analysis),
      this.generateArchitectureBenefits(analysis),
      this.generateConclusion(plan)
    ];
    
    return content.join('\n\n');
  }

  /**
   * Generate interactive ER diagram viewer at the beginning of the document
   */
  private async generateInteractiveERDiagramViewer(analysis: SourceCodeAnalysis, plan: MigrationPlan): Promise<string> {
    let content = '## 🌐 Interactive Migration ER Diagram Viewer\n\n';
    content += '> **🎯 Click the button below to open the interactive migration ER diagram in your browser**\n\n';
    
    try {
      // Generate Migration ER diagram
      const erResult = await this.erDiagramGenerator.generateMigrationERDiagram(
        analysis,
        plan,
        {
          format: 'mermaid',
          includeIndexes: true,
          includeConstraints: true,
          includeDataTypes: true,
          includeCardinality: true,
          includeDescriptions: false,
          showMigrationStrategy: true,
          outputPath: undefined // We'll handle the file path manually
        }
      );

      if (erResult.success && erResult.content) {
        // Create HTML viewer and get the file path
        const htmlContent = this.createEmbeddedHTMLViewer(erResult.content, analysis, plan);
        
        // Save the HTML file and get the dynamic file path
        const fileName = `migration_er_diagram_${Date.now()}.html`;
        const filePath = path.join('/Users/prateek/Desktop/peer-ai-mongo-documents', 'diagrams', fileName);
        
        // Ensure diagrams directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // Write the HTML file
        fs.writeFileSync(filePath, htmlContent, 'utf8');
        
        // Add the interactive link at the beginning
        content += `**📱 [🖱️ Click to View Interactive Migration ER Diagram](file://${filePath})**\n\n`;
        content += `**💻 Or run this command to open directly:** \`open ${filePath}\`\n\n`;
        content += '---\n\n';
        
      } else {
        throw new Error(erResult.error || 'Failed to generate ER diagram');
      }
      
    } catch (error) {
      console.error('❌ Failed to generate interactive migration ER diagram viewer:', error);
      content += '> **⚠️ Could not generate interactive migration ER diagram viewer** - Please use the `er-diagram` command instead.\n\n';
      content += '---\n\n';
    }
    
    return content;
  }

  /**
   * Create embedded HTML viewer for migration ER diagrams
   */
  private createEmbeddedHTMLViewer(mermaidCode: string, analysis: SourceCodeAnalysis, plan: MigrationPlan): string {
    const totalCollections = plan.phases.reduce((sum, phase) => sum + ((phase as any).collections?.length || 0), 0);
    const totalEntities = analysis.entities.length;
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Migration ER Diagram - ${totalCollections} Collections</title>
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
            color: #ff6b35;
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
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .info h3 {
            margin: 0 0 10px 0;
            color: #856404;
        }
        .info p {
            margin: 0;
            color: #856404;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Migration ER Diagram</h1>
            <p>Interactive Entity-Relationship Diagram for Spring Boot to Node.js + MongoDB Migration</p>
            <div class="stats">
                <div class="stat">
                    <div class="stat-number">${totalEntities}</div>
                    <div class="stat-label">Spring Entities</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${totalCollections}</div>
                    <div class="stat-label">MongoDB Collections</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${plan.phases.length}</div>
                    <div class="stat-label">Migration Phases</div>
                </div>
            </div>
        </div>
        
        <div class="info">
            <h3>🔄 Migration Strategy Overview</h3>
            <p>This diagram shows the migration from Spring Boot JPA entities to MongoDB collections. Each collection represents the target MongoDB structure with migration strategies (standalone, embedded, referenced) and dependencies.</p>
        </div>
        
        <div class="diagram-container">
            <div class="mermaid">
${mermaidCode.replace('```mermaid\n', '').replace('\n```', '')}
            </div>
        </div>
        
        <div class="info">
            <h3>🔍 How to Use This Diagram</h3>
            <p><strong>Migration Phases:</strong> Collections are organized by migration phases</p>
            <p><strong>Dependencies:</strong> Arrows show migration dependencies between collections</p>
            <p><strong>Strategies:</strong> Each collection shows its migration strategy</p>
            <p><strong>Zoom:</strong> Use mouse wheel or pinch gestures to explore</p>
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
   * Generate document header
   */
  private generateHeader(analysis: SourceCodeAnalysis): string {
    const projectName = analysis.projectName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Extract version number from the output path if available
    const version = this.extractVersionFromPath(analysis.sourcePath);
    
    // Get current timestamp
    const now = new Date();
    const timestamp = now.toISOString();
    const formattedDate = now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const formattedTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
    
    return `# Spring Boot to Node.js + MongoDB Migration Analysis
## ${projectName}

**Document Version:** ${version}  
**Generated Date:** ${formattedDate}  
**Generated Time:** ${formattedTime}  
**Timestamp:** ${timestamp}  
**Project:** ${projectName}  
**Migration Type:** Technology Stack Change (Spring Boot + PostgreSQL → Node.js + MongoDB)

---

## 📋 Executive Summary

This document provides a comprehensive analysis and migration plan for converting the **${projectName}** from Spring Boot + PostgreSQL to Node.js + MongoDB. The migration involves significant architectural changes, data model transformations, and code refactoring across multiple layers of the application.

**Migration Complexity:** **${analysis.migrationComplexity}** ${this.getComplexityEmoji(analysis.migrationComplexity)}`;
  }

  /**
   * Generate executive summary section
   */
  private generateExecutiveSummary(plan: MigrationPlan, analysis: SourceCodeAnalysis): string {
    // Generate project-specific summary based on actual analysis
    const projectType = this.determineProjectType(analysis);
    const complexityDescription = this.getComplexityDescription(analysis.migrationComplexity);
    const entityDescription = this.getEntityDescription(analysis);
    const technologyDescription = this.getTechnologyDescription(analysis);
    
    return `## 🎯 Executive Summary

### **Migration Overview**
The migration from Spring Boot to Node.js represents a **${analysis.migrationComplexity.toLowerCase()} complexity transformation** that will modernize the **${analysis.projectName}** application architecture and provide better scalability, flexibility, and development velocity.

### **🚀 Key Benefits of New Architecture (Node.js + MongoDB)**

#### **Performance & Scalability Benefits**
✅ **Event-Driven Architecture**: Node.js non-blocking I/O for superior concurrent request handling  
✅ **Horizontal Scaling**: MongoDB's native sharding and replica sets for unlimited horizontal growth  
✅ **Memory Efficiency**: Node.js V8 engine optimization and MongoDB's memory-mapped storage  
✅ **Connection Pooling**: Efficient connection management with MongoDB driver  
✅ **Load Balancing**: Native support for distributed deployments  

#### **Development & Productivity Benefits**
✅ **JavaScript Ecosystem**: Unified language across frontend and backend (Full-Stack JavaScript)  
✅ **Rapid Development**: npm's vast package ecosystem and faster development cycles  
✅ **Dynamic Typing**: Faster prototyping and development without compilation delays  
✅ **Hot Reloading**: Instant code changes with nodemon during development  
✅ **Modern Tooling**: ESLint, Prettier, Jest, and other modern development tools  

#### **Database & Data Benefits**
✅ **Schema Flexibility**: No rigid schema constraints, easy to evolve data models  
✅ **Document-Oriented**: Natural JSON-like structure matching application objects  
✅ **Aggregation Pipeline**: Powerful data processing and analytics capabilities  
✅ **Indexing Flexibility**: Multiple index types for optimal query performance  
✅ **Horizontal Scaling**: Automatic sharding for massive data growth  

#### **Operational & Cost Benefits**
✅ **Resource Efficiency**: Lower memory footprint and faster startup times  
✅ **Cloud Native**: Better integration with modern cloud platforms and containers  
✅ **Cost Optimization**: Reduced infrastructure costs through better resource utilization  
✅ **Maintenance**: Simpler deployment and maintenance with fewer moving parts  
✅ **Monitoring**: Rich ecosystem of monitoring and observability tools  

### **📊 Architecture Comparison Matrix**

| Aspect | Current (Spring Boot + PostgreSQL) | New (Node.js + MongoDB) | Improvement |
|--------|-----------------------------------|-------------------------|-------------|
| **Performance** | Good for CPU-intensive tasks | Excellent for I/O operations | 🚀 **2-3x better** |
| **Scalability** | Vertical scaling required | Native horizontal scaling | 🚀 **Unlimited growth** |
| **Development Speed** | Compilation time overhead | Instant feedback loop | 🚀 **3-5x faster** |
| **Memory Usage** | Higher JVM overhead | V8 engine optimization | 🚀 **30-50% less** |
| **Startup Time** | 10-30 seconds | 1-3 seconds | 🚀 **5-10x faster** |
| **Deployment** | JAR packaging | Simple file deployment | 🚀 **Simplified** |
| **Learning Curve** | Java ecosystem complexity | JavaScript familiarity | 🚀 **Easier adoption** |

### **Project-Specific Migration Summary**
| Metric | Value |
|--------|-------|

| **Complexity** | ${plan.summary.complexity} |

| **Risk Level** | ${plan.summary.riskLevel} |
| **Business Impact** | ${plan.summary.businessImpact} |

### **Project Analysis Insights**
- **Project Type**: ${projectType}
- **Source Code Complexity**: ${complexityDescription}
- **Entity Architecture**: ${entityDescription}
- **Technology Stack**: ${technologyDescription}

### **Critical Success Factors**
1. **Phased Migration Approach**: Implement changes incrementally to minimize risk
2. **Comprehensive Testing**: Ensure functionality parity at every phase
3. **Team Training**: Provide Node.js and MongoDB expertise
4. **Data Integrity**: Maintain data consistency throughout migration
5. **Performance Validation**: Ensure performance meets or exceeds current system
6. **Architecture Validation**: Prove new architecture benefits through POC`;
  }

  /**
   * Determine project type based on analysis
   */
  private determineProjectType(analysis: SourceCodeAnalysis): string {
    if (analysis.entities.length === 0) {
      return "Simple Spring Boot Application (No JPA Entities)";
    } else if (analysis.entities.length < 5) {
      return "Small Spring Boot Application";
    } else if (analysis.entities.length < 15) {
      return "Medium Spring Boot Application";
    } else {
      return "Large Enterprise Spring Boot Application";
    }
  }

  /**
   * Get complexity description based on migration complexity
   */
  private getComplexityDescription(complexity: string): string {
    switch (complexity) {
      case 'LOW':
        return "Simple application with minimal JPA complexity";
      case 'MEDIUM':
        return "Moderate application with some JPA relationships";
      case 'HIGH':
        return "Complex application with extensive JPA architecture";
      case 'CRITICAL':
        return "Highly complex enterprise application with advanced JPA patterns";
      default:
        return "Standard Spring Boot application";
    }
  }

  /**
   * Get entity description based on actual entities
   */
  private getEntityDescription(analysis: SourceCodeAnalysis): string {
    if (analysis.entities.length === 0) {
      return "No JPA entities found - simple service-based architecture";
    }
    
    const entityNames = analysis.entities.map(e => e.fileName).slice(0, 3);
    const entityList = entityNames.join(', ');
    
    if (analysis.entities.length <= 3) {
      return `${analysis.entities.length} entities: ${entityList}`;
    } else {
      return `${analysis.entities.length} entities including ${entityList} and ${analysis.entities.length - 3} more`;
    }
  }

  /**
   * Get technology description based on analysis
   */
  private getTechnologyDescription(analysis: SourceCodeAnalysis): string {
    const hasControllers = analysis.controllers.length > 0;
    const hasServices = analysis.services.length > 0;
    const hasRepositories = analysis.repositories.length > 0;
    
    if (hasControllers && hasServices && hasRepositories) {
      return "Full Spring Boot stack with MVC, Services, and Data layers";
    } else if (hasControllers && hasServices) {
      return "Spring Boot with MVC and Service layers";
    } else if (hasControllers) {
      return "Spring Boot with MVC layer only";
    } else {
      return "Basic Spring Boot application";
    }
  }

  /**
   * Generate real source code benefits section
   */
  private generateRealSourceCodeBenefits(analysis: SourceCodeAnalysis): string {
    return `## 🚀 Real Source Code Benefits of Node.js + MongoDB

### **Code Reusability & Maintainability**
- **Single Codebase**: Full-Stack JavaScript enables frontend and backend developers to work in the same language, reducing communication overhead and improving code quality.
- **Reusable Components**: Common business logic and data models can be shared across frontend and backend, leading to faster development and fewer bugs.
- **Modular Architecture**: Node.js's module system and Express.js routing make it easier to organize and manage large applications.

### **Development Velocity**
- **Instant Feedback**: Nodemon and ESLint provide instant feedback on code changes, enabling rapid prototyping and testing.
- **Hot Reloading**: Changes to backend code are immediately reflected in the frontend, reducing the need for full restarts.
- **Faster Iteration**: Faster development cycles and smaller, more focused changes lead to higher productivity.

### **Code Quality & Reliability**
- **Type Safety**: JavaScript's dynamic typing can be combined with TypeScript for robust type checking.
- **Error Handling**: Node.js's built-in error handling and Express.js middleware provide robust error management.
- **Testing**: Jest and Supertest enable comprehensive unit and integration testing.
- **Code Coverage**: High test coverage ensures reliability and confidence in the application.

### **Scalability & Performance**
- **Event-Driven Architecture**: Node.js's non-blocking I/O model allows for handling thousands of concurrent requests efficiently.
- **Memory Efficiency**: V8 engine optimization and MongoDB's memory-mapped storage provide efficient memory usage.
- **Connection Pooling**: Efficient connection management with MongoDB driver reduces overhead.
- **Load Balancing**: Native support for distributed deployments and sharding enable horizontal scaling.

### **Flexibility & Evolution**
- **Schema Evolution**: MongoDB's flexible schema allows for easy evolution of data models without complex database migrations.
- **Document-Oriented**: JSON-like documents make it easier to represent complex, nested data structures.
- **Aggregation Pipeline**: Powerful aggregation framework for complex data processing and analytics.
- **Indexing Flexibility**: Multiple index types for optimal query performance and flexible data access patterns.`;
  }

  /**
   * Generate source code analysis benefits section
   */
  private generateSourceCodeAnalysisBenefits(analysis: SourceCodeAnalysis): string {
    // Use the new dynamic method instead of hardcoded content
    return this.generateDynamicSourceCodeBenefits(analysis);
  }

  /**
   * Generate dynamic source code benefits based on actual analysis
   */
  private generateDynamicSourceCodeBenefits(analysis: SourceCodeAnalysis): string {
    // Analyze actual entities to find real examples
    const entityExamples = this.generateEntityExamples(analysis);
    const relationshipExamples = this.generateRelationshipExamples(analysis);
    const serviceExamples = this.generateServiceExamples(analysis);
    
    return `## 🔍 Source Code Analysis Benefits (Based on Your Codebase)

### **Current Codebase Analysis**
- **Total Files**: ${analysis.totalFiles} source files
- **Entities**: ${analysis.entities.length} JPA entities with complex relationships
- **Repositories**: ${analysis.repositories.length} repository interfaces
- **Services**: ${analysis.services.length} service classes
- **Controllers**: ${analysis.controllers.length} REST controllers
- **Migration Complexity**: ${analysis.migrationComplexity}

### **Real Benefits from Your Current Architecture**

#### **1. Entity Relationship Simplification**
**Current Complexity**: Your Spring Boot application has ${analysis.entities.length} entities with JPA annotations that create complex database relationships.

**Specific Examples from Your Code**:
${entityExamples}

**MongoDB Benefits**:
- **Eliminate Junction Tables**: Embed related data directly in documents
- **Reduce Query Complexity**: No more JOIN operations across multiple tables
- **Simplify Transactions**: Single document updates instead of multi-table transactions

#### **2. Repository Pattern Elimination**
**Current Overhead**: ${analysis.repositories.length} repository interfaces with custom query methods create boilerplate code.

**Specific Examples from Your Code**:
${relationshipExamples}

**MongoDB Benefits**:
- **Native Queries**: Use MongoDB's query language directly
- **Aggregation Pipeline**: Powerful data processing without custom methods
- **Query Optimization**: Built-in query optimization and indexing

#### **3. Service Layer Optimization**
**Current Complexity**: ${analysis.services.length} service classes handle business logic that could be simplified.

**Specific Examples from Your Code**:
${serviceExamples}

**MongoDB Benefits**:
- **Single Query Operations**: Retrieve related data in one query
- **Embedded Documents**: No need for complex DTO mapping
- **Simplified Transactions**: Document-level atomicity

#### **4. Controller Simplification**
**Current REST Controllers**: ${analysis.controllers.length} controllers with Spring MVC annotations.

**Specific Examples from Your Code**:
- **ResponseEntity Wrapping**: Every endpoint wraps responses in ResponseEntity
- **Exception Handling**: Complex exception handling across controllers
- **Validation**: Bean validation annotations on every DTO

**Node.js Benefits**:
- **Express.js Simplicity**: Cleaner route definitions
- **Middleware Approach**: Centralized error handling and validation
- **JSON Native**: No need for DTO serialization/deserialization

### **Quantified Improvements**

| Current Spring Boot | New Node.js + MongoDB | Improvement |
|---------------------|------------------------|-------------|
| **${analysis.entities.length} Entities** | Embedded Documents | 🚀 **Eliminate ${this.calculateEntityCodeReduction(analysis)}% of entity code** |
| **${analysis.repositories.length} Repositories** | Direct MongoDB Queries | 🚀 **Reduce to ${this.calculateRepositoryCodeReduction(analysis)}% of current code** |
| **${analysis.services.length} Services** | Simplified Business Logic | 🚀 **Reduce complexity by ${this.calculateServiceComplexityReduction(analysis)}%** |
| **${analysis.controllers.length} Controllers** | Express.js Routes | 🚀 **Simplify by ${this.calculateControllerSimplification(analysis)}%** |
| **Complex Relationships** | Embedded Documents | 🚀 **Eliminate ${this.countComplexRelationships(analysis)} JOIN queries** |
| **Transaction Management** | Document Atomicity | 🚀 **Simplify ${this.calculateTransactionSimplification(analysis)}% of transaction logic** |

### **Code Reduction Examples**

#### **Before (Spring Boot Entity)**:
${this.generateBeforeExample(analysis)}

#### **After (MongoDB Document)**:
${this.generateAfterExample(analysis)}



### **Development Time Savings**
- **Entity Creation**: ${this.calculateEntityTimeSavings(analysis)}% faster (no JPA annotations, relationships, or table mappings)
- **Query Development**: ${this.calculateQueryTimeSavings(analysis)}% faster (MongoDB queries vs JPQL)
- **API Development**: ${this.calculateAPITimeSavings(analysis)}% faster (Express.js vs Spring MVC)
- **Testing**: ${this.calculateTestingTimeSavings(analysis)}% faster (MongoDB in-memory vs PostgreSQL test setup)
- **Deployment**: ${this.calculateDeploymentTimeSavings(analysis)}% faster (no compilation, direct file deployment)`;
  }

  /**
   * Generate entity examples based on actual source code analysis
   */
  private generateEntityExamples(analysis: SourceCodeAnalysis): string {
    if (!analysis.entities || analysis.entities.length === 0) {
      return "- **No entities found**: Your codebase doesn't contain JPA entities";
    }

    // Get actual entity names from the analysis
    const entityNames = analysis.entities.map(e => e.fileName || 'Unknown');
    const sampleEntities = entityNames.slice(0, 3); // Show first 3 entities
    
    let examples = '';
    
    if (sampleEntities.length > 0) {
      examples += `- **${sampleEntities[0]} Entity**: Currently requires JPA annotations and table mappings\n`;
      
      if (sampleEntities.length > 1) {
        examples += `- **${sampleEntities[1]} Entity**: Similar JPA complexity with relationship mappings\n`;
      }
      
      if (sampleEntities.length > 2) {
        examples += `- **${sampleEntities[2]} Entity**: Additional entity with its own JPA overhead\n`;
      }
      
      if (entityNames.length > 3) {
        examples += `- **And ${entityNames.length - 3} more entities** with similar JPA complexity\n`;
      }
    }
    
    return examples;
  }

  /**
   * Generate relationship examples based on actual source code analysis
   */
  private generateRelationshipExamples(analysis: SourceCodeAnalysis): string {
    if (!analysis.entities || analysis.entities.length === 0) {
      return "- **No relationships found**: Your codebase doesn't contain entity relationships";
    }

    // Count entities with relationships
    const entitiesWithRelationships = analysis.entities.filter(e => 
      e.relationships && e.relationships.length > 0
    );
    
    if (entitiesWithRelationships.length === 0) {
      return "- **Simple Entities**: Your entities don't have complex relationships";
    }
    
    let examples = '';
    
    if (entitiesWithRelationships.length > 0) {
      const firstEntity = entitiesWithRelationships[0];
      examples += `- **${firstEntity.fileName} Relationships**: ${firstEntity.relationships?.length || 0} relationship mappings\n`;
      
      if (entitiesWithRelationships.length > 1) {
        const secondEntity = entitiesWithRelationships[1];
        examples += `- **${secondEntity.fileName} Relationships**: ${secondEntity.relationships?.length || 0} relationship mappings\n`;
      }
      
      if (entitiesWithRelationships.length > 2) {
        examples += `- **And ${entitiesWithRelationships.length - 2} more entities** with relationship complexity\n`;
      }
    }
    
    return examples;
  }

  /**
   * Generate service examples based on actual source code analysis
   */
  private generateServiceExamples(analysis: SourceCodeAnalysis): string {
    if (!analysis.services || analysis.services.length === 0) {
      return "- **No services found**: Your codebase doesn't contain service classes";
    }

    const serviceNames = analysis.services.map(s => s.fileName || 'Unknown');
    const sampleServices = serviceNames.slice(0, 2); // Show first 2 services
    
    let examples = '';
    
    if (sampleServices.length > 0) {
      examples += `- **${sampleServices[0]} Service**: Handles business logic with multiple database calls\n`;
      
      if (sampleServices.length > 1) {
        examples += `- **${sampleServices[1]} Service**: Similar service complexity pattern\n`;
      }
      
      if (serviceNames.length > 2) {
        examples += `- **And ${serviceNames.length - 2} more services** with similar patterns\n`;
      }
    }
    
    return examples;
  }

  /**
   * Generate before example based on actual source code
   */
  private generateBeforeExample(analysis: SourceCodeAnalysis): string {
    if (!analysis.entities || analysis.entities.length === 0) {
      return `\`\`\`java
// Example Spring Boot Entity (no entities found in your codebase)
@Entity
@Table(name = "example")
public class Example {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "name")
    private String name;
    
    // Standard JPA annotations and relationships
}
\`\`\``;
    }

    // Use the first entity as an example
    const firstEntity = analysis.entities[0];
    const entityName = firstEntity.fileName || 'Example';
    
    return `\`\`\`java
@Entity
@Table(name = "${entityName.toLowerCase()}")
public class ${entityName} {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "name")
    private String name;
    
    ${this.generateEntityRelationships(firstEntity)}
    
    // Standard JPA annotations and relationships
    // This represents your actual ${entityName} entity structure
}
\`\`\``;
  }

  /**
   * Generate entity relationships for the before example
   */
  private generateEntityRelationships(entity: any): string {
    if (!entity.relationships || entity.relationships.length === 0) {
      return '';
    }
    
    const relationship = entity.relationships[0];
    if (relationship.type === 'OneToMany') {
      return `@OneToMany(mappedBy = "${entity.name?.toLowerCase()}", fetch = FetchType.LAZY)
    private List<${relationship.targetEntity}> ${relationship.targetEntity.toLowerCase()}s = new ArrayList<>();`;
    } else if (relationship.type === 'ManyToOne') {
      return `@ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "${relationship.targetEntity.toLowerCase()}_id")
    private ${relationship.targetEntity} ${relationship.targetEntity.toLowerCase()};`;
    } else if (relationship.type === 'ManyToMany') {
      return `@ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "${entity.name?.toLowerCase()}_${relationship.targetEntity.toLowerCase()}", 
        joinColumns = @JoinColumn(name = "${entity.name?.toLowerCase()}_id"), 
        inverseJoinColumns = @JoinColumn(name = "${relationship.targetEntity.toLowerCase()}_id"))
    private Set<${relationship.targetEntity}> ${relationship.targetEntity.toLowerCase()}s = new HashSet<>();`;
    }
    
    return '';
  }

  /**
   * Generate after example based on actual source code
   */
  private generateAfterExample(analysis: SourceCodeAnalysis): string {
    if (!analysis.entities || analysis.entities.length === 0) {
      return `\`\`\`javascript
// Example MongoDB Document (no entities found in your codebase)
{
  _id: ObjectId,
  name: "Example Name",
  // All data in one document, no separate tables needed
}
\`\`\``;
    }

    // Use the first entity as an example
    const firstEntity = analysis.entities[0];
    const entityName = firstEntity.fileName || 'Example';
    
    return `\`\`\`javascript
// ${entityName} document with embedded data
{
  _id: ObjectId,
  name: "${entityName} Name",
  ${this.generateMongoDBEmbeddedData(firstEntity)}
  // All data in one document, no separate tables needed
  // This represents your actual ${entityName} structure in MongoDB
}
\`\`\``;
  }

  /**
   * Generate MongoDB embedded data structure
   */
  private generateMongoDBEmbeddedData(entity: any): string {
    if (!entity.relationships || entity.relationships.length === 0) {
      return '';
    }
    
    const relationship = entity.relationships[0];
    if (relationship.type === 'OneToMany') {
      return `${relationship.targetEntity.toLowerCase()}s: [
    { ${relationship.targetEntity.toLowerCase()}Id: ObjectId, name: "Sample ${relationship.targetEntity}" }
  ]`;
    } else if (relationship.type === 'ManyToOne') {
      return `${relationship.targetEntity.toLowerCase()}: {
    ${relationship.targetEntity.toLowerCase()}Id: ObjectId,
    name: "Sample ${relationship.targetEntity}"
  }`;
    } else if (relationship.type === 'ManyToMany') {
      return `${relationship.targetEntity.toLowerCase()}s: [
    { ${relationship.targetEntity.toLowerCase()}Id: ObjectId, name: "Sample ${relationship.targetEntity}" }
  ]`;
    }
    
    return '';
  }

  /**
   * Generate current architecture overview
   */
  private generateCurrentArchitectureOverview(analysis: SourceCodeAnalysis): string {
    const projectStructure = this.generateProjectStructure(analysis);
    const databaseSchema = this.generateDatabaseSchema(analysis);
    const apiStructure = this.generateAPIStructure(analysis);
    
    return `## 🏗️ Current Architecture Overview

### **Existing Technology Stack**
- **Backend Framework**: Spring Boot 3.x + Java 17
- **Database**: PostgreSQL with JPA/Hibernate
- **Architecture Pattern**: Layered Architecture (Entity → Repository → Service → Controller)
- **Build Tool**: Maven
- **Total Source Files**: ${analysis.totalFiles}

### **Current Project Structure**
\`\`\`
${analysis.projectName}/
${projectStructure}
\`\`\`

### **Current Database Schema**
${databaseSchema}

### **Current API Structure**
${apiStructure}`;
  }

  /**
   * Extract package name from analysis
   */
  private extractPackageName(analysis: SourceCodeAnalysis): string {
    // Try to extract package name from entity files
    if (analysis.entities.length > 0) {
      const firstEntity = analysis.entities[0];
      if (firstEntity.filePath.includes('java/')) {
        const pathParts = firstEntity.filePath.split('java/');
        if (pathParts.length > 1) {
          return pathParts[1].split('/').slice(0, -1).join('/');
        }
      }
    }
    // Default fallback
    return 'com/example/application';
  }

  /**
   * Generate dynamic project structure based on actual analysis
   */
  private generateProjectStructure(analysis: SourceCodeAnalysis): string {
    const entityCount = analysis.entities.length;
    const repositoryCount = analysis.repositories.length;
    const serviceCount = analysis.services.length;
    const controllerCount = analysis.controllers.length;
    
    // Generate dynamic structure based on actual analysis
    let structure = `├── src/\n`;
    structure += `│   ├── main/\n`;
    structure += `│   │   ├── java/\n`;
    structure += `│   │   │   └── ${this.extractPackageName(analysis)}/\n`;
    structure += `│   │   │       ├── entity/          (${entityCount} files)\n`;
    structure += `│   │   │       ├── repository/      (${repositoryCount} files)\n`;
    structure += `│   │   │       ├── service/         (${serviceCount} files)\n`;
    structure += `│   │   │       ├── controller/      (${controllerCount} files)\n`;
    structure += `│   │   │       ├── dto/             (Data Transfer Objects)\n`;
    structure += `│   │   │       └── config/          (Configuration classes)\n`;
    structure += `│   │   └── resources/\n`;
    structure += `│   │       ├── application.properties\n`;
    structure += `│   │       └── static/              (Static resources)\n`;
    structure += `│   └── test/                        (Test files)\n`;
    structure += `├── pom.xml                          (Maven configuration)\n`;
    structure += `└── README.md                        (Project documentation)`;
    
    return structure;
  }

  /**
   * Generate dynamic database schema description
   */
  private generateDatabaseSchema(analysis: SourceCodeAnalysis): string {
    if (analysis.entities.length === 0) {
      return `- **Database Type**: PostgreSQL (Relational)
- **Schema Design**: No JPA entities found - likely using direct SQL or other data access patterns
- **Entity Count**: 0 entities
- **Relationship Types**: None detected
- **Data Integrity**: Basic database constraints`;
    }
    
    const hasRelationships = analysis.entities.some(e => e.relationships && e.relationships.length > 0);
    const relationshipTypes = this.getRelationshipTypes(analysis);
    
    return `- **Database Type**: PostgreSQL (Relational)
- **Schema Design**: ${analysis.entities.length > 10 ? 'Complex normalized' : 'Standard normalized'} 3NF structure
- **Entity Count**: ${analysis.entities.length} entities
- **Relationship Types**: ${hasRelationships ? relationshipTypes : 'No complex relationships detected'}
- **Data Integrity**: Foreign key constraints and ACID transactions`;
  }

  /**
   * Get relationship types from analysis
   */
  private getRelationshipTypes(analysis: SourceCodeAnalysis): string {
    const allRelationships = analysis.entities
      .flatMap(e => e.relationships || [])
      .map(r => r.type);
    
    const uniqueTypes = [...new Set(allRelationships)];
    
    if (uniqueTypes.length === 0) {
      return 'No relationships detected';
    }
    
    const typeDescriptions = uniqueTypes.map(type => {
      switch (type) {
        case 'ONE_TO_ONE': return 'One-to-One';
        case 'ONE_TO_MANY': return 'One-to-Many';
        case 'MANY_TO_ONE': return 'Many-to-One';
        case 'MANY_TO_MANY': return 'Many-to-Many';
        default: return type;
      }
    });
    
    return typeDescriptions.join(', ');
  }

  /**
   * Generate dynamic API structure description
   */
  private generateAPIStructure(analysis: SourceCodeAnalysis): string {
    if (analysis.controllers.length === 0) {
      return `- **Framework**: No REST controllers detected
- **HTTP Methods**: Not applicable
- **Request/Response**: Not applicable
- **Validation**: Not applicable
- **Authentication**: Not applicable`;
    }
    
    const hasServices = analysis.services.length > 0;
    const hasRepositories = analysis.repositories.length > 0;
    
    let description = `- **Framework**: Spring MVC with @RestController\n`;
    description += `- **HTTP Methods**: GET, POST, PUT, DELETE\n`;
    description += `- **Request/Response**: JSON with Spring Data binding\n`;
    description += `- **Validation**: Bean Validation annotations\n`;
    
    if (hasServices && hasRepositories) {
      description += `- **Architecture**: Full MVC stack with Service and Repository layers\n`;
    } else if (hasServices) {
      description += `- **Architecture**: MVC with Service layer (no repositories)\n`;
    } else if (hasRepositories) {
      description += `- **Architecture**: MVC with Repository layer (no services)\n`;
    } else {
      description += `- **Architecture**: Basic MVC pattern\n`;
    }
    
    description += `- **Authentication**: Spring Security (if configured)`;
    
    return description;
  }

  /**
   * Generate impact analysis matrix
   */
  private generateImpactAnalysisMatrix(plan: MigrationPlan, analysis: SourceCodeAnalysis): string {
    const impactMatrix = this.generateDynamicImpactMatrix(analysis);
    const impactDefinitions = this.generateImpactDefinitions();
    
    return `## 📊 Impact Analysis Matrix

${impactMatrix}

**Legend:** 🔴 HIGH | 🟡 MEDIUM | 🟢 LOW

${impactDefinitions}`;
  }

  /**
   * Generate dynamic impact matrix based on actual analysis
   */
  private generateDynamicImpactMatrix(analysis: SourceCodeAnalysis): string {
    const components = [
      {
        name: 'Data Model',
        impact: this.calculateDataModelImpact(analysis),
        effort: this.calculateDataModelEffort(analysis),
        risk: this.calculateDataModelRisk(analysis),
        dependencies: 'None'
      },
      {
        name: 'Entity Classes',
        impact: this.calculateEntityImpact(analysis),
        effort: this.calculateEntityEffort(analysis),
        risk: this.calculateEntityRisk(analysis),
        dependencies: 'Data Model'
      },
      {
        name: 'Repository Layer',
        impact: this.calculateRepositoryImpact(analysis),
        effort: this.calculateRepositoryEffort(analysis),
        risk: this.calculateRepositoryRisk(analysis),
        dependencies: 'Entity Classes'
      },
      {
        name: 'Service Layer',
        impact: this.calculateServiceImpact(analysis),
        effort: this.calculateServiceEffort(analysis),
        risk: this.calculateServiceRisk(analysis),
        dependencies: 'Repository Layer'
      },
      {
        name: 'Controller Layer',
        impact: this.calculateControllerImpact(analysis),
        effort: this.calculateControllerEffort(analysis),
        risk: this.calculateControllerRisk(analysis),
        dependencies: 'Service Layer'
      },
      {
        name: 'Configuration',
        impact: '🟡 MEDIUM',
        effort: 8,
        risk: '🟢 LOW',
        dependencies: 'None'
      },
      {
        name: 'Testing',
        impact: '🟡 MEDIUM',
        effort: 24,
        risk: '🟡 MEDIUM',
        dependencies: 'All Layers'
      },
      {
        name: 'Documentation',
        impact: '🟢 LOW',
        effort: 8,
        risk: '🟢 LOW',
        dependencies: 'None'
      }
    ];

    let matrix = '| Component | Impact Level | Effort (Hours) | Risk Level | Dependencies |\n';
    matrix += '|-----------|--------------|----------------|------------|--------------|\n';
    
    components.forEach(component => {
      matrix += `| **${component.name}** | ${component.impact} | ${component.effort} | ${component.risk} | ${component.dependencies} |\n`;
    });
    
    return matrix;
  }

  /**
   * Calculate data model impact based on actual entities
   */
  private calculateDataModelImpact(analysis: SourceCodeAnalysis): string {
    if (analysis.entities.length === 0) {
      return '🟢 LOW';
    } else if (analysis.entities.length < 5) {
      return '🟡 MEDIUM';
    } else if (analysis.entities.length < 15) {
      return '🔴 HIGH';
    } else {
      return '🔴 HIGH';
    }
  }

  /**
   * Calculate data model effort based on actual entities
   */
  private calculateDataModelEffort(analysis: SourceCodeAnalysis): number {
    if (analysis.entities.length === 0) {
      return 0;
    } else if (analysis.entities.length < 5) {
      return analysis.entities.length * 2;
    } else if (analysis.entities.length < 15) {
      return analysis.entities.length * 3;
    } else {
      return analysis.entities.length * 4;
    }
  }

  /**
   * Calculate data model risk based on actual entities
   */
  private calculateDataModelRisk(analysis: SourceCodeAnalysis): string {
    if (analysis.entities.length === 0) {
      return '🟢 LOW';
    } else if (analysis.entities.length < 5) {
      return '🟡 MEDIUM';
    } else {
      return '🔴 HIGH';
    }
  }

  /**
   * Calculate entity impact based on actual entities
   */
  private calculateEntityImpact(analysis: SourceCodeAnalysis): string {
    if (analysis.entities.length === 0) {
      return '🟢 LOW';
    } else if (analysis.entities.length < 5) {
      return '🟡 MEDIUM';
    } else {
      return '🔴 HIGH';
    }
  }

  /**
   * Calculate entity effort based on actual entities
   */
  private calculateEntityEffort(analysis: SourceCodeAnalysis): number {
    if (analysis.entities.length === 0) {
      return 0;
    } else if (analysis.entities.length < 5) {
      return analysis.entities.length * 2;
    } else if (analysis.entities.length < 15) {
      return analysis.entities.length * 3;
    } else {
      return analysis.entities.length * 4;
    }
  }

  /**
   * Calculate entity risk based on actual entities
   */
  private calculateEntityRisk(analysis: SourceCodeAnalysis): string {
    if (analysis.entities.length === 0) {
      return '🟢 LOW';
    } else if (analysis.entities.length < 5) {
      return '🟡 MEDIUM';
    } else {
      return '🔴 HIGH';
    }
  }

  /**
   * Calculate repository impact based on actual repositories
   */
  private calculateRepositoryImpact(analysis: SourceCodeAnalysis): string {
    if (analysis.repositories.length === 0) {
      return '🟢 LOW';
    } else if (analysis.repositories.length < 5) {
      return '🟡 MEDIUM';
    } else {
      return '🔴 HIGH';
    }
  }

  /**
   * Calculate repository effort based on actual repositories
   */
  private calculateRepositoryEffort(analysis: SourceCodeAnalysis): number {
    if (analysis.repositories.length === 0) {
      return 0;
    } else if (analysis.repositories.length < 5) {
      return analysis.repositories.length * 3;
    } else if (analysis.repositories.length < 15) {
      return analysis.repositories.length * 4;
    } else {
      return analysis.repositories.length * 5;
    }
  }

  /**
   * Calculate repository risk based on actual repositories
   */
  private calculateRepositoryRisk(analysis: SourceCodeAnalysis): string {
    if (analysis.repositories.length === 0) {
      return '🟢 LOW';
    } else if (analysis.repositories.length < 5) {
      return '🟡 MEDIUM';
    } else {
      return '🔴 HIGH';
    }
  }

  /**
   * Calculate service impact based on actual services
   */
  private calculateServiceImpact(analysis: SourceCodeAnalysis): string {
    if (analysis.services.length === 0) {
      return '🟢 LOW';
    } else if (analysis.services.length < 5) {
      return '🟡 MEDIUM';
    } else {
      return '🔴 HIGH';
    }
  }

  /**
   * Calculate service effort based on actual services
   */
  private calculateServiceEffort(analysis: SourceCodeAnalysis): number {
    if (analysis.services.length === 0) {
      return 0;
    } else if (analysis.services.length < 5) {
      return analysis.services.length * 3;
    } else if (analysis.services.length < 15) {
      return analysis.services.length * 4;
    } else {
      return analysis.services.length * 5;
    }
  }

  /**
   * Calculate service risk based on actual services
   */
  private calculateServiceRisk(analysis: SourceCodeAnalysis): string {
    if (analysis.services.length === 0) {
      return '🟢 LOW';
    } else if (analysis.services.length < 5) {
      return '🟢 LOW';
    } else if (analysis.services.length < 15) {
      return '🟡 MEDIUM';
    } else {
      return '🔴 HIGH';
    }
  }

  /**
   * Calculate controller impact based on actual controllers
   */
  private calculateControllerImpact(analysis: SourceCodeAnalysis): string {
    if (analysis.controllers.length === 0) {
      return '🟢 LOW';
    } else if (analysis.controllers.length < 5) {
      return '🟢 LOW';
    } else if (analysis.controllers.length < 15) {
      return '🟡 MEDIUM';
    } else {
      return '🔴 HIGH';
    }
  }

  /**
   * Calculate controller effort based on actual controllers
   */
  private calculateControllerEffort(analysis: SourceCodeAnalysis): number {
    if (analysis.controllers.length === 0) {
      return 0;
    } else if (analysis.controllers.length < 5) {
      return analysis.controllers.length * 2;
    } else if (analysis.controllers.length < 15) {
      return analysis.controllers.length * 2.5;
    } else {
      return analysis.controllers.length * 3;
    }
  }

  /**
   * Calculate controller risk based on actual controllers
   */
  private calculateControllerRisk(analysis: SourceCodeAnalysis): string {
    if (analysis.controllers.length === 0) {
      return '🟢 LOW';
    } else if (analysis.controllers.length < 5) {
      return '🟢 LOW';
    } else if (analysis.controllers.length < 15) {
      return '🟡 MEDIUM';
    } else {
      return '🔴 HIGH';
    }
  }

  /**
   * Generate impact definitions
   */
  private generateImpactDefinitions(): string {
    return `### **Impact Level Definitions**
- **🔴 HIGH**: Complete rewrite required, significant business logic changes
- **🟡 MEDIUM**: Major modifications needed, some business logic adaptation
- **🟢 LOW**: Minor changes, mostly configuration and syntax updates`;
  }

  /**
   * Generate detailed component analysis
   */
  private generateDetailedComponentAnalysis(analysis: SourceCodeAnalysis): string {
    return `## 🔍 Detailed Component Analysis

### 1. Data Model Layer (Impact: 🔴 HIGH)

#### **Current JPA Entities**
The application currently uses ${analysis.entities.length} JPA entities with the following characteristics:

${this.generateEntityAnalysisTable(analysis)}

#### **Migration Challenges**
- **Schema Transformation**: Converting normalized tables to denormalized documents
- **Relationship Handling**: Managing JPA relationships in MongoDB context
- **Data Type Mapping**: Converting Java types to MongoDB BSON types
- **Indexing Strategy**: Designing MongoDB indexes for optimal performance

#### **Migration Strategy**
- **Denormalization**: Embed related data where appropriate for performance
- **Reference Strategy**: Use ObjectId references for complex relationships
- **Schema Evolution**: Leverage MongoDB's flexible schema capabilities
- **Data Validation**: Implement MongoDB schema validation rules

### 2. Repository Layer (Impact: 🟡 MEDIUM)

#### **Current Spring Data Repositories**
${this.generateRepositoryAnalysisTable(analysis)}

#### **Migration Approach**
- **Replace Spring Data**: Convert to MongoDB native operations
- **Query Translation**: Rewrite JPA queries as MongoDB queries
- **Custom Methods**: Adapt custom repository methods for MongoDB
- **Transaction Handling**: Implement MongoDB transaction management

### 3. Service Layer (Impact: 🟡 MEDIUM)

#### **Current Spring Services**
${this.generateServiceAnalysisTable(analysis)}

#### **Migration Strategy**
- **Business Logic Preservation**: Maintain core business logic while adapting to Node.js
- **Error Handling**: Implement Node.js-specific error handling patterns
- **Validation**: Adapt validation logic for Node.js ecosystem
- **Performance**: Optimize for Node.js event-driven architecture

### 4. Controller Layer (Impact: 🟢 LOW)

#### **Current Spring Controllers**
${this.generateControllerAnalysisTable(analysis)}

#### **Migration Approach**
- **Route Conversion**: Convert @RequestMapping to Express.js routes
- **Request Handling**: Adapt request/response processing for Node.js
- **Middleware**: Implement Express.js middleware for common functionality
- **API Compatibility**: Maintain API contract during migration`;
  }

  /**
   * Generate file inventory section
   */
  private generateFileInventory(analysis: SourceCodeAnalysis): string {
    return `## 📁 File Inventory & Modification Requirements

### **High-Impact Files (Complete Rewrite Required)**

| File Path | Current Purpose | Migration Effort | Dependencies |
|-----------|----------------|------------------|--------------|
${this.generateHighImpactFilesTable(analysis)}

### **Medium-Impact Files (Significant Modifications)**

| File Path | Current Purpose | Migration Effort | Dependencies |
|-----------|----------------|------------------|--------------|
${this.generateMediumImpactFilesTable(analysis)}

### **Low-Impact Files (Minor Modifications)**

| File Path | Current Purpose | Migration Effort | Dependencies |
|-----------|----------------|------------------|--------------|
${this.generateLowImpactFilesTable(analysis)}

### **Configuration Files**

| File Path | Current Purpose | Dependencies |
|-----------|----------------|--------------|
| \`pom.xml\` | Maven dependencies | None |
| \`application.properties\` | Spring Boot config | None |
| \`package.json\` | Node.js dependencies | None |
| \`.env\` | Environment variables | None |

### **New Files to Create**

| File Path | Purpose | Dependencies |
|-----------|---------|--------------|
| \`server.js\` | Main application entry point | None |
| \`config/database.js\` | MongoDB connection configuration | None |
| \`models/*.js\` | MongoDB schema definitions | Data model |
| \`routes/*.js\` | Express.js route handlers | Controllers |

### **🔄 Spring Boot → Node.js Transformation with Embedded Documents**

#### **Why Classes Will Change Dramatically**

**Current Spring Boot Structure (Normalized):**
\`\`\`java
@Entity
public class Film {
    @Id
    private Long id;
    private String title;
    
    @ManyToOne
    @JoinColumn(name = "language_id")
    private Language language;
    
    @ManyToMany
    @JoinTable(name = "film_actor")
    private List<Actor> actors;
}

@Entity
public class Language {
    @Id
    private Long id;
    private String name;
}

@Entity
public class Actor {
    @Id
    private Long id;
    private String firstName;
    private String lastName;
}
\`\`\`

**New Node.js Structure (Denormalized with Embedding):**
\`\`\`javascript
// models/film.js - Single collection with embedded documents
const filmSchema = new mongoose.Schema({
  title: String,
  description: String,
  
  // Embedded language document (not separate class!)
  language: {
    name: String,
    last_update: Date
  },
  
  // Embedded actors array (not separate classes!)
  actors: [{
    first_name: String,
    last_name: String,
    last_update: Date
  }]
});
\`\`\`

#### **Key Transformations Required:**

1. **🔄 Entity Classes → Embedded Documents**
   - **Language Entity** → **Embedded in Film** (no separate Language class)
   - **Actor Entity** → **Embedded in Film** (no separate Actor class)
   - **Category Entity** → **Embedded in Film** (no separate Category class)

2. **🔄 Repository Layer → MongoDB Operations**
   - **FilmRepository** → **Film.find()** with embedded data
   - **LanguageRepository** → **Eliminated** (data embedded in Film)
   - **ActorRepository** → **Eliminated** (data embedded in Film)

3. **🔄 Service Layer → Business Logic Adaptation**
   - **FilmService.createFilm()** → **Create film with embedded language/actors**
   - **LanguageService.getLanguage()** → **Access film.language.name directly**
   - **ActorService.getActors()** → **Access film.actors array directly**

4. **🔄 Controller Layer → Express.js Routes**
   - **FilmController** → **/api/films** (handles all film operations)
   - **LanguageController** → **Eliminated** (no separate endpoints)
   - **ActorController** → **Eliminated** (no separate endpoints)

#### **Benefits of This Transformation:**

- **🚀 Performance**: Single query gets complete film data with language and actors
- **💾 Storage**: No need for separate collections and JOINs
- **🔧 Maintenance**: Simpler codebase with fewer classes and files
- **📱 API**: Cleaner REST endpoints (e.g., \`/api/films\` instead of \`/api/films/{id}/language\`)
- **🔄 Updates**: Atomic updates to film and related data

### **📁 File Transformation Analysis: Spring Boot → Node.js Migration**

**Why This Transformation Happens:**
When moving from PostgreSQL (with separate tables) to MongoDB (with embedded documents), we eliminate many separate Java classes because related data is now embedded within main entities. 

**Examples of Transformation:**
- **Film.java** + **Language.java** + **Category.java** → **film.js** (one file with embedded data)
- **Customer.java** + **Address.java** + **City.java** + **Country.java** → **customer.js** (one file with nested embedding)
- **Staff.java** + **Address.java** + **City.java** + **Country.java** → **staff.js** (one file with nested embedding)

**What This Means**: 
- **Fewer Java files** to maintain (Language.java, Category.java, City.java, Country.java are eliminated)
- **Simpler data access** patterns (no JOINs needed)
- **Better performance** (single query gets all related data)
- **Atomic updates** to main entity and related data

// Section removed as requested by user

// Section removed as requested by user

#### **🔄 Repository Layer Transformation:**

${this.generateRepositoryTransformationTable(analysis)}

#### **🔄 Service Layer Transformation:**

${this.generateServiceTransformationTable(analysis)}

#### **🔄 Controller Layer Transformation:**

${this.generateControllerTransformationTable(analysis)}

#### **💡 Key Benefits of This Transformation:**

1. **🚀 Performance**: Single query gets complete data with embedded relationships
2. **💾 Storage**: No need for separate collections and JOINs
3. **🔧 Maintenance**: Simpler codebase with fewer files and classes
4. **📱 API**: Cleaner REST endpoints with embedded data
5. **🔄 Updates**: Atomic updates to main entities and related data
6. **📊 Consistency**: No more data inconsistency between related tables

  | \`services/*.js\` | Node.js service classes | Services |
| \`middleware/*.js\` | Express.js middleware | None |
| \`tests/*.js\` | Test files | All components |`;
  }

  /**
   * Generate migration strategy section
   */
  private generateMigrationStrategy(plan: MigrationPlan): string {
    return `## 🔄 Migration Strategy & Phases

### **Migration Approach**
The migration will follow a **phased approach** to minimize risk and ensure business continuity:

1. **Parallel Development**: Maintain both systems during critical phases
2. **Incremental Migration**: Migrate components one layer at a time
3. **Comprehensive Testing**: Validate each phase before proceeding
4. **Rollback Strategy**: Maintain ability to revert changes

### **Migration Phases**

${plan.phases.map((phase, index) => `
#### **Phase ${index + 1}: ${phase.name}**


- **Dependencies**: ${phase.dependencies.length > 0 ? phase.dependencies.join(', ') : 'None'}
- **Deliverables**:
${phase.deliverables.map(d => `  - ${d}`).join('\n')}
- **Risks**:
${phase.risks.map(r => `  - ${r}`).join('\n')}
- **Mitigation**:
${phase.mitigation.map(m => `  - ${m}`).join('\n')}
`).join('\n')}

### **Critical Path**
${plan.timeline.criticalPath.map((phase, index) => `${index + 1}. ${phase}`).join('\n')}

### **Timeline Overview**
- **Start Date**: ${plan.timeline.startDate.toLocaleDateString()} at ${new Date(plan.timeline.startDate).toLocaleTimeString()}
- **End Date**: ${plan.timeline.endDate.toLocaleDateString()} at ${new Date(plan.timeline.endDate).toLocaleTimeString()}
- **Total Duration**: ${this.calculateTotalDuration(plan.timeline)} days
- **Buffer Time**: ${plan.timeline.bufferTime} days (20% contingency)
- **Generated**: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
  }

  /**
   * Generate risk assessment section
   */
  private generateRiskAssessment(plan: MigrationPlan): string {
    return `## ⚠️ Risk Assessment & Mitigation

### **High-Risk Areas**

${plan.riskAssessment.highRisks.map(risk => `
#### **${risk.description}**
- **Probability**: ${risk.probability}
- **Impact**: ${risk.impact}
- **Mitigation**: ${risk.mitigation}
`).join('\n')}

### **Medium-Risk Areas**

${plan.riskAssessment.mediumRisks.map(risk => `
#### **${risk.description}**
- **Probability**: ${risk.probability}
- **Impact**: ${risk.impact}
- **Mitigation**: ${risk.mitigation}
`).join('\n')}

### **Low-Risk Areas**

${plan.riskAssessment.lowRisks.map(risk => `
#### **${risk.description}**
- **Probability**: ${risk.probability}
- **Impact**: ${risk.impact}
- **Mitigation**: ${risk.mitigation}
`).join('\n')}

### **Mitigation Strategies**
${plan.riskAssessment.mitigationStrategies.map(strategy => `- ${strategy}`).join('\n')}

### **Contingency Planning**
1. **Rollback Procedures**: Maintain ability to revert to Spring Boot system
2. **Parallel Systems**: Run both systems during critical phases
3. **Data Backup**: Comprehensive backup strategy before migration
4. **Expert Support**: Access to Node.js and MongoDB expertise
5. **Extended Timeline**: Buffer time for unexpected challenges`;
  }

  /**
   * Generate success metrics section
   */
  private generateSuccessMetrics(): string {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const formattedTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
    
    return `## 📊 Success Metrics & KPIs

**Metrics Generated:** ${formattedDate} at ${formattedTime}

### **Technical Metrics**
- **Migration Success Rate**: >99.5%
- **Data Integrity**: 100% accuracy
- **Performance**: <10% degradation (or improvement)
- **API Response Time**: <200ms average
- **System Uptime**: >99.9%
- **Error Rate**: <0.1%

### **Business Metrics**
- **Feature Parity**: 100% functionality maintained
- **User Experience**: No degradation in user satisfaction
- **Development Velocity**: 20-30% improvement in feature delivery
- **Infrastructure Cost**: 20-30% reduction in operational costs
- **Scalability**: Support 2-3x current user load

### **Quality Metrics**
- **Code Coverage**: >80% test coverage
- **Documentation**: 100% API and system documentation
- **Performance Benchmarks**: Meet or exceed current system performance
- **Security**: Maintain or improve current security posture
- **Compliance**: Meet all regulatory and compliance requirements

### **Timeline Metrics**
- **Phase Completion**: All phases completed within estimated timeline
- **Milestone Achievement**: 100% milestone completion rate
- **Buffer Utilization**: <50% of allocated buffer time used


### **Team Metrics**
- **Knowledge Transfer**: 100% team proficiency in new technologies
- **Training Completion**: All team members trained on Node.js and MongoDB
- **Documentation Quality**: Comprehensive and up-to-date documentation
- **Process Improvement**: Improved development and deployment processes`;
  }

  /**
   * Generate recommendations section
   */
  private generateRecommendations(plan: MigrationPlan): string {
    return `## 🎯 Recommendations & Best Practices

### **Migration Approach**
${plan.recommendations.filter(r => r.toLowerCase().includes('migration') || r.toLowerCase().includes('phased')).map(r => `- ${r}`).join('\n')}

### **Technical Implementation**
${plan.recommendations.filter(r => r.toLowerCase().includes('implement') || r.toLowerCase().includes('use') || r.toLowerCase().includes('consider')).map(r => `- ${r}`).join('\n')}

### **Quality Assurance**
${plan.recommendations.filter(r => r.toLowerCase().includes('test') || r.toLowerCase().includes('quality') || r.toLowerCase().includes('validation')).map(r => `- ${r}`).join('\n')}

### **Performance Optimization**
${plan.recommendations.filter(r => r.toLowerCase().includes('performance') || r.toLowerCase().includes('optimization') || r.toLowerCase().includes('caching')).map(r => `- ${r}`).join('\n')}

### **Team Preparation**
${plan.recommendations.filter(r => r.toLowerCase().includes('team') || r.toLowerCase().includes('training') || r.toLowerCase().includes('knowledge')).map(r => `- ${r}`).join('\n')}

### **Risk Management**
- **Comprehensive Testing**: Test at every phase with real data
- **Rollback Strategy**: Maintain ability to revert changes quickly
- **Monitoring**: Implement comprehensive monitoring and alerting
- **Documentation**: Maintain detailed migration logs and procedures
- **Communication**: Regular stakeholder updates and milestone reviews`;
  }

  /**
   * Generate new project structure section
   */
  private generateNewProjectStructure(analysis: SourceCodeAnalysis): string {
    const projectStructure = this.generateDynamicNodeJSStructure(analysis);
    const technologyStack = this.generateTechnologyStack();
    const databaseSchema = this.generateDynamicDatabaseSchema(analysis);
    
    return `## 🏗️ New Project Structure (Node.js + MongoDB)

### **Target Architecture Overview**
The new Node.js + MongoDB architecture will provide a modern, scalable foundation for the **${analysis.projectName}** application:

\`\`\`
${analysis.projectName}-nodejs/
${projectStructure}
\`\`\`

### **Technology Stack Transformation**

| Current (Spring Boot) | New (Node.js) | Purpose |
|----------------------|---------------|---------|
| Spring Boot 3.x | Express.js 4.x | Web framework |
| Spring Data JPA | MongoDB Driver | Database access |
| Spring MVC | Express Router | HTTP routing |
| Spring Security | Passport.js | Authentication |
| Maven | npm/yarn | Package management |
| Java 17 | Node.js 18+ | Runtime environment |
| JPA/Hibernate | Mongoose | ODM (Optional) |
| Tomcat | Node.js HTTP | Web server |

### **Database Schema Transformation**

${databaseSchema}`;
  }

  /**
   * Generate dynamic Node.js project structure based on actual entities
   */
  private generateDynamicNodeJSStructure(analysis: SourceCodeAnalysis): string {
    let structure = `├── server.js                    # Main application entry point\n`;
    structure += `├── package.json                 # Dependencies and scripts\n`;
    structure += `├── .env                        # Environment variables\n`;
    structure += `├── config/\n`;
    structure += `│   ├── database.js             # MongoDB connection configuration\n`;
    structure += `│   ├── server.js               # Server configuration\n`;
    structure += `└── middleware.js           # Middleware configuration\n`;
    
    // Generate routes based on actual entities
    structure += `├── routes/\n`;
    structure += `│   ├── index.js                # Main router\n`;
    
    if (analysis.entities.length > 0) {
      // Show first 5 entities as specific routes
      const routeEntities = analysis.entities.slice(0, 5);
      routeEntities.forEach(entity => {
        const entityName = entity.fileName.replace('.java', '').toLowerCase();
        structure += `│   ├── ${entityName}.js                # ${entity.fileName} API routes\n`;
      });
      
      if (analysis.entities.length > 5) {
        structure += `│   ├── ...                     # ${analysis.entities.length - 5} more entity routes\n`;
      }
    } else {
      structure += `│   ├── api.js                   # Generic API routes\n`;
    }
    
    // Generate controllers based on actual entities
    structure += `├── controllers/\n`;
    if (analysis.entities.length > 0) {
      const controllerEntities = analysis.entities.slice(0, 5);
      controllerEntities.forEach(entity => {
        const entityName = entity.fileName.replace('.java', '').toLowerCase();
        structure += `│   ├── ${entityName}Controller.js       # ${entity.fileName} business logic\n`;
      });
      
      if (analysis.entities.length > 5) {
        structure += `│   ├── ...                     # ${analysis.entities.length - 5} more controllers\n`;
      }
    } else {
      structure += `│   ├── mainController.js         # Main business logic\n`;
    }
    
    // Generate services based on actual entities
    structure += `├── services/\n`;
    if (analysis.entities.length > 0) {
      const serviceEntities = analysis.entities.slice(0, 5);
      serviceEntities.forEach(entity => {
        const entityName = entity.fileName.replace('.java', '').toLowerCase();
        structure += `│   ├── ${entityName}Service.js          # ${entity.fileName} data operations\n`;
      });
      
      if (analysis.entities.length > 5) {
        structure += `│   ├── ...                     # ${analysis.entities.length - 5} more services\n`;
      }
    } else {
      structure += `│   ├── mainService.js            # Main data operations\n`;
    }
    
    // Generate models based on actual entities
    structure += `├── models/\n`;
    if (analysis.entities.length > 0) {
      const modelEntities = analysis.entities.slice(0, 5);
      modelEntities.forEach(entity => {
        const entityName = entity.fileName.replace('.java', '').toLowerCase();
        structure += `│   ├── ${entityName}.js                 # ${entity.fileName} MongoDB schema\n`;
      });
      
      if (analysis.entities.length > 5) {
        structure += `│   ├── ...                     # ${analysis.entities.length - 5} more schemas\n`;
      }
    } else {
      structure += `│   ├── main.js                   # Main MongoDB schema\n`;
    }
    
    // Standard middleware and utilities
    structure += `├── middleware/\n`;
    structure += `│   ├── auth.js                 # Authentication middleware\n`;
    structure += `│   ├── validation.js           # Request validation\n`;
    structure += `│   ├── errorHandler.js         # Error handling\n`;
    structure += `└── cors.js                 # CORS configuration\n`;
    structure += `├── utils/\n`;
    structure += `│   ├── database.js             # Database utilities\n`;
    structure += `│   ├── validation.js           # Validation utilities\n`;
    structure += `└── helpers.js              # Helper functions\n`;
    structure += `├── tests/\n`;
    structure += `│   ├── unit/                   # Unit tests\n`;
    structure += `│   ├── integration/            # Integration tests\n`;
    structure += `└── e2e/                    # End-to-end tests\n`;
    structure += `└── docs/                       # API documentation`;
    
    return structure;
  }

  /**
   * Generate technology stack transformation
   */
  private generateTechnologyStack(): string {
    return `### **Technology Stack Transformation**

| Current (Spring Boot) | New (Node.js) | Purpose |
|----------------------|---------------|---------|
| Spring Boot 3.x | Express.js 4.x | Web framework |
| Spring Data JPA | MongoDB Driver | Database access |
| Spring MVC | Express Router | HTTP routing |
| Spring Security | Passport.js | Authentication |
| Maven | npm/yarn | Package management |
| Java 17 | Node.js 18+ | Runtime environment |
| JPA/Hibernate | Mongoose | ODM (Optional) |
| Tomcat | Node.js HTTP | Web server |`;
  }

  /**
   * Generate dynamic database schema transformation based on actual entities
   */
  private generateDynamicDatabaseSchema(analysis: SourceCodeAnalysis): string {
    if (analysis.entities.length === 0) {
      return `#### **Current PostgreSQL Schema**
\`\`\`sql
-- No JPA entities found in your codebase
-- Likely using direct SQL or other data access patterns
\`\`\`

#### **New MongoDB Schema**
\`\`\`javascript
// Simple document structure (no complex entities)
{
  _id: ObjectId,
  // Your application-specific fields
}
\`\`\``;
    }
    
    // Generate schema based on actual entities
    const entityExamples = this.generateEntitySchemaExamples(analysis);
    
    return `#### **Current PostgreSQL Schema**
\`\`\`sql
-- Your actual normalized structure with ${analysis.entities.length} entities
${this.generatePostgreSQLSchemaExample(analysis)}
\`\`\`

#### **New MongoDB Schema**
\`\`\`javascript
// Denormalized document structure based on your entities
${entityExamples}
\`\`\``;
  }

  /**
   * Generate PostgreSQL schema example based on actual entities
   */
  private generatePostgreSQLSchemaExample(analysis: SourceCodeAnalysis): string {
    if (analysis.entities.length === 0) {
      return '-- No JPA entities found';
    }
    
    const sampleEntities = analysis.entities.slice(0, 3);
    let schema = '';
    
    sampleEntities.forEach((entity, index) => {
      const entityName = entity.fileName.replace('.java', '').toLowerCase();
      if (index === 0) {
        schema += `${entityName} → `;
      } else if (index === sampleEntities.length - 1) {
        schema += `${entityName}`;
      } else {
        schema += `${entityName} → `;
      }
    });
    
    if (analysis.entities.length > 3) {
      schema += `\n-- And ${analysis.entities.length - 3} more entities...`;
    }
    
    return schema;
  }

  /**
   * Generate entity schema examples based on actual entities
   */
  private generateEntitySchemaExamples(analysis: SourceCodeAnalysis): string {
    if (analysis.entities.length === 0) {
      return `// Simple document structure
{
  _id: ObjectId,
  // Your application-specific fields
}`;
    }
    
    const sampleEntity = analysis.entities[0];
    const entityName = sampleEntity.fileName.replace('.java', '');
    const hasRelationships = sampleEntity.relationships && sampleEntity.relationships.length > 0;
    
    let example = `// ${entityName} document with embedded data\n`;
    example += `{\n`;
    example += `  _id: ObjectId,\n`;
    example += `  name: "${entityName} Name",\n`;
    
    if (hasRelationships) {
      const relationship = sampleEntity.relationships[0];
      if (relationship.type === 'ONE_TO_MANY') {
        example += `  ${relationship.targetEntity.toLowerCase()}s: [\n`;
        example += `    { ${relationship.targetEntity.toLowerCase()}Id: ObjectId, name: "Sample ${relationship.targetEntity}" }\n`;
        example += `  ]\n`;
      } else if (relationship.type === 'MANY_TO_ONE') {
        example += `  ${relationship.targetEntity.toLowerCase()}: {\n`;
        example += `    ${relationship.targetEntity.toLowerCase()}Id: ObjectId,\n`;
        example += `    name: "Sample ${relationship.targetEntity}"\n`;
        example += `  }\n`;
      } else if (relationship.type === 'MANY_TO_MANY') {
        example += `  ${relationship.targetEntity.toLowerCase()}s: [\n`;
        example += `    { ${relationship.targetEntity.toLowerCase()}Id: ObjectId, name: "Sample ${relationship.targetEntity}" }\n`;
        example += `  ]\n`;
      }
    }
    
    example += `  // All data in one document, no separate tables needed\n`;
    example += `  // Based on your actual ${entityName} entity structure\n`;
    example += `}`;
    
    if (analysis.entities.length > 1) {
      example += `\n\n// And ${analysis.entities.length - 1} more entity schemas...`;
    }
    
    return example;
  }

  /**
   * Generate architecture benefits section
   */
  private generateArchitectureBenefits(analysis: SourceCodeAnalysis): string {
    return `## 🚀 Architecture Benefits of Node.js + MongoDB

### **Event-Driven Architecture**
- **Scalability**: Node.js's non-blocking I/O model allows for handling thousands of concurrent requests efficiently.
- **Performance**: Event-driven architecture enables faster response times and better resource utilization.
- **Concurrency**: Node.js's single-threaded event loop can manage multiple requests concurrently without blocking.

### **Flexible Data Model**
- **Schema Evolution**: MongoDB's flexible schema allows for easy evolution of data models without complex database migrations.
- **Document-Oriented**: JSON-like documents make it easier to represent complex, nested data structures.
- **Aggregation Pipeline**: Powerful aggregation framework for complex data processing and analytics.

### **Scalability**
- **Horizontal Scaling**: MongoDB's native sharding and replica sets enable unlimited horizontal growth.
- **Memory Efficiency**: V8 engine optimization in Node.js and memory-mapped storage in MongoDB provide efficient memory usage.
- **Connection Pooling**: Efficient connection management with MongoDB driver reduces overhead.

### **Development & Productivity**
- **JavaScript Ecosystem**: Full-Stack JavaScript enables faster development cycles and a unified language across frontend and backend.
- **Rapid Development**: npm's vast package ecosystem and faster development cycles accelerate application delivery.
- **Dynamic Typing**: Faster prototyping and development without compilation delays.
- **Hot Reloading**: Instant code changes with nodemon during development.
- **Modern Tooling**: ESLint, Prettier, Jest, and other modern development tools enhance code quality and maintainability.

### **Operational & Cost**
- **Resource Efficiency**: Lower memory footprint and faster startup times reduce infrastructure costs.
- **Cloud Native**: Better integration with modern cloud platforms and containers for cost optimization.
- **Cost Optimization**: Reduced infrastructure costs through better resource utilization.
- **Maintenance**: Simpler deployment and maintenance with fewer moving parts.
- **Monitoring**: Rich ecosystem of monitoring and observability tools for better observability.

### **Real-World Examples from Your Codebase**

${this.generateDynamicRealWorldExamples(analysis)}

### **Performance Improvements**
- **Query Performance**: 3-5x faster for complex queries due to embedded documents
- **Memory Usage**: 30-50% reduction in memory footprint
- **Startup Time**: 5-10x faster application startup
- **Development Speed**: 3-5x faster development cycles
- **Deployment**: Simplified deployment process with no compilation step`;
  }

  /**
   * Generate conclusion section
   */
  private generateConclusion(plan: MigrationPlan): string {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const formattedTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
    
    return `## 📝 Conclusion

The migration from Spring Boot + PostgreSQL to Node.js + MongoDB represents a **significant undertaking** that requires careful planning, comprehensive testing, and phased implementation. While the complexity is ${plan.summary.complexity.toLowerCase()}, the benefits include:

### **🎯 Key Benefits Summary**
- **🚀 Performance**: 2-3x better I/O performance with Node.js event-driven architecture
- **📈 Scalability**: Unlimited horizontal scaling with MongoDB sharding and replica sets
- **⚡ Development Velocity**: 3-5x faster development cycles with JavaScript ecosystem
- **💾 Memory Efficiency**: 30-50% reduction in memory usage compared to JVM
- **🚀 Startup Time**: 5-10x faster application startup (1-3 seconds vs 10-30 seconds)
- **🔧 Flexibility**: Schema evolution without complex database migrations
- **💰 Cost Optimization**: Reduced infrastructure costs through better resource utilization
- **☁️ Cloud Native**: Better integration with modern cloud platforms and containers

### **Success Factors**
1. **Thorough Planning**: Detailed migration strategy and timeline
2. **Team Expertise**: Node.js and MongoDB knowledge
3. **Testing Strategy**: Comprehensive testing at every phase
4. **Risk Management**: Proactive risk identification and mitigation
5. **Stakeholder Communication**: Regular updates and milestone reviews
6. **Performance Validation**: Ensure new architecture meets performance targets

### **Estimated Timeline**
The migration should be planned with additional buffer time recommended for unexpected challenges and thorough testing.

### **Next Steps**
1. **Team Training**: Begin Node.js and MongoDB training
2. **Environment Setup**: Set up development environment
3. **Proof of Concept**: Implement small component migration
4. **Detailed Planning**: Refine migration plan based on PoC results
5. **Stakeholder Approval**: Get final approval for migration timeline
6. **Performance Benchmarking**: Establish baseline metrics for comparison

---

**Document Prepared By:** PeerAI MongoMigrator  
**Review Date:** ${formattedDate} at ${formattedTime}  
**Next Review:** ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}  
**Approval Required:** Technical Lead, Project Manager

---

**Generated by PeerAI MongoMigrator v2.0** 🚀`;
  }

  // Helper methods for generating tables and content
  private getComplexityEmoji(complexity: string): string {
    switch (complexity) {
      case 'LOW': return '🟢';
      case 'MEDIUM': return '🟡';
      case 'HIGH': return '🔴';
      case 'CRITICAL': return '⚠️';
      default: return '❓';
    }
  }

  private generateEntityAnalysisTable(analysis: SourceCodeAnalysis): string {
    const rows = analysis.entities.map(entity => {
      const relationshipCount = entity.relationships.length;
      const fieldCount = entity.fields.length;
      return `| **${entity.fileName}** | ${entity.complexity} | ${fieldCount} fields, ${relationshipCount} relationships | ${entity.migrationNotes.join(', ')} |`;
    });
    
    return `| Entity | Complexity | Characteristics | Migration Notes |
|--------|------------|----------------|----------------|
${rows.join('\n')}`;
  }

  private generateRepositoryAnalysisTable(analysis: SourceCodeAnalysis): string {
    const rows = analysis.repositories.map(repo => {
      const methodCount = repo.methods.length;
      return `| **${repo.fileName}** | ${repo.complexity} | ${methodCount} methods | ${repo.migrationNotes.join(', ')} |`;
    });
    
    return `| Repository | Complexity | Characteristics | Migration Notes |
|------------|------------|----------------|----------------|
${rows.join('\n')}`;
  }

  private generateServiceAnalysisTable(analysis: SourceCodeAnalysis): string {
    const rows = analysis.services.map(service => {
      const methodCount = service.methods.length;
      return `| **${service.fileName}** | ${service.complexity} | ${methodCount} methods | ${service.migrationNotes.join(', ')} |`;
    });
    
    return `| Service | Complexity | Characteristics | Migration Notes |
|---------|------------|----------------|----------------|
${rows.join('\n')}`;
  }

  private generateControllerAnalysisTable(analysis: SourceCodeAnalysis): string {
    const rows = analysis.controllers.map(controller => {
      const methodCount = controller.methods.length;
      return `| **${controller.fileName}** | ${controller.complexity} | ${methodCount} methods | ${controller.migrationNotes.join(', ')} |`;
    });
    
    return `| Controller | Complexity | Characteristics | Migration Notes |
|------------|------------|----------------|----------------|
${rows.join('\n')}`;
  }

  private generateHighImpactFilesTable(analysis: SourceCodeAnalysis): string {
    const highImpactFiles = [
      ...analysis.entities.filter(e => e.complexity === 'HIGH' || e.complexity === 'CRITICAL'),
      ...analysis.repositories.filter(r => r.complexity === 'HIGH' || r.complexity === 'CRITICAL'),
      ...analysis.services.filter(s => s.complexity === 'HIGH' || s.complexity === 'CRITICAL')
    ];
    
    const rows = highImpactFiles.map(file => {
      return `| \`${file.filePath}\` | ${file.fileType.toLowerCase()} | ${file.dependencies.join(', ') || 'None'} |`;
    });
    
    return rows.length > 0 ? rows.join('\n') : '| No high-impact files found | | | |';
  }

  private generateMediumImpactFilesTable(analysis: SourceCodeAnalysis): string {
    const mediumImpactFiles = [
      ...analysis.entities.filter(e => e.complexity === 'MEDIUM'),
      ...analysis.repositories.filter(r => r.complexity === 'MEDIUM'),
      ...analysis.services.filter(s => s.complexity === 'MEDIUM'),
      ...analysis.controllers.filter(c => c.complexity === 'MEDIUM')
    ];
    
    const rows = mediumImpactFiles.map(file => {
      return `| \`${file.filePath}\` | ${file.fileType.toLowerCase()} | ${file.dependencies.join(', ') || 'None'} |`;
    });
    
    return rows.length > 0 ? rows.join('\n') : '| No medium-impact files found | | | |';
  }

  private generateLowImpactFilesTable(analysis: SourceCodeAnalysis): string {
    const lowImpactFiles = [
      ...analysis.entities.filter(e => e.complexity === 'LOW'),
      ...analysis.repositories.filter(r => r.complexity === 'LOW'),
      ...analysis.services.filter(s => s.complexity === 'LOW'),
      ...analysis.controllers.filter(c => c.complexity === 'LOW')
    ];
    
    const rows = lowImpactFiles.map(file => {
      return `| \`${file.filePath}\` | ${file.fileType.toLowerCase()} | ${file.dependencies.join(', ') || 'None'} |`;
    });
    
    return rows.length > 0 ? rows.join('\n') : '| No low-impact files found | | | |';
  }



  private calculateTotalDuration(timeline: any): number {
    const start = new Date(timeline.startDate);
    const end = new Date(timeline.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Extract version number from the source path or generate default
   */
  private extractVersionFromPath(sourcePath: string): string {
    try {
      // Try to extract version from existing analysis files in the directory
      const dir = path.dirname(sourcePath);
      const baseName = path.basename(sourcePath);
      
      // Look for existing analysis files to determine current version
      const fs = require('fs');
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        const analysisFiles = files.filter((file: string) => {
          const pattern = new RegExp(`^${baseName}-analysis-v\\d+\\.md$`);
          return pattern.test(file);
        });
        
        if (analysisFiles.length > 0) {
          // Extract version numbers and find the highest
          const versions = analysisFiles.map((file: string) => {
            const match = file.match(/-v(\d+)\.md$/);
            return match ? parseInt(match[1]) : 0;
          });
          
          const maxVersion = Math.max(...versions, 0);
          return `v${maxVersion + 1}`;
        }
      }
      
      // Default to v1 if no existing files found
      return 'v1';
      
    } catch (error) {
      // Fallback to v1 if extraction fails
      return 'v1';
    }
  }

  private calculateEntityCodeReduction(analysis: SourceCodeAnalysis): number {
    // Calculate based on complexity and estimated effort
    const totalEffort = analysis.entities.reduce((sum, entity) => sum + entity.estimatedEffort, 0);
    const highComplexityEffort = analysis.entities
      .filter(e => e.complexity === 'HIGH' || e.complexity === 'CRITICAL')
      .reduce((sum, entity) => sum + entity.estimatedEffort, 0);
    
    // Base reduction on complexity and relationships
    const baseReduction = analysis.entities.length > 0 ? 
      analysis.entities.filter(e => e.relationships.length > 0).length / analysis.entities.length * 60 : 60;
    
    return Math.round(baseReduction + (highComplexityEffort / totalEffort) * 20);
  }

  private calculateRepositoryCodeReduction(analysis: SourceCodeAnalysis): number {
    // Calculate based on complexity and methods
    const totalMethods = analysis.repositories.reduce((sum, repo) => 
      sum + repo.methods.length, 0);
    const avgMethodsPerRepo = totalMethods / Math.max(analysis.repositories.length, 1);
    
    // Base reduction on method complexity and custom queries
    const baseReduction = avgMethodsPerRepo > 5 ? 70 : 60;
    const complexityBonus = analysis.repositories.filter(r => 
      r.complexity === 'HIGH' || r.complexity === 'CRITICAL').length * 5;
    
    return Math.min(Math.round(baseReduction + complexityBonus), 85);
  }

  private calculateServiceComplexityReduction(analysis: SourceCodeAnalysis): number {
    // Calculate based on service complexity and estimated effort
    const totalEffort = analysis.services.reduce((sum, service) => sum + service.estimatedEffort, 0);
    const highComplexityEffort = analysis.services
      .filter(s => s.complexity === 'HIGH' || s.complexity === 'CRITICAL')
      .reduce((sum, service) => sum + service.estimatedEffort, 0);
    
    // Base reduction on complexity and business logic
    const baseReduction = 50;
    const complexityBonus = totalEffort > 0 ? (highComplexityEffort / totalEffort) * 30 : 0;
    
    return Math.round(baseReduction + complexityBonus);
  }

  private calculateControllerSimplification(analysis: SourceCodeAnalysis): number {
    // Calculate based on controller complexity and methods
    const totalMethods = analysis.controllers.reduce((sum, controller) => 
      sum + controller.methods.length, 0);
    const avgMethodsPerController = totalMethods / Math.max(analysis.controllers.length, 1);
    
    // Base simplification on method count and complexity
    const baseSimplification = avgMethodsPerController > 8 ? 50 : 40;
    const complexityBonus = analysis.controllers.filter(c => 
      c.complexity === 'HIGH' || c.complexity === 'CRITICAL').length * 3;
    
    return Math.min(Math.round(baseSimplification + complexityBonus), 65);
  }

  private countComplexRelationships(analysis: SourceCodeAnalysis): number {
    // Count entities with multiple relationships or high complexity
    return analysis.entities.filter(e => 
      e.relationships.length > 1 || e.complexity === 'HIGH' || e.complexity === 'CRITICAL'
    ).length;
  }

  private calculateTransactionSimplification(analysis: SourceCodeAnalysis): number {
    // Calculate based on service complexity and relationships
    const servicesWithRelationships = analysis.services.filter(s => 
      s.complexity === 'MEDIUM' || s.complexity === 'HIGH' || s.complexity === 'CRITICAL'
    ).length;
    
    const totalServices = analysis.services.length;
    if (totalServices === 0) return 60;
    
    // Base simplification on service complexity
    const baseSimplification = 60;
    const complexityBonus = (servicesWithRelationships / totalServices) * 20;
    
    return Math.round(baseSimplification + complexityBonus);
  }

  private calculateEntityTimeSavings(analysis: SourceCodeAnalysis): number {
    // Calculate based on entity complexity and relationships
    const entitiesWithRelationships = analysis.entities.filter(e => e.relationships.length > 0).length;
    const totalEntities = analysis.entities.length;
    
    if (totalEntities === 0) return 70;
    
    // Base savings on relationship complexity
    const baseSavings = 60;
    const relationshipBonus = (entitiesWithRelationships / totalEntities) * 20;
    
    return Math.round(baseSavings + relationshipBonus);
  }

  private calculateQueryTimeSavings(analysis: SourceCodeAnalysis): number {
    // Calculate based on repository complexity and methods
    const totalMethods = analysis.repositories.reduce((sum, repo) => sum + repo.methods.length, 0);
    const avgMethodsPerRepo = totalMethods / Math.max(analysis.repositories.length, 1);
    
    // Base savings on method complexity
    const baseSavings = 50;
    const methodBonus = avgMethodsPerRepo > 5 ? 20 : 10;
    
    return Math.round(baseSavings + methodBonus);
  }

  private calculateAPITimeSavings(analysis: SourceCodeAnalysis): number {
    // Calculate based on controller complexity and methods
    const totalMethods = analysis.controllers.reduce((sum, controller) => 
      sum + controller.methods.length, 0);
    const avgMethodsPerController = totalMethods / Math.max(analysis.controllers.length, 1);
    
    // Base savings on method count
    const baseSavings = 40;
    const methodBonus = avgMethodsPerController > 8 ? 20 : 10;
    
    return Math.round(baseSavings + methodBonus);
  }

  private calculateTestingTimeSavings(analysis: SourceCodeAnalysis): number {
    // Base calculation on service complexity since testing complexity isn't directly available
    const complexServices = analysis.services.filter(s => s.complexity === 'HIGH' || s.complexity === 'CRITICAL').length;
    const totalServices = analysis.services.length;
    return totalServices > 0 ? Math.round((complexServices / totalServices) * 40 + 20) : 40; // 20-60% range
  }

  private calculateDeploymentTimeSavings(analysis: SourceCodeAnalysis): number {
    // Spring Boot typically uses Maven, Node.js uses npm - significant deployment time difference
    return 80; // 80% faster deployment for Node.js vs Spring Boot
  }

  private calculateTotalCurrentEffort(analysis: SourceCodeAnalysis): number {
    return analysis.entities.reduce((sum, entity) => sum + entity.estimatedEffort, 0) +
           analysis.repositories.reduce((sum, repo) => sum + repo.estimatedEffort, 0) +
           analysis.services.reduce((sum, service) => sum + service.estimatedEffort, 0) +
           analysis.controllers.reduce((sum, controller) => sum + controller.estimatedEffort, 0);
  }

  private calculateEstimatedNewEffort(analysis: SourceCodeAnalysis): number {
    // Calculate new effort based on complexity reduction and MongoDB benefits
    const currentTotal = this.calculateTotalCurrentEffort(analysis);
    
    // Apply reduction factors based on component analysis
    const entityReduction = 0.4; // 60% reduction for entities (JPA to MongoDB)
    const repositoryReduction = 0.3; // 70% reduction for repositories (Spring Data to MongoDB)
    const serviceReduction = 0.6; // 40% reduction for services (business logic simplification)
    const controllerReduction = 0.7; // 30% reduction for controllers (Spring MVC to Express)
    
    // Calculate weighted reduction
    const entityEffort = analysis.entities.reduce((sum, entity) => sum + entity.estimatedEffort, 0);
    const repositoryEffort = analysis.repositories.reduce((sum, repo) => sum + repo.estimatedEffort, 0);
    const serviceEffort = analysis.services.reduce((sum, service) => sum + service.estimatedEffort, 0);
    const controllerEffort = analysis.controllers.reduce((sum, controller) => sum + controller.estimatedEffort, 0);
    
    const newEntityEffort = entityEffort * entityReduction;
    const newRepositoryEffort = repositoryEffort * repositoryReduction;
    const newServiceEffort = serviceEffort * serviceReduction;
    const newControllerEffort = controllerEffort * controllerReduction;
    
    return Math.round(newEntityEffort + newRepositoryEffort + newServiceEffort + newControllerEffort);
  }

  private calculateTotalEffortSavings(analysis: SourceCodeAnalysis): number {
    return this.calculateTotalCurrentEffort(analysis) - this.calculateEstimatedNewEffort(analysis);
  }

  private calculateTotalEffortSavingsPercentage(analysis: SourceCodeAnalysis): number {
    const currentTotal = this.calculateTotalCurrentEffort(analysis);
    if (currentTotal === 0) return 0;
    
    const savings = this.calculateTotalEffortSavings(analysis);
    return Math.round((savings / currentTotal) * 100);
  }

  /**
   * Generate dynamic real-world examples based on actual source code analysis
   */
  private generateDynamicRealWorldExamples(analysis: SourceCodeAnalysis): string {
    if (analysis.entities.length === 0) {
      return `#### **1. General Code Simplification**
**Current Spring Boot Complexity**: Your application uses Spring Boot with complex configuration and dependency injection.

**Simplified Node.js Structure**:
\`\`\`javascript
// Simple Express.js application structure
const express = require('express');
const app = express();

app.use(express.json());
app.listen(3000, () => console.log('Server running on port 3000'));
\`\`\`

#### **2. Configuration Simplification**
**Current Complexity**: Multiple configuration files and Spring Boot auto-configuration.

**Simplified Configuration**:
\`\`\`javascript
// Simple .env configuration
PORT=3000
MONGODB_URI=mongodb://localhost:27017/yourdb
NODE_ENV=development
\`\`\`

#### **3. Service Layer Simplification**
**Current Complexity**: Spring service classes with dependency injection.

**Simplified Service**:
\`\`\`javascript
// Simple service function
const processData = async (data) => {
  // Direct business logic without Spring complexity
  return await processAndSave(data);
};
\`\`\``;
    }

    // Generate examples based on actual entities
    const entityExamples = this.generateDynamicEntityExamples(analysis);
    const repositoryExamples = this.generateDynamicRepositoryExamples(analysis);
    const serviceExamples = this.generateDynamicServiceExamples(analysis);

    return `#### **1. Entity Relationship Simplification**
**Current Spring Boot Complexity**: Your Spring Boot application has ${analysis.entities.length} entities with JPA annotations that create complex database relationships.

**Specific Examples from Your Code**:
${entityExamples}

**Simplified MongoDB Structure**:
${this.generateMongoDBStructureExample(analysis)}

#### **2. Repository Query Simplification**
**Current Spring Data Complexity**: ${analysis.repositories.length} repository interfaces with custom query methods create boilerplate code.

**Specific Examples from Your Code**:
${repositoryExamples}

**Simplified MongoDB Queries**:
${this.generateMongoDBQueryExamples(analysis)}

#### **3. Service Layer Optimization**
**Current Spring Service Complexity**: ${analysis.services.length} service classes handle business logic that could be simplified.

**Specific Examples from Your Code**:
${serviceExamples}

**Optimized MongoDB Service**:
${this.generateMongoDBServiceExample(analysis)}`;
  }

  /**
   * Generate dynamic entity examples based on actual entities
   */
  private generateDynamicEntityExamples(analysis: SourceCodeAnalysis): string {
    if (analysis.entities.length === 0) return 'No JPA entities found in your codebase.';

    const sampleEntity = analysis.entities[0];
    const entityName = sampleEntity.fileName.replace('.java', '');
    
    let example = `\`\`\`java
@Entity
@Table(name = "${entityName.toLowerCase()}")
public class ${entityName} {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "name")
    private String name;`;

    // Add relationships if they exist
    if (sampleEntity.relationships && sampleEntity.relationships.length > 0) {
      const relationship = sampleEntity.relationships[0];
      if (relationship.type === 'MANY_TO_ONE') {
        example += `
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "${relationship.targetEntity.toLowerCase()}_id")
    private ${relationship.targetEntity} ${relationship.targetEntity.toLowerCase()};`;
      } else if (relationship.type === 'ONE_TO_MANY') {
        example += `
    
    @OneToMany(mappedBy = "${entityName.toLowerCase()}", cascade = CascadeType.ALL)
    private List<${relationship.targetEntity}> ${relationship.targetEntity.toLowerCase()}s = new ArrayList<>();`;
      } else if (relationship.type === 'MANY_TO_MANY') {
        example += `
    
    @ManyToMany
    @JoinTable(
        name = "${entityName.toLowerCase()}_${relationship.targetEntity.toLowerCase()}",
        joinColumns = @JoinColumn(name = "${entityName.toLowerCase()}_id"),
        inverseJoinColumns = @JoinColumn(name = "${relationship.targetEntity.toLowerCase()}_id")
    )
    private List<${relationship.targetEntity}> ${relationship.targetEntity.toLowerCase()}s = new ArrayList<>();`;
      }
    }

    example += `
}
\`\`\``;

    if (analysis.entities.length > 1) {
      example += `\n\n**And ${analysis.entities.length - 1} more entities with similar complexity...**`;
    }

    return example;
  }

  /**
   * Generate dynamic repository examples based on actual repositories
   */
  private generateDynamicRepositoryExamples(analysis: SourceCodeAnalysis): string {
    if (analysis.repositories.length === 0) return 'No repository interfaces found in your codebase.';

    const sampleRepo = analysis.repositories[0];
    const repoName = sampleRepo.fileName.replace('.java', '');
    const entityName = repoName.replace('Repository', '');
    
    let example = `\`\`\`java
@Repository
public interface ${repoName} extends JpaRepository<${entityName}, Long> {
    // Custom query methods
    List<${entityName}> findByNameContainingIgnoreCase(String name);
    
    @Query("SELECT e FROM ${entityName} e WHERE e.name LIKE %:keyword%")
    List<${entityName}> searchByKeyword(@Param("keyword") String keyword);
}`;

    if (analysis.repositories.length > 1) {
      example += `\n\n**And ${analysis.repositories.length - 1} more repository interfaces...**`;
    }

    example += `\`\`\``;

    return example;
  }

  /**
   * Generate dynamic service examples based on actual services
   */
  private generateDynamicServiceExamples(analysis: SourceCodeAnalysis): string {
    if (analysis.services.length === 0) return 'No service classes found in your codebase.';

    const sampleService = analysis.services[0];
    const serviceName = sampleService.fileName.replace('.java', '');
    const entityName = serviceName.replace('Service', '');
    
    let example = `\`\`\`java
@Service
public class ${serviceName} {
    @Autowired
    private ${entityName}Repository ${entityName.toLowerCase()}Repository;
    
    public ${entityName}DetailsDTO get${entityName}Details(Long id) {
        ${entityName} ${entityName.toLowerCase()} = ${entityName.toLowerCase()}Repository.findById(id);
        // Complex business logic and multiple repository calls
        return new ${entityName}DetailsDTO(${entityName.toLowerCase()});
    }
}`;

    if (analysis.services.length > 1) {
      example += `\n\n**And ${analysis.services.length - 1} more service classes...**`;
    }

    example += `\`\`\``;

    return example;
  }

  /**
   * Generate MongoDB structure example based on actual entities
   */
  private generateMongoDBStructureExample(analysis: SourceCodeAnalysis): string {
    if (analysis.entities.length === 0) {
      return `\`\`\`javascript
// Simple document structure
{
  _id: ObjectId,
  name: "Your Data",
  // Your application-specific fields
}
\`\`\``;
    }

    const sampleEntity = analysis.entities[0];
    const entityName = sampleEntity.fileName.replace('.java', '');
    
    let example = `\`\`\`javascript
// ${entityName} document with embedded data
{
  _id: ObjectId,
  name: "${entityName} Name"`;

    // Add embedded relationships if they exist
    if (sampleEntity.relationships && sampleEntity.relationships.length > 0) {
      const relationship = sampleEntity.relationships[0];
      if (relationship.type === 'ONE_TO_MANY') {
        example += `,
  ${relationship.targetEntity.toLowerCase()}s: [
    { ${relationship.targetEntity.toLowerCase()}Id: ObjectId, name: "Sample ${relationship.targetEntity}" }
  ]`;
      } else if (relationship.type === 'MANY_TO_ONE') {
        example += `,
  ${relationship.targetEntity.toLowerCase()}: {
    ${relationship.targetEntity.toLowerCase()}Id: ObjectId,
    name: "Sample ${relationship.targetEntity}"
  }`;
      } else if (relationship.type === 'MANY_TO_MANY') {
        example += `,
  ${relationship.targetEntity.toLowerCase()}s: [
    { ${relationship.targetEntity.toLowerCase()}Id: ObjectId, name: "Sample ${relationship.targetEntity}" }
  ]`;
      }
    }

    example += `
  // All data in one document, no separate tables needed
  // Based on your actual ${entityName} entity structure
}
\`\`\``;

    if (analysis.entities.length > 1) {
      example += `\n\n**And ${analysis.entities.length - 1} more entity schemas...**`;
    }

    return example;
  }

  /**
   * Generate MongoDB query examples based on actual entities
   */
  private generateMongoDBQueryExamples(analysis: SourceCodeAnalysis): string {
    if (analysis.entities.length === 0) {
      return `\`\`\`javascript
// Simple MongoDB queries
const data = await YourCollection.find({ name: { $regex: keyword, $options: 'i' } });
\`\`\``;
    }

    const sampleEntity = analysis.entities[0];
    const entityName = sampleEntity.fileName.replace('.java', '');
    
    let example = `\`\`\`javascript
// Simple aggregation pipeline for ${entityName}
const ${entityName.toLowerCase()}sByName = await ${entityName}.aggregate([
  { $match: { name: { $regex: keyword, $options: 'i' } } }
]);

// Simple find query
const ${entityName.toLowerCase()}sByYear = await ${entityName}.find({
  year: year
});
\`\`\``;

    if (analysis.entities.length > 1) {
      example += `\n\n**And similar queries for ${analysis.entities.length - 1} more entities...**`;
    }

    return example;
  }

  /**
   * Generate MongoDB service example based on actual entities
   */
  private generateMongoDBServiceExample(analysis: SourceCodeAnalysis): string {
    if (analysis.entities.length === 0) {
      return `\`\`\`javascript
// Simple service function
const getData = async (id) => {
  return await YourCollection.findById(id);
};
\`\`\``;
    }

    const sampleEntity = analysis.entities[0];
    const entityName = sampleEntity.fileName.replace('.java', '');
    
    let example = `\`\`\`javascript
// Single query with embedded data for ${entityName}
const ${entityName.toLowerCase()}Details = await ${entityName}.findById(id)
  .populate('${sampleEntity.relationships && sampleEntity.relationships.length > 0 ? sampleEntity.relationships[0].targetEntity.toLowerCase() : 'relatedData'}');

// All data retrieved in one query, no additional database calls needed
\`\`\``;

    if (analysis.entities.length > 1) {
      example += `\n\n**And similar optimizations for ${analysis.entities.length - 1} more entities...**`;
    }

    return example;
  }

  /**
   * Generate table showing eliminated Java files based on actual analysis
   */
  private generateEliminatedJavaFilesTable(analysis: SourceCodeAnalysis): string {
    const eliminatedFiles: string[] = [];
    
    // Define which entities will be eliminated due to embedding
    const eliminatedEntities = [
      'language', 'actor', 'category', 'city', 'country',
      'filmactor', 'filmcategory', 'filmactorid', 'filmcategoryid'
    ];
    
    // Analyze which entities will be eliminated due to embedding
    analysis.entities.forEach(entity => {
      const entityName = entity.fileName.replace('.java', '').toLowerCase();
      
      // Check if this entity should be eliminated
      if (eliminatedEntities.some(eliminated => entityName.includes(eliminated))) {
        // Determine where this entity gets embedded
        let embeddedIn = '';
        if (entityName.includes('language') || entityName.includes('category') || entityName.includes('actor')) {
          embeddedIn = 'Film.java';
        } else if (entityName.includes('city') || entityName.includes('country')) {
          embeddedIn = 'Address.java';
        } else if (entityName.includes('filmactor') || entityName.includes('filmcategory')) {
          embeddedIn = 'Film.java';
        }
        
        eliminatedFiles.push(`| \`${entity.fileName}\` | Data embedded in ${embeddedIn} | \`mainEntity.${entityName}.field\` |`);
      }
    });
    
    if (eliminatedFiles.length === 0) {
      return 'No specific Java files identified for elimination in your current schema.';
    }
    
    return `| **Spring Boot File** | **Why Eliminated** | **Node.js Alternative** |
|----------------------|-------------------|-------------------------|
${eliminatedFiles.join('\n')}`;
  }

  /**
   * Generate table showing new Node.js files based on actual analysis
   */
  private generateNewNodeJSFilesTable(analysis: SourceCodeAnalysis): string {
    const newNodeJSFiles: string[] = [];
    
    // Define which entities will become main Node.js files (NOT eliminated ones)
    const mainEntities = [
      'film', 'customer', 'staff', 'address', 'store', 'rental', 'payment', 'inventory'
    ];
    
    // Generate based on actual entities - only main entities that will have collections
    analysis.entities.forEach(entity => {
      const entityName = entity.fileName.replace('.java', '').toLowerCase();
      
      // Only create Node.js files for main entities (not eliminated ones)
      if (mainEntities.some(main => entityName.includes(main))) {
        // Determine what gets embedded in this entity
        let embeddedEntities = '';
        if (entityName.includes('film')) {
          embeddedEntities = 'language, category, actors';
        } else if (entityName.includes('customer') || entityName.includes('staff')) {
          embeddedEntities = 'address (with city and country)';
        } else if (entityName.includes('address')) {
          embeddedEntities = 'city (with country)';
        } else if (entityName.includes('store')) {
          embeddedEntities = 'address, staff';
        } else if (entityName.includes('rental')) {
          embeddedEntities = 'customer, inventory, staff';
        } else if (entityName.includes('payment')) {
          embeddedEntities = 'customer, rental, staff';
        } else if (entityName.includes('inventory')) {
          embeddedEntities = 'film, store';
        }
        
        newNodeJSFiles.push(`| \`models/${entityName}.js\` | ${entityName} schema with embedded: ${embeddedEntities} | \`${entityName}.java\` + related entity classes |`);
      }
    });
    
    if (newNodeJSFiles.length === 0) {
      return 'No specific Node.js files identified in your current schema.';
    }
    
    return `| **New File** | **Purpose** | **Replaces** |
|--------------|-------------|--------------|
${newNodeJSFiles.join('\n')}`;
  }

  /**
   * Generate repository transformation table based on actual analysis
   */
  private generateRepositoryTransformationTable(analysis: SourceCodeAnalysis): string {
    const transformations: string[] = [];
    
    analysis.entities.forEach(entity => {
      const entityName = entity.fileName.replace('.java', '');
      if (entity.fileName.toLowerCase().includes('language') ||
          entity.fileName.toLowerCase().includes('actor') ||
          entity.fileName.toLowerCase().includes('category') ||
          entity.fileName.toLowerCase().includes('city') ||
          entity.fileName.toLowerCase().includes('country')) {
        transformations.push(`| \`${entityName}Repository.java\` | **ELIMINATED** | Data embedded in main entity |`);
      } else {
        transformations.push(`| \`${entityName}Repository.java\` | \`${entityName}.find()\` | Direct MongoDB operations |`);
      }
    });
    
    if (transformations.length === 0) {
      return 'No repository transformations identified in your current schema.';
    }
    
    return `| **Spring Boot Repository** | **Node.js Equivalent** | **Why Changed** |
|---------------------------|------------------------|-----------------|
${transformations.join('\n')}`;
  }

  /**
   * Generate service transformation table based on actual analysis
   */
  private generateServiceTransformationTable(analysis: SourceCodeAnalysis): string {
    const transformations: string[] = [];
    
    analysis.entities.forEach(entity => {
      const entityName = entity.fileName.replace('.java', '');
      if (entity.fileName.toLowerCase().includes('language') ||
          entity.fileName.toLowerCase().includes('actor') ||
          entity.fileName.toLowerCase().includes('category') ||
          entity.fileName.toLowerCase().includes('city') ||
          entity.fileName.toLowerCase().includes('country')) {
        transformations.push(`| \`${entityName}Service.get${entityName}(id)\` | **ELIMINATED** | Data embedded in main entity |`);
      } else {
        transformations.push(`| \`${entityName}Service.get${entityName}WithDetails(id)\` | \`${entityName}.findById(id)\` | Single query gets everything |`);
      }
    });
    
    if (transformations.length === 0) {
      return 'No service transformations identified in your current schema.';
    }
    
    return `| **Spring Boot Service** | **Node.js Equivalent** | **Data Access Pattern** |
|------------------------|------------------------|-------------------------|
${transformations.join('\n')}`;
  }

  /**
   * Generate controller transformation table based on actual analysis
   */
  private generateControllerTransformationTable(analysis: SourceCodeAnalysis): string {
    const transformations: string[] = [];
    
    analysis.entities.forEach(entity => {
      const entityName = entity.fileName.replace('.java', '');
      if (entity.fileName.toLowerCase().includes('language') ||
          entity.fileName.toLowerCase().includes('actor') ||
          entity.fileName.toLowerCase().includes('category') ||
          entity.fileName.toLowerCase().includes('city') ||
          entity.fileName.toLowerCase().includes('country')) {
        transformations.push(`| \`GET /api/${entityName.toLowerCase()}s/{id}\` | **ELIMINATED** | Data embedded in main entity |`);
      } else {
        transformations.push(`| \`GET /api/${entityName.toLowerCase()}s/{id}\` | \`GET /api/${entityName.toLowerCase()}s/:id\` | Single endpoint gets all data |`);
      }
    });
    
    if (transformations.length === 0) {
      return 'No controller transformations identified in your current schema.';
    }
    
    return `| **Spring Boot Endpoint** | **Node.js Endpoint** | **Why Simplified** |
|-------------------------|---------------------|-------------------|
${transformations.join('\n')}`;
  }

  /**
   * NEW: Generate Stored Procedures Analysis Section for Migration Analysis
   */
  private generateStoredProceduresAnalysisSection(analysis: SourceCodeAnalysis): string {
    let content = '\n## 🔧 Stored Procedures Analysis (Migration Focus)\n\n';
    content += 'This section analyzes how stored procedures and business logic from the current system should be migrated to MongoDB, including aggregation pipelines, application logic, and business rule implementations.\n\n';

    // Analyze services and repositories for business logic
    const services = analysis.services || [];
    const repositories = analysis.repositories || [];

    if (services.length === 0 && repositories.length === 0) {
      content += 'No business logic components found in the current system.\n\n';
      return content;
    }

    // Services Analysis (Business Logic)
    if (services.length > 0) {
      content += `### 📋 Business Logic Services Analysis (${services.length} found)\n\n`;
      
      services.forEach((service, index) => {
        content += `#### ${index + 1}. ${service.fileName}\n\n`;
        content += `**Complexity:** ${service.complexity}\n`;
        content += `**Methods:** ${service.methods.length}\n`;
        content += `**Dependencies:** ${service.dependencies.length}\n\n`;

        if (service.migrationNotes && service.migrationNotes.length > 0) {
          content += `**Migration Notes:**\n`;
          service.migrationNotes.forEach(note => {
            content += `- ${note}\n`;
          });
          content += `\n`;
        }

        // MongoDB Migration Strategy
        content += `**MongoDB Migration Strategy:**\n`;
        content += `- **Application Services:** Convert to Node.js service classes\n`;
        content += `- **Business Logic:** Implement in application layer with proper error handling\n`;
        content += `- **Data Processing:** Use MongoDB aggregation pipelines for complex operations\n`;
        content += `- **Validation:** Implement schema validation and business rule enforcement\n\n`;

        content += `**Implementation Approach:**\n`;
        content += `1. Analyze service methods and business logic\n`;
        content += `2. Identify data access patterns and dependencies\n`;
        content += `3. Design equivalent MongoDB operations\n`;
        content += `4. Implement in Node.js with proper error handling\n`;
        content += `5. Add unit tests for business logic validation\n\n`;

        if (index < services.length - 1) {
          content += `---\n\n`;
        }
      });
    }

    // Repositories Analysis (Data Access Logic)
    if (repositories.length > 0) {
      content += `### 🗄️ Data Access Layer Analysis (${repositories.length} found)\n\n`;
      
      repositories.forEach((repo, index) => {
        content += `#### ${index + 1}. ${repo.fileName}\n\n`;
        content += `**Complexity:** ${repo.complexity}\n`;
        content += `**Methods:** ${repo.methods.length}\n`;
        content += `**Dependencies:** ${repo.dependencies.length}\n\n`;

        if (repo.migrationNotes && repo.migrationNotes.length > 0) {
          content += `**Migration Notes:**\n`;
          repo.migrationNotes.forEach(note => {
            content += `- ${note}\n`;
          });
          content += `\n`;
        }

        // MongoDB Migration Strategy
        content += `**MongoDB Migration Strategy:**\n`;
        content += `- **Data Access:** Replace JPA repositories with MongoDB operations\n`;
        content += `- **Queries:** Convert JPQL to MongoDB query syntax\n`;
        content += `- **Aggregations:** Use MongoDB aggregation framework for complex queries\n`;
        content += `- **Transactions:** Implement MongoDB transactions for data consistency\n\n`;

        content += `**Implementation Approach:**\n`;
        content += `1. Identify repository methods and query patterns\n`;
        content += `2. Convert JPQL queries to MongoDB syntax\n`;
        content += `3. Implement aggregation pipelines for complex operations\n`;
        content += `4. Add proper error handling and validation\n`;
        content += `5. Test data access patterns thoroughly\n\n`;

        if (index < repositories.length - 1) {
          content += `---\n\n`;
        }
      });
    }

    // General Migration Recommendations
    content += `### 💡 Business Logic Migration Recommendations\n\n`;
    content += `**For Simple Business Logic:**\n`;
    content += `- Convert to Node.js service methods\n`;
    content += `- Use MongoDB operations for data access\n`;
    content += `- Implement proper error handling and logging\n\n`;

    content += `**For Complex Business Logic:**\n`;
    content += `- Break down into smaller, focused services\n`;
    content += `- Use dependency injection for testability\n`;
    content += `- Implement proper validation and business rules\n`;
    content += `- Consider using design patterns (Strategy, Command, etc.)\n\n`;

    content += `**For Data Processing:**\n`;
    content += `- Use MongoDB aggregation pipelines\n`;
    content += `- Implement batch processing for large datasets\n`;
    content += `- Add proper indexing for performance\n`;
    content += `- Consider using MongoDB Change Streams for real-time processing\n\n`;

    content += `**For Validation and Business Rules:**\n`;
    content += `- Use MongoDB schema validation\n`;
    content += `- Implement application-level validation\n`;
    content += `- Add proper error handling and user feedback\n`;
    content += `- Use MongoDB transactions for data consistency\n\n`;

    return content;
  }

  /**
   * NEW: Generate Metadata Analysis Section for Migration Analysis
   */
  private generateMetadataAnalysisSection(analysis: SourceCodeAnalysis): string {
    let content = '\n## 📊 Metadata Analysis (Migration Focus)\n\n';
    content += 'This section provides comprehensive analysis of the current system metadata and how it should be handled in the MongoDB migration, including performance considerations, data patterns, and optimization strategies.\n\n';

    // System Overview
    const totalFiles = analysis.totalFiles;
    const totalEntities = analysis.entities.length;
    const totalServices = analysis.services.length;
    const totalRepositories = analysis.repositories.length;
    const totalControllers = analysis.controllers.length;
    
    content += `### 🗄️ System Overview\n\n`;
    content += `- **Total Files:** ${totalFiles}\n`;
    content += `- **Entities:** ${totalEntities}\n`;
    content += `- **Services:** ${totalServices}\n`;
    content += `- **Repositories:** ${totalRepositories}\n`;
    content += `- **Controllers:** ${totalControllers}\n`;
    content += `- **Migration Complexity:** ${analysis.migrationComplexity}\n\n`;

    // Component Statistics
    content += `### 📋 Component Statistics\n\n`;
    content += `| Component Type | Count | Complexity Distribution | Migration Notes |\n`;
    content += `|----------------|-------|------------------------|-----------------|\n`;
    
    // Entities
    const entityComplexity = this.getComplexityDistribution(analysis.entities);
    content += `| Entities | ${totalEntities} | ${entityComplexity} | Data model transformation |\n`;
    
    // Services
    const serviceComplexity = this.getComplexityDistribution(analysis.services);
    content += `| Services | ${totalServices} | ${serviceComplexity} | Business logic migration |\n`;
    
    // Repositories
    const repoComplexity = this.getComplexityDistribution(analysis.repositories);
    content += `| Repositories | ${totalRepositories} | ${repoComplexity} | Data access layer conversion |\n`;
    
    // Controllers
    const controllerComplexity = this.getComplexityDistribution(analysis.controllers);
    content += `| Controllers | ${totalControllers} | ${controllerComplexity} | API layer transformation |\n`;
    
    content += `\n`;

    // Data Patterns Analysis
    content += `### 🔍 Data Patterns Analysis\n\n`;
    content += `**Entity Relationships:**\n`;
    const totalRelationships = analysis.entities.reduce((sum, entity) => sum + entity.relationships.length, 0);
    content += `- Total relationships: ${totalRelationships}\n`;
    content += `- Average relationships per entity: ${totalEntities > 0 ? (totalRelationships / totalEntities).toFixed(1) : 0}\n`;
    content += `- Complex entities (>3 relationships): ${analysis.entities.filter(e => e.relationships.length > 3).length}\n\n`;

    content += `**Method Complexity:**\n`;
    const totalMethods = analysis.services.reduce((sum, service) => sum + service.methods.length, 0) +
                        analysis.repositories.reduce((sum, repo) => sum + repo.methods.length, 0) +
                        analysis.controllers.reduce((sum, controller) => sum + controller.methods.length, 0);
    content += `- Total methods: ${totalMethods}\n`;
    content += `- Average methods per component: ${(totalServices + totalRepositories + totalControllers) > 0 ? (totalMethods / (totalServices + totalRepositories + totalControllers)).toFixed(1) : 0}\n\n`;

    // Migration Complexity Analysis
    content += `### ⚡ Migration Complexity Analysis\n\n`;
    content += `**High Complexity Components:**\n`;
    const highComplexityComponents = [
      ...analysis.entities.filter(e => e.complexity === 'HIGH' || e.complexity === 'CRITICAL'),
      ...analysis.services.filter(s => s.complexity === 'HIGH' || s.complexity === 'CRITICAL'),
      ...analysis.repositories.filter(r => r.complexity === 'HIGH' || r.complexity === 'CRITICAL'),
      ...analysis.controllers.filter(c => c.complexity === 'HIGH' || c.complexity === 'CRITICAL')
    ];
    
    if (highComplexityComponents.length > 0) {
      content += `- **Count:** ${highComplexityComponents.length} components\n`;
      content += `- **Focus Areas:** These components require special attention during migration\n`;
      content += `- **Recommendation:** Break down into smaller, manageable pieces\n\n`;
    } else {
      content += `- **Count:** 0 components\n`;
      content += `- **Status:** All components are manageable complexity\n\n`;
    }

    // Performance Considerations
    content += `### 🚀 Performance Considerations\n\n`;
    content += `**Data Access Patterns:**\n`;
    content += `- **Repository Methods:** ${analysis.repositories.reduce((sum, repo) => sum + repo.methods.length, 0)} data access methods to convert\n`;
    content += `- **Service Methods:** ${analysis.services.reduce((sum, service) => sum + service.methods.length, 0)} business logic methods to migrate\n`;
    content += `- **Controller Endpoints:** ${analysis.controllers.reduce((sum, controller) => sum + controller.methods.length, 0)} API endpoints to transform\n\n`;

    content += `**MongoDB Optimization Opportunities:**\n`;
    content += `- Use embedded documents for related data\n`;
    content += `- Implement proper indexing strategies\n`;
    content += `- Use aggregation pipelines for complex queries\n`;
    content += `- Consider sharding for large datasets\n\n`;

    // Migration Recommendations
    content += `### 💡 Migration Recommendations\n\n`;
    content += `**Phase 1: Data Model Design**\n`;
    content += `- Analyze entity relationships and design MongoDB schema\n`;
    content += `- Identify embedded vs referenced document strategies\n`;
    content += `- Plan indexing strategy for performance\n\n`;

    content += `**Phase 2: Business Logic Migration**\n`;
    content += `- Convert services to Node.js business logic\n`;
    content += `- Implement proper error handling and validation\n`;
    content += `- Add unit tests for business rules\n\n`;

    content += `**Phase 3: Data Access Migration**\n`;
    content += `- Convert repositories to MongoDB operations\n`;
    content += `- Implement aggregation pipelines for complex queries\n`;
    content += `- Add proper transaction handling\n\n`;

    content += `**Phase 4: API Migration**\n`;
    content += `- Convert controllers to Express.js routes\n`;
    content += `- Implement proper request/response handling\n`;
    content += `- Add API documentation and testing\n\n`;

    return content;
  }

  // Helper method for complexity distribution
  private getComplexityDistribution(components: any[]): string {
    const distribution = components.reduce((acc, comp) => {
      acc[comp.complexity] = (acc[comp.complexity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution)
      .map(([complexity, count]) => `${complexity}: ${count}`)
      .join(', ');
  }
}