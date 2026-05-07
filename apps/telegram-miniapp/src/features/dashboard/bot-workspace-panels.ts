import type { BotId } from "../../../../../packages/shared/src/bots/manifests";

type BotWorkspacePanelContent = {
  focusLabel: string;
  mission: string;
  workflowTitle: string;
  workflowSteps: string[];
  supportLabel: string;
  supportTitle: string;
  supportItems: string[];
};

export const BOT_WORKSPACE_PANELS: Record<BotId, BotWorkspacePanelContent> = {
  document_wizard: {
    focusLabel: "Document Forge",
    mission:
      "Turn rough notes, uploaded PDFs, and user goals into a polished final deliverable.",
    workflowTitle: "Best when the user has:",
    workflowSteps: [
      "source material or a PDF to work from",
      "a defined client, audience, or output target",
      "a need for a clean rendered report",
    ],
    supportLabel: "Workflow Support",
    supportTitle: "Inside this lane:",
    supportItems: [
      "upload the source PDF first",
      "complete the guided report form",
      "track generated artifacts here",
    ],
  },
  tutor: {
    focusLabel: "Learning Guide",
    mission:
      "Break complex topics into understandable steps and coach the user toward clarity.",
    workflowTitle: "Best when the user needs:",
    workflowSteps: [
      "a concept explained simply",
      "step-by-step guidance",
      "structured practice or reinforcement",
    ],
    supportLabel: "Session Support",
    supportTitle: "Use this panel for:",
    supportItems: [
      "a quick reminder of the learning lane",
      "session pacing before asking the next question",
      "reviewing any outputs saved during the chat",
    ],
  },
  form_wizard: {
    focusLabel: "Form Builder",
    mission:
      "Collect structured inputs cleanly, then transform them into a finished output.",
    workflowTitle: "Best when the user has:",
    workflowSteps: [
      "specific fields to complete",
      "repeatable intake requirements",
      "a templated output to generate",
    ],
    supportLabel: "Form Support",
    supportTitle: "Use this panel for:",
    supportItems: [
      "tracking form-driven output status",
      "keeping intake expectations visible",
      "reviewing generated deliverables",
    ],
  },
  verifier: {
    focusLabel: "Verification Lane",
    mission:
      "Pressure-test claims, compare evidence, and call out weak spots before decisions are made.",
    workflowTitle: "Best when the user needs:",
    workflowSteps: [
      "fact-checking or review",
      "discrepancy detection",
      "higher scrutiny before acting",
    ],
    supportLabel: "Review Support",
    supportTitle: "Use this panel for:",
    supportItems: [
      "checking what has already been produced",
      "staying focused on verification requests",
      "keeping evidence-oriented tasks organized",
    ],
  },
  concierge_general_academy_KB: {
    focusLabel: "Academy Concierge",
    mission:
      "Route the user to the right academy knowledge quickly and answer with grounded context.",
    workflowTitle: "Best when the user wants:",
    workflowSteps: [
      "knowledge-base guidance",
      "fast orientation inside the academy",
      "an answer anchored to known material",
    ],
    supportLabel: "KB Support",
    supportTitle: "Use this panel for:",
    supportItems: [
      "staying oriented while exploring academy topics",
      "keeping saved outputs in one place",
      "moving from question to action cleanly",
    ],
  },
  tax_legal_research: {
    focusLabel: "Research Desk",
    mission:
      "Surface grounded tax and legal research starting points with disciplined, cautious framing.",
    workflowTitle: "Best when the user needs:",
    workflowSteps: [
      "source-aware research support",
      "issue spotting before escalation",
      "a structured research starting point",
    ],
    supportLabel: "Research Support",
    supportTitle: "Use this panel for:",
    supportItems: [
      "keeping research tasks focused and organized",
      "tracking any saved report outputs",
      "holding a cautious posture while exploring issues",
    ],
  },
};

export function getBotWorkspacePanel(botId: BotId) {
  return BOT_WORKSPACE_PANELS[botId];
}
