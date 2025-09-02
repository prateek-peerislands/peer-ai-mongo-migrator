import { Octokit } from '@octokit/rest';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { 
  RepositoryContext, 
  RepositoryAnalysis, 
  GitHubAuthenticationResult, 
  GitHubUser,
  GitHubLicense 
} from '../types/github-types.js';

interface GitHubError {
  status?: number;
  message: string;
}

interface GitHubCredentials {
  username: string;
  token: string;
}

export class GitHubAPIService {
  private static instance: GitHubAPIService | null = null;
  private static sharedOctokit: Octokit | null = null;
  private static sharedCurrentUser: GitHubUser | null = null;
  private static sharedCredentials: GitHubCredentials | null = null;
  private static isPromptingCredentials: boolean = false; // Prevent multiple simultaneous prompts
  private static credentialPromise: Promise<GitHubCredentials> | null = null; // Store the promise to reuse

  private octokit: Octokit | null = null;
  private currentUser: GitHubUser | null = null;
  private credentials: GitHubCredentials | null = null;

  constructor() {
    // Use shared static state for authentication
    this.octokit = GitHubAPIService.sharedOctokit;
    this.currentUser = GitHubAPIService.sharedCurrentUser;
    this.credentials = GitHubAPIService.sharedCredentials;
  }

  /**
   * Get singleton instance (optional, for explicit singleton usage)
   */
  public static getInstance(): GitHubAPIService {
    if (!GitHubAPIService.instance) {
      GitHubAPIService.instance = new GitHubAPIService();
    }
    return GitHubAPIService.instance;
  }

