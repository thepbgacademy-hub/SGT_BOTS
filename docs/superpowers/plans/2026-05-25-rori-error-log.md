# Rori Error Log

## 2026-05-25 - Generic Room Prompt Matched Specific Tech Room Keywords

**Context:** Rori Phase 3 Academy directory-backed Telegram room routing.

**Problem:** The generic prompt `Which PBG Telegram rooms should I join?` contains `Telegram` and `room`, so the first directory matcher treated it like a specific technical-access problem and returned only the Technical Access Help room.

**Fix applied:** Added a generic room-list check before specific keyword scoring. Generic `which/what/list/all rooms` questions now list all configured room purposes, while specific access trouble still routes to Technical Access Help.

**Rule going forward:** Intent matchers need a generic-list branch before scoring specific support categories, especially when broad prompts naturally contain category keywords.

## 2026-05-25 - Phase 3 Should Not Add Fake Admin Data

**Context:** Rori Phase 3 workshop/event and Telegram room directory data.

**Problem:** It would be easy to make tests pass by seeding fake event dates, registration URLs, or invite links, but that would create user-facing misinformation.

**Fix applied:** Kept workshop data empty until real Academy data exists, marked room invite links as not configured, and asserted no visible HTTP URL appears in the Rori mini-app E2E directory flows.

**Rule going forward:** Directory records should prefer explicit not-configured states over fake placeholders. Never add invented event or invite data to make a demo feel complete.

## 2026-05-25 - Specific Room Questions Were Swallowed By Broader Academy Branches

**Context:** Final review for Rori Phase 3.

**Problem:** Specific questions such as `Which Telegram room is for enrollment help?` were answered by the enrollment branch, and `Which Telegram room is for workshop updates?` was answered by the workshop branch before room routing could run. Tool support room questions also overmatched Technical Access because generic words were counted in the technical keyword set.

**Fix applied:** Added failing tests for Enrollment Help, Workshop Updates, and Tool Support room routing, moved explicit Telegram room routing before broad enrollment/workshop branches, and removed generic `telegram` and `room` keywords from Technical Access scoring.

**Rule going forward:** Room-routing intent must run before broad Academy topic branches when the user asks which Telegram room fits a purpose.

## 2026-05-25 - VPS Manual SQL List Referenced A Missing File

**Context:** Rori Phase 4 added the manual VPS SQL mirror for the Rori directory migration.

**Problem:** The manual apply README was updated to include `007_cursive_category_engine.sql`, but that file is not present in `vps-supabase-manual`. That would make the "exact order" instructions impossible to follow from the folder alone.

**Fix applied:** Kept the manual apply list scoped to files present in `vps-supabase-manual` and added `008_rori_academy_directory.sql` after the existing six manual files.

**Rule going forward:** Manual rollout folders should list only files that are actually present in that folder, unless the notes explicitly point to another location.

## 2026-05-25 - Wiki Source Migration Test Looked For Unescaped Regex Text

**Context:** Rori Phase 5 added `rori_academy_wiki_pages` with a SQL regex guard against placeholder URLs.

**Problem:** The first migration test looked for `example.invalid`, but the SQL regex stores the dot as `example\.invalid` so the assertion failed even though the guard was present.

**Fix applied:** Updated the contract test to assert the escaped SQL regex text.

**Rule going forward:** SQL contract tests should match the literal SQL text, including regex escaping, instead of the human-readable version of a pattern.

## 2026-05-25 - Wiki Enrollment Reply Broke Existing Rori Coverage Words

**Context:** Rori Phase 5 moved enrollment answers from the static concierge source into the wiki source.

**Problem:** Existing Rori E2E coverage still expected enrollment answers to mention PBG Academy, Telegram, and workshop context. The first wiki fallback body only mentioned generic support-room guidance, so useful context disappeared.

**Fix applied:** Updated the fallback enrollment wiki page to preserve `PBG Academy`, `Telegram`, and `workshop` language while still citing the wiki source.

**Rule going forward:** When replacing static support copy with wiki-backed copy, preserve established user-facing routing words unless the phase intentionally changes that behavior.

## 2026-05-25 - Browser Citation Check Needed Exact Text

**Context:** Rori Phase 5 updated Playwright E2E expectations from the old concierge citation to the new wiki page citation.

**Problem:** `page.getByText("Academy Enrollment")` matched both the assistant reply text and the citation label, causing a strict-mode Playwright failure.

**Fix applied:** Updated the locator to `getByText("Academy Enrollment", { exact: true })`.

**Rule going forward:** When checking citation labels in chat output, use exact text or a citation-specific locator so body copy does not collide with citation text.

