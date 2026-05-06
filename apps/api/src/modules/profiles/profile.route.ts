import type { FastifyInstance } from "fastify";
import { createProfile } from "./profile.service";

export async function registerProfileRoutes(app: FastifyInstance) {
  app.post("/api/profiles", async (request, reply) => {
    try {
      const result = await createProfile(
        request.body as {
          initData: string;
          firstName: string;
          lastName?: string;
          preferredName: string;
        },
        {
          botToken: app.appEnv.telegramBotToken,
          profileRepo: app.profileRepo,
        },
      );

      app.analyticsService.track({
        eventName: "profile_created",
        entityId: result.profile.id,
        entityType: "profile",
        metadata: {
          providerConnectionRequired: result.dashboard.providerConnectionRequired,
        },
      });

      return reply.code(201).send(result);
    } catch (error) {
      const message = (error as Error).message;

      return reply
        .code(
          message === "invalid telegram init data" ||
            message === "stale telegram init data"
            ? 401
            : 500,
        )
        .send({
          message: (error as Error).message,
        });
    }
  });
}
