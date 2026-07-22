# Role: Orchestrator — runbook probe fix (OQ-004 dispatch, cycle 2)

You are the build-crew ORCHESTRATOR. Single-purpose dispatch: apply the auditor's Finding 1 to the deploy runbook. Nothing else.

## Context

- workspace: `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge` (current directory)
- Findings file (the authority for this dispatch): `.buildwork/crew/2026-07-20-sgt-bots-rori-academy-concierge-persona-runtime/findings/OQ-004-runbook-audit-1.md`
- Target file: `docs/superpowers/plans/2026-07-22-playground-candidate-deploy-runbook.md`
- Record: `.buildwork/builds/2026-07-20-sgt-bots-rori-academy-concierge-persona-runtime.json`, revision 18 — do NOT edit the record in this dispatch; no record change is needed.

## Your job, exactly

1. Read the findings file.
2. Edit ONLY the "Post-deploy verification" section of the runbook per Finding 1:
   - Replace the false-positive probe 3 (positive `x-telegram-init-data` grep) with the two auditor-verified negative probes (`launch?initData=` and `prefill?initData=` counts, old bundle = 1 each, must be 0 after deploy), including the `grep -c` exit-code caveat.
   - Keep probe 4 (starter-prompt literal) as the authoritative positive marker and state the probes are read as a set (negatives + positive).
   - Renumber/adjust surrounding prose (including the existing footnote) so the section is coherent.
3. Re-read the edited section after writing (unenforced-region rule) and print it verbatim in your final output for the auditor's re-audit, plus one line confirming no other part of the file or record changed (`git diff --stat` for the file).

## Hard rules

- Touch only that one section of that one file. No record edits, no other roles, synchronous only, no secrets.
