import type { AppEnv } from "../../config/env";
import { buildWelcomeButton } from "./telegram.service";

type TelegramChat = {
  id: number;
  type: string;
};

type TelegramUser = {
  id: number;
  is_bot: boolean;
  username?: string;
  first_name?: string;
};

type TelegramMessage = {
  message_id: number;
  chat: TelegramChat;
  text?: string;
  new_chat_members?: TelegramUser[];
};

type TelegramChatMemberUpdated = {
  chat: TelegramChat;
  new_chat_member: TelegramUser & {
    status?: string;
  };
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  my_chat_member?: TelegramChatMemberUpdated;
};

export type TelegramSendMessageInput = {
  chatId: number;
  text: string;
  replyMarkup: {
    inline_keyboard: Array<Array<{ text: string; url: string }>>;
  };
};

type SendMessage = (input: TelegramSendMessageInput) => Promise<void>;

const TELEGRAM_SEND_MESSAGE_MAX_ATTEMPTS = 3;
const TELEGRAM_SEND_MESSAGE_MAX_RETRY_AFTER_SECONDS = 30;

async function readTelegramRetryAfterSeconds(response: Response) {
  try {
    const body = (await response.json()) as {
      parameters?: { retry_after?: number };
    };
    const retryAfter = body.parameters?.retry_after;
    return Number.isFinite(retryAfter) && (retryAfter as number) > 0
      ? (retryAfter as number)
      : 1;
  } catch {
    return 1;
  }
}

function isInteractiveGroupChat(chat: TelegramChat | undefined) {
  return (
    chat?.type === "group" ||
    chat?.type === "supergroup" ||
    chat?.type === "channel"
  );
}

function buildWelcomeReply(env: AppEnv): Omit<TelegramSendMessageInput, "chatId"> {
  const button = buildWelcomeButton(env);

  return {
    text: [
      "Welcome to the Telegram Playground.",
      "Tap Open Playground to launch the mini app and begin your guided setup.",
    ].join(" "),
    replyMarkup: {
      inline_keyboard: [[button]],
    },
  };
}

function isStartCommand(text: string | undefined, botUsername: string) {
  if (!text) {
    return false;
  }

  const escapedUsername = botUsername.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const pattern = new RegExp(`^/start(?:@${escapedUsername})?(?:\\s|$)`, "iu");
  return pattern.test(text.trim());
}

function isStartCommandForAnotherBot(text: string | undefined, botUsername: string) {
  if (!text) {
    return false;
  }

  const match = text.trim().match(/^\/start@([A-Za-z0-9_]+)(?:\s|$)/u);

  if (!match) {
    return false;
  }

  return match[1].toLowerCase() !== botUsername.toLowerCase();
}

function botWasAdded(message: TelegramMessage | undefined, botUsername: string) {
  return (
    message?.new_chat_members?.some(
      (member) =>
        member.is_bot &&
        member.username?.toLowerCase() === botUsername.toLowerCase(),
    ) ?? false
  );
}

function botMembershipWasUpdated(
  update: TelegramUpdate,
  botUsername: string,
) {
  const membership = update.my_chat_member;

  if (!membership) {
    return false;
  }

  return (
    membership.new_chat_member.is_bot &&
    membership.new_chat_member.username?.toLowerCase() ===
      botUsername.toLowerCase() &&
    membership.new_chat_member.status !== "kicked"
  );
}

export async function handleTelegramUpdate(input: {
  env: AppEnv;
  sendMessage: SendMessage;
  update: TelegramUpdate;
}) {
  const message = input.update.message;
  const membershipChat = input.update.my_chat_member?.chat;

  if (
    isInteractiveGroupChat(membershipChat) &&
    botMembershipWasUpdated(input.update, input.env.telegramBotUsername)
  ) {
    await input.sendMessage({
      chatId: input.update.my_chat_member!.chat.id,
      ...buildWelcomeReply(input.env),
    });
    return;
  }

  if (!message) {
    return;
  }

  if (!isInteractiveGroupChat(message.chat)) {
    return;
  }

  if (isStartCommandForAnotherBot(message.text, input.env.telegramBotUsername)) {
    return;
  }

  if (
    isStartCommand(message.text, input.env.telegramBotUsername) ||
    botWasAdded(message, input.env.telegramBotUsername)
  ) {
    await input.sendMessage({
      chatId: message.chat.id,
      ...buildWelcomeReply(input.env),
    });
  }
}

