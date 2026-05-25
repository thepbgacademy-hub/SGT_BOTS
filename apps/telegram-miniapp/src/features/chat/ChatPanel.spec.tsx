import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { BotCatalogEntry } from "../../../../../packages/shared/src/bots/manifests";
import { ChatPanel, resolveChatSendError } from "./ChatPanel";

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

  it("renders custom empty copy, placeholder, and starter prompts", () => {
    const markup = renderToStaticMarkup(
      createElement(ChatPanel, {
        bot: GENERIC_BOT,
        conversationId: undefined,
        emptyCopy: "Ask about the Academy, workshops, enrollment, or Telegram rooms.",
        inputPlaceholder: "Ask Rori about the Academy...",
        messages: [],
        onArtifactQueued: () => undefined,
        onConversationUpdate: () => undefined,
        sessionId: "session-1",
        sessionToken: "token-1",
        starterPrompts: [
          "How do I enroll?",
          "What workshops are coming up?",
        ],
      }),
    );

    expect(markup).toContain(
      "Ask about the Academy, workshops, enrollment, or Telegram rooms.",
    );
    expect(markup).toContain("Ask Rori about the Academy...");
    expect(markup).toContain("How do I enroll?");
    expect(markup).toContain("What workshops are coming up?");
  });

  it("uses a custom send button label when provided", () => {
    const markup = renderToStaticMarkup(
      createElement(ChatPanel, {
        bot: GENERIC_BOT,
        conversationId: undefined,
        messages: [],
        onArtifactQueued: () => undefined,
        onConversationUpdate: () => undefined,
        primarySendButtonLabel: "Send",
        sessionId: "session-1",
        sessionToken: "token-1",
      }),
    );

    expect(markup).toContain(">Send</button>");
    expect(markup).not.toContain("Send message");
  });

  it("keeps the existing send button label by default", () => {
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

    expect(markup).toContain("Send message");
  });

  it("uses custom error copy for chat send failures", () => {
    expect(
      resolveChatSendError("Rori could not answer right now. Please try again."),
    ).toBe("Rori could not answer right now. Please try again.");
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
