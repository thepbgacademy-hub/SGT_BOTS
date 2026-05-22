# Handoff

## Current Repo

- Working repo: `E:\REPOS\SGT_BOTS`
- Active branch: `codex/cursive-phase-a`
- Source repo: `https://github.com/thepbgacademy-hub/SGT_BOTS`
- Current branch is the source of truth for the resumed Cursive build

## Read These First

1. `E:\REPOS\SGT_BOTS\HANDOFF.md`
2. `E:\REPOS\SGT_BOTS\TASKS.md`
3. `E:\REPOS\SGT_BOTS\docs\superpowers\specs\2026-05-19-cursive-v2-redesign.md`
4. `E:\REPOS\SGT_BOTS\docs\superpowers\plans\2026-05-19-cursive-v2-redesign-implementation.md`
5. `E:\REPOS\SGT_BOTS\docs\superpowers\plans\2026-05-19-cursive-v2-error-log.md`
6. `E:\REPOS\SGT_BOTS\docs\superpowers\plans\2026-05-19-cursive-v2-rollout-notes.md`

## What This Build Is

- `SGT_BOTS` is the Telegram playground for the Academy's try-before-you-buy experience.
- Users enter provider/BYOK info before launching a bot.
- Each playground session is limited to 3 hours.
- Each bot should feel like its own tool, not just a cosmetic skin over one shared chat shell.

## What Cursive Does

- `Cursive` is the first serious workflow bot inside the six-bot playground.
- It is no longer a chat assistant.
- It is a guided dispute workflow engine focused on bureau-targeted removal-demand letters.
- It supports:
  - `Manual dispute`
  - `Analyze uploaded report`
- Manual disputes branch into:
  - `Inconsistent reporting across bureaus`
  - `One bureau is reporting the item inaccurately and I have proof`
- Uploaded report analysis branches into:
  - `Tri-merge report`
  - `Single-bureau report`

## End Goal

- Ship a clean, mobile-first, full-screen Cursive workspace inside the playground.
- Keep the mini app utility-first and menu-driven.
- Generate bureau-specific removal-demand letters from controlled inputs and evidence.
- Never expose internal prompts, skills, or LLM workflow to the user.
- Keep the other playground bots/pages intact while making Cursive the first fully operational lane.

## Current Implemented State

- Shared Cursive v2 workflow contracts are in place in `packages\shared\src\contracts\cursive.ts`.
- The API workflow seam has been reset for workflow-only Cursive under `apps\api\src\modules\cursive\`.
- `document_wizard` chat is blocked from acting like a conversational bot in `apps\api\src\modules\chat\chat.service.ts`.
- The mini app routes Cursive into a dedicated full-screen workflow shell:
  - `apps\telegram-miniapp\src\features\cursive\CursiveWorkspace.tsx`
  - `apps\telegram-miniapp\src\features\cursive\CursiveStepper.tsx`
  - `apps\telegram-miniapp\src\features\cursive\CursiveFooter.tsx`
  - `apps\telegram-miniapp\src\features\dashboard\DashboardShell.tsx`
- The old Cursive category/chat-first mini app flow has been removed.
- The manual lane generates bureau removal-demand PDF artifacts.
- The uploaded-report lane generates bureau removal-demand PDF artifacts for:
  - tri-merge balance inconsistency
  - single-bureau closed-account-reported-open proof
- Upload report fixtures under `tests\e2e\fixtures\` are valid viewer-friendly PDFs, not fake `%PDF-` stubs.

## Phase Just Completed

- Phase D finished the Cursive v2 template, artifact, output, and upload/report-analysis lanes.
- The manual lane is workflow-only and passes end-to-end.
- The tri-merge upload lane is workflow-only and passes end-to-end.
- The single-bureau upload lane is workflow-only and passes end-to-end.
- The Cursive output posture is removal-demand only:
  - no helper chat
  - no generic verification request
  - no "correct if needed" fallback
  - no bureau validation request

## Verified Green So Far

Fresh gates from the completed upload/report-analysis phase:

- `corepack pnpm --filter ./apps/api exec vitest run tests/e2e/cursive-upload-analysis.spec.ts` passed, 8/8.
- `corepack pnpm --filter ./apps/telegram-miniapp exec vitest run src/features/dashboard/DashboardShell.spec.tsx` passed, 9/9.
- `corepack pnpm -r test` passed, including API 116/116.
- `corepack pnpm -r lint` passed.
- `corepack pnpm --filter ./apps/telegram-miniapp build` passed.
- `corepack pnpm test:e2e` passed, 18/18.

## Exact Next Pickup

- Continue Phase E: deployment correction and rollout readiness.
- Do not start the next bot yet.
- Do not deploy to the VPS until the Cursive v2 branch is reviewed, committed, pushed, and explicitly selected for rollout.
- Use `docs\superpowers\plans\2026-05-19-cursive-v2-rollout-notes.md` as the rollout checklist.
- Before any deployment, rerun:
  - `git diff --check`
  - `corepack pnpm --filter ./workers/queue exec vitest run src/jobs/render-report.job.spec.ts`
  - `corepack pnpm -r test`
  - `corepack pnpm -r lint`
  - `corepack pnpm -r build`
  - `corepack pnpm --filter ./apps/telegram-miniapp build`
  - `corepack pnpm test:e2e`

## Known Current Gaps

- Uploaded-report parsing is deterministic and fixture-oriented. It scans readable PDF bytes and simple uncompressed PDF text strings; it is not real OCR or full PDF extraction.
- Single-bureau upload support is intentionally narrow: it detects `closed account reported as open` when proof text is present. Unsupported single-bureau proof text returns no issue rather than guessing a violation type.
- The `resume-next-session-sgt-bots.md` file remains untracked and should be ignored unless explicitly requested.

## Non-Negotiable Cursive Rules

- no chat inside Cursive
- no generic `verify this account` language
- no bureau validation requests
- no `please correct if needed` fallback language
- no arguing which bureau is right or wrong
- no surfacing prompts, skills, or internal LLM workflow
- keep intake menu-driven wherever practical
- collect only the minimum facts needed for the chosen violation
- do not ask the user for replacement data that helps a bureau repair the tradeline
- do not infer a target bureau or serious violation type from unsupported upload text

## Error Log Discipline

- Before repeating a fix attempt, read:
  - `E:\REPOS\SGT_BOTS\docs\superpowers\plans\2026-05-19-cursive-v2-error-log.md`
- Keep appending real mistakes and recovery notes there so the same errors are not repeated.
