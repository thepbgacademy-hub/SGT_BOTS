import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderCreditBureauDisputeHtml,
  renderCreditBureauDisputePortalText,
  type CreditBureauDisputeTemplateInput,
} from "../cursive/templates/credit-bureau-dispute.html";
import {
  renderBureauRemovalDemandHtml,
  renderBureauRemovalDemandPortalText,
  type BureauRemovalDemandTemplateInput,
} from "../cursive/templates/bureau-removal-demand.html";
import {
  renderTopSecretReportHtml,
  type TopSecretReportTemplateInput,
} from "../top-secret/templates/top-secret-report.html";
import {
  analyzeCursiveUploadedReport,
  buildConsumerFromUploadText,
} from "../cursive/cursive-upload-analysis.service";
import type { createAnalyticsService } from "../analytics/analytics.service";
import type { createUploadService, StoredUpload } from "../uploads/upload.service";
import type { createInMemoryReportQueue } from "../../../../../workers/queue/src";

const DOCUMENT_WIZARD_TEMPLATE_PATH = new URL(
  "../../../templates/document-wizard-report.html",
  import.meta.url,
);

type ArtifactRecord = {
  artifactType: "pdf";
  botId: string;
  createdAt: string;
  cursiveDraftSnapshot?: CursiveCreditBureauDisputeSnapshot;
  cursiveRemovalDemandSnapshot?: CursiveBureauRemovalDemandSnapshot;
  diskPath: string;
  failureReason?: string;
  internalFailureReason?: string;
  fileBytes?: Buffer;
  fileName: string;
  generatedAt: string;
  id: string;
  originalFilename: string;
  sessionId: string;
  status: "queued" | "ready" | "failed";
  storagePath: string;
  templateId: string;
  topSecretSnapshot?: TopSecretReportSnapshot;
  uploadId: string | null;
  userId: string;
};

export type CursiveCreditBureauDisputeSnapshot = {
  categorySlug: "credit_bureau_dispute";
  generatedDate: string;
  consumerName: string;
  consumerAddressLines: string[];
  bureauName: string;
  bureauAddressLines: string[];
  subjectLine: string;
  salutation: string;
  bodyParagraphs: string[];
  closing: string;
  enclosures?: string[];
  citations: string[];
  portalText: string;
};

export type CursiveBureauRemovalDemandSnapshot = {
  templateSlug: "bureau_removal_demand";
  generatedDate: string;
  consumerName: string;
  bureauName: string;
  violationType: string;
  violationLabel: string;
  portalText: string;
  templateInput: BureauRemovalDemandTemplateInput;
};

export type TopSecretReportSnapshot = {
  templateSlug: "top_secret_fact_check";
  generatedDate: string;
  findings: TopSecretReportTemplateInput["findings"];
};

