# Architecture Overview

The current design centers on a thin Telegram bot gateway, a Telegram mini app frontend, an application backend, Redis/BullMQ workers, Supabase for operational state, and LightRAG as the controlled retrieval layer.

## Core Principles

- Telegram is the entry point, not the full runtime surface.
- The mini app owns the user interaction experience.
- Every bot uses a shared runtime contract plus a capability manifest.
- BYOK is mandatory before any bot can be used.
- HTML templates are the source for professional PDF outputs.
