# Cursive Playground V1 Implementation Plan

> Superseded on 2026-05-19 by `docs/superpowers/plans/2026-05-19-cursive-v2-redesign-implementation.md`.
> This plan is fully replaced because the 2026-05-19 redesign changes Cursive architecture and scope.
> Do not execute this plan for current Cursive work.

> **Archived plan notice:** The agentic-worker instructions below are retained only as historical context. Do not use this plan, its tasks, or its execution guidance for current Cursive work.

**Goal:** Build `Cursive` as a category-driven letter-generation bot inside the existing Telegram playground, starting with a complete `credit bureau dispute` workflow and expanding to the remaining letter categories behind the same intake, review, and HTML-to-PDF engine.

**Architecture:** Extend the existing playground monorepo instead of creating a parallel product. Add a Supabase-backed Cursive config layer, category-aware intake and draft storage, helper-only chat, a separate draft-review pipeline, and a print-safe HTML template renderer that produces `8.5 x 11` PDFs through the existing report infrastructure. Keep n8n as reference material only; the live Cursive runtime stays in the mini app, Fastify API, Supabase, and BullMQ stack.

**Tech Stack:** pnpm workspaces, TypeScript, Fastify, React, Vite, Zod, Supabase, Redis, BullMQ, Playwright PDF rendering, Vitest, Playwright E2E

---

## Planned File Structure

- `packages/shared/src/bots/manifests.ts`
  - keep `Cursive` as `document_wizard`, but evolve its capability description around category-driven letter workflows
- `packages/shared/src/contracts/cursive.ts`
  - shared types for categories, intake fields, draft status, review results, and template payloads
- `packages/shared/src/contracts/chat.ts`
  - extend message metadata for helper-only guidance and generation status
- `apps/api/src/modules/bots/bot.service.ts`
  - route `document_wizard` to the new Cursive category engine
- `apps/api/src/modules/chat/chat.service.ts`
  - enforce helper-only behavior for Cursive and separate preview messages from final artifacts
- `apps/api/src/modules/reports/report.service.ts`
  - extend existing HTML/PDF rendering for letter templates
- `apps/api/src/modules/uploads/upload.service.ts`
  - keep optional file evidence upload support for categories that need attachments
- `apps/api/src/modules/cursive/`
  - new module for category loading, intake validation, prompt assembly, draft storage, review pipeline, and template composition
- `apps/telegram-miniapp/src/features/cursive/`
  - new category picker, staged intake UI, helper guidance, preview panel, and draft actions
- `supabase/migrations/007_cursive_category_engine.sql`
  - tables for categories, intake schemas, prompts, citations, addresses, templates, and drafts
- `supabase/seed/007_cursive_seed.sql`
  - initial `credit bureau dispute` data, starter categories, and addresses
- `tests/e2e/cursive-credit-dispute.spec.ts`
  - end-to-end coverage for the first full Cursive workflow
- `apps/api/tests/cursive/*.spec.ts`
  - API and validation tests for intake, review, and render behavior

## Delivery Order

- Phase A: data/config foundation
- Phase B: Cursive API engine
- Phase C: mini app intake and helper chat
- Phase D: HTML/PDF output and review pipeline
- Phase E: category expansion and hardening

Do not advance between phases without green metrics and red/green test proof.

## Phase A Exit Metrics

- Supabase schema for Cursive config and drafts exists.
- Seed data loads for all planned Cursive categories.
- `credit bureau dispute` has a complete intake schema, citation set, and address seed.
- One failing schema/repository test is introduced and then made green.

### Task A1: Add Shared Cursive Contracts

**Files:**
- Create: `E:\REPOS\SGT_BOTS\packages\shared\src\contracts\cursive.ts`
- Modify: `E:\REPOS\SGT_BOTS\packages\shared\src\contracts\index.ts`
- Test: `E:\REPOS\SGT_BOTS\packages\shared\src\contracts\cursive.spec.ts`

- [ ] **Step 1: Write the failing shared-contract test**

