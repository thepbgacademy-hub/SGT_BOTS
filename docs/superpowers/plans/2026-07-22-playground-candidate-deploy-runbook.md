# Playground Candidate Deploy Runbook (2026-07-22)

Build ID: `2026-07-20-sgt-bots-rori-academy-concierge-persona-runtime`
Authoritative record: `.buildwork/builds/2026-07-20-sgt-bots-rori-academy-concierge-persona-runtime.json`
Governing decision: **DEC-006** / **OQ-004** (resolved 2026-07-22).

## Purpose

Restore **commit-to-image traceability** for the TASK-008 production readiness
gate. The gate's checklist (`docs/superpowers/plans/2026-07-15-telegram-bot-persona-production-readiness-gate.md`,
sections *Gate Inputs* and *6. Traceability And Environment Evidence*) requires
that the candidate deployment be traceable to the exact reviewed repository
commit. The 2026-07-21/22 VPS2 survey confirmed the deployed Playground images
**predate this branch** (backend container created 2026-06-01, frontend
2026-05-29): the served `app.js` still builds `initData=` query URLs (the
pre-TASK-010 contract) and carries none of the TASK-011 engagement markers.
RISK-001 is therefore confirmed as fact, not risk.

This runbook operationalizes DEC-006: build **both** images from a **single git
commit**, label each with that commit SHA, and deploy them **as a pair** into
the `sgt-bots-app` compose project on VPS2 — with **no other VPS2 service
touched** — so the gate can verify traceability on the host with `docker
inspect`.

This is a **deployment procedure**, deliberately kept separate from the gate
decision document (which is evidence-only and does not authorize a blind
production push). A `Go` at this gate governs staging/canary review only.

## Scope and non-goals

- **In scope:** building the frontend + backend images at one pinned SHA,
  attaching the OCI revision label, deploying the pair to the `sgt-bots-app`
  compose project on VPS2 (`playground.spyderbyte.cloud`), and verifying the
  deploy.
- **Out of scope:** any change to product code, Dockerfiles, or the compose file
  *as part of the deploy itself*; any production rollout beyond the Playground;
  any change to other VPS2 services.

### Do NOT touch list (shared host — hard boundary)

VPS2 is a shared host. Every command below is scoped to the `sgt-bots-app`
compose project. **Never** run project-wide or host-wide teardown/prune. The
following co-tenant projects/services must remain completely untouched:

- `sgt-mini-app` (in production at `sgt.spyderbyte.cloud`)
- `concierge-bot` (parked, separate project)
- `executive-council`
- `ambassador`
- `wealth-factory`
- `n8n`
- `spyderbyte-site`
- the Supabase stack (`supabase_default` network, `supabase-caddy`, Postgres,
  PostgREST, etc.)

Forbidden commands on this host: bare `docker compose down` (without `-p
sgt-bots-app`), `docker system prune`, `docker volume prune`, `docker network
prune`, `docker image prune -a`, and any `docker rm`/`docker rmi` targeting a
container/image not prefixed `sgt-bots-app-`.

## Preconditions (verify locally before any build)

1. **Pinned commit.** The candidate SHA is `ba5ed32`
   (`ba5ed3246bf1e6d92756fd0d0122e3f7ed072cab`) on branch
   `codex/rori-academy-concierge` — the current tip. If TASK-007's human smoke
   forces fixes, re-pin to the resulting post-smoke commit and rebuild from it;
   the SHA that ships is the SHA that must appear in the image label and in the
   gate's *Candidate commit SHA* field.

2. **Clean worktree at the pinned SHA.**

   ```bash
   git -C /path/to/checkout rev-parse HEAD          # must equal the pinned SHA
   git -C /path/to/checkout status --porcelain       # must be empty
   ```

3. **Both suites green locally at that SHA** (API baseline per DEC-005):

   ```bash
   # API — expect 47 files / 386 tests passed, 0 failed (DEC-005 baseline)
   cd apps/api && corepack pnpm exec vitest run

   # Mini app — expect 9 files / 67 tests passed, 0 failed
   cd apps/telegram-miniapp && corepack pnpm exec vitest run

   # Typecheck gates — both exit 0
   corepack pnpm --filter @sgt-bots/api lint
   corepack pnpm --filter @sgt-bots/telegram-miniapp lint
   ```

   A red suite is a stop condition: do not build a candidate from a SHA whose
   suites are not green.

4. **VPS `.env` present and unchanged.** The backend service reads its secrets
   from an `.env` file on the VPS via the compose `env_file:` directive. This
   runbook references env-var **names** only; no secret value appears here
   (REQ-004). The deploy operator's SSH key and any local secret material live
   under `E:\the_secrets\VPS2` (path reference only). Confirm the on-VPS `.env`
   already exists (it is the same file the current containers use) — this deploy
   does not create or rotate it.

