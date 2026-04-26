# Upgrading your fork

This template ships engine improvements over time — bug fixes, new commands,
themes, performance tweaks. Because forks have an `upstream` remote linked
back to the template, pulling those changes in is a single command:

```bash
git fetch upstream main
git merge upstream/main
git push origin main
```

Your `resume.yaml`, `client/public/manifest.json`, and other personal files
stay untouched as long as upstream hasn't modified the same lines (rare —
the engine and your data are intentionally separated).

---

## Pre-flight (one-time)

If you forked recently, the `upstream` remote should already exist. Verify:

```bash
git remote -v
```

If you don't see an `upstream` entry pointing at `subhayu99/subhayu99.github.io`,
add it:

```bash
git remote add upstream https://github.com/subhayu99/subhayu99.github.io.git
```

That's the only setup step.

---

## The upgrade flow

### Quick path

```bash
git fetch upstream main
git merge upstream/main
git push origin main
```

If the merge is clean, GitHub Actions redeploys your site automatically.

### When merge conflicts happen

Conflicts only appear when *upstream changed the same lines you also changed*.
Common cases: themes, custom commands, README tweaks. Resolve with your
editor or:

```bash
git checkout --theirs <file>   # take upstream's version
git checkout --ours   <file>   # keep your version
git add <file>
git merge --continue
```

If you accidentally lose your `resume.yaml` or other personal files during
a merge, restore them from your previous commit:

```bash
git checkout HEAD~1 -- resume.yaml client/public/manifest.json client/public/data
git commit -m "restore: personal files"
```

---

## Optional: auto-PR sync workflow

Drop a workflow in your fork that opens a PR every Monday with upstream's new
commits — you review and merge whenever you're ready. **Manual merge only,
by design** — the PR stays open for your review (auto-merge can break the
deploy chain on GitHub due to a `GITHUB_TOKEN` limitation).

Copy the example workflow:

```bash
mkdir -p .github/workflows
cp .github/workflows/sync-from-upstream.yaml.example \
   .github/workflows/sync-from-upstream.yaml
git add .github/workflows/sync-from-upstream.yaml
git commit -m "chore: install upstream sync workflow"
git push
```

The workflow runs every Monday at 06:00 UTC and on demand. It opens a PR
titled "🔄 Sync from upstream — engine vX.Y.Z". You read, you merge.

---

## Engine versioning

The repo's `VERSION` file (and the hidden HTML signature on every deploy)
follow semver:

- **Patch** (`1.0.x`) — bug fixes, no behavior change. Almost always a clean merge.
- **Minor** (`1.x.0`) — new features (commands, themes, sections). Usually clean.
- **Major** (`x.0.0`) — breaking changes to the schema or directory layout. Read the changelog before merging.

Major changes are rare and announced in the upstream `CHANGELOG.md`.

---

## "I used 'Use this template' before the fork flow existed"

If your repo was created from the GitHub *template* button (before the
template was demoted), you don't have an `upstream` remote. Add one
retroactively:

```bash
git remote add upstream https://github.com/subhayu99/subhayu99.github.io.git
git fetch upstream main
```

Then run the upgrade flow above. The first merge after a long gap may
have more conflicts — go slow.

---

## What's protected from upstream merges

Anything in this list stays yours, even when upstream changes:

- `resume.yaml` — your single source of truth
- `client/public/manifest.json` — your PWA branding
- `client/public/data/{neofetch.txt, neofetch-small.txt, resume.json, resume.pdf, ai-resume-prompt.txt, template-stats.json, pypi-stats.json}` — generated artifacts
- `client/public/screenshots/` — your screenshots
- `client/public/styled_name.svg` — your styled name banner
- `template.config.yaml` — your overrides

Upstream commits that touch *only* engine files merge cleanly. The few
times upstream and your customizations collide on the same file (a CSS
variable you tweaked, a custom command you added), Git's standard
3-way merge handles it with conflict markers — same as any other merge
in any other repo.

---

## Reverting an upgrade

If something breaks after a merge:

```bash
git revert -m 1 HEAD          # keeps your customizations, undoes the merge
git push origin main
```

That re-deploys the previous working state immediately.
