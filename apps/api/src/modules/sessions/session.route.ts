import type { FastifyInstance } from "fastify";
import { readBearerToken } from "./session.token";

export async function registerSessionRoutes(app: FastifyInstance) {
  app.get("/api/sessions/:sessionId", async (request, reply) => {
    try {
      const sessionId = String(
        (request.params as { sessionId?: string }).sessionId ?? "",
      );
      const token = readBearerToken(
        typeof request.headers.authorization === "string"
          ? request.headers.authorization
          : undefined,
      );
      const claims = app.sessionTokenService.verifyToken(token);

      if (claims.sessionId !== sessionId) {
        throw new Error("invalid session token");
      }

      return {
        session: await app.sessionService.getSessionForUser({
          sessionId,
          userId: claims.userId,
        }),
      };
    } catch (error) {
      const message = (error as Error).message;

      return reply
        .code(
          message === "missing session token" ||
            message === "invalid session token" ||
            message === "session token expired" ||
            message === "session invalidated"
            ? 401
            : message === "session not found"
              ? 404
              : 500,
        )
        .send({ message });
    }
  });
}