```ts
// packages/shared/src/contracts/cursive.spec.ts
import { describe, expect, it } from "vitest";
import { CursiveCategorySchema } from "./cursive";

describe("CursiveCategorySchema", () => {
  it("accepts the credit bureau dispute category", () => {
    const result = CursiveCategorySchema.safeParse({
      slug: "credit_bureau_dispute",
      displayName: "Credit Bureau Dispute",
      helperMode: "helper-only",
      outputModes: ["portal_text", "html_letter", "pdf_letter"],
    });

    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run the shared-contract test to verify it fails**

Run:

```powershell
corepack pnpm --filter ./packages/shared test -- src/contracts/cursive.spec.ts
```

Expected:

```text
FAIL  Cannot find module './cursive'
```

- [ ] **Step 3: Create the shared Cursive contract file**

```ts
// packages/shared/src/contracts/cursive.ts
import { z } from "zod";

export const CursiveOutputModeSchema = z.enum([
  "portal_text",
  "html_letter",
  "pdf_letter",
]);

export const CursiveCategorySchema = z.object({
  slug: z.string().min(1),
  displayName: z.string().min(1),
  helperMode: z.literal("helper-only"),
  outputModes: z.array(CursiveOutputModeSchema).min(1),
});

export type CursiveCategory = z.infer<typeof CursiveCategorySchema>;
```

```ts
// packages/shared/src/contracts/index.ts
export * from "./cursive";
```

- [ ] **Step 4: Run the shared-contract test to verify it passes**

Run:

```powershell
corepack pnpm --filter ./packages/shared test -- src/contracts/cursive.spec.ts
```

Expected:

```text
PASS  packages/shared/src/contracts/cursive.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/contracts/cursive.ts packages/shared/src/contracts/index.ts packages/shared/src/contracts/cursive.spec.ts
git commit -m "feat: add shared cursive contracts"
```

### Task A2: Add Supabase Schema For Cursive Configuration

**Files:**
- Create: `E:\REPOS\SGT_BOTS\supabase\migrations\007_cursive_category_engine.sql`
- Create: `E:\REPOS\SGT_BOTS\supabase\seed\007_cursive_seed.sql`
- Test: `E:\REPOS\SGT_BOTS\apps\api\tests\cursive\cursive-schema.spec.ts`

- [ ] **Step 1: Write the failing schema test**

```ts
// apps/api/tests/cursive/cursive-schema.spec.ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Cursive schema migration", () => {
  it("creates the category and draft tables", () => {
    const sql = readFileSync(
      "supabase/migrations/007_cursive_category_engine.sql",
      "utf8",
    );

    expect(sql).toContain("create table if not exists public.cursive_categories");
    expect(sql).toContain("create table if not exists public.cursive_drafts");
  });
});
```

- [ ] **Step 2: Run the schema test to verify it fails**

Run:

```powershell
corepack pnpm --filter ./apps/api test -- tests/cursive/cursive-schema.spec.ts
```

Expected:

```text
FAIL  ENOENT: no such file or directory, open 'supabase/migrations/007_cursive_category_engine.sql'
```

- [ ] **Step 3: Create the migration and seed files**

```sql
-- supabase/migrations/007_cursive_category_engine.sql
create table if not exists public.cursive_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  helper_mode text not null default 'helper-only',
  enabled boolean not null default true,
  sort_order integer not null default 0,
  summary text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.cursive_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  category_slug text not null references public.cursive_categories(slug),
  intake_payload jsonb not null default '{}'::jsonb,
  draft_payload jsonb not null default '{}'::jsonb,
  review_payload jsonb not null default '{}'::jsonb,
  html_snapshot text not null default '',
  status text not null default 'drafting',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

