# OQ-004 dispatch — Audit, cycle 1

AUDIT: FINDINGS (one, surgical; everything else verified)

> **Cycle 2 re-audit (2026-07-22): PASS.** Finding 1 applied exactly — auditor re-verified on disk: the two negative probes (`launch?initData=`, `prefill?initData=`) are present with the exit-code caveat, the false-positive `x-telegram-init-data` probe command is gone, probe 4 retained as the positive marker with set-reading guidance, and nothing outside the Post-deploy verification section changed. OQ-004 dispatch closed.

Auditor: main session (Fable), 2026-07-22.

## Verified

- Record revision 18, `validate-build.ps1` ok. DEC-006 present; OQ-004 resolved with provenance; TASK-008 owner → human-owner with the concrete runbook precondition; TASK-007 ordering blocker added; RISK-001 upgraded to CONFIRMED with survey evidence. All as instructed.
- Runbook read in full. Scope boundaries, do-not-touch list, forbidden host-wide commands, pair-deploy atomicity rationale, rollback, REQ-004 discipline, and the two label mechanisms are all correct. `entryFileNames: "assets/app.js"` confirmed in `vite.config.ts` (stable probe path). No product code, Dockerfile, or compose file modified.

## FINDING 1 — post-deploy verification probe 3 is a false positive

Probe 3 (`grep -c 'x-telegram-init-data'` on the served `app.js`, expect ≥ 1) passes on the CURRENT OLD bundle: the auditor ran it against the live pre-branch deployment and got **1**, because `ProviderConnectPanel` has sent that header since before TASK-010. An operator following the runbook today, without deploying anything, would see probe 3 "pass". A verification probe that passes on the exact stale state it exists to detect is worse than no probe.

The runbook's own footnote already distrusts a bare `initData=` check for the opposite direction; the same rigor must apply to probe 3.

**Fix required** — replace probe 3 with the discriminating negative checks, auditor-verified against the live old bundle (each currently returns 1; both must return 0 after a genuine deploy):

```bash
curl -fsS https://playground.spyderbyte.cloud/assets/app.js | grep -c 'launch?initData='
# -> 0  (old bundle: 1)
curl -fsS https://playground.spyderbyte.cloud/assets/app.js | grep -c 'prefill?initData='
# -> 0  (old bundle: 1)
```

Note in the runbook that `grep -c` exits 1 when the count is 0, so operators chaining with `-e`/`&&` should expect that (or use `grep -c ... || true`). Keep probe 4 (the starter-prompt literal, auditor-verified absent from the old bundle: count 0) as the authoritative positive marker, and state that probes must be read as a set: negatives (query literals gone) + positive (TASK-011 literal present).

## Instruction

Redispatch scope: edit ONLY the post-deploy verification section of `docs/superpowers/plans/2026-07-22-playground-candidate-deploy-runbook.md` per Finding 1. No record changes are needed (the record references the runbook by path, not by content). Report the edited section back for re-audit.
