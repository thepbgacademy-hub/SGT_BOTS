# Handoff

## Next Step

Deploy and verify the new playground tester bypass and hard-close review handoff: set `PLAYGROUND_PARTICIPATION_BYPASS_TELEGRAM_USER_IDS=5165716120` in the live backend env so the owner Telegram identity can keep testing without tripping the one-entry gate, confirm the review CTA opens the Telegram review group and then closes the mini app, and confirm ordinary users still get the polite one-entry participation block. After that, resume Rori Phase 7 when Academy-approved wiki content is ready: collect the approved Rori wiki pages, Telegram room records, event records, and live links, generate reviewed upsert SQL with `corepack pnpm rori:data:sql`, apply it to the target operations database after migrations `008`, `009`, `010`, and `011`, then perform a VPS/Telegram smoke test. Continue treating `codex/rori-academy-concierge` as the active playground stabilization branch, not a Rori-only branch, until shared Top Secret and session/provider work is fully merged. Do not deploy invented, fallback, fixture, or placeholder data.

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

The live Telegram smoke confirmed the playground session banner now shows `Danger Zone`, the review CTA opens the Telegram review group, and the one-entry participation gate blocks re-entry after the exit flow completes. To support continued owner testing without weakening the gate for everyone else, the codebase now supports a backend env allowlist `PLAYGROUND_PARTICIPATION_BYPASS_TELEGRAM_USER_IDS` keyed by Telegram user id, and the mini app review-link helper now opens the Telegram destination and then calls `Telegram.WebApp.close()` shortly after to make the exit feel final.
