import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";
import { readEnv } from "../../src/config/env";
import { createInMemoryProfileRepo } from "../../src/modules/profiles/profile.repo";
import { createInMemorySessionMetadataRepo } from "../../src/modules/sessions/session.repo";
import { createInMemorySessionSecretStore } from "../../src/modules/sessions/session.service";
import {
  createSignedTelegramInitData,
  TEST_TELEGRAM_BOT_TOKEN,
} from "../../../../packages/shared/src/testing/telegram-fixtures";

async function buildSharedApp() {
  return buildApp({
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
    reportQueueJobRunner: async (input) => ({
      artifactId: input.artifactId,
      bytes: Buffer.from("%PDF-isolation"),
      fileName: input.artifactFileName,
    }),
  });
}

async function createAuthorizedSession(input: {
  app: Awaited<ReturnType<typeof buildApp>>;
  telegramUserId: number;
  username: string;
}) {
  const initData = createSignedTelegramInitData({
    queryId: `query-${input.telegramUserId}`,
    user: {
      first_name: "Ada",
      id: input.telegramUserId,
      language_code: "en",
      last_name: "Lovelace",
      username: input.username,
    },
  });

  const profileResponse = await input.app.inject({
    method: "POST",
    payload: {
      firstName: "Ada",
      initData,
      lastName: "Lovelace",
      preferredName: "Ada",
    },
    url: "/api/profiles",
  });
  expect(profileResponse.statusCode).toBe(201);

  const sessionResponse = await input.app.inject({
    headers: {
      "x-telegram-init-data": initData,
    },
    method: "POST",
    payload: {
      apiKey: "sk-test",
      provider: "openai",
    },
    url: "/api/providers/connect",
  });
  expect(sessionResponse.statusCode).toBe(200);

  const payload = sessionResponse.json() as {
    session: { id: string; userId: string };
    sessionToken: string;
  };

  return {
    sessionId: payload.session.id,
    sessionToken: payload.sessionToken,
    userId: payload.session.userId,
  };
}

async function queueCursiveArtifact(input: {
  app: Awaited<ReturnType<typeof buildApp>>;
  sessionId: string;
  sessionToken: string;
}) {
  const previewResponse = await input.app.inject({
    headers: {
      authorization: `Bearer ${input.sessionToken}`,
    },
    method: "POST",
    payload: {
      botId: "document_wizard",
      intake: {
        account_reference: "Account ending 1234",
        bureau_choice: "TransUnion",
        consumer_address: "123 Main Street\nDallas, TX 75001",
        consumer_name: "Jane Doe",
        dispute_reason: "This late payment was reported inaccurately.",
      },
      sessionId: input.sessionId,
    },
    url: "/api/reports/cursive/credit-bureau-dispute/preview",
  });
  expect(previewResponse.statusCode).toBe(200);

  const previewPayload = previewResponse.json() as {
    html: string;
    previewSnapshot: unknown;
    previewToken: string;
  };

  const saveResponse = await input.app.inject({
    headers: {
      authorization: `Bearer ${input.sessionToken}`,
    },
    method: "POST",
    payload: {
      botId: "document_wizard",
      previewHtml: previewPayload.html,
      previewSnapshot: previewPayload.previewSnapshot,
      previewToken: previewPayload.previewToken,
      sessionId: input.sessionId,
    },
    url: "/api/reports/cursive/credit-bureau-dispute/save-pdf-draft",
  });
  expect(saveResponse.statusCode).toBe(202);

  return saveResponse.json() as {
    artifact: {
      id: string;
    };
  };
}

async function queueTopSecretArtifact(input: {
  app: Awaited<ReturnType<typeof buildApp>>;
  sessionId: string;
  sessionToken: string;
}) {
  const response = await input.app.inject({
    headers: {
      authorization: `Bearer ${input.sessionToken}`,
    },
    method: "POST",
    payload: {
      botId: "verifier",
      claims: ["Income tax is voluntary."],
      sessionId: input.sessionId,
    },
    url: "/api/reports/top-secret/claim-review",
  });
  expect(response.statusCode).toBe(202);

  return response.json() as {
    artifact: {
      id: string;
    };
  };
}

