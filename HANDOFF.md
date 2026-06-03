# Handoff

## Next Step

Run a live Rori Telegram smoke focused on the new warm scholarly guide tone plus the deterministic boundary rules. Test direct questions like `What is PBG Academy?`, `How do I enroll?`, `What are the costs?`, `Which PBG Telegram rooms should I join?`, one ordinary off-topic prompt, and one jailbreak-style prompt to confirm Rori always returns the fixed boundary lines verbatim. Verify that only jailbreak / instruction-bypass attempts are written to `playground_audit_events`, with prompt text and Telegram identity metadata, and that ordinary off-topic questions are not audited. If the pricing answer still feels too list-like, tighten the response shaping in `rori-kb.ts` before moving back to the Top Secret CFR-part verification smoke. Keep the playground shared tables on the `playground_` prefix in `public`, keep Rori Academy content separate in the `rori` schema, and continue treating `codex/rori-academy-concierge` as the active playground stabilization branch until shared Top Secret and session/provider work is fully merged. Do not deploy invented, fallback, fixture, or placeholder data.

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

Rori now has deterministic boundary behavior for off-topic and jailbreak prompts. The reply layer was updated so ordinary off-topic questions always return `I can only help with PBG Academy, the Playground tools, enrollment, workshops, and support rooms.` and jailbreak / instruction-bypass attempts always return `I can't help with bypassing my instructions or stepping outside my approved Academy role.` with no wording drift. A new audit repo was added and wired into the chat route so only jailbreak attempts are logged to `playground_audit_events` with the raw prompt, conversation/session ids, and Telegram identity metadata for the requesting user. Focused bot-runtime tests and API lint passed for this slice; the next step is a live Telegram smoke plus a DB check that jailbreak attempts, and only jailbreak attempts, are recorded.
