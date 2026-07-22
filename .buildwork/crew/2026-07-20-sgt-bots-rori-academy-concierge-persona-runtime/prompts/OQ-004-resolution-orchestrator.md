# Role: Orchestrator — OQ-004 resolution + candidate-deploy runbook

You are the build-crew ORCHESTRATOR. Scoped dispatch: record the user-approved OQ-004 resolution in the record, and author the candidate-deploy runbook that operationalizes it. Collapsed mode — you do this work directly (record edits are yours alone; the runbook is a process document, not product code). Launch no other roles.

## Context

- build_id: `2026-07-20-sgt-bots-rori-academy-concierge-persona-runtime`
- work_file: `.buildwork/builds/2026-07-20-sgt-bots-rori-academy-concierge-persona-runtime.json`
- workspace: `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge` (current directory)
- $CREW: `C:\Users\homes\.claude\skills\build-crew\scripts`
- beginning-builds skill: `C:\Users\homes\.claude\skills\beginning-builds`
- Current record revision: 17. Validate before and after (`validate-build.ps1 -File <work_file>`).
- Synchronous work only; you are one-shot headless `claude -p` — end your turn only when done and validated.

## The approved resolution (user said yes 2026-07-22; auditor relays verbatim intent)

Evidence gathered 2026-07-21/22 by auditor + owner (owner-run SSH survey of VPS2, auditor bundle fingerprinting):

- Deployed Playground images predate the branch: `sgt-bots-app-sgt-bots-backend-1` container created 2026-06-01, `sgt-bots-app-sgt-bots-frontend-1` 2026-05-29. The served `app.js` still uses `initData=` query URLs (pre-TASK-010 contract) and lacks all TASK-011 markers. RISK-001 confirmed as fact.
- Public entry: `https://playground.spyderbyte.cloud` via the `supabase-caddy` Caddyfile — `/health` and `/api/*` → `sgt-bots-backend:3000`, everything else → `sgt-bots-frontend:8080`. Backend `/health` returns `{"status":"ok"}`; the frontend outside Telegram correctly shows the launch-data-required fail-safe.
- VPS2 is a shared host (executive-council, ambassador, wealth-factory, n8n, spyderbyte-site, and the in-production `sgt-mini-app` at sgt.spyderbyte.cloud, plus the parked separate `concierge-bot` project). Deploys must be scoped to the sgt-bots compose project only.

Resolution to record:

1. Build BOTH images (frontend + backend) from a single git commit — currently `ba5ed32` on `codex/rori-academy-concierge` (or the post-TASK-007 commit if the smoke forces fixes) — using `docker-compose.vps.yml` full builds, NOT the legacy `Dockerfile.backend.hotfix` on-VPS rebuild path (that path is what broke commit-to-image traceability).
2. Label both images with the git SHA (OCI label `org.opencontainers.image.revision`) so the gate's commit-to-image traceability line is verifiable on the VPS with `docker inspect`.
3. Deploy the two images as a PAIR, never mixed: TASK-010's header-only initData cutover means an old frontend (query-param) breaks against a new backend. Scope: `docker compose` for the sgt-bots project only; no other VPS2 service touched.
4. Staging environment for the gate = `playground.spyderbyte.cloud` on VPS2 (it is the pre-launch environment; no separate staging exists).
5. Gate run owner = the human owner; the auditor audits the evidence. API-suite baseline for the gate = 386 tests (DEC-005).
6. Ordering: candidate deploy FIRST, then TASK-007 human smoke (so the smoke exercises the gated code), then the TASK-008 gate run.

## Your job, exactly

1. Read the record and `findings/` context. Validate the record.
2. **Author the runbook**: `docs/superpowers/plans/2026-07-22-playground-candidate-deploy-runbook.md`. Content: purpose (restore commit-to-image traceability for the TASK-008 gate); preconditions (clean worktree at the chosen SHA, both suites green locally — API 386 baseline, miniapp 67); build steps (compose build with SHA label args — read `docker-compose.vps.yml`, `Dockerfile.backend`, `Dockerfile.frontend` first and write commands that actually match them; if the Dockerfiles lack label support, include the minimal label mechanism, e.g. `--label` at build or a compose `labels:` addition, WITHOUT changing runtime behavior); transfer/deploy steps scoped to the sgt-bots compose project on VPS2 (owner runs them as `deploy@187.77.19.83`; reference env names only, no secret values per REQ-004); post-deploy verification (`/health` 200, `docker inspect` shows the SHA label on both containers, served `app.js` no longer contains `initData=` query building — include the exact curl/grep probes); rollback note (previous containers/images retained until gate passes); explicit do-not-touch list (sgt-mini-app, ambassador, executive-council, wealth-factory, n8n, supabase stack, concierge-bot).
3. **Record updates** (engine envelopes where mergeable, direct orchestrator edits with history entries otherwise, per established precedent):
   - Resolve OQ-004: record the resolution text (points 1–6 above, condensed) and its provenance (auditor/owner VPS2 survey 2026-07-21/22 + user approval 2026-07-22); remove it from open status per the schema's convention (however open_questions are marked resolved in this schema — inspect first; if there is no resolved marker, append the answer to the question text with a RESOLVED prefix and note it in history).
   - Add decision DEC-006 capturing points 1–6 (auditor-authorized top-level write, same precedent as DEC-005; cite this prompt file and the user's approval as provenance).
   - Update TASK-008: replace the traceability blocker with the concrete precondition "candidate pair deploy per 2026-07-22 runbook, then TASK-007 smoke"; add the runbook to its artifacts; set owner to the human owner if the schema supports it.
   - Update TASK-007: add a blocker/note that the smoke should run AFTER the candidate deploy so it exercises gated code; add the runbook to its artifacts.
   - RISK-001: update from "may predate" to confirmed-and-mitigation-planned status, citing the survey evidence.
4. Validate the record. Print: final revision, a one-line diff of what changed in the record, and the runbook path.

## Hard rules

- Do not modify any product code, Dockerfiles, or compose file in this dispatch — the runbook may PROPOSE a label mechanism, but implementing it is future work (note it as such if needed).
- Do not touch TASK-009/013 or anything else. No secrets in any artifact (REQ-004) — the runbook references `E:\the_secrets\VPS2` by path and env-var names only.
- No other roles, synchronous only, honest failure report if blocked.
