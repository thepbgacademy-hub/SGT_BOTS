# Role: QC Reviewer

You are the build-crew QC REVIEWER: a fresh, independent set of eyes with deliberately blank context. You know NOTHING about this build except what follows this prompt: a diff, the ticket's acceptance criteria, and the project's standards. That blindness is your value — do not ask for more context; review what is in front of you.

You report ONLY to the Orchestrator. One review, then you are done.

## Review the diff for

1. **Correctness** — bugs, broken edge cases, wrong logic, race conditions. For each: the concrete failure scenario (inputs → wrong outcome), not a vibe.
2. **Acceptance fit** — does the diff actually satisfy each acceptance criterion? Check them one by one; name any criterion the diff does not visibly meet.
3. **Scope** — changes outside what the acceptance criteria require. Name every file touched that the criteria don't explain.
4. **Bloat** — dead code, needless abstraction, duplicated logic, dependencies added for trivial gains.
5. **Hallucination** — calls to functions/APIs/config that the diff neither defines nor imports from something real. Flag anything you cannot see defined.
6. **Safety** — secrets in code, injection risks, silently swallowed errors.

## Report format (your final output)

- `VERDICT: pass` or `VERDICT: findings`
- Numbered findings, most severe first. Each: file, location, the defect in one sentence, the concrete failure scenario, suggested severity (blocker / should-fix / nit).
- Unverifiable-from-the-diff concerns go in a separate `UNVERIFIED:` list — claims you could not check are labeled as such, never presented as findings.

Do not soften findings to be agreeable, and do not invent findings to seem thorough. An honest `VERDICT: pass` is a valid review.

---

# TASK-012 QC Review

## Ticket acceptance criteria

TASK-012 is a housekeeping ticket with four items:

1. **Dead code removal.**
   (a) Remove the dead `ArtifactList` component. NOTE: the originating audit said
   "remove dead ArtifactList.tsx", but the file also exports `ArtifactListItem`, a type
   with four live importers (TopSecretWorkspace, DashboardShell, BotSupportPanel,
   ChatPanel). The adjudicated directive was: remove the component + props type, KEEP
   the file and the type export.
   (b) Remove the unreachable `buildCreditBureauDisputeHelperReply` from
   `cursive.service.ts` and the four tests that exercised it. It had zero production
   callers (Cursive chat 409s before persona load).

2. **Stray artifacts.** Delete inventoried root-level deploy tarballs/zips,
   `tmp-rori-*` files, and the `.deploy-src/` mirror (~3.3 GB). Gitignore `.deploy-images/`
   (~4.9 GB) but do NOT delete it. Add `.gitignore` entries so the deleted categories
   cannot silently reappear untracked. Deletions must not touch `BLUEPRINT-2026-07-20.md`,
   `CLAUDE.md`, `.buildwork/`, `Dockerfile.backend.hotfix`, or anything under
   `apps/`/`packages/`/`docs/`.

3. **Relax the 1-second session polling.** Relax ONLY the network session-refresh poll
   in `DashboardShell.tsx`. A separate local 1000ms countdown ticker feeds
   `remainingSeconds`, which drives low-time nudges at the 600s and 120s boundaries —
   nudge behavior must survive. Chosen interval: 8000ms.

4. **Fix the `apps/api/.runtime-artifacts` test-isolation flake.** Test files raced on a
   single shared directory (`path.resolve(process.cwd(), ".runtime-artifacts")`) via
   `hydrateArtifactsFromDisk`, causing intermittent ENOENT. The fix must be
   **test-infrastructure-scoped**: do NOT redesign the runtime artifact store, the
   in-memory Map, the queue, or retention/purge logic. Production behavior must be
   byte-identical when no override and no env var are set.

## Project standards

- TypeScript, ESM, strict `tsc --noEmit` as the linter for both packages.
- No secret VALUES anywhere — env-var names only.
- Tests: vitest. API suite from `apps/api`, mini app suite from `apps/telegram-miniapp`.
- Do not edit `HANDOFF.md`, `TASKS.md`, or the 2026-07-10 roadmap doc (historical).

## Scope note — read carefully

