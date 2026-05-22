import { describe, expect, it } from "vitest";
import {
  renderBureauRemovalDemandHtml,
  renderBureauRemovalDemandPortalText,
  validateBureauRemovalDemandInput,
  type BureauRemovalDemandTemplateInput,
} from "../../src/modules/cursive/templates/bureau-removal-demand.html";

const crossBureauInput: BureauRemovalDemandTemplateInput = {
  consumer: {
    fullName: "Jane Doe",
    mailingAddressLines: ["123 Main Street", "Dallas, TX 75001"],
  },
  bureau: {
    name: "TransUnion",
    mailingAddressLines: ["Consumer Solutions", "P.O. Box 2000", "Chester, PA 19016-2000"],
  },
  generatedDate: "May 20, 2026",
  violationType: "different_balances_across_bureaus",
  violationLabel: "Different balances across bureaus",
  doctrine: "documented_inconsistency",
  tradeline: {
    furnisherName: "Example Bank",
    maskedAccountIdentifier: "Account ending 1234",
  },
  reportedFacts: {
    targetBureauFactLabel: "balance",
    targetBureauReportedValue: "$4,812",
  },
  conflictFacts: {
    comparedBureauFacts: [
      {
        bureauName: "Experian",
        reportedValue: "$0",
      },
      {
        bureauName: "Equifax",
        reportedValue: "$4,812",
      },
    ],
    conflictSummary:
      "Experian reports a $0 balance while TransUnion reports $4,812.",
  },
  evidenceSummary: "Tri-merge report excerpt dated May 1, 2026",
  enclosureLabels: ["Tri-merge report excerpt"],
  statuteMappingId: "cra_cross_bureau_inconsistency",
};

const singleBureauInput: BureauRemovalDemandTemplateInput = {
  consumer: {
    fullName: "Jane Doe",
    mailingAddressLines: ["123 Main Street", "Dallas, TX 75001"],
  },
  bureau: {
    name: "Experian",
    mailingAddressLines: ["P.O. Box 4500", "Allen, TX 75013"],
  },
  generatedDate: "May 20, 2026",
  violationType: "closed_account_reported_as_open",
  violationLabel: "Closed account reported as open",
  doctrine: "documented_inaccuracy_with_proof",
  tradeline: {
    furnisherName: "Example Finance",
    maskedAccountIdentifier: "Account ending 6789",
  },
  reportedFacts: {
    targetBureauFactLabel: "account status",
    targetBureauReportedValue: "Open",
  },
  proofFacts: {
    reportedInaccurateInformation:
      "Experian reports this account as open.",
    proofSummary:
      "The enclosed creditor letter confirms the account was closed before the report date.",
  },
  evidenceSummary: "Creditor closure letter",
  enclosureLabels: ["Creditor closure letter"],
  statuteMappingId: "cra_single_bureau_inaccuracy_with_proof",
};

describe("renderBureauRemovalDemandHtml", () => {
  it("renders a formal Letter portrait cross-bureau removal-demand letter with human wording", () => {
    const html = renderBureauRemovalDemandHtml(crossBureauInput);

    expect(html).toContain("@page");
    expect(html).toContain("size: 8.5in 11in");
    expect(html).toContain("Demand for Removal");
    expect(html).toContain("TransUnion");
    expect(html).toContain("Example Bank");
    expect(html).toContain(
      "The enclosed documentation shows that this same account is reported differently elsewhere",
    );
    expect(html).toContain("written proof of deletion");
    expect(html).toContain("Fair Credit Reporting Act");
    expect(html).toContain("15 U.S.C. Sec. 1681e(b)");
    expect(html).toContain("15 U.S.C. Sec. 1681i(a)(1)(A)");
    expect(html).toContain("15 U.S.C. Sec. 1681i(a)(5)(A)(i)");
    expect(html).not.toContain("high-confidence matched tradeline");
    expect(html).not.toContain("verify this account");
    expect(html).not.toContain("correct if needed");
  });

  it("renders a single-bureau proof letter without asking for replacement data", () => {
    const text = renderBureauRemovalDemandPortalText(singleBureauInput);

    expect(text).toContain("Experian is reporting inaccurate information");
    expect(text).toContain("Experian reports this account as open.");
    expect(text).toContain("I am not providing replacement information");
    expect(text).toContain("remove the disputed tradeline");
    expect(text).toContain("proof of deletion");
    expect(text).not.toContain("correct account number");
    expect(text).not.toContain("correct furnisher name");
    expect(text).not.toContain("<");
  });

  it("requires conflict facts for cross-bureau templates", () => {
    expect(() =>
      validateBureauRemovalDemandInput({
        ...crossBureauInput,
        conflictFacts: undefined,
      }),
    ).toThrow("conflict facts are required");
  });

  it("rejects malformed request shape without throwing a TypeError", () => {
    expect(() =>
      validateBureauRemovalDemandInput({
        ...crossBureauInput,
        consumer: undefined,
      } as unknown as BureauRemovalDemandTemplateInput),
    ).toThrow("consumer is required");

    expect(() =>
      validateBureauRemovalDemandInput({
        ...crossBureauInput,
        consumer: {
          fullName: "Jane Doe",
          mailingAddressLines: "123 Main Street",
        },
      } as unknown as BureauRemovalDemandTemplateInput),
    ).toThrow("consumer mailing address is required");

    expect(() =>
      validateBureauRemovalDemandInput({
        ...crossBureauInput,
        enclosureLabels: undefined,
      } as unknown as BureauRemovalDemandTemplateInput),
    ).toThrow("enclosure labels is required");
  });

  it("rejects unapproved runtime enum values", () => {
    expect(() =>
      validateBureauRemovalDemandInput({
        ...crossBureauInput,
        violationType: "made_up_violation",
      } as unknown as BureauRemovalDemandTemplateInput),
    ).toThrow("approved violation type is required");

    expect(() =>
      validateBureauRemovalDemandInput({
        ...crossBureauInput,
        doctrine: "made_up_doctrine",
      } as unknown as BureauRemovalDemandTemplateInput),
    ).toThrow("approved doctrine is required");
  });

  it("rejects mismatched doctrine, statute, and violation combinations", () => {
    expect(() =>
      validateBureauRemovalDemandInput({
        ...crossBureauInput,
        doctrine: "documented_inaccuracy_with_proof",
        proofFacts: {
          reportedInaccurateInformation: "TransUnion reports the wrong balance.",
          proofSummary: "The enclosed report excerpt shows a conflict.",
        },
        statuteMappingId: "cra_single_bureau_inaccuracy_with_proof",
      }),
    ).toThrow("doctrine and statute mapping must match violation type");
  });

  it("rejects forbidden verification and repair language before delivery", () => {
    expect(() =>
      validateBureauRemovalDemandInput({
        ...singleBureauInput,
        proofFacts: {
          reportedInaccurateInformation: "Please verify this account.",
          proofSummary: "Correct if needed.",
        },
      }),
    ).toThrow("forbidden bureau-removal-demand language");
  });
});
