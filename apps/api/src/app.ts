import Fastify from "fastify";
import type { BotCatalogEntry } from "../../../packages/shared/src/bots/manifests";
import {
  createInMemoryReportQueue,
  type RenderReportJobRunner,
} from "../../../workers/queue/src";
import { readEnv, type AppEnv } from "./config/env";
import { createAnalyticsService } from "./modules/analytics/analytics.service";
import {
  createInMemoryBotRegistryRepo,
  createSupabaseBotRegistryRepo,
  type BotRegistryRepo,
} from "./modules/bots/bot-registry.repo";
import { registerBotRoutes } from "./modules/bots/bot.route";
import { createBotService } from "./modules/bots/bot.service";
import { registerChatRoutes } from "./modules/chat/chat.route";
import { createChatService } from "./modules/chat/chat.service";
import {
  createRoriDirectoryRepo,
  type RoriAcademyDirectoryRepo,
} from "./modules/chat/rori-directory.repo";
import {
  createRoriWikiRepo,
  type RoriWikiRepo,
} from "./modules/chat/rori-wiki.repo";
import { createCursiveConfigService, type CursiveConfigService } from "./modules/cursive/cursive-live-config.service";
import { registerCursiveRoutes } from "./modules/cursive/cursive.route";
import { createCursiveService } from "./modules/cursive/cursive.service";
import {
  createInMemoryProfileRepo,
  createSupabaseProfileRepo,
  type ProfileRepo,
} from "./modules/profiles/profile.repo";
import {
  createInMemoryPlaygroundParticipationRepo,
  createSupabasePlaygroundParticipationRepo,
  type PlaygroundParticipationRepo,
} from "./modules/playground/playground-participation.repo";
import { buildLaunchPrefill } from "./modules/profiles/profile.service";
import { registerProfileRoutes } from "./modules/profiles/profile.route";
import { registerProviderRoutes } from "./modules/providers/provider.route";
import { registerReportRoutes } from "./modules/reports/report.route";
import { createReportService } from "./modules/reports/report.service";
import { registerReviewRoutes } from "./modules/reviews/review.route";
import { createReviewService } from "./modules/reviews/review.service";
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
import { validateTelegramInitDataWithTokens } from "./modules/telegram/init-data";
import { registerTopSecretAdminRoutes } from "./modules/top-secret/top-secret-admin.route";
import {
  createInMemoryTopSecretReviewRepo,
  createSupabaseTopSecretReviewRepo,
  type TopSecretReviewRepo,
} from "./modules/top-secret/top-secret-review.repo";
import { createUploadService } from "./modules/uploads/upload.service";

declare module "fastify" {
  interface FastifyInstance {
    appEnv: AppEnv;
    analyticsService: ReturnType<typeof createAnalyticsService>;
    profileRepo: ProfileRepo;
    sessionMetadataRepo: SessionMetadataRepo;
    sessionSecretStore: SessionSecretStore;
    sessionTokenService: ReturnType<typeof createSessionTokenService>;
    botService: {
      listCatalog(): Promise<BotCatalogEntry[]>;
    };
    uploadService: ReturnType<typeof createUploadService>;
    reportService: ReturnType<typeof createReportService>;
    chatService: ReturnType<typeof createChatService>;
    cursiveService: Pick<ReturnType<typeof createCursiveService>, "getWorkflowEntry">;
    reviewService: ReturnType<typeof createReviewService>;
    sessionService: ReturnType<typeof createSessionService>;
    cursiveConfigService: CursiveConfigService;
    topSecretReviewRepo: TopSecretReviewRepo;
    playgroundParticipationRepo: PlaygroundParticipationRepo;
  }
}

export async function buildApp(options?: {
  env?: AppEnv;
  now?: () => number;
  botRegistryRepo?: BotRegistryRepo;
  profileRepo?: ProfileRepo;
  sessionMetadataRepo?: SessionMetadataRepo;
  sessionSecretStore?: SessionSecretStore;
  reportQueueJobRunner?: RenderReportJobRunner;
  roriDirectoryRepo?: RoriAcademyDirectoryRepo;
  roriWikiRepo?: RoriWikiRepo;
  topSecretReviewRepo?: TopSecretReviewRepo;
  playgroundParticipationRepo?: PlaygroundParticipationRepo;
}) {
  // JSON uploads include base64-encoded PDFs, so the default ~1 MiB limit is too
  // small for ordinary documents before our own validation runs.
  const app = Fastify({
    bodyLimit: 8 * 1024 * 1024,
  });
  const appEnv = options?.env ?? readEnv();
  app.decorate("appEnv", appEnv);
  app.decorate("analyticsService", createAnalyticsService({ now: options?.now }));
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
  const botRegistryRepo =
    options?.botRegistryRepo ??
    (appEnv.profileRepoMode === "memory"
      ? createInMemoryBotRegistryRepo()
      : createSupabaseBotRegistryRepo(appEnv));
  app.decorate(
    "playgroundParticipationRepo",
    options?.playgroundParticipationRepo ??
      (appEnv.profileRepoMode === "memory"
        ? createInMemoryPlaygroundParticipationRepo()
        : createSupabasePlaygroundParticipationRepo(appEnv)),
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
  app.decorate("botService", createBotService({ registryRepo: botRegistryRepo }));
  app.decorate(
    "chatService",
    createChatService({
      now: options?.now,
      roriDirectoryRepo:
        options?.roriDirectoryRepo ?? createRoriDirectoryRepo(appEnv),
      roriWikiRepo: options?.roriWikiRepo ?? createRoriWikiRepo(appEnv),
    }),
  );
  app.decorate("cursiveService", createCursiveService());
  app.decorate("cursiveConfigService", createCursiveConfigService(appEnv));
  app.decorate(
    "topSecretReviewRepo",
    options?.topSecretReviewRepo ??
      (appEnv.profileRepoMode === "memory"
        ? createInMemoryTopSecretReviewRepo()
        : createSupabaseTopSecretReviewRepo(appEnv)),
  );
  app.decorate("uploadService", createUploadService({ now: options?.now }));
  let reportService!: ReturnType<typeof createReportService>;
  const reportQueue = createInMemoryReportQueue({
    onCompleted(result) {
      reportService.markArtifactRendered({
        artifactId: result.artifactId,
        byteSize: result.bytes.byteLength,
        fileBytes: result.bytes,
      });
    },
    onFailed(input) {
      reportService.markArtifactFailed({
        artifactId: input.artifactId,
        reason: input.message,
      });
    },
    runRenderReportJob: options?.reportQueueJobRunner,
  });
  reportService = createReportService({
    analyticsService: app.analyticsService,
    now: options?.now,
    uploadService: app.uploadService,
    reportQueue,
  });
  app.decorate("reportService", reportService);
  app.decorate(
    "reviewService",
    createReviewService({
      analyticsService: app.analyticsService,
      metadataRepo: app.sessionMetadataRepo,
      now: options?.now,
      reviewGroupUrl: appEnv.telegramReviewGroupUrl,
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
          validateTelegramInitDataWithTokens(
            initData,
            app.appEnv.telegramBotTokens,
          ),
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
  await registerBotRoutes(app);
  await registerChatRoutes(app);
  await registerCursiveRoutes(app);
  await registerReportRoutes(app);
  await registerReviewRoutes(app);
  await registerTopSecretAdminRoutes(app);
  return app;
}
