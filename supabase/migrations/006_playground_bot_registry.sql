create table if not exists playground_bot_registry (
  bot_id text primary key,
  display_name text not null unique,
  menu_position text not null check (
    menu_position in (
      'top_left',
      'middle_left',
      'bottom_left',
      'top_right',
      'middle_right',
      'bottom_right'
    )
  ),
  icon_asset_key text not null,
  dashboard_asset_key text not null default 'bot-dashboard',
  tagline text not null,
  runtime_status text not null default 'active' check (
    runtime_status in ('active', 'coming_soon', 'disabled')
  ),
  launch_order integer not null unique check (launch_order between 1 and 6),
  visible boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table playground_bot_registry enable row level security;

drop policy if exists "Authenticated users can read the playground bot registry" on playground_bot_registry;

create policy "Authenticated users can read the playground bot registry"
on playground_bot_registry for select
to authenticated
using (true);

insert into playground_bot_registry (
  bot_id,
  display_name,
  menu_position,
  icon_asset_key,
  dashboard_asset_key,
  tagline,
  runtime_status,
  launch_order,
  visible
)
values
  (
    'document_wizard',
    'Cursive',
    'top_left',
    'cursive-quill',
    'bot-dashboard',
    'Turns notes and source files into polished structured outputs.',
    'active',
    1,
    true
  ),
  (
    'tutor',
    'Insight',
    'middle_left',
    'insight-bulb',
    'bot-dashboard',
    'Guides the user step by step like a coach and explainer.',
    'active',
    2,
    true
  ),
  (
    'form_wizard',
    'ShAzZaM!',
    'bottom_left',
    'shazzam-hat',
    'bot-dashboard',
    'Collects structured inputs and builds final outputs from forms.',
    'active',
    3,
    true
  ),
  (
    'verifier',
    'Top Secret',
    'top_right',
    'top-secret-seal',
    'bot-dashboard',
    'Performs verification and high-scrutiny review workflows.',
    'active',
    4,
    true
  ),
  (
    'concierge_general_academy_KB',
    'Rori',
    'middle_right',
    'rori-lioness',
    'bot-dashboard',
    'Routes knowledge-base questions across the academy domain.',
    'active',
    5,
    true
  ),
  (
    'tax_legal_research',
    'Condor',
    'bottom_right',
    'condor-noir',
    'bot-dashboard',
    'Handles tax and legal research with grounded source support.',
    'active',
    6,
    true
  )
on conflict (bot_id) do update
set
  display_name = excluded.display_name,
  menu_position = excluded.menu_position,
  icon_asset_key = excluded.icon_asset_key,
  dashboard_asset_key = excluded.dashboard_asset_key,
  tagline = excluded.tagline,
  runtime_status = excluded.runtime_status,
  launch_order = excluded.launch_order,
  visible = excluded.visible,
  updated_at = timezone('utc', now());
