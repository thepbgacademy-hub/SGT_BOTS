# Telegram Playground Mini App Design

## Summary

This document defines the v1 design for a Telegram mini app "playground" experience that lets users join a Telegram group, launch a mini app from a bot welcome message, create a profile, connect their own LLM provider account, and test-drive multiple specialized bots inside a shared UI shell for up to three hours total.

The product goal is to showcase differentiated bot capabilities in a controlled, professional, low-friction environment that leads users toward joining a paid community.

## Product Goals

- Let users test multiple Telegram bot experiences from one shared mini app.
- Require BYOK so the playground never runs on platform-funded model usage.
- Keep the bot experience clean, safe, and within Telegram limits.
- Make each bot feel specialized while preserving a shared UI and control model.
- Capture profile, provider-connection, and engagement data for follow-up.
- End every session with a strong review and conversion CTA.

## Hard Success Criteria

- User joins the Telegram group.
- Bot welcomes the user with an inline keyboard button that opens the mini app.
- User creates a profile with first name, last name, Telegram name, and preferred name.
- Telegram payload details available to the bot are stored in Supabase with the profile/session.
- User connects an LLM provider account during profile creation using OAuth where available and API key fallback where needed.
- No bot becomes usable until BYOK is connected and validated.
- BYOK credentials are handled session-only and purged when the active session ends.
- User selects one or more bots inside the mini app.
- Each bot loads its designated workflow inside a shared mini app shell.
- Total playground time across all bots is capped at three hours.
- Mini app shows a visible countdown timer at all times.
- User is prompted to leave a review in the review group via link when time expires or when they exit.

## Scope Decisions Captured So Far

- The interaction experience happens inside the mini app, not in group chat or bot DM.
- Launch scope should support six or more bots with category navigation.
- All bots share one core shell and conversation model.
- Some bots can enable extended capabilities beyond plain chat.
- Extended capabilities include PDF upload, guided forms, citations, structured action cards, and HTML-to-PDF report generation.
- Report generation should render professional HTML templates into PDFs rather than generating ad hoc text documents.

## Non-Negotiables

- Respect Telegram bot and mini app limits at all times.
- Guard against prompt injection, reprompting, jailbreak attempts, and cross-bot privilege leakage.
- Store bot prompts, allowables, tool permissions, and workflow policies in a hard-coded or policy-backed configuration layer, preferably managed from Supabase with audited change control.
- Never expose internal skills, tool calls, system prompts, or orchestration details to users.
- Keep n8n limited to initial profile/onboarding tasks where it materially reduces setup friction; the main runtime should live outside n8n.
- All coding work must receive code review.
- Final code must be linted, tested, and refactored before release.

## Recommended Product Shape

Build a single Telegram mini app with:

- one shared shell
- one session manager
- one bot catalog
- one chat runtime contract
- one capability manifest per bot

Each bot is a configured "persona + policy + source-of-truth + allowed-actions" package rather than a separate frontend product. This keeps the UI consistent while allowing meaningful specialization.

## UX Flow

### 1. Group Entry

- User joins the Telegram group.
- The Telegram bot posts or sends a welcome message with an inline keyboard button such as `Open Playground`.
- Button launches the mini app using Telegram Web App entry.

### 2. Launch and Identity Bootstrap

- Mini app reads Telegram `initData` and validates it server-side.
- If no active profile exists, the user enters profile onboarding.
- Pre-fill what Telegram provides and ask the user to confirm or complete:
  - first name
  - last name
  - Telegram username
  - preferred name
- Persist Telegram payload fields that are legally and operationally useful, including:
  - Telegram user id
  - username
  - first/last name from Telegram
  - language code if present
  - chat context if available
  - launch timestamp
  - raw validated init payload snapshot

### 3. Provider Connection During Profile Creation

- Immediately after profile creation, the user connects their LLM provider.
- Support both:
  - OAuth providers where technically available and appropriate
  - API key entry fallback
- Validate the credential before enabling any bot.
- Keep credentials in memory or another short-lived session store only for the active playground session.
- Show clear provider status:
  - connected
  - validation failed
  - insufficient scope
  - expired
- No bot access until validation succeeds.

### 4. Playground Home

- User lands in a dashboard inspired by the provided layout:
  - top bar for branding, active provider, and countdown timer
  - left rail for bot categories and bot picker
  - main canvas for conversation and bot-specific workflow content
  - lower utility area for uploads, citations, generated assets, or form progress
  - bottom composer for chat input and send action

### 5. Bot Exploration

- User selects a bot from the catalog.
- App loads the bot profile, allowed capabilities, and source-of-truth bindings.
- Main canvas shows:
  - welcome/system-safe intro
  - suggested starters
  - current task state
  - bot output stream
