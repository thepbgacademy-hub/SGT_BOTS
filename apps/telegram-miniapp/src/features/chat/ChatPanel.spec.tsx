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

  it("renders assistant citation titles and source labels", () => {
    const markup = renderToStaticMarkup(
      createElement(ChatPanel, {
        bot: GENERIC_BOT,
        conversationId: "conversation-1",
        messages: [
          {
            id: "message-1",
            role: "assistant",
            content: "Grounded reply.",
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
        onArtifactQueued: () => undefined,
        onConversationUpdate: () => undefined,
        sessionId: "session-1",
        sessionToken: "token-1",
      }),
    );

    expect(markup).toContain("Rori Academy Concierge Source Pack");
    expect(markup).toContain("Knowledge Base");
  });

  it("can hide citations and keep only the latest exchange for concierge chat", () => {
    const markup = renderToStaticMarkup(
      createElement(ChatPanel, {
        bot: GENERIC_BOT,
        conversationId: "conversation-1",
        hideCitations: true,
        latestExchangeOnly: true,
        messages: [
          {
            id: "message-1",
            role: "user",
            content: "Old question",
            createdAt: "2026-05-25T00:00:00.000Z",
          },
          {
            id: "message-2",
            role: "assistant",
            content: "Old answer.",
            createdAt: "2026-05-25T00:00:01.000Z",
          },
          {
            id: "message-3",
            role: "user",
            content: "Latest question",
            createdAt: "2026-05-25T00:00:02.000Z",
          },
          {
            id: "message-4",
            role: "assistant",
            content: "Latest grounded reply.",
            createdAt: "2026-05-25T00:00:03.000Z",
            citations: [
              {
                sourceId: "knowledge_base",
                title: "Academy Enrollment",
                url: "sgt-bots://docs/rori-academy-concierge-source-pack#academy",
              },
            ],
          },
        ],
        onArtifactQueued: () => undefined,
        onConversationUpdate: () => undefined,
        sessionId: "session-1",
        sessionToken: "token-1",
      }),
    );

    expect(markup).toContain("Latest question");
    expect(markup).toContain("Latest grounded reply.");
    expect(markup).not.toContain("Old question");
    expect(markup).not.toContain("Old answer.");
    expect(markup).not.toContain("Academy Enrollment");
    expect(markup).not.toContain("Knowledge Base");
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
