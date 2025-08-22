import fs from 'fs';
import path from 'path';
import { GitHubConfig } from '../types/github-types.js';

export class GitHubConfigManager {
  private configPath: string;
  private config: GitHubConfig;

  constructor() {
    this.configPath = path.join(process.cwd(), 'github-config.json');
    this.config = this.loadConfig();
  }

  /**
   * Load GitHub configuration from file
   */
  private loadConfig(): GitHubConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf-8');
        const loadedConfig = JSON.parse(configData);
        
        // Validate and set defaults
        return {
          token: loadedConfig.token || undefined,
          username: loadedConfig.username || undefined,
          apiUrl: loadedConfig.apiUrl || 'https://api.github.com',
          tempDir: loadedConfig.tempDir || './temp-github-repos'
        };
      }
    } catch (error) {
      console.warn('⚠️  Could not load GitHub config:', error);
    }

    // Return default configuration
    return {
      token: undefined,
      username: undefined,
      apiUrl: 'https://api.github.com',
      tempDir: './temp-github-repos'
    };
  }

  /**
   * Save GitHub configuration to file
   */
  private saveConfig(): void {
    try {
      // Ensure temp directory exists
      if (this.config.tempDir) {
        const tempDir = path.resolve(this.config.tempDir);
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
      }

      // Save configuration
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('❌ Failed to save GitHub config:', error);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): GitHubConfig {
    return { ...this.config };
  }

  /**
   * Set GitHub token
   */
  setToken(token: string): void {
    this.config.token = token;
    this.saveConfig();
  }

  /**
   * Set GitHub username
   */
  setUsername(username: string): void {
    this.config.username = username;
    this.saveConfig();
  }

  /**
   * Set temporary directory
   */
  setTempDir(tempDir: string): void {
    this.config.tempDir = tempDir;
    this.saveConfig();
  }

  /**
   * Check if GitHub is configured
   */
  isConfigured(): boolean {
    return !!(this.config.token && this.config.username);
  }

  /**
   * Check if token is set
   */
  hasToken(): boolean {
    return !!this.config.token;
  }

  /**
   * Check if username is set
   */
  hasUsername(): boolean {
    return !!this.config.username;
  }

  /**
   * Get token (if available)
   */
  getToken(): string | undefined {
    return this.config.token;
  }

  /**
   * Get username (if available)
   */
  getUsername(): string | undefined {
    return this.config.username;
  }

  /**
   * Get API URL
   */
  getApiUrl(): string {
    return this.config.apiUrl || 'https://api.github.com';
  }

  /**
   * Get temporary directory
   */
  getTempDir(): string {
    return this.config.tempDir || './temp-github-repos';
  }

  /**
   * Clear stored token
   */
  clearToken(): void {
    this.config.token = undefined;
    this.saveConfig();
  }

  /**
   * Clear all configuration
   */
  clearConfig(): void {
    this.config = {
      token: undefined,
      username: undefined,
      apiUrl: 'https://api.github.com',
      tempDir: './temp-github-repos'
    };
    this.saveConfig();
  }

  /**
   * Create sample configuration file
   */
  createSampleConfig(): void {
    const sampleConfig = {
      token: 'your_github_personal_access_token_here',
      username: 'your_github_username',
      apiUrl: 'https://api.github.com',
      tempDir: './temp-github-repos',
      notes: [
        'Replace "your_github_personal_access_token_here" with your actual GitHub PAT',
        'Replace "your_github_username" with your actual GitHub username',
        'The tempDir will be created automatically if it doesn\'t exist',
        'Never commit this file to version control - add it to .gitignore'
      ]
    };

    try {
      fs.writeFileSync(this.configPath, JSON.stringify(sampleConfig, null, 2));
      console.log('✅ Sample GitHub configuration created at:', this.configPath);
      console.log('📝 Please edit the file with your actual GitHub credentials');
    } catch (error) {
      console.error('❌ Failed to create sample GitHub config:', error);
    }
  }

  /**
   * Validate configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.token) {
      errors.push('GitHub token is not set');
    }

    if (!this.config.username) {
      errors.push('GitHub username is not set');
    }

    if (!this.config.tempDir) {
      errors.push('Temporary directory is not set');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get configuration status
   */
  getConfigurationStatus(): {
    configured: boolean;
    hasToken: boolean;
    hasUsername: boolean;
    tempDir: string;
  } {
    return {
      configured: this.isConfigured(),
      hasToken: this.hasToken(),
      hasUsername: this.hasUsername(),
      tempDir: this.getTempDir()
    };
  }
}