```sql
-- supabase/seed/007_cursive_seed.sql
insert into public.cursive_categories (slug, display_name, helper_mode, enabled, sort_order, summary)
values
  ('credit_bureau_dispute', 'Credit Bureau Dispute', 'helper-only', true, 10, 'Dispute late payments, charge-offs, and inaccurate bureau reporting.'),
  ('aggregator_dispute', 'Aggregator Dispute', 'helper-only', true, 20, 'Challenge aggregator data such as LexisNexis-style reporting.'),
  ('direct_creditor_dispute', 'Direct Creditor Dispute', 'helper-only', true, 30, 'Dispute directly with a creditor or lender.'),
  ('bill_collector_dispute', 'Bill Collector Dispute', 'helper-only', true, 40, 'Request validation, assignment, and bill-of-sale support.'),
  ('utility_dispute', 'Utility Dispute', 'helper-only', true, 50, 'Dispute energy, water, telecom, and similar charges.'),
  ('reconsideration_request', 'Reconsideration Request', 'helper-only', true, 60, 'Request reconsideration after denial of credit or account access.'),
  ('full_account_history_request', 'Full Account History Request', 'helper-only', true, 70, 'Request a complete accounting and account history.'),
  ('irs_inquiry_dispute', 'IRS Inquiry / Dispute', 'helper-only', true, 80, 'Respond to IRS account notices and inquiry disputes.')
on conflict (slug) do update
set display_name = excluded.display_name,
    summary = excluded.summary,
    enabled = excluded.enabled,
    sort_order = excluded.sort_order;
```

- [ ] **Step 4: Run the schema test to verify it passes**

Run:

```powershell
corepack pnpm --filter ./apps/api test -- tests/cursive/cursive-schema.spec.ts
```

Expected:

```text
PASS  apps/api/tests/cursive/cursive-schema.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/007_cursive_category_engine.sql supabase/seed/007_cursive_seed.sql apps/api/tests/cursive/cursive-schema.spec.ts
git commit -m "feat: add cursive schema foundation"
```

## Phase B Exit Metrics

- `document_wizard` is routed through a dedicated Cursive service.
- Helper-only chat is enforced in the backend.
- Category metadata and intake schemas load from repositories instead of hardcoded n8n logic.
- One failing API test is introduced and made green.

### Task B1: Add the Cursive Module Skeleton

**Files:**
- Create: `E:\REPOS\SGT_BOTS\apps\api\src\modules\cursive\cursive.repo.ts`
- Create: `E:\REPOS\SGT_BOTS\apps\api\src\modules\cursive\cursive.service.ts`
- Create: `E:\REPOS\SGT_BOTS\apps\api\src\modules\cursive\cursive.route.ts`
- Modify: `E:\REPOS\SGT_BOTS\apps\api\src\modules\bots\bot.service.ts`
- Test: `E:\REPOS\SGT_BOTS\apps\api\tests\cursive\cursive-service.spec.ts`

- [ ] **Step 1: Write the failing Cursive service test**

```ts
// apps/api/tests/cursive/cursive-service.spec.ts
import { describe, expect, it } from "vitest";
import { isHelperOnlyBot } from "../../src/modules/cursive/cursive.service";

describe("Cursive helper mode", () => {
  it("treats document_wizard as helper-only intake chat", () => {
    expect(isHelperOnlyBot("document_wizard")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
corepack pnpm --filter ./apps/api test -- tests/cursive/cursive-service.spec.ts
```

Expected:

```text
FAIL  Cannot find module '../../src/modules/cursive/cursive.service'
```

- [ ] **Step 3: Create the minimal Cursive service and routing hook**

```ts
// apps/api/src/modules/cursive/cursive.service.ts
export function isHelperOnlyBot(botId: string) {
  return botId === "document_wizard";
}
```

```ts
// apps/api/src/modules/bots/bot.service.ts
import { isHelperOnlyBot } from "../cursive/cursive.service";

export function isStructuredBot(botId: string) {
  return isHelperOnlyBot(botId);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```powershell
corepack pnpm --filter ./apps/api test -- tests/cursive/cursive-service.spec.ts
```

Expected:

```text
PASS  apps/api/tests/cursive/cursive-service.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/cursive/cursive.service.ts apps/api/src/modules/bots/bot.service.ts apps/api/tests/cursive/cursive-service.spec.ts
git commit -m "feat: add cursive service skeleton"
```

### Task B2: Replace the n8n Intake Pattern With Category-Specific Prompt Assembly

**Files:**
- Modify: `E:\REPOS\SGT_BOTS\apps\api\src\modules\chat\chat.service.ts`
- Modify: `E:\REPOS\SGT_BOTS\apps\api\src\modules\providers\provider.service.ts`
- Create: `E:\REPOS\SGT_BOTS\apps\api\src\modules\cursive\cursive-prompt.service.ts`
- Test: `E:\REPOS\SGT_BOTS\apps\api\tests\cursive\cursive-prompt.spec.ts`

- [ ] **Step 1: Write the failing prompt assembly test**

```ts
// apps/api/tests/cursive/cursive-prompt.spec.ts
import { describe, expect, it } from "vitest";
import { buildCursivePromptPackage } from "../../src/modules/cursive/cursive-prompt.service";

