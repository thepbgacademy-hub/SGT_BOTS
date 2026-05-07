# Handoff

## Current Repo

- Working repo: `E:\REPOS\SGT_BOTS`
- Active branch: `main`
- GitHub remote already configured and pushed

## Current Build State

- MVP backend is working
- local browser preview is working
- the mini app opens to the approved hex-image `MainMenu`
- the bot workspace uses the approved gold dashboard frame
- the menu is data-driven from the authenticated bot catalog
- upper-left and lower-left dashboard panels are bot-aware
- motion polish is in place for menu and dashboard transitions

## Supabase

- table: `public.playground_bot_registry`
- local migration: `supabase/migrations/006_playground_bot_registry.sql`
- remote RLS: enabled
- remote policy: `Authenticated users can read the playground bot registry`

## VPS Deployment Files

- compose file: `docker-compose.vps.yml`
- frontend container: `Dockerfile.frontend`
- backend container: `Dockerfile.backend`
- caddy config: `Caddyfile`
- frontend nginx config: `apps/telegram-miniapp/nginx.conf`
- docker ignore: `.dockerignore`

## VPS Deployment Model

- use `Node` as the app type
- deploy as `3 services`:
  - `caddy`
  - `frontend`
  - `backend`
- reverse proxy domain:
  - `playground.spyderbyte.cloud`
- routes:
  - `/` -> frontend
  - `/api/*` -> backend
  - `/health` -> backend
- SSL terminates at Caddy

## Important Deployment Notes

- backend now binds to `0.0.0.0` in `apps/api/src/index.ts` so Caddy can reach it across Docker networking
- backend still runs from source with `tsx` in `Dockerfile.backend`; there is no compiled API `dist` output yet
- `docker-compose.vps.yml` expects an external Docker network named `proxy`
- if the VPS does not already have that network, create it first:
  - `docker network create proxy`

## Immediate Next Step

1. Ensure DNS for `playground.spyderbyte.cloud` points to the VPS.
2. Create the `proxy` Docker network on the VPS if it does not already exist.
3. Run `docker compose -f docker-compose.vps.yml up -d --build`.
4. Smoke test:
  - `https://playground.spyderbyte.cloud/`
  - `https://playground.spyderbyte.cloud/health`
  - Telegram mini app launch flow

## Verification Baseline

- `corepack pnpm --filter ./apps/api lint`
- `corepack pnpm --filter ./apps/telegram-miniapp build`
