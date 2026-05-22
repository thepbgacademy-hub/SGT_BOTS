create table if not exists public.cursive_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  helper_mode text not null default 'helper-only' check (helper_mode = 'helper-only'),
  output_modes text[] not null
    check (cardinality(output_modes) > 0)
    check (output_modes <@ array['portal_text', 'html_letter', 'pdf_letter']::text[]),
  enabled boolean not null default true,
  sort_order integer not null default 0,
  summary text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_cursive_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_cursive_categories_updated_at on public.cursive_categories;

create trigger set_cursive_categories_updated_at
  before update on public.cursive_categories
  for each row
  execute function public.set_cursive_updated_at();

alter table public.cursive_categories enable row level security;

drop policy if exists "Authenticated users can read cursive categories" on public.cursive_categories;

create policy "Authenticated users can read cursive categories"
  on public.cursive_categories
  for select
  to authenticated, service_role
  using (true);

create table if not exists public.cursive_intake_schemas (
  category_slug text primary key references public.cursive_categories(slug) on delete cascade,
  schema_version text not null,
  helper_mode text not null default 'helper-only' check (helper_mode = 'helper-only'),
  intake_schema jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_cursive_intake_schemas_updated_at on public.cursive_intake_schemas;

create trigger set_cursive_intake_schemas_updated_at
  before update on public.cursive_intake_schemas
  for each row
  execute function public.set_cursive_updated_at();

alter table public.cursive_intake_schemas enable row level security;

drop policy if exists "Authenticated users can read cursive intake schemas" on public.cursive_intake_schemas;

create policy "Authenticated users can read cursive intake schemas"
  on public.cursive_intake_schemas
  for select
  to authenticated, service_role
  using (true);

create table if not exists public.cursive_citations (
  id uuid primary key default gen_random_uuid(),
  category_slug text not null references public.cursive_categories(slug) on delete cascade,
  citation_key text not null,
  citation_text text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (category_slug, citation_key)
);

alter table public.cursive_citations enable row level security;

drop policy if exists "Authenticated users can read cursive citations" on public.cursive_citations;

create policy "Authenticated users can read cursive citations"
  on public.cursive_citations
  for select
  to authenticated, service_role
  using (true);

create table if not exists public.cursive_addresses (
  id uuid primary key default gen_random_uuid(),
  category_slug text not null references public.cursive_categories(slug) on delete cascade,
  address_key text not null,
  organization_name text not null,
  attention_line text not null default '',
  address_line_1 text not null,
  address_line_2 text not null default '',
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'US',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint cursive_addresses_category_slug_address_key_key unique (
    category_slug,
    address_key
  )
);

alter table public.cursive_addresses enable row level security;

drop policy if exists "Authenticated users can read cursive addresses" on public.cursive_addresses;

create policy "Authenticated users can read cursive addresses"
  on public.cursive_addresses
  for select
  to authenticated, service_role
  using (true);

create table if not exists public.cursive_prompts (
  category_slug text primary key references public.cursive_categories(slug) on delete cascade,
  prompt_version text not null,
  helper_mode text not null default 'helper-only' check (helper_mode = 'helper-only'),
  prompt_payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_cursive_prompts_updated_at on public.cursive_prompts;

create trigger set_cursive_prompts_updated_at
  before update on public.cursive_prompts
  for each row
  execute function public.set_cursive_updated_at();

alter table public.cursive_prompts enable row level security;

drop policy if exists "Authenticated users can read cursive prompts" on public.cursive_prompts;

create policy "Authenticated users can read cursive prompts"
  on public.cursive_prompts
  for select
  to authenticated, service_role
  using (true);

create table if not exists public.cursive_templates (
  category_slug text primary key references public.cursive_categories(slug) on delete cascade,
  template_version text not null,
  helper_mode text not null default 'helper-only' check (helper_mode = 'helper-only'),
  template_payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_cursive_templates_updated_at on public.cursive_templates;

create trigger set_cursive_templates_updated_at
  before update on public.cursive_templates
  for each row
  execute function public.set_cursive_updated_at();

alter table public.cursive_templates enable row level security;

drop policy if exists "Authenticated users can read cursive templates" on public.cursive_templates;

create policy "Authenticated users can read cursive templates"
  on public.cursive_templates
  for select
  to authenticated, service_role
  using (true);

create table if not exists public.cursive_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  category_slug text not null references public.cursive_categories(slug),
  intake_payload jsonb not null default '{}'::jsonb,
  draft_payload jsonb not null default '{}'::jsonb,
  review_payload jsonb not null default '{"status":"drafting","notes":[]}'::jsonb,
  html_snapshot text not null default '',
  status text not null default 'drafting'
    check (status in ('drafting', 'review_ready', 'needs_revision', 'approved')),
  check (jsonb_typeof(review_payload) = 'object'),
  check (
    (review_payload->>'status') in ('drafting', 'review_ready', 'needs_revision', 'approved')
  ),
  check (jsonb_typeof(review_payload->'notes') = 'array'),
  check (
    not jsonb_path_exists(review_payload, '$.notes[*] ? (@.type() != "string")')
  ),
  check (status = review_payload->>'status'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_cursive_drafts_updated_at on public.cursive_drafts;

create trigger set_cursive_drafts_updated_at
  before update on public.cursive_drafts
  for each row
  execute function public.set_cursive_updated_at();

alter table public.cursive_drafts enable row level security;

drop policy if exists "Users can read their own cursive drafts" on public.cursive_drafts;

create policy "Users can read their own cursive drafts"
  on public.cursive_drafts
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own cursive drafts" on public.cursive_drafts;

create policy "Users can insert their own cursive drafts"
  on public.cursive_drafts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own cursive drafts" on public.cursive_drafts;

create policy "Users can update their own cursive drafts"
  on public.cursive_drafts
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own cursive drafts" on public.cursive_drafts;

create policy "Users can delete their own cursive drafts"
  on public.cursive_drafts
  for delete
  to authenticated
  using (auth.uid() = user_id);
