# Telegram Bot Persona Runtime Roadmap

Audit source:
- `E:/Fable/Codex/docs/telegram-bot-persona-audit-plan.md`

Scope:
- Persona bots in playground: `Rori` (`concierge_general_academy_KB`), `Top Secret` (`verifier`), `Insight` (`tutor`)
- Utility bots in playground: `Cursive` (`document_wizard`), `ShAzZaM!` (`form_wizard`)
- Display-only playground surface for this roadmap: `Condor` (`tax_legal_research`)

Out of scope for this roadmap:
- Rebuilding Cursive intake/report architecture
- Broad VPS infra refactors unrelated to persona/runtime behavior
- Inventing KB content, room links, pricing, events, or examples

---

## Status Checklist

- [x] Phase 0 - Canonical source and live-state reconciliation
  - [x] Ticket 0.1 - Establish canonical source revision
  - [x] Ticket 0.2 - Freeze the acceptance prompt set
- [x] Phase 1 - Persona config table and observable config loading
  - [x] Ticket 1.1 - Verify/create migration path for `academy_bot_prompt_configs`
  - [x] Ticket 1.2 - Make config loading observable
  - [x] Ticket 1.3 - Define persona records for persona bots only
- [ ] Phase 2 - Rori retrieval and decision-layer hardening
  - [x] Ticket 2.1 - Refactor wiki retrieval result shape
- [ ] Phase 3 - Rori grounded persona composer
- [ ] Phase 4 - Top Secret chat to real workflow integration
- [ ] Phase 5 - Insight approved-source tutoring runtime
- [ ] Phase 6 - Utility-bot separation finalization
- [ ] Phase 7 - Observability, QA matrix, and rollout gate

---

## Working Principles

1. Facts come only from approved sources.
2. Persona config affects tone and explanation style, not the underlying facts.
3. Utility bots stay deterministic and validation-first.
4. Vague but likely in-scope prompts should clarify before boundary refusal.
5. The system must fail closed when retrieval, config, or provider output is unsupported.
6. Every phase must leave a test trail so the same work is not repeated.

---

## Phase 0 - Canonical Source and Live-State Reconciliation

Goal:
- Make sure the repo, runtime image, and deployment expectations are aligned before persona/runtime changes branch further.

Why first:
- The audit found source drift between checked-out repo and live runtime. If we build on uncertain ground, every downstream fix becomes harder to trust.

### Ticket 0.1 - Establish canonical source revision

Boundaries:
- Repo state only
- No production writes
- No schema changes

Tasks:
- Identify the branch/commit that should be treated as the canonical playground source.
- Compare that source to the live runtime behavior already observed in the audit.
- Document any known drift still remaining.

Deliverables:
- One short repo note added to handoff or roadmap appendix stating the chosen canonical branch and what live mismatches remain.

Done when:
- A future worker can answer “which branch is the source of truth?” without guessing.

Status:
- Completed 2026-07-10. See "Phase 0.1 Canonical Source Note" below.

### Ticket 0.2 - Freeze the acceptance prompt set

Boundaries:
- Tests/docs only
- No runtime behavior changes

Tasks:
- Turn the audit’s prompt matrix into a repo-owned acceptance checklist.
- Keep it scoped to current in-playground bots.

Deliverables:
- A checked-in prompt suite document or test checklist reference linked from this roadmap.

Done when:
- We have one stable list of prompts to reuse after each phase.

Status:
- Completed 2026-07-10. See `docs/superpowers/plans/2026-07-10-telegram-bot-persona-acceptance-prompts.md`.

Phase exit criteria:
- Canonical branch is named.
- Acceptance prompt set is recorded in-repo.

---

## Phase 1 - Persona Config Table and Observable Config Loading

Goal:
- Make persona config a real, observable runtime dependency instead of silent fallback metadata.

### Ticket 1.1 - Verify/create migration path for `academy_bot_prompt_configs`

Boundaries:
- Migration and repo tests only
- No production apply in this ticket

Tasks:
- Confirm the migration chain contains the table creation we expect.
- If needed, add/fix the migration in the canonical branch.
- Ensure one-active-per-bot-per-surface behavior is enforceable.

