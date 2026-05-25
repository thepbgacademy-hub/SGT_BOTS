create table if not exists rori_academy_events (
  event_key text primary key,
  title text not null,
  summary text not null,
  timing text not null,
  event_type text not null default 'workshop' check (event_type in ('workshop', 'event')),
  status text not null default 'active' check (status in ('active', 'cancelled', 'archived')),
  keywords text[] not null default '{}',
  registration_status text not null default 'not_configured' check (
    registration_status in ('configured', 'not_configured', 'closed')
  ),
  registration_url text,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint rori_academy_events_registration_url_state check (
    (
      registration_status = 'configured'
      and registration_url is not null
      and registration_url like 'https://%'
      and registration_url !~* '(example\.invalid|example\.com|localhost|127\.0\.0\.1|tbd|todo|placeholder|#)'
    )
    or (
      registration_status <> 'configured'
      and registration_url is null
    )
  )
);

create table if not exists rori_telegram_rooms (
  room_key text primary key,
  label text not null,
  purpose text not null,
  keywords text[] not null default '{}',
  link_status text not null default 'not_configured' check (
    link_status in ('configured', 'not_configured')
  ),
  invite_url text,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint rori_telegram_rooms_invite_url_state check (
    (
      link_status = 'configured'
      and invite_url is not null
      and invite_url like 'https://t.me/%'
      and invite_url !~* '(example\.invalid|example\.com|localhost|127\.0\.0\.1|tbd|todo|placeholder|#)'
    )
    or (
      link_status = 'not_configured'
      and invite_url is null
    )
  )
);

alter table rori_academy_events enable row level security;
alter table rori_telegram_rooms enable row level security;

drop policy if exists "Authenticated users can read active Rori Academy events" on rori_academy_events;
drop policy if exists "Authenticated users can read active Rori Telegram rooms" on rori_telegram_rooms;

create policy "Authenticated users can read active Rori Academy events"
on rori_academy_events for select
to authenticated
using (visible is true and status = 'active');

create policy "Authenticated users can read active Rori Telegram rooms"
on rori_telegram_rooms for select
to authenticated
using (visible is true);
