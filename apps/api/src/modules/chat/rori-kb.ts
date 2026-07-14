import {
  findTelegramRoomRecord,
  formatTelegramRoomLinkStatus,
  formatTelegramRoomList,
  formatWorkshopDirectorySummary,
  FALLBACK_RORI_ACADEMY_DIRECTORY,
  type RoriAcademyDirectory,
  RORI_DIRECTORY_SOURCE,
} from "./rori-directory";
import {
  decideRoriResponse,
  type RoriResponseDecision,
} from "./rori-decision";
import {
  buildRoriComposerInput,
  validateRoriComposerOutput,
} from "./rori-composer";
import {
  FALLBACK_RORI_WIKI_PAGES,
  findRoriWikiSearchResult,
  RORI_WIKI_SOURCE_TITLE,
  type RoriWikiPage,
  type RoriWikiSearchResult,
} from "./rori-wiki";
import type { BotPromptConfig } from "../bots/bot-prompt-config.repo";
import type { ChatRuntimeReplyDiagnostics } from "./runtime-diagnostics";

type RoriCitation = {
  sourceId: "knowledge_base";
  title: string;
  url: string;
};

type RoriSource = {
  id: string;
  title: string;
  url: string;
  summary: string;
};

type RoriReply = {
  boundaryType?: "jailbreak_attempt" | "off_topic";
  composer?: {
    sourceIds: string[];
    usedFallback: boolean;
  };
  output: string;
  citations: RoriCitation[];
  runtimeDiagnostics?: ChatRuntimeReplyDiagnostics;
};

const RORI_OFF_TOPIC_REPLY =
  "I can only help with PBG Academy, the Playground tools, enrollment, workshops, and support rooms.";
const RORI_JAILBREAK_REPLY =
  "I can't help with bypassing my instructions or stepping outside my approved Academy role.";

type RoriConversationIntent =
  | "academy"
  | "enrollment"
  | "programs"
  | "rooms"
  | "tools"
  | "workshops";

export type RoriConversationContext = {
  lastIntent: RoriConversationIntent | null;
  lastOutcome?: RoriResponseDecision["reason"] | null;
  lastSourceIds?: string[];
  lastUserMessage: string | null;
  unresolvedClarification?: boolean;
};

export type RoriPromptConfig = BotPromptConfig;

const ACADEMY_SOURCE: RoriSource = {
  id: "rori-academy-concierge",
  title: "Rori Academy Concierge Source Pack",
  url: "sgt-bots://docs/rori-academy-concierge-source-pack#academy",
  summary:
    "Rori answers PBG Academy enrollment, workshop, event, Telegram room, and general navigation questions. If a live link is not available in the playground, Rori should say so plainly instead of guessing.",
};

const DEFAULT_RORI_PROMPT_CONFIG: RoriPromptConfig = {
  active: true,
  botId: "concierge_general_academy_KB",
  escalationPolicy:
    "Route account-specific or student-only requests to staff instead of improvising.",
  fallbackPolicy:
    "Ask a focused follow-up when approved Academy sources do not answer the question.",
  guardrails: ["Use only approved Academy and Playground sources."],
  offTopicPolicy:
    "Stay focused on PBG Academy, the Playground tools, enrollment, workshops, and support rooms.",
  personaPrompt: "Be Rori, a warm scholarly guide for the Academy.",
  surface: "playground",
  toneRules: ["Answer first.", "Use plain language."],
  version: "rori-runtime-fallback",
};

const TOOL_ROUTING_SOURCE: RoriSource = {
  id: "rori-tool-routing",
  title: "Rori Tool Routing Source Pack",
  url: "sgt-bots://docs/rori-academy-concierge-source-pack#tool-routing",
  summary:
    "Rori routes credit bureau and dispute work to Cursive, online claim checking to Top Secret, tax or legal research to Condor, and structured forms or intake to ShAzZaM.",
};

const sourceCitation = (source: RoriSource): RoriCitation => ({
  sourceId: "knowledge_base",
  title: source.title,
  url: source.url,
});

const wikiCitation = (page: RoriWikiPage): RoriCitation => ({
  sourceId: "knowledge_base",
  title: page.title,
  url: page.sourceUrl ?? `sgt-bots://wiki/rori/${page.slug}`,
});

function citationSourceIds(citations: RoriCitation[]) {
  return new Set(citations.map((citation) => citation.url));
}

function findWikiPageBySlug(slug: string, pages: RoriWikiPage[]) {
  return pages.find((page) => page.slug === slug && page.status === "published");
}

