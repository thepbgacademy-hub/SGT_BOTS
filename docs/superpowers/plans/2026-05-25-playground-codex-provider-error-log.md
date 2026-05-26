# Playground Codex Provider Error Log

Track implementation and rollout mistakes for the shared `@PBGbigkitty_bot` provider connection flow so future sessions do not repeat them.

## 2026-05-25 - Codex provider work was first packaged on the wrong branch

**Context:** Adding OpenAI Codex subscription login to Step 2 of the playground mini app.

**Problem:** The first implementation was committed on the Rori concierge branch, which also carried unrelated Rori and Top Secret workflow changes. That created deployment risk because Rori, Top Secret, and Cursive are bot lanes inside the shared playground, not the dominant Telegram mini app launcher.

**Fix applied:** Split the provider work onto clean branch `codex/playground-codex-provider` from `origin/main`. Only the shared provider/session files, Step 2 mini app UI, launch defaults, and focused provider tests belong on this branch.

**Rule going forward:** Provider login changes for `@PBGbigkitty_bot` belong on a clean shared playground branch. Do not deploy bot-lane branches to update the main mini app shell.

## 2026-05-25 - Live mini app still served the old API-key-only bundle

**Context:** Telegram still showed the old Step 2 API-key form after the clean branch was committed locally.

**Problem:** The branch had not been pushed/deployed, and the VPS stack was still running the older frontend/backend image tags.

**Fix applied:** Pushed `codex/playground-codex-provider`, checked out that branch on VPS 2, rebuilt the live image tags from the clean source, and force-recreated the `sgt-bots-app` frontend/backend containers. Verified the public `assets/app.js` contains `Connect OpenAI Codex`, `Open login`, and `Check login`.

**Rule going forward:** After UI provider changes, verify both the live container bundle and the public JS asset contain the expected strings. Telegram WebView screenshots alone cannot distinguish cache from deployment drift.

## 2026-05-25 - Codex start request sent JSON content-type with no body

**Context:** User tapped `Connect OpenAI Codex` in the live Telegram mini app.

**Problem:** The request to `/api/providers/openai-codex/oauth/start` sent `content-type: application/json` but no request body. Fastify rejected the request before the route handler ran, returning `Body cannot be empty when content-type is set to 'application/json'`, so no user code appeared.

**Fix applied:** The mini app now sends `body: JSON.stringify({})` when starting the Codex device-login flow.

**Rule going forward:** Any `fetch` request with `content-type: application/json` must send a JSON body, even if the route only needs headers.

## 2026-05-25 - API-key fallback was duplicated

**Context:** The Codex provider UI showed both a provider dropdown and a small `Use an API key instead` pill.

**Problem:** The pill was redundant because the dropdown already exposes `OpenAI API key` and `Anthropic API key`.

**Fix applied:** Removed the redundant pill and kept API-key fallback in the provider dropdown only.

**Rule going forward:** Keep provider choice in one control. Do not add secondary fallback buttons when a select menu already communicates the available paths.
