# Cursive V2 Error Log

## Purpose

Track implementation and review errors so the same mistakes are not repeated in later phases.

## Entries

### 2026-05-19 - Superseded doc still looked executable

**Context:** Phase A, Task A1 review of the archived Cursive v1 plan and design docs.

**Problem:** The old implementation plan still contained active execution guidance near the top and bottom even after a superseded banner was added. A future reader could still skim it and mistakenly treat it as actionable.

**Fix applied:**

- strengthened the superseded banners in both the old design and old plan
- clarified that the 2026-05-19 redesign is a full replacement because Cursive architecture and scope changed
- changed the old plan's opening and closing guidance into archive-only warnings

**Rule going forward:** When superseding design or implementation docs, always neutralize any remaining runnable guidance, prompts, or execution handoff text.

### 2026-05-19 - Wrong `pnpm --filter` shape from repo root

**Context:** Phase A verification rerun for `packages/shared` contract tests.

**Problem:** Running:

```powershell
corepack pnpm --dir 'E:\REPOS\SGT_BOTS' --filter ./packages/shared test -- src/contracts/cursive.spec.ts
```

returned:

```text
No projects matched the filters in "E:\REPOS\SGT_BOTS"
```

**Fix applied:** Re-run from the repo root with the working filter form already used elsewhere in the repo:

```powershell
corepack pnpm --filter ./packages/shared test -- src/contracts/cursive.spec.ts
```

**Rule going forward:** If a package-targeted `pnpm --filter` command reports that no projects matched, stop and correct the filter form before retrying broader work.

### 2026-05-19 - Shared contract reset broke category-era API imports

**Context:** Phase B, Task B1 verification in `apps/api`.

**Problem:** After replacing the shared Cursive contract surface with workflow-only schemas, the old API-side Cursive modules still imported category-era exports such as `CURSIVE_CATEGORY_CATALOG` and `CursiveCategorySchema`. Running the targeted api test surfaced a broader module-load failure:

```text
TypeError: Cannot read properties of undefined (reading 'find')
at src/modules/cursive/cursive.repo.ts
```

Additional stale-contract fallout also appeared in schema tests that still expected removed shared exports.

**Fix direction:** Do not patch around the failure inside narrow chat tests. Replace the API-side Cursive repo/service/tests to align with the new workflow-only shared contracts.

**Rule going forward:** After changing shared contracts, immediately identify and update all downstream modules that import the replaced symbols before trusting targeted downstream test runs.

### 2026-05-19 - PowerShell rejected `&&` command chaining

**Context:** Phase B commit handoff from the Codex desktop shell.

**Problem:** A git stage-and-commit command reused `&&`, which this PowerShell host rejected:

```text
The token '&&' is not a valid statement separator in this version.
```

**Fix applied:** Re-run staging and commit as separate PowerShell-native commands instead of shell-style chaining.

**Rule going forward:** In this desktop PowerShell environment, avoid `&&` command joins and prefer separate commands or PowerShell-native sequencing.

### 2026-05-19 - Dashboard helper signature drift broke mini-app build

**Context:** Phase C mini-app shell integration.

**Problem:** A helper function in `DashboardShell.tsx` was refactored to accept a typed object, but the implementation signature was left as positional parameters. That broke Vitest, `tsc`, and Vite build on the same syntax line before any UI tests could run.

**Fix applied:** Converted the helper to a real destructured object parameter and re-ran the exact mini-app test, lint, and build gates.

**Rule going forward:** When changing a helper from positional args to an object contract, update both the function signature and all call sites before trusting green component tests.

### 2026-05-19 - Stale category-era mini-app files kept lint red after the shell cutover

**Context:** Phase C mini-app lint pass after Cursive moved to the new workspace shell.

**Problem:** `CursiveCategoryPicker.tsx` and `CursiveIntakeWizard.tsx` were no longer referenced by the active UI, but they still imported removed shared-contract exports. `tsc --noEmit` failed even though the new workspace path itself was correct.

**Fix applied:** Removed the unused category/intake files and their spec once the new shell fully replaced that path in `DashboardShell`.

**Rule going forward:** After a workflow cutover, immediately delete or quarantine dead UI files that still depend on retired shared contracts instead of leaving them to poison lint later.

### 2026-05-19 - Playwright startup exposed stale API Cursive contract imports