- If the bot supports enhanced interactions, enable only the allowed modules:
  - file upload
  - guided form
  - citation drawer
  - generated artifact list
  - task/action cards

### 6. Session End

- When remaining time is low, show warnings at sensible milestones such as 30, 10, and 3 minutes.
- When time expires:
  - disable new requests
  - allow the final response to complete
  - show review CTA and next-step/community CTA
- If user exits early, also prompt for review and paid-community conversion.

## UI Design Direction

The supplied mockup suggests a premium black-and-gold control-room aesthetic. v1 should preserve that tone without overcomplicating the interaction model.

### Shared Shell Regions

- Top bar:
  - logo/title
  - provider badge
  - session countdown
  - profile/settings entry
- Left primary rail:
  - bot categories
  - bot list
  - bot status badges such as `Chat`, `Upload`, `Form`, `Report`
- Left lower utility panel:
  - current session summary
  - recent artifacts
  - review prompt or help state
- Main canvas:
  - conversation transcript
  - streamed replies
  - inline action cards
  - citations
  - progress banners
- Bottom composer:
  - text input
  - upload trigger when bot allows it
  - send button

### Capability Model

Every bot uses the same shell, but capabilities are switched on through configuration. Example capability flags:

- `chat`
- `citations`
- `pdf_upload`
- `structured_form`
- `html_report`
- `download_artifact`
- `rag_query`
- `handoff_blocked`

This gives a shared frontend while allowing specialized workflows.

## Bot Types in v1

Representative examples based on your notes:

- Document Wizard
  - accepts PDF upload
  - may collect structured inputs
  - produces polished PDF output from HTML templates
- Tutor
  - chat-first
  - may use citations and guided prompts
  - likely no uploads in v1 unless tied to study material
- Researcher
  - chat-first with strong citation display
  - can query approved knowledge sources
  - may generate downloadable summaries/reports
- Knowledge Base Concierge
  - constrained Q&A against allowed source-of-truth assets
  - strong retrieval and citation behavior
  - limited action surface

## Recommended Architecture

### High-Level Components

1. Telegram Bot Gateway
- Handles group onboarding, welcome messaging, and mini app launch entry.
- Stays thin.
- Does not run the main playground conversation logic.

2. Mini App Frontend
- Telegram Web App frontend hosted on the VPS.
- Renders shared shell and bot-specific capability modules.
- Talks only to the application backend.

3. Application Backend
- Owns session orchestration, profile management, bot routing, provider credential validation, authorization, timer enforcement, upload processing, and artifact generation.
- Enforces all bot policies.

4. Worker Layer
- Redis/BullMQ-backed workers for long-running tasks:
  - file ingestion
  - RAG indexing
  - report rendering
  - provider validation retries
  - cleanup jobs

5. Supabase
- Primary operational database for users, profiles, bot manifests, sessions, artifacts, policies, provider connections metadata, and audit events.
- Also stores durable references and policy definitions.

6. LightRAG
- Sole source of truth for database-query/LLM data interaction as requested.
- Used as the controlled retrieval layer for bots that need knowledge access.

7. n8n
- Optional for initial onboarding/profile capture flow if it speeds up launch.
- Should hand off to the application backend immediately after profile/BYOK capture.
- Should not orchestrate ongoing bot conversations in normal operation.

## Recommended Deployment Shape

Host on the Hostinger VPS as a small set of services:

- reverse proxy
- frontend app
- backend API
- worker process
- Redis
- optional document rendering service if kept separate

Supabase remains managed externally. Telegram communicates with the bot webhook endpoint. The mini app frontend and backend both live behind TLS.

## Why This Architecture

This shape keeps Telegram-specific work lightweight, prevents n8n from becoming a brittle runtime bottleneck, and gives each bot a strict policy envelope. It is simpler than a microservices approach while still separating interactive traffic from background jobs.

## Core Data Model

### Main Tables

Playground-owned tables stay in the `public` schema for now, but they must use a `playground_` prefix so they are immediately distinguishable from any other app data.

- `playground_users`
  - internal user id
  - telegram user id
  - username
  - preferred name
  - first name
  - last name
  - timestamps

- `playground_telegram_profiles`
  - user id
  - validated Telegram payload snapshot
  - language code
  - launch metadata
  - raw init data hash

- `playground_provider_connections`
  - user id
  - provider name
  - auth method (`oauth` or `api_key`)
  - no durable credential storage
  - ephemeral session handle or validation reference if needed
  - validation status
  - scopes/metadata
  - connected at
  - expires at if relevant
  - last validated at

- `playground_sessions`
  - session id
  - user id
  - started at
  - ends at
  - remaining seconds cache hint
  - status
  - provider connection id
  - review prompted flag

- `playground_bot_definitions`
  - bot id
  - name
  - category
  - description
  - capability manifest
  - source-of-truth binding
  - prompt/policy version
  - active flag

