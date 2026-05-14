import { describe, expect, it } from "vitest";
import { createBotService, isStructuredBot } from "../../src/modules/bots/bot.service";
import { createCursiveRepo } from "../../src/modules/cursive/cursive.repo";
import {
  createCursiveService,
  isHelperOnlyBot,
} from "../../src/modules/cursive/cursive.service";

describe("Cursive helper mode", () => {
  it("treats document_wizard as helper-only intake chat", () => {
    expect(isHelperOnlyBot("document_wizard")).toBe(true);
  });
});

describe("Structured bot classification", () => {
  it("treats document_wizard as structured", () => {
    expect(isStructuredBot("document_wizard")).toBe(true);
  });

  it("treats tutor as not structured", () => {
    expect(isStructuredBot("tutor")).toBe(false);
  });

  it("treats form_wizard as structured", () => {
    expect(isStructuredBot("form_wizard")).toBe(true);
  });

  it("surfaces structured capability through bot.service catalog entries", async () => {
    const service = createBotService({
      registryRepo: {
        async listVisibleBots() {
          return [
            {
              botId: "form_wizard",
              displayName: "ShAzZaM!",
              tagline: "Collects structured inputs and builds final outputs from forms.",
              menuPosition: "bottom-left",
              runtimeStatus: "active" as const,
              visible: true,
            },
          ];
        },
      },
    });

    await expect(service.listCatalog()).resolves.toEqual([
      expect.objectContaining({
        id: "form_wizard",
        capabilities: expect.objectContaining({
          structured_form: true,
        }),
      }),
    ]);
    expect(isStructuredBot("form_wizard")).toBe(true);
  });
});

