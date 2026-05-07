import type { AppEnv } from "../../config/env";
import {
  validateTelegramInitData,
  type ValidatedTelegramInitData,
} from "./init-data";

export function buildWelcomeButton(env: AppEnv) {
  return {
    text: "Open Playground",
    url: `https://t.me/${env.telegramBotUsername}/${env.telegramBotAppShortName}?startapp=profile-onboarding`,
  };
}

export function buildLaunchContext(input: {
  initData: string;
  env: AppEnv;
}): {
  telegram: ValidatedTelegramInitData;
  welcomeButton: ReturnType<typeof buildWelcomeButton>;
} {
  return {
    telegram: validateTelegramInitData(input.initData, input.env.telegramBotToken),
    welcomeButton: buildWelcomeButton(input.env),
  };
}