Deliverables:
- Stable migration for `academy_bot_prompt_configs`
- Repo tests covering expected schema assumptions

Done when:
- The schema definition matches the runtime loader expectations.

Status:
- Completed 2026-07-10. Migration `supabase/migrations/013_academy_bot_prompt_configs.sql` explicitly creates `public.academy_bot_prompt_configs`, matches the runtime loader column contract, and enforces one active config per `bot_id` plus `surface` through a partial unique index. Focused schema coverage lives in `apps/api/tests/bots/academy-bot-prompt-configs-schema.spec.ts`.

### Ticket 1.2 - Make config loading observable

Boundaries:
- Config repo and tests
- No model composition yet

Tasks:
- Update prompt-config selection to report:
  - exact match
  - global fallback
  - code fallback
  - missing table/error state
- Stop silent failure as the only behavior.

Deliverables:
- `bot-prompt-config.repo.ts` improvements
- Tests for selection and degraded states

Done when:
- We can tell from logs/tests which config source produced a reply.

Status:
- Completed 2026-07-10. `apps/api/src/modules/bots/bot-prompt-config.repo.ts` now returns redacted prompt-config diagnostics for Supabase exact match, Supabase global fallback, code fallback, missing table, and generic error states while preserving the existing plain-config caller API. `apps/api/src/app.ts` logs those diagnostics through the app logger, and `apps/api/tests/bots/bot-prompt-config.repo.spec.ts` covers the observable states. No model composition or production apply was performed.

### Ticket 1.3 - Define persona records for persona bots only

Boundaries:
- `Rori`, `Top Secret`, `Insight`
- No persona records for `Cursive` or `ShAzZaM!`

Tasks:
- Define reviewed config records for:
  - `concierge_general_academy_KB`
  - `verifier`
  - `tutor`
- Keep fields aligned with current table shape:
  - `persona_prompt`
  - `tone_rules`
  - `guardrails`
  - `off_topic_policy`
  - `escalation_policy`
  - `fallback_policy`

Deliverables:
- Reviewed seed/admin SQL or migration-safe insert plan

Done when:
- Persona bots have defined config records and utility bots do not.

Status:
- Completed 2026-07-10. `vps-supabase-manual/014_academy_bot_persona_configs.sql` defines reviewed manual playground persona records for `concierge_general_academy_KB`, `verifier`, and `tutor` only, aligned to manifest version `phase-6-v1` and the `academy_bot_prompt_configs` table shape. `apps/api/tests/bots/academy-bot-prompt-config-seed.spec.ts` locks the persona-only scope, field coverage, old-version deactivation, and source-grounding guardrails. No production apply was performed.

Phase exit criteria:
- Config table path is trustworthy.
- Runtime can report whether config came from DB or fallback.
- Persona bot records are defined.

---

## Phase 2 - Rori Retrieval and Decision-Layer Hardening

Goal:
- Fix the main mechanical weakness in Rori before asking a model to phrase anything.

### Ticket 2.1 - Refactor wiki retrieval result shape

Boundaries:
- Retrieval/ranking only
- No persona composer yet

Tasks:
- Return structured retrieval outcomes such as:
  - `exact`
  - `partial`
  - `no_match`
  - `error`
- Include confidence/score and matched source IDs where practical.
- Prevent weak token overlap from becoming a confident answer.

Deliverables:
- Updated Rori wiki retrieval modules
- Focused tests for direct, vague, partial, unrelated, and ambiguous prompts

Done when:
- Retrieval can distinguish weak matches from strong ones.

Status:
- Completed 2026-07-10. `apps/api/src/modules/chat/rori-wiki.ts` now returns structured retrieval results with `exact`, `partial`, `no_match`, and `error` outcome support, score/confidence fields, matched terms, source IDs, and ambiguity detection while preserving the old page-only helper as a compatibility adapter. `apps/api/src/modules/chat/rori-wiki.repo.ts` exposes `searchPagesResult()` beside `searchPages()` so current bot stubs remain stable; Supabase no-match results stay no-match, while Supabase retrieval failures return an explicit `error` outcome with fallback pages for degraded continuity. Focused coverage lives in `apps/api/tests/chat/rori-wiki.spec.ts` and `apps/api/tests/chat/rori-wiki-repo.spec.ts`; verified with `corepack pnpm exec vitest run tests/chat/rori-wiki.spec.ts tests/chat/rori-wiki-repo.spec.ts`, `corepack pnpm exec vitest run tests/e2e/bot-runtime.spec.ts`, and `corepack pnpm --filter @sgt-bots/api lint`.

