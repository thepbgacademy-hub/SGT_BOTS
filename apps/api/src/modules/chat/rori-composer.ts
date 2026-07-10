import type { BotPromptConfig } from "../bots/bot-prompt-config.repo";
import type { RoriConversationContext } from "./rori-kb";
import type { RoriResponseDecision } from "./rori-decision";
import type { RoriWikiSearchResult } from "./rori-wiki";

export type RoriComposerSource = {
  id: string;
  title: string;
  snippet: string;
};

export type RoriComposerInput = {
  botId: "concierge_general_academy_KB";
  content: string;
  conversationContext?: RoriConversationContext;
  decision: RoriResponseDecision;
  persona: {
    escalationPolicy: string;
    fallbackPolicy: string;
    guardrails: string[];
    offTopicPolicy: string;
    personaPrompt: string;
    toneRules: string[];
    version: string;
  };
  sourceIds: string[];
  sources: RoriComposerSource[];
};

export type RoriComposerOutput = {
  output: string;
  sourceIds: string[];
};

export type RoriComposerReply = RoriComposerOutput & {
  usedFallback: boolean;
};

type RoriComposerProvider = (
  input: RoriComposerInput,
) => Promise<unknown>;

function snippetFor(value: string) {
  return value.replace(/\s+/gu, " ").trim().slice(0, 900);
}

export function buildRoriComposerInput(input: {
  content: string;
  conversationContext?: RoriConversationContext;
  decision: RoriResponseDecision;
  promptConfig: BotPromptConfig;
  wikiSearchResult: RoriWikiSearchResult;
}): RoriComposerInput {
  const sourceIds = [
    ...new Set(input.wikiSearchResult.matches.map((match) => match.sourceId)),
  ];

  return {
    botId: "concierge_general_academy_KB",
    content: input.content,
    conversationContext: input.conversationContext,
    decision: input.decision,
    persona: {
      escalationPolicy: input.promptConfig.escalationPolicy,
      fallbackPolicy: input.promptConfig.fallbackPolicy,
      guardrails: input.promptConfig.guardrails,
      offTopicPolicy: input.promptConfig.offTopicPolicy,
      personaPrompt: input.promptConfig.personaPrompt,
      toneRules: input.promptConfig.toneRules,
      version: input.promptConfig.version,
    },
    sourceIds,
    sources: input.wikiSearchResult.matches.map((match) => ({
      id: match.sourceId,
      snippet: snippetFor(
        [match.page.summary, match.page.body].filter(Boolean).join(" "),
      ),
      title: match.page.title,
    })),
  };
}

export function validateRoriComposerOutput(
  value: unknown,
  allowedSourceIds: string[],
): RoriComposerOutput {
  if (!value || typeof value !== "object") {
    throw new Error("malformed rori composer output");
  }

  const output = (value as { output?: unknown }).output;
  const sourceIds = (value as { sourceIds?: unknown }).sourceIds;

  if (typeof output !== "string" || output.trim().length === 0) {
    throw new Error("malformed rori composer output");
  }

  if (
    !Array.isArray(sourceIds) ||
    sourceIds.length === 0 ||
    !sourceIds.every((sourceId) => typeof sourceId === "string")
  ) {
    throw new Error("malformed rori composer output");
  }

  const allowed = new Set(allowedSourceIds);
  for (const sourceId of sourceIds) {
    if (!allowed.has(sourceId)) {
      throw new Error(`unsupported rori source id: ${sourceId}`);
    }
  }

  return {
    output: output.trim(),
    sourceIds: [...new Set(sourceIds)],
  };
}

export async function composeRoriReply(
  input: RoriComposerInput,
  options: {
    fallbackOutput: string;
    provider: RoriComposerProvider;
  },
): Promise<RoriComposerReply> {
  try {
    const providerOutput = await options.provider(input);
    const validated = validateRoriComposerOutput(
      providerOutput,
      input.sourceIds,
    );

    return {
      ...validated,
      usedFallback: false,
    };
  } catch {
    return {
      output: options.fallbackOutput,
      sourceIds: input.sourceIds,
      usedFallback: true,
    };
  }
}
