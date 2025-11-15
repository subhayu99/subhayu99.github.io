#!/usr/bin/env node

/**
 * Resume Generation Script
 *
 * This script performs the following tasks:
 * 1. Loads configuration from resume.config.yaml
 * 2. Reads source resume YAML file
 * 3. Generates PDF resume via rendercv (filtering projects based on config)
 * 4. Generates markdown resume via rendercv
 * 5. Generates website JSON (including all projects)
 *
 * Usage: node scripts/generate-resume.js
 *
 * Environment variables:
 *   NODE_ENV or RESUME_ENV - Set environment (development, production, ci)
 *   Example: NODE_ENV=production node scripts/generate-resume.js
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import fs from 'fs-extra';
import { load, dump } from 'js-yaml';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadConfig, printConfigSummary } from './config-loader.js';
import { generateASCIIName, generateManifest, saveASCIIName, saveManifest } from './utils/auto-generators.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// ============================================================================
// RENDERCV SCHEMA COMPATIBILITY
// ============================================================================

/**
 * Complete mapping of RenderCV-supported fields for CV sections.
 *
 * RenderCV YAML structure has 4 main fields:
 * - cv: Resume content (THIS is where we strip custom fields)
 * - design: Theme/design options (preserved entirely - passed through as-is)
 * - locale: Language/formatting strings (preserved entirely - passed through as-is)
 * - rendercv_settings: RenderCV settings (preserved entirely - passed through as-is)
 *
 * Our Zod schema allows custom fields via .passthrough() for the web interface,
 * but RenderCV's Pydantic validation may reject them in practice. This function
 * strips custom fields from CV entries while preserving all RenderCV config fields.
 *
 * Based on RenderCV's official documentation:
 * - EducationEntry: institution*, area*, degree, location, start_date, end_date, date, summary, highlights
 * - ExperienceEntry: company*, position*, location, start_date, end_date, date, summary, highlights
 * - NormalEntry: name*, location, start_date, end_date, date, summary, highlights
 * - OneLineEntry: label*, details*
 * - PublicationEntry: title*, authors*, doi, url, journal, date
 *
 * Fields marked with * are mandatory in RenderCV's schema.
 *
 * Source: https://github.com/rendercv/rendercv/blob/main/docs/user_guide/structure_of_the_yaml_input_file.md
 * Last verified: 2025-11-15 (see lines 65-96 for entry types)
 *
 * ⚠️ MAINTENANCE NOTE: Check the above URL periodically for RenderCV schema updates.
 *    If new fields are added to entry types, update this mapping accordingly.
 */
const RENDERCV_ALLOWED_FIELDS = {
  // CV-level: social_networks (lines 59-64)
  social_networks: ['network', 'username'],

  // Section entry types - mapped to our section names
  technologies: ['label', 'details'],  // OneLineEntry (lines 200-205)

  experience: [  // ExperienceEntry (lines 154-168)
    'company', 'position',  // mandatory
    'location', 'start_date', 'end_date', 'date', 'summary', 'highlights'  // optional
  ],

  education: [  // EducationEntry (lines 137-152)
    'institution', 'area',  // mandatory
    'degree', 'location', 'start_date', 'end_date', 'date', 'summary', 'highlights'  // optional
  ],

  professional_projects: [  // NormalEntry (lines 184-198)
    'name',  // mandatory
    'location', 'start_date', 'end_date', 'date', 'summary', 'highlights'  // optional
  ],

  personal_projects: [  // NormalEntry (lines 184-198)
    'name',  // mandatory
    'location', 'start_date', 'end_date', 'date', 'summary', 'highlights'  // optional
  ],

  publication: [  // PublicationEntry (lines 170-182)
    'title', 'authors',  // mandatory
    'doi', 'url', 'journal', 'date'  // optional
  ],
};

/**
 * Detects the RenderCV entry type based on the fields present in an entry.
 * This enables support for dynamic section names (like "certifications", "awards", etc.)
 *
 * @param {*} entry - The entry object to analyze
 * @returns {string|null} - The entry type or null if unknown
 */
