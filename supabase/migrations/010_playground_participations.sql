create table if not exists playground_participations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references playground_users(id) on delete cascade,
  telegram_user_id text not null,
  telegram_username text,
  first_name text not null,
  preferred_name text not null,
  first_provider_name text not null,
  first_session_id uuid not null references playground_sessions(id) on delete cascade,
  participated_at timestamptz not null default now()
);
