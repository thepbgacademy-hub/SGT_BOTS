# TASK-012 Engineer Brief — cycle 1

- **build_id**: `2026-07-20-sgt-bots-rori-academy-concierge-persona-runtime`
- **task_id**: `TASK-012`
- **expected_revision for your envelope**: `13` (re-read at briefing time; nothing merged since)
- **write_scope**: `tasks[id=TASK-012]`
- **mode**: **full crew** — four independent concerns, ~12 files, one new interface
  (an artifact-root override) and one new config file. Spawn builders if it helps;
  disclose in the envelope if you implement directly instead.

## Baseline you must not disturb

TASK-010 and TASK-011 are **completed with auditor sign-off**. Their changes are
uncommitted in the working tree and are your baseline. Do not revert, re-do, or
re-stage them. The modified files listed in `git status` for those tickets
(`upload.service.ts`, `telegram-bot.service.ts`, `init-data.ts`, `telegram.route.ts`,
`profile.route.ts`, `provider.route.ts`, `app.ts`, `starter-prompts.ts`, `MainMenu.tsx`,
their specs, etc.) are already-accepted work.

---

## Objective

Four housekeeping items. Items 1–3 are audit line 73 of
`docs/superpowers/plans/2026-07-13-playground-build-inspection-audit.md`
(authoritative). Item 4 is an auditor-directed, user-approved scope extension.

---

## Item 1 — Dead code removal

### 1a. `ArtifactList.tsx` — the audit's wording is WRONG; do not delete the file

I resolved every reference before briefing you. The audit says "remove dead
`ArtifactList.tsx`", but only the **component** is dead. The file also exports the
**`ArtifactListItem` type, which has four live importers**:

- `features/top-secret/TopSecretWorkspace.tsx:2`
- `features/dashboard/DashboardShell.tsx:4-5`
- `features/dashboard/BotSupportPanel.tsx:1`
- `features/chat/ChatPanel.tsx:3`

The `ArtifactList` component itself has **zero** render sites — the only match for
`<ArtifactList` / `ArtifactList(` anywhere under `apps/` is its own definition at
`ArtifactList.tsx:19`.

**Directive**: remove the `ArtifactList` component function and the now-orphaned
`ArtifactListProps` type. **Keep the file and keep `export type ArtifactListItem`.**
Verify my finding yourself before acting; if you reach a different conclusion, report
rather than remove.

Renaming the file (it becomes type-only, and imports are extensionless so a
`.tsx`→`.ts` rename needs no import edits) is **optional**. If you rename, update every
importer and prove both linters still exit 0. If you skip it, say why. Either choice
goes in `proposed_decisions`. Do not move the type into `packages/shared` — that would
pull the API suite into a UI-only change.

### 1b. `buildCreditBureauDisputeHelperReply`

Defined once at `apps/api/src/modules/cursive/cursive.service.ts:251`. **Zero
production callers** — the only other references are four test call sites in
`apps/api/tests/cursive/cursive-prompt.spec.ts` (lines ~253, 272, 287, 298). It is
unreachable because Cursive chat throws `cursive workflow only` (409) before any
persona/config load.

**Directive**: remove the method and the four tests that exercise it. Before removing,
confirm there is no dynamic or string-keyed dispatch that could reach it by name
(check `chat.service.ts` dispatch and any method-name lookup). Keep everything else in
`cursive-prompt.spec.ts` intact — it covers live prompt-package behavior.

Do **not** touch the `credit_bureau_dispute` category slug, templates, repo entries, or
`cursive-review`/`cursive-draft` logic. Those are live.

---

## Item 2 — Stray artifacts

**Inventory taken at briefing time (record this verbatim in your envelope evidence, and
re-verify sizes before deleting — deletions are one-way):**