**Context:** Phase C browser E2E startup for the redesigned Cursive shell.

**Problem:** Playwright could not boot the API dev server because legacy modules still imported retired shared Cursive exports, first in `cursive-live-config.service.ts`, then in `cursive-review.service.ts` via the shared review schema boundary.

**Fix applied:** Replaced the live-config module with a compatibility service that preserves explicit env behavior while avoiding dead shared imports, and restored the minimal legacy shared contract exports needed for review/schema compatibility.

**Rule going forward:** Before calling a frontend phase complete, boot the full Playwright stack at least once; stale server-only imports may survive unit tests and only show up when the real app starts.

### 2026-05-19 - Preview/artifact routes still needed a category compatibility bridge

**Context:** Next pickup after Phase C, while driving `cursive-preview.spec.ts` and `cursive-artifacts.spec.ts` green.

**Problem:** The v2 repo reset correctly introduced workflow violation definitions, but legacy preview/draft/review callers still used `getCategoryConfig("credit_bureau_dispute")`. The first targeted preview/artifact runs collapsed into 500 responses because that compatibility method no longer existed. A second issue appeared in artifact failures: Cursive-safe failure-message sanitization was applied to every report template, which broke the older document-wizard upload test that expects the internal render error in service-level waits.

**Fix applied:**

- restored a narrow `credit_bureau_dispute` category config compatibility surface in `cursive.repo.ts`
- kept the v2 violation-definition repo surface intact
- scoped artifact failure-message sanitization to the Cursive credit-bureau PDF template only
- adjusted TypeScript compatibility types so API lint stays clean without re-enabling Cursive chat

**Rule going forward:** When migrating a route in stages, keep compatibility methods until every caller is moved to the new workflow object model. Scope user-safe error sanitization to the delivery lane that requires it instead of applying it globally.

### 2026-05-21 - Browser pass exposed stale launch data and CLI syntax traps

**Context:** Playwright CLI validation for the Cursive v2 mini-app preview/artifact/output lane.

**Problem:** The first browser pass reached Results, but follow-up validation after hot reload reused Telegram init data older than the five-minute validation window and correctly landed on `Launch Error`. Two local CLI mistakes also slowed validation: PowerShell rejected `&&` command chaining, and `playwright-cli screenshot` treated a bare Windows path as a selector unless passed with `--filename`.

**Fix applied:**

- generated fresh signed Telegram init data before rerunning the browser flow
- ran PowerShell commands separately instead of using `&&`
- captured screenshots with `playwright-cli screenshot --filename <path> --full-page`
- removed the generated `.playwright-cli` scratch directory after validation

**Rule going forward:** For Playwright runs that cross a hot reload or take several minutes, refresh signed Telegram init data before reopening the mini app. In PowerShell, avoid `&&`, and pass screenshot output paths through `--filename`.

### 2026-05-21 - Slow PDF e2e tests needed explicit timeout budgets

**Context:** Focused API rerun after Playwright verification of the Cursive output lane.

**Problem:** Running the Cursive preview/removal/artifact e2e files together made the quick negative tests execute after several slow PDF render cases. The route behavior was correct, but three tests still used Vitest's default 5-second timeout and failed under suite-level load.

**Fix applied:**

- added the same explicit `40000` timeout budget already used by neighboring PDF e2e cases to:
  - `apps/api/tests/e2e/cursive-preview.spec.ts`
  - `apps/api/tests/e2e/cursive-removal-demand.spec.ts`
  - `apps/api/tests/e2e/cursive-artifacts.spec.ts`
- reran the focused API suite and confirmed all 18 Cursive preview/removal/artifact tests passed

**Rule going forward:** When e2e files include PDF rendering or queue waits, give all tests in that flow an explicit timeout budget, including negative-path tests that may run after slow render cases.

### 2026-05-21 - Validation refactor changed a public error string

**Context:** Backend hardening for malformed Cursive v2 removal-demand input after code review.

**Problem:** Adding object-shape validation changed the cross-bureau missing-conflict error from `conflict facts are required` to `conflict facts is required`, breaking the focused template test and creating a less natural user-facing error.

**Fix applied:** Preserved the existing `conflict facts are required` message in the shared object guard and reran the focused template/removal-demand tests.

**Rule going forward:** When hardening validation, preserve existing user-facing error strings unless a test and product copy intentionally change them.

