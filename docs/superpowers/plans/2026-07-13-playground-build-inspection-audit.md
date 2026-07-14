# Playground Build Inspection Audit - 2026-07-13

Scope:
- Full build inspection of the SGT Bots Telegram Playground against the stated goals: each bot does only its intended job, answers stay grounded in approved sources, workflows do not cross-contaminate, provider credentials work safely across the session, generated PDFs go to the right user, and unsupported claims are refused or clarified instead of guessed.
- Branch inspected: `codex/rori-academy-concierge` at baseline commit `2019e7e` (Add Insight tutoring and Top Secret persona chat).
- Areas covered: API bot chat runtime and dispatch, per-bot separation, persona config loading, report/PDF pipeline and artifact user-binding, Telegram Bot API compliance, provider credential handling, mini app user journey and Telegram Mini App integration, tests, and rollout gates.

Related docs:
- `docs/superpowers/plans/2026-07-10-telegram-bot-persona-runtime-roadmap.md`
- `docs/superpowers/plans/2026-07-10-telegram-bot-persona-acceptance-prompts.md`
- `HANDOFF.md`, `TASKS.md`

---

## Overall Verdict

The architecture meets the stated goals and is not over-built. The corrections listed below were applied on 2026-07-13; the deferred findings are recorded in `TASKS.md` under Someday so they are not lost.

---

## Verified Strengths (no action needed)

1. **Bot separation is clean.** Dispatch in `apps/api/src/modules/chat/chat.service.ts` routes per manifest ID; only the three persona bots (Rori, Top Secret, Insight) load persona configs. Cursive rejects chat with `cursive workflow only` (409) before any config load, and no persona records or code fallbacks exist for utility bots.
2. **Top Secret never fakes verification in chat.** `buildVerifierReply` only clarifies, refuses source-bypass requests, or routes to the real report workflow; tests assert no "verified/I checked" language. Real verification runs only through `POST /api/reports/top-secret/claim-review` with a source-grounded prompt.
3. **Insight is bounded** to a fixed approved-lesson list (`insight-tutor.ts`) with refusals for unsupported examples and off-topic prompts.
4. **PDF user-binding is strong.** Artifacts carry `sessionId` + `userId`; downloads re-check both plus an HMAC token with a 5-minute TTL (`report.route.ts`); cross-user access is tested to return 404 (`report-isolation.spec.ts`). Delivery is over authenticated HTTP inside the mini app, never Telegram `sendDocument`, so there is no chat_id misrouting surface.
5. **Provider credential handling is sound.** Secrets are memory-only (`session.store.ts`), keyed by session, one active session per user, evicted on session retire (`session.service.ts` `retireSessionById`, wired through `app.ts` for both timeout and early-exit review paths). Secrets are never persisted to disk or database.
6. **Telegram Bot API exposure is minimal by design.** Long-polling only, one static welcome message, no user content interpolated into Telegram sends, no `parse_mode`, no file uploads to Telegram — so the 4096-character, entity-escaping, and 50 MB concerns are structurally absent. initData HMAC validation uses correct `WebAppData` key derivation with a 300-second age window.

---

## Corrections Applied (2026-07-13)

### 1. ShAzZaM! workflow separation (roadmap Phase 6 Ticket 6.2)

Before: ShAzZaM! `form_wizard` chat returned a single canned string that echoed the user's input and promised a workflow that did not exist. There was no route, service, schema, or validation anywhere for `form_wizard`.

After:
- Chat dispatch throws `shazzam workflow only` (409) before persona config load or conversation persistence, mirroring the Cursive gate (`chat.service.ts`, `chat.route.ts`).
- Dedicated workflow surface: `apps/api/src/modules/form-wizard/form-wizard.service.ts` and `form-wizard.route.ts` expose `GET /api/form-wizard/workflow/entry` (returns `chatEnabled: false`, modes, and the guided-intake field list) and `POST /api/form-wizard/workflow/guided-intake/validate` (names missing field labels and does not complete incomplete submissions), satisfying acceptance prompts SHAZZAM-01 and SHAZZAM-02.
- The mini app renders `apps/telegram-miniapp/src/features/form-wizard/FormWizardPanel.tsx` (guided intake form) instead of an open ChatPanel for ShAzZaM! (`DashboardShell.tsx`).
- No persona layer was added. Coverage: `apps/api/tests/form-wizard/form-wizard-workflow.spec.ts`, `apps/telegram-miniapp/src/features/form-wizard/FormWizardPanel.spec.tsx`.

