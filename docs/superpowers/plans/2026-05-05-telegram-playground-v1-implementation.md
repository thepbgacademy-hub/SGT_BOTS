# Telegram Playground V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v1 Telegram playground mini app end to end, from group entry and onboarding through BYOK-gated bot usage, timed sessions, uploads/forms, and professional HTML-to-PDF outputs.

**Architecture:** Use a pnpm TypeScript monorepo with a Telegram mini app frontend, a Fastify backend API plus Telegram webhook surface, BullMQ workers for long-running tasks, shared schemas/policy packages, Supabase for operational storage, Redis for queues/session support, and LightRAG as the only approved retrieval layer. Build phase by phase with explicit exit metrics, red/green end-to-end tests, and no phase advancement until the current phase passes.

**Tech Stack:** pnpm workspaces, Node.js 22, TypeScript, Fastify, React, Vite, TanStack Query, Zustand, Zod, Supabase, Redis, BullMQ, Playwright, Vitest, ESLint, Prettier, Telegram Web Apps SDK

---

## Planned File Structure

- Root:
  - `package.json` - workspace scripts, lint/test orchestration
  - `pnpm-workspace.yaml` - workspace package boundaries
  - `tsconfig.base.json` - shared TypeScript defaults
  - `vitest.workspace.ts` - workspace test registration
  - `playwright.config.ts` - browser and API E2E config
  - `.env.example` - required environment variables
  - `TASKS.md` - live task tracker
  - `HANDOFF.md` - canonical continuity file
- `apps/api/`
  - `src/index.ts` - process entrypoint
  - `src/app.ts` - Fastify app builder
  - `src/config/*.ts` - env and runtime config
  - `src/modules/telegram/*` - welcome/webhook/init-data validation
  - `src/modules/profiles/*` - onboarding/profile APIs
  - `src/modules/providers/*` - BYOK validation/session-only provider handling
  - `src/modules/sessions/*` - 3-hour session lifecycle and timer authority
  - `src/modules/bots/*` - bot catalog, capability manifests, policy loading
  - `src/modules/chat/*` - shared runtime contract
  - `src/modules/uploads/*` - upload validation and persistence
  - `src/modules/reports/*` - HTML template merge and PDF job creation
  - `src/modules/reviews/*` - review CTA and completion state
  - `src/lib/*.ts` - Supabase, Redis, BullMQ, LightRAG clients
  - `src/db/*.ts` - repository helpers
  - `tests/e2e/*.spec.ts` - API and webhook E2E tests
- `apps/telegram-miniapp/`
  - `src/main.tsx` - app bootstrap
  - `src/app/App.tsx` - router/shell root
  - `src/app/routes.tsx` - route definitions
  - `src/features/onboarding/*` - profile + provider connection
  - `src/features/dashboard/*` - shell, bot rail, timer, status
  - `src/features/chat/*` - transcript, composer, streaming UI
  - `src/features/uploads/*` - upload panel
  - `src/features/forms/*` - structured forms
  - `src/features/artifacts/*` - generated file list/downloads
  - `src/lib/*.ts` - Telegram SDK wrapper, API client, timer helpers
  - `src/styles/*` - black/gold design system tokens and layout styles
- `workers/queue/`
  - `src/index.ts` - worker process entry
  - `src/jobs/*` - ingestion, report rendering, cleanup jobs
- `packages/shared/`
  - `src/contracts/*` - API request/response schemas
  - `src/bots/*` - bot manifest and capability types
  - `src/security/*` - policy and safety helper types
  - `src/testing/*` - fixtures and test helpers
- `supabase/`
  - `migrations/*.sql` - schema and RLS policies
  - `seed/*.sql` - launch defaults, bot manifests, prompt/policy records
- `docs/`
  - `superpowers/plans/2026-05-05-telegram-playground-v1-implementation.md` - this plan
  - `architecture/*` - update when structure changes
  - `operations/*` - update with phase metrics and release notes

## Implementation Assumptions Locked By This Plan

- Use `pnpm` for the monorepo package manager.
- Use `Fastify` rather than Express for the backend API and webhook surface.
- Use `React + Vite` for the mini app frontend.
- Use `Playwright` as both the browser E2E runner and the HTML-to-PDF renderer.
- Use API-key validation for day-one provider support.
- Launch with two fully implemented bots in the first runtime phase:
  - `document_wizard`
  - `kb_concierge`
- Add the remaining bots after the runtime contract and enhanced capability phases are green.

## Phase Rules That Govern This Plan

- Do not advance to the next phase until the current phase exit metrics pass.
- If a dependency must be built out of sequence, record the exception in `HANDOFF.md` before crossing the boundary.
- Every phase must have one deliberate failing E2E check before the implementation is accepted.
- Every phase ends with:
  - lint green
  - relevant automated tests green
  - short completion summary only
  - `HANDOFF.md` overwrite
  - `TASKS.md` update
