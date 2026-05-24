import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import { readEnv } from "../../src/config/env";
import { createInMemoryProfileRepo } from "../../src/modules/profiles/profile.repo";
import {
  createInMemorySessionMetadataRepo,
  createSupabaseSessionMetadataRepo,
} from "../../src/modules/sessions/session.repo";
import {
  createInMemorySessionSecretStore,
  createSessionService,
  SESSION_DURATION_SECONDS,
} from "../../src/modules/sessions/session.service";
import {
  createSignedTelegramInitData,
  TEST_TELEGRAM_BOT_TOKEN,
} from "../../../../packages/shared/src/testing/telegram-fixtures";

const TOP_SECRET_TEST_BOT_TOKEN = "123456:top-secret-test-bot-token";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function onboardProfile(
  app: Awaited<ReturnType<typeof buildApp>>,
  initData: string,
) {
  const response = await app.inject({
    method: "POST",
    url: "/api/profiles",
    payload: {
      initData,
      firstName: "Ada",
      lastName: "Lovelace",
      preferredName: "Ada",
    },
  });

  expect(response.statusCode).toBe(201);
  return response.json() as {
    profile: {
      id: string;
    };
  };
}

describe("provider connection and session start", () => {
  it("connects a provider after onboarding through an alternate bot token", async () => {
    const initData = createSignedTelegramInitData({
      botToken: TOP_SECRET_TEST_BOT_TOKEN,
    });
    const app = await buildApp({
      env: readEnv({
        APP_PORT: "3001",
        TELEGRAM_BOT_USERNAME: "sgt_playground_bot",
        TELEGRAM_BOT_TOKEN: TEST_TELEGRAM_BOT_TOKEN,
        TOP_SECRET_TELEGRAM_BOT_TOKEN: TOP_SECRET_TEST_BOT_TOKEN,
        PROFILE_REPO_MODE: "memory",
        PROVIDER_VALIDATION_MODE: "stub",
      }),
      profileRepo: createInMemoryProfileRepo(),
      sessionMetadataRepo: createInMemorySessionMetadataRepo(),
      sessionSecretStore: createInMemorySessionSecretStore(),
    });

    await onboardProfile(app, initData);
    const connectResponse = await app.inject({
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

    expect(connectResponse.statusCode).toBe(200);
    expect(connectResponse.json()).toMatchObject({
      provider: "openai",
      sessionToken: expect.any(String),
    });
  }, 40000);

  it(
    "issues a backend session token that remains valid after telegram init data ages out",
    async () => {
      let now = Date.parse("2026-05-05T12:00:00.000Z");
    const validInitData = createSignedTelegramInitData();
    const profileRepo = createInMemoryProfileRepo();
    const app = await buildApp({
      env: readEnv({
        APP_PORT: "3001",
        TELEGRAM_BOT_USERNAME: "sgt_playground_bot",
        TELEGRAM_BOT_TOKEN: TEST_TELEGRAM_BOT_TOKEN,
        PROFILE_REPO_MODE: "memory",
        PROVIDER_VALIDATION_MODE: "stub",
      }),
      now: () => now,
      profileRepo,
      sessionMetadataRepo: createInMemorySessionMetadataRepo(),
      sessionSecretStore: createInMemorySessionSecretStore(),
    });

    const onboarding = await onboardProfile(app, validInitData);
    const connectResponse = await app.inject({
      method: "POST",
      url: "/api/providers/connect",
      headers: {
        "x-telegram-init-data": validInitData,
      },
      payload: {
        provider: "openai",
        apiKey: "sk-test",
      },
    });
    const connectPayload = connectResponse.json() as {
      session: {
        id: string;
        userId: string;
        state: string;
      };
      sessionToken: string;
    };

    now += 10 * 60 * 1000;

    const sessionResponse = await app.inject({
      method: "GET",
      url: `/api/sessions/${connectPayload.session.id}`,
      headers: {
        authorization: `Bearer ${connectPayload.sessionToken}`,
      },
    });

    expect(connectResponse.statusCode).toBe(200);
    expect(connectPayload.session.userId).toBe(onboarding.profile.id);
    expect(connectPayload.session.state).toBe("active");
    expect(connectPayload.sessionToken).toEqual(expect.any(String));
    expect(sessionResponse.statusCode).toBe(200);
      expect(sessionResponse.json()).toMatchObject({
        session: {
          id: connectPayload.session.id,
          userId: onboarding.profile.id,
          state: "active",
        },
      });
    },
    40000,
  );

  it("returns durable provider metadata after restart and requires reconnect when the secret is gone", async () => {
    const metadataRepo = createInMemorySessionMetadataRepo();
    const secretStore = createInMemorySessionSecretStore();
    const sessionService = createSessionService({
      metadataRepo,
      secretStore,
      now: () => Date.parse("2026-05-05T12:00:00.000Z"),
    });

    const session = await sessionService.startSession({
      userId: "test-user",
      provider: "anthropic",
      apiKey: "sk-ant-test",
    });
    const restartedService = createSessionService({
      metadataRepo,
      secretStore: createInMemorySessionSecretStore(),
      now: () => Date.parse("2026-05-05T12:10:00.000Z"),
    });

    await expect(
      restartedService.getSessionForUser({
        sessionId: session.id,
        userId: "test-user",
      }),
    ).resolves.toMatchObject({
      id: session.id,
      provider: "anthropic",
      state: "reauth_required",
    });
    await expect(
      restartedService.authorizeRequest({
        sessionId: session.id,
        userId: "test-user",
      }),
    ).rejects.toThrowError("session secret unavailable");
  });

  it("retires prior active sessions when the user reconnects", async () => {
    const validInitData = createSignedTelegramInitData();
    const profileRepo = createInMemoryProfileRepo();
    const metadataRepo = createInMemorySessionMetadataRepo();
    const app = await buildApp({
      env: readEnv({
        APP_PORT: "3001",
        TELEGRAM_BOT_USERNAME: "sgt_playground_bot",
        TELEGRAM_BOT_TOKEN: TEST_TELEGRAM_BOT_TOKEN,
        PROFILE_REPO_MODE: "memory",
        PROVIDER_VALIDATION_MODE: "stub",
      }),
      profileRepo,
      sessionMetadataRepo: metadataRepo,
      sessionSecretStore: createInMemorySessionSecretStore(),
    });

    await onboardProfile(app, validInitData);

    const firstConnectResponse = await app.inject({
      method: "POST",
      url: "/api/providers/connect",
      headers: {
        "x-telegram-init-data": validInitData,
      },
      payload: {
        provider: "openai",
        apiKey: "sk-test-1",
      },
    });
    const firstPayload = firstConnectResponse.json() as {
      session: {
        id: string;
      };
      sessionToken: string;
    };

    const secondConnectResponse = await app.inject({
      method: "POST",
      url: "/api/providers/connect",
      headers: {
        "x-telegram-init-data": validInitData,
      },
      payload: {
        provider: "openai",
        apiKey: "sk-test-2",
      },
    });
    const secondPayload = secondConnectResponse.json() as {
      session: {
        id: string;
      };
      sessionToken: string;
    };

    const retiredSessionResponse = await app.inject({
      method: "GET",
      url: `/api/sessions/${firstPayload.session.id}`,
      headers: {
        authorization: `Bearer ${firstPayload.sessionToken}`,
      },
    });
    const activeSessionResponse = await app.inject({
      method: "GET",
      url: `/api/sessions/${secondPayload.session.id}`,
      headers: {
        authorization: `Bearer ${secondPayload.sessionToken}`,
      },
    });

    expect(firstConnectResponse.statusCode).toBe(200);
    expect(secondConnectResponse.statusCode).toBe(200);
    expect(retiredSessionResponse.statusCode).toBe(401);
    expect(retiredSessionResponse.json()).toEqual({
      message: "session invalidated",
    });
    expect(activeSessionResponse.statusCode).toBe(200);
    expect(metadataRepo.snapshot()).toMatchObject({
      playground_sessions: [
        {
          id: firstPayload.session.id,
          status: "retired",
        },
        {
          id: secondPayload.session.id,
          status: "active",
        },
      ],
    });
  });

  it("validates provider keys against the upstream API in live mode", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: "gpt-5.2" }] }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const validInitData = createSignedTelegramInitData();
    const profileRepo = createInMemoryProfileRepo();
    const app = await buildApp({
      env: readEnv({
        APP_PORT: "3001",
        TELEGRAM_BOT_USERNAME: "sgt_playground_bot",
        TELEGRAM_BOT_TOKEN: TEST_TELEGRAM_BOT_TOKEN,
        PROFILE_REPO_MODE: "memory",
        PROVIDER_VALIDATION_MODE: "live",
      }),
      profileRepo,
      sessionMetadataRepo: createInMemorySessionMetadataRepo(),
      sessionSecretStore: createInMemorySessionSecretStore(),
    });

    await onboardProfile(app, validInitData);

    const response = await app.inject({
      method: "POST",
      url: "/api/providers/connect",
      headers: {
        "x-telegram-init-data": validInitData,
      },
      payload: {
        provider: "openai",
        apiKey: "sk-live-key",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/models",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "Bearer sk-live-key",
        }),
      }),
    );
  });

  it("persists provider and session metadata without storing raw api keys durably", async () => {
    const validInitData = createSignedTelegramInitData();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "user-1",
              telegram_user_id: "123456",
              username: "ada_l",
              first_name: "Ada",
              last_name: "Lovelace",
              preferred_name: "Ada",
              created_at: "2026-05-05T00:00:00.000Z",
              updated_at: "2026-05-05T00:00:00.000Z",
              last_activity_at: "2026-05-05T00:00:00.000Z",
            },
          ]),
          { status: 201, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ user_id: "user-1" }]), {
          status: 201,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "user-1",
              telegram_user_id: "123456",
              username: "ada_l",
              first_name: "Ada",
              last_name: "Lovelace",
              preferred_name: "Ada",
              created_at: "2026-05-05T00:00:00.000Z",
              updated_at: "2026-05-05T00:00:00.000Z",
              last_activity_at: "2026-05-05T00:00:00.000Z",
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ id: "gpt-5.2" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: "provider-1" }]), {
          status: 201,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "session-1",
              user_id: "user-1",
              provider_connection_id: "provider-1",
              started_at: "2026-05-05T00:00:00.000Z",
              ends_at: "2026-05-05T03:00:00.000Z",
              status: "active",
              review_prompted: false,
            },
          ]),
          { status: 201, headers: { "content-type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const app = await buildApp({
      env: readEnv({
        APP_PORT: "3001",
        TELEGRAM_BOT_USERNAME: "sgt_playground_bot",
        TELEGRAM_BOT_TOKEN: TEST_TELEGRAM_BOT_TOKEN,
        PROFILE_REPO_MODE: "supabase",
        PROVIDER_VALIDATION_MODE: "live",
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      }),
      sessionMetadataRepo: createSupabaseSessionMetadataRepo(
        readEnv({
          APP_PORT: "3001",
          TELEGRAM_BOT_USERNAME: "sgt_playground_bot",
          TELEGRAM_BOT_TOKEN: TEST_TELEGRAM_BOT_TOKEN,
          PROFILE_REPO_MODE: "supabase",
          PROVIDER_VALIDATION_MODE: "live",
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
        }),
      ),
      sessionSecretStore: createInMemorySessionSecretStore(),
    });

    await onboardProfile(app, validInitData);

    const response = await app.inject({
      method: "POST",
      url: "/api/providers/connect",
      headers: {
        "x-telegram-init-data": validInitData,
      },
      payload: {
        provider: "openai",
        apiKey: "sk-live-key",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "https://example.supabase.co/rest/v1/provider_connections",
      expect.objectContaining({
        method: "POST",
        body: expect.any(String),
      }),
    );
    expect(
      JSON.parse(String(fetchMock.mock.calls[5]?.[1]?.body)),
    ).toMatchObject({
      user_id: "user-1",
      provider_name: "openai",
      auth_method: "api_key",
      validation_status: "validated",
    });
    expect(
      JSON.parse(String(fetchMock.mock.calls[5]?.[1]?.body)),
    ).not.toHaveProperty("apiKey");
    expect(fetchMock).toHaveBeenNthCalledWith(
      7,
      "https://example.supabase.co/rest/v1/playground_sessions",
      expect.objectContaining({
        method: "POST",
        body: expect.any(String),
      }),
    );
    expect(
      JSON.parse(String(fetchMock.mock.calls[6]?.[1]?.body)),
    ).toMatchObject({
      user_id: "user-1",
      provider_connection_id: "provider-1",
      status: "active",
      review_prompted: false,
    });
    expect(
      JSON.parse(String(fetchMock.mock.calls[6]?.[1]?.body)),
    ).not.toHaveProperty("apiKey");
  });

  it("lets in-flight requests finish after expiry and blocks new requests", async () => {
    let now = Date.parse("2026-05-05T12:00:00.000Z");
    const sessionService = createSessionService({
      metadataRepo: createInMemorySessionMetadataRepo(),
      secretStore: createInMemorySessionSecretStore(),
      now: () => now,
    });

    const session = await sessionService.startSession({
      userId: "test-user",
      provider: "openai",
      apiKey: "sk-test",
    });

    now += SESSION_DURATION_SECONDS * 1000 - 1000;
    const requestStartedAt = new Date(now).toISOString();
    now += 2000;

    await expect(
      sessionService.authorizeRequest({
        sessionId: session.id,
        userId: "test-user",
        requestStartedAt,
      }),
    ).resolves.toEqual({
      status: "allowed",
    });
    await expect(
      sessionService.authorizeRequest({
        sessionId: session.id,
        userId: "test-user",
      }),
    ).rejects.toThrowError("session expired");
  });

  it("does not return provider secrets after the session expiry time passes", async () => {
    let now = Date.parse("2026-05-05T12:00:00.000Z");
    const sessionService = createSessionService({
      metadataRepo: createInMemorySessionMetadataRepo(),
      secretStore: createInMemorySessionSecretStore(),
      now: () => now,
    });

    const session = await sessionService.startSession({
      userId: "test-user",
      provider: "openai",
      apiKey: "sk-test",
    });

    now += SESSION_DURATION_SECONDS * 1000 + 1000;

    await expect(
      sessionService.getProviderSecretForUser({
        sessionId: session.id,
        userId: "test-user",
      }),
    ).rejects.toThrowError("session expired");
  });
});
