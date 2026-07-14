# Handoff

## Next Step

Use `docs/superpowers/plans/2026-07-10-telegram-bot-persona-runtime-roadmap.md` as the active execution map for persona/runtime work. Phases 0-6 and Phase 7 Ticket 7.1 (redacted runtime diagnostics) are complete; continue with Phase 7 Ticket 7.2 (acceptance runbook), then 7.3 (production readiness gate). Before 7.3, resolve the two `top-secret-researcher.spec.ts` currentness failures tracked in `TASKS.md` — the audit flagged them as touching Top Secret evidence discipline. Deferred build-inspection findings (safety hardening, engagement quick wins, housekeeping) are recorded in `TASKS.md` under Someday.

Consult `docs/superpowers/plans/2026-07-13-playground-build-inspection-audit.md` before starting new work: it records the 2026-07-13 build inspection verdict, the corrections applied (ShAzZaM! workflow separation, Condor display-only fix, mini app copy/confirm fixes), the pre-existing test failures on this branch, and the deferred findings with their reasoning.

## Build Doc Sources

- `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge\HANDOFF.md`
- `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge\TASKS.md`
- `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge\docs\superpowers\specs\2026-05-25-rori-academy-concierge-design.md`
- `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge\docs\superpowers\plans\2026-05-25-rori-academy-concierge-implementation.md`
- `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge\docs\superpowers\plans\2026-05-25-rori-phase-2-grounded-kb.md`
- `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge\docs\superpowers\plans\2026-05-25-rori-phase-3-academy-directory.md`
- `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge\docs\superpowers\plans\2026-05-25-rori-phase-4-operations-directory.md`
- `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge\docs\superpowers\plans\2026-05-25-rori-phase-5-wiki-knowledge.md`
- `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge\docs\superpowers\plans\2026-05-25-rori-phase-6-admin-data-preflight.md`
- `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge\docs\superpowers\plans\2026-05-28-top-secret-codex-provider-error-log.md`
- `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge\docs\superpowers\plans\2026-05-29-playground-branch-map.md`
- `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge\docs\superpowers\plans\2026-05-25-rori-error-log.md`
- `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge\docs\superpowers\plans\2026-07-10-telegram-bot-persona-runtime-roadmap.md`
- `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge\docs\superpowers\plans\2026-07-10-telegram-bot-persona-acceptance-prompts.md`
- `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge\docs\superpowers\specs\2026-07-10-insight-approved-source-boundary.md`
- `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge\docs\superpowers\plans\2026-07-13-playground-build-inspection-audit.md`

## Last Completed Step

Completed Phase 7 Ticket 7.1 in `docs/superpowers/plans/2026-07-10-telegram-bot-persona-runtime-roadmap.md` (redacted runtime diagnostics). Every chat reply now emits a `ChatRuntimeDiagnostic` (new `apps/api/src/modules/chat/runtime-diagnostics.ts`) carrying config source/version, retrieval outcome, decision intent/reason, provider fallback state, and source IDs — built only from enumerated outcomes and bounded identifier lists, never user text, reply text, persona prompts, provider payloads, or secrets. Diagnostics are threaded through Rori (`rori-kb.ts` decision + wiki outcome + composer fallback state), Top Secret verifier and Condor (`chat.service.ts`), and Insight (`insight-tutor.ts`); persona paths now use `getActiveConfigResult` so the config source is captured per message. `createChatService` exposes `onRuntimeDiagnostic` (failures never break chat delivery; workflow-only bots emit nothing) and `app.ts` logs it via `app.log.info({ chatRuntime: ... })`. Safe-logging coverage: `apps/api/tests/chat/chat-runtime-diagnostics.spec.ts` (9 tests: key allowlist, marker-based no-leak checks for user/persona/reply text, reporter-throw resilience). Verified with the chat suites + `bot-runtime.spec.ts` + `bot-prompt-config.repo.spec.ts` (all green), full API suite 368/371 (the 3 failures are the pre-existing ones tracked in `TASKS.md`), and `corepack pnpm --filter @sgt-bots/api lint`. No production apply was performed.

Previous step: Completed Phase 6 Ticket 6.2 in `docs/superpowers/plans/2026-07-10-telegram-bot-persona-runtime-roadmap.md`, closing Phase 6. ShAzZaM! `form_wizard` chat now hard-rejects with `shazzam workflow only` (409) before persona config load, a dedicated guided-intake workflow exists (`GET /api/form-wizard/workflow/entry`, `POST /api/form-wizard/workflow/guided-intake/validate` with missing-field validation), and the mini app renders a guided intake form instead of chat for ShAzZaM!. In the same pass: Condor chat no longer falsely claims research ran (display-only copy with an E2E no-false-claim assertion), onboarding copy says 6 bot lanes, the provider hint lists Insight and ShAzZaM!, and ending the session now requires an explicit Confirm end step. Verified with `corepack pnpm exec vitest run tests/form-wizard/form-wizard-workflow.spec.ts tests/cursive/cursive-service.spec.ts tests/e2e/bot-runtime.spec.ts`, miniapp component specs and `lint`, `corepack pnpm --filter @sgt-bots/api lint`, and `git diff --check`. No production apply was performed.
