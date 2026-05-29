import { describe, expect, it, vi } from "vitest";
import { requestCodexJson } from "../../src/modules/providers/codex-oauth.service";

function base64Url(input: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(input))
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function jwt(payload: Record<string, unknown>) {
  return `${base64Url({ alg: "none" })}.${base64Url(payload)}.signature`;
}

describe("OpenAI Codex OAuth runtime requests", () => {
  it("matches the proven Codex Responses request shape without max_output_tokens", async () => {
    const calls: Array<{ body: Record<string, unknown>; url: string }> = [];
    const fetchImpl = vi.fn().mockImplementation(async (url, init) => {
      calls.push({
        body: JSON.parse(String(init.body)) as Record<string, unknown>,
        url: String(url),
      });

      return new Response(JSON.stringify({ output_text: '{"ok":true}' }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    await expect(
      requestCodexJson({
        apiKey: JSON.stringify({
          accessToken: jwt({ exp: Math.floor(Date.now() / 1000) + 3600 }),
          baseUrl: "https://chatgpt.com/backend-api/codex",
          refreshToken: "refresh-token",
        }),
        fetchImpl,
        maxOutputTokens: 2200,
        systemPrompt: "System",
        userPrompt: "User",
      }),
    ).resolves.toEqual({ ok: true });

    expect(calls[0]).toMatchObject({
      url: "https://chatgpt.com/backend-api/codex/responses",
    });
    expect(calls[0]?.body).toMatchObject({
      instructions: "System",
      model: "gpt-5.3-codex",
      stream: true,
      store: false,
    });
    expect(calls[0]?.body).not.toHaveProperty("max_output_tokens");
  });

  it("refreshes expiring Codex access tokens before provider calls", async () => {
    const refreshedToken = jwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    const calls: string[] = [];
    const fetchImpl = vi.fn().mockImplementation(async (url, init) => {
      calls.push(String(url));

      if (String(url).includes("/oauth/token")) {
        expect(String(init.body)).toContain("grant_type=refresh_token");

        return new Response(
          JSON.stringify({
            access_token: refreshedToken,
            refresh_token: "refresh-token-new",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      expect((init.headers as Record<string, string>).authorization).toBe(
        `Bearer ${refreshedToken}`,
      );

      return new Response(JSON.stringify({ output_text: '{"ok":true}' }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const refreshed: string[] = [];

    await expect(
      requestCodexJson({
        apiKey: JSON.stringify({
          accessToken: jwt({ exp: Math.floor(Date.now() / 1000) + 30 }),
          baseUrl: "https://chatgpt.com/backend-api/codex",
          refreshToken: "refresh-token-old",
        }),
        fetchImpl,
        onCredentialRefresh: (credential) =>
          refreshed.push(credential.refreshToken),
        systemPrompt: "System",
        userPrompt: "User",
      }),
    ).resolves.toEqual({ ok: true });

    expect(calls).toEqual([
      "https://auth.openai.com/oauth/token",
      "https://chatgpt.com/backend-api/codex/responses",
    ]);
    expect(refreshed).toEqual(["refresh-token-new"]);
  });

  it("refreshes opaque or undecodable Codex access tokens before provider calls", async () => {
    const refreshedToken = jwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    const calls: string[] = [];
    const fetchImpl = vi.fn().mockImplementation(async (url, init) => {
      calls.push(String(url));

      if (String(url).includes("/oauth/token")) {
        return new Response(
          JSON.stringify({
            access_token: refreshedToken,
            refresh_token: "refresh-token-new",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      expect((init.headers as Record<string, string>).authorization).toBe(
        `Bearer ${refreshedToken}`,
      );

      return new Response(JSON.stringify({ output_text: '{"ok":true}' }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    await expect(
      requestCodexJson({
        apiKey: JSON.stringify({
          accessToken: "opaque-access-token",
          baseUrl: "https://chatgpt.com/backend-api/codex",
          refreshToken: "refresh-token-old",
        }),
        fetchImpl,
        systemPrompt: "System",
        userPrompt: "User",
      }),
    ).resolves.toEqual({ ok: true });

    expect(calls).toEqual([
      "https://auth.openai.com/oauth/token",
      "https://chatgpt.com/backend-api/codex/responses",
    ]);
  });

  it("refreshes and retries once when Codex rejects the current access token", async () => {
    const refreshedToken = jwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    const calls: string[] = [];
    const fetchImpl = vi.fn().mockImplementation(async (url) => {
      calls.push(String(url));

      if (calls.length === 1) {
        return new Response(JSON.stringify({ error: "expired" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }

      if (String(url).includes("/oauth/token")) {
        return new Response(
          JSON.stringify({
            access_token: refreshedToken,
            refresh_token: "refresh-token-new",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ output_text: '{"ok":true}' }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    await expect(
      requestCodexJson({
        apiKey: JSON.stringify({
          accessToken: jwt({ exp: Math.floor(Date.now() / 1000) + 3600 }),
          baseUrl: "https://chatgpt.com/backend-api/codex",
          refreshToken: "refresh-token-old",
        }),
        failurePrefix: "top secret provider failed",
        fetchImpl,
        systemPrompt: "System",
        userPrompt: "User",
      }),
    ).resolves.toEqual({ ok: true });

    expect(calls).toEqual([
      "https://chatgpt.com/backend-api/codex/responses",
      "https://auth.openai.com/oauth/token",
      "https://chatgpt.com/backend-api/codex/responses",
    ]);
  });

  it("parses Codex JSON when output text is split or fenced", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [
            {
              content: [
                { text: "```json\n", type: "output_text" },
                { text: '{"ok":true}', type: "output_text" },
                { text: "\n```", type: "output_text" },
              ],
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    await expect(
      requestCodexJson({
        apiKey: JSON.stringify({
          accessToken: jwt({ exp: Math.floor(Date.now() / 1000) + 3600 }),
          baseUrl: "https://chatgpt.com/backend-api/codex",
          refreshToken: "refresh-token",
        }),
        fetchImpl,
        systemPrompt: "System",
        userPrompt: "User",
      }),
    ).resolves.toEqual({ ok: true });
  });

  it("parses streamed Codex event responses", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        [
          'data: {"type":"response.output_text.delta","delta":"{\\"ok\\":"}',
          'data: {"type":"response.output_text.delta","delta":"true}"}',
          "data: [DONE]",
        ].join("\n"),
        {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        },
      ),
    );

    await expect(
      requestCodexJson({
        apiKey: JSON.stringify({
          accessToken: jwt({ exp: Math.floor(Date.now() / 1000) + 3600 }),
          baseUrl: "https://chatgpt.com/backend-api/codex",
          refreshToken: "refresh-token",
        }),
        fetchImpl,
        systemPrompt: "System",
        userPrompt: "User",
      }),
    ).resolves.toEqual({ ok: true });
  });
});
