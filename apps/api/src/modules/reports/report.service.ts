import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderCreditBureauDisputeHtml,
  renderCreditBureauDisputePortalText,
  type CreditBureauDisputeTemplateInput,
} from "../cursive/templates/credit-bureau-dispute.html";
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

  function sanitizeArtifactFailureReason() {
    return "Unable to render this PDF draft right now.";
  }

  function toPersistedArtifactRecord(artifact: ArtifactRecord) {
    return {
      artifactType: artifact.artifactType,
      botId: artifact.botId,
      createdAt: artifact.createdAt,
      cursiveDraftSnapshot: artifact.cursiveDraftSnapshot,
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

      artifact.failureReason = input.reason;
      artifact.internalFailureReason = input.reason;
      artifact.failureReason = sanitizeArtifactFailureReason();
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
