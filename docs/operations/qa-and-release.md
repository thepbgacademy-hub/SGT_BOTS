# QA and Release

## Phase Gates

- Work advances one phase at a time.
- A phase is not complete until its exit metrics pass.
- The only exception is when a dependency required to complete the current phase must be built in another phase; that dependency should be documented explicitly before crossing the boundary.

## Required Before Release

- Code review completed
- Linting passes
- Relevant automated tests pass
- Manual validation completed for user-facing flows
- Security-sensitive changes reviewed carefully

## Required Before A Phase Can Close

- Phase scope implemented end to end for the agreed boundary
- End-to-end tests executed with a deliberate red pass first and a green pass after the fix
- Phase metrics recorded as passing
- Code review completed for the phase scope
- Linting and relevant automated tests passing
- Refactor pass completed on touched areas

## Test Philosophy

- Prefer end-to-end tests over narrow happy-path-only validation for phase completion.
- Critical behaviors should fail once in a controlled test scenario before the durable fix is accepted.
- The goal is to prevent repeat failures, not just patch around the first symptom.

## Subagent Execution Rules

- Subagents are allowed during implementation work.
- Each subagent must receive a bounded responsibility and explicit file or module ownership.
- Each subagent must be reminded that other agents are working in the codebase and that it must not revert unrelated work.
- Use subagents to accelerate independent work, not to blur ownership.

## Reporting Rules

- During an active phase build, hold progress chatter until the full phase is complete unless a blocker or decision point requires interruption.
- When a phase completes, provide only a short concise summary of what the phase accomplished.
- After every two completed builds or phase completions, refresh continuity by compacting context through the canonical handoff and task references.

## High-Risk Areas

- Telegram identity validation
- BYOK storage and validation
- Bot policy enforcement
- File uploads
- Retrieval grounding
- HTML-to-PDF rendering
- Session expiry and timer enforcement
