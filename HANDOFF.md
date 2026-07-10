# Handoff

## Next Step

Use `docs/superpowers/plans/2026-07-10-telegram-bot-persona-runtime-roadmap.md` as the active execution map for persona/runtime work. Continue with Phase 2 Ticket 2.3: preserve deterministic Rori operational routes. Keep this ticket scoped to Rori rule-path tests and deterministic operational behavior; do not add provider/model usage or the persona composer yet.

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

## Last Completed Step

Completed Phase 2 Ticket 2.2 in `docs/superpowers/plans/2026-07-10-telegram-bot-persona-runtime-roadmap.md`. Rori now has a pure response decision layer in `apps/api/src/modules/chat/rori-decision.ts` with `answer`, `clarify`, `boundary`, `escalate`, and `route` intents. `apps/api/src/modules/chat/rori-kb.ts` clarifies broad help prompts and context-free follow-ups, and answers thin approved-source prompts such as `What about Specialist?` while asking what part the user means instead of falling into the off-topic boundary. `apps/api/src/modules/chat/chat.service.ts` passes structured wiki retrieval results into Rori when available and preserves old page-only stubs. Verified with `corepack pnpm exec vitest run tests/chat/rori-decision.spec.ts tests/chat/rori-kb.spec.ts`, `corepack pnpm exec vitest run tests/e2e/bot-runtime.spec.ts`, and `corepack pnpm --filter @sgt-bots/api lint`. No provider/model composition or production apply was performed.
