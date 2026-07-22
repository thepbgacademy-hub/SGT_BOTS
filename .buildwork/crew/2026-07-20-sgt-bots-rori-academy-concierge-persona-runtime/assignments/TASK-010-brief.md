# Engineer Brief — TASK-010 (cycle 1)

## Coordination facts

- `build_id`: `2026-07-20-sgt-bots-rori-academy-concierge-persona-runtime`
- `task_id`: `TASK-010`
- `write_scope` (for the envelope field): `tasks[id=TASK-010]`
- `expected_revision`: `4`
- Envelope destination: `.buildwork/crew/2026-07-20-sgt-bots-rori-academy-concierge-persona-runtime/outbox/`
- Envelope schema: `C:\Users\homes\.claude\skills\beginning-builds\references\update-envelope.schema.json`
- Validate with: `python C:\Users\homes\.claude\skills\build-crew\scripts\crew_state.py validate-envelope --file <path>`
- Workspace: `E:\REPOS\SGT_BOTS\.worktrees\rori-academy-concierge` (all paths below are relative to it)

## Mode: FULL CREW

Reasoning: the ticket carries **four independent security concerns** spanning **~8 source files across two packages** (`apps/api` and `apps/telegram-miniapp`), including a request-contract change (query string → header) that touches both a server route and its browser caller. That exceeds the collapsed-mode bar (single concern, ≤3 files, no interface changes). Decompose into builder work orders — the natural split is one builder per numbered item below, since the four items share no files.

## Objective

Implement the four deferred safety-hardening items exactly as scoped in the 2026-07-13 build-inspection audit (`docs/superpowers/plans/2026-07-13-playground-build-inspection-audit.md`, "Deferred Findings" → "Safety hardening", line 71). That line is the authoritative scope statement. Each item ships with tests.

## The four items, with the ground truth I verified by reading the code

### Item 1 — PDF upload byte cap and `%PDF-` sniff

File: `apps/api/src/modules/uploads/upload.service.ts`

Current state: `looksLikePdf()` (line 17) reads the 5-byte header **and also** stringifies the **entire buffer** (`fileBytes.toString("utf8")`) to search for `%%EOF` or an object marker. There is no byte cap.

Required:
- Add an explicit maximum byte size for `createPdfUpload`. Reject oversize input with a distinct, stable error message.
- Reduce the content check to the `%PDF-` magic-byte header sniff, per the audit's wording ("sniff **only** the `%PDF-` header"). This removes the whole-buffer stringify, which is the actual cost the audit was flagging.
- Note the caller contract: `apps/api/src/modules/reports/report.route.ts` line 50 maps upload error messages to HTTP status codes and currently knows only `"pdf uploads only"` and `"invalid pdf file"`. A new error message **must** be wired into that mapping or it will surface as a 500. Decide the status code deliberately (413 is the conventional fit for oversize) and say which you chose and why in your envelope.
- Existing constraint to respect: `apps/api/src/app.ts` line 125 sets a Fastify `bodyLimit` of 8 MiB. Choose the upload cap coherently with that limit and state the relationship.
- Callers to check for breakage: `apps/api/src/modules/reports/report.service.ts` lines 337 and 364.

### Item 2 — Telegram 429 `retry_after`

File: `apps/api/src/modules/telegram/telegram-bot.service.ts`

Current state: `sendTelegramMessage` (line 162) throws on any non-OK response (line 184), with no 429 branch. `retry_after` arrives in the Telegram error body as `parameters.retry_after` (seconds).

Required: honor `retry_after` on 429. `fetchImpl` is already injectable on this function — use it as the test seam; do not add a new one. Bound the retry behavior (cap attempts and/or cap the honored delay) so a hostile or buggy `retry_after` cannot stall the poller indefinitely, and make the wait injectable or fake-timer-driven so tests don't actually sleep. Non-429 failures must keep their current throw behavior.

### Item 3 — initData via header on launch/prefill

Files: `apps/api/src/modules/telegram/telegram.route.ts` (line 12), `apps/api/src/app.ts` (line 255), `apps/telegram-miniapp/src/lib/telegram.ts` (`fetchLaunchContext`, lines 83-95).

Current state: `/api/telegram/launch` and `/api/telegram/prefill` read initData from `request.query.initData`; the mini app sends it as a URL query parameter. Query strings land in server access logs, proxy logs, and `Referer` headers — that is the exposure.

Required: move both endpoints to the `x-telegram-init-data` request header and update `fetchLaunchContext` to send that header. The codebase already has the target pattern — `apps/api/src/modules/providers/provider.route.ts` lines 39, 107, 167 read exactly this header, and `apps/telegram-miniapp/src/features/onboarding/ProviderConnectPanel.tsx` lines 52, 98, 149 send it. **Match that existing pattern**; do not invent a second convention.

