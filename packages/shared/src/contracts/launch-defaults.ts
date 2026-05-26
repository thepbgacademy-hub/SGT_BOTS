export const launchDefaults = {
  providers: ["openai_codex", "openai", "anthropic"] as const,
  initialBots: ["document_wizard", "kb_concierge"] as const,
  reportRenderer: "playwright" as const,
};
