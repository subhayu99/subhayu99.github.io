#!/usr/bin/env node

/**
 * Generate client/src/generated/template-config.ts from the resolved template
 * config. Runs as a `predev` and `prebuild` step so the generated TS module
 * always exists before Vite picks it up.
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  loadTemplateConfig,
  renderTemplateConfigModule,
} from './utils/load-template-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const OUT_DIR = join(ROOT, 'client', 'src', 'generated');
const OUT_FILE = join(OUT_DIR, 'template-config.ts');

function main() {
  const config = loadTemplateConfig();
  const source = renderTemplateConfigModule(config);

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, source, 'utf8');

  const audience = config.isUpstream ? 'upstream' : 'fork';
  console.log(
    `📦 Generated template-config.ts (${audience}) — repo: ${config.site.repoUrl}, version: ${config.version}`,
  );
}

main();
