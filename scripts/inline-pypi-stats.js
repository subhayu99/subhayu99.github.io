#!/usr/bin/env node

/**
 * Inline PyPI download counts into resume.yaml.
 *
 * Reads:   client/public/data/pypi-stats.json (output of fetch-pypi-stats.js)
 *          scripts/pypi-inline.config.yaml    (replacement rules)
 *          resume.yaml                        (raw text, byte-preserving)
 *
 * Writes:  resume.yaml (atomic temp-file + rename)
 *
 * Flags:
 *   --dry-run   Print what would change, do not write.
 *
 * Exit codes:
 *   0  success, soft-skip (missing inputs, no matches, unknown package)
 *   1  hard error (config malformed, bad regex, file write failed)
 *
 * Spec: docs/superpowers/specs/2026-04-27-inline-pypi-stats-design.md
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { formatCompact } from './utils/format-compact.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const STATS_PATH = path.join(ROOT, 'client', 'public', 'data', 'pypi-stats.json');
const CONFIG_PATH = path.join(ROOT, 'scripts', 'pypi-inline.config.yaml');
const RESUME_PATH = path.join(ROOT, 'resume.yaml');

const DRY_RUN = process.argv.includes('--dry-run');
const LOG_PREFIX = '[inline-pypi]';

function log(msg) { console.log(`${LOG_PREFIX} ${msg}`); }
function warn(msg) { console.warn(`${LOG_PREFIX} ⚠ ${msg}`); }
function fatal(msg) { console.error(`${LOG_PREFIX} ✗ ${msg}`); process.exit(1); }

/**
 * Resolve {{TOKEN}} placeholders in a value template using the stats JSON.
 * Returns null if the rule references an unknown package (caller skips it).
 */
function resolveValue(template, stats) {
  let result = template;
  let unknown = null;

  // {{TOTAL}}
  result = result.replace(/\{\{TOTAL\}\}/g, () => formatCompact(stats.total_downloads));

  // {{PACKAGE:<name>}} and {{PACKAGE_180D:<name>}}
  result = result.replace(/\{\{PACKAGE(_180D)?:([^}]+)\}\}/g, (_full, suffix, name) => {
    const pkg = stats.packages[name];
    if (!pkg) {
      unknown = name;
      return '__UNKNOWN__';
    }
    const value = suffix === '_180D' ? pkg.total_180d : pkg.total_all_time;
    return formatCompact(value);
  });

  return { resolved: unknown ? null : result, unknown };
}

/**
 * Compute the 1-based line number of a character offset in a string.
 */
function lineOf(text, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') line++;
  }
  return line;
}

