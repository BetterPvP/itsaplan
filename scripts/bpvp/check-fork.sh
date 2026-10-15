#!/usr/bin/env bash
# Fails when the fork changes upstream files outside the mount points, or adds a
# migration or schema change. See FORK.md.
set -euo pipefail

base=$(git describe --tags --abbrev=0 --match 'v[0-9]*' HEAD)

# Upstream files we change, each with one import and one element or entry.
mounts=(
  apps/web/src/features/issue/components/detail/IssueDetailContent.tsx
  apps/web/src/features/work-items/components/kanban/IssueCardBody.tsx
  apps/web/src/utils/settingsSections.ts
  apps/api/src/planner.ts
)
max_mount_lines=4

ours='^(FORK\.md|scripts/bpvp/|\.github/workflows/bpvp-|apps/web/src/features/playtest/|apps/api/src/modules/playtest/|apps/web/src/app/.*/playtest/)'

failed=0
while IFS=$'\t' read -r added removed path; do
  if [[ $path =~ ^packages/db/(drizzle|src/schema)/ ]]; then
    echo "::error file=$path::No migrations or schema changes in the fork"
    failed=1
  elif [[ " ${mounts[*]} " == *" $path "* ]]; then
    if ((removed > 0 || added > max_mount_lines)); then
      echo "::error file=$path::A mount point adds at most $max_mount_lines lines and removes none (+$added -$removed)"
      failed=1
    fi
  elif ! git cat-file -e "$base:$path" 2>/dev/null && [[ $path =~ $ours ]]; then
    :
  else
    echo "::error file=$path::Upstream file changed outside the mount points"
    failed=1
  fi
done < <(git diff --numstat "$base" HEAD)

if ((failed)); then exit 1; fi
echo "Fork is thin against $base"
