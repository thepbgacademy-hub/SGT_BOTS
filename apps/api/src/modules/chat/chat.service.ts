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
import {
  createFallbackRoriWikiRepo,
  type RoriWikiRepo,
} from "./rori-wiki.repo";

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
  output: string;
  citations?: ChatCitation[];
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
    botPromptConfigRepo.getActiveConfig(manifest.id, "playground"),
    directoryRepo.listTelegramRooms(),
    directoryRepo.listUpcomingEvents(),
    wikiRepo.searchPages(content),
  ]).then(([promptConfig, telegramRooms, workshops, wikiPages]) =>
    buildGroundedRoriReply(content, {
      promptConfig: (promptConfig as RoriPromptConfig | null) ?? undefined,
      conversationContext: buildRoriConversationContext(
        priorMessages
          .filter((message) => message.role === "user")
          .map((message) => message.content),
      ),
      telegramRooms,
      workshops,
      wikiPages,
    }),
  );
}

function buildTutorReply(manifest: BotManifest, content: string): RuntimeReply {
  requireCapability(manifest, "chat");

  return {
    output: `Let's break "${content}" into a few clear steps, then I can guide you through each one like a coach.`,
  };
}

function buildFormWizardReply(
  manifest: BotManifest,
  content: string,
): RuntimeReply {
  requireCapability(manifest, "chat");
  requireCapability(manifest, "structured_form");
  requireCapability(manifest, "html_report");
  requireToolPermission(manifest, "document_intake");

  return {
    output: `I can turn "${content}" into a guided intake workflow, capture the right fields, and assemble the final output cleanly.`,
  };
}

function buildVerifierReply(
  manifest: BotManifest,
  content: string,
): RuntimeReply {
  requireCapability(manifest, "chat");
  requireCapability(manifest, "citations");
  requireCapability(manifest, "rag_query");
  requireSourceBinding(manifest, "knowledge_base");
  requireToolPermission(manifest, "knowledge_base_search");

  return {
    output: `I verified "${content}" against the strongest grounded reference I could reach inside the approved source lane.`,
    citations: [
      {
        sourceId: "knowledge_base",
        title: "Verification Control Checklist",
        url: "sgt-bots://docs/top-secret/research-briefing-index",
      },
    ],
  };
}

function buildTaxLegalResearchReply(
  manifest: BotManifest,
  content: string,
): RuntimeReply {
  requireCapability(manifest, "chat");
  requireCapability(manifest, "citations");
  requireCapability(manifest, "rag_query");
  requireSourceBinding(manifest, "knowledge_base");
  requireToolPermission(manifest, "knowledge_base_search");

  return {
    output: `I researched "${content}" and surfaced the most relevant tax and legal lead to start your analysis.`,
    citations: [
      {
        sourceId: "knowledge_base",
        title: "Tax and Legal Research Index",
        url: "sgt-bots://docs/condor/tax-legal-research-index",
      },
    ],
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
      return buildTutorReply(manifest, trimmedContent);
    case "form_wizard":
      return buildFormWizardReply(manifest, trimmedContent);
    case "verifier":
      return buildVerifierReply(manifest, trimmedContent);
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
      return buildTaxLegalResearchReply(manifest, trimmedContent);
    default: {
      const exhaustiveCheck: never = manifest.id;
      throw new Error(`unsupported bot: ${exhaustiveCheck}`);
    }
  }
}
