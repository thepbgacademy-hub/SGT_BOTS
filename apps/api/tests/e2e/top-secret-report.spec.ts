import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import { readEnv } from "../../src/config/env";
import { createInMemoryProfileRepo } from "../../src/modules/profiles/profile.repo";
import { createInMemorySessionMetadataRepo } from "../../src/modules/sessions/session.repo";
import { createInMemorySessionSecretStore } from "../../src/modules/sessions/session.service";
import type { SessionSecret } from "../../src/modules/sessions/session.store";
import {
  createSignedTelegramInitData,
  TEST_TELEGRAM_BOT_TOKEN,
  TEST_TELEGRAM_USER,
} from "../../../../packages/shared/src/testing/telegram-fixtures";

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

async function createAuthorizedSession() {
  const initData = createSignedTelegramInitData();
  const app = await buildApp({
    env: readEnv({
      APP_PORT: "3001",
      TELEGRAM_BOT_USERNAME: "sgt_playground_bot",
      TELEGRAM_BOT_TOKEN: TEST_TELEGRAM_BOT_TOKEN,
      PROFILE_REPO_MODE: "memory",
      PROVIDER_VALIDATION_MODE: "stub",
    }),
    profileRepo: createInMemoryProfileRepo(),
    sessionMetadataRepo: createInMemorySessionMetadataRepo(),
    sessionSecretStore: createInMemorySessionSecretStore(),
  });

  const profileResponse = await app.inject({
    method: "POST",
    url: "/api/profiles",
    payload: {
      initData,
      firstName: "Ada",
      lastName: "Lovelace",
      preferredName: "Ada",
    },
  });
  expect(profileResponse.statusCode).toBe(201);

  const sessionResponse = await app.inject({
    method: "POST",
    url: "/api/providers/connect",
    headers: {
      "x-telegram-init-data": initData,
    },
    payload: {
      provider: "openai",
      apiKey: "sk-test",
    },
  });
  expect(sessionResponse.statusCode).toBe(200);

  const payload = sessionResponse.json() as {
    session: { id: string };
    sessionToken: string;
  };

  return {
    app,
    sessionId: payload.session.id,
    sessionToken: payload.sessionToken,
  };
}

