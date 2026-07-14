import type { FastifyInstance } from "fastify";
import { requireBotManifest } from "../../../../../packages/shared/src/bots/manifests";
import { authorizeBotRuntimeRequest } from "../bots/runtime-auth";
import type { FormWizardGuidedIntake } from "./form-wizard.service";

function replyForFormWizardRuntimeError(message: string) {
  if (
    message === "missing session token" ||
    message === "invalid session token" ||
    message === "session token expired" ||
    message === "session invalidated" ||
    message === "session expired"
  ) {
    return 401;
  }

  if (message === "bot not found") {
    return 404;
  }

  return 500;
}

export async function registerFormWizardRoutes(app: FastifyInstance) {
  app.get("/api/form-wizard/workflow/entry", async (_request, reply) => {
    return reply.code(200).send(app.formWizardService.getWorkflowEntry());
  });

  app.post(
    "/api/form-wizard/workflow/guided-intake/validate",
    async (request, reply) => {
      try {
        const payload = request.body as {
          sessionId?: string;
          botId?: string;
          intake?: Partial<FormWizardGuidedIntake>;
        };
        const sessionId = String(payload.sessionId ?? "");
        await authorizeBotRuntimeRequest({
          app,
          request,
          sessionId,
        });
        const manifest = requireBotManifest(
          String(payload.botId ?? "form_wizard"),
        );

        if (
          manifest.id !== "form_wizard" ||
          !manifest.capabilities.structured_form
        ) {
          throw new Error("bot not found");
        }

        const result = app.formWizardService.validateGuidedIntake(
          payload.intake ?? {},
        );

        if (result.status === "incomplete") {
          return reply.code(400).send(result);
        }

        return reply.code(200).send(result);
      } catch (error) {
        const message = (error as Error).message;
        return reply
          .code(replyForFormWizardRuntimeError(message))
          .send({ message });
      }
    },
  );
}
