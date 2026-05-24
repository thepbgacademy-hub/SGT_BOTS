import type { FastifyInstance, FastifyRequest } from "fastify";
import type { TopSecretReviewCandidateStatus } from "./top-secret-review.repo";

function requireTopSecretAdmin(app: FastifyInstance, request: FastifyRequest) {
  const expectedToken = app.appEnv.topSecretAdminToken;
  const providedToken = String(
    request.headers["x-top-secret-admin-token"] ?? "",
  ).trim();

  if (!expectedToken || providedToken !== expectedToken) {
    throw new Error("top secret admin unauthorized");
  }
}

function requireReviewStatus(value: unknown): TopSecretReviewCandidateStatus | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }

  if (value === "pending" || value === "approved" || value === "rejected") {
    return value;
  }

  throw new Error("invalid top secret review status");
}

function replyForTopSecretAdminError(message: string) {
  if (message === "top secret admin unauthorized") {
    return 401;
  }

  if (
    message === "invalid top secret review status" ||
    message === "top secret review candidate not found" ||
    message === "top secret review candidate is not pending"
  ) {
    return 400;
  }

  return 500;
}

export async function registerTopSecretAdminRoutes(app: FastifyInstance) {
  app.get("/api/admin/top-secret/review-candidates", async (request, reply) => {
    try {
      requireTopSecretAdmin(app, request);
      const status = requireReviewStatus(
        (request.query as { status?: string }).status,
      );
      const candidates = await app.topSecretReviewRepo.listReviewCandidates({
        status,
      });

      return reply.code(200).send({ candidates });
    } catch (error) {
      const message = (error as Error).message;
      return reply.code(replyForTopSecretAdminError(message)).send({ message });
    }
  });

  app.post(
    "/api/admin/top-secret/review-candidates/:candidateId/promote",
    async (request, reply) => {
      try {
        requireTopSecretAdmin(app, request);
        const payload = isRecord(request.body)
          ? (request.body as {
          commonSenseStatement?: string;
          requiredSourceHints?: string[];
          researchNote?: string;
          triggerPhrases?: string[];
        })
          : {};
        const requiredSourceHints = Array.isArray(payload.requiredSourceHints)
          ? payload.requiredSourceHints.map((hint) => String(hint).trim()).filter(Boolean)
          : [];
        const triggerPhrases = Array.isArray(payload.triggerPhrases)
          ? payload.triggerPhrases.map((phrase) => String(phrase).trim()).filter(Boolean)
          : [];

        if (
          !String(payload.commonSenseStatement ?? "").trim() ||
          !String(payload.researchNote ?? "").trim() ||
          requiredSourceHints.length === 0 ||
          triggerPhrases.length === 0
        ) {
          throw new Error("invalid top secret review status");
        }

        const approvedEntry = await app.topSecretReviewRepo.promoteReviewCandidate({
          candidateId: String(
            (request.params as { candidateId?: string }).candidateId ?? "",
          ).trim(),
          commonSenseStatement: String(payload.commonSenseStatement).trim(),
          requiredSourceHints,
          researchNote: String(payload.researchNote).trim(),
          triggerPhrases,
        });

        return reply.code(200).send({ approvedEntry });
      } catch (error) {
        const message = (error as Error).message;
        return reply.code(replyForTopSecretAdminError(message)).send({ message });
      }
    },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