describe("buildCursivePromptPackage", () => {
  it("builds a credit bureau dispute package with helper-only chat mode", () => {
    const pkg = buildCursivePromptPackage({
      categorySlug: "credit_bureau_dispute",
      intake: { name: "Jane Doe", bureau_choice: "Experian" },
      addresses: [{ organization_name: "Experian" }],
      citations: [{ citation_key: "fcra_611", citation_text: "15 U.S.C. § 1681i" }],
    });

    expect(pkg.helperMode).toBe("helper-only");
    expect(pkg.categorySlug).toBe("credit_bureau_dispute");
  });
});
```

- [ ] **Step 2: Run the prompt assembly test to verify it fails**

Run:

```powershell
corepack pnpm --filter ./apps/api test -- tests/cursive/cursive-prompt.spec.ts
```

Expected:

```text
FAIL  Cannot find module '../../src/modules/cursive/cursive-prompt.service'
```

- [ ] **Step 3: Create the minimal prompt assembly service**

```ts
// apps/api/src/modules/cursive/cursive-prompt.service.ts
export function buildCursivePromptPackage(input: {
  categorySlug: string;
  intake: Record<string, unknown>;
  addresses: Array<Record<string, unknown>>;
  citations: Array<Record<string, unknown>>;
}) {
  return {
    helperMode: "helper-only" as const,
    categorySlug: input.categorySlug,
    intake: input.intake,
    addresses: input.addresses,
    citations: input.citations,
  };
}
```

- [ ] **Step 4: Run the prompt assembly test to verify it passes**

Run:

```powershell
corepack pnpm --filter ./apps/api test -- tests/cursive/cursive-prompt.spec.ts
```

Expected:

```text
PASS  apps/api/tests/cursive/cursive-prompt.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/cursive/cursive-prompt.service.ts apps/api/tests/cursive/cursive-prompt.spec.ts apps/api/src/modules/chat/chat.service.ts apps/api/src/modules/providers/provider.service.ts
git commit -m "feat: add cursive prompt assembly"
```

## Phase C Exit Metrics

- Mini app shows category-first Cursive entry.
- Intake form blocks generation until required fields are complete.
- Helper chat remains available but cannot author official intake state.
- One failing UI/E2E test is introduced and made green.

### Task C1: Add the Cursive Category Picker and Intake Shell

**Files:**
- Create: `E:\REPOS\SGT_BOTS\apps\telegram-miniapp\src\features\cursive\CursiveCategoryPicker.tsx`
- Create: `E:\REPOS\SGT_BOTS\apps\telegram-miniapp\src\features\cursive\CursiveIntakeWizard.tsx`
- Modify: `E:\REPOS\SGT_BOTS\apps\telegram-miniapp\src\features\dashboard\DashboardShell.tsx`
- Test: `E:\REPOS\SGT_BOTS\tests\e2e\cursive-credit-dispute.spec.ts`

- [ ] **Step 1: Write the failing E2E test**

```ts
// tests/e2e/cursive-credit-dispute.spec.ts
import { test, expect } from "@playwright/test";

