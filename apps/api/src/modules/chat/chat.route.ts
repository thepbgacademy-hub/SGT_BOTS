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

      if (result.boundaryType === "jailbreak_attempt") {
        const user = await app.profileRepo.getUserById(claims.userId);
        await app.auditEventRepo.insertEvent({
          actor: "user",
          created_at: new Date().toISOString(),
          entity_id: sessionId,
          entity_type: "session",
          event_type: "rori_jailbreak_attempt",
          metadata: {
            botId: result.botId,
            conversationId: result.conversation.id,
            prompt: String(payload.message ?? payload.content ?? ""),
            telegramUserId: user?.telegram_user_id ?? null,
            telegramUsername: user?.username ?? null,
            userId: claims.userId,
            userName: user?.preferred_name ?? user?.first_name ?? null,
          },
        });
      }

      return {
        assistantMessage: result.assistantMessage,
        boundaryType: result.boundaryType,
        botId: result.botId,
        citations: result.citations,
        conversation: result.conversation,
        output: result.output,
        userMessage: result.userMessage,
      };
    } catch (error) {
      const message = (error as Error).message;
      return reply.code(replyForChatRuntimeError(message)).send({ message });
    }
  });
}
