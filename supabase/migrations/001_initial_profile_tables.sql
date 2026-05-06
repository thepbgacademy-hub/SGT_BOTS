create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id text not null unique,
  username text,
  first_name text not null,
  last_name text,
  preferred_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

create table if not exists telegram_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  language_code text,
  launch_metadata jsonb not null,
  validated_payload jsonb not null,
  raw_init_data_hash text not null,
  created_at timestamptz not null default now()
);
