# Handoff

## Next Step

Run a fresh live Top Secret Telegram smoke after the CFR-part retrieval repair. Re-run the kind of message that cites `16 CFR Parts 436 and 437` and confirm the saved report no longer falls back to the unrelated IRS/Treasury/SSA stub bundle. The PDF should now stay anchored to the cited eCFR part sources and show the `Point-by-point check` section with supported vs overstated vs misunderstood vs not-found findings. After Top Secret is stable on explicit part citations, resume the Rori follow-up behavior smoke: `How do I enroll?` -> `What happens after that?`, `Which PBG Telegram rooms should I join?` -> `Which one would help with payment trouble?`, and `Which PBG Telegram rooms should I join?` -> `And which one for general Academy help?`. Keep the playground shared tables on the `playground_` prefix in `public`, keep Rori Academy content separate in the `rori` schema, and continue treating `codex/rori-academy-concierge` as the active playground stabilization branch until shared Top Secret and session/provider work is fully merged. Do not deploy invented, fallback, fixture, or placeholder data.

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

The Top Secret CFR-part retrieval repair is complete. After the first point-by-point claim-audit deploy, live logs and artifact metadata showed that `16 CFR Parts 436 and 437` were not recognized as legal citations, so the runtime silently fell back to the unrelated IRS/Treasury/SSA stub bundle and the provider reasoned from the wrong evidence. The retrieval adapter now recognizes `CFR Part/Parts` citations, generates eCFR part URLs such as `https://www.ecfr.gov/current/title-16/part-436`, and keeps citation-specific placeholder sources if runtime fetches fail instead of substituting unrelated defaults. Focused Top Secret service tests, targeted Top Secret API E2E, API build, and API lint all passed; one full E2E queue wait timed out once but the isolated queueing test passed immediately on rerun, so the new change itself is not pointing to a deterministic report regression. Public and container-local `/health` remain `{\"status\":\"ok\"}` on VPS2.
