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

const removalDemandInput = {
  consumer: {
    fullName: "Jane Doe",
    mailingAddressLines: ["123 Main Street", "Dallas, TX 75001"],
  },
  bureau: {
    name: "TransUnion",
    mailingAddressLines: ["Consumer Solutions", "P.O. Box 2000", "Chester, PA 19016-2000"],
  },
  generatedDate: "May 20, 2026",
  violationType: "different_balances_across_bureaus",
  violationLabel: "Different balances across bureaus",
  doctrine: "documented_inconsistency",
  tradeline: {
    furnisherName: "Example Bank",
    maskedAccountIdentifier: "Account ending 1234",
  },
  reportedFacts: {
    targetBureauFactLabel: "balance",
    targetBureauReportedValue: "$4,812",
  },
  conflictFacts: {
    comparedBureauFacts: [
      {
        bureauName: "Experian",
        reportedValue: "$0",
      },
    ],
    conflictSummary:
      "Experian reports a $0 balance while TransUnion reports $4,812.",
  },
  evidenceSummary: "Tri-merge report excerpt dated May 1, 2026",
  enclosureLabels: ["Tri-merge report excerpt"],
  statuteMappingId: "cra_cross_bureau_inconsistency",
};

describe("cursive v2 bureau removal-demand routes", () => {
  it("previews and queues a validated bureau removal-demand PDF artifact", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const previewResponse = await app.inject({
      method: "POST",
      url: "/api/reports/cursive/bureau-removal-demand/preview",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        botId: "document_wizard",
        input: removalDemandInput,
        sessionId,
      },
    });

    expect(previewResponse.statusCode).toBe(200);
    const previewPayload = previewResponse.json() as {
      format: "html";
      html: string;
      portalText: string;
      previewSnapshot: {
        templateSlug: "bureau_removal_demand";
        bureauName: string;
        consumerName: string;
        violationType: string;
      };
      previewToken: string;
      templateSlug: string;
    };

    expect(previewPayload).toMatchObject({
      format: "html",
      templateSlug: "bureau_removal_demand",
      previewSnapshot: {
        templateSlug: "bureau_removal_demand",
        bureauName: "TransUnion",
        consumerName: "Jane Doe",
        violationType: "different_balances_across_bureaus",
      },
    });
    expect(previewPayload.html).toContain("Bureau Removal Demand Letter");
    expect(previewPayload.html).toContain("Demand for Removal");
    expect(previewPayload.html).toContain("written proof of deletion");
    expect(previewPayload.html).toContain(
      "this same account is reported differently elsewhere",
    );
    expect(previewPayload.html).not.toContain("high-confidence matched tradeline");
    expect(previewPayload.portalText).toContain("Fair Credit Reporting Act");
    expect(previewPayload.portalText).not.toContain("<");

    const saveResponse = await app.inject({
      method: "POST",
      url: "/api/reports/cursive/bureau-removal-demand/save-pdf-draft",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        botId: "document_wizard",
        previewHtml: previewPayload.html,
        previewSnapshot: previewPayload.previewSnapshot,
        previewToken: previewPayload.previewToken,
        sessionId,
      },
    });

    expect(saveResponse.statusCode).toBe(202);
    expect(saveResponse.json()).toMatchObject({
      artifactType: "pdf",
      status: "queued",
      artifact: {
        fileName: "bureau-removal-demand-letter.pdf",
        originalFilename: "bureau-removal-demand-preview.html",
        status: "queued",
      },
    });

    const savePayload = saveResponse.json() as {
      artifact: { id: string };
    };
    const storedArtifact = await app.reportService.waitForArtifact(
      savePayload.artifact.id,
      { timeoutMs: 30000 },
    );

    expect(storedArtifact.templateId).toBe("bureau_removal_demand_v2");
    expect(storedArtifact.fileBytes?.subarray(0, 5).toString("utf8")).toBe(
      "%PDF-",
    );
  }, 40000);

  it(
    "rejects forbidden v2 template language before preview",
    async () => {
      const { app, sessionId, sessionToken } = await createAuthorizedSession();

      const response = await app.inject({
        method: "POST",
        url: "/api/reports/cursive/bureau-removal-demand/preview",
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          botId: "document_wizard",
          input: {
            ...removalDemandInput,
            conflictFacts: {
              comparedBureauFacts: [],
              conflictSummary: "Please verify this account.",
            },
          },
          sessionId,
        },
      });

      expect(response.statusCode).toBe(422);
      expect(response.json()).toMatchObject({
        message: "forbidden bureau-removal-demand language",
      });
    },
    40000,
  );

  it("rejects malformed v2 request shape before preview", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const response = await app.inject({
      method: "POST",
      url: "/api/reports/cursive/bureau-removal-demand/preview",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        botId: "document_wizard",
        input: {
          ...removalDemandInput,
          consumer: undefined,
        },
        sessionId,
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({
      message: "consumer is required",
    });
  });

  it(
    "rejects a non-removal-demand preview token on the v2 save route",
    async () => {
      const { app, sessionId, sessionToken } = await createAuthorizedSession();

      const previewResponse = await app.inject({
        method: "POST",
        url: "/api/reports/cursive/credit-bureau-dispute/preview",
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          botId: "document_wizard",
          intake: {
            consumer_name: "Jane Doe",
            consumer_address: "123 Main Street",
            bureau_choice: "experian",
            account_reference: "Example Bank account ending 1234",
            dispute_reason: "The balance is being reported inaccurately.",
          },
          sessionId,
        },
      });

      expect(previewResponse.statusCode).toBe(200);
      const previewPayload = previewResponse.json() as {
        html: string;
        previewSnapshot: unknown;
        previewToken: string;
      };

      const saveResponse = await app.inject({
        method: "POST",
        url: "/api/reports/cursive/bureau-removal-demand/save-pdf-draft",
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          botId: "document_wizard",
          previewHtml: previewPayload.html,
          previewSnapshot: previewPayload.previewSnapshot,
          previewToken: previewPayload.previewToken,
          sessionId,
        },
      });

      expect(saveResponse.statusCode).toBe(400);
      expect(saveResponse.json()).toMatchObject({
        message: "Preview is required before saving the PDF draft.",
      });
    },
    40000,
  );
});
