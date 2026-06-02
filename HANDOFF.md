# Handoff

## Next Step

Run a live Rori Telegram smoke focused on direct pricing questions. Confirm `What are the costs?`, `How much does PBG Academy cost?`, and the follow-up `How do I enroll?` -> `What are the costs?` now answer from the real `enrollment-and-pricing` wiki content instead of the old generic enrollment fallback. If the live answer still feels too broad, tighten the pricing reply formatter before moving back to the Top Secret CFR-part verification smoke. Keep the playground shared tables on the `playground_` prefix in `public`, keep Rori Academy content separate in the `rori` schema, and continue treating `codex/rori-academy-concierge` as the active playground stabilization branch until shared Top Secret and session/provider work is fully merged. Do not deploy invented, fallback, fixture, or placeholder data.

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

Rori pricing responses are now anchored to the real Academy wiki instead of the generic enrollment fallback. The bug showed up when the live data used the page key `enrollment-and-pricing`, but the reply builder only looked for an exact slug of `enrollment`, so cost questions like `What are the costs?` never reached the pricing content. The Rori knowledge-base layer now recognizes pricing/cost language directly, prefers `enrollment-and-pricing` before `enrollment`, extracts the pricing table into a short concierge-style answer, and still keeps the enrollment link limitation phrased in plain language. Targeted Rori bot-runtime tests and API lint passed. The live VPS2 backend was hot-patched by copying the updated `rori-kb.ts` into `sgt-bots-app-sgt-bots-backend-1` and restarting only that container; public `/health` returned `{\"status\":\"ok\"}` afterward.
