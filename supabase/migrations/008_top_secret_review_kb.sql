create table if not exists top_secret_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  session_id uuid not null references playground_sessions(id) on delete cascade,
  artifact_id uuid null,
  claims jsonb not null default '[]'::jsonb,
  findings jsonb not null default '[]'::jsonb,
  knowledge_signals jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists top_secret_submissions_user_idx
  on top_secret_submissions (user_id, created_at desc);

create index if not exists top_secret_submissions_session_idx
  on top_secret_submissions (session_id, created_at desc);

create index if not exists top_secret_submissions_artifact_idx
  on top_secret_submissions (artifact_id);

create table if not exists top_secret_review_candidates (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references top_secret_submissions(id) on delete cascade,
  claim text not null,
  normalized_claim text not null,
  matched_entry_ids jsonb not null default '[]'::jsonb,
  knowledge_signal jsonb not null default '{}'::jsonb,
  suggested_status text not null check (suggested_status in ('matched', 'needs_review')),
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists top_secret_review_candidates_status_idx
  on top_secret_review_candidates (status, created_at desc);

create index if not exists top_secret_review_candidates_normalized_claim_idx
  on top_secret_review_candidates (normalized_claim);

create table if not exists top_secret_approved_knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  source_candidate_id uuid null references top_secret_review_candidates(id) on delete set null,
  topic text not null check (topic in ('reviewed_pattern')) default 'reviewed_pattern',
  trigger_phrases jsonb not null default '[]'::jsonb,
  research_note text not null,
  common_sense_statement text not null,
  required_source_hints jsonb not null default '[]'::jsonb,
  status text not null check (status in ('approved')) default 'approved',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists top_secret_approved_knowledge_entries_status_idx
  on top_secret_approved_knowledge_entries (status, created_at desc);

create unique index if not exists top_secret_approved_knowledge_entries_source_candidate_idx
  on top_secret_approved_knowledge_entries (source_candidate_id)
  where source_candidate_id is not null;
