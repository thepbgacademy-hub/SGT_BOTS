# Cursive V2 Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current chat-assisted Cursive lane with a full-screen, workflow-only dispute wizard that supports manual dispute entry and uploaded-report analysis, then generates bureau-specific removal-demand letters and evidence artifacts.

**Status as of 2026-05-22:** Phases A-D are implemented and locally green. The manual lane, tri-merge upload lane, and single-bureau upload lane pass end-to-end. Phase E rollout packaging is active; VPS deployment has not started.

**Architecture:** Keep `document_wizard` as the Cursive bot id inside the six-bot playground, but move Cursive into its own full-screen mobile-first workspace with no chat surface. Build a deterministic dispute engine around manual evidence posture, uploaded-report issue detection, controlled assertions, hard-coded doctrine rules, and a final HTML/PDF artifact pipeline with letter-level validation gates.

**Tech Stack:** pnpm workspaces, TypeScript, React, Vite, Fastify, Zod, Vitest, Playwright, PDF rendering, existing report/artifact services

---

## Planned File Structure

- `E:\REPOS\SGT_BOTS\packages\shared\src\contracts\cursive.ts`
  - replace category-first helper-chat contracts with workflow, violation, evidence-posture, report-type, and artifact contracts
- `E:\REPOS\SGT_BOTS\packages\shared\src\contracts\cursive.spec.ts`
  - validate the new workflow-level contracts
- `E:\REPOS\SGT_BOTS\apps\telegram-miniapp\src\features\dashboard\DashboardShell.tsx`
  - hand off `document_wizard` into the full-screen Cursive workspace and keep the session timer available
- `E:\REPOS\SGT_BOTS\apps\telegram-miniapp\src\features\chat\ChatPanel.tsx`
  - remove Cursive-specific chat UI responsibilities while preserving chat for the other bots
- `E:\REPOS\SGT_BOTS\apps\telegram-miniapp\src\features\cursive\CursiveWorkspace.tsx`
  - new top-level wizard shell for Cursive
- `E:\REPOS\SGT_BOTS\apps\telegram-miniapp\src\features\cursive\CursiveStepper.tsx`
  - horizontal named stepper
- `E:\REPOS\SGT_BOTS\apps\telegram-miniapp\src\features\cursive\CursiveFooter.tsx`
  - sticky footer actions plus subtle countdown timer
- `E:\REPOS\SGT_BOTS\apps\telegram-miniapp\src\features\cursive\steps\*.tsx`
  - focused wizard steps for mode, evidence, violation, details, review, upload, issues, and results
- `E:\REPOS\SGT_BOTS\apps\telegram-miniapp\src\app\app.css`
  - new full-screen Cursive control-room styling
- `E:\REPOS\SGT_BOTS\apps\api\src\modules\chat\chat.service.ts`
  - stop routing Cursive through chat reply generation
- `E:\REPOS\SGT_BOTS\apps\api\src\modules\cursive\cursive.repo.ts`
  - replace category catalog responsibility with workflow metadata, violation definitions, controlled assertions, and statute mapping ids
- `E:\REPOS\SGT_BOTS\apps\api\src\modules\cursive\cursive.service.ts`
  - central workflow engine for manual issues, cross-bureau issue clusters, single-bureau issues, and generation requests
- `E:\REPOS\SGT_BOTS\apps\api\src\modules\cursive\cursive.route.ts`
  - real API routes for wizard workflow state, issue review, and generation
- `E:\REPOS\SGT_BOTS\apps\api\src\modules\cursive\cursive-detection.service.ts`
  - issue detection and matching logic for uploaded reports
- `E:\REPOS\SGT_BOTS\apps\api\src\modules\cursive\cursive-validation.service.ts`
  - enforce non-negotiable doctrine and forbidden phrase rules before delivery
- `E:\REPOS\SGT_BOTS\apps\api\src\modules\cursive\cursive-template.service.ts`
  - normalize confirmed issues into template inputs
- `E:\REPOS\SGT_BOTS\apps\api\src\modules\cursive\templates\bureau-removal-demand.html.ts`
  - shared fixed-shell letter template
- `E:\REPOS\SGT_BOTS\apps\api\src\modules\reports\report.route.ts`
  - hand off Cursive generation to the Cursive module while preserving artifact download routes
- `E:\REPOS\SGT_BOTS\apps\api\src\modules\reports\report.service.ts`
  - queue letters and optional evidence exhibits as artifacts
- `E:\REPOS\SGT_BOTS\apps\api\tests\cursive\*.spec.ts`
  - replace helper-chat and category-era tests with workflow, doctrine, detection, and validation tests
- `E:\REPOS\SGT_BOTS\apps\api\tests\e2e\cursive-*.spec.ts`
  - API-level E2E coverage for manual and upload lanes
- `E:\REPOS\SGT_BOTS\tests\e2e\cursive-*.spec.ts`
  - browser-level workflow coverage for the redesigned mini app
- `E:\REPOS\SGT_BOTS\docs\superpowers\specs\2026-05-08-cursive-playground-design.md`
  - mark as superseded in favor of the 2026-05-19 redesign
- `E:\REPOS\SGT_BOTS\docs\superpowers\plans\2026-05-08-cursive-playground-v1-implementation.md`
  - mark as superseded in favor of the 2026-05-19 redesign plan

## Delivery Order

