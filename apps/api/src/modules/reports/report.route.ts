import crypto from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { requireBotManifest } from "../../../../../packages/shared/src/bots/manifests";
import { authorizeBotRuntimeRequest } from "../bots/runtime-auth";
import {
  createCursiveService,
  getMissingCreditBureauDisputeIntakeFieldLabels,
  type CreditBureauDisputeOfficialIntake,
} from "../cursive/cursive.service";
import { createCursiveDraftService } from "../cursive/cursive-draft.service";
import type { CreditBureauDisputeTemplateInput } from "../cursive/templates/credit-bureau-dispute.html";
import type { CursiveCreditBureauDisputeSnapshot } from "./report.service";

const ARTIFACT_DOWNLOAD_URL_TTL_MS = 5 * 60 * 1000;

function replyForReportRuntimeError(message: string) {
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

  if (message === "bot not found") {
    return 404;
  }

  if (message === "pdf uploads only" || message === "invalid pdf file") {
    return 400;
  }

  if (message === "invalid credit bureau") {
    return 400;
  }

  if (message === "artifact not found") {
    return 404;
  }

  if (message === "artifact not ready" || message === "artifact failed") {
    return 409;
  }

  if (isCursiveReviewFailure(message)) {
    return 422;
  }

  if (isCursiveProviderDraftError(message)) {
    return 502;
  }

  return 500;
}

function isCursiveProviderDraftError(message: string) {
  return (
    message.startsWith("provider draft failed") ||
    message === "invalid provider draft response" ||
    message.startsWith("missing provider draft field")
  );
}

function isCursiveReviewFailure(message: string) {
  return message.startsWith("cursive draft review failed:");
}

function getReportRuntimeErrorMessage(message: string) {
  const statusCode = replyForReportRuntimeError(message);

  if (statusCode === 500) {
    return "Unable to render report right now.";
  }

  if (isCursiveReviewFailure(message)) {
    return `Cursive draft review failed: ${message.replace(
      /^cursive draft review failed:\s*/iu,
      "",
    )}`;
  }

  if (isCursiveProviderDraftError(message)) {
    return "Unable to generate the Cursive draft with your connected provider right now. Please retry or reconnect your provider.";
  }

  return message;
}