### 2026-05-21 - Playwright text match became ambiguous after output-lane success copy

**Context:** Updating `tests/e2e/cursive-credit-dispute.spec.ts` from shell-only coverage to full Cursive manual generation and artifact verification.

**Problem:** The E2E test looked for `PDF draft queued.` with a non-exact text locator. Once Results and the footer both contained queue-success copy, Playwright strict mode found two matches and failed even though the UI state was correct.

**Fix applied:** Changed the locator to `page.getByText("PDF draft queued.", { exact: true })` and reran the targeted Playwright test.

**Rule going forward:** When asserting short status text that can appear inside longer success copy, use exact text locators or role-based locators to avoid strict-mode ambiguity.

### 2026-05-21 - Artifact assertions matched duplicate historical/local rows

**Context:** Rerunning the Cursive Playwright artifact test after the first successful generation.

**Problem:** The test asserted `bureau-removal-demand-letter.pdf` by page text, and strict mode found more than one matching artifact title during repeated local runs. The UI still had a valid ready artifact, but the assertion was too broad for an output list that can contain multiple generated rows.

**Fix applied:** Scoped the assertion to the first `.artifact-card` containing the expected PDF name, then checked that same card for `Cursive - ready` and its `Download PDF` link. Also added a synchronous in-flight ref guard around Cursive generation so rapid double-submit cannot queue duplicate drafts before React state catches up.

**Rule going forward:** Artifact E2E assertions should scope to an artifact card or artifact id, not global page text. UI submit guards that protect server-side queueing need synchronous refs, not only React state.

### 2026-05-21 - Full API test exposed stale document-wizard chat expectations

**Context:** Full workspace test run after Cursive moved to workflow-only generation.

**Problem:** `apps/api/tests/cursive/cursive-prompt.spec.ts` and `apps/api/tests/e2e/bot-runtime.spec.ts` still expected `document_wizard` chat replies and older helper prompt copy. The current product rule is workflow-only Cursive with no chat surface, so the chat service correctly threw `cursive workflow only`, but the route returned it as a 500 and stale tests expected a 200 helper response.

**Fix applied:** Mapped `cursive workflow only` to a 409 chat-route response, updated stale prompt assertions to the current compatibility prompt/citation set, and updated document-wizard chat tests to expect workflow-only rejection instead of helper chat content.

**Rule going forward:** When a bot lane is intentionally removed from chat, update both service-level and route-level tests to assert the explicit blocked-chat contract, not legacy helper responses.

### 2026-05-21 - Legacy prompt test still expected the old dispute-helper instruction set

**Context:** Focused rerun of the stale Cursive prompt tests after changing document-wizard chat expectations.

**Problem:** The main prompt-package test still expected the old five-instruction credit-bureau dispute helper prompt, while the compatibility config now intentionally exposes the narrower removal-demand instruction set.

**Fix applied:** Updated the test expectation to the current three instruction lines: official intake only, no invented facts, demand removal and proof of deletion.

**Rule going forward:** When preserving a legacy compatibility surface for tests/routes, keep its tests aligned to the current narrowed Cursive doctrine instead of old helper-chat language.

### 2026-05-21 - Full Playwright suite exposed stale Cursive category and chat expectations

**Context:** Full E2E run after migrating the Cursive manual lane to workflow-only preview/save/output generation.

**Problem:** `tests/e2e/phase-3-bot-runtime.spec.ts` and `tests/e2e/phase-4-uploads-and-reports.spec.ts` still expected the old `Credit Bureau Dispute` category card, preview-card `Save PDF draft` button, and Cursive chat composer. The current lane starts at `Choose how to begin`, advances through `Manual dispute`, `Details`, `Review`, and queues the PDF with `Generate`.

**Fix applied:** Updated the stale specs to assert the workflow-only shell, no chat composer, no legacy upload/report controls, the manual details path, output-lane artifact card, and recoverable save/polling failures.

**Rule going forward:** Cursive E2E tests should follow the v2 workflow controls and must not assert legacy category cards or Cursive chat behavior.

### 2026-05-21 - Output artifact status can remain queued past Playwright's default timeout

**Context:** Targeted Playwright rerun of the updated phase-4 Cursive generation test.

**Problem:** The PDF artifact worker can take longer than Playwright's default 30-second test timeout to flip from queued to ready, even while the UI correctly shows the queued artifact and later exposes the download link.

