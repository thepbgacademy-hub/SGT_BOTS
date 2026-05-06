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

function buildKnowledgeBaseReply(manifest: BotManifest, content: string): RuntimeReply {
  requireCapability(manifest, "chat");
  requireCapability(manifest, "citations");
  requireCapability(manifest, "rag_query");
  requireSourceBinding(manifest, "knowledge_base");
  requireToolPermission(manifest, "knowledge_base_search");

  return {
    output: `Start with the Release Review Runbook, then pull the owner checklist for "${content}".`,
    citations: [
      {
        sourceId: "knowledge_base",
        title: "Release Review Runbook",
        url: "https://example.invalid/kb/release-review-runbook",
      },
    ],
  };
}

function buildDocumentWizardReply(
  manifest: BotManifest,
  content: string,
): RuntimeReply {
  requireCapability(manifest, "chat");
  requireCapability(manifest, "pdf_upload");
  requireCapability(manifest, "structured_form");
  requireCapability(manifest, "html_report");
  requireToolPermission(manifest, "document_intake");

  return {
    output: `I can turn "${content}" into a structured draft. Upload a PDF or paste your notes and I will shape the final report flow for you.`,
  };
}

function buildTutorReply(manifest: BotManifest, content: string): RuntimeReply {
  requireCapability(manifest, "chat");

  return {
    output: `Let's break "${content}" into a few clear steps, then I can guide you through each one like a coach.`,
  };
}

function buildResearcherReply(
  manifest: BotManifest,
  content: string,
): RuntimeReply {
  requireCapability(manifest, "chat");
  requireCapability(manifest, "citations");
  requireCapability(manifest, "rag_query");
  requireSourceBinding(manifest, "knowledge_base");
  requireToolPermission(manifest, "knowledge_base_search");

  return {
    output: `I researched "${content}" and pulled the strongest grounded lead to start your brief.`,
    citations: [
      {
        sourceId: "knowledge_base",
        title: "Research Briefing Index",
        url: "https://example.invalid/kb/research-briefing-index",
      },
    ],
  };
}

function buildGeneralConciergeReply(
  manifest: BotManifest,
  content: string,
): RuntimeReply {
  requireCapability(manifest, "chat");

  return {
    output: `I can help triage "${content}" and route you to the right next action inside the playground.`,
  };
}

export function createChatService(deps?: { now?: () => number }) {
  const conversations = new Map<string, ConversationRecord>();
  let conversationCount = 0;
  let messageCount = 0;
  const now = deps?.now ?? (() => Date.now());

  function nextConversationId() {
    conversationCount += 1;
    return `conversation-${conversationCount}`;
  }

  function nextMessageId() {
    messageCount += 1;
    return `message-${messageCount}`;
  }

  return {
    sendMessage(input: {
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

      const manifest = requireBotManifest(input.botId);
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

      const conversation =
        existingConversation ??
        {
          id: nextConversationId(),
          botId: manifest.id,
          sessionId: input.sessionId,
          userId: input.userId,
          createdAt: new Date(now()).toISOString(),
          state: "active" as const,
          endedAt: null,
        };

      if (!existingConversation) {
        conversations.set(conversation.id, conversation);
      }

      const createdAt = new Date(now()).toISOString();
      const userMessage: ChatMessage = {
        id: nextMessageId(),
        role: "user",
        content: trimmedContent,
        createdAt,
      };
      const runtimeReply = buildRuntimeReply(manifest, trimmedContent);
      const assistantMessage: ChatMessage = {
        id: nextMessageId(),
        role: "assistant",
        content: runtimeReply.output,
        citations: runtimeReply.citations,
        createdAt,
      };

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
): RuntimeReply {
  switch (manifest.id) {
    case "kb_concierge":
      return buildKnowledgeBaseReply(manifest, trimmedContent);
    case "document_wizard":
      return buildDocumentWizardReply(manifest, trimmedContent);
    case "tutor":
      return buildTutorReply(manifest, trimmedContent);
    case "researcher":
      return buildResearcherReply(manifest, trimmedContent);
    case "general_concierge":
      return buildGeneralConciergeReply(manifest, trimmedContent);
    default: {
      const exhaustiveCheck: never = manifest.id;
      throw new Error(`unsupported bot: ${exhaustiveCheck}`);
    }
  }
}
