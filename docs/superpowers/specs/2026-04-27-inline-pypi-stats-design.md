# Auto-update PyPI download counts in `resume.yaml` at build time

**Status:** Approved (2026-04-27)
**Branch:** `subhayu99/inline-pypi-stats`
**PR target:** `main`

## Goal

Eliminate stale, manually-edited PyPI download counts in `resume.yaml`. A new build-time script reads fresh stats from `client/public/data/pypi-stats.json` and rewrites the counts in `resume.yaml` according to an explicit YAML rule list. The freshly-updated `resume.yaml` then flows into rendercv (PDF + markdown) and the website JSON, so every build ships current numbers.

## Non-goals

- Not auto-updating GitHub stars/forks in `resume.yaml`.
- Not changing `resume.yaml` schema.
- Not changing PyPI fetch logic.
- Not adding a runtime UI feature; this is purely build-time.
- Not adding a Node-side test runner (project has none today; matching that posture).

## Why config, not blind regex

Blind regex across `resume.yaml` is fragile — it could match unintended places, fail silently when prose changes, or surprise the maintainer. An explicit config file lists exactly which replacements should happen. The maintainer adds a rule when they write a new sentence that mentions a count. Rules whose pattern matches nothing are skipped silently — never an error — so a maintainer who deletes a sentence about a package doesn't have to also delete its rule.

## High-level architecture

```
pypi-stats.json ──┐
                  ├──► inline-pypi-stats.js ──► resume.yaml (mutated in place)
config.yaml ──────┤                                     │
resume.yaml ──────┘                                     ▼
                                                generate-resume.js
                                                  → resume.json + PDF
```

A new Node script reads three inputs (the stats JSON, the rule config, the raw YAML text), resolves each rule's `value` template into a formatted number, replaces the first capture group of each rule's regex match, and writes the result back to `resume.yaml`. It is wired into the build pipeline before `generate-resume:prod`.

## Components

### 1. `scripts/pypi-inline.config.yaml` (new)

Declarative list of replacement rules. Each rule has three fields:

- `description` — human label, used in logs.
- `pattern` — JavaScript-style regex; **must contain at least one capture group**. The first capture group is what gets replaced.
- `value` — replacement string. May contain tokens (see below).

Header comment in the file documents the tokens, the `--dry-run` flag, and the silent-skip behavior.

**Supported tokens:**

| Token | Meaning |
|---|---|
| `{{TOTAL}}` | Sum of all packages' `total_all_time`. |
| `{{PACKAGE:<name>}}` | Specific package's `total_all_time`. `<name>` is the JSON object key (lowercase pypi name, e.g. `sqlstream`, `smart-commit-ai`). |
| `{{PACKAGE_180D:<name>}}` | Specific package's `total_180d`. |

Numbers are formatted compactly (see Component 3, `format-compact.js`). Any literal text in `value` (e.g. a trailing `+`) passes through verbatim.

**Initial rule set** (8 rules, covering current `resume.yaml` mentions):

1. Intro grand total (line ~19): `**43,000+ PyPI downloads**`
2. QxLab → DatasetPipeline experience bullet (line ~47): `**DatasetPipeline (9.7k+ downloads)**`
3. SQLStream project highlight (line ~212): `pypi.org/project/sqlstream) (**5.2k+ downloads**)`
4. Smart Commit AI project highlight (line ~221): `pypi.org/project/smart-commit-ai) (**6.1k+ downloads**)`
5. DatasetPipeline project highlight (line ~239): `pypi.org/project/datasetpipeline) (**9.7k+ downloads**)`
6. Creatree project highlight (line ~248): `pypi.org/project/creatree) (**5.3k+ downloads**)`
7. BetterPassphrase project highlight (line ~257): `pypi.org/project/BetterPassphrase) (**10.2k+ downloads**)`
8. JSONDBin project highlight (line ~265): `pypi.org/project/jsondbin) (**6.5k+ downloads**)`

Rule patterns are anchored on stable, near-unique surrounding text (e.g. `pypi.org/project/<name>` or `PyPI\s+downloads`) so they can't drift onto unrelated content. Patterns accept both the comma form (`43,000+`) and compact form (`43k+`) so the very first run from a freshly-edited `resume.yaml` still matches.

