import { afterEach, describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";

describe("runRenderReportJob", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("renders a pdf from inline html without requiring a template path", async () => {
    const pdfSpy = vi.fn(async () => new Uint8Array(Buffer.from("%PDF-inline")));
    const setContentSpy = vi.fn(async () => undefined);
    const closeSpy = vi.fn(async () => undefined);
    const browser = {
      newPage: vi.fn(async () => ({
        pdf: pdfSpy,
        setContent: setContentSpy,
      })),
      close: closeSpy,
    };
    vi.doMock("playwright", () => ({
      chromium: {
        launch: vi.fn(async () => browser),
      },
    }));
    const { runRenderReportJob } = await import("./render-report.job");

    const result = await runRenderReportJob({
      artifactFileName: "credit-bureau-dispute-letter.pdf",
      artifactId: "artifact-1",
      generatedAt: "2026-05-09T00:00:00.000Z",
      html: "<html><body><h1>Inline preview</h1></body></html>",
      templateId: "credit_bureau_dispute_v1",
    });

    expect(result.artifactId).toBe("artifact-1");
    expect(result.fileName).toBe("credit-bureau-dispute-letter.pdf");
    expect(result.bytes.subarray(0, 5).toString("utf8")).toBe("%PDF-");
    expect(setContentSpy).toHaveBeenCalledWith(
      "<html><body><h1>Inline preview</h1></body></html>",
      { waitUntil: "networkidle" },
    );
    expect(pdfSpy).toHaveBeenCalledWith({
      displayHeaderFooter: false,
      format: "Letter",
      preferCSSPageSize: true,
      printBackground: true,
    });
    expect(closeSpy).toHaveBeenCalledOnce();
  });

  it("prepends the approved cover pdf for top secret reports only", async () => {
    const coverPdf = await PDFDocument.create();
    coverPdf.addPage([612, 792]);
    const coverBytes = Buffer.from(await coverPdf.save());

    const reportPdf = await PDFDocument.create();
    reportPdf.addPage([612, 792]);
    const reportBytes = Buffer.from(await reportPdf.save());

    const pdfSpy = vi.fn(async () => new Uint8Array(reportBytes));
    const setContentSpy = vi.fn(async () => undefined);
    const closeSpy = vi.fn(async () => undefined);
    const browser = {
      newPage: vi.fn(async () => ({
        pdf: pdfSpy,
        setContent: setContentSpy,
      })),
      close: closeSpy,
    };

    vi.doMock("playwright", () => ({
      chromium: {
        launch: vi.fn(async () => browser),
      },
    }));
    vi.doMock("node:fs/promises", async () => {
      const actual = await vi.importActual<typeof import("node:fs/promises")>(
        "node:fs/promises",
      );

      return {
        ...actual,
        readFile: vi.fn(async (path: string | URL) => {
          if (String(path).includes("PBG-TopSecretCover.pdf")) {
            return coverBytes;
          }

          return actual.readFile(path);
        }),
      };
    });
    const { runRenderReportJob } = await import("./render-report.job");

    const result = await runRenderReportJob({
      artifactFileName: "top-secret-claim-review.pdf",
      artifactId: "artifact-top-secret",
      generatedAt: "2026-05-09T00:00:00.000Z",
      html: "<html><body><h1>Top Secret body</h1></body></html>",
      templateId: "top_secret_fact_check_v1",
    });
    const mergedPdf = await PDFDocument.load(result.bytes);

    expect(mergedPdf.getPageCount()).toBe(2);
    expect(setContentSpy).toHaveBeenCalledWith(
      "<html><body><h1>Top Secret body</h1></body></html>",
      { waitUntil: "networkidle" },
    );
    expect(closeSpy).toHaveBeenCalledOnce();
  });
});