## The SHA-label mechanism

Neither `Dockerfile.backend` nor `Dockerfile.frontend` currently emits an OCI
revision label, and per this dispatch's hard rule **no Dockerfile or compose
change is made as part of the deploy**. Two mechanisms are available; **Option A
is recommended**. Both attach only image **metadata** — an OCI label is inert at
runtime (no `ENV`, no `CMD`, no executed layer), so neither changes container
behavior. Pick one and use it for both images so their labels are consistent.

### Option A (recommended) — one-time compose `build.labels` prerequisite

Land a **small, separate prerequisite commit** (this is future work, tracked
outside this deploy dispatch) that adds a `build.labels` block to each service
in `docker-compose.vps.yml`, sourcing the SHA from an interpolated variable:

```yaml
# docker-compose.vps.yml — proposed prerequisite edit (NOT applied by this runbook)
  sgt-bots-frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      labels:
        org.opencontainers.image.revision: ${GIT_SHA:?set GIT_SHA to the candidate commit}
    # ...unchanged...

  sgt-bots-backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
      labels:
        org.opencontainers.image.revision: ${GIT_SHA:?set GIT_SHA to the candidate commit}
    # ...unchanged...
```

Then build both images through the single compose path with the SHA in the
environment:

```bash
export GIT_SHA=$(git rev-parse HEAD)
docker compose -f docker-compose.vps.yml -p sgt-bots-app build
```

This keeps the SHA inside the same compose build the deploy already uses, labels
both images identically, and adds nothing that runs.

### Option B (no-repo-change fallback) — direct `docker build --label`

If the prerequisite commit is not landed, build each image directly with the
label flag and a SHA-derived tag, then deploy via a **deploy-time compose
override** (an operator artifact, not a repo change) that pins `image:` to those
tags:

```bash
GIT_SHA=$(git rev-parse HEAD)

docker build -f Dockerfile.backend  \
  --label org.opencontainers.image.revision=$GIT_SHA \
  -t sgt-bots-app-sgt-bots-backend:$GIT_SHA .

docker build -f Dockerfile.frontend \
  --label org.opencontainers.image.revision=$GIT_SHA \
  -t sgt-bots-app-sgt-bots-frontend:$GIT_SHA .
```

`docker-compose.override.yml` (created at deploy time on whichever host runs
`compose up`, not committed):

```yaml
services:
  sgt-bots-backend:
    image: sgt-bots-app-sgt-bots-backend:${GIT_SHA}
  sgt-bots-frontend:
    image: sgt-bots-app-sgt-bots-frontend:${GIT_SHA}
```

Either way, the invariant is: **both images carry
`org.opencontainers.image.revision` = the same candidate SHA.**

## Build + deploy (owner runs as `deploy@187.77.19.83`)

The recommended path builds **on VPS2** from a clean checkout at the pinned SHA —
this keeps the label honest (the SHA is read from the same tree that produced the
image) and avoids transferring multi-GB image tarballs. A `docker save`/`load`
transfer alternative is noted at the end.

All commands run inside the `sgt-bots-app` project directory on the VPS (the
directory holding `docker-compose.vps.yml` and the live `.env`). Substitute the
real path where the project is checked out on VPS2.

1. **Sync the checkout to the pinned SHA (fetch only; no force-push, upsert-only per CON-001).**

   ```bash
   git fetch origin codex/rori-academy-concierge
   git checkout ba5ed32          # detached HEAD at the exact candidate commit
   git rev-parse HEAD            # re-confirm == ba5ed32...
   git status --porcelain        # must be empty
   export GIT_SHA=$(git rev-parse HEAD)
   ```

2. **Build both images (Option A shown; use Option B commands instead if the
   prerequisite commit is not present).**

   ```bash
   docker compose -f docker-compose.vps.yml -p sgt-bots-app build
   ```

3. **Deploy the pair atomically.** Bring up both services together so the
   header-only initData frontend (TASK-010 cutover) never runs against an old
   backend or vice-versa — an old query-param frontend breaks against a new
   header-only backend, so **the two must move together**.

   ```bash
   docker compose -f docker-compose.vps.yml -p sgt-bots-app up -d \
     sgt-bots-frontend sgt-bots-backend
   ```

   Scope guardrail: the `-p sgt-bots-app` flag and the explicit service names
   confine this to the two Playground containers. Do **not** add `--remove-orphans`
   (it can reap co-tenant containers the compose file does not declare).

## Post-deploy verification

Run all four. Record the output as gate evidence (they populate the gate's
*Traceability And Environment Evidence* section).

1. **Backend health — expect HTTP 200 `{"status":"ok"}`:**

   ```bash
   curl -fsS https://playground.spyderbyte.cloud/health
   # -> {"status":"ok"}
   ```

