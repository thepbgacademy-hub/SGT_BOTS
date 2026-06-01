# Handoff

## Next Step

Run a fresh live Top Secret Telegram smoke after the statute-first claim-audit deploy. Use a pasted message that cites a specific federal statute and mixes a real fragment with an overstated conclusion. Confirm the new PDF now shows a `Point-by-point check` section that says what the message got right, what it overstated, what it misunderstood, and what was not found in the cited text. Confirm the bot prioritizes the cited statute text instead of drifting into broad agency background when the message already names the governing citation. After that, resume the Rori follow-up behavior smoke: `How do I enroll?` -> `What happens after that?`, `Which PBG Telegram rooms should I join?` -> `Which one would help with payment trouble?`, and `Which PBG Telegram rooms should I join?` -> `And which one for general Academy help?`. Keep the playground shared tables on the `playground_` prefix in `public`, keep Rori Academy content separate in the `rori` schema, and continue treating `codex/rori-academy-concierge` as the active playground stabilization branch until shared Top Secret and session/provider work is fully merged. Do not deploy invented, fallback, fixture, or placeholder data.

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

The Top Secret statute-first claim-audit repair is complete. Top Secret now passes atomic assertions into the provider request, requires `claimChecks` in the structured finding output, and explicitly tells the model to acknowledge any accurate fragment before explaining what the message overstated or misunderstood. When a pasted message cites a specific statute or regulation, retrieval now prioritizes that exact legal text first and suppresses unrelated default agency-background candidates. The PDF template now includes a `Point-by-point check` section and trims back the broad statute-reading boilerplate so the user sees the actual comparison more clearly. Focused Top Secret service/template tests, Top Secret API E2E, API build, and API lint all passed, and the live VPS2 backend was redeployed again from the full `Dockerfile.backend` image because queue/report work still requires the complete dependency layer. Public and container-local `/health` now return `{\"status\":\"ok\"}`.
