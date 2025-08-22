import simpleGit, { SimpleGit } from 'simple-git';
import fs from 'fs-extra';
import path from 'path';
import { RepositoryInfo, CloneResult } from '../types/github-types.js';
import { GitHubAPIService } from './GitHubAPIService.js';
import chalk from 'chalk';

interface CloneError extends Error {
  localPath?: string;
}

export class RepositoryCloningService {
  private tempDir: string;
  private githubService: GitHubAPIService;

  constructor(githubService: GitHubAPIService, tempDir: string = './temp-github-repos') {
    this.githubService = githubService; // Use the passed instance instead of creating new one
    this.tempDir = tempDir;
    this.ensureTempDir();
  }

  /**
   * Ensure temporary directory exists
   */
  private ensureTempDir(): void {
    try {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
    } catch (error) {
      console.error('❌ Failed to create temp directory:', error);
    }
  }

  /**
   * Clone repository to temporary directory with automatic credential handling
   */
  async cloneRepository(
    repoInfo: RepositoryInfo, 
    preferSSH: boolean = false
  ): Promise<CloneResult> {
    try {
      console.log(`📥 Cloning repository: ${repoInfo.fullName}`);
      
      // Check repository access and handle authentication if needed
      await this.validateRepositoryAccess(repoInfo);
      
      // Create unique temporary directory for this clone
      const timestamp = Date.now();
      const cloneDir = path.join(this.tempDir, `${repoInfo.owner}-${repoInfo.repo}-${timestamp}`);
      
      // Ensure the clone directory doesn't exist
      if (fs.existsSync(cloneDir)) {
        fs.removeSync(cloneDir);
      }
      
      // Create the clone directory
      fs.mkdirSync(cloneDir, { recursive: true });
      
      // Choose clone URL based on preference
      const cloneUrl = preferSSH ? repoInfo.sshUrl : repoInfo.cloneUrl;
      console.log(`🔗 Using clone URL: ${cloneUrl}`);
      
      // Initialize git in the clone directory
      const git: SimpleGit = simpleGit(cloneDir);
      
      // Clone the repository
      console.log('⏳ Cloning repository...');
      await git.clone(cloneUrl, '.');
      
      // Checkout specific branch if specified
      if (repoInfo.branch && repoInfo.branch !== 'main') {
        try {
          console.log(`🌿 Checking out branch: ${repoInfo.branch}`);
          await git.checkout(repoInfo.branch);
        } catch (error) {
          console.warn(`⚠️  Could not checkout branch ${repoInfo.branch}, using default branch`);
          // Try to get the default branch
          try {
            const defaultBranch = await git.branch();
            console.log(`🌿 Using default branch: ${defaultBranch.current}`);
          } catch (branchError) {
            console.warn('⚠️  Could not determine branch information');
          }
        }
      }
      
      // Verify the clone was successful
      const files = fs.readdirSync(cloneDir);
      console.log(`📁 Directory contents: ${files.join(', ')}`);
      
      if (files.length === 0) {
        throw new Error('Repository clone directory is empty');
      }
      
      if (!fs.existsSync(path.join(cloneDir, '.git'))) {
        console.log('⚠️  No .git directory found, but files exist - proceeding with analysis');
      }
      
      console.log(`✅ Repository cloned successfully to: ${cloneDir}`);
      console.log(`📁 Files found: ${files.length}`);
      
      return {
        success: true,
        localPath: cloneDir,
        message: 'Repository cloned successfully',
        cleanupRequired: true
      };
      
    } catch (error) {
      const cloneError = error as CloneError;
      console.error('❌ Repository cloning failed:', error);
      
      // Clean up failed clone directory if it exists
      if (cloneError.localPath && fs.existsSync(cloneError.localPath)) {
        try {
          fs.removeSync(cloneError.localPath);
          console.log('🧹 Cleaned up failed clone directory');
        } catch (cleanupError) {
          console.warn('⚠️  Failed to clean up clone directory:', cleanupError);
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Repository cloning failed',
        cleanupRequired: false
      };
    }
  }

  /**
   * Validate repository access and handle authentication
   */
  private async validateRepositoryAccess(repoInfo: RepositoryInfo): Promise<void> {
    try {
      console.log(chalk.gray(`🔍 Validating access to repository: ${repoInfo.owner}/${repoInfo.repo}`));
      
      // Check if we already have an authenticated connection
      if (this.githubService.isAuthenticated()) {
        console.log(chalk.gray('✅ Using existing authenticated connection'));
        console.log(chalk.gray(`🔒 Private repository confirmed. Authentication required.`));
        // No need to call getRepositoryInfo again - we already have access
      } else {
        // Only call getRepositoryInfo if we don't have authentication yet
        console.log(chalk.gray('🔍 Checking repository access and handling authentication...'));
        const repoContext = await this.githubService.getRepositoryInfo(repoInfo.owner, repoInfo.repo);
        
        if (repoContext.isPrivate) {
          console.log(chalk.gray(`🔒 Private repository detected. Authentication required.`));
        } else {
          console.log(chalk.gray(`🌐 Public repository detected. No authentication required.`));
        }
      }
      
      console.log(chalk.green(`✅ Repository access validated successfully`));
      
    } catch (error) {
      throw new Error(`Repository access validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get GitHub service instance for external use
   */
  getGitHubService(): GitHubAPIService {
    return this.githubService;
  }

  /**
   * Clean up stored credentials
   */
  clearCredentials(): void {
    this.githubService.clearCredentials();
  }

  /**
   * Check if currently authenticated
   */
  isAuthenticated(): boolean {
    return this.githubService.isAuthenticated();
  }

  /**
   * Clone repository from URL string with automatic parsing
   */
  async cloneFromUrl(
    url: string, 
    branch?: string, 
    preferSSH: boolean = false
  ): Promise<CloneResult> {
    try {
      // Parse the GitHub URL
      const repoInfo = this.parseGitHubUrl(url);
      if (branch) {
        repoInfo.branch = branch;
      }
      
      return await this.cloneRepository(repoInfo, preferSSH);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse GitHub URL',
        message: 'URL parsing failed',
        cleanupRequired: false
      };
    }
  }

  /**
   * Parse GitHub URL to extract repository information
   */
  private parseGitHubUrl(url: string): RepositoryInfo {
    // Remove trailing slash but keep .git extension for now
    const cleanUrl = url.replace(/\/$/, '');
    
    console.log(chalk.gray(`🔍 Parsing GitHub URL: ${url}`));
    console.log(chalk.gray(`🔍 Cleaned URL: ${cleanUrl}`));
    
    // Extract owner and repo from various GitHub URL formats
    let owner: string;
    let repo: string;
    
    if (cleanUrl.includes('github.com')) {
      // https://github.com/owner/repo or https://github.com/owner/repo.git
      const parts = cleanUrl.split('github.com/');
      if (parts.length !== 2) {
        throw new Error('Invalid GitHub URL format');
      }
      
      const pathParts = parts[1].split('/');
      if (pathParts.length < 2) {
        throw new Error('Invalid GitHub URL: missing owner or repository name');
      }
      
      owner = pathParts[0];
      repo = pathParts[1].replace('.git', ''); // Remove .git extension from repo name
      
      console.log(chalk.gray(`🔍 Extracted: owner=${owner}, repo=${repo}`));
    } else if (cleanUrl.includes('@')) {
      // git@github.com:owner/repo.git
      const parts = cleanUrl.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid SSH GitHub URL format');
      }
      
      const pathParts = parts[1].split('/');
      if (pathParts.length < 2) {
        throw new Error('Invalid SSH GitHub URL: missing owner or repository name');
      }
      
      owner = pathParts[0];
      repo = pathParts[1].replace('.git', '');
      
      console.log(chalk.gray(`🔍 Extracted: owner=${owner}, repo=${repo}`));
    } else {
      throw new Error('Unsupported GitHub URL format');
    }
    
    const fullName = `${owner}/${repo}`;
    const httpsUrl = `https://github.com/${fullName}.git`;
    const sshUrl = `git@github.com:${fullName}.git`;
    
    console.log(chalk.gray(`🔍 Generated URLs:`));
    console.log(chalk.gray(`  HTTPS: ${httpsUrl}`));
    console.log(chalk.gray(`  SSH: ${sshUrl}`));
    
    return {
      owner,
      repo,
      fullName,
      url: `https://github.com/${fullName}`,
      cloneUrl: httpsUrl,
      sshUrl: sshUrl
    };
  }

  /**
   * Clean up temporary directory
   */
  async cleanup(): Promise<void> {
    try {
      if (fs.existsSync(this.tempDir)) {
        await fs.remove(this.tempDir);
        console.log(`🧹 Cleaned up temporary directory: ${this.tempDir}`);
      }
    } catch (error) {
      console.warn('⚠️  Failed to clean up temporary directory:', error);
    }
  }

  /**
   * Get temporary directory path
   */
  getTempDir(): string {
    return this.tempDir;
  }

  /**
   * List all cloned repositories
   */
  listClonedRepositories(): string[] {
    try {
      if (!fs.existsSync(this.tempDir)) {
        return [];
      }
      
      const items = fs.readdirSync(this.tempDir);
      return items.filter(item => {
        const itemPath = path.join(this.tempDir, item);
        return fs.statSync(itemPath).isDirectory() && fs.existsSync(path.join(itemPath, '.git'));
      });
    } catch (error) {
      console.warn('⚠️  Failed to list cloned repositories:', error);
      return [];
    }
  }

  /**
   * Remove specific cloned repository
   */
  async removeClonedRepository(repoName: string): Promise<boolean> {
    try {
      const repoPath = path.join(this.tempDir, repoName);
      if (fs.existsSync(repoPath)) {
        await fs.remove(repoPath);
        console.log(`🗑️  Removed cloned repository: ${repoName}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Failed to remove cloned repository ${repoName}:`, error);
      return false;
    }
  }
}
