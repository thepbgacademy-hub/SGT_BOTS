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

## 2026-05-26 - Rori Chat UI Looked Too Much Like A Source Report

**Context:** Rori mini app UI polish after the first deployed chat layout.

**Problem:** The Rori workspace showed a redundant capability pill row, the chat panel was not visually centered, wiki source labels appeared in the answer card, and prior messages stacked in the visible chat area. That made a concierge chat feel more like a report viewer.

**Fix applied:** Removed the redundant capability row, centered the chat panel inside the Rori card, hid citation/source labels in the Rori UI, stripped the wiki `Source:` sentence from Rori answers, and configured Rori to display only the latest user/Rori exchange.

**Rule going forward:** Rori should feel like a simple concierge conversation. Keep source grounding internal unless a future design adds a user-facing source drawer, and do not stack visible history in the V1 mini app.

## 2026-05-26 - ChatPanel Used ES2023 Array API Outside The Mini App TS Target

**Context:** Rori latest-exchange-only chat rendering.

**Problem:** The first implementation used `messages.findLastIndex(...)`, which passed Vitest but failed `tsc --project tsconfig.json --noEmit` because the mini app TypeScript lib target does not include that ES2023 Array API.

**Fix applied:** Replaced `findLastIndex` with a small reverse `for` loop that works under the current TypeScript target.

**Rule going forward:** Shared mini app components should avoid newer built-in APIs unless the app TS lib target already supports them, especially when Vitest can pass before `tsc` checks the target library.

## 2026-05-26 - Rori Empty State Repeated Header Instructions

**Context:** Rori mini app visual cleanup after the centered chat panel update.

**Problem:** The shared chat empty-state card showed `Ready`, repeated prompt guidance, and rendered four starter buttons immediately below the Rori header. Because the header already tells users what Rori can answer, the card added clutter without a useful job.

**Fix applied:** Added a `hideEmptyState` option to the shared `ChatPanel`, enabled it only for Rori, and stopped passing starter prompts into the Rori workspace.

**Rule going forward:** Rori should not show redundant starter cards or decorative prompt buttons unless they are part of a newly approved interaction design.

## 2026-05-26 - Rori Workspace Back Button Duplicated Top Navigation

**Context:** Rori mini app visual cleanup after the empty starter-prompt card was removed.

**Problem:** The Rori workspace still rendered its own Back button even though the main Playground top menu already provides Back navigation. The duplicate control added visual weight without adding a new path.

**Fix applied:** Removed the Rori workspace Back button, its dedicated styling, and updated tests to assert that no duplicate workspace Back button renders.

**Rule going forward:** Rori should rely on the top menu for Back navigation unless a future flow adds a nested step that needs an in-workspace back action.

## 2026-05-31 - Rori Academy Data Needed A Hard Schema Boundary

**Context:** Preparing to load the real PBG Academy wiki from `E:\REPOS\PBG_wiki`.

**Problem:** Rori's Academy wiki page table and directory tables were created in `public`, which made the Academy concierge data too easy to confuse with shared Playground tables.

**Fix applied:** Moved the Rori Academy storage boundary to a dedicated `rori` schema, updated the migrations and manual SQL mirrors to create and grant that schema explicitly, added a non-destructive migration to move old public Rori tables into `rori`, and updated the import SQL generator to upsert into `rori.rori_academy_wiki_pages`, `rori.rori_telegram_rooms`, and `rori.rori_academy_events`.

**Rule going forward:** Keep shared Playground operational tables in `public` with the `playground_` prefix, but keep Academy concierge content isolated in the `rori` schema. Do not load Academy wiki content back into generic `public` tables.

## 2026-05-31 - Rori Schema Migration Needed To Tolerate Empty Live Environments

**Context:** Applying `012_rori_schema_segregation.sql` on VPS2 before any real Rori Academy content had been loaded.

**Problem:** The first version of the segregation migration always granted `select` on the Rori tables at the end. In a fresh environment where the old public Rori tables did not exist yet, those grants failed because there was nothing to move.

**Fix applied:** Wrapped the end-of-file grants in existence checks so `012_rori_schema_segregation.sql` works in both cases: older environments that need a move, and fresh environments where `008` and `009` create the `rori` tables directly.

**Rule going forward:** Non-destructive retrofit migrations should succeed both when legacy objects exist and when the target environment is still empty.

## 2026-05-31 - Public Concierge Load Must Not Expose Student-Only Wiki Pages

**Context:** Loading the real PBG Academy wiki from `E:\REPOS\PBG_wiki` into the live Rori concierge schema on VPS2.

**Problem:** Several wiki pages are marked `Student-Only`, but the current Rori Academy wiki table only distinguishes `published`, `draft`, and `visible`. Loading those pages into the public concierge schema would make enrolled-student onboarding, troubleshooting, and policy content reachable without a separate access boundary.

