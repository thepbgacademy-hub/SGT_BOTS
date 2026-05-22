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

async function createAuthorizedSession(options?: {
  provider?: "openai" | "anthropic";
  providerValidationMode?: "live" | "stub";
}) {
  const initData = createSignedTelegramInitData();
  const app = await buildApp({
    env: readEnv({
      APP_PORT: "3001",
      TELEGRAM_BOT_USERNAME: "sgt_playground_bot",
      TELEGRAM_BOT_TOKEN: TEST_TELEGRAM_BOT_TOKEN,
      PROFILE_REPO_MODE: "memory",
      PROVIDER_VALIDATION_MODE: options?.providerValidationMode ?? "stub",
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
      provider: options?.provider ?? "openai",
      apiKey: "sk-test",
    },
  });
  expect(sessionResponse.statusCode).toBe(200);

  const payload = sessionResponse.json() as {
    session: {
      id: string;
    };
    sessionToken: string;
  };

  return {
    app,
    sessionId: payload.session.id,
    sessionToken: payload.sessionToken,
  };
}

describe("cursive credit bureau dispute preview route", () => {
  it(
    "renders preview html from official intake without touching the queue flow",
    async () => {
      const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const response = await app.inject({
      method: "POST",
      url: "/api/reports/cursive/credit-bureau-dispute/preview",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "document_wizard",
        intake: {
          consumer_name: "Jane Doe",
          consumer_address: "123 Main Street\nDallas, TX 75001",
          bureau_choice: "TransUnion",
          account_reference: "Account ending 1234",
          dispute_reason: "This late payment was reported inaccurately.",
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      categorySlug: "credit_bureau_dispute",
      format: "html",
      html: expect.any(String),
      portalText: expect.any(String),
      previewSnapshot: expect.objectContaining({
        categorySlug: "credit_bureau_dispute",
        consumerName: "Jane Doe",
        bureauName: "TransUnion",
      }),
    });

    const payload = response.json() as {
      categorySlug: string;
      format: string;
      html: string;
      portalText: string;
      previewSnapshot: {
        categorySlug: "credit_bureau_dispute";
        generatedDate: string;
        consumerName: string;
        consumerAddressLines: string[];
        bureauName: string;
        bureauAddressLines: string[];
        subjectLine: string;
        salutation: string;
        bodyParagraphs: string[];
        closing: string;
        enclosures?: string[];
        citations: string[];
        portalText: string;
      };
    };

    expect(payload.html).toContain("Credit Bureau Dispute Letter");
    expect(payload.html).toContain("Jane Doe");
    expect(payload.html).toContain("TransUnion");
    expect(payload.html).toContain("Account ending 1234");
    expect(payload.html).toContain("letter-subject");
    expect(payload.html).toContain("15 U.S.C. Sec. 1681i");
    expect(payload.html).toContain("<sup>1</sup>");
    expect(payload.html).toContain("credit-bureau-dispute-letter");
    expect(payload.portalText).toContain("Jane Doe");
    expect(payload.portalText).toContain("TransUnion");
    expect(payload.portalText).toContain("Account ending 1234");
    expect(payload.previewSnapshot.subjectLine).toContain("Account ending 1234");
    expect(payload.previewSnapshot.enclosures).toEqual([
      "Photocopy of government-issued identification",
      "Photocopy of Social Security card",
    ]);
    expect(payload.portalText).toContain("[1] 15 U.S.C. Secs. 1681 et seq. (FCRA)");
    expect(payload.portalText).toContain("[3] 15 U.S.C. Sec. 1681i");
    expect(payload.portalText).not.toContain("<sup>");
    expect(payload.previewSnapshot.portalText).toBe(payload.portalText);
    expect(payload.previewSnapshot.generatedDate.length).toBeGreaterThan(0);
      expect(payload.previewSnapshot.bodyParagraphs).toHaveLength(4);
    },
    40000,
  );

  it("rejects non-Cursive bots even if they support structured forms", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const response = await app.inject({
      method: "POST",
      url: "/api/reports/cursive/credit-bureau-dispute/preview",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "form_wizard",
        intake: {
          consumer_name: "Jane Doe",
          consumer_address: "123 Main Street",
          bureau_choice: "Experian",
          account_reference: "Account ending 1234",
          dispute_reason: "This account does not belong to me.",
        },
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      message: "bot not found",
    });
  });

  it("fails cleanly when official intake is incomplete", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const response = await app.inject({
      method: "POST",
      url: "/api/reports/cursive/credit-bureau-dispute/preview",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "document_wizard",
        intake: {
          consumer_name: "Jane Doe",
          consumer_address: "",
          bureau_choice: "Experian",
          account_reference: "",
          dispute_reason: "This account does not belong to me.",
        },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      message:
        "Missing required intake fields: Mailing address, Account reference",
    });
  });

  it("fails cleanly when the selected bureau is unsupported", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const response = await app.inject({
      method: "POST",
      url: "/api/reports/cursive/credit-bureau-dispute/preview",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "document_wizard",
        intake: {
          consumer_name: "Jane Doe",
          consumer_address: "123 Main Street",
          bureau_choice: "Unknown Bureau",
          account_reference: "Account ending 1234",
          dispute_reason: "This account does not belong to me.",
        },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      message: "invalid credit bureau",
    });
  });

  it("surfaces live provider draft failures instead of returning a fake successful preview", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: [] }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => "provider unavailable",
        }),
    );

    const { app, sessionId, sessionToken } = await createAuthorizedSession({
      providerValidationMode: "live",
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/reports/cursive/credit-bureau-dispute/preview",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "document_wizard",
        intake: {
          consumer_name: "Jane Doe",
          consumer_address: "123 Main Street\nDallas, TX 75001",
          bureau_choice: "Experian",
          account_reference: "Account ending 1234",
          dispute_reason: "This late payment was reported inaccurately.",
        },
      },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({
      message:
        "Unable to generate the Cursive draft with your connected provider right now. Please retry or reconnect your provider.",
    });
  });

  it("normalizes malformed provider draft output into the same recoverable preview error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    subjectLine: "Dispute notice",
                  }),
                },
              },
            ],
          }),
        }),
    );

    const { app, sessionId, sessionToken } = await createAuthorizedSession({
      providerValidationMode: "live",
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/reports/cursive/credit-bureau-dispute/preview",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "document_wizard",
        intake: {
          consumer_name: "Jane Doe",
          consumer_address: "123 Main Street\nDallas, TX 75001",
          bureau_choice: "Experian",
          account_reference: "Account ending 1234",
          dispute_reason: "This late payment was reported inaccurately.",
        },
      },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({
      message:
        "Unable to generate the Cursive draft with your connected provider right now. Please retry or reconnect your provider.",
    });
  });

  it("normalizes truly malformed provider draft JSON into the same recoverable preview error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: '{"subjectLine":"Dispute notice","disputeSummary":"missing quote}',
                },
              },
            ],
          }),
        }),
    );

    const { app, sessionId, sessionToken } = await createAuthorizedSession({
      providerValidationMode: "live",
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/reports/cursive/credit-bureau-dispute/preview",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "document_wizard",
        intake: {
          consumer_name: "Jane Doe",
          consumer_address: "123 Main Street\nDallas, TX 75001",
          bureau_choice: "Experian",
          account_reference: "Account ending 1234",
          dispute_reason: "This late payment was reported inaccurately.",
        },
      },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({
      message:
        "Unable to generate the Cursive draft with your connected provider right now. Please retry or reconnect your provider.",
    });
  });

  it("fails loudly when the draft review pass detects forbidden representation language", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    subjectLine: "Re: Experian dispute for Account ending 1234",
                    disputeSummary:
                      "As your legal counsel, I demand correction of this late payment because the account was paid on time.",
                  }),
                },
              },
            ],
          }),
        }),
    );

    const { app, sessionId, sessionToken } = await createAuthorizedSession({
      providerValidationMode: "live",
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/reports/cursive/credit-bureau-dispute/preview",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "document_wizard",
        intake: {
          consumer_name: "Jane Doe",
          consumer_address: "123 Main Street\nDallas, TX 75001",
          bureau_choice: "Experian",
          account_reference: "Account ending 1234",
          dispute_reason: "This late payment was reported inaccurately.",
        },
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({
      message:
        "Cursive draft review failed: Draft includes legal representation language that is not allowed in Cursive output.",
    });
  });

  it(
    "queues a pdf draft from the exact previewed html using the cursive template",
    async () => {
      const { app, sessionId, sessionToken } = await createAuthorizedSession();

      const previewResponse = await app.inject({
        method: "POST",
        url: "/api/reports/cursive/credit-bureau-dispute/preview",
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          sessionId,
          botId: "document_wizard",
          intake: {
            consumer_name: "Jane Doe",
            consumer_address: "123 Main Street\nDallas, TX 75001",
            bureau_choice: "TransUnion",
            account_reference: "Account ending 1234",
            dispute_reason: "This late payment was reported inaccurately.",
          },
        },
      });

      expect(previewResponse.statusCode).toBe(200);

      const previewPayload = previewResponse.json() as {
        html: string;
        previewSnapshot: {
          categorySlug: "credit_bureau_dispute";
          generatedDate: string;
          consumerName: string;
          consumerAddressLines: string[];
          bureauName: string;
          bureauAddressLines: string[];
          subjectLine: string;
          salutation: string;
          bodyParagraphs: string[];
          closing: string;
          citations: string[];
          portalText: string;
        };
        previewToken: string;
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/reports/cursive/credit-bureau-dispute/save-pdf-draft",
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          previewHtml: previewPayload.html,
          previewSnapshot: previewPayload.previewSnapshot,
          previewToken: previewPayload.previewToken,
          sessionId,
          botId: "document_wizard",
        },
      });

      expect(response.statusCode).toBe(202);
      expect(response.json()).toMatchObject({
        status: "queued",
        artifactType: "pdf",
        artifact: {
          fileName: "credit-bureau-dispute-letter.pdf",
          status: "queued",
        },
      });

      const payload = response.json() as {
        artifact: {
          id?: string;
          fileName: string;
        };
      };

      expect(typeof payload.artifact.id).toBe("string");

      const storedArtifact = await app.reportService.waitForArtifact(
        String(payload.artifact.id),
        { timeoutMs: 30000 },
      );

      expect(storedArtifact.fileName).toBe("credit-bureau-dispute-letter.pdf");
      expect(storedArtifact.fileBytes?.subarray(0, 5).toString("utf8")).toBe(
        "%PDF-",
      );
      expect(storedArtifact.templateId).toBe("credit_bureau_dispute_v1");
      expect(storedArtifact.originalFilename).toBe(
        "credit-bureau-dispute-preview.html",
      );
      expect(storedArtifact.cursiveDraftSnapshot).toEqual(
        previewPayload.previewSnapshot,
      );
      expect(storedArtifact.storagePath).toContain(
        "credit-bureau-dispute-letter.pdf",
      );
    },
    40000,
  );

  it(
    "rejects saving a pdf draft without a trusted preview token",
    async () => {
      const { app, sessionId, sessionToken } = await createAuthorizedSession();

      const response = await app.inject({
        method: "POST",
        url: "/api/reports/cursive/credit-bureau-dispute/save-pdf-draft",
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          sessionId,
          botId: "document_wizard",
          previewHtml: "<html><body>forged</body></html>",
          previewToken: "not-a-real-preview-token",
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        message: "Preview is required before saving the PDF draft.",
      });
    },
    40000,
  );
});
