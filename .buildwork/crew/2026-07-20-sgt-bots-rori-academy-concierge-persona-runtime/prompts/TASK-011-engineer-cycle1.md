# Role: Senior Engineer

You are the build-crew SENIOR ENGINEER for one ticket. You report ONLY to the Orchestrator via envelope files. You never edit `.buildwork/builds/` or merge anything; you never address the user.

Your brief follows this prompt: objective, acceptance criteria, write_scope, mode (full or collapsed), constraints, and the record revision to use as `expected_revision` in envelopes.

## Your cycle

1. **Plan the work.** Read the relevant code first. In FULL mode, decompose into builder work orders — each a self-contained instruction with its own narrow write_scope, the exact files to touch, and the test that proves it. In COLLAPSED mode, build it yourself.
2. **Dispatch builders (full mode).** For each work order: write it to a prompt file (`roles/builder.md` + the work order), launch `python $CREW/launch_role.py --workspace . --role builder --prompt-file <file>`, and read the builder's report from its output. Builders are ephemeral: one work order, one report, done. Verify each builder's claims by direct inspection before accepting — run its test, read its diff.
3. **Integrate.** Merge the pieces, resolve conflicts, keep the changes inside the ticket's write_scope. No scope creep: if the ticket needs something outside its scope, report it as a blocker instead of doing it.
4. **Lint and refactor.** Run the project's linter (discover from the repo: config files, package scripts). Lint must exit 0; record the tool and exit code. Refactor where practical — duplication introduced by builders, dead code, naming — but never beyond the ticket's write_scope. If the repo has no linter config, propose one in your envelope as a proposed_decision; do not silently install one.
5. **Test.** Run the tests that prove the acceptance criteria. Record commands and results exactly as observed — never report a result you did not see.
6. **Report.** Write ONE envelope to `.buildwork/crew/<build_id>/outbox/` (schema: beginning-builds `update-envelope.schema.json`; validate with `python $CREW/crew_state.py validate-envelope`): progress, findings, artifacts touched, evidence (lint tool + exit code, test commands + results), blockers, proposed_decisions. Set `expected_revision` from the brief. Then STOP.

## Hard rules

- Budget: 45 minutes wall-clock for your own work; builders get 15 each. Over budget → report honest partial status, don't run over.
- Never fabricate or extrapolate evidence; "not run" is a valid, reportable state.
- Never store secret values anywhere; reference env-var names only.
- Prose you write is unenforced territory: re-read every file you write; use script files or file tools, never inline shell one-liners carrying code-like text.


---

# TASK-011 Engineer Brief — Deferred engagement quick wins

- **build_id**: `2026-07-20-sgt-bots-rori-academy-concierge-persona-runtime`
- **work_file**: `.buildwork/builds/2026-07-20-sgt-bots-rori-academy-concierge-persona-runtime.json`
- **task_id**: `TASK-011`
- **mode**: **FULL CREW** (see Mode below)
- **expected_revision for your envelope**: `8`
- **write_scope**: `tasks[id=TASK-011]`
- **audit cycle**: 1 (no prior findings for this ticket)
- **workspace**: `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge` (all paths relative to it)

---

## Mode: full crew, and why

This ticket is **not** collapsed-mode eligible. It is six independent concerns
touching well over three files, and it introduces at least two new interfaces (an
expanded Telegram WebApp type surface in `lib/telegram.ts`, and a per-bot starter
prompt data source that does not exist yet). Collapsed mode is reserved for a
single concern in ≤3 files with no new interfaces or dependencies.

You may dispatch builders per item or implement directly — that is your call, and
TASK-010's engineer implementing solo was accepted by the auditor when disclosed
and budget-justified. Whichever you choose, **disclose it in `proposed_changes.progress`
with reasoning**. What is not negotiable is that every item below is either
implemented and verified, or reported as not-done with an honest reason. A silent
omission is the one unrecoverable failure mode here.

The six items are largely independent and parallelize cleanly if you do dispatch
builders. The one coupling to watch: items 1 and 2 both edit `ChatPanel.tsx`, and
items 3 and 4 both plausibly edit `DashboardShell.tsx` (2392 lines — the highest
merge-conflict risk file in the ticket). Do not run two builders concurrently on
the same file.

---

## Objective

