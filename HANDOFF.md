# Handoff

## Current Repo

- Working repo: `E:\REPOS\SGT_BOTS`
- Active branch: `main`
- Source repo: `https://github.com/thepbgacademy-hub/SGT_BOTS`
- Deployment repo: `https://github.com/thepbgacademy-hub/SGT_BOTS_APP`

## Live State

- `https://playground.spyderbyte.cloud` loads inside Telegram
- backend health and VPS proxy wiring are working
- Telegram launch, profile creation, and provider validation are working
- VPS self-hosted Supabase schema has been applied manually through `006`

## Current Product Focus

- Telegram playground menu alignment is now good enough to move forward
- each menu hex opens the correct bot workflow in the live Telegram mini app
- current focus has shifted to `Cursive` as the first real workflow bot
- Cursive now has a written design spec and implementation plan in the repo:
  - `docs\superpowers\specs\2026-05-08-cursive-playground-design.md`
  - `docs\superpowers\plans\2026-05-08-cursive-playground-v1-implementation.md`

## Next Verification

- decide execution mode for the Cursive implementation plan
- begin with Cursive `credit bureau dispute` as the first full category
- preserve helper-only chat while moving official draft generation to structured intake + review + PDF render

## Known Remaining Gaps

- chat behavior across bots is still scaffolded/stubbed and not the final prompt/guardrail/workflow layer
- Cursive still needs its category engine, Supabase-backed template data, and review pipeline implemented
- most tables besides `playground_bot_registry` still need proper RLS/policies before broader rollout

## Important Runtime Notes

- backend container env must include:
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_BOT_USERNAME=PBGbigkitty_bot`
  - `TELEGRAM_BOT_RUNTIME_MODE=polling`
  - `TELEGRAM_BOT_APP_SHORT_NAME=playground`
  - `SUPABASE_URL=http://kong:8000`
  - self-hosted `SUPABASE_SERVICE_ROLE_KEY`
- frontend image is served through the existing `supabase-caddy` proxy on `playground.spyderbyte.cloud`

## Latest Frontend Verification

- `corepack pnpm --filter ./apps/telegram-miniapp lint`
- `corepack pnpm --filter ./apps/telegram-miniapp build`

## Current References

- Design: `E:\REPOS\SGT_BOTS\docs\superpowers\specs\2026-05-05-telegram-playground-design.md`
- Implementation plan: `E:\REPOS\SGT_BOTS\docs\superpowers\plans\2026-05-05-telegram-playground-v1-implementation.md`
- Cursive design: `E:\REPOS\SGT_BOTS\docs\superpowers\specs\2026-05-08-cursive-playground-design.md`
- Cursive implementation plan: `E:\REPOS\SGT_BOTS\docs\superpowers\plans\2026-05-08-cursive-playground-v1-implementation.md`
- Tasks: `E:\REPOS\SGT_BOTS\TASKS.md`
- VPS manual SQL bundle: `E:\REPOS\SGT_BOTS\vps-supabase-manual\`
