# inline-pypi-stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-update PyPI download counts in `resume.yaml` at build time using a config-driven script, so the deployed PDF + JSON ship with current numbers without manual edits.

**Architecture:** A Node script reads `client/public/data/pypi-stats.json` + a YAML rule file + the raw `resume.yaml`, applies each rule's regex to replace the first capture group with a token-resolved value, writes back. Runs in the build pipeline between `fetch-pypi-stats` and `generate-resume:prod`.

**Tech Stack:** Node 20+ (ESM), `js-yaml` (already a dep), no new dependencies.

**Spec:** `docs/superpowers/specs/2026-04-27-inline-pypi-stats-design.md`

**Test posture:** Project has no Node-side test runner. Each task uses **manual smoke verification** (concrete commands with expected output) rather than automated tests. This matches the existing posture of `fetch-pypi-stats.js` / `generate-resume.js` and is explicit non-goal #5 in the spec.

**Pre-task setup (run once before starting Task 1):**

```bash
# Confirm we're on the right branch and resume.yaml is hydrated
git status                                # On branch subhayu99/inline-pypi-stats
ls -la resume.yaml                        # Should exist (gitignored)

# If resume.yaml is missing, hydrate it:
npm run hydrate
```

If `resume.yaml` is genuinely absent and `npm run hydrate` fails (e.g. running from a fresh checkout without the personal branch fetched), the engine will still be testable against a hand-crafted minimal `resume.yaml` — but for full verification, you need the real one. Stop and ask the maintainer.

---

## File Structure

**New files:**
- `scripts/utils/format-compact.js` — pure number formatter (`<1000 → "123"`, `1000-9999 → "5.7k"`, `10000+ → "43k"`). One exported function.
- `scripts/pypi-inline.config.yaml` — declarative list of replacement rules.
- `scripts/inline-pypi-stats.js` — engine. Reads stats + config + resume.yaml, applies rules, writes resume.yaml. Supports `--dry-run`.

**Modified files:**
- `scripts/build.js` — re-order existing steps and insert new `inline-pypi-stats` invocation.
- `package.json` — add `"inline-pypi"` npm script.

**Untouched but referenced:**
- `scripts/fetch-pypi-stats.js` (read-only context — output shape of `pypi-stats.json`)
- `scripts/generate-resume.js` (read-only context — runs after our step, consumes the mutated `resume.yaml`)

---

## Task 1: Create the compact-number formatter

**Files:**
- Create: `scripts/utils/format-compact.js`

- [ ] **Step 1: Verify the utils directory exists**

```bash
ls scripts/utils/
```

Expected: directory exists (it already contains `auto-generators.js`). If it doesn't, create it: `mkdir -p scripts/utils`.

- [ ] **Step 2: Create the formatter file**

Write `scripts/utils/format-compact.js`:

```javascript
/**
 * Format a positive integer compactly for inline use in prose.
 *
 * Rules (per docs/superpowers/specs/2026-04-27-inline-pypi-stats-design.md):
 *   < 1000:     "123"        (no suffix)
 *   1000-9999:  "5.7k"       (one decimal, rounded)
 *   10000+:     "43k"        (no decimal, rounded to nearest 1000)
 *
 * Trailing "+" is the caller's responsibility — the formatter never adds it.
 *
 * @param {number} n - non-negative integer
 * @returns {string}
 */
export function formatCompact(n) {
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`formatCompact: expected non-negative finite number, got ${n}`);
  }
  if (n < 1000) return String(Math.round(n));
  if (n < 10_000) return `${(Math.round(n / 100) / 10).toFixed(1)}k`;
  return `${Math.round(n / 1000)}k`;
}
```

Notes on the edge cases baked into the implementation:
- `Math.round(n / 100) / 10` for the 1000–9999 band rounds to the nearest 0.1k (e.g. `5723 → 5.7`, `5750 → 5.8`).
- For 10000+, `Math.round(n / 1000)` gives integer thousands (e.g. `10523 → 11`, `99500 → 100`).

- [ ] **Step 3: Smoke-test the formatter**

Run an inline Node check:

```bash
node --input-type=module -e "
import('./scripts/utils/format-compact.js').then(({ formatCompact }) => {
  const cases = [
    [0, '0'],
    [42, '42'],
    [999, '999'],
    [1000, '1.0k'],
    [5723, '5.7k'],
    [5750, '5.8k'],
    [9999, '10.0k'],
    [10000, '10k'],
    [10523, '11k'],
    [43000, '43k'],
    [43124, '43k'],
    [99500, '100k'],
    [123456, '123k'],
  ];
  let ok = true;
  for (const [input, expected] of cases) {
    const got = formatCompact(input);
    const pass = got === expected;
    if (!pass) ok = false;
    console.log(\`\${pass ? '✓' : '✗'} formatCompact(\${input}) = '\${got}' \${pass ? '' : \`(expected '\${expected}')\`}\`);
  }
  process.exit(ok ? 0 : 1);
});
"
```

Expected: all 13 cases print `✓`, exit code 0. If any case fails, fix the formatter and re-run.

- [ ] **Step 4: Commit**

```bash
git add scripts/utils/format-compact.js
git commit -m "feat: add compact number formatter utility

Format integers as inline-prose-friendly strings: '5.7k', '43k'.
Used by upcoming inline-pypi-stats build step.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Create the rule config file

**Files:**
- Create: `scripts/pypi-inline.config.yaml`

This task is data-only — no logic. The patterns must match the actual current text in `resume.yaml`. Reference: `resume.yaml` lines 19, 47, 212, 221, 239, 248, 257, 265 (verified during spec phase).

- [ ] **Step 1: Create the config file**

Write `scripts/pypi-inline.config.yaml`:

```yaml
# scripts/pypi-inline.config.yaml
#
# Each rule rewrites a hardcoded PyPI download count in resume.yaml at build
# time. The first capture group of `pattern` is replaced with the resolved
# `value`. Available value tokens:
#
#   {{TOTAL}}                — sum of all packages' total_all_time
#   {{PACKAGE:<name>}}       — that specific package's total_all_time
#   {{PACKAGE_180D:<name>}}  — that specific package's last 180 days
#
# `<name>` is the JSON object key in client/public/data/pypi-stats.json
# (the lowercase pypi_package value, e.g. `sqlstream`, `smart-commit-ai`).
#
# Numbers are formatted compactly:
#   < 1000:    "123"
#   1000-9999: "5.7k"   (one decimal)
#   10000+:    "43k"    (no decimal, rounded to nearest 1000)
#
# Trailing "+" is part of the value template, not added automatically.
#
# Patterns whose regex matches nothing are SKIPPED silently — no error.
# Run `npm run inline-pypi -- --dry-run` to preview without writing.
#
# Patterns intentionally accept BOTH the comma form (43,000+) and compact form
# (43k+) so the very first run from a freshly-edited resume.yaml still matches.

rules:
  - description: "Intro grand total (cv.sections.intro)"
    pattern: 'open-source tools with \*\*(\d[\d,.kK]*\+?) PyPI downloads\*\*'
    value: '{{TOTAL}}+'

  - description: "QxLab experience bullet → DatasetPipeline mention"
    pattern: 'DatasetPipeline \((\d[\d,.kK]*\+?) downloads\)'
    value: '{{PACKAGE:datasetpipeline}}+'

  - description: "SQLStream project highlight"
    pattern: 'pypi\.org/project/sqlstream\) \(\*\*(\d[\d,.kK]*\+?) downloads\*\*\)'
    value: '{{PACKAGE:sqlstream}}+'

  - description: "Smart Commit AI project highlight"
    pattern: 'pypi\.org/project/smart-commit-ai\) \(\*\*(\d[\d,.kK]*\+?) downloads\*\*\)'
    value: '{{PACKAGE:smart-commit-ai}}+'

  - description: "DatasetPipeline project highlight"
    pattern: 'pypi\.org/project/datasetpipeline\) \(\*\*(\d[\d,.kK]*\+?) downloads\*\*\)'
    value: '{{PACKAGE:datasetpipeline}}+'

  - description: "Creatree project highlight"
    pattern: 'pypi\.org/project/creatree\) \(\*\*(\d[\d,.kK]*\+?) downloads\*\*\)'
    value: '{{PACKAGE:creatree}}+'

  - description: "BetterPassphrase project highlight"
    pattern: 'pypi\.org/project/BetterPassphrase\) \(\*\*(\d[\d,.kK]*\+?) downloads\*\*\)'
    value: '{{PACKAGE:betterpassphrase}}+'

  - description: "JSONDBin project highlight"
    pattern: 'pypi\.org/project/jsondbin\) \(\*\*(\d[\d,.kK]*\+?) downloads\*\*\)'
    value: '{{PACKAGE:jsondbin}}+'
