export const BOT_CAPABILITIES = [
  "chat",
  "pdf_upload",
  "structured_form",
  "html_report",
  "citations",
  "rag_query",
] as const;

export type BotCapabilityId = (typeof BOT_CAPABILITIES)[number];

export type BotCapabilities = Record<BotCapabilityId, boolean>;

export const BOT_SOURCE_BINDINGS = ["none", "knowledge_base"] as const;

export type BotSourceBinding = (typeof BOT_SOURCE_BINDINGS)[number];

export const BOT_TOOL_PERMISSIONS = [
  "document_intake",
  "knowledge_base_search",
] as const;

export type BotToolPermission = (typeof BOT_TOOL_PERMISSIONS)[number];

export function createBotCapabilities(
  input: Partial<BotCapabilities>,
): BotCapabilities {
  return {
    chat: Boolean(input.chat),
    citations: Boolean(input.citations),
    html_report: Boolean(input.html_report),
    pdf_upload: Boolean(input.pdf_upload),
    rag_query: Boolean(input.rag_query),
    structured_form: Boolean(input.structured_form),
  };
}