**Fix applied:** Loaded only the public-facing Academy pages into `rori.rori_academy_wiki_pages`, kept the student-only pages out of the live Rori schema, and documented that a separate access-control boundary is required before those pages are published through Rori.

**Rule going forward:** Public concierge loads may include only public Academy content. Do not publish student-only wiki pages through Rori until the data model can enforce an enrolled-student visibility boundary.

## 2026-05-31 - Phase 3 Browser Tests Must Use Fresh Telegram Identities

**Context:** Rori concierge wording and directory cleanup after the Playground one-entry participation gate was already live.

**Problem:** The first Phase 3 Playwright rerun timed out before it ever reached Rori assertions because the shared `ada_phase3` Telegram identity had already been recorded in `playground_participations`. The app stayed on the provider screen with the polite one-entry message, so the tests kept waiting for bot buttons that never unlocked.

**Fix applied:** Reworked `tests/e2e/phase-3-bot-runtime.spec.ts` to generate unique signed Telegram init data per test case and updated the onboarding flow to explicitly pick the current `OpenAI API key` option before filling `API key`.

## 2026-06-03 - Rori Boundary Replies Must Stay Deterministic

**Context:** Hardening Rori against off-topic prompts and jailbreak / instruction-bypass attempts.

**Problem:** The shared prompt-config lane can make normal concierge replies warmer, but it is the wrong place to let refusal wording drift. Repeated off-topic or jailbreak attempts should not produce new wording, extra explanation, or prompt-leak fodder.

**Fix applied:** Added two fixed Rori boundary replies in `rori-kb.ts` and short-circuited jailbreak detection before normal routing. Ordinary off-topic prompts now always return `I can only help with PBG Academy, the Playground tools, enrollment, workshops, and support rooms.` Jailbreak / instruction-bypass prompts now always return `I can't help with bypassing my instructions or stepping outside my approved Academy role.`

**Rule going forward:** Boundary replies are product copy, not prompt-shaped prose. Keep them deterministic and verbatim unless the user explicitly approves new wording.

## 2026-06-03 - Only Jailbreak Attempts Should Be Audited

**Context:** Adding proof-of-violation logging for Rori jailbreak attempts.

**Problem:** Logging every off-topic prompt would create noisy audit rows and muddy the difference between harmless curiosity and deliberate instruction-bypass attempts.

**Fix applied:** Added a dedicated audit-event repo and wired the chat route to insert `rori_jailbreak_attempt` rows only when the response boundary type is `jailbreak_attempt`. The audit metadata stores the raw prompt, conversation/session ids, internal user id, Telegram user id, Telegram username, and the user's preferred/display name.

**Rule going forward:** Audit only jailbreak / instruction-bypass attempts. Ordinary off-topic questions should receive the fixed boundary reply but should not create an audit event.

**Rule going forward:** Browser flows that need a fresh playground entry must use unique Telegram identities or a dedicated bypass identity. Do not reuse a single signed init payload across post-gate Playwright tests.

## 2026-05-31 - Rori Concierge Replies Sounded Like Prompt Notes Instead Of Conversation

**Context:** Live Telegram review of the first Rori Academy wiki load.

**Problem:** Rori was still surfacing fallback-style wording such as `Rori can...`, `configured`, and generic support copy that sounded like internal instructions instead of a warm concierge. The generic room list also still reflected older room labels instead of the approved `Rori DM` and `Lobby DM to staff` records.

**Fix applied:** Updated Rori fallback copy and live reply builders to use first-person concierge language, replaced `configured` and `path` wording with plain-language references to links and next steps, added a public-safe `What happens after I enroll?` answer, and aligned local room fallbacks and tests with `Rori DM` and `Lobby DM to staff`. The refreshed Academy import SQL was then reapplied on VPS2.

**Rule going forward:** Rori should answer like a human concierge, not a runtime note. Prefer `I can...`, `I can't open that in the playground yet...`, and simple room guidance over system-language phrases.

## 2026-05-31 - Hotfix Backend Layers Can Miss Queue Dependencies

**Context:** Deploying the Rori concierge wording repair to VPS2.

**Problem:** The first backend deploy reused the lightweight `Dockerfile.backend.hotfix` layer on top of the old `top-secret-smoke` image. That older base image did not include `pdf-lib`, so the backend immediately restart-looped with `ERR_MODULE_NOT_FOUND` when `workers/queue/src/jobs/render-report.job.ts` loaded.

**Fix applied:** Rebuilt and deployed the full backend image from `Dockerfile.backend` instead of relying on the hotfix layer, then reloaded it on VPS2 and restarted only `sgt-bots-backend`. Health checks then returned `{\"status\":\"ok\"}` locally inside the container and at the public endpoint.

