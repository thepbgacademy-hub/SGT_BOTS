# TASK-012 — QC Review, cycle 1

**Reviewer verdict: PASS** (fresh reviewer, blank context, 23.7s).

Reviewer input: the frozen `prompts/task012-diff.patch` (TASK-010/TASK-011 signed-off
changes excluded — `DashboardShell.tsx` reduced to the single `1000`→`8000` hunk), the
ticket's four acceptance criteria, and project standards. No blocking or non-blocking
findings raised against the diff.

## Reviewer's three UNVERIFIED items — all closed by the orchestrator

The reviewer correctly noted three facts a diff structurally cannot establish. All
three were re-derived directly:

1. **Deletions actually happened.** Confirmed absent: all 5 `*-20260531.tar`,
   `codex-oauth-fix-20260531.tar.gz`, `sgt-bots-rori-fix.tar.gz`,
   `sgt-bots-rori-fix.zip`, all 4 `tmp-rori-*` files, and `.deploy-src/`. 13/13 gone,
   matching the pre-deletion inventory exactly. `git status` shows no stray entries.

2. **`.deploy-images/` preserved, and nothing protected was touched.** Present:
   `.deploy-images` (4.7 G), `BLUEPRINT-2026-07-20.md`, `CLAUDE.md`, `.buildwork/`,
   `Dockerfile.backend.hotfix`. `git check-ignore -v` confirms `.deploy-images/` is now
   ignored (`.gitignore:66`) while **`.buildwork/` is correctly NOT ignored**.

3. **`apps/api/vitest.config.ts` is picked up.** Proven empirically rather than by
   inspection: the shared `apps/api/.runtime-artifacts` directory held 23 files with a
   newest mtime of 10:25 (predating the engineer's 12:55 start) and was still
   byte-for-byte unchanged — same count, same newest mtime — after three consecutive
   full API suite runs. Test runs previously wrote into that directory (which is how it
   became dirty). Writing nothing to it across three runs is only possible if the setup
   file executed and redirected every test file to its own temp directory.

## Orchestrator's independent checks beyond the reviewer's remit

- **Setup-hook timing risk (checked, not an issue).** vitest `setupFiles` `beforeAll`
  hooks run *after* test-file module evaluation, so any test constructing the report
  service at module scope would miss `RUNTIME_ARTIFACTS_ROOT` and still race. Grepped
  all 16 test files that reference `buildApp`/`createReportService`: zero module-scope
  construction — every call sits inside a hook or helper function. The env var is
  always set in time.
- **Production path is byte-identical.** With neither `deps.artifactRoot` nor
  `RUNTIME_ARTIFACTS_ROOT` set, `path.resolve(path.join(process.cwd(),
  ".runtime-artifacts"))` is equivalent to the original `path.resolve(process.cwd(),
  ".runtime-artifacts")`. `app.ts` passes neither.
- **Dead-code removal is complete and safe.** Zero remaining references to
  `buildCreditBureauDisputeHelperReply`, `ArtifactListProps`, or the 5 removed private
  helpers. `formatCityStatePostal` correctly retained (2 refs, still used by
  `formatBureauAddressLines`). Both `tsc --noEmit` linters exit 0, which is the
  dangling-import detector.
- **CON-003 respected.** `HANDOFF.md`, `TASKS.md`, and the 2026-07-10 roadmap doc all
  still carry their 08:24 session-baseline mtimes; the engineer ran 12:55–13:11.

## Judgment calls noted, not blocking

- `.gitignore` uses root-anchored `/*.tar`, `/*.tar.gz`, `/*.zip`. Broader than the
  specific inventoried filenames, but root-anchored and defensible: no legitimate
  root-level archive exists in this monorepo, and the point of the entry is to stop the
  category reappearing untracked. Flagging for auditor visibility.
- Item 1b removed 5 private helpers beyond the briefed "method + 4 tests". Verified
  genuinely orphaned; `noUnusedLocals` is not set in `tsconfig.base.json`, so this was a
  judgment call rather than lint-forced. Disclosed by the engineer in
  `proposed_decisions`. Accepted as in-scope: leaving them would have created new dead
  code inside a dead-code-removal ticket.
