create table playground_uploads (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references playground_sessions(id) on delete cascade,
  bot_id text not null references playground_bot_definitions(bot_id),
  original_filename text not null,
  normalized_filename text not null,
  mime_type text not null,
  byte_size integer not null check (byte_size > 0),
  virus_scan_status text not null default 'pending',
  parse_status text not null default 'queued',
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index playground_uploads_session_id_idx on playground_uploads(session_id);
create index playground_uploads_bot_id_idx on playground_uploads(bot_id);

create table playground_artifacts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references playground_sessions(id) on delete cascade,
  upload_id uuid not null references playground_uploads(id) on delete cascade,
  bot_id text not null references playground_bot_definitions(bot_id),
  artifact_type text not null,
  template_id text,
  status text not null default 'queued',
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index playground_artifacts_session_id_idx on playground_artifacts(session_id);
create index playground_artifacts_upload_id_idx on playground_artifacts(upload_id);
