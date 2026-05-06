import type { FastifyInstance } from "fastify";
import { readBearerToken } from "../sessions/session.token";
import type { ReviewPromptReason } from "./review.service";

function requireReviewPromptReason(value: unknown): ReviewPromptReason {
  if (value === "early_exit" || value === "timeout") {
    return value;
  }

  throw new Error("invalid review prompt reason");
}

function replyForReviewError(message: string) {
  if (
    message === "missing session token" ||
    message === "invalid session token"
  ) {
    return 401;
  }

  if (
    message === "session not found" ||
    message === "invalid review prompt reason"
  ) {
    return 400;
  }

  return 500;
}

export async function registerReviewRoutes(app: FastifyInstance) {
  app.post("/api/reviews/prompt", async (request, reply) => {
    try {
      const payload = request.body as {
        reason?: string;
        sessionId?: string;
      };
      const sessionId = String(payload.sessionId ?? "").trim();

      if (!sessionId) {
        throw new Error("session not found");
      }

      const token = readBearerToken(
        typeof request.headers.authorization === "string"
          ? request.headers.authorization
          : undefined,
      );
      const claims = app.sessionTokenService.verifyToken(token, {
        allowExpired: true,
      });

      if (claims.sessionId !== sessionId) {
        throw new Error("invalid session token");
      }

      return await app.reviewService.promptForReview({
        reason: requireReviewPromptReason(payload.reason),
        sessionId,
        userId: claims.userId,
      });
    } catch (error) {
      const message = (error as Error).message;
      return reply.code(replyForReviewError(message)).send({ message });
    }
  });
}
