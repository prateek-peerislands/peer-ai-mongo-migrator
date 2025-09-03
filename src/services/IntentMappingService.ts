/**
 * Intent Mapping Service - The Brain of the Agent
 * Orchestrates LLM-based intent classification with fallback to keyword matching
 */

import { LLMClient, LLMConfig } from './LLMClient.js';
import { 
  IntentResult, 
  IntentContext, 
  IntentMappingResult, 
  IntentType, 
  IntentPriority,
  IntentConfig 
} from '../types/intent-types.js';
import chalk from 'chalk';

export interface IntentMappingConfig {
  llmConfig: LLMConfig;
  fallbackEnabled: boolean;
  confidenceThreshold: number;
  maxRetries: number;
  cacheEnabled: boolean;
  debugMode: boolean;
}

export class IntentMappingService {
  private static instance: IntentMappingService | null = null;
  private llmClient: LLMClient;
  private config!: IntentMappingConfig;
  private initialized: boolean = false;
  private intentCache: Map<string, IntentMappingResult> = new Map();
  private conversationHistory: string[] = [];
  private previousIntents: string[] = [];

  private constructor() {
    this.llmClient = LLMClient.getInstance();
  }

  static getInstance(): IntentMappingService {
    if (!IntentMappingService.instance) {
      IntentMappingService.instance = new IntentMappingService();
    }
    return IntentMappingService.instance;
  }

  /**
   * Initialize the Intent Mapping Service
   */
  async initialize(config: IntentMappingConfig): Promise<void> {
    try {
      this.config = {
        ...config,
        fallbackEnabled: config.fallbackEnabled ?? true,
        confidenceThreshold: config.confidenceThreshold ?? 0.7,
        maxRetries: config.maxRetries ?? 3,
        cacheEnabled: config.cacheEnabled ?? true,
        debugMode: config.debugMode ?? false
      };

      // Initialize LLM Client
      await this.llmClient.initialize(this.config.llmConfig);
      
      // Test LLM connection
      const testResult = await this.llmClient.testConnection();
      if (!testResult.success) {
        console.warn('⚠️ LLM connection test failed, will rely on fallback methods');
      } else {
        console.log('✅ LLM connection test successful');
      }

      this.initialized = true;
      console.log('🧠 Intent Mapping Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Intent Mapping Service:', error);
      throw error;
    }
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized && this.llmClient.isInitialized();
  }

  /**
   * Map user input to intent using LLM with fallback
   */
  async mapIntent(
    userInput: string, 
    context?: Partial<IntentContext>
  ): Promise<IntentMappingResult> {
    if (!this.initialized) {
      throw new Error('Intent Mapping Service not initialized');
    }

    // Check cache first
    if (this.config.cacheEnabled) {
      const cached = this.intentCache.get(userInput.toLowerCase().trim());
      if (cached) {
        if (this.config.debugMode) {
          console.log(chalk.gray('📋 Using cached intent result'));
        }
        return cached;
      }
    }

    // Build context
    const fullContext: IntentContext = {
      previousIntents: this.previousIntents,
      conversationHistory: this.conversationHistory,
      ...context
    };

    let result: IntentMappingResult;

    try {
      // Try LLM-based intent classification first
      result = await this.classifyWithLLM(userInput, fullContext);
      
      if (result.primaryIntent.confidence >= this.config.confidenceThreshold) {
        if (this.config.debugMode) {
          console.log(chalk.green(`🧠 LLM Intent: ${result.primaryIntent.intent} (${Math.round(result.primaryIntent.confidence * 100)}%)`));
        }
      } else {
        // Low confidence, try fallback
        // COMMENTED OUT FOR TESTING - DISABLED FALLBACK
        // if (this.config.fallbackEnabled) {
        //   if (this.config.debugMode) {
        //     console.log(chalk.yellow(`⚠️ Low LLM confidence (${Math.round(result.primaryIntent.confidence * 100)}%), trying fallback`));
        //   }
        //   result = await this.classifyWithFallback(userInput, fullContext);
        // }
        if (this.config.debugMode) {
          console.log(chalk.yellow(`⚠️ Low LLM confidence (${Math.round(result.primaryIntent.confidence * 100)}%) - FALLBACK DISABLED FOR TESTING`));
        }
      }
    } catch (error) {
      console.error('❌ LLM classification failed:', error);
      
      // COMMENTED OUT FOR TESTING - DISABLED FALLBACK
      // if (this.config.fallbackEnabled) {
      //   if (this.config.debugMode) {
      //     console.log(chalk.yellow('🔄 Falling back to keyword matching'));
      //   }
      //   result = await this.classifyWithFallback(userInput, fullContext);
      // } else {
      //   throw error;
      // }
      
      // FOR TESTING: Throw error instead of using fallback
      if (this.config.debugMode) {
        console.log(chalk.red('🚫 FALLBACK DISABLED FOR TESTING - Throwing error instead'));
      }
      throw error;
    }

    // Update conversation history
    this.conversationHistory.push(userInput);
    this.previousIntents.push(result.primaryIntent.intent);
    
    // Keep history manageable
    if (this.conversationHistory.length > 10) {
      this.conversationHistory.shift();
    }
    if (this.previousIntents.length > 5) {
      this.previousIntents.shift();
    }

    // Cache result
    if (this.config.cacheEnabled) {
      this.intentCache.set(userInput.toLowerCase().trim(), result);
      
      // Limit cache size
      if (this.intentCache.size > 100) {
        const firstKey = this.intentCache.keys().next().value;
        if (firstKey) {
          this.intentCache.delete(firstKey);
        }
      }
    }

    return result;
  }

