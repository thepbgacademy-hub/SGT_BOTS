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

  it("reports code fallback through the factory when Supabase env is absent", async () => {
    const diagnostics = vi.fn();
    const repo = createBotPromptConfigRepo(BASE_ENV, {
      onDiagnostic: diagnostics,
    });

    await expect(
      repo.getActiveConfigResult("concierge_general_academy_KB", "playground"),
    ).resolves.toMatchObject({
      config: expect.objectContaining({ surface: "global" }),
      diagnostic: {
        errorMessage: "Supabase env is absent; using in-memory prompt config",
        source: "code_fallback",
        surface: "global",
      },
    });
    expect(diagnostics).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "code_fallback",
        surface: "global",
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

  it("reports an exact Supabase surface match", async () => {
    const diagnostics = vi.fn();
    const repo = createSupabaseBotPromptConfigRepo(
      {
        ...BASE_ENV,
        supabaseServiceRoleKey: "service-role",
        supabaseUrl: "https://supabase.test",
      },
      {
        fetchImpl: vi.fn().mockResolvedValue({
          ok: true,
          json: async () => [
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
        }),
        onDiagnostic: diagnostics,
      },
    );

    await expect(
      repo.getActiveConfigResult("concierge_general_academy_KB", "playground"),
    ).resolves.toMatchObject({
      config: expect.objectContaining({ surface: "playground" }),
      diagnostic: {
        botId: "concierge_general_academy_KB",
        errorMessage: undefined,
        source: "supabase_exact",
        surface: "playground",
        version: "rori-v1",
      },
    });
    expect(diagnostics).toHaveBeenCalledWith(
      expect.objectContaining({ source: "supabase_exact" }),
    );
  });

  it("reports a Supabase global fallback when the requested surface has no active config", async () => {
    const repo = createSupabaseBotPromptConfigRepo(
      {
        ...BASE_ENV,
        supabaseServiceRoleKey: "service-role",
        supabaseUrl: "https://supabase.test",
      },
      {
        fetchImpl: vi.fn().mockResolvedValue({
          ok: true,
          json: async () => [
            {
              active: true,
              bot_id: "concierge_general_academy_KB",
              escalation_policy: "Escalate account-specific requests.",
              fallback_policy: "Global fallback.",
              guardrails: ["No made-up links."],
              off_topic_policy: "Stay in lane.",
              persona_prompt: "Be warm.",
              surface: "global",
              tone_rules: ["Answer first."],
              updated_at: "2026-06-02T00:00:00.000Z",
              version: "rori-v1",
            },
          ],
        }),
      },
    );

    await expect(
      repo.getActiveConfigResult("concierge_general_academy_KB", "playground"),
    ).resolves.toMatchObject({
      config: expect.objectContaining({ surface: "global" }),
      diagnostic: {
        errorMessage: undefined,
        source: "supabase_global_fallback",
        surface: "global",
      },
    });
  });

  it("reports code fallback when Supabase returns no usable config rows", async () => {
    const repo = createSupabaseBotPromptConfigRepo(
      {
        ...BASE_ENV,
        supabaseServiceRoleKey: "service-role",
        supabaseUrl: "https://supabase.test",
      },
      {
        fetchImpl: vi.fn().mockResolvedValue({
          ok: true,
          json: async () => [],
        }),
      },
    );

    await expect(
      repo.getActiveConfigResult("concierge_general_academy_KB", "playground"),
    ).resolves.toMatchObject({
      config: expect.objectContaining({ surface: "global" }),
      diagnostic: {
        errorMessage: "no active Supabase prompt config matched",
        source: "code_fallback",
      },
    });
  });

  it("reports a missing table degraded state without leaking the service key", async () => {
    const diagnostics = vi.fn();
    const repo = createSupabaseBotPromptConfigRepo(
      {
        ...BASE_ENV,
        supabaseServiceRoleKey: "service-role-secret",
        supabaseUrl: "https://supabase.test",
      },
      {
        fetchImpl: vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          text: async () =>
            '{"code":"PGRST205","message":"Could not find the table public.academy_bot_prompt_configs"}',
        }),
        onDiagnostic: diagnostics,
      },
    );

    const result = await repo.getActiveConfigResult(
      "concierge_general_academy_KB",
      "playground",
    );

    expect(result).toMatchObject({
      config: expect.objectContaining({ botId: "concierge_general_academy_KB" }),
      diagnostic: {
        errorCode: "PGRST205",
        errorMessage:
          "Supabase academy_bot_prompt_configs table is unavailable",
        source: "missing_table",
      },
    });
    expect(JSON.stringify(diagnostics.mock.calls)).not.toContain(
      "service-role-secret",
    );
  });

  it("reports a generic Supabase error state separately from missing table", async () => {
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
      repo.getActiveConfigResult("concierge_general_academy_KB", "playground"),
    ).resolves.toMatchObject({
      config: expect.objectContaining({ botId: "concierge_general_academy_KB" }),
      diagnostic: {
        errorCode: undefined,
        errorMessage: "Supabase academy_bot_prompt_configs select failed",
        source: "error",
      },
    });
  });
});
