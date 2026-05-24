import crypto from "node:crypto";
import {
  validateTelegramInitData,
  validateTelegramInitDataWithTokens,
  type ValidatedTelegramInitData,
} from "../telegram/init-data";
import type { ProfileRepo } from "./profile.repo";

function hashInitData(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function toTimestamp() {
  return new Date().toISOString();
}

export async function createProfile(
  input: {
    initData: string;
    firstName: string;
    lastName?: string;
    preferredName: string;
  },
  deps: {
    botToken?: string;
    botTokens?: string[];
    profileRepo: ProfileRepo;
  },
) {
  const telegram = deps.botTokens
    ? validateTelegramInitDataWithTokens(input.initData, deps.botTokens)
    : validateTelegramInitData(input.initData, deps.botToken ?? "");
  const timestamp = toTimestamp();
  const user = await deps.profileRepo.insertUser({
    telegram_user_id: telegram.telegramUserId,
    username: telegram.username,
    first_name: input.firstName,
    last_name: input.lastName ?? telegram.lastName,
    preferred_name: input.preferredName,
    created_at: timestamp,
    updated_at: timestamp,
    last_activity_at: timestamp,
  });

  await deps.profileRepo.insertTelegramProfile({
    user_id: user.id,
    language_code: telegram.languageCode,
    launch_metadata: {
      launch_source: "telegram_web_app",
    },
    validated_payload: {
      telegramUserId: telegram.telegramUserId,
      username: telegram.username,
    },
    raw_init_data_hash: hashInitData(telegram.raw),
    created_at: timestamp,
  });

  return {
    profile: {
      id: user.id,
      preferredName: input.preferredName,
      telegramUsername: telegram.username,
    },
    telegramProfile: {
      telegramUserId: telegram.telegramUserId,
      languageCode: telegram.languageCode,
    },
    dashboard: {
      botAccess: "locked" as const,
      providerConnectionRequired: true,
    },
    nextStep: "connect_provider" as const,
  };
}

export function buildLaunchPrefill(telegram: ValidatedTelegramInitData) {
  return {
    firstName: telegram.firstName,
    lastName: telegram.lastName,
    preferredName: telegram.firstName,
    telegramUsername: telegram.username,
  };
}
