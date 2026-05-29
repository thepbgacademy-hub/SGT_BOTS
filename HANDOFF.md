# Handoff

## Next Step

Apply and verify the new playground table-prefix cleanup migration in the target Supabase environment so all playground-owned `public` tables use the explicit `playground_` prefix. Then run a quick regression on onboarding, provider/session start, and participation gating against that renamed schema before resuming the live Telegram session-end smoke test and Rori Phase 7 data-loading work. Continue treating `codex/rori-academy-concierge` as the active playground stabilization branch, not a Rori-only branch, until shared Top Secret and session/provider work is fully merged. Do not deploy invented, fallback, fixture, or placeholder data.

## Build Doc Sources

- `E:\REPOS\SGT_BOTS\HANDOFF.md`
- `E:\REPOS\SGT_BOTS\TASKS.md`
- `E:\REPOS\SGT_BOTS\docs\superpowers\specs\2026-05-25-rori-academy-concierge-design.md`
- `E:\REPOS\SGT_BOTS\docs\superpowers\plans\2026-05-25-rori-academy-concierge-implementation.md`
- `E:\REPOS\SGT_BOTS\docs\superpowers\plans\2026-05-25-rori-phase-2-grounded-kb.md`
- `E:\REPOS\SGT_BOTS\docs\superpowers\plans\2026-05-25-rori-phase-3-academy-directory.md`
- `E:\REPOS\SGT_BOTS\docs\superpowers\plans\2026-05-25-rori-phase-4-operations-directory.md`
- `E:\REPOS\SGT_BOTS\docs\superpowers\plans\2026-05-25-rori-phase-5-wiki-knowledge.md`
- `E:\REPOS\SGT_BOTS\docs\superpowers\plans\2026-05-25-rori-phase-6-admin-data-preflight.md`
- `E:\REPOS\SGT_BOTS\docs\superpowers\plans\2026-05-28-top-secret-codex-provider-error-log.md`
- `E:\REPOS\SGT_BOTS\docs\superpowers\plans\2026-05-29-playground-branch-map.md`
- `E:\REPOS\SGT_BOTS\docs\superpowers\plans\2026-05-25-rori-error-log.md`

## Last Completed Step

The playground-owned `public` tables were renamed in the repo to a consistent `playground_` prefix for clarity and separation from any other app tables. Fresh-install migrations now create `playground_users`, `playground_telegram_profiles`, `playground_provider_connections`, `playground_bot_definitions`, `playground_conversations`, `playground_messages`, `playground_uploads`, `playground_artifacts`, and `playground_audit_events`, and migration `011_playground_table_prefix_cleanup.sql` was added to rename existing environments in place without moving schemas. The API repos, schema contract tests, and the main playground design spec were updated to use the new names.
