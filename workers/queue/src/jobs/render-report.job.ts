import { readFile } from "node:fs/promises";

export type RenderReportJobInput = {
  artifactId: string;
  artifactFileName: string;
  templateId: string;
  templatePath: string;
  generatedAt: string;
  upload: {
    originalFilename: string;
    mimeType: string;
    byteSize: number;
  };
  formData: {
    clientName: string;
    objective: string;
  };
};

export type RenderReportJobResult = {
  artifactId: string;
  fileName: string;
  bytes: Buffer;
};

export type RenderReportJobRunner = (
  input: RenderReportJobInput,
) => Promise<RenderReportJobResult>;

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
        format: "A4",
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

export const runRenderReportJob: RenderReportJobRunner = async (
  input: RenderReportJobInput,
) => {
  const template = await readFile(input.templatePath, "utf8");
  const html = fillTemplate(template, {
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

  return {
    artifactId: input.artifactId,
    fileName: input.artifactFileName,
    bytes: await renderPdfFromHtml(html),
  };
};
