# Handoff

This is the single canonical handoff file for the repository.

Overwrite this file after each meaningful iteration, design revision, or plan update so only one current handoff exists at a time.

## Current State

- Repository bootstrap docs are in place.
- Local Git repo is initialized on `main`.
- Subagent-driven execution is approved for implementation work.
- Bootstrap and spec files are still uncommitted locally.
- No commits have been created yet.
- No application code has been scaffolded yet.
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

1. Create the initial local Git commit for the current repository baseline.
2. Create the isolated Phase 0 worktree and feature branch.
3. Start Phase 0 and do not advance until its exit metrics pass.
4. Dispatch Phase 0 work through scoped subagents with review gates.

## Notes For Next Session

- Use this file first for continuity, then open the design spec and `TASKS.md`.
- Start with the implementation plan before coding:
  - `docs/superpowers/plans/2026-05-05-telegram-playground-v1-implementation.md`
- If a new handoff is created, replace this file instead of creating another handoff file.
- The task-management dashboard asset was not found in the expected skill location, so `TASKS.md` is the authoritative task tracker for now.
- During implementation, do not send part-by-part phase updates; report only at full phase completion, on blocker, or on decision request.