  /**
   * Classify intent using LLM
   */
  private async classifyWithLLM(
    userInput: string, 
    context: IntentContext
  ): Promise<IntentMappingResult> {
    const response = await this.llmClient.classifyIntent(userInput, context);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'LLM classification failed');
    }

    const intentResult: IntentResult = response.data;
    
    // Validate and normalize the result
    const normalizedResult = this.normalizeIntentResult(intentResult);
    
    return {
      primaryIntent: normalizedResult,
      alternativeIntents: [],
      confidence: normalizedResult.confidence,
      reasoning: normalizedResult.reasoning || 'LLM-based classification',
      suggestedNextSteps: normalizedResult.suggestedActions || [],
      requiresConfirmation: normalizedResult.confidence < 0.8,
      estimatedComplexity: this.estimateComplexity(normalizedResult)
    };
  }

  /**
   * Fallback classification using keyword matching
   */
  private async classifyWithFallback(
    userInput: string, 
    context: IntentContext
  ): Promise<IntentMappingResult> {
    const lowerInput = userInput.toLowerCase();
    
    // Define keyword patterns for each intent
    const intentPatterns = this.getIntentPatterns();
    
    let bestMatch: { intent: string; confidence: number; reasoning: string } = {
      intent: 'unknown_intent',
      confidence: 0.0,
      reasoning: 'No clear pattern match found'
    };

    // Check each intent pattern
    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      const matchScore = this.calculatePatternMatch(lowerInput, patterns);
      
      if (matchScore > bestMatch.confidence) {
        bestMatch = {
          intent,
          confidence: matchScore,
          reasoning: `Keyword pattern match: ${patterns.join(', ')}`
        };
      }
    }

    const intentResult: IntentResult = {
      intent: bestMatch.intent,
      confidence: bestMatch.confidence,
      entities: this.extractEntitiesFromInput(userInput),
      reasoning: bestMatch.reasoning,
      suggestedActions: this.getSuggestedActions(bestMatch.intent)
    };

    return {
      primaryIntent: intentResult,
      alternativeIntents: [],
      confidence: bestMatch.confidence,
      reasoning: `Fallback classification: ${bestMatch.reasoning}`,
      suggestedNextSteps: intentResult.suggestedActions || [],
      requiresConfirmation: bestMatch.confidence < 0.6,
      estimatedComplexity: this.estimateComplexity(intentResult)
    };
  }

  /**
   * Get keyword patterns for fallback classification
   */
  private getIntentPatterns(): Record<string, string[]> {
    return {
      // Database Operations
      'postgresql_query': ['postgres', 'postgresql', 'sql', 'query', 'select', 'insert', 'update', 'delete'],
      'postgresql_schema_analysis': ['analyze', 'postgres', 'schema', 'structure', 'tables', 'columns'],
      'mongodb_operations': ['mongo', 'mongodb', 'collection', 'document', 'find', 'aggregate'],
      'database_status_check': ['status', 'health', 'connection', 'working', 'alive'],
      
      // Schema Analysis
      'er_diagram_generation': ['er diagram', 'entity relationship', 'diagram', 'relationship', 'visualize'],
      'schema_documentation': ['documentation', 'document', 'schema', 'markdown', 'comprehensive'],
      'mongodb_schema_generation': ['mongo schema', 'convert', 'migrate', 'corresponding', 'equivalent'],
      
      // Migration
      'migration_planning': ['migration', 'plan', 'strategy', 'roadmap', 'dependencies'],
      'migration_analysis': ['analyze migration', 'migration analysis', 'dependencies', 'order'],
      
      // GitHub Integration
      'github_repository_analysis': ['github', 'repository', 'repo', 'analyze', 'clone'],
      'github_code_analysis': ['source code', 'code analysis', 'parse', 'extract'],
      
      // Help and Guidance
      'help_request': ['help', 'how to', 'what can', 'commands', 'guide'],
      'system_health_check': ['health', 'status', 'working', 'alive', 'check']
    };
  }

  /**
   * Calculate pattern match score
   */
  private calculatePatternMatch(input: string, patterns: string[]): number {
    let score = 0;
    let matches = 0;
    
    for (const pattern of patterns) {
      if (input.includes(pattern)) {
        matches++;
        score += 1 / patterns.length; // Normalize by pattern count
      }
    }
    
    // Boost score for multiple matches
    if (matches > 1) {
      score *= 1.2;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Extract entities from input for fallback
   */
  private extractEntitiesFromInput(input: string): Record<string, any> {
    const lowerInput = input.toLowerCase();
    
    return {
      databases: this.extractDatabases(lowerInput),
      actions: this.extractActions(lowerInput),
      targets: this.extractTargets(lowerInput),
      modifiers: this.extractModifiers(lowerInput)
    };
  }

  private extractDatabases(input: string): string[] {
    const databases = [];
    if (input.includes('postgres') || input.includes('postgresql')) databases.push('postgresql');
    if (input.includes('mongo')) databases.push('mongodb');
    if (input.includes('sql')) databases.push('sql');
    return databases;
  }

  private extractActions(input: string): string[] {
    const actions = [];
    const actionWords = ['analyze', 'create', 'generate', 'show', 'get', 'fetch', 'migrate', 'convert'];
    for (const action of actionWords) {
      if (input.includes(action)) actions.push(action);
    }
    return actions;
  }

  private extractTargets(input: string): string[] {
    const targets = [];
    const targetWords = ['schema', 'table', 'diagram', 'documentation', 'migration'];
    for (const target of targetWords) {
      if (input.includes(target)) targets.push(target);
    }
    return targets;
  }

  private extractModifiers(input: string): string[] {
    const modifiers = [];
    const modifierWords = ['comprehensive', 'detailed', 'simple', 'basic', 'complete'];
    for (const modifier of modifierWords) {
      if (input.includes(modifier)) modifiers.push(modifier);
    }
    return modifiers;
  }

  /**
   * Normalize intent result from LLM
   */
  private normalizeIntentResult(result: IntentResult): IntentResult {
    return {
      intent: result.intent || 'unknown_intent',
      confidence: Math.max(0, Math.min(1, result.confidence || 0)),
      entities: result.entities || {},
      reasoning: result.reasoning || 'No reasoning provided',
      suggestedActions: result.suggestedActions || []
    };
  }

  /**
   * Estimate complexity of intent
   */
  private estimateComplexity(intent: IntentResult): 'low' | 'medium' | 'high' {
    const highComplexityIntents = [
      'comprehensive_analysis',
      'end_to_end_migration',
      'business_context_analysis',
      'migration_planning'
    ];
    
    const mediumComplexityIntents = [
      'postgresql_schema_analysis',
      'mongodb_schema_generation',
      'github_repository_analysis',
      'migration_analysis'
    ];
    
    if (highComplexityIntents.includes(intent.intent)) {
      return 'high';
    } else if (mediumComplexityIntents.includes(intent.intent)) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Get suggested actions for intent
   */
  private getSuggestedActions(intent: string): string[] {
    const actionMap: Record<string, string[]> = {
      'postgresql_schema_analysis': ['Connect to PostgreSQL', 'Analyze schema structure', 'Generate documentation'],
      'mongodb_schema_generation': ['Analyze PostgreSQL schema', 'Generate MongoDB schema', 'Create migration plan'],
      'er_diagram_generation': ['Extract schema information', 'Generate Mermaid diagram', 'Create HTML visualization'],
      'migration_planning': ['Analyze source schema', 'Plan migration strategy', 'Generate migration roadmap'],
      'github_repository_analysis': ['Clone repository', 'Analyze code structure', 'Extract schema information']
    };
    
    return actionMap[intent] || ['Process request', 'Provide assistance'];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
    this.previousIntents = [];
    this.intentCache.clear();
    console.log('🧹 Intent mapping history cleared');
  }

  /**
   * Get service status
   */
  getStatus(): {
    initialized: boolean;
    llmAvailable: boolean;
    cacheSize: number;
    conversationLength: number;
    config: Partial<IntentMappingConfig>;
  } {
    return {
      initialized: this.initialized,
      llmAvailable: this.llmClient.isInitialized(),
      cacheSize: this.intentCache.size,
      conversationLength: this.conversationHistory.length,
      config: {
        fallbackEnabled: this.config?.fallbackEnabled,
        confidenceThreshold: this.config?.confidenceThreshold,
        cacheEnabled: this.config?.cacheEnabled,
        debugMode: this.config?.debugMode
      }
    };
  }
}
