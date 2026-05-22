import { describe, expect, it } from "vitest";
import { createReportService } from "../../src/modules/reports/report.service";
import {
  renderCreditBureauDisputeHtml,
  renderCreditBureauDisputePortalText,
  type CreditBureauDisputeTemplateInput,
} from "../../src/modules/cursive/templates/credit-bureau-dispute.html";

const creditBureauTemplateInput: CreditBureauDisputeTemplateInput = {
  consumerName: "Jane Doe",
  consumerAddressLines: ["123 Main Street", "Dallas, TX 75001"],
  bureauName: "Experian",
  bureauAddressLines: ["P.O. Box 4500", "Allen, TX 75013"],
  subjectLine: "Re: FCRA Dispute and Reinvestigation Request for Account ending 1234",
  salutation: "To Whom It May Concern:",
  bodyParagraphs: [
    "I am writing to dispute inaccurate reporting on account ending 1234.<sup>1</sup>",
    "Please reinvestigate this item and correct any incomplete or inaccurate information.<sup>2</sup>",
  ],
  closing: "Sincerely,",
  enclosures: ["Credit report excerpt", "Supporting account history"],
  citations: ["15 U.S.C. Sec. 1681i", "15 U.S.C. Sec. 1681s-2"],
  generatedDate: "May 9, 2026",
};