function findWikiPageByAliases(slugs: string[], pages: RoriWikiPage[]) {
  return pages.find(
    (page) => slugs.includes(page.slug) && page.status === "published",
  );
}

function findWikiPageByKeyword(
  pattern: RegExp,
  pages: RoriWikiPage[],
) {
  return pages.find((page) => {
    if (page.status !== "published") {
      return false;
    }

    return [page.slug, page.title, page.summary, page.body, ...page.keywords].some(
      (value) => pattern.test(value),
    );
  });
}

function buildWikiReply(page: RoriWikiPage): RoriReply {
  return {
    output: page.body,
    citations: [wikiCitation(page)],
  };
}

function hasPricingQuestion(normalizedContent: string) {
  return /\b(cost|costs|price|prices|pricing|how much|monthly|tuition|levels cost)\b/i.test(
    normalizedContent,
  );
}

function extractPricingRows(page: RoriWikiPage) {
  return page.body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\|/.test(line))
    .slice(2)
    .map((line) => line.split("|").map((cell) => cell.trim()).filter(Boolean))
    .filter((cells) => cells.length >= 4)
    .map(([level, monthlyPrice, credits, notes]) => ({
      credits,
      level,
      monthlyPrice,
      notes,
    }));
}

function extractPricingRowsFromSummary(page: RoriWikiPage) {
  const summaryMatch = page.body.match(
    /Current levels include\s+(.+?)(?:\.\s+Paid levels include|\.\s+Stripe and PayPal|\.$)/i,
  );

  if (!summaryMatch) {
    return [];
  }

  return summaryMatch[1]
    .replace(/,\s+and\s+/i, ", ")
    .split(/,\s+(?=[A-Z][A-Za-z/]+)/)
    .map((segment) => segment.trim())
    .map((segment) => {
      const match = segment.match(
        /^(?<level>[A-Za-z/ ]+?)\s+at\s+\$(?<amount>\d+(?:\.\d{2})?)(?<suffix>\s+per\s+month)?$/i,
      );

      if (!match?.groups) {
        return null;
      }

      const amount = `$${match.groups.amount}`;
      const monthlyPrice = match.groups.suffix ? `${amount}/month` : amount;

      return {
        credits: /free|public/i.test(match.groups.level) ? "Not included" : "Included",
        level: match.groups.level.trim(),
        monthlyPrice,
        notes: /free|public/i.test(match.groups.level)
          ? "Limited tools available."
          : "Paid enrollment level.",
      };
    })
    .filter((row): row is {
      credits: string;
      level: string;
      monthlyPrice: string;
      notes: string;
    } => Boolean(row));
}

function buildPricingReply(page: RoriWikiPage): RoriReply {
  const pricingRows = [
    ...extractPricingRows(page),
    ...extractPricingRowsFromSummary(page),
  ].filter(
    (row, index, rows) =>
      rows.findIndex(
        (candidate) =>
          candidate.level.toLowerCase() === row.level.toLowerCase(),
      ) === index,
  );

  if (pricingRows.length === 0) {
    return buildWikiReply(page);
  }

  const [firstRow, ...remainingRows] = pricingRows;
  const pricingSummary = [firstRow, ...remainingRows]
    .map((row) => `${row.level} is ${row.monthlyPrice}`)
    .join(", ");
  const freeRow = pricingRows.find((row) => /free|public/i.test(row.level));
  const details = [
    `Here's the short version on the levels right now: ${pricingSummary}.`,
    freeRow
      ? `${freeRow.level} does not include PBG credits, and the paid levels do include them.`
      : pricingRows.some((row) => !/free|public/i.test(row.level))
        ? "The paid levels do include PBG credits."
        : null,
    "I can't open the live enrollment link inside the playground yet, but I can still point you to the right information.",
  ].filter(Boolean);

  return {
    output: details.join(" "),
    citations: [wikiCitation(page)],
  };
}

function buildProgramsReply(page: RoriWikiPage): RoriReply {
  if (/\n\n|\|---|(?:^|\n)[-*]\s+/u.test(page.body)) {
    return buildWikiReply(page);
  }

  let formattedBody = page.body
    .replace(/ (?=PBG Academy offers both )/u, "\n\n")
    .replace(/ (?=Public learners can explore )/u, "\n\n")
    .replace(/ (?=Completing a Mission does not guarantee )/u, "\n\n");

  if (!formattedBody.includes("\n\n")) {
    const sentences = page.body.split(/(?<=[.!?])\s+(?=[A-Z])/u);

    if (sentences.length >= 4) {
      formattedBody = [
        sentences.slice(0, 2).join(" "),
        sentences.slice(2, 4).join(" "),
        sentences.slice(4).join(" "),
      ]
        .filter(Boolean)
        .join("\n\n");
    }
  }

  return {
    output: formattedBody,
    citations: [wikiCitation(page)],
  };
}

