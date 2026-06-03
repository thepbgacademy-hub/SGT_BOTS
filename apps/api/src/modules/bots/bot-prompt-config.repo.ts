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

export type BotPromptConfigRepo = {
  getActiveConfig(botId: string, surface: string): Promise<BotPromptConfig | null>;
};

type FetchLike = typeof fetch;

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

export function createInMemoryBotPromptConfigRepo(
  configs: BotPromptConfig[] = FALLBACK_BOT_PROMPT_CONFIGS,
): BotPromptConfigRepo {
  return {
    async getActiveConfig(botId: string, surface: string) {
      return selectConfig(configs, botId, surface);
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
  },
): BotPromptConfigRepo {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const fallbackRepo =
    options?.fallbackRepo ?? createInMemoryBotPromptConfigRepo();

  return {
    async getActiveConfig(botId: string, surface: string) {
      try {
        const rows = await selectSupabaseRows({ botId, env, fetchImpl });
        const config = selectConfig(rows.map(mapRow), botId, surface);

        return config ?? fallbackRepo.getActiveConfig(botId, surface);
      } catch {
        return fallbackRepo.getActiveConfig(botId, surface);
      }
    },
  };
}

export function createBotPromptConfigRepo(
  env: AppEnv,
  options?: {
    fetchImpl?: FetchLike;
  },
): BotPromptConfigRepo {
  if (!hasSupabaseEnv(env)) {
    return createInMemoryBotPromptConfigRepo();
  }

  return createSupabaseBotPromptConfigRepo(env, options);
}
