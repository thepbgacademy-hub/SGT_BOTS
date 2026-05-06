import Fastify from "fastify";
import { readEnv, type AppEnv } from "./config/env";
import {
  createInMemoryProfileRepo,
  createSupabaseProfileRepo,
  type ProfileRepo,
} from "./modules/profiles/profile.repo";
import { buildLaunchPrefill } from "./modules/profiles/profile.service";
import { registerProfileRoutes } from "./modules/profiles/profile.route";
import { registerTelegramRoutes } from "./modules/telegram/telegram.route";
import { validateTelegramInitData } from "./modules/telegram/init-data";

declare module "fastify" {
  interface FastifyInstance {
    appEnv: AppEnv;
    profileRepo: ProfileRepo;
  }
}

export async function buildApp(options?: {
  env?: AppEnv;
  profileRepo?: ProfileRepo;
}) {
  const app = Fastify();
  const appEnv = options?.env ?? readEnv();
  app.decorate("appEnv", appEnv);
  app.decorate(
    "profileRepo",
    options?.profileRepo ??
      (appEnv.profileRepoMode === "memory"
        ? createInMemoryProfileRepo()
        : createSupabaseProfileRepo(appEnv)),
  );

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.get("/api/telegram/prefill", async (request, reply) => {
    const initData = String((request.query as { initData?: string }).initData ?? "");

    try {
      return {
        profile: buildLaunchPrefill(
          validateTelegramInitData(initData, app.appEnv.telegramBotToken),
        ),
      };
    } catch (error) {
      return reply.code(401).send({
        message: (error as Error).message,
      });
    }
  });

  await registerTelegramRoutes(app);
  await registerProfileRoutes(app);
  return app;
}
