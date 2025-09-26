export interface ModificationRequest {
  id: string;
  timestamp: Date;
  originalSchema: any; // MongoDBCollectionSchema[]
  modificationDescription: string;
  developerNotes?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REJECTED';
}

export interface ModificationResponse {
  success: boolean;
  modifiedSchema: any; // MongoDBCollectionSchema[]
  changes: SchemaChange[];
  reasoning: string;
  warnings: string[];
  recommendations: string[];
  error?: string;
}

export interface SchemaChange {
  type: 'EMBED' | 'REFERENCE' | 'SPLIT' | 'MERGE' | 'RENAME' | 'ADD_FIELD' | 'REMOVE_FIELD' | 'MODIFY_FIELD';
  targetCollection: string;
  description: string;
  before: any;
  after: any;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  reasoning: string;
}

export interface ModificationSession {
  sessionId: string;
  startTime: Date;
  originalSchema: any;
  currentSchema: any;
  modificationHistory: ModificationRequest[];
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  finalApproval?: boolean;
}

export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  deploymentName: string;
  apiVersion: string;
}

export interface ModificationContext {
  originalPostgreSQLSchema: any;
  currentMongoDBSchema: any;
  modificationHistory: ModificationRequest[];
  businessRequirements?: string[];
  performanceConstraints?: string[];
  dataVolume?: number;
}

export interface IntelligentModificationSuggestion {
  suggestion: string;
  reasoning: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  benefits: string[];
  risks: string[];
  implementation: string;
}

export interface FinalMigrationDocument {
  documentId: string;
  generatedAt: Date;
  approvedSchema: any;
  modificationSummary: ModificationSummary;
  migrationPlan: any;
  finalRecommendations: string[];
  version: string;
}

export interface ModificationSummary {
  totalModifications: number;
  modificationsByType: { [key: string]: number };
  finalCollectionCount: number;
  originalCollectionCount: number;
  performanceImpact: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  complexityChange: 'SIMPLIFIED' | 'UNCHANGED' | 'INCREASED';
  keyChanges: string[];
}