**Rule going forward:** If the backend imports queue/report code or any dependency that may not exist in the previous base tag, deploy from the full backend Dockerfile. Use the hotfix layer only when the base image is already known to contain every transitive runtime dependency.

### 2026-06-02 - Rori pricing questions fell back to generic enrollment copy

**Context:** Live Rori answered direct questions like `What are the costs?` with the old generic enrollment fallback instead of the Academy pricing page.

**Problem:** The reply builder only looked for an exact wiki slug of `enrollment`, while the live Academy wiki data uses `enrollment-and-pricing` for the public pricing page. Cost/pricing questions also had no dedicated response branch, so even when the right page was present in the search results the reply logic could still ignore it and fall back to generic enrollment wording.

**Fix applied:** Added a pricing-question branch to `rori-kb.ts`, taught the wiki selection logic to prefer `enrollment-and-pricing` before `enrollment`, and formatted the markdown pricing table into a short concierge-style answer that includes the current monthly levels and the credits distinction. Added targeted bot-runtime coverage for direct pricing questions and the enrollment -> pricing follow-up, then hot-patched the live VPS2 backend container and restarted only `sgt-bots-backend`. Public health returned `{\"status\":\"ok\"}` after the restart.

**Rule going forward:** Do not key Academy concierge answers off one exact wiki slug when the live authoring repo uses richer page names. For public pricing questions, prefer semantic page selection plus a direct answer formatter instead of dumping generic enrollment copy.

### 2026-06-03 - Rori needed a real shared persona layer, not just wiki tone

**Context:** After the shared `academy_bot_prompt_configs` table was introduced, Rori still felt a little cold and helpdesk-like even though the Academy wiki already described the right voice.

**Problem:** The wiki was carrying the facts and some tone guidance, but the runtime still leaned on deterministic branch copy that sounded flatter than intended. The first prompt-config pass only affected fallback and off-topic answers, so room lists, pricing phrasing, enrollment copy, and tool-routing guidance could still feel more functional than conversational.

**Fix applied:** Strengthened the shared Rori `playground` config row to a `warm scholarly guide` persona, updated the local fallback config to match, and added a small response-shaping pass in `rori-kb.ts` so generic replies are softened into calmer, more teacher-like phrasing without inventing new facts. Reapplied the live prompt-config row on VPS2, hot-patched the live backend container with the updated Rori knowledge-base file, and restarted only `sgt-bots-backend`. Focused prompt-config tests, targeted Rori bot-runtime tests, API lint, and API build all passed; public health returned `{\"status\":\"ok\"}` afterward.

**Rule going forward:** Treat wiki pages as the source of truth for Academy facts and policies, but keep bot persona, tone, and reply-behavior tuning in shared prompt-config data plus small runtime shaping. Do not expect a content header alone to carry the full bot personality.

## 2026-05-31 - Rori Needed Bounded Follow-Up Memory To Feel Conversational

**Context:** Live Rori concierge review after the tone and Academy wiki wording were already corrected.

**Problem:** Rori sounded better on single prompts, but follow-ups like `What happens after that?` and `Which one would help with payment trouble?` still behaved like a one-turn rules engine. The service kept the `conversationId`, but the reply builder only examined the current message text, so ambiguous follow-ups fell back to generic enrollment or troubleshooting copy.

**Fix applied:** Added a small Rori-only conversation context layer in the chat service and knowledge-base reply builder. The service now keeps prior messages for the active conversation, infers the last resolved Rori intent from recent user prompts, and rewrites ambiguous follow-ups into explicit Academy or Telegram-room questions before normal wiki and directory routing runs. Added failing backend tests and a Playwright follow-up test before implementation, then redeployed the backend to VPS2 and rechecked health.

**Rule going forward:** Rori should feel conversational, but its memory should stay bounded. Use short-lived topic context to resolve pronouns and `which one` follow-ups; do not turn Rori into an unbounded freeform assistant that drifts away from the approved Academy wiki, room directory, and tool-routing rules.

## 2026-06-04 - Rori Warmth Work Needed Readability Shaping, Not More Routing

**Context:** Live Telegram review after pricing, programs, and support routing were already substantively correct.

**Problem:** Even with the right answers, Rori still sounded cramped and mechanical because several replies arrived as one dense paragraph. The issue was no longer incorrect routing; it was presentation and cadence.

**Fix applied:** Added a light reply-shaping pass in `rori-kb.ts` that keeps the same grounded facts but inserts short paragraph breaks before playground limitations and between the direct answer and the follow-up guidance. Pricing replies now open with `Here's the short version on the levels right now:` and no longer restate unnecessary paid-level filler. Added focused bot-runtime coverage for paragraph-shaped pricing and support escalation replies.

