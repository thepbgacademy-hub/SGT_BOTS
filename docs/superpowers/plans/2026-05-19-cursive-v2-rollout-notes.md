# Cursive V2 Rollout Notes

## Status

These notes prepare the merged Cursive v2 `main` branch for rollout. They do not authorize an immediate VPS deployment by themselves.

Cursive v2 is ready for rollout packaging when these local gates are fresh and passing:

- `git diff --check`
- `corepack pnpm -r test`
- `corepack pnpm -r lint`
- `corepack pnpm -r build`
- `corepack pnpm --filter ./apps/telegram-miniapp build`
- `corepack pnpm --filter ./workers/queue exec vitest run src/jobs/render-report.job.spec.ts`
- `corepack pnpm test:e2e`

The latest completed Cursive verification covered:

- manual bureau removal-demand generation
- tri-merge uploaded-report analysis and generation
- single-bureau uploaded-report analysis and generation
- artifact listing and download
- recoverable artifact failures
- no Cursive chat composer

## Order Of Operations

1. Finish the local branch.
   - Use `main` as the source of truth after PR #1 is merged.
   - The merged rollout commit is `1de9059`.
   - Review the working tree and exclude unrelated local-only files, especially `resume-next-session-sgt-bots.md`.
   - Confirm no ignored secret files are copied into docs, commits, issue comments, or handoffs.
   - Run the full local verification gate listed above.

2. Confirm GitHub is the source of the deployment commit.
   - Confirm `origin/main` contains the merged Cursive v2 commit.
   - Deploy from `main` at commit `1de9059` or a later commit that intentionally includes it.
   - Do not deploy from an older helper-chat Cursive branch.

3. Prepare the VPS host.
   - Confirm the VPS checkout points at the intended branch/commit.
   - Confirm `.env` exists on the VPS and is not replaced by `.env.example`.
   - Confirm Supabase migration `007_cursive_category_engine.sql` and seed `supabase/seed/007_cursive_seed.sql` have been applied before relying on live Cursive config.
   - Confirm the external Docker networks named `web-proxy` and `supabase_default` exist, because `docker-compose.vps.yml` joins those networks on VPS 2.
   - Confirm the existing Caddy instance owns ports 80/443 and includes the site block from `Caddyfile`.
   - Confirm the backend image can support Playwright Chromium before calling the deploy healthy. `Dockerfile.backend` installs Playwright Chromium and its system dependencies for the report renderer; if Chromium cannot launch, fix the image before proceeding.

4. Build and start the updated services on the VPS.
   - Use `docker-compose.vps.yml`.
   - Rebuild both services so the mini app bundle and API runtime come from the same commit.
   - Restart the backend and frontend containers together.
   - Do not replace the VPS `.env` with any local vault file wholesale. Copy only the exact keys required for VPS 2.

5. Run post-deploy checks before calling the rollout complete.
   - `/health` responds through the public domain.
   - `/api/bots` responds for an authenticated session.
   - Telegram `/start` still opens the playground mini app.
   - Provider validation still reaches the dashboard.
   - Cursive opens the full-screen workflow shell, not a chat-first shell.
   - Manual dispute generates a `bureau-removal-demand-letter.pdf`.
   - Tri-merge upload generates a `bureau-removal-demand-letter.pdf`.
   - Single-bureau upload generates a `bureau-removal-demand-letter.pdf`.
   - Each generated artifact exposes a working `Download PDF` link.

## VPS Environment Checklist

The VPS `.env` must include the production values used by `apps/api/src/config/env.ts` and `docker-compose.vps.yml`.

Required by current API code:

- `APP_PORT=3000`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_BOT_APP_SHORT_NAME`
- `TELEGRAM_BOT_RUNTIME_MODE`
- `TELEGRAM_REVIEW_GROUP_URL`
- `PROFILE_REPO_MODE=supabase`
- `PROVIDER_VALIDATION_MODE=live`

Expected or reserved by deployment templates and future integrations:

- `NODE_ENV=production`
- `REDIS_URL`
- `TELEGRAM_WEBHOOK_SECRET`
- `LIGHTRAG_BASE_URL` if that integration is expected on the VPS

Do not commit real secrets. Keep `.env.example` as the only tracked env template.

Before packaging or sharing the branch broadly, review ignored local env files for exposed credentials and rotate any credentials that have been pasted into local scratch files, logs, screenshots, or chat transcripts. Do not copy secret values into rollout docs.

## Cursive-Specific VPS Correction Notes

- Do not deploy the obsolete helper-chat Cursive workflow.
- The `document_wizard` bot must open the Cursive workflow shell.
- The Cursive workspace must show:
  - `Manual dispute`
  - `Analyze uploaded report`
  - `Tri-merge report`
  - `Single-bureau report`
- The Cursive workspace must not show a chat composer.
- The API must expose the workflow-only Cursive routes and report routes used by the mini app:
  - `/api/cursive/workflow/entry`
  - `/api/reports/cursive/bureau-removal-demand/preview`
  - `/api/reports/cursive/bureau-removal-demand/save-pdf-draft`
  - `/api/reports/cursive/upload-analysis/analyze`
  - `/api/reports/cursive/upload-analysis/generate`
  - `/api/reports/artifacts`
- `/api/reports/artifacts/:id/download`

## VPS 2 Topology Notes

- The live SGT app stack is named `sgt-bots-app`.
- The live Caddy container is `supabase-caddy`.
- Caddy routes `playground.spyderbyte.cloud` to `sgt-bots-backend:3000` and `sgt-bots-frontend:8080`.
- The app services must join the external `web-proxy` network for Caddy routing.
- The backend must also join the external `supabase_default` network so `SUPABASE_URL=http://kong:8000` resolves inside Docker.
- The old public health check currently passes, but `/api/cursive/workflow/entry` returns `404` until the Cursive v2 backend image is deployed.
- The existing VPS 2 compose file under `/docker/sgt-bots-app` has had secrets embedded inline. Do not print that file in logs or chat. Prefer moving runtime secrets into `/docker/sgt-bots-app/.env` during a later cleanup.

