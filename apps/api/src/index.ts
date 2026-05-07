import { buildApp } from "./app";
import { readEnv } from "./config/env";
import { startTelegramPolling } from "./modules/telegram/telegram-bot.service";

const env = readEnv();
const app = await buildApp({ env });

await app.listen({
  host: "0.0.0.0",
  port: env.appPort,
});

if (env.telegramBotRuntimeMode === "polling") {
  startTelegramPolling({
    env,
    logger: app.log,
  });
}
