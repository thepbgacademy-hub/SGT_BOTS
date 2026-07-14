import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FormWizardPanel } from "./FormWizardPanel";

describe("FormWizardPanel", () => {
  it("renders the guided intake fields instead of an open chat", () => {
    const markup = renderToStaticMarkup(
      createElement(FormWizardPanel, {
        sessionId: "session-1",
        sessionToken: "token-1",
      }),
    );

    expect(markup).toContain("Guided Intake");
    expect(markup).toContain("ShAzZaM!");
    expect(markup).toContain("Form title");
    expect(markup).toContain("Requested output");
    expect(markup).toContain("Key details");
    expect(markup).toContain("Validate intake");
    expect(markup).toContain("form engine, not a chat assistant");
  });

  it("does not render chat message input affordances", () => {
    const markup = renderToStaticMarkup(
      createElement(FormWizardPanel, {
        sessionId: "session-1",
        sessionToken: "token-1",
      }),
    );

    expect(markup).not.toContain("Start the conversation here.");
    expect(markup).not.toContain("message-card");
  });
});