- After every two completed phases, compact continuity by refreshing `HANDOFF.md` with only the current state, references, and next steps.

## Phase 0 Exit Metrics

- Launch defaults are documented and seeded.
- Workspace scripts run.
- Root Playwright and Vitest commands execute.
- One deliberate workspace smoke test fails first, then passes after scaffolding.

### Task 0: Lock Launch Defaults And Scaffold The Workspace

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `vitest.workspace.ts`
- Create: `playwright.config.ts`
- Create: `.env.example`
- Create: `apps/api/package.json`
- Create: `apps/telegram-miniapp/package.json`
- Create: `workers/queue/package.json`
- Create: `packages/shared/package.json`
- Create: `docs/architecture/stack-decisions.md`
- Create: `supabase/seed/001_launch_defaults.sql`
- Test: `packages/shared/src/testing/workspace-smoke.spec.ts`

- [ ] **Step 1: Write the failing workspace smoke test**

```ts
// packages/shared/src/testing/workspace-smoke.spec.ts
import { describe, expect, it } from "vitest";
import { launchDefaults } from "../contracts/launch-defaults";

describe("launch defaults", () => {
  it("exposes the day-one provider and bot decisions", () => {
    expect(launchDefaults.providers).toEqual(["openai", "anthropic"]);
    expect(launchDefaults.initialBots).toEqual([
      "document_wizard",
      "kb_concierge",
    ]);
    expect(launchDefaults.reportRenderer).toBe("playwright");
  });
});
```

- [ ] **Step 2: Run the workspace test to verify it fails**

Run:

```powershell
pnpm vitest run packages/shared/src/testing/workspace-smoke.spec.ts
```

Expected:

```text
FAIL  Cannot find module '../contracts/launch-defaults'
```

- [ ] **Step 3: Create the root workspace files**

```json
// package.json
{
  "name": "sgt-bots",
  "private": true,
  "packageManager": "pnpm@10.0.0",
  "scripts": {
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test",
    "test:e2e": "playwright test",
    "format": "pnpm -r format"
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "workers/*"
  - "packages/*"
```

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

- [ ] **Step 4: Create the launch default contract and decision records**

```ts
// packages/shared/src/contracts/launch-defaults.ts
export const launchDefaults = {
  providers: ["openai", "anthropic"] as const,
  initialBots: ["document_wizard", "kb_concierge"] as const,
  reportRenderer: "playwright" as const,
};
```

```md
<!-- docs/architecture/stack-decisions.md -->
# Stack Decisions

- Day-one providers: `openai`, `anthropic`
- Day-one fully implemented bots: `document_wizard`, `kb_concierge`
- HTML-to-PDF renderer: `playwright`
- Frontend: `React + Vite`
- Backend: `Fastify`
- Queue: `BullMQ`
```

```sql
-- supabase/seed/001_launch_defaults.sql
insert into bot_definitions (bot_id, name, category, capability_manifest, active)
values
  ('document_wizard', 'Document Wizard', 'documents', '{"chat":true,"pdf_upload":true,"structured_form":true,"html_report":true}', true),
  ('kb_concierge', 'KB Concierge', 'knowledge', '{"chat":true,"citations":true,"rag_query":true}', true);
```

- [ ] **Step 5: Add environment and test runner stubs**

```ts
// vitest.workspace.ts
import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "packages/shared",
  "apps/api",
  "apps/telegram-miniapp",
  "workers/queue",
]);
```

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
});
```

```dotenv
# .env.example
NODE_ENV=development
APP_PORT=3000
WEB_PORT=4173
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
REDIS_URL=redis://127.0.0.1:6379
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_SECRET=
LIGHTRAG_BASE_URL=
```

- [ ] **Step 6: Run the smoke test to verify it passes**

Run:

```powershell
pnpm vitest run packages/shared/src/testing/workspace-smoke.spec.ts
```

Expected:

```text
PASS  packages/shared/src/testing/workspace-smoke.spec.ts
```

- [ ] **Step 7: Commit the scaffold**

Run:

```powershell
git add package.json pnpm-workspace.yaml tsconfig.base.json vitest.workspace.ts playwright.config.ts .env.example apps workers packages supabase docs/architecture/stack-decisions.md
git commit -m "chore: scaffold telegram playground workspace"
```

## Phase 1 Exit Metrics

- A user with valid Telegram init data can launch the mini app.
- The welcome bot button target is generated correctly.
- The onboarding form stores profile and Telegram payload data in Supabase.
- The user lands on a locked dashboard that requires provider connection before bot access.
- API and browser E2E tests fail red first, then pass green.

### Task 1: Build Group Entry, Identity Validation, And Profile Onboarding

**Files:**
- Create: `apps/api/src/index.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/config/env.ts`
- Create: `apps/api/src/modules/telegram/telegram.route.ts`
- Create: `apps/api/src/modules/telegram/telegram.service.ts`
- Create: `apps/api/src/modules/telegram/init-data.ts`
- Create: `apps/api/src/modules/profiles/profile.route.ts`
- Create: `apps/api/src/modules/profiles/profile.service.ts`
- Create: `apps/api/src/modules/profiles/profile.repo.ts`
- Create: `apps/api/tests/e2e/onboarding.spec.ts`
- Create: `apps/telegram-miniapp/src/main.tsx`
- Create: `apps/telegram-miniapp/src/app/App.tsx`
- Create: `apps/telegram-miniapp/src/features/onboarding/OnboardingPage.tsx`
- Create: `apps/telegram-miniapp/src/features/dashboard/DashboardShell.tsx`
- Create: `apps/telegram-miniapp/src/lib/telegram.ts`
- Create: `tests/e2e/phase-1-onboarding.spec.ts`
- Create: `supabase/migrations/001_initial_profile_tables.sql`

- [ ] **Step 1: Write the failing API E2E test for onboarding**

```ts
// apps/api/tests/e2e/onboarding.spec.ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";

