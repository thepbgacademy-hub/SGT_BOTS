import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  EMPTY_TOP_SECRET_WORKFLOW_STATE,
  TopSecretWorkspace,
  appendTopSecretMessageSlot,
  getSteppedTopSecretState,
  getTopSecretInputError,
  parseTopSecretClaimsText,
} from "./TopSecretWorkspace";

describe("TopSecretWorkspace", () => {
  it("parses pasted claims and rejects questions", () => {
    expect(
      parseTopSecretClaimsText(
        "1. Income tax is voluntary.\n\n2. How to verify a TreasuryDirect claim.",
      ),
    ).toEqual([
      "Income tax is voluntary.",
      "How to verify a TreasuryDirect claim.",
    ]);
    expect(getTopSecretInputError("Is income tax voluntary?")).toBe(
      "Send statements or how-to claims here, not questions.",
    );
  });

  it("shortens long pasted quotes before review", () => {
    const longPaste = [
      "A long post says statutes are not law and only court cases matter.",
      ...Array.from({ length: 80 }, (_, index) =>
        `Repeated quote block ${index + 1} keeps going without adding a new claim.`,
      ),
      "It mentions 31 U.S.C. § 5103 while arguing Federal Reserve notes are not real money.",
    ].join(" ");
    const [claim] = parseTopSecretClaimsText(longPaste);

    expect(claim.length).toBeLessThanOrEqual(900);
    expect(claim).toContain("Summary of long paste:");
    expect(claim).toContain("statutes are not law");
    expect(claim).toContain("31 U.S.C. § 5103");
    expect(claim).not.toContain("Repeated quote block 80");
  });

  it("adds numbered slots so users can paste more messages before review", () => {
    expect(appendTopSecretMessageSlot("")).toBe("1. ");
    expect(appendTopSecretMessageSlot("1. Income tax is voluntary.")).toBe(
      "1. Income tax is voluntary.\n\n2. ",
    );
    expect(
      parseTopSecretClaimsText(
        appendTopSecretMessageSlot("1. Income tax is voluntary."),
      ),
    ).toEqual(["Income tax is voluntary."]);
  });

  it("treats a giant multi-paragraph quote dump as one summarized item", () => {
    const quoteDump = Array.from({ length: 30 }, (_, index) =>
      index === 0
        ? "A forum post says statutes are not law and only court cases matter."
        : `Quoted paragraph ${index} repeats the same internet argument and adds extra filler that does not change the claim.`,
    ).join("\n\n");
    const claims = parseTopSecretClaimsText(quoteDump);

    expect(claims).toHaveLength(1);
    expect(claims[0]).toContain("Summary of long paste:");
    expect(claims[0]).toContain("statutes are not law");
  });

  it("advances from input to review after a valid claim", () => {
    const state = getSteppedTopSecretState(
      {
        ...EMPTY_TOP_SECRET_WORKFLOW_STATE,
        claimsText: "Income tax is voluntary.",
      },
      "next",
    );

    expect(state.currentStep).toBe("review");
    expect(state.error).toBeNull();
  });

  it("renders the dedicated report workflow and support panel", () => {
    const markup = renderToStaticMarkup(
      createElement(TopSecretWorkspace, {
        artifacts: [],
        onBack: () => undefined,
        onBackToMenu: () => undefined,
        onClaimsTextChange: () => undefined,
        onGenerate: () => undefined,
        onNext: () => undefined,
        state: {
          ...EMPTY_TOP_SECRET_WORKFLOW_STATE,
          claimsText: "Income tax is voluntary.",
        },
      }),
    );

    expect(markup).toContain("Paste what you found");
    expect(markup).toContain("Add another message");
    expect(markup).toContain("Review messages");
    expect(markup).toContain("Report");
    expect(markup).toContain("Here is the plan:");
    expect(markup).not.toContain("Chat");
  });

  it("shows the queue banner instead of provider fallback text in the results step", () => {
    const markup = renderToStaticMarkup(
      createElement(TopSecretWorkspace, {
        artifacts: [
          {
            artifactType: "pdf",
            botId: "verifier",
            botName: "Top Secret",
            fileName: "top-secret-claim-review.pdf",
            id: "artifact-1",
            originalFilename: "top-secret-claim-review.html",
            status: "queued",
          },
        ],
        onBack: () => undefined,
        onBackToMenu: () => undefined,
        onClaimsTextChange: () => undefined,
        onGenerate: () => undefined,
        onNext: () => undefined,
        state: {
          ...EMPTY_TOP_SECRET_WORKFLOW_STATE,
          currentStep: "results",
          findings: [
            {
              analysis:
                "The provider response did not keep the required report structure tied to the retained sources, so this item is marked as not enough reliable evidence instead of being forced into a true or false conclusion.",
              claim: "A sample claim",
              conclusion: "A sample conclusion",
              verdict: "not_enough_reliable_evidence",
            },
          ],
        },
      }),
    );

    expect(markup).toContain("Your report is being created.");
    expect(markup).toContain("download button will appear here shortly.");
    expect(markup).not.toContain(
      "The provider response did not keep the required report structure",
    );
    expect(markup).toContain("Back to menu");
  });
});
