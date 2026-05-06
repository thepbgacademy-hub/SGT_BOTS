import crypto from "node:crypto";

export const TEST_TELEGRAM_BOT_TOKEN = "123456:phase-1-test-bot-token";

export type TelegramFixtureUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  language_code: string;
};

export const TEST_TELEGRAM_USER = {
  id: 123456,
  username: "ada_l",
  first_name: "Ada",
  last_name: "Lovelace",
  language_code: "en",
} as const satisfies TelegramFixtureUser;

function createDataCheckString(entries: Array<[string, string]>) {
  return entries
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

export function createSignedTelegramInitData(input?: {
  authDate?: string;
  botToken?: string;
  queryId?: string;
  user?: TelegramFixtureUser;
}) {
  const authDate = input?.authDate ?? String(Math.floor(Date.now() / 1000));
  const botToken = input?.botToken ?? TEST_TELEGRAM_BOT_TOKEN;
  const queryId = input?.queryId ?? "AAHdF6IQAAAAAN0XohDhrOrc";
  const user = input?.user ?? TEST_TELEGRAM_USER;
  const entries: Array<[string, string]> = [
    ["auth_date", authDate],
    ["query_id", queryId],
    ["user", JSON.stringify(user)],
  ];
  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const hash = crypto
    .createHmac("sha256", secret)
    .update(createDataCheckString(entries))
    .digest("hex");
  const params = new URLSearchParams();

  for (const [key, value] of entries) {
    params.set(key, value);
  }

  params.set("hash", hash);
  return params.toString();
}

export function tamperTelegramInitData(initData: string) {
  return initData.replace("ada_l", "ada_x");
}
