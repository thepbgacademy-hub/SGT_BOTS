import type { ProfileRepo, UserRow } from "../profiles/profile.repo";
import {
  validateTelegramInitData,
  validateTelegramInitDataWithTokens,
} from "./init-data";

export async function resolveAuthenticatedUser(input: {
  initData: string;
  botToken: string;
  botTokens?: string[];
  profileRepo: ProfileRepo;
}): Promise<UserRow> {
  if (!input.initData) {
    throw new Error("missing telegram init data");
  }

  const telegram = input.botTokens?.length
    ? validateTelegramInitDataWithTokens(input.initData, input.botTokens)
    : validateTelegramInitData(input.initData, input.botToken);
  const user = await input.profileRepo.getUserByTelegramUserId(
    telegram.telegramUserId,
  );

  if (!user) {
    throw new Error("profile not found");
  }

  return user;
}
