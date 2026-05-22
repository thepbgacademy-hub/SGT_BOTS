import { afterEach, describe, expect, it, vi } from "vitest";

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
});
