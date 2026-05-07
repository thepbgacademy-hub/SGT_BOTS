# Handoff

## Current Repo

- Working repo: `E:\REPOS\SGT_BOTS`
- Active branch: `main`
- GitHub remotes:
  - source repo: `thepbgacademy-hub/SGT_BOTS`
  - deployment repo push target used in this session: `thepbgacademy-hub/SGT_BOTS_APP`

## Current Build State

- MVP backend is working
- local browser preview is working
- the mini app opens to the approved hex-image `MainMenu`
- the bot workspace uses the approved gold dashboard frame
- the menu is data-driven from the authenticated bot catalog
- bot-aware side panels and motion polish are in place

## Supabase

- table: `public.playground_bot_registry`
- local migration: `supabase/migrations/006_playground_bot_registry.sql`
- remote RLS: enabled
- remote policy: `Authenticated users can read the playground bot registry`

## Published Images

- frontend: `ghcr.io/thepbgacademy-hub/sgt-bots-app-frontend:latest`
- backend: `ghcr.io/thepbgacademy-hub/sgt-bots-app-backend:latest`

## VPS Deployment Reality

- the VPS already has an existing proxy container: `supabase-caddy`
- do **not** deploy a second Caddy container on this VPS
- ports `80/443` must remain with the existing proxy

## VPS Deployment Files

- app-only compose file: `docker-compose.vps.yml`
- frontend container: `Dockerfile.frontend`
- backend container: `Dockerfile.backend`
- existing-proxy site block reference: `Caddyfile`
- frontend nginx config: `apps/telegram-miniapp/nginx.conf`

## Correct VPS Deployment Model

- deploy only `2` app containers:
  - `telegram-playground-frontend`
  - `telegram-playground-backend`
- both must join the shared external Docker network:
  - `proxy`
- the existing `supabase-caddy` instance should be updated with the site block from `Caddyfile`
- routes in the existing proxy should be:
  - `/` -> `telegram-playground-frontend:8080`
  - `/api/*` -> `telegram-playground-backend:3000`
  - `/health` -> `telegram-playground-backend:3000`

## Important Deployment Notes

- backend binds to `0.0.0.0` in `apps/api/src/index.ts`
- backend runs from source with `tsx` in `Dockerfile.backend`; there is no compiled API `dist` output yet
- backend requires `TELEGRAM_BOT_TOKEN` at runtime; `TELEGRAM_BOT_USERNAME` should also be set for the live bot identity
- the welcome deep link also depends on `TELEGRAM_BOT_APP_SHORT_NAME`, which must match the Mini App short name configured in BotFather
- Telegram chat handling is now opt-in with `TELEGRAM_BOT_RUNTIME_MODE=polling` on the backend container
- do **not** commit the live Telegram token into the repo; set it only in the VPS/container environment
- if the VPS does not already have the shared network, create it first:
  - `docker network create proxy`

## Immediate Next Step

1. Ask the VPS portal to deploy only the frontend and backend containers from GHCR.
2. Ask it to attach both containers to the existing shared `proxy` network.
3. Ask it to add the `playground.spyderbyte.cloud` site block from `Caddyfile` to the existing `supabase-caddy`.
4. Smoke test:
  - `https://playground.spyderbyte.cloud/`
  - `https://playground.spyderbyte.cloud/health`
  - Telegram mini app launch flow

## Verification Baseline

- `corepack pnpm --filter ./apps/api lint`
- `corepack pnpm --filter ./apps/telegram-miniapp build`
