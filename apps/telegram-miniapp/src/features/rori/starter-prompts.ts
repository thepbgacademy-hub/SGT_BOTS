import type { BotId } from "../../../../../packages/shared/src/bots/manifests";

export const RORI_STARTER_PROMPTS: string[] = [
  "How do I enroll?",
  "What workshops are coming up?",
  "Which PBG Telegram rooms should I join?",
  "Which tool should I use for...?",
];

const STARTER_PROMPTS_BY_BOT_ID: Partial<Record<BotId, string[]>> = {
  concierge_general_academy_KB: RORI_STARTER_PROMPTS,
  document_wizard: [
    "What can you help me draft?",
    "Can I upload a source PDF to start?",
    "What does a finished report look like?",
  ],
  tutor: [
    "Can you explain this step by step?",
    "How should I practice this topic?",
    "What should I try first?",
  ],
  verifier: [
    "Can you check a claim I saw online?",
    "How many statements can I paste at once?",
    "What will the report include?",
  ],
  tax_legal_research: [
    "What tax topic can you help me research?",
    "Can you help me find a legal research starting point?",
    "What should I consider before escalating this?",
  ],
};

export function getStarterPromptsForBot(botId?: string | null): string[] {
  if (!botId) {
    return [];
  }

  return STARTER_PROMPTS_BY_BOT_ID[botId as BotId] ?? [];
}
