import { describe, expect, it } from "vitest";
import {
  findRoriWikiPages,
  findRoriWikiSearchResult,
  type RoriWikiPage,
} from "../../src/modules/chat/rori-wiki";

const testPages: RoriWikiPage[] = [
  {
    slug: "academy-overview",
    title: "PBG Academy Overview",
    summary: "General Academy help, support, and orientation.",
    body: "PBG Academy helps Cadets find the right information, room, or tool.",
    keywords: ["academy", "help", "support", "overview"],
    sourceUrl: "sgt-bots://wiki/rori/academy-overview",
    status: "published",
  },
  {
    slug: "enrollment",
    title: "Academy Enrollment",
    summary: "Enrollment, pricing, joining, and membership level questions.",
    body: "Cadets can ask about Free, Basic, Pro, Ultra, and Specialist levels.",
    keywords: ["enroll", "enrollment", "join", "pricing", "levels"],
    sourceUrl: "sgt-bots://wiki/rori/enrollment",
    status: "published",
  },
  {
    slug: "telegram-support",
    title: "Telegram Support Rooms",
    summary: "Telegram room routing, access trouble, and support questions.",
    body: "Lobby DM to staff is the best match for payment trouble and account access.",
    keywords: ["telegram", "rooms", "support", "billing", "payment"],
    sourceUrl: "sgt-bots://wiki/rori/telegram-support",
    status: "published",
  },
  {
    slug: "tool-guide",
    title: "Playground Tool Guide",
    summary: "Explains what each Playground tool does.",
    body: "Cursive, Top Secret, Rori, ShAzZaM, and Insight each have different jobs.",
    keywords: ["tool", "tools", "bots", "playground"],
    sourceUrl: "sgt-bots://wiki/rori/tool-guide",
    status: "published",
  },
];

describe("Rori wiki retrieval", () => {
  it("returns an exact outcome for a direct enrollment prompt", () => {
    const result = findRoriWikiSearchResult("How do I join the Academy?", testPages);

    expect(result.outcome).toBe("exact");
    expect(result.bestScore).toBeGreaterThan(0);
    expect(result.matches[0]).toEqual(
      expect.objectContaining({
        sourceId: "sgt-bots://wiki/rori/enrollment",
      }),
    );
    expect(result.pages[0]?.slug).toBe("enrollment");
  });

  it("keeps vague broad prompts as partial instead of exact", () => {
    const result = findRoriWikiSearchResult("Can you help?", testPages);

    expect(result.outcome).toBe("partial");
    expect(result.confidence).toBeLessThan(0.7);
  });

  it("returns a partial outcome for relevant but thin prompts", () => {
    const result = findRoriWikiSearchResult("Specialist", testPages);

    expect(result.outcome).toBe("partial");
    expect(result.pages[0]?.slug).toBe("enrollment");
    expect(result.matches[0]?.matchedTerms).toEqual(["specialist"]);
  });

  it("returns no_match for unrelated prompts", () => {
    const result = findRoriWikiSearchResult("Explain photosynthesis and chlorophyll", testPages);

    expect(result.outcome).toBe("no_match");
    expect(result.pages).toEqual([]);
    expect(result.matches).toEqual([]);
  });

  it("marks similarly scored strong matches as ambiguous", () => {
    const result = findRoriWikiSearchResult("access support", [
      {
        slug: "account-access",
        title: "Account Access Support",
        summary: "Help with account access and support.",
        body: "Account access questions go to staff.",
        keywords: ["access", "support"],
        sourceUrl: "sgt-bots://wiki/rori/account-access",
        status: "published",
      },
      {
        slug: "telegram-access",
        title: "Telegram Access Support",
        summary: "Help with Telegram access and support.",
        body: "Telegram access questions go to the support room.",
        keywords: ["access", "support"],
        sourceUrl: "sgt-bots://wiki/rori/telegram-access",
        status: "published",
      },
    ]);

    expect(result.outcome).toBe("partial");
    expect(result.ambiguous).toBe(true);
    expect(result.matches.map((match) => match.page.slug)).toEqual(
      expect.arrayContaining(["account-access", "telegram-access"]),
    );
  });

  it("preserves the old page-only helper as a compatibility adapter", () => {
    const pages = findRoriWikiPages("How do I join the Academy?", testPages);

    expect(pages[0]?.slug).toBe("enrollment");
  });
});
