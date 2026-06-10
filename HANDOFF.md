# Handoff

## Next Step

Run a live Rori Telegram smoke focused on the broader tool overview reply. Recheck prompts like `what do the bots do?`, `what tools can I use here?`, and `which tool should I use for...?` and confirm that Rori now names all playground bots, including Insight, mentions the Academy-wide `37 tools and gadgets` line, and still preserves the sharper tool-selection route for the more specific prompt. Keep the deterministic boundary rules in place: ordinary off-topic prompts should still return the fixed Academy-only line, jailbreak prompts should still return the fixed boundary line, and only jailbreak / instruction-bypass attempts should be written to `playground_audit_events`. Keep the playground shared tables on the `playground_` prefix in `public`, keep Rori Academy content separate in the `rori` schema, and continue treating `codex/rori-academy-concierge` as the active playground stabilization branch until shared Top Secret and session/provider work is fully merged. Do not deploy invented, fallback, fixture, or placeholder data.

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

Rori now has a broader tool-overview route for natural questions like `what do the bots do?` and still preserves the narrower `which tool should I use` routing behavior. The overview reply now names all six playground bots, including Insight and Rori, and adds the Academy-wide line that there are `37 tools and gadgets at PBG to assist Cadets along their learning journey.` A failing bot-runtime test first showed that the broader matcher accidentally hijacked the exact starter-prompt tool question; the intent order was then corrected so precise tool-selection questions still get the sharper route while loose overview questions get a conversational bot summary. The earlier enrollment-contact route to `Lobby DM to staff` remains in place. Focused bot-runtime tests, API lint, and API build all passed; the next step is a live Telegram smoke on the updated tool-overview wording.
