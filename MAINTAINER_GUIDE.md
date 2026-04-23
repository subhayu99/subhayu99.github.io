# 🛠️ Maintainer Guide

Quick guide for maintaining both your portfolio and the template.

## 🌿 Two-Branch Setup

- **`main`** = Clean template (no personal data) → Users get this
- **`personal`** = Your portfolio (with your data) → Deploys to https://subhayu.in

## 📖 Common Tasks

### Update Your Resume

```bash
git checkout personal
vim resume.yaml
git add . && git commit -m "update: resume"
git push origin personal
# ✅ Your site auto-deploys!
```

### Add Feature to Template

```bash
git checkout main
# Make changes to source code
git add . && git commit -m "feat: new theme"
git push origin main

# Apply to your portfolio
git checkout personal
git merge main
git push origin personal
```

### Sync Changes Between Branches (Recommended)

Use the automated sync script to cherry-pick commits while excluding personal files:

```bash
# From main → sync template improvements to personal:
git checkout main
./scripts/sync-branches.sh

# From personal → sync bug fixes to main:
git checkout personal
./scripts/sync-branches.sh

# Preview before applying:
./scripts/sync-branches.sh --dry-run
```

The script automatically:
- ✅ Finds commits to sync
- ✅ Skips commits that touch personal files (resume.yaml, etc.)
- ✅ Cherry-picks safe commits
- ✅ Shows detailed summary

**Alternative: Manual merge** (advanced, more merge conflicts):

```bash
git checkout personal
git merge main

# ⚠️ If merge deletes your personal files (resume.yaml, etc):
git checkout HEAD~1 -- resume.yaml client/public/manifest.json client/public/data/ client/public/resume.pdf
git commit -m "restore: personal files"

git push origin personal
```

## ⚠️ Important Rules

**DO:**
- Work on `personal` for resume/content updates
- Work on `main` for template improvements
- Sync `main → personal` to get improvements (use sync script)

**DON'T:**
- Commit personal data to `main`
- Sync `personal → main` with personal files
- Force push to either branch

## 🔧 Useful Commands

```bash
# Check current branch
git branch

# See differences between branches
git diff main personal --name-only

# Verify file not in main
git show main:resume.yaml  # Should error (good!)

# Sync branches automatically (recommended)
./scripts/sync-branches.sh --dry-run  # Preview first
./scripts/sync-branches.sh            # Apply changes
```

**💡 Pro Tip:** Run `head -70 scripts/sync-branches.sh` to see full documentation for the sync script.

## 📚 Files Structure

**In both branches:**
- Source code (`client/src/`, `scripts/`, etc.)
- `.example` files
- Documentation

**Only in `personal`:**
- `resume.yaml`
- `client/public/manifest.json`
- `client/public/resume.pdf`
- `client/public/data/resume.json`
- Other personal configs

**Only in `main`:**
- Nothing extra - just template

---

**That's it!** Keep it simple: `main` for template, `personal` for your portfolio.
