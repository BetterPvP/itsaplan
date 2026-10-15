# BetterPvP fork

This is the BetterPvP fork of [croffasia/itsaplan](https://github.com/croffasia/itsaplan). It
runs at plan.brauw.dev and adds a playtest panel to issues. Upstream's own docs apply to
everything else.

## Branches

| Branch           | Content                                                               |
| ---------------- | --------------------------------------------------------------------- |
| `bpvp`           | The latest upstream release tag plus our commits. Default branch.     |
| `bpvp-candidate` | A rebase of `bpvp` onto a newer release, waiting for its checks.      |
| `main`           | Upstream's `main`, as it was when forked. Not used.                   |

## Keeping the fork thin

The daily sync rebases our commits onto each upstream release, so every line we change in
an upstream file is a possible conflict. `scripts/bpvp/check-fork.sh` enforces these rules
and runs in the sync.

- Our code goes in new folders: `apps/web/src/features/playtest`,
  `apps/api/src/modules/playtest`, and new route files under `apps/web/src/app`.
- Upstream files are changed only at the mount points listed in the script, with one
  import and one element or entry each.
- No database migrations and no schema changes. Upstream numbers its drizzle migrations in
  sequence, so one of ours would collide with their next one. Playtest state is stored by
  the playtest service.

## Fork features

A change that has to edit upstream files beyond the mount points is a fork feature: one
commit with a `Fork-Feature: <name>` trailer. The check allows every file that commit
changes. Each one is a likely rebase conflict when upstream edits the same files.

| Feature              | What it does                                                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| branch name template | Settings → Configuration → Branch names: the template Copy branch name and Copy Prompt fill in, with `{user}`, `{key}`, `{title}` and `{cycle}`. |
| upstream test fix    | Upstream's #561, the fix for a flaky import test. The rebase drops it once a release contains it. |
| playtest permissions | Team settings → Roles: one resource per playtest action (see, start, restart, end, save as base, review, testers, console, operators, files, log sharing, sensitive values, settings), each with a hint line. |

When the sync reports a conflict in one, rebase by hand onto the tag the notification
names, fix the feature commit, keep its trailer, and push to `bpvp` with
`--force-with-lease`.

## Sync

`.github/workflows/bpvp-sync.yml` runs daily, on a push to `bpvp`, and by hand.

1. When upstream has a newer release tag, it rebases `bpvp` onto it and pushes the result to
   `bpvp-candidate`.
2. It runs upstream's checks (format, lint, typecheck, audit, script tests, build, the
   compose test gate) and ours. A merged pull request skips the test gate when its CI
   passed against the same `bpvp` it was merged onto.
3. Alongside the checks, it builds the api, worker and web images for amd64 and pushes them
   to `ghcr.io/betterpvp/itsaplan-<service>:sha-<commit>`. Nothing deploys until the checks
   pass.
4. It moves `bpvp` to the candidate, points the `stable` tag at the new images, and calls the
   Dokploy webhook. Production pulls `stable`.
5. It waits for plan.brauw.dev to report the new version. When it does not, `stable` goes
   back to the previous images and Dokploy redeploys them.

A rebase conflict or a failed step leaves `bpvp` and `stable` where they were and posts to
ntfy (`playtest` topic). A rolled-back deploy keeps the migrations the new version applied.
The migrate service dumps the database to the `db-backups` volume before it migrates.

To resolve a conflict, rebase by hand onto the tag the notification names, push to `bpvp`
with `--force-with-lease`, and the push runs the rest of the sync.

## Secrets

| Secret            | Use                                                     |
| ----------------- | ------------------------------------------------------- |
| `SYNC_DEPLOY_KEY` | Write deploy key, pushes `bpvp` and `bpvp-candidate`.   |
| `DOKPLOY_WEBHOOK` | Redeploys the itsaplan compose on Dokploy.              |
| `NTFY_TOKEN`      | Posts sync failures to ntfy.                            |
