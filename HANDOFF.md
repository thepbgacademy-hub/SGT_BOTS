# Handoff

## Next Step

Deploy the Top Secret approved binary cover asset fix to VPS 2, then retest a live Top Secret report in Telegram and confirm page 1 is the exact `PBG-TopSecretCover.pdf` asset before the findings PDF pages. If any new render issue appears, inspect sanitized VPS backend logs first. Then resume Rori Phase 7 when Academy-approved wiki content is ready: collect the approved Rori wiki pages, Telegram room records, event records, and live links, generate reviewed upsert SQL with `corepack pnpm rori:data:sql`, apply it to the target operations database after migrations `008` and `009`, then perform a VPS/Telegram smoke test. Do not deploy invented, fallback, fixture, or placeholder data.

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
- `E:\REPOS\SGT_BOTS\docs\superpowers\plans\2026-05-25-rori-error-log.md`

## Last Completed Step

Top Secret PDF cover handling was upgraded on `codex/rori-academy-concierge`: the queue worker now prepends the approved binary asset `workers/queue/assets/PBG-TopSecretCover.pdf` to Top Secret PDFs only, the HTML template is body-only again, and queue/API regression tests are green.
