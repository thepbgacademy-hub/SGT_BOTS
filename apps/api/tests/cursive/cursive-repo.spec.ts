import { describe, expect, it } from "vitest";
import { createCursiveRepo } from "../../src/modules/cursive/cursive.repo";

describe("createCursiveRepo", () => {
  it("lists all planned Cursive categories in launch order", () => {
    const repo = createCursiveRepo();

    expect(repo.listCategories().map((category) => category.slug)).toEqual([
      "credit_bureau_dispute",
      "aggregator_dispute",
      "direct_creditor_dispute",
      "bill_collector_dispute",
      "utility_dispute",
      "reconsideration_request",
      "full_account_history_request",
      "irs_inquiry_dispute",
    ]);
  });

  it("keeps credit bureau dispute as the default live category config", () => {
    const repo = createCursiveRepo();
    const config = repo.getCategoryConfig("credit_bureau_dispute");

    expect(config).toEqual(
      expect.objectContaining({
        category: expect.objectContaining({
          slug: "credit_bureau_dispute",
          displayName: "Credit Bureau Dispute",
          enabled: true,
          sortOrder: 10,
        }),
        citations: [
          expect.objectContaining({
            citationKey: "fcra_general",
          }),
          expect.objectContaining({
            citationKey: "reg_v",
          }),
          expect.objectContaining({
            citationKey: "fcra_611",
          }),
        ],
        addresses: expect.arrayContaining([
          expect.objectContaining({
            organizationName: "Experian",
          }),
          expect.objectContaining({
            organizationName: "Equifax",
          }),
          expect.objectContaining({
            organizationName: "TransUnion",
          }),
        ]),
      }),
    );
  });

  it("returns scaffold configs for non-credit categories instead of null", () => {
    const repo = createCursiveRepo();
    const aggregator = repo.getCategoryConfig("aggregator_dispute");
    const irs = repo.getCategoryConfig("irs_inquiry_dispute");

    expect(aggregator).toEqual(
      expect.objectContaining({
        category: expect.objectContaining({
          slug: "aggregator_dispute",
          displayName: "Aggregator Dispute",
          enabled: false,
        }),
      }),
    );
    expect(aggregator?.intakeSchema.intakeSchema.fields).toHaveLength(5);
    expect(aggregator?.citations).toEqual([]);
    expect(aggregator?.addresses).toEqual([]);

    expect(irs).toEqual(
      expect.objectContaining({
        category: expect.objectContaining({
          slug: "irs_inquiry_dispute",
          displayName: "IRS Inquiry / Dispute",
        }),
      }),
    );
  });

  it("returns the repo-owned default category for the current live generation lane", () => {
    const repo = createCursiveRepo();

    expect(repo.getDefaultCategoryConfig()).toEqual(
      repo.getCategoryConfig("credit_bureau_dispute"),
    );
  });

  it("returns frozen snapshots so callers cannot mutate the source of truth", () => {
    const repo = createCursiveRepo();
    const first = repo.getCategoryConfig("credit_bureau_dispute");

    if (!first) {
      throw new Error("missing credit bureau config");
    }

    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.category.outputModes)).toBe(true);
    expect(Object.isFrozen(first.intakeSchema.intakeSchema.fields)).toBe(true);
    expect(Object.isFrozen(first.promptProfile.promptPayload.draftInstructions)).toBe(
      true,
    );
    expect(Object.isFrozen(first.citations)).toBe(true);
    expect(Object.isFrozen(first.addresses)).toBe(true);

    expect(() => {
      first.category.outputModes.push("portal_text");
    }).toThrow();
    expect(() => {
      first.intakeSchema.intakeSchema.fields.push({
        key: "extra",
        label: "Extra",
        required: false,
      });
    }).toThrow();

    const second = repo.getCategoryConfig("credit_bureau_dispute");

    expect(second?.category.outputModes).toEqual([
      "portal_text",
      "html_letter",
      "pdf_letter",
    ]);
    expect(second?.intakeSchema.intakeSchema.fields).toHaveLength(5);
  });

  it("returns null for unsupported categories", () => {
    const repo = createCursiveRepo();

    expect(repo.getCategoryConfig("not_a_real_category")).toBeNull();
  });
});
