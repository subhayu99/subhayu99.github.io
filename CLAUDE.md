# CLAUDE.md

## What this is

A multi-modal portfolio where `resume.yaml` is the single source of truth. One file generates:
- **PDF resume** via RenderCV (filtered by `show_on_resume` flag)
- **Website JSON** (all entries, no filtering) consumed by three view modes: splash, terminal, GUI

Stack: React 18, TypeScript, Vite 5, Tailwind CSS 3, Radix UI, Framer Motion, Wouter. Resume pipeline: Node.js scripts + Python (RenderCV).

## Branch model — read this first

Two long-lived branches with different purposes:

| Branch | Contains | Deploys? | Who pushes here |
|--------|----------|----------|-----------------|
| `main` | Engine code, .example files, no personal data | No | Feature PRs |
| `personal` | `main` + resume.yaml + personal assets | Yes (GitHub Pages) | Resume updates, auto-sync PR merges |

**The rule:**
- Code/engine changes go to `main` via feature branches + PRs
- Resume content (resume.yaml, generated PDFs) goes directly to `personal`
- When `main` is pushed, the `sync-main-to-personal.yaml` Action opens a PR into `personal`. Merge it to redeploy.

**Never push code fixes directly to `personal`.** They won't reach `main` or forkers. Always push code to `main` first.

**Never commit personal files to `main`.** resume.yaml, manifest.json, neofetch*.txt, logo.png, icons/ are gitignored on main. They live on `personal` only.

## Local development

```bash
npm install
npm run dev          # Vite dev server on localhost:5173
npm run build        # Full production build (template-config → PyPI fetch → resume gen → vite)
npm run preview      # Serve the production build locally
```

To test with real resume data on a non-personal branch:
```bash
npm run hydrate      # Copies personal files from personal branch (gitignored on main)
```

To regenerate the PDF after editing resume.yaml:
```bash
bash scripts/render.sh   # Sets up venv, runs rendercv, opens PDF
```

## Build pipeline

`npm run build` runs `scripts/build.js` which orchestrates:
1. Generate template config (template.config.yaml → TypeScript module)
2. Fetch PyPI download stats (pepy.tech + pypistats.org, cached 12h)
3. Inline PyPI counts into resume.yaml prose (via pypi-inline.config.yaml rules)
4. Generate resume (resume.yaml → filtered YAML → rendercv → PDF/MD + full JSON for website)
5. Generate AI resume converter prompt
6. Fetch GitHub template stats (stars, forks, traffic)
7. Vite build

Each step gracefully skips if inputs are missing (e.g., no resume.yaml on main).

## resume.yaml structure

Key fields that control rendering:
- `show_on_resume: true/false` — controls whether an entry appears in the printed PDF (website always shows everything)
- `pypi_package: "name"` — triggers automatic PyPI download count inlining
- `highlights:` — bullet points under each entry
- `summary:` — paragraph text above highlights in experience entries

RenderCV is strict about its schema. Custom fields (show_on_resume, pypi_package, github_repo, live_url, showcase_command) are stripped before passing to rendercv. See `generate-resume.js` for the stripping logic.

## Commit conventions

Conventional commits. The prefix matters for the auto-sync workflow:

```
feat(gui):      New GUI feature
fix(tui):       Terminal bug fix
content(resume): Resume data update (personal branch only)
docs:           Documentation
chore:          Build/maintenance
refactor:       Code reorganization
```

Keep resume content changes in separate commits from code changes. The auto-sync workflow skips commits that touch personal files — mixing them means the code change gets skipped too.

## Key directories

```
client/src/components/gui/    # GUI mode components (HeroSection, ProjectCard, ScrambleText, etc.)
client/src/components/tui/    # Terminal mode (MatrixRain, StatusBar, ReplicatePage)
client/src/hooks/             # useTerminal (command registry), useViewMode, useGestureTrigger
client/src/lib/themes/        # Terminal + GUI color schemes
scripts/                      # All build-time generation (resume, config, stats, PyPI)
.github/workflows/            # CI/CD: deploy, sync, validate, stats refresh
```

## GitHub Actions workflows

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| deploy.yaml | push to main/personal | Full build + deploy to GitHub Pages |
| sync-main-to-personal.yaml | push to main | Opens PR to merge engine changes into personal |
| validate-resume.yaml | resume.yaml changes | YAML syntax + RenderCV render check |
| refresh-pypi-stats.yaml | Weekly (Monday) | Refreshes PyPI download counts |
| refresh-stats.yaml | Daily | Refreshes GitHub fork/star/traffic stats |

## Caching

- PyPI stats: 12-hour local cache in `client/public/data/pypi-stats.json`
- GitHub stats: 6-hour cache in `client/public/data/template-stats.json`
- Force refresh: set `FORCE_REFRESH=1` env var or use the manual workflow dispatch
- Weekly/daily cron jobs handle routine cache busting

## Testing changes

- **Code changes:** `npm run dev` with hot reload. Type `terminal` in the site to switch to terminal mode, `gui` for GUI mode.
- **Resume changes:** `bash scripts/render.sh` to regenerate + open PDF. Check that `show_on_resume` filtering works as expected.
- **TypeScript:** `npm run type-check` (tsc --noEmit)
- **Full build:** `npm run build && npm run preview`

## Things to watch out for

- rendercv has strict field validation. If you add a custom field to resume.yaml, also add it to the stripping logic in `generate-resume.js` or rendercv will reject the input.
- The `pypi-inline.config.yaml` file maps PyPI package names to regex replacement rules in resume.yaml. If you add a new package with `pypi_package:` field, add a corresponding rule there for inline count updates.
- Terminal commands are registered in `client/src/hooks/useTerminal.tsx`. Adding a new command means adding it to the command map there.
- The deploy workflow skips deployment on `main` for the upstream repo (subhayu99/subhayu99.github.io). Forkers deploy from their default branch.
