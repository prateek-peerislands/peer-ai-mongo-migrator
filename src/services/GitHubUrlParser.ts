import { RepositoryInfo } from '../types/github-types.js';
import chalk from 'chalk';

export class GitHubUrlParser {
  /**
   * Parse various GitHub URL formats
   */
  parseGitHubUrl(url: string): RepositoryInfo {
    console.log(chalk.gray(`🔍 GitHubUrlParser: Parsing URL: ${url}`));
    
    // Remove any trailing slashes but keep .git extension for now
    const cleanUrl = url.trim().replace(/\/$/, '');
    
    console.log(chalk.gray(`🔍 GitHubUrlParser: Cleaned URL: ${cleanUrl}`));
    
    // Handle different URL formats
    if (cleanUrl.includes('github.com')) {
      return this.parseFullUrl(cleanUrl);
    } else if (cleanUrl.includes(':')) {
      return this.parseSSHUrl(cleanUrl);
    } else if (cleanUrl.includes('/')) {
      return this.parseShortFormat(cleanUrl);
    } else {
      throw new Error(`Invalid GitHub URL format: ${url}`);
    }
  }

  /**
   * Parse full GitHub URLs (https://github.com/owner/repo or git@github.com:owner/repo)
   */
  private parseFullUrl(url: string): RepositoryInfo {
    let owner: string;
    let repo: string;
    let branch: string | undefined;

    if (url.startsWith('https://github.com/')) {
      // HTTPS format: https://github.com/owner/repo or https://github.com/owner/repo.git
      const parts = url.replace('https://github.com/', '').split('/');
      
      if (parts.length < 2) {
        throw new Error(`Invalid GitHub HTTPS URL: ${url}`);
      }
      
      owner = parts[0];
      repo = parts[1].replace('.git', ''); // Remove .git extension from repo name
      
      console.log(chalk.gray(`🔍 GitHubUrlParser: HTTPS parsed - owner: ${owner}, repo: ${repo}`));
      
      // Check for branch specification
      if (parts.length > 2 && parts[2] === 'tree') {
        branch = parts[3];
      }
    } else if (url.startsWith('git@github.com:')) {
      // SSH format: git@github.com:owner/repo or git@github.com:owner/repo.git
      const parts = url.replace('git@github.com:', '').split('/');
      
      if (parts.length < 2) {
        throw new Error(`Invalid GitHub SSH URL: ${url}`);
      }
      
      owner = parts[0];
      repo = parts[1].replace('.git', ''); // Remove .git extension from repo name
      
      console.log(chalk.gray(`🔍 GitHubUrlParser: SSH parsed - owner: ${owner}, repo: ${repo}`));
    } else {
      throw new Error(`Unsupported GitHub URL format: ${url}`);
    }

    return this.buildRepositoryInfo(owner, repo, branch);
  }

  /**
   * Parse SSH URLs (git@github.com:owner/repo)
   */
  private parseSSHUrl(url: string): RepositoryInfo {
    if (!url.startsWith('git@github.com:')) {
      throw new Error(`Invalid SSH URL format: ${url}`);
    }

    const parts = url.replace('git@github.com:', '').split('/');
    
    if (parts.length < 2) {
      throw new Error(`Invalid SSH URL: ${url}`);
    }

    const owner = parts[0];
    const repo = parts[1].replace('.git', ''); // Remove .git extension from repo name
    
    console.log(chalk.gray(`🔍 GitHubUrlParser: SSH parsed - owner: ${owner}, repo: ${repo}`));

    return this.buildRepositoryInfo(owner, repo);
  }

  /**
   * Parse short format (owner/repo)
   */
  private parseShortFormat(url: string): RepositoryInfo {
    const parts = url.split('/');
    
    if (parts.length !== 2) {
      throw new Error(`Invalid short format: ${url}. Expected format: owner/repo`);
    }

    const owner = parts[0];
    const repo = parts[1].replace('.git', ''); // Remove .git extension from repo name
    
    console.log(chalk.gray(`🔍 GitHubUrlParser: Short format parsed - owner: ${owner}, repo: ${repo}`));

    return this.buildRepositoryInfo(owner, repo);
  }

  /**
   * Build RepositoryInfo object
   */
  private buildRepositoryInfo(owner: string, repo: string, branch?: string): RepositoryInfo {
    const fullName = `${owner}/${repo}`;
    const defaultBranch = branch || 'main';
    
    const result = {
      owner,
      repo,
      branch: defaultBranch,
      fullName,
      url: `https://github.com/${fullName}`,
      cloneUrl: `https://github.com/${fullName}.git`,
      sshUrl: `git@github.com:${fullName}.git`
    };
    
    console.log(chalk.gray(`🔍 GitHubUrlParser: Built RepositoryInfo:`));
    console.log(chalk.gray(`  Owner: ${result.owner}`));
    console.log(chalk.gray(`  Repo: ${result.repo}`));
    console.log(chalk.gray(`  Full Name: ${result.fullName}`));
    console.log(chalk.gray(`  URL: ${result.url}`));
    console.log(chalk.gray(`  Clone URL: ${result.cloneUrl}`));
    
    return result;
  }

  /**
   * Validate if a string looks like a GitHub URL
   */
  isValidGitHubUrl(url: string): boolean {
    try {
      this.parseGitHubUrl(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract owner and repo from any valid GitHub URL
   */
  extractOwnerAndRepo(url: string): { owner: string; repo: string } {
    const info = this.parseGitHubUrl(url);
    return {
      owner: info.owner,
      repo: info.repo
    };
  }

  /**
   * Get the preferred clone URL based on configuration
   */
  getPreferredCloneUrl(repoInfo: RepositoryInfo, preferSSH: boolean = false): string {
    return preferSSH ? repoInfo.sshUrl : repoInfo.cloneUrl;
  }

  /**
   * Normalize GitHub URL to standard format
   */
  normalizeUrl(url: string): string {
    const info = this.parseGitHubUrl(url);
    return info.url;
  }

  /**
   * Check if URL is SSH format
   */
  isSSHUrl(url: string): boolean {
    return url.startsWith('git@github.com:');
  }

  /**
   * Check if URL is HTTPS format
   */
  isHTTPSUrl(url: string): boolean {
    return url.startsWith('https://github.com/');
  }

  /**
   * Check if URL is short format
   */
  isShortFormat(url: string): boolean {
    return !url.includes('github.com') && !url.includes('@') && url.includes('/');
  }
}
