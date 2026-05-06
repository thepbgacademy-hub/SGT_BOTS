import crypto from "node:crypto";

const TELEGRAM_INIT_DATA_MAX_AGE_SECONDS = 300;

export type ValidatedTelegramInitData = {
  telegramUserId: string;
  username: string;
  firstName: string;
  lastName: string;
  languageCode: string;
  raw: string;
};

function buildDataCheckString(params: URLSearchParams) {
  return [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

export function validateTelegramInitData(
  initData: string,
  botToken: string,
): ValidatedTelegramInitData {
  const params = new URLSearchParams(initData);
  const authDateValue = params.get("auth_date");
  const hash = params.get("hash");
  const userValue = params.get("user");

  if (!authDateValue || !hash || !userValue) {
    throw new Error("invalid telegram init data");
  }

  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const expectedHash = crypto
    .createHmac("sha256", secret)
    .update(buildDataCheckString(params))
    .digest("hex");

  if (hash !== expectedHash) {
    throw new Error("invalid telegram init data");
  }

  const authDate = Number(authDateValue);

  if (!Number.isFinite(authDate)) {
    throw new Error("invalid telegram init data");
  }

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - authDate);

  if (ageSeconds > TELEGRAM_INIT_DATA_MAX_AGE_SECONDS) {
    throw new Error("stale telegram init data");
  }

  const user = JSON.parse(userValue) as {
    first_name?: string;
    id?: number;
    language_code?: string;
    last_name?: string;
    username?: string;
  };

  if (!user.id || !user.first_name) {
    throw new Error("invalid telegram init data");
  }

  return {
    telegramUserId: String(user.id),
    username: user.username ?? "",
    firstName: user.first_name,
    lastName: user.last_name ?? "",
    languageCode: user.language_code ?? "",
    raw: initData,
  };
}
