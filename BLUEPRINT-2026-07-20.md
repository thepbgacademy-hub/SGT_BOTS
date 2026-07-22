# Completion Blueprint — SGT Bots Rori Academy Concierge Persona Runtime

Date: 2026-07-20
Build record (authoritative): `.buildwork/builds/2026-07-20-sgt-bots-rori-academy-concierge-persona-runtime.json`
Build ID: `2026-07-20-sgt-bots-rori-academy-concierge-persona-runtime`

This blueprint explains the verified state of the build and the path to completion.
It never carries task status — status lives only in the `.buildwork` record.

---

## Verified current state (as of 2026-07-20)

Everything below was verified directly during adoption, not transcribed from the
legacy docs: git history inspected, claimed files opened, and test suites re-run.

- **Branch**: `codex/rori-academy-concierge`, in sync with `origin`, HEAD `f24ca51`.
- **Full API suite: 373/373 green** (45 files), re-run 2026-07-20. The three
  failures documented in the 2026-07-13 audit were repaired in commit `25a50f2`
  and re-verified (17/17 across `report-isolation.spec.ts` and
  `top-secret-researcher.spec.ts`).
- **Roadmap Phases 0–6 complete** (checkboxes verified, artifacts spot-checked:
  workflow-only 409 gates for Cursive/ShAzZaM!, Condor display-only reply,
  form-wizard service + mini app panel exist on disk).
- **Phase 7 tickets all have deliverables**:
  - 7.1 redacted runtime diagnostics — commit `6c23141`, module + 9 safe-logging
    tests present and green.
  - 7.2 acceptance runbook — `docs/superpowers/plans/2026-07-15-telegram-bot-persona-acceptance-runbook.md`.
  - 7.3 production readiness gate — `docs/superpowers/plans/2026-07-15-telegram-bot-persona-production-readiness-gate.md`.
  - **However: the gate document is a blank checklist template. No gate run has
    been executed**; the roadmap's Phase 7 box is correctly still unchecked
    (record decision DEC-004).
- **Rori wiki data is live on VPS2** in the dedicated `rori` schema (seven
  published pages, two visible rooms, zero events) and the deployed backend read
  all seven pages via PostgREST `accept-profile: rori` with HTTP 200. This
  evidence comes from the completed `.codex` build record
  (`.codex/builds/2026-07-17-sgt-bots-rori-wiki-runtime-load.json`, final_status
  passed) — it was **not re-derived locally** during adoption because it
  requires VPS access.
- **Workspace hygiene**: stray deploy tarballs, `tmp-rori-*` scripts, and
  `.deploy-src/`/`.deploy-images/` remain untracked in the worktree (deferred
  housekeeping, TASK-012).

## Remaining work (status governed by the record)

| Record task | What it is | Why it's next |
| --- | --- | --- |
| TASK-007 | Human Rori Telegram conversation smoke with the frozen runbook prompts | Only remaining check on the loaded wiki data; feeds the gate run. Human-driven. |
| TASK-008 | Execute the production readiness gate run (staging/canary) with evidence + sign-off | The gate is currently an empty template; Phase 7 cannot close without it. Blocked by commit-to-image traceability (OQ-004). |
| TASK-009 | Remaining bot workflow layers (non-Cursive polish) | Scope undefined — needs OQ-002 answered before any work. |
| TASK-010 | Deferred safety hardening (upload caps, 429 retry_after, initData header, auth_date skew) | Audit-deferred backlog. |
| TASK-011 | Deferred engagement quick wins (starterPrompts, thinking bubble, Telegram UX affordances, nudges) | Audit-deferred backlog. |
| TASK-012 | Deferred housekeeping (dead code, stray tarballs, polling interval) | Audit-deferred backlog. |
| TASK-013 | Broader production runbooks (VPS/Supabase release notes) | After the gate run establishes the release path. |

Suggested order: TASK-007 → resolve OQ-004 → TASK-008; TASK-009 after OQ-002;
TASK-010/011/012 whenever prioritized; TASK-013 after TASK-008.

## Risks

- **RISK-001 (high)**: the deployed VPS2 image may predate this branch — gate
  evidence gathered against it would not be traceable to the reviewed commit.
  Build/deploy a current-branch candidate before TASK-008.
- **RISK-002 (medium)**: Rori's live-model composer is intentionally unwired;
  every reply uses the deterministic fallback composer. Fine for the playground,
  but set expectations before any broader rollout.
- **RISK-003 (low)**: legacy docs drifting back into use as task state —
  mitigated by CLAUDE.md and supersession banners.

## Open questions (answers needed from the owner)

- **OQ-001**: A completed build record lives in `.codex/` with a stale index
  (index says draft rev 1; file says completed rev 9). Is `.buildwork/` canonical
  going forward, and is `.codex/` left as historical or repaired?
- **OQ-002**: What exactly is in scope for "remaining bot workflow layers"
  (TASK-009), and what are its acceptance criteria?
- **OQ-003**: The legacy "Task dashboard support" waiting-on item — what asset
  was expected, and should it stay tracked or be dropped?
- **OQ-004**: For the gate run (TASK-008): when is a current-branch candidate
  image built and deployed, which environment counts as staging, and who owns
  the run?

## Source-of-truth map

- **Governs**: `.buildwork/builds/2026-07-20-sgt-bots-rori-academy-concierge-persona-runtime.json`
- **Explains**: this blueprint.
- **Live operational references**: acceptance runbook (2026-07-15), production
  readiness gate checklist (2026-07-15), wiki-load preflight (2026-07-15),
  build-inspection audit (2026-07-13), `docs/operations/qa-and-release.md`.
- **Historical only (bannered)**: `HANDOFF.md`, `TASKS.md`,
  `docs/superpowers/plans/2026-07-10-telegram-bot-persona-runtime-roadmap.md`.
