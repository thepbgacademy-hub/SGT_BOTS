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
9. `012_rori_schema_segregation.sql`
10. `014_academy_bot_persona_configs.sql` after `public.academy_bot_prompt_configs` exists

Notes:

- Run them one file at a time.
- If one file errors, stop there and fix that file before moving on.
- The first file creates `public.users`, which is the table currently missing in the VPS stack.
- `006_playground_bot_registry.sql` enables RLS for the bot registry and seeds the six current menu bots.
- `008_rori_academy_directory.sql` creates the dedicated `rori` schema, then creates Rori's Academy event and Telegram room directory tables inside it. It does not seed fake events or invite links.
- `009_rori_academy_wiki.sql` creates Rori's Academy wiki page table inside the dedicated `rori` schema. It does not seed fake links or event data.
- `012_rori_schema_segregation.sql` is only needed for existing environments that already created the old public Rori tables. It moves those live Rori Academy tables into the `rori` schema without deleting data.
- `014_academy_bot_persona_configs.sql` defines reviewed playground persona prompt-config rows only for Rori, Top Secret, and Insight. It does not create persona rows for Cursive, ShAzZaM!, or Condor.

## Rori Academy Data

Do not hand-write live Rori insert statements. Fill `rori-academy-data.template.json` with Academy-approved records only, then generate checked SQL:

```powershell
corepack pnpm rori:data:sql -- --input vps-supabase-manual\rori-academy-data.template.json --output vps-supabase-manual\rori-academy-data.generated.sql
```

The generated SQL uses upserts only. It does not delete, truncate, or drop records.

The generated SQL now writes into the dedicated `rori` schema:

- `rori.rori_academy_wiki_pages`
- `rori.rori_telegram_rooms`
- `rori.rori_academy_events`

For the current PBG Academy wiki load, use the reviewed import file:

- `rori-academy-data.pbg-wiki.json`

That bundle contains the public-facing Academy concierge pages and official support-channel records only. Student-only pages are intentionally not loaded into the public Rori concierge schema until a separate access-control boundary exists for enrolled-student content.

The template is intentionally empty and will fail validation until real records are added. Keep generated SQL local unless the records have been reviewed and approved for the target VPS.
