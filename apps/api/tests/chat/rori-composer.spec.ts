import { describe, expect, it, vi } from "vitest";
import type { BotPromptConfig } from "../../src/modules/bots/bot-prompt-config.repo";
import {
  buildRoriComposerInput,
  composeRoriReply,
  validateRoriComposerOutput,
} from "../../src/modules/chat/rori-composer";
import type { RoriResponseDecision } from "../../src/modules/chat/rori-decision";
import type { RoriWikiPage, RoriWikiSearchResult } from "../../src/modules/chat/rori-wiki";

const promptConfig: BotPromptConfig = {
  active: true,
  botId: "concierge_general_academy_KB",
  escalationPolicy: "Route account-specific help to staff.",
  fallbackPolicy: "Ask a focused follow-up when the source does not answer.",
  guardrails: ["Use only approved Academy sources."],
  offTopicPolicy: "Stay inside the Academy and Playground scope.",
  personaPrompt: "Be a warm scholarly guide.",
  surface: "playground",
  toneRules: ["Answer first.", "Use plain language."],
  version: "rori-v1",
};

const enrollmentPage: RoriWikiPage = {
  body: "Enrollment is open year-round. Basic is $9.99/month and Pro is $19.99/month.",
  keywords: ["enrollment", "pricing", "basic", "pro"],
  slug: "enrollment-and-pricing",
  sourceUrl: "sgt-bots://wiki/rori/enrollment-and-pricing",
  status: "published",
  summary: "Current enrollment and pricing facts.",
  title: "Enrollment and Pricing",
};

const decision: RoriResponseDecision = {
  intent: "answer",
  reason: "approved_match",
};

const wikiSearchResult: RoriWikiSearchResult = {
  ambiguous: false,
  bestScore: 12,
  confidence: 0.9,
  matches: [
    {
      confidence: 0.9,
      matchedTerms: ["enrollment", "pricing"],
      page: enrollmentPage,
      score: 12,
      sourceId: "sgt-bots://wiki/rori/enrollment-and-pricing",
    },
  ],
  outcome: "exact",
  pages: [enrollmentPage],
  queryTerms: ["enrollment", "pricing"],
};

describe("Rori grounded persona composer", () => {
  it("builds a strict composition input from persona config, sources, decision, and conversation context", () => {
    const input = buildRoriComposerInput({
      content: "How much are the levels?",
      conversationContext: {
        lastIntent: "enrollment",
        lastSourceIds: ["sgt-bots://wiki/rori/academy-overview"],
        lastUserMessage: "How do I enroll?",
      },
      decision,
      promptConfig,
      wikiSearchResult,
    });

    expect(input).toMatchObject({
      botId: "concierge_general_academy_KB",
      content: "How much are the levels?",
      decision: {
        intent: "answer",
        reason: "approved_match",
      },
      persona: {
        version: "rori-v1",
      },
      sourceIds: ["sgt-bots://wiki/rori/enrollment-and-pricing"],
      sources: [
        expect.objectContaining({
          id: "sgt-bots://wiki/rori/enrollment-and-pricing",
          snippet: expect.stringContaining("Basic is $9.99/month"),
          title: "Enrollment and Pricing",
        }),
      ],
    });
  });

  it("accepts structured provider output only when every cited source is approved", () => {
    expect(
      validateRoriComposerOutput(
        {
          output:
            "Here's the short version: Basic is $9.99/month and Pro is $19.99/month.",
          sourceIds: ["sgt-bots://wiki/rori/enrollment-and-pricing"],
        },
        ["sgt-bots://wiki/rori/enrollment-and-pricing"],
      ),
    ).toEqual({
      output:
        "Here's the short version: Basic is $9.99/month and Pro is $19.99/month.",
      sourceIds: ["sgt-bots://wiki/rori/enrollment-and-pricing"],
    });

    expect(() =>
      validateRoriComposerOutput(
        {
          output: "I found a live discount link for you.",
          sourceIds: ["https://made-up.example/source"],
        },
        ["sgt-bots://wiki/rori/enrollment-and-pricing"],
      ),
    ).toThrow("unsupported rori source id");
  });

  it("falls back deterministically when provider output is malformed", async () => {
    const provider = vi.fn().mockResolvedValue({
      output: "",
      sourceIds: ["sgt-bots://wiki/rori/enrollment-and-pricing"],
    });
    const input = buildRoriComposerInput({
      content: "How much are the levels?",
      decision,
      promptConfig,
      wikiSearchResult,
    });

    const reply = await composeRoriReply(input, {
      fallbackOutput:
        "Enrollment is open year-round. Basic is $9.99/month and Pro is $19.99/month.",
      provider,
    });

    expect(provider).toHaveBeenCalledOnce();
    expect(reply.usedFallback).toBe(true);
    expect(reply.output).toContain("Basic is $9.99/month");
    expect(reply.sourceIds).toEqual([
      "sgt-bots://wiki/rori/enrollment-and-pricing",
    ]);
  });
});