function detectEntryType(entry) {
  // Handle text entries (simple strings) - TextEntry
  if (typeof entry === 'string') {
    return 'text';
  }

  // Not an object - unknown type
  if (typeof entry !== 'object' || entry === null) {
    return null;
  }

  // ExperienceEntry: Must have 'company' and 'position'
  if ('company' in entry && 'position' in entry) {
    return 'experience';
  }

  // EducationEntry: Must have 'institution' and 'area'
  if ('institution' in entry && 'area' in entry) {
    return 'education';
  }

  // PublicationEntry: Must have 'title' and 'authors' (authors must be array)
  if ('title' in entry && 'authors' in entry && Array.isArray(entry.authors)) {
    return 'publication';
  }

  // OneLineEntry: Must have 'label' and 'details'
  if ('label' in entry && 'details' in entry) {
    return 'technologies';
  }

  // NormalEntry: Must have 'name' (covers projects, certifications, awards, etc.)
  if ('name' in entry) {
    return 'projects';
  }

  // Unknown type - preserve as-is
  return null;
}

/**
 * Gets the allowed RenderCV fields for a detected entry type.
 *
 * @param {string} entryType - The detected entry type
 * @returns {Array<string>|null} - Array of allowed field names, or null to preserve all fields
 */
function getAllowedFieldsForEntryType(entryType) {
  switch (entryType) {
    case 'experience':
      return RENDERCV_ALLOWED_FIELDS.experience;
    case 'education':
      return RENDERCV_ALLOWED_FIELDS.education;
    case 'projects':
      // NormalEntry - same as professional_projects/personal_projects
      return RENDERCV_ALLOWED_FIELDS.professional_projects;
    case 'technologies':
      return RENDERCV_ALLOWED_FIELDS.technologies;
    case 'publication':
      return RENDERCV_ALLOWED_FIELDS.publication;
    case 'text':
      return []; // Text entries are just strings, no fields to strip
    default:
      return null; // Unknown type - preserve all fields
  }
}

function stripCustomFields(data) {
  const cleaned = JSON.parse(JSON.stringify(data)); // Deep clone

  // Strip custom fields from social_networks
  if (cleaned.cv?.social_networks && Array.isArray(cleaned.cv.social_networks)) {
    cleaned.cv.social_networks = cleaned.cv.social_networks.map(item => {
      const allowed = {};
      for (const field of RENDERCV_ALLOWED_FIELDS.social_networks) {
        if (item[field] !== undefined) {
          allowed[field] = item[field];
        }
      }
      return allowed;
    });
  }

  // Strip custom fields from all sections (both standard and dynamic)
  if (cleaned.cv?.sections) {
    for (const [sectionName, sectionData] of Object.entries(cleaned.cv.sections)) {
      if (!Array.isArray(sectionData)) {
        continue; // Skip non-array sections
      }

      // Check if this is a known section with predefined fields
      if (RENDERCV_ALLOWED_FIELDS[sectionName]) {
        // Use predefined field mapping for known sections
        cleaned.cv.sections[sectionName] = sectionData.map(item => {
          const allowed = {};
          for (const field of RENDERCV_ALLOWED_FIELDS[sectionName]) {
            if (item[field] !== undefined) {
              allowed[field] = item[field];
            }
          }
          return allowed;
        });
      } else {
        // Dynamic section - detect entry type and strip fields accordingly
        cleaned.cv.sections[sectionName] = sectionData.map(item => {
          // Text entries (strings) pass through unchanged
          if (typeof item === 'string') {
            return item;
          }

          // Detect entry type
          const entryType = detectEntryType(item);
          const allowedFields = getAllowedFieldsForEntryType(entryType);

          // If unknown type, preserve all fields (safety fallback)
          if (!allowedFields) {
            return item;
          }

          // Strip custom fields based on detected entry type
          const allowed = {};
          for (const field of allowedFields) {
            if (item[field] !== undefined) {
              allowed[field] = item[field];
            }
          }
          return allowed;
        });
      }
    }
  }

  return cleaned;
}

// ============================================================================
// LOAD CONFIGURATION
// ============================================================================

const config = loadConfig();

if (config.build.verbose) {
  printConfigSummary(config);
}

console.log('🚀 Starting resume generation process...\n');

// ============================================================================
// STEP 1: READ SOURCE YAML
// ============================================================================

if (config.build.verbose) {
  console.log(`📖 Reading ${config.paths.source}...`);
}

const sourceYamlPath = join(rootDir, config.paths.source);
if (!existsSync(sourceYamlPath)) {
  console.error(`❌ Error: ${config.paths.source} not found!`);
  process.exit(1);
}