function hasProgramsQuestion(normalizedContent: string) {
  return /\b(course|courses|study|learn|program|programs|curriculum|mission|missions)\b/i.test(
    normalizedContent,
  );
}

function hasSupportEscalationQuestion(normalizedContent: string) {
  return /\b(payment problem|payment trouble|billing issue|billing problem|payment issue|upgrade|downgrade|leave of absence|conflict|cancel|cancellation|refund|discount)\b/i.test(
    normalizedContent,
  );
}

function hasEnrollmentContactQuestion(normalizedContent: string) {
  return /\b(who (do|should) i (talk|speak|go)|who can help|who do i ask|where do i go|who handles)\b/i.test(
    normalizedContent,
  ) && /\b(enroll|enrollment|join|sign up|signup|classes?|courses?)\b/i.test(
    normalizedContent,
  );
}

function hasEnrollmentQuestion(normalizedContent: string) {
  return (
    /\b(enroll|enrollment|sign up|signup)\b/i.test(normalizedContent) ||
    (/\bjoin\b/i.test(normalizedContent) &&
      /\b(i|we|academy|pbg|class|classes|course|courses|member|membership)\b/i.test(
        normalizedContent,
      )) ||
    /\bhow do i join\b/i.test(normalizedContent) ||
    /\bjoin the academy\b/i.test(normalizedContent) ||
    /\bjoin pbg\b/i.test(normalizedContent)
  );
}

function buildAfterEnrollmentReply(): RoriReply {
  return {
    output:
      "After you enroll, I'll help you with the next practical steps and make sure you know where to go from there. In the playground I keep that part high level, so I won't expose student-only access details here, but I can still explain what to expect and who to contact if you need help.",
    citations: [sourceCitation(ACADEMY_SOURCE)],
  };
}

function buildSimplifiedProgramsFollowUpReply(
  page: RoriWikiPage | undefined,
): RoriReply {
  return {
    output:
      "In simpler words, Missions are the Academy's courses. They give Cadets a structured way to study a topic, work through the material, and check their understanding as they go.",
    citations: page ? [wikiCitation(page)] : [sourceCitation(ACADEMY_SOURCE)],
  };
}

function buildConfiguredFallbackReply(
  promptConfig: RoriPromptConfig | undefined,
  fallback: string,
): RoriReply {
  return {
    output: promptConfig?.fallbackPolicy?.trim() || fallback,
    citations: [sourceCitation(ACADEMY_SOURCE)],
  };
}

function buildOffTopicReply(
  _promptConfig: RoriPromptConfig | undefined,
): RoriReply {
  return {
    boundaryType: "off_topic",
    output: RORI_OFF_TOPIC_REPLY,
    citations: [sourceCitation(ACADEMY_SOURCE)],
  };
}

function buildJailbreakReply(): RoriReply {
  return {
    boundaryType: "jailbreak_attempt",
    output: RORI_JAILBREAK_REPLY,
    citations: [sourceCitation(ACADEMY_SOURCE)],
  };
}

function buildClarificationReply(decision: RoriResponseDecision): RoriReply {
  const output =
    decision.reason === "missing_follow_up_context"
      ? "What would you like to dig into: enrollment, Missions, support rooms, workshops, or which Playground tool fits what you're trying to do?"
      : "Yes. I can help with enrollment, Missions, workshops, support rooms, or choosing the right Playground tool. Which one are you trying to figure out?";

  return {
    output,
    citations: [sourceCitation(ACADEMY_SOURCE)],
  };
}

function buildPartialWikiClarificationReply(
  page: RoriWikiPage,
  content: string,
): RoriReply {
  const subject =
    content
      .replace(/[?.!]+$/u, "")
      .match(/\b(?:what about|tell me about|explain)\s+(.+)$/i)?.[1]
      ?.trim() || "that";
  const followUpPrompt = [page.slug, page.title, page.summary, ...page.keywords]
    .join(" ")
    .match(/\b(enroll|enrollment|pricing|cost|credits?|levels?|specialist)\b/i)
    ? `Which part of ${subject} do you want me to unpack: cost, access, credits, or what it means in practice?`
    : `Which part of ${subject} do you want me to unpack next?`;

  return {
    output: `${page.body}\n\n${followUpPrompt}`,
    citations: [wikiCitation(page)],
  };
}