  /**
   * Interactive credential prompt for private repositories
   */
  private async promptForCredentials(): Promise<GitHubCredentials> {
    const promptId = Math.random().toString(36).substr(2, 9);
    console.log(chalk.gray(`🔍 promptForCredentials called - Instance: ${this.constructor.name} [ID: ${promptId}]`));
    
    // If we already have credentials, don't prompt again
    if (this.credentials || GitHubAPIService.sharedCredentials) {
      console.log(chalk.gray(`📡 Using existing credentials... [ID: ${promptId}]`));
      return this.credentials || GitHubAPIService.sharedCredentials!;
    }
    
    // If there's already a credential prompt in progress, wait for it to complete
    if (GitHubAPIService.credentialPromise) {
      console.log(chalk.gray(`📡 Waiting for existing credential prompt to complete... [ID: ${promptId}]`));
      return await GitHubAPIService.credentialPromise;
    }
    
    // If another instance is already prompting, wait for it to complete
    if (GitHubAPIService.isPromptingCredentials) {
      console.log(chalk.gray(`📡 Another instance is prompting for credentials, waiting... [ID: ${promptId}]`));
      // Wait a bit and check again
      let attempts = 0;
      while (GitHubAPIService.isPromptingCredentials && !GitHubAPIService.sharedCredentials && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (GitHubAPIService.sharedCredentials) {
        console.log(chalk.gray(`📡 Credentials obtained from another instance [ID: ${promptId}]`));
        this.credentials = GitHubAPIService.sharedCredentials;
        return GitHubAPIService.sharedCredentials;
      }
      
      console.log(chalk.yellow(`⚠️  Waited too long for credentials, proceeding with new prompt [ID: ${promptId}]`));
    }
    
    // Set the flag to prevent other instances from prompting
    console.log(chalk.gray(`🔒 Setting credential prompt flag [ID: ${promptId}]`));
    GitHubAPIService.isPromptingCredentials = true;
    
    // Create the credential promise and store it
    GitHubAPIService.credentialPromise = this.doPromptForCredentials(promptId);
    
    try {
      const credentials = await GitHubAPIService.credentialPromise;
      return credentials;
    } finally {
      // Always clear the flag and promise when done
      console.log(chalk.gray(`🔓 Clearing credential prompt flag and promise [ID: ${promptId}]`));
      GitHubAPIService.isPromptingCredentials = false;
      GitHubAPIService.credentialPromise = null;
    }
  }

  /**
   * Actually perform the credential prompt (separate method to avoid recursion)
   */
  private async doPromptForCredentials(promptId: string): Promise<GitHubCredentials> {
    try {
      console.log(chalk.blue(`\n🔐 Private repository detected! GitHub credentials required. [ID: ${promptId}]\n`));
      
      // Use a single prompt with both fields to avoid any inquirer issues
      const answers = await inquirer.prompt([
        {
          type: 'password',
          name: 'username',
          message: 'Enter your GitHub username:',
          mask: '*',
          validate: (input: string) => {
            if (!input.trim()) {
              return 'Username is required';
            }
            return true;
          }
        },
        {
          type: 'password',
          name: 'token',
          message: 'Enter your GitHub Personal Access Token (PAT):',
          validate: (input: string) => {
            if (!input.trim()) {
              return 'Token is required';
            }
            if (input.length < 10) {
              return 'Token seems too short. Please check your PAT.';
            }
            return true;
          }
        }
      ]);

      const credentials = {
        username: answers.username.trim(),
        token: answers.token.trim()
      };

      console.log(chalk.gray(`💾 Storing credentials... [ID: ${promptId}]`));
      
      // Store credentials immediately to prevent duplicate prompts
      this.credentials = credentials;
      GitHubAPIService.sharedCredentials = credentials;
      
      return credentials;
    } catch (error) {
      console.error(chalk.red(`❌ Error during credential prompt [ID: ${promptId}]:`), error);
      throw error;
    }
  }

  /**
   * Initialize Octokit with credentials
   */
  private async initializeOctokit(credentials?: GitHubCredentials): Promise<void> {
    console.log(chalk.gray(`🔍 initializeOctokit called - Instance: ${this.constructor.name}`));
    
    // If we already have a valid Octokit instance, don't reinitialize
    if (this.octokit && this.isAuthenticated()) {
      console.log(chalk.gray('📡 Reusing existing authenticated connection...'));
      return;
    }
    
    if (credentials) {
      console.log(chalk.gray('📡 Using provided credentials'));
      this.credentials = credentials;
      // Update shared state
      GitHubAPIService.sharedCredentials = credentials;
    } else if (!this.credentials) {
      console.log(chalk.gray('📡 No credentials available, prompting user...'));
      // Prompt for credentials if none provided
      this.credentials = await this.promptForCredentials();
      // Update shared state
      GitHubAPIService.sharedCredentials = this.credentials;
    } else {
      console.log(chalk.gray('📡 Using existing local credentials'));
    }

    console.log(chalk.gray('🔧 Creating Octokit instance...'));
    this.octokit = new Octokit({
      auth: this.credentials.token,
      userAgent: 'MCP-Database-Agent/2.0.0'
    });

    // Update shared state
    GitHubAPIService.sharedOctokit = this.octokit;

    console.log(chalk.gray('🔍 Validating credentials...'));
    // Validate the credentials
    await this.validateCredentials();
  }

  /**
   * Validate current credentials
   */
  private async validateCredentials(): Promise<void> {
    if (!this.octokit) {
      throw new Error('Octokit not initialized');
    }

    try {
      const response = await this.octokit.users.getAuthenticated();
      this.currentUser = {
        login: response.data.login,
        id: response.data.id,
        avatar_url: response.data.avatar_url,
        name: response.data.name || undefined,
        email: response.data.email || undefined
      };

      // Update shared state
      GitHubAPIService.sharedCurrentUser = this.currentUser;

      // Verify username matches
      if (this.currentUser.login !== this.credentials!.username) {
        console.warn(chalk.yellow(`⚠️  Warning: Token belongs to user '${this.currentUser.login}', not '${this.credentials!.username}'`));
        console.warn(chalk.yellow('The token will work, but you may want to use the correct username.'));
      }

      console.log(chalk.green(`✅ Authenticated as: ${this.currentUser.login}`));
    } catch (error) {
      // Clear invalid credentials
      this.clearCredentials();
      
      if (error instanceof Error && error.message.includes('401')) {
        throw new Error('❌ Invalid GitHub credentials. Please check your username and Personal Access Token.');
      } else if (error instanceof Error && error.message.includes('403')) {
        throw new Error('❌ Access denied. Your Personal Access Token may not have the required permissions.');
      } else {
        throw new Error(`❌ Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Get repository information with automatic credential handling
   */
  async getRepositoryInfo(owner: string, repo: string): Promise<RepositoryContext> {
    // Create a unique key for this repository access attempt
    const repoKey = `${owner}/${repo}`;
    
    try {
      console.log(chalk.gray(`🔍 Attempting to access repository: ${repoKey}`));
      
      // If we already have an authenticated Octokit instance (local or shared), use it directly
      if ((this.octokit && this.isAuthenticated()) || 
          (GitHubAPIService.sharedOctokit && this.isAuthenticated())) {
        
        // Use shared state if local state is not available
        if (!this.octokit && GitHubAPIService.sharedOctokit) {
          this.octokit = GitHubAPIService.sharedOctokit;
          this.currentUser = GitHubAPIService.sharedCurrentUser;
          this.credentials = GitHubAPIService.sharedCredentials;
        }
        
        // Ensure we have a valid octokit instance
        if (!this.octokit) {
          throw new Error('Failed to initialize GitHub client');
        }
        
        console.log(chalk.gray('📡 Using existing authenticated connection...'));
        const response = await this.octokit.repos.get({ owner, repo });
        const repoData = response.data;
        
        console.log(chalk.green(`✅ Repository accessed successfully: ${repoKey}`));
        console.log(chalk.gray(`Repository type: ${repoData.private ? 'Private' : 'Public'}`));
        console.log(chalk.gray(`Description: ${repoData.description || 'No description'}`));
        
        return this.buildRepositoryContext(repoData, this.currentUser);
      }
      
      // Try to get repo info without auth first (for public repos)
      const tempOctokit = new Octokit({
        userAgent: 'MCP-Database-Agent/2.0.0'
      });

      try {
        console.log(chalk.gray('📡 Making unauthenticated request to GitHub API...'));
        const response = await tempOctokit.repos.get({ owner, repo });
        const repoData = response.data;

        if (!repoData.private) {
          // Public repo - no auth needed
          console.log(chalk.green(`✅ Public repository accessed successfully: ${repoKey}`));
          return this.buildRepositoryContext(repoData, null);
        } else {
          // Private repo - need credentials
          console.log(chalk.yellow(`🔒 Private repository detected: ${repoKey}`));
          await this.initializeOctokit();
          
          // Now get the repo info with authenticated Octokit
          const authResponse = await this.octokit!.repos.get({ owner, repo });
          const authRepoData = authResponse.data;
          
          console.log(chalk.green(`✅ Private repository accessed successfully: ${repoKey}`));
          console.log(chalk.gray(`Description: ${authRepoData.description || 'No description'}`));
          
          return this.buildRepositoryContext(authRepoData, this.currentUser);
        }
      } catch (error) {
        const gitHubError = error as GitHubError;
        console.log(chalk.gray(`📡 GitHub API response: ${gitHubError.status} - ${gitHubError.message}`));
        
        if (gitHubError.status === 403) {
          // Repository access forbidden - likely private and requires authentication
          console.log(chalk.yellow(`🔒 Repository access forbidden (403): ${repoKey}`));
          console.log(chalk.gray('This usually means the repository is private and requires authentication.'));
          console.log(chalk.gray('Attempting authentication to access the private repository...'));
          
          // Only initialize Octokit if we haven't already (avoid duplicate prompts)
          if (!this.octokit || !this.isAuthenticated()) {
            await this.initializeOctokit();
          }
          
          // Now try with authenticated Octokit
          try {
            const authResponse = await this.octokit!.repos.get({ owner, repo });
            const authRepoData = authResponse.data;
            
            console.log(chalk.green(`✅ Private repository accessed successfully: ${repoKey}`));
            console.log(chalk.gray(`Description: ${authRepoData.description || 'No description'}`));
            
            return this.buildRepositoryContext(authRepoData, this.currentUser);
          } catch (authError) {
            const authGitHubError = authError as GitHubError;
            if (authGitHubError.status === 403) {
              // Even with authentication, access is still forbidden
              console.error(chalk.red(`❌ Access denied to repository: ${repoKey}`));
              console.error(chalk.red('Possible reasons:'));
              console.error(chalk.red('  • Repository is private and your token lacks permissions'));
              console.error(chalk.red('  • Repository belongs to an organization you cannot access'));
              console.error(chalk.red('  • Your Personal Access Token has insufficient scope'));
              
              throw new Error(`Access denied to repository: ${repoKey}. Please check your token permissions and repository access.`);
            } else {
              throw authError;
            }
          }
        } else if (gitHubError.status === 401) {
          // Unauthorized - need authentication
          console.log(chalk.yellow(`🔒 Repository requires authentication (401): ${repoKey}`));
          console.log(chalk.gray('This usually means the repository is private and requires authentication.'));
          
          // Only initialize Octokit if we haven't already (avoid duplicate prompts)
          if (!this.octokit || !this.isAuthenticated()) {
            await this.initializeOctokit();
          }
          
          // Now get repo info with authenticated Octokit
          const authResponse = await this.octokit!.repos.get({ owner, repo });
          const authRepoData = authResponse.data;
          
          console.log(chalk.green(`✅ Repository accessed successfully: ${repoKey}`));
          console.log(chalk.gray(`Repository type: ${authRepoData.private ? 'Private' : 'Public'}`));
          console.log(chalk.gray(`Description: ${authRepoData.description || 'No description'}`));
          
          return this.buildRepositoryContext(authRepoData, this.currentUser);
        } else if (gitHubError.status === 404) {
          // Repository not found - could be private (GitHub sometimes returns 404 for private repos)
          // or truly doesn't exist. Let's attempt authentication to check.
          console.log(chalk.yellow(`⚠️  Repository access failed (404): ${repoKey}`));
          console.log(chalk.gray('This could mean:'));
          console.log(chalk.gray('  • Repository is private and requires authentication'));
          console.log(chalk.gray('  • Repository does not exist'));
          console.log(chalk.gray('  • Repository name is misspelled'));
          console.log(chalk.gray('Attempting authentication to check if it\'s a private repository...'));
          
          // Only initialize Octokit if we haven't already (avoid duplicate prompts)
          if (!this.octokit || !this.isAuthenticated()) {
            await this.initializeOctokit();
          }
          
          // Now try with authenticated Octokit
          try {
            const authResponse = await this.octokit!.repos.get({ owner, repo });
            const authRepoData = authResponse.data;
            
            console.log(chalk.green(`✅ Private repository accessed successfully: ${repoKey}`));
            console.log(chalk.gray(`Description: ${authRepoData.description || 'No description'}`));
            
            return this.buildRepositoryContext(authRepoData, this.currentUser);
          } catch (authError) {
            const authGitHubError = authError as GitHubError;
            if (authGitHubError.status === 404) {
              // Even with authentication, repository truly doesn't exist
              console.error(chalk.red(`❌ Repository does not exist: ${repoKey}`));
              console.error(chalk.red('Possible reasons:'));
              console.error(chalk.red('  • Repository name is misspelled'));
              console.error(chalk.red('  • Repository has been deleted or renamed'));
              console.error(chalk.red('  • Repository is in a different organization'));
              console.error(chalk.red('  • Repository is in a different account'));
              
              throw new Error(`Repository does not exist: ${repoKey}. Please check the repository name and ensure it exists.`);
            } else if (authGitHubError.status === 403) {
              // Even with authentication, access is still forbidden
              console.error(chalk.red(`❌ Access denied to repository: ${repoKey}`));
              console.error(chalk.red('Possible reasons:'));
              console.error(chalk.red('  • Repository is private and your token lacks permissions'));
              console.error(chalk.red('  • Repository belongs to an organization you cannot access'));
              console.error(chalk.red('  • Your Personal Access Token has insufficient scope'));
              
              throw new Error(`Access denied to repository: ${repoKey}. Please check your token permissions and repository access.`);
            } else {
              throw authError;
            }
          }
        } else {
          throw error;
        }
      }
    } catch (error) {
      const gitHubError = error as GitHubError;
      
      if (gitHubError.status === 401) {
        console.error(chalk.red('❌ Authentication failed. Please check your GitHub credentials.'));
        console.error(chalk.yellow('💡 You can retry with: peer-ai-mongo-migrator analyze-github -r <repository-url>'));
        throw new Error('Authentication failed. Please check your GitHub credentials.');
      } else if (gitHubError.status === 403) {
        console.error(chalk.red('❌ Access denied. Repository may be private or you may not have permission.'));
        console.error(chalk.yellow('💡 Check your Personal Access Token permissions.'));
        throw new Error('Access denied. Repository may be private or you may not have permission.');
      } else if (gitHubError.status === 404) {
        // This should only happen if we've already tried authentication
        console.error(chalk.red(`❌ Repository does not exist: ${repoKey}`));
        console.error(chalk.yellow('💡 Please check the repository name and ensure it exists.'));
        throw new Error(`Repository does not exist: ${repoKey}. Please check the repository name.`);
      } else {
        console.error(chalk.red(`❌ Failed to get repository info: ${gitHubError.message}`));
        throw new Error(`Failed to get repository info: ${gitHubError.message}`);
      }
    }
  }

  /**
   * Build repository context from GitHub API response
   */
  private buildRepositoryContext(repoData: any, currentUser: GitHubUser | null): RepositoryContext {
    const isOwnedByUser = currentUser ? repoData.owner.login === currentUser.login : false;

    return {
      isOwnedByUser,
      isPublic: !repoData.private,
      isPrivate: repoData.private,
      isFork: repoData.fork,
      originalOwner: repoData.source?.owner?.login,
      license: repoData.license ? {
        key: repoData.license.key,
        name: repoData.license.name,
        spdx_id: repoData.license.spdx_id || '',
        url: repoData.license.url || ''
      } : undefined,
      lastUpdated: repoData.updated_at,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      language: repoData.language || 'Unknown',
      size: repoData.size,
      description: repoData.description || undefined,
      defaultBranch: repoData.default_branch
    };
  }

  /**
   * Analyze repository access and permissions with automatic credential handling
   */
  async analyzeRepositoryAccess(owner: string, repo: string): Promise<RepositoryAnalysis> {
    try {
      const repoContext = await this.getRepositoryInfo(owner, repo);
      const currentUser = this.currentUser;

      let accessLevel: RepositoryAnalysis['accessLevel'];
      let requiresAuth: boolean;
      let ownership: RepositoryAnalysis['ownership'];
      let warnings: string[] = [];
      let limitations: string[] = [];

      if (repoContext.isOwnedByUser) {
        // User's own repository
        accessLevel = repoContext.isPrivate ? 'PRIVATE_FULL_ACCESS' : 'PUBLIC_READ_ONLY';
        requiresAuth = repoContext.isPrivate;
        ownership = 'OWN';
        
        if (repoContext.isPrivate) {
          warnings.push('This is your private repository - full access available');
        } else {
          warnings.push('This is your public repository - full access available');
        }
      } else {
        // Someone else's repository
        if (repoContext.isPublic) {
          accessLevel = 'PUBLIC_READ_ONLY';
          requiresAuth = false;
          ownership = 'OTHER_USER';
          
          warnings.push('This is a public repository owned by another user');
          warnings.push('You can analyze the code but cannot modify the repository');
          limitations.push('read-only-access');
          limitations.push('no-modifications');
          limitations.push('no-issues-or-prs');
        } else {
          accessLevel = 'PRIVATE_NO_ACCESS';
          requiresAuth = true;
          ownership = 'OTHER_USER';
          
          warnings.push('This is a private repository owned by another user');
          warnings.push('Access denied - you cannot analyze this repository');
          limitations.push('no-access');
          limitations.push('private-repository');
        }
      }

      return {
        canAccess: accessLevel !== 'PRIVATE_NO_ACCESS',
        accessLevel,
        requiresAuth,
        ownership,
        warnings,
        limitations,
        message: this.generateAccessMessage(accessLevel, ownership, repoContext)
      };
    } catch (error) {
      const gitHubError = error as GitHubError;
      return {
        canAccess: false,
        accessLevel: 'PRIVATE_NO_ACCESS',
        requiresAuth: true,
        ownership: 'OTHER_USER',
        warnings: ['Repository access failed'],
        limitations: ['access-error'],
        message: gitHubError.message
      };
    }
  }

  /**
   * Validate GitHub token
   */
  async validateToken(token: string): Promise<GitHubAuthenticationResult> {
    try {
      // Create temporary Octokit instance with the token
      const tempOctokit = new Octokit({
        auth: token,
        userAgent: 'MCP-Database-Agent/2.0.0'
      });

      // Test the token by getting the authenticated user
      const response = await tempOctokit.users.getAuthenticated();
      
      const user: GitHubUser = {
        login: response.data.login,
        id: response.data.id,
        avatar_url: response.data.avatar_url,
        name: response.data.name || undefined,
        email: response.data.email || undefined
      };

      return {
        valid: true,
        user,
        message: 'Token is valid'
      };
    } catch (error) {
      return {
        valid: false,
        user: null,
        message: 'Invalid token'
      };
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<GitHubUser | null> {
    if (!this.octokit) {
      return null;
    }

    try {
      const response = await this.octokit.users.getAuthenticated();
      this.currentUser = {
        login: response.data.login,
        id: response.data.id,
        avatar_url: response.data.avatar_url,
        name: response.data.name || undefined,
        email: response.data.email || undefined
      };

      return this.currentUser;
    } catch (error) {
      console.warn('⚠️  Could not get current user:', error);
      return null;
    }
  }

  /**
   * Get authenticated Octokit instance
   */
  getAuthenticatedOctokit(): Octokit {
    if (!this.octokit) {
      throw new Error('GitHub client not initialized. Call getRepositoryInfo() first.');
    }
    return this.octokit;
  }

  /**
   * Retry authentication with new credentials
   */
  async retryAuthentication(): Promise<void> {
    console.log(chalk.yellow('🔄 Retrying authentication with new credentials...'));
    
    // Clear existing credentials
    this.clearCredentials();
    
    // Prompt for new credentials
    await this.initializeOctokit();
  }

  /**
   * Clear stored credentials (for security)
   */
  clearCredentials(): void {
    this.credentials = null;
    this.currentUser = null;
    this.octokit = null;
    
    // Also clear shared state
    GitHubAPIService.sharedCredentials = null;
    GitHubAPIService.sharedCurrentUser = null;
    GitHubAPIService.sharedOctokit = null;
  }

  /**
   * Check if currently authenticated
   */
  isAuthenticated(): boolean {
    // Check both local and shared state
    return (this.octokit !== null && this.credentials !== null) || 
           (GitHubAPIService.sharedOctokit !== null && GitHubAPIService.sharedCredentials !== null);
  }

  /**
   * Generate access message
   */
  private generateAccessMessage(accessLevel: string, ownership: string, repoContext: RepositoryContext): string {
    if (accessLevel === 'PRIVATE_FULL_ACCESS') {
      return `Full access to your private repository: ${repoContext.description || 'No description'}`;
    } else if (accessLevel === 'PUBLIC_READ_ONLY') {
      return `Read-only access to ${ownership === 'OWN' ? 'your' : 'public'} repository: ${repoContext.description || 'No description'}`;
    } else {
      return 'Access denied to private repository';
    }
  }

  /**
   * Get repository contents (with automatic authentication)
   */
  async getRepositoryContents(owner: string, repo: string, path: string = '', ref?: string): Promise<any> {
    if (!this.octokit) {
      // Ensure we're authenticated
      await this.getRepositoryInfo(owner, repo);
    }

    if (!this.octokit) {
      throw new Error('Failed to initialize GitHub client');
    }

    try {
      const response = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref
      });

      return response.data;
    } catch (error) {
      const gitHubError = error as GitHubError;
      if (gitHubError.status === 404) {
        throw new Error(`Path not found: ${path}`);
      } else if (gitHubError.status === 403) {
        throw new Error('Access denied to repository contents');
      } else {
        throw new Error(`Failed to get repository contents: ${gitHubError.message}`);
      }
    }
  }

  /**
   * List repository branches (with automatic authentication)
   */
  async listBranches(owner: string, repo: string): Promise<string[]> {
    if (!this.octokit) {
      // Ensure we're authenticated
      await this.getRepositoryInfo(owner, repo);
    }

    if (!this.octokit) {
      throw new Error('Failed to initialize GitHub client');
    }

    try {
      const response = await this.octokit.repos.listBranches({
        owner,
        repo,
        per_page: 100
      });

      return response.data.map(branch => branch.name);
    } catch (error) {
      const gitHubError = error as GitHubError;
      if (gitHubError.status === 403) {
        throw new Error('Access denied to repository branches');
      } else {
        throw new Error(`Failed to list branches: ${gitHubError.message}`);
      }
    }
  }
}