- `bot_policies`
  - bot id
  - allowed tools/actions
  - upload rules
  - output limits
  - prompt template/version
  - model routing policy
  - report template binding

- `playground_conversations`
  - conversation id
  - session id
  - bot id
  - state
  - started at
  - ended at

- `playground_messages`
  - conversation id
  - role
  - content
  - citations metadata
  - safety flags
  - created at

- `playground_artifacts`
  - conversation id
  - bot id
  - type (`pdf`, `html`, `json`, etc.)
  - storage path
  - template id if rendered
  - created at

- `playground_uploads`
  - session id
  - conversation id
  - original filename
  - mime type
  - size
  - virus scan status
  - parse status
  - storage path

- `playground_audit_events`
  - actor
  - entity type/id
  - event type
  - metadata
  - timestamp

## BYOK Design Decision

v1 will use `Session-only` BYOK handling.

- Users connect their provider during onboarding/profile creation.
- Credentials are validated and then kept only for the active playground session.
- Credentials are purged when the session ends, the user disconnects, or the session is invalidated.
- Returning users must reconnect their provider if they start a new session later.

Why this is the right launch choice:

- It minimizes custody risk for a public-facing playground.
- It keeps the trust story simple: the platform does not retain provider credentials after use.
- It reduces cleanup, revoke, and secret-rotation complexity in v1.

Operational note:

- We may still store non-secret connection metadata for audit and UX purposes, such as provider name, auth method, validation result, and timestamps.

## Data Retention

- Keep user profile and Telegram identity records for 3 months after the user's last activity.
- Purge inactive profile records and related low-value operational data after that retention window unless a legal or audit need requires otherwise.
- Define `last activity` as any authenticated playground launch, onboarding resume, or in-session bot interaction.
- Do not retain BYOK credentials beyond the active session.
- Retain audit events and release-quality operational logs only as long as needed for security, abuse investigation, and support.

## Bot Runtime Contract

Each bot request should flow through the same backend contract:

1. Validate session is active and time remains.
2. Validate provider connection is present and still usable.
3. Load bot definition and policy manifest.
4. Load allowed source-of-truth binding.
5. Build constrained runtime context.
6. Run retrieval and permitted actions only.
7. Filter output for policy leakage and unsafe content.
8. Persist transcript, citations, and artifacts.
9. Return only user-facing output.

This contract is the main guardrail preventing one bot from behaving like another or gaining unapproved capabilities.

## Source of Truth and Retrieval

LightRAG is the approved retrieval/LLM data interaction layer. That means:

- bots do not directly query arbitrary data stores
- retrieval targets are bot-bound and policy-bound
- every query is tagged with session, bot, and user context
- citations should be returned when the bot type supports them
- retrieved content should be clipped and sanitized before entering model context

For bots with different knowledge domains, the system should bind each bot to a specific collection/index/configuration rather than sharing one unrestricted retrieval space.

## PDF Upload and Report Generation

### Upload Flow

- Only bots with `pdf_upload` capability can accept PDFs.
- Enforce file size, mime type, page count, and upload count limits.
- Scan the file before processing.
- Extract text and metadata.
- Store original file and normalized text separately.
- Feed only sanitized extracted content into retrieval or task logic.

### Report Generation Flow

- Bots that generate polished deliverables should produce structured data first.
- Backend merges structured data into approved HTML templates.
- HTML is rendered to PDF through a deterministic renderer.
- Final artifact is stored and made downloadable inside the mini app.

### Why HTML-to-PDF

- Consistent branding
- Better typography and layout control
- Easier QA for professional-looking reports
- Easier template reuse across multiple bots

## Form-Based Workflows

Some bots should collect structured information before generation. Instead of treating this as freeform chat only:

- define a bot-specific form schema
- render guided form panels in the shared shell
- autosave draft form state
- validate before submit
- feed normalized values into downstream generation

This is cleaner and more reliable than trying to extract every required field from unconstrained chat.

## Session Timer Design

The three-hour limit is across all bots collectively, not per bot.

Recommended behavior:

- Timer starts when the user first enters the actual playground after profile/BYOK completion.
- Session end time is fixed for that active session.
- Switching bots does not reset the timer.
- Timer remains visible in the top bar.
- Backend is authoritative; frontend timer is display only.
- Gracefully complete any in-flight request that began before timeout, then lock new requests.

## Telegram-Specific Constraints

- Do not spam the group with repeated bot messages.
- Use the group bot message only as the gateway into the mini app.
- Respect Telegram webhook throughput and retry behavior.
- Validate Telegram mini app init data server-side on every authenticated launch.
- Keep the mini app fast and mobile-first since most usage will be on mobile devices.

## Security Model

### Prompt and Policy Security

