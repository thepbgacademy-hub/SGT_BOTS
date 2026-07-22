import { describe, expect, it, vi } from "vitest";
import { readEnv } from "../../src/config/env";
import {
  clearTelegramWebhook,
  handleTelegramUpdate,
  pollTelegramUpdatesOnce,
  sendTelegramMessage,
} from "../../src/modules/telegram/telegram-bot.service";

function telegramRateLimitResponse(retryAfterSeconds: number) {
  return new Response(
    JSON.stringify({
      ok: false,
      error_code: 429,
      description: `Too Many Requests: retry after ${retryAfterSeconds}`,
      parameters: { retry_after: retryAfterSeconds },
    }),
    {
      status: 429,
      headers: { "content-type": "application/json" },
    },
  );
}

function telegramOkResponse() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const testMessage = {
  chatId: -100123,
  text: "hello",
  replyMarkup: { inline_keyboard: [] },
};

const env = readEnv({
  APP_PORT: "3001",
  TELEGRAM_BOT_USERNAME: "PBGbigkitty_bot",
  TELEGRAM_BOT_APP_SHORT_NAME: "playground",
  TELEGRAM_BOT_TOKEN: "123456:test-token",
  PROFILE_REPO_MODE: "memory",
});

describe("Telegram bot runtime", () => {
  it("responds to /start with a playground button", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);

    await handleTelegramUpdate({
      env,
      sendMessage,
      update: {
        update_id: 1,
        message: {
          message_id: 99,
          chat: {
            id: -100123,
            type: "supergroup",
          },
          text: "/start",
        },
      },
    });

    expect(sendMessage).toHaveBeenCalledWith({
      chatId: -100123,
      replyMarkup: {
        inline_keyboard: [
          [
            {
              text: "Open Playground",
              url: "https://t.me/PBGbigkitty_bot/playground?startapp=profile-onboarding",
            },
          ],
        ],
      },
      text: expect.stringContaining("Open Playground"),
    });
  });

  it("ignores /start commands meant for another bot", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);

    await handleTelegramUpdate({
      env,
      sendMessage,
      update: {
        update_id: 1,
        message: {
          message_id: 99,
          chat: {
            id: -100123,
            type: "supergroup",
          },
          text: "/start@someone_else_bot",
        },
      },
    });

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("welcomes the group when the bot is added", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);

    await handleTelegramUpdate({
      env,
      sendMessage,
      update: {
        update_id: 1,
        message: {
          message_id: 99,
          chat: {
            id: -100123,
            type: "supergroup",
          },
          new_chat_members: [
            {
              id: 42,
              is_bot: true,
              username: "PBGbigkitty_bot",
              first_name: "Lance A Lyon",
            },
          ],
        },
      },
    });

    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it("welcomes the group when telegram sends my_chat_member for the bot", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);

    await handleTelegramUpdate({
      env,
      sendMessage,
      update: {
        update_id: 1,
        my_chat_member: {
          chat: {
            id: -100123,
            type: "supergroup",
          },
          new_chat_member: {
            id: 42,
            is_bot: true,
            username: "PBGbigkitty_bot",
            first_name: "Lance A Lyon",
            status: "member",
          },
        },
      },
    });

    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it("ignores /start in private chats", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);

    await handleTelegramUpdate({
      env,
      sendMessage,
      update: {
        update_id: 1,
        message: {
          message_id: 99,
          chat: {
            id: 12345,
            type: "private",
          },
          text: "/start",
        },
      },
    });

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("polls updates and advances the offset", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            result: [
              {
                update_id: 7,
                message: {
                  message_id: 99,
                  chat: {
                    id: 12345,
                    type: "private",
                  },
                  text: "/start",
                },
              },
            ],
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            result: [],
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
      );
    const sendMessage = vi.fn().mockResolvedValue(undefined);

    const nextOffset = await pollTelegramUpdatesOnce({
      env,
      fetchImpl: fetchMock,
      offset: 0,
      sendMessage,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.telegram.org/bot123456:test-token/getUpdates?offset=0&timeout=30&allowed_updates=%5B%22message%22%2C%22my_chat_member%22%5D",
      expect.objectContaining({
        method: "GET",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.telegram.org/bot123456:test-token/getUpdates?offset=8&timeout=0&limit=1&allowed_updates=%5B%22message%22%2C%22my_chat_member%22%5D",
      expect.objectContaining({
        method: "GET",
      }),
    );
    expect(nextOffset).toBe(8);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("clears any existing webhook before polling mode is used", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    await clearTelegramWebhook({
      env,
      fetchImpl: fetchMock,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.telegram.org/bot123456:test-token/deleteWebhook?drop_pending_updates=false",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("honors retry_after on 429 and succeeds on the next attempt", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(telegramRateLimitResponse(5))
      .mockResolvedValueOnce(telegramOkResponse());
    const wait = vi.fn().mockResolvedValue(undefined);

    await sendTelegramMessage({
      env,
      fetchImpl: fetchMock,
      message: testMessage,
      wait,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledTimes(1);
    expect(wait).toHaveBeenCalledWith(5000);
  });

  it("bounds a hostile retry_after to the configured cap", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(telegramRateLimitResponse(1_000_000))
      .mockResolvedValueOnce(telegramOkResponse());
    const wait = vi.fn().mockResolvedValue(undefined);

    await sendTelegramMessage({
      env,
      fetchImpl: fetchMock,
      message: testMessage,
      wait,
    });

    expect(wait).toHaveBeenCalledTimes(1);
    expect(wait).toHaveBeenCalledWith(30_000);
  });

  it("stops retrying after the max attempt count and throws", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(telegramRateLimitResponse(1))
      .mockResolvedValueOnce(telegramRateLimitResponse(1))
      .mockResolvedValueOnce(telegramRateLimitResponse(1));
    const wait = vi.fn().mockResolvedValue(undefined);

    await expect(
      sendTelegramMessage({
        env,
        fetchImpl: fetchMock,
        message: testMessage,
        wait,
      }),
    ).rejects.toThrow("telegram sendMessage failed with status 429");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
  });

  it("still throws immediately on non-429 failures without waiting", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: false }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );
    const wait = vi.fn().mockResolvedValue(undefined);

    await expect(
      sendTelegramMessage({
        env,
        fetchImpl: fetchMock,
        message: testMessage,
        wait,
      }),
    ).rejects.toThrow("telegram sendMessage failed with status 500");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });
});
