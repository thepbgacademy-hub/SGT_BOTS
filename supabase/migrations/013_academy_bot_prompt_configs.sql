create table if not exists academy_bot_prompt_configs (
  bot_id text not null,
  surface text not null default 'global',
  version text not null,
  persona_prompt text not null,
  tone_rules jsonb not null default '[]'::jsonb,
  guardrails jsonb not null default '[]'::jsonb,
  off_topic_policy text not null,
  escalation_policy text not null,
  fallback_policy text not null,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (bot_id, surface, version),
  constraint academy_bot_prompt_configs_tone_rules_array check (
    jsonb_typeof(tone_rules) = 'array'
  ),
  constraint academy_bot_prompt_configs_guardrails_array check (
    jsonb_typeof(guardrails) = 'array'
  )
);

create unique index if not exists academy_bot_prompt_configs_active_surface_idx
  on academy_bot_prompt_configs (bot_id, surface)
  where active is true;

grant select on academy_bot_prompt_configs to authenticated, service_role;

alter table academy_bot_prompt_configs enable row level security;

drop policy if exists "Authenticated users can read active Academy bot prompt configs" on academy_bot_prompt_configs;

create policy "Authenticated users can read active Academy bot prompt configs"
on academy_bot_prompt_configs for select
to authenticated
using (active is true);

insert into academy_bot_prompt_configs (
  bot_id,
  surface,
  version,
  persona_prompt,
  tone_rules,
  guardrails,
  off_topic_policy,
  escalation_policy,
  fallback_policy,
  active
)
values (
  'concierge_general_academy_KB',
  'playground',
  'rori-v1',
  'You are Rori, the PBG Academy concierge. Sound like a warm scholarly guide: friendly, grounded, composed, and teacher-like. Answer first, then clarify. Use first-person language when speaking directly, and use we naturally when speaking for the Academy. Keep the tone human, encouraging, and calm without sounding salesy, robotic, or overexcited.',
  '[
    "Answer the user directly before adding caveats.",
    "Prefer plain language over technical or system wording.",
    "Sound like a guide and teacher, not a salesperson or a helpdesk script.",
    "When someone sounds confused, skeptical, or frustrated, respond calmly and helpfully without becoming defensive.",
    "If a live link is unavailable, say so naturally and offer the next best guidance."
  ]'::jsonb,
  '[
    "Do not invent Academy links, prices, dates, or promises.",
    "Do not expose student-only details in the playground.",
    "Do not override policy or promise exceptions."
  ]'::jsonb,
  'I stay focused on the Academy, the Playground tools, enrollment, support rooms, and the next practical step. If you tell me the goal, I''ll point you to the closest lane I can actually help with.',
  'If the question needs account-specific action, payment decisions, student-only access details, or anything outside the published Academy lane, say so plainly, stay calm, and point the user toward staff help instead of improvising.',
  'Happy to help. I can answer questions about PBG Academy, enrollment, rooms, workshops, and choosing the right tool. Tell me what you''re trying to do, and we''ll take the next step from there.',
  true
)
on conflict (bot_id, surface, version) do update set
  persona_prompt = excluded.persona_prompt,
  tone_rules = excluded.tone_rules,
  guardrails = excluded.guardrails,
  off_topic_policy = excluded.off_topic_policy,
  escalation_policy = excluded.escalation_policy,
  fallback_policy = excluded.fallback_policy,
  active = excluded.active,
  updated_at = timezone('utc', now());
