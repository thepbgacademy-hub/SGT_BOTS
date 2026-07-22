import crypto from "node:crypto";

export type StoredUpload = {
  id: string;
  botId: string;
  byteSize: number;
  createdAt: string;
  fileBytes: Buffer;
  mimeType: string;
  originalFilename: string;
  parseStatus: "pending";
  sessionId: string;
  storagePath: string;
  virusScanStatus: "pending";
};

// Kept comfortably under Fastify's 8 MiB bodyLimit (app.ts) once base64
// overhead (~4/3) and JSON wrapper fields are accounted for.
export const MAX_PDF_UPLOAD_BYTES = 5 * 1024 * 1024;

function looksLikePdf(fileBytes: Buffer) {
  return fileBytes.subarray(0, 5).toString("utf8") === "%PDF-";
}

export function createUploadService(deps?: { now?: () => number }) {
  const uploads = new Map<string, StoredUpload>();
  const now = deps?.now ?? (() => Date.now());

  return {
    createPdfUpload(input: {
      botId: string;
      fileBytesBase64: string;
      filename: string;
      mimeType: string;
      sessionId: string;
    }) {
      const fileBytes = Buffer.from(input.fileBytesBase64, "base64");

      if (input.mimeType !== "application/pdf") {
        throw new Error("pdf uploads only");
      }

      if (!input.filename.toLowerCase().endsWith(".pdf")) {
        throw new Error("pdf uploads only");
      }

      if (fileBytes.byteLength > MAX_PDF_UPLOAD_BYTES) {
        throw new Error("pdf upload too large");
      }

      if (!fileBytes.byteLength || !looksLikePdf(fileBytes)) {
        throw new Error("invalid pdf file");
      }

      const createdAt = new Date(now()).toISOString();
      const id = crypto.randomUUID();
      const storagePath = `uploads/${input.sessionId}/${id}/${input.filename}`;
      const upload: StoredUpload = {
        id,
        botId: input.botId,
        byteSize: fileBytes.byteLength,
        createdAt,
        fileBytes,
        mimeType: input.mimeType,
        originalFilename: input.filename,
        parseStatus: "pending",
        sessionId: input.sessionId,
        storagePath,
        virusScanStatus: "pending",
      };

      uploads.set(id, upload);
      return upload;
    },
    getUpload(uploadId: string) {
      return uploads.get(uploadId) ?? null;
    },
  };
}
