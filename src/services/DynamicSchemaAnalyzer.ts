import { TableSchema, CollectionSchema } from '../types/index.js';
import { MongoDBCollectionSchema } from './MongoDBSchemaGenerator.js';

export interface DynamicSchemaAnalysis {
  databaseType: 'postgresql' | 'mongodb' | 'migration';
  entityCount: number;
  entityNames: string[];
  relationshipCount: number;
  businessDomain: string;
  complexityLevel: 'low' | 'medium' | 'high' | 'enterprise';
  patterns: {
    hasUserManagement: boolean;
    hasOrderManagement: boolean;
    hasMediaManagement: boolean;
    hasFinancialManagement: boolean;
    hasInventoryManagement: boolean;
    hasGeographicData: boolean;
    hasTemporalData: boolean;
    hasHierarchicalData: boolean;
  };
  recommendations: string[];
}

export class DynamicSchemaAnalyzer {
  
  /**
   * Analyze PostgreSQL schema dynamically
   */
  analyzePostgreSQLSchema(tables: TableSchema[]): DynamicSchemaAnalysis {
    const entityNames = tables.map(t => t.name.toLowerCase());
    const relationships = this.extractRelationships(tables);
    
    return {
      databaseType: 'postgresql',
      entityCount: tables.length,
      entityNames,
      relationshipCount: relationships.length,
      businessDomain: this.inferBusinessDomain(entityNames),
      complexityLevel: this.assessComplexity(tables, relationships),
      patterns: this.analyzePatterns(entityNames, tables),
      recommendations: this.generateRecommendations(tables, relationships)
    };
  }

  /**
   * Analyze MongoDB schema dynamically
   */
  analyzeMongoDBSchema(collections: MongoDBCollectionSchema[]): DynamicSchemaAnalysis {
    const entityNames = collections.map(c => c.name.toLowerCase());
    const relationships = this.extractMongoDBRelationships(collections);
    
    return {
      databaseType: 'mongodb',
      entityCount: collections.length,
      entityNames,
      relationshipCount: relationships.length,
      businessDomain: this.inferBusinessDomain(entityNames),
      complexityLevel: this.assessMongoDBComplexity(collections, relationships),
      patterns: this.analyzeMongoDBPatterns(entityNames, collections),
      recommendations: this.generateMongoDBRecommendations(collections, relationships)
    };
  }

  /**
   * Analyze migration schema dynamically
   */
  analyzeMigrationSchema(entities: any[], phases: any[]): DynamicSchemaAnalysis {
    const entityNames = entities.map(e => e.name?.toLowerCase() || e.fileName?.toLowerCase() || 'unknown');
    const totalCollections = phases.reduce((sum, phase) => sum + phase.tables.length, 0);
    
    return {
      databaseType: 'migration',
      entityCount: totalCollections,
      entityNames,
      relationshipCount: phases.reduce((sum, phase) => 
        sum + phase.tables.reduce((phaseSum: number, table: any) => 
          phaseSum + (table.dependencies?.length || 0), 0), 0),
      businessDomain: this.inferBusinessDomain(entityNames),
      complexityLevel: this.assessMigrationComplexity(entities, phases),
      patterns: this.analyzeMigrationPatterns(entityNames, entities, phases),
      recommendations: this.generateMigrationRecommendations(entities, phases)
    };
  }