function isJailbreakAttempt(normalizedContent: string) {
  return /\b(ignore (all|any|your|previous) instructions|disregard (all|any|your|previous) instructions|reveal (your|the) (prompt|system prompt|instructions)|show (me )?(your|the) (prompt|system prompt|instructions)|what are your hidden instructions|developer message|system message|jailbreak|bypass (your|the) instructions|step outside (your|the) role|pretend (you are|to be) (not rori|a different bot|an unrestricted)|dan mode|do anything now)\b/i.test(
    normalizedContent,
  );
}

function prefersWarmScholarlyGuide(promptConfig: RoriPromptConfig | undefined) {
  const voiceText = [
    promptConfig?.personaPrompt ?? "",
    ...(promptConfig?.toneRules ?? []),
  ].join(" ");

  return /\bscholarly\b|\bteacher\b|\bguide\b/i.test(voiceText);
}

function shapeRoriOutput(
  output: string,
  promptConfig: RoriPromptConfig | undefined,
) {
  const warmedOutput =
    !promptConfig || !prefersWarmScholarlyGuide(promptConfig)
      ? output
      : output
    .replace(
      /^Here are the PBG Telegram rooms I can point you to right now:/,
      "Here's where I'd point you right now:",
    )
    .replace(
      /^Here are the current PBG Telegram rooms:/,
      "Here's the current room picture:",
    )
    .replace(
      /^I can help with PBG Academy enrollment\./,
      "Here's the straightforward version on enrollment.",
    )
    .replace(
      /^I can help explain the Academy levels and pricing,/,
      "Here's the straightforward version on pricing,",
    )
    .replace(
      /^I can help you choose the right tool\./,
      "Here's how I'd sort that.",
    )
    .replace(
      /^The best match is /,
      "The best fit here is ",
    )
    .replace(
      /^Right now the Academy pricing looks like this:/,
      "Here's the straightforward version on pricing:",
    )
    .replace(
      /^For that, the best match is /,
      "For that, I'd point you to ",
    );

  return formatRoriParagraphs(warmedOutput);
}

