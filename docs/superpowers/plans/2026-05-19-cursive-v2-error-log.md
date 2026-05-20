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
