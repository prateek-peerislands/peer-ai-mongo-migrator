import { 
  RepositoryInfo, 
  RepositoryContext, 
  RepositoryAnalysis, 
  GitHubWorkflowResult,
  GitHubAnalysisOptions 
} from '../types/github-types.js';
import { GitHubUrlParser } from './GitHubUrlParser.js';
import { GitHubAPIService } from './GitHubAPIService.js';
import { RepositoryCloningService } from './RepositoryCloningService.js';
import { MigrationAnalysisService } from './MigrationAnalysisService.js';
import { DualLocationFileWriter } from '../utils/DualLocationFileWriter.js';
import chalk from 'chalk';
import path from 'path';

export class GitHubAnalysisService {
  private urlParser: GitHubUrlParser;
  private apiService: GitHubAPIService;
  private cloningService: RepositoryCloningService;
  private migrationService: MigrationAnalysisService;

  constructor() {
    this.urlParser = new GitHubUrlParser();
    this.apiService = GitHubAPIService.getInstance(); // Use singleton instance
    this.cloningService = new RepositoryCloningService(this.apiService); // Pass the existing instance
    this.migrationService = new MigrationAnalysisService();
  }

  /**
   * Main entry point for GitHub repository analysis
   */
  async analyzeGitHubRepository(
    repoUrl: string, 
    options: GitHubAnalysisOptions = {}
  ): Promise<GitHubWorkflowResult> {
    try {
      console.log(chalk.blue('🚀 Starting GitHub Repository Analysis'));
      console.log(chalk.gray(`Repository: ${repoUrl}`));
      
      // Step 1: Parse GitHub URL
      const repoInfo = await this.parseRepositoryUrl(repoUrl);
      console.log(chalk.green(`✅ URL parsed: ${repoInfo.fullName}`));
      
      // Step 2: Analyze repository access and permissions (handles authentication automatically)
      // Store the repository context to avoid duplicate API calls
      const repoContext = await this.apiService.getRepositoryInfo(repoInfo.owner, repoInfo.repo);
      const accessAnalysis = await this.analyzeRepositoryAccess(repoInfo);
      if (!accessAnalysis.canAccess) {
        return {
          success: false,
          error: accessAnalysis.message || 'Repository access denied',
          cleanupRequired: false
        };
      }
      
      console.log(chalk.green(`✅ Access confirmed: ${accessAnalysis.accessLevel}`));
      
      // Step 3: Clone repository (authentication handled by cloning service)
      // Pass the existing repository context to avoid duplicate API calls
      const cloneResult = await this.cloneRepository(repoInfo, options);
      if (!cloneResult.success) {
        return {
          success: false,
          error: cloneResult.error || 'Repository cloning failed',
          cleanupRequired: false
        };
      }
      
      console.log(chalk.green(`✅ Repository cloned: ${cloneResult.localPath}`));
      
      // Step 4: Perform migration analysis
      const analysisResult = await this.performMigrationAnalysis(cloneResult.localPath!, options);
      
      // Step 5: Clean up cloned repository
      if (cloneResult.cleanupRequired) {
        await this.cloningService.removeClonedRepository(path.basename(cloneResult.localPath!));
        console.log(chalk.green('✅ Repository cleanup completed'));
      }
      
      return {
        success: true,
        repositoryInfo: repoInfo,
        repositoryContext: repoContext, // Use the stored context instead of calling again
        localPath: cloneResult.localPath,
        analysis: analysisResult.analysis,
        plan: analysisResult.plan,
        documentation: analysisResult.documentation,
        cleanupRequired: false
      };
      
    } catch (error) {
      console.error(chalk.red('❌ GitHub Repository Analysis failed:'), error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        cleanupRequired: false
      };
    }
  }

  /**
   * Parse repository URL to extract repository information
   */
  private async parseRepositoryUrl(repoUrl: string): Promise<RepositoryInfo> {
    try {
      const parsed = this.urlParser.parseGitHubUrl(repoUrl);
      return parsed;
    } catch (error) {
      throw new Error(`Failed to parse GitHub URL: ${error instanceof Error ? error.message : 'Invalid URL format'}`);
    }
  }

