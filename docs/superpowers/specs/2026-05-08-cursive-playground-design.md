# Cursive Playground Design

> Superseded on 2026-05-19 by `docs/superpowers/specs/2026-05-19-cursive-v2-redesign.md`.
> This document is fully replaced because the 2026-05-19 redesign changes Cursive architecture and scope.
> Do not use this document as the active Cursive source of truth.

## Summary

This document defines the v1 design for `Cursive`, the playground bot that helps users produce clear, concise, and accurate letters using structured intake, helper-only chat, approved citations, controlled addresses, and professional `8.5 x 11` HTML-to-PDF output.

Cursive is not a general-purpose chatbot. It is a category-driven drafting system that collects validated facts, routes the user into the correct letter workflow, uses the user's BYOK LLM to draft content, runs a separate review pass, and returns both portal-safe text and printable PDF artifacts.

## Product Goals

- Let users create professional dispute, verification, inquiry, and reconsideration letters inside the Telegram playground.
- Keep the system grounded in structured intake rather than freeform chat.
- Produce outputs that are usable both in web portals and as printable mailed letters.
- Keep prompts, templates, citations, and addresses in controlled data/config layers rather than scattered hardcoded logic.
- Prevent category drift, unsupported legal claims, and misrepresentation.
- Use the user's connected LLM provider without forcing the user to manage model orchestration details.

## Cursive Categories

V1 Cursive supports these categories:

- credit bureau dispute
- aggregator dispute
- direct creditor dispute
- bill collector dispute / request for assignment and bill of sale
- utility dispute
- reconsideration after denial
- full account history / accounting request
- IRS inquiry / dispute

Each category has its own intake schema, prompt profile, citation bundle, address rules, and output template variant.

## Core UX Model

### 1. Category-First Entry

- User opens `Cursive` from the playground menu.
- User lands on a category selection screen instead of a blank chat.
- Each category shows a short explanation of when to use it.

### 2. Structured Intake

- User completes a guided intake flow in the mini app.
- Each category defines:
  - required fields
  - optional fields
  - field types
  - helper copy
  - validation rules
- User cannot generate a final letter until all required fields are complete.

### 3. Helper-Only Chat

- Chat is available as a support tool only.
- Chat may:
  - explain a field
  - suggest wording
  - help the user understand a dispute type
  - help revise the final draft after generation
- Chat may not:
  - silently populate official intake fields
  - bypass missing required fields
  - change the category behind the scenes

The intake form is the source of truth for generation.

### 4. Draft Generation

- After intake validation, the backend composes a category-specific prompt package.
- The user's LLM drafts structured output based on:
  - intake payload
  - category profile
  - approved citations
  - approved addresses
  - template instructions
- Draft output is not treated as final until it passes validation and review.

### 5. Review Pipeline

The system runs a multi-stage quality pass:

1. hard validation before drafting
2. draft generation
3. hard validation of draft payload
4. separate review pass
5. controlled rewrite if needed
6. final render

The review pass is separate from the main drafting pass.

It should check for:

- invented facts
- unsupported legal claims
- wrong category logic
- wrong or unapproved citations
- tone or representation issues
- missing required information

The app should perform this silently. The user should never need to choose a second model or understand the internal pipeline.

### 6. Output Formats

Every completed Cursive workflow should generate:

- `chat preview`
  - short readable preview in the mini app
- `portal-safe text`
  - plain or lightly formatted text for online forms and dispute portals
- `formal letter HTML`
  - exact layout for on-screen review and PDF rendering
- `PDF artifact`
  - printable `8.5 x 11` document

## Template Requirements

HTML templates are the canonical output format.

All HTML templates must:

- render at `8.5 x 11`
- use print-safe margins
- preserve exact line and block spacing
- support superscript citation markers in the body
- support citation footers / footnotes
- support address block and subject line formatting
- support consistent page-break behavior
- convert cleanly to PDF without layout drift