### 2. Condor false research claim

Before: `tax_legal_research` chat replied `I researched "<user text>" and surfaced the most relevant tax and legal lead...` with a static citation, although no retrieval ran — the same false-claim class Top Secret chat was hardened against, and a violation of the "0 false claims" release gate.

After: Condor chat states it is display-only and that no research ran, keeps the approved Tax and Legal Research Index citation, and no longer echoes user input (`chat.service.ts` `buildTaxLegalResearchReply`). An E2E no-false-claim assertion was added in `apps/api/tests/e2e/bot-runtime.spec.ts` mirroring the Top Secret checks.

### 3. Mini app correctness and safety-of-use fixes

- Onboarding hero stat corrected from "5" to "6" specialized bot lanes (`OnboardingPage.tsx`).
- Provider connect hint now lists all six bots including Insight and ShAzZaM! (`ProviderConnectPanel.tsx`).
- The "Danger Zone" button (which ended the three-hour session instantly with no confirmation) is now "End session" with an explicit "Confirm end" / "Keep session" two-step (`DashboardShell.tsx`).

---

## Pre-Existing Test Failures Found (not introduced by the corrections)

Confirmed failing at baseline commit `2019e7e` with no local changes applied:

1. `apps/api/tests/e2e/report-isolation.spec.ts` - expects the old `top-secret-claim-review.pdf` filename; the runtime now embeds the user slug (e.g. `top_secret_user_top_secret_review.pdf`). Stale expectation.
2. `apps/api/tests/top-secret/top-secret-researcher.spec.ts` (two cases) - expect `currentnessStatus: "not_verified"` when live source retrieval fails or is aborted, but receive `verified_current` / `partially_verified`. This one touches Top Secret evidence discipline and should be reviewed before the Phase 7 rollout gate: a source whose text could not be fetched should not be labeled current.

Tracked as an Active task in `TASKS.md`.

---

## Deferred Findings (recorded in TASKS.md under Someday)

- **Safety hardening:** cap PDF upload byte size and sniff only the `%PDF-` header in `upload.service.ts`; honor Telegram 429 `retry_after` in `telegram-bot.service.ts`; move launch/prefill initData from URL query strings to the `x-telegram-init-data` header; reject future-dated initData `auth_date` beyond small skew.
- **Engagement quick wins:** wire the already-built `starterPrompts` per bot and un-hide Rori's empty state; add a "thinking" bubble during in-flight chat replies; adopt Telegram `BackButton`, haptics, `enableClosingConfirmation`, and `themeParams`; low-time nudges at 10 and 2 minutes; auto-poll Codex OAuth status; show bot descriptions before menu selection.
- **Housekeeping:** remove dead `ArtifactList.tsx` and the unreachable `buildCreditBureauDisputeHelperReply`; gitignore or delete stray deploy tarballs, `tmp-rori-*` files, and the `.deploy-src/` mirror; relax the 1-second session polling interval.

Explicit non-recommendations (to avoid over-engineering): do not replace the in-memory queue/secret store while the deploy is a single backend container; do not wire the Rori live-model composer before its dedicated ticket; do not add a persona layer to ShAzZaM! or Condor.

---

## Verification Record

- `corepack pnpm exec vitest run tests/form-wizard/form-wizard-workflow.spec.ts tests/cursive/cursive-service.spec.ts` - 15/15 pass.
- `corepack pnpm exec vitest run tests/e2e/bot-runtime.spec.ts` - 71/71 pass, including the new Condor no-false-claim test.
- Mini app component specs (`FormWizardPanel.spec.tsx`, `ChatPanel.spec.tsx`) - 11/11 pass.
- `corepack pnpm --filter @sgt-bots/api lint` and `corepack pnpm --filter @sgt-bots/telegram-miniapp lint` (both `tsc --noEmit`) - clean.
- `corepack pnpm --filter @sgt-bots/telegram-miniapp build` - clean.
- `git diff --check` - clean.
- Full API suite: 359/362 pass; the 3 failures are the pre-existing cases listed above, re-confirmed at baseline via stash/re-run.
- No production apply was performed.
