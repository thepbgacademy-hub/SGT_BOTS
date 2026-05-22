import type { FastifyInstance } from "fastify";

export async function registerCursiveRoutes(app: FastifyInstance) {
  app.get("/api/cursive/workflow/entry", async (_request, reply) => {
    return reply.code(200).send(app.cursiveService.getWorkflowEntry());
  });
}
