import type { FastifyInstance } from "fastify";
import { authorizeBotRuntimeRequest } from "./runtime-auth";

function replyForBotRuntimeError(message: string) {
  if (
    message === "missing session token" ||
    message === "invalid session token" ||
    message === "session token expired" ||
    message === "session invalidated" ||
    message === "session expired" ||
    message === "session secret unavailable"
  ) {
    return 401;
  }

  if (message === "session not found") {
    return 404;
  }

  return 500;
}

export async function registerBotRoutes(app: FastifyInstance) {
  app.get("/api/bots", async (request, reply) => {
    try {
      const sessionId = String(
        (request.query as { sessionId?: string }).sessionId ?? "",
      );

      const claims = await authorizeBotRuntimeRequest({
        app,
        request,
        sessionId,
      });

      app.analyticsService.track({
        eventName: "bot_catalog_viewed",
        entityId: sessionId,
        entityType: "session",
        metadata: {
          userId: claims.userId,
        },
      });

      return {
        bots: app.botService.listCatalog(),
      };
    } catch (error) {
      const message = (error as Error).message;
      return reply.code(replyForBotRuntimeError(message)).send({ message });
    }
  });
}
