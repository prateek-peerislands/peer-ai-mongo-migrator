/**
 * LLM Configuration for Azure OpenAI
 * Handles loading and validation of Azure OpenAI credentials
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export interface AzureOpenAIConfig {
  apiKey: string;
  endpoint: string;
  deploymentName: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface LLMConfigValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class LLMConfigManager {
  private static instance: LLMConfigManager | null = null;
  private config: AzureOpenAIConfig | null = null;
  private configPath: string;

  private constructor() {
    this.configPath = path.join(process.cwd(), '.env');
  }

  static getInstance(): LLMConfigManager {
    if (!LLMConfigManager.instance) {
      LLMConfigManager.instance = new LLMConfigManager();
    }
    return LLMConfigManager.instance;
  }

  /**
   * Load LLM configuration from environment variables
   */
  loadConfig(): AzureOpenAIConfig | null {
    try {
      // Load from .env file if it exists
      if (fs.existsSync(this.configPath)) {
        const envContent = fs.readFileSync(this.configPath, 'utf-8');
        const envVars = this.parseEnvFile(envContent);
        
        // Set environment variables
        Object.entries(envVars).forEach(([key, value]) => {
          if (!process.env[key]) {
            process.env[key] = value;
          }
        });
      }

      // Load from environment variables
      const apiKey = process.env.AZURE_OPENAI_API_KEY;
      const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
      const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

      if (!apiKey || !endpoint || !deploymentName) {
        return null;
      }

      this.config = {
        apiKey,
        endpoint: endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint,
        deploymentName,
        maxTokens: parseInt(process.env.AZURE_OPENAI_MAX_TOKENS || '2000'),
        temperature: parseFloat(process.env.AZURE_OPENAI_TEMPERATURE || '0.1'),
        timeout: parseInt(process.env.AZURE_OPENAI_TIMEOUT || '30000')
      };

      return this.config;
    } catch (error) {
      console.error('❌ Failed to load LLM configuration:', error);
      return null;
    }
  }

  /**
   * Parse .env file content
   */
  private parseEnvFile(content: string): Record<string, string> {
    const envVars: Record<string, string> = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
    
    return envVars;
  }

  /**
   * Validate LLM configuration
   */
  validateConfig(config?: AzureOpenAIConfig): LLMConfigValidation {
    const configToValidate = config ?? this.config;
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!configToValidate) {
      errors.push('No configuration provided');
      return { valid: false, errors, warnings };
    }

    // Validate API Key
    if (!configToValidate.apiKey) {
      errors.push('Azure OpenAI API key is required');
    } else if (configToValidate.apiKey.length < 10) {
      errors.push('Azure OpenAI API key appears to be too short');
    } else if (configToValidate.apiKey === 'my_open_ai_key') {
      errors.push('Please replace the dummy API key with your actual Azure OpenAI API key');
    }

    // Validate Endpoint
    if (!configToValidate.endpoint) {
      errors.push('Azure OpenAI endpoint is required');
    } else if (!configToValidate.endpoint.includes('openai.azure.com')) {
      warnings.push('Endpoint does not appear to be a standard Azure OpenAI endpoint');
    } else if (configToValidate.endpoint === 'my_end_point') {
      errors.push('Please replace the dummy endpoint with your actual Azure OpenAI endpoint');
    }

    // Validate Deployment Name
    if (!configToValidate.deploymentName) {
      errors.push('Azure OpenAI deployment name is required');
    } else if (configToValidate.deploymentName === 'gpt-4o') {
      warnings.push('Deployment name appears to be a model name, ensure it matches your deployment');
    }

    // Validate numeric values
    if (configToValidate.maxTokens && (configToValidate.maxTokens < 100 || configToValidate.maxTokens > 4000)) {
      warnings.push('Max tokens should be between 100 and 4000 for optimal performance');
    }

    if (configToValidate.temperature && (configToValidate.temperature < 0 || configToValidate.temperature > 1)) {
      warnings.push('Temperature should be between 0 and 1');
    }

    if (configToValidate.timeout && configToValidate.timeout < 5000) {
      warnings.push('Timeout should be at least 5000ms for reliable operation');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create sample .env file
   */
  createSampleEnvFile(): void {
    const sampleContent = `# Azure OpenAI Configuration
# Replace these dummy values with your actual Azure OpenAI credentials

AZURE_OPENAI_API_KEY=my_open_ai_key
AZURE_OPENAI_ENDPOINT=my_end_point
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

# Optional Configuration (with defaults)
AZURE_OPENAI_MAX_TOKENS=2000
AZURE_OPENAI_TEMPERATURE=0.1
AZURE_OPENAI_TIMEOUT=30000

# Instructions:
# 1. Get your API key from Azure OpenAI Studio
# 2. Get your endpoint from your Azure OpenAI resource
# 3. Get your deployment name from your deployments
# 4. Replace the dummy values above with your actual values
# 5. Never commit this file to version control
`;

    try {
      fs.writeFileSync(this.configPath, sampleContent);
      console.log(chalk.green('✅ Sample .env file created at:', this.configPath));
      console.log(chalk.yellow('📝 Please edit the file with your actual Azure OpenAI credentials'));
    } catch (error) {
      console.error('❌ Failed to create sample .env file:', error);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AzureOpenAIConfig | null {
    return this.config;
  }

  /**
   * Check if configuration is loaded
   */
  hasConfig(): boolean {
    return this.config !== null;
  }

  /**
   * Get configuration status
   */
  getConfigStatus(): {
    hasConfig: boolean;
    hasApiKey: boolean;
    hasEndpoint: boolean;
    hasDeploymentName: boolean;
    validation: LLMConfigValidation;
  } {
    const validation = this.validateConfig();
    
    return {
      hasConfig: this.hasConfig(),
      hasApiKey: !!(this.config?.apiKey),
      hasEndpoint: !!(this.config?.endpoint),
      hasDeploymentName: !!(this.config?.deploymentName),
      validation
    };
  }

  /**
   * Display configuration status
   */
  displayConfigStatus(): void {
    const status = this.getConfigStatus();
    
    console.log(chalk.blue.bold('\n🧠 LLM Configuration Status:\n'));
    
    if (status.hasConfig) {
      console.log(chalk.green('✅ Configuration loaded'));
      console.log(`   API Key: ${status.hasApiKey ? '✅ Set' : '❌ Missing'}`);
      console.log(`   Endpoint: ${status.hasEndpoint ? '✅ Set' : '❌ Missing'}`);
      console.log(`   Deployment: ${status.hasDeploymentName ? '✅ Set' : '❌ Missing'}`);
    } else {
      console.log(chalk.red('❌ No configuration found'));
    }
    
    if (status.validation.errors.length > 0) {
      console.log(chalk.red('\n❌ Configuration Errors:'));
      status.validation.errors.forEach(error => {
        console.log(chalk.red(`   • ${error}`));
      });
    }
    
    if (status.validation.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️ Configuration Warnings:'));
      status.validation.warnings.forEach(warning => {
        console.log(chalk.yellow(`   • ${warning}`));
      });
    }
    
    if (status.validation.valid) {
      console.log(chalk.green('\n✅ Configuration is valid and ready to use!'));
    } else {
      console.log(chalk.red('\n❌ Configuration needs to be fixed before use'));
    }
  }
}

/**
 * Convenience function to get LLM configuration
 */
export function getLLMConfig(): AzureOpenAIConfig | null {
  return LLMConfigManager.getInstance().loadConfig();
}

/**
 * Convenience function to validate LLM configuration
 */
export function validateLLMConfig(): LLMConfigValidation {
  const manager = LLMConfigManager.getInstance();
  const config = manager.loadConfig();
  return manager.validateConfig(config || undefined);
}
