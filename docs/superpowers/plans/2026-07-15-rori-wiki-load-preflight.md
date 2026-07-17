# Rori Wiki Load Preflight

This preflight covers the next bounded Rori data-load ticket. It does not apply SQL to Supabase or change VPS state.

## Scope

- Source bundle: `vps-supabase-manual/rori-academy-data.pbg-wiki.json`
- SQL generator: `scripts/rori-academy-data.mjs`
- Runtime schema: `rori.rori_academy_wiki_pages`, `rori.rori_telegram_rooms`, and `rori.rori_academy_events`
- Runtime reader: `apps/api/src/modules/chat/rori-wiki.repo.ts`

## Four-ticket checklist

- [x] **Ticket 1: Bundle integrity** - the checked-in bundle contains seven public wiki pages, two support-room records, and no event records. Student-only pages are excluded.
- [x] **Ticket 2: Safe SQL generation** - the generator completed successfully and produced only transactional `insert ... on conflict do update` statements for the dedicated `rori` schema.
- [x] **Ticket 3: Runtime contract** - import validation, Supabase retrieval, and Rori response grounding tests passed together: 29 tests.
- [x] **Ticket 4: Target schema and deployed-backend read** - VPS2 already had the dedicated Rori tables and expected reviewed records. A process in the deployed backend received HTTP 200 and all seven published page keys through the `rori` PostgREST profile. No reapply, restart, or database write was required.

## Verification run

```text
corepack pnpm rori:data:sql -- --input vps-supabase-manual\rori-academy-data.pbg-wiki.json --output vps-supabase-manual\rori-academy-data.generated.sql
corepack pnpm exec vitest run apps/api/tests/chat/rori-academy-data-import.spec.ts apps/api/tests/chat/rori-wiki-repo.spec.ts apps/api/tests/chat/rori-kb.spec.ts --pool=forks --maxWorkers=1 --minWorkers=1
```

Result: 3 test files passed, 29 tests passed.

## Remote gate

The target already has the expected dedicated-schema tables and reviewed rows. The remaining manual check is a real Telegram Rori conversation using the frozen acceptance prompts. Before any future reapply, confirm the target still has migrations `008` and `009`; if legacy public Rori tables exist, confirm `012_rori_schema_segregation.sql` has been applied first.
