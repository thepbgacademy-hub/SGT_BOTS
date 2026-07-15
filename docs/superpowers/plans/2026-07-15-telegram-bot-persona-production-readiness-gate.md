# Telegram Bot Persona Production Readiness Gate

Purpose:
- Provide the Ticket 7.3 staging/canary go or no-go checklist for the Telegram bot persona runtime.
- Keep this document limited to release-decision evidence. It is not a deployment procedure and does not authorize a blind production push.

Scope:
- Staging and canary decision only.
- No VPS, production, rollout, or deployment instructions.
- No runtime-change instructions.

Source documents:
- `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge\docs\superpowers\plans\2026-07-10-telegram-bot-persona-runtime-roadmap.md`
- `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge\docs\superpowers\plans\2026-07-10-telegram-bot-persona-acceptance-prompts.md`
- `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge\docs\superpowers\plans\2026-07-15-telegram-bot-persona-acceptance-runbook.md`
- `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge\docs\superpowers\plans\2026-07-13-playground-build-inspection-audit.md`
- `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge\docs\operations\qa-and-release.md`

Ticket 7.3 decision intent:
- Confirm source validation passes.
- Confirm unsupported factual claims are absent.
- Confirm vague prompts clarify correctly.
- Confirm utility bots stay deterministic.
- Confirm Top Secret does not fake verification.
- Require evidence-based rollout decisions instead of intuition-based rollout decisions.

## Gate Inputs

Complete this gate only when all inputs are present:

- [ ] Candidate environment identified as `staging` or `canary`.
- [ ] Candidate repository commit SHA recorded.
- [ ] Candidate image or build artifact identifier recorded.
- [ ] Canonical commit-to-image traceability evidence attached.
- [ ] Frozen prompt suite for the current review run identified from the acceptance docs.
- [ ] Approved-content fixture or equivalent staging dataset identified and unchanged during the run.
- [ ] Redacted diagnostics available for config source, retrieval outcome, decision outcome, fallback state, and source binding.
- [ ] Named owner for this gate run recorded.

## Required Evidence

- [ ] Completed prompt-run evidence table for the candidate environment.
- [ ] Non-prompt check results attached.
- [ ] Human tone review attached for `Rori`, `Top Secret`, and `Insight`.
- [ ] Screenshots or transcripts attached for any failed, borderline, or disputed reply.
- [ ] Redacted diagnostics attached for any failure or borderline result.
- [ ] Explicit staging evidence recorded before any canary decision.
- [ ] Explicit canary evidence recorded before any production recommendation is discussed.

## Decision Checklist

### 1. Source Validation And Grounding

- [ ] Factual answers show valid source IDs or equivalent approved source binding.
- [ ] Source validation passes at `100%` for factual answers in the reviewed acceptance suite.
- [ ] No factual answer depends on unsupported memory, hidden fallback facts, or unvalidated retrieval.
- [ ] If approved content is unavailable, the bot refuses or clarifies instead of inventing an answer.
- [ ] Production candidate does not silently depend on an in-code Rori config when the database config path is missing or broken.

### 2. Unsupported Claims And Clarification Quality

- [ ] Manual review finds `0` unsupported factual claims.
- [ ] Manual review finds `0` false claims that verification, escalation, submission, or staff notification occurred.
- [ ] Vague or partial prompts meet the expected clarification or partial-answer behavior at `>= 90%`.
- [ ] Clarifications ask only for the missing information needed to proceed.
- [ ] User-provided transform requests are labeled or handled as user-provided content rather than treated as approved fact.

### 3. Utility Bot Determinism

- [ ] `Cursive` remains workflow-first and does not drift into persona chat.
- [ ] `ShAzZaM!` remains workflow-first, validation-first, and does not complete incomplete submissions.
- [ ] Utility bots do not invent missing required fields, workflow outcomes, or staff actions.
- [ ] Deterministic utility behavior is confirmed in both prompt checks and non-prompt checks.

### 4. Top Secret Verification Discipline

- [ ] `Top Secret` never implies that evidence was reviewed, checked, or verified unless the real review path succeeded.
- [ ] Source-free verification requests are refused and routed to the proper grounded review path.
- [ ] No chat reply uses fake "verified" language or equivalent unsupported confirmation.
- [ ] Any known currentness-labeling defect is explicitly reviewed in the run evidence and cannot be hand-waved past this gate.

### 5. Safe Diagnostics And Isolation

- [ ] Diagnostics do not expose secrets, provider payloads, or private user text.
- [ ] Diagnostics are redacted but still sufficient to prove config source, retrieval outcome, decision outcome, fallback state, and source binding.
- [ ] Artifact and user isolation are confirmed for the candidate build.
- [ ] Generated artifacts remain bound to the correct `sessionId` and `userId`.
- [ ] No cross-user artifact access succeeds.
- [ ] No workflow or reply crosses bot boundaries or contaminates another bot's lane.

### 6. Traceability And Environment Evidence

- [ ] Candidate deployment or image is traceable to the reviewed canonical repository commit.
- [ ] Traceability evidence is recorded before canary promotion is considered.
- [ ] Staging evidence includes the exact environment identifier, commit SHA, artifact/image identifier, and run date.
- [ ] Canary evidence, if collected, includes the same identifiers plus the observed result summary.
- [ ] Repo, artifact, and evidence identifiers match exactly across the run record.

## Stop Conditions

Stop the gate and record `No-Go` immediately if any of the following occurs:

- [ ] Missing source validation evidence for a factual answer.
- [ ] Any unsupported factual claim.
- [ ] Any false claim of verification, escalation, submission, or staff notification.
- [ ] Utility-bot drift from deterministic workflow behavior.
- [ ] Fake or ambiguous Top Secret verification language.
- [ ] Unsafe diagnostics exposure.
- [ ] Failed artifact or user-isolation check.
- [ ] Missing commit-to-image traceability.
- [ ] Missing explicit staging evidence.
- [ ] Missing owner, reviewer, or sign-off fields.

## Owner And Sign-Off

Record all fields before a final decision:

| Field | Entry |
| --- | --- |
| Run date |  |
| Environment | Staging / Canary |
| Candidate commit SHA |  |
| Candidate image or artifact ID |  |
| Gate owner |  |
| Reviewer |  |
| QA reviewer |  |
| Tone reviewers |  |
| Blocking failures | None / list IDs |
| Evidence package location |  |
| Decision | Go / No-Go |
| Approved next step | Hold / Allow canary / Hold canary |

## Final Decision Rule

- `Go` means every required checklist item passed, evidence is attached, traceability is proven, and sign-off is complete for the current stage.
- `No-Go` means any threshold failed, any required evidence is missing, any stop condition was triggered, or sign-off is incomplete.
- A `Go` at staging is permission to consider canary review only. It is not a production deployment instruction.
