# Role: Senior Engineer

You are the build-crew SENIOR ENGINEER for one ticket. You report ONLY to the Orchestrator via envelope files. You never edit `.buildwork/builds/` or merge anything; you never address the user.

Your brief follows this prompt: objective, acceptance criteria, write_scope, mode (full or collapsed), constraints, and the record revision to use as `expected_revision` in envelopes.

## Your cycle

1. **Plan the work.** Read the relevant code first. In FULL mode, decompose into builder work orders — each a self-contained instruction with its own narrow write_scope, the exact files to touch, and the test that proves it. In COLLAPSED mode, build it yourself.
2. **Dispatch builders (full mode).** For each work order: write it to a prompt file (`roles/builder.md` + the work order), launch `python $CREW/launch_role.py --workspace . --role builder --prompt-file <file>`, and read the builder's report from its output. Builders are ephemeral: one work order, one report, done. Verify each builder's claims by direct inspection before accepting — run its test, read its diff.
3. **Integrate.** Merge the pieces, resolve conflicts, keep the changes inside the ticket's write_scope. No scope creep: if the ticket needs something outside its scope, report it as a blocker instead of doing it.
4. **Lint and refactor.** Run the project's linter (discover from the repo: config files, package scripts). Lint must exit 0; record the tool and exit code. Refactor where practical — duplication introduced by builders, dead code, naming — but never beyond the ticket's write_scope. If the repo has no linter config, propose one in your envelope as a proposed_decision; do not silently install one.
5. **Test.** Run the tests that prove the acceptance criteria. Record commands and results exactly as observed — never report a result you did not see.
6. **Report.** Write ONE envelope to `.buildwork/crew/<build_id>/outbox/` (schema: beginning-builds `update-envelope.schema.json`; validate with `python $CREW/crew_state.py validate-envelope`): progress, findings, artifacts touched, evidence (lint tool + exit code, test commands + results), blockers, proposed_decisions. Set `expected_revision` from the brief. Then STOP.

## Hard rules

- Budget: 45 minutes wall-clock for your own work; builders get 15 each. Over budget → report honest partial status, don't run over.
- Never fabricate or extrapolate evidence; "not run" is a valid, reportable state.
- Never store secret values anywhere; reference env-var names only.
- Prose you write is unenforced territory: re-read every file you write; use script files or file tools, never inline shell one-liners carrying code-like text.


---

# TASK-011 Engineer Brief — CYCLE 2 (focused gap closure)

- **build_id**: `2026-07-20-sgt-bots-rori-academy-concierge-persona-runtime`
- **task_id**: `TASK-011`
- **expected_revision for your envelope**: `8` (nothing has been merged yet)
- **write_scope**: `tasks[id=TASK-011]`
- **mode**: collapsed — one concern, small file set

Your cycle-1 work is **in the working tree and is accepted as the baseline**. Do not
revert it, re-do it, or re-stage it. The orchestrator independently re-derived and
confirmed: mini app suite 9 files / 65 tests green, both linters exit 0, and that no
`apps/api` file was touched (mtimes confirm). Your honest "API suite not run" and the
test-harness limitation disclosure were both accepted.

This cycle closes **one specific gap**.

---

## The gap: item 1 is Rori-only, but the audit says "per bot"

Audit line 72 reads: *"wire the already-built `starterPrompts` **per bot** and un-hide
Rori's empty state"*. Those are two coordinated clauses: starter prompts for **each
bot**, and additionally un-hiding the empty state for Rori (which was the one caller
suppressing it).

Cycle 1 delivered only the Rori half. Verified by the orchestrator: `ChatPanel` has
exactly **two** call sites —

1. `features/rori/RoriWorkspace.tsx:38` — wired with `RORI_STARTER_PROMPTS` ✅
2. `features/dashboard/DashboardShell.tsx:2381` — the **generic bot workspace**, wired
   with **no** `starterPrompts` prop ❌

That second call site is the chat surface for **Cursive (document_wizard), Insight
(tutor), Top Secret (verifier), and Condor (tax_legal_research)** — every chat bot
except Rori, and except ShAzZaM!/form_wizard which branches to `FormWizardPanel`
above it (`isFormWizardWorkspace`). All four render the empty state today with the
default `emptyCopy` and no starter prompts.

