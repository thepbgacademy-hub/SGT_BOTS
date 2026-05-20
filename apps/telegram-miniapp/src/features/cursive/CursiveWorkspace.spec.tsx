import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CursiveWorkspace,
  type CursiveWorkspaceStep,
} from "./CursiveWorkspace";

const STEPS: CursiveWorkspaceStep[] = [
  { id: "mode", label: "Mode" },
  { id: "evidence", label: "Evidence" },
  { id: "violation", label: "Violation" },
];

describe("CursiveWorkspace", () => {
  it("renders the mobile shell structure with current step content", () => {
    const markup = renderToStaticMarkup(
      createElement(CursiveWorkspace, {
        title: "Cursive",
        laneLabel: "Credit Bureau Dispute",
        countdownLabel: "Playground window",
        countdownValue: "04:12",
        steps: STEPS,
        activeStepId: "evidence",
        onBack: () => undefined,
        onNext: () => undefined,
        children: createElement("section", null, "Evidence pane"),
      }),
    );

    expect(markup).toContain("Cursive");
    expect(markup).toContain("Credit Bureau Dispute");
    expect(markup).toContain("Playground window");
    expect(markup).toContain("04:12");
    expect(markup).toContain("Evidence pane");
    expect(markup).toContain("Back");
    expect(markup).toContain("Next");
    expect(markup).toContain("Mode");
    expect(markup).toContain("Evidence");
    expect(markup).toContain("Violation");
    expect(markup).toContain('aria-current="step"');
  });

  it("renders optional back and generate slots without forcing chat or extra chrome", () => {
    const markup = renderToStaticMarkup(
      createElement(CursiveWorkspace, {
        title: "Cursive",
        laneLabel: "Official Letter Lane",
        countdownValue: "02:05",
        steps: STEPS,
        activeStepId: "violation",
        backLabel: "Return",
        nextLabel: "Continue",
        footerSlot: createElement("button", { type: "button" }, "Generate"),
        children: createElement("div", null, "Violation pane"),
      }),
    );

    expect(markup).toContain("Return");
    expect(markup).toContain("Continue");
    expect(markup).toContain("Generate");
    expect(markup).toContain("Violation pane");
    expect(markup).not.toContain("Chat");
  });
});
