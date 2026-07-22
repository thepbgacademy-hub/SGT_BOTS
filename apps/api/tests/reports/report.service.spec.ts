import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createAnalyticsService } from "../../src/modules/analytics/analytics.service";
import { createReportService } from "../../src/modules/reports/report.service";
import { createUploadService } from "../../src/modules/uploads/upload.service";

describe("createReportService", () => {
  it("hydrates queued artifact metadata and rendered files from disk", async () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cursive-artifacts-"));

    const analyticsService = createAnalyticsService();
    const uploadService = createUploadService();
    const reportService = createReportService({
      analyticsService,
      artifactRoot,
      reportQueue: {
        enqueueRenderReportJob(input) {
          return {
            artifactId: input.artifactId,
            status: "queued" as const,
          };
        },
      },
      uploadService,
    });

    const queued = reportService.queueCursiveCreditBureauDisputePdfDraft({
      botId: "document_wizard",
      previewHtml: "<html><body>Preview</body></html>",
      previewSnapshot: {
        bodyParagraphs: ["Paragraph 1"],
        bureauAddressLines: ["P.O. Box 2000"],
        bureauName: "TransUnion",
        categorySlug: "credit_bureau_dispute",
        citations: ["15 U.S.C. Sec. 1681i"],
        closing: "Sincerely,",
        consumerAddressLines: ["123 Main Street"],
        consumerName: "Jane Doe",
        enclosures: [
          "Photocopy of government-issued identification",
          "Photocopy of Social Security card",
        ],
        generatedDate: "May 11, 2026",
        portalText: "Portal text",
        salutation: "Dear Credit Bureau:",
        subjectLine: "Re: Account ending 1234",
      },
      sessionId: "session-1",
      userId: "user-1",
    });

    reportService.markArtifactRendered({
      artifactId: queued.artifact.id,
      byteSize: Buffer.byteLength("%PDF- hydrated artifact"),
      fileBytes: Buffer.from("%PDF- hydrated artifact"),
    });

    const rehydratedService = createReportService({
      analyticsService: createAnalyticsService(),
      artifactRoot,
      reportQueue: {
        enqueueRenderReportJob(input) {
          return {
            artifactId: input.artifactId,
            status: "queued" as const,
          };
        },
      },
      uploadService: createUploadService(),
    });

    expect(
      rehydratedService.listArtifactsForSession({
        sessionId: "session-1",
        userId: "user-1",
      }),
    ).toEqual([
      expect.objectContaining({
        fileName: "credit-bureau-dispute-letter.pdf",
        id: queued.artifact.id,
        originalFilename: "credit-bureau-dispute-preview.html",
        status: "ready",
      }),
    ]);
    expect(
      rehydratedService.readArtifactFile(queued.artifact.id)?.subarray(0, 5).toString(
        "utf8",
      ),
    ).toBe("%PDF-");
  });

  it("replaces older Top Secret artifacts for the same session and user", () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), "top-secret-artifacts-"));

    const analyticsService = createAnalyticsService();
    const uploadService = createUploadService();
    const reportService = createReportService({
      analyticsService,
      artifactRoot,
      reportQueue: {
        enqueueRenderReportJob(input) {
          return {
            artifactId: input.artifactId,
            status: "queued" as const,
          };
        },
      },
      uploadService,
    });

    const firstQueued = reportService.queueTopSecretReportPdfDraft({
      botId: "verifier",
      previewHtml: "<html><body>First</body></html>",
      previewSnapshot: {
        findings: [],
        generatedDate: "May 28, 2026",
        templateSlug: "top_secret_fact_check",
      },
      sessionId: "session-1",
      userId: "user-1",
    });

    reportService.markArtifactRendered({
      artifactId: firstQueued.artifact.id,
      byteSize: Buffer.byteLength("%PDF-first"),
      fileBytes: Buffer.from("%PDF-first"),
    });

    const firstDiskPath = firstQueued.artifact.diskPath;
    const firstMetadataPath = `${firstDiskPath}.json`;

    const secondQueued = reportService.queueTopSecretReportPdfDraft({
      botId: "verifier",
      fileNameBase: "user_name",
      previewHtml: "<html><body>Second</body></html>",
      previewSnapshot: {
        findings: [],
        generatedDate: "May 28, 2026",
        templateSlug: "top_secret_fact_check",
      },
      sessionId: "session-1",
      userId: "user-1",
    });

    expect(
      reportService.listArtifactsForSession({
        sessionId: "session-1",
        userId: "user-1",
      }),
    ).toEqual([
      expect.objectContaining({
        fileName: "user_name_top_secret_review.pdf",
        id: secondQueued.artifact.id,
        status: "queued",
      }),
    ]);
    expect(reportService.getArtifact(firstQueued.artifact.id)).toBeNull();
    expect(fs.existsSync(firstDiskPath)).toBe(false);
    expect(fs.existsSync(firstMetadataPath)).toBe(false);
  });

  it("builds a safe personalized Top Secret filename", () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), "top-secret-name-"));

    const reportService = createReportService({
      analyticsService: createAnalyticsService(),
      artifactRoot,
      reportQueue: {
        enqueueRenderReportJob(input) {
          return {
            artifactId: input.artifactId,
            status: "queued" as const,
          };
        },
      },
      uploadService: createUploadService(),
    });

    const queued = reportService.queueTopSecretReportPdfDraft({
      botId: "verifier",
      fileNameBase: "@johnQ1234",
      previewHtml: "<html><body>Named</body></html>",
      previewSnapshot: {
        findings: [],
        generatedDate: "May 28, 2026",
        templateSlug: "top_secret_fact_check",
      },
      sessionId: "session-2",
      userId: "user-2",
    });

    expect(queued.artifact.fileName).toBe("johnQ1234_top_secret_review.pdf");
  });

  it("purges artifacts older than six hours when hydrating from disk", () => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-retention-"));

    const createdAt = new Date("2026-05-31T00:00:00.000Z").getTime();
    const cleanupAt = createdAt + 6 * 60 * 60 * 1000 + 1;

    const reportService = createReportService({
      analyticsService: createAnalyticsService(),
      artifactRoot,
      now: () => createdAt,
      reportQueue: {
        enqueueRenderReportJob(input) {
          return {
            artifactId: input.artifactId,
            status: "queued" as const,
          };
        },
      },
      uploadService: createUploadService(),
    });

    const queued = reportService.queueTopSecretReportPdfDraft({
      botId: "verifier",
      fileNameBase: "cleanup_me",
      previewHtml: "<html><body>Cleanup</body></html>",
      previewSnapshot: {
        findings: [],
        generatedDate: "May 31, 2026",
        templateSlug: "top_secret_fact_check",
      },
      sessionId: "session-cleanup",
      userId: "user-cleanup",
    });

    reportService.markArtifactRendered({
      artifactId: queued.artifact.id,
      byteSize: Buffer.byteLength("%PDF-cleanup"),
      fileBytes: Buffer.from("%PDF-cleanup"),
    });

    const diskPath = queued.artifact.diskPath;
    const metadataPath = `${diskPath}.json`;

    expect(fs.existsSync(diskPath)).toBe(true);
    expect(fs.existsSync(metadataPath)).toBe(true);

    const rehydratedService = createReportService({
      analyticsService: createAnalyticsService(),
      artifactRoot,
      now: () => cleanupAt,
      reportQueue: {
        enqueueRenderReportJob(input) {
          return {
            artifactId: input.artifactId,
            status: "queued" as const,
          };
        },
      },
      uploadService: createUploadService(),
    });

    expect(
      rehydratedService.listArtifactsForSession({
        sessionId: "session-cleanup",
        userId: "user-cleanup",
      }),
    ).toEqual([]);
    expect(fs.existsSync(diskPath)).toBe(false);
    expect(fs.existsSync(metadataPath)).toBe(false);
  });
});
