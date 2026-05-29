# Handoff

## Next Step

Run a live Telegram UI smoke on the playground itself to visually confirm the API-verified behavior: `Danger Zone` should end the session and send the user to the review CTA, timeout should do the same, and a second provider-backed entry attempt should stay politely blocked. After that, resume Rori Phase 7 when Academy-approved wiki content is ready: collect the approved Rori wiki pages, Telegram room records, event records, and live links, generate reviewed upsert SQL with `corepack pnpm rori:data:sql`, apply it to the target operations database after migrations `008`, `009`, `010`, and `011`, then perform a VPS/Telegram smoke test. Continue treating `codex/rori-academy-concierge` as the active playground stabilization branch, not a Rori-only branch, until shared Top Secret and session/provider work is fully merged. Do not deploy invented, fallback, fixture, or placeholder data.

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

The playground-owned `public` tables were renamed live on VPS2 Supabase to a consistent `playground_` prefix for clarity and separation from any other app tables. Fresh-install migrations now create `playground_users`, `playground_telegram_profiles`, `playground_provider_connections`, `playground_bot_definitions`, `playground_conversations`, `playground_messages`, `playground_uploads`, `playground_artifacts`, and `playground_audit_events`, and migration `011_playground_table_prefix_cleanup.sql` now updates existing environments in place without moving schemas. The API repos, schema contract tests, and the main playground design spec were updated to use the new names. A live API smoke then verified onboarding, provider connect, review-prompt session shutdown, session invalidation, and one-entry participation blocking against the renamed schema after rebuilding the playground backend image from the full Dockerfile.
