# Rori Phase 2 Grounded KB Plan

## Goal

Replace uncited hardcoded Rori replies with a small local source pack that grounds Academy concierge answers until a live Academy knowledge source is available.

## Scope

- Keep Rori chat-only.
- Do not add uploads, reports, PDFs, artifacts, or registration intake.
- Ground enrollment, workshop/event, Telegram room, tool-selection, and tool-routing answers with knowledge-base citations.
- Say plainly when live workshop registration links, enrollment links, or Telegram room links are not configured.

## Completed

- Added `apps/api/src/modules/chat/rori-kb.ts` as the local source-pack runtime layer.
- Updated Rori chat runtime to return source-pack citations instead of uncited canned answers.
- Added API coverage for source-pack citations and no-placeholder citation URLs.
- Added API coverage proving Rori does not invent live workshop registration links or Telegram room links.
- Added mini app citation render coverage in `ChatPanel` and through `RoriWorkspace`.
- Updated focused Playwright coverage to expect Rori source-pack citations in the chat UI.

## Verification

- `corepack pnpm --filter ./apps/api exec vitest run tests/e2e/bot-runtime.spec.ts`
- `corepack pnpm --filter ./apps/api lint`
- `corepack pnpm --filter ./apps/telegram-miniapp exec vitest run src/features/chat/ChatPanel.spec.tsx src/features/rori/RoriWorkspace.spec.tsx`
- `corepack pnpm --filter ./apps/telegram-miniapp lint`
- `corepack pnpm --filter ./apps/telegram-miniapp test`
- `corepack pnpm test:e2e -- tests/e2e/phase-3-bot-runtime.spec.ts`