Scope boundary: the audit names launch and prefill only. `apps/api/src/modules/profiles/profile.route.ts` takes initData in a POST body — that is **out of scope**, leave it alone.

Decide deliberately whether to keep the query parameter as a temporary fallback (deployment-ordering safety: an old cached mini app bundle hitting a new backend) or to cut over cleanly. Either is defensible; state which you chose and the reasoning in your envelope, because it is the one call in this ticket with a rollout consequence. Note `readTelegramInitData` (`apps/telegram-miniapp/src/lib/telegram.ts` line 60) reads a `tgInitData` **browser-URL** parameter — that is Telegram's own launch mechanism into the web app, not our API contract, and is out of scope.

### Item 4 — `auth_date` future-skew rejection

File: `apps/api/src/modules/telegram/init-data.ts`

Current state (line 54): `const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - authDate)` compared against `TELEGRAM_INIT_DATA_MAX_AGE_SECONDS = 300`. The `Math.abs` means a future-dated `auth_date` is tolerated for a full 300 seconds and, when it does trip, reports as `"stale telegram init data"` — which is the wrong classification for a clock that is ahead.

Required: separate the two directions. Past age keeps the existing 300-second budget; future-dating gets a **small** skew tolerance (the audit's words) sized only for legitimate client clock drift. Choose the tolerance and justify the number.

Important interaction to get right: `validateTelegramInitDataWithTokens` (line 82) has multi-token retry logic that specifically preserves a `"stale telegram init data"` error across token candidates while discarding others. If you introduce a new error message for future-skew, decide how that loop should treat it and make the behavior deliberate — a future-dated token should not silently degrade into a generic `"invalid telegram init data"` if that loses diagnostic signal, nor should it be preserved in a way that masks a genuinely invalid signature. Cover this in a test.

## Acceptance criteria

From the record (`tasks[id=TASK-010].acceptance_criteria`):
> Each hardening item implemented as scoped in the 2026-07-13 audit deferral list with tests

Concretely, to pass QC and audit:
1. All four items implemented within the scope boundaries above.
2. Each item has at least one test that **fails without the change** — including the negative cases: oversize upload rejected, non-`%PDF-` bytes rejected, 429 with `retry_after` honored and bounded, launch/prefill authenticating from the header, future-dated `auth_date` beyond tolerance rejected.
3. Full API suite green: `corepack pnpm exec vitest run` from `apps/api`. Baseline is **373/373 passing** as of the 2026-07-20 record re-derivation — no regressions, and report the new total.
4. Both linters clean, from repo root: `corepack pnpm --filter @sgt-bots/api lint` and `corepack pnpm --filter @sgt-bots/telegram-miniapp lint` (both are `tsc --noEmit`).
5. Mini app component specs still pass (item 3 touches `lib/telegram.ts`, which `App.tsx` consumes).

## Constraints (binding — from the record)

- **REQ-004**: no secret values in any artifact. This ticket handles bot tokens and initData — reference **env-var names only** (`telegramBotToken`, `telegramBotTokens`). Never paste a token, a real initData string, or a real hash into code comments, tests, envelopes, or reports. Test fixtures must use synthetic tokens with locally computed HMACs.
- **REQ-003**: the rori schema boundary is untouched by this ticket. No migrations, no PostgREST changes.
- **out_of_scope**: do not alter Academy wiki content, pricing, room links, persona facts, or any persona/prompt configuration.
- **CON-001**: no destructive database or VPS actions. This is a local code ticket — no deploys.
- **Scope discipline**: the audit line is the scope. The adjacent deferral bullets (engagement quick wins, housekeeping) are **TASK-011 and TASK-012** — do not touch them, however tempting the adjacency. If you find something outside scope that matters, report it as a finding in your envelope rather than fixing it.
- Do not edit `.buildwork/builds/` — envelopes only. Do not edit `HANDOFF.md`, `TASKS.md`, or the roadmap doc (historical per CON-003).

## Envelope requirements

One envelope, to the outbox path above. Set `expected_revision: 4` and `write_scope: "tasks[id=TASK-010]"`. `merge_status` starts as `"pending"`.

In `evidence`, record the lint tool and **exit code**, and each test command with its **observed** result. In `proposed_changes.artifacts`, list every file touched. Put the two deliberate calls — the query-fallback decision (item 3) and the skew tolerance (item 4) — in `proposed_changes.proposed_decisions` with their reasoning, plus the upload cap value and its relationship to the 8 MiB `bodyLimit`.

Report what you observed, not what you expect. "Not run" is a valid, reportable state; a fabricated green is the one unrecoverable failure here, because I verify every claim by re-running it before staging.
