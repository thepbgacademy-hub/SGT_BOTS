create table if not exists rori_academy_wiki_pages (
  page_key text primary key,
  title text not null,
  summary text not null,
  body text not null,
  keywords text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  source_url text,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint rori_academy_wiki_source_url_safe check (
    source_url is null
    or (
      (
        source_url like 'https://%'
        or source_url like 'sgt-bots://%'
      )
      and source_url !~* '(example\.invalid|example\.com|localhost|127\.0\.0\.1|tbd|todo|placeholder|#)'
    )
  )
);

alter table rori_academy_wiki_pages enable row level security;

drop policy if exists "Authenticated users can read published Rori Academy wiki pages" on rori_academy_wiki_pages;

create policy "Authenticated users can read published Rori Academy wiki pages"
on rori_academy_wiki_pages for select
to authenticated
using (visible is true and status = 'published');
