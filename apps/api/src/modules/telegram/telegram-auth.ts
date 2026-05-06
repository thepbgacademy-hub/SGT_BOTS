import type { ProfileRepo, UserRow } from "../profiles/profile.repo";
import { validateTelegramInitData } from "./init-data";

export async function resolveAuthenticatedUser(input: {
  initData: string;
  botToken: string;
  profileRepo: ProfileRepo;
}): Promise<UserRow> {
  if (!input.initData) {
    throw new Error("missing telegram init data");
  }

  const telegram = validateTelegramInitData(input.initData, input.botToken);
  const user = await input.profileRepo.getUserByTelegramUserId(
    telegram.telegramUserId,
  );

  if (!user) {
    throw new Error("profile not found");
  }

  return user;
}