- Phase A: supersession and shared contract reset
- Phase B: Cursive backend workflow engine
- Phase C: full-screen mini-app wizard
- Phase D: letter template, artifact generation, and validation gate
- Phase E: deployment correction and VPS rollout notes

The local pre-rollout E2E prerequisite is satisfied for the manual lane, tri-merge upload lane, and single-bureau upload lane. Phase E should focus on branch review, commit/push preparation, and VPS rollout readiness before any production deployment starts.

## Phase A Exit Metrics

- Old Cursive spec/plan are explicitly marked superseded.
- Shared contracts describe workflow-only Cursive, not helper chat.
- At least one failing shared-contract test is introduced and then made green.

### Task A1: Mark the old Cursive design docs as superseded

**Files:**
- Modify: `E:\REPOS\SGT_BOTS\docs\superpowers\specs\2026-05-08-cursive-playground-design.md`
- Modify: `E:\REPOS\SGT_BOTS\docs\superpowers\plans\2026-05-08-cursive-playground-v1-implementation.md`

- [ ] **Step 1: Add a superseded banner to the old design doc**

```md
> Superseded on 2026-05-19 by `docs/superpowers/specs/2026-05-19-cursive-v2-redesign.md`.
> Do not use this document as the active Cursive source of truth.
```

- [ ] **Step 2: Add a superseded banner to the old implementation plan**

```md
> Superseded on 2026-05-19 by `docs/superpowers/plans/2026-05-19-cursive-v2-redesign-implementation.md`.
> Do not execute this plan for current Cursive work.
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-05-08-cursive-playground-design.md docs/superpowers/plans/2026-05-08-cursive-playground-v1-implementation.md
git commit -m "docs: supersede old cursive design and plan"
```

### Task A2: Replace the shared Cursive contract surface

**Files:**
- Modify: `E:\REPOS\SGT_BOTS\packages\shared\src\contracts\cursive.ts`
- Modify: `E:\REPOS\SGT_BOTS\packages\shared\src\contracts\index.ts`
- Test: `E:\REPOS\SGT_BOTS\packages\shared\src\contracts\cursive.spec.ts`

- [ ] **Step 1: Write the failing shared-contract test**

```ts
import { describe, expect, it } from "vitest";
import {
  CursiveModeSchema,
  CursiveEvidencePostureSchema,
  CursiveViolationTypeSchema,
  CursiveReportTypeSchema,
} from "./cursive";

describe("Cursive v2 shared contracts", () => {
  it("accepts the workflow-only wizard modes", () => {
    expect(CursiveModeSchema.parse("manual_dispute")).toBe("manual_dispute");
    expect(CursiveModeSchema.parse("analyze_uploaded_report")).toBe(
      "analyze_uploaded_report",
    );
  });

  it("accepts the approved manual evidence postures", () => {
    expect(
      CursiveEvidencePostureSchema.parse("cross_bureau_inconsistency"),
    ).toBe("cross_bureau_inconsistency");
    expect(
      CursiveEvidencePostureSchema.parse("single_bureau_inaccuracy_with_proof"),
    ).toBe("single_bureau_inaccuracy_with_proof");
  });

  it("accepts the first cross-bureau violation type", () => {
    expect(
      CursiveViolationTypeSchema.parse("different_balances_across_bureaus"),
    ).toBe("different_balances_across_bureaus");
  });

  it("accepts the first upload report types", () => {
    expect(CursiveReportTypeSchema.parse("tri_merge")).toBe("tri_merge");
    expect(CursiveReportTypeSchema.parse("single_bureau")).toBe("single_bureau");
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
FAIL  No export named 'CursiveModeSchema'
```

- [ ] **Step 3: Replace the shared contract file with the workflow-only schemas**

```ts
import { z } from "zod";

export const CursiveModeSchema = z.enum([
  "manual_dispute",
  "analyze_uploaded_report",
]);

export const CursiveEvidencePostureSchema = z.enum([
  "cross_bureau_inconsistency",
  "single_bureau_inaccuracy_with_proof",
]);

export const CursiveReportTypeSchema = z.enum([
  "tri_merge",
  "single_bureau",
]);

export const CursiveViolationTypeSchema = z.enum([
  "different_balances_across_bureaus",
  "different_delinquency_dates_across_bureaus",
  "incorrect_account_number_across_bureaus",
  "incorrect_creditor_name_across_bureaus",
  "incorrect_payment_status_across_bureaus",
  "open_closed_status_conflict_across_bureaus",
  "incorrect_account_number",
  "incorrect_creditor_name",
  "duplicate_creditor_or_collector_reporting",
  "incorrect_payment_status",
  "closed_account_reported_as_open",
  "account_not_mine",
]);

export const CursiveControlledAssertionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
}).strict();

export type CursiveMode = z.infer<typeof CursiveModeSchema>;
export type CursiveEvidencePosture = z.infer<typeof CursiveEvidencePostureSchema>;
export type CursiveReportType = z.infer<typeof CursiveReportTypeSchema>;
export type CursiveViolationType = z.infer<typeof CursiveViolationTypeSchema>;
export type CursiveControlledAssertion = z.infer<
  typeof CursiveControlledAssertionSchema
>;
```

```ts
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
git commit -m "feat: replace cursive shared workflow contracts"
```

## Phase B Exit Metrics

- Cursive no longer depends on chat for its primary runtime.
- Manual and upload lanes are modeled in backend routes and services.
- Cross-bureau inconsistency doctrine and single-bureau proof doctrine are enforced by tests.

