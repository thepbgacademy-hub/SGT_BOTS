# Handoff

## Next Step

Run a live Rori playground smoke test against the newly loaded Academy data: verify the public Academy wiki pages now drive Rori answers for overview, enrollment, curriculum, compliance, support, and workshops; verify the official room list now resolves to `Rori DM` and `Lobby DM to staff`; and confirm the bot still does not expose student-only onboarding, troubleshooting, or policies content through the public concierge lane. After that, decide whether to model a separate enrolled-student access boundary before loading the student-only wiki pages. Keep the playground shared tables on the `playground_` prefix in `public`, and keep Rori Academy content separate in the `rori` schema. Continue treating `codex/rori-academy-concierge` as the active playground stabilization branch, not a Rori-only branch, until shared Top Secret and session/provider work is fully merged. Do not deploy invented, fallback, fixture, or placeholder data.

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

The playground session-end flow is stable, and Rori Academy storage is now segregated live on VPS2: the Academy wiki, Telegram room directory, and event directory tables exist only under the dedicated `rori` schema, there are no `public` duplicates, the import generator writes schema-qualified upserts, and the manual SQL bundle includes the non-destructive `012_rori_schema_segregation.sql` path for older environments. The public PBG Academy wiki has now been loaded from `E:\REPOS\PBG_wiki` into the live `rori` schema as seven published concierge pages plus two official support-channel records (`Rori DM` and `Lobby DM to staff`). Student-only pages were intentionally left out of the live concierge schema until a separate access-control boundary is designed.