**Rule going forward:** Once Rori's substance is correct, prefer small answer-shaping changes over more branch logic. Warmth should come from concise phrasing, visual breathing room, and answer-first structure, not from adding more factual copy.

## 2026-06-04 - The Rori Frontend Was Flattening Backend Paragraph Breaks

**Context:** After the reply-shaping pass was live, the Telegram UI still showed some Rori answers as one crowded block even though the backend strings already contained blank lines.

**Problem:** The Rori chat renderer was treating assistant message text like normal paragraph text, so newline characters from the backend collapsed visually in the mini app.

**Fix applied:** Updated the Rori workspace chat CSS to use `white-space: pre-line` on `.rori-shell .message-copy`, which preserves backend paragraph breaks without switching the chat into an uncontrolled preformatted block.

**Rule going forward:** If a reply-formatting change seems correct in backend tests but still looks cramped in Telegram, inspect the mini app text rendering before adding more backend formatting logic. Fix the layer that is actually flattening the message.

## 2026-06-04 - Programs Answers Needed Their Own Teaching Rhythm

**Context:** After pricing and support replies were cleaned up, the `What can I study here?` answer still felt too much like a catalog paragraph even though the content itself was accurate.

**Problem:** The generic wiki reply path was fine for short pages, but longer `Programs and Curriculum` prose needed its own pacing. Without that, the answer still read like brochure copy.

**Fix applied:** Added a dedicated `buildProgramsReply(...)` formatter in `rori-kb.ts` that breaks long programs/courses answers into smaller sections before the general response shaping runs. Added focused bot-runtime coverage for the longer `What can I study here?` variant so future edits do not collapse it back into one dense block.

**Rule going forward:** When an answer family regularly carries longer educational copy, give it a light domain-specific formatter instead of forcing the generic wiki reply path to do all the work.

## 2026-06-10 - Enrollment Contact Questions Were Falling Back To Pricing Context

**Context:** Live review of the question `Who do I talk to about enrolling for classes?`

**Problem:** Rori answered with the general enrollment-and-pricing body, which was mostly accurate but still missed the actual user intent. The user was asking for a person/room to contact, not for pricing or level details.

**Fix applied:** Added a dedicated enrollment-contact detector in `rori-kb.ts` for `who do I talk to / who do I ask / where do I go` phrasing paired with enrollment/course keywords. That route now points to `Lobby DM to staff`, tells the user to open a DM there, and says to ask an admin for help getting started. A failing bot-runtime test first showed the old matcher still routed to `Rori DM`; the matching seed was then tightened to force the staff-room path, and the test passed on rerun.

**Rule going forward:** Contact-routing questions should be answered as contact-routing questions. When the user asks who to talk to, prefer the right room and next step over dumping adjacent wiki facts like pricing or enrollment summaries.

## 2026-06-10 - Broad Tool Questions Were Too Loose For Routing But Too In-Bounds For Off-Topic

**Context:** Live review of the question `what do the bots do?`

**Problem:** Rori treated that wording as off-topic because the runtime only had a narrow tool-selection pattern for phrases like `which tool should I use`. The user intent was obvious, but the matcher was too literal.

**Fix applied:** Added a broader tool-overview detector in `rori-kb.ts` so natural phrasing like `what do the bots do?` and similar tool-overview questions get a concise bot summary instead of the off-topic boundary line. A failing bot-runtime test then showed that the broad matcher accidentally captured the exact starter prompt `Which tool should I use for...?`, so the intent order was corrected: precise tool-selection routing now runs first, and the broader overview matcher runs afterward.

**Rule going forward:** In-bound Academy questions should be interpreted by intent, not only by exact wording. Broader overview routes should exist, but they must not override narrower, higher-confidence intent branches that already answer a more specific version of the question.

## 2026-06-10 - The Tool Overview Reply Needed The Full Playground Lineup

**Context:** Follow-up review of the new `what do the bots do?` answer.

**Problem:** The first overview reply correctly escaped the off-topic boundary, but it forgot to mention Insight and did not include the Academy-wide `37 tools and gadgets` framing the user wanted.

**Fix applied:** Expanded the overview reply in `rori-kb.ts` so it now names Cursive, Top Secret, Condor, ShAzZaM, Insight, and Rori, and adds the line that there are `37 tools and gadgets at PBG to assist Cadets along their learning journey.` Updated the bot-runtime coverage to assert Insight and the `37 tools and gadgets` line are present.

**Rule going forward:** Overview answers about the playground lineup should mention the full current bot set, not a partial subset. If the user asks what the bots do, answer with the whole visible playground picture.
