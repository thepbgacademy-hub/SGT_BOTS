import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ProviderConnectPanel,
  resolveCodexOAuthPollAction,
} from "./ProviderConnectPanel";

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
    expect(markup).not.toContain("Use an API key instead");
  });
});

describe("resolveCodexOAuthPollAction", () => {
  const SESSION = {
    id: "session-1",
    provider: "openai_codex" as const,
    startedAt: "2026-07-20T00:00:00.000Z",
    expiresAt: "2026-07-20T03:00:00.000Z",
    durationSeconds: 10_800,
    remainingSeconds: 10_800,
    state: "active" as const,
  };

  it("stops the poll and hands back the session when connected", () => {
    expect(
      resolveCodexOAuthPollAction({
        status: "connected",
        session: SESSION,
        sessionToken: "token-1",
      }),
    ).toEqual({ type: "connected", session: SESSION, sessionToken: "token-1" });
  });

  it("treats a connected status missing session data as a non-terminal continue", () => {
    expect(
      resolveCodexOAuthPollAction({ status: "connected" }),
    ).toEqual({ type: "continue" });
  });

  it("stops the poll on expired", () => {
    expect(
      resolveCodexOAuthPollAction({ status: "expired", message: "Login expired." }),
    ).toEqual({ type: "stop", message: "Login expired." });
  });

  it("stops the poll on failed with a fallback message", () => {
    expect(resolveCodexOAuthPollAction({ status: "failed" })).toEqual({
      type: "stop",
      message: "OpenAI Codex login needs to be restarted.",
    });
  });

  it("keeps polling while pending", () => {
    expect(resolveCodexOAuthPollAction({ status: "pending" })).toEqual({
      type: "continue",
    });
  });

  it("keeps polling on a failed fetch (null payload)", () => {
    expect(resolveCodexOAuthPollAction(null)).toEqual({ type: "continue" });
  });
});