async function main() {
  // 1. Load pypi-stats.json (soft-fail)
  if (!fs.existsSync(STATS_PATH)) {
    warn(`${path.relative(ROOT, STATS_PATH)} not found — run fetch-pypi-stats.js first`);
    warn('Skipping inline step (exit 0, build continues)');
    return;
  }
  let stats;
  try {
    stats = JSON.parse(fs.readFileSync(STATS_PATH, 'utf8'));
  } catch (e) {
    warn(`${path.relative(ROOT, STATS_PATH)} is not valid JSON: ${e.message}`);
    warn('Skipping inline step (exit 0, build continues)');
    return;
  }
  const packages = stats.packages || {};
  if (Object.keys(packages).length === 0) {
    warn(`${path.relative(ROOT, STATS_PATH)} has no packages`);
    warn('Skipping inline step (exit 0, build continues)');
    return;
  }

  // 2. Load + validate config (hard-fail on malformed)
  if (!fs.existsSync(CONFIG_PATH)) {
    fatal(`${path.relative(ROOT, CONFIG_PATH)} not found`);
  }
  let config;
  try {
    config = yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    fatal(`Could not parse ${path.relative(ROOT, CONFIG_PATH)}: ${e.message}`);
  }
  const rules = config?.rules;
  if (!Array.isArray(rules) || rules.length === 0) {
    fatal(`${path.relative(ROOT, CONFIG_PATH)} must contain a non-empty 'rules' array`);
  }

  // Compile every rule up front so config bugs fail loudly.
  // The 'd' flag enables match.indices, which gives us per-group offsets
  // (used in the loop below to locate the capture group within the source).
  const compiledRules = rules.map((rule, i) => {
    const label = rule.description || `rule[${i}]`;
    if (!rule.description || !rule.pattern || !rule.value) {
      fatal(`${label}: each rule needs description, pattern, and value`);
    }
    let regex;
    try {
      regex = new RegExp(rule.pattern, 'gd');
    } catch (e) {
      fatal(`${label}: invalid regex pattern: ${e.message}`);
    }
    return { ...rule, regex, label };
  });

  // 3. Load resume.yaml as raw text (soft-fail)
  if (!fs.existsSync(RESUME_PATH)) {
    warn(`${path.relative(ROOT, RESUME_PATH)} not found (gitignored on main; run npm run hydrate)`);
    warn('Skipping inline step (exit 0, build continues)');
    return;
  }
  const originalText = fs.readFileSync(RESUME_PATH, 'utf8');

  log(`Loaded ${compiledRules.length} rules, ${Object.keys(packages).length} packages` +
      `, total ${stats.total_downloads.toLocaleString()} all-time`);
  if (DRY_RUN) log('DRY RUN — no file will be written');

  let currentText = originalText;
  const changeLog = []; // for dry-run preview

  for (const rule of compiledRules) {
    const { resolved, unknown } = resolveValue(rule.value, stats);
    if (resolved === null) {
      warn(`· skipped (unknown package '${unknown}'): ${rule.label}`);
      continue;
    }

    // Find matches first so we can log line numbers + count without mutating yet
    const matches = [...currentText.matchAll(rule.regex)];
    if (matches.length === 0) {
      log(`· skipped (no match): ${rule.label}`);
      continue;
    }

    // Replace each match's first capture group with `resolved`. We use
    // match.indices (from the /d flag) for the precise capture offsets,
    // and rebuild the string by walking matches in order. This is clearer
    // than .replace()'s function form and avoids regex-state surprises.
    let next = '';
    let cursor = 0;
    for (const m of matches) {
      if (!m.indices || !m.indices[1]) {
        fatal(`${rule.label}: pattern /${rule.regex.source}/ has no capture group (need at least one '(...)')`);
      }
      const [captureStart, captureEnd] = m.indices[1];
      const before = currentText.slice(captureStart, captureEnd);
      next += currentText.slice(cursor, captureStart) + resolved;
      cursor = captureEnd;

      changeLog.push({
        rule: rule.label,
        line: lineOf(currentText, captureStart),
        before,
        after: resolved,
      });
    }
    next += currentText.slice(cursor);

    currentText = next;
    log(`· updated (${matches.length} match${matches.length === 1 ? '' : 'es'}): ${rule.label} → ${resolved}`);
  }

  if (currentText === originalText) {
    log('No changes (resume.yaml already up to date)');
    return;
  }

  if (DRY_RUN) {
    log(`DRY RUN — would write ${changeLog.length} change(s):`);
    const labelWidth = Math.max(...changeLog.map(c => c.before.length));
    for (const c of changeLog) {
      console.log(`   line ${String(c.line).padStart(4)}: ${c.before.padEnd(labelWidth)} → ${c.after}    [${c.rule}]`);
    }
    log('No file written.');
    return;
  }

  // Atomic write: temp file + rename
  const tmpPath = `${RESUME_PATH}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(tmpPath, currentText, 'utf8');
    fs.renameSync(tmpPath, RESUME_PATH);
  } catch (e) {
    try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    fatal(`Failed to write ${path.relative(ROOT, RESUME_PATH)}: ${e.message}`);
  }
  log(`resume.yaml updated (${changeLog.length} change${changeLog.length === 1 ? '' : 's'})`);
}

main().catch(err => fatal(err.stack || err.message));
