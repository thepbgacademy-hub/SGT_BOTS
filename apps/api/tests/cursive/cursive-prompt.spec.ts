import { describe, expect, it, vi } from "vitest";
import { createChatService } from "../../src/modules/chat/chat.service";
import {
  buildCursivePromptPackage,
  composeCreditBureauDisputeDraftContent,
} from "../../src/modules/cursive/cursive-prompt.service";
import { createCursiveRepo } from "../../src/modules/cursive/cursive.repo";
import { createCursiveService } from "../../src/modules/cursive/cursive.service";
import type { BotManifest } from "../../../../packages/shared/src/bots/manifests";

const cursiveRepo = createCursiveRepo();
const creditBureauConfig = cursiveRepo.getCategoryConfig(
  "credit_bureau_dispute",
);

if (!creditBureauConfig) {
  throw new Error("missing credit bureau cursive config");
}

describe("buildCursivePromptPackage", () => {
  it("builds a helper-only prompt package for credit bureau disputes", () => {
    const promptPackage = buildCursivePromptPackage({
      config: creditBureauConfig,
      intake: {
        consumer_name: "Jane Doe",
        bureau_choice: "Experian",
        account_reference: "Account ending 1234",
        dispute_reason: "This account does not belong to me.",
      },
    });

    expect(promptPackage.categorySlug).toBe("credit_bureau_dispute");
    expect(promptPackage.helperMode).toBe("helper-only");
    expect(promptPackage.promptVersion).toBe("v1");
    expect(promptPackage.systemPrompt).toContain(
      "controlled Cursive intake",
    );
    expect(promptPackage.draftInstructions).toEqual([
      "Use only the official intake supplied to the route.",
      "Do not invent facts.",
      "Demand removal and proof of deletion.",
    ]);
    expect(promptPackage.promptText).toContain("Credit Bureau Dispute");
    expect(promptPackage.promptText).toContain("Jane Doe");
    expect(promptPackage.promptText).toContain("15 U.S.C. Sec. 1681i");
    expect(promptPackage.promptText).toContain("15 U.S.C. Sec. 1681e(b)");
    expect(promptPackage.promptText).toContain("Experian");
    expect(promptPackage.promptText).toContain("Allen, TX 75013");
  });

  it("composes the first dispute-letter draft content from the prompt package instead of raw route values", () => {
    const promptPackage = buildCursivePromptPackage({
      config: creditBureauConfig,
      intake: {
        consumer_name: "Jane Doe",
        consumer_address: "123 Main Street\nDallas, TX 75001",
        bureau_choice: "Experian",
        account_reference: "Acct ending 4432",
        dispute_reason:
          "The late payment history is inaccurate because the account was paid on time.",
      },
    });

    const draftContent = composeCreditBureauDisputeDraftContent({
      promptPackage,
    });

    expect(draftContent.subjectLine).toBe(
      "Re: FCRA Dispute and Reinvestigation Request for Acct ending 4432",
    );
    expect(draftContent.bodyParagraphs).toEqual([
      "I am writing pursuant to my rights under the Fair Credit Reporting Act<sup>1</sup> and its implementing regulations<sup>2</sup> to dispute inaccurate information appearing on my consumer report.",
      "I dispute the reporting of Acct ending 4432 on my Experian consumer report. The late payment history is inaccurate because the account was paid on time.",
      "Under FCRA section 611, you must conduct a reasonable reinvestigation of this dispute and delete or correct any information that is incomplete, inaccurate, or cannot be verified.<sup>3</sup>",
      "Please send me written confirmation of the results of your investigation and an updated consumer report once the reinvestigation is complete.",
    ]);
  });

  it("uses repo-backed intake labels and field ordering as the prompt source of truth", () => {
    const promptPackage = buildCursivePromptPackage({
      config: {
        ...creditBureauConfig,
        intakeSchema: {
          ...creditBureauConfig.intakeSchema,
          intakeSchema: {
            fields: [
              {
                key: "bureau_choice",
                label: "Target bureau",
                required: true,
              },
              {
                key: "consumer_name",
                label: "Letter signer",
                required: true,
              },
              {
                key: "dispute_reason",
                label: "Why this is inaccurate",
                required: true,
              },
            ],
          },
        },
      },
      intake: {
        consumer_name: "Jane Doe",
        bureau_choice: "Experian",
        dispute_reason: "This account does not belong to me.",
        account_reference: "Account ending 1234",
      },
    });

    expect(promptPackage.promptText).toContain(
      "Intake:\nTarget bureau: Experian\nLetter signer: Jane Doe\nWhy this is inaccurate: This account does not belong to me.",
    );
    expect(promptPackage.promptText).not.toContain("Bureau Choice:");
    expect(promptPackage.promptText).not.toContain("Consumer Name:");
    expect(promptPackage.promptText).not.toContain("Account Reference:");
  });

  it("returns a stable snapshot of intake, citations, and addresses", () => {
    const intake = {
      consumer_name: "Jane Doe",
      dispute_reason: "This account does not belong to me.",
    };

    const promptPackage = buildCursivePromptPackage({
      config: creditBureauConfig,
      intake,
    });

    intake.consumer_name = "Mutated Name";

    expect(promptPackage.intake).toEqual({
      consumer_name: "Jane Doe",
      dispute_reason: "This account does not belong to me.",
    });
    expect(Object.isFrozen(promptPackage)).toBe(true);
    expect(Object.isFrozen(promptPackage.citations)).toBe(true);
    expect(Object.isFrozen(promptPackage.addresses)).toBe(true);
    expect(promptPackage.citations).toEqual([
      {
        citationKey: "fcra_general",
        citationText: "15 U.S.C. Secs. 1681 et seq. (FCRA)",
      },
      {
        citationKey: "fcra_1681eb",
        citationText: "15 U.S.C. Sec. 1681e(b)",
      },
      { citationKey: "fcra_611", citationText: "15 U.S.C. Sec. 1681i" },
    ]);
    expect(promptPackage.addresses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          organizationName: "Experian",
          city: "Allen",
        }),
      ]),
    );
    expect(() =>
      promptPackage.citations.push({
        citationKey: "fcra_999",
        citationText: "blocked",
      }),
    ).toThrow();
  });

  it("trims whitespace-padded string intake in both the package and prompt text", () => {
    const promptPackage = buildCursivePromptPackage({
      config: creditBureauConfig,
      intake: "  Need help removing an account that is not mine.  \n\n",
    });

    expect(promptPackage.intake).toBe(
      "Need help removing an account that is not mine.",
    );
    expect(promptPackage.promptText).toContain(
      "Intake:\nNeed help removing an account that is not mine.",
    );
  });

  it("trims whitespace-padded object intake and drops blank fields in both snapshots", () => {
    const promptPackage = buildCursivePromptPackage({
      config: creditBureauConfig,
      intake: {
        consumer_name: "  Jane Doe  ",
        dispute_reason: "  This account does not belong to me.  ",
        account_reference: "   ",
      },
    });

    expect(promptPackage.intake).toEqual({
      consumer_name: "Jane Doe",
      dispute_reason: "This account does not belong to me.",
    });
    expect(promptPackage.promptText).toContain("Consumer name: Jane Doe");
    expect(promptPackage.promptText).toContain(
      "Dispute reason: This account does not belong to me.",
    );
    expect(promptPackage.promptText).not.toContain("Account Reference:");
  });

  it("does not let repo-unknown intake keys leak back into prompt text", () => {
    const promptPackage = buildCursivePromptPackage({
      config: creditBureauConfig,
      intake: {
        consumer_name: "Jane Doe",
        dispute_reason: "This account does not belong to me.",
        internal_case_note: "This should stay out of the prompt text.",
      },
    });

    expect(promptPackage.intake).toEqual({
      consumer_name: "Jane Doe",
      dispute_reason: "This account does not belong to me.",
      internal_case_note: "This should stay out of the prompt text.",
    });
    expect(promptPackage.promptText).not.toContain("internal_case_note");
    expect(promptPackage.promptText).not.toContain(
      "Internal Case Note: This should stay out of the prompt text.",
    );
  });

  it("derives category metadata from the repo config without hardcoded slug assumptions", () => {
    const promptPackage = buildCursivePromptPackage({
      config: {
        ...creditBureauConfig,
        category: {
          ...creditBureauConfig.category,
          slug: "custom_credit_dispute",
          displayName: "Custom Credit Dispute",
        },
        promptProfile: {
          ...creditBureauConfig.promptProfile,
          promptVersion: "v-next",
        },
      } as typeof creditBureauConfig,
      intake: "Need help",
    });

    expect(promptPackage.categorySlug).toBe("custom_credit_dispute");
    expect(promptPackage.categoryDisplayName).toBe("Custom Credit Dispute");
    expect(promptPackage.promptVersion).toBe("v-next");
    expect(promptPackage.promptText).toContain("Category: Custom Credit Dispute");
  });
});

