import {
  requireBotManifest,
  type BotId,
  type BotManifest,
} from "../../../../../packages/shared/src/bots/manifests";
import type {
  BotCapabilityId,
  BotSourceBinding,
  BotToolPermission,
} from "../../../../../packages/shared/src/bots/capabilities";
import type { CursiveCategoryConfig } from "../cursive/cursive.repo";
import type { BotPromptConfigRepo } from "../bots/bot-prompt-config.repo";
import {
  createFallbackRoriDirectoryRepo,
  type RoriAcademyDirectoryRepo,
} from "./rori-directory.repo";
import {
  buildGroundedRoriReply,
  buildRoriConversationContext,
  type RoriPromptConfig,
} from "./rori-kb";
import { buildInsightTutorReply } from "./insight-tutor";
import {
  createFallbackRoriWikiRepo,
  type RoriWikiRepo,
} from "./rori-wiki.repo";
import {
  findRoriWikiSearchResult,
  type RoriWikiSearchResult,
} from "./rori-wiki";
import {
  buildChatRuntimeDiagnostic,
  type ChatRuntimeDiagnostic,
  type ChatRuntimeReplyDiagnostics,
} from "./runtime-diagnostics";

type ChatRole = "user" | "assistant";

type ChatCitation = {
  sourceId: Exclude<BotSourceBinding, "none">;
  title: string;
  url: string;
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  citations?: ChatCitation[];
  capabilities?: {
    upload: boolean;
  };
  createdAt: string;
};

type ConversationRecord = {
  id: string;
  botId: BotId;
  sessionId: string;
  userId: string;
  createdAt: string;
  state: "active";
  endedAt: string | null;
};

type RuntimeReply = {
  boundaryType?: "jailbreak_attempt" | "off_topic";
  output: string;
  citations?: ChatCitation[];
  runtimeDiagnostics?: ChatRuntimeReplyDiagnostics;
};

type RuntimeReplyResult = RuntimeReply | Promise<RuntimeReply>;

function requireCapability(manifest: BotManifest, capability: BotCapabilityId) {
  if (!manifest.capabilities[capability]) {
    throw new Error(`bot capability missing: ${capability}`);
  }
}

function requireSourceBinding(
  manifest: BotManifest,
  sourceBinding: BotSourceBinding,
) {
  if (manifest.sourceBinding !== sourceBinding) {
    throw new Error(`bot source binding missing: ${sourceBinding}`);
  }
}

function requireToolPermission(
  manifest: BotManifest,
  toolPermission: BotToolPermission,
) {
  if (!manifest.toolPermissions.includes(toolPermission)) {
    throw new Error(`bot tool permission missing: ${toolPermission}`);
  }
}

function buildAcademyConciergeReply(
  manifest: BotManifest,
  content: string,
  directoryRepo: RoriAcademyDirectoryRepo,
  botPromptConfigRepo: BotPromptConfigRepo,
  wikiRepo: RoriWikiRepo,
  priorMessages: ChatMessage[] = [],
): Promise<RuntimeReply> {
  requireCapability(manifest, "chat");
  requireCapability(manifest, "citations");
  requireCapability(manifest, "rag_query");
  requireSourceBinding(manifest, "knowledge_base");
  requireToolPermission(manifest, "knowledge_base_search");

  return Promise.all([
    botPromptConfigRepo.getActiveConfigResult(manifest.id, "playground"),
    directoryRepo.listTelegramRooms(),
    directoryRepo.listUpcomingEvents(),
    searchRoriWiki(wikiRepo, content),
  ]).then(([promptConfigResult, telegramRooms, workshops, wikiSearchResult]) => {
    const reply = buildGroundedRoriReply(content, {
      promptConfig:
        (promptConfigResult.config as RoriPromptConfig | null) ?? undefined,
      conversationContext: buildRoriConversationContext(
        priorMessages
          .filter((message) => message.role === "user")
          .map((message) => message.content),
      ),
      telegramRooms,
      workshops,
      wikiPages: wikiSearchResult.pages,
      wikiSearchResult,
    });

    return {
      ...reply,
      runtimeDiagnostics: {
        ...reply.runtimeDiagnostics,
        configSource: promptConfigResult.diagnostic.source,
        configVersion: promptConfigResult.diagnostic.version,
      },
    };
  });
}

