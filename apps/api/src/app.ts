import Fastify from "fastify";
import { readEnv, type AppEnv } from "./config/env";
import {
  createInMemoryProfileRepo,
  createSupabaseProfileRepo,
  type ProfileRepo,
} from "./modules/profiles/profile.repo";
import { buildLaunchPrefill } from "./modules/profiles/profile.service";
import { registerProfileRoutes } from "./modules/profiles/profile.route";
import { registerProviderRoutes } from "./modules/providers/provider.route";
import {
  createSessionService,
  type SessionSnapshot,
} from "./modules/sessions/session.service";
import {
  createInMemorySessionSecretStore,
  type SessionSecretStore,
} from "./modules/sessions/session.store";
import {
  createInMemorySessionMetadataRepo,
  createSupabaseSessionMetadataRepo,
  type SessionMetadataRepo,
} from "./modules/sessions/session.repo";
import { registerSessionRoutes } from "./modules/sessions/session.route";
import { createSessionTokenService } from "./modules/sessions/session.token";
import { registerTelegramRoutes } from "./modules/telegram/telegram.route";
import { validateTelegramInitData } from "./modules/telegram/init-data";

declare module "fastify" {
  interface FastifyInstance {
    appEnv: AppEnv;
    profileRepo: ProfileRepo;
    sessionMetadataRepo: SessionMetadataRepo;
    sessionSecretStore: SessionSecretStore;
    sessionTokenService: ReturnType<typeof createSessionTokenService>;
    sessionService: {
      startSession(input: {
        userId: string;
        provider: SessionSnapshot["provider"];
        apiKey: string;
      }): Promise<SessionSnapshot>;
      getSessionForUser(input: {
        sessionId: string;
        userId: string;
      }): Promise<SessionSnapshot>;
      authorizeRequest(input: {
        sessionId: string;
        userId: string;
        requestStartedAt?: string;
      }): Promise<{
        status: "allowed";
      }>;
    };
  }
}

export async function buildApp(options?: {
  env?: AppEnv;
  now?: () => number;
  profileRepo?: ProfileRepo;
  sessionMetadataRepo?: SessionMetadataRepo;
  sessionSecretStore?: SessionSecretStore;
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
  app.decorate(
    "sessionMetadataRepo",
    options?.sessionMetadataRepo ??
      (appEnv.profileRepoMode === "memory"
        ? createInMemorySessionMetadataRepo()
        : createSupabaseSessionMetadataRepo(appEnv)),
  );
  app.decorate(
    "sessionSecretStore",
    options?.sessionSecretStore ?? createInMemorySessionSecretStore(),
  );
  app.decorate(
    "sessionService",
    createSessionService({
      metadataRepo: app.sessionMetadataRepo,
      now: options?.now,
      secretStore: app.sessionSecretStore,
    }),
  );
  app.decorate(
    "sessionTokenService",
    createSessionTokenService({
      now: options?.now,
      secret: appEnv.telegramBotToken,
    }),
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
  await registerProviderRoutes(app);
  await registerSessionRoutes(app);
  return app;
}