| Path | Bytes |
|---|---|
| `codex-oauth-fix-20260531.tar` | 547,571,200 |
| `rori-memory-followup-20260531.tar` | 547,585,024 |
| `rori-voice-fix-20260531.tar` | 542,601,728 |
| `rori-voice-full-20260531.tar` | 547,569,664 |
| `top-secret-quality-fix-20260531.tar` | 542,607,360 |
| `codex-oauth-fix-20260531.tar.gz` | 544,224,917 |
| `sgt-bots-rori-fix.tar.gz` | 9,356,246 |
| `sgt-bots-rori-fix.zip` | 9,458,502 |
| `tmp-rori-fetch.mjs` | 498 |
| `tmp-rori-kb-latest.ts` | 23,445 |
| `tmp-rori-runtime-check.mjs` | 946 |
| `tmp-rori-runtime-matrix.mjs` | 1,159 |
| `.deploy-src/` (directory mirror) | 10,792,194 (255 files) |

**Delete exactly those.** ~3.3 GB reclaimed.

**Do NOT delete or gitignore-hide**: `BLUEPRINT-2026-07-20.md`, `CLAUDE.md`,
`.buildwork/`, `Dockerfile.backend.hotfix`, or anything under `apps/`, `packages/`,
`docs/`.

**`.deploy-images/`** — 4,945,659,904 bytes (~4.9 GB), currently untracked and
**not** gitignored. It is **not** named by the audit line. **Gitignore it; do not
delete it.** Note it as a finding in your envelope either way.

Add `.gitignore` entries so each deleted category cannot silently reappear untracked:
the deploy tarball/zip patterns, `tmp-rori-*`, `.deploy-src/`, and `.deploy-images/`.
`git check-ignore -v` confirms none of these are ignored today. Anchor patterns to the
repo root (leading `/`) where that is the correct scope, matching the file's existing
style. Do not add a `.buildwork/` entry.

---

## Item 3 — Relax the 1-second session polling

There are **two** 1000 ms intervals in `DashboardShell.tsx`. They are not the same thing
and only one is the audit's target:

1. **`:1203-1222` — the network session-refresh poll.** `fetch(/api/sessions/:id)`
   every 1000 ms for the whole session. **This is the audit's target. Relax this one.**
2. **`:1346-1350` — a purely local countdown ticker** that decrements
   `remainingCountdownSeconds` by 1 each second. No network. This is what feeds
   `remainingSeconds` (`:1231-1233`), which drives the TASK-011 low-time nudges
   (`:1240-1249`). **Leave this at 1000 ms.**

Because the nudge input comes from the *local* ticker, relaxing the *network* poll does
not coarsen nudge granularity at all. Verify that reading yourself and **state it
explicitly** in `proposed_decisions` — do not just assert it. Also confirm the
threshold-crossing logic at `:70-85` (which is already `<=`-based and commented as
tolerating jumps) still fires exactly once at each of the 600 s and 120 s boundaries.

Pick a defensible interval and justify it in `proposed_decisions` — name the tradeoff
(server load and mobile battery vs. staleness of `state`/`remainingSeconds` after a
server-side change such as session retirement or reauth). Something in the 5–15 s range
is the obvious band; you choose and defend the number. If any mini app test depends on
the old cadence with fake timers, update it deliberately and say so.

There is a third interval at `:1515` — inspect it, and if it is unrelated to session
polling, leave it alone and say what it does.

---

## Item 4 — Fix the `.runtime-artifacts` test-isolation flake (scope extension)

**Provenance**: recorded as nit 2 in `findings/TASK-010-audit-1.md` during the TASK-010
audit; extended into TASK-012 with the user's approval at the ticket boundary.

### Root cause (verified at briefing time)

`apps/api/src/modules/reports/report.service.ts:108`:

```ts
const artifactRoot = path.resolve(process.cwd(), ".runtime-artifacts");
```

Every test file resolves the **same** directory (`process.cwd()` is `apps/api` for all
of them). `createReportService` calls `hydrateArtifactsFromDisk()` at construction
(`:249`), which `readdirSync`-walks that tree and `readFileSync`s each `.json`. With
vitest's default parallel pool and no isolation, one worker deletes artifacts
(`purgeArtifactsForSessionBot` → `deleteArtifactFiles`, `purgeExpiredArtifacts`) while
another is mid-walk → intermittent ENOENT between `walkArtifactMetadataFiles` and
`readFileSync`. The directory is gitignored and currently **dirty** — good, that is the
state you must pass from.

There is **no vitest config in `apps/api`** (none anywhere in the repo; `test` is a bare
`vitest run`), so you will likely need to add one.

### Directive