### Ticket 2.2 - Add an explicit response decision layer

Boundaries:
- Decision only
- No provider/model usage

Tasks:
- Split response intent into:
  - `answer`
  - `clarify`
  - `boundary`
  - `escalate`
  - `route`
- Move vague in-scope prompts out of immediate off-topic handling.

Deliverables:
- New or refactored Rori decision module
- Tests for:
  - `Can you help?`
  - `Tell me more.`
  - `What about Specialist?`
  - obvious off-topic
  - jailbreak

Done when:
- Rori clarifies when it should and boundaries only when it truly must.

### Ticket 2.3 - Preserve deterministic operational routes

Boundaries:
- Rori only
- No broad AI rewrite

Tasks:
- Keep deterministic handling for:
  - billing/support room routing
  - enrollment-contact routing
  - no configured link cases
  - no events available
  - jailbreak/off-topic fixed lines

Deliverables:
- Rule path tests proving these behaviors remain crisp

Done when:
- Warmth improves without losing operational reliability.

Phase exit criteria:
- Rori no longer treats vague in-scope prompts as generic off-topic.
- Retrieval confidence is explicit.
- Sensitive routes remain deterministic.

---

## Phase 3 - Rori Grounded Persona Composer

Goal:
- Let Rori sound natural and conversational while staying strictly grounded in approved content.

### Ticket 3.1 - Build grounded response input contract

Boundaries:
- Contract and validator first
- No freeform answer generation without validation

Tasks:
- Define the exact inputs sent into composition:
  - selected persona config
  - approved source snippets
  - source IDs
  - decision outcome
  - conversation context

Deliverables:
- Typed input/output contract for the composer

Done when:
- The response layer has a strict interface instead of ad hoc strings.

### Ticket 3.2 - Implement bounded composer for Rori

Boundaries:
- Rori only
- Must be source-grounded
- Must fail closed

Tasks:
- Use approved retrieved content and persona config to paraphrase naturally.
- Require structured output.
- Reject unsupported source IDs or malformed output.
- Keep deterministic fallback available.

Deliverables:
- Composer module
- Validator module
- Provider-stub tests

Done when:
- Rori can answer naturally without inventing facts or drifting outside approved content.

### Ticket 3.3 - Conversation memory refinement

Boundaries:
- Short-lived topic memory only
- No uncontrolled long-form memory

Tasks:
- Track enough context for:
  - `what happens next?`
  - `say that in simpler words`
  - `can you give me examples?`
  - `which one handles billing?`
- Keep topic-switch behavior explicit.

Deliverables:
- Updated conversation-state handling
- Multi-turn tests

Done when:
- Follow-ups feel coherent without becoming unbounded chat memory.

Phase exit criteria:
- Rori uses real persona config plus approved snippets to answer.
- Responses are warmer and less canned.
- Source validation remains intact.

---

## Phase 4 - Top Secret Chat to Real Workflow Integration

Goal:
- Stop ordinary Top Secret chat from sounding like verification happened when it did not.

### Ticket 4.1 - Separate Top Secret chat modes

Boundaries:
- Chat/runtime only
- No PDF layout changes in this ticket

Tasks:
- Distinguish:
  - claim missing -> ask for the claim
  - source-bypass request -> refuse
  - claim provided -> hand off to real review path

Deliverables:
- Updated Top Secret chat dispatch logic
- Tests proving no false “verified” language appears

Done when:
- Top Secret chat never pretends verification occurred unless the actual workflow ran.

### Ticket 4.2 - Add Top Secret persona config usage

Boundaries:
- Persona config and grounded explanation behavior
- No unsupported legal/tax improvisation

Tasks:
- Apply `verifier` persona config to Top Secret chat-facing explanation steps.
- Keep neutral, evidence-first, non-sycophantic tone.

Deliverables:
- Top Secret persona runtime path
- Tests for refusal, clarification, and grounded conclusion tone

