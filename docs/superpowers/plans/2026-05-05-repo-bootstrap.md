# Repository Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a local Git repository for `SGT_BOTS` with the baseline project documentation, contribution rules, and repository hygiene files needed to start building the Telegram playground safely.

**Architecture:** This bootstrap keeps the repository intentionally thin: documentation first, no premature application scaffolding, and a clean root structure that supports the approved design spec. The repo should clearly separate product docs, architecture docs, and future app code while establishing review, linting, and refactor expectations from day one.

**Tech Stack:** Git, Markdown, EditorConfig, Git ignore rules, repository governance docs

---

## Planned File Structure

- Root:
  - `.editorconfig` - shared whitespace, newline, and indentation rules
  - `.gitattributes` - line ending normalization
  - `.gitignore` - OS/editor/runtime ignore rules for the planned stack
  - `README.md` - project overview and navigation
  - `CONTRIBUTING.md` - contribution workflow, code review, linting, and refactor expectations
- Docs:
  - `docs/README.md` - documentation index
  - `docs/architecture/overview.md` - condensed system architecture summary
  - `docs/architecture/repository-structure.md` - intended repository layout and ownership
  - `docs/product/overview.md` - product purpose and linked design artifacts
  - `docs/operations/qa-and-release.md` - QA gates and release readiness rules
  - `docs/superpowers/specs/2026-05-05-telegram-playground-design.md` - existing approved design spec
  - `docs/superpowers/plans/2026-05-05-repo-bootstrap.md` - this implementation plan

### Task 1: Initialize the Git repository

**Files:**
- Create: `.git/` metadata via `git init -b main`
- Verify: `README.md` is still the repo entry document after init

- [ ] **Step 1: Initialize the repository with `main` as the default branch**

Run:

```powershell
git -C E:\REPOS\SGT_BOTS init -b main
```

Expected:

```text
Initialized empty Git repository in E:/REPOS/SGT_BOTS/.git/
```

- [ ] **Step 2: Verify Git sees the existing docs tree**

Run:

```powershell
git -C E:\REPOS\SGT_BOTS status --short
```

Expected:

```text
?? docs/
```

- [ ] **Step 3: Confirm the current branch name**

Run:

```powershell
git -C E:\REPOS\SGT_BOTS branch --show-current
```

Expected:

```text
main
```

### Task 2: Add repository hygiene files

**Files:**
- Create: `.editorconfig`
- Create: `.gitattributes`
- Create: `.gitignore`

- [ ] **Step 1: Create `.editorconfig`**

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

- [ ] **Step 2: Create `.gitattributes`**

```gitattributes
* text=auto eol=lf

*.png binary
*.jpg binary
*.jpeg binary
*.pdf binary
*.zip binary
```

- [ ] **Step 3: Create `.gitignore`**

```gitignore
# OS
.DS_Store
Thumbs.db
Desktop.ini

# Editors
.idea/
.vscode/
*.swp
*.swo

# Logs
*.log
logs/

# Env files
.env
.env.*
!.env.example

# Node
node_modules/
dist/
build/
.next/
.turbo/
coverage/
pnpm-lock.yaml
yarn-error.log
npm-debug.log*

# Python
__pycache__/
*.py[cod]
.pytest_cache/
.venv/
venv/

# Redis / queues / temp
tmp/
.tmp/

# Generated artifacts
artifacts/
uploads/
reports/
```

- [ ] **Step 4: Verify the new root files are visible to Git**

Run:

```powershell
git -C E:\REPOS\SGT_BOTS status --short
```

Expected:

```text
?? .editorconfig
?? .gitattributes
?? .gitignore
?? docs/
```

### Task 3: Add project-facing root documentation

**Files:**
- Create: `README.md`
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# SGT_BOTS

Telegram playground platform for showcasing specialized bots inside a Telegram mini app with BYOK onboarding, controlled bot permissions, and premium report generation.

## Current Status

This repository is in planning/bootstrap phase. The product design is written, the repository baseline is being established, and application code scaffolding is intentionally deferred until implementation planning is complete.

## Primary References

- Product design spec: `docs/superpowers/specs/2026-05-05-telegram-playground-design.md`
- Bootstrap plan: `docs/superpowers/plans/2026-05-05-repo-bootstrap.md`

## Planned Platform

- Telegram Bot + Telegram Mini App
- Supabase
- Redis / BullMQ
- LightRAG
- Hostinger VPS
- Optional n8n for initial onboarding only

## Repository Layout

- `docs/` - product, architecture, operational, and planning docs
- `apps/` - future deployable applications
- `packages/` - future shared packages
- `workers/` - future queue and background processing code

## Working Principles

- Code review is required for all substantive changes.
- Final code must be linted, tested, and refactored before release.
- Bot permissions and allowed actions must be policy-driven and never exposed to end users.
```

- [ ] **Step 2: Create `CONTRIBUTING.md`**

```markdown
# Contributing

## Workflow

1. Start from an updated local branch.
2. Review the relevant spec and plan documents before coding.
3. Make focused changes with clear boundaries.
4. Run linting and relevant automated tests.
5. Perform a refactor pass if the implementation grew during the change.
6. Submit the work for code review before merge.

