import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import { readEnv } from "../../src/config/env";
import {
  createSignedTelegramInitData,
  TEST_TELEGRAM_BOT_TOKEN,
} from "../../../../packages/shared/src/testing/telegram-fixtures";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function buildTestApp() {
  return buildApp({
    env: readEnv({
      APP_PORT: "3001",
      TELEGRAM_BOT_USERNAME: "sgt_playground_bot",
      TELEGRAM_BOT_APP_SHORT_NAME: "playground",
      TELEGRAM_BOT_TOKEN: TEST_TELEGRAM_BOT_TOKEN,
      PROFILE_REPO_MODE: "memory",
    }),
  });
}

describe("GET /api/telegram/launch", () => {
  it("authenticates from the x-telegram-init-data header", async () => {
    const app = await buildTestApp();
    const initData = createSignedTelegramInitData();

    const response = await app.inject({
      method: "GET",
      url: "/api/telegram/launch",
      headers: {
        "x-telegram-init-data": initData,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      telegram: {
        telegramUserId: "123456",
        username: "ada_l",
      },
    });
  });

  it("rejects requests with no init data header", async () => {
    const app = await buildTestApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/telegram/launch",
    });

    expect(response.statusCode).toBe(401);
  });

  it("ignores an initData query parameter now that the header is authoritative", async () => {
    const app = await buildTestApp();
    const initData = createSignedTelegramInitData();

    const response = await app.inject({
      method: "GET",
      url: `/api/telegram/launch?initData=${encodeURIComponent(initData)}`,
    });

    expect(response.statusCode).toBe(401);
  });
});

describe("GET /api/telegram/prefill", () => {
  it("authenticates from the x-telegram-init-data header", async () => {
    const app = await buildTestApp();
    const initData = createSignedTelegramInitData();

    const response = await app.inject({
      method: "GET",
      url: "/api/telegram/prefill",
      headers: {
        "x-telegram-init-data": initData,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      profile: {
        firstName: "Ada",
        telegramUsername: "ada_l",
      },
    });
  });

  it("rejects requests with no init data header", async () => {
    const app = await buildTestApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/telegram/prefill",
    });

    expect(response.statusCode).toBe(401);
  });
});
