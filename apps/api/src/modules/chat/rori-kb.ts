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

const ACADEMY_SOURCE: RoriSource = {
  id: "rori-academy-concierge",
  title: "Rori Academy Concierge Source Pack",
  url: "sgt-bots://docs/rori-academy-concierge-source-pack#academy",
  summary:
    "Rori answers PBG Academy enrollment, workshop, event, Telegram room, and general navigation questions. Live enrollment, registration, and room-link directories are not configured in this repo yet.",
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

function buildWikiReply(page: RoriWikiPage): RoriReply {
  return {
    output: `${page.body} Source: ${RORI_WIKI_SOURCE_TITLE}.`,
    citations: [wikiCitation(page)],
  };
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
    ? " The live room links are not configured yet; live invite links are not configured, so Rori should not make up Telegram room links."
    : "";
  const roomGuidance = matchedRoom
    ? `The best PBG Telegram room match is ${matchedRoom.label}. ${matchedRoom.purpose} ${formatTelegramRoomLinkStatus(matchedRoom)}`
    : `Here are the current PBG Telegram rooms: ${formatTelegramRoomList(directory.telegramRooms)}`;

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
    directory?: RoriAcademyDirectory;
    telegramRooms?: RoriAcademyDirectory["telegramRooms"];
    workshops?: RoriAcademyDirectory["workshops"];
    wikiPages?: RoriWikiPage[];
  } = {},
): RoriReply {
  const normalizedContent = content.toLowerCase();
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
        "Rori can help you choose the right tool. Use Cursive for credit bureau and dispute work, Top Secret for checking online claims, Condor for tax or legal research, and ShAzZaM for forms or guided intake.",
      citations: [sourceCitation(TOOL_ROUTING_SOURCE)],
    };
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
      : " The live workshop registration link is not configured yet, so Rori should not invent one.";

    return {
      output: `${formatWorkshopDirectorySummary(directory.workshops)}${liveLinkNote}`,
      citations: [sourceCitation(RORI_DIRECTORY_SOURCE)],
    };
  }

  if (/\benroll|enrollment|join academy|sign up|signup\b/i.test(normalizedContent)) {
    const enrollmentPage = findWikiPageBySlug("enrollment", wikiPages);

    if (enrollmentPage) {
      return buildWikiReply(enrollmentPage);
    }

    return {
      output:
        "Rori can help with PBG Academy enrollment. Start with the current Academy enrollment path, then ask Rori where to go next if you are unsure which Telegram room, workshop, or tool fits your goal. The live enrollment link is not configured yet in this playground build.",
      citations: [sourceCitation(ACADEMY_SOURCE)],
    };
  }

  if (/\bworkshops?|events?|classes?|register|registration\b/i.test(normalizedContent)) {
    const liveLinkNote = hasLiveLinkRequest(normalizedContent)
      ? " The live workshop registration link is not configured yet, so Rori should not invent one."
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
      "Rori can help with PBG Academy enrollment, workshop details, Telegram rooms, and choosing the right Playground tool. Tell Rori what you are trying to do and Rori will point you in the right direction.",
    citations: wikiPages[0] ? [wikiCitation(wikiPages[0])] : [sourceCitation(ACADEMY_SOURCE)],
  };
}