Done when:
- Top Secret sounds like the right bot without compromising evidence discipline.

Phase exit criteria:
- Top Secret chat and workflow are no longer semantically disconnected.

---

## Phase 5 - Insight Approved-Source Tutoring Runtime

Goal:
- Build Insight only after it has approved-source grounding and a defined tutoring role.

### Ticket 5.1 - Define Insight content boundary

Boundaries:
- Approved lessons/source scope only
- No general freeform tutoring

Tasks:
- Decide what Insight is allowed to teach in the playground.
- Define which approved content source backs it.

Deliverables:
- One short design note or config note for Insight scope

Done when:
- “What does Insight teach?” has a concrete answer.

### Ticket 5.2 - Replace echo-template with grounded tutoring loop

Boundaries:
- Insight only
- Must not use unsupported examples

Tasks:
- Support:
  - explain
  - simplify
  - quiz
  - approved examples only
- Use persona config plus approved lessons.

Deliverables:
- Insight tutoring module
- Focused tests for explain/simpler/example/quiz/no-source

Done when:
- Insight behaves like a real tutor, not an echo bot.

Phase exit criteria:
- Insight is grounded, bounded, and useful.

---

## Phase 6 - Utility-Bot Separation Finalization

Goal:
- Keep utility bots out of the persona-heavy response path.

### Ticket 6.1 - Confirm Cursive remains workflow-only

Boundaries:
- No Cursive feature expansion here

Tasks:
- Reconfirm chat dispatch never tries to persona-compose Cursive.
- Keep `cursive workflow only` or equivalent workflow route behavior.

Deliverables:
- Route/dispatcher coverage

Done when:
- Cursive stays deterministic and intake-driven.

### Ticket 6.2 - Complete ShAzZaM! workflow separation

Boundaries:
- ShAzZaM! only
- No fake persona layer

Tasks:
- Replace generic canned chat promise with dedicated workflow entry and validation.
- Keep microcopy clean and human, but not conversationally open-ended.

Deliverables:
- ShAzZaM! workflow route
- Validation tests

Done when:
- ShAzZaM! behaves like a form engine, not a pretend assistant.

Phase exit criteria:
- Utility bots are cleanly outside persona composition.

---

## Phase 7 - Observability, QA Matrix, and Rollout Gate

Goal:
- Make it safe to evaluate and ship improvements without guessing why a reply happened.

### Ticket 7.1 - Add redacted runtime diagnostics

Boundaries:
- No secret leakage
- No raw provider payload dumps

Tasks:
- Log:
  - config source
  - retrieval outcome
  - decision outcome
  - provider fallback state
  - source IDs used

Deliverables:
- Redacted diagnostics path
- Tests or assertions around safe logging

Done when:
- We can tell why a bad answer happened without exposing secrets.

### Ticket 7.2 - Build the acceptance runbook

Boundaries:
- QA only
- No runtime feature changes

Tasks:
- Convert the audit prompt suite into a repeatable release gate.
- Include human tone review for persona bots.

Deliverables:
- Acceptance runbook/checklist

Done when:
- Future phases can be evaluated consistently and not re-litigated from scratch.

### Ticket 7.3 - Production readiness gate

Boundaries:
- Staging/canary decision only
- No blind production push

Tasks:
- Confirm:
  - source validation passes
  - unsupported factual claims are absent
  - vague prompts clarify correctly
  - utility bots stay deterministic
  - Top Secret does not fake verification

Deliverables:
- Final go/no-go checklist

Done when:
- Rollout is evidence-based, not intuition-based.

Phase exit criteria:
- We have observable, test-backed confidence before rollout.

---

## Suggested Execution Order

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 6.1 in parallel with Phase 2 if needed
5. Phase 3
6. Phase 4
7. Phase 5
8. Phase 6.2
9. Phase 7

---

## Notes For Orchestration

Use sub-agents only on bounded tickets that do not share edit surfaces at the same time. Good parallel examples:

- one sub-agent on prompt-config repo tests
- one sub-agent on Rori retrieval tests
- one sub-agent on docs/runbook preparation

Do not parallelize:
- multiple agents editing `rori-kb.ts`
- persona composer and validator edits in overlapping files without sequencing
- live deployment or VPS tasks

