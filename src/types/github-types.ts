// GitHub-specific types and interfaces

export interface GitHubConfig {
  token?: string;
  username?: string;
  apiUrl?: string;
  tempDir?: string;
}

export interface RepositoryInfo {
  owner: string;
  repo: string;
  branch?: string;
  fullName: string;
  url: string;
  cloneUrl: string;
  sshUrl: string;
}

export interface RepositoryContext {
  isOwnedByUser: boolean;
  isPublic: boolean;
  isPrivate: boolean;
  isFork: boolean;
  originalOwner?: string;
  license?: GitHubLicense;
  lastUpdated: string;
  stars: number;
  forks: number;
  language: string;
  size: number;
  description?: string;
  defaultBranch: string;
}

export interface GitHubLicense {
  key: string;
  name: string;
  spdx_id: string;
  url: string;
}

export interface RepositoryAnalysis {
  canAccess: boolean;
  accessLevel: 'PUBLIC_READ_ONLY' | 'PRIVATE_FULL_ACCESS' | 'PRIVATE_NO_ACCESS';
  requiresAuth: boolean;
  ownership: 'OWN' | 'OTHER_USER' | 'ORGANIZATION';
  warnings: string[];
  limitations: string[];
  message?: string;
}

export interface GitHubAuthenticationResult {
  valid: boolean;
  user: GitHubUser | null;
  message: string;
}

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name?: string;
  email?: string;
}

export interface CloneResult {
  success: boolean;
  localPath?: string;
  error?: string;
  message?: string;
  cleanupRequired: boolean;
}

export interface GitHubAnalysisOptions {
  branch?: string;
  outputPath?: string;
  tempDir?: string;
  includeHistory?: boolean;
  maxFileSize?: number;
  preferSSH?: boolean;
}

export interface GitHubWorkflowResult {
  success: boolean;
  repositoryInfo?: RepositoryInfo;
  repositoryContext?: RepositoryContext;
  localPath?: string;
  analysis?: any;
  plan?: any;
  documentation?: any;
  error?: string;
  cleanupRequired: boolean;
}
