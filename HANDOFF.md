# Handoff

## Current State

- Active branch: `codex/phase-0-foundation`
- Active worktree: `E:\REPOS\SGT_BOTS\.worktrees\codex-phase-0-foundation`
- `Phase 0`, `Phase 1`, and `Phase 2` are complete on this branch.
- Phase 2 now includes:
  - session-only provider connection for `openai` and `anthropic`
  - upstream provider key validation with `stub` and `live` modes
  - backend-issued 3-hour session token for active playground use
  - durable provider/session metadata without durable raw API key storage
  - reconnect invalidation for prior active sessions
  - `reauth_required` handling when session metadata survives but the in-memory BYOK secret does not
  - browser coverage for both happy-path countdown and relaunch-required recovery
- Local shell execution still requires `corepack pnpm` because `pnpm` is not directly on `PATH`.

## Verified Commands

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

1. Commit the completed Phase 2 work on `codex/phase-0-foundation`.
2. Start `Phase 3` and do not advance until its exit metrics pass.
3. Keep subagents in strict lanes and repeat the same implementation -> spec review -> code quality review loop.