  /**
   * Infer business domain from entity names
   */
  private inferBusinessDomain(entityNames: string[]): string {
    const patterns = {
      'user management': ['user', 'customer', 'client', 'account', 'profile', 'member'],
      'e-commerce': ['order', 'product', 'cart', 'payment', 'invoice', 'shipping'],
      'media': ['film', 'movie', 'video', 'audio', 'media', 'content', 'actor', 'director'],
      'financial': ['transaction', 'payment', 'invoice', 'billing', 'account', 'wallet'],
      'inventory': ['inventory', 'stock', 'warehouse', 'product', 'item', 'supply'],
      'geographic': ['address', 'location', 'city', 'country', 'region', 'state'],
      'temporal': ['event', 'schedule', 'appointment', 'booking', 'reservation'],
      'educational': ['student', 'course', 'teacher', 'class', 'lesson', 'grade'],
      'healthcare': ['patient', 'doctor', 'appointment', 'medical', 'health', 'treatment'],
      'real estate': ['property', 'house', 'apartment', 'rental', 'lease', 'tenant']
    };

    const scores: { [key: string]: number } = {};
    
    for (const [domain, keywords] of Object.entries(patterns)) {
      scores[domain] = 0;
      for (const entityName of entityNames) {
        for (const keyword of keywords) {
          if (entityName.includes(keyword)) {
            scores[domain]++;
          }
        }
      }
    }

    const bestMatch = Object.entries(scores).reduce((a, b) => scores[a[0]] > scores[b[0]] ? a : b);
    
    if (bestMatch[1] > 0) {
      return bestMatch[0];
    }

    // Fallback to generic business operations
    return 'general business operations and data management';
  }

  /**
   * Assess complexity level
   */
  private assessComplexity(tables: TableSchema[], relationships: any[]): 'low' | 'medium' | 'high' | 'enterprise' {
    const tableCount = tables.length;
    const relationshipCount = relationships.length;
    const avgColumnsPerTable = tables.reduce((sum, t) => sum + t.columns.length, 0) / tableCount;
    const foreignKeyCount = tables.reduce((sum, t) => sum + (t.foreignKeys?.length || 0), 0);

    let complexityScore = 0;
    
    if (tableCount > 50) complexityScore += 3;
    else if (tableCount > 20) complexityScore += 2;
    else if (tableCount > 10) complexityScore += 1;

    if (relationshipCount > 30) complexityScore += 3;
    else if (relationshipCount > 15) complexityScore += 2;
    else if (relationshipCount > 5) complexityScore += 1;

    if (avgColumnsPerTable > 15) complexityScore += 2;
    else if (avgColumnsPerTable > 8) complexityScore += 1;

    if (foreignKeyCount > 20) complexityScore += 2;
    else if (foreignKeyCount > 10) complexityScore += 1;

    if (complexityScore >= 8) return 'enterprise';
    if (complexityScore >= 5) return 'high';
    if (complexityScore >= 3) return 'medium';
    return 'low';
  }

