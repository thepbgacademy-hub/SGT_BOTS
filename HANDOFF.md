# Handoff

## Next Step

Run a live Rori Telegram smoke focused on enrollment phrasing and the existing broader tool overview reply. Recheck prompts like `how do i join?`, `how do i join the academy?`, `who do I talk to about enrolling for classes?`, `what do the bots do?`, and `which tool should I use for...?` and confirm that Rori now routes plain `join` wording into enrollment instead of the off-topic boundary while still preserving the sharper tool-selection route for the more specific prompt. Keep the deterministic boundary rules in place: ordinary off-topic prompts should still return the fixed Academy-only line, jailbreak prompts should still return the fixed boundary line, and only jailbreak / instruction-bypass attempts should be written to `playground_audit_events`. Keep the playground shared tables on the `playground_` prefix in `public`, keep Rori Academy content separate in the `rori` schema, and continue treating `codex/rori-academy-concierge` as the active playground stabilization branch until shared Top Secret and session/provider work is fully merged. Do not deploy invented, fallback, fixture, or placeholder data.

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

Rori enrollment intent now recognizes plain human `join` phrasing instead of treating it as off-topic. The bug was that the concierge logic only matched `enroll`, `enrollment`, `join academy`, `sign up`, and `signup`, so the live prompt `how do i join?` fell through to the fixed Academy-only boundary line even though the user clearly meant enrollment. A shared `hasEnrollmentQuestion(...)` matcher was added in `apps/api/src/modules/chat/rori-kb.ts`, both intent classification and the main enrollment branch were switched to use it, and the enrollment wiki lookup was widened to include `join` phrasing. Focused Rori KB tests for `how do i join?`, `how do i join the academy?`, and the enrollment follow-up path all passed, and API lint passed.
