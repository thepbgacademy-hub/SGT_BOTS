# Rori Phase 6 Admin Data Preflight

## Goal

Prepare Rori for real Academy-managed wiki pages, Telegram room records, event records, and live links without inventing or seeding unapproved data.

## Outcome

No approved production Rori content was found in the repo or vault search paths checked during this phase. Because of that, this phase does not load live rows into Supabase and does not perform a VPS/Telegram rollout.

Instead, Phase 6 adds a reviewed import path:

- `vps-supabase-manual/rori-academy-data.template.json` holds the admin-fillable shape.
- `scripts/rori-academy-data.mjs` validates real Rori data and generates non-destructive upsert SQL.
- `corepack pnpm rori:data:sql -- --input <json> --output <sql>` is the generation command.
- Generated SQL is ignored at `vps-supabase-manual/rori-academy-data.generated.sql`.

## Data Rules

- Empty production imports fail validation.
- Placeholder text such as `TBD`, `TODO`, `placeholder`, localhost URLs, and `example.*` URLs are rejected.
- Configured Telegram rooms require `https://t.me/` invite URLs.
- Configured event registrations require `https://` registration URLs.
- Non-configured or closed records must omit live URLs.
- Wiki source URLs may be `https://`, `sgt-bots://`, or omitted.
- The generated SQL uses upserts only and must not delete, truncate, or drop rows.

## Rollout Gate

The next phase needs Academy-approved data before touching the VPS:

- Approved Rori wiki pages.
- Approved Telegram room names, purposes, and invite links.
- Approved event/workshop records and registration links.
- Confirmation that the target VPS has migrations `008` and `009` applied.

After approved data exists, generate SQL locally, review it, apply it on the target database, rebuild/restart the VPS app from the pushed branch, and smoke test Rori in Telegram.
