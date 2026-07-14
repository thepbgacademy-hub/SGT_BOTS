# Tasks

Consult `docs/superpowers/plans/2026-07-13-playground-build-inspection-audit.md` alongside this list: it records the 2026-07-13 build inspection, the corrections already applied, and the reasoning behind the deferred Someday items below.

## Active

- [ ] **Execute persona/runtime roadmap** - work through `docs/superpowers/plans/2026-07-10-telegram-bot-persona-runtime-roadmap.md` in order; next ticket is Phase 7 Ticket 7.1 to add redacted runtime diagnostics, then 7.2 acceptance runbook and 7.3 production readiness gate
- [ ] **Load approved Rori wiki data** - wait for Academy-approved wiki pages from `E:\REPOS\wiki-architect`, generate reviewed Rori upsert SQL, apply after migrations `008` and `009`, then smoke test Rori in Telegram
- [ ] **Prepare remaining bot workflow layers** - continue non-Cursive bot polish after Rori wiki data is ready
- [ ] **Fix 3 pre-existing test failures on this branch** - `tests/e2e/report-isolation.spec.ts` expects the old `top-secret-claim-review.pdf` filename (runtime now embeds the user slug), and two `tests/top-secret/top-secret-researcher.spec.ts` cases expect `not_verified` currentness when retrieval fails but receive `verified_current`/`partially_verified`; confirmed failing at baseline commit `2019e7e` with no local changes on 2026-07-13

## Waiting On

- [ ] **Task dashboard support** - revisit dashboard setup if the expected task-management asset becomes available

## Someday

- [ ] **Broader production runbooks** - add VPS and Supabase release notes for future non-Cursive rollout work
- [ ] **Safety hardening (deferred 2026-07-13 build inspection)** - cap PDF upload byte size and sniff only the `%PDF-` header in `apps/api/src/modules/uploads/upload.service.ts`; honor Telegram 429 `retry_after` in `telegram-bot.service.ts`; move launch/prefill initData from URL query to the `x-telegram-init-data` header; reject future-dated initData `auth_date` beyond small skew in `init-data.ts`
- [ ] **Engagement quick wins (deferred 2026-07-13 build inspection)** - wire the already-built `starterPrompts` per bot and un-hide Rori's empty state; add a "thinking" bubble during in-flight chat replies; adopt Telegram `BackButton`, haptics, `enableClosingConfirmation`, and `themeParams`; low-time nudges at 10 and 2 minutes; auto-poll Codex OAuth status; show bot descriptions before menu selection
- [ ] **Housekeeping (deferred 2026-07-13 build inspection)** - remove dead `ArtifactList.tsx` and the unreachable `buildCreditBureauDisputeHelperReply` in `cursive.service.ts`; gitignore or delete stray deploy tarballs, `tmp-rori-*` files, and the `.deploy-src/` mirror; relax the 1s session polling interval

## Done

- [x] ~~Complete ShAzZaM! workflow separation (Phase 6 Ticket 6.2), fix Condor display-only false-research claim, and fix onboarding/provider copy plus end-session confirm~~ (2026-07-13)
- [x] ~~Complete Top Secret persona config usage, Insight approved-source tutoring runtime, and Cursive workflow-only dispatcher coverage~~ (2026-07-10)
- [x] ~~Complete Rori grounded composer contract, bounded validation, follow-up memory, and Top Secret chat-mode separation~~ (2026-07-10)
- [x] ~~Repair persistent Top Secret Codex report-generation failure diagnostics and fallback handling~~ (2026-05-28)
- [x] ~~Fix OpenAI Codex subscription runtime calls for Top Secret report generation~~ (2026-05-28)
- [x] ~~Polish Rori mini app chat workspace and preserve provider login fix~~ (2026-05-26)
- [x] ~~Simplify Rori visible chat by removing redundant buttons, centering the chat panel, hiding source labels, and showing only the latest exchange~~ (2026-05-26)
- [x] ~~Remove Rori empty starter-prompt card because header instructions already cover the same guidance~~ (2026-05-26)
- [x] ~~Remove duplicate Rori workspace Back button because the top menu already provides Back navigation~~ (2026-05-26)
- [x] ~~Complete Cursive v2 manual and upload/report-analysis lanes~~ (2026-05-22)
- [x] ~~Retire Cursive v1 plan in favor of Cursive v2 workflow rollout~~ (2026-05-22)
- [x] ~~Execute Phase 5~~ (2026-05-06)
- [x] ~~Run Phase 5 reviews~~ (2026-05-06)
- [x] ~~Commit Phase 4~~ (2026-05-06)
- [x] ~~Execute Phase 4~~ (2026-05-06)
- [x] ~~Run Phase 4 reviews~~ (2026-05-06)
- [x] ~~Commit Phase 3~~ (2026-05-05)
- [x] ~~Execute Phase 3~~ (2026-05-05)
- [x] ~~Run Phase 3 reviews~~ (2026-05-05)
- [x] ~~Execute Phase 2~~ (2026-05-05)
- [x] ~~Run Phase 2 reviews~~ (2026-05-05)
- [x] ~~Commit Phase 0~~ (2026-05-05)
- [x] ~~Execute Phase 1~~ (2026-05-05)
- [x] ~~Run Phase 1 reviews~~ (2026-05-05)
- [x] ~~Execute Phase 0~~ (2026-05-05)
- [x] ~~Run Phase 0 reviews~~ (2026-05-05)
- [x] ~~Create the initial local commit~~ (2026-05-05)
- [x] ~~Create the Phase 0 worktree and branch~~ (2026-05-05)
- [x] ~~Choose subagent-driven execution mode~~ (2026-05-05)
- [x] ~~Write the implementation plan~~ (2026-05-05)
- [x] ~~Add phase gates to the implementation plan~~ (2026-05-05)
