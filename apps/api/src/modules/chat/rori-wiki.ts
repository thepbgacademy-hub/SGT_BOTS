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
      "PBG Academy is the home base for member learning, workshops, Telegram support, and the Playground tools. Ask Rori what you are trying to do, and Rori will point you toward the right next step.",
    keywords: ["academy", "pbg", "help", "support", "overview"],
    sourceUrl: "sgt-bots://wiki/rori/academy-overview",
    status: "published",
  },
  {
    slug: "enrollment",
    title: "Academy Enrollment",
    summary:
      "Enrollment questions should be answered from the Academy wiki and current operations links when configured.",
    body:
      "Rori can explain the PBG Academy enrollment path and help you find the right Telegram support room or workshop next step. The live enrollment link is not configured yet in this playground build, so Rori should not make one up.",
    keywords: ["enroll", "enrollment", "join", "sign up", "signup", "academy"],
    sourceUrl: "sgt-bots://wiki/rori/enrollment",
    status: "published",
  },
  {
    slug: "telegram-troubleshooting",
    title: "Telegram Troubleshooting",
    summary:
      "Telegram access questions should route to the Academy room directory when live room links are configured.",
    body:
      "If Telegram access is unclear, describe the room or issue you are trying to solve. Rori can point you to the best matching room purpose and will only show live invite links when Academy operations has configured them.",
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
