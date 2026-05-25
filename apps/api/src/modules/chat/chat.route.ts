import type { FastifyInstance } from "fastify";
import { authorizeBotRuntimeRequest } from "../bots/runtime-auth";

function replyForChatRuntimeError(message: string) {
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

  if (message === "bot not found" || message === "conversation not found") {
    return 404;
  }

  if (
    message === "conversation belongs to a different bot" ||
    message === "cursive workflow only"
  ) {
    return 409;
  }

  if (message === "message content required") {
    return 400;
  }

  return 500;
}

export async function registerChatRoutes(app: FastifyInstance) {
  app.post("/api/chat/messages", async (request, reply) => {
    try {
      const payload = request.body as {
        sessionId?: string;
        conversationId?: string;
        botId?: string;
        message?: string;
        content?: string;
      };
      const sessionId = String(payload.sessionId ?? "");
      const claims = await authorizeBotRuntimeRequest({
        app,
        request,
        sessionId,
      });

      const result = await app.chatService.sendMessage({
        sessionId,
        userId: claims.userId,
        conversationId:
          typeof payload.conversationId === "string"
            ? payload.conversationId
            : undefined,
        botId: String(payload.botId ?? ""),
        message: String(payload.message ?? payload.content ?? ""),
      });

      app.analyticsService.track({
        eventName: "chat_message_sent",
        entityId: result.conversation.id,
        entityType: "session",
        metadata: {
          botId: result.botId,
          sessionId,
          userId: claims.userId,
        },
      });

      return result;
    } catch (error) {
      const message = (error as Error).message;
      return reply.code(replyForChatRuntimeError(message)).send({ message });
    }
  });
}