function formatRoriParagraphs(output: string) {
  if (output.includes("\n\n") || /(?:^|\n)[-*]\s+/u.test(output) || /\|---/u.test(output)) {
    return output;
  }

  if (output.includes(" I can't open the live ")) {
    return output.replace(/ (?=I can't open the live )/u, "\n\n");
  }

  if (output.startsWith("For that, I'd point you to ")) {
    return output.replace(/\. (?=I can't open the live invite)/u, ".\n\n");
  }

  if (output.startsWith("Here's the short version on the levels right now:")) {
    return output.replace(/\. (?=Free\/Public does not include)/u, ".\n\n");
  }

  const sentences = output.split(/(?<=[.!?])\s+(?=[A-Z])/u);

  if (sentences.length >= 3) {
    return `${sentences.slice(0, 2).join(" ")}\n\n${sentences.slice(2).join(" ")}`;
  }

  return output;
}

function finalizeRoriReply(
  reply: RoriReply,
  promptConfig: RoriPromptConfig | undefined,
): RoriReply {
  return {
    ...reply,
    output: shapeRoriOutput(reply.output, promptConfig),
  };
}

function classifyRoriIntent(content: string): RoriConversationIntent | null {
  const normalizedContent = content.toLowerCase();

  if (hasTelegramRoomRoutingQuestion(normalizedContent)) {
    return "rooms";
  }

  if (toolRoute(normalizedContent)) {
    return "tools";
  }

  if (
    /\b(which|what) (tool|bot)|tool should i use|use for\b/i.test(normalizedContent)
  ) {
    return "tools";
  }

  if (
    /\b(after i enroll|after enrollment|what happens after i enroll|what happens once i enroll|what happens when i enroll)\b/i.test(
      normalizedContent,
    ) ||
    hasEnrollmentQuestion(normalizedContent)
  ) {
    return "enrollment";
  }

  if (hasProgramsQuestion(normalizedContent)) {
    return "programs";
  }

  if (/\bworkshops?|events?|classes?|register|registration\b/i.test(normalizedContent)) {
    return "workshops";
  }

  if (/\btelegram|rooms?|channels?|group chat|chat room\b/i.test(normalizedContent)) {
    return "rooms";
  }

  if (/\bacademy|pbg\b/i.test(normalizedContent)) {
    return "academy";
  }

  return null;
}

function buildRoriConversationContext(
  priorUserMessages: string[],
): RoriConversationContext {
  const lastUserMessage = priorUserMessages.at(-1) ?? null;

  return {
    lastIntent: lastUserMessage ? classifyRoriIntent(lastUserMessage) : null,
    lastUserMessage,
  };
}

function resolveFollowUpContent(
  content: string,
  context: RoriConversationContext | undefined,
) {
  if (!context?.lastIntent) {
    return content;
  }

  const normalizedContent = content.toLowerCase().trim();

  if (
    context.lastIntent === "enrollment" &&
    /\b(after that|afterwards|what happens next|and then what|what happens after that)\b/i.test(
      normalizedContent,
    )
  ) {
    return "What happens after I enroll?";
  }

  if (
    context.lastIntent === "rooms" &&
    /\b(which one|which room|what about|and which one)\b/i.test(normalizedContent)
  ) {
    if (/\b(payment|billing|upgrade|leave|absence|conflict|trouble|technical|login|access)\b/i.test(normalizedContent)) {
      return "Which Telegram room is for payment trouble and account-specific issues?";
    }

    if (/\b(general|academy help|pricing|enrollment|missions?|first step|support)\b/i.test(normalizedContent)) {
      return "Which Telegram room is for general Academy help?";
    }
  }

  if (
    context.lastIntent === "programs" &&
    /\b(say that in simpler words|simpler words|simplify|make that simpler|plain language)\b/i.test(
      normalizedContent,
    )
  ) {
    return "Explain Missions in simpler words.";
  }

  return content;
}

function hasLiveLinkRequest(normalizedContent: string) {
  return /\b(link|links|url|invite|invitation|join link|registration link|sign[- ]?up link|sign up|signup|where do i register|where to register)\b/i.test(
    normalizedContent,
  );
}

function hasTelegramRoomRoutingQuestion(normalizedContent: string) {
  return (
    /\btelegram\b/i.test(normalizedContent) &&
    /\b(rooms?|channels?|group chat|chat room)\b/i.test(normalizedContent) &&
    (/\b(which|what|list|all|where|invite|invitation|link|links)\b/i.test(
      normalizedContent,
    ) ||
      /\b(access|trouble|technical|cannot find|can't find)\b/i.test(normalizedContent) ||
      /\brooms? should\b/i.test(normalizedContent) ||
      /\brooms? (?:is|are)?\s*for\b/i.test(normalizedContent))
  );
}

function hasToolOverviewQuestion(normalizedContent: string) {
  return (
    /\b(bot|bots|tool|tools)\b/i.test(normalizedContent) &&
    /\b(what do|what can|do|does|used for|use for|help with)\b/i.test(normalizedContent)
  );
}

function buildTelegramRoomReply(
  normalizedContent: string,
  directory: RoriAcademyDirectory,
): RoriReply {
  const hasSpecificRoomIntent =
    /\b(enroll|enrollment|workshops?|events?|classes?|technical|trouble|login|provider|api key|tool|cursive|top secret|condor|shazzam|access)\b/i.test(
      normalizedContent,
    );
  const shouldListRooms =
    !hasSpecificRoomIntent &&
    ((/\b(which|what|list|all)\b/i.test(normalizedContent) &&
      /\brooms?|channels?|join\b/i.test(normalizedContent)) ||
      hasLiveLinkRequest(normalizedContent));
  const matchedRoom = shouldListRooms
    ? null
    : findTelegramRoomRecord(normalizedContent, directory.telegramRooms);
  const hasConfiguredRoomLinks = directory.telegramRooms.some(
    (room) => room.linkStatus === "configured" && room.inviteUrl,
  );
  const liveLinkNote = hasLiveLinkRequest(normalizedContent) && !hasConfiguredRoomLinks
    ? " I can't open the live room links in the playground yet, but I can still tell you which room handles what."
    : "";
  const roomGuidance = matchedRoom
    ? `The best match is ${matchedRoom.label}. ${matchedRoom.purpose} ${formatTelegramRoomLinkStatus(matchedRoom)}`
    : `Here are the PBG Telegram rooms I can point you to right now: ${formatTelegramRoomList(directory.telegramRooms)}`;

  return {
    output: `${roomGuidance}${liveLinkNote}`,
    citations: [sourceCitation(RORI_DIRECTORY_SOURCE)],
  };
}

function toolRoute(normalizedContent: string): RoriReply | null {
  const routes = [
    {
      pattern:
        /\b(credit reports?|credit-report|consumer reports?|consumer reporting agenc(?:y|ies)|reinvestigation|bureau|dispute|tradeline|fcra|fair credit reporting act)\b/i,
      output:
        "I'd send that to Cursive. It's the best fit for credit bureau, dispute, tradeline, and FCRA workflows.",
    },
    {
      pattern:
        /\b(fact[- ]?check|check (?:this )?(?:claim|myth|statement|post|message)|verify (?:this )?(?:claim|myth|statement|post|message)|source-backed verification|is this true or false|whether this is true|true\/false|true-false|online claim|myth)\b/i,
      output:
        "I'd send that to Top Secret. It's the right lane for checking claims, myths, and true-or-false questions.",
    },
    {
      pattern: /\b(tax|legal|statute|usc|cfr|irs|treasury)\b/i,
      output:
        "I'd send that to Condor. It's the right place for tax, legal, statute, USC, CFR, IRS, and Treasury research.",
    },
    {
      pattern: /\b(form|intake|questionnaire|collect document answers)\b/i,
      output:
        "I'd send that to ShAzZaM. It's the best fit for forms, intake flows, questionnaires, and collecting answers.",
    },
  ];
  const route = routes.find(({ pattern }) => pattern.test(normalizedContent));

  return route
    ? {
        output: `${route.output} ${TOOL_ROUTING_SOURCE.summary}`,
        citations: [sourceCitation(TOOL_ROUTING_SOURCE)],
      }
    : null;
}

function buildToolOverviewReply(): RoriReply {
  return {
    output:
      "Here's the short version. Cursive is for credit bureau and dispute work, Top Secret is for checking claims and online information, Condor is for tax or legal research, ShAzZaM helps with forms and guided intake, Insight is for tutoring and guided learning support, and I help with Academy questions, enrollment, workshops, support rooms, and tool routing.\n\nThere are 37 tools and gadgets at PBG to assist Cadets along their learning journey. If you tell me what you're trying to do, I can point you to the best fit.",
    citations: [sourceCitation(TOOL_ROUTING_SOURCE)],
  };
}

export function buildGroundedRoriReply(
  content: string,
  grounding: {
    conversationContext?: RoriConversationContext;
    directory?: RoriAcademyDirectory;
    promptConfig?: RoriPromptConfig;
    telegramRooms?: RoriAcademyDirectory["telegramRooms"];
    workshops?: RoriAcademyDirectory["workshops"];
    wikiPages?: RoriWikiPage[];
    wikiSearchResult?: RoriWikiSearchResult;
  } = {},
): RoriReply {
  const resolvedContent = resolveFollowUpContent(
    content,
    grounding.conversationContext,
  );
  const normalizedContent = resolvedContent.toLowerCase();
  const directory: RoriAcademyDirectory = grounding.directory ?? {
    telegramRooms:
      grounding.telegramRooms ?? FALLBACK_RORI_ACADEMY_DIRECTORY.telegramRooms,
    workshops: grounding.workshops ?? FALLBACK_RORI_ACADEMY_DIRECTORY.workshops,
  };
  const promptConfig = grounding.promptConfig;
  const wikiPages = grounding.wikiPages ?? FALLBACK_RORI_WIKI_PAGES;
  const wikiSearchResult =
    grounding.wikiSearchResult ??
    findRoriWikiSearchResult(resolvedContent, wikiPages);
  const attachRuntimeDiagnostics = (reply: RoriReply): RoriReply => ({
    ...reply,
    runtimeDiagnostics: {
      decisionIntent: decision.intent,
      decisionReason: decision.reason,
      providerFallbackState: reply.composer
        ? reply.composer.usedFallback
          ? "composer_fallback"
          : "live_provider"
        : "deterministic_runtime",
      retrievalOutcome: wikiSearchResult.outcome,
      sourceIds:
        reply.composer && reply.composer.sourceIds.length > 0
          ? reply.composer.sourceIds
          : reply.citations.map((citation) => citation.url),
    },
  });
  const respond = (reply: RoriReply) =>
    attachRuntimeDiagnostics(
      finalizeRoriReply(
        {
          ...reply,
          composer: buildComposerMetadata(reply),
        },
        promptConfig,
      ),
    );
  const decision = decideRoriResponse({
    content: resolvedContent,
    conversationContext: grounding.conversationContext,
    normalizedContent,
    wikiSearchResult,
  });
  const composerInput =
    wikiSearchResult.matches.length > 0
      ? buildRoriComposerInput({
          content: resolvedContent,
          conversationContext: grounding.conversationContext,
          decision,
          promptConfig: promptConfig ?? DEFAULT_RORI_PROMPT_CONFIG,
          wikiSearchResult,
        })
      : null;
  const buildComposerMetadata = (reply: RoriReply) => {
    if (!composerInput || reply.boundaryType) {
      return undefined;
    }

    const replySourceIds = citationSourceIds(reply.citations);
    const supportedSourceIds = composerInput.sourceIds.filter((sourceId) =>
      replySourceIds.has(sourceId),
    );

    if (supportedSourceIds.length === 0) {
      return undefined;
    }

    const validated = validateRoriComposerOutput(
      {
        output: reply.output,
        sourceIds: supportedSourceIds,
      },
      composerInput.sourceIds,
    );

    return {
      sourceIds: validated.sourceIds,
      usedFallback: true,
    };
  };

  if (isJailbreakAttempt(normalizedContent)) {
    const jailbreakReply = buildJailbreakReply();

    return {
      ...jailbreakReply,
      runtimeDiagnostics: {
        decisionIntent: "boundary",
        decisionReason: "jailbreak_attempt",
        providerFallbackState: "deterministic_runtime",
        retrievalOutcome: wikiSearchResult.outcome,
        sourceIds: jailbreakReply.citations.map((citation) => citation.url),
      },
    };
  }

  if (decision.intent === "escalate" && decision.reason === "operational_escalation") {
    const supportRoom =
      findTelegramRoomRecord("payment trouble upgrade billing leave of absence conflict", directory.telegramRooms) ??
      directory.telegramRooms.find((room) => /lobby/i.test(room.label));

    if (supportRoom) {
      return respond({
        output: `For that, the best match is ${supportRoom.label}. ${supportRoom.purpose} ${formatTelegramRoomLinkStatus(
          supportRoom,
        )}`,
        citations: [sourceCitation(RORI_DIRECTORY_SOURCE)],
      });
    }
  }

  if (hasEnrollmentContactQuestion(normalizedContent)) {
    const supportRoom =
      findTelegramRoomRecord("admin staff payment billing upgrade leave absence conflict", directory.telegramRooms) ??
      directory.telegramRooms.find((room) => /lobby/i.test(room.label));

    if (supportRoom) {
      return respond({
        output: `For enrollment help, I'd point you to ${supportRoom.label}. Open a DM there and ask an admin to help you get started.\n\nI can't open the live invite for ${supportRoom.label} in the playground yet, but I can still point you to the right room.`,
        citations: [sourceCitation(RORI_DIRECTORY_SOURCE)],
      });
    }
  }

  if (decision.intent === "route" && decision.reason === "room_route") {
    return respond(buildTelegramRoomReply(normalizedContent, directory));
  }

  const routedReply =
    decision.intent === "route" && decision.reason === "tool_route"
      ? toolRoute(normalizedContent)
      : null;

  if (routedReply) {
    return respond(routedReply);
  }

  if (/\b(which|what) (tool|bot)|tool should i use|use for\b/i.test(normalizedContent)) {
    const toolGuidePage = findWikiPageBySlug("tool-guide", wikiPages);

    if (toolGuidePage) {
      return respond(buildWikiReply(toolGuidePage));
    }

      return respond({
        output:
          "I can help you choose the right tool. Use Cursive for credit bureau and dispute work, Top Secret for checking online claims, Condor for tax or legal research, and ShAzZaM for forms or guided intake.",
        citations: [sourceCitation(TOOL_ROUTING_SOURCE)],
      });
  }

  if (hasToolOverviewQuestion(normalizedContent)) {
    return respond(buildToolOverviewReply());
  }

  if (
    /\b(after i enroll|after enrollment|what happens after i enroll|what happens once i enroll|what happens when i enroll)\b/i.test(
      normalizedContent,
    )
  ) {
    return respond(buildAfterEnrollmentReply());
  }

  if (
    /\bworkshops?|events?|classes?|register|registration\b/i.test(normalizedContent) &&
    hasLiveLinkRequest(normalizedContent)
  ) {
    const hasConfiguredRegistration = directory.workshops.some(
      (workshop) =>
        workshop.registrationStatus === "configured" && workshop.registrationUrl,
    );
    const liveLinkNote = hasConfiguredRegistration
      ? ""
      : " I can't open the registration link in the playground yet, but an Academy admin or Ambassador can give it to you.";

    return respond({
      output: `${formatWorkshopDirectorySummary(directory.workshops)}${liveLinkNote}`,
      citations: [sourceCitation(RORI_DIRECTORY_SOURCE)],
    });
  }

  if (hasPricingQuestion(normalizedContent)) {
    const pricingPage =
      findWikiPageByAliases(["enrollment-and-pricing", "enrollment"], wikiPages) ??
      findWikiPageByKeyword(/\b(pricing|cost|tuition|monthly price|pbg credits)\b/i, wikiPages);

    if (pricingPage) {
      return respond(buildPricingReply(pricingPage));
    }

    return respond({
      output:
        "I can help explain the Academy levels and pricing, but I don't want to guess at the exact amounts if the current pricing page is unavailable. If you want, ask me about enrollment levels and I'll share the guidance I do have.",
      citations: [sourceCitation(ACADEMY_SOURCE)],
    });
  }

  if (
    /\b(credits?|pbg credits?|paid levels?)\b/i.test(normalizedContent)
  ) {
    const pricingPage =
      findWikiPageByAliases(["enrollment-and-pricing", "enrollment"], wikiPages) ??
      findWikiPageByKeyword(/\b(pricing|cost|tuition|monthly price|pbg credits)\b/i, wikiPages);

    if (pricingPage) {
      return respond(buildPricingReply(pricingPage));
    }
  }

  if (hasEnrollmentQuestion(normalizedContent)) {
    const enrollmentPage =
      findWikiPageByAliases(["enrollment", "enrollment-and-pricing"], wikiPages) ??
      findWikiPageByKeyword(/\b(enrollment|pricing|join|sign up|signup)\b/i, wikiPages);

    if (enrollmentPage) {
      return respond(buildWikiReply(enrollmentPage));
    }

    return respond({
      output:
        "I can help with PBG Academy enrollment. I can't open the live enrollment link inside the playground yet, but I can still point you to the right information and the right person when you're ready.",
      citations: [sourceCitation(ACADEMY_SOURCE)],
    });
  }

  if (/\bworkshops?|events?|classes?|register|registration\b/i.test(normalizedContent)) {
    const liveLinkNote = hasLiveLinkRequest(normalizedContent)
      ? " I can't open the registration link in the playground yet, but an Academy admin or Ambassador can share it."
      : "";

    return respond({
      output: `${formatWorkshopDirectorySummary(directory.workshops)}${liveLinkNote}`,
      citations: [sourceCitation(RORI_DIRECTORY_SOURCE)],
    });
  }

  if (/\btelegram|rooms?|channels?|group chat|chat room\b/i.test(normalizedContent)) {
    const roomGuidance = `Here are the current PBG Telegram rooms: ${formatTelegramRoomList(directory.telegramRooms)}`;

    return respond({
      output: roomGuidance,
      citations: [sourceCitation(RORI_DIRECTORY_SOURCE)],
    });
  }

  if (hasProgramsQuestion(normalizedContent)) {
    const programsPage =
      findWikiPageByAliases(["programs-and-curriculum"], wikiPages) ??
      findWikiPageByKeyword(/\b(programs?|curriculum|missions?|courses?|study|learn)\b/i, wikiPages);

    if (programsPage) {
      if (/\bsimpler words|plain language|simpler\b/i.test(normalizedContent)) {
        return respond(buildSimplifiedProgramsFollowUpReply(programsPage));
      }

      return respond(buildProgramsReply(programsPage));
    }
  }

  if (decision.intent === "clarify") {
    return respond(buildClarificationReply(decision));
  }

  if (
    decision.intent === "answer" &&
    decision.needsClarification &&
    wikiSearchResult.pages[0]
  ) {
    return respond(
      buildPartialWikiClarificationReply(
        wikiSearchResult.pages[0],
        resolvedContent,
      ),
    );
  }

  if (!classifyRoriIntent(normalizedContent) && !hasPricingQuestion(normalizedContent)) {
    return respond(buildOffTopicReply(promptConfig));
  }

  if (/\b(help|question|info|information|more)\b/i.test(normalizedContent) && wikiPages.length === 0) {
    return respond(buildConfiguredFallbackReply(
      promptConfig,
      "I'm here to help with PBG Academy enrollment, workshop details, Telegram rooms, and choosing the right Playground tool. Tell me what you're trying to do and I'll point you in the right direction.",
    ));
  }

  return respond({
    output:
      wikiPages[0]?.body ??
      (promptConfig?.fallbackPolicy?.trim() ||
        "I can help with PBG Academy enrollment, workshop details, Telegram rooms, and choosing the right Playground tool. Tell me what you're trying to do and I'll point you in the right direction."),
    citations: wikiPages[0]
      ? [wikiCitation(wikiPages[0])]
      : [sourceCitation(ACADEMY_SOURCE)],
  });
}

export { buildRoriConversationContext };
