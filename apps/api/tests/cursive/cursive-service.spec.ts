import { describe, expect, it } from "vitest";
import { createChatService } from "../../src/modules/chat/chat.service";

describe("createChatService document_wizard workflow gating", () => {
  it("throws cursive workflow only for document_wizard chat sends", async () => {
    const chatService = createChatService();

    await expect(
      chatService.sendMessage({
        sessionId: "session-1",
        userId: "user-1",
        botId: "document_wizard",
        message: "Help me dispute this report",
      }),
    ).rejects.toThrow("cursive workflow only");
  });

  it("does not advance message or conversation ids when document_wizard send fails", async () => {
    const chatService = createChatService();

    await expect(
      chatService.sendMessage({
        sessionId: "session-1",
        userId: "user-1",
        botId: "document_wizard",
        message: "Help me dispute this report",
      }),
    ).rejects.toThrow("cursive workflow only");

    const tutorReply = await chatService.sendMessage({
      sessionId: "session-1",
      userId: "user-1",
      botId: "tutor",
      message: "Walk me through this concept",
    });

    expect(tutorReply.conversation.id).toBe("conversation-1");
    expect(tutorReply.userMessage.id).toBe("message-1");
    expect(tutorReply.assistantMessage.id).toBe("message-2");
  });

  it("does not load persona config before rejecting document_wizard chat", async () => {
    const chatService = createChatService({
      botPromptConfigRepo: {
        async getActiveConfig() {
          throw new Error("persona config should not load for Cursive");
        },
        async getActiveConfigResult() {
          throw new Error("persona config should not load for Cursive");
        },
      },
    });

    await expect(
      chatService.sendMessage({
        sessionId: "session-1",
        userId: "user-1",
        botId: "document_wizard",
        message: "Draft a bureau dispute letter.",
      }),
    ).rejects.toThrow("cursive workflow only");
  });
});
