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

function pdfBase64(text: string) {
  return Buffer.from(`%PDF-1.4\n1 0 obj\n${text}\nendobj\n%%EOF`).toString(
    "base64",
  );
}

const triMergeReportText = [
  "Consumer: Ada Lovelace",
  "Address: 123 Example Street;Dallas, TX 75001",
  "Furnisher: Example Bank",
  "Account: Account ending 4242",
  "Experian balance: $0",
  "TransUnion balance: $4,812",
].join("\n");

const singleBureauReportText = [
  "Consumer: Ada Lovelace",
  "Address: 123 Example Street;Dallas, TX 75001",
  "Bureau: Experian",
  "Furnisher: Example Bank",
  "Account: Account ending 4242",
  "Reported inaccurate information: closed account reported as open",
  "Proof: account closure letter dated May 1, 2026",
].join("\n");

describe("cursive upload report analysis routes", () => {
  it(
    "analyzes a tri-merge report and batch-generates confirmed removal-demand letters",
    async () => {
      const { app, sessionId, sessionToken } = await createAuthorizedSession();

      const analyzeResponse = await app.inject({
        method: "POST",
        url: "/api/reports/cursive/upload-analysis/analyze",
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          botId: "document_wizard",
          fileBytesBase64: pdfBase64(triMergeReportText),
          filename: "tri-merge-report.pdf",
          mimeType: "application/pdf",
          reportType: "tri_merge",
          sessionId,
        },
      });

      expect(analyzeResponse.statusCode).toBe(200);
      const analyzePayload = analyzeResponse.json() as {
        consumer: {
          fullName: string;
          mailingAddressLines: string[];
        };
        issues: Array<{
          id: string;
          targetBureau: string;
          violationType: string;
        }>;
        upload: {
          id: string;
          originalFilename: string;
        };
      };

      expect(analyzePayload.consumer).toMatchObject({
        fullName: "Ada Lovelace",
        mailingAddressLines: ["123 Example Street", "Dallas, TX 75001"],
      });
      expect(analyzePayload.upload.originalFilename).toBe("tri-merge-report.pdf");
      expect(analyzePayload.issues).toEqual([
        expect.objectContaining({
          id: "issue-balance-inconsistency-1",
          targetBureau: "TransUnion",
          violationType: "different_balances_across_bureaus",
        }),
      ]);

      const generateResponse = await app.inject({
        method: "POST",
        url: "/api/reports/cursive/upload-analysis/generate",
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          botId: "document_wizard",
          confirmedIssueIds: [analyzePayload.issues[0].id],
          consumer: analyzePayload.consumer,
          reportType: "tri_merge",
          sessionId,
          uploadId: analyzePayload.upload.id,
        },
      });

      expect(generateResponse.statusCode).toBe(202);
      const generatePayload = generateResponse.json() as {
        artifacts: Array<{ id: string; fileName: string; status: string }>;
        status: string;
      };

      expect(generatePayload).toMatchObject({
        status: "queued",
        artifacts: [
          {
            fileName: "bureau-removal-demand-letter.pdf",
            status: "queued",
          },
        ],
      });

      const storedArtifact = await app.reportService.waitForArtifact(
        generatePayload.artifacts[0].id,
        { timeoutMs: 60000 },
      );

      expect(storedArtifact.uploadId).toBe(analyzePayload.upload.id);
      expect(storedArtifact.fileBytes?.subarray(0, 5).toString("utf8")).toBe(
        "%PDF-",
      );
    },
    70000,
  );

  it(
    "analyzes a single-bureau report and generates a proof-backed removal-demand letter",
    async () => {
      const { app, sessionId, sessionToken } = await createAuthorizedSession();

      const analyzeResponse = await app.inject({
        method: "POST",
        url: "/api/reports/cursive/upload-analysis/analyze",
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          botId: "document_wizard",
          fileBytesBase64: pdfBase64(singleBureauReportText),
          filename: "experian-report.pdf",
          mimeType: "application/pdf",
          reportType: "single_bureau",
          sessionId,
        },
      });

      expect(analyzeResponse.statusCode).toBe(200);
      const analyzePayload = analyzeResponse.json() as {
        consumer: {
          fullName: string;
          mailingAddressLines: string[];
        };
        issues: Array<{
          id: string;
          proofFacts?: {
            proofSummary: string;
            reportedInaccurateInformation: string;
          };
          targetBureau: string;
          violationType: string;
        }>;
        upload: {
          id: string;
          originalFilename: string;
        };
      };

      expect(analyzePayload.consumer).toMatchObject({
        fullName: "Ada Lovelace",
        mailingAddressLines: ["123 Example Street", "Dallas, TX 75001"],
      });
      expect(analyzePayload.upload.originalFilename).toBe("experian-report.pdf");
      expect(analyzePayload.issues).toEqual([
        expect.objectContaining({
          id: "issue-single-bureau-proof-1",
          proofFacts: {
            proofSummary: "account closure letter dated May 1, 2026",
            reportedInaccurateInformation: "closed account reported as open",
          },
          targetBureau: "Experian",
          violationType: "closed_account_reported_as_open",
        }),
      ]);

      const generateResponse = await app.inject({
        method: "POST",
        url: "/api/reports/cursive/upload-analysis/generate",
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          botId: "document_wizard",
          confirmedIssueIds: [analyzePayload.issues[0].id],
          consumer: analyzePayload.consumer,
          reportType: "single_bureau",
          sessionId,
          uploadId: analyzePayload.upload.id,
        },
      });

      expect(generateResponse.statusCode).toBe(202);
      const generatePayload = generateResponse.json() as {
        artifacts: Array<{ id: string; fileName: string; status: string }>;
        status: string;
      };

      expect(generatePayload).toMatchObject({
        status: "queued",
        artifacts: [
          {
            fileName: "bureau-removal-demand-letter.pdf",
            status: "queued",
          },
        ],
      });

      const storedArtifact = await app.reportService.waitForArtifact(
        generatePayload.artifacts[0].id,
        { timeoutMs: 60000 },
      );

      expect(storedArtifact.uploadId).toBe(analyzePayload.upload.id);
      expect(storedArtifact.fileBytes?.subarray(0, 5).toString("utf8")).toBe(
        "%PDF-",
      );
    },
    70000,
  );

  it(
    "rejects upload-analysis generation without confirmed issues",
    async () => {
      const { app, sessionId, sessionToken } = await createAuthorizedSession();

      const response = await app.inject({
        method: "POST",
        url: "/api/reports/cursive/upload-analysis/generate",
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          botId: "document_wizard",
          confirmedIssueIds: [],
          reportType: "tri_merge",
          sessionId,
          uploadId: "missing-upload",
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        message: "confirmed issues are required",
      });
    },
    40000,
  );

  it(
    "does not confirm a single-bureau issue when proof is missing",
    async () => {
      const { app, sessionId, sessionToken } = await createAuthorizedSession();

      const analyzeResponse = await app.inject({
        method: "POST",
        url: "/api/reports/cursive/upload-analysis/analyze",
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          botId: "document_wizard",
          fileBytesBase64: pdfBase64(
            singleBureauReportText.replace(
              "Proof: account closure letter dated May 1, 2026",
              "",
            ),
          ),
          filename: "experian-report.pdf",
          mimeType: "application/pdf",
          reportType: "single_bureau",
          sessionId,
        },
      });

      expect(analyzeResponse.statusCode).toBe(200);
      const analyzePayload = analyzeResponse.json() as {
        issues: Array<{ id: string }>;
        upload: { id: string };
      };
      expect(analyzePayload.issues).toEqual([]);

      const generateResponse = await app.inject({
        method: "POST",
        url: "/api/reports/cursive/upload-analysis/generate",
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          botId: "document_wizard",
          confirmedIssueIds: ["issue-single-bureau-proof-1"],
          reportType: "single_bureau",
          sessionId,
          uploadId: analyzePayload.upload.id,
        },
      });

      expect(generateResponse.statusCode).toBe(400);
      expect(generateResponse.json()).toMatchObject({
        message: "confirmed issues are required",
      });
    },
    40000,
  );

  it(
    "does not infer a single-bureau issue when the target bureau is missing",
    async () => {
      const { app, sessionId, sessionToken } = await createAuthorizedSession();

      const analyzeResponse = await app.inject({
        method: "POST",
        url: "/api/reports/cursive/upload-analysis/analyze",
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          botId: "document_wizard",
          fileBytesBase64: pdfBase64(
            singleBureauReportText.replace("Bureau: Experian\n", ""),
          ),
          filename: "single-bureau-report.pdf",
          mimeType: "application/pdf",
          reportType: "single_bureau",
          sessionId,
        },
      });

      expect(analyzeResponse.statusCode).toBe(200);
      expect(analyzeResponse.json()).toMatchObject({
        issues: [],
      });
    },
    40000,
  );

  it(
    "does not map unsupported single-bureau proof text to account-not-mine",
    async () => {
      const { app, sessionId, sessionToken } = await createAuthorizedSession();

      const analyzeResponse = await app.inject({
        method: "POST",
        url: "/api/reports/cursive/upload-analysis/analyze",
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          botId: "document_wizard",
          fileBytesBase64: pdfBase64(
            singleBureauReportText.replace(
              "closed account reported as open",
              "incorrect balance reported",
            ),
          ),
          filename: "single-bureau-report.pdf",
          mimeType: "application/pdf",
          reportType: "single_bureau",
          sessionId,
        },
      });

      expect(analyzeResponse.statusCode).toBe(200);
      expect(analyzeResponse.json()).toMatchObject({
        issues: [],
      });
    },
    40000,
  );

  it("rejects upload-analysis generation for an unknown upload id", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const response = await app.inject({
      method: "POST",
      url: "/api/reports/cursive/upload-analysis/generate",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        botId: "document_wizard",
        confirmedIssueIds: ["issue-balance-inconsistency-1"],
        reportType: "tri_merge",
        sessionId,
        uploadId: "missing-upload",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      message: "invalid upload",
    });
  });

  it("rejects non-pdf upload-analysis input", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const response = await app.inject({
      method: "POST",
      url: "/api/reports/cursive/upload-analysis/analyze",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        botId: "document_wizard",
        fileBytesBase64: Buffer.from("not a pdf").toString("base64"),
        filename: "report.txt",
        mimeType: "text/plain",
        reportType: "tri_merge",
        sessionId,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      message: "pdf uploads only",
    });
  });
});
