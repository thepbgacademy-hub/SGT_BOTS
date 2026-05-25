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

function buildAcademyConciergeReply(
  manifest: BotManifest,
  content: string,
): RuntimeReply {
  requireCapability(manifest, "chat");
  requireCapability(manifest, "citations");
  requireCapability(manifest, "rag_query");
  requireSourceBinding(manifest, "knowledge_base");
  requireToolPermission(manifest, "knowledge_base_search");

  const normalizedContent = content.toLowerCase();
  const route = [
    {
      pattern:
        /\b(credit reports?|credit-report|consumer reports?|consumer reporting agenc(?:y|ies)|reinvestigation|bureau|dispute|tradeline|fcra|fair credit reporting act)\b/i,
      output:
        "Rori would route that to Cursive. It is the best fit for credit bureau, dispute, tradeline, and FCRA workflows.",
    },
    {
      pattern:
        /\b(fact[- ]?check|check (?:this )?(?:claim|myth|statement|post|message)|verify (?:this )?(?:claim|myth|statement|post|message)|source-backed verification|is this true or false|whether this is true|true\/false|true-false|online claim|myth)\b/i,
      output:
        "Rori would route that to Top Secret. It is the right lane for checking claims, myths, and true-or-false questions.",
    },
    {
      pattern: /\b(tax|legal|statute|usc|cfr|irs|treasury)\b/i,
      output:
        "Rori would route that to Condor. It is the right place for tax, legal, statute, USC, CFR, IRS, and Treasury research.",
    },
    {
      pattern: /\b(form|intake|questionnaire|collect document answers)\b/i,
      output:
        "Rori would route that to ShAzZaM. It is the best fit for forms, intake flows, questionnaires, and collecting answers.",
    },
  ].find(({ pattern }) => pattern.test(normalizedContent));

  if (route) {
    return {
      output: route.output,
      citations: [],
    };
  }

  if (/\b(which|what) (tool|bot)|tool should i use|use for\b/i.test(normalizedContent)) {
    return {
      output:
        "Rori can help you choose the right tool. Use Cursive for credit bureau and dispute work, Top Secret for checking online claims, Condor for tax or legal research, and ShAzZaM for forms or guided intake.",
      citations: [],
    };
  }

  if (/\benroll|enrollment|join academy|sign up|signup\b/i.test(normalizedContent)) {
    return {
      output:
        "Rori can help with PBG Academy enrollment. Start with the current Academy enrollment path, then ask Rori where to go next if you are unsure which Telegram room, workshop, or tool fits your goal.",
      citations: [],
    };
  }

  if (/\bworkshops?|events?|classes?|register|registration\b/i.test(normalizedContent)) {
    return {
      output:
        "Rori can help with PBG Academy workshop and event questions. Ask what you want to attend or register for, and Rori will help you find the next step without making it sound more complicated than it is.",
      citations: [],
    };
  }

  if (/\btelegram|rooms?|channels?|group chat|chat room\b/i.test(normalizedContent)) {
    return {
      output:
        "Rori can help you sort out the PBG Telegram rooms. Tell Rori what you are trying to do, like enrollment help, workshop updates, tech trouble, or tool support, and Rori will point you toward the right room.",
      citations: [],
    };
  }

  return {
    output:
      "Rori can help with PBG Academy enrollment, workshop details, and the Telegram room. For joining, start with the Academy enrollment path, then watch the room for workshop updates and next steps.",
    citations: [],
  };
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
        url: "https://example.invalid/kb/research-briefing-index",
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
        url: "https://example.invalid/kb/tax-legal-research-index",
      },
    ],
  };
}

export function createChatService(deps?: {
  cursiveRepo?: {
    getCategoryConfig(categorySlug: string): CursiveCategoryConfig | null;
    listCategories(): readonly CursiveCategoryConfig["category"][];
    getDefaultCategoryConfig(): CursiveCategoryConfig;
  };
  now?: () => number;
  resolveManifest?: (botId: string) => BotManifest;
  buildRuntimeReply?: (
    manifest: BotManifest,
    trimmedContent: string,
  ) => RuntimeReply;
}) {
  const conversations = new Map<string, ConversationRecord>();
  let conversationCount = 0;
  let messageCount = 0;
  const now = deps?.now ?? (() => Date.now());
  const resolveManifest = deps?.resolveManifest ?? requireBotManifest;
  const buildReply =
    deps?.buildRuntimeReply ??
    ((manifest: BotManifest, trimmedContent: string) =>
      buildRuntimeReply(manifest, trimmedContent));

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

      const runtimeReply = buildReply(manifest, trimmedContent);
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
    case "document_wizard":
      throw new Error("cursive workflow only");
    case "tutor":
      return buildTutorReply(manifest, trimmedContent);
    case "form_wizard":
      return buildFormWizardReply(manifest, trimmedContent);
    case "verifier":
      return buildVerifierReply(manifest, trimmedContent);
    case "concierge_general_academy_KB":
      return buildAcademyConciergeReply(manifest, trimmedContent);
    case "tax_legal_research":
      return buildTaxLegalResearchReply(manifest, trimmedContent);
    default: {
      const exhaustiveCheck: never = manifest.id;
      throw new Error(`unsupported bot: ${exhaustiveCheck}`);
    }
  }
}
