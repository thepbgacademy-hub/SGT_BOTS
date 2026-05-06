create table provider_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider_name text not null,
  auth_method text not null,
  validation_status text not null,
  metadata jsonb not null default '{}'::jsonb,
  connected_at timestamptz not null default now(),
  expires_at timestamptz,
  last_validated_at timestamptz not null default now()
);

create table playground_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider_connection_id uuid not null references provider_connections(id),
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null,
  review_prompted boolean not null default false
);