async function searchRoriWiki(
  wikiRepo: RoriWikiRepo,
  content: string,
): Promise<RoriWikiSearchResult> {
  if (wikiRepo.searchPagesResult) {
    return wikiRepo.searchPagesResult(content);
  }

  const pages = await wikiRepo.searchPages(content);
  return findRoriWikiSearchResult(content, pages);
}

async function buildTutorReply(
  manifest: BotManifest,
  content: string,
  botPromptConfigRepo: BotPromptConfigRepo,
): Promise<RuntimeReply> {
  requireCapability(manifest, "chat");
  requireCapability(manifest, "citations");
  requireCapability(manifest, "rag_query");
  requireSourceBinding(manifest, "knowledge_base");
  requireToolPermission(manifest, "knowledge_base_search");
  const promptConfigResult = await botPromptConfigRepo.getActiveConfigResult(
    manifest.id,
    "playground",
  );
  const reply = buildInsightTutorReply(content, {
    promptConfig: promptConfigResult.config,
  });

  return {
    ...reply,
    runtimeDiagnostics: {
      ...reply.runtimeDiagnostics,
      configSource: promptConfigResult.diagnostic.source,
      configVersion: promptConfigResult.diagnostic.version,
      providerFallbackState: "deterministic_runtime",
      sourceIds: reply.citations.map((citation) => citation.url),
    },
  };
}