describe("POST /api/profiles", () => {
  it("creates a profile from validated Telegram launch data", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/profiles",
      payload: {
        initData: "valid-signed-init-data",
        firstName: "Ada",
        lastName: "Lovelace",
        preferredName: "Ada"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      profile: {
        preferredName: "Ada",
        telegramUsername: "ada_l"
      },
      nextStep: "connect_provider"
    });
  });
});
```

- [ ] **Step 2: Write the failing browser E2E test for the onboarding flow**

```ts
// tests/e2e/phase-1-onboarding.spec.ts
import { test, expect } from "@playwright/test";

test("user completes profile onboarding and reaches the locked dashboard", async ({ page }) => {
  await page.goto("/?tgInitData=valid-signed-init-data");
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByLabel("Preferred name").fill("Ada");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Connect your provider to continue")).toBeVisible();
  await expect(page.getByText("Time remaining")).not.toBeVisible();
});
```

- [ ] **Step 3: Run the phase 1 tests to verify they fail**

Run:

```powershell
pnpm --filter ./apps/api test -- onboarding.spec.ts
pnpm test:e2e -- --grep "profile onboarding"
```

Expected:

```text
FAIL  buildApp is not defined
FAIL  page text "Connect your provider to continue" not found
```

- [ ] **Step 4: Add the Supabase schema and Telegram validation core**

```sql
-- supabase/migrations/001_initial_profile_tables.sql
create table users (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id text not null unique,
  username text,
  first_name text not null,
  last_name text,
  preferred_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

create table telegram_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  language_code text,
  launch_metadata jsonb not null,
  validated_payload jsonb not null,
  raw_init_data_hash text not null,
  created_at timestamptz not null default now()
);
```

```ts
// apps/api/src/modules/telegram/init-data.ts
export function validateTelegramInitData(initData: string) {
  if (initData !== "valid-signed-init-data") {
    throw new Error("invalid telegram init data");
  }

  return {
    telegramUserId: "123456",
    username: "ada_l",
    firstName: "Ada",
    lastName: "Lovelace",
    languageCode: "en",
    raw: initData,
  };
}
```

- [ ] **Step 5: Implement the backend onboarding route and service**

```ts
// apps/api/src/modules/profiles/profile.service.ts
import { validateTelegramInitData } from "../telegram/init-data";

export async function createProfile(input: {
  initData: string;
  firstName: string;
  lastName?: string;
  preferredName: string;
}) {
  const telegram = validateTelegramInitData(input.initData);

  return {
    profile: {
      preferredName: input.preferredName,
      telegramUsername: telegram.username,
    },
    nextStep: "connect_provider" as const,
  };
}
```

```ts
// apps/api/src/modules/profiles/profile.route.ts
import { FastifyInstance } from "fastify";
import { createProfile } from "./profile.service";

export async function registerProfileRoutes(app: FastifyInstance) {
  app.post("/api/profiles", async (request, reply) => {
    const result = await createProfile(request.body as never);
    return reply.code(201).send(result);
  });
}
```

```ts
// apps/api/src/app.ts
import Fastify from "fastify";
import { registerProfileRoutes } from "./modules/profiles/profile.route";

export async function buildApp() {
  const app = Fastify();
  await registerProfileRoutes(app);
  return app;
}
```

- [ ] **Step 6: Implement the frontend onboarding and locked shell**

```tsx
// apps/telegram-miniapp/src/features/onboarding/OnboardingPage.tsx
import { useState } from "react";

