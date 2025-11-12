#!/bin/bash

# ============================================================================
# Branch Sync Script - Maintainer Tool
# ============================================================================
# Syncs commits between main and personal branches, excluding commits
# that touch personal files.
#
# USAGE:
#   ./scripts/sync-branches.sh [-n <number>] [--dry-run]
#
# OPTIONS:
#   -n <number>   Only sync the last N commits (recommended!)
#   --dry-run     Preview what would be synced without making changes
#
# EXAMPLES:
#   # Sync last 3 commits from main to personal:
#   git checkout main
#   ./scripts/sync-branches.sh -n 3
#
#   # Sync last 5 commits from personal to main:
#   git checkout personal
#   ./scripts/sync-branches.sh -n 5
#
#   # Preview last 2 commits (dry run):
#   ./scripts/sync-branches.sh -n 2 --dry-run
#
#   # Sync ALL commits (not recommended for large histories):
#   ./scripts/sync-branches.sh
#
# HOW IT WORKS:
#   1. Detects which branch you're on (main or personal)
#   2. Finds commits in current branch that aren't in the other branch
#   3. Checks each commit to see if it touches personal files
#   4. Cherry-picks safe commits to the other branch
#   5. Skips commits that touch personal files
#   6. Shows summary of what was synced and skipped
#
# PERSONAL FILES (automatically excluded from sync):
#   - resume.yaml (your resume data)
#   - client/public/data/*.txt (ASCII art, neofetch files)
#   - client/public/data/resume.json (generated resume JSON)
#   - client/public/manifest.json (generated PWA manifest)
#   - client/public/resume.md (generated markdown resume)
#   - client/public/resume.pdf (generated PDF resume)
#
# SAFETY FEATURES:
#   - Won't run if you have uncommitted changes
#   - Only works on main or personal branches
#   - Stops and alerts you if cherry-pick fails
#   - Dry run mode to preview changes before applying
#
# TROUBLESHOOTING:
#   "Working directory is dirty"
#     → You have uncommitted changes. Commit or stash them first:
#       git add . && git commit -m "your message"
#
#   "Cherry-pick conflict"
#     → The script stopped because a commit couldn't be applied cleanly.
#       Resolve conflicts manually:
#         git status  # See conflicting files
#         # ... edit files to resolve conflicts ...
#         git add .
#         git cherry-pick --continue
#       Or abort:
#         git cherry-pick --abort
#
#   Script skipped commits I wanted to sync
#     → If a commit touches ANY personal file, it's skipped entirely.
#       Manually cherry-pick if needed: git cherry-pick <commit-hash>
#
# BEST PRACTICES:
#   1. Use -n flag to limit commits (e.g., -n 3 for last 3 commits)
#   2. Keep personal changes separate from template code changes
#   3. Don't mix resume updates with code changes in the same commit
#   4. Run with --dry-run first to preview what will be synced
#   5. Sync frequently to avoid large divergences between branches
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Personal files pattern (one per line for easier matching)
PERSONAL_FILES=(
  "resume.yaml"
  "client/public/data/.*\.txt"
  "client/public/data/resume\.json"
  "client/public/manifest\.json"
  "client/public/resume\.md"
  "client/public/resume\.pdf"
)

# Parse arguments
DRY_RUN=false
LIMIT_COMMITS=""

while [[ $# -gt 0 ]]; do
  case $1 in
    -n)
      LIMIT_COMMITS="$2"
      if ! [[ "$LIMIT_COMMITS" =~ ^[0-9]+$ ]]; then
        print_error "Invalid number: $LIMIT_COMMITS"
        exit 1
      fi
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [-n <number>] [--dry-run]"
      exit 1
      ;;
  esac
done

if [[ "$DRY_RUN" == true ]]; then
  echo -e "${CYAN}🔍 DRY RUN MODE - No changes will be made${NC}\n"
fi

if [[ -n "$LIMIT_COMMITS" ]]; then
  echo -e "${CYAN}📊 Limiting to last $LIMIT_COMMITS commit(s)${NC}\n"
fi

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
  echo -e "${CYAN}ℹ${NC} $1"
}

# Check if a file path matches any personal file pattern
is_personal_file() {
  local file="$1"
  for pattern in "${PERSONAL_FILES[@]}"; do
    if echo "$file" | grep -qE "^${pattern}$"; then
      return 0  # True - is personal file
    fi
  done
  return 1  # False - not personal file
}

# Check if a commit touches any personal files
commit_touches_personal_files() {
  local commit="$1"

  # Get list of files changed in this commit
  local files=$(git show --name-only --format="" "$commit")

  # Check each file
  while IFS= read -r file; do
    if [[ -n "$file" ]] && is_personal_file "$file"; then
      return 0  # True - touches personal files
    fi
  done <<< "$files"

  return 1  # False - doesn't touch personal files
}

# ============================================================================
# Main Script
# ============================================================================

print_header "Branch Sync Tool"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  print_error "Not in a git repository!"
  exit 1
fi

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
  print_error "Working directory is dirty. Please commit or stash your changes first."
  exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Determine source and target branches
if [[ "$CURRENT_BRANCH" == "main" ]]; then
  SOURCE_BRANCH="main"
  TARGET_BRANCH="personal"
elif [[ "$CURRENT_BRANCH" == "personal" ]]; then
  SOURCE_BRANCH="personal"
  TARGET_BRANCH="main"
