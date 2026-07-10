# Handoff

## Next Step

Use `docs/superpowers/plans/2026-07-10-telegram-bot-persona-runtime-roadmap.md` as the active execution map for persona/runtime work. Continue with Phase 6 Ticket 6.2: complete ShAzZaM! workflow separation. Keep the work scoped to ShAzZaM! workflow entry and validation; do not add a fake persona layer and do not broaden Cursive, Top Secret, Rori, or Insight behavior.

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

## Last Completed Step

Completed Phase 4 Ticket 4.2, Phase 5 Tickets 5.1 and 5.2, and Phase 6 Ticket 6.1 in `docs/superpowers/plans/2026-07-10-telegram-bot-persona-runtime-roadmap.md`. Top Secret chat now uses the `verifier` persona config for source-first refusal, clarification, and report-workflow handoff tone; Insight has an approved-source tutoring boundary plus runtime module for explain/simplify/quiz/refusal; Cursive remains workflow-only and does not load persona config before rejecting chat. Verified with `corepack pnpm exec vitest run tests/chat/insight-tutor.spec.ts tests/e2e/bot-runtime.spec.ts tests/cursive/cursive-service.spec.ts`, `corepack pnpm --filter @sgt-bots/api lint`, and `git diff --check`. No production apply was performed.
