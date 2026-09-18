#!/usr/bin/env sh
# Pre-push guard: catches .gitignore truncations BEFORE pushing to a public
# remote. This is the verification that would have caught the bug where
# .gitignore was overwritten to 13 lines (truncating it and losing all
# Angular CLI default rules), causing `git add .` to stage 11,047 paths
# including node_modules.
#
# Threshold: if `git add --dry-run .` would stage more than 50 paths,
# something is wrong. With a properly maintained .gitignore on an Angular
# project, the expected count is 0-5 (only tracked modifications).

set -e

ADD_DRY_RUN=$(git add --dry-run . 2>&1)
COUNT=$(printf '%s' "$ADD_DRY_RUN" | wc -l | tr -d ' ')

echo "pre-push guard: \`git add --dry-run .\` would stage $COUNT path(s)."

if [ "$COUNT" -gt 50 ]; then
  echo ""
  echo "❌ BLOCKED: too many paths. .gitignore is likely broken or missing."
  echo "   This would push node_modules, dist, .angular/cache, etc."
  echo ""
  echo "First 20 paths that would be staged:"
  echo "$ADD_DRY_RUN" | head -20
  echo ""
  echo "Common causes:"
  echo "  1. .gitignore was overwritten and lost Angular CLI defaults"
  echo "     → restore from git: git show HEAD:.gitignore > .gitignore"
  echo "  2. New directory of build artifacts was added"
  echo "     → add to .gitignore before retrying"
  echo "  3. You actually want to commit a lot of new files"
  echo "     → set PREPUSH_THRESHOLD env var, e.g.: PREPUSH_THRESHOLD=500 git push"
  echo ""
  exit 1
fi

if [ "$COUNT" -gt 5 ]; then
  echo "⚠️  Warning: staging $COUNT files. Review before pushing:"
  echo "$ADD_DRY_RUN"
  echo ""
fi

exit 0
