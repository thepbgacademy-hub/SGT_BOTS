# VPS Supabase Manual Apply

Apply these files in the Supabase SQL editor on the VPS in this exact order:

1. `001_initial_profile_tables.sql`
2. `002_sessions_and_provider_metadata.sql`
3. `003_bots_conversations_messages.sql`
4. `004_uploads_and_artifacts.sql`
5. `005_retention_and_audit.sql`
6. `006_playground_bot_registry.sql`
7. `008_rori_academy_directory.sql`
8. `009_rori_academy_wiki.sql`

Notes:

- Run them one file at a time.
- If one file errors, stop there and fix that file before moving on.
- The first file creates `public.users`, which is the table currently missing in the VPS stack.
- `006_playground_bot_registry.sql` enables RLS for the bot registry and seeds the six current menu bots.
- `008_rori_academy_directory.sql` creates Rori's Academy event and Telegram room directory tables. It does not seed fake events or invite links.
- `009_rori_academy_wiki.sql` creates Rori's Academy wiki page table. It does not seed fake links or event data.
