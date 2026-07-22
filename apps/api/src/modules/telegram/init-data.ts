import crypto from "node:crypto";

const TELEGRAM_INIT_DATA_MAX_AGE_SECONDS = 300;
// Small tolerance for legitimate client clock drift only; well below the
// past-age budget above and in line with typical clock-skew allowances
// (e.g. 30-60s in JWT ecosystems).
const TELEGRAM_INIT_DATA_MAX_FUTURE_SKEW_SECONDS = 60;

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

  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;

  if (ageSeconds > TELEGRAM_INIT_DATA_MAX_AGE_SECONDS) {
    throw new Error("stale telegram init data");
  }

  if (ageSeconds < -TELEGRAM_INIT_DATA_MAX_FUTURE_SKEW_SECONDS) {
    throw new Error("future-dated telegram init data");
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

function isTelegramInitDataAgeError(message: string) {
  return (
    message === "stale telegram init data" ||
    message === "future-dated telegram init data"
  );
}

export function validateTelegramInitDataWithTokens(
  initData: string,
  botTokens: string[],
): ValidatedTelegramInitData {
  let ageError: Error | null = null;

  for (const botToken of botTokens) {
    try {
      return validateTelegramInitData(initData, botToken);
    } catch (error) {
      if (isTelegramInitDataAgeError((error as Error).message)) {
        ageError = error as Error;
      }
    }
  }

  if (ageError) {
    throw ageError;
  }

  throw new Error("invalid telegram init data");
}