Primary reviewer focus after each phase:
- scope creep
- hidden fallback behavior
- false claims of verification/escalation
- source grounding integrity
- repeated canned wording
- utility-bot drift into persona behavior

---

## Completion Log

Use this section as the running build ledger. Add one dated line per completed ticket or phase.

- 2026-07-10: Roadmap created from external persona/runtime audit; no runtime changes applied in this document.
- 2026-07-10: Completed Phase 0 Ticket 0.1. Canonical repo source line is `origin/codex/rori-academy-concierge`; `3bf7c8e15b5ec77ee2337a88e09b8980625bfac6` is the verified pre-ticket baseline commit used for the canonical-source review. The live runtime image is not proven to be built from that baseline or any later commit until source-revision build metadata exists.
- 2026-07-10: Completed Phase 0 Ticket 0.2. The repo-owned acceptance prompt suite is now recorded at `docs/superpowers/plans/2026-07-10-telegram-bot-persona-acceptance-prompts.md`, scoped to Rori, Top Secret, Insight, Cursive, ShAzZaM!, and display-only Condor. No runtime behavior, schema, or production state changed in this ticket.
- 2026-07-10: Completed Phase 1 Ticket 1.1. The prompt-config migration path is explicit for `public.academy_bot_prompt_configs`, the schema test locks the loader columns and one-active-per-bot/surface partial unique index, and no production apply was performed.
- 2026-07-10: Completed Phase 1 Ticket 1.2. Prompt-config selection is observable through redacted diagnostics and app logging for exact DB match, global DB fallback, code fallback, missing table, and generic error states; no model composition or production apply was performed.
- 2026-07-10: Completed Phase 1 Ticket 1.3. Reviewed manual persona config SQL now defines playground records for Rori, Top Secret, and Insight only; utility bots and display-only Condor intentionally receive no persona records. Phase 1 is complete; no production apply was performed.

---

## Phase 0.1 Canonical Source Note

Canonical repo source for this roadmap:
- Branch: `codex/rori-academy-concierge`
- Remote branch: `origin/codex/rori-academy-concierge`
- Source line: latest reviewed commits on `origin/codex/rori-academy-concierge`
- Verified baseline at time of Ticket 0.1 review: `3bf7c8e15b5ec77ee2337a88e09b8980625bfac6`
- Baseline commit subject: `docs: add persona runtime roadmap`

Why this is the canonical repo source:
- The active worktree is on `codex/rori-academy-concierge` and tracks `origin/codex/rori-academy-concierge`.
- The branch-map plan identifies `codex/rori-academy-concierge` as the active playground stabilization branch until shared Top Secret and session/provider work is fully verified and merged.
- `main` is materially behind the current playground/Rori/Top Secret/shared runtime work and should not be treated as the source of truth for this roadmap.
- The worktree-local handoff and task file point execution at this roadmap from this branch.

Known caveat:
- Repo evidence does not prove the live VPS2 runtime image was built from this commit. The repo does not yet contain a source-revision label or other build metadata tying the deployed frontend/backend images to a git SHA. Live runtime observations from the external audit should therefore remain treated as observed runtime truth until a future deployment adds commit-pinned build metadata.

Known live mismatches remaining against the intended roadmap direction:
- The audit observed live runtime attempts to read `academy_bot_prompt_configs`, but the production table was not found and behavior falls back.
- Rori's observed live chat path remains mostly deterministic and does not yet use a grounded model composer.
- Top Secret ordinary chat is still separate from the real evidence/report workflow and must not imply verification unless that workflow succeeds.
- Insight ordinary chat still needs approved-source tutoring behavior before it can be considered a real tutor.
- ShAzZaM! still needs dedicated utility workflow routing rather than generic persona-style chat behavior.

Items intentionally left for later tickets:
- Persona table creation, schema fixes, and config observability belong to Phase 1.
- Rori retrieval scoring, decision outcomes, and clarification-first behavior belong to Phase 2.
- Rori grounded persona composition belongs to Phase 3.
- Top Secret workflow integration belongs to Phase 4.
- Insight tutoring runtime belongs to Phase 5.
- ShAzZaM! workflow separation belongs to Phase 6.
- Runtime diagnostics and rollout gates belong to Phase 7.
