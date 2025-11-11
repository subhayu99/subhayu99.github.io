/**
 * Configuration Loader Module
 *
 * Loads resume.config.yaml and merges environment-specific overrides
 * based on NODE_ENV or RESUME_ENV environment variables.
 */

import { readFileSync, existsSync } from 'fs';
import { load } from 'js-yaml';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { detectBaseUrl, detectGitHubUsername } from './utils/detect-repo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Deep merge two objects, with source overriding target
 * @param {Object} target - Target object
 * @param {Object} source - Source object (takes precedence)
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });
  }

  return output;
}

/**
 * Check if value is a plain object
 * @param {*} item - Value to check
 * @returns {boolean} True if plain object
 */
function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Get current environment name
 * Checks RESUME_ENV first, then NODE_ENV, defaults to 'development'
 * @returns {string} Environment name
 */
function getEnvironment() {
  const env = process.env.RESUME_ENV || process.env.NODE_ENV || 'development';
  return env.toLowerCase();
}

/**
 * Load and parse configuration file
 * @param {string} configPath - Path to config file
 * @returns {Object} Parsed configuration
 */
function loadConfigFile(configPath) {
  if (!existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }

  try {
    const configContent = readFileSync(configPath, 'utf8');
    const config = load(configContent);

    if (!config || typeof config !== 'object') {
      throw new Error('Invalid configuration: expected object');
    }

    return config;
  } catch (error) {
    throw new Error(`Failed to load configuration: ${error.message}`);
  }
}

/**
 * Validate required configuration fields
 * @param {Object} config - Configuration object
 * @throws {Error} If required fields are missing
 */
function validateConfig(config) {
  const requiredFields = [
    'paths',
    'paths.source',
    'paths.outputDir',
    'urls',
    'urls.base',
    'fields',
    'fields.projectSections',
    'fields.filterField'
  ];

  for (const field of requiredFields) {
    const parts = field.split('.');
    let value = config;

    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) {
        throw new Error(`Missing required configuration field: ${field}`);
      }
    }
  }
}

/**
 * Auto-detect and override base URL for production/CI environments
 * @param {Object} config - Configuration object
 * @param {string} environment - Current environment name
 * @returns {Object} Config with auto-detected base URL (if applicable)
 */
function autoDetectBaseUrl(config, environment) {
  // Only auto-detect for production and CI environments
  // Keep localhost for development
  if (environment === 'development') {
    return config;
  }

  // Try to detect base URL from repository
  const detectedUrl = detectBaseUrl();

  if (detectedUrl) {
    console.log(`🔍 Auto-detected base URL: ${detectedUrl}`);
    return {
      ...config,
      urls: {
        ...config.urls,
        base: detectedUrl
      }
    };
  } else {
    // Couldn't detect - use configured value
    console.warn('⚠️  Could not auto-detect base URL, using configured value');
    return config;
  }
}

/**
 * Build full URLs from base and paths
 * @param {Object} config - Configuration object
 * @returns {Object} Config with computed fullUrls
 */
function computeUrls(config) {
  const { base, resumePdf, resumeMd } = config.urls;

  return {
    ...config,
    urls: {
      ...config.urls,
      full: {
        resumePdf: `${base}${resumePdf}`,
        resumeMd: `${base}${resumeMd}`
      }
    }
  };
}

/**
 * Load configuration with environment-specific overrides
 * @param {string} [configPath] - Optional custom config path
 * @returns {Object} Merged configuration object
 */
export function loadConfig(configPath = null) {
  const rootDir = join(__dirname, '..');
  const defaultConfigPath = join(rootDir, 'resume.config.yaml');
  const finalConfigPath = configPath || defaultConfigPath;

  // Load base configuration
  const baseConfig = loadConfigFile(finalConfigPath);

  // Get current environment
  const environment = getEnvironment();

  // Extract environment-specific overrides
  const envOverrides = baseConfig.environments?.[environment] || {};

  // Remove environments section from base config to avoid confusion
  const { environments, ...configWithoutEnvs } = baseConfig;

  // Merge base config with environment overrides
  let mergedConfig = deepMerge(configWithoutEnvs, envOverrides);

  // Auto-detect base URL for production/CI (overrides config file)
  mergedConfig = autoDetectBaseUrl(mergedConfig, environment);

  // Compute full URLs
  mergedConfig = computeUrls(mergedConfig);

  // Add metadata
  mergedConfig._meta = {
    environment,
    configPath: finalConfigPath,
    loadedAt: new Date().toISOString()
  };

  // Validate configuration
  validateConfig(mergedConfig);

  return mergedConfig;
}

/**
 * Get a nested config value using dot notation
 * @param {Object} config - Configuration object
 * @param {string} path - Dot-separated path (e.g., 'paths.source')
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Configuration value
 */
export function getConfigValue(config, path, defaultValue = undefined) {
  const parts = path.split('.');
  let value = config;

  for (const part of parts) {
    value = value?.[part];
    if (value === undefined) {
      return defaultValue;
    }
  }

  return value;
}

/**
 * Print configuration summary for debugging
 * @param {Object} config - Configuration object
 */
export function printConfigSummary(config) {
  console.log('📋 Configuration Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Environment: ${config._meta.environment}`);
  console.log(`Config file: ${config._meta.configPath}`);
  console.log(`Loaded at: ${config._meta.loadedAt}`);
  console.log('\nKey Settings:');
  console.log(`  Source: ${config.paths.source}`);
  console.log(`  Output: ${config.paths.outputDir}`);
  console.log(`  Base URL: ${config.urls.base}`);
  console.log(`  Resume URL: ${config.urls.full.resumePdf}`);
  console.log(`  Generate PDF: ${config.build.generatePdf}`);
  console.log(`  Generate MD: ${config.build.generateMarkdown}`);
  console.log(`  Generate JSON: ${config.build.generateJson}`);
  console.log(`  Verbose: ${config.build.verbose}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Export environment getter for external use
export { getEnvironment };
