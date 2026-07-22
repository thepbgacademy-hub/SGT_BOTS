export type ArtifactListItem = {
  id: string;
  artifactType: "pdf";
  botId?: string;
  botName: string;
  createdAt?: string;
  downloadUrl?: string | null;
  fileName: string;
  failureReason?: string | null;
  generatedAt?: string;
  status: "queued" | "ready" | "failed";
  originalFilename: string;
};
