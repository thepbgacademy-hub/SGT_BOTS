import type { FastifyInstance } from "fastify";
import { buildLaunchContext, buildWelcomeButton } from "./telegram.service";

export async function registerTelegramRoutes(app: FastifyInstance) {
  app.get("/api/telegram/welcome-link", async () => {
    return {
      button: buildWelcomeButton(app.appEnv),
    };
  });

  app.get("/api/telegram/launch", async (request, reply) => {
    const initData = String((request.query as { initData?: string }).initData ?? "");

    try {
      return buildLaunchContext({
        initData,
        env: app.appEnv,
      });
    } catch (error) {
      return reply.code(401).send({
        message: (error as Error).message,
      });
    }
  });
}