## Artifact And PDF Checks

Cursive PDF generation depends on the report artifact pipeline and Playwright-backed PDF rendering.

Before rollout completion:

- Confirm the backend container can import and run the Playwright renderer used by `workers/queue/src/jobs/render-report.job.ts`.
- Confirm `chromium.launch()` works inside the backend container, not only on the host.
- Confirm the backend container can actually render a Cursive PDF, not merely start the API process.
- Confirm generated PDF bytes begin with `%PDF-`.
- Confirm artifact records progress from `queued` to `ready`.
- Confirm failed render jobs stay visible and recoverable in the UI.
- Confirm download URLs work through the public domain and are not blocked by Caddy routing.
- Confirm uploaded PDF JSON bodies stay below Fastify's current `8 * 1024 * 1024` byte body limit; base64 encoding means the practical raw PDF limit is lower than 8 MB.

Current artifact durability limitation:

- Report artifacts are stored under `.runtime-artifacts` relative to the backend runtime.
- `docker-compose.vps.yml` does not mount a durable volume for that path.
- Generated PDFs should be treated as ephemeral across container rebuilds/restarts until a volume or object-store backend is added.

Current queue durability limitation:

- The report queue is process-local/in-memory in the current app runtime.
- Render jobs are not durable across backend process restarts.
- Do not rely on Redis/BullMQ-style retry semantics until that queue backend exists in code.

## Top Secret Rollout Blocker

Top Secret must not be rolled out to broad Telegram/VPS traffic until report generation is concurrency-safe.

Allowed before this is resolved:

- local development tests
- single-operator smoke tests
- controlled Telegram smoke tests with known testers and close log monitoring

Not allowed before this is resolved:

- public playground rollout
- broader Academy audience rollout
- any test that invites multiple unknown users to generate reports at the same time

Current risk:

- Top Secret uses the shared report artifact/PDF pipeline.
- The current queue is process-local/in-memory, so queued work is not durable across backend restarts.
- PDF rendering uses Playwright/Chromium and can contend under simultaneous jobs.
- Sequential E2E report tests pass, and artifact ownership is isolated by stable ids, but parallel PDF-heavy tests exposed local renderer contention.
- Without a durable queue, concurrency controls, and retry/failure handling, a busy bot could delay, fail, or lose report jobs after restart.

Required before rollout:

- Add a durable queue or equivalent persisted job state for report rendering.
- Run rendering in a controlled worker boundary instead of unbounded request-adjacent timers.
- Add explicit worker concurrency limits and backpressure for Playwright/Chromium.
- Persist job status transitions so users can see queued, rendering, ready, and failed states after refresh.
- Add retry/failure handling that does not silently hide failed reports.
- Add a simultaneous-user E2E/load test proving each user receives only their own PDF and no report crosses session/user boundaries.
- Re-run the full API, mini-app, and browser gates after the queue change.

## Known Product Limits

- Uploaded-report analysis is deterministic and narrow.
- The current upload scanner reads simple readable PDF bytes and uncompressed PDF text strings; it is not a full OCR/PDF extraction engine.
- The tri-merge upload lane currently detects balance inconsistency across bureaus.
- The single-bureau upload lane currently detects `closed account reported as open` only when proof text is present.
- Unsupported upload text should return no detected issues rather than guessing a legal theory.

## Rollback Notes

If the VPS deployment fails:

1. Revert the VPS checkout to the previously deployed commit.
2. Rebuild and restart the frontend/backend containers from that commit.
3. Confirm `/health`, `/api/bots`, and Telegram launch recover.
4. Do not restore the obsolete Cursive helper-chat workflow as a workaround unless explicitly approved.

## Final Release Gate

Only call the Cursive v2 rollout complete after:

- the branch is committed and pushed,
- the VPS is deployed from that exact commit,
- the post-deploy checks pass on the public Telegram mini app,
- at least one generated Cursive PDF is downloaded successfully from the public domain.

Only call the Top Secret rollout complete after the concurrency blocker above is resolved and a simultaneous-user PDF generation test passes against the deployment target.