**Fix applied:** Gave the generation test an explicit 70-second budget and asserted the user-facing artifact filename plus scoped `Download PDF` link instead of brittle status copy.

**Rule going forward:** For browser tests that wait on PDF rendering, set a test-level timeout and prefer the actionable download link as the readiness signal.

### 2026-05-21 - Cursive save failures render inline, not as ARIA alerts

**Context:** Updating the Cursive save-failure E2E after the workflow-shell migration.

**Problem:** The test expected `getByRole("alert")`, but the recoverable review-step save failure is rendered inline inside the Cursive workspace. The failure was visible and recoverable, but the role-based assertion was stale.

**Fix applied:** Asserted the visible failure text, the `Review the removal demand` heading, and the enabled `Generate` retry button.

**Rule going forward:** Match failure assertions to the component's actual accessibility contract. Use role locators only where the UI intentionally exposes that role.

### 2026-05-21 - Forbidden phrase regex matched valid "Incorrect" violation labels

**Context:** Review of the v2 bureau removal-demand template validation.

**Problem:** Forbidden patterns like `correct account number` could match valid labels such as `Incorrect account number across bureaus` because the regex was not word-boundary anchored.

**Fix applied:** Anchored the `correct account number`, `correct furnisher name`, and `correct payment status` patterns with word boundaries so valid `Incorrect ...` labels no longer self-reject.

**Rule going forward:** Test forbidden-language filters against the approved UI labels before relying on broad substring patterns.

### 2026-05-21 - Removal-demand save route needed preview-template integrity

**Context:** Review of the v2 removal-demand save endpoint.

**Problem:** The save route verified the preview token but did not confirm that the signed snapshot belonged to the `bureau_removal_demand` template, so another trusted Cursive preview token from the same session could reach the removal-demand save route.

**Fix applied:** Added a `templateSlug === "bureau_removal_demand"` snapshot guard before queueing the PDF and covered it with an API E2E rejection test.

**Rule going forward:** Every artifact save route should validate both token integrity and template/lane identity before queueing output.

### 2026-05-21 - Template validation still trusted TypeScript-only unions

**Context:** Final repo-specific review of the Cursive v2 removal-demand preview/artifact lane.

**Problem:** Direct API callers could send unknown `violationType` or `doctrine` values because the template validator relied on TypeScript types at the runtime boundary. A malformed request missing `enclosureLabels` could also throw a TypeError in the visible-text scan instead of returning a controlled validation error.

**Fix applied:** Added runtime validation for the shared Cursive violation enum, approved doctrine IDs, and enclosure label array shape. Added focused template tests for the malformed and unknown-value cases.

**Rule going forward:** Every externally supplied template discriminant or array used during rendering must be validated at runtime before mapping or spreading.

### 2026-05-21 - Review/retention e2e hit default timeout under full API load

**Context:** Final full `pnpm -r test` pass after Cursive v2 validation hardening.

**Problem:** `apps/api/tests/e2e/review-and-retention.spec.ts` had one provider/session-backed e2e test using Vitest's default 5-second timeout. The behavior completed in focused and prior runs, but under the full API suite it crossed the default budget and failed as a timeout.

**Fix applied:** Added an explicit `40000` timeout budget to the early-exit review prompt e2e, matching the pattern used for other session/PDF-backed API e2e tests.

**Rule going forward:** API e2e tests that build an app, create a profile, connect a provider, and then exercise a route should not rely on Vitest's default 5-second timeout.

### 2026-05-21 - Upload-analysis lane started mid-wired and broke miniapp types

**Context:** Enabling the Cursive uploaded-report analysis lane after the manual preview/artifact lane passed.

**Problem:** Adding upload-analysis state introduced new required props and state fields, but the server-rendered miniapp tests still built partial `CursiveWorkflowState` objects and `CursiveWorkspaceShell` was not yet passed the new upload handlers. `tsc` correctly failed before browser testing.

**Fix applied:** Added full default Cursive state in the component test helper, wired `onReportTypeSelect`, `onUploadAnalyze`, `onUploadFileChange`, and `onUploadIssueToggle` through the shell, and reran targeted miniapp lint/tests.

**Rule going forward:** When expanding wizard state, update test state factories and shell prop wiring in the same patch before trusting UI behavior.

### 2026-05-21 - Uploaded-report generation must not trust client issue payloads

