# Handoff

## Next Step

Run a live Rori Telegram smoke focused on the new warm scholarly guide tone. Test direct questions like `What is PBG Academy?`, `How do I enroll?`, `What are the costs?`, `Which PBG Telegram rooms should I join?`, and one off-topic prompt to confirm the shared `academy_bot_prompt_configs` row is making Rori sound warmer, more composed, and less helpdesk-like. If the pricing answer still feels too list-like, tighten the response shaping in `rori-kb.ts` before moving back to the Top Secret CFR-part verification smoke. Keep the playground shared tables on the `playground_` prefix in `public`, keep Rori Academy content separate in the `rori` schema, and continue treating `codex/rori-academy-concierge` as the active playground stabilization branch until shared Top Secret and session/provider work is fully merged. Do not deploy invented, fallback, fixture, or placeholder data.

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

Rori now has a shared prompt-config lane and a warmer voice pass. The Academy-wide `academy_bot_prompt_configs` table was added for shared bot persona, tone, guardrail, and fallback data, and Rori's `playground` row was seeded there. Then the Rori reply layer was tightened to a `warm scholarly guide` feel by updating the live prompt-config row and adding a small response-shaping pass in `rori-kb.ts` so generic room, pricing, enrollment, and tool-routing replies sound calmer, more teacher-like, and less like a helpdesk script. Focused bot prompt config tests, targeted Rori bot-runtime tests, API lint, and API build all passed. The live VPS2 backend was hot-patched with the updated Rori files, the Supabase row was updated in place, and public `/health` returned `{\"status\":\"ok\"}` afterward.
