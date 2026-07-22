# TASK-011 — QC review, cycle 1

Blank-context reviewer (fresh process, given only the diff, the six acceptance
criteria, and project standards). Verdict: **findings** (3 raised, 2 UNVERIFIED
self-labeled).

Orchestrator adjudication below. Each dismissal was verified by inspecting code
**outside** the reviewed diff — none is accepted on the engineer's or reviewer's word.

---

## Finding 1 — `fetchLaunchContext` switched from query param to `x-telegram-init-data`; may break launch if the backend still reads the query string

**DISMISSED — not a TASK-011 change, and the contract is verified complete.**

Two independent points:

1. **Attribution.** This hunk belongs to **TASK-010**, which was completed with
   auditor sign-off earlier today (record revision 8) and whose diff is still
   uncommitted in the working tree. The reviewer saw it because the frozen patch was
   produced with `git diff -- apps/telegram-miniapp`, which necessarily includes
   TASK-010's uncommitted mini-app changes. **This is an orchestrator framing error,
   not an engineer defect** — the reviewer prompt excluded `apps/api` from scope but
   failed to also exclude the TASK-010 mini-app hunks in `lib/telegram.ts` and
   `lib/telegram.spec.ts`. Recorded here so the auditor can see the reviewer was
   working from a correctly-read but incorrectly-scoped diff.
2. **The failure scenario cannot occur anyway.** Verified by direct inspection of
   code outside the diff: the backend reads the header at
   `apps/api/src/modules/telegram/telegram.route.ts:12` and `apps/api/src/app.ts:255`,
   both `String(request.headers["x-telegram-init-data"] ?? "")`. Frontend and backend
   sides of the cutover are both present and matched. TASK-010's auditor sign-off
   additionally recorded a regression test asserting the old query parameter is now
   inert (401).

The reviewer's own UNVERIFIED #1 anticipated exactly this and correctly conditioned
the finding on backend support it could not see. That condition is satisfied.

## Finding 3 — `lib/telegram.ts` / `telegram.spec.ts` contain a launch/prefill contract change unexplained by the six criteria

**DISMISSED — same root cause as finding 1** (TASK-010 hunks in the frozen patch).

Note the file legitimately carries changes from **both** tickets: TASK-010 authored
the `fetchLaunchContext` header cutover, and TASK-011 cycle 1 added the new Telegram
WebApp helpers (`setTelegramBackButton`, `triggerTelegramHaptic`,
`setTelegramClosingConfirmation`, `computeThemeCssVariables`,
`applyTelegramThemeParams`) plus their tests. mtime confirms the TASK-011 edit
(12:13, inside the engineer's 12:05–12:22 window). The TASK-011 portion of this file
**is** explained by acceptance criterion 3 (adopt BackButton, haptics, closing
confirmation, themeParams).

## Finding 2 — criterion 1 says starter prompts "per bot", but only a new Rori-specific list was wired

**UPHELD — real, and independently found by the orchestrator before this review landed.**

Verified by direct inspection: `ChatPanel` has exactly two call sites —
`features/rori/RoriWorkspace.tsx:38` (wired with `RORI_STARTER_PROMPTS`) and
`features/dashboard/DashboardShell.tsx:2381`, the generic bot workspace, which passes
no `starterPrompts`. That second site serves Cursive (`document_wizard`), Insight
(`tutor`), Top Secret (`verifier`), and Condor (`tax_legal_research`); ShAzZaM!
(`form_wizard`) branches to `FormWizardPanel` above it. All four therefore render the
empty state with default copy and no prompts.

The engineer's cycle-1 `proposed_decisions` justified *where* the prompt data lives
but never disclosed that coverage stopped at Rori — a silent partial rather than a
declared scoping call.

One correction to the reviewer's framing: its wording ("any other bot with an
already-built `starterPrompts` source") implies per-bot prompt data already existed
somewhere. It does not — this was the reviewer's UNVERIFIED #2, and the answer is that
no per-bot source exists anywhere in the tree. What was "already built" is the
`ChatPanel` **render path** (prop, default, and starter-prompt button grid), not the
data. The fix is therefore to author per-bot prompt data, not to wire up an existing
source.

**Action taken:** engineer redispatched (cycle 2) with a focused brief to extend
per-bot coverage at the `DashboardShell.tsx:2381` call site, keeping the data mini-app-local
and the prompt content question-shaped (not fact-shaped) to respect the ticket's
`out_of_scope` rule on pricing/policy/room facts.

---

## Process note for the next cycle

When the working tree carries an unmerged prior ticket's diff, the reviewer's frozen
patch must be scoped to the current ticket's hunks, or the reviewer will spend its
budget on already-signed-off code. Two of three findings here were consumed by that.