**Context:** First upload-analysis API route implementation.

**Problem:** The initial generate route accepted client-supplied `confirmedIssues` and an arbitrary `uploadId`. That would let a caller queue a letter from facts not bound to the uploaded report.

**Fix applied:** Changed generation to accept `confirmedIssueIds`, load and validate the stored upload by id/session/bot, re-run server-side issue detection from the stored PDF bytes, and generate only matching confirmed issue ids. Added API E2E coverage for unknown upload ids.

**Rule going forward:** Upload-confirmation endpoints should treat the browser as a selector of server-detected issue ids, not as the source of issue facts.

### 2026-05-21 - Synthetic PDF address parsing lost the second address line

**Context:** First API E2E for tri-merge upload analysis.

**Problem:** The test PDF encoded the address with `|`, but the simple text scanner used `|` as a field delimiter, so only the first address line was captured.

**Fix applied:** Used semicolon-separated address lines in the fixture and allowed address parsing to split on `;` or `|`.

**Rule going forward:** For deterministic PDF-text fixtures, avoid reusing the same delimiter for both field separation and multi-line field values.

### 2026-05-21 - Upload lane full-suite run exposed more default timeout assumptions

**Context:** Full API test pass after adding upload-analysis E2E coverage.

**Problem:** Older preview/upload API E2E tests still relied on Vitest's 5-second default or too-tight PDF wait budgets. Under the larger suite, the behavior was correct but the tests timed out.

**Fix applied:** Added explicit timeout budgets to the slow preview happy path, document-wizard PDF render path, and large base64 upload path.

**Rule going forward:** Any API E2E that builds an app and processes a PDF or large base64 payload needs an explicit timeout, even if it is normally fast in isolation.

### 2026-05-21 - Manual Playwright artifact assertion still depended on status copy

**Context:** Full Playwright run after adding the upload-analysis browser E2E.

**Problem:** `tests/e2e/cursive-credit-dispute.spec.ts` still waited for `Cursive - ready` text. Under parallel browser load the artifact row remained queued longer than the default test timeout, even though the actionable download link is the user-facing readiness signal.

**Fix applied:** Gave the test a 70-second budget and asserted the scoped `Download PDF` link instead of internal status copy.

**Rule going forward:** Browser artifact tests should wait for the scoped download action, not status copy that can lag under worker load.

### 2026-05-21 - Full API suite required longer artifact wait budgets

**Context:** Full `pnpm -r test` after upload-analysis browser E2E passed.

**Problem:** Several artifact-producing API E2E tests had 30-second artifact wait budgets that were fine in isolation but timed out under the full API suite with multiple PDF render jobs.

**Fix applied:** Increased artifact wait/test budgets for Cursive artifact listing and upload-analysis generation, and added an explicit timeout to a provider-session app-build test that crossed Vitest's default under load.

**Rule going forward:** For full-suite stability, pair each PDF artifact wait budget with a larger test timeout and size it for parallel suite load, not the isolated happy path.

### 2026-05-21 - Upload-analysis review found line parsing and dead-lane risks

**Context:** Final repo-specific review of the Cursive uploaded-report analysis lane.

**Problem:** The text scanner collapsed newlines before applying field delimiters, so normal line-delimited report text could over-capture into the next label. The UI also exposed single-bureau upload as supported even though the current analyzer only emits tri-merge inconsistency issues. Back navigation used the same guards as Next navigation, which could make Back appear clickable but inert on incomplete steps.

**Fix applied:** Preserved normalized line breaks during upload text extraction, changed the API upload fixture to line-delimited text, scoped the upload UI copy/actions to tri-merge only for this phase, and applied step-completion guards only when moving forward. Added a miniapp state-machine test for Back from incomplete report/violation steps.

**Rule going forward:** Review fixtures should model the most likely extraction shape, incomplete future lanes should not be user-facing, and wizard Back navigation must remain available even when the current step is invalid for forward progress.

### 2026-05-22 - Single-bureau upload must not invent a target bureau

**Context:** Adding the supported single-bureau upload lane after the tri-merge upload lane passed.

**Problem:** The first narrow single-bureau detector defaulted a missing or unrecognized `Bureau:` field to Experian. That could silently generate a removal-demand letter to the wrong bureau when extraction misses the bureau label.

