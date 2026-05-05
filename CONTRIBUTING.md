# Contributing

## Workflow

1. Review the relevant spec, implementation plan, and current phase gate before coding.
2. Keep changes focused and aligned to a clear task boundary.
3. Advance work phase by phase and do not move to the next phase until the current phase has passing metrics, unless a required dependency must be handled in another phase.
4. Prefer end-to-end testing with explicit red/green passes for each completed phase.
5. Intentionally prove the critical path can fail once, then implement or harden the fix so the same failure does not recur.
6. Run linting and relevant automated tests before asking for review.
7. Perform a refactor pass if the implementation grew during the change.
8. Submit the work for code review before merge.

## Review Standard

- Every code change must receive review.
- Review should prioritize behavior, policy enforcement, regressions, and test coverage.
- Changes that touch prompts, permissions, retrieval, uploads, or report generation need extra scrutiny.
- Phase completion review should verify that the phase exit metrics passed before downstream work is opened.

## Quality Gates

- Lint clean
- Tests passing for the changed scope
- End-to-end tests with visible red/green evidence for completed phase work
- No debug leftovers
- No exposed secrets
- No user-facing leakage of system prompts, skills, or tool calls

## Subagent Rules

- Subagents may be used during implementation when their tasks are clearly bounded.
- Every subagent must be told it is not alone in the codebase.
- Every subagent must stay in its assigned lane and avoid unrelated files or refactors.
- Parallel subagent work should use disjoint write scopes whenever possible.

## Reporting

- During a phase build, do not provide part-by-part progress reports.
- Report only when the full phase is complete, blocked, or needs a decision.
- Phase completion summaries should stay short and concise.

## Documentation

- Update docs whenever architecture, behavior, onboarding, or operational expectations change.
- Keep product and architecture decisions in `docs/`.
- Overwrite `HANDOFF.md` after each meaningful iteration or plan update so there is only one active handoff file.
