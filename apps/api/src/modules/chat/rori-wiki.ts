export type RoriWikiPageStatus = "published" | "draft" | "archived";

export type RoriWikiPage = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  keywords: string[];
  status: RoriWikiPageStatus;
  sourceUrl?: string;
  updatedAt?: string;
};

export const RORI_WIKI_SOURCE_TITLE = "Rori Academy Wiki Source Pack";

export type RoriWikiRetrievalOutcome =
  | "exact"
  | "partial"
  | "no_match"
  | "error";

export type RoriWikiSearchMatch = {
  page: RoriWikiPage;
  score: number;
  confidence: number;
  matchedTerms: string[];
  sourceId: string;
};

export type RoriWikiSearchResult = {
  outcome: RoriWikiRetrievalOutcome;
  pages: RoriWikiPage[];
  matches: RoriWikiSearchMatch[];
  queryTerms: string[];
  bestScore: number;
  confidence: number;
  ambiguous: boolean;
  errorMessage?: string;
};

export const FALLBACK_RORI_WIKI_PAGES: RoriWikiPage[] = [
  {
    slug: "academy-overview",
    title: "PBG Academy Overview",
    summary:
      "PBG Academy helps members find the right learning path, workshop, room, or Playground tool.",
    body:
      "PBG Academy is where Cadets come to study business, private commerce, and related topics from a more serious, source-based foundation. If you tell me what you're trying to do, I can help you find the right info, room, or tool.",
    keywords: ["academy", "pbg", "help", "support", "overview"],
    sourceUrl: "sgt-bots://wiki/rori/academy-overview",
    status: "published",
  },
  {
    slug: "enrollment",
    title: "Academy Enrollment",
    summary:
      "Enrollment questions should be answered from the Academy wiki and current operations links when they are available.",
    body:
      "I can help you understand how PBG Academy enrollment works, what the levels cost, and what the next step looks like. I can't open the live enrollment link inside the playground yet, but when you're ready I can point you to the right information.",
    keywords: ["enroll", "enrollment", "join", "sign up", "signup", "academy"],
    sourceUrl: "sgt-bots://wiki/rori/enrollment",
    status: "published",
  },
  {
    slug: "telegram-troubleshooting",
    title: "Telegram Troubleshooting",
    summary:
      "Telegram access questions should route to the Academy room directory when live room links are available.",
    body:
      "If Telegram access is unclear, tell me what room or problem you're dealing with. I can help you figure out which room handles what, and if a live invite is available I'll share it.",
    keywords: ["telegram", "room", "rooms", "access", "trouble", "technical"],
    sourceUrl: "sgt-bots://wiki/rori/telegram-troubleshooting",
    status: "published",
  },
  {
    slug: "tool-guide",
    title: "Playground Tool Guide",
    summary:
      "Rori routes work to the correct Playground tool instead of trying to run specialized workflows.",
    body:
      "Use Cursive for credit bureau and dispute work, Top Secret for checking online claims, Condor for tax or legal research, and ShAzZaM for forms or guided intake.",
    keywords: [
      "tool",
      "tools",
      "bot",
      "bots",
      "cursive",
      "top secret",
      "condor",
      "shazzam",
    ],
    sourceUrl: "sgt-bots://wiki/rori/tool-guide",
    status: "published",
  },
];

const STOP_WORDS = new Set([
  "about",
  "also",
  "and",
  "are",
  "can",
  "could",
  "does",
  "for",
  "from",
  "have",
  "here",
  "how",
  "into",
  "that",
  "the",
  "there",
  "this",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
  "you",
  "your",
]);

const WEAK_INTENT_TERMS = new Set(["help", "info", "information", "question", "questions"]);
const BROAD_CONTEXT_TERMS = new Set([
  "academy",
  "help",
  "info",
  "information",
  "overview",
  "pbg",
  "question",
  "questions",
  "support",
]);

function tokenize(value: string) {
  return value.toLowerCase().match(/[a-z0-9]+/gu) ?? [];
}

function uniqueSearchTerms(value: string) {
  return [...new Set(tokenize(value))].filter(
    (term) => term.length >= 3 && !STOP_WORDS.has(term),
  );
}