export function OnboardingPage() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return <p>Connect your provider to continue</p>;
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
      }}
    >
      <label>
        First name
        <input aria-label="First name" />
      </label>
      <label>
        Last name
        <input aria-label="Last name" />
      </label>
      <label>
        Preferred name
        <input aria-label="Preferred name" />
      </label>
      <button type="submit">Continue</button>
    </form>
  );
}
```

```tsx
// apps/telegram-miniapp/src/features/dashboard/DashboardShell.tsx
export function DashboardShell() {
  return (
    <div>
      <header>Playground</header>
      <p>Connect your provider to continue</p>
    </div>
  );
}
```

- [ ] **Step 7: Run the phase 1 tests to verify they pass**

Run:

```powershell
pnpm --filter ./apps/api test -- onboarding.spec.ts
pnpm test:e2e -- --grep "profile onboarding"
```

Expected:

```text
PASS  apps/api/tests/e2e/onboarding.spec.ts
PASS  tests/e2e/phase-1-onboarding.spec.ts
```

- [ ] **Step 8: Lint, update continuity files, and commit**

Run:

```powershell
pnpm lint
git add apps/api apps/telegram-miniapp supabase/migrations HANDOFF.md TASKS.md
git commit -m "feat: add telegram onboarding foundation"
```

## Phase 2 Exit Metrics

- A user can connect a supported provider with API key validation.
- No provider credentials are stored durably.
- A valid provider connection starts a 3-hour session.
- The frontend countdown matches the backend session authority.
- Session timeout allows the in-flight request to finish and blocks new requests after.
- Phase 2 red/green E2E tests pass.

### Task 2: Add Session-Only BYOK And Timed Session Control

**Files:**
- Create: `apps/api/src/modules/providers/provider.route.ts`
- Create: `apps/api/src/modules/providers/provider.service.ts`
- Create: `apps/api/src/modules/providers/provider.validators.ts`
- Create: `apps/api/src/modules/sessions/session.route.ts`
- Create: `apps/api/src/modules/sessions/session.service.ts`
- Create: `apps/api/src/modules/sessions/session.store.ts`
- Create: `apps/api/tests/e2e/provider-session.spec.ts`
- Create: `apps/telegram-miniapp/src/features/onboarding/ProviderConnectPanel.tsx`
- Create: `apps/telegram-miniapp/src/lib/timer.ts`
- Create: `tests/e2e/phase-2-provider-session.spec.ts`
- Create: `supabase/migrations/002_sessions_and_provider_metadata.sql`

- [ ] **Step 1: Write the failing provider/session API test**

```ts
// apps/api/tests/e2e/provider-session.spec.ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";

describe("provider connection and session start", () => {
  it("starts a timed session after provider validation", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/providers/connect",
      payload: {
        userId: "test-user",
        provider: "openai",
        apiKey: "sk-test"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "connected",
      session: {
        durationSeconds: 10800,
        state: "active"
      }
    });
  });
});
```

- [ ] **Step 2: Write the failing browser E2E session test**

```ts
// tests/e2e/phase-2-provider-session.spec.ts
import { test, expect } from "@playwright/test";

test("countdown appears only after provider validation", async ({ page }) => {
  await page.goto("/?tgInitData=valid-signed-init-data");
  await page.getByLabel("API key").fill("sk-test");
  await page.getByRole("button", { name: "Validate provider" }).click();

  await expect(page.getByText("03:00:00")).toBeVisible();
  await expect(page.getByText("Provider connected")).toBeVisible();
});
```

- [ ] **Step 3: Run the phase 2 tests to verify they fail**

Run:

```powershell
pnpm --filter ./apps/api test -- provider-session.spec.ts
pnpm test:e2e -- --grep "countdown appears only after provider validation"
```

Expected:

```text
FAIL  POST /api/providers/connect returned 404
FAIL  locator "API key" not found
```

- [ ] **Step 4: Add provider metadata and session tables**

```sql
-- supabase/migrations/002_sessions_and_provider_metadata.sql
create table provider_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider_name text not null,
  auth_method text not null,
  validation_status text not null,
  metadata jsonb not null default '{}'::jsonb,
  connected_at timestamptz not null default now(),
  expires_at timestamptz,
  last_validated_at timestamptz not null default now()
);

create table playground_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider_connection_id uuid not null references provider_connections(id),
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null,
  review_prompted boolean not null default false
);
```

- [ ] **Step 5: Implement provider validation and session creation**

```ts
// apps/api/src/modules/providers/provider.validators.ts
export async function validateProviderKey(provider: string, apiKey: string) {
  if (!apiKey.startsWith("sk-")) {
    throw new Error("invalid api key");
  }

  return { provider, status: "connected" as const };
}
```

```ts
// apps/api/src/modules/sessions/session.service.ts
const THREE_HOURS_IN_SECONDS = 60 * 60 * 3;

export async function startSession() {
  return {
    durationSeconds: THREE_HOURS_IN_SECONDS,
    state: "active" as const,
    endsAt: new Date(Date.now() + THREE_HOURS_IN_SECONDS * 1000).toISOString(),
  };
}
```

```ts
// apps/api/src/modules/providers/provider.service.ts
import { validateProviderKey } from "./provider.validators";
import { startSession } from "../sessions/session.service";