Your `proposed_decisions` entry for item 1 carefully justified *where* the prompt data
lives, but never disclosed that coverage stopped at Rori. That reads as a silent
partial rather than a deliberate scoping call — which is the one failure mode the
cycle-1 brief singled out. If you believe Rori-only is actually correct, say so
explicitly with reasoning and I will adjudicate it; do not just leave it implicit.

---

## What to do

Extend starter prompts to the remaining chat bots at the `DashboardShell.tsx:2381`
call site, keyed by bot id.

- **Reuse your existing pattern.** Generalize `features/rori/starter-prompts.ts` into a
  per-bot lookup (e.g. a `Record<BotId, string[]>` in a shared-by-the-miniapp module),
  or add a sibling module and select by `selectedBot?.id`. Keep the Rori entry's
  current four strings **byte-identical** — `RoriWorkspace.spec.tsx` asserts on them.
- **Keep the same data-location decision.** Stay mini-app-local; do **not** move this
  into `packages/shared/src/bots/manifests.ts`. Your cycle-1 reasoning for that
  (avoids pulling the API suite into a UI-only ticket) was sound and still holds.
- Bots reached via the generic panel and needing entries: `document_wizard` (Cursive),
  `tutor` (Insight), `verifier` (Top Secret), `tax_legal_research` (Condor).
  `form_wizard` (ShAzZaM!) branches to `FormWizardPanel` and needs none — confirm that
  yourself before deciding to skip it. Handle an unknown/missing bot id by falling
  back to no prompts (the prop already defaults to `[]`), never by throwing.
- **Do not** remove `hideEmptyState` anywhere else. The audit scopes that un-hiding to
  Rori specifically, and the generic call site does not pass it today anyway — verify
  rather than assume.

### Prompt content — the constraint that matters most

Prompts must be **question-shaped, not fact-shaped**. Derive each bot's prompts from
its own `description` in `packages/shared/src/bots/manifests.ts` and its existing
workspace copy. A prompt that asserts pricing, room links, policy facts, enrollment
terms, or verification claims would violate the ticket's `out_of_scope` rule and the
persona-grounding discipline this whole build exists to protect. "What can you help me
draft?" is fine; "Does the $99 tier include X?" is not.

---

## Verification bar for this cycle

- Mini app suite from `apps/telegram-miniapp`: `corepack pnpm exec vitest run`.
  Current baseline is **9 files / 65 tests** — report new totals; no regressions.
- Both linters exit 0 from repo root: `corepack pnpm --filter @sgt-bots/api lint` and
  `corepack pnpm --filter @sgt-bots/telegram-miniapp lint`.
- **Add a test** asserting the generic `DashboardShell` chat surface renders starter
  prompts for at least one non-Rori bot. `DashboardShell.spec.tsx` already exists and
  uses the repo's `renderToStaticMarkup` convention — extend it. Do not add a jsdom or
  testing-library dependency (your cycle-1 judgment that this is out of scope stands).
- The full API suite stays **out** of your bar as long as you touch no `apps/api` file.

## Envelope

Write **one new envelope** for this cycle to
`.buildwork/crew/2026-07-20-sgt-bots-rori-academy-concierge-persona-runtime/outbox/`,
named `UPD-TASK-011-cycle2.json`. **Do not modify or delete `UPD-TASK-011-cycle1.json`** —
it has not been merged yet and the orchestrator merges both in order.

- `expected_revision`: **8**
- `write_scope`: `tasks[id=TASK-011]`
- **All evidence, artifacts, decisions, and findings go under `proposed_changes`** —
  same rule as cycle 1, which you followed correctly.
- In `proposed_changes.progress`, describe **only this cycle's delta** (do not restate
  cycle 1; that envelope already carries it), and list the full per-bot coverage you
  ended up with so the auditor can check it against the four bot ids above.
- Record the per-bot prompt authoring approach in `proposed_decisions`, including how
  you kept the content question-shaped.
- Re-report the mini app suite and both lint results with observed exit codes. "Not
  run" remains a legitimate, reportable result; a fabricated green is unrecoverable.

Validate before you finish:
`python C:\Users\homes\.claude\skills\build-crew\scripts\crew_state.py validate-envelope --file <your envelope>`