export async function sendTelegramMessage(input: {
  env: AppEnv;
  fetchImpl?: typeof fetch;
  message: TelegramSendMessageInput;
  wait?: (ms: number) => Promise<void>;
}) {
  const fetchImpl = input.fetchImpl ?? fetch;
  const wait =
    input.wait ??
    ((ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      }));

  for (
    let attempt = 1;
    attempt <= TELEGRAM_SEND_MESSAGE_MAX_ATTEMPTS;
    attempt += 1
  ) {
    const response = await fetchImpl(
      `https://api.telegram.org/bot${input.env.telegramBotToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          chat_id: input.message.chatId,
          text: input.message.text,
          reply_markup: input.message.replyMarkup,
        }),
      },
    );

    if (response.ok) {
      return;
    }

    if (
      response.status === 429 &&
      attempt < TELEGRAM_SEND_MESSAGE_MAX_ATTEMPTS
    ) {
      const retryAfterSeconds = await readTelegramRetryAfterSeconds(response);
      const boundedDelayMs =
        Math.min(
          retryAfterSeconds,
          TELEGRAM_SEND_MESSAGE_MAX_RETRY_AFTER_SECONDS,
        ) * 1000;
      await wait(boundedDelayMs);
      continue;
    }

    throw new Error(`telegram sendMessage failed with status ${response.status}`);
  }
}

async function acknowledgeTelegramOffset(input: {
  env: AppEnv;
  fetchImpl: typeof fetch;
  offset: number;
}) {
  const response = await input.fetchImpl(
    `https://api.telegram.org/bot${input.env.telegramBotToken}/getUpdates?offset=${input.offset}&timeout=0&limit=1&allowed_updates=${encodeURIComponent('["message","my_chat_member"]')}`,
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    throw new Error(`telegram offset acknowledgement failed with status ${response.status}`);
  }
}

export async function clearTelegramWebhook(input: {
  env: AppEnv;
  fetchImpl?: typeof fetch;
}) {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(
    `https://api.telegram.org/bot${input.env.telegramBotToken}/deleteWebhook?drop_pending_updates=false`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error(`telegram deleteWebhook failed with status ${response.status}`);
  }
}

export async function pollTelegramUpdatesOnce(input: {
  env: AppEnv;
  fetchImpl?: typeof fetch;
  offset: number;
  sendMessage?: SendMessage;
}) {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(
    `https://api.telegram.org/bot${input.env.telegramBotToken}/getUpdates?offset=${input.offset}&timeout=30&allowed_updates=${encodeURIComponent('["message","my_chat_member"]')}`,
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    throw new Error(`telegram getUpdates failed with status ${response.status}`);
  }

  const body = (await response.json()) as {
    ok: boolean;
    result: TelegramUpdate[];
  };

  if (!body.ok) {
    throw new Error("telegram getUpdates returned ok=false");
  }

  let nextOffset = input.offset;
  const sendMessage =
    input.sendMessage ??
    ((message: TelegramSendMessageInput) =>
      sendTelegramMessage({
        env: input.env,
        fetchImpl,
        message,
      }));

  for (const update of body.result) {
    nextOffset = Math.max(nextOffset, update.update_id + 1);
    await handleTelegramUpdate({
      env: input.env,
      sendMessage,
      update,
    });
    await acknowledgeTelegramOffset({
      env: input.env,
      fetchImpl,
      offset: nextOffset,
    });
  }

  return nextOffset;
}

export function startTelegramPolling(input: {
  env: AppEnv;
  fetchImpl?: typeof fetch;
  logger?: Pick<Console, "error" | "info">;
  pollIntervalMs?: number;
}) {
  const fetchImpl = input.fetchImpl ?? fetch;
  const logger = input.logger ?? console;
  const pollIntervalMs = input.pollIntervalMs ?? 1_000;
  let nextOffset = 0;
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;

  async function run() {
    if (stopped) {
      return;
    }

    try {
      nextOffset = await pollTelegramUpdatesOnce({
        env: input.env,
        fetchImpl,
        offset: nextOffset,
      });
    } catch (error) {
      logger.error(
        `[telegram-bot] polling failed: ${(error as Error).message}`,
      );
    } finally {
      if (!stopped) {
        timer = setTimeout(run, pollIntervalMs);
        timer.unref?.();
      }
    }
  }

  logger.info("[telegram-bot] starting polling runtime");
  void clearTelegramWebhook({
    env: input.env,
    fetchImpl,
  })
    .then(run)
    .catch((error) => {
      logger.error(
        `[telegram-bot] failed to clear webhook before polling: ${(error as Error).message}`,
      );
      timer = setTimeout(run, pollIntervalMs);
      timer.unref?.();
    });

  return {
    stop() {
      stopped = true;

      if (timer) {
        clearTimeout(timer);
      }
    },
  };
}