### Task B1: Stop routing Cursive through chat replies

**Files:**
- Modify: `E:\REPOS\SGT_BOTS\apps\api\src\modules\chat\chat.service.ts`
- Test: `E:\REPOS\SGT_BOTS\apps\api\tests\cursive\cursive-service.spec.ts`

- [ ] **Step 1: Write the failing backend test**

```ts
import { describe, expect, it } from "vitest";
import { createChatService } from "../../src/modules/chat/chat.service";

describe("Cursive chat handling", () => {
  it("does not provide interactive chat guidance for document_wizard anymore", () => {
    const service = createChatService();

    expect(() =>
      service.sendMessage({
        sessionId: "session-1",
        userId: "user-1",
        botId: "document_wizard",
        message: "help me with my dispute",
      }),
    ).toThrow("cursive workflow only");
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
FAIL  Expected function to throw
```

- [ ] **Step 3: Implement the workflow-only guard**

```ts
function buildRuntimeReply(
  manifest: BotManifest,
  trimmedContent: string,
  cursiveRepo: ReturnType<typeof createCursiveRepo>,
): RuntimeReply {
  switch (manifest.id) {
    case "document_wizard":
      throw new Error("cursive workflow only");
    case "tutor":
      return buildTutorReply(manifest, trimmedContent);
    case "form_wizard":
      return buildFormWizardReply(manifest, trimmedContent);
    case "verifier":
      return buildVerifierReply(manifest, trimmedContent);
    case "concierge_general_academy_KB":
      return buildKnowledgeBaseReply(manifest, trimmedContent);
    case "tax_legal_research":
      return buildTaxLegalResearchReply(manifest, trimmedContent);
    default: {
      const exhaustiveCheck: never = manifest.id;
      throw new Error(`unsupported bot: ${exhaustiveCheck}`);
    }
  }
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
git add apps/api/src/modules/chat/chat.service.ts apps/api/tests/cursive/cursive-service.spec.ts
git commit -m "feat: remove cursive chat runtime path"
```

### Task B2: Add doctrine-backed workflow metadata and controlled assertions

**Files:**
- Modify: `E:\REPOS\SGT_BOTS\apps\api\src\modules\cursive\cursive.repo.ts`
- Test: `E:\REPOS\SGT_BOTS\apps\api\tests\cursive\cursive-repo.spec.ts`

- [ ] **Step 1: Write the failing repository test**

```ts
import { describe, expect, it } from "vitest";
import { createCursiveRepo } from "../../src/modules/cursive/cursive.repo";

describe("createCursiveRepo", () => {
  it("returns the cross-bureau balance mismatch definition with controlled assertions", () => {
    const repo = createCursiveRepo();
    const violation = repo.getViolationDefinition("different_balances_across_bureaus");

    expect(violation?.doctrine).toBe("cross_bureau_inconsistency");
    expect(violation?.controlledAssertions.map((item) => item.label)).toContain(
      "This account is reported with inconsistent balances across bureaus",
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
corepack pnpm --filter ./apps/api test -- tests/cursive/cursive-repo.spec.ts
```

Expected:

```text
FAIL  repo.getViolationDefinition is not a function
```

- [ ] **Step 3: Replace the repo surface with violation metadata**