export async function registerReportRoutes(app: FastifyInstance) {
  app.get("/api/reports/artifacts", async (request, reply) => {
    try {
      const sessionId = String(
        (request.query as { sessionId?: string }).sessionId ?? "",
      ).trim();
      const claims = await authorizeBotRuntimeRequest({
        app,
        request,
        sessionId,
      });
      const downloadExpiresAt = Date.now() + ARTIFACT_DOWNLOAD_URL_TTL_MS;
      const artifacts = app.reportService.listArtifactsForSession({
        sessionId,
        userId: claims.userId,
      });

      return reply.code(200).send({
        artifacts: artifacts.map((artifact) => ({
          artifactType: artifact.artifactType,
          botId: artifact.botId,
          createdAt: artifact.createdAt,
          downloadUrl:
            artifact.status === "ready"
              ? `/api/reports/artifacts/${artifact.id}/download?sessionId=${encodeURIComponent(
                  sessionId,
                )}&downloadToken=${createArtifactDownloadToken({
                  artifactId: artifact.id,
                  expiresAt: downloadExpiresAt,
                  secret: app.appEnv.telegramBotToken,
                  sessionId,
                  userId: claims.userId,
                })}&expiresAt=${encodeURIComponent(String(downloadExpiresAt))}&userId=${encodeURIComponent(claims.userId)}`
              : null,
          failureReason: artifact.failureReason ?? null,
          fileName: artifact.fileName,
          generatedAt: artifact.generatedAt,
          id: artifact.id,
          originalFilename: artifact.originalFilename,
          status: artifact.status,
        })),
      });
    } catch (error) {
      const message = (error as Error).message;
      return reply.code(replyForReportRuntimeError(message)).send({
        message: getReportRuntimeErrorMessage(message),
      });
    }
  });

  app.get("/api/reports/artifacts/:artifactId/download", async (request, reply) => {
    try {
      const sessionId = String(
        (request.query as { sessionId?: string }).sessionId ?? "",
      ).trim();
      const claims = await authorizeArtifactDownloadRequest({
        app,
        artifactId: String(
          (request.params as { artifactId?: string }).artifactId ?? "",
        ).trim(),
        downloadToken: String(
          (request.query as { downloadToken?: string }).downloadToken ?? "",
        ).trim(),
        expiresAt: String((request.query as { expiresAt?: string }).expiresAt ?? "").trim(),
        request,
        sessionId,
        userId: String((request.query as { userId?: string }).userId ?? "").trim(),
      });
      const artifactId = String(
        (request.params as { artifactId?: string }).artifactId ?? "",
      ).trim();
      const artifact = app.reportService.getArtifact(artifactId);

      if (
        !artifact ||
        artifact.sessionId !== sessionId ||
        (claims.userId && artifact.userId !== claims.userId)
      ) {
        throw new Error("artifact not found");
      }

      if (artifact.status === "failed") {
        throw new Error("artifact failed");
      }

      if (artifact.status !== "ready") {
        throw new Error("artifact not ready");
      }

      const fileBytes = app.reportService.readArtifactFile(artifactId);

      if (!fileBytes) {
        throw new Error("missing artifact bytes");
      }

      reply.header("content-type", "application/pdf");
      reply.header(
        "content-disposition",
        `attachment; filename="${artifact.fileName}"`,
      );

      return reply.code(200).send(fileBytes);
    } catch (error) {
      const message = (error as Error).message;
      return reply.code(replyForReportRuntimeError(message)).send({
        message: getReportRuntimeErrorMessage(message),
      });
    }
  });

  app.post("/api/reports/cursive/credit-bureau-dispute/preview", async (request, reply) => {
    try {
      const { claims, intake, manifest, sessionId } = await parseCreditBureauDisputeRequest({
        app,
        request,
      });
      const missingFields = getMissingCreditBureauDisputeIntakeFieldLabels(intake);

      if (missingFields.length > 0) {
        return reply.code(400).send({
          message: `Missing required intake fields: ${missingFields.join(", ")}`,
        });
      }

      const config = await app.cursiveConfigService.getCategoryConfig(
        "credit_bureau_dispute",
      );
      const cursiveService = createCursiveService({
        cursiveDraftService: createCursiveDraftService({
          mode: app.appEnv.providerValidationMode,
        }),
      });
      const sessionSecret = await app.sessionService.getProviderSecretForUser({
        sessionId,
        userId: claims.userId,
      });
      const draft = await cursiveService.generateCreditBureauDisputeDraft({
        config,
        intake,
        sessionSecret,
      });
      const reviewResult = cursiveService.reviewCreditBureauDisputeDraft({
        config,
        draft,
        intake,
      });

      if (reviewResult.status !== "review_ready") {
        throw new Error(
          `cursive draft review failed: ${reviewResult.notes.join(" | ")}`,
        );
      }

      const previewTemplateInput = {
        ...draft.templateInput,
        generatedDate: formatCursiveGeneratedDate(),
      };
      const portalText =
        app.reportService.renderCursiveCreditBureauDisputePortalText(
          previewTemplateInput,
        );
      const previewSnapshot = createCursivePreviewSnapshot({
        portalText,
        templateInput: previewTemplateInput,
      });
      const html =
        app.reportService.renderCursiveCreditBureauDisputePreviewHtml(
          previewTemplateInput,
        );

      return reply.code(200).send({
        categorySlug: "credit_bureau_dispute",
        format: "html",
        html,
        portalText,
        previewSnapshot,
        previewToken: createCursivePreviewToken({
          botId: manifest.id,
          previewSnapshot,
          html,
          secret: app.appEnv.telegramBotToken,
          sessionId,
        }),
      });
    } catch (error) {
      const message = (error as Error).message;
      return reply.code(replyForReportRuntimeError(message)).send({
        message: getReportRuntimeErrorMessage(message),
      });
    }
  });

  app.post(
    "/api/reports/cursive/credit-bureau-dispute/save-pdf-draft",
    async (request, reply) => {
      try {
        const { claims, manifest, payload, sessionId } =
          await parseCreditBureauDisputeRequest({ app, request });
        const previewHtml = String(payload.previewHtml ?? "");
        const previewSnapshot = payload.previewSnapshot;
        const previewToken = String(payload.previewToken ?? "");

        if (!previewHtml || !previewToken || !previewSnapshot) {
          return reply.code(400).send({
            message: "Preview is required before saving the PDF draft.",
          });
        }

        const expectedPreviewToken = createCursivePreviewToken({
          botId: manifest.id,
          html: previewHtml,
          previewSnapshot,
          secret: app.appEnv.telegramBotToken,
          sessionId,
        });

        if (previewToken !== expectedPreviewToken) {
          return reply.code(400).send({
            message: "Preview is required before saving the PDF draft.",
          });
        }

        const result = app.reportService.queueCursiveCreditBureauDisputePdfDraft({
          botId: manifest.id,
          previewHtml,
          previewSnapshot,
          sessionId,
          userId: claims.userId,
        });

        return reply.code(202).send({
          artifact: {
            id: result.artifact.id,
            fileName: result.artifact.fileName,
            originalFilename: result.artifact.originalFilename,
            status: result.artifact.status,
          },
          artifactType: result.artifact.artifactType,
          status: result.status,
        });
      } catch (error) {
        const message = (error as Error).message;
        return reply.code(replyForReportRuntimeError(message)).send({
          message: getReportRuntimeErrorMessage(message),
        });
      }
    },
  );

  app.post("/api/reports/document-wizard", async (request, reply) => {
    try {
      const payload = request.body as {
        botId?: string;
        fileBytesBase64?: string;
        filename?: string;
        formData?: {
          clientName?: string;
          objective?: string;
        };
        mimeType?: string;
        sessionId?: string;
      };
      const sessionId = String(payload.sessionId ?? "");
      const claims = await authorizeBotRuntimeRequest({
        app,
        request,
        sessionId,
      });
      const manifest = requireBotManifest(String(payload.botId ?? ""));

      if (
        !manifest.capabilities.pdf_upload ||
        !manifest.capabilities.structured_form ||
        !manifest.capabilities.html_report
      ) {
        throw new Error("bot not found");
      }

      const result = app.reportService.queueDocumentWizardReport({
        botId: manifest.id,
        fileBytesBase64: String(payload.fileBytesBase64 ?? ""),
        filename: String(payload.filename ?? ""),
        formData: {
          clientName: String(payload.formData?.clientName ?? ""),
          objective: String(payload.formData?.objective ?? ""),
        },
        mimeType: String(payload.mimeType ?? ""),
        sessionId,
        userId: claims.userId,
      });

      return reply.code(202).send({
        artifact: {
          id: result.artifact.id,
          fileName: result.artifact.fileName,
          originalFilename: result.artifact.originalFilename,
          status: result.artifact.status,
        },
        artifactType: result.artifact.artifactType,
        status: result.status,
        upload: {
          mimeType: result.upload.mimeType,
          originalFilename: result.upload.originalFilename,
        },
      });
    } catch (error) {
      const message = (error as Error).message;
      return reply.code(replyForReportRuntimeError(message)).send({
        message: getReportRuntimeErrorMessage(message),
      });
    }
  });
}

