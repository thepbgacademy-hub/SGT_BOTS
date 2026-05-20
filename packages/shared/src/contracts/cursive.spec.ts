import { describe, expect, it } from "vitest";
import {
  CursiveControlledAssertionSchema,
  CursiveModeSchema,
  CursiveEvidencePostureSchema,
  CursiveViolationTypeSchema,
  CursiveReportTypeSchema,
} from "./cursive";

describe("Cursive v2 shared contracts", () => {
  it("accepts the workflow-only wizard modes", () => {
    expect(CursiveModeSchema.parse("manual_dispute")).toBe("manual_dispute");
    expect(CursiveModeSchema.parse("analyze_uploaded_report")).toBe(
      "analyze_uploaded_report",
    );
  });

  it("accepts the approved manual evidence postures", () => {
    expect(
      CursiveEvidencePostureSchema.parse("cross_bureau_inconsistency"),
    ).toBe("cross_bureau_inconsistency");
    expect(
      CursiveEvidencePostureSchema.parse("single_bureau_inaccuracy_with_proof"),
    ).toBe("single_bureau_inaccuracy_with_proof");
  });

  it("accepts the first cross-bureau violation type", () => {
    expect(
      CursiveViolationTypeSchema.parse("different_balances_across_bureaus"),
    ).toBe("different_balances_across_bureaus");
  });

  it("matches the full approved violation catalog", () => {
    expect(CursiveViolationTypeSchema.options).toEqual([
      "different_balances_across_bureaus",
      "different_delinquency_dates_across_bureaus",
      "incorrect_account_number_across_bureaus",
      "incorrect_creditor_name_across_bureaus",
      "incorrect_payment_status_across_bureaus",
      "open_closed_status_conflict_across_bureaus",
      "incorrect_account_number",
      "incorrect_creditor_name",
      "duplicate_creditor_or_collector_reporting",
      "incorrect_payment_status",
      "closed_account_reported_as_open",
      "account_not_mine",
    ]);
  });

  it("accepts the first upload report types", () => {
    expect(CursiveReportTypeSchema.parse("tri_merge")).toBe("tri_merge");
    expect(CursiveReportTypeSchema.parse("single_bureau")).toBe("single_bureau");
  });

  it("accepts a controlled assertion with non-empty id and label", () => {
    expect(
      CursiveControlledAssertionSchema.parse({
        id: "assertion_1",
        label: "Balance differs across bureaus",
      }),
    ).toEqual({
      id: "assertion_1",
      label: "Balance differs across bureaus",
    });
  });

  it("rejects controlled assertions with extra properties", () => {
    const result = CursiveControlledAssertionSchema.safeParse({
      id: "assertion_1",
      label: "Balance differs across bureaus",
      legacyCategory: "credit_bureau_dispute",
    });

    expect(result.success).toBe(false);
  });

  it("rejects controlled assertions with empty required fields", () => {
    const result = CursiveControlledAssertionSchema.safeParse({
      id: "",
      label: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects legacy or out-of-scope cursive values", () => {
    expect(CursiveModeSchema.safeParse("helper_only_chat").success).toBe(false);
    expect(CursiveEvidencePostureSchema.safeParse("category_first").success).toBe(false);
    expect(CursiveViolationTypeSchema.safeParse("credit_bureau_dispute").success).toBe(
      false,
    );
    expect(CursiveReportTypeSchema.safeParse("html_letter").success).toBe(false);
  });
});