  /**
   * Assess MongoDB complexity
   */
  private assessMongoDBComplexity(collections: MongoDBCollectionSchema[], relationships: any[]): 'low' | 'medium' | 'high' | 'enterprise' {
    const collectionCount = collections.length;
    const embeddedDocCount = collections.reduce((sum, c) => sum + (c.embeddedDocuments?.length || 0), 0);
    const referenceCount = collections.reduce((sum, c) => sum + (c.references?.length || 0), 0);
    const avgFieldsPerCollection = collections.reduce((sum, c) => sum + c.fields.length, 0) / collectionCount;

    let complexityScore = 0;
    
    if (collectionCount > 30) complexityScore += 3;
    else if (collectionCount > 15) complexityScore += 2;
    else if (collectionCount > 5) complexityScore += 1;

    if (embeddedDocCount > 20) complexityScore += 2;
    else if (embeddedDocCount > 10) complexityScore += 1;

    if (referenceCount > 15) complexityScore += 2;
    else if (referenceCount > 5) complexityScore += 1;

    if (avgFieldsPerCollection > 20) complexityScore += 2;
    else if (avgFieldsPerCollection > 10) complexityScore += 1;

    if (complexityScore >= 7) return 'enterprise';
    if (complexityScore >= 4) return 'high';
    if (complexityScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * Assess migration complexity
   */
  private assessMigrationComplexity(entities: any[], phases: any[]): 'low' | 'medium' | 'high' | 'enterprise' {
    const entityCount = entities.length;
    const phaseCount = phases.length;
    const totalTables = phases.reduce((sum, phase) => sum + phase.tables.length, 0);
    const dependencyCount = phases.reduce((sum, phase) => 
      sum + phase.tables.reduce((phaseSum: number, table: any) => 
        phaseSum + (table.dependencies?.length || 0), 0), 0);

    let complexityScore = 0;
    
    if (entityCount > 30) complexityScore += 3;
    else if (entityCount > 15) complexityScore += 2;
    else if (entityCount > 5) complexityScore += 1;

    if (phaseCount > 5) complexityScore += 2;
    else if (phaseCount > 3) complexityScore += 1;

    if (totalTables > 25) complexityScore += 2;
    else if (totalTables > 10) complexityScore += 1;

    if (dependencyCount > 20) complexityScore += 2;
    else if (dependencyCount > 10) complexityScore += 1;

    if (complexityScore >= 7) return 'enterprise';
    if (complexityScore >= 4) return 'high';
    if (complexityScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * Analyze patterns in entity names
   */
  private analyzePatterns(entityNames: string[], tables: TableSchema[]): DynamicSchemaAnalysis['patterns'] {
    const patterns = {
      hasUserManagement: false,
      hasOrderManagement: false,
      hasMediaManagement: false,
      hasFinancialManagement: false,
      hasInventoryManagement: false,
      hasGeographicData: false,
      hasTemporalData: false,
      hasHierarchicalData: false
    };

    // Check for user management patterns
    patterns.hasUserManagement = entityNames.some(name => 
      ['user', 'customer', 'client', 'account', 'profile', 'member', 'staff', 'employee'].some(keyword => 
        name.includes(keyword)));

    // Check for order management patterns
    patterns.hasOrderManagement = entityNames.some(name => 
      ['order', 'cart', 'purchase', 'sale', 'transaction'].some(keyword => 
        name.includes(keyword)));

    // Check for media management patterns
    patterns.hasMediaManagement = entityNames.some(name => 
      ['film', 'movie', 'video', 'audio', 'media', 'content', 'actor', 'director', 'artist'].some(keyword => 
        name.includes(keyword)));

    // Check for financial management patterns
    patterns.hasFinancialManagement = entityNames.some(name => 
      ['payment', 'invoice', 'billing', 'wallet', 'financial', 'money', 'currency'].some(keyword => 
        name.includes(keyword)));

    // Check for inventory management patterns
    patterns.hasInventoryManagement = entityNames.some(name => 
      ['inventory', 'stock', 'warehouse', 'product', 'item', 'supply', 'goods'].some(keyword => 
        name.includes(keyword)));

    // Check for geographic data patterns
    patterns.hasGeographicData = entityNames.some(name => 
      ['address', 'location', 'city', 'country', 'region', 'state', 'province', 'zip'].some(keyword => 
        name.includes(keyword)));

    // Check for temporal data patterns
    patterns.hasTemporalData = entityNames.some(name => 
      ['event', 'schedule', 'appointment', 'booking', 'reservation', 'time', 'date'].some(keyword => 
        name.includes(keyword)));

    // Check for hierarchical data patterns
    patterns.hasHierarchicalData = tables.some(table => 
      table.foreignKeys?.some(fk => fk.referencedTable === table.name));

    return patterns;
  }

  /**
   * Analyze MongoDB patterns
   */
  private analyzeMongoDBPatterns(entityNames: string[], collections: MongoDBCollectionSchema[]): DynamicSchemaAnalysis['patterns'] {
    const patterns = this.analyzePatterns(entityNames, []);
    
    // Additional MongoDB-specific pattern analysis
    const hasEmbeddedDocs = collections.some(c => c.embeddedDocuments && c.embeddedDocuments.length > 0);
    const hasReferences = collections.some(c => c.references && c.references.length > 0);
    
    // Update patterns based on MongoDB-specific features
    if (hasEmbeddedDocs) {
      patterns.hasHierarchicalData = true;
    }

    return patterns;
  }

  /**
   * Analyze migration patterns
   */
  private analyzeMigrationPatterns(entityNames: string[], entities: any[], phases: any[]): DynamicSchemaAnalysis['patterns'] {
    const patterns = this.analyzePatterns(entityNames, []);
    
    // Additional migration-specific pattern analysis
    const hasComplexDependencies = phases.some(phase => 
      phase.tables.some((table: any) => table.dependencies && table.dependencies.length > 2));
    
    if (hasComplexDependencies) {
      patterns.hasHierarchicalData = true;
    }

    return patterns;
  }

  /**
   * Extract relationships from PostgreSQL tables
   */
  private extractRelationships(tables: TableSchema[]): any[] {
    const relationships: any[] = [];
    
    for (const table of tables) {
      if (table.foreignKeys) {
        for (const fk of table.foreignKeys) {
          relationships.push({
            sourceTable: table.name,
            targetTable: fk.referencedTable,
            sourceColumn: fk.column,
            targetColumn: fk.referencedColumn,
            constraintName: (fk as any).constraintName || 'fk_constraint'
          });
        }
      }
    }
    
    return relationships;
  }

  /**
   * Extract relationships from MongoDB collections
   */
  private extractMongoDBRelationships(collections: MongoDBCollectionSchema[]): any[] {
    const relationships: any[] = [];
    
    for (const collection of collections) {
      if (collection.references) {
        for (const ref of collection.references) {
          relationships.push({
            sourceCollection: collection.name,
            targetCollection: ref.collection,
            sourceField: ref.field,
            targetField: '_id'
          });
        }
      }
    }
    
    return relationships;
  }

  /**
   * Generate recommendations for PostgreSQL
   */
  private generateRecommendations(tables: TableSchema[], relationships: any[]): string[] {
    const recommendations: string[] = [];
    
    if (tables.length > 20) {
      recommendations.push('Consider database partitioning for large table sets');
    }
    
    if (relationships.length > 15) {
      recommendations.push('Review foreign key constraints for performance optimization');
    }
    
    const tablesWithoutIndexes = tables.filter(t => !(t as any).indexes || (t as any).indexes.length === 0);
    if (tablesWithoutIndexes.length > 0) {
      recommendations.push(`Add indexes to ${tablesWithoutIndexes.length} tables for better query performance`);
    }
    
    return recommendations;
  }

  /**
   * Generate recommendations for MongoDB
   */
  private generateMongoDBRecommendations(collections: MongoDBCollectionSchema[], relationships: any[]): string[] {
    const recommendations: string[] = [];
    
    if (collections.length > 15) {
      recommendations.push('Consider sharding strategy for large collection sets');
    }
    
    const collectionsWithoutIndexes = collections.filter(c => !c.indexes || c.indexes.length === 0);
    if (collectionsWithoutIndexes.length > 0) {
      recommendations.push(`Add indexes to ${collectionsWithoutIndexes.length} collections for better query performance`);
    }
    
    const embeddedDocCount = collections.reduce((sum, c) => sum + (c.embeddedDocuments?.length || 0), 0);
    if (embeddedDocCount > 10) {
      recommendations.push('Review embedded document sizes to avoid 16MB document limit');
    }
    
    return recommendations;
  }

  /**
   * Generate recommendations for migration
   */
  private generateMigrationRecommendations(entities: any[], phases: any[]): string[] {
    const recommendations: string[] = [];
    
    if (phases.length > 4) {
      recommendations.push('Consider consolidating migration phases to reduce complexity');
    }
    
    const totalTables = phases.reduce((sum, phase) => sum + phase.tables.length, 0);
    if (totalTables > 20) {
      recommendations.push('Implement parallel migration strategies for large table sets');
    }
    
    const complexPhases = phases.filter(phase => 
      phase.tables.some((table: any) => table.dependencies && table.dependencies.length > 2));
    
    if (complexPhases.length > 0) {
      recommendations.push(`Review dependencies in ${complexPhases.length} phases to optimize migration order`);
    }
    
    return recommendations;
  }
}