async function parseCreditBureauDisputeRequest(input: {
  app: FastifyInstance;
  request: FastifyRequest;
}) {
  const payload = input.request.body as {
    botId?: string;
    intake?: Partial<CreditBureauDisputeOfficialIntake>;
    previewHtml?: string;
    previewSnapshot?: CursiveCreditBureauDisputeSnapshot;
    previewToken?: string;
    sessionId?: string;
  };
  const sessionId = String(payload.sessionId ?? "");
  const claims = await authorizeBotRuntimeRequest({
    app: input.app,
    request: input.request,
    sessionId,
  });
  const manifest = requireBotManifest(String(payload.botId ?? ""));

  if (manifest.id !== "document_wizard" || !manifest.capabilities.structured_form) {
    throw new Error("bot not found");
  }

  return {
    claims,
    manifest,
    payload,
    sessionId,
    intake: {
      consumer_name: String(payload.intake?.consumer_name ?? ""),
      consumer_address: String(payload.intake?.consumer_address ?? ""),
      bureau_choice: String(payload.intake?.bureau_choice ?? ""),
      account_reference: String(payload.intake?.account_reference ?? ""),
      dispute_reason: String(payload.intake?.dispute_reason ?? ""),
    },
  };
}

function createCursivePreviewToken(input: {
  botId: string;
  html: string;
  previewSnapshot: CursiveCreditBureauDisputeSnapshot;
  secret: string;
  sessionId: string;
}) {
  return crypto
    .createHmac("sha256", input.secret)
    .update(input.sessionId)
    .update("\n")
    .update(input.botId)
    .update("\n")
    .update(input.html)
    .update("\n")
    .update(JSON.stringify(input.previewSnapshot))
    .digest("hex");
}

