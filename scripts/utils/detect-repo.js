/**
 * Repository Detection Utility
 *
 * Auto-detects GitHub repository owner and URL from various sources.
 * Used to eliminate hardcoded URLs in configuration files.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Detect GitHub username from various sources
 * @returns {string|null} GitHub username or null if not found
 */
export function detectGitHubUsername() {
  // Method 1: GitHub Actions environment variable
  if (process.env.GITHUB_REPOSITORY) {
    const [owner] = process.env.GITHUB_REPOSITORY.split('/');
    if (owner) {
      console.log(`✓ Detected username from GITHUB_REPOSITORY: ${owner}`);
      return owner;
    }
  }

  // Method 2: Git remote URL
  try {
    const remote = execSync('git config --get remote.origin.url', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'] // Suppress stderr
    }).trim();

    // Match GitHub URLs in various formats:
    // - https://github.com/username/repo.git
    // - git@github.com:username/repo.git
    // - https://github.com/username/repo
    const match = remote.match(/github\.com[:/]([^/]+)\//);
    if (match && match[1]) {
      console.log(`✓ Detected username from git remote: ${match[1]}`);
      return match[1];
    }
  } catch (error) {
    // Git command failed (not in a git repo or no remote configured)
    // Continue to next detection method
  }

  // Method 3: package.json repository field
  try {
    const rootDir = join(__dirname, '..', '..');
    const packagePath = join(rootDir, 'package.json');

    if (existsSync(packagePath)) {
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));

      if (packageJson.repository?.url) {
        const repoUrl = packageJson.repository.url;
        const match = repoUrl.match(/github\.com[:/]([^/]+)\//);

        if (match && match[1]) {
          console.log(`✓ Detected username from package.json: ${match[1]}`);
          return match[1];
        }
      }
    }
  } catch (error) {
    // Failed to read or parse package.json
    // Continue to next method
  }

  // Method 4: Environment variable override
  if (process.env.GITHUB_USERNAME) {
    console.log(`✓ Using username from GITHUB_USERNAME env var: ${process.env.GITHUB_USERNAME}`);
    return process.env.GITHUB_USERNAME;
  }

  console.warn('⚠️  Could not auto-detect GitHub username');
  return null;
}

/**
 * Detect GitHub repository name
 * @returns {string|null} Repository name or null if not found
 */
export function detectRepositoryName() {
  // Method 1: GitHub Actions environment
  if (process.env.GITHUB_REPOSITORY) {
    const [, repo] = process.env.GITHUB_REPOSITORY.split('/');
    if (repo) {
      return repo;
    }
  }

  // Method 2: Git remote URL
  try {
    const remote = execSync('git config --get remote.origin.url', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();

    // Extract repo name (with or without .git extension)
    const match = remote.match(/\/([^/]+?)(\.git)?$/);
    if (match && match[1]) {
      return match[1];
    }
  } catch (error) {
    // Git command failed
  }

  // Method 3: package.json name field
  try {
    const rootDir = join(__dirname, '..', '..');
    const packagePath = join(rootDir, 'package.json');

    if (existsSync(packagePath)) {
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      if (packageJson.name) {
        return packageJson.name;
      }
    }
  } catch (error) {
    // Failed to read package.json
  }

  return null;
}

/**
 * Get base URL for GitHub Pages deployment
 * @returns {string} Base URL (e.g., https://username.github.io or https://username.github.io/repo-name)
 */
export function detectBaseUrl() {
  const username = detectGitHubUsername();
  const repoName = detectRepositoryName();

  if (!username) {
    console.warn('⚠️  Could not detect base URL - using fallback');
    return null;
  }

  // Check if this is a user/org GitHub Pages site (username.github.io)
  // or a project site (any other repo name)
  const isUserSite = repoName === `${username}.github.io`;

  if (isUserSite) {
    // User/org site: https://username.github.io/
    return `https://${username}.github.io`;
  } else {
    // Project site: https://username.github.io/repo-name/
    return `https://${username}.github.io/${repoName}`;
  }
}

/**
 * Get full repository URL
 * @returns {string|null} Full repository URL or null if not detected
 */
export function detectRepositoryUrl() {
  const username = detectGitHubUsername();
  const repoName = detectRepositoryName();

  if (!username || !repoName) {
    return null;
  }

  return `https://github.com/${username}/${repoName}`;
}

/**
 * Get all detected repository information
 * @returns {Object} Repository information
 */
export function detectRepositoryInfo() {
  const username = detectGitHubUsername();
  const repoName = detectRepositoryName();
  const baseUrl = detectBaseUrl();
  const repoUrl = detectRepositoryUrl();

  return {
    username,
    repoName,
    baseUrl,
    repoUrl,
    detected: !!(username && repoName)
  };
}
