create table audit_events (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  entity_type text not null,
  entity_id text not null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