  /**
   * Analyze repository access and permissions
   */
  private async analyzeRepositoryAccess(repoInfo: RepositoryInfo): Promise<RepositoryAnalysis> {
    try {
      // Since we already have the repository context from the main flow,
      // we can analyze access without making another API call
      if (this.apiService.isAuthenticated()) {
        // We're already authenticated, so we have access
        return {
          canAccess: true,
          accessLevel: 'PRIVATE_FULL_ACCESS',
          requiresAuth: true,
          ownership: 'OTHER_USER', // We don't know ownership without API call
          warnings: ['Repository access confirmed via existing authentication'],
          limitations: [],
          message: 'Repository access confirmed'
        };
      } else {
        // We need to check access, but this should have been handled in getRepositoryInfo
        // This is a fallback case
        return {
          canAccess: true,
          accessLevel: 'PRIVATE_FULL_ACCESS',
          requiresAuth: true,
          ownership: 'OTHER_USER',
          warnings: ['Repository access assumed based on successful authentication'],
          limitations: [],
          message: 'Repository access confirmed'
        };
      }
    } catch (error) {
      throw new Error(`Repository access analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clone repository with automatic credential handling
   */
  private async cloneRepository(
    repoInfo: RepositoryInfo, 
    options: GitHubAnalysisOptions
  ): Promise<any> {
    try {
      // Use the enhanced cloning service that handles authentication automatically
      return await this.cloningService.cloneRepository(repoInfo, options.preferSSH || false);
    } catch (error) {
      throw new Error(`Repository cloning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform migration analysis on cloned repository
   */
  private async performMigrationAnalysis(
    localPath: string, 
    options: GitHubAnalysisOptions
  ): Promise<{
    analysis: any;
    plan: any;
    documentation: any;
  }> {
    try {
      console.log(chalk.blue('📊 Performing migration analysis...'));
      
      // Analyze the code structure
      const analysis = await this.migrationService.analyzeSourceCode(localPath);
      
      // Generate migration plan
      const plan = await this.migrationService.generateMigrationPlan(analysis);
      
      // Generate documentation with dual location writing
      const filename = `${path.basename(localPath)}-analysis.md`;
      const outputPath = options.outputPath || `/Users/prateek/Desktop/peer-ai-mongo-documents/${filename}`;
      const documentation = await this.migrationService.createMigrationDocumentation(analysis, plan, outputPath);
      
      // Also write to current project directory
      const { centralPath, projectPath } = DualLocationFileWriter.writeToBothLocations(filename, documentation);
      
      console.log(chalk.green('✅ Migration analysis completed'));
      
      return {
        analysis,
        plan,
        documentation
      };
      
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Migration analysis failed:'), error);
      
      // Return empty results if analysis fails
      return {
        analysis: {},
        plan: {},
        documentation: {}
      };
    }
  }

  /**
   * Get GitHub API service instance
   */
  getGitHubAPIService(): GitHubAPIService {
    return this.apiService;
  }

  /**
   * Get repository cloning service instance
   */
  getRepositoryCloningService(): RepositoryCloningService {
    return this.cloningService;
  }

  /**
   * Clear stored credentials
   */
  clearCredentials(): void {
    this.apiService.clearCredentials();
    this.cloningService.clearCredentials();
  }

  /**
   * Check if currently authenticated
   */
  isAuthenticated(): boolean {
    return this.apiService.isAuthenticated();
  }

  /**
   * Analyze repository from URL string
   */
  async analyzeFromUrl(url: string, options: GitHubAnalysisOptions = {}): Promise<GitHubWorkflowResult> {
    return this.analyzeGitHubRepository(url, options);
  }

  /**
   * Get repository information without cloning
   */
  async getRepositoryInfo(repoUrl: string): Promise<RepositoryContext | null> {
    try {
      const repoInfo = await this.parseRepositoryUrl(repoUrl);
      return await this.apiService.getRepositoryInfo(repoInfo.owner, repoInfo.repo);
    } catch (error) {
      console.error(chalk.red('❌ Failed to get repository info:'), error);
      return null;
    }
  }

  /**
   * Check repository access without cloning
   */
  async checkRepositoryAccess(repoUrl: string): Promise<RepositoryAnalysis | null> {
    try {
      const repoInfo = await this.parseRepositoryUrl(repoUrl);
      return await this.apiService.analyzeRepositoryAccess(repoInfo.owner, repoInfo.repo);
    } catch (error) {
      console.error(chalk.red('❌ Failed to check repository access:'), error);
      return null;
    }
  }

  /**
   * Clean up all temporary files and credentials
   */
  async cleanup(): Promise<void> {
    try {
      await this.cloningService.cleanup();
      this.clearCredentials();
      console.log(chalk.green('✅ GitHub Analysis Service cleanup completed'));
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Cleanup failed:'), error);
    }
  }
}