2. **SHA label present on BOTH running containers — expect the candidate SHA twice:**

   ```bash
   docker inspect --format \
     '{{ index .Config.Labels "org.opencontainers.image.revision" }}' \
     sgt-bots-app-sgt-bots-backend-1 sgt-bots-app-sgt-bots-frontend-1
   # -> ba5ed3246bf1e6d92756fd0d0122e3f7ed072cab   (both lines)
   ```

   (Container name suffixes may differ if the project scaled replicas; enumerate
   with `docker compose -f docker-compose.vps.yml -p sgt-bots-app ps` and inspect
   each.)

3. **Served frontend is the NEW bundle — old query-URL literals are GONE
   (negative checks).** The pre-TASK-010 bundle built its init-data URLs as
   `launch?initData=` and `prefill?initData=` query strings. The auditor ran both
   greps against the live old bundle and got exactly **1** for each; the
   header-contract cutover (TASK-010) removes both, so each count **must be 0**
   after a genuine deploy. Do **not** substitute a bare `grep 'x-telegram-init-data'`
   positive check here — that header literal is present in the *current old*
   bundle too (`ProviderConnectPanel` has sent it since before TASK-010), so it
   passes on the exact stale state this section exists to detect.

   ```bash
   curl -fsS https://playground.spyderbyte.cloud/assets/app.js | grep -c 'launch?initData='
   # -> 0  (old bundle: 1)
   curl -fsS https://playground.spyderbyte.cloud/assets/app.js | grep -c 'prefill?initData='
   # -> 0  (old bundle: 1)
   ```

   Caveat: `grep -c` exits **1** when the count is `0` (its success case here),
   so an operator chaining these with `-e`/`&&`/`set -e` will see a non-zero exit
   on a *passing* probe. Read the printed count, or append `|| true`
   (`grep -c '...' || true`), rather than trusting the exit status.

4. **Served frontend carries TASK-011 markers (positive check).** The old bundle
   lacked all TASK-011 engagement copy. A stable starter-prompt literal that
   survives minification:

   ```bash
   curl -fsS https://playground.spyderbyte.cloud/assets/app.js \
     | grep -c 'Which PBG Telegram rooms should I join?'
   # -> >= 1  (present == TASK-011 markers shipped, auditor-verified absent from the old bundle)
   ```

   Read probes 3 and 4 as a **set**, not independently: the deploy has landed only
   when both negatives hold (probe 3 — the two old query literals gone, count `0`
   each) **and** the positive holds (probe 4 — the TASK-011 starter-prompt literal
   present, count `>= 1`). This pairing is deliberate: a bare `grep 'initData='`
   on a minified bundle can incidentally match, so probe 3 targets the two exact
   query paths the old bundle emitted (each auditor-verified at 1) rather than a
   raw `initData=` absence check, and probe 4 confirms the new build's own copy is
   actually present.

If any probe fails, treat the deploy as not landed: **do not** run TASK-007 or
open the TASK-008 gate against it.

## Rollback

- The previous frontend/backend **images and stopped containers are retained
  until the TASK-008 gate passes** — do not prune them as part of this deploy.
  `docker compose ... up -d` leaves the prior image in the local store; note its
  image ID before building so it can be re-pinned.
- To roll back, redeploy the previously-recorded image ID for the two
  `sgt-bots-app-*` services only (Option-B-style `image:` override with the old
  IDs), then re-run the health probe. Rollback stays scoped to `-p sgt-bots-app`
  and touches no co-tenant service.
- No destructive DB or volume action is part of this procedure (CON-001);
  the deploy is image-swap only.

## Transfer alternative (if not building on VPS2)

If images are built on a workstation instead of on VPS2, move them by tarball —
never by re-tagging an unlabeled image on the host:

```bash
# on the build host
docker save sgt-bots-app-sgt-bots-backend:$GIT_SHA sgt-bots-app-sgt-bots-frontend:$GIT_SHA \
  | ssh deploy@187.77.19.83 'docker load'
# then on VPS2, deploy with the Option B image: override as above, scoped to -p sgt-bots-app
```

The image tarball is large (the prior `.deploy-images/` snapshot was ~4.7 GB);
building on VPS2 avoids the transfer entirely and is preferred.

## Ordering (per DEC-006)

1. **Candidate pair deploy** — this runbook.
2. **TASK-007** human Rori Telegram smoke — runs *after* the deploy so it
   exercises the gated (TASK-010/011) code, using the frozen acceptance-runbook
   prompt suite.
3. **TASK-008** production readiness gate run — recorded with the candidate SHA,
   image identifier, and the `docker inspect` traceability evidence from this
   deploy; owner runs it, the auditor audits the evidence.
