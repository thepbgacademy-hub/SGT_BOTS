import { describe, expect, it } from "vitest";
import { createCursiveRepo } from "../../src/modules/cursive/cursive.repo";
import { reviewCreditBureauDisputeDraft } from "../../src/modules/cursive/cursive-review.service";
import { createCursiveService } from "../../src/modules/cursive/cursive.service";

const repo = createCursiveRepo();
const config = repo.getCategoryConfig("credit_bureau_dispute");

if (!config) {
  throw new Error("missing credit bureau cursive config");
}

describe("reviewCreditBureauDisputeDraft", () => {
  it("marks a valid credit bureau dispute draft as review_ready", () => {
    const service = createCursiveService({ cursiveRepo: repo });
    const intake = {
      consumer_name: "Jane Doe",
      consumer_address: "123 Main Street\nDallas, TX 75001",
      bureau_choice: "Experian",
      account_reference: "Account ending 1234",
      dispute_reason: "The late payment history is inaccurate because the account was paid on time.",
    };
    const draft = service.buildCreditBureauDisputeDraft(intake);

    expect(
      reviewCreditBureauDisputeDraft({
        config,
        draft,
        intake,
      }),
    ).toEqual({
      status: "review_ready",
      notes: [],
    });
  });

  it("fails loudly when the draft introduces legal-representation language", () => {
    const service = createCursiveService({ cursiveRepo: repo });
    const intake = {
      consumer_name: "Jane Doe",
      consumer_address: "123 Main Street\nDallas, TX 75001",
      bureau_choice: "Experian",
      account_reference: "Account ending 1234",
      dispute_reason: "The late payment history is inaccurate because the account was paid on time.",
    };
    const draft = service.buildCreditBureauDisputeDraft(intake);

    draft.templateInput.bodyParagraphs[3] =
      "As your legal counsel, I demand written results on your behalf.";

    expect(
      reviewCreditBureauDisputeDraft({
        config,
        draft,
        intake,
      }),
    ).toEqual({
      status: "needs_revision",
      notes: [
        "Draft includes legal representation language that is not allowed in Cursive output.",
      ],
    });
  });

  it("catches broader representation variants such as authorized representative phrasing", () => {
    const service = createCursiveService({ cursiveRepo: repo });
    const intake = {
      consumer_name: "Jane Doe",
      consumer_address: "123 Main Street\nDallas, TX 75001",
      bureau_choice: "Experian",
      account_reference: "Account ending 1234",
      dispute_reason: "The late payment history is inaccurate because the account was paid on time.",
    };
    const draft = service.buildCreditBureauDisputeDraft(intake);

    draft.templateInput.bodyParagraphs[1] =
      "I dispute the reporting of Account ending 1234 on my Experian consumer report. I am the authorized representative for Jane Doe and demand correction of this late payment.";

    expect(
      reviewCreditBureauDisputeDraft({
        config,
        draft,
        intake,
      }),
    ).toEqual({
      status: "needs_revision",
      notes: [
        "Draft includes legal representation language that is not allowed in Cursive output.",
      ],
    });
  });
});
