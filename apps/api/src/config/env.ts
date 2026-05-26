import fs from "node:fs";
import path from "node:path";

export type AppEnv = {
  appPort: number;
  telegramBotUsername: string;
  telegramBotToken: string;
  telegramBotTokens: string[];
  telegramBotAppShortName: string;
  telegramBotRuntimeMode: "off" | "polling";
  telegramReviewGroupUrl: string;
  topSecretAdminToken?: string;
  profileRepoMode: "supabase" | "memory";
  providerValidationMode: "live" | "stub";
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
};

function parseDotEnv(contents: string) {
  const values: Record<string, string> = {};

  for (const rawLine of contents.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    values[key] = value;
  }

  return values;
}

function loadRootEnvFile(cwd: string) {
  const candidates: string[] = [];
  let current = path.resolve(cwd);

  while (true) {
    candidates.push(path.join(current, ".env"));

    const parent = path.dirname(current);

    if (parent === current) {
      break;
    }

    current = parent;
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return parseDotEnv(fs.readFileSync(candidate, "utf8"));
    }
  }

  return {};
}

function requireEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parseTokenList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
}

function uniqueValues(values: string[]) {
  return [...new Set(values)];
}

export function readEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  const fileEnv = loadRootEnvFile(process.cwd());
  const profileRepoMode =
    (env.PROFILE_REPO_MODE ?? fileEnv.PROFILE_REPO_MODE ?? "supabase") ===
    "memory"
      ? "memory"
      : "supabase";
  const supabaseUrl = env.SUPABASE_URL ?? fileEnv.SUPABASE_URL;
  const supabaseServiceRoleKey =
    env.SUPABASE_SERVICE_ROLE_KEY ?? fileEnv.SUPABASE_SERVICE_ROLE_KEY;
  const providerValidationMode =
    (env.PROVIDER_VALIDATION_MODE ??
      fileEnv.PROVIDER_VALIDATION_MODE ??
      "live") === "stub"
      ? "stub"
      : "live";
  const telegramBotToken =
    env.TELEGRAM_BOT_TOKEN ??
    env.BOT_TOKEN ??
    fileEnv.TELEGRAM_BOT_TOKEN ??
    fileEnv.BOT_TOKEN;
  const requiredTelegramBotToken = requireEnv(
    "TELEGRAM_BOT_TOKEN",
    telegramBotToken,
  );
  const telegramBotTokens = uniqueValues([
    requiredTelegramBotToken,
    ...parseTokenList(env.TELEGRAM_BOT_TOKENS ?? fileEnv.TELEGRAM_BOT_TOKENS),
    ...parseTokenList(
      env.TOP_SECRET_TELEGRAM_BOT_TOKEN ??
        fileEnv.TOP_SECRET_TELEGRAM_BOT_TOKEN,
    ),
  ]);
  const telegramBotRuntimeMode =
    (env.TELEGRAM_BOT_RUNTIME_MODE ??
      fileEnv.TELEGRAM_BOT_RUNTIME_MODE ??
      "off") === "polling"
      ? "polling"
      : "off";

  return {
    appPort: Number(env.APP_PORT ?? fileEnv.APP_PORT ?? "3000"),
    telegramBotUsername:
      env.TELEGRAM_BOT_USERNAME ??
      fileEnv.TELEGRAM_BOT_USERNAME ??
      "sgt_playground_bot",
    telegramBotToken: requiredTelegramBotToken,
    telegramBotTokens,
    telegramBotAppShortName:
      env.TELEGRAM_BOT_APP_SHORT_NAME ??
      fileEnv.TELEGRAM_BOT_APP_SHORT_NAME ??
      "app",
    telegramBotRuntimeMode,
    telegramReviewGroupUrl:
      env.TELEGRAM_REVIEW_GROUP_URL ??
      fileEnv.TELEGRAM_REVIEW_GROUP_URL ??
      "https://t.me/+1wagxfyhnAcwMDJh",
    topSecretAdminToken:
      env.TOP_SECRET_ADMIN_TOKEN ?? fileEnv.TOP_SECRET_ADMIN_TOKEN,
    profileRepoMode,
    providerValidationMode,
    supabaseUrl:
      profileRepoMode === "supabase"
        ? requireEnv("SUPABASE_URL", supabaseUrl)
        : undefined,
    supabaseServiceRoleKey:
      profileRepoMode === "supabase"
        ? requireEnv("SUPABASE_SERVICE_ROLE_KEY", supabaseServiceRoleKey)
        : undefined,
  };
}
