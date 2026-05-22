import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createAnalyticsService } from "../../src/modules/analytics/analytics.service";
import { createReportService } from "../../src/modules/reports/report.service";
import { createUploadService } from "../../src/modules/uploads/upload.service";

const originalCwd = process.cwd();

afterEach(() => {
  process.chdir(originalCwd);
});

describe("createReportService", () => {
  it("hydrates queued artifact metadata and rendered files from disk", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cursive-artifacts-"));
    process.chdir(tempRoot);

    const analyticsService = createAnalyticsService();
    const uploadService = createUploadService();
    const reportService = createReportService({
      analyticsService,
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
});
