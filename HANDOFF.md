# Handoff

## Current State

- Active branch: `codex/phase-0-foundation`
- Active worktree: `E:\REPOS\SGT_BOTS\.worktrees\codex-phase-0-foundation`
- `Phase 0` and `Phase 1` are complete on this branch.
- Phase 1 now includes:
  - real Telegram WebApp init-data validation with freshness checks
  - onboarding persistence aligned to the Phase 1 Supabase schema
  - locked dashboard handoff after profile creation
  - browser coverage for both success and recoverable failure paths
  - real typecheck-based lint for `apps/api`, `apps/telegram-miniapp`, and `packages/shared`
- Local shell execution still requires `corepack pnpm` because `pnpm` is not directly on `PATH`.

## Verified Commands

- `corepack pnpm --filter ./apps/api test -- onboarding.spec.ts`
- `corepack pnpm test:e2e -- --grep "profile onboarding"`
- `corepack pnpm test:e2e`
- `corepack pnpm test`
- `corepack pnpm lint`
- `corepack pnpm build`

## Canonical References

- Design spec:
  - `docs/superpowers/specs/2026-05-05-telegram-playground-design.md`
- V1 implementation plan:
  - `docs/superpowers/plans/2026-05-05-telegram-playground-v1-implementation.md`
- QA and execution rules:
  - `docs/operations/qa-and-release.md`
- Live task list:
  - `TASKS.md`

## Next Steps

1. Commit the completed Phase 1 work on `codex/phase-0-foundation`.
2. Start `Phase 2` and do not advance until its exit metrics pass.
3. Keep subagents in strict lanes and repeat the same implementation -> spec review -> code quality review loop.