- Never let the model choose its own tools or permissions.
- Tool/action access comes only from the bot policy manifest.
- System and policy prompts are versioned and stored outside user reach.
- Strip or neutralize prompt injection patterns from uploads and retrieved source material where possible.
- Separate user content from system/policy content in the runtime stack.

### User and Session Security

- Validate Telegram identity server-side.
- Tie all actions to session id, user id, and bot id.
- Enforce strict session expiry.
- Avoid durable BYOK secret storage in v1.
- Add rate limiting per user and per IP where appropriate.

### Data Isolation

- Per-bot source bindings
- Per-session artifact scope
- No shared conversational memory across bots unless explicitly designed
- No provider credential reuse without user consent

## Error Handling and Edge Cases

### Onboarding

- Telegram payload invalid or expired
  - show retry flow and relaunch guidance
- Profile partially created
  - allow resume instead of forcing restart
- OAuth callback interrupted
  - preserve onboarding state and resume on return
- API key invalid
  - show provider-specific validation error without leaking internals

### Session and Timing

- User refreshes or closes mini app
  - resume active session if still valid
- Timer hits zero during long-running request
  - let active request finish, then lock session
- Redis restart or worker lag
  - session state remains recoverable from Supabase

### Bot Interaction

- User selects a bot without required capabilities connected
  - explain what is missing
- Upload fails scan or parse
  - provide clear retry or replacement path
- Retrieval returns no useful context
  - bot should say it cannot find enough evidence instead of hallucinating
- HTML render fails
  - preserve structured data and allow rerender/retry

### Abuse and Safety

- Repeated jailbreak attempts
  - warn, log, and optionally cool down or terminate session
- Oversized files or unsupported formats
  - reject with clear limits
- Provider quota exhausted
  - surface provider-side issue and pause interactions

## Observability and Audit

Track:

- mini app launches
- profile completion rate
- provider connection success/failure rate
- bot selection frequency
- message counts per bot
- upload attempts and failures
- report generation success/failure
- session expiration/completion
- review CTA click-through
- paid community conversion signals if available

Keep audit logs for:

- policy changes
- bot manifest changes
- provider validation events
- session lockouts
- artifact generation events

## QA and Review Expectations

Every code change should pass through:

- automated linting
- automated tests
- human or agent code review
- focused refactor pass before release

Minimum test coverage areas:

- Telegram init data validation
- onboarding/profile persistence
- BYOK connect/validate flows
- session timer enforcement
- bot policy enforcement
- upload validation
- HTML-to-PDF generation
- conversation persistence
- review CTA flow

## Recommended Build Sequence

### Phase 1: Foundation

- Telegram bot welcome flow
- mini app shell
- Telegram identity validation
- profile creation
- Supabase persistence

### Phase 2: BYOK and Session Control

- OAuth and API key flows
- provider validation
- session start and countdown
- session expiry enforcement

### Phase 3: Bot Framework

- bot catalog
- capability manifest
- shared runtime contract
- first two bots end to end

### Phase 4: Enhanced Capabilities

- PDF upload
- form workflows
- citation panel
- HTML-to-PDF rendering

### Phase 5: Scale to Full Catalog

- remaining bots
- analytics
- review flow
- conversion polish

This still supports a six-plus bot vision, but it avoids trying to build six full custom experiences before the core runtime is stable.

## Recommendation Summary

- Use one Telegram mini app with a shared premium shell.
- Keep the Telegram bot thin and use it mainly for entry.
- Use Supabase for operational data and policy-backed bot manifests.
- Use Redis/BullMQ for async work.
- Use LightRAG as the controlled retrieval layer.
- Keep n8n limited to onboarding if it genuinely helps.
- Use a capability manifest so every bot shares the shell but only gets approved powers.
- Use session-only BYOK retention and purge credentials when the session ends.
- Use structured forms and HTML templates for polished PDF outputs.

## Out of Scope for v1

- Arbitrary user-created bots
- Deep multi-user collaboration inside the same playground session
- Cross-bot shared memory
- Full billing inside the mini app
- Complex admin CMS unless needed to manage bot definitions safely

## Open Decisions

- Which LLM providers must be supported on day one
- Exact HTML-to-PDF rendering tool choice
- Exact bot list and launch order
- Whether the review CTA should go to a Telegram review group, an external page, or both

## Implementation Planning Notes

When we move from design to build, the implementation plan should decompose work into:

- frontend shell and Telegram Web App integration
- backend auth/session/provider modules
- Supabase schema and policies
- worker queue and artifact pipeline
- bot runtime/policy engine
- per-bot capability packages
- QA/review/lint/refactor pipeline

The plan should assume all coding is code-reviewed, all final code is linted, and risky areas such as prompt-injection defense, session expiry, and artifact rendering receive extra test attention.