test("Cursive starts with a category picker", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000");
  await expect(page.getByText("Choose a Cursive letter type")).toBeVisible();
});
```

- [ ] **Step 2: Run the E2E test to verify it fails**

Run:

```powershell
corepack pnpm test:e2e -- tests/e2e/cursive-credit-dispute.spec.ts
```

Expected:

```text
FAIL  Expected text "Choose a Cursive letter type" to be visible
```

- [ ] **Step 3: Add the category picker and intake shell**

```tsx
// apps/telegram-miniapp/src/features/cursive/CursiveCategoryPicker.tsx
export function CursiveCategoryPicker() {
  return (
    <section>
      <h3>Choose a Cursive letter type</h3>
      <button type="button">Credit Bureau Dispute</button>
    </section>
  );
}
```

```tsx
// apps/telegram-miniapp/src/features/dashboard/DashboardShell.tsx
{activeBotId === "document_wizard" ? <CursiveCategoryPicker /> : null}
```

- [ ] **Step 4: Run the E2E test to verify it passes**

Run:

```powershell
corepack pnpm test:e2e -- tests/e2e/cursive-credit-dispute.spec.ts
```

Expected:

```text
PASS  tests/e2e/cursive-credit-dispute.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/telegram-miniapp/src/features/cursive/CursiveCategoryPicker.tsx apps/telegram-miniapp/src/features/cursive/CursiveIntakeWizard.tsx apps/telegram-miniapp/src/features/dashboard/DashboardShell.tsx tests/e2e/cursive-credit-dispute.spec.ts
git commit -m "feat: add cursive category picker"
```

## Phase D Exit Metrics

- `credit bureau dispute` renders a valid HTML letter from intake data.
- PDF artifact generation uses the existing report pipeline.
- Review pass can fail and request one controlled rewrite.
- One failing PDF/review test is introduced and made green.

### Task D1: Add the First Cursive HTML Letter Template

**Files:**
- Create: `E:\REPOS\SGT_BOTS\apps\api\src\modules\cursive\templates\credit-bureau-dispute.html.ts`
- Modify: `E:\REPOS\SGT_BOTS\apps\api\src\modules\reports\report.service.ts`
- Test: `E:\REPOS\SGT_BOTS\apps\api\tests\cursive\credit-bureau-template.spec.ts`

- [ ] **Step 1: Write the failing HTML template test**

```ts
// apps/api/tests/cursive/credit-bureau-template.spec.ts
import { describe, expect, it } from "vitest";
import { renderCreditBureauDisputeHtml } from "../../src/modules/cursive/templates/credit-bureau-dispute.html";

describe("renderCreditBureauDisputeHtml", () => {
  it("renders a print-safe 8.5 x 11 letter shell", () => {
    const html = renderCreditBureauDisputeHtml({
      name: "Jane Doe",
      bureauName: "Experian",
      bodyParagraphs: ["Sample body"],
      citations: ["15 U.S.C. § 1681i"],
    });

    expect(html).toContain("@page");
    expect(html).toContain("8.5in 11in");
    expect(html).toContain("Experian");
  });
});
```

- [ ] **Step 2: Run the template test to verify it fails**

Run:

```powershell
corepack pnpm --filter ./apps/api test -- tests/cursive/credit-bureau-template.spec.ts
```

Expected:

```text
FAIL  Cannot find module '../../src/modules/cursive/templates/credit-bureau-dispute.html'
```

- [ ] **Step 3: Create the minimal HTML template renderer**

```ts
// apps/api/src/modules/cursive/templates/credit-bureau-dispute.html.ts
export function renderCreditBureauDisputeHtml(input: {
  name: string;
  bureauName: string;
  bodyParagraphs: string[];
  citations: string[];
}) {
  return `
  <html>
    <head>
      <style>
        @page { size: 8.5in 11in; margin: 0.75in; }
        body { font-family: "Times New Roman", serif; }
      </style>
    </head>
    <body>
      <p>${input.name}</p>
      <p>${input.bureauName}</p>
      ${input.bodyParagraphs.map((line) => `<p>${line}</p>`).join("")}
      <footer>${input.citations.join("<br />")}</footer>
    </body>
  </html>`;
}
```

- [ ] **Step 4: Run the template test to verify it passes**

Run:

```powershell
corepack pnpm --filter ./apps/api test -- tests/cursive/credit-bureau-template.spec.ts
```

Expected:

```text
PASS  apps/api/tests/cursive/credit-bureau-template.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/cursive/templates/credit-bureau-dispute.html.ts apps/api/tests/cursive/credit-bureau-template.spec.ts apps/api/src/modules/reports/report.service.ts
git commit -m "feat: add cursive html letter template"
```

## Phase E Exit Metrics

- Remaining categories exist in config and UI.
- Review pipeline and validation are reusable across categories.
- E2E coverage proves one full happy path and one review-fail path.
- Documentation and runbooks are updated.

### Task E1: Expand Categories Beyond Credit Bureau Dispute

**Files:**
- Modify: `E:\REPOS\SGT_BOTS\supabase\seed\007_cursive_seed.sql`
- Modify: `E:\REPOS\SGT_BOTS\apps\telegram-miniapp\src\features\cursive\CursiveCategoryPicker.tsx`
- Modify: `E:\REPOS\SGT_BOTS\apps\api\src\modules\cursive\cursive.repo.ts`
- Test: `E:\REPOS\SGT_BOTS\apps\api\tests\cursive\cursive-category-catalog.spec.ts`

- [ ] **Step 1: Write the failing category catalog test**

```ts
// apps/api/tests/cursive/cursive-category-catalog.spec.ts
import { describe, expect, it } from "vitest";
import { listCursiveCategorySlugs } from "../../src/modules/cursive/cursive.repo";

