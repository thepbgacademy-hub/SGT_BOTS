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
        laneLabel: "Credit Bureau Dispute",
        steps: STEPS,
        activeStepId: "evidence",
        onBack: () => undefined,
        onNext: () => undefined,
        children: createElement("section", null, "Evidence pane"),
      }),
    );

    expect(markup).toContain("Credit Bureau Dispute");
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
        laneLabel: "Official Letter Lane",
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
