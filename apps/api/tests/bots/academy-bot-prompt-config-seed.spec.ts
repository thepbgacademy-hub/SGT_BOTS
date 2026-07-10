import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BOT_MANIFESTS, type BotId } from "../../../../packages/shared/src/bots/manifests";

const PERSONA_BOT_IDS = [
  "concierge_general_academy_KB",
  "verifier",
  "tutor",
] as const satisfies readonly BotId[];

const NON_PERSONA_BOT_IDS = [
  "document_wizard",
  "form_wizard",
  "tax_legal_research",
] as const satisfies readonly BotId[];

const testDirectory = dirname(fileURLToPath(import.meta.url));

function resolveFromRepoRoot(...segments: string[]) {
  return resolve(testDirectory, "..", "..", "..", "..", ...segments);
}

function readPersonaSeed() {
  return readFileSync(
    resolveFromRepoRoot(
      "vps-supabase-manual",
      "014_academy_bot_persona_configs.sql",
    ),
    "utf8",
  );
}

function manifestVersionFor(botId: BotId) {
  const manifest = BOT_MANIFESTS.find((bot) => bot.id === botId);

  expect(manifest).toBeDefined();

  return manifest!.promptVersion;
}

describe("Academy bot prompt config persona seed", () => {
  it("wraps the manual apply in a transaction", () => {
    const sql = readPersonaSeed().trim().toLowerCase();

    expect(sql).toContain("begin;");
    expect(sql.endsWith("commit;")).toBe(true);
  });

  it("defines reviewed playground records for persona bots only", () => {
    const sql = readPersonaSeed();

    for (const botId of PERSONA_BOT_IDS) {
      expect(sql).toContain(`'${botId}'`);
      expect(sql).toContain(`'${manifestVersionFor(botId)}'`);
    }

    for (const botId of NON_PERSONA_BOT_IDS) {
      expect(sql).not.toContain(`'${botId}'`);
    }
  });

  it("keeps seed fields aligned to the prompt config table shape", () => {
    const sql = readPersonaSeed();

    expect(sql).toContain("insert into public.academy_bot_prompt_configs");
    expect(sql).toContain("bot_id");
    expect(sql).toContain("surface");
    expect(sql).toContain("version");
    expect(sql).toContain("persona_prompt");
    expect(sql).toContain("tone_rules");
    expect(sql).toContain("guardrails");
    expect(sql).toContain("off_topic_policy");
    expect(sql).toContain("escalation_policy");
    expect(sql).toContain("fallback_policy");
    expect(sql).toContain("active");
    expect(sql).toContain("on conflict (bot_id, surface, version) do update");
  });

  it("deactivates old playground persona configs before inserting active records", () => {
    const sql = readPersonaSeed();

    expect(sql).toContain("update public.academy_bot_prompt_configs");
    expect(sql).toContain("set");
    expect(sql).toContain("active = false");
    expect(sql).toContain("where bot_id in (");
    expect(sql).toContain("and surface = 'playground'");
    expect(sql).toContain("and version <> 'phase-6-v1'");
    expect(sql).toContain("and active is true");
  });

  it("states source-grounding boundaries without implying workflow success", () => {
    const sql = readPersonaSeed();

    expect(sql).toContain("Do not claim verification, escalation, submission, or staff contact occurred unless the matching workflow actually completed.");
    expect(sql).toContain("Do not use general model knowledge as Academy fact.");
    expect(sql).toContain("Do not teach from unsupported examples or made-up lessons.");
  });
});