### 2. `scripts/inline-pypi-stats.js` (new)

The engine. Pure orchestrator: read inputs → resolve tokens → apply each rule → write `resume.yaml`.

**Algorithm:**

1. Parse CLI args (`--dry-run`).
2. Load `client/public/data/pypi-stats.json`. If missing or has no packages → log warning, exit 0.
3. Load `scripts/pypi-inline.config.yaml`. Parse error → fatal, exit 1.
4. Validate config: every rule must have non-empty `description`, `pattern`, `value`. Compile `pattern` to a `RegExp` — compile error or zero capture groups → fatal, exit 1 with the offending rule's description.
5. Load `resume.yaml` as raw text (`utf8`). Missing → log warning, exit 0.
6. For each rule:
   - Resolve `value` tokens. Unknown package referenced by `{{PACKAGE:foo}}` or `{{PACKAGE_180D:foo}}` → log `· warn (unknown package): <description>`, skip rule.
   - Apply `regex.replace` over the full text, replacing each match's capture-group-1 with the resolved value (i.e. all matches updated, not just the first).
   - If zero matches → log `· skipped (no match): <description>`, continue.
   - Else log `· updated (N match(es)): <description>` with the new value.
7. If new text === old text → log "no changes", exit 0.
8. If `--dry-run` → print a per-rule before/after summary with line numbers, do NOT write. Exit 0.
9. Else write the new text back to `resume.yaml` atomically (write to temp file, rename) and exit 0.

**Replace-all-matches rationale:** if a rule's regex matches twice (e.g. `{{PACKAGE:datasetpipeline}}+` could match both rule #2 and rule #5 if their patterns overlapped), both should resolve to the same number. This keeps the script idempotent and free of "first-match-only" surprises. Maintainers who want surgical control simply write narrower regexes.

**Idempotency proof:** the formatter is a pure function of the JSON. Re-running with the same JSON resolves the same `value` string. The regex still matches the just-written text. Substituting the same string yields zero diff.

**File mutation safety:** writes go through a temp file + rename to avoid partial writes if interrupted. The script never touches anything other than `resume.yaml`.

### 3. `scripts/utils/format-compact.js` (new)

Single-purpose helper. Tiny, no dependencies.

```
< 1000:    "123"        (no suffix)
1000-9999: "5.7k"       (one decimal, rounded)
10000+:    "43k"        (no decimal, rounded to nearest 1000)
```

Rounded, not floored: `12500 → "13k"`, `99500 → "100k"`. Trailing `+` is **never added** by the formatter — it comes from the rule's `value` template (e.g. `{{PACKAGE:foo}}+`).

The existing `formatCompact` in `client/src/components/tui/BrailleSparkline.tsx` always uses one decimal (`43012 → "43.0k"`), which differs from this script's spec. Different rules + Node-vs-TS makes a separate utility cleaner than cross-importing.

### 4. `scripts/build.js` re-order

Current order:

```
generate-template-config
generate-resume:prod          ← runs BEFORE pypi fetch (problem!)
generate-ai-prompt
fetch-pypi-stats
fetch-stats
vite build
```

New order:

```
generate-template-config
fetch-pypi-stats              ← moved earlier
inline-pypi-stats             ← NEW
generate-resume:prod          ← now consumes updated resume.yaml
generate-ai-prompt
fetch-stats
vite build
```

`fetch-stats` (template adoption / GitHub stars) stays after generate-resume — it doesn't feed `resume.yaml`. `generate-ai-prompt` reads the generated `resume.json`, so it stays after `generate-resume`.

`inline-pypi-stats` is gated on `existsSync(resume.yaml)`, same as `generate-resume`. On `main` (where `resume.yaml` is gitignored), the step no-ops. On `personal`, it runs.

### 5. `package.json` — new script

```
"inline-pypi": "node scripts/inline-pypi-stats.js"
```

Usage:
- `npm run inline-pypi` — apply changes.
- `npm run inline-pypi -- --dry-run` — preview only.

## Behavior decisions (single source of truth)