**Fix applied:** Added a red API E2E for missing target bureau, changed bureau normalization to return no issue unless Experian, Equifax, or TransUnion is explicitly detected, and kept proof-backed issue generation gated on both reported inaccuracy and proof text.

**Rule going forward:** Upload detectors may fall back for neutral display fields, but they must not infer legally material recipients such as target bureau names.

### 2026-05-22 - Single-bureau issue cards cannot assume conflict facts

**Context:** Re-enabling the `Single-bureau report` UI option in the uploaded-report lane.

**Problem:** The upload issue card rendered `issue.conflictFacts.conflictSummary` unconditionally. Single-bureau proof issues correctly use `proofFacts`, so the UI would crash or render blank proof details once the second upload lane became reachable.

**Fix applied:** Made upload issue `conflictFacts` optional, added optional `proofFacts`, rendered reported facts from conflict, proof, or reported value as appropriate, and added a DashboardShell unit test for proof-backed single-bureau issue rendering.

**Rule going forward:** Shared issue cards must render by doctrine/evidence shape, not by assuming every uploaded issue is cross-bureau.

### 2026-05-22 - Valid PDF fixtures expose raw text operators to the simple scanner

**Context:** Browser E2E for the single-bureau upload lane using a viewer-friendly PDF fixture.

**Problem:** The upload scanner reads fixture bytes as UTF-8 instead of running real PDF text extraction. Once the fixture was changed from a fake `%PDF-` stub to a valid uncompressed PDF, parsed field values could include PDF text operators such as `) Tj`.

**Fix applied:** Added scanner-level cleanup for simple PDF text strings and escaped parentheses, then tightened the Playwright assertions to use exact text where duplicate label/fact text appears.

**Rule going forward:** Until real PDF extraction exists, every viewer-friendly PDF fixture should be tested through browser upload, and field parsing must strip the minimal PDF string/operator syntax it relies on.

### 2026-05-22 - Unsupported single-bureau proof text over-classified as account-not-mine

**Context:** Final review of the single-bureau uploaded-report lane.

**Problem:** The first single-bureau classifier mapped any proof-backed issue that was not a closed/open status problem to `account_not_mine`. That could generate a materially wrong removal-demand letter from unsupported uploaded-report facts.

**Fix applied:** Added a red API E2E for unsupported single-bureau proof text, changed the classifier to return no issue unless a supported pattern is explicitly detected, and removed misleading address delimiter splitting that the current field matcher cannot actually receive.

**Rule going forward:** Narrow upload detectors should return no issue for unsupported fact patterns. Do not use a serious violation type as a generic fallback.

### 2026-05-22 - Single-bureau upload lane re-enabled and green

**Context:** Phase E documentation cleanup after manual, tri-merge upload, and single-bureau upload lanes passed local E2E.

**Problem:** Earlier error-log entries correctly said the upload UI was temporarily scoped to tri-merge because single-bureau detection did not exist yet. That historical note became stale once the single-bureau lane was implemented and re-enabled.

**Fix applied:** Kept the old entry as history, updated handoff/tasks/rollout docs to state that both upload report types are now supported, and recorded the current verification gate: manual, tri-merge upload, and single-bureau upload pass full Playwright E2E locally.

**Rule going forward:** When an error-log entry is superseded by later work, append a superseding note instead of rewriting the original mistake and recovery.

### 2026-05-22 - Rollout docs must match deployment code, not architecture assumptions

**Context:** Phase E rollout-readiness review.

**Problem:** The first rollout notes draft mixed current runtime facts with older or future assumptions: it listed `/api/cursive/workflow` instead of the actual `/api/cursive/workflow/entry`, treated Redis-related env as current, and did not call out that artifacts and render jobs are currently process/container local.

**Fix applied:** Corrected the route path, split current API env vars from reserved/future deployment keys, added Supabase migration/seed checks, documented the Playwright PDF render smoke test, and recorded current artifact and queue durability limits.

**Rule going forward:** Rollout docs should cite what the current code and compose files actually do. Future architecture notes belong in a separate limitations section, not in the required deployment checklist.

### 2026-05-22 - Full rollout gate exposed another default API E2E timeout

**Context:** Phase E local rollout gate using `corepack pnpm -r test`.

**Problem:** `apps/api/tests/e2e/bot-runtime.spec.ts` had a chat authorization negative-path test that builds an authorized session and then verifies missing bearer-token rejection. The behavior was correct, but under the full API suite it crossed Vitest's default 5-second timeout.

