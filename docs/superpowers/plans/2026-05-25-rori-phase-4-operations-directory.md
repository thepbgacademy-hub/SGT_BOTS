# Rori Phase 4 Operations Directory Source

## Goal

Connect Rori's Phase 3 directory shape to an operations-backed Academy source while preserving conservative fallback behavior. Rori may show configured workshop registration URLs or Telegram invite URLs only when those values come from the directory source and pass database constraints.

## Completed Scope

- Added `rori_academy_events` and `rori_telegram_rooms` Supabase tables in migration `008_rori_academy_directory.sql`.
- Mirrored the same SQL into `vps-supabase-manual/008_rori_academy_directory.sql`.
- Added a Rori directory repository with:
  - local fallback records,
  - Supabase REST reads,
  - fallback on missing Supabase env or unavailable Supabase responses.
- Wired Rori chat replies to read the injected directory repo before answering workshop/event and Telegram room questions.
- Converted the chat service send path to async so Rori can load live directory records without changing the mini app API contract.
- Kept Cursive, Top Secret, and report workflows out of scope.

## Data Rules

- The migration does not seed fake events or fake invite links.
- `registration_status = 'configured'` requires a non-null `https://` registration URL.
- `link_status = 'configured'` requires a non-null `https://t.me/` invite URL.
- Placeholder-like values are rejected by SQL constraints.
- If Supabase is unavailable or empty, Rori falls back to the Phase 3 not-configured answers.

## Verification

- API E2E verifies the migration contract and injected configured Rori directory data.
- Rori directory repo unit tests verify fallback, Supabase row mapping, and failure fallback.
- Cursive chat guard tests were updated for the async chat service and still pass.

## Next Step

Rori Phase 5 should add the actual Academy-managed event and room records in the target operations database, then perform a VPS/Telegram smoke test with no placeholder data.
