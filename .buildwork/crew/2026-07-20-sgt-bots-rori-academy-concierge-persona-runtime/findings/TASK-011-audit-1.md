# TASK-011 — Audit, cycle 1

AUDIT: PASS

Auditor: main session (Fable), 2026-07-20.

## Re-derived by the auditor (commands + observed results)

- Record validation via the skill's validator (the check the orchestrator was environmentally blocked from running): `validate-build.ps1 -File .buildwork/builds/2026-07-20-sgt-bots-rori-academy-concierge-persona-runtime.json` → **`ok: true`** at revision 11. The orchestrator's jsonschema substitute is confirmed correct.
- Mini app suite, from `apps/telegram-miniapp`: `corepack pnpm exec vitest run` → **9 files / 67 tests passed, 0 failed** (4.5s). Matches the staged claim.
- Both lints exit 0 (`@sgt-bots/api`, `@sgt-bots/telegram-miniapp`).
- API-suite-not-run adjudication accepted: the diff touches only `apps/telegram-miniapp`; `git status` confirms no `apps/api` change beyond TASK-010's signed-off baseline.
- Full diff read (12 modified + 2 new files, +741/−48). All six audit-line items verified present and correctly wired:
  1. `starter-prompts.ts` per-bot lookup, wired at BOTH `ChatPanel` call sites (`RoriWorkspace.tsx`, `DashboardShell.tsx:2387`); `hideEmptyState` removed for Rori.
  2. Thinking bubble gated on `submitting`, mutually exclusive with the empty state, `aria-live="polite"`, reduced-motion variant.
  3. Telegram helpers fully optional-chained (safe outside Telegram); BackButton bound with cleanup on `selectedMenuItem?.id` change; closing confirmation scoped to `isSessionActive` with unmount cleanup; themeParams applied on mount via a pure, tested `computeThemeCssVariables`.
  4. Nudges use threshold-crossing (`<=600`/`<=120`) with a per-session fired-once latch reset on `activeSessionId`; dismissible, `role="status"`.
  5. OAuth auto-poll at 4s sharing `resolveCodexOAuthPollAction` with the manual button; stops on connected/expired/failed/unmount/provider-switch; fetch failures keep polling rather than killing the loop.
  6. Bot descriptions in a static always-visible list plus `aria-label` enrichment.
- QC adjudications verified: findings 1 and 3 flagged TASK-010's `fetchLaunchContext` hunk — genuinely out of this ticket (auditor-signed-off at rev 8) and correct in substance; finding 2 (Rori-only partial) was real, was independently caught by the orchestrator first, and cycle 2 verifiably closed it.
- Prompt content re-checked against out_of_scope: all 16 starter prompts are question-shaped; none asserts pricing, room links, policy, or enrollment facts.

## Adjudications accepted

- The cycle-2 stale-revision quarantine and engine-rebased re-merge: orchestrator briefing error, disclosed, resolved through the engine with a recorded merge_note. Acceptable.
- The reviewer-diff scoping error (TASK-010 hunks included): orchestrator process error, disclosed, correctly attributed. Costless to the outcome.
- Test-depth limits (no jsdom; effect wiring inspection-verified; `ChatPanel` rendered directly rather than through `DashboardShell`; fail-without-change not systematic): honest, disclosed, and consistent with the package's pre-existing `renderToStaticMarkup` convention. The pure logic of every new behavior IS tested; I verified the wiring myself in the diff. Acceptable for this ticket's acceptance criterion.

## Non-blocking nits

1. The mini app package's lack of a DOM test harness is now a recurring verification gap (bit both cycles here). Worth a future ticket if UI work continues beyond TASK-012 — not this build's scope as recorded.
2. TASK-007/TASK-008 remain the gating human work; nothing in this ticket changes that.

## Instruction to the orchestrator

Record this sign-off as ticket evidence (`type: auditor-signoff`) with the re-derivation summary above, and set TASK-011 to `completed`. No other record changes are authorized by this audit.
