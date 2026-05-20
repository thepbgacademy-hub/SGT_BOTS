import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { BotCatalogEntry } from "../../../../../packages/shared/src/bots/manifests";
import { ChatPanel } from "./ChatPanel";

const GENERIC_BOT = {
  id: "knowledge_bot",
  name: "Knowledge Bot",
  description: "Answers lane-specific questions.",
  capabilities: {
    chat: true,
    citations: false,
    html_report: false,
    pdf_upload: false,
    rag_query: false,
    structured_form: false,
  },
} as unknown as BotCatalogEntry;

const REPORT_BOT = {
  id: "report_bot",
  name: "Report Bot",
  description: "Turns uploads into reports.",
  capabilities: {
    chat: true,
    citations: false,
    html_report: true,
    pdf_upload: true,
    rag_query: false,
    structured_form: true,
  },
} as unknown as BotCatalogEntry;

describe("ChatPanel", () => {
  it("renders the generic empty chat state from bot metadata", () => {
    const markup = renderToStaticMarkup(
      createElement(ChatPanel, {
        bot: GENERIC_BOT,
        conversationId: undefined,
        messages: [],
        onArtifactQueued: () => undefined,
        onConversationUpdate: () => undefined,
        sessionId: "session-1",
        sessionToken: "token-1",
      }),
    );

    expect(markup).toContain("Answers lane-specific questions.");
    expect(markup).toContain("Start the conversation here.");
  });

  it("shows the upload and report workflow only for supported non-Cursive bots", () => {
    const markup = renderToStaticMarkup(
      createElement(ChatPanel, {
        bot: REPORT_BOT,
        conversationId: undefined,
        messages: [],
        onArtifactQueued: () => undefined,
        onConversationUpdate: () => undefined,
        sessionId: "session-1",
        sessionToken: "token-1",
      }),
    );

    expect(markup).toContain("Upload PDF");
    expect(markup).toContain("Generate report");
  });
});
