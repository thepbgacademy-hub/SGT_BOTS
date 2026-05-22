import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";
import { readEnv } from "../../src/config/env";
import { createInMemoryProfileRepo } from "../../src/modules/profiles/profile.repo";
import { createInMemorySessionMetadataRepo } from "../../src/modules/sessions/session.repo";
import { createInMemorySessionSecretStore } from "../../src/modules/sessions/session.service";
import type { RenderReportJobRunner } from "../../../../workers/queue/src";
import {
  createSignedTelegramInitData,
  TEST_TELEGRAM_BOT_TOKEN,
} from "../../../../packages/shared/src/testing/telegram-fixtures";

async function createAuthorizedSession(options?: {
  reportQueueJobRunner?: RenderReportJobRunner;
}) {
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
    reportQueueJobRunner: options?.reportQueueJobRunner,
    sessionMetadataRepo: createInMemorySessionMetadataRepo(),
    sessionSecretStore: createInMemorySessionSecretStore(),
  });

  const profileResponse = await app.inject({
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

  const sessionResponse = await app.inject({
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
    session: { id: string };
    sessionToken: string;
  };

  return {
    app,
    sessionId: payload.session.id,
    sessionToken: payload.sessionToken,
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

describe("cursive artifact routes", () => {
  it("lists ready artifacts and downloads the rendered PDF", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();
    const queued = await queueCursiveArtifact({
      app,
      sessionId,
      sessionToken,
    });

    await app.reportService.waitForArtifact(queued.artifact.id, {
      timeoutMs: 60000,
    });

    const listResponse = await app.inject({
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      method: "GET",
      url: `/api/reports/artifacts?sessionId=${encodeURIComponent(sessionId)}`,
    });

    expect(listResponse.statusCode).toBe(200);
    const listPayload = listResponse.json() as {
      artifacts: Array<{
        downloadUrl: string;
      }>;
    };

    expect(listPayload.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          downloadUrl: expect.stringContaining(
            `/api/reports/artifacts/${queued.artifact.id}/download`,
          ),
          fileName: "credit-bureau-dispute-letter.pdf",
          id: queued.artifact.id,
          originalFilename: "credit-bureau-dispute-preview.html",
          status: "ready",
        }),
      ]),
    );

    const queuedArtifact = listPayload.artifacts.find(
      (artifact) => artifact.downloadUrl?.includes(queued.artifact.id),
    );

    if (!queuedArtifact) {
      throw new Error("Queued artifact missing from artifact list response.");
    }

    expect(queuedArtifact.downloadUrl).toContain("downloadToken=");
    expect(queuedArtifact.downloadUrl).toContain("expiresAt=");
    expect(queuedArtifact.downloadUrl).toContain("userId=");

    const downloadResponse = await app.inject({
      method: "GET",
      url: queuedArtifact.downloadUrl,
    });

    expect(downloadResponse.statusCode).toBe(200);
    expect(downloadResponse.headers["content-type"]).toContain("application/pdf");
    expect(downloadResponse.headers["content-disposition"]).toContain(
      "credit-bureau-dispute-letter.pdf",
    );
    expect(Buffer.from(downloadResponse.body).subarray(0, 5).toString("utf8")).toBe(
      "%PDF-",
    );

    const expiredUrl = new URL(`http://localhost${queuedArtifact.downloadUrl}`);
    expiredUrl.searchParams.set("expiresAt", String(Date.now() - 1));

    const expiredDownloadResponse = await app.inject({
      method: "GET",
      url: `${expiredUrl.pathname}${expiredUrl.search}`,
    });

    expect(expiredDownloadResponse.statusCode).toBe(401);
    expect(expiredDownloadResponse.json()).toMatchObject({
      message: "session token expired",
    });
  }, 70000);

  it(
    "surfaces failed artifact rendering loudly in the list and download route",
    async () => {
      const { app, sessionId, sessionToken } = await createAuthorizedSession({
        reportQueueJobRunner: async () => {
          throw new Error("render exploded");
        },
      });
      const queued = await queueCursiveArtifact({
        app,
        sessionId,
        sessionToken,
      });

      await expect(
        app.reportService.waitForArtifact(queued.artifact.id, {
          timeoutMs: 30000,
        }),
      ).rejects.toThrow("Unable to render this PDF draft right now.");

      const listResponse = await app.inject({
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        method: "GET",
        url: `/api/reports/artifacts?sessionId=${encodeURIComponent(sessionId)}`,
      });

      expect(listResponse.statusCode).toBe(200);
      const listPayload = listResponse.json() as {
        artifacts: Array<{
          downloadUrl: string | null;
          failureReason: string | null;
          id: string;
          status: "queued" | "ready" | "failed";
        }>;
      };

      expect(listPayload.artifacts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            downloadUrl: null,
            failureReason: "Unable to render this PDF draft right now.",
            id: queued.artifact.id,
            status: "failed",
          }),
        ]),
      );

      const downloadResponse = await app.inject({
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        method: "GET",
        url: `/api/reports/artifacts/${queued.artifact.id}/download?sessionId=${encodeURIComponent(
          sessionId,
        )}`,
      });

      expect(downloadResponse.statusCode).toBe(409);
      expect(downloadResponse.json()).toMatchObject({
        message: "artifact failed",
      });
    },
    40000,
  );
});
