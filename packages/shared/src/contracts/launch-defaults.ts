export const launchDefaults = {
  providers: ["openai", "anthropic"] as const,
  initialBots: ["document_wizard", "kb_concierge"] as const,
  reportRenderer: "playwright" as const,
};
