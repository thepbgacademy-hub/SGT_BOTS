# Rori Phase 5 Wiki Knowledge Source

## Goal

Add a wiki-backed Academy knowledge source for Rori while keeping live operational data separate. The wiki owns general Academy guidance, enrollment explanation, tool guidance, and Telegram troubleshooting copy. The operations directory remains the only source for live Telegram invite links, workshop records, and registration URLs.

## Scope

- Add a `rori_academy_wiki_pages` table for published Academy wiki pages.
- Mirror the migration into `vps-supabase-manual`.
- Add a Rori wiki repository with local fallback pages and Supabase REST reads.
- Inject the wiki repository into the Rori chat runtime.
- Use wiki pages for general Academy and enrollment answers.
- Preserve directory-first answers for live rooms, events, and registration links.

## Data Rules

- Do not seed fake Academy links, fake events, or fake room invites.
- Wiki `source_url` may be an internal `sgt-bots://` source or a real `https://` source.
- Placeholder-like URLs are rejected by SQL constraints.
- If Supabase is unavailable, Rori falls back to local published wiki pages.
- If no live operations link is configured, Rori says the link is not configured.

## Acceptance Checks

- Wiki repo tests cover fallback, Supabase row mapping, and failure fallback.
- API E2E verifies the migration contract and injected wiki-backed Rori replies.
- Existing directory tests still prove live room/event data stays separate from the wiki source.
