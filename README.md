# SGT_BOTS

Telegram playground platform for showcasing specialized bots inside a Telegram mini app with BYOK onboarding, controlled bot permissions, and professional report generation.

## Current Status

This repository is in planning and bootstrap phase. The product design is documented, the local Git repository is initialized, and the baseline docs are in place so implementation can start from a clean foundation.

## Primary References

- Product design spec: `docs/superpowers/specs/2026-05-05-telegram-playground-design.md`
- Repo bootstrap plan: `docs/superpowers/plans/2026-05-05-repo-bootstrap.md`
- V1 implementation plan: `docs/superpowers/plans/2026-05-05-telegram-playground-v1-implementation.md`

## Planned Platform

- Telegram Bot and Telegram Mini App
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
