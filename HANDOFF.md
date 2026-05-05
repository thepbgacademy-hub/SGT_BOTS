# Handoff

This is the single canonical handoff file for the repository.

Overwrite this file after each meaningful iteration, design revision, or plan update so only one current handoff exists at a time.

## Current State

- Repository bootstrap docs are in place.
- Local Git repo is initialized and the docs baseline is committed on `main`.
- Subagent-driven execution is approved for implementation work.
- Active implementation branch: `codex/phase-0-foundation`.
- Active isolated worktree: `E:\REPOS\SGT_BOTS\.worktrees\codex-phase-0-foundation`.
- Phase 0 scaffold is implemented and verified in this worktree.
- Build execution rules are now documented in the contribution and QA docs.
- The phased v1 implementation plan is now written and saved.

## Latest Decisions

- Product is a Telegram mini app playground launched from a Telegram group welcome bot.
- Users complete profile creation before bot access.
- BYOK is required before any bot can run.
- BYOK credentials are `session-only` and are purged when the active session ends.
- User profile and Telegram identity data are retained for `3 months` after last activity, then purged if inactive.
- Bots share one shell UI but can enable different capabilities such as chat, PDF upload, forms, citations, and HTML-to-PDF report generation.
- Future build phases must not advance until their passing metrics are met, unless a dependency must be handled in another phase.
- End-to-end red/green testing is preferred for completed phase work.
- Subagents will be used during implementation, and they must stay in assigned lanes and avoid unrelated changes.
- Phase reporting should happen only when a full phase is complete, blocked, or needs a decision.
- After every two completed builds or phase completions, continuity should be refreshed through the canonical handoff and task references.
- The implementation plan currently locks these launch defaults unless revised before Phase 0 closes:
  - providers: `openai`, `anthropic`
  - starter bots: `document_wizard`, `kb_concierge`
  - HTML-to-PDF renderer: `playwright`
- Project-local hidden worktrees under `.worktrees/` are the default isolation strategy for build execution.
- Local shell execution currently requires `corepack pnpm` because `pnpm` is not directly on `PATH`.

## Latest Completed Phase

- `Phase 0` complete:
  - workspace root scaffold created
  - launch defaults contract added
  - launch defaults seed added
  - root Vitest smoke test red/green verified
  - root Playwright lane red/green verified
  - Phase 0 passed implementation, spec review, and code-quality review

## Canonical References

- Design spec:
  - `docs/superpowers/specs/2026-05-05-telegram-playground-design.md`
- Current repo/bootstrap plan:
  - `docs/superpowers/plans/2026-05-05-repo-bootstrap.md`
- Current v1 implementation plan:
  - `docs/superpowers/plans/2026-05-05-telegram-playground-v1-implementation.md`
- QA and execution rules:
  - `docs/operations/qa-and-release.md`
- Live task list:
  - `TASKS.md`

## Immediate Next Steps

1. Commit the completed Phase 0 scaffold on `codex/phase-0-foundation`.
2. Start Phase 1 and do not advance until its exit metrics pass.
3. Dispatch Phase 1 onboarding work through scoped subagents with the same review gates.
4. After the next completed phase, compact continuity again because two build completions will then be recorded.

## Notes For Next Session

- Use this file first for continuity, then open the design spec and `TASKS.md`.
- If restarting work, return to this branch and worktree before making changes:
  - branch: `codex/phase-0-foundation`
  - path: `E:\REPOS\SGT_BOTS\.worktrees\codex-phase-0-foundation`
- Start with the implementation plan before coding:
  - `docs/superpowers/plans/2026-05-05-telegram-playground-v1-implementation.md`
- If a new handoff is created, replace this file instead of creating another handoff file.
- The task-management dashboard asset was not found in the expected skill location, so `TASKS.md` is the authoritative task tracker for now.
- During implementation, do not send part-by-part phase updates; report only at full phase completion, on blocker, or on decision request.