## 2026-05-25 - Playwright Navigation Timeout Was Transient

**Context:** Rori Phase 5 browser E2E rerun after updating wiki citation expectations.

**Problem:** One `phase-3-bot-runtime.spec.ts` run timed out during `page.goto` for a later Rori directory test after the first test had already passed. The failure did not reach a Rori assertion.

**Fix applied:** Reran the same Playwright spec without code changes; all seven tests passed.

**Rule going forward:** If Playwright fails at navigation before app assertions, rerun once and only change code when the failure is reproducible or points to a real app condition.

## 2026-05-25 - Empty Live Wiki Source Dropped Local Rori Fallback

**Context:** Final review for Rori Phase 5 wiki-backed Academy knowledge.

**Problem:** When Supabase was configured and reachable but returned no matching published wiki page, the wiki repo returned an empty array. That could make a deployed Rori lose the wiki-backed fallback answers before real Academy wiki rows are seeded.

**Fix applied:** Added a failing repo test for empty Supabase results and changed the Supabase wiki repo to return local fallback matches when no live published match exists.

**Rule going forward:** Rori live knowledge sources may override fallback content when they have a matching published record, but an empty source should preserve local fallback behavior until production content is seeded.

## 2026-05-25 - Phase 6 Had No Approved Rori Data To Load

**Context:** Rori Phase 6 was supposed to add real Academy wiki pages, Telegram room records, event records, and live links to the target operations database.

**Problem:** Repo and vault searches did not find approved production Rori wiki rows, Telegram room invite links, event records, or registration URLs. The fallback source packs and tests include routing copy and fixture URLs, but those are not Academy-approved production records.

**Fix applied:** Did not seed any data. Added a validated admin data template and SQL generator so real records can be reviewed and converted into non-destructive upsert SQL when Academy-approved content is available.

**Rule going forward:** If approved operations content is missing, stop at schema/import preflight. Do not turn fallback copy, test fixtures, or unrelated Telegram links into production Rori rows.

## 2026-05-25 - Empty Rori Data Template Fails By Design

**Context:** Rori Phase 6 added `vps-supabase-manual/rori-academy-data.template.json` and the `rori:data:sql` command.

**Problem:** Running the generator against the untouched template exits with `At least one Rori Academy wiki page, Telegram room, or event record is required.`

**Fix applied:** No code fix needed. This is the intended production guard so an empty template cannot be mistaken for approved data.

**Rule going forward:** Fill the template with reviewed real records before generating SQL. Do not loosen the empty-import guard for production use.

## 2026-05-25 - Rori Data Import Needed Stricter Preflight Checks

**Context:** Final review for Rori Phase 6 admin data preflight.

**Problem:** The first validator allowed empty optional URL strings, narrower `example.*` placeholder URLs, placeholder keywords, and duplicate import keys that Postgres would reject during one-statement upserts.

**Fix applied:** Added failing tests, then tightened validation to reject empty URL strings, any `example.*` URL, placeholder keywords, and duplicate wiki page, Telegram room, or event keys before SQL generation.

**Rule going forward:** Admin import tooling should fail before apply for issues that database constraints or Postgres conflict handling would reject later.

## 2026-05-26 - Rori Deployment Branch Must Preserve Shared Provider Fixes

**Context:** Rori mini app polish was prepared after the shared `@PBGbigkitty_bot` provider screen received OpenAI Codex subscription login.

**Problem:** The Rori branch predated the final Codex start-request fix. Deploying it as-is would have reintroduced the Fastify error `Body cannot be empty when content-type is set to 'application/json'` and restored the redundant API-key fallback pill.

**Fix applied:** Brought the shared provider panel behavior forward on the Rori branch: Codex start requests send `JSON.stringify({})`, API-key fallback remains only in the provider dropdown, and focused provider tests were updated.

**Rule going forward:** Before deploying a bot-lane branch, compare it against the latest shared playground shell fixes. Bot-lane deployment must not regress onboarding, provider login, timers, or review CTA behavior.

## 2026-05-26 - Rori Purple Theme Was Too Dominant

**Context:** Rori mini app layout polish while Academy wiki content is being prepared.

**Problem:** The first Rori theme leaned into a purple page background and purple gradient treatment. The intended direction was the Top Secret dark brown family with cream text and purple accents only.

**Fix applied:** Rebalanced Rori CSS to use a dark brown base, cream text, rounded panels, restrained purple borders/buttons, and a small plain-language capability row. Removed the radial purple background treatment.

**Rule going forward:** For Rori, purple is an accent over the Academy brown shell. Do not let the page read as a purple-themed product or use decorative purple orbs.