describe("listCursiveCategorySlugs", () => {
  it("includes all planned Cursive v1 categories", () => {
    expect(listCursiveCategorySlugs()).toEqual([
      "credit_bureau_dispute",
      "aggregator_dispute",
      "direct_creditor_dispute",
      "bill_collector_dispute",
      "utility_dispute",
      "reconsideration_request",
      "full_account_history_request",
      "irs_inquiry_dispute",
    ]);
  });
});
```

- [ ] **Step 2: Run the category catalog test to verify it fails**

Run:

```powershell
corepack pnpm --filter ./apps/api test -- tests/cursive/cursive-category-catalog.spec.ts
```

Expected:

```text
FAIL  Cannot find export 'listCursiveCategorySlugs'
```

- [ ] **Step 3: Implement the category catalog export**

```ts
// apps/api/src/modules/cursive/cursive.repo.ts
export function listCursiveCategorySlugs() {
  return [
    "credit_bureau_dispute",
    "aggregator_dispute",
    "direct_creditor_dispute",
    "bill_collector_dispute",
    "utility_dispute",
    "reconsideration_request",
    "full_account_history_request",
    "irs_inquiry_dispute",
  ] as const;
}
```

- [ ] **Step 4: Run the category catalog test to verify it passes**

Run:

```powershell
corepack pnpm --filter ./apps/api test -- tests/cursive/cursive-category-catalog.spec.ts
```

Expected:

```text
PASS  apps/api/tests/cursive/cursive-category-catalog.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/cursive/cursive.repo.ts apps/api/tests/cursive/cursive-category-catalog.spec.ts supabase/seed/007_cursive_seed.sql apps/telegram-miniapp/src/features/cursive/CursiveCategoryPicker.tsx
git commit -m "feat: expand cursive category catalog"
```

## Self-Review

### Spec coverage

- category-based Cursive model is covered by Phase A and Phase E
- helper-only chat behavior is covered by Phase B and Phase C
- HTML-to-PDF output is covered by Phase D
- separate review pipeline is introduced in Phase D and should be expanded during execution
- Supabase-backed prompts, citations, addresses, and templates are covered by Phase A and later phase extensions

### Placeholder scan

- no `TBD` or `TODO` markers remain in this plan
- all planned files point to real repo paths
- each task includes a failing test, a minimal implementation, validation, and a commit step

### Type consistency

- `document_wizard` remains the current Cursive bot id in the existing repo
- `helper-only` is used consistently as the chat mode
- `credit_bureau_dispute` remains the first complete category across spec and plan

## Execution Handoff

Archived execution handoff only. This plan is superseded and must not be executed.

Use `E:\REPOS\SGT_BOTS\docs\superpowers\plans\2026-05-19-cursive-v2-redesign-implementation.md` for active Cursive implementation guidance.

The execution options below are obsolete historical text and are not approved for current work.
