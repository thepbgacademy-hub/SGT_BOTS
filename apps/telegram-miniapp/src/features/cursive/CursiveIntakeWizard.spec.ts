import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CREDIT_BUREAU_DISPUTE_INTAKE_FIELDS } from "../../../../../packages/shared/src/contracts";
import { CURSIVE_ACTIVE_CATEGORY } from "./CursiveCategoryPicker";
import {
  CursiveIntakeWizard,
  EMPTY_CURSIVE_CREDIT_DISPUTE_INTAKE,
  getCoherentCursiveGenerationState,
  isCursiveDocumentLaneUnlocked,
} from "./CursiveIntakeWizard";

const COMPLETE_INTAKE = {
  consumer_name: "Ada Lovelace",
  consumer_address: "123 Example Street",
  bureau_choice: "experian",
  account_reference: "ACCT-42",
  dispute_reason: "This account is being reported inaccurately.",
};

describe("cursive intake coherence helpers", () => {
  it("only unlocks the document lane for the official active category after a preview exists", () => {
    expect(
      isCursiveDocumentLaneUnlocked(CURSIVE_ACTIVE_CATEGORY, "<html>preview</html>"),
    ).toBe(true);
    expect(
      isCursiveDocumentLaneUnlocked(
        CURSIVE_ACTIVE_CATEGORY,
        "<html>preview</html>",
        true,
      ),
    ).toBe(false);
    expect(
      isCursiveDocumentLaneUnlocked("aggregator_dispute", "<html>preview</html>"),
    ).toBe(false);
    expect(isCursiveDocumentLaneUnlocked(CURSIVE_ACTIVE_CATEGORY, null)).toBe(
      false,
    );
  });

  it("drops to idle when the official category is no longer selected", () => {
    expect(
      getCoherentCursiveGenerationState(
        CURSIVE_ACTIVE_CATEGORY,
        COMPLETE_INTAKE,
      ),
    ).toBe("ready");

    expect(
      getCoherentCursiveGenerationState(
        "aggregator_dispute",
        COMPLETE_INTAKE,
      ),
    ).toBe("idle");
  });

  it("derives ready versus idle from intake completeness for the active category", () => {
    expect(
      getCoherentCursiveGenerationState(
        CURSIVE_ACTIVE_CATEGORY,
        COMPLETE_INTAKE,
      ),
    ).toBe("ready");

    expect(
      getCoherentCursiveGenerationState(
        CURSIVE_ACTIVE_CATEGORY,
        EMPTY_CURSIVE_CREDIT_DISPUTE_INTAKE,
      ),
    ).toBe("idle");
  });

  it("renders official intake fields in the shared source order", () => {
    const markup = renderToStaticMarkup(
      createElement(CursiveIntakeWizard, {
        category: CURSIVE_ACTIVE_CATEGORY,
        hasPreview: false,
        isPreviewStale: false,
        isGeneratingPreview: false,
        intake: COMPLETE_INTAKE,
        onChange: () => undefined,
        onGenerate: () => undefined,
      }),
    );

    const labelIndexes = CREDIT_BUREAU_DISPUTE_INTAKE_FIELDS.map((field) =>
      markup.indexOf(field.label),
    );

    expect(labelIndexes.every((index) => index >= 0)).toBe(true);
    expect(labelIndexes).toEqual([...labelIndexes].sort((left, right) => left - right));
  });
});
