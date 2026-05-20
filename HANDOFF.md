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

## What This Build Is

- `SGT_BOTS` is the Telegram playground for the Academy's try-before-you-buy experience
- users enter their provider/BYOK info before launching a bot
- each playground session is limited to 3 hours
- each bot should feel like its own tool, not just a cosmetic skin over one shared chat shell

## What Cursive Does

- `Cursive` is the first serious workflow bot inside the six-bot playground
- it is no longer a chat assistant
- it is now a guided dispute workflow engine focused on bureau-targeted removal-demand letters
- it supports:
  - `Manual dispute`
  - `Analyze uploaded report`
- manual disputes branch into:
  - `Inconsistent reporting across bureaus`
  - `One bureau is reporting the item inaccurately and I have proof`
- uploaded report analysis branches into:
  - `Tri-merge report`
  - `Single-bureau report`

## End Goal

- ship a clean, mobile-first, full-screen Cursive workspace inside the playground
- keep the mini app utility-first and menu-driven
- generate bureau-specific removal-demand letters from controlled inputs and evidence
- never expose internal prompts, skills, or LLM workflow to the user
- keep the other playground bots/pages intact while making Cursive the first fully operational lane

## Current Implemented State

- shared Cursive v2 workflow contracts are in place in `packages\shared\src\contracts\cursive.ts`
- the API workflow seam has been reset for workflow-only Cursive under `apps\api\src\modules\cursive\`
- `document_wizard` chat is blocked from acting like a conversational bot in `apps\api\src\modules\chat\chat.service.ts`
- the mini app now has a dedicated full-screen Cursive shell:
  - `apps\telegram-miniapp\src\features\cursive\CursiveWorkspace.tsx`
  - `apps\telegram-miniapp\src\features\cursive\CursiveStepper.tsx`
  - `apps\telegram-miniapp\src\features\cursive\CursiveFooter.tsx`
- `DashboardShell.tsx` routes Cursive into the new workflow shell
- the old Cursive category/chat-first mini app flow has been removed

## Phase Just Completed

- `Phase C` landed the Cursive full-screen workspace shell
- the manual lane now starts with:
  - `Mode`
  - `Evidence`
  - `Violation`
- the persistent playground countdown now lives inside the Cursive workspace footer
- Cursive no longer shares the old chat-first experience

## Verified Green So Far

- shared contract tests passed
- targeted API workflow tests passed
- Cursive mini-app tests passed
- mini-app lint passed
- mini-app build passed
- browser E2E for the current Cursive shell path passed

## Exact Next Pickup

- continue with the next implementation phase from the Cursive v2 implementation plan
- the next real build target is the backend/template/artifact migration for Cursive v2
- replace the old category-era preview/save flow with the new workflow-driven preview/artifact path
- migrate the remaining legacy credit-dispute output flow so it matches the new Cursive doctrine:
  - menu-driven intake
  - no chat
  - removal-demand letters only
  - validation gate before delivery
- do not start VPS rollout yet
- do not start the next bot yet
- finish the Cursive preview/artifact lane first

## Known Current Break / Next Test Target

- the older preview/artifact API tests are still the next red-to-green target:
  - `E:\REPOS\SGT_BOTS\apps\api\tests\e2e\cursive-preview.spec.ts`
  - `E:\REPOS\SGT_BOTS\apps\api\tests\e2e\cursive-artifacts.spec.ts`
- these are the main indicators that the old category-era output pipeline has not been fully migrated yet

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

## Error Log Discipline

- before repeating a fix attempt, read:
  - `E:\REPOS\SGT_BOTS\docs\superpowers\plans\2026-05-19-cursive-v2-error-log.md`
- keep appending real mistakes and recovery notes there so the same errors are not repeated

## Ignore Unless Asked

- `E:\REPOS\SGT_BOTS\resume-next-session-sgt-bots.md` is currently untracked
- leave it alone unless the user explicitly asks to use or clean it up
