import {
  createBotCapabilities,
  type BotCapabilities,
  type BotSourceBinding,
  type BotToolPermission,
} from "./capabilities";

export type BotId =
  | "document_wizard"
  | "tutor"
  | "form_wizard"
  | "verifier"
  | "concierge_general_academy_KB"
  | "tax_legal_research";

export type BotMenuPosition =
  | "top-left"
  | "middle-left"
  | "bottom-left"
  | "top-right"
  | "middle-right"
  | "bottom-right";

export type BotManifest = {
  id: BotId;
  name: string;
  description: string;
  menuPosition: BotMenuPosition;
  capabilities: BotCapabilities;
  sourceBinding: BotSourceBinding;
  toolPermissions: readonly BotToolPermission[];
  promptVersion: string;
  active: boolean;
};

export const BOT_MANIFESTS = [
  {
    id: "document_wizard",
    name: "Cursive",
    description: "Turns notes and source files into polished structured outputs.",
    menuPosition: "top-left",
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
    id: "tutor",
    name: "Insight",
    description: "Guides the user step by step like a coach and explainer.",
    menuPosition: "middle-left",
    capabilities: createBotCapabilities({
      chat: true,
      citations: false,
      html_report: false,
      pdf_upload: false,
      rag_query: false,
      structured_form: false,
    }),
    sourceBinding: "none",
    toolPermissions: [],
    promptVersion: "phase-6-v1",
    active: true,
  },
  {
    id: "form_wizard",
    name: "ShAzZaM!",
    description: "Collects structured inputs and builds final outputs from forms.",
    menuPosition: "bottom-left",
    capabilities: createBotCapabilities({
      chat: true,
      citations: false,
      html_report: true,
      pdf_upload: false,
      rag_query: false,
      structured_form: true,
    }),
    sourceBinding: "none",
    toolPermissions: ["document_intake"],
    promptVersion: "phase-6-v1",
    active: true,
  },
  {
    id: "verifier",
    name: "Top Secret",
    description: "Performs verification and high-scrutiny review workflows.",
    menuPosition: "top-right",
    capabilities: createBotCapabilities({
      chat: true,
      citations: true,
      html_report: true,
      pdf_upload: false,
      rag_query: true,
      structured_form: true,
    }),
    sourceBinding: "knowledge_base",
    toolPermissions: ["knowledge_base_search"],
    promptVersion: "phase-6-v1",
    active: true,
  },
  {
    id: "concierge_general_academy_KB",
    name: "Rori",
    description: "Routes knowledge-base questions across the academy domain.",
    menuPosition: "middle-right",
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
    promptVersion: "phase-6-v1",
    active: true,
  },
  {
    id: "tax_legal_research",
    name: "Condor",
    description: "Handles tax and legal research with grounded source support.",
    menuPosition: "bottom-right",
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
    promptVersion: "phase-6-v1",
    active: true,
  },
] as const satisfies readonly BotManifest[];

export type BotCatalogEntry = Pick<
  BotManifest,
  "id" | "name" | "description" | "menuPosition" | "capabilities" | "sourceBinding"
>;

export function listBotCatalog(): BotCatalogEntry[] {
  return BOT_MANIFESTS.filter((bot) => bot.active).map((bot) => ({
    id: bot.id,
    name: bot.name,
    description: bot.description,
    menuPosition: bot.menuPosition,
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