const yamlContent = readFileSync(sourceYamlPath, 'utf8');
const fullData = load(yamlContent, { sortKeys: false });

// Log original section order for debugging
if (config.build.verbose && fullData.cv?.sections) {
  const originalSectionNames = Object.keys(fullData.cv.sections);
  console.log('📋 Original section order from YAML:', originalSectionNames.join(' → '));
}

console.log('✅ Source YAML loaded successfully\n');

// ============================================================================
// COMPUTE RENDERCV OUTPUT PATTERN
// ============================================================================

// Convert cv.name to slug format for filenames (e.g., "John Doe" -> "John_Doe")
const nameSlug = fullData.cv.name.replace(/\s+/g, '_');

// Replace template variables in output pattern
const rendercvOutputPattern = config.rendercv.outputPattern.replace('{{cv.name}}', nameSlug);

if (config.build.verbose) {
  console.log(`📝 RenderCV output pattern: ${rendercvOutputPattern}`);
  console.log();
}

// ============================================================================
// STEP 2: FILTER PROJECTS FOR RESUME PDF
// ============================================================================

console.log('🔍 Filtering projects for resume PDF...');

const resumeData = JSON.parse(JSON.stringify(fullData)); // Deep clone

// Process each project section defined in config
for (const sectionName of config.fields.projectSections) {
  const projects = resumeData.cv?.sections?.[sectionName];

  if (projects && Array.isArray(projects)) {
    const originalCount = projects.length;

    // Filter projects based on filterField (default: show_on_resume)
    resumeData.cv.sections[sectionName] = projects
      .filter(project => project[config.fields.filterField] !== false)
      .map(project => {
        // Remove fields specified in config.fields.removeFromResume
        const cleaned = { ...project };
        for (const fieldToRemove of config.fields.removeFromResume) {
          delete cleaned[fieldToRemove];
        }
        return cleaned;
      });

    const filteredCount = resumeData.cv.sections[sectionName].length;
    console.log(`   ${sectionName}: ${filteredCount}/${originalCount} (resume-only)`);
  }
}

// Remove additional fields from CV root (e.g., resume_url)
for (const fieldToRemove of config.fields.removeFromResume) {
  if (resumeData.cv?.[fieldToRemove]) {
    delete resumeData.cv[fieldToRemove];
  }
}

// Exclude specified CV fields from resume PDF (e.g., phone, location)
if (config.fields.excludeCvFields && config.fields.excludeCvFields.length > 0) {
  if (config.build.verbose) {
    console.log(`🔒 Excluding CV fields from resume: ${config.fields.excludeCvFields.join(', ')}`);
  }
  for (const fieldToExclude of config.fields.excludeCvFields) {
    if (resumeData.cv?.[fieldToExclude]) {
      delete resumeData.cv[fieldToExclude];
    }
  }
}

console.log('✅ Projects filtered successfully\n');

// Remove empty sections to prevent RenderCV errors
console.log('🧹 Removing empty sections...');
for (const sectionName of config.fields.projectSections) {
  const section = resumeData.cv?.sections?.[sectionName];
  if (section && Array.isArray(section) && section.length === 0) {
    delete resumeData.cv.sections[sectionName];
    if (config.build.verbose) {
      console.log(`   Removed empty section: ${sectionName}`);
    }
  }
}
console.log('✅ Empty sections removed\n');

// ============================================================================
// STEP 3: STRIP CUSTOM FIELDS FOR RENDERCV COMPATIBILITY
// ============================================================================

console.log('🔧 Stripping custom fields for RenderCV compatibility...');
const rendercvData = stripCustomFields(resumeData);
console.log('✅ Custom fields removed\n');

// ============================================================================
// STEP 4: WRITE TEMPORARY YAML FOR RENDERCV
// ============================================================================

