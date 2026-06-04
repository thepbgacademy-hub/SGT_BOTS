# Handoff

## Next Step

Run a live Rori Telegram smoke focused on the programs/courses answer family after the new multi-paragraph formatting pass. Recheck prompts like `What can I study here?`, `What courses can I take?`, `How much do the levels cost?`, and `Who do I talk to if I have a billing issue?` and listen for shorter, more teachable chunks instead of brochure-style blocks. Keep the deterministic boundary rules in place: ordinary off-topic prompts should still return the fixed Academy-only line, jailbreak prompts should still return the fixed boundary line, and only jailbreak / instruction-bypass attempts should be written to `playground_audit_events`. Keep the playground shared tables on the `playground_` prefix in `public`, keep Rori Academy content separate in the `rori` schema, and continue treating `codex/rori-academy-concierge` as the active playground stabilization branch until shared Top Secret and session/provider work is fully merged. Do not deploy invented, fallback, fixture, or placeholder data.

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

Rori now has a lighter reply-shaping pass for the playground, and the mini app renderer preserves those line breaks inside the Rori workspace. Pricing and support-escalation answers were tightened so they read in shorter paragraphs with warmer answer-first wording instead of one dense mechanical block, and the programs/courses branch now splits long curriculum copy into smaller teaching-sized chunks instead of brochure-style walls of text. The pricing formatter opens with `Here's the short version on the levels right now:`, the Rori chat CSS uses `white-space: pre-line`, and focused bot-runtime tests, mini app build, API lint, and API build all passed for this slice. The next step is a live Telegram smoke to confirm the tone and spacing feel right in the real mini app.