Make the artifact root **per-run/per-file isolated for tests**. `artifactRoot` is
resolved inside the `createReportService` factory, not at module scope, so it is
straightforwardly injectable. A reasonable shape: accept an optional override on
`deps`, fall back to an env var, fall back to today's `process.cwd()/.runtime-artifacts`
— then have a vitest setup file point each test file at its own temp dir and clean up
after. You own the exact mechanism; keep production behavior **byte-identical** when no
override and no env var are present.

**Hard constraints**:
- **Test-infrastructure-scoped only.** Do **not** redesign the runtime artifact store.
  The 2026-07-13 audit's explicit non-recommendation — *"do not replace the in-memory
  queue/secret store while the deploy is a single backend container"* — stands.
- Env-var **names** only in artifacts; no values (REQ-004).
- Do not weaken coverage to make the race disappear. Disabling parallelism repo-wide
  (e.g. `singleThread`/`fileParallelism: false`) trades the flake for a slower suite and
  hides the underlying sharing — if you propose it, argue it explicitly against real
  isolation rather than defaulting to it.
- Making `hydrateArtifactsFromDisk` defensive (tolerating a file vanishing mid-walk) is
  acceptable **in addition to** isolation, not instead of it. Say which you did.

### Acceptance for item 4

Full API suite passes **≥3 consecutive runs from a dirty `.runtime-artifacts` state with
no manual clearing between runs**. Do not `rm -rf` it to get green.

### Required record decision

Your envelope must include a `proposed_decisions` entry stating that TASK-012's scope
was extended to cover this flake, traceable to the TASK-010 audit finding (nit 2) and
the user's dispatch approval, with the chosen fix approach and its rationale.

---

## Constraints (binding, from the record)

- REQ-004: no secret values in any artifact — env-var names only.
- REQ-003: rori schema untouched. No Academy wiki / pricing / persona content changes.
- CON-001: no destructive DB or VPS actions. The file deletions in item 2 are explicitly
  in-ticket and inventoried above; nothing else gets deleted.
- CON-003: do **not** edit `HANDOFF.md`, `TASKS.md`, or
  `docs/superpowers/plans/2026-07-10-telegram-bot-persona-runtime-roadmap.md`. Status
  lives only in the record.

---

## Verification bar (all of it, reported honestly)

1. **Full API suite ≥3 consecutive green runs from a dirty `.runtime-artifacts`**, from
   `apps/api`: `corepack pnpm exec vitest run`. **Report each run's file/test counts
   separately.** Expect a drop of ~4 tests vs. the TASK-010 baseline (47 files / 390
   tests) from the item 1b removals — state the exact expected delta and confirm it.
2. **Mini app suite green**, from `apps/telegram-miniapp`: `corepack pnpm exec vitest
   run`. Baseline is 9 files / 67 tests. Items 1a and 3 touch this app.
3. **Both linters exit 0**, from repo root:
   `corepack pnpm --filter @sgt-bots/api lint` and
   `corepack pnpm --filter @sgt-bots/telegram-miniapp lint`. These are `tsc --noEmit` and
   are your dangling-import detector for item 1.
4. **`git status` after cleanup** shows no stray tarballs/zips/`tmp-rori-*`/`.deploy-src`.
   Include the `.gitignore` diff in evidence.
5. **Zero-reference greps** for `ArtifactList` (component, not the type) and
   `buildCreditBureauDisputeHelperReply`, pasted as evidence.

"Not run" is reportable and acceptable. **A fabricated green is unrecoverable.**

---

## Envelope requirements

- Write to `.buildwork/crew/<build_id>/outbox/`.
- `write_scope`: `tasks[id=TASK-012]`; `expected_revision`: **13**.
- Evidence goes under `proposed_changes` — **top-level evidence does not merge**.
- `proposed_changes.artifacts`: every touched file, **no duplicates** (the TASK-010
  audit flagged duplicate artifact entries as a nit — do not repeat it).
- `proposed_decisions` must cover: the item 1a keep-the-type adjudication, the chosen
  polling interval + nudge-survival reasoning, the item 4 scope-extension decision, and
  the `.deploy-images/` call.
- Deletion inventory (path + byte size, as taken) in evidence.
- Do **not** set the task to `completed` — only the Auditor may authorize that.
