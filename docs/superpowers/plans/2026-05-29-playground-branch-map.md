# Playground Branch Map

## Purpose

The Telegram playground is the parent product. Individual bots live inside that
product as scoped workflow lanes. Branch names should reflect whether a change
is playground-wide infrastructure or a bot-specific implementation phase.

## Current Reality

The branch `codex/rori-academy-concierge` started as a Rori workstream, but it
now carries broader playground integration work, including shared onboarding,
provider auth, session controls, one-entry participation gating, Top Secret
hardening, and shared mini app behavior.

Treat `codex/rori-academy-concierge` as the current playground stabilization
branch until the active Top Secret and shared session/provider work is fully
verified and merged.

## Product Layers

### Playground Shell

Shared infrastructure belongs here:

- onboarding and profile creation
- provider connection and validation
- OpenAI Codex subscription login
- session timer and session termination
- one-entry participation gating
- shared artifact/report handling
- review prompt flow

### Bot Lanes

Bot-specific logic belongs in its own lane:

- Top Secret
- Rori
- Condor
- Shazzam
- Insight

## Branch Naming Rules

Use fresh branches from `main` with names that describe the actual work.

### Playground-wide branches

- `codex/playground-session-controls`
- `codex/playground-provider-auth`
- `codex/playground-artifact-isolation`
- `codex/playground-top-secret-hardening`

### Bot-specific branches

- `codex/playground-rori-runtime`
- `codex/playground-condor-v1`
- `codex/playground-shazzam-v1`
- `codex/playground-insight-v1`

## Phase Order

Work in this sequence unless priorities change:

1. Finish Top Secret live hardening
2. Resume Rori runtime and approved wiki grounding
3. Build Condor
4. Build Shazzam
5. Build Insight

## Guardrails

- Do not treat the current branch name as proof of current scope.
- Do not mix standalone bot work into the playground shell without saying so in
  the handoff.
- Shared playground changes should be documented as playground infrastructure,
  not hidden inside a bot-specific label.
- When a branch carries multiple bot or shell concerns, update `HANDOFF.md`
  immediately so the next session inherits the real scope.