Templates should be designed as reusable template families:

- formal mailed letter
- portal-safe / web submission output
- category-specific variants where needed

## Data and Configuration Model

Supabase should store most of the Cursive configuration and controlled content.

Recommended entities:

- `cursive_categories`
  - slug, display name, status, sort order, summary
- `cursive_intake_fields`
  - category slug, field key, label, type, required, helper text, validation config, order
- `cursive_prompt_profiles`
  - category slug, drafting prompt, rewrite rules, refusal rules, style instructions
- `cursive_citation_sets`
  - category slug, citation key, citation text, legal reference, display order
- `cursive_addresses`
  - entity type, organization name, street, city, state, zip, notes, active flag
- `cursive_templates`
  - category slug, template key, variant, version, active flag
- `cursive_drafts`
  - user id, category slug, intake payload, draft payload, review result, html snapshot, artifact id, status

Google Sheets should not remain the primary source of production address data in the playground version.

## Architecture

### Recommended Runtime

Use the mini app and backend as the primary runtime.

- `React mini app`
  - category selection
  - intake flow
  - helper chat
  - preview and artifact UI
- `Fastify backend`
  - intake validation
  - prompt assembly
  - review pass orchestration
  - HTML rendering
  - artifact persistence
- `Supabase`
  - config, drafts, artifacts, addresses, citations
- `Redis/BullMQ`
  - queued generation, rendering, retries, cleanup
- `Playwright`
  - HTML-to-PDF rendering

### n8n Position

n8n should not be the primary orchestration layer for Cursive inside the playground.

Reasons:

- webhook conflicts with Telegram bot behavior are likely
- rate limits and race conditions become harder to reason about
- category growth will make n8n-centric maintenance slower

n8n may remain useful as a reference implementation and for optional external automations, but not as the main runtime path for Cursive v1.

## Guardrails

Cursive should be tightly bounded by category and policy.

Guardrails must prevent:

- fabricated personal facts
- fabricated account details or case references
- unsupported statutory claims
- output generation with incomplete required intake
- category switching without user confirmation
- exposure of internal prompts, tools, or orchestration
- claims of legal representation

Guardrails should live in two places:

- structured backend validation
- category-specific prompt and review profiles

## BYOK Model Usage

Users should only connect their provider once. The app silently handles internal call roles.

The user should not need to choose:

- drafting model
- review model
- rewrite model

If only one model is available through the user's provider, the app may still run isolated draft and review passes as separate calls with separate prompts and low-temperature review settings.

## Initial Category Translation From Existing n8n Workflow

The current n8n workflow for `Cursive Credit Dispute` already proves a useful pattern:

- structured slot-filling intake
- bureau address lookup
- legal citation footer
- final letter formatting

That existing logic should be translated into the playground architecture as the first production category:

- `credit bureau dispute`

This category becomes the first template family and first testbed for the full Cursive engine.

## Operational Risks

- Telegram mobile UI space is tight, so intake must be staged and concise.
- Long-running generation or rendering should be queued so the chat path stays responsive.
- PDF generation must avoid formatting drift across devices and rerenders.
- Legal-content categories require careful prompt review and stronger validation than generic content bots.
- Address, citation, and template version control must be auditable.

## Testing Requirements

Before rollout, Cursive should have:

- schema validation tests per category
- prompt-package assembly tests
- review-result parser tests
- HTML template snapshot tests
- PDF smoke tests
- E2E tests covering:
  - category selection
  - required-field enforcement
  - helper-only chat behavior
  - successful draft generation
  - review fail and controlled rewrite
  - PDF artifact generation

## Scope For Cursive V1

Ship v1 in this order:

1. category engine and Supabase-backed config layer
2. `credit bureau dispute` as the first complete category
3. helper-only chat behavior
4. HTML template and PDF output for the first category
5. review pipeline
6. remaining categories

This keeps the first working version testable and aligned with the existing proven workflow while setting up the system for expansion.
