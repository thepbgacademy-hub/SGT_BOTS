# Handoff

## Next Step

Use `docs/superpowers/plans/2026-07-10-telegram-bot-persona-runtime-roadmap.md` as the active execution map for persona/runtime work. Continue with Phase 2 Ticket 2.1: refactor Rori wiki retrieval result shape so retrieval can return explicit `exact`, `partial`, `no_match`, and `error` outcomes with confidence/score and matched source IDs where practical. Keep this ticket scoped to retrieval/ranking only; do not start the persona composer, provider/model usage, or production apply.

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
Completed Phase 1 Ticket 1.2 in `docs/superpowers/plans/2026-07-10-telegram-bot-persona-runtime-roadmap.md`. Prompt-config loading now exposes redacted diagnostics for Supabase exact match, Supabase global fallback, code fallback, missing table, and generic error states through `apps/api/src/modules/bots/bot-prompt-config.repo.ts`, with app-level logging and focused coverage in `apps/api/tests/bots/bot-prompt-config.repo.spec.ts`. No model composition or production apply was performed.
Completed Phase 1 Ticket 1.3 in `docs/superpowers/plans/2026-07-10-telegram-bot-persona-runtime-roadmap.md`. Reviewed manual SQL now lives at `vps-supabase-manual/014_academy_bot_persona_configs.sql` and defines active playground persona prompt-config rows for Rori (`concierge_general_academy_KB`), Top Secret (`verifier`), and Insight (`tutor`) only. Contract coverage lives in `apps/api/tests/bots/academy-bot-prompt-config-seed.spec.ts`; Cursive, ShAzZaM!, and Condor intentionally have no persona records. No production apply was performed.
