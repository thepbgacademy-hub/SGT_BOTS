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
