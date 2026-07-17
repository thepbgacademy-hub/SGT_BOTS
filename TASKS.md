# Tasks

Consult `docs/superpowers/plans/2026-07-13-playground-build-inspection-audit.md` alongside this list: it records the 2026-07-13 build inspection, the corrections already applied, and the reasoning behind the deferred Someday items below.

## Active

- [ ] **Run Rori Telegram conversation smoke** - use the frozen Rori acceptance prompts in the Playground and confirm warm, grounded answers from the loaded Academy wiki
- [ ] **Prepare remaining bot workflow layers** - continue non-Cursive bot polish after Rori wiki data is ready

## Waiting On

- [ ] **Task dashboard support** - revisit dashboard setup if the expected task-management asset becomes available

## Someday

- [ ] **Broader production runbooks** - add VPS and Supabase release notes for future non-Cursive rollout work
- [ ] **Safety hardening (deferred 2026-07-13 build inspection)** - cap PDF upload byte size and sniff only the `%PDF-` header in `apps/api/src/modules/uploads/upload.service.ts`; honor Telegram 429 `retry_after` in `telegram-bot.service.ts`; move launch/prefill initData from URL query to the `x-telegram-init-data` header; reject future-dated initData `auth_date` beyond small skew in `init-data.ts`
- [ ] **Engagement quick wins (deferred 2026-07-13 build inspection)** - wire the already-built `starterPrompts` per bot and un-hide Rori's empty state; add a "thinking" bubble during in-flight chat replies; adopt Telegram `BackButton`, haptics, `enableClosingConfirmation`, and `themeParams`; low-time nudges at 10 and 2 minutes; auto-poll Codex OAuth status; show bot descriptions before menu selection
- [ ] **Housekeeping (deferred 2026-07-13 build inspection)** - remove dead `ArtifactList.tsx` and the unreachable `buildCreditBureauDisputeHelperReply` in `cursive.service.ts`; gitignore or delete stray deploy tarballs, `tmp-rori-*` files, and the `.deploy-src/` mirror; relax the 1s session polling interval

## Done

- [x] ~~Complete Phase 7 Ticket 7.1 redacted runtime diagnostics: per-message ChatRuntimeDiagnostic (config source, retrieval outcome, decision outcome, provider fallback state, source IDs) with safe-logging tests and app-logger wiring~~ (2026-07-14)
- [x] ~~Complete Phase 7 Tickets 7.2 and 7.3: acceptance runbook, production-readiness gate, currentness contract repairs, report-isolation E2E coverage, and full API verification~~ (2026-07-15)
- [x] ~~Complete local Rori wiki load preflight: bundle validation, dedicated-schema SQL generation, runtime retrieval checks, and Rori grounding checks~~ (2026-07-15; remote apply remains pending)
- [x] ~~Complete Rori remote runtime gate: confirmed the dedicated schema and expected reviewed rows on VPS2, then proved the deployed backend reads all seven published pages through the `rori` profile~~ (2026-07-17; no database write or restart required)
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