else
  print_error "You must be on 'main' or 'personal' branch to run this script."
  print_info "Current branch: $CURRENT_BRANCH"
  exit 1
fi

print_success "Current branch: $SOURCE_BRANCH"
print_info "Will sync commits to: $TARGET_BRANCH"
echo ""

# Get commits in source but not in target
print_info "Finding commits to sync..."

# Build git log command with optional limit
if [[ -n "$LIMIT_COMMITS" ]]; then
  COMMITS=$(git log "$TARGET_BRANCH..$SOURCE_BRANCH" --format="%H" -n "$LIMIT_COMMITS" | tac)
else
  COMMITS=$(git log "$TARGET_BRANCH..$SOURCE_BRANCH" --format="%H" --reverse)
fi

if [[ -z "$COMMITS" ]]; then
  print_success "No new commits to sync. Branches are already in sync!"
  exit 0
fi

COMMIT_COUNT=$(echo "$COMMITS" | wc -l)
if [[ -n "$LIMIT_COMMITS" ]]; then
  print_info "Found $COMMIT_COUNT commit(s) to sync (limited to last $LIMIT_COMMITS)"
else
  print_info "Found $COMMIT_COUNT commit(s) in $SOURCE_BRANCH that are not in $TARGET_BRANCH"

  # Warn if syncing many commits without limit
  if [[ $COMMIT_COUNT -gt 10 ]]; then
    echo ""
    print_warning "You're about to sync $COMMIT_COUNT commits!"
    print_info "Consider using -n flag to limit: ./scripts/sync-branches.sh -n 5"
    echo ""
  fi
fi

# Show commit preview
echo ""
print_info "Commits to be processed:"
while IFS= read -r commit; do
  COMMIT_SHORT=$(git rev-parse --short "$commit")
  COMMIT_MSG=$(git log -1 --format="%s" "$commit")
  echo "  ${COMMIT_SHORT} - $COMMIT_MSG"
done <<< "$COMMITS"
echo ""

# Ask for confirmation (unless dry-run)
if [[ "$DRY_RUN" == false ]]; then
  read -p "$(echo -e ${YELLOW}Continue with sync? [y/N]: ${NC})" -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Sync cancelled by user"
    exit 0
  fi
  echo ""
fi

# Arrays to track results
SYNCED_COMMITS=()
SKIPPED_COMMITS=()

# Switch to target branch
if [[ "$DRY_RUN" == false ]]; then
  print_info "Switching to $TARGET_BRANCH branch..."
  git checkout "$TARGET_BRANCH" > /dev/null 2>&1
  echo ""
fi

print_header "Processing Commits"

# Process each commit
while IFS= read -r commit; do
  # Get commit info
  COMMIT_SHORT=$(git rev-parse --short "$commit")
  COMMIT_MSG=$(git log -1 --format="%s" "$commit")

  echo -e "\n${CYAN}Commit: ${COMMIT_SHORT}${NC}"
  echo "Message: $COMMIT_MSG"

  # Check if commit touches personal files
  if commit_touches_personal_files "$commit"; then
    print_warning "SKIPPED - Touches personal files"
    SKIPPED_COMMITS+=("$COMMIT_SHORT: $COMMIT_MSG")

    # Show which personal files were touched
    FILES=$(git show --name-only --format="" "$commit")
    echo "  Personal files:"
    while IFS= read -r file; do
      if [[ -n "$file" ]] && is_personal_file "$file"; then
        echo "    - $file"
      fi
    done <<< "$FILES"
  else
    if [[ "$DRY_RUN" == true ]]; then
      print_success "WOULD CHERRY-PICK (dry run)"
    else
      # Cherry-pick the commit
      if git cherry-pick "$commit" > /dev/null 2>&1; then
        print_success "CHERRY-PICKED"
        SYNCED_COMMITS+=("$COMMIT_SHORT: $COMMIT_MSG")
      else
        print_error "FAILED - Cherry-pick conflict"
        echo ""
        print_error "Cherry-pick failed for commit $COMMIT_SHORT"
        print_info "You'll need to resolve conflicts manually or abort with: git cherry-pick --abort"
        exit 1
      fi
    fi
  fi
done <<< "$COMMITS"

# ============================================================================
# Summary
# ============================================================================

echo ""
print_header "Sync Summary"

echo -e "\n${GREEN}✓ Synced commits (${#SYNCED_COMMITS[@]}):${NC}"
if [[ ${#SYNCED_COMMITS[@]} -eq 0 ]]; then
  echo "  (none)"
else
  for commit in "${SYNCED_COMMITS[@]}"; do
    echo "  - $commit"
  done
fi

echo -e "\n${YELLOW}⚠ Skipped commits (${#SKIPPED_COMMITS[@]}):${NC}"
if [[ ${#SKIPPED_COMMITS[@]} -eq 0 ]]; then
  echo "  (none)"
else
  for commit in "${SKIPPED_COMMITS[@]}"; do
    echo "  - $commit"
  done
fi

if [[ "$DRY_RUN" == false ]]; then
  echo ""
  print_success "Sync complete! You are now on the $TARGET_BRANCH branch."
  print_info "Don't forget to switch back to $SOURCE_BRANCH when you're done:"
  echo "  git checkout $SOURCE_BRANCH"
else
  echo ""
  print_info "Dry run complete. Run without --dry-run to apply changes."
fi

echo ""