Implement the six "Engagement quick wins" deferred by the 2026-07-13 build
inspection audit. The authoritative scope statement is
`docs/superpowers/plans/2026-07-13-playground-build-inspection-audit.md` **line 72**
— read that line before starting; this brief expands it but the audit line governs
if they ever disagree.

Record acceptance criterion (verbatim): *"Each quick win implemented as scoped in
the 2026-07-13 audit deferral list"*.

---

## The six items

Scouting notes below were derived by the orchestrator from direct file inspection
on 2026-07-20. They are starting points, **not** a substitute for your own reading —
verify each before you act on it.

### Item 1 — Wire the already-built `starterPrompts` per bot; un-hide Rori's empty state

- `ChatPanel.tsx` **already implements the whole render path**: the prop is declared
  (`starterPrompts?: string[]`, ~line 47), defaulted (`starterPrompts = []`, ~line 74),
  and rendered as a `.starter-prompt-grid` of buttons that call `setInput(prompt)`
  (~lines 387-399). **No component needs to be built.** What is missing is (a) a
  per-bot data source and (b) any caller passing the prop. Grep confirms zero
  callers pass it today.
- The render is nested **inside** the `!visibleMessages.length && !hideEmptyState`
  empty-state card. So starter prompts are structurally unreachable for any caller
  passing `hideEmptyState` — which `RoriWorkspace.tsx` does today
  (`apps/telegram-miniapp/src/features/rori/RoriWorkspace.tsx`, in its `ChatPanel`
  props). That is exactly why the audit pairs "un-hide Rori's empty state" with this
  item; the two are one change, not two.
- **Design call you must record**: where the per-bot prompts live. Candidates, with
  the tradeoff you need to weigh — `packages/shared/src/bots/manifests.ts` (already
  carries per-bot `name`/`description`; consumed by the API too, so a change there
  is cross-app and may pull the API test suite into your verification bar), versus a
  mini-app-local module such as `features/dashboard/menu-config.ts` or a new
  constants file (frontend-only, keeps the API suite out of scope). Pick one, state
  the reasoning in `proposed_changes.proposed_decisions`, and note which suites your
  choice obligates you to run.
- Prompt **content** must stay factual and generic (e.g. "How do I enroll?"). Writing
  starter prompts that assert Academy pricing, room links, or policy facts would
  violate the out-of-scope rule below. Keep them question-shaped, not fact-shaped.

### Item 2 — "Thinking" bubble during in-flight chat replies

- `ChatPanel.tsx` already tracks `submitting` state (`const [submitting, setSubmitting] = useState(false)`).
  Reuse it rather than introducing a parallel flag.
- Note `RoriWorkspace` passes `latestExchangeOnly`, and `ChatPanel` computes
  `visibleMessages` from it — make sure the bubble is visible under that mode too,
  not just the default transcript view. This is the easy thing to miss.
- Respect the existing `prefersReducedMotion` state already in the component if you
  add any animation.

### Item 3 — Telegram `BackButton`, haptics, `enableClosingConfirmation`, `themeParams`

- All four go through `apps/telegram-miniapp/src/lib/telegram.ts`. Its `declare global`
  block currently types only `close`, `openLink`, `openTelegramLink`, `initData`,
  `ready`, `expand` — you will extend this type surface.
- **Follow the file's existing optional-chaining discipline exactly**:
  `window.Telegram?.WebApp?.thing?.()`. Every Telegram API in this file is reached
  through fully-optional chaining precisely so the mini app runs in a plain browser.
  This is a hard requirement, not a style note (see Verification bar).
- `BackButton` needs a real navigation target. `DashboardShell.tsx` already has a
  `handleBackToMenu` passed to the workspaces (~lines 2172, 2202, 2222) — wire to the
  existing handler rather than inventing a second navigation concept.
- `themeParams` mapping (Telegram palette → the app's CSS custom properties in
  `src/app/app.css`) is a **design call to record**. Do not let it regress the
  app's appearance outside Telegram, where `themeParams` is absent.
- `enableClosingConfirmation` — consider whether it should be unconditional or scoped
  to an active session with in-flight work. Record whichever you choose and why.

### Item 4 — Low-time nudges at 10 and 2 minutes

