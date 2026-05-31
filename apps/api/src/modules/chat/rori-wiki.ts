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

function tokenize(value: string) {
  return value.toLowerCase().match(/[a-z0-9]+/gu) ?? [];
}

export function findRoriWikiPages(
  content: string,
  pages: RoriWikiPage[] = FALLBACK_RORI_WIKI_PAGES,
) {
  const terms = new Set(tokenize(content));

  return pages
    .filter((page) => page.status === "published")
    .map((page) => {
      const haystack = [
        page.slug,
        page.title,
        page.summary,
        page.body,
        ...page.keywords,
      ]
        .join(" ")
        .toLowerCase();
      const score = [...terms].reduce(
        (total, term) => total + (haystack.includes(term) ? 1 : 0),
        0,
      );

      return { page, score };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.page.title.localeCompare(right.page.title),
    )
    .map(({ page }) => page);
}
