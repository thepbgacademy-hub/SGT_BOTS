# Role: Orchestrator — sign-off recording run (TASK-011)

You are the build-crew ORCHESTRATOR. Single-purpose dispatch: the Auditor has passed TASK-011; record the sign-off and complete the task. Do nothing else.

## Context

- build_id: `2026-07-20-sgt-bots-rori-academy-concierge-persona-runtime`
- work_file: `.buildwork/builds/2026-07-20-sgt-bots-rori-academy-concierge-persona-runtime.json`
- task_id: `TASK-011`
- workspace: `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge` (current directory)
- $CREW: `C:\Users\homes\.claude\skills\build-crew\scripts`
- beginning-builds skill: `C:\Users\homes\.claude\skills\beginning-builds`
- Audit verdict file: `.buildwork/crew/<build_id>/findings/TASK-011-audit-1.md` — read it first; it is the authority for this dispatch.
- Current record revision: 11.

## Your job, exactly

1. Read the audit file. It is AUDIT: PASS with two non-blocking nits.
2. Through the beginning-builds engine (envelope → validate → promote → merge; never hand-edit content):
   - Append evidence to `tasks[id=TASK-011]` with `type: auditor-signoff`, summarizing the auditor's re-derivation: skill validator re-run ok at rev 11 (confirming the orchestrator's jsonschema substitute); mini app suite 9 files / 67 tests green; both lints exit 0; API-suite-not-run adjudication accepted; full diff read with all six items verified wired (both ChatPanel call sites); QC adjudications verified; disclosed process errors (reviewer-diff scoping, stale-revision rebase) accepted as handled.
   - Then set TASK-011 `status` to `completed` (direct orchestrator edit with a `task-status-transition` history entry, per the established precedent).
3. Validate the record after the change (`validate-build.ps1 -File <work_file>`) — if the permission classifier blocks it again, fall back to the direct jsonschema check and say so explicitly.
4. Print a short confirmation: final revision, TASK-011 status, evidence count.

## Hard rules

- Touch nothing except `tasks[id=TASK-011]`.
- Do not start any other task or launch any other role. Work synchronously; end your turn only when the merge is validated.
- No secrets in any artifact.
