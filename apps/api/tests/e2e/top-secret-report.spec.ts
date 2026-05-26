import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";
import { readEnv } from "../../src/config/env";
import { createInMemoryProfileRepo } from "../../src/modules/profiles/profile.repo";
import { createInMemorySessionMetadataRepo } from "../../src/modules/sessions/session.repo";
import { createInMemorySessionSecretStore } from "../../src/modules/sessions/session.service";
import {
  createSignedTelegramInitData,
  TEST_TELEGRAM_BOT_TOKEN,
  TEST_TELEGRAM_USER,
} from "../../../../packages/shared/src/testing/telegram-fixtures";

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
});
