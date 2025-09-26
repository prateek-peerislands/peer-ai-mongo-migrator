import { 
  ModificationRequest, 
  ModificationResponse, 
  ModificationSession, 
  ModificationContext,
  SchemaChange,
  IntelligentModificationSuggestion,
  FinalMigrationDocument,
  ModificationSummary
} from '../types/modification-types.js';
import { MongoDBCollectionSchema } from './MongoDBSchemaGenerator.js';
import { AzureOpenAIService } from './AzureOpenAIService.js';
import { MongoDBSchemaMarkdownGenerator } from './MongoDBSchemaMarkdownGenerator.js';
import { DualLocationFileWriter } from '../utils/DualLocationFileWriter.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export class SchemaModificationService {
  private azureOpenAI: AzureOpenAIService;
  private markdownGenerator: MongoDBSchemaMarkdownGenerator;
  private activeSessions: Map<string, ModificationSession> = new Map();

  constructor() {
    this.azureOpenAI = new AzureOpenAIService();
    this.markdownGenerator = new MongoDBSchemaMarkdownGenerator();
  }

  /**
   * Start a new modification session
   */
  startModificationSession(
    originalPostgreSQLSchema: any,
    currentMongoDBSchema: MongoDBCollectionSchema[],
    businessRequirements?: string[],
    performanceConstraints?: string[]
  ): ModificationSession {
    const sessionId = uuidv4();
    const session: ModificationSession = {
      sessionId,
      startTime: new Date(),
      originalSchema: originalPostgreSQLSchema,
      currentSchema: currentMongoDBSchema,
      modificationHistory: [],
      status: 'ACTIVE'
    };

    this.activeSessions.set(sessionId, session);
    console.log(`🔄 Started modification session: ${sessionId}`);
    return session;
  }

  /**
   * Process a modification request
   */
  async processModificationRequest(
    sessionId: string,
    modificationDescription: string,
    developerNotes?: string,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'
  ): Promise<ModificationResponse> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      if (session.status !== 'ACTIVE') {
        throw new Error(`Session ${sessionId} is not active`);
      }

      console.log(`🔧 Processing modification request for session ${sessionId}...`);

      // Create modification request
      const request: ModificationRequest = {
        id: uuidv4(),
        timestamp: new Date(),
        originalSchema: session.originalSchema,
        modificationDescription,
        developerNotes,
        priority,
        status: 'PROCESSING'
      };

      // Add to session history
      session.modificationHistory.push(request);

      // Create context for Azure OpenAI
      const context: ModificationContext = {
        originalPostgreSQLSchema: session.originalSchema,
        currentMongoDBSchema: session.currentSchema,
        modificationHistory: session.modificationHistory,
        businessRequirements: [],
        performanceConstraints: []
      };

      // Process with Azure OpenAI
      const aiResponse = await this.azureOpenAI.processModificationRequest(
        modificationDescription,
        context
      );

      // Update request status
      request.status = aiResponse.success ? 'COMPLETED' : 'FAILED';

      // Update session with modified schema
      if (aiResponse.success) {
        session.currentSchema = aiResponse.modifiedSchema;
      }

      // Generate response
      const response: ModificationResponse = {
        success: aiResponse.success,
        modifiedSchema: aiResponse.modifiedSchema,
        changes: this.analyzeChanges(session.currentSchema, aiResponse.modifiedSchema),
        reasoning: aiResponse.reasoning,
        warnings: aiResponse.warnings,
        recommendations: aiResponse.recommendations,
        error: aiResponse.error
      };

      console.log(`✅ Modification request processed: ${request.id}`);
      return response;

    } catch (error) {
      console.error('❌ Modification request failed:', error);
      return {
        success: false,
        modifiedSchema: [],
        changes: [],
        reasoning: 'Failed to process modification request',
        warnings: ['Processing failed'],
        recommendations: ['Please try again or contact support'],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get intelligent modification suggestions
   */
  async getModificationSuggestions(sessionId: string): Promise<IntelligentModificationSuggestion[]> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const context: ModificationContext = {
        originalPostgreSQLSchema: session.originalSchema,
        currentMongoDBSchema: session.currentSchema,
        modificationHistory: session.modificationHistory,
        businessRequirements: [],
        performanceConstraints: []
      };

      return await this.azureOpenAI.getModificationSuggestions(context);

    } catch (error) {
      console.error('❌ Failed to get suggestions:', error);
      return [];
    }
  }

  /**
   * Generate updated documentation for modified schema
   */
  async generateUpdatedDocumentation(
    sessionId: string,
    outputPath?: string
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      console.log(`📝 Generating updated documentation for session ${sessionId}...`);

      // Create a mock conversion result for the markdown generator
      const conversionResult = {
        mongodbSchema: session.currentSchema,
        compatibilityReport: {
          compatibleTables: [],
          incompatibleTables: [],
          typeMappings: {},
          relationshipStrategies: {},
          performanceConsiderations: []
        },
        recommendations: [],
        warnings: []
      };

      // Generate markdown documentation
      const filePath = await this.markdownGenerator.generateMongoDBSchemaMarkdown(conversionResult);

      console.log(`✅ Updated documentation generated: ${filePath}`);
      return { success: true, filePath };

    } catch (error) {
      console.error('❌ Failed to generate updated documentation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Approve final schema and generate migration document
   */
  async approveFinalSchema(sessionId: string): Promise<FinalMigrationDocument> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      console.log(`✅ Approving final schema for session ${sessionId}...`);

      // Mark session as completed
      session.status = 'COMPLETED';
      session.finalApproval = true;

      // Generate modification summary
      const summary = this.generateModificationSummary(session);

      // Create final migration document
      const finalDocument: FinalMigrationDocument = {
        documentId: uuidv4(),
        generatedAt: new Date(),
        approvedSchema: session.currentSchema,
        modificationSummary: summary,
        migrationPlan: this.generateMigrationPlan(session),
        finalRecommendations: this.generateFinalRecommendations(session),
        version: '1.0.0'
      };

      // Save final document
      await this.saveFinalMigrationDocument(finalDocument);

      console.log(`🎉 Final schema approved and migration document generated: ${finalDocument.documentId}`);
      return finalDocument;

    } catch (error) {
      console.error('❌ Failed to approve final schema:', error);
      throw error;
    }
  }

  /**
   * Cancel modification session
   */
  cancelSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.status = 'CANCELLED';
    console.log(`❌ Session ${sessionId} cancelled`);
    return true;
  }

  /**
   * Get session information
   */
  getSession(sessionId: string): ModificationSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * List all active sessions
   */
  listActiveSessions(): ModificationSession[] {
    return Array.from(this.activeSessions.values()).filter(s => s.status === 'ACTIVE');
  }

  /**
   * Analyze changes between schemas
   */
  private analyzeChanges(
    originalSchema: MongoDBCollectionSchema[],
    modifiedSchema: MongoDBCollectionSchema[]
  ): SchemaChange[] {
    const changes: SchemaChange[] = [];

    // Simple change analysis - in a real implementation, this would be more sophisticated
    if (originalSchema.length !== modifiedSchema.length) {
      changes.push({
        type: originalSchema.length > modifiedSchema.length ? 'MERGE' : 'SPLIT',
        targetCollection: 'Multiple collections',
        description: `Collection count changed from ${originalSchema.length} to ${modifiedSchema.length}`,
        before: { count: originalSchema.length },
        after: { count: modifiedSchema.length },
        impact: 'MEDIUM',
        reasoning: 'Collection structure was modified'
      });
    }

    return changes;
  }

  /**
   * Generate modification summary
   */
  private generateModificationSummary(session: ModificationSession): ModificationSummary {
    const modifications = session.modificationHistory.filter(m => m.status === 'COMPLETED');
    const modificationsByType = modifications.reduce((acc, mod) => {
      // Simple type detection - in real implementation, this would be more sophisticated
      const type = 'GENERAL';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return {
      totalModifications: modifications.length,
      modificationsByType,
      finalCollectionCount: session.currentSchema.length,
      originalCollectionCount: session.originalSchema.length,
      performanceImpact: 'POSITIVE',
      complexityChange: 'UNCHANGED',
      keyChanges: modifications.map(m => m.modificationDescription)
    };
  }

  /**
   * Generate migration plan
   */
  private generateMigrationPlan(session: ModificationSession): any {
    return {
      phases: [
        {
          name: 'Schema Preparation',
          description: 'Prepare MongoDB collections based on approved schema',
          collections: session.currentSchema.map(c => c.name)
        },
        {
          name: 'Data Migration',
          description: 'Migrate data from PostgreSQL to MongoDB',
          collections: session.currentSchema.map(c => c.name)
        },
        {
          name: 'Validation & Testing',
          description: 'Validate migrated data and test functionality',
          collections: session.currentSchema.map(c => c.name)
        }
      ],
      estimatedDuration: '2-4 weeks',
      complexity: 'MEDIUM'
    };
  }

  /**
   * Generate final recommendations
   */
  private generateFinalRecommendations(session: ModificationSession): string[] {
    const recommendations = [
      'Implement proper indexing strategy based on query patterns',
      'Set up monitoring for MongoDB performance metrics',
      'Create backup and recovery procedures',
      'Document the new schema for team reference',
      'Plan for gradual migration with rollback capability'
    ];

    // Add session-specific recommendations
    if (session.modificationHistory.length > 3) {
      recommendations.push('Consider the multiple modifications made during design phase');
    }

    return recommendations;
  }

  /**
   * Save final migration document
   */
  private async saveFinalMigrationDocument(document: FinalMigrationDocument): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `final-migration-document-${timestamp}.md`;
    
    const content = this.generateFinalMigrationMarkdown(document);
    
    // Write to both central location and current project directory
    const { centralPath, projectPath } = DualLocationFileWriter.writeToBothLocations(filename, content);
    
    console.log(`📄 Final migration document saved: ${centralPath}`);
  }

  /**
   * Generate final migration markdown
   */
  private generateFinalMigrationMarkdown(document: FinalMigrationDocument): string {
    return `# Final Migration Document

**Document ID:** ${document.documentId}
**Generated:** ${document.generatedAt.toLocaleString()}
**Version:** ${document.version}

## 🎯 Approved Schema

This document contains the final, approved MongoDB schema after all modifications and reviews.

### Collection Count
- **Original PostgreSQL Tables:** ${document.modificationSummary.originalCollectionCount}
- **Final MongoDB Collections:** ${document.modificationSummary.finalCollectionCount}

## 📊 Modification Summary

- **Total Modifications:** ${document.modificationSummary.totalModifications}
- **Performance Impact:** ${document.modificationSummary.performanceImpact}
- **Complexity Change:** ${document.modificationSummary.complexityChange}

### Key Changes Made
${document.modificationSummary.keyChanges.map(change => `- ${change}`).join('\n')}

## 🚀 Migration Plan

${document.migrationPlan.phases.map((phase, index) => `
### Phase ${index + 1}: ${phase.name}
**Description:** ${phase.description}
**Collections:** ${phase.collections.join(', ')}
`).join('\n')}

**Estimated Duration:** ${document.migrationPlan.estimatedDuration}
**Complexity:** ${document.migrationPlan.complexity}

## 💡 Final Recommendations

${document.finalRecommendations.map(rec => `- ${rec}`).join('\n')}

## 📋 Next Steps

1. **Review this document** with your development team
2. **Set up MongoDB environment** with the approved schema
3. **Begin migration process** following the phases outlined above
4. **Monitor performance** and adjust as needed

---

*This document was generated by PeerAI MongoMigrator with interactive modification capabilities.*
`;
  }
}
