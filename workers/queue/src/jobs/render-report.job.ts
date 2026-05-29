import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";

export type RenderReportJobInput = {
  artifactId: string;
  artifactFileName: string;
  templateId: string;
  generatedAt: string;
} & (
  | {
      html: string;
      templatePath?: never;
      upload?: never;
      formData?: never;
    }
  | {
      templatePath: string;
      html?: never;
      upload: {
        originalFilename: string;
        mimeType: string;
        byteSize: number;
      };
      formData: {
        clientName: string;
        objective: string;
      };
    }
);

export type RenderReportJobResult = {
  artifactId: string;
  fileName: string;
  bytes: Buffer;
};

export type RenderReportJobRunner = (
  input: RenderReportJobInput,
) => Promise<RenderReportJobResult>;

const TOP_SECRET_TEMPLATE_ID = "top_secret_fact_check_v1";
const TOP_SECRET_COVER_PDF = new URL(
  "../../assets/PBG-TopSecretCover.pdf",
  import.meta.url,
);

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatFileSize(byteSize: number) {
  if (byteSize < 1024) {
    return `${byteSize} B`;
  }

  return `${(byteSize / 1024).toFixed(1)} KB`;
}

function fillTemplate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (output, [key, value]) => output.replaceAll(`{{${key}}}`, value),
    template,
  );
}

async function renderPdfFromHtml(html: string) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle" });

    return Buffer.from(
      await page.pdf({
        displayHeaderFooter: false,
        format: "Letter",
        preferCSSPageSize: true,
        printBackground: true,
      }),
    );
  } finally {
    await browser.close();
  }
}

async function renderPdfFromTemplateHtml(html: string) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle" });

    return Buffer.from(
      await page.pdf({
        displayHeaderFooter: false,
        format: "Letter",
        preferCSSPageSize: true,
        printBackground: true,
        margin: {
          top: "18mm",
          right: "14mm",
          bottom: "18mm",
          left: "14mm",
        },
      }),
    );
  } finally {
    await browser.close();
  }
}

async function prependPdfCover(options: {
  coverPdfPath: URL;
  reportPdfBytes: Buffer;
}) {
  const [coverPdfBytes, mergedPdf] = await Promise.all([
    readFile(options.coverPdfPath),
    PDFDocument.create(),
  ]);
  const [coverPdf, reportPdf] = await Promise.all([
    PDFDocument.load(coverPdfBytes),
    PDFDocument.load(options.reportPdfBytes),
  ]);
  const coverPages = await mergedPdf.copyPages(
    coverPdf,
    coverPdf.getPageIndices(),
  );
  const reportPages = await mergedPdf.copyPages(
    reportPdf,
    reportPdf.getPageIndices(),
  );

  for (const page of coverPages) {
    mergedPdf.addPage(page);
  }

  for (const page of reportPages) {
    mergedPdf.addPage(page);
  }

  return Buffer.from(await mergedPdf.save());
}

export const runRenderReportJob: RenderReportJobRunner = async (
  input: RenderReportJobInput,
) => {
  const html =
    input.html !== undefined
      ? input.html
      : fillTemplate(await readFile(input.templatePath, "utf8"), {
          clientName: escapeHtml(input.formData.clientName),
          objective: escapeHtml(input.formData.objective),
          originalFilename: escapeHtml(input.upload.originalFilename),
          mimeType: escapeHtml(input.upload.mimeType),
          generatedDate: escapeHtml(
            new Date(input.generatedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
          ),
          fileSizeLabel: escapeHtml(formatFileSize(input.upload.byteSize)),
        });

  const renderedBytes =
    input.html !== undefined
      ? await renderPdfFromHtml(html)
      : await renderPdfFromTemplateHtml(html);
  const bytes =
    input.templateId === TOP_SECRET_TEMPLATE_ID
      ? await prependPdfCover({
          coverPdfPath: TOP_SECRET_COVER_PDF,
          reportPdfBytes: renderedBytes,
        })
      : renderedBytes;

  return {
    artifactId: input.artifactId,
    fileName: input.artifactFileName,
    bytes,
  };
};
