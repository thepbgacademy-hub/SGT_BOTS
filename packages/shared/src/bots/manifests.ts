import {
  createBotCapabilities,
  type BotCapabilities,
  type BotSourceBinding,
  type BotToolPermission,
} from "./capabilities";

export type BotId = "document_wizard" | "kb_concierge";

export type BotManifest = {
  id: BotId;
  name: string;
  description: string;
  capabilities: BotCapabilities;
  sourceBinding: BotSourceBinding;
  toolPermissions: readonly BotToolPermission[];
  promptVersion: string;
  active: boolean;
};

export const BOT_MANIFESTS = [
  {
    id: "document_wizard",
    name: "Document Wizard",
    description: "Turn notes into structured drafts and next-step checklists.",
    capabilities: createBotCapabilities({
      chat: true,
      citations: false,
      html_report: true,
      pdf_upload: true,
      rag_query: false,
      structured_form: true,
    }),
    sourceBinding: "none",
    toolPermissions: ["document_intake"],
    promptVersion: "phase-3-v1",
    active: true,
  },
  {
    id: "kb_concierge",
    name: "Knowledge Concierge",
    description: "Answer grounded questions from the curated knowledge base.",
    capabilities: createBotCapabilities({
      chat: true,
      citations: true,
      html_report: false,
      pdf_upload: false,
      rag_query: true,
      structured_form: false,
    }),
    sourceBinding: "knowledge_base",
    toolPermissions: ["knowledge_base_search"],
    promptVersion: "phase-3-v1",
    active: true,
  },
] as const satisfies readonly BotManifest[];

export type BotCatalogEntry = Pick<
  BotManifest,
  "id" | "name" | "description" | "capabilities" | "sourceBinding"
>;

export function listBotCatalog(): BotCatalogEntry[] {
  return BOT_MANIFESTS.filter((bot) => bot.active).map((bot) => ({
    id: bot.id,
    name: bot.name,
    description: bot.description,
    capabilities: bot.capabilities,
    sourceBinding: bot.sourceBinding,
  }));
}

export function getBotManifest(botId: string) {
  return BOT_MANIFESTS.find((bot) => bot.id === botId);
}

export function requireBotManifest(botId: string) {
  const manifest = getBotManifest(botId);

  if (!manifest || !manifest.active) {
    throw new Error("bot not found");
  }

  return manifest;
}
