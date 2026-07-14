import type { BotPromptConfigSource } from "../bots/bot-prompt-config.repo";
import type { RoriResponseDecision, RoriResponseIntent } from "./rori-decision";

export type ChatRuntimeConfigSource = BotPromptConfigSource | "not_applicable";

export type ChatRuntimeRetrievalOutcome =
  | "exact"
  | "partial"
  | "no_match"
  | "error"
  | "not_applicable";

export type ChatRuntimeDecisionIntent = RoriResponseIntent | "static_reply";

export type ChatRuntimeDecisionReason =
  | RoriResponseDecision["reason"]
  | "claim_clarification"
  | "display_only_notice"
  | "lesson_match"
  | "no_approved_lesson"
  | "quiz_request"
  | "source_bypass_refused"
  | "unsupported_example_refused"
  | "workflow_route";

export type ChatRuntimeProviderFallbackState =
  | "deterministic_runtime"
  | "composer_fallback"
  | "live_provider";

export type ChatRuntimeDiagnostic = {
  botId: string;
  boundaryType?: "jailbreak_attempt" | "off_topic";
  configSource: ChatRuntimeConfigSource;
  configVersion?: string;
  conversationId: string;
  decisionIntent: ChatRuntimeDecisionIntent;
  decisionReason?: ChatRuntimeDecisionReason;
  providerFallbackState: ChatRuntimeProviderFallbackState;
  retrievalOutcome: ChatRuntimeRetrievalOutcome;
  sourceIds: string[];
};

export type ChatRuntimeReplyDiagnostics = {
  configSource?: ChatRuntimeConfigSource;
  configVersion?: string;
  decisionIntent?: ChatRuntimeDecisionIntent;
  decisionReason?: ChatRuntimeDecisionReason;
  providerFallbackState?: ChatRuntimeProviderFallbackState;
  retrievalOutcome?: ChatRuntimeRetrievalOutcome;
  sourceIds?: string[];
};

const MAX_SOURCE_IDS = 16;
const MAX_SOURCE_ID_LENGTH = 200;

/**
 * Builds the diagnostic record from allowlisted identifier and outcome fields
 * only. Free-form text (user messages, reply output, persona prompts, provider
 * payloads, secrets) must never be passed in; every field here is either an
 * enumerated outcome or a bounded identifier list, and extra properties on the
 * input are dropped.
 */
export function buildChatRuntimeDiagnostic(input: {
  botId: string;
  boundaryType?: "jailbreak_attempt" | "off_topic";
  configSource?: ChatRuntimeConfigSource;
  configVersion?: string;
  conversationId: string;
  decisionIntent?: ChatRuntimeDecisionIntent;
  decisionReason?: ChatRuntimeDecisionReason;
  providerFallbackState?: ChatRuntimeProviderFallbackState;
  retrievalOutcome?: ChatRuntimeRetrievalOutcome;
  sourceIds?: readonly string[];
}): ChatRuntimeDiagnostic {
  return {
    botId: input.botId,
    boundaryType: input.boundaryType,
    configSource: input.configSource ?? "not_applicable",
    configVersion: input.configVersion,
    conversationId: input.conversationId,
    decisionIntent: input.decisionIntent ?? "static_reply",
    decisionReason: input.decisionReason,
    providerFallbackState: input.providerFallbackState ?? "deterministic_runtime",
    retrievalOutcome: input.retrievalOutcome ?? "not_applicable",
    sourceIds: [...new Set(input.sourceIds ?? [])]
      .slice(0, MAX_SOURCE_IDS)
      .map((sourceId) => sourceId.slice(0, MAX_SOURCE_ID_LENGTH)),
  };
}