```ts
import type {
  CursiveControlledAssertion,
  CursiveEvidencePosture,
  CursiveViolationType,
} from "../../../../../packages/shared/src/contracts/cursive";

export type CursiveDoctrine =
  | "cross_bureau_inconsistency"
  | "single_bureau_inaccuracy_with_proof";

export type CursiveViolationDefinition = {
  doctrine: CursiveDoctrine;
  evidencePosture: CursiveEvidencePosture;
  id: CursiveViolationType;
  label: string;
  controlledAssertions: CursiveControlledAssertion[];
};

const VIOLATIONS: Record<CursiveViolationType, CursiveViolationDefinition> = {
  different_balances_across_bureaus: {
    doctrine: "cross_bureau_inconsistency",
    evidencePosture: "cross_bureau_inconsistency",
    id: "different_balances_across_bureaus",
    label: "Different balances across bureaus",
    controlledAssertions: [
      {
        id: "balance_inconsistency",
        label: "This account is reported with inconsistent balances across bureaus",
      },
    ],
  },
  different_delinquency_dates_across_bureaus: {
    doctrine: "cross_bureau_inconsistency",
    evidencePosture: "cross_bureau_inconsistency",
    id: "different_delinquency_dates_across_bureaus",
    label: "Different delinquency dates across bureaus",
    controlledAssertions: [
      {
        id: "date_inconsistency",
        label: "This account is reported with inconsistent delinquency dates across bureaus",
      },
    ],
  },
  incorrect_account_number_across_bureaus: {
    doctrine: "cross_bureau_inconsistency",
    evidencePosture: "cross_bureau_inconsistency",
    id: "incorrect_account_number_across_bureaus",
    label: "Incorrect account number across bureaus",
    controlledAssertions: [
      {
        id: "account_id_inconsistency",
        label: "This account is reported with conflicting account identifiers across bureaus",
      },
    ],
  },
  incorrect_creditor_name_across_bureaus: {
    doctrine: "cross_bureau_inconsistency",
    evidencePosture: "cross_bureau_inconsistency",
    id: "incorrect_creditor_name_across_bureaus",
    label: "Incorrect creditor or furnisher name across bureaus",
    controlledAssertions: [
      {
        id: "creditor_name_inconsistency",
        label: "This account is reported with conflicting creditor or furnisher names across bureaus",
      },
    ],
  },
  incorrect_payment_status_across_bureaus: {
    doctrine: "cross_bureau_inconsistency",
    evidencePosture: "cross_bureau_inconsistency",
    id: "incorrect_payment_status_across_bureaus",
    label: "Incorrect payment status across bureaus",
    controlledAssertions: [
      {
        id: "status_inconsistency",
        label: "This account is reported with inconsistent payment status across bureaus",
      },
    ],
  },
  open_closed_status_conflict_across_bureaus: {
    doctrine: "cross_bureau_inconsistency",
    evidencePosture: "cross_bureau_inconsistency",
    id: "open_closed_status_conflict_across_bureaus",
    label: "Open/closed status conflict across bureaus",
    controlledAssertions: [
      {
        id: "open_closed_inconsistency",
        label: "This account is reported with conflicting open and closed status across bureaus",
      },
    ],
  },
  incorrect_account_number: {
    doctrine: "single_bureau_inaccuracy_with_proof",
    evidencePosture: "single_bureau_inaccuracy_with_proof",
    id: "incorrect_account_number",
    label: "Incorrect account number",
    controlledAssertions: [
      {
        id: "no_account_with_reported_number",
        label: "I have no account with this reported account number",
      },
    ],
  },
  incorrect_creditor_name: {
    doctrine: "single_bureau_inaccuracy_with_proof",
    evidencePosture: "single_bureau_inaccuracy_with_proof",
    id: "incorrect_creditor_name",
    label: "Incorrect creditor or furnisher name",
    controlledAssertions: [
      {
        id: "no_account_with_reported_creditor",
        label: "I have no account with this reported creditor or furnisher",
      },
    ],
  },
  duplicate_creditor_or_collector_reporting: {
    doctrine: "single_bureau_inaccuracy_with_proof",
    evidencePosture: "single_bureau_inaccuracy_with_proof",
    id: "duplicate_creditor_or_collector_reporting",
    label: "Duplicate creditor or collector reporting",
    controlledAssertions: [
      {
        id: "duplicate_reporting",
        label: "These entries report the same underlying account more than once",
      },
    ],
  },
  incorrect_payment_status: {
    doctrine: "single_bureau_inaccuracy_with_proof",
    evidencePosture: "single_bureau_inaccuracy_with_proof",
    id: "incorrect_payment_status",
    label: "Incorrect payment status",
    controlledAssertions: [
      {
        id: "reported_status_inaccurate",
        label: "This reported payment status is inaccurate",
      },
    ],
  },
  closed_account_reported_as_open: {
    doctrine: "single_bureau_inaccuracy_with_proof",
    evidencePosture: "single_bureau_inaccuracy_with_proof",
    id: "closed_account_reported_as_open",
    label: "Closed account reported as open",
    controlledAssertions: [
      {
        id: "closed_but_open",
        label: "This account is being reported as open when it is closed",
      },
    ],
  },
  account_not_mine: {
    doctrine: "single_bureau_inaccuracy_with_proof",
    evidencePosture: "single_bureau_inaccuracy_with_proof",
    id: "account_not_mine",
    label: "Account not mine",
    controlledAssertions: [
      {
        id: "account_not_mine",
        label: "This account is not mine",
      },
    ],
  },
};

export function createCursiveRepo() {
  return {
    getViolationDefinition(violationType: CursiveViolationType) {
      return VIOLATIONS[violationType] ?? null;
    },
    listViolationDefinitions() {
      return Object.values(VIOLATIONS);
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```powershell
corepack pnpm --filter ./apps/api test -- tests/cursive/cursive-repo.spec.ts
```

Expected:

```text
PASS  apps/api/tests/cursive/cursive-repo.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/cursive/cursive.repo.ts apps/api/tests/cursive/cursive-repo.spec.ts
git commit -m "feat: add cursive violation metadata"
```

### Task B3: Add workflow-only Cursive routes for the wizard

**Files:**
- Modify: `E:\REPOS\SGT_BOTS\apps\api\src\app.ts`
- Modify: `E:\REPOS\SGT_BOTS\apps\api\src\modules\cursive\cursive.route.ts`
- Modify: `E:\REPOS\SGT_BOTS\apps\api\src\modules\cursive\cursive.service.ts`
- Test: `E:\REPOS\SGT_BOTS\apps\api\tests\e2e\cursive-workflow.spec.ts`

- [ ] **Step 1: Write the failing API workflow test**

```ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";
import { readEnv } from "../../src/config/env";

describe("Cursive workflow route", () => {
  it("returns the workflow-only entry metadata", async () => {
    const app = await buildApp({
      env: readEnv({
        APP_PORT: "3001",
        PROFILE_REPO_MODE: "memory",
        PROVIDER_VALIDATION_MODE: "stub",
        TELEGRAM_BOT_TOKEN: "test-token",
        TELEGRAM_BOT_USERNAME: "test_bot",
      }),
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/cursive/workflow/entry",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      modes: ["manual_dispute", "analyze_uploaded_report"],
      chatEnabled: false,
    });
  });
});
```

- [ ] **Step 2: Run the workflow test to verify it fails**

Run:

```powershell
corepack pnpm --filter ./apps/api test -- tests/e2e/cursive-workflow.spec.ts
```

Expected:

```text
FAIL  expected 404 to be 200
```

- [ ] **Step 3: Register the Cursive routes and add the entry response**

```ts
// apps/api/src/modules/cursive/cursive.service.ts
export function createCursiveService() {
  return {
    getWorkflowEntry() {
      return {
        chatEnabled: false,
        modes: ["manual_dispute", "analyze_uploaded_report"] as const,
      };
    },
  };
}
```

```ts
// apps/api/src/modules/cursive/cursive.route.ts
import type { FastifyInstance } from "fastify";
import { createCursiveService } from "./cursive.service";

