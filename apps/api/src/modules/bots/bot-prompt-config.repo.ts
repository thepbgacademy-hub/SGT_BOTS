import type { AppEnv } from "../../config/env";

export type BotPromptConfig = {
  active: boolean;
  botId: string;
  escalationPolicy: string;
  fallbackPolicy: string;
  guardrails: string[];
  offTopicPolicy: string;
  personaPrompt: string;
  surface: string;
  toneRules: string[];
  updatedAt?: string;
  version: string;
};

export type BotPromptConfigSource =
  | "supabase_exact"
  | "supabase_global_fallback"
  | "code_fallback"
  | "missing_table"
  | "error";

export type BotPromptConfigDiagnostic = {
  botId: string;
  errorCode?: string;
  errorMessage?: string;
  source: BotPromptConfigSource;
  surface: string;
  version?: string;
};

export type BotPromptConfigResult = {
  config: BotPromptConfig | null;
  diagnostic: BotPromptConfigDiagnostic;
};

export type BotPromptConfigRepo = {
  getActiveConfig(botId: string, surface: string): Promise<BotPromptConfig | null>;
  getActiveConfigResult(
    botId: string,
    surface: string,
  ): Promise<BotPromptConfigResult>;
};

type FetchLike = typeof fetch;
type DiagnosticReporter = (diagnostic: BotPromptConfigDiagnostic) => void;

type SupabaseBotPromptConfigRow = {
  active: boolean;
  bot_id: string;
  escalation_policy: string;
  fallback_policy: string;
  guardrails: string[] | null;
  off_topic_policy: string;
  persona_prompt: string;
  surface: string;
  tone_rules: string[] | null;
  updated_at: string | null;
  version: string;
};

const FALLBACK_BOT_PROMPT_CONFIGS: BotPromptConfig[] = [
  {
    active: true,
    botId: "concierge_general_academy_KB",
    escalationPolicy:
      "If the question needs account-specific action, payment decisions, student-only access details, or anything outside the published Academy lane, Rori should say so plainly, stay calm, and point the user toward staff help instead of improvising.",
    fallbackPolicy:
      "Happy to help. I can answer questions about PBG Academy, enrollment, rooms, workshops, and choosing the right tool. Tell me what you're trying to do, and we'll take the next step from there.",
    guardrails: [
      "Do not invent Academy links, prices, dates, or promises.",
      "Do not override policy, approve exceptions, or expose student-only details in the playground.",
      "Stay in first person or warm Academy voice and keep replies calm, conversational, and direct.",
    ],
    offTopicPolicy:
      "I stay focused on the Academy, the Playground tools, enrollment, support rooms, and the next practical step. If you tell me the goal, I'll point you to the closest lane I can actually help with.",
    personaPrompt:
      "You are Rori, the PBG Academy concierge. Sound like a warm scholarly guide: friendly, grounded, composed, and teacher-like. Answer first, then clarify. Use first-person language when speaking directly, and use we naturally when speaking for the Academy. Keep the tone human, encouraging, and calm without sounding salesy, robotic, or overexcited.",
    surface: "global",
    toneRules: [
      "Answer the user's question directly before giving caveats.",
      "Prefer plain language over technical or system-style wording.",
      "Sound like a guide and teacher, not a salesperson or a helpdesk script.",
      "When someone sounds confused, skeptical, or frustrated, respond calmly and helpfully without becoming defensive.",
      "When a live link or action is unavailable, say so naturally and offer the next best guidance.",
    ],
    version: "rori-v1",
  },
];

function hasSupabaseEnv(env: AppEnv) {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}

function mapRow(row: SupabaseBotPromptConfigRow): BotPromptConfig {
  return {
    active: row.active,
    botId: row.bot_id,
    escalationPolicy: row.escalation_policy,
    fallbackPolicy: row.fallback_policy,
    guardrails: row.guardrails ?? [],
    offTopicPolicy: row.off_topic_policy,
    personaPrompt: row.persona_prompt,
    surface: row.surface,
    toneRules: row.tone_rules ?? [],
    updatedAt: row.updated_at ?? undefined,
    version: row.version,
  };
}

function selectConfig(
  configs: BotPromptConfig[],
  botId: string,
  surface: string,
) {
  return (
    configs.find(
      (config) =>
        config.active &&
        config.botId === botId &&
        config.surface.toLowerCase() === surface.toLowerCase(),
    ) ??
    configs.find(
      (config) =>
        config.active &&
        config.botId === botId &&
        config.surface.toLowerCase() === "global",
    ) ??
    null
  );
}

function buildDiagnostic(input: {
  config: BotPromptConfig | null;
  errorCode?: string;
  errorMessage?: string;
  requestedSurface: string;
  source: BotPromptConfigSource;
  botId: string;
}): BotPromptConfigDiagnostic {
  return {
    botId: input.botId,
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
    source: input.source,
    surface: input.config?.surface ?? input.requestedSurface,
    version: input.config?.version,
  };
}

function reportDiagnostic(
  reporter: DiagnosticReporter | undefined,
  diagnostic: BotPromptConfigDiagnostic,
) {
  reporter?.(diagnostic);
}