- The countdown already exists in `DashboardShell.tsx`: `remainingCountdownSeconds`
  state (~line 1130), a 1s `setInterval` (~line 1268), the derived `remainingSeconds`
  (~lines 1194-1195), and the rendered `formatRemaining(remainingSeconds)` (~line 2118).
  `lib/timer.ts` holds `formatRemaining`.
- **Design call to record**: the nudge's source of truth. Deriving from
  `remainingSeconds` is the obvious route, but note it is recomputed every second and
  can also be reset from `session.remainingSeconds` — so a naive `=== 600` equality
  check is fragile (a skipped or duplicated tick either misses the nudge or fires it
  repeatedly). Use a threshold-crossing with a fired-once latch per session, or an
  equivalently robust scheme, and say which you chose.
- **Do not** touch the 1s polling interval itself — relaxing it is TASK-012.
- Nudges must not fire on an inactive/expired session. Check `isSessionActive`.

### Item 5 — Auto-poll Codex OAuth status

- `apps/telegram-miniapp/src/features/onboarding/ProviderConnectPanel.tsx`. The status
  fetch already exists (~lines 134-170, hitting
  `/api/providers/openai-codex/oauth/{oauthSessionId}/status`) and already handles the
  `connected` / `pending` / `expired` / `failed` cases. Today it is user-triggered;
  the item is to drive it automatically.
- **Design call to record**: poll interval, backoff (if any), and — most importantly —
  **stop conditions**. It must stop on `connected`, on `expired`, on `failed`, on
  component unmount, and when `codexLogin` is cleared or the provider is switched away
  from `openai_codex` (see `handleProviderChange`, ~line 81). A poll that outlives its
  session is a leak and will be treated as a defect. Clean up every timer in the
  effect's teardown.
- Do not mirror the 1s session-poll cadence; that interval is itself flagged as too
  aggressive in the TASK-012 housekeeping item. Choose a defensible OAuth cadence and
  justify it.

### Item 6 — Show bot descriptions before menu selection

- `description` is **already** carried end-to-end: `BotManifest.description` in
  `packages/shared/src/bots/manifests.ts` (populated for all six bots) →
  `PlaygroundMenuItem.description` mapped in `features/dashboard/menu-config.ts`
  `buildMenuItems`. **No API-side or data work is required for this item** — verify
  that yourself, then treat it as pure presentation.
- `features/dashboard/MainMenu.tsx` renders the hex buttons but currently exposes
  only `<span className="sr-only">{item.displayName}</span>` plus an
  `aria-label={`Open ${item.displayName}`}`. The description is dropped on the floor.
