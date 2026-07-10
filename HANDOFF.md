# Handoff

## Next Step

Use `docs/superpowers/plans/2026-07-10-telegram-bot-persona-runtime-roadmap.md` as the active execution map for persona/runtime work. Continue with Phase 1 Ticket 1.2: make prompt-config loading observable, reporting exact match, global fallback, code fallback, and missing-table/error states from tests/logs. Keep the work to config repo and tests only; do not start model composition or production apply. Keep persona work limited to `Rori` (`concierge_general_academy_KB`), `Top Secret` (`verifier`), and `Insight` (`tutor`); keep `Cursive` (`document_wizard`) and `ShAzZaM!` (`form_wizard`) in deterministic utility lanes; keep `Condor` (`tax_legal_research`) as a display-only playground surface for this roadmap.

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

Completed Phase 0 Ticket 0.2 in `docs/superpowers/plans/2026-07-10-telegram-bot-persona-runtime-roadmap.md`. The acceptance prompt suite is now frozen in-repo at `docs/superpowers/plans/2026-07-10-telegram-bot-persona-acceptance-prompts.md`, scoped to Rori (`concierge_general_academy_KB`), Top Secret (`verifier`), Insight (`tutor`), Cursive (`document_wizard`), ShAzZaM! (`form_wizard`), and display-only Condor (`tax_legal_research`). Phase 0 is complete. No runtime code, schema, or production state changed in this ticket.
Completed Phase 1 Ticket 1.1 in `docs/superpowers/plans/2026-07-10-telegram-bot-persona-runtime-roadmap.md`. The migration path for `academy_bot_prompt_configs` is verified and tightened: `supabase/migrations/013_academy_bot_prompt_configs.sql` now explicitly targets `public.academy_bot_prompt_configs`, and `apps/api/tests/bots/academy-bot-prompt-configs-schema.spec.ts` locks the runtime loader columns plus the one-active-per-`bot_id`/`surface` partial unique index. No production apply was performed.
