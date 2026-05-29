create table playground_bot_definitions (
  bot_id text primary key,
  name text not null,
  category text not null,
  capability_manifest jsonb not null default '{}'::jsonb,
  source_binding text not null,
  prompt_version text not null,
  active boolean not null default true
);

insert into playground_bot_definitions (
  bot_id,
  name,
  category,
  capability_manifest,
  source_binding,
  prompt_version,
  active
)
values
  (
    'document_wizard',
    'Document Wizard',
    'workflow',
    '{"chat": true, "pdf_upload": true, "structured_form": true, "html_report": true, "citations": false, "rag_query": false}'::jsonb,
    'none',
    'phase-3-v1',
    true
  ),
  (
    'kb_concierge',
    'Knowledge Concierge',
    'knowledge',
    '{"chat": true, "pdf_upload": false, "structured_form": false, "html_report": false, "citations": true, "rag_query": true}'::jsonb,
    'knowledge_base',
    'phase-3-v1',
    true
  );

create table playground_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references playground_users(id) on delete cascade,
  session_id uuid not null references playground_sessions(id) on delete cascade,
  bot_id text not null references playground_bot_definitions(bot_id),
  state jsonb not null default '{"status":"active"}'::jsonb,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz
);

create table playground_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references playground_conversations(id) on delete cascade,
  role text not null,
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  capabilities jsonb not null default '{}'::jsonb,
  safety_flags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