| Decision | Choice |
|---|---|
| Multiple matches per rule | Replace all matches' capture-group-1. |
| Number rounding at 10k+ | Round to nearest 1000 (`10523 → "11k"`, `99500 → "100k"`). |
| Trailing `+` | Comes from rule's `value` template; formatter never adds it. |
| Missing `pypi-stats.json` | Warn, exit 0. |
| Empty stats (zero packages) | Warn, exit 0. |
| Missing `resume.yaml` | Warn, exit 0. |
| Unknown package in `{{PACKAGE:foo}}` | Warn for that rule, skip it, continue. |
| Pattern matches nothing | Log `· skipped (no match): <description>`, continue. |
| Pattern fails to compile | Fatal, exit 1, with rule description. |
| Pattern has no capture group | Fatal, exit 1, with rule description (config bug, not stale resume). |
| `--dry-run` output | Per-rule before/after summary with line numbers. No write. |
| File write | Atomic via temp file + rename. |

## Logging style

Following the existing tone in `fetch-pypi-stats.js` and `build.js`:

```
[inline-pypi] Loading config (8 rules)...
[inline-pypi] Stats: 6 packages, total 43,124 all-time

  · updated (1 match): Intro grand total → 43k+
  · updated (1 match): SQLStream project line → 5.7k+
  · skipped (no match): SmartCommitAI project line
  · warn (unknown package): obsoleted-rule

[inline-pypi] resume.yaml updated (4 rules applied)
```

Dry-run mode replaces the final write line with:

```
[inline-pypi] DRY RUN — would write 4 changes:
   line 19:  43,000+ → 43k+
   line 212: 5.2k+   → 5.7k+
   ...
[inline-pypi] No file written.
```

## Verification (matches spec acceptance list)

1. `npm run hydrate && npm run inline-pypi -- --dry-run` shows ONLY number changes, with reasonable formatting.
2. Apply for real (`npm run inline-pypi`); `git diff resume.yaml` shows ONLY number changes.
3. Run twice in a row — second run = zero diff (idempotent).
4. Manually corrupt one number (`5.2k+ → 999+`) and run the script — corrected.
5. Comment out a rule in the config — that mention stays untouched, others still update.
6. Set the regex of one rule to nonsense (`xxx_no_match_xxx`) — `· skipped (no match)` logged, exit 0.
7. Delete `client/public/data/pypi-stats.json` — script warns and exits 0; `npm run build` still completes (`fetch-pypi-stats` re-creates it next build).
8. `npm run build` log shows the new step running between `fetch-pypi-stats` and `generate-resume`.
9. `npm run type-check` still passes with the same pre-existing errors.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Regex too broad → unintended replacement | Initial rules anchor on `pypi.org/project/<name>` or unique boilerplate. Maintainer reviews `git diff resume.yaml` after first run. |
| Build failure if pypi.org/pepy.tech down | `fetch-pypi-stats` already exits 0 on failure → stale-but-present JSON is reused → script still works. If JSON is wholly missing, script warns and exits 0. |
| Maintainer forgets to add a rule for a new mention | Acceptable — that mention stays manually maintained until a rule is added. By design, the script never invents rules. |
| Tokens reference a renamed package | Logged as `· warn (unknown package)`, rule skipped, others continue. Script exits 0 (not an error condition). |
| Concurrent build mutating `resume.yaml` | Atomic temp-file rename prevents partial writes. CI runners are single-tenant; not a real concern. |
| `personal` branch CI commits the mutated `resume.yaml` | `.github/workflows/deploy.yaml` runs `npm run build` only — no `git commit`/`git push` step. The mutation is ephemeral on the runner. |

## File list

**New:**
- `scripts/pypi-inline.config.yaml`
- `scripts/inline-pypi-stats.js`
- `scripts/utils/format-compact.js`

**Modified:**
- `scripts/build.js` (re-order existing steps + insert new step)
- `package.json` (add `inline-pypi` script)

**Optional (write only if missing):**
- `MAINTAINER_GUIDE.md` mention of the new step (decide during implementation; spec says PR-focus, so likely a small follow-up note rather than scope creep).

## Out of scope (explicit)

- GitHub stars/forks in `resume.yaml`.
- Schema changes to `resume.yaml`.
- Changes to PyPI fetch logic (`fetch-pypi-stats.js`).
- Runtime UI changes.
- New automated test runner.