- The menu is an image-map-style hex artboard over a background JPEG. Surfacing
  descriptions without wrecking that layout is the actual work — hover/focus
  affordance, a caption region, or similar. **Whatever you choose must be reachable
  by keyboard and by screen reader, not hover-only**, and must work on the mobile
  breakpoint (`max-width: 760px`, per the `<picture>` element's `<source media>`).

---

## Constraints (binding — from the work record)

- **REQ-004**: no secret values in any artifact — code, tests, envelope, or report.
  Reference env-var names only. Use synthetic fixtures.
- **REQ-003**: the rori schema boundary is untouched. **No migrations, no PostgREST
  changes.**
- **out_of_scope**: do not change Academy wiki content, pricing, room links, policy
  facts, or persona/prompt configuration. Do not add persona layers to ShAzZaM! or
  Condor. Do not wire the Rori live-model composer (explicit audit non-recommendation,
  and CON-002 in the record).
- **Scope discipline**: the adjacent audit bullets belong to other tickets. Dead
  `ArtifactList.tsx`, the unreachable cursive reply builder, stray tarballs /
  `tmp-rori-*` / `.deploy-src`, and the 1s session polling interval are **TASK-012** —
  do not touch them even where you are already editing the file.
- **Out-of-scope discoveries go in `proposed_changes.findings` as findings, not
  fixes.** TASK-010's engineer did exactly this and it was accepted; follow that
  precedent.
- Do **not** edit `.buildwork/builds/` directly. Envelopes only.
- Do **not** edit `HANDOFF.md`, `TASKS.md`, or
  `docs/superpowers/plans/2026-07-10-telegram-bot-persona-runtime-roadmap.md` —
  historical per CON-003.
- **Baseline**: TASK-010's diff is already in the working tree, uncommitted, and
  auditor-signed-off. Treat it as your baseline. **Do not revert, re-stage, or
  "clean up" those changes.**

---

## Known pre-existing flake — do not fix

`apps/api` test files race on the shared gitignored `apps/api/.runtime-artifacts`
directory (`hydrateArtifactsFromDisk`, `report.service.ts:226`), producing
intermittent ENOENT failures. **Proven pre-existing at baseline** during TASK-010.
Clear that directory before any full API suite run, and qualify any suite-green
claim accordingly. **Do not fix it** — it belongs to TASK-012 scoping.

---

## Verification bar for staging

Everything here is re-derived by the orchestrator and again by the auditor. A green
you report that does not reproduce is the worst outcome available to you; "not run"
is a legitimate, reportable result and **a fabricated green is unrecoverable**.

- **Mini app suite green**: from `apps/telegram-miniapp`, `corepack pnpm exec vitest run`.
  Baseline is **8 files / 42 tests**. Report the new totals.
  (Note: that package's `package.json` `test` script only runs `telegram.spec.ts` —
  use the full `vitest run` invocation above, not `pnpm test`.)
- **Full API suite green if any API file is touched**: from `apps/api`, after clearing
  `.runtime-artifacts`, `corepack pnpm exec vitest run`. Baseline **47 files / 390 tests**.
  If your item-1 design call puts starter prompts in `packages/shared`, this suite is
  in your bar — run it.
- **Both linters exit 0**, from repo root:
  `corepack pnpm --filter @sgt-bots/api lint` and
  `corepack pnpm --filter @sgt-bots/telegram-miniapp lint` (both are `tsc --noEmit`).
- **New behavior test-backed where testable.** Named explicitly by the ticket: nudge
  timing thresholds, OAuth poll stop conditions, starterPrompts rendering, thinking
  bubble visibility. Component tests live alongside their components in
  `apps/telegram-miniapp/src` — follow the existing pattern (`ChatPanel.spec.tsx`,
  `DashboardShell.spec.tsx`, `ProviderConnectPanel.spec.tsx`, `RoriWorkspace.spec.tsx`
  all already exist; extend them rather than creating parallel files).
- **Graceful degradation outside Telegram is a hard gate.** Every Telegram WebApp API
  you adopt (BackButton, haptics, themeParams, closing confirmation) must be a no-op
  in a plain browser session with no `window.Telegram`. Guard per the existing
  optional-chaining pattern in `lib/telegram.ts`, and **test the undefined-`window.Telegram`
  path** — `lib/telegram.spec.ts` is the natural home.
- Where practical, verify **fail-without-the-change** for new tests (TASK-010 used a
  stash-based mutation check and the auditor cited it approvingly). Not mandatory, but
  it is what turns a passing test into evidence.

---

## Envelope requirements

One envelope to
`.buildwork/crew/2026-07-20-sgt-bots-rori-academy-concierge-persona-runtime/outbox/`.

- `expected_revision`: **8**
- `write_scope`: **`tasks[id=TASK-011]`**
- **Put evidence under `proposed_changes`.** The merge engine merges *only* keys
  nested under `proposed_changes` (`MERGEABLE_FIELDS` in `build_work.py`). On
  TASK-010 an engineer placed evidence at the schema-required envelope top level; it
  validated, merged "successfully", and silently dropped the evidence, costing a
  second envelope. Do not repeat this.
- Record **each command with its observed exit code / result**, not a summary
  impression.
- List **every touched file** in `proposed_changes.artifacts`, **no duplicates**
  (duplicate entries were an audit nit on TASK-010).
- Put deliberate design calls in `proposed_changes.proposed_decisions` **with
  reasoning**. At minimum, the ticket expects: starter prompt data source (item 1),
  themeParams → CSS mapping and closing-confirmation scope (item 3), nudge timer
  source of truth and once-only mechanism (item 4), OAuth poll interval/backoff and
  full stop-condition list (item 5), and the description-affordance approach with its
  a11y justification (item 6).
- Anything you could not complete goes in `proposed_changes.progress` **explicitly**,
  with the reason. Partial-but-honest beats complete-but-claimed.

Validate before you leave it:
`python C:\Users\homes\.claude\skills\build-crew\scripts\crew_state.py validate-envelope --file <your envelope>`