describe("createChatService", () => {
  it("keeps unrelated helper prompts bounded to the active credit dispute lane", () => {
    const cursiveService = createCursiveService();

    const reply = cursiveService.buildCreditBureauDisputeHelperReply(
      "Draft a launch brief for tomorrow.",
    );

    expect(reply).toContain(
      "Cursive currently supports Credit Bureau Dispute letters",
    );
    expect(reply).toContain(
      "does not look like a credit-bureau dispute request yet",
    );
    expect(reply).toContain("tap Start official letter");
    expect(reply).not.toContain(
      'I can help with a Credit Bureau Dispute in helper-only mode for "Draft a launch brief for tomorrow."',
    );
  });

  it("does not treat generic account wording as enough to enter the dispute drafting path", () => {
    const cursiveService = createCursiveService();

    const reply = cursiveService.buildCreditBureauDisputeHelperReply(
      "Help me reconcile my account balance.",
    );

    expect(reply).toContain(
      "does not look like a credit-bureau dispute request yet",
    );
    expect(reply).not.toContain(
      "I can help shape this Credit Bureau Dispute request",
    );
  });

  it("answers greetings conversationally instead of pushing intake immediately", () => {
    const cursiveService = createCursiveService();

    const reply = cursiveService.buildCreditBureauDisputeHelperReply("hello");

    expect(reply).toContain("Hi. I'm Cursive");
    expect(reply).toContain("Ask me what to gather");
    expect(reply).toContain("tap Start official letter");
    expect(reply).not.toContain("send Consumer name");
  });

  it("answers general process questions without jumping straight into form capture", () => {
    const cursiveService = createCursiveService();

    const reply = cursiveService.buildCreditBureauDisputeHelperReply(
      "What can you help me with here?",
    );

    expect(reply).toContain("I can help answer questions");
    expect(reply).toContain("tap Start official letter");
    expect(reply).not.toContain("send Consumer name");
  });

  it("does not leave behind a new document_wizard conversation when reply generation fails", () => {
    const buildRuntimeReply: (
      manifest: BotManifest,
      trimmedContent: string,
    ) => { output: string } = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("bot capability missing: structured_form");
      })
      .mockReturnValue({
        output: "Upload a PDF or paste your notes",
      });
    const chatService = createChatService({
      now: () => 1_700_000_000_000,
      buildRuntimeReply,
    });

    expect(() =>
      chatService.sendMessage({
        sessionId: "session-1",
        userId: "user-1",
        botId: "document_wizard",
        message: "Draft a dispute letter",
      }),
    ).toThrow("bot capability missing: structured_form");

    expect(() =>
      chatService.sendMessage({
        sessionId: "session-1",
        userId: "user-1",
        conversationId: "conversation-1",
        botId: "document_wizard",
        message: "Reuse the failed conversation",
      }),
    ).toThrow("conversation not found");

    const response = chatService.sendMessage({
      sessionId: "session-1",
      userId: "user-1",
      botId: "document_wizard",
      message: "Draft a dispute letter",
    });

    expect(response.conversation.id).toBe("conversation-1");
    expect(response.output).toContain("Upload a PDF or paste your notes");
    expect(buildRuntimeReply).toHaveBeenCalledTimes(2);
  });

  it("uses the injected cursive repo seam for document_wizard helper replies", () => {
    const customConfig = {
      ...creditBureauConfig,
      category: {
        ...creditBureauConfig.category,
        displayName: "Custom Credit Bureau Dispute",
      },
      citations: [
        {
          citationKey: "custom_law",
          citationText: "Custom Citation 99",
          sortOrder: 10,
        },
      ],
      addresses: [
        {
          addressKey: "custom_bureau",
          organizationName: "Custom Bureau",
          attentionLine: "Dispute Desk",
          addressLine1: "1 Custom Plaza",
          addressLine2: "",
          city: "Austin",
          state: "TX",
          postalCode: "78701",
          country: "US",
          sortOrder: 10,
        },
      ],
    };

    const chatService = createChatService({
      cursiveRepo: {
        getCategoryConfig() {
          return customConfig;
        },
        listCategories() {
          return [creditBureauConfig.category];
        },
        getDefaultCategoryConfig() {
          return customConfig;
        },
      },
    });

    expect(() =>
      chatService.sendMessage({
        sessionId: "session-1",
        userId: "user-1",
        botId: "document_wizard",
        message: "Draft a dispute letter",
      }),
    ).toThrow("cursive workflow only");
  });

  it("keeps unrelated document_wizard requests inside the current supported letter lane", () => {
    const chatService = createChatService();

    expect(() =>
      chatService.sendMessage({
        sessionId: "session-1",
        userId: "user-1",
        botId: "document_wizard",
        message: "Draft a launch brief for tomorrow.",
      }),
    ).toThrow("cursive workflow only");
  });
});