function createArtifactDownloadToken(input: {
  artifactId: string;
  expiresAt: number;
  secret: string;
  sessionId: string;
  userId: string;
}) {
  return crypto
    .createHmac("sha256", input.secret)
    .update(input.sessionId)
    .update("\n")
    .update(input.userId)
    .update("\n")
    .update(input.artifactId)
    .update("\n")
    .update(String(input.expiresAt))
    .digest("hex");
}

async function authorizeArtifactDownloadRequest(input: {
  app: FastifyInstance;
  artifactId: string;
  downloadToken: string;
  expiresAt: string;
  request: FastifyRequest;
  sessionId: string;
  userId: string;
}) {
  if (typeof input.request.headers.authorization === "string") {
    return authorizeBotRuntimeRequest({
      app: input.app,
      request: input.request,
      sessionId: input.sessionId,
    });
  }

  const token = input.downloadToken.trim();
  const expiresAt = Number.parseInt(input.expiresAt, 10);
  const userId = input.userId.trim();

  if (!token || !userId || !Number.isFinite(expiresAt)) {
    throw new Error("missing session token");
  }

  if (expiresAt <= Date.now()) {
    throw new Error("session token expired");
  }

  const expectedDownloadToken = createArtifactDownloadToken({
    artifactId: input.artifactId,
    expiresAt,
    secret: input.app.appEnv.telegramBotToken,
    sessionId: input.sessionId,
    userId,
  });

  if (token !== expectedDownloadToken) {
    throw new Error("invalid session token");
  }

  await input.app.sessionService.authorizeRequest({
    sessionId: input.sessionId,
    userId,
  });

  return {
    sessionId: input.sessionId,
    userId,
  };
}

function createCursivePreviewSnapshot(input: {
  portalText: string;
  templateInput: CreditBureauDisputeTemplateInput;
}): CursiveCreditBureauDisputeSnapshot {
  return {
    categorySlug: "credit_bureau_dispute",
    generatedDate:
      input.templateInput.generatedDate ?? formatCursiveGeneratedDate(),
    consumerName: input.templateInput.consumerName,
    consumerAddressLines: [...input.templateInput.consumerAddressLines],
    bureauName: input.templateInput.bureauName,
    bureauAddressLines: [...input.templateInput.bureauAddressLines],
    subjectLine: input.templateInput.subjectLine,
    salutation: input.templateInput.salutation,
    bodyParagraphs: [...input.templateInput.bodyParagraphs],
    closing: input.templateInput.closing,
    enclosures: [...(input.templateInput.enclosures ?? [])],
    citations: [...input.templateInput.citations],
    portalText: input.portalText,
  };
}

function formatCursiveGeneratedDate() {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}