function toSafeReportSlug(value: string) {
  const slug = value
    .trim()
    .replace(/^@+/u, "")
    .replace(/[^A-Za-z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "");

  return slug || "top_secret";
}

export function createReportService(deps: {
  analyticsService: ReturnType<typeof createAnalyticsService>;
  now?: () => number;
  reportQueue: ReturnType<typeof createInMemoryReportQueue>;
  uploadService: ReturnType<typeof createUploadService>;
}) {
  const artifacts = new Map<string, ArtifactRecord>();
  const now = deps.now ?? (() => Date.now());
  const artifactRoot = path.resolve(process.cwd(), ".runtime-artifacts");

  function ensureArtifactDirectory(filePath: string) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }

  function resolveArtifactDiskPath(storagePath: string) {
    return path.join(artifactRoot, storagePath.replaceAll("/", path.sep));
  }

  function resolveArtifactMetadataPath(storagePath: string) {
    return `${resolveArtifactDiskPath(storagePath)}.json`;
  }

  function sanitizeArtifactFailureReason(templateId: string, reason: string) {
    if (
      templateId !== "credit_bureau_dispute_v1" &&
      templateId !== "bureau_removal_demand_v2"
    ) {
      return reason;
    }

    return "Unable to render this PDF draft right now.";
  }

  function toPersistedArtifactRecord(artifact: ArtifactRecord) {
    return {
      artifactType: artifact.artifactType,
      botId: artifact.botId,
      createdAt: artifact.createdAt,
      cursiveDraftSnapshot: artifact.cursiveDraftSnapshot,
      cursiveRemovalDemandSnapshot: artifact.cursiveRemovalDemandSnapshot,
      diskPath: artifact.diskPath,
      failureReason: artifact.failureReason,
      fileName: artifact.fileName,
      generatedAt: artifact.generatedAt,
      id: artifact.id,
      internalFailureReason: artifact.internalFailureReason,
      originalFilename: artifact.originalFilename,
      sessionId: artifact.sessionId,
      status: artifact.status,
      storagePath: artifact.storagePath,
      templateId: artifact.templateId,
      topSecretSnapshot: artifact.topSecretSnapshot,
      uploadId: artifact.uploadId,
      userId: artifact.userId,
    } satisfies Omit<ArtifactRecord, "fileBytes">;
  }

  function persistArtifactMetadata(artifact: ArtifactRecord) {
    const metadataPath = resolveArtifactMetadataPath(artifact.storagePath);
    ensureArtifactDirectory(metadataPath);
    fs.writeFileSync(
      metadataPath,
      JSON.stringify(toPersistedArtifactRecord(artifact), null, 2),
      "utf8",
    );
  }

  function deleteArtifactFiles(artifact: ArtifactRecord) {
    if (fs.existsSync(artifact.diskPath)) {
      fs.rmSync(artifact.diskPath, { force: true });
    }

    const metadataPath = resolveArtifactMetadataPath(artifact.storagePath);

    if (fs.existsSync(metadataPath)) {
      fs.rmSync(metadataPath, { force: true });
    }
  }

  function purgeArtifactsForSessionBot(input: {
    botId: string;
    sessionId: string;
    userId: string;
  }) {
    for (const artifact of [...artifacts.values()]) {
      if (
        artifact.botId !== input.botId ||
        artifact.sessionId !== input.sessionId ||
        artifact.userId !== input.userId
      ) {
        continue;
      }

      artifacts.delete(artifact.id);
      deleteArtifactFiles(artifact);
    }
  }

  function hydrateArtifactsFromDisk() {
    if (!fs.existsSync(artifactRoot)) {
      return;
    }

    for (const metadataPath of walkArtifactMetadataFiles(artifactRoot)) {
      const artifact = JSON.parse(
        fs.readFileSync(metadataPath, "utf8"),
      ) as Omit<ArtifactRecord, "fileBytes">;
      artifacts.set(artifact.id, artifact);
    }
  }

  function walkArtifactMetadataFiles(root: string): string[] {
    const files: string[] = [];

    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      const entryPath = path.join(root, entry.name);

      if (entry.isDirectory()) {
        files.push(...walkArtifactMetadataFiles(entryPath));
        continue;
      }

      if (entry.isFile() && entry.name.endsWith(".json")) {
        files.push(entryPath);
      }
    }

    return files;
  }

  hydrateArtifactsFromDisk();

  function queueArtifact(input: {
    botId: string;
    artifactFileName: string;
    formData: {
      clientName: string;
      objective: string;
    };
    sessionId: string;
    templateId: string;
    upload: StoredUpload;
    userId: string;
  }) {
    const generatedAt = new Date(now()).toISOString();
    const artifactId = crypto.randomUUID();
    const artifact: ArtifactRecord = {
      artifactType: "pdf",
      botId: input.botId,
      createdAt: generatedAt,
      fileName: input.artifactFileName,
      generatedAt,
      id: artifactId,
      originalFilename: input.upload.originalFilename,
      sessionId: input.sessionId,
      status: "queued",
      storagePath: `artifacts/${input.sessionId}/${artifactId}/${input.artifactFileName}`,
      templateId: input.templateId,
      uploadId: input.upload.id,
      userId: input.userId,
      diskPath: resolveArtifactDiskPath(
        `artifacts/${input.sessionId}/${artifactId}/${input.artifactFileName}`,
      ),
    };

    artifacts.set(artifact.id, artifact);
    persistArtifactMetadata(artifact);

    deps.reportQueue.enqueueRenderReportJob({
      artifactFileName: artifact.fileName,
      artifactId: artifact.id,
      formData: input.formData,
      generatedAt,
      templateId: artifact.templateId,
      templatePath: fileURLToPath(DOCUMENT_WIZARD_TEMPLATE_PATH),
      upload: {
        originalFilename: input.upload.originalFilename,
        mimeType: input.upload.mimeType,
        byteSize: input.upload.byteSize,
      },
    });

    deps.analyticsService.track({
      eventName: "report_queued",
      entityId: artifact.id,
      entityType: "report",
      metadata: {
        botId: input.botId,
        sessionId: input.sessionId,
        uploadId: input.upload.id,
        userId: input.userId,
      },
    });

    return {
      artifact,
      status: "queued" as const,
      upload: input.upload,
    };
  }

  return {
    queueDocumentWizardReport(input: {
      botId: string;
      fileBytesBase64: string;
      filename: string;
      formData: {
        clientName: string;
        objective: string;
      };
      mimeType: string;
      sessionId: string;
      userId: string;
    }) {
      const upload = deps.uploadService.createPdfUpload({
        botId: input.botId,
        fileBytesBase64: input.fileBytesBase64,
        filename: input.filename,
        mimeType: input.mimeType,
        sessionId: input.sessionId,
      });

      return queueArtifact({
        artifactFileName: "document-wizard-report.pdf",
        botId: input.botId,
        formData: input.formData,
        sessionId: input.sessionId,
        templateId: "document_wizard_v1",
        upload,
        userId: input.userId,
      });
    },
    analyzeCursiveUploadedReport(input: {
      botId: string;
      fileBytesBase64: string;
      filename: string;
      mimeType: string;
      reportType: "tri_merge" | "single_bureau";
      sessionId: string;
    }) {
      const upload = deps.uploadService.createPdfUpload({
        botId: input.botId,
        fileBytesBase64: input.fileBytesBase64,
        filename: input.filename,
        mimeType: input.mimeType,
        sessionId: input.sessionId,
      });
      const consumer = buildConsumerFromUploadText({
        fallbackName: "Consumer",
        fallbackAddressLines: ["Mailing address on file"],
        fileBytes: upload.fileBytes,
      });
      const issues = analyzeCursiveUploadedReport({
        fileBytes: upload.fileBytes,
        reportType: input.reportType,
      });

      return {
        consumer,
        issues,
        upload,
      };
    },
    queueCursiveUploadAnalysisPdfDraft(input: {
      botId: string;
      previewHtml: string;
      previewSnapshot: CursiveBureauRemovalDemandSnapshot;
      uploadId: string;
      sessionId: string;
      userId: string;
    }) {
      const generatedAt = new Date(now()).toISOString();
      const artifactId = crypto.randomUUID();
      const artifact: ArtifactRecord = {
        artifactType: "pdf",
        botId: input.botId,
        createdAt: generatedAt,
        cursiveRemovalDemandSnapshot: input.previewSnapshot,
        fileName: "bureau-removal-demand-letter.pdf",
        generatedAt,
        id: artifactId,
        originalFilename: "uploaded-report-analysis.pdf",
        sessionId: input.sessionId,
        status: "queued",
        storagePath: `artifacts/${input.sessionId}/${artifactId}/bureau-removal-demand-letter.pdf`,
        templateId: "bureau_removal_demand_v2",
        uploadId: input.uploadId,
        userId: input.userId,
        diskPath: resolveArtifactDiskPath(
          `artifacts/${input.sessionId}/${artifactId}/bureau-removal-demand-letter.pdf`,
        ),
      };

      artifacts.set(artifact.id, artifact);
      persistArtifactMetadata(artifact);

      deps.reportQueue.enqueueRenderReportJob({
        artifactFileName: artifact.fileName,
        artifactId: artifact.id,
        generatedAt,
        html: input.previewHtml,
        templateId: artifact.templateId,
      });

      deps.analyticsService.track({
        eventName: "report_queued",
        entityId: artifact.id,
        entityType: "report",
        metadata: {
          botId: input.botId,
          sessionId: input.sessionId,
          templateSlug: "bureau_removal_demand",
          uploadId: input.uploadId,
          userId: input.userId,
        },
      });

      return {
        artifact,
        status: "queued" as const,
      };
    },
    queueCursiveCreditBureauDisputePdfDraft(input: {
      botId: string;
      previewHtml: string;
      previewSnapshot: CursiveCreditBureauDisputeSnapshot;
      sessionId: string;
      userId: string;
    }) {
      const generatedAt = new Date(now()).toISOString();
      const artifactId = crypto.randomUUID();
      const artifact: ArtifactRecord = {
        artifactType: "pdf",
        botId: input.botId,
        createdAt: generatedAt,
        cursiveDraftSnapshot: input.previewSnapshot,
        fileName: "credit-bureau-dispute-letter.pdf",
        generatedAt,
        id: artifactId,
        originalFilename: "credit-bureau-dispute-preview.html",
        sessionId: input.sessionId,
        status: "queued",
        storagePath: `artifacts/${input.sessionId}/${artifactId}/credit-bureau-dispute-letter.pdf`,
        templateId: "credit_bureau_dispute_v1",
        uploadId: null,
        userId: input.userId,
        diskPath: resolveArtifactDiskPath(
          `artifacts/${input.sessionId}/${artifactId}/credit-bureau-dispute-letter.pdf`,
        ),
      };

      artifacts.set(artifact.id, artifact);
      persistArtifactMetadata(artifact);

      deps.reportQueue.enqueueRenderReportJob({
        artifactFileName: artifact.fileName,
        artifactId: artifact.id,
        generatedAt,
        html: input.previewHtml,
        templateId: artifact.templateId,
      });

      deps.analyticsService.track({
        eventName: "report_queued",
        entityId: artifact.id,
        entityType: "report",
        metadata: {
          botId: input.botId,
          categorySlug: "credit_bureau_dispute",
          sessionId: input.sessionId,
          userId: input.userId,
        },
      });

      return {
        artifact,
        status: "queued" as const,
      };
    },
    queueCursiveBureauRemovalDemandPdfDraft(input: {
      botId: string;
      previewHtml: string;
      previewSnapshot: CursiveBureauRemovalDemandSnapshot;
      sessionId: string;
      userId: string;
    }) {
      const generatedAt = new Date(now()).toISOString();
      const artifactId = crypto.randomUUID();
      const artifact: ArtifactRecord = {
        artifactType: "pdf",
        botId: input.botId,
        createdAt: generatedAt,
        cursiveRemovalDemandSnapshot: input.previewSnapshot,
        fileName: "bureau-removal-demand-letter.pdf",
        generatedAt,
        id: artifactId,
        originalFilename: "bureau-removal-demand-preview.html",
        sessionId: input.sessionId,
        status: "queued",
        storagePath: `artifacts/${input.sessionId}/${artifactId}/bureau-removal-demand-letter.pdf`,
        templateId: "bureau_removal_demand_v2",
        uploadId: null,
        userId: input.userId,
        diskPath: resolveArtifactDiskPath(
          `artifacts/${input.sessionId}/${artifactId}/bureau-removal-demand-letter.pdf`,
        ),
      };

      artifacts.set(artifact.id, artifact);
      persistArtifactMetadata(artifact);

      deps.reportQueue.enqueueRenderReportJob({
        artifactFileName: artifact.fileName,
        artifactId: artifact.id,
        generatedAt,
        html: input.previewHtml,
        templateId: artifact.templateId,
      });

      deps.analyticsService.track({
        eventName: "report_queued",
        entityId: artifact.id,
        entityType: "report",
        metadata: {
          botId: input.botId,
          sessionId: input.sessionId,
          templateSlug: "bureau_removal_demand",
          userId: input.userId,
        },
      });

      return {
        artifact,
        status: "queued" as const,
      };
    },
    renderCursiveBureauRemovalDemandPreviewHtml(
      input: BureauRemovalDemandTemplateInput,
    ) {
      return renderBureauRemovalDemandHtml(input);
    },
    renderCursiveBureauRemovalDemandPortalText(
      input: BureauRemovalDemandTemplateInput,
    ) {
      return renderBureauRemovalDemandPortalText(input);
    },
    renderCursiveCreditBureauDisputePreviewHtml(
      input: CreditBureauDisputeTemplateInput,
    ) {
      return renderCreditBureauDisputeHtml(input);
    },
    renderCursiveCreditBureauDisputePortalText(
      input: CreditBureauDisputeTemplateInput,
    ) {
      return renderCreditBureauDisputePortalText(input);
    },
    renderTopSecretReportHtml(input: TopSecretReportTemplateInput) {
      return renderTopSecretReportHtml(input);
    },
    queueTopSecretReportPdfDraft(input: {
      botId: string;
      fileNameBase?: string;
      previewHtml: string;
      previewSnapshot: TopSecretReportSnapshot;
      sessionId: string;
      userId: string;
    }) {
      purgeArtifactsForSessionBot({
        botId: input.botId,
        sessionId: input.sessionId,
        userId: input.userId,
      });

      const generatedAt = new Date(now()).toISOString();
      const artifactId = crypto.randomUUID();
      const fileNameBase = toSafeReportSlug(input.fileNameBase ?? "top_secret");
      const fileName = `${fileNameBase}_top_secret_review.pdf`;
      const artifact: ArtifactRecord = {
        artifactType: "pdf",
        botId: input.botId,
        createdAt: generatedAt,
        fileName,
        generatedAt,
        id: artifactId,
        originalFilename: "top-secret-claim-review.html",
        sessionId: input.sessionId,
        status: "queued",
        storagePath: `artifacts/${input.sessionId}/${artifactId}/${fileName}`,
        templateId: "top_secret_fact_check_v1",
        topSecretSnapshot: input.previewSnapshot,
        uploadId: null,
        userId: input.userId,
        diskPath: resolveArtifactDiskPath(
          `artifacts/${input.sessionId}/${artifactId}/${fileName}`,
        ),
      };

      artifacts.set(artifact.id, artifact);
      persistArtifactMetadata(artifact);

      deps.reportQueue.enqueueRenderReportJob({
        artifactFileName: artifact.fileName,
        artifactId: artifact.id,
        generatedAt,
        html: input.previewHtml,
        templateId: artifact.templateId,
      });

      deps.analyticsService.track({
        eventName: "report_queued",
        entityId: artifact.id,
        entityType: "report",
        metadata: {
          botId: input.botId,
          sessionId: input.sessionId,
          templateSlug: "top_secret_fact_check",
          userId: input.userId,
        },
      });

      return {
        artifact,
        status: "queued" as const,
      };
    },
    markArtifactRendered(input: {
      artifactId: string;
      byteSize: number;
      fileBytes: Buffer;
    }) {
      const artifact = artifacts.get(input.artifactId);

      if (!artifact) {
        return;
      }

      artifact.fileBytes = input.fileBytes;
      artifact.status = "ready";
      ensureArtifactDirectory(artifact.diskPath);
      fs.writeFileSync(artifact.diskPath, input.fileBytes);
      persistArtifactMetadata(artifact);
    },
    markArtifactFailed(input: {
      artifactId: string;
      reason: string;
    }) {
      const artifact = artifacts.get(input.artifactId);

      if (!artifact) {
        return;
      }

      artifact.internalFailureReason = input.reason;
      artifact.failureReason = sanitizeArtifactFailureReason(
        artifact.templateId,
        input.reason,
      );
      artifact.status = "failed";
      persistArtifactMetadata(artifact);
    },
    getArtifact(artifactId: string) {
      return artifacts.get(artifactId) ?? null;
    },
    listArtifactsForSession(input: { sessionId: string; userId: string }) {
      return [...artifacts.values()]
        .filter(
          (artifact) =>
            artifact.sessionId === input.sessionId &&
            artifact.userId === input.userId,
        )
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },
    readArtifactFile(artifactId: string) {
      const artifact = artifacts.get(artifactId);

      if (!artifact) {
        return null;
      }

      if (artifact.fileBytes) {
        return artifact.fileBytes;
      }

      if (!fs.existsSync(artifact.diskPath)) {
        return null;
      }

      const fileBytes = fs.readFileSync(artifact.diskPath);
      artifact.fileBytes = fileBytes;
      return fileBytes;
    },
    async waitForArtifact(
      artifactId: string,
      options?: {
        timeoutMs?: number;
      },
    ) {
      const timeoutMs = options?.timeoutMs ?? 5000;
      const startedAt = now();

      while (now() - startedAt < timeoutMs) {
        const artifact = artifacts.get(artifactId);

        if (artifact?.status === "ready") {
          return artifact;
        }

        if (artifact?.status === "failed") {
          throw new Error(artifact.failureReason ?? "artifact failed");
        }

        await new Promise((resolve) => {
          setTimeout(resolve, 10);
        });
      }

      throw new Error("artifact wait timed out");
    },
  };
}
