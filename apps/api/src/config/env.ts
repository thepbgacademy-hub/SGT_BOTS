import fs from "node:fs";
import path from "node:path";

export type AppEnv = {
  appPort: number;
  telegramBotUsername: string;
  telegramBotToken: string;
  profileRepoMode: "supabase" | "memory";
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
  const telegramBotToken =
    env.TELEGRAM_BOT_TOKEN ??
    env.BOT_TOKEN ??
    fileEnv.TELEGRAM_BOT_TOKEN ??
    fileEnv.BOT_TOKEN;

  return {
    appPort: Number(env.APP_PORT ?? fileEnv.APP_PORT ?? "3000"),
    telegramBotUsername:
      env.TELEGRAM_BOT_USERNAME ??
      fileEnv.TELEGRAM_BOT_USERNAME ??
      "sgt_playground_bot",
    telegramBotToken: requireEnv("TELEGRAM_BOT_TOKEN", telegramBotToken),
    profileRepoMode,
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