describe("Cursive draft payload composition", () => {
  it("builds a repo-backed draft package before rendering the first credit bureau dispute letter", () => {
    const service = createCursiveService();

    const draft = service.buildCreditBureauDisputeDraft({
      consumer_name: "  Jane Doe  ",
      consumer_address: "123 Main Street\nDallas, TX 75001",
      bureau_choice: "  TransUnion  ",
      account_reference: "  Account ending 1234  ",
      dispute_reason: "  This late payment was reported inaccurately.  ",
    });

    expect(draft.categorySlug).toBe("credit_bureau_dispute");
    expect(draft.promptPackage.categorySlug).toBe("credit_bureau_dispute");
    expect(draft.promptPackage.promptVersion).toBe("v1");
    expect(draft.promptPackage.intake).toEqual({
      consumer_name: "Jane Doe",
      consumer_address: "123 Main Street\nDallas, TX 75001",
      bureau_choice: "TransUnion",
      account_reference: "Account ending 1234",
      dispute_reason: "This late payment was reported inaccurately.",
    });
    expect(draft.promptPackage.promptText).toContain(
      "Credit bureau: TransUnion",
    );
    expect(draft.promptPackage.promptText).toContain(
      "Dispute reason: This late payment was reported inaccurately.",
    );
    expect(draft.promptPackage.promptText).toContain(
      "15 U.S.C. Sec. 1681i",
    );
    expect(draft.templateInput.consumerName).toBe("Jane Doe");
    expect(draft.templateInput.bureauName).toBe("TransUnion");
    expect(draft.templateInput.enclosures).toEqual([
      "Photocopy of government-issued identification",
      "Photocopy of Social Security card",
    ]);
  });

  it("builds the first credit bureau dispute template input from official intake and the matching bureau address", () => {
    const service = createCursiveService();

    const payload = service.buildCreditBureauDisputeTemplateInput({
      consumer_name: "Jane Doe",
      consumer_address: "123 Main Street\nDallas, TX 75001",
      bureau_choice: "TransUnion",
      account_reference: "Account ending 1234",
      dispute_reason: "This late payment was reported inaccurately.",
    });

    expect(payload).toEqual({
      consumerName: "Jane Doe",
      consumerAddressLines: ["123 Main Street", "Dallas, TX 75001"],
      bureauName: "TransUnion",
      bureauAddressLines: [
        "Consumer Solutions",
        "P.O. Box 2000",
        "Chester, PA 19016-2000",
      ],
      subjectLine: "Re: FCRA Dispute and Reinvestigation Request for Account ending 1234",
      salutation: "To Whom It May Concern:",
      bodyParagraphs: [
        "I am writing pursuant to my rights under the Fair Credit Reporting Act<sup>1</sup> and its implementing regulations<sup>2</sup> to dispute inaccurate information appearing on my consumer report.",
        "I dispute the reporting of Account ending 1234 on my TransUnion consumer report. This late payment was reported inaccurately.",
        "Under FCRA section 611, you must conduct a reasonable reinvestigation of this dispute and delete or correct any information that is incomplete, inaccurate, or cannot be verified.<sup>3</sup>",
        "Please send me written confirmation of the results of your investigation and an updated consumer report once the reinvestigation is complete.",
      ],
      closing: "Sincerely,",
      enclosures: [
        "Photocopy of government-issued identification",
        "Photocopy of Social Security card",
      ],
      citations: [
        "15 U.S.C. Secs. 1681 et seq. (FCRA)",
        "12 C.F.R. Sec. 1022.41-48 (Reg V)",
        "15 U.S.C. Sec. 1681i",
      ],
    });
  });

  it("keeps the legacy template-input helper aligned with the draft-composition seam", () => {
    const service = createCursiveService();
    const intake = {
      consumer_name: "Jane Doe",
      consumer_address: "123 Main Street\nDallas, TX 75001",
      bureau_choice: "TransUnion",
      account_reference: "Account ending 1234",
      dispute_reason: "This late payment was reported inaccurately.",
    };

    expect(service.buildCreditBureauDisputeTemplateInput(intake)).toEqual(
      service.buildCreditBureauDisputeDraft(intake).templateInput,
    );
  });

  it("rejects unsupported bureau values instead of silently routing the letter to the wrong address", () => {
    const service = createCursiveService();

    expect(() =>
      service.buildCreditBureauDisputeDraft({
        consumer_name: "Jane Doe",
        consumer_address: "123 Main Street",
        bureau_choice: "Unknown Bureau",
        account_reference: "Account ending 1234",
        dispute_reason: "This account does not belong to me.",
      }),
    ).toThrow("invalid credit bureau");
  });

  it("removes raw angle-bracket markup from intake facts before composing the letter body", () => {
    const service = createCursiveService();

    const draft = service.buildCreditBureauDisputeDraft({
      consumer_name: "Jane <Doe>",
      consumer_address: "123 <Main> Street\nSuite <5>",
      bureau_choice: "Experian",
      account_reference: 'Account ending <1234>',
      dispute_reason:
        'This account does <script>alert(\"x\")</script> not belong to me.',
    });

    expect(draft.templateInput.consumerName).toBe("Jane Doe");
    expect(draft.templateInput.consumerAddressLines).toEqual([
      "123 Main Street",
      "Suite 5",
    ]);
    expect(draft.templateInput.bodyParagraphs[1]).toContain(
      "Account ending 1234",
    );
    expect(draft.templateInput.bodyParagraphs[1]).not.toContain("<1234>");
    expect(draft.templateInput.bodyParagraphs[1]).not.toContain("<script>");
    expect(draft.templateInput.bodyParagraphs[1]).toContain(
      'This account does scriptalert("x")/script not belong to me.',
    );
  });

  it("uses the explicit credit bureau dispute category config instead of whichever category is marked default", () => {
    const repo = createCursiveRepo();
    const defaultConfig = repo.getDefaultCategoryConfig();
    const explicitConfig = repo.getCategoryConfig("credit_bureau_dispute");

    if (!defaultConfig || !explicitConfig) {
      throw new Error("Expected seeded Cursive config for service test.");
    }

    const service = createCursiveService({
      cursiveRepo: {
        ...repo,
        getDefaultCategoryConfig() {
          return {
            ...defaultConfig,
            category: {
              ...defaultConfig.category,
              displayName: "Wrong Default Category",
            },
            templateDefaults: {
              ...defaultConfig.templateDefaults,
              templatePayload: {
                salutation: "Wrong default salutation",
                closing: "Wrong default closing",
              },
            },
          };
        },
        getCategoryConfig(categorySlug) {
          if (categorySlug !== "credit_bureau_dispute") {
            return null;
          }

          return {
            ...explicitConfig,
            addresses: [
              explicitConfig.addresses[2],
              explicitConfig.addresses[0],
              explicitConfig.addresses[1],
            ],
          };
        },
      },
    });

    const payload = service.buildCreditBureauDisputeTemplateInput({
      consumer_name: "Jane Doe",
      consumer_address: "123 Main Street",
      bureau_choice: "Trans Union",
      account_reference: "Account ending 1234",
      dispute_reason: "This account does not belong to me.",
    });

    expect(payload.salutation).toBe("To Whom It May Concern:");
    expect(payload.closing).toBe("Sincerely,");
    expect(payload.bureauName).toBe("TransUnion");
    expect(payload.bureauAddressLines).toEqual([
      "Consumer Solutions",
      "P.O. Box 2000",
      "Chester, PA 19016-2000",
    ]);
  });

  it("can generate the first dispute template through the provider-backed draft seam", async () => {
    const service = createCursiveService({
      cursiveDraftService: {
        async generateCreditBureauDisputeDraft() {
          return {
            subjectLine:
              "Re: FCRA Dispute and Reinvestigation Request for Account ending 1234",
            bodyParagraphs: [
              "I am writing pursuant to my rights under the Fair Credit Reporting Act<sup>1</sup> and its implementing regulations<sup>2</sup> to dispute inaccurate information appearing on my consumer report.",
              "I dispute the reporting of Account ending 1234 on my Experian consumer report. The reported late payment history is inaccurate because the account was paid on time.",
              "Under FCRA section 611, you must conduct a reasonable reinvestigation of this dispute and delete or correct any information that is incomplete, inaccurate, or cannot be verified.<sup>3</sup>",
              "Please send me written confirmation of the results of your investigation and an updated consumer report once the reinvestigation is complete.",
            ],
          };
        },
      } as never,
    });

    const draft = await service.generateCreditBureauDisputeDraft({
      intake: {
        consumer_name: "Jane Doe",
        consumer_address: "123 Main Street\nDallas, TX 75001",
        bureau_choice: "Experian",
        account_reference: "Account ending 1234",
        dispute_reason:
          "The late payment history is inaccurate because the account was paid on time.",
      },
      sessionSecret: {
        apiKey: "sk-test",
        provider: "openai",
        sessionId: "session-1",
        userId: "user-1",
      },
    });

    expect(draft.templateInput.bodyParagraphs[1]).toBe(
      "I dispute the reporting of Account ending 1234 on my Experian consumer report. The reported late payment history is inaccurate because the account was paid on time.",
    );
    expect(draft.templateInput.bureauName).toBe("Experian");
  });
});
