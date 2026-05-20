import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CursiveWorkspaceShell,
  getNextCursiveStepState,
  type CursiveWorkflowState,
} from "./DashboardShell";

function renderShell(state: CursiveWorkflowState) {
  return renderToStaticMarkup(
    createElement(CursiveWorkspaceShell, {
      countdownValue: "02:59:00",
      onBackStep: () => undefined,
      onBackToMenu: () => undefined,
      onChoiceSelect: () => undefined,
      state,
    }),
  );
}

describe("DashboardShell Cursive workspace", () => {
  it("starts on the named Mode step and keeps later steps locked", () => {
    const markup = renderShell({
      currentStep: "mode",
      evidencePosture: null,
      mode: null,
      violationType: null,
    });

    expect(markup).toContain("Mode");
    expect(markup).toContain("Evidence");
    expect(markup).toContain("Violation");
    expect(markup).toContain("Choose how to begin");
    expect(markup).toContain("Manual dispute");
    expect(markup).toContain("Analyze uploaded report");
  });

  it("advances deterministically through Mode, Evidence, and Violation", () => {
    const afterMode = getNextCursiveStepState("manual_dispute", {
      currentStep: "mode",
      evidencePosture: null,
      mode: null,
      violationType: null,
    });
    const afterEvidence = getNextCursiveStepState(
      "cross_bureau_inconsistency",
      afterMode,
    );
    const afterViolation = getNextCursiveStepState(
      "different_balances_across_bureaus",
      afterEvidence,
    );

    expect(afterMode).toEqual({
      currentStep: "evidence",
      evidencePosture: null,
      mode: "manual_dispute",
      violationType: null,
    });
    expect(afterEvidence).toEqual({
      currentStep: "violation",
      evidencePosture: "cross_bureau_inconsistency",
      mode: "manual_dispute",
      violationType: null,
    });
    expect(afterViolation).toEqual({
      currentStep: "violation",
      evidencePosture: "cross_bureau_inconsistency",
      mode: "manual_dispute",
      violationType: "different_balances_across_bureaus",
    });
  });
});