function normalizedPhrase(value: string) {
  return tokenize(value).join(" ");
}

function sourceIdForPage(page: RoriWikiPage) {
  return page.sourceUrl ?? `sgt-bots://wiki/rori/${page.slug}`;
}

function termSet(value: string) {
  return new Set(tokenize(value));
}

function scorePage(page: RoriWikiPage, query: string, queryTerms: string[]) {
  const slugTerms = termSet(page.slug);
  const titleTerms = termSet(page.title);
  const summaryTerms = termSet(page.summary);
  const bodyTerms = termSet(page.body);
  const keywordTerms = termSet(page.keywords.join(" "));
  const normalizedQuery = normalizedPhrase(query);
  const keywordPhraseMatch = page.keywords.some((keyword) => {
    const phrase = normalizedPhrase(keyword);
    const phraseTerms = tokenize(keyword);
    return (
      phrase.length > 0 &&
      !phraseTerms.every((term) => BROAD_CONTEXT_TERMS.has(term)) &&
      normalizedQuery.includes(phrase)
    );
  });

  let score = keywordPhraseMatch ? 6 : 0;
  const matchedTerms = new Set<string>();

  for (const term of queryTerms) {
    let termScore = 0;

    if (slugTerms.has(term)) termScore += 4;
    if (titleTerms.has(term)) termScore += 4;
    if (keywordTerms.has(term)) termScore += 4;
    if (summaryTerms.has(term)) termScore += 2;
    if (bodyTerms.has(term)) termScore += 1;
    if (BROAD_CONTEXT_TERMS.has(term)) termScore = Math.min(termScore, 1);

    if (termScore > 0) {
      matchedTerms.add(term);
      score += termScore;
    }
  }

  return {
    keywordPhraseMatch,
    matchedTerms: [...matchedTerms],
    score,
  };
}

export function findRoriWikiSearchResult(
  content: string,
  pages: RoriWikiPage[] = FALLBACK_RORI_WIKI_PAGES,
): RoriWikiSearchResult {
  const queryTerms = uniqueSearchTerms(content);

  if (queryTerms.length === 0) {
    return {
      outcome: "no_match",
      pages: [],
      matches: [],
      queryTerms,
      bestScore: 0,
      confidence: 0,
      ambiguous: false,
    };
  }

  const matches = pages
    .filter((page) => page.status === "published")
    .map((page) => {
      const scoredPage = scorePage(page, content, queryTerms);
      const confidence =
        scoredPage.matchedTerms.length === 0
          ? 0
          : Math.min(1, scoredPage.score / Math.max(queryTerms.length * 6, 1));

      return {
        page,
        score: scoredPage.score,
        confidence,
        matchedTerms: scoredPage.matchedTerms,
        sourceId: sourceIdForPage(page),
        keywordPhraseMatch: scoredPage.keywordPhraseMatch,
      };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.page.title.localeCompare(right.page.title),
    );

  const bestMatch = matches[0];
  if (!bestMatch) {
    return {
      outcome: "no_match",
      pages: [],
      matches: [],
      queryTerms,
      bestScore: 0,
      confidence: 0,
      ambiguous: false,
    };
  }

  const broadPrompt = queryTerms.every((term) => WEAK_INTENT_TERMS.has(term));
  const ambiguous =
    matches.length > 1 &&
    matches[1].score >= Math.max(1, bestMatch.score - 2);
  const exact =
    !ambiguous &&
    !broadPrompt &&
    (bestMatch.keywordPhraseMatch ||
      (bestMatch.score >= 8 &&
        bestMatch.matchedTerms.length / queryTerms.length >= 0.5));
  const outcome: RoriWikiRetrievalOutcome = exact ? "exact" : "partial";

  return {
    outcome,
    pages: matches.map((match) => match.page),
    matches: matches.map(({ keywordPhraseMatch: _keywordPhraseMatch, ...match }) => match),
    queryTerms,
    bestScore: bestMatch.score,
    confidence: bestMatch.confidence,
    ambiguous,
  };
}

export function findRoriWikiPages(
  content: string,
  pages: RoriWikiPage[] = FALLBACK_RORI_WIKI_PAGES,
) {
  return findRoriWikiSearchResult(content, pages).pages;
}
