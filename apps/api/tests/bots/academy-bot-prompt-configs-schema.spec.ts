import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BOT_MANIFESTS } from "../../../../packages/shared/src/bots/manifests";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function whitespaceTolerantPattern(value: string) {
  return new RegExp(value.split(/\s+/).map(escapeRegExp).join("\\s+"));
}

function expectContainsIgnoringWhitespace(source: string, expected: string) {
  expect(source).toMatch(whitespaceTolerantPattern(expected));
}

const testDirectory = dirname(fileURLToPath(import.meta.url));

function resolveFromRepoRoot(...segments: string[]) {
  return resolve(testDirectory, "..", "..", "..", "..", ...segments);
}

function readPromptConfigMigration() {
  return readFileSync(
    resolveFromRepoRoot(
      "supabase",
      "migrations",
      "013_academy_bot_prompt_configs.sql",
    ),
    "utf8",
  );
}

function getRoriManifestPromptVersion() {
  const roriManifest = BOT_MANIFESTS.find(
    (bot) => bot.id === "concierge_general_academy_KB",
  );

  expect(roriManifest).toBeDefined();

  return roriManifest!.promptVersion;
}

describe("Academy bot prompt config schema migration", () => {
  it("matches the runtime loader column contract", () => {
    const sql = readPromptConfigMigration();

    expect(sql).toContain(
      "create table if not exists public.academy_bot_prompt_configs",
    );
    expect(sql).toContain("bot_id text not null");
    expect(sql).toContain("surface text not null default 'global'");
    expect(sql).toContain("version text not null");
    expect(sql).toContain("persona_prompt text not null");
    expect(sql).toContain("tone_rules jsonb not null default '[]'::jsonb");
    expect(sql).toContain("guardrails jsonb not null default '[]'::jsonb");
    expect(sql).toContain("off_topic_policy text not null");
    expect(sql).toContain("escalation_policy text not null");
    expect(sql).toContain("fallback_policy text not null");
    expect(sql).toContain("active boolean not null default true");
    expect(sql).toContain("updated_at timestamptz not null");
  });

  it("enforces one active config per bot and surface while preserving version history", () => {
    const sql = readPromptConfigMigration();

    expect(sql).toContain("with ranked_active_configs as");
    expectContainsIgnoringWhitespace(
      sql,
      `partition by bot_id, surface
       order by updated_at desc, version desc`,
    );
    expectContainsIgnoringWhitespace(
      sql,
      `where ctid in (
        select ctid
        from ranked_active_configs
        where active_rank > 1
      )`,
    );
    expect(sql).toContain("primary key (bot_id, surface, version)");
    expect(sql).toContain(
      "create unique index if not exists academy_bot_prompt_configs_active_surface_idx",
    );
    expectContainsIgnoringWhitespace(
      sql,
      `on public.academy_bot_prompt_configs (bot_id, surface)
       where active is true`,
    );
    expect(sql).not.toContain(
      "on public.academy_bot_prompt_configs (bot_id, surface, version)",
    );
  });

  it("keeps policy and seed upserts aligned to the public table", () => {
    const sql = readPromptConfigMigration();
    const roriPromptVersion = getRoriManifestPromptVersion();

    expect(sql).toContain(
      "grant select on public.academy_bot_prompt_configs to authenticated, service_role",
    );
    expect(sql).toContain(
      "alter table public.academy_bot_prompt_configs enable row level security",
    );
    expect(sql).toContain(
      'drop policy if exists "Authenticated users can read active Academy bot prompt configs" on public.academy_bot_prompt_configs',
    );
    expect(sql).toContain(
      "on public.academy_bot_prompt_configs for select",
    );
    expect(sql).toContain("using (active is true)");
    expectContainsIgnoringWhitespace(
      sql,
      `update public.academy_bot_prompt_configs
       set
         active = false,
         updated_at = timezone('utc', now())
       where bot_id = 'concierge_general_academy_KB'
         and surface = 'playground'
         and version <> '${roriPromptVersion}'
         and active is true`,
    );
    expect(sql).toContain("insert into public.academy_bot_prompt_configs");
    expect(sql).toContain(`'${roriPromptVersion}'`);
    expect(sql).toContain("on conflict (bot_id, surface, version) do update");
  });

  it("guards array-shaped prompt fields with jsonb checks", () => {
    const sql = readPromptConfigMigration();

    expectContainsIgnoringWhitespace(
      sql,
      `constraint academy_bot_prompt_configs_tone_rules_array check (
        jsonb_typeof(tone_rules) = 'array'
      )`,
    );
    expectContainsIgnoringWhitespace(
      sql,
      `constraint academy_bot_prompt_configs_guardrails_array check (
        jsonb_typeof(guardrails) = 'array'
      )`,
    );
  });
});