```

- [ ] **Step 2: Sanity-check the YAML parses**

```bash
node --input-type=module -e "
import fs from 'fs';
import yaml from 'js-yaml';
const doc = yaml.load(fs.readFileSync('scripts/pypi-inline.config.yaml', 'utf8'));
console.log('rules:', doc.rules.length);
for (const r of doc.rules) {
  const re = new RegExp(r.pattern);
  console.log(\`  \${re.source.length.toString().padStart(3)} chars  \${r.description}\`);
}
"
```

Expected: prints `rules: 8` and each rule's description. No exception.

- [ ] **Step 3: Verify each pattern matches its target line in resume.yaml**

```bash
node --input-type=module -e "
import fs from 'fs';
import yaml from 'js-yaml';
const doc = yaml.load(fs.readFileSync('scripts/pypi-inline.config.yaml', 'utf8'));
const text = fs.readFileSync('resume.yaml', 'utf8');
let allOk = true;
for (const r of doc.rules) {
  const re = new RegExp(r.pattern, 'g');
  const matches = [...text.matchAll(re)];
  const ok = matches.length >= 1;
  if (!ok) allOk = false;
  console.log(\`\${ok ? '✓' : '✗'} \${r.description}: \${matches.length} match(es)\`);
  for (const m of matches) {
    console.log(\`     captured: '\${m[1]}'\`);
  }
}
process.exit(allOk ? 0 : 1);
"
```

Expected: every rule prints `✓` with at least 1 match. The captured text should be a number like `43,000+`, `9.7k+`, `5.2k+`, etc. If any rule prints `✗`, fix its pattern and re-run.

- [ ] **Step 4: Commit**

```bash
git add scripts/pypi-inline.config.yaml
git commit -m "feat: add inline-pypi rule config

Declarative rules for replacing hardcoded PyPI download counts in
resume.yaml. Covers intro grand total, QxLab DatasetPipeline mention,
and 6 personal-project lines.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Build the engine — `inline-pypi-stats.js`

**Files:**
- Create: `scripts/inline-pypi-stats.js`

This is the core script. It is built up in steps within a single commit. The final file is ~180 lines.

- [ ] **Step 1: Create skeleton with imports, paths, and CLI parsing**

Write `scripts/inline-pypi-stats.js` (full content for now — later steps modify it):

```javascript
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

async function main() {
  // … rest filled in below
}

main().catch(err => fatal(err.stack || err.message));
```

- [ ] **Step 2: Add stats + config + resume loading**

Replace the body of `main()` with:

```javascript
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

  // …rule application happens in next step
}
```

- [ ] **Step 3: Add token resolution + per-rule application**

Add a `resolveValue` helper and a `lineOf` helper above `main()`:

```javascript
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
```

Then in `main()`, after the "DRY RUN" log line, add the rule loop:

```javascript
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
        fatal(`${rule.label}: pattern has no capture group (need at least one '(...)')`);
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
```

- [ ] **Step 4: Add dry-run preview + atomic write + final summary**

After the rule loop, add:

```javascript
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
```

- [ ] **Step 5: Smoke-test against the real `pypi-stats.json` (or generate one)**

If `client/public/data/pypi-stats.json` doesn't exist yet, create a minimal stand-in for testing:

```bash
mkdir -p client/public/data
cat > client/public/data/pypi-stats.json <<'EOF'
{
  "fetched_at": "2026-04-27T00:00:00.000Z",
  "total_downloads": 43124,
  "packages": {
    "sqlstream":         {"name": "sqlstream",         "total_all_time": 5723, "total_180d": 800, "last_day": 0, "last_week": 0, "last_month": 0, "daily": [], "weekly": []},
    "smart-commit-ai":   {"name": "smart-commit-ai",   "total_all_time": 6101, "total_180d": 900, "last_day": 0, "last_week": 0, "last_month": 0, "daily": [], "weekly": []},
    "datasetpipeline":   {"name": "datasetpipeline",   "total_all_time": 9701, "total_180d": 0,   "last_day": 0, "last_week": 0, "last_month": 0, "daily": [], "weekly": []},
    "creatree":          {"name": "creatree",          "total_all_time": 5301, "total_180d": 0,   "last_day": 0, "last_week": 0, "last_month": 0, "daily": [], "weekly": []},
    "betterpassphrase":  {"name": "betterpassphrase",  "total_all_time": 10250,"total_180d": 0,   "last_day": 0, "last_week": 0, "last_month": 0, "daily": [], "weekly": []},
    "jsondbin":          {"name": "jsondbin",          "total_all_time": 6520, "total_180d": 0,   "last_day": 0, "last_week": 0, "last_month": 0, "daily": [], "weekly": []}
  }
}
EOF
```

Run dry-run:

```bash
node scripts/inline-pypi-stats.js --dry-run
```

Expected output (numbers approximate; key things to verify):
- Header: `[inline-pypi] Loaded 8 rules, 6 packages, total 43,124 all-time`
- `[inline-pypi] DRY RUN — no file will be written`
- 8 lines of `· updated (1 match)…` (or `· updated (2 matches)` for the DatasetPipeline rule if it matches both line 47 and line 239 — that's expected and intended).
- A `DRY RUN — would write N change(s):` block listing each line number + before/after.
- `[inline-pypi] No file written.`
- Exit code 0.
- `git status` should show `resume.yaml` UNCHANGED (dry-run wrote nothing).

If `pypi-stats.json` already existed before this task (real live data), the numbers will reflect the real data. The verification logic is the same.

- [ ] **Step 6: Smoke-test the real write**

```bash
node scripts/inline-pypi-stats.js
git diff resume.yaml | head -40
```

Expected: only number changes (e.g. `43,000+` → `43k+`, `5.2k+` → `5.7k+`). No comment changes, no whitespace changes, no structural changes.

Then test idempotency:

```bash
node scripts/inline-pypi-stats.js
git diff resume.yaml | wc -l
```

Expected: same diff as before (script ran twice; second run reported `No changes` and produced zero new diff — the line count from `git diff` should be identical to step above).

- [ ] **Step 7: Reset the resume.yaml change before committing**

The smoke test mutated `resume.yaml`, but `resume.yaml` is gitignored, so it won't be committed. Still, to keep the working copy clean:

```bash
git checkout -- resume.yaml 2>/dev/null || npm run hydrate
```

(Either restores from git if it was tracked, or re-hydrates from the personal branch.)

- [ ] **Step 8: Commit**

```bash
git add scripts/inline-pypi-stats.js
git commit -m "feat: add inline-pypi-stats build script

Reads pypi-stats.json + scripts/pypi-inline.config.yaml + resume.yaml,
applies each rule's regex to replace the first capture group with a
token-resolved compact-formatted number, writes resume.yaml atomically.

Soft-fails (exit 0, warn) on missing stats / missing resume / unknown
package / no match. Hard-fails (exit 1) on malformed config or write
errors. Supports --dry-run for previewing.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Wire into `build.js` (re-order pipeline)

**Files:**
- Modify: `scripts/build.js`

The current build order runs `generate-resume:prod` BEFORE `fetch-pypi-stats`, which means the script can't feed updated numbers into rendercv. We need to:

1. Move the `fetch-pypi-stats` block earlier (before the `generate-resume` block).
2. Insert a new `inline-pypi-stats` block immediately after `fetch-pypi-stats` and before `generate-resume`.

Re-read `scripts/build.js` first if needed.

- [ ] **Step 1: Move the `fetch-pypi-stats` block earlier**

In `scripts/build.js`, the current structure (lines ~38–96) is:

```
[A] if (existsSync(resumePath)) { generate-resume:prod }   (lines ~38-58)
[B] generate-ai-prompt                                      (lines ~60-70)
[C] fetch-pypi-stats                                        (lines ~72-83)
[D] fetch-stats (template)                                  (lines ~85-96)
```

We want:

```
[C] fetch-pypi-stats
[NEW] inline-pypi-stats
[A] if (existsSync(resumePath)) { generate-resume:prod }
[B] generate-ai-prompt
[D] fetch-stats (template)
```

Use Edit to **move block [C] (fetch-pypi-stats) above block [A]**. The exact unchanged content of block [C] is:

```javascript
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
```

Cut this block from its current position and paste it just **before** the `if (existsSync(resumePath)) {` line.

- [ ] **Step 2: Insert the new `inline-pypi-stats` block**

Immediately AFTER the moved `fetch-pypi-stats` block and BEFORE the `if (existsSync(resumePath)) {` block, insert:

```javascript
// Inline fresh PyPI counts into resume.yaml prose (so generate-resume sees them)
if (existsSync(resumePath)) {
  console.log('🔢 Inlining PyPI counts into resume.yaml...\n');
  try {
    execSync('node scripts/inline-pypi-stats.js', {
      stdio: 'inherit',
      cwd: rootDir
    });
    console.log('');
  } catch (error) {
    console.warn('⚠️  inline-pypi-stats failed (config error?)');
    console.warn('   Continuing build with current resume.yaml...\n');
  }
}
```

Note: this block is gated on `existsSync(resumePath)` independently — even though the script itself soft-fails when `resume.yaml` is missing, skipping the spawn entirely keeps the build log cleaner on the `main` branch.

- [ ] **Step 3: Verify the new build order by inspection**

```bash
grep -n "fetch-pypi-stats\|inline-pypi-stats\|generate-resume:prod\|generate-ai-prompt\|fetch-stats" scripts/build.js
```

Expected order (line numbers ascending, in this order):
1. `fetch-pypi-stats.js` (the script invocation, in execSync)
2. `inline-pypi-stats.js` (the script invocation)
3. `generate-resume:prod` (the npm run invocation)
4. `generate-ai-prompt.js`
5. `fetch-stats.js`

If any are out of order, fix before continuing.

- [ ] **Step 4: Smoke-test by running the build (PyPI fetch and resume gen are slow — skip if no network)**

If you have network + Python with rendercv installed:

```bash
npm run build 2>&1 | grep -E "Fetching PyPI|Inlining PyPI|generate-resume|Generating AI|template adoption|Building application"
```

Expected order in the log:
1. `Fetching PyPI download statistics`
2. `Inlining PyPI counts into resume.yaml`
3. `Generating resume` (or `📄 resume.yaml found`)
4. `Generating AI resume conversion prompt` (or similar)
5. `Fetching template adoption stats`
6. `Building application`

If you DON'T have network/rendercv, skip running the full build. The `grep -n` check from Step 3 is sufficient verification.

- [ ] **Step 5: Commit**

```bash
git add scripts/build.js
git commit -m "build: re-order pipeline + insert inline-pypi-stats

Move fetch-pypi-stats before generate-resume:prod, and insert the new
inline-pypi-stats step between them so the PDF + resume.json ship with
fresh download counts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Add `inline-pypi` npm script

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the script entry**

Open `package.json`. Find the `"generate-resume"` line in the `scripts` block. Add this entry on a new line after it (alphabetical-ish with the rest):

```json
"inline-pypi": "node scripts/inline-pypi-stats.js",
```

The full diff context (locate around the existing scripts):

```json
"generate-resume": "node scripts/generate-resume.js",
"generate-resume:dev": "NODE_ENV=development node scripts/generate-resume.js",
"generate-resume:prod": "NODE_ENV=production node scripts/generate-resume.js",
"generate-resume:ci": "NODE_ENV=ci node scripts/generate-resume.js",
"generate-ai-prompt": "node scripts/generate-ai-prompt.js",
"generate-template-config": "node scripts/generate-template-config.js",
"hydrate": "./scripts/hydrate-personal-data.sh",
"inline-pypi": "node scripts/inline-pypi-stats.js",
"type-check": "tsc --noEmit",
```

Watch for the trailing comma on the line above `"type-check"` and verify the file still parses as valid JSON.

- [ ] **Step 2: Verify package.json is valid JSON and has the new script**

```bash
node --input-type=module -e "
import fs from 'fs';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log('inline-pypi:', pkg.scripts['inline-pypi'] || '(MISSING)');
"
```

Expected: `inline-pypi: node scripts/inline-pypi-stats.js`

- [ ] **Step 3: Verify the new script runs end-to-end**

```bash
npm run inline-pypi -- --dry-run 2>&1 | tail -20
```

Expected: same dry-run output as `node scripts/inline-pypi-stats.js --dry-run` from Task 3 Step 5. Exit code 0.

```bash
echo $?
```

Expected: `0`.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "feat: add 'inline-pypi' npm script

Wraps node scripts/inline-pypi-stats.js. Use 'npm run inline-pypi' to
apply, 'npm run inline-pypi -- --dry-run' to preview.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: End-to-end verification (no commit)

This task walks through the full acceptance list from the spec. No code changes, no commit. Each item is a manual UAT step. If any fail, fix and re-run earlier tasks as needed.

**Pre-condition for this task:** `resume.yaml` is present (`npm run hydrate` if not).

- [ ] **Step 1: Dry-run shows numbers-only changes with reasonable formatting**

```bash
npm run inline-pypi -- --dry-run
```

Expected:
- Each `before → after` line shows a number-format change only.
- Numbers follow the `5.7k` / `43k` / etc. rules.
- Exit 0.

- [ ] **Step 2: Real run; only number-prose lines change**

`resume.yaml` is gitignored on `main`, so `git diff` won't track it. Use a side-by-side compare against the freshly-hydrated copy:

```bash
# Save the hydrated baseline, then run the script and diff
cp resume.yaml /tmp/resume-baseline.yaml
npm run inline-pypi
diff /tmp/resume-baseline.yaml resume.yaml | head -40
```

Expected: every change line is a number-prose mutation — e.g. `< ... 5.2k+ downloads ...` / `> ... 5.7k+ downloads ...`. No comments, indentation, or structure changed.

(On the `personal` branch where `resume.yaml` IS tracked, `git diff resume.yaml` works and is the simpler check.)

- [ ] **Step 3: Idempotency — second run is a no-op**

```bash
npm run inline-pypi
npm run inline-pypi 2>&1 | grep -E "No changes|changes\)"
```

Expected: second invocation logs `No changes (resume.yaml already up to date)`.

- [ ] **Step 4: Corrupt one number — gets corrected**

```bash
# Hand-edit a number; e.g. change "5.7k+" to "999+" in the SQLStream line
# (use your editor, or sed for automation):
sed -i.bak 's|sqlstream) (\*\*[^*]*downloads\*\*)|sqlstream) (**999+ downloads**)|' resume.yaml
grep "sqlstream" resume.yaml | head -1
# verify it now says 999+

npm run inline-pypi
grep "sqlstream" resume.yaml | head -1
```

Expected: after re-running, the sqlstream line is back to the correct value (`5.7k+` or whatever the live total resolves to). Clean up: `rm resume.yaml.bak`.

- [ ] **Step 5: Comment out a rule — that mention untouched, others still update**

Edit `scripts/pypi-inline.config.yaml` and prefix every line of one rule (e.g. SQLStream) with `# `:

```yaml
  # - description: "SQLStream project highlight"
  #   pattern: 'pypi\.org/project/sqlstream\) \(\*\*(\d[\d,.kK]*\+?) downloads\*\*\)'
  #   value: '{{PACKAGE:sqlstream}}+'
```

Manually corrupt the SQLStream number again (same `sed` as Step 4). Run `npm run inline-pypi`. The SQLStream line should remain at `999+` (rule disabled). Other rules still apply.

Restore the rule (un-comment) and run again — now SQLStream gets fixed too.

- [ ] **Step 6: Bad regex — script logs "skipped (no match)" and exits 0**

Temporarily edit `scripts/pypi-inline.config.yaml` and set one rule's pattern to `'xxx_no_match_xxx_(\d+)'`. Run:

```bash
npm run inline-pypi
echo "exit code: $?"
```

Expected:
- Log shows `· skipped (no match): <description>` for the broken rule.
- Other rules still apply.
- Exit code 0.

Restore the original pattern.

- [ ] **Step 7: Missing `pypi-stats.json` — warn + exit 0; build still completes**

```bash
mv client/public/data/pypi-stats.json /tmp/pypi-stats-backup.json
npm run inline-pypi
echo "exit code: $?"
mv /tmp/pypi-stats-backup.json client/public/data/pypi-stats.json
```

Expected: warning printed (`pypi-stats.json not found`), exit 0.

If you have time + network + rendercv installed, also run `npm run build` with the JSON missing. Expected: the `fetch-pypi-stats` step recreates it; build completes. (Skip this sub-step if rendercv isn't installed; the per-script test above is sufficient.)

- [ ] **Step 8: Build log shows new step in correct position**

```bash
npm run build 2>&1 | grep -nE "Fetching PyPI|Inlining PyPI|resume.yaml found|Generating AI|template adoption|Building application"
```

Expected order (matching Task 4 Step 4 expectation):
1. `Fetching PyPI download statistics`
2. `Inlining PyPI counts into resume.yaml`
3. `📄 resume.yaml found - generating resume files...`
4. `🤖 Generating AI resume conversion prompt`
5. `📊 Fetching template adoption stats`
6. `🏗️  Building application`

(Skip if rendercv not installed; the static `grep -n` check from Task 4 Step 3 already verified order in source.)

- [ ] **Step 9: Type-check still passes (or fails identically)**

```bash
npm run type-check 2>&1 | tail -10
```

Expected: same pre-existing errors as before this branch (per `MAINTAINER_GUIDE.md`). No new errors introduced. (We added pure JS files; TypeScript should not see them.)

- [ ] **Step 10: Final state check**

```bash
git status
git log --oneline main..HEAD
```

Expected `git log` output (5 commits ahead of `main`):

```
<hash> feat: add 'inline-pypi' npm script
<hash> build: re-order pipeline + insert inline-pypi-stats
<hash> feat: add inline-pypi-stats build script
<hash> feat: add inline-pypi rule config
<hash> feat: add compact number formatter utility
<hash> docs: brainstorming spec for inline-pypi-stats build step  ← already existed
```

`git status` should show `resume.yaml` modified (from real-run testing) — leave it; the file is gitignored on `main` and personal-branch sync handles the actual deployed copy.

- [ ] **Step 11: Hand off to maintainer (no commit)**

At this point, the implementation is complete. Stop and report:
- All 10 verification steps pass.
- 5 commits ahead of `main`.
- Awaiting explicit approval before pushing or opening a PR (per project convention — see `MEMORY.md` feedback_commit_flow).

---

## Self-Review Notes

**Spec coverage:**
- ✓ `scripts/pypi-inline.config.yaml` (new, with rules) → Task 2
- ✓ `scripts/inline-pypi-stats.js` (engine) → Task 3
- ✓ Hook into build pipeline before `generate-resume:prod` → Task 4
- ✓ Idempotent + safe → Task 6 Step 3
- ✓ `npm run inline-pypi` + `--dry-run` → Tasks 3, 5
- ✓ Number formatting per spec → Task 1
- ✓ All 9 verification items → Task 6 (10 sub-steps; "all 9 spec items" + final check)
- ✓ Out-of-scope items respected (no GitHub stars touched, no schema changes, no UI changes, no test runner added)

**Type consistency:**
- `formatCompact` exported from `scripts/utils/format-compact.js`, imported in `scripts/inline-pypi-stats.js`. Same name across files.
- Token names (`{{TOTAL}}`, `{{PACKAGE:<name>}}`, `{{PACKAGE_180D:<name>}}`) used identically in spec, config file header, config rules, and resolver function.
- `resume.yaml`, `client/public/data/pypi-stats.json`, `scripts/pypi-inline.config.yaml` paths consistent across tasks.

**Placeholder scan:** No `TODO`, no `TBD`, no "implement later". Every step has either explicit code or an explicit command with expected output.

**Caveat to be aware of during execution:** Task 3 Step 6's `git diff resume.yaml` only shows changes if `resume.yaml` is tracked. On `main`, it's gitignored, so the diff is empty even after a successful run. The diff command is for the maintainer running on `personal` later. The smoke verification in Task 3 doesn't depend on `git diff` output — it depends on the script's own log output and the dry-run preview.