function buildVerifierReply(
  manifest: BotManifest,
  content: string,
  promptConfig?: RoriPromptConfig | null,
): RuntimeReply {
  requireCapability(manifest, "chat");
  requireCapability(manifest, "citations");
  requireCapability(manifest, "rag_query");
  requireSourceBinding(manifest, "knowledge_base");
  requireToolPermission(manifest, "knowledge_base_search");

  const citations: ChatCitation[] = [
    {
      sourceId: "knowledge_base",
      title: "Top Secret Report Workflow",
      url: "sgt-bots://docs/top-secret/research-briefing-index",
    },
  ];
  const normalizedContent = content.toLowerCase();
  const sourceBypassPattern =
    /\b(without|no|don't|do not|ignore)\b.{0,32}\b(sources?|evidence|citations?|research|references?|lookup|look up|looking up)\b|\bfrom memory only\b|\bjust use (your )?(memory|training)\b/i;
  const verificationIntentPattern =
    /\b(fact[- ]?check|verify|check|true or false|is this true|is that true|is it true|claim)\b/i;
  const claimPlaceholderPattern =
    /\b(this|that|it|claim|something)\b/i;
  const concreteClaimRemainder = content
    .replace(
      /\b(is|this|that|it|claim|something|true|false|verify|fact[- ]?check|check|please|can|you|tell|me|if|whether|for|from|memory|only)\b/giu,
      "",
    )
    .replace(/[?.!,;:'"()]/gu, "")
    .trim();
  const hasConcreteClaim = /[A-Za-z0-9]{18,}/u.test(concreteClaimRemainder);

  const verifierDiagnostics = (
    decisionIntent: "boundary" | "clarify" | "route",
    decisionReason:
      | "source_bypass_refused"
      | "claim_clarification"
      | "workflow_route",
  ): RuntimeReply["runtimeDiagnostics"] => ({
    decisionIntent,
    decisionReason,
    providerFallbackState: "deterministic_runtime",
    retrievalOutcome: "not_applicable",
    sourceIds: citations.map((citation) => citation.url),
  });

  if (sourceBypassPattern.test(normalizedContent)) {
    return {
      output:
        promptConfig
          ? `${promptConfig.offTopicPolicy} ${promptConfig.fallbackPolicy}`
          : "I can't verify a claim without reliable sources. Top Secret is built to compare the pasted message against trusted references, so use the report workflow when you want the actual source-backed check.",
      citations,
      runtimeDiagnostics: verifierDiagnostics(
        "boundary",
        "source_bypass_refused",
      ),
    };
  }

  if (
    verificationIntentPattern.test(normalizedContent) &&
    (claimPlaceholderPattern.test(normalizedContent) || !hasConcreteClaim) &&
    !hasConcreteClaim
  ) {
    return {
      output:
        promptConfig?.fallbackPolicy?.trim() ||
        "Please paste the exact statement or how-to message you want checked. Top Secret needs the actual wording before it can build a source-backed report.",
      citations,
      runtimeDiagnostics: verifierDiagnostics("clarify", "claim_clarification"),
    };
  }

  return {
    output:
      promptConfig
        ? "Use the Top Secret report workflow for this claim, then choose Create report. That path keeps the answer evidence-first and tied to reliable sources before it reaches a conclusion."
        : "Use the Top Secret report workflow for this claim, then choose Create report. That path runs the source-backed review and gives you the PDF when the report is ready.",
    citations,
    runtimeDiagnostics: verifierDiagnostics("route", "workflow_route"),
  };
}

function buildTaxLegalResearchReply(manifest: BotManifest): RuntimeReply {
  requireCapability(manifest, "chat");
  requireCapability(manifest, "citations");
  requireCapability(manifest, "rag_query");
  requireSourceBinding(manifest, "knowledge_base");
  requireToolPermission(manifest, "knowledge_base_search");

  return {
    output:
      "Condor is display-only in this playground, so no research has run on your request yet. When the Condor research workflow goes live, it will start from the approved Tax and Legal Research Index instead of answering from memory. For Academy questions in the meantime, Rori can route you to the right lane.",
    citations: [
      {
        sourceId: "knowledge_base",
        title: "Tax and Legal Research Index",
        url: "sgt-bots://docs/condor/tax-legal-research-index",
      },
    ],
    runtimeDiagnostics: {
      decisionIntent: "static_reply",
      decisionReason: "display_only_notice",
      providerFallbackState: "deterministic_runtime",
      retrievalOutcome: "not_applicable",
      sourceIds: ["sgt-bots://docs/condor/tax-legal-research-index"],
    },
  };
}

export function createChatService(deps?: {
  botPromptConfigRepo?: BotPromptConfigRepo;
  cursiveRepo?: {
    getCategoryConfig(categorySlug: string): CursiveCategoryConfig | null;
    listCategories(): readonly CursiveCategoryConfig["category"][];
    getDefaultCategoryConfig(): CursiveCategoryConfig;
  };
  now?: () => number;
  onRuntimeDiagnostic?: (diagnostic: ChatRuntimeDiagnostic) => void;
  roriDirectoryRepo?: RoriAcademyDirectoryRepo;
  roriWikiRepo?: RoriWikiRepo;
  resolveManifest?: (botId: string) => BotManifest;
  buildRuntimeReply?: (
    manifest: BotManifest,
    trimmedContent: string,
    priorMessages?: ChatMessage[],
  ) => RuntimeReplyResult;
}) {
  const conversations = new Map<string, ConversationRecord>();
  const conversationMessages = new Map<string, ChatMessage[]>();
  let conversationCount = 0;
  let messageCount = 0;
  const now = deps?.now ?? (() => Date.now());
  const botPromptConfigRepo =
    deps?.botPromptConfigRepo ??
    ({
      async getActiveConfig() {
        return null;
      },
      async getActiveConfigResult(botId: string, surface: string) {
        return {
          config: null,
          diagnostic: {
            botId,
            errorMessage: "No bot prompt config repo was provided",
            source: "code_fallback",
            surface,
          },
        };
      },
    } satisfies BotPromptConfigRepo);
  const roriDirectoryRepo =
    deps?.roriDirectoryRepo ?? createFallbackRoriDirectoryRepo();
  const roriWikiRepo = deps?.roriWikiRepo ?? createFallbackRoriWikiRepo();
  const resolveManifest = deps?.resolveManifest ?? requireBotManifest;
  const buildReply =
    deps?.buildRuntimeReply ??
    ((manifest: BotManifest, trimmedContent: string, priorMessages: ChatMessage[] = []) =>
      buildRuntimeReply(
        manifest,
        trimmedContent,
        roriDirectoryRepo,
        botPromptConfigRepo,
        roriWikiRepo,
        priorMessages,
      ));

  function nextConversationId() {
    conversationCount += 1;
    return `conversation-${conversationCount}`;
  }

  function nextMessageId() {
    messageCount += 1;
    return `message-${messageCount}`;
  }

  return {
    async sendMessage(input: {
      sessionId: string;
      userId: string;
      botId: string;
      conversationId?: string;
      message: string;
    }) {
      const trimmedContent = input.message.trim();

      if (!trimmedContent) {
        throw new Error("message content required");
      }

      const manifest = resolveManifest(input.botId);
      const existingConversation = input.conversationId
        ? conversations.get(input.conversationId)
        : undefined;

      if (input.conversationId && !existingConversation) {
        throw new Error("conversation not found");
      }

      if (existingConversation && existingConversation.botId !== manifest.id) {
        throw new Error("conversation belongs to a different bot");
      }

      if (
        existingConversation &&
        (existingConversation.sessionId !== input.sessionId ||
          existingConversation.userId !== input.userId)
      ) {
        throw new Error("conversation not found");
      }

      const priorMessages = existingConversation
        ? (conversationMessages.get(existingConversation.id) ?? [])
        : [];
      const runtimeReply = await buildReply(manifest, trimmedContent, priorMessages);
      const createdAt = new Date(now()).toISOString();
      const conversation =
        existingConversation ??
        {
          id: nextConversationId(),
          botId: manifest.id,
          sessionId: input.sessionId,
          userId: input.userId,
          createdAt,
          state: "active" as const,
          endedAt: null,
        };

      if (!existingConversation) {
        conversations.set(conversation.id, conversation);
      }

      if (deps?.onRuntimeDiagnostic) {
        try {
          deps.onRuntimeDiagnostic(
            buildChatRuntimeDiagnostic({
              botId: manifest.id,
              boundaryType: runtimeReply.boundaryType,
              configSource: runtimeReply.runtimeDiagnostics?.configSource,
              configVersion: runtimeReply.runtimeDiagnostics?.configVersion,
              conversationId: conversation.id,
              decisionIntent: runtimeReply.runtimeDiagnostics?.decisionIntent,
              decisionReason: runtimeReply.runtimeDiagnostics?.decisionReason,
              providerFallbackState:
                runtimeReply.runtimeDiagnostics?.providerFallbackState,
              retrievalOutcome:
                runtimeReply.runtimeDiagnostics?.retrievalOutcome,
              sourceIds:
                runtimeReply.runtimeDiagnostics?.sourceIds ??
                (runtimeReply.citations ?? []).map((citation) => citation.url),
            }),
          );
        } catch {
          // Diagnostics must never break chat delivery.
        }
      }

      const userMessage: ChatMessage = {
        id: nextMessageId(),
        role: "user",
        content: trimmedContent,
        createdAt,
      };
      const assistantMessage: ChatMessage = {
        id: nextMessageId(),
        role: "assistant",
        content: runtimeReply.output,
        citations: runtimeReply.citations,
        createdAt,
      };
      conversationMessages.set(conversation.id, [
        ...priorMessages,
        userMessage,
        assistantMessage,
      ]);

      return {
        botId: manifest.id,
        boundaryType: runtimeReply.boundaryType,
        conversation,
        citations: runtimeReply.citations ?? [],
        output: runtimeReply.output,
        userMessage,
        assistantMessage,
      };
    },
  };
}

function buildRuntimeReply(
  manifest: BotManifest,
  trimmedContent: string,
  roriDirectoryRepo: RoriAcademyDirectoryRepo,
  botPromptConfigRepo: BotPromptConfigRepo,
  roriWikiRepo: RoriWikiRepo,
  priorMessages: ChatMessage[] = [],
): RuntimeReplyResult {
  switch (manifest.id) {
    case "document_wizard":
      throw new Error("cursive workflow only");
    case "tutor":
      return buildTutorReply(manifest, trimmedContent, botPromptConfigRepo);
    case "form_wizard":
      throw new Error("shazzam workflow only");
    case "verifier":
      return botPromptConfigRepo
        .getActiveConfigResult(manifest.id, "playground")
        .then((promptConfigResult) => {
          const reply = buildVerifierReply(
            manifest,
            trimmedContent,
            promptConfigResult.config,
          );

          return {
            ...reply,
            runtimeDiagnostics: {
              ...reply.runtimeDiagnostics,
              configSource: promptConfigResult.diagnostic.source,
              configVersion: promptConfigResult.diagnostic.version,
            },
          };
        });
    case "concierge_general_academy_KB":
      return buildAcademyConciergeReply(
        manifest,
        trimmedContent,
        roriDirectoryRepo,
        botPromptConfigRepo,
        roriWikiRepo,
        priorMessages,
      );
    case "tax_legal_research":
      return buildTaxLegalResearchReply(manifest);
    default: {
      const exhaustiveCheck: never = manifest.id;
      throw new Error(`unsupported bot: ${exhaustiveCheck}`);
    }
  }
}
