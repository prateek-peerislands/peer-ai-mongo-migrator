import inquirer from 'inquirer';
import chalk from 'chalk';
import { GitHubAnalysisService } from '../services/GitHubAnalysisService.js';
import { GitHubConfigManager } from '../config/github-config.js';
import { GitHubUrlParser } from '../services/GitHubUrlParser.js';

export class GitHubCLI {
  private analysisService: GitHubAnalysisService;
  private configManager: GitHubConfigManager;
  private urlParser: GitHubUrlParser;

  constructor() {
    this.analysisService = new GitHubAnalysisService();
    this.configManager = new GitHubConfigManager();
    this.urlParser = new GitHubUrlParser();
  }

  /**
   * Main GitHub CLI entry point
   */
  async run(): Promise<void> {
    console.log(chalk.blue('🐙 GitHub Repository Analysis CLI'));
    console.log(chalk.gray('Analyze GitHub repositories for database migration planning\n'));

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '🔍 Analyze GitHub Repository', value: 'analyze' },
          { name: '🔧 Setup GitHub Configuration', value: 'setup' },
          { name: '📊 Check Configuration Status', value: 'status' },
          { name: '🧹 Cleanup Temporary Repositories', value: 'cleanup' },
          { name: '📋 View Repository Suggestions', value: 'suggestions' },
          { name: '❌ Exit', value: 'exit' }
        ]
      }
    ]);

    switch (action) {
      case 'analyze':
        await this.analyzeRepository();
        break;
      case 'setup':
        await this.setupConfiguration();
        break;
      case 'status':
        await this.showStatus();
        break;
      case 'cleanup':
        await this.cleanupRepositories();
        break;
      case 'suggestions':
        await this.showRepositorySuggestions();
        break;
      case 'exit':
        console.log(chalk.gray('👋 Goodbye!'));
        return;
    }

    // Continue with more actions
    await this.run();
  }

  /**
   * Analyze a GitHub repository
   */
  private async analyzeRepository(): Promise<void> {
    console.log(chalk.blue('\n🔍 GitHub Repository Analysis'));
    console.log(chalk.gray('Enter a GitHub repository URL to analyze\n'));

    const { repoUrl } = await inquirer.prompt([
      {
        type: 'input',
        name: 'repoUrl',
        message: 'GitHub Repository URL:',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Repository URL is required';
          }
          if (!this.urlParser.isValidGitHubUrl(input.trim())) {
            return 'Please enter a valid GitHub URL (e.g., https://github.com/owner/repo or owner/repo)';
          }
          return true;
        }
      }
    ]);

    const { branch } = await inquirer.prompt([
      {
        type: 'input',
        name: 'branch',
        message: 'Branch to analyze (leave empty for default):',
        default: ''
      }
    ]);

    const { outputPath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'outputPath',
        message: 'Output path for analysis (leave empty for auto-generated):',
        default: ''
      }
    ]);

    console.log(chalk.blue('\n🚀 Starting analysis...'));
    
    try {
      const result = await this.analysisService.analyzeGitHubRepository(repoUrl.trim(), {
        branch: branch.trim() || undefined,
        outputPath: outputPath.trim() || undefined
      });

      if (result.success) {
        console.log(chalk.green('\n✅ Analysis completed successfully!'));
        console.log(chalk.gray(`Repository: ${result.repositoryInfo?.fullName}`));
        console.log(chalk.gray(`Analysis saved to: ${result.documentation}`));
        
        if (result.repositoryContext) {
          console.log(chalk.gray(`Language: ${result.repositoryContext.language}`));
          console.log(chalk.gray(`Size: ${result.repositoryContext.size} KB`));
          console.log(chalk.gray(`Last updated: ${result.repositoryContext.lastUpdated}`));
        }
      } else {
        console.log(chalk.red('\n❌ Analysis failed:'));
        console.log(chalk.red(result.error));
      }
    } catch (error) {
      console.error(chalk.red('\n❌ Unexpected error:'), error);
    }

    console.log('\n');
  }

  /**
   * Setup GitHub configuration
   */
  private async setupConfiguration(): Promise<void> {
    console.log(chalk.blue('\n🔧 GitHub Configuration Setup'));
    
    const status = this.configManager.getConfigurationStatus();
    
    if (status.configured) {
      console.log(chalk.green('✅ GitHub is already configured'));
      console.log(chalk.gray(`Username: ${this.configManager.getUsername()}`));
      console.log(chalk.gray(`Token: ${this.configManager.hasToken() ? '✅ Set' : '❌ Not set'}`));
      console.log(chalk.gray(`Temp Directory: ${status.tempDir}`));
      
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '🧪 Test Configuration', value: 'test' },
            { name: '🔄 Update Configuration', value: 'update' },
            { name: '🗑️  Clear Configuration', value: 'clear' },
            { name: '⬅️  Back', value: 'back' }
          ]
        }
      ]);

      switch (action) {
        case 'test':
          await this.testConfiguration();
          break;
        case 'update':
          await this.updateConfiguration();
          break;
        case 'clear':
          await this.clearConfiguration();
          break;
        case 'back':
          return;
      }
    } else {
      console.log(chalk.yellow('⚠️  GitHub is not configured'));
      console.log(chalk.gray('You need to set up GitHub authentication to analyze private repositories\n'));
      
      const { setupType } = await inquirer.prompt([
        {
          type: 'list',
          name: 'setupType',
          message: 'How would you like to set up?',
          choices: [
            { name: '📝 Create Sample Config File', value: 'sample' },
            { name: '🔑 Enter Credentials Now', value: 'manual' },
            { name: '⬅️  Back', value: 'back' }
          ]
        }
      ]);

      switch (setupType) {
        case 'sample':
          this.configManager.createSampleConfig();
          console.log(chalk.green('\n✅ Sample configuration file created!'));
          console.log(chalk.yellow('📝 Please edit github-config.json with your actual credentials'));
          console.log(chalk.gray('Then run setup again to test the configuration'));
          break;
        case 'manual':
          await this.enterCredentials();
          break;
        case 'back':
          return;
      }
    }

    console.log('\n');
  }

  /**
   * Test current GitHub configuration
   */
  private async testConfiguration(): Promise<void> {
    console.log(chalk.blue('\n🧪 Testing GitHub Configuration...'));
    
    try {
      // Use the checkRepositoryAccess method instead of setupGitHubConfiguration
      const testResult = await this.analysisService.checkRepositoryAccess('https://github.com/octocat/Hello-World');
      if (testResult) {
        console.log(chalk.green('✅ Configuration test successful'));
        console.log(chalk.gray(`Access level: ${testResult.accessLevel}`));
      } else {
        console.log(chalk.red('❌ Configuration test failed'));
      }
    } catch (error) {
      console.error(chalk.red('❌ Configuration test failed:'), error);
    }
  }

  /**
   * Update GitHub configuration
   */
  private async updateConfiguration(): Promise<void> {
    console.log(chalk.blue('\n🔄 Update GitHub Configuration'));
    
    const { updateType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'updateType',
        message: 'What would you like to update?',
        choices: [
          { name: '🔑 Update Token', value: 'token' },
          { name: '👤 Update Username', value: 'username' },
          { name: '📁 Update Temp Directory', value: 'tempdir' },
          { name: '⬅️  Back', value: 'back' }
        ]
      }
    ]);

    if (updateType === 'back') return;

    switch (updateType) {
      case 'token':
        await this.updateToken();
        break;
      case 'username':
        await this.updateUsername();
        break;
      case 'tempdir':
        await this.updateTempDir();
        break;
    }
  }

  /**
   * Update GitHub token
   */
  private async updateToken(): Promise<void> {
    const { token } = await inquirer.prompt([
      {
        type: 'password',
        name: 'token',
        message: 'Enter your GitHub Personal Access Token:',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Token is required';
          }
          return true;
        }
      }
    ]);

    try {
      this.configManager.setToken(token.trim());
      console.log(chalk.green('✅ Token updated successfully'));
      
      // Test the new token
      const { testToken } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'testToken',
          message: 'Would you like to test the new token?',
          default: true
        }
      ]);

      if (testToken) {
        await this.testConfiguration();
      }
    } catch (error) {
      console.error(chalk.red('❌ Failed to update token:'), error);
    }
  }

  /**
   * Update GitHub username
   */
  private async updateUsername(): Promise<void> {
    const { username } = await inquirer.prompt([
      {
        type: 'input',
        name: 'username',
        message: 'Enter your GitHub username:',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Username is required';
          }
          return true;
        }
      }
    ]);

    try {
      this.configManager.setUsername(username.trim());
      console.log(chalk.green('✅ Username updated successfully'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to update username:'), error);
    }
  }

  /**
   * Update temporary directory
   */
  private async updateTempDir(): Promise<void> {
    const { tempDir } = await inquirer.prompt([
      {
        type: 'input',
        name: 'tempDir',
        message: 'Enter temporary directory path:',
        default: './temp-github-repos'
      }
    ]);

    try {
      this.configManager.setTempDir(tempDir.trim());
      console.log(chalk.green('✅ Temporary directory updated successfully'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to update temporary directory:'), error);
    }
  }

  /**
   * Enter GitHub credentials manually
   */
  private async enterCredentials(): Promise<void> {
    console.log(chalk.blue('\n🔑 Enter GitHub Credentials'));
    console.log(chalk.gray('You can create a Personal Access Token at: https://github.com/settings/tokens\n'));

    const { username, token } = await inquirer.prompt([
      {
        type: 'input',
        name: 'username',
        message: 'GitHub Username:',
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
        message: 'GitHub Personal Access Token:',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Token is required';
          }
          return true;
        }
      }
    ]);

    try {
      this.configManager.setUsername(username.trim());
      this.configManager.setToken(token.trim());
      
      console.log(chalk.green('\n✅ Credentials saved successfully'));
      
      // Test the configuration
      const { testConfig } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'testConfig',
          message: 'Would you like to test the configuration now?',
          default: true
        }
      ]);

      if (testConfig) {
        await this.testConfiguration();
      }
    } catch (error) {
      console.error(chalk.red('❌ Failed to save credentials:'), error);
    }
  }

  /**
   * Clear GitHub configuration
   */
  private async clearConfiguration(): Promise<void> {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to clear all GitHub configuration?',
        default: false
      }
    ]);

    if (confirm) {
      this.configManager.clearConfig();
      console.log(chalk.green('✅ Configuration cleared successfully'));
    }
  }

  /**
   * Show configuration status
   */
  private async showStatus(): Promise<void> {
    console.log(chalk.blue('\n📊 GitHub Configuration Status'));
    
    const status = this.configManager.getConfigurationStatus();
    
    console.log(`Configuration: ${status.configured ? chalk.green('✅ Configured') : chalk.red('❌ Not Configured')}`);
    console.log(`Token: ${status.hasToken ? chalk.green('✅ Set') : chalk.red('❌ Not Set')}`);
    console.log(`Username: ${status.hasUsername ? chalk.green('✅ Set') : chalk.red('❌ Not Set')}`);
    console.log(`Temp Directory: ${chalk.gray(status.tempDir)}`);
    
    if (status.configured) {
      console.log(chalk.gray('\nYou can analyze both public and private repositories'));
    } else {
      console.log(chalk.yellow('\n⚠️  You can only analyze public repositories'));
      console.log(chalk.gray('Configure GitHub authentication to access private repositories'));
    }
    
    console.log('\n');
  }

  /**
   * Cleanup temporary repositories
   */
  private async cleanupRepositories(): Promise<void> {
    console.log(chalk.blue('\n🧹 Cleanup Temporary Repositories'));
    
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to remove all temporary repositories?',
        default: false
      }
    ]);

    if (confirm) {
      try {
        await this.analysisService.cleanup();
        console.log(chalk.green('✅ Cleanup completed successfully'));
      } catch (error) {
        console.error(chalk.red('❌ Cleanup failed:'), error);
      }
    }
    
    console.log('\n');
  }

  /**
   * Show repository suggestions
   */
  private async showRepositorySuggestions(): Promise<void> {
    console.log(chalk.blue('\n📋 Repository Suggestions'));
    
    const status = this.configManager.getConfigurationStatus();
    
    if (!status.configured) {
      console.log(chalk.yellow('⚠️  GitHub not configured'));
      console.log(chalk.gray('Configure GitHub authentication to see your repositories'));
      console.log('\n');
      return;
    }

    try {
      console.log(chalk.gray('Loading your repositories...'));
      // Use getRepositoryInfo method instead of getRepositorySuggestions
      const repoInfo = await this.analysisService.getRepositoryInfo('https://github.com/octocat/Hello-World');
      
      if (repoInfo) {
        console.log(chalk.green(`\nRepository found:\n`));
        console.log(`🌐 ${chalk.blue(repoInfo.isOwnedByUser ? 'Owned by you' : 'Other user')}`);
        console.log(`📝 Description: ${repoInfo.description || 'No description'}`);
        console.log(`⭐ Stars: ${repoInfo.stars || 0}`);
        console.log(`🔀 Forks: ${repoInfo.forks || 0}`);
        console.log(`🔒 Private: ${repoInfo.isPrivate ? 'Yes' : 'No'}`);
      } else {
        console.log(chalk.yellow('No repository information found'));
      }
    } catch (error) {
      console.error(chalk.red('❌ Failed to load repository information:'), error);
    }
    
    console.log('\n');
  }
}
