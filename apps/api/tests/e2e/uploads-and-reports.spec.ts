import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import { readEnv } from "../../src/config/env";
import { createInMemoryProfileRepo } from "../../src/modules/profiles/profile.repo";
import { createInMemorySessionMetadataRepo } from "../../src/modules/sessions/session.repo";
import { createInMemorySessionSecretStore } from "../../src/modules/sessions/session.service";
import {
  createSignedTelegramInitData,
  TEST_TELEGRAM_BOT_TOKEN,
} from "../../../../packages/shared/src/testing/telegram-fixtures";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function createAuthorizedSession(options?: Parameters<typeof buildApp>[0]) {
  const initData = createSignedTelegramInitData();
  const app = await buildApp({
    ...options,
    env: readEnv({
      APP_PORT: "3001",
      TELEGRAM_BOT_USERNAME: "sgt_playground_bot",
      TELEGRAM_BOT_TOKEN: TEST_TELEGRAM_BOT_TOKEN,
      PROFILE_REPO_MODE: "memory",
      PROVIDER_VALIDATION_MODE: "stub",
    }),
    profileRepo: options?.profileRepo ?? createInMemoryProfileRepo(),
    sessionMetadataRepo:
      options?.sessionMetadataRepo ?? createInMemorySessionMetadataRepo(),
    sessionSecretStore:
      options?.sessionSecretStore ?? createInMemorySessionSecretStore(),
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
    session: {
      id: string;
      userId: string;
    };
    sessionToken: string;
  };

  return {
    app,
    sessionId: payload.session.id,
    sessionToken: payload.sessionToken,
    userId: payload.session.userId,
  };
}

function createLargePdfBase64(minimumBytes: number) {
  const header = "%PDF-1.4\n1 0 obj\n<<>>\nendobj\n";
  const trailer = "\nxref\n0 1\n0000000000 65535 f \ntrailer\n<<>>\n%%EOF\n";
  const fillerSize = Math.max(0, minimumBytes - header.length - trailer.length);
  const filler = "A".repeat(fillerSize);

  return Buffer.from(`${header}${filler}${trailer}`, "utf8").toString("base64");
}

describe("document wizard uploads and reports", () => {
  it("matches the planned phase 4 persistence schema contract", async () => {
    const sql = await readFile(
      new URL(
        "../../../../supabase/migrations/004_uploads_and_artifacts.sql",
        import.meta.url,
      ),
      "utf8",
    );

    expect(sql).toContain("create table uploads");
    expect(sql).toContain("original_filename text not null");
    expect(sql).toContain("mime_type text not null");
    expect(sql).toContain("virus_scan_status text not null");
    expect(sql).toContain("parse_status text not null");
    expect(sql).toContain("storage_path text not null");
    expect(sql).toContain("create table artifacts");
    expect(sql).toContain("artifact_type text not null");
    expect(sql).toContain("template_id text");
  });

  it(
    "accepts a pdf upload for document wizard and queues a report artifact",
    async () => {
      const { app, sessionId, sessionToken } = await createAuthorizedSession();

      const response = await app.inject({
        method: "POST",
        url: "/api/reports/document-wizard",
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          sessionId,
          botId: "document_wizard",
          filename: "sample.pdf",
          mimeType: "application/pdf",
          fileBytesBase64: Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n").toString("base64"),
          formData: {
            clientName: "Acme Co",
            objective: "Summarize the uploaded agreement",
          },
        },
      });

      expect(response.statusCode).toBe(202);
      const payload = response.json() as {
        artifactType: string;
        status: string;
        artifact: {
          id?: string;
          fileName: string;
          status: string;
        };
        upload: {
          originalFilename: string;
          mimeType: string;
        };
      };

      expect(payload).toMatchObject({
        status: "queued",
        artifactType: "pdf",
        artifact: {
          fileName: "document-wizard-report.pdf",
          status: "queued",
        },
        upload: {
          originalFilename: "sample.pdf",
          mimeType: "application/pdf",
        },
      });

      expect(typeof payload.artifact.id).toBe("string");
      const storedArtifact = await app.reportService.waitForArtifact(
        String(payload.artifact.id),
        { timeoutMs: 30000 },
      );

      const fileBytes = storedArtifact.fileBytes;
      expect(fileBytes).toBeDefined();
      expect(fileBytes).toBeInstanceOf(Buffer);
      expect(fileBytes?.subarray(0, 5).toString("utf8")).toBe("%PDF-");
      expect(storedArtifact.fileName).toBe("document-wizard-report.pdf");
      expect(storedArtifact.storagePath).toContain(".pdf");
    },
    40000,
  );

  it("accepts base64 pdf uploads above Fastify's default body limit", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const response = await app.inject({
      method: "POST",
      url: "/api/reports/document-wizard",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "document_wizard",
        filename: "large-sample.pdf",
        mimeType: "application/pdf",
        fileBytesBase64: createLargePdfBase64(900 * 1024),
        formData: {
          clientName: "Acme Co",
          objective: "Summarize the uploaded agreement",
        },
      },
    });

    expect(response.statusCode).toBe(202);
  });

  it("rejects non-pdf uploads for document wizard", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const response = await app.inject({
      method: "POST",
      url: "/api/reports/document-wizard",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "document_wizard",
        filename: "sample.txt",
        mimeType: "text/plain",
        fileBytesBase64: Buffer.from("plain text").toString("base64"),
        formData: {
          clientName: "Acme Co",
          objective: "Summarize the uploaded agreement",
        },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      message: "pdf uploads only",
    });
  });

  it("rejects spoofed pdf uploads when bytes contain only a fake pdf header", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const response = await app.inject({
      method: "POST",
      url: "/api/reports/document-wizard",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "document_wizard",
        filename: "sample.pdf",
        mimeType: "application/pdf",
        fileBytesBase64: Buffer.from(
          "%PDF-this is not a real pdf at all",
        ).toString("base64"),
        formData: {
          clientName: "Acme Co",
          objective: "Summarize the uploaded agreement",
        },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      message: "invalid pdf file",
    });
  });

  it("surfaces render failures gracefully after the background job fails", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession({
      reportQueueJobRunner: async () => {
        throw new Error("render failed on purpose");
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/reports/document-wizard",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "document_wizard",
        filename: "sample.pdf",
        mimeType: "application/pdf",
        fileBytesBase64: Buffer.from(
          "%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n",
        ).toString("base64"),
        formData: {
          clientName: "Acme Co",
          objective: "Summarize the uploaded agreement",
        },
      },
    });

    expect(response.statusCode).toBe(202);
    const payload = response.json() as {
      artifact: {
        id?: string;
      };
    };

    expect(typeof payload.artifact.id).toBe("string");

    await new Promise((resolve) => {
      setTimeout(resolve, 25);
    });

    await expect(
      app.reportService.waitForArtifact(String(payload.artifact.id), {
        timeoutMs: 5000,
      }),
    ).rejects.toThrow("render failed on purpose");

    expect(app.reportService.getArtifact(String(payload.artifact.id))).toMatchObject({
      status: "failed",
      failureReason: "render failed on purpose",
    });
  });
});