export async function registerCursiveRoutes(app: FastifyInstance) {
  const cursiveService = createCursiveService();

  app.get("/api/cursive/workflow/entry", async (_request, reply) => {
    return reply.code(200).send(cursiveService.getWorkflowEntry());
  });
}
```

```ts
// apps/api/src/app.ts
import { registerCursiveRoutes } from "./modules/cursive/cursive.route";

// later in buildApp registration order
await registerCursiveRoutes(app);
```

- [ ] **Step 4: Run the workflow test to verify it passes**

Run:

```powershell
corepack pnpm --filter ./apps/api test -- tests/e2e/cursive-workflow.spec.ts
```

Expected:

```text
PASS  apps/api/tests/e2e/cursive-workflow.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app.ts apps/api/src/modules/cursive/cursive.route.ts apps/api/src/modules/cursive/cursive.service.ts apps/api/tests/e2e/cursive-workflow.spec.ts
git commit -m "feat: add cursive workflow entry route"
```

## Phase C Exit Metrics

- Selecting Cursive opens a full-screen wizard instead of a chat panel.
- Manual lane stepper, footer, timer, and mode/evidence/violation screens are working on mobile.
- The timer remains visible but subdued on the bot page.

### Task C1: Replace the Cursive chat surface with a full-screen workspace shell

**Files:**
- Create: `E:\REPOS\SGT_BOTS\apps\telegram-miniapp\src\features\cursive\CursiveWorkspace.tsx`
- Create: `E:\REPOS\SGT_BOTS\apps\telegram-miniapp\src\features\cursive\CursiveStepper.tsx`
- Create: `E:\REPOS\SGT_BOTS\apps\telegram-miniapp\src\features\cursive\CursiveFooter.tsx`
- Modify: `E:\REPOS\SGT_BOTS\apps\telegram-miniapp\src\features\dashboard\DashboardShell.tsx`
- Modify: `E:\REPOS\SGT_BOTS\apps\telegram-miniapp\src\features\chat\ChatPanel.tsx`
- Modify: `E:\REPOS\SGT_BOTS\apps\telegram-miniapp\src\app\app.css`
- Test: `E:\REPOS\SGT_BOTS\tests\e2e\cursive-workspace.spec.ts`

- [ ] **Step 1: Write the failing browser test**

```ts
import { expect, test } from "@playwright/test";