if (config.build.generatePdf || config.build.generateMarkdown) {
  if (config.build.verbose) {
    console.log('📝 Creating temporary YAML for rendercv...');
  }

  // Log section order for debugging
  if (config.build.verbose && rendercvData.cv?.sections) {
    const sectionNames = Object.keys(rendercvData.cv.sections);
    console.log('📋 Section order:', sectionNames.join(' → '));
  }

  const tempYamlPath = join(rootDir, config.paths.tempYaml);
  const tempYamlContent = dump(rendercvData, { lineWidth: -1, noRefs: true, sortKeys: false });
  writeFileSync(tempYamlPath, tempYamlContent, 'utf8');
  console.log('✅ Temporary YAML created\n');

  // ============================================================================
  // STEP 5: RUN RENDERCV
  // ============================================================================

  console.log('🎨 Running rendercv to generate PDF and markdown...');

  // Check if rendercv is installed
  try {
    execSync('which rendercv', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Error: rendercv not found! Please install it with: pip install rendercv');
    process.exit(1);
  }

  // Build rendercv command
  const rendercvOptions = config.rendercv.options.join(' ');
  const rendercvCommand = `rendercv render "${tempYamlPath}" ${rendercvOptions}`.trim();

  try {
    execSync(rendercvCommand, {
      stdio: 'inherit',
      cwd: rootDir
    });
    console.log('✅ rendercv completed successfully\n');
  } catch (error) {
    console.error('❌ Error running rendercv:', error.message);
    process.exit(1);
  }

  // ============================================================================
  // STEP 6: COPY GENERATED FILES
  // ============================================================================

  console.log('📋 Copying generated files to output directory...');

  const rendercvOutputDir = join(rootDir, config.paths.rendercvOutputDir);
  if (!existsSync(rendercvOutputDir)) {
    console.error(`❌ Error: ${config.paths.rendercvOutputDir} directory not found!`);
    process.exit(1);
  }

  const publicDir = join(rootDir, config.paths.outputDir);
  if (!existsSync(publicDir)) {
    console.error(`❌ Error: ${config.paths.outputDir} directory not found!`);
    process.exit(1);
  }

  // Copy PDF if enabled
  if (config.build.generatePdf) {
    const pdfFileName = rendercvOutputPattern + config.rendercv.extensions.pdf;
    const pdfSourcePath = join(rendercvOutputDir, pdfFileName);
    const pdfDestPath = join(publicDir, config.paths.outputs.pdf);

    if (!existsSync(pdfSourcePath)) {
      console.error(`❌ Error: Generated PDF not found at ${pdfSourcePath}`);
      process.exit(1);
    }

    fs.copySync(pdfSourcePath, pdfDestPath);
    console.log(`✅ Copied ${pdfFileName} → ${config.paths.outputDir}/${config.paths.outputs.pdf}`);
  }

  // Copy Markdown if enabled
  if (config.build.generateMarkdown) {
    const mdFileName = rendercvOutputPattern + config.rendercv.extensions.markdown;
    const mdSourcePath = join(rendercvOutputDir, mdFileName);
    const mdDestPath = join(publicDir, config.paths.outputs.markdown);

    if (!existsSync(mdSourcePath)) {
      console.error(`❌ Error: Generated markdown not found at ${mdSourcePath}`);
      process.exit(1);
    }

    fs.copySync(mdSourcePath, mdDestPath);
    console.log(`✅ Copied ${mdFileName} → ${config.paths.outputDir}/${config.paths.outputs.markdown}`);
  }

  console.log();
}

// ============================================================================
// STEP 7: GENERATE WEBSITE JSON
// ============================================================================

if (config.build.generateJson) {
  console.log('📦 Generating website JSON with all projects...');

  const websiteData = {
    cv: {
      ...fullData.cv,
      // Set resume URL from config
      [config.fields.resumeUrlField]: fullData.cv[config.fields.resumeUrlField] || config.urls.full.resumePdf
    }
  };

  // Remove filter field from all projects (not needed in JSON)
  for (const sectionName of config.fields.projectSections) {
    const projects = websiteData.cv?.sections?.[sectionName];

    if (projects && Array.isArray(projects)) {
      websiteData.cv.sections[sectionName] = projects.map(project => {
        const cleaned = { ...project };
        delete cleaned[config.fields.filterField];
        return cleaned;
      });
    }
  }

  // Convert to JSON with configurable formatting
  const jsonReplacer = config.build.jsonSortKeys
    ? (_key, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          return Object.keys(value).sort().reduce((sorted, k) => {
            sorted[k] = value[k];
            return sorted;
          }, {});
        }
        return value;
      }
    : null;

  let jsonString = JSON.stringify(websiteData, jsonReplacer, config.build.jsonIndent);

  // Apply text transformations from config
  if (config.transforms.markdownToHtml.enabled) {
    for (const rule of config.transforms.markdownToHtml.rules) {
      const regex = new RegExp(rule.pattern, 'g');
      jsonString = jsonString.replace(regex, rule.replacement);
    }
  }

  // Write JSON file
  const dataDir = join(rootDir, config.paths.dataDir);
  if (!existsSync(dataDir)) {
    fs.ensureDirSync(dataDir);
  }

  const jsonDestPath = join(dataDir, config.paths.outputs.json);
  writeFileSync(jsonDestPath, jsonString, 'utf8');

  console.log(`✅ Website JSON generated → ${config.paths.dataDir}/${config.paths.outputs.json}\n`);
}