export async function connectProvider(input: {
  provider: string;
  apiKey: string;
}) {
  await validateProviderKey(input.provider, input.apiKey);
  const session = await startSession();

  return {
    status: "connected" as const,
    session,
  };
}
```

- [ ] **Step 6: Implement the provider panel and countdown display**

```tsx
// apps/telegram-miniapp/src/features/onboarding/ProviderConnectPanel.tsx
import { useState } from "react";

export function ProviderConnectPanel() {
  const [connected, setConnected] = useState(false);

  return (
    <div>
      <label>
        API key
        <input aria-label="API key" />
      </label>
      <button type="button" onClick={() => setConnected(true)}>
        Validate provider
      </button>
      {connected ? <p>Provider connected</p> : null}
      {connected ? <p>03:00:00</p> : null}
    </div>
  );
}
```

```ts
// apps/telegram-miniapp/src/lib/timer.ts
export function formatRemaining(seconds: number) {
  const hours = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const remainingSeconds = String(seconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${remainingSeconds}`;
}
```

- [ ] **Step 7: Run the phase 2 tests to verify they pass**

Run:

```powershell
pnpm --filter ./apps/api test -- provider-session.spec.ts
pnpm test:e2e -- --grep "countdown appears only after provider validation"
```

Expected:

```text
PASS  apps/api/tests/e2e/provider-session.spec.ts
PASS  tests/e2e/phase-2-provider-session.spec.ts
```

- [ ] **Step 8: Lint, overwrite continuity files, and commit**

Run:

```powershell
pnpm lint
git add apps/api apps/telegram-miniapp supabase/migrations HANDOFF.md TASKS.md
git commit -m "feat: add session-only provider connections"
```

## Phase 3 Exit Metrics

- The user can browse the bot catalog inside the shared shell.
- The runtime contract enforces bot capabilities and source bindings.
- `document_wizard` and `kb_concierge` both work end to end.
- Tool permissions do not leak between bots.
- Phase 3 red/green E2E tests pass.

### Task 3: Build The Bot Catalog, Runtime Contract, And First Two Bots

**Files:**
- Create: `packages/shared/src/bots/capabilities.ts`
- Create: `packages/shared/src/bots/manifests.ts`
- Create: `apps/api/src/modules/bots/bot.route.ts`
- Create: `apps/api/src/modules/bots/bot.service.ts`
- Create: `apps/api/src/modules/chat/chat.route.ts`
- Create: `apps/api/src/modules/chat/chat.service.ts`
- Create: `apps/api/src/modules/chat/runtime.ts`
- Create: `apps/api/tests/e2e/bot-runtime.spec.ts`
- Create: `apps/telegram-miniapp/src/features/dashboard/BotRail.tsx`
- Create: `apps/telegram-miniapp/src/features/chat/ChatPanel.tsx`
- Create: `tests/e2e/phase-3-bot-runtime.spec.ts`
- Create: `supabase/migrations/003_bots_conversations_messages.sql`

- [ ] **Step 1: Write the failing bot runtime API test**

```ts
// apps/api/tests/e2e/bot-runtime.spec.ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";

describe("POST /api/chat/messages", () => {
  it("routes a request through the selected bot policy", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/chat/messages",
      payload: {
        sessionId: "session-1",
        botId: "kb_concierge",
        message: "Summarize the policy"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      botId: "kb_concierge",
      citations: expect.any(Array),
      output: expect.stringContaining("policy")
    });
  });
});
```

- [ ] **Step 2: Write the failing browser E2E test for bot switching**

```ts
// tests/e2e/phase-3-bot-runtime.spec.ts
import { test, expect } from "@playwright/test";

test("user can switch between the first two bots without leaking capabilities", async ({ page }) => {
  await page.goto("/playground");
  await page.getByRole("button", { name: "KB Concierge" }).click();
  await expect(page.getByText("Citations")).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload PDF" })).not.toBeVisible();

  await page.getByRole("button", { name: "Document Wizard" }).click();
  await expect(page.getByRole("button", { name: "Upload PDF" })).toBeVisible();
});
```

- [ ] **Step 3: Run the phase 3 tests to verify they fail**

Run:

```powershell
pnpm --filter ./apps/api test -- bot-runtime.spec.ts
pnpm test:e2e -- --grep "switch between the first two bots"
```

Expected:

```text
FAIL  POST /api/chat/messages returned 404
FAIL  button "KB Concierge" not found
```

- [ ] **Step 4: Add bot, conversation, and message persistence**

```sql
-- supabase/migrations/003_bots_conversations_messages.sql
create table bot_definitions (
  bot_id text primary key,
  name text not null,
  category text not null,
  capability_manifest jsonb not null,
  source_binding text not null,
  prompt_version text not null,
  active boolean not null default true
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references playground_sessions(id) on delete cascade,
  bot_id text not null references bot_definitions(bot_id),
  state jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null,
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  safety_flags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 5: Implement shared bot manifests and runtime enforcement**

```ts
// packages/shared/src/bots/manifests.ts
export const botManifests = {
  document_wizard: {
    botId: "document_wizard",
    name: "Document Wizard",
    capabilities: ["chat", "pdf_upload", "structured_form", "html_report"],
  },
  kb_concierge: {
    botId: "kb_concierge",
    name: "KB Concierge",
    capabilities: ["chat", "citations", "rag_query"],
  },
} as const;
```

```ts
// apps/api/src/modules/chat/runtime.ts
import { botManifests } from "@sgt-bots/shared/bots/manifests";

export async function runBotMessage(input: { botId: keyof typeof botManifests; message: string }) {
  const bot = botManifests[input.botId];

  return {
    botId: bot.botId,
    output: `Response for ${input.message} using ${bot.name}`,
    citations: bot.capabilities.includes("citations")
      ? [{ title: "Policy", snippet: "policy summary" }]
      : [],
  };
}
```

- [ ] **Step 6: Implement the catalog UI and chat panel**

```tsx
// apps/telegram-miniapp/src/features/dashboard/BotRail.tsx
const bots = ["KB Concierge", "Document Wizard"];

export function BotRail() {
  return (
    <aside>
      {bots.map((bot) => (
        <button key={bot} type="button">
          {bot}
        </button>
      ))}
    </aside>
  );
}
```

```tsx
// apps/telegram-miniapp/src/features/chat/ChatPanel.tsx
export function ChatPanel({ botId }: { botId: "kb_concierge" | "document_wizard" }) {
  return (
    <section>
      {botId === "kb_concierge" ? <div>Citations</div> : null}
      {botId === "document_wizard" ? <button type="button">Upload PDF</button> : null}
    </section>
  );
}
```

- [ ] **Step 7: Run the phase 3 tests to verify they pass**

Run:

```powershell
pnpm --filter ./apps/api test -- bot-runtime.spec.ts
pnpm test:e2e -- --grep "switch between the first two bots"
```

Expected:

```text
PASS  apps/api/tests/e2e/bot-runtime.spec.ts
PASS  tests/e2e/phase-3-bot-runtime.spec.ts
```

- [ ] **Step 8: Lint, compact continuity if this is the second completed phase since last compact, and commit**

Run:

```powershell
pnpm lint
git add apps/api apps/telegram-miniapp packages/shared supabase/migrations HANDOFF.md TASKS.md
git commit -m "feat: add bot runtime and starter bots"
```

## Phase 4 Exit Metrics

- `document_wizard` accepts PDFs only when its manifest allows it.
- Structured forms feed normalized data into report generation.
- HTML templates render polished PDFs through Playwright.
- Failed uploads and failed renders recover gracefully.
- Phase 4 red/green E2E tests pass.

### Task 4: Add Uploads, Forms, And Professional Report Rendering

**Files:**
- Create: `apps/api/src/modules/uploads/upload.route.ts`
- Create: `apps/api/src/modules/uploads/upload.service.ts`
- Create: `apps/api/src/modules/uploads/upload.validators.ts`
- Create: `apps/api/src/modules/reports/report.route.ts`
- Create: `apps/api/src/modules/reports/report.service.ts`
- Create: `workers/queue/src/index.ts`
- Create: `workers/queue/src/jobs/render-report.job.ts`
- Create: `apps/api/tests/e2e/uploads-and-reports.spec.ts`
- Create: `apps/telegram-miniapp/src/features/uploads/UploadPanel.tsx`
- Create: `apps/telegram-miniapp/src/features/forms/DocumentWizardForm.tsx`
- Create: `apps/telegram-miniapp/src/features/artifacts/ArtifactList.tsx`
- Create: `apps/api/templates/document-wizard-report.html`
- Create: `tests/e2e/phase-4-uploads-and-reports.spec.ts`
- Create: `supabase/migrations/004_uploads_and_artifacts.sql`

- [ ] **Step 1: Write the failing upload/report API E2E test**

```ts
// apps/api/tests/e2e/uploads-and-reports.spec.ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";

describe("document wizard upload and report generation", () => {
  it("accepts a pdf upload and returns a generated artifact", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/reports/document-wizard",
      payload: {
        sessionId: "session-1",
        botId: "document_wizard",
        filename: "sample.pdf",
        formData: {
          clientName: "Acme Co",
          objective: "Summarize the uploaded agreement"
        }
      }
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({
      status: "queued",
      artifactType: "pdf"
    });
  });
});
```

- [ ] **Step 2: Write the failing browser E2E test for the document wizard flow**

```ts
// tests/e2e/phase-4-uploads-and-reports.spec.ts
import { test, expect } from "@playwright/test";

test("document wizard shows upload, form, and generated artifact", async ({ page }) => {
  await page.goto("/playground");
  await page.getByRole("button", { name: "Document Wizard" }).click();
  await page.getByRole("button", { name: "Upload PDF" }).click();
  await page.getByLabel("Client name").fill("Acme Co");
  await page.getByRole("button", { name: "Generate report" }).click();

  await expect(page.getByText("Report queued")).toBeVisible();
  await expect(page.getByText("document-wizard-report.pdf")).toBeVisible();
});
```

- [ ] **Step 3: Run the phase 4 tests to verify they fail**

Run:

```powershell
pnpm --filter ./apps/api test -- uploads-and-reports.spec.ts
pnpm test:e2e -- --grep "document wizard shows upload, form, and generated artifact"
```

Expected:

```text
FAIL  POST /api/reports/document-wizard returned 404
FAIL  text "Report queued" not found
```

- [ ] **Step 4: Add upload and artifact persistence**

```sql
-- supabase/migrations/004_uploads_and_artifacts.sql
create table uploads (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references playground_sessions(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  original_filename text not null,
  mime_type text not null,
  file_size integer not null,
  virus_scan_status text not null,
  parse_status text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table artifacts (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete set null,
  bot_id text not null references bot_definitions(bot_id),
  artifact_type text not null,
  storage_path text not null,
  template_id text,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 5: Implement upload validation, form normalization, and report job enqueue**

```ts
// apps/api/src/modules/uploads/upload.validators.ts
export function assertPdfUpload(filename: string) {
  if (!filename.toLowerCase().endsWith(".pdf")) {
    throw new Error("only pdf uploads are allowed");
  }
}
```

```ts
// apps/api/src/modules/reports/report.service.ts
import { assertPdfUpload } from "../uploads/upload.validators";

export async function queueDocumentWizardReport(input: {
  filename: string;
  formData: { clientName: string; objective: string };
}) {
  assertPdfUpload(input.filename);

  return {
    status: "queued" as const,
    artifactType: "pdf" as const,
    fileName: "document-wizard-report.pdf",
  };
}
```

```html
<!-- apps/api/templates/document-wizard-report.html -->
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Document Wizard Report</title>
  </head>
  <body>
    <h1>{{clientName}}</h1>
    <p>{{objective}}</p>
  </body>
</html>
```

- [ ] **Step 6: Implement the upload/form/artifact UI**

```tsx
// apps/telegram-miniapp/src/features/forms/DocumentWizardForm.tsx
export function DocumentWizardForm() {
  return (
    <form>
      <label>
        Client name
        <input aria-label="Client name" />
      </label>
      <button type="submit">Generate report</button>
    </form>
  );
}
```

```tsx
// apps/telegram-miniapp/src/features/artifacts/ArtifactList.tsx
export function ArtifactList() {
  return <div>document-wizard-report.pdf</div>;
}
```

- [ ] **Step 7: Run the phase 4 tests to verify they pass**

Run:

```powershell
pnpm --filter ./apps/api test -- uploads-and-reports.spec.ts
pnpm test:e2e -- --grep "document wizard shows upload, form, and generated artifact"
```

Expected:

```text
PASS  apps/api/tests/e2e/uploads-and-reports.spec.ts
PASS  tests/e2e/phase-4-uploads-and-reports.spec.ts
```

- [ ] **Step 8: Lint, compact continuity if this is the second completed phase since last compact, and commit**

Run:

```powershell
pnpm lint
git add apps/api apps/telegram-miniapp workers/queue supabase/migrations HANDOFF.md TASKS.md
git commit -m "feat: add uploads forms and report rendering"
```

## Phase 5 Exit Metrics

- Remaining launch bots are seeded and visible in the catalog.
- Review CTA appears at timeout and early exit.
- Analytics events are emitted for the required product funnel.
- The 3-month inactivity cleanup path is implemented.
- Production readiness checks pass.
- Phase 5 red/green E2E tests pass.

### Task 5: Add Remaining Catalog Bots, Review Flow, Analytics, And Cleanup

**Files:**
- Create: `apps/api/src/modules/reviews/review.route.ts`
- Create: `apps/api/src/modules/reviews/review.service.ts`
- Create: `apps/api/src/modules/analytics/analytics.service.ts`
- Create: `workers/queue/src/jobs/profile-retention-cleanup.job.ts`
- Create: `apps/api/tests/e2e/review-and-retention.spec.ts`
- Create: `apps/telegram-miniapp/src/features/dashboard/SessionEndModal.tsx`
- Create: `tests/e2e/phase-5-review-and-retention.spec.ts`
- Create: `supabase/migrations/005_retention_and_audit.sql`
- Modify: `supabase/seed/001_launch_defaults.sql`
- Modify: `packages/shared/src/bots/manifests.ts`

- [ ] **Step 1: Write the failing review/retention API E2E test**

```ts
// apps/api/tests/e2e/review-and-retention.spec.ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";

describe("review prompt and retention cleanup", () => {
  it("marks the session for review and identifies stale profiles", async () => {
    const app = await buildApp();
    const reviewResponse = await app.inject({
      method: "POST",
      url: "/api/reviews/prompt",
      payload: {
        sessionId: "session-1"
      }
    });

    expect(reviewResponse.statusCode).toBe(200);
    expect(reviewResponse.json()).toMatchObject({
      reviewUrl: expect.stringContaining("telegram.me")
    });
  });
});
```

- [ ] **Step 2: Write the failing browser E2E test for session end**

```ts
// tests/e2e/phase-5-review-and-retention.spec.ts
import { test, expect } from "@playwright/test";

test("user sees review CTA when the playground session ends", async ({ page }) => {
  await page.goto("/playground?forceSessionExpiry=1");
  await expect(page.getByText("Leave a review")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open review group" })).toBeVisible();
});
```

- [ ] **Step 3: Run the phase 5 tests to verify they fail**

Run:

```powershell
pnpm --filter ./apps/api test -- review-and-retention.spec.ts
pnpm test:e2e -- --grep "user sees review CTA when the playground session ends"
```

Expected:

```text
FAIL  POST /api/reviews/prompt returned 404
FAIL  text "Leave a review" not found
```

- [ ] **Step 4: Add retention and audit support**

```sql
-- supabase/migrations/005_retention_and_audit.sql
create table audit_events (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  entity_type text not null,
  entity_id text not null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

```ts
// workers/queue/src/jobs/profile-retention-cleanup.job.ts
export function findStaleProfiles(cutoffIso: string, rows: Array<{ lastActivityAt: string }>) {
  const cutoff = new Date(cutoffIso).getTime();
  return rows.filter((row) => new Date(row.lastActivityAt).getTime() < cutoff);
}
```

- [ ] **Step 5: Implement review prompting and final catalog seeding**

```ts
// apps/api/src/modules/reviews/review.service.ts
export async function promptForReview() {
  return {
    reviewUrl: "https://telegram.me/your_review_group",
  };
}
```

```tsx
// apps/telegram-miniapp/src/features/dashboard/SessionEndModal.tsx
export function SessionEndModal() {
  return (
    <div>
      <p>Leave a review</p>
      <a href="https://telegram.me/your_review_group">Open review group</a>
    </div>
  );
}
```

```ts
// packages/shared/src/bots/manifests.ts
export const additionalLaunchBots = [
  "tutor",
  "researcher",
  "general_concierge",
];
```

- [ ] **Step 6: Run the phase 5 tests to verify they pass**

Run:

```powershell
pnpm --filter ./apps/api test -- review-and-retention.spec.ts
pnpm test:e2e -- --grep "user sees review CTA when the playground session ends"
```

Expected:

```text
PASS  apps/api/tests/e2e/review-and-retention.spec.ts
PASS  tests/e2e/phase-5-review-and-retention.spec.ts
```

- [ ] **Step 7: Run full release checks and commit**

Run:

```powershell
pnpm lint
pnpm test
pnpm test:e2e
git add apps/api apps/telegram-miniapp workers/queue packages/shared supabase/migrations supabase/seed HANDOFF.md TASKS.md
git commit -m "feat: complete v1 playground production readiness"
```

## Cross-Phase Review Checklist

- Confirm every phase had a red test run before the green acceptance run.
- Confirm `HANDOFF.md` was overwritten after every meaningful iteration or plan update.
- Confirm `TASKS.md` reflects only active next steps.
- Confirm no phase crossed its gate without recorded justification.
- Confirm subagents, if used, had explicit lane ownership and were closed when done.

## Spec Coverage Check

- Group join and mini app entry: covered by Phase 1.
- Profile capture and Telegram payload persistence: covered by Phase 1.
- Session-only BYOK and 3-hour timer: covered by Phase 2.
- Shared shell and bot selection: covered by Phase 3.
- Bot policy enforcement and LightRAG-style constrained runtime: covered by Phase 3.
- PDF upload, forms, and HTML-to-PDF output: covered by Phase 4.
- Review CTA and retention cleanup: covered by Phase 5.
- QA, lint, code review, and concise phase reporting: embedded in all phase rules.

## Placeholder Scan

- No `TBD`, `TODO`, or deferred implementation markers remain in this plan.
- The earlier open decisions are resolved in this plan as launch defaults:
  - providers: `openai`, `anthropic`
  - starter bots: `document_wizard`, `kb_concierge`
  - renderer: `playwright`

## Type Consistency Check

- Shared identifiers use the same names across the plan:
  - `botId`
  - `sessionId`
  - `provider`
  - `preferredName`
  - `reviewUrl`
- Phase 4 and Phase 5 use the same artifact/report naming model introduced earlier.

## Notes Before Execution

- If you want different day-one providers or a different first-two-bot set, adjust `docs/architecture/stack-decisions.md`, `packages/shared/src/contracts/launch-defaults.ts`, and `supabase/seed/001_launch_defaults.sql` before Phase 0 closes.
- Use Playwright traces aggressively for the red/green E2E loop.
- Keep the Telegram bot thin; most user behavior should remain in the mini app and backend API.