describe("renderCreditBureauDisputeHtml", () => {
  it("renders a print-safe 8.5 x 11 letter shell", () => {
    const html = renderCreditBureauDisputeHtml(creditBureauTemplateInput);

    expect(html).toContain("@page");
    expect(html).toContain("size: 8.5in 11in");
    expect(html).toContain("Jane Doe");
    expect(html).toContain("Experian");
    expect(html).toContain("letter-subject");
    expect(html).toContain(
      "Re: FCRA Dispute and Reinvestigation Request for Account ending 1234",
    );
    expect(html).toContain("15 U.S.C. Sec. 1681i");
    expect(html).toContain("<sup>1</sup>");
    expect(html).toContain("<li>15 U.S.C. Sec. 1681i</li>");
    expect(html).toContain("Enclosures");
    expect(html).toContain("<li>Credit report excerpt</li>");
    expect(html).not.toContain("<li>1. 15 U.S.C. Sec. 1681i</li>");
  });

  it("renders a portal-safe plain text companion from the same template input", () => {
    const text = renderCreditBureauDisputePortalText(creditBureauTemplateInput);

    expect(text).toContain("May 9, 2026");
    expect(text).toContain("Jane Doe");
    expect(text).toContain("Experian");
    expect(text).toContain(
      "Re: FCRA Dispute and Reinvestigation Request for Account ending 1234",
    );
    expect(text).toContain("I am writing to dispute inaccurate reporting on account ending 1234. [1]");
    expect(text).toContain("Please reinvestigate this item and correct any incomplete or inaccurate information. [2]");
    expect(text).toContain("Enclosures:");
    expect(text).toContain("Credit report excerpt");
    expect(text).toContain("Authorities:");
    expect(text).toContain("[1] 15 U.S.C. Sec. 1681i");
    expect(text).not.toContain("<sup>");
    expect(text).not.toContain("<li>");
  });

  it("omits the enclosures block entirely when no enclosure items exist", () => {
    const html = renderCreditBureauDisputeHtml({
      ...creditBureauTemplateInput,
      enclosures: [],
    });
    const text = renderCreditBureauDisputePortalText({
      ...creditBureauTemplateInput,
      enclosures: [],
    });

    expect(html).not.toContain('<section class="letter-supporting letter-enclosures">');
    expect(html).not.toContain(">Enclosures<");
    expect(text).not.toContain("Enclosures:");
  });

  it("omits the enclosures block when enclosure items sanitize to empty text", () => {
    const html = renderCreditBureauDisputeHtml({
      ...creditBureauTemplateInput,
      enclosures: ["<strong></strong>", "   <em> </em>   "],
    });
    const text = renderCreditBureauDisputePortalText({
      ...creditBureauTemplateInput,
      enclosures: ["<strong></strong>", "   <em> </em>   "],
    });

    expect(html).not.toContain('<section class="letter-supporting letter-enclosures">');
    expect(html).not.toContain(">Enclosures<");
    expect(text).not.toContain("Enclosures:");
  });

  it("strips markup from non-body portal text fields while keeping the output plain text", () => {
    const text = renderCreditBureauDisputePortalText({
      ...creditBureauTemplateInput,
      consumerName: "Jane <strong>Doe</strong>",
      bureauName: "Experian <strong>Disputes</strong>",
      subjectLine: "Re: <em>FCRA</em> Dispute for Account ending 1234",
      salutation: "To <strong>Whom</strong> It May Concern:",
      closing: "Sincerely, <script>alert('x')</script>",
    });

    expect(text).toContain("Jane Doe");
    expect(text).toContain("Experian Disputes");
    expect(text).toContain("Re: FCRA Dispute for Account ending 1234");
    expect(text).toContain("To Whom It May Concern:");
    expect(text).toContain("Sincerely, alert('x')");
    expect(text).not.toContain("<strong>");
    expect(text).not.toContain("<script>");
    expect(text).not.toContain("<em>");
  });

  it("escapes arbitrary paragraph markup while preserving narrow superscript citations", () => {
    const html = renderCreditBureauDisputeHtml({
      ...creditBureauTemplateInput,
      bodyParagraphs: [
        'This account was reported inaccurately.<sup>7</sup><script>alert("x")</script><strong>bold</strong>',
      ],
    });

    expect(html).toContain("<sup>7</sup>");
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).toContain("&lt;strong&gt;bold&lt;/strong&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<strong>bold</strong>");
  });

  it("keeps a clean seam through the report service for preview and queued pdf handoff paths", () => {
    const analyticsEvents: unknown[] = [];
    const queuedJobs: unknown[] = [];
    const reportService = createReportService({
      analyticsService: {
        track(event: unknown) {
          analyticsEvents.push(event);
          return undefined;
        },
      } as never,
      reportQueue: {
        enqueueRenderReportJob(job: unknown) {
          queuedJobs.push(job);
          return {
            artifactId: "queued-artifact",
            status: "queued" as const,
          };
        },
      } as never,
      uploadService: {
        createPdfUpload() {
          return {
            id: "upload-1",
            originalFilename: "source.pdf",
            mimeType: "application/pdf",
            byteSize: 2048,
            storagePath: "uploads/session-1/source.pdf",
            sessionId: "session-1",
            botId: "document_wizard",
            createdAt: "2026-05-09T00:00:00.000Z",
          };
        },
      } as never,
      now: () => Date.parse("2026-05-09T00:00:00.000Z"),
    });

    const html =
      reportService.renderCursiveCreditBureauDisputePreviewHtml(
        creditBureauTemplateInput,
      );
    const portalText =
      reportService.renderCursiveCreditBureauDisputePortalText(
        creditBureauTemplateInput,
      );
    const previewSnapshot = {
      categorySlug: "credit_bureau_dispute" as const,
      generatedDate: creditBureauTemplateInput.generatedDate ?? "May 9, 2026",
      consumerName: creditBureauTemplateInput.consumerName,
      consumerAddressLines: creditBureauTemplateInput.consumerAddressLines,
      bureauName: creditBureauTemplateInput.bureauName,
      bureauAddressLines: creditBureauTemplateInput.bureauAddressLines,
      subjectLine: creditBureauTemplateInput.subjectLine,
      salutation: creditBureauTemplateInput.salutation,
      bodyParagraphs: creditBureauTemplateInput.bodyParagraphs,
      closing: creditBureauTemplateInput.closing,
      enclosures: creditBureauTemplateInput.enclosures,
      citations: creditBureauTemplateInput.citations,
      portalText,
    };

    expect(html).toContain("credit-bureau-dispute-letter");
    expect(html).toContain("Experian");
    expect(html).toContain("To Whom It May Concern:");

    const queuedCursiveDraft =
      reportService.queueCursiveCreditBureauDisputePdfDraft({
        botId: "document_wizard",
        previewHtml: html,
        previewSnapshot,
        sessionId: "session-1",
        userId: "user-1",
      });

    expect(queuedCursiveDraft.status).toBe("queued");
    expect(queuedCursiveDraft.artifact.fileName).toBe(
      "credit-bureau-dispute-letter.pdf",
    );
    expect(queuedCursiveDraft.artifact.templateId).toBe(
      "credit_bureau_dispute_v1",
    );
    expect(queuedCursiveDraft.artifact.originalFilename).toBe(
      "credit-bureau-dispute-preview.html",
    );
    expect(queuedCursiveDraft.artifact.cursiveDraftSnapshot).toEqual(
      previewSnapshot,
    );
    expect(queuedJobs[0]).toMatchObject({
      artifactFileName: "credit-bureau-dispute-letter.pdf",
      html,
      templateId: "credit_bureau_dispute_v1",
    });

    const queued = reportService.queueDocumentWizardReport({
      botId: "document_wizard",
      fileBytesBase64: Buffer.from("%PDF-1.4\n").toString("base64"),
      filename: "source.pdf",
      formData: {
        clientName: "Acme Co",
        objective: "Summarize the uploaded agreement",
      },
      mimeType: "application/pdf",
      sessionId: "session-1",
      userId: "user-1",
    });

    expect(queued.status).toBe("queued");
    expect(queued.artifact.fileName).toBe("document-wizard-report.pdf");
    expect(queued.artifact.templateId).toBe("document_wizard_v1");
    expect(queued.upload.originalFilename).toBe("source.pdf");
    expect(queuedJobs).toHaveLength(2);
    expect(queuedJobs[1]).toMatchObject({
      artifactFileName: "document-wizard-report.pdf",
      formData: {
        clientName: "Acme Co",
        objective: "Summarize the uploaded agreement",
      },
      templateId: "document_wizard_v1",
      upload: {
        originalFilename: "source.pdf",
        mimeType: "application/pdf",
        byteSize: 2048,
      },
    });
    expect(String((queuedJobs[1] as { templatePath: string }).templatePath)).toContain(
      "document-wizard-report.html",
    );
    expect(analyticsEvents).toHaveLength(2);
  });
});
