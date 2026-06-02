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
  FALLBACK_RORI_WIKI_PAGES,
  RORI_WIKI_SOURCE_TITLE,
  type RoriWikiPage,
} from "./rori-wiki";

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
  output: string;
  citations: RoriCitation[];
};

type RoriConversationIntent =
  | "academy"
  | "enrollment"
  | "rooms"
  | "tools"
  | "workshops";

export type RoriConversationContext = {
  lastIntent: RoriConversationIntent | null;
  lastUserMessage: string | null;
};

const ACADEMY_SOURCE: RoriSource = {
  id: "rori-academy-concierge",
  title: "Rori Academy Concierge Source Pack",
  url: "sgt-bots://docs/rori-academy-concierge-source-pack#academy",
  summary:
    "Rori answers PBG Academy enrollment, workshop, event, Telegram room, and general navigation questions. If a live link is not available in the playground, Rori should say so plainly instead of guessing.",
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

function buildPricingReply(page: RoriWikiPage): RoriReply {
  const pricingRows = extractPricingRows(page);

  if (pricingRows.length === 0) {
    return buildWikiReply(page);
  }

  const [firstRow, ...remainingRows] = pricingRows;
  const pricingSummary = [firstRow, ...remainingRows]
    .map((row) => `${row.level} is ${row.monthlyPrice}`)
    .join(", ");
  const freeRow = pricingRows.find((row) => /free|public/i.test(row.level));
  const paidLevels = pricingRows
    .filter((row) => !/free|public/i.test(row.level))
    .map((row) => row.level)
    .join(", ");
  const ultraRow = pricingRows.find((row) => /^ultra$/i.test(row.level));

  const details = [
    `Right now the Academy pricing looks like this: ${pricingSummary}.`,
    freeRow
      ? `${freeRow.level} does not include PBG credits, and the paid levels do include them.`
      : paidLevels
        ? `Paid levels ${paidLevels} include PBG credits.`
        : null,
    ultraRow?.notes ? `Ultra is currently described as ${ultraRow.notes.toLowerCase()}` : null,
    "I can't open the live enrollment link inside the playground yet, but I can still point you to the right information.",
  ].filter(Boolean);

  return {
    output: details.join(" "),
    citations: [wikiCitation(page)],
  };
}

function buildAfterEnrollmentReply(): RoriReply {
  return {
    output:
      "After you enroll, I'll help you with the next practical steps and make sure you know where to go from there. In the playground I keep that part high level, so I won't expose student-only access details here, but I can still explain what to expect and who to contact if you need help.",
    citations: [sourceCitation(ACADEMY_SOURCE)],
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
    /\benroll|enrollment|join academy|sign up|signup\b/i.test(normalizedContent)
  ) {
    return "enrollment";
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
  for (let index = priorUserMessages.length - 1; index >= 0; index -= 1) {
    const lastUserMessage = priorUserMessages[index] ?? null;

    if (!lastUserMessage) {
      continue;
    }

    const lastIntent = classifyRoriIntent(lastUserMessage);

    if (lastIntent) {
      return {
        lastIntent,
        lastUserMessage,
      };
    }
  }

  return {
    lastIntent: null,
    lastUserMessage: priorUserMessages.at(-1) ?? null,
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

export function buildGroundedRoriReply(
  content: string,
  grounding: {
    conversationContext?: RoriConversationContext;
    directory?: RoriAcademyDirectory;
    telegramRooms?: RoriAcademyDirectory["telegramRooms"];
    workshops?: RoriAcademyDirectory["workshops"];
    wikiPages?: RoriWikiPage[];
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
  const wikiPages = grounding.wikiPages ?? FALLBACK_RORI_WIKI_PAGES;

  if (hasTelegramRoomRoutingQuestion(normalizedContent)) {
    return buildTelegramRoomReply(normalizedContent, directory);
  }

  const routedReply = toolRoute(normalizedContent);

  if (routedReply) {
    return routedReply;
  }

  if (/\b(which|what) (tool|bot)|tool should i use|use for\b/i.test(normalizedContent)) {
    const toolGuidePage = findWikiPageBySlug("tool-guide", wikiPages);

    if (toolGuidePage) {
      return buildWikiReply(toolGuidePage);
    }

      return {
        output:
          "I can help you choose the right tool. Use Cursive for credit bureau and dispute work, Top Secret for checking online claims, Condor for tax or legal research, and ShAzZaM for forms or guided intake.",
        citations: [sourceCitation(TOOL_ROUTING_SOURCE)],
      };
  }

  if (
    /\b(after i enroll|after enrollment|what happens after i enroll|what happens once i enroll|what happens when i enroll)\b/i.test(
      normalizedContent,
    )
  ) {
    return buildAfterEnrollmentReply();
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

    return {
      output: `${formatWorkshopDirectorySummary(directory.workshops)}${liveLinkNote}`,
      citations: [sourceCitation(RORI_DIRECTORY_SOURCE)],
    };
  }

  if (hasPricingQuestion(normalizedContent)) {
    const pricingPage =
      findWikiPageByAliases(["enrollment-and-pricing", "enrollment"], wikiPages) ??
      findWikiPageByKeyword(/\b(pricing|cost|tuition|monthly price|pbg credits)\b/i, wikiPages);

    if (pricingPage) {
      return buildPricingReply(pricingPage);
    }

    return {
      output:
        "I can help explain the Academy levels and pricing, but I don't want to guess at the exact amounts if the current pricing page is unavailable. If you want, ask me about enrollment levels and I'll share the guidance I do have.",
      citations: [sourceCitation(ACADEMY_SOURCE)],
    };
  }

  if (/\benroll|enrollment|join academy|sign up|signup\b/i.test(normalizedContent)) {
    const enrollmentPage =
      findWikiPageByAliases(["enrollment", "enrollment-and-pricing"], wikiPages) ??
      findWikiPageByKeyword(/\b(enrollment|pricing|join academy|sign up)\b/i, wikiPages);

    if (enrollmentPage) {
      return buildWikiReply(enrollmentPage);
    }

    return {
      output:
        "I can help with PBG Academy enrollment. I can't open the live enrollment link inside the playground yet, but I can still point you to the right information and the right person when you're ready.",
      citations: [sourceCitation(ACADEMY_SOURCE)],
    };
  }

  if (/\bworkshops?|events?|classes?|register|registration\b/i.test(normalizedContent)) {
    const liveLinkNote = hasLiveLinkRequest(normalizedContent)
      ? " I can't open the registration link in the playground yet, but an Academy admin or Ambassador can share it."
      : "";

    return {
      output: `${formatWorkshopDirectorySummary(directory.workshops)}${liveLinkNote}`,
      citations: [sourceCitation(RORI_DIRECTORY_SOURCE)],
    };
  }

  if (/\btelegram|rooms?|channels?|group chat|chat room\b/i.test(normalizedContent)) {
    const roomGuidance = `Here are the current PBG Telegram rooms: ${formatTelegramRoomList(directory.telegramRooms)}`;

    return {
      output: roomGuidance,
      citations: [sourceCitation(RORI_DIRECTORY_SOURCE)],
    };
  }

  return {
    output: wikiPages[0]?.body ??
      "I can help with PBG Academy enrollment, workshop details, Telegram rooms, and choosing the right Playground tool. Tell me what you're trying to do and I'll point you in the right direction.",
    citations: wikiPages[0] ? [wikiCitation(wikiPages[0])] : [sourceCitation(ACADEMY_SOURCE)],
  };
}

export { buildRoriConversationContext };
