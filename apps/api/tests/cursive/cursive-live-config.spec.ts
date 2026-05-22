import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import { readEnv, type AppEnv } from "../../src/config/env";
import { createCursiveConfigService } from "../../src/modules/cursive/cursive-live-config.service";
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

function createMemoryEnv(overrides?: Partial<AppEnv>): AppEnv {
  return {
    ...readEnv({
      APP_PORT: "3001",
      TELEGRAM_BOT_TOKEN: TEST_TELEGRAM_BOT_TOKEN,
      TELEGRAM_BOT_USERNAME: "sgt_playground_bot",
      PROFILE_REPO_MODE: "memory",
      PROVIDER_VALIDATION_MODE: "stub",
    }),
    ...overrides,
  };
}

function createLiveConfigFetch() {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);

    if (url.includes("/rest/v1/cursive_categories")) {
      return {
        ok: true,
        json: async () => [
          {
            slug: "credit_bureau_dispute",
            display_name: "Credit Bureau Dispute",
            helper_mode: "helper-only",
            output_modes: ["portal_text", "html_letter", "pdf_letter"],
            enabled: true,
            sort_order: 10,
            summary: "Live summary",
          },
        ],
      } satisfies Partial<Response>;
    }

    if (url.includes("/rest/v1/cursive_intake_schemas")) {
      return {
        ok: true,
        json: async () => [
          {
            category_slug: "credit_bureau_dispute",
            schema_version: "v2",
            helper_mode: "helper-only",
            intake_schema: {
              fields: [
                { key: "consumer_name", label: "Consumer name", required: true },
                { key: "consumer_address", label: "Mailing address", required: true },
                { key: "bureau_choice", label: "Credit bureau", required: true },
                { key: "account_reference", label: "Account reference", required: true },
                { key: "dispute_reason", label: "Dispute reason", required: true },
              ],
            },
          },
        ],
      } satisfies Partial<Response>;
    }

    if (url.includes("/rest/v1/cursive_prompts")) {
      return {
        ok: true,
        json: async () => [
          {
            category_slug: "credit_bureau_dispute",
            prompt_version: "v2",
            helper_mode: "helper-only",
            prompt_payload: {
              systemPrompt: "Live prompt",
              draftInstructions: ["Use the live prompt package."],
            },
          },
        ],
      } satisfies Partial<Response>;
    }

    if (url.includes("/rest/v1/cursive_templates")) {
      return {
        ok: true,
        json: async () => [
          {
            category_slug: "credit_bureau_dispute",
            template_version: "v2",
            helper_mode: "helper-only",
            template_payload: {
              salutation: "Dear Credit Bureau:",
              closing: "Respectfully,",
            },
          },
        ],
      } satisfies Partial<Response>;
    }

    if (url.includes("/rest/v1/cursive_citations")) {
      return {
        ok: true,
        json: async () => [
          {
            category_slug: "credit_bureau_dispute",
            citation_key: "fcra_611",
            citation_text: "15 U.S.C. Sec. 1681i",
            sort_order: 10,
          },
        ],
      } satisfies Partial<Response>;
    }

    if (url.includes("/rest/v1/cursive_addresses")) {
      return {
        ok: true,
        json: async () => [
          {
            category_slug: "credit_bureau_dispute",
            address_key: "transunion_disputes",
            organization_name: "TransUnion",
            attention_line: "Consumer Solutions",
            address_line_1: "P.O. Box 2000",
            address_line_2: "",
            city: "Chester",
            state: "PA",
            postal_code: "19016-2000",
            country: "US",
            sort_order: 10,
          },
        ],
      } satisfies Partial<Response>;
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  });
}

