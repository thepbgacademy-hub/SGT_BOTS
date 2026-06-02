import { describe, expect, it, vi } from "vitest";
import type { AppEnv } from "../../src/config/env";
import {
  createBotPromptConfigRepo,
  createSupabaseBotPromptConfigRepo,
} from "../../src/modules/bots/bot-prompt-config.repo";

const BASE_ENV: AppEnv = {
  appPort: 3001,
  playgroundParticipationBypassTelegramUserIds: [],
  profileRepoMode: "memory",
  providerValidationMode: "stub",
  telegramBotAppShortName: "app",
  telegramBotRuntimeMode: "off",
  telegramBotToken: "test-token",
  telegramBotTokens: ["test-token"],
  telegramBotUsername: "sgt_playground_bot",
  telegramReviewGroupUrl: "https://t.me/+review",
};

describe("bot prompt config repo", () => {
  it("falls back to the local Rori config when Supabase env is absent", async () => {
    const repo = createBotPromptConfigRepo(BASE_ENV);

    await expect(
      repo.getActiveConfig("concierge_general_academy_KB", "playground"),
    ).resolves.toEqual(
      expect.objectContaining({
        botId: "concierge_general_academy_KB",
        surface: "global",
        version: "rori-v1",
      }),
    );
  });

  it("loads active prompt config rows from Supabase and prefers the exact surface", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          active: true,
          bot_id: "concierge_general_academy_KB",
          escalation_policy: "Escalate account-specific requests.",
          fallback_policy: "Warm fallback.",
          guardrails: ["No made-up links."],
          off_topic_policy: "Stay in lane.",
          persona_prompt: "Be warm.",
          surface: "global",
          tone_rules: ["Answer first."],
          updated_at: "2026-06-02T00:00:00.000Z",
          version: "rori-v0",
        },
        {
          active: true,
          bot_id: "concierge_general_academy_KB",
          escalation_policy: "Escalate account-specific requests.",
          fallback_policy: "Playground fallback.",
          guardrails: ["No made-up links."],
          off_topic_policy: "Stay in the playground lane.",
          persona_prompt: "Be warm in playground.",
          surface: "playground",
          tone_rules: ["Answer first."],
          updated_at: "2026-06-02T00:00:00.000Z",
          version: "rori-v1",
        },
      ],
    });
    const repo = createSupabaseBotPromptConfigRepo(
      {
        ...BASE_ENV,
        supabaseServiceRoleKey: "service-role",
        supabaseUrl: "https://supabase.test",
      },
      { fetchImpl },
    );

    await expect(
      repo.getActiveConfig("concierge_general_academy_KB", "playground"),
    ).resolves.toEqual(
      expect.objectContaining({
        fallbackPolicy: "Playground fallback.",
        surface: "playground",
        version: "rori-v1",
      }),
    );
  });

  it("falls back to the local config when Supabase fails", async () => {
    const repo = createSupabaseBotPromptConfigRepo(
      {
        ...BASE_ENV,
        supabaseServiceRoleKey: "service-role",
        supabaseUrl: "https://supabase.test",
      },
      {
        fetchImpl: vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          text: async () => "database unavailable",
        }),
      },
    );

    await expect(
      repo.getActiveConfig("concierge_general_academy_KB", "playground"),
    ).resolves.toEqual(
      expect.objectContaining({
        botId: "concierge_general_academy_KB",
        version: "rori-v1",
      }),
    );
  });
});

