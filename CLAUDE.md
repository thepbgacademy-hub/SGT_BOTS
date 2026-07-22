# Workspace instructions

## Source of truth (read before any work here)

This build is governed by the beginning-builds work record:

- **Authoritative record**: `.buildwork/builds/2026-07-20-sgt-bots-rori-academy-concierge-persona-runtime.json`
  (build ID `2026-07-20-sgt-bots-rori-academy-concierge-persona-runtime`).
  All task status, decisions, open questions, and acceptance live there and
  nowhere else. Only the orchestrator edits it; validate with the skill's
  `validate-build.ps1` after every change.
- **Current blueprint**: `BLUEPRINT-2026-07-20.md` — explains verified state,
  remaining work, risks, and open questions. It never carries task status.

Read both before planning or implementing anything in this workspace.

## Legacy docs

`HANDOFF.md`, `TASKS.md`, and
`docs/superpowers/plans/2026-07-10-telegram-bot-persona-runtime-roadmap.md` are
historical reference only — do not add, tick, or update items in them. A prior
completed record for the wiki runtime load lives in `.codex/` (historical; see
OQ-001 in the work record).

## Live operational references

- `docs/superpowers/plans/2026-07-15-telegram-bot-persona-acceptance-runbook.md`
- `docs/superpowers/plans/2026-07-15-telegram-bot-persona-production-readiness-gate.md`
- `docs/superpowers/plans/2026-07-15-rori-wiki-load-preflight.md`
- `docs/superpowers/plans/2026-07-13-playground-build-inspection-audit.md`
- `docs/operations/qa-and-release.md`

## Canonical commands

Run from `apps/api` unless noted:

- Tests: `corepack pnpm exec vitest run`
- Lint (typecheck): `corepack pnpm --filter @sgt-bots/api lint` and
  `corepack pnpm --filter @sgt-bots/telegram-miniapp lint` (from repo root)