async function listArtifacts(input: {
  app: Awaited<ReturnType<typeof buildApp>>;
  sessionId: string;
  sessionToken: string;
}) {
  const response = await input.app.inject({
    headers: {
      authorization: `Bearer ${input.sessionToken}`,
    },
    method: "GET",
    url: `/api/reports/artifacts?sessionId=${encodeURIComponent(
      input.sessionId,
    )}`,
  });
  expect(response.statusCode).toBe(200);

  return response.json() as {
    artifacts: Array<{
      botId: string;
      downloadUrl: string | null;
      fileName: string;
      id: string;
      status: "queued" | "ready" | "failed";
    }>;
  };
}

describe("report artifact isolation", () => {
  it("keeps simultaneous Cursive and Top Secret PDFs isolated by session and user", async () => {
    const app = await buildSharedApp();
    const cursiveUser = await createAuthorizedSession({
      app,
      telegramUserId: 123501,
      username: "cursive_user",
    });
    const topSecretUser = await createAuthorizedSession({
      app,
      telegramUserId: 123502,
      username: "top_secret_user",
    });
    const sameUserOtherSessionId = "same-user-other-session";

    const cursiveQueued = await queueCursiveArtifact({
      app,
      sessionId: cursiveUser.sessionId,
      sessionToken: cursiveUser.sessionToken,
    });
    const topSecretQueued = await queueTopSecretArtifact({
      app,
      sessionId: topSecretUser.sessionId,
      sessionToken: topSecretUser.sessionToken,
    });

    await Promise.all([
      app.reportService.waitForArtifact(cursiveQueued.artifact.id, {
        timeoutMs: 30000,
      }),
      app.reportService.waitForArtifact(topSecretQueued.artifact.id, {
        timeoutMs: 30000,
      }),
    ]);

    const cursiveList = await listArtifacts({
      app,
      sessionId: cursiveUser.sessionId,
      sessionToken: cursiveUser.sessionToken,
    });
    const topSecretList = await listArtifacts({
      app,
      sessionId: topSecretUser.sessionId,
      sessionToken: topSecretUser.sessionToken,
    });

    expect(cursiveList.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          botId: "document_wizard",
          fileName: "credit-bureau-dispute-letter.pdf",
          id: cursiveQueued.artifact.id,
          status: "ready",
        }),
      ]),
    );
    expect(cursiveList.artifacts).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: topSecretQueued.artifact.id,
        }),
      ]),
    );
    expect(topSecretList.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          botId: "verifier",
          fileName: "top_secret_user_top_secret_review.pdf",
          id: topSecretQueued.artifact.id,
          status: "ready",
        }),
      ]),
    );
    expect(topSecretList.artifacts).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: cursiveQueued.artifact.id,
        }),
      ]),
    );

    const crossUserDownload = await app.inject({
      headers: {
        authorization: `Bearer ${topSecretUser.sessionToken}`,
      },
      method: "GET",
      url: `/api/reports/artifacts/${
        cursiveQueued.artifact.id
      }/download?sessionId=${encodeURIComponent(topSecretUser.sessionId)}`,
    });

    expect(crossUserDownload.statusCode).toBe(404);
    expect(crossUserDownload.json()).toMatchObject({
      message: "artifact not found",
    });

    const crossSessionDownload = await app.inject({
      headers: {
        authorization: `Bearer ${topSecretUser.sessionToken}`,
      },
      method: "GET",
      url: `/api/reports/artifacts/${topSecretQueued.artifact.id}/download?sessionId=${encodeURIComponent(
        sameUserOtherSessionId,
      )}`,
    });

    expect(crossSessionDownload.statusCode).toBe(401);
  }, 40000);
});
