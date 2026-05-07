import { describe, expect, it, vi } from "vitest";
import { readEnv } from "../../src/config/env";
import {
  clearTelegramWebhook,
  handleTelegramUpdate,
  pollTelegramUpdatesOnce,
} from "../../src/modules/telegram/telegram-bot.service";

const env = readEnv({
  APP_PORT: "3001",
  TELEGRAM_BOT_USERNAME: "PBGbigkitty_bot",
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
              url: "https://t.me/PBGbigkitty_bot/app?startapp=profile-onboarding",
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
    expect(sendMessage).toHaveBeenCalledTimes(1);
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
});