export function createInMemoryBotPromptConfigRepo(
  configs: BotPromptConfig[] = FALLBACK_BOT_PROMPT_CONFIGS,
  options?: {
    onDiagnostic?: DiagnosticReporter;
  },
): BotPromptConfigRepo {
  const onDiagnostic = options?.onDiagnostic;

  return {
    async getActiveConfig(botId: string, surface: string) {
      const result = await this.getActiveConfigResult(botId, surface);

      return result.config;
    },
    async getActiveConfigResult(botId: string, surface: string) {
      const config = selectConfig(configs, botId, surface);

      const result = {
        config,
        diagnostic: buildDiagnostic({
          botId,
          config,
          errorMessage: "Supabase env is absent; using in-memory prompt config",
          requestedSurface: surface,
          source: "code_fallback",
        }),
      };
      reportDiagnostic(onDiagnostic, result.diagnostic);

      return result;
    },
  };
}

async function selectSupabaseRows(input: {
  botId: string;
  env: AppEnv;
  fetchImpl: FetchLike;
}) {
  if (!input.env.supabaseUrl || !input.env.supabaseServiceRoleKey) {
    throw new Error("Supabase env is required for the bot prompt config repo");
  }

  const response = await input.fetchImpl(
    `${input.env.supabaseUrl}/rest/v1/academy_bot_prompt_configs?select=bot_id,surface,version,persona_prompt,tone_rules,guardrails,off_topic_policy,escalation_policy,fallback_policy,active,updated_at&bot_id=eq.${encodeURIComponent(input.botId)}&active=is.true&order=updated_at.desc`,
    {
      method: "GET",
      headers: {
        apikey: input.env.supabaseServiceRoleKey,
        authorization: `Bearer ${input.env.supabaseServiceRoleKey}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Supabase select failed for academy_bot_prompt_configs: ${response.status} ${await response.text()}`,
    );
  }

  return (await response.json()) as SupabaseBotPromptConfigRow[];
}

export function createSupabaseBotPromptConfigRepo(
  env: AppEnv,
  options?: {
    fallbackRepo?: BotPromptConfigRepo;
    fetchImpl?: FetchLike;
    onDiagnostic?: DiagnosticReporter;
  },
): BotPromptConfigRepo {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const fallbackRepo =
    options?.fallbackRepo ?? createInMemoryBotPromptConfigRepo();
  const onDiagnostic = options?.onDiagnostic;

  return {
    async getActiveConfig(botId: string, surface: string) {
      const result = await this.getActiveConfigResult(botId, surface);

      return result.config;
    },
    async getActiveConfigResult(botId: string, surface: string) {
      try {
        const rows = await selectSupabaseRows({ botId, env, fetchImpl });
        const config = selectConfig(rows.map(mapRow), botId, surface);
        const source =
          config?.surface.toLowerCase() === surface.toLowerCase()
            ? "supabase_exact"
            : config?.surface.toLowerCase() === "global"
              ? "supabase_global_fallback"
              : null;

        if (config && source) {
          const diagnostic = buildDiagnostic({
            botId,
            config,
            requestedSurface: surface,
            source,
          });
          reportDiagnostic(onDiagnostic, diagnostic);

          return { config, diagnostic };
        }

        const fallback = await fallbackRepo.getActiveConfigResult(botId, surface);
        const diagnostic = buildDiagnostic({
          botId,
          config: fallback.config,
          errorMessage: "no active Supabase prompt config matched",
          requestedSurface: surface,
          source: "code_fallback",
        });
        reportDiagnostic(onDiagnostic, diagnostic);

        return { config: fallback.config, diagnostic };
      } catch (error) {
        const fallback = await fallbackRepo.getActiveConfigResult(botId, surface);
        const supabaseError = classifySupabaseConfigError(error);
        const diagnostic = buildDiagnostic({
          botId,
          config: fallback.config,
          errorCode: supabaseError.errorCode,
          errorMessage: supabaseError.errorMessage,
          requestedSurface: surface,
          source: supabaseError.source,
        });
        reportDiagnostic(onDiagnostic, diagnostic);

        return { config: fallback.config, diagnostic };
      }
    },
  };
}

function classifySupabaseConfigError(error: unknown): {
  errorCode?: string;
  errorMessage: string;
  source: Extract<BotPromptConfigSource, "missing_table" | "error">;
} {
  const message = error instanceof Error ? error.message : String(error);
  const errorCode = message.match(/\bPGRST\d+\b/)?.[0];

  if (
    errorCode === "PGRST205" ||
    /academy_bot_prompt_configs table|could not find the table/i.test(message)
  ) {
    return {
      errorCode,
      errorMessage: "Supabase academy_bot_prompt_configs table is unavailable",
      source: "missing_table",
    };
  }

  return {
    errorCode,
    errorMessage: "Supabase academy_bot_prompt_configs select failed",
    source: "error",
  };
}

export function createBotPromptConfigRepo(
  env: AppEnv,
  options?: {
    fetchImpl?: FetchLike;
    onDiagnostic?: DiagnosticReporter;
  },
): BotPromptConfigRepo {
  if (!hasSupabaseEnv(env)) {
    return createInMemoryBotPromptConfigRepo(undefined, {
      onDiagnostic: options?.onDiagnostic,
    });
  }

  return createSupabaseBotPromptConfigRepo(env, options);
}
