#!/usr/bin/env node

/**
 * Build Script with Conditional Resume Generation
 *
 * This script:
 * 1. Checks if resume.yaml exists
 * 2. If yes, runs generate-resume to create resume.json
 * 3. Then runs vite build
 * 4. If no resume.yaml, skips generation and builds with fallback metadata
 */

import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const resumePath = join(rootDir, 'resume.yaml');

if (existsSync(resumePath)) {
  console.log('📄 resume.yaml found - generating resume files...\n');

  try {
    // Check if rendercv is available
    execSync('which rendercv', { stdio: 'pipe' });

    // Run generate-resume
    execSync('npm run generate-resume:prod', {
      stdio: 'inherit',
      cwd: rootDir
    });

    console.log('\n✅ Resume generation complete\n');
  } catch (error) {
    console.warn('⚠️  Could not generate resume (rendercv not installed or generation failed)');
    console.warn('   Building with fallback metadata...\n');
  }
} else {
  console.log('ℹ️  No resume.yaml found - building with generic metadata\n');
}

// Generate AI resume conversion prompt
console.log('🤖 Generating AI resume conversion prompt...\n');
try {
  execSync('node scripts/generate-ai-prompt.js', {
    stdio: 'inherit',
    cwd: rootDir
  });
} catch (error) {
  console.warn('⚠️  Could not generate AI prompt');
  console.warn('   Continuing with build...\n');
}

// Fetch PyPI download stats
console.log('📊 Fetching PyPI download statistics...\n');
try {
  execSync('node scripts/fetch-pypi-stats.js', {
    stdio: 'inherit',
    cwd: rootDir
  });
  console.log('\n✅ PyPI stats fetched\n');
} catch (error) {
  console.warn('⚠️  Could not fetch PyPI stats (network issue or rate limit)');
  console.warn('   Building without live stats...\n');
}

// Run vite build
console.log('🏗️  Building application...\n');
execSync('vite build', {
  stdio: 'inherit',
  cwd: rootDir
});

console.log('\n✅ Build complete!');
