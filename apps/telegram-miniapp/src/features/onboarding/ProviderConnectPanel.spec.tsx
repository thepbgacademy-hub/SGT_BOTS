import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProviderConnectPanel } from "./ProviderConnectPanel";

describe("ProviderConnectPanel", () => {
  it("offers the OpenAI Codex subscription login path", () => {
    const markup = renderToStaticMarkup(
      createElement(ProviderConnectPanel, {
        initData: "telegram-init-data",
        onConnected: () => undefined,
      }),
    );

    expect(markup).toContain("OpenAI Codex");
    expect(markup).toContain("Connect once here to unlock the whole playground session.");
    expect(markup).toContain("Connect OpenAI Codex");
    expect(markup).toContain("Use an API key instead");
  });
});
