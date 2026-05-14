import { describe, expect, it, vi } from "vitest";
import { buildCursivePromptPackage } from "../../src/modules/cursive/cursive-prompt.service";
import { createCursiveRepo } from "../../src/modules/cursive/cursive.repo";
import { createCursiveDraftService } from "../../src/modules/cursive/cursive-draft.service";

const cursiveRepo = createCursiveRepo();
const creditBureauConfig = cursiveRepo.getCategoryConfig(
  "credit_bureau_dispute",
);

if (!creditBureauConfig) {
  throw new Error("missing credit bureau cursive config");
}

describe("createCursiveDraftService", () => {
  it("uses the provider-backed draft output when the provider call succeeds", async () => {
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
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                subjectLine: "Re: Experian dispute for Acct ending 4432",
                disputeSummary:
                  "The reported late payment history is inaccurate because the account was paid on time and the file should reflect a current, paid-as-agreed status.",
              }),
            },
          },
        ],
      }),
    });
    const service = createCursiveDraftService({
      fetch: fetchMock as typeof fetch,
      mode: "live",
    });

    const draft = await service.generateCreditBureauDisputeDraft({
      promptPackage,
      sessionSecret: {
        apiKey: "sk-test",
        provider: "openai",
        sessionId: "session-1",
        userId: "user-1",
      },
    });

    expect(draft.subjectLine).toBe("Re: Experian dispute for Acct ending 4432");
    expect(draft.bodyParagraphs[1]).toBe(
      "I dispute the reporting of Acct ending 4432 on my Experian consumer report. The reported late payment history is inaccurate because the account was paid on time and the file should reflect a current, paid-as-agreed status.",
    );
    expect(draft.bodyParagraphs[0]).toContain(
      "Fair Credit Reporting Act<sup>1</sup>",
    );
    expect(draft.bodyParagraphs[0]).toContain(
      "implementing regulations<sup>2</sup>",
    );
    expect(draft.bodyParagraphs[2]).toContain("FCRA section 611");
    expect(draft.bodyParagraphs[2]).toContain("<sup>3</sup>");
    expect(draft.bodyParagraphs[3]).toContain(
      "Please send me written confirmation of the results",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses deterministic draft composition in stub mode", async () => {
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
    const service = createCursiveDraftService({
      fetch: vi.fn().mockRejectedValue(new Error("provider down")) as typeof fetch,
      mode: "stub",
    });

    const draft = await service.generateCreditBureauDisputeDraft({
      promptPackage,
      sessionSecret: {
        apiKey: "sk-test",
        provider: "openai",
        sessionId: "session-1",
        userId: "user-1",
      },
    });

    expect(draft.subjectLine).toBe(
      "Re: FCRA Dispute and Reinvestigation Request for Acct ending 4432",
    );
    expect(draft.bodyParagraphs[1]).toBe(
      "I dispute the reporting of Acct ending 4432 on my Experian consumer report. The late payment history is inaccurate because the account was paid on time.",
    );
    expect(draft.bodyParagraphs[0]).toContain(
      "implementing regulations<sup>2</sup>",
    );
  });

  it("surfaces live provider draft failures instead of pretending the provider-backed draft succeeded", async () => {
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
    const service = createCursiveDraftService({
      fetch: vi.fn().mockRejectedValue(new Error("provider down")) as typeof fetch,
      mode: "live",
    });

    await expect(
      service.generateCreditBureauDisputeDraft({
        promptPackage,
        sessionSecret: {
          apiKey: "sk-test",
          provider: "openai",
          sessionId: "session-1",
          userId: "user-1",
        },
      }),
    ).rejects.toThrow("provider down");
  });

  it("normalizes provider summaries that repeat the lead-in phrase instead of leaking the duplication into the final letter", async () => {
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
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                subjectLine: "Re: Experian dispute for Acct ending 4432",
                disputeSummary:
                  "The disputed reporting is inaccurate because the late payment history is inaccurate because the account was paid on time.",
              }),
            },
          },
        ],
      }),
    });
    const service = createCursiveDraftService({
      fetch: fetchMock as typeof fetch,
      mode: "live",
    });

    const draft = await service.generateCreditBureauDisputeDraft({
      promptPackage,
      sessionSecret: {
        apiKey: "sk-test",
        provider: "openai",
        sessionId: "session-1",
        userId: "user-1",
      },
    });

    expect(draft.bodyParagraphs[1]).toBe(
      "I dispute the reporting of Acct ending 4432 on my Experian consumer report. The late payment history is inaccurate because the account was paid on time.",
    );
  });

  it("supports the Anthropic provider branch with the same normalized draft shape", async () => {
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
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              subjectLine: "Re: Experian dispute for Acct ending 4432",
              disputeSummary:
                "The disputed reporting is inaccurate because the late payment history is inaccurate because the account was paid on time and should reflect a current status.",
            }),
          },
        ],
      }),
    });
    const service = createCursiveDraftService({
      fetch: fetchMock as typeof fetch,
      mode: "live",
    });

    const draft = await service.generateCreditBureauDisputeDraft({
      promptPackage,
      sessionSecret: {
        apiKey: "sk-test",
        provider: "anthropic",
        sessionId: "session-1",
        userId: "user-1",
      },
    });

    expect(draft.subjectLine).toBe("Re: Experian dispute for Acct ending 4432");
    expect(draft.bodyParagraphs[1]).toBe(
      "I dispute the reporting of Acct ending 4432 on my Experian consumer report. The late payment history is inaccurate because the account was paid on time and should reflect a current status.",
    );
  });
});