**Fix applied:** Added an explicit `40000` timeout budget to the chat post route bearer-token test, matching the timeout rule already used for other app-build/session-backed API E2E cases.

**Rule going forward:** Any API E2E that calls the shared authorized-session helper should have an explicit timeout budget, even when the asserted route itself is a fast negative path.

### 2026-05-22 - Final rollout review found sibling timeout and doc drift risks

**Context:** Final repo-specific review before closing Phase E rollout packaging.

**Problem:** The first timeout fix only covered the failing chat negative-path test, while sibling bot-runtime E2E cases used the same authorized-session helper without an explicit timeout budget. The handoff and implementation plan also had smaller stale rollout references than the dedicated rollout notes.

**Fix applied:** Added explicit `40000` timeout budgets to every bot-runtime E2E that calls the authorized-session helper, expanded the handoff pre-deploy gate list, and replaced the stale embedded rollout-note scaffold with a pointer to the current rollout notes.

**Rule going forward:** When a helper setup is the real source of flake risk, apply the test budget rule to every caller in the same suite. Rollout handoffs should link to the canonical checklist instead of keeping a second, abbreviated copy.

### 2026-05-22 - Backend container must include Playwright browser dependencies

**Context:** Local Docker rollout rehearsal before deploying Cursive v2 to VPS 2.

**Problem:** The backend image built on `node:22-alpine`, but Cursive PDF generation calls the Playwright renderer from the backend runtime. The first container smoke test failed because Chromium browser binaries were not present in the image.

**Fix applied:** Changed `Dockerfile.backend` to use `node:22-bookworm-slim` and install Playwright Chromium plus system dependencies during the image build. Verified the rebuilt backend image can render PDF bytes beginning with `%PDF-`.

**Rule going forward:** Any deployment that relies on server-side PDF generation must include a container-level PDF smoke test. API startup alone is not enough.

### 2026-05-22 - VPS 2 topology uses web-proxy and image-based SGT stack

**Context:** Read-only VPS 2 rollout inspection after Cursive v2 was merged.

**Problem:** The repo rollout files still referred to older service/container names and an external Docker network named `proxy`. The live VPS 2 Caddy config routes `playground.spyderbyte.cloud` to `sgt-bots-backend` and `sgt-bots-frontend` on the external `web-proxy` network, and the backend also needs the external `supabase_default` network to reach Supabase Kong.

**Fix applied:** Updated `docker-compose.vps.yml`, `Caddyfile`, and rollout notes to match the live VPS 2 service names and networks. Verified the public health endpoint works, the current live Cursive v2 entry route still returns `404` before deployment, and Supabase has the Cursive tables/seeded category state needed by the new backend.

**Rule going forward:** Before deploying from a checked-in compose file, compare it against the running container labels and Caddy service names on the target host. Do not assume local compose network names match VPS reality.

### 2026-05-23 - Production artifact existed but dashboard filtering could hide it

**Context:** VPS 2 post-rollout manual Cursive test.

**Problem:** The backend rendered the manual removal-demand PDF and marked the artifact `ready`, but the mini app could still show no visible output when the refreshed artifact's catalog name did not match the dashboard display label. The dashboard was filtering artifacts by `botName` text instead of the backend-owned `botId`.

**Fix applied:** Added `botId` to mini-app artifact state, preserved it from `/api/reports/artifacts`, tagged Cursive optimistic artifacts with `document_wizard`, and filtered dashboard workspace artifacts by `botId` with a text fallback for older local entries.

**Rule going forward:** Artifact ownership and visibility must key off stable ids such as `botId`, never display labels that may drift between catalog, menu, and refreshed API payloads.

### 2026-05-23 - Review CTA must not ship with placeholder Telegram URLs

**Context:** VPS 2 post-rollout review CTA test after the playground timer expired.

**Problem:** The session-end review button opened `https://t.me/your_review_group`, producing Telegram's "Username @your_review_group not found" popup. The placeholder existed in both the mini-app fallback and the API review prompt fallback, and the live compose env did not override it.

**Fix applied:** Replaced the fallback/default URL with the real invite link, updated `.env.example`, added Playwright assertions for the rendered review link href, pushed refreshed frontend/backend images, pulled them on VPS 2, and force-recreated both containers. The first remote deployment command also showed that this compose stack is image-based, so `docker compose build` on VPS 2 reports "No services to build"; future rollouts should build/push images first, then pull/recreate on VPS 2.

