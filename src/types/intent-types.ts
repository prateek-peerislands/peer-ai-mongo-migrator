/**
 * Intent Types and Schemas for LLM-based Intent Mapping
 * This defines all possible intents the agent can understand
 */

export interface IntentResult {
  intent: string;
  confidence: number;
  entities: Record<string, any>;
  reasoning?: string;
  suggestedActions?: string[];
}

export interface IntentContext {
  previousIntents?: string[];
  conversationHistory?: string[];
  userPreferences?: Record<string, any>;
  currentDatabase?: string;
  currentOperation?: string;
}

// Core Intent Categories
export enum IntentCategory {
  DATABASE_OPERATIONS = 'database_operations',
  SCHEMA_ANALYSIS = 'schema_analysis',
  MIGRATION = 'migration',
  VISUALIZATION = 'visualization',
  GITHUB_INTEGRATION = 'github_integration',
  SYSTEM_STATUS = 'system_status',
  HELP_AND_GUIDANCE = 'help_guidance',
  CONFIGURATION = 'configuration'
}

// Specific Intent Types
export enum IntentType {
  // Database Operations
  POSTGRESQL_QUERY = 'postgresql_query',
  POSTGRESQL_SCHEMA_ANALYSIS = 'postgresql_schema_analysis',
  POSTGRESQL_TABLE_OPERATIONS = 'postgresql_table_operations',
  MONGODB_OPERATIONS = 'mongodb_operations',
  MONGODB_COLLECTION_OPERATIONS = 'mongodb_collection_operations',
  DATABASE_STATUS_CHECK = 'database_status_check',
  
  // Schema Analysis
  ER_DIAGRAM_GENERATION = 'er_diagram_generation',
  SCHEMA_DOCUMENTATION = 'schema_documentation',
  SCHEMA_COMPARISON = 'schema_comparison',
  MONGODB_SCHEMA_GENERATION = 'mongodb_schema_generation',
  
  // Migration
  MIGRATION_PLANNING = 'migration_planning',
  MIGRATION_ANALYSIS = 'migration_analysis',
  MIGRATION_EXECUTION = 'migration_execution',
  MIGRATION_DEPENDENCIES = 'migration_dependencies',
  
  // Visualization
  DIAGRAM_GENERATION = 'diagram_generation',
  DATA_VISUALIZATION = 'data_visualization',
  SCHEMA_VISUALIZATION = 'schema_visualization',
  
  // GitHub Integration
  GITHUB_REPOSITORY_ANALYSIS = 'github_repository_analysis',
  GITHUB_CODE_ANALYSIS = 'github_code_analysis',
  GITHUB_REPOSITORY_CLONING = 'github_repository_cloning',
  GITHUB_SCHEMA_EXTRACTION = 'github_schema_extraction',
  
  // System Status
  SYSTEM_HEALTH_CHECK = 'system_health_check',
  CONNECTION_STATUS = 'connection_status',
  SERVICE_STATUS = 'service_status',
  
  // Help and Guidance
  HELP_REQUEST = 'help_request',
  COMMAND_GUIDANCE = 'command_guidance',
  FEATURE_EXPLANATION = 'feature_explanation',
  TUTORIAL_REQUEST = 'tutorial_request',
  
  // Rationale Conversation
  RATIONALE_QUERY = 'rationale_query',
  DESIGN_DECISION_EXPLANATION = 'design_decision_explanation',
  SCHEMA_TRANSFORMATION_RATIONALE = 'schema_transformation_rationale',
  MIGRATION_RATIONALE = 'migration_rationale',
  EMBEDDING_RATIONALE = 'embedding_rationale',
  GROUPING_RATIONALE = 'grouping_rationale',
  
  // MongoDB Documentation
  MONGODB_DOCUMENTATION_QUERY = 'mongodb_documentation_query',
  MONGODB_BEST_PRACTICES = 'mongodb_best_practices',
  MONGODB_FEATURE_EXPLANATION = 'mongodb_feature_explanation',
  MONGODB_OFFICIAL_GUIDANCE = 'mongodb_official_guidance',
  
  // Configuration
  CREDENTIAL_SETUP = 'credential_setup',
  CONFIGURATION_CHANGE = 'configuration_change',
  SETTINGS_MANAGEMENT = 'settings_management',
  
  // Complex Multi-Step Operations
  COMPREHENSIVE_ANALYSIS = 'comprehensive_analysis',
  END_TO_END_MIGRATION = 'end_to_end_migration',
  BUSINESS_CONTEXT_ANALYSIS = 'business_context_analysis',
  
  // Fallback
  UNKNOWN_INTENT = 'unknown_intent',
  AMBIGUOUS_INTENT = 'ambiguous_intent'
}

// Intent Priority Levels
export enum IntentPriority {
  CRITICAL = 1,    // System status, errors
  HIGH = 2,        // Core operations
  MEDIUM = 3,      // Analysis, visualization
  LOW = 4,         // Help, configuration
  FALLBACK = 5     // Unknown, ambiguous
}

// Entity Types for Intent Recognition
export interface IntentEntities {
  // Database entities
  databases?: string[];
  tables?: string[];
  columns?: string[];
  collections?: string[];
  
  // Action entities
  actions?: string[];
  operations?: string[];
  
  // Target entities
  targets?: string[];
  outputs?: string[];
  
  // Modifier entities
  modifiers?: string[];
  qualifiers?: string[];
  
  // Context entities
  context?: string[];
  businessTerms?: string[];
  technicalTerms?: string[];
  
  // GitHub entities
  repositories?: string[];
  urls?: string[];
  branches?: string[];
  
  // Time and scope entities
  timeframes?: string[];
  scopes?: string[];
  priorities?: string[];
}

// Intent Configuration
export interface IntentConfig {
  type: IntentType;
  category: IntentCategory;
  priority: IntentPriority;
  confidenceThreshold: number;
  requiredEntities: string[];
  optionalEntities: string[];
  fallbackIntents: IntentType[];
  handler: string;
  description: string;
  examples: string[];
}

// LLM Prompt Templates
export interface IntentPromptTemplate {
  systemPrompt: string;
  userPromptTemplate: string;
  examples: Array<{
    input: string;
    output: IntentResult;
  }>;
}

// Intent Handler Interface
export interface IntentHandler {
  canHandle(intent: IntentResult): boolean;
  handle(intent: IntentResult, context: IntentContext): Promise<any>;
  getPriority(): IntentPriority;
}

// Intent Mapping Result
export interface IntentMappingResult {
  primaryIntent: IntentResult;
  alternativeIntents: IntentResult[];
  confidence: number;
  reasoning: string;
  suggestedNextSteps: string[];
  requiresConfirmation: boolean;
  estimatedComplexity: 'low' | 'medium' | 'high';
}
