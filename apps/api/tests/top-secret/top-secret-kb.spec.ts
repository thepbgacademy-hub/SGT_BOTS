import { describe, expect, it } from "vitest";
import {
  buildTopSecretCommonSenseStatement,
  buildTopSecretClaimComponents,
  buildTopSecretKnowledgeSignal,
  matchTopSecretKnowledgeEntries,
} from "../../src/modules/top-secret/top-secret-kb.service";

describe("Top Secret knowledge base", () => {
  it("matches recurring claim patterns to versioned curated entries", () => {
    expect(
      matchTopSecretKnowledgeEntries(
        "Federal Reserve notes are debt instruments, so you cannot pay a debt with a debt.",
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "debt_paid_with_debt",
          status: "approved",
          version: 1,
        }),
      ]),
    );
  });

  it("returns reusable research framing from matched entries", () => {
    const entries = matchTopSecretKnowledgeEntries(
      "Only Congress can create money, not the Federal Reserve, so Federal Reserve notes are not real money.",
    );

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          researchContextNote: expect.objectContaining({
            note: expect.stringContaining("coin money"),
            topic: "money_federal_reserve_notes",
          }),
        }),
      ]),
    );
  });

  it("uses the most specific common-sense statement before the default", () => {
    expect(
      buildTopSecretCommonSenseStatement(
        "A court case says you cannot pay a debt with a debt.",
      ),
    ).toContain("paycheck");
    expect(
      buildTopSecretCommonSenseStatement(
        "A court case says you cannot pay a debt with a debt.",
      ),
    ).not.toContain("Common sense:");
    expect(buildTopSecretCommonSenseStatement("A new claim with no known pattern.")).toContain(
      "Read the source",
    );
    expect(
      buildTopSecretCommonSenseStatement("A new claim with no known pattern."),
    ).not.toContain("Common sense:");
  });

  it("builds a review signal for unmatched submissions instead of auto-promoting them", () => {
    expect(
      buildTopSecretKnowledgeSignal(
        "A brand new internet claim that Top Secret has never seen before.",
      ),
    ).toMatchObject({
      matchedEntryIds: [],
      suggestedStatus: "needs_review",
    });
  });

  it("breaks tax-form Treasury credit theories into plain review points", () => {
    const claim =
      "Our signatures create instruments that are securitized; the 1041 V negated with the 1099 creates a credit and every application goes to the Treasury.";

    expect(buildTopSecretClaimComponents(claim)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "1041-V" }),
        expect.objectContaining({ label: "1099" }),
        expect.objectContaining({ label: "Signature as an instrument" }),
        expect.objectContaining({ label: "Securitization" }),
        expect.objectContaining({ label: "Company goes to the Treasury" }),
        expect.objectContaining({ label: "Application-created credit" }),
      ]),
    );
    expect(buildTopSecretCommonSenseStatement(claim)).toContain(
      "similar-sounding tax forms",
    );
  });
});