test("Cursive opens into a full-screen workflow shell with no chat composer", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:3000");
  await page.getByRole("button", { name: "Cursive" }).click();

  await expect(page.getByRole("heading", { name: "Cursive" })).toBeVisible();
  await expect(page.getByText("Choose how to begin")).toBeVisible();
  await expect(page.getByRole("button", { name: "Manual dispute" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Analyze uploaded report" })).toBeVisible();
  await expect(page.getByLabel("Chat input")).toHaveCount(0);
});
```

- [ ] **Step 2: Run the browser test to verify it fails**

Run:

```powershell
corepack pnpm test:e2e -- tests/e2e/cursive-workspace.spec.ts
```

Expected:

```text
FAIL  Expected heading "Cursive" in workflow shell
```

- [ ] **Step 3: Add the workspace shell and route Cursive into it**

```tsx
// apps/telegram-miniapp/src/features/cursive/CursiveWorkspace.tsx
import { CursiveFooter } from "./CursiveFooter";
import { CursiveStepper } from "./CursiveStepper";

export function CursiveWorkspace() {
  return (
    <section className="cursive-workspace">
      <header className="cursive-workspace__header">
        <div className="cursive-workspace__topline">
          <button className="secondary-button" type="button">
            Back to Playground
          </button>
          <h2>Cursive</h2>
        </div>
        <p className="eyebrow">Workflow only</p>
        <CursiveStepper
          currentStep={1}
          steps={["Mode", "Evidence", "Violation", "Details", "Review", "Results"]}
        />
      </header>
      <div className="cursive-workspace__body">
        <h3>Choose how to begin</h3>
        <div className="cursive-workspace__actions">
          <button className="primary-button" type="button">Manual dispute</button>
          <button className="secondary-button" type="button">
            Analyze uploaded report
          </button>
        </div>
      </div>
      <CursiveFooter
        primaryLabel="Next"
        secondaryLabel="Back"
        timeRemainingLabel="Playground time remaining"
        timeRemainingValue="02:59:59"
      />
    </section>
  );
}
```

```tsx
// apps/telegram-miniapp/src/features/cursive/CursiveStepper.tsx
type CursiveStepperProps = {
  currentStep: number;
  steps: string[];
};

export function CursiveStepper({ currentStep, steps }: CursiveStepperProps) {
  return (
    <ol className="cursive-stepper" aria-label="Cursive progress">
      {steps.map((step, index) => (
        <li
          className={index + 1 === currentStep ? "is-active" : ""}
          key={step}
        >
          <span>{index + 1}</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}
```

```tsx
// apps/telegram-miniapp/src/features/cursive/CursiveFooter.tsx
type CursiveFooterProps = {
  primaryLabel: string;
  secondaryLabel: string;
  timeRemainingLabel: string;
  timeRemainingValue: string;
};

export function CursiveFooter(input: CursiveFooterProps) {
  return (
    <footer className="cursive-footer">
      <div className="cursive-footer__actions">
        <button className="secondary-button" type="button">{input.secondaryLabel}</button>
        <button className="primary-button" type="button">{input.primaryLabel}</button>
      </div>
      <div className="cursive-footer__timer">
        <span>{input.timeRemainingLabel}</span>
        <strong>{input.timeRemainingValue}</strong>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Run the browser test to verify it passes**

Run:

```powershell
corepack pnpm test:e2e -- tests/e2e/cursive-workspace.spec.ts
```

Expected:

```text
PASS  tests/e2e/cursive-workspace.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/telegram-miniapp/src/features/cursive/CursiveWorkspace.tsx apps/telegram-miniapp/src/features/cursive/CursiveStepper.tsx apps/telegram-miniapp/src/features/cursive/CursiveFooter.tsx apps/telegram-miniapp/src/features/dashboard/DashboardShell.tsx apps/telegram-miniapp/src/features/chat/ChatPanel.tsx apps/telegram-miniapp/src/app/app.css tests/e2e/cursive-workspace.spec.ts
git commit -m "feat: add full-screen cursive workspace shell"
```

### Task C2: Add the manual lane mode, evidence, and violation steps

**Files:**
- Create: `E:\REPOS\SGT_BOTS\apps\telegram-miniapp\src\features\cursive\steps\CursiveModeStep.tsx`
- Create: `E:\REPOS\SGT_BOTS\apps\telegram-miniapp\src\features\cursive\steps\CursiveEvidenceStep.tsx`
- Create: `E:\REPOS\SGT_BOTS\apps\telegram-miniapp\src\features\cursive\steps\CursiveViolationStep.tsx`
- Modify: `E:\REPOS\SGT_BOTS\apps\telegram-miniapp\src\features\cursive\CursiveWorkspace.tsx`
- Test: `E:\REPOS\SGT_BOTS\tests\e2e\cursive-manual-lane.spec.ts`

- [ ] **Step 1: Write the failing browser test**

```ts
import { expect, test } from "@playwright/test";

test("manual lane walks through mode, evidence, and violation with button-driven choices", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:3000");
  await page.getByRole("button", { name: "Cursive" }).click();

  await page.getByRole("button", { name: "Manual dispute" }).click();
  await page.getByRole("button", { name: "Next" }).click();

  await expect(page.getByText("How are you documenting this issue?")).toBeVisible();
  await page.getByRole("button", {
    name: "Inconsistent reporting across bureaus",
  }).click();
  await page.getByRole("button", { name: "Next" }).click();

  await expect(page.getByText("Choose the inconsistency type")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Different balances across bureaus" }),
  ).toBeVisible();
});
```

- [ ] **Step 2: Run the browser test to verify it fails**

Run:

```powershell
corepack pnpm test:e2e -- tests/e2e/cursive-manual-lane.spec.ts
```

Expected:

```text
FAIL  Expected evidence step content
```

- [ ] **Step 3: Implement the first manual wizard screens**

```tsx
// apps/telegram-miniapp/src/features/cursive/steps/CursiveModeStep.tsx
type CursiveModeStepProps = {
  value: "manual_dispute" | "analyze_uploaded_report" | null;
  onChange: (value: "manual_dispute" | "analyze_uploaded_report") => void;
};

export function CursiveModeStep({ value, onChange }: CursiveModeStepProps) {
  return (
    <section className="cursive-step-screen">
      <h3>Choose how to begin</h3>
      <p className="muted-copy">
        Start from your own facts or let Cursive analyze a report.
      </p>
      <div className="cursive-choice-stack">
        <button
          className={value === "manual_dispute" ? "primary-button" : "secondary-button"}
          onClick={() => onChange("manual_dispute")}
          type="button"
        >
          Manual dispute
        </button>
        <button
          className={value === "analyze_uploaded_report" ? "primary-button" : "secondary-button"}
          onClick={() => onChange("analyze_uploaded_report")}
          type="button"
        >
          Analyze uploaded report
        </button>
      </div>
    </section>
  );
}
```

```tsx
// apps/telegram-miniapp/src/features/cursive/steps/CursiveEvidenceStep.tsx
type CursiveEvidenceStepProps = {
  value: "cross_bureau_inconsistency" | "single_bureau_inaccuracy_with_proof" | null;
  onChange: (
    value: "cross_bureau_inconsistency" | "single_bureau_inaccuracy_with_proof",
  ) => void;
};

export function CursiveEvidenceStep({ value, onChange }: CursiveEvidenceStepProps) {
  return (
    <section className="cursive-step-screen">
      <h3>How are you documenting this issue?</h3>
      <div className="cursive-choice-stack">
        <button
          className={value === "cross_bureau_inconsistency" ? "primary-button" : "secondary-button"}
          onClick={() => onChange("cross_bureau_inconsistency")}
          type="button"
        >
          Inconsistent reporting across bureaus
        </button>
        <button
          className={value === "single_bureau_inaccuracy_with_proof" ? "primary-button" : "secondary-button"}
          onClick={() => onChange("single_bureau_inaccuracy_with_proof")}
          type="button"
        >
          One bureau is reporting the item inaccurately and I have proof
        </button>
      </div>
    </section>
  );
}
```

```tsx
// apps/telegram-miniapp/src/features/cursive/steps/CursiveViolationStep.tsx
type CursiveViolationStepProps = {
  evidencePosture:
    | "cross_bureau_inconsistency"
    | "single_bureau_inaccuracy_with_proof";
  value: string | null;
  onChange: (value: string) => void;
};

const CROSS_BUREAU_OPTIONS = [
  "Different balances across bureaus",
  "Different delinquency dates across bureaus",
  "Incorrect account number across bureaus",
  "Incorrect creditor or furnisher name across bureaus",
  "Incorrect payment status across bureaus",
  "Open/closed status conflict across bureaus",
];

const SINGLE_BUREAU_OPTIONS = [
  "Incorrect account number",
  "Incorrect creditor or furnisher name",
  "Duplicate creditor or collector reporting",
  "Incorrect payment status",
  "Closed account reported as open",
  "Account not mine",
];

export function CursiveViolationStep(input: CursiveViolationStepProps) {
  const options =
    input.evidencePosture === "cross_bureau_inconsistency"
      ? CROSS_BUREAU_OPTIONS
      : SINGLE_BUREAU_OPTIONS;

  return (
    <section className="cursive-step-screen">
      <h3>
        {input.evidencePosture === "cross_bureau_inconsistency"
          ? "Choose the inconsistency type"
          : "Choose the reporting problem"}
      </h3>
      <div className="cursive-choice-stack">
        {options.map((option) => (
          <button
            className={input.value === option ? "primary-button" : "secondary-button"}
            key={option}
            onClick={() => input.onChange(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run the browser test to verify it passes**

Run:

```powershell
corepack pnpm test:e2e -- tests/e2e/cursive-manual-lane.spec.ts
```

Expected:

```text
PASS  tests/e2e/cursive-manual-lane.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/telegram-miniapp/src/features/cursive/steps/CursiveModeStep.tsx apps/telegram-miniapp/src/features/cursive/steps/CursiveEvidenceStep.tsx apps/telegram-miniapp/src/features/cursive/steps/CursiveViolationStep.tsx apps/telegram-miniapp/src/features/cursive/CursiveWorkspace.tsx tests/e2e/cursive-manual-lane.spec.ts
git commit -m "feat: add cursive manual lane entry steps"
```

## Phase D Exit Metrics

- Fixed-shell bureau removal-demand letters render through one shared template.
- Review/validation gate blocks forbidden language and doctrine drift.
- Cross-bureau issues can produce multiple bureau-specific letters.

### Task D1: Add the fixed-shell bureau removal-demand template

**Files:**
- Create: `E:\REPOS\SGT_BOTS\apps\api\src\modules\cursive\templates\bureau-removal-demand.html.ts`
- Create: `E:\REPOS\SGT_BOTS\apps\api\src\modules\cursive\cursive-template.service.ts`
- Test: `E:\REPOS\SGT_BOTS\apps\api\tests\cursive\bureau-removal-template.spec.ts`

- [ ] **Step 1: Write the failing template test**

```ts
import { describe, expect, it } from "vitest";
import { renderBureauRemovalDemandHtml } from "../../src/modules/cursive/templates/bureau-removal-demand.html";

describe("renderBureauRemovalDemandHtml", () => {
  it("renders the fixed removal-demand shell", () => {
    const html = renderBureauRemovalDemandHtml({
      bureauName: "Experian",
      consumerName: "Jane Doe",
      consumerAddressLines: ["123 Main Street", "Dallas, TX 75001"],
      demandBlock: "Remove this tradeline from your file and provide proof of deletion.",
      generatedDate: "May 19, 2026",
      issueSummary: "This account is reported with inconsistent balances across bureaus.",
      openingAuthority: "I dispute inaccurate reporting under the Fair Credit Reporting Act.",
      statuteCitations: ["15 U.S.C. § 1681i", "15 U.S.C. § 1681e(b)"],
      subjectLine: "Re: Demand for Removal of Inaccurately Reported Account Information",
      violationParagraph: "The same matched tradeline is reported with conflicting balances across bureaus.",
    });

    expect(html).toContain("Demand for Removal");
    expect(html).toContain("Experian");
    expect(html).toContain("15 U.S.C. § 1681i");
    expect(html).toContain("proof of deletion");
  });
});
```

- [ ] **Step 2: Run the template test to verify it fails**

Run:

```powershell
corepack pnpm --filter ./apps/api test -- tests/cursive/bureau-removal-template.spec.ts
```

Expected:

```text
FAIL  Cannot find module '../../src/modules/cursive/templates/bureau-removal-demand.html'
```

- [ ] **Step 3: Add the shared fixed-shell template**

```ts
export function renderBureauRemovalDemandHtml(input: {
  bureauName: string;
  consumerName: string;
  consumerAddressLines: string[];
  demandBlock: string;
  generatedDate: string;
  issueSummary: string;
  openingAuthority: string;
  statuteCitations: string[];
  subjectLine: string;
  violationParagraph: string;
}) {
  return `
  <html>
    <head>
      <style>
        @page { size: 8.5in 11in; margin: 0.75in; }
        body { font-family: "Times New Roman", serif; color: #111; }
      </style>
    </head>
    <body>
      <p>${input.consumerName}</p>
      ${input.consumerAddressLines.map((line) => `<p>${line}</p>`).join("")}
      <p>${input.generatedDate}</p>
      <p>${input.bureauName}</p>
      <h1>${input.subjectLine}</h1>
      <p>${input.openingAuthority}</p>
      <p>${input.issueSummary}</p>
      <p>${input.violationParagraph}</p>
      <p>${input.demandBlock}</p>
      <footer>${input.statuteCitations.join("<br />")}</footer>
    </body>
  </html>`;
}
```

- [ ] **Step 4: Run the template test to verify it passes**

Run:

```powershell
corepack pnpm --filter ./apps/api test -- tests/cursive/bureau-removal-template.spec.ts
```

Expected:

```text
PASS  apps/api/tests/cursive/bureau-removal-template.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/cursive/templates/bureau-removal-demand.html.ts apps/api/tests/cursive/bureau-removal-template.spec.ts
git commit -m "feat: add bureau removal demand template"
```

### Task D2: Add the doctrine validation gate

**Files:**
- Create: `E:\REPOS\SGT_BOTS\apps\api\src\modules\cursive\cursive-validation.service.ts`
- Test: `E:\REPOS\SGT_BOTS\apps\api\tests\cursive\cursive-validation.spec.ts`

- [ ] **Step 1: Write the failing validation test**

```ts
import { describe, expect, it } from "vitest";
import { validateCursiveLetter } from "../../src/modules/cursive/cursive-validation.service";

describe("validateCursiveLetter", () => {
  it("rejects letters that ask the bureau to verify the account", () => {
    expect(() =>
      validateCursiveLetter({
        doctrine: "cross_bureau_inconsistency",
        letterBody:
          "Please verify this account and correct it if needed after contacting the other bureau.",
      }),
    ).toThrow("forbidden verification language");
  });
});
```

- [ ] **Step 2: Run the validation test to verify it fails**

Run:

```powershell
corepack pnpm --filter ./apps/api test -- tests/cursive/cursive-validation.spec.ts
```

Expected:

```text
FAIL  Cannot find module '../../src/modules/cursive/cursive-validation.service'
```

- [ ] **Step 3: Add the doctrine validation helper**

```ts
const FORBIDDEN_PATTERNS = [
  /verify this account/iu,
  /correct it if needed/iu,
  /contacting the other bureau/iu,
  /one bureau is right/iu,
];

export function validateCursiveLetter(input: {
  doctrine: "cross_bureau_inconsistency" | "single_bureau_inaccuracy_with_proof";
  letterBody: string;
}) {
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(input.letterBody)) {
      throw new Error("forbidden verification language");
    }
  }

  if (!/proof of deletion/iu.test(input.letterBody)) {
    throw new Error("missing proof of deletion language");
  }

  return true;
}
```

- [ ] **Step 4: Run the validation test to verify it passes**

Run:

```powershell
corepack pnpm --filter ./apps/api test -- tests/cursive/cursive-validation.spec.ts
```

Expected:

```text
PASS  apps/api/tests/cursive/cursive-validation.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/cursive/cursive-validation.service.ts apps/api/tests/cursive/cursive-validation.spec.ts
git commit -m "feat: add cursive doctrine validation gate"
```

## Phase E Exit Metrics

- The repo includes a clear rollout path for GitHub and VPS correction.
- The current VPS can be updated without relying on the obsolete Cursive workflow.
- Docs explain the order: repo, GitHub, VPS.

### Task E1: Add rollout notes for repo, GitHub, and VPS correction

**Files:**
- Create: `E:\REPOS\SGT_BOTS\docs\superpowers\plans\2026-05-19-cursive-v2-rollout-notes.md`

- [x] **Step 1: Add rollout notes**

Rollout notes now live in `docs/superpowers/plans/2026-05-19-cursive-v2-rollout-notes.md`.

The current rollout checklist covers:

- local branch review and commit/push preparation before any VPS work
- the full local gate set: `git diff --check`, render-report worker spec, workspace tests, lint, workspace build, mini app build, and Playwright E2E
- the active Cursive workflow route, `/api/cursive/workflow/entry`
- Supabase migration/seed checks for the category engine
- VPS artifact/PDF smoke checks, with explicit warnings for ephemeral runtime artifacts and the in-memory render queue

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/2026-05-19-cursive-v2-rollout-notes.md
git commit -m "docs: add cursive v2 rollout notes"
```

## Self-Review

### Spec coverage

- workflow-only Cursive with no chat is covered by Phase B and Phase C
- manual lane and report-analysis lane entry logic is covered by Phase B and Phase C
- named stepper, sticky footer, and timer are covered by Phase C
- hard-coded doctrine and validation rules are covered by Phase B and Phase D
- fixed-shell template and artifact flow are covered by Phase D
- repo, GitHub, and VPS correction order is covered by Phase E

### Placeholder scan

- no `TODO` or `TBD` markers remain
- all tasks list concrete file paths
- code steps include concrete code blocks
- test steps include exact commands

### Type consistency

- `document_wizard` remains the bot id
- `manual_dispute` and `analyze_uploaded_report` are used consistently
- `cross_bureau_inconsistency` and `single_bureau_inaccuracy_with_proof` are used consistently
- `different_balances_across_bureaus` is used as the first canonical cross-bureau type

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-19-cursive-v2-redesign-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