**Rule going forward:** User-facing external links need an E2E href assertion, not only visible button text. For VPS 2, treat the SGT stack as GHCR image-driven unless the compose file is intentionally changed.

### 2026-05-24 - Top Secret source expansion increased timeout surface

**Context:** Top Secret backend review-KB and source-retrieval phase.

**Problem:** Adding official U.S. Code candidates beside Cornell increased the number of live retrieval candidates for a single claim. The existing slow-source test used fake timers and assumed one candidate timeout, which exposed that sequential retrieval could multiply the timeout budget as source breadth grows.

**Fix applied:** Changed Top Secret live source retrieval to fetch candidate sources in parallel with per-source abort controllers, then retain successful bundles in candidate order with stable source ids. This keeps added court/currentness sources from making the route wait for every failed source sequentially.

**Rule going forward:** Whenever Top Secret adds a new retrieval candidate family, keep per-source timeout tests green and make sure source expansion does not linearly increase user-facing wait time.

### 2026-05-24 - Top Secret Encoding Cleanup Corrupted Nullish Coalescing

**Context:** Top Secret legal-citation parsing/currentness work.

**Problem:** A bulk character cleanup for section-symbol text risked changing TypeScript nullish coalescing (`??`) into a single `?`, which can break parser/runtime logic in subtle ways.

**Root cause:** Editing encoded text through a shell rewrite was too broad for source files that also contain TypeScript operators.

**Fix applied:** Restored the affected `??` operators, added CFR section-symbol coverage, and re-ran targeted API tests/lint.

**Rule going forward:** Use narrow patches for source edits. If an encoding cleanup is unavoidable, immediately scan for `??`, optional chaining, and run focused tests plus lint before continuing.

### 2026-05-24 - Top Secret PDF Copy Exposed Prompt Scaffolding

**Context:** Top Secret report language polish after reviewing generated finding copy.

**Problem:** Some user-visible report text could read like internal prompt machinery, including prefixes such as `Conclusion:` and `Common sense:`, plus tool narration like `Top Secret should...` or `Top Secret could...`. That makes the report sound biased or mechanical instead of evidence-led.

**Fix applied:** Added renderer-level cleanup for mechanical prefixes, softened section headings, removed tool narration from fallback findings, KB notes, and statute-analysis text, and expanded tests to reject scaffold phrases in rendered reports and fail-closed findings.

**Rule going forward:** Report output must read like a neutral finding for a human reader. Keep field names and JSON schema internal; never expose scaffold labels, prompt instructions, or tool self-narration in the PDF.

### 2026-05-24 - Top Secret Route E2E Needed PDF Timeout Budget

**Context:** Top Secret rollout gate before VPS 2 deployment prep.

**Problem:** The combined Top Secret report route test timed out at Vitest's 25-second test budget while waiting on session setup plus PDF rendering. The route and surrounding tests were passing, but this E2E lacked the explicit timeout budget already used by comparable PDF queue tests.

**Fix applied:** Increased the artifact wait budget to 30 seconds and the test budget to 40 seconds for `apps/api/tests/e2e/top-secret-report.spec.ts`.

**Rule going forward:** Any API E2E that creates a PDF artifact should have an explicit test timeout and artifact wait budget sized like the Cursive PDF queue tests.

### 2026-05-24 - Top Secret Concurrency Is A Rollout Blocker

**Context:** VPS 2 readiness review for Top Secret after the mini app and report flow passed controlled smoke tests.

**Problem:** Sequential Top Secret report tests pass, and artifact ids are scoped by session/user ownership, but production concurrency is not hardened. The current report queue is process-local/in-memory and PDF rendering uses Playwright/Chromium. Parallel PDF-heavy execution can contend for local renderer resources, and queued work is not restart-safe.

**Fix applied:** Documented Top Secret as blocked from broad VPS/Telegram rollout until durable queueing, renderer concurrency limits, retry/failure status, restart-safe job state, and simultaneous-user PDF isolation tests are implemented.

**Rule going forward:** Do not treat a successful single-user Telegram smoke as production readiness for report-generating bots. A report bot is rollout-ready only after its queue behavior has been tested under simultaneous users and container restart/failure conditions.