async function createAuthorizedSessionWithEnv(env: AppEnv) {
  const initData = createSignedTelegramInitData();
  const app = await buildApp({
    env,
    profileRepo: createInMemoryProfileRepo(),
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

describe("createCursiveConfigService", () => {
  it("falls back to repo defaults when Supabase env is absent", async () => {
    const service = createCursiveConfigService(createMemoryEnv());
    const config = await service.getCategoryConfig("credit_bureau_dispute");

    expect(config.promptProfile.promptVersion).toBe("v1");
    expect(config.templateDefaults.templatePayload.salutation).toBe(
      "To Whom It May Concern:",
    );
  });

  it("loads and validates live config from Supabase when env is present", async () => {
    const fetchImpl = createLiveConfigFetch();
    const service = createCursiveConfigService(
      createMemoryEnv({
        supabaseServiceRoleKey: "service-role",
        supabaseUrl: "http://kong:8000",
      }),
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    );

    const config = await service.getCategoryConfig("credit_bureau_dispute");

    expect(config.intakeSchema.schemaVersion).toBe("v2");
    expect(config.promptProfile.promptPayload.systemPrompt).toBe("Live prompt");
    expect(config.templateDefaults.templatePayload.salutation).toBe(
      "Dear Credit Bureau:",
    );
    expect(config.addresses).toEqual([
      expect.objectContaining({
        organizationName: "TransUnion",
      }),
    ]);
  });

  it("fails loudly when live Supabase config is present but incomplete", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.includes("/rest/v1/cursive_categories")) {
        return {
          ok: true,
          json: async () => [],
        } satisfies Partial<Response>;
      }

      return {
        ok: true,
        json: async () => [],
      } satisfies Partial<Response>;
    });

    const service = createCursiveConfigService(
      createMemoryEnv({
        supabaseServiceRoleKey: "service-role",
        supabaseUrl: "http://kong:8000",
      }),
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    );

    await expect(
      service.getCategoryConfig("credit_bureau_dispute"),
    ).rejects.toThrow(
      "Missing live Cursive category for category: credit_bureau_dispute",
    );
  });

  it("fails loudly when Supabase env is only partially configured", () => {
    expect(() =>
      createCursiveConfigService(
        createMemoryEnv({
          supabaseUrl: "http://kong:8000",
        }),
      ),
    ).toThrow(
      "Incomplete Supabase env for live Cursive config. Both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  });

  it("fails loudly when live credit-bureau config is missing citations or addresses", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.includes("/rest/v1/cursive_categories")) {
        return {
          ok: true,
          json: async () => [
            {
              slug: "credit_bureau_dispute",
              display_name: "Credit Bureau Dispute",
              helper_mode: "helper-only",
              output_modes: ["portal_text", "html_letter", "pdf_letter"],
              enabled: true,
              sort_order: 10,
              summary: "Live summary",
            },
          ],
        } satisfies Partial<Response>;
      }

      if (url.includes("/rest/v1/cursive_intake_schemas")) {
        return {
          ok: true,
          json: async () => [
            {
              category_slug: "credit_bureau_dispute",
              schema_version: "v1",
              helper_mode: "helper-only",
              intake_schema: {
                fields: [
                  { key: "consumer_name", label: "Consumer name", required: true },
                ],
              },
            },
          ],
        } satisfies Partial<Response>;
      }

      if (url.includes("/rest/v1/cursive_prompts")) {
        return {
          ok: true,
          json: async () => [
            {
              category_slug: "credit_bureau_dispute",
              prompt_version: "v1",
              helper_mode: "helper-only",
              prompt_payload: {
                systemPrompt: "Live prompt",
                draftInstructions: ["Use the live prompt package."],
              },
            },
          ],
        } satisfies Partial<Response>;
      }

      if (url.includes("/rest/v1/cursive_templates")) {
        return {
          ok: true,
          json: async () => [
            {
              category_slug: "credit_bureau_dispute",
              template_version: "v1",
              helper_mode: "helper-only",
              template_payload: {
                salutation: "Dear Credit Bureau:",
                closing: "Respectfully,",
              },
            },
          ],
        } satisfies Partial<Response>;
      }

      return {
        ok: true,
        json: async () => [],
      } satisfies Partial<Response>;
    });

    const service = createCursiveConfigService(
      createMemoryEnv({
        supabaseServiceRoleKey: "service-role",
        supabaseUrl: "http://kong:8000",
      }),
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    );

    await expect(
      service.getCategoryConfig("credit_bureau_dispute"),
    ).rejects.toThrow(
      "Missing live Cursive citations for category: credit_bureau_dispute",
    );
  });
});

describe("cursive preview route with live config", () => {
  it("uses live Supabase-backed template config instead of repo defaults", async () => {
    vi.stubGlobal("fetch", createLiveConfigFetch());

    const { app, sessionId, sessionToken } = await createAuthorizedSessionWithEnv(
      createMemoryEnv({
        supabaseServiceRoleKey: "service-role",
        supabaseUrl: "http://kong:8000",
      }),
    );

    const response = await app.inject({
      headers: {
        authorization: `Bearer ${sessionToken}`,
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
        sessionId,
      },
      url: "/api/reports/cursive/credit-bureau-dispute/preview",
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json() as { html: string; portalText: string };
    expect(payload.html).toContain("Dear Credit Bureau:");
    expect(payload.html).toContain("Respectfully,");
    expect(payload.portalText).toContain("Dear Credit Bureau:");
  });
});
