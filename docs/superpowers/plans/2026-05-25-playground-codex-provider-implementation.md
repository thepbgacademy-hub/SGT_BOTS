# Playground Codex Provider Implementation

## Goal

Add OpenAI Codex subscription login to the shared `@PBGbigkitty_bot` playground provider screen without deploying Rori, Top Secret, or other bot-lane workflow changes.

## Scope

- Shared mini app Step 2 provider connection panel.
- Shared provider/session API routes.
- Cursive provider-call compatibility with the `openai_codex` session provider.
- Launch defaults and provider tests.

Out of scope:

- Rori concierge workflow changes.
- Top Secret report workflow changes.
- Any branch that is not cleanly based on `origin/main` for shared playground shell work.

## Current State

- Branch: `codex/playground-codex-provider`
- The provider dropdown defaults to `OpenAI Codex`.
- API-key fallback remains available through the provider dropdown as `OpenAI API key` and `Anthropic API key`.
- `Connect OpenAI Codex` starts the device-code flow.
- After a device code is issued, the UI shows `Open login`, the code, and `Check login`.
- The start request sends `{}` as JSON to avoid Fastify empty-body rejection.

## Verification Gate

Run before deployment:

- `corepack pnpm --filter @sgt-bots/telegram-miniapp exec vitest run src/features/onboarding/ProviderConnectPanel.spec.tsx src/features/dashboard/DashboardShell.spec.tsx`
- `corepack pnpm --filter @sgt-bots/api exec vitest run tests/e2e/provider-session.spec.ts`
- `corepack pnpm --filter @sgt-bots/shared exec vitest run src/testing/workspace-smoke.spec.ts`
- `corepack pnpm --filter @sgt-bots/telegram-miniapp lint`
- `corepack pnpm --filter @sgt-bots/api build`
- `corepack pnpm --filter @sgt-bots/telegram-miniapp build`

## Deployment Notes

- VPS 2 live stack uses image tags in `/docker/sgt-bots-app/docker-compose.yml`.
- Do not deploy from a bot-lane branch.
- Confirm `/home/deploy/sgt-bots-app-src` is checked out to `codex/playground-codex-provider` before rebuilding.
- After restart, verify the live public JS asset contains `Connect OpenAI Codex`, `Open login`, and `Check login`.