describe("Top Secret report route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("still queues the report when review persistence is unavailable", async () => {
    const initData = createSignedTelegramInitData();
    const app = await buildApp({
      env: readEnv({
        APP_PORT: "3001",
        TELEGRAM_BOT_USERNAME: "sgt_playground_bot",
        TELEGRAM_BOT_TOKEN: TEST_TELEGRAM_BOT_TOKEN,
        PROFILE_REPO_MODE: "memory",
        PROVIDER_VALIDATION_MODE: "stub",
      }),
      profileRepo: createInMemoryProfileRepo(),
      sessionMetadataRepo: createInMemorySessionMetadataRepo(),
      sessionSecretStore: createInMemorySessionSecretStore(),
      topSecretReviewRepo: {
        async listApprovedRuntimeEntries() {
          return [];
        },
        async listReviewCandidates() {
          return [];
        },
        async promoteReviewCandidate() {
          throw new Error("review repo unavailable");
        },
        async recordSubmission() {
          throw new Error("review repo unavailable");
        },
      },
    });

    await app.inject({
      method: "POST",
      url: "/api/profiles",
      payload: {
        initData,
        firstName: "Ada",
        lastName: "Lovelace",
        preferredName: "Ada",
      },
    });
    const sessionResponse = await app.inject({
      method: "POST",
      url: "/api/providers/connect",
      headers: {
        "x-telegram-init-data": initData,
      },
      payload: {
        provider: "openai",
        apiKey: "sk-test",
      },
    });
    const sessionPayload = sessionResponse.json() as {
      session: { id: string };
      sessionToken: string;
    };

    const response = await app.inject({
      method: "POST",
      url: "/api/reports/top-secret/claim-review",
      headers: {
        authorization: `Bearer ${sessionPayload.sessionToken}`,
      },
      payload: {
        botId: "verifier",
        claims: ["Income tax is voluntary."],
        sessionId: sessionPayload.session.id,
      },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({
      artifact: {
        fileName: "top-secret-claim-review.pdf",
      },
      status: "queued",
    });
  }, 40000);

  it("queues one combined PDF report for pasted claims", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const response = await app.inject({
      method: "POST",
      url: "/api/reports/top-secret/claim-review",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        botId: "verifier",
        claims: [
          "Income tax is voluntary.",
          "How to verify a TreasuryDirect claim using official sources.",
        ],
        sessionId,
      },
    });

    expect(response.statusCode).toBe(202);
    const payload = response.json() as {
      artifact: {
        id: string;
        fileName: string;
        status: string;
      };
      findings: Array<{
        claim: string;
        verdict: string;
      }>;
      status: string;
    };

    expect(payload.status).toBe("queued");
    expect(payload.artifact.fileName).toBe("top-secret-claim-review.pdf");
    expect(payload.findings).toHaveLength(2);

    const storedArtifact = await app.reportService.waitForArtifact(
      payload.artifact.id,
      { timeoutMs: 30000 },
    );
    expect(storedArtifact.status).toBe("ready");
    expect(
      app.reportService.readArtifactFile(payload.artifact.id)?.subarray(0, 5).toString(),
    ).toBe("%PDF-");
  }, 40000);

  it("rejects questions", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const response = await app.inject({
      method: "POST",
      url: "/api/reports/top-secret/claim-review",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        botId: "verifier",
        claims: ["Is income tax voluntary?"],
        sessionId,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      message: "top secret accepts statements and how-to claims, not questions",
    });
  });

  it("rejects Cursive credit-report claims without queuing a Top Secret artifact", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const response = await app.inject({
      method: "POST",
      url: "/api/reports/top-secret/claim-review",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        botId: "verifier",
        claims: ["The credit bureaus must delete under 15 USC 1681i."],
        sessionId,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      message:
        "top secret does not process credit-report or FCRA claims; use Cursive for that workflow",
    });
    expect(
      app.reportService.listArtifactsForSession({
        sessionId,
        userId: String(TEST_TELEGRAM_USER.id),
      }),
    ).toEqual([]);
  });

  it("logs live Top Secret provider failures from the claim-review route", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlText = String(url);

      if (urlText === "https://api.openai.com/v1/models") {
        return new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (urlText === "https://api.openai.com/v1/chat/completions") {
        return new Response(JSON.stringify({ error: "provider unavailable" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(
        "<html><body>Official source text retained for Top Secret report testing.</body></html>",
        { status: 200, headers: { "content-type": "text/html" } },
      );
    });
    const initData = createSignedTelegramInitData();
    const app = await buildApp({
      env: readEnv({
        APP_PORT: "3001",
        TELEGRAM_BOT_USERNAME: "sgt_playground_bot",
        TELEGRAM_BOT_TOKEN: TEST_TELEGRAM_BOT_TOKEN,
        PROFILE_REPO_MODE: "memory",
        PROVIDER_VALIDATION_MODE: "live",
      }),
      profileRepo: createInMemoryProfileRepo(),
      sessionMetadataRepo: createInMemorySessionMetadataRepo(),
      sessionSecretStore: createInMemorySessionSecretStore(),
    });

    await app.inject({
      method: "POST",
      url: "/api/profiles",
      payload: {
        initData,
        firstName: "Ada",
        lastName: "Lovelace",
        preferredName: "Ada",
      },
    });
    const sessionResponse = await app.inject({
      method: "POST",
      url: "/api/providers/connect",
      headers: {
        "x-telegram-init-data": initData,
      },
      payload: {
        provider: "openai",
        apiKey: "sk-test",
      },
    });
    const sessionPayload = sessionResponse.json() as {
      session: { id: string };
      sessionToken: string;
    };

    const response = await app.inject({
      method: "POST",
      url: "/api/reports/top-secret/claim-review",
      headers: {
        authorization: `Bearer ${sessionPayload.sessionToken}`,
      },
      payload: {
        botId: "verifier",
        claims: ["A postage stamp signature pays postage under federal law."],
        sessionId: sessionPayload.session.id,
      },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({
      message:
        "Unable to complete Top Secret research with your connected provider right now. Please retry or reconnect your provider.",
    });
    expect(warnSpy).toHaveBeenCalledWith(
      "top secret claim review failed",
      expect.objectContaining({
        error: expect.stringContaining("top secret provider failed"),
        route: "top-secret-claim-review",
      }),
    );
    expect(
      app.reportService.listArtifactsForSession({
        sessionId: sessionPayload.session.id,
        userId: String(TEST_TELEGRAM_USER.id),
      }),
    ).toEqual([]);
  });

  it("persists refreshed Codex credentials after a Top Secret report run", async () => {
    const secrets = new Map<string, SessionSecret>();
    const copyOnReadSecretStore = {
      get(sessionId: string) {
        const secret = secrets.get(sessionId);

        return secret ? { ...secret } : undefined;
      },
      put(secret: SessionSecret) {
        secrets.set(secret.sessionId, { ...secret });
        return secret;
      },
    };
    const refreshedToken = jwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlText = String(url);

      if (urlText === "https://auth.openai.com/oauth/token") {
        return new Response(
          JSON.stringify({
            access_token: refreshedToken,
            refresh_token: "refresh-token-new",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (urlText === "https://chatgpt.com/backend-api/codex/responses") {
        return new Response(
          JSON.stringify({
            output_text: JSON.stringify({
              findings: [
                {
                  analysis:
                    "TreasuryDirect is an official source for Treasury securities, but it does not validate unrelated private-account claims.",
                  citations: [
                    {
                      publisher: "U.S. Treasury",
                      title: "TreasuryDirect - Treasury securities overview",
                      url: "https://www.treasurydirect.gov/marketable-securities/",
                    },
                  ],
                  claim:
                    "TreasuryDirect account claims should be checked with official sources.",
                  conclusion:
                    "So for this message, the evidence points to this conclusion: official Treasury sources can verify Treasury securities information, not every online Treasury account claim.",
                  supportReferences: [
                    {
                      sourceId: "source-1",
                      supports:
                        "The retained source supports checking TreasuryDirect account claims with official Treasury material.",
                    },
                  ],
                  verdict: "partially_verified",
                },
              ],
            }),
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      return new Response(
        "<html><body>TreasuryDirect explains Treasury marketable securities and source text retained for evidence review.</body></html>",
        { status: 200, headers: { "content-type": "text/html" } },
      );
    });
    const app = await buildApp({
      env: readEnv({
        APP_PORT: "3001",
        TELEGRAM_BOT_USERNAME: "sgt_playground_bot",
        TELEGRAM_BOT_TOKEN: TEST_TELEGRAM_BOT_TOKEN,
        PROFILE_REPO_MODE: "memory",
        PROVIDER_VALIDATION_MODE: "live",
      }),
      profileRepo: createInMemoryProfileRepo(),
      sessionMetadataRepo: createInMemorySessionMetadataRepo(),
      sessionSecretStore: copyOnReadSecretStore,
    });
    const session = await app.sessionService.startSession({
      apiKey: JSON.stringify({
        accessToken: "opaque-access-token",
        baseUrl: "https://chatgpt.com/backend-api/codex",
        refreshToken: "refresh-token-old",
      }),
      authMethod: "oauth",
      provider: "openai_codex",
      userId: String(TEST_TELEGRAM_USER.id),
    });
    const sessionToken = app.sessionTokenService.issueToken({
      expiresAt: session.expiresAt,
      sessionId: session.id,
      userId: session.userId,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/reports/top-secret/claim-review",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        botId: "verifier",
        claims: [
          "TreasuryDirect account claims should be checked with official sources.",
        ],
        sessionId: session.id,
      },
    });

    expect(response.statusCode).toBe(202);
    expect(JSON.parse(secrets.get(session.id)?.apiKey ?? "{}")).toMatchObject({
      accessToken: refreshedToken,
      refreshToken: "refresh-token-new",
    });
  });

  it("persists refreshed Codex credentials even when the report call fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const secrets = new Map<string, SessionSecret>();
    const copyOnReadSecretStore = {
      get(sessionId: string) {
        const secret = secrets.get(sessionId);

        return secret ? { ...secret } : undefined;
      },
      put(secret: SessionSecret) {
        secrets.set(secret.sessionId, { ...secret });
        return secret;
      },
    };
    const refreshedToken = jwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlText = String(url);

      if (urlText === "https://auth.openai.com/oauth/token") {
        return new Response(
          JSON.stringify({
            access_token: refreshedToken,
            refresh_token: "refresh-token-new",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (urlText === "https://chatgpt.com/backend-api/codex/responses") {
        return new Response(JSON.stringify({ error: "provider unavailable" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(
        "<html><body>TreasuryDirect explains Treasury marketable securities and source text retained for evidence review.</body></html>",
        { status: 200, headers: { "content-type": "text/html" } },
      );
    });
    const app = await buildApp({
      env: readEnv({
        APP_PORT: "3001",
        TELEGRAM_BOT_USERNAME: "sgt_playground_bot",
        TELEGRAM_BOT_TOKEN: TEST_TELEGRAM_BOT_TOKEN,
        PROFILE_REPO_MODE: "memory",
        PROVIDER_VALIDATION_MODE: "live",
      }),
      profileRepo: createInMemoryProfileRepo(),
      sessionMetadataRepo: createInMemorySessionMetadataRepo(),
      sessionSecretStore: copyOnReadSecretStore,
    });
    const session = await app.sessionService.startSession({
      apiKey: JSON.stringify({
        accessToken: "opaque-access-token",
        baseUrl: "https://chatgpt.com/backend-api/codex",
        refreshToken: "refresh-token-old",
      }),
      authMethod: "oauth",
      provider: "openai_codex",
      userId: String(TEST_TELEGRAM_USER.id),
    });
    const sessionToken = app.sessionTokenService.issueToken({
      expiresAt: session.expiresAt,
      sessionId: session.id,
      userId: session.userId,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/reports/top-secret/claim-review",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        botId: "verifier",
        claims: [
          "TreasuryDirect account claims should be checked with official sources.",
        ],
        sessionId: session.id,
      },
    });

    expect(response.statusCode).toBe(502);
    expect(warnSpy).toHaveBeenCalledWith(
      "top secret claim review failed",
      expect.objectContaining({
        error: expect.stringContaining("top secret provider failed"),
      }),
    );
    expect(JSON.parse(secrets.get(session.id)?.apiKey ?? "{}")).toMatchObject({
      accessToken: refreshedToken,
      refreshToken: "refresh-token-new",
    });
  });
});
