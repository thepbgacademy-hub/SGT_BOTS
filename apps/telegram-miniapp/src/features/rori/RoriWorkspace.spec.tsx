import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { BotCatalogEntry } from "../../../../../packages/shared/src/bots/manifests";
import { RoriWorkspace } from "./RoriWorkspace";

const RORI_BOT = {
  id: "concierge_general_academy_KB",
  name: "Rori",
  description: "Routes knowledge-base questions across the academy domain.",
  capabilities: {
    chat: true,
    citations: true,
    html_report: false,
    pdf_upload: false,
    rag_query: true,
    structured_form: false,
  },
} as unknown as BotCatalogEntry;

describe("RoriWorkspace", () => {
  it("renders the dedicated Rori chat workspace with academy prompts", () => {
    const markup = renderToStaticMarkup(
      createElement(RoriWorkspace, {
        bot: RORI_BOT,
        conversationId: undefined,
        messages: [],
        onBackToMenu: () => undefined,
        onConversationUpdate: () => undefined,
        sessionId: "session-1",
        sessionToken: "token-1",
      }),
    );

    expect(markup).toContain("<h2>Rori</h2>");
    expect(markup).toContain("Academy concierge");
    expect(markup).not.toContain("Active Assistant");
    expect(markup).toContain("Ask about the Academy, workshops, enrollment, or Telegram rooms.");
    expect(markup).toContain("Tool routing");
    expect(markup).toContain("Pick a prompt or type your question below.");
    expect(markup).toContain("Ask Rori about the Academy...");
    expect(markup).toContain("How do I enroll?");
    expect(markup).toContain("What workshops are coming up?");
    expect(markup).toContain("Which PBG Telegram rooms should I join?");
    expect(markup).toContain("Which tool should I use for...?");
  });

  it("does not render upload, report, artifact, or support sections", () => {
    const markup = renderToStaticMarkup(
      createElement(RoriWorkspace, {
        bot: RORI_BOT,
        conversationId: undefined,
        messages: [],
        onBackToMenu: () => undefined,
        onConversationUpdate: () => undefined,
        sessionId: "session-1",
        sessionToken: "token-1",
      }),
    );

    expect(markup).not.toContain("Upload PDF");
    expect(markup).not.toContain("Generate report");
    expect(markup).not.toContain("Report");
    expect(markup).not.toContain("artifact");
    expect(markup).not.toContain("Support");
  });

  it("renders a rounded Back button for returning to the menu", () => {
    const markup = renderToStaticMarkup(
      createElement(RoriWorkspace, {
        bot: RORI_BOT,
        conversationId: undefined,
        messages: [],
        onBackToMenu: () => undefined,
        onConversationUpdate: () => undefined,
        sessionId: "session-1",
        sessionToken: "token-1",
      }),
    );

    expect(markup).toContain("rori-back-button");
    expect(markup).toContain(">Back</button>");
  });

  it("passes grounded assistant citations through the Rori chat wrapper", () => {
    const markup = renderToStaticMarkup(
      createElement(RoriWorkspace, {
        bot: RORI_BOT,
        conversationId: "conversation-1",
        messages: [
          {
            id: "message-1",
            role: "assistant",
            content: "Rori can help with PBG Academy enrollment.",
            createdAt: "2026-05-25T00:00:00.000Z",
            citations: [
              {
                sourceId: "knowledge_base",
                title: "Rori Academy Concierge Source Pack",
                url: "sgt-bots://docs/rori-academy-concierge-source-pack#academy",
              },
            ],
          },
        ],
        onBackToMenu: () => undefined,
        onConversationUpdate: () => undefined,
        sessionId: "session-1",
        sessionToken: "token-1",
      }),
    );

    expect(markup).toContain("Rori Academy Concierge Source Pack");
    expect(markup).toContain("Knowledge Base");
  });
});
