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
const fullData = load(yamlContent);

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
  const sectionPath = `cv.sections.${sectionName}`;
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
// STEP 3: WRITE TEMPORARY YAML FOR RENDERCV
// ============================================================================

if (config.build.generatePdf || config.build.generateMarkdown) {
  if (config.build.verbose) {
    console.log('📝 Creating temporary YAML for rendercv...');
  }

  const tempYamlPath = join(rootDir, config.paths.tempYaml);
  const tempYamlContent = dump(resumeData, { lineWidth: -1, noRefs: true });
  writeFileSync(tempYamlPath, tempYamlContent, 'utf8');
  console.log('✅ Temporary YAML created\n');

  // ============================================================================
  // STEP 4: RUN RENDERCV
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
  // STEP 5: COPY GENERATED FILES
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
// STEP 6: GENERATE WEBSITE JSON
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
    ? (key, value) => {
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
// STEP 7: AUTO-GENERATE ASCII ART NAME
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
// STEP 8: AUTO-GENERATE MANIFEST.JSON
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
// STEP 9: CLEANUP
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
