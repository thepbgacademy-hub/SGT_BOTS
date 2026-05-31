create schema if not exists rori;

grant usage on schema rori to authenticated, service_role;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'rori_academy_events'
  ) and not exists (
    select 1
    from information_schema.tables
    where table_schema = 'rori'
      and table_name = 'rori_academy_events'
  ) then
    alter table public.rori_academy_events set schema rori;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'rori_telegram_rooms'
  ) and not exists (
    select 1
    from information_schema.tables
    where table_schema = 'rori'
      and table_name = 'rori_telegram_rooms'
  ) then
    alter table public.rori_telegram_rooms set schema rori;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'rori_academy_wiki_pages'
  ) and not exists (
    select 1
    from information_schema.tables
    where table_schema = 'rori'
      and table_name = 'rori_academy_wiki_pages'
  ) then
    alter table public.rori_academy_wiki_pages set schema rori;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'rori'
      and table_name = 'rori_academy_events'
  ) then
    grant select on rori.rori_academy_events to authenticated, service_role;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'rori'
      and table_name = 'rori_telegram_rooms'
  ) then
    grant select on rori.rori_telegram_rooms to authenticated, service_role;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'rori'
      and table_name = 'rori_academy_wiki_pages'
  ) then
    grant select on rori.rori_academy_wiki_pages to authenticated, service_role;
  end if;
end $$;
