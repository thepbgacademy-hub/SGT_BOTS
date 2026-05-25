# Rori Phase 3 Academy Directory Data

## Goal

Connect Rori's workshop/event and Telegram room answers to a typed local directory shape instead of broad canned text. Rori must stay conservative: if an event or live link is not configured, it must say so plainly and never invent a URL. The real Academy-maintained operations source remains Phase 4.

## Completed Scope

- Added a typed Rori Academy directory source shape for workshops/events and Telegram room purposes.
- Added directory-backed Rori replies for:
  - upcoming workshops and events,
  - generic PBG Telegram room guidance,
  - specific Telegram access trouble routing,
  - unset workshop registration links,
  - unset room invite links.
- Kept Rori chat-only. No uploads, reports, PDF rendering, artifacts, Cursive behavior, or Top Secret behavior were changed.
- Kept directory citation URLs app-local with `sgt-bots://` identifiers until real public source URLs are configured.

## Admin Data Behavior

Current Phase 3 records are local typed records in:

- `apps/api/src/modules/chat/rori-directory.ts`

The workshop directory is intentionally empty until real Academy events are configured. Empty workshop data produces:

- no invented event dates,
- no invented registration links,
- a clear instruction to ask an Academy admin for the current schedule or registration path.

Telegram room records currently define purposes for:

- Enrollment Help,
- Workshop Updates,
- Technical Access Help,
- Tool Support.

All room invite links are intentionally marked not configured.

## Verification

- API E2E now verifies directory-backed workshop and Telegram room replies.
- Playwright E2E now verifies the directory replies reach the Rori mini app and no visible HTTP URL is invented.
- API lint and focused Rori/ChatPanel mini-app render tests passed during implementation.

## Next Step

Rori Phase 4 should connect this directory shape to the real Academy-maintained data source selected for operations. Options include a Supabase table with authenticated read access or another admin-maintained source, but rollout should not proceed with fake links or placeholder event data.
