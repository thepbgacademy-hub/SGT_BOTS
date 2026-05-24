import type { FastifyInstance } from "fastify";
import { resolveAuthenticatedUser } from "../telegram/telegram-auth";
import { connectProvider } from "./provider.service";

export async function registerProviderRoutes(app: FastifyInstance) {
  app.post("/api/providers/connect", async (request, reply) => {
    try {
      const user = await resolveAuthenticatedUser({
        initData: String(request.headers["x-telegram-init-data"] ?? ""),
        botTokens: app.appEnv.telegramBotTokens,
        profileRepo: app.profileRepo,
      });

      const result = await connectProvider(
        request.body as {
          provider: string;
          apiKey: string;
        },
        {
          issueSessionToken: (input) =>
            app.sessionTokenService.issueToken(input),
          userId: user.id,
          providerValidationMode: app.appEnv.providerValidationMode,
          startSession: (input) => app.sessionService.startSession(input),
        },
      );

      app.analyticsService.track({
        eventName: "provider_connected",
        entityId: result.session.id,
        entityType: "session",
        metadata: {
          provider: result.provider,
          userId: user.id,
        },
      });

      return result;
    } catch (error) {
      const message = (error as Error).message;
      const statusCode =
        message === "missing telegram init data" ||
        message === "invalid telegram init data" ||
        message === "stale telegram init data" ||
        message === "profile not found"
          ? 401
          : message === "unsupported provider" ||
              message.startsWith("invalid api key for")
            ? 400
            : message.startsWith("provider validation failed for")
              ? 502
              : 500;

      return reply.code(statusCode).send({
        message,
      });
    }
  });
}