The working tree also contains TASK-010 and TASK-011 changes that are **already
signed off** and are NOT part of this review. The diff below has been frozen to exclude
them. In particular, `DashboardShell.tsx` is shared: only the single `1000` → `8000`
hunk shown belongs to this ticket. Do not flag the rest of that file.

## The diff

### TASK-012 frozen diff (signed-off TASK-010/TASK-011 changes EXCLUDED)

### Tracked files changed by TASK-012
diff --git a/.gitignore b/.gitignore
index e45852e..fc808e7 100644
--- a/.gitignore
+++ b/.gitignore
@@ -56,3 +56,11 @@ playwright-report/
 
 # Local worktrees
 .worktrees/
+
+# Deploy scratch bundles / snapshots
+/*.tar
+/*.tar.gz
+/*.zip
+/tmp-rori-*
+/.deploy-src/
+/.deploy-images/
diff --git a/apps/api/src/modules/cursive/cursive.service.ts b/apps/api/src/modules/cursive/cursive.service.ts
index 20439b5..649ed36 100644
--- a/apps/api/src/modules/cursive/cursive.service.ts
+++ b/apps/api/src/modules/cursive/cursive.service.ts
@@ -157,69 +157,6 @@ export function getMissingCreditBureauDisputeIntakeFieldLabels(
   );
 }
 
-function formatFieldLabelList(labels: string[]) {
-  if (labels.length === 0) {
-    return "";
-  }
-
-  if (labels.length === 1) {
-    return labels[0];
-  }
-
-  if (labels.length === 2) {
-    return `${labels[0]} and ${labels[1]}`;
-  }
-
-  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
-}
-
-function formatCreditBureauAddressSummary(address: CursiveRepoAddress) {
-  return `${address.organizationName} (${formatCityStatePostal(address)})`;
-}
-
-function looksLikeCreditBureauDisputeIntent(userGoal: string) {
-  const normalizedGoal = userGoal.trim().toLowerCase();
-
-  const disputeSignals = [
-    "credit bureau",
-    "bureau dispute",
-    "dispute letter",
-    "credit dispute",
-    "late payment",
-    "charge off",
-    "charge-off",
-    "inaccurate",
-    "incorrect",
-    "wrong balance",
-    "not mine",
-    "not my account",
-    "remove this",
-    "delete this",
-    "reinvestigate",
-  ];
-  const bureauSignals = ["experian", "equifax", "transunion"];
-
-  return (
-    disputeSignals.some((keyword) => normalizedGoal.includes(keyword)) ||
-    bureauSignals.some((keyword) => normalizedGoal.includes(keyword))
-  );
-}
-
-function looksLikeGreeting(userGoal: string) {
-  return /^(hi|hello|hey|good morning|good afternoon|good evening)\b/iu.test(
-    userGoal.trim(),
-  );
-}
-
-function looksLikeGeneralQuestion(userGoal: string) {
-  const normalizedGoal = userGoal.trim().toLowerCase();
-
-  return (
-    normalizedGoal.includes("?") ||
-    /^(what|how|can|could|should|why|when|where|who)\b/iu.test(normalizedGoal)
-  );
-}
-
 export function createCursiveService(deps?: {
   cursiveRepo?: ReturnType<typeof createCursiveRepo>;
   cursiveDraftService?: ReturnType<typeof createCursiveDraftService>;
@@ -248,31 +185,6 @@ export function createCursiveService(deps?: {
       };
     },
     isHelperOnlyBot,
-    buildCreditBureauDisputeHelperReply(userGoal: string) {
-      const config = getDefaultConfig();
-      const citationList = formatFieldLabelList(
-        config.citations.map((citation) => citation.citationText),
-      );
-      const bureauList = formatFieldLabelList(
-        config.addresses.map((address) => address.organizationName),
-      );
-      const addressList = formatFieldLabelList(
-        config.addresses.map(formatCreditBureauAddressSummary),
-      );
-      if (looksLikeGreeting(userGoal)) {
-        return `Hi. I'm Cursive, and I can help you think through a ${config.category.displayName} before you start the official letter. Ask me what to gather, how to describe the inaccuracy, or which bureau should receive the dispute. When you're ready to build the real letter, tap Start official letter.`;
-      }
-
-      if (looksLikeGeneralQuestion(userGoal) && !looksLikeCreditBureauDisputeIntent(userGoal)) {
-        return `I can help answer questions about ${config.category.displayName} letters, including what details matter, how bureau disputes usually work, and what kind of wording makes the issue clear and factual. I'll keep the guidance grounded in ${citationList}. When you want to move from questions into the real document flow, tap Start official letter.`;
-      }
-
-      if (!looksLikeCreditBureauDisputeIntent(userGoal)) {
-        return `Cursive currently supports ${config.category.displayName} letters. "${userGoal}" does not look like a credit-bureau dispute request yet, but I can still help you think it through. A good place to start is understanding which bureau (${bureauList}) is involved, what reporting item seems wrong, and what outcome you want. When you're ready to build the actual letter, tap Start official letter.`;
-      }
-
-      return `That sounds like a possible ${config.category.displayName}. I can help you clarify the situation before we start the official letter, explain what details usually matter, and help you word the issue clearly without overstating it. I'll keep the guidance grounded in ${citationList} and the seeded mailing addresses for ${addressList}. When you're ready to move into the official document flow, tap Start official letter.`;
-    },
     buildCreditBureauDisputeTemplateInput(
       intake: CreditBureauDisputeOfficialIntake,
       options?: {
diff --git a/apps/api/src/modules/reports/report.service.ts b/apps/api/src/modules/reports/report.service.ts
index a182040..02babc7 100644
--- a/apps/api/src/modules/reports/report.service.ts
+++ b/apps/api/src/modules/reports/report.service.ts
@@ -99,13 +99,18 @@ const ARTIFACT_RETENTION_MS = 6 * 60 * 60 * 1000;
 
 export function createReportService(deps: {
   analyticsService: ReturnType<typeof createAnalyticsService>;
+  artifactRoot?: string;
   now?: () => number;
   reportQueue: ReturnType<typeof createInMemoryReportQueue>;
   uploadService: ReturnType<typeof createUploadService>;
 }) {
   const artifacts = new Map<string, ArtifactRecord>();
   const now = deps.now ?? (() => Date.now());
-  const artifactRoot = path.resolve(process.cwd(), ".runtime-artifacts");
+  const artifactRoot = path.resolve(
+    deps.artifactRoot ??
+      process.env.RUNTIME_ARTIFACTS_ROOT ??
+      path.join(process.cwd(), ".runtime-artifacts"),
+  );
 
   function ensureArtifactDirectory(filePath: string) {
     fs.mkdirSync(path.dirname(filePath), { recursive: true });
diff --git a/apps/api/tests/cursive/cursive-prompt.spec.ts b/apps/api/tests/cursive/cursive-prompt.spec.ts
index 4269ffe..7b0bcc3 100644
--- a/apps/api/tests/cursive/cursive-prompt.spec.ts
+++ b/apps/api/tests/cursive/cursive-prompt.spec.ts
@@ -5,7 +5,6 @@ import {
   composeCreditBureauDisputeDraftContent,
 } from "../../src/modules/cursive/cursive-prompt.service";
 import { createCursiveRepo } from "../../src/modules/cursive/cursive.repo";
-import { createCursiveService } from "../../src/modules/cursive/cursive.service";
 import type { BotManifest } from "../../../../packages/shared/src/bots/manifests";
 
 const cursiveRepo = createCursiveRepo();
@@ -247,63 +246,6 @@ describe("buildCursivePromptPackage", () => {
 });
 
 describe("createChatService", () => {
-  it("keeps unrelated helper prompts bounded to the active credit dispute lane", () => {
-    const cursiveService = createCursiveService();
-
-    const reply = cursiveService.buildCreditBureauDisputeHelperReply(
-      "Draft a launch brief for tomorrow.",
-    );
-
-    expect(reply).toContain(
-      "Cursive currently supports Credit Bureau Dispute letters",
-    );
-    expect(reply).toContain(
-      "does not look like a credit-bureau dispute request yet",
-    );
-    expect(reply).toContain("tap Start official letter");
-    expect(reply).not.toContain(
-      'I can help with a Credit Bureau Dispute in helper-only mode for "Draft a launch brief for tomorrow."',
-    );
-  });
-
-  it("does not treat generic account wording as enough to enter the dispute drafting path", () => {
-    const cursiveService = createCursiveService();
-
-    const reply = cursiveService.buildCreditBureauDisputeHelperReply(
-      "Help me reconcile my account balance.",
-    );
-
-    expect(reply).toContain(
-      "does not look like a credit-bureau dispute request yet",
-    );
-    expect(reply).not.toContain(
-      "I can help shape this Credit Bureau Dispute request",
-    );
-  });
-
-  it("answers greetings conversationally instead of pushing intake immediately", () => {
-    const cursiveService = createCursiveService();
-
-    const reply = cursiveService.buildCreditBureauDisputeHelperReply("hello");
-
-    expect(reply).toContain("Hi. I'm Cursive");
-    expect(reply).toContain("Ask me what to gather");
-    expect(reply).toContain("tap Start official letter");
-    expect(reply).not.toContain("send Consumer name");
-  });
-
-  it("answers general process questions without jumping straight into form capture", () => {
-    const cursiveService = createCursiveService();
-
-    const reply = cursiveService.buildCreditBureauDisputeHelperReply(
-      "What can you help me with here?",
-    );
-
-    expect(reply).toContain("I can help answer questions");
-    expect(reply).toContain("tap Start official letter");
-    expect(reply).not.toContain("send Consumer name");
-  });
-
   it("does not leave behind a new document_wizard conversation when reply generation fails", async () => {
     const buildRuntimeReply: (
       manifest: BotManifest,
diff --git a/apps/api/tests/reports/report.service.spec.ts b/apps/api/tests/reports/report.service.spec.ts
index ffc5833..362c9ae 100644
--- a/apps/api/tests/reports/report.service.spec.ts
+++ b/apps/api/tests/reports/report.service.spec.ts
@@ -1,26 +1,20 @@
 import fs from "node:fs";
 import os from "node:os";
 import path from "node:path";
-import { afterEach, describe, expect, it } from "vitest";
+import { describe, expect, it } from "vitest";
 import { createAnalyticsService } from "../../src/modules/analytics/analytics.service";
 import { createReportService } from "../../src/modules/reports/report.service";
 import { createUploadService } from "../../src/modules/uploads/upload.service";
 
-const originalCwd = process.cwd();
-
-afterEach(() => {
-  process.chdir(originalCwd);
-});
-
 describe("createReportService", () => {
   it("hydrates queued artifact metadata and rendered files from disk", async () => {
-    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cursive-artifacts-"));
-    process.chdir(tempRoot);
+    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cursive-artifacts-"));
 
     const analyticsService = createAnalyticsService();
     const uploadService = createUploadService();
     const reportService = createReportService({
       analyticsService,
+      artifactRoot,
       reportQueue: {
         enqueueRenderReportJob(input) {
           return {
@@ -65,6 +59,7 @@ describe("createReportService", () => {
 
     const rehydratedService = createReportService({
       analyticsService: createAnalyticsService(),
+      artifactRoot,
       reportQueue: {
         enqueueRenderReportJob(input) {
           return {
@@ -97,13 +92,13 @@ describe("createReportService", () => {
   });
 
   it("replaces older Top Secret artifacts for the same session and user", () => {
-    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "top-secret-artifacts-"));
-    process.chdir(tempRoot);
+    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), "top-secret-artifacts-"));
 
     const analyticsService = createAnalyticsService();
     const uploadService = createUploadService();
     const reportService = createReportService({
       analyticsService,
+      artifactRoot,
       reportQueue: {
         enqueueRenderReportJob(input) {
           return {
@@ -167,11 +162,11 @@ describe("createReportService", () => {
   });
 
   it("builds a safe personalized Top Secret filename", () => {
-    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "top-secret-name-"));
-    process.chdir(tempRoot);
+    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), "top-secret-name-"));
 
     const reportService = createReportService({
       analyticsService: createAnalyticsService(),
+      artifactRoot,
       reportQueue: {
         enqueueRenderReportJob(input) {
           return {
@@ -200,14 +195,14 @@ describe("createReportService", () => {
   });
 
   it("purges artifacts older than six hours when hydrating from disk", () => {
-    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-retention-"));
-    process.chdir(tempRoot);
+    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-retention-"));
 
     const createdAt = new Date("2026-05-31T00:00:00.000Z").getTime();
     const cleanupAt = createdAt + 6 * 60 * 60 * 1000 + 1;
 
     const reportService = createReportService({
       analyticsService: createAnalyticsService(),
+      artifactRoot,
       now: () => createdAt,
       reportQueue: {
         enqueueRenderReportJob(input) {
@@ -247,6 +242,7 @@ describe("createReportService", () => {
 
     const rehydratedService = createReportService({
       analyticsService: createAnalyticsService(),
+      artifactRoot,
       now: () => cleanupAt,
       reportQueue: {
         enqueueRenderReportJob(input) {
diff --git a/apps/telegram-miniapp/src/features/artifacts/ArtifactList.tsx b/apps/telegram-miniapp/src/features/artifacts/ArtifactList.tsx
index 1a91049..7158dfe 100644
--- a/apps/telegram-miniapp/src/features/artifacts/ArtifactList.tsx
+++ b/apps/telegram-miniapp/src/features/artifacts/ArtifactList.tsx
@@ -11,45 +11,3 @@ export type ArtifactListItem = {
   status: "queued" | "ready" | "failed";
   originalFilename: string;
 };
-
-type ArtifactListProps = {
-  artifacts: ArtifactListItem[];
-};
-
-export function ArtifactList({ artifacts }: ArtifactListProps) {
-  return (
-    <section className="panel artifact-panel">
-      <header className="panel-header">
-        <div>
-          <p className="eyebrow">Output</p>
-          <h2>Reports</h2>
-        </div>
-      </header>
-      {artifacts.length ? (
-        <ul className="artifact-list">
-          {artifacts.map((artifact) => (
-            <li className="artifact-card" key={artifact.id}>
-              <p className="artifact-title">{artifact.fileName}</p>
-              <p className="artifact-meta">
-                {artifact.botName} - {artifact.status}
-              </p>
-              <p className="artifact-source">Source: {artifact.originalFilename}</p>
-              {artifact.failureReason ? (
-                <p className="alert-banner">{artifact.failureReason}</p>
-              ) : null}
-              {artifact.downloadUrl ? (
-                <p className="artifact-actions">
-                  <a className="secondary-button" href={artifact.downloadUrl}>
-                    Download PDF
-                  </a>
-                </p>
-              ) : null}
-            </li>
-          ))}
-        </ul>
-      ) : (
-        <p className="muted-copy">No reports queued yet.</p>
-      )}
-    </section>
-  );
-}

### DashboardShell.tsx — TASK-012 hunk ONLY (rest of file is signed-off TASK-011 work)
--- a/apps/telegram-miniapp/src/features/dashboard/DashboardShell.tsx
+++ b/apps/telegram-miniapp/src/features/dashboard/DashboardShell.tsx
@@ -1218,7 +1219,7 @@ (inside the session-refresh useEffect)
       } catch {
         setSessionError("Unable to refresh provider session.");
       }
-    }, 1000);
+    }, 8000);
 
     return () => {
       window.clearInterval(intervalId);

### NEW FILE: apps/api/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./tests/setup/runtime-artifacts.ts"],
  },
});

### NEW FILE: apps/api/tests/setup/runtime-artifacts.ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll } from "vitest";

let artifactRootDir: string | undefined;

beforeAll(() => {
  artifactRootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "sgt-bots-runtime-artifacts-"),
  );
  process.env.RUNTIME_ARTIFACTS_ROOT = artifactRootDir;
});

afterAll(() => {
  delete process.env.RUNTIME_ARTIFACTS_ROOT;

  if (artifactRootDir) {
    fs.rmSync(artifactRootDir, { recursive: true, force: true });
  }
});
