import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSignedTelegramInitData,
  tamperTelegramInitData,
  TEST_TELEGRAM_BOT_TOKEN,
} from "../../../../packages/shared/src/testing/telegram-fixtures";
import { buildApp } from "../../src/app";
import { createInMemoryProfileRepo } from "../../src/modules/profiles/profile.repo";
import { readEnv } from "../../src/config/env";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const VALID_INIT_DATA = createSignedTelegramInitData();

describe("POST /api/profiles", () => {
  it("creates a profile from validated Telegram launch data", async () => {
    const profileRepo = createInMemoryProfileRepo();
    const app = await buildApp({
      env: readEnv({
        APP_PORT: "3001",
        TELEGRAM_BOT_USERNAME: "sgt_playground_bot",
        TELEGRAM_BOT_APP_SHORT_NAME: "playground",
        TELEGRAM_BOT_TOKEN: TEST_TELEGRAM_BOT_TOKEN,
        PROFILE_REPO_MODE: "memory",
      }),
      profileRepo,
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/profiles",
      payload: {
        initData: VALID_INIT_DATA,
        firstName: "Ada",
        lastName: "Lovelace",
        preferredName: "Ada",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      profile: {
        preferredName: "Ada",
        telegramUsername: "ada_l",
      },
      nextStep: "connect_provider",
    });
    expect(profileRepo.snapshot()).toMatchObject({
      playground_users: [
        {
          telegram_user_id: "123456",
          username: "ada_l",
          first_name: "Ada",
          last_name: "Lovelace",
          preferred_name: "Ada",
        },
      ],
      playground_telegram_profiles: [
        {
          language_code: "en",
          launch_metadata: {
            launch_source: "telegram_web_app",
          },
          validated_payload: {
            telegramUserId: "123456",
            username: "ada_l",
          },
          raw_init_data_hash: expect.any(String),
        },
      ],
    });
  });

  it("builds the welcome bot button target", async () => {
    const app = await buildApp({
      env: readEnv({
        APP_PORT: "3001",
        TELEGRAM_BOT_USERNAME: "sgt_playground_bot",
        TELEGRAM_BOT_APP_SHORT_NAME: "playground",
        TELEGRAM_BOT_TOKEN: TEST_TELEGRAM_BOT_TOKEN,
        PROFILE_REPO_MODE: "memory",
      }),
    });
    const response = await app.inject({
      method: "GET",
      url: "/api/telegram/welcome-link",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      button: {
        text: "Open Playground",
        url: "https://t.me/sgt_playground_bot/playground?startapp=profile-onboarding",
      },
    });
  });

  it("uses a Supabase-backed repo by default when service-role env is available", async () => {
    const app = await buildApp({
      env: readEnv({
        APP_PORT: "3001",
        TELEGRAM_BOT_USERNAME: "sgt_playground_bot",
        TELEGRAM_BOT_APP_SHORT_NAME: "playground",
        TELEGRAM_BOT_TOKEN: TEST_TELEGRAM_BOT_TOKEN,
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      }),
    });

    expect("snapshot" in app.profileRepo).toBe(false);
  });

  it("persists default runtime onboarding into the phase-1 playground profile tables", async () => {
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
      );
    vi.stubGlobal("fetch", fetchMock);

    const app = await buildApp({
      env: readEnv({
        APP_PORT: "3001",
        TELEGRAM_BOT_USERNAME: "sgt_playground_bot",
        TELEGRAM_BOT_APP_SHORT_NAME: "playground",
        TELEGRAM_BOT_TOKEN: TEST_TELEGRAM_BOT_TOKEN,
        PROFILE_REPO_MODE: "supabase",
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      }),
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/profiles",
      payload: {
        initData: VALID_INIT_DATA,
        firstName: "Ada",
        lastName: "Lovelace",
        preferredName: "Ada",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://example.supabase.co/rest/v1/playground_users?on_conflict=telegram_user_id",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          prefer: "resolution=merge-duplicates,return=representation",
        }),
        body: expect.any(String),
      }),
    );
    expect(
      JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)),
    ).toMatchObject({
      telegram_user_id: "123456",
      username: "ada_l",
      first_name: "Ada",
      last_name: "Lovelace",
      preferred_name: "Ada",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://example.supabase.co/rest/v1/playground_telegram_profiles?on_conflict=user_id",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          prefer: "resolution=merge-duplicates,return=representation",
        }),
        body: expect.any(String),
      }),
    );
    expect(
      JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)),
    ).toMatchObject({
      user_id: "user-1",
      language_code: "en",
      launch_metadata: {
        launch_source: "telegram_web_app",
      },
      validated_payload: {
        telegramUserId: "123456",
        username: "ada_l",
      },
      raw_init_data_hash: expect.any(String),
    });
  });

  it("rejects tampered Telegram launch data", async () => {
    const app = await buildApp({
      env: readEnv({
        APP_PORT: "3001",
        TELEGRAM_BOT_USERNAME: "sgt_playground_bot",
        TELEGRAM_BOT_APP_SHORT_NAME: "playground",
        TELEGRAM_BOT_TOKEN: TEST_TELEGRAM_BOT_TOKEN,
        PROFILE_REPO_MODE: "memory",
      }),
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/profiles",
      payload: {
        initData: tamperTelegramInitData(VALID_INIT_DATA),
        firstName: "Ada",
        lastName: "Lovelace",
        preferredName: "Ada",
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      message: "invalid telegram init data",
    });
  });

  it("rejects stale Telegram launch data", async () => {
    const app = await buildApp({
      env: readEnv({
        APP_PORT: "3001",
        TELEGRAM_BOT_USERNAME: "sgt_playground_bot",
        TELEGRAM_BOT_APP_SHORT_NAME: "playground",
        TELEGRAM_BOT_TOKEN: TEST_TELEGRAM_BOT_TOKEN,
        PROFILE_REPO_MODE: "memory",
      }),
    });
    const staleInitData = createSignedTelegramInitData({
      authDate: "1714905600",
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/profiles",
      payload: {
        initData: staleInitData,
        firstName: "Ada",
        lastName: "Lovelace",
        preferredName: "Ada",
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      message: "stale telegram init data",
    });
  });
});