// ============================================================================
// STEP 8: AUTO-GENERATE ASCII ART NAME
// ============================================================================

if (config.build.verbose) {
  console.log('🎨 Auto-generating ASCII art name...');
}

const styledNamePath = join(rootDir, 'client/public/data/styled_name.txt');

// Only generate if it doesn't exist (don't overwrite custom ones)
if (!existsSync(styledNamePath)) {
  try {
    const ascii = await generateASCIIName(fullData.cv.name);
    saveASCIIName(ascii, styledNamePath);
  } catch (error) {
    console.warn('⚠️  Warning: Could not generate ASCII art name:', error.message);
  }
} else {
  if (config.build.verbose) {
    console.log('ℹ️  styled_name.txt already exists, skipping generation');
  }
}

// ============================================================================
// STEP 9: AUTO-GENERATE MANIFEST.JSON
// ============================================================================

if (config.build.verbose) {
  console.log('📦 Auto-generating manifest.json...');
}

const manifestPath = join(rootDir, 'client/public/manifest.json');

// Only generate if it doesn't exist (don't overwrite custom ones)
if (!existsSync(manifestPath)) {
  try {
    const manifest = generateManifest(fullData, config.urls.base);
    saveManifest(manifest, manifestPath);
  } catch (error) {
    console.warn('⚠️  Warning: Could not generate manifest.json:', error.message);
  }
} else {
  if (config.build.verbose) {
    console.log('ℹ️  manifest.json already exists, skipping generation');
  }
}

console.log(); // Empty line for spacing

// ============================================================================
// STEP 10: CLEANUP
// ============================================================================

if (config.build.cleanupTemp) {
  if (config.build.verbose) {
    console.log('🧹 Cleaning up temporary files...');
  }

  const tempYamlPath = join(rootDir, config.paths.tempYaml);
  try {
    if (existsSync(tempYamlPath)) {
      fs.removeSync(tempYamlPath);
      console.log('✅ Temporary YAML removed');
    }
  } catch (error) {
    console.warn('⚠️  Warning: Could not remove temporary YAML file');
  }

  // Optionally clean up rendercv output directory
  if (config.build.cleanupRendercvOutput) {
    try {
      const rendercvOutputDir = join(rootDir, config.paths.rendercvOutputDir);
      if (existsSync(rendercvOutputDir)) {
        fs.removeSync(rendercvOutputDir);
        console.log('✅ RenderCV output directory cleaned');
      }
    } catch (error) {
      console.warn('⚠️  Warning: Could not remove rendercv_output directory');
    }
  }

  console.log();
}

// ============================================================================
// SUMMARY
// ============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✨ Resume generation completed successfully!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\nGenerated files:');

if (config.build.generatePdf) {
  console.log(`  📄 PDF:      ${config.paths.outputDir}/${config.paths.outputs.pdf}`);
}
if (config.build.generateMarkdown) {
  console.log(`  📝 Markdown: ${config.paths.outputDir}/${config.paths.outputs.markdown}`);
}
if (config.build.generateJson) {
  console.log(`  📦 JSON:     ${config.paths.dataDir}/${config.paths.outputs.json}`);
}

// Show auto-generated files if they were created
if (existsSync(styledNamePath) || existsSync(manifestPath)) {
  console.log('\nAuto-generated files:');
  if (existsSync(styledNamePath)) {
    console.log(`  🎨 ASCII Name: client/public/data/styled_name.txt`);
  }
  if (existsSync(manifestPath)) {
    console.log(`  📱 Manifest:   client/public/manifest.json`);
  }
}

console.log('\n✅ Ready for deployment!\n');
