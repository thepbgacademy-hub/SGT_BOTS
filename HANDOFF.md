# Handoff

## Current State

- Active branch: `codex/phase-0-foundation`
- Active worktree: `E:\REPOS\SGT_BOTS\.worktrees\codex-phase-0-foundation`
- `Phase 0` through `Phase 3` are complete on this branch.
- Phase 3 now includes:
  - authenticated bot catalog access inside the active playground shell
  - shared manifest-based runtime contracts for `document_wizard` and `kb_concierge`
  - bot-scoped chat runtime with bearer-token enforcement
  - bot isolation checks that block cross-bot conversation reuse and inactive bot access
  - reconnect-safe dashboard state resets without bot-catalog polling on every session tick
  - browser coverage for bot switching, reconnect reset, and composer isolation
- Local shell execution still requires `corepack pnpm` because `pnpm` is not directly on `PATH`.

## Verified Commands

- `corepack pnpm --filter ./apps/api test -- tests/e2e/bot-runtime.spec.ts`
- `corepack pnpm test:e2e -- tests/e2e/phase-3-bot-runtime.spec.ts`
- `corepack pnpm test:e2e -- tests/e2e/phase-1-onboarding.spec.ts tests/e2e/phase-2-provider-session.spec.ts`
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

1. Commit the completed Phase 3 work on `codex/phase-0-foundation`.
2. Start `Phase 4` and do not advance until its exit metrics pass.
3. Keep subagents in strict lanes and repeat the same implementation -> spec review -> code quality review loop.