## Review Standard

- Every code change must receive review.
- Review should prioritize behavior, policy enforcement, regressions, and test coverage.
- Changes that touch prompts, permissions, retrieval, uploads, or report generation need extra scrutiny.

## Quality Gates

- Lint clean
- Tests passing for the changed scope
- No debug leftovers
- No exposed secrets
- No user-facing leakage of system prompts, skills, or tool calls

## Documentation

- Update docs whenever architecture, behavior, onboarding, or operational expectations change.
- Keep product and architecture decisions in `docs/`.
```

- [ ] **Step 3: Verify the root docs render as plain text and are tracked**

Run:

```powershell
git -C E:\REPOS\SGT_BOTS status --short
```

Expected:

```text
?? .editorconfig
?? .gitattributes
?? .gitignore
?? CONTRIBUTING.md
?? README.md
?? docs/
```

### Task 4: Add documentation index and architecture summaries

**Files:**
- Create: `docs/README.md`
- Create: `docs/product/overview.md`
- Create: `docs/architecture/overview.md`
- Create: `docs/architecture/repository-structure.md`
- Create: `docs/operations/qa-and-release.md`

- [ ] **Step 1: Create `docs/README.md`**

```markdown
# Documentation Index

## Product

- `product/overview.md` - product purpose and delivery goals

## Architecture

- `architecture/overview.md` - high-level system design summary
- `architecture/repository-structure.md` - intended repository layout

## Operations

- `operations/qa-and-release.md` - quality and release expectations

## Planning

- `superpowers/specs/2026-05-05-telegram-playground-design.md` - approved design spec
- `superpowers/plans/2026-05-05-repo-bootstrap.md` - bootstrap implementation plan
```

- [ ] **Step 2: Create `docs/product/overview.md`**

```markdown
# Product Overview

SGT_BOTS is a Telegram mini app playground that lets users join a Telegram group, create a profile, connect their own LLM provider account, and test multiple specialized bots inside a shared premium UI.

The product exists to demonstrate bot capabilities, collect qualified user interest, and convert engaged users into a paid community.

The canonical product design is documented in `../superpowers/specs/2026-05-05-telegram-playground-design.md`.
```

- [ ] **Step 3: Create `docs/architecture/overview.md`**

```markdown
# Architecture Overview

The current design centers on a thin Telegram bot gateway, a Telegram mini app frontend, an application backend, Redis/BullMQ workers, Supabase for operational state, and LightRAG as the controlled retrieval layer.

Core architectural principles:

- Telegram is the entry point, not the full runtime surface.
- The mini app owns the user interaction experience.
- Every bot uses a shared runtime contract plus a capability manifest.
- BYOK is mandatory before any bot can be used.
- HTML templates are the source for professional PDF outputs.
```

- [ ] **Step 4: Create `docs/architecture/repository-structure.md`**

```markdown
# Repository Structure

## Current

- `docs/` - approved specs, plans, architecture notes, and operating guidance

## Reserved for implementation

- `apps/telegram-miniapp/` - future Telegram Web App frontend
- `apps/api/` - future backend API and Telegram webhook handlers
- `workers/queue/` - future BullMQ workers
- `packages/shared/` - future shared types, schemas, and policy helpers

New top-level directories should only be added when they support an implemented runtime boundary.
```

- [ ] **Step 5: Create `docs/operations/qa-and-release.md`**

```markdown
# QA and Release

## Required before release

- Code review completed
- Linting passes
- Relevant automated tests pass
- Manual validation completed for user-facing flows
- Security-sensitive changes reviewed carefully

## High-risk areas

- Telegram identity validation
- BYOK storage and validation
- Bot policy enforcement
- File uploads
- Retrieval grounding
- HTML-to-PDF rendering
- Session expiry and timer enforcement
```

- [ ] **Step 6: Verify the docs tree and repo status**

Run:

```powershell
Get-ChildItem -Recurse E:\REPOS\SGT_BOTS\docs
git -C E:\REPOS\SGT_BOTS status --short
```

Expected:

```text
docs tree includes README, architecture, operations, product, and superpowers folders
```

### Task 5: Stage the bootstrap baseline for future commit

**Files:**
- Modify: Git index only

- [ ] **Step 1: Stage the repository bootstrap files**

Run:

```powershell
git -C E:\REPOS\SGT_BOTS add .editorconfig .gitattributes .gitignore README.md CONTRIBUTING.md docs
```

Expected:

```text
No output
```

- [ ] **Step 2: Verify staged files**

Run:

```powershell
git -C E:\REPOS\SGT_BOTS status --short
```

Expected:

```text
A  .editorconfig
A  .gitattributes
A  .gitignore
A  CONTRIBUTING.md
A  README.md
A  docs/README.md
A  docs/architecture/overview.md
A  docs/architecture/repository-structure.md
A  docs/operations/qa-and-release.md
A  docs/product/overview.md
A  docs/superpowers/plans/2026-05-05-repo-bootstrap.md
A  docs/superpowers/specs/2026-05-05-telegram-playground-design.md
```
