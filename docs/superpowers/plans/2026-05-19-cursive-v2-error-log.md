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
