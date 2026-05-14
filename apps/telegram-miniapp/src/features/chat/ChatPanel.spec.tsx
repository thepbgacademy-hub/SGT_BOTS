import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { BotCatalogEntry } from "../../../../../packages/shared/src/bots/manifests";
import { ChatPanel } from "./ChatPanel";
import {
  EMPTY_CURSIVE_CREDIT_DISPUTE_INTAKE,
} from "../cursive/CursiveIntakeWizard";

const CURSIVE_PREVIEW_SNAPSHOT = {
  categorySlug: "credit_bureau_dispute" as const,
  generatedDate: "May 11, 2026",
  consumerName: "Jane Doe",
  consumerAddressLines: ["123 Main Street", "Dallas, TX 75001"],
  bureauName: "Experian",
  bureauAddressLines: ["P.O. Box 4500", "Allen, TX 75013"],
  subjectLine: "Re: FCRA Dispute and Reinvestigation Request for Account ending 1234",
  salutation: "To Whom It May Concern:",
  bodyParagraphs: ["Please reinvestigate this account.<sup>1</sup>"],
  closing: "Sincerely,",
  citations: ["15 U.S.C. Sec. 1681i"],
  portalText: "Portal-safe summary for bureau upload",
};

const CURSIVE_BOT = {
  id: "document_wizard",
  name: "Cursive",
  description: "Draft official dispute letters.",
  capabilities: {
    chat: true,
    citations: false,
    html_report: true,
    pdf_upload: false,
    rag_query: false,
    structured_form: true,
  },
} as unknown as BotCatalogEntry;

describe("ChatPanel", () => {
  it("renders portal-safe preview text when Cursive provides it", () => {
    const markup = renderToStaticMarkup(
      createElement(ChatPanel, {
        bot: CURSIVE_BOT,
        conversationId: undefined,
        cursiveIntake: EMPTY_CURSIVE_CREDIT_DISPUTE_INTAKE,
        cursiveIntakeStarted: true,
        cursivePreviewError: null,
        cursivePreviewHtml: "<html><body>Preview</body></html>",
        cursivePreviewIsStale: false,
        cursivePreviewPortalText: "Portal-safe summary for bureau upload",
        cursivePreviewSnapshot: CURSIVE_PREVIEW_SNAPSHOT,
        cursivePreviewToken: "preview-token",
        isGeneratingCursivePreview: false,
        messages: [],
        onArtifactQueued: () => undefined,
        onConversationUpdate: () => undefined,
        onStartCursiveIntake: () => undefined,
        onCursiveCategoryChange: () => undefined,
        onCursiveGenerate: () => undefined,
        onCursiveIntakeChange: () => undefined,
        selectedCursiveCategory: null,
        sessionId: "session-1",
        sessionToken: "token-1",
      }),
    );

    expect(markup).toContain("Portal text for bureau portals");
    expect(markup).toContain("Portal-safe summary for bureau upload");
  });

  it("omits the portal-safe preview panel when no portal text exists", () => {
    const markup = renderToStaticMarkup(
      createElement(ChatPanel, {
        bot: CURSIVE_BOT,
        conversationId: undefined,
        cursiveIntake: EMPTY_CURSIVE_CREDIT_DISPUTE_INTAKE,
        cursiveIntakeStarted: true,
        cursivePreviewError: null,
        cursivePreviewHtml: "<html><body>Preview</body></html>",
        cursivePreviewIsStale: false,
        cursivePreviewPortalText: null,
        cursivePreviewSnapshot: CURSIVE_PREVIEW_SNAPSHOT,
        cursivePreviewToken: "preview-token",
        isGeneratingCursivePreview: false,
        messages: [],
        onArtifactQueued: () => undefined,
        onConversationUpdate: () => undefined,
        onStartCursiveIntake: () => undefined,
        onCursiveCategoryChange: () => undefined,
        onCursiveGenerate: () => undefined,
        onCursiveIntakeChange: () => undefined,
        selectedCursiveCategory: null,
        sessionId: "session-1",
        sessionToken: "token-1",
      }),
    );

    expect(markup).not.toContain("Portal text for bureau portals");
  });

  it("keeps Cursive in helper-chat mode until the official intake is explicitly started", () => {
    const markup = renderToStaticMarkup(
      createElement(ChatPanel, {
        bot: CURSIVE_BOT,
        conversationId: undefined,
        cursiveIntake: EMPTY_CURSIVE_CREDIT_DISPUTE_INTAKE,
        cursiveIntakeStarted: false,
        cursivePreviewError: null,
        cursivePreviewHtml: null,
        cursivePreviewIsStale: false,
        cursivePreviewPortalText: null,
        cursivePreviewSnapshot: null,
        cursivePreviewToken: null,
        isGeneratingCursivePreview: false,
        messages: [],
        onArtifactQueued: () => undefined,
        onConversationUpdate: () => undefined,
        onStartCursiveIntake: () => undefined,
        onCursiveCategoryChange: () => undefined,
        onCursiveGenerate: () => undefined,
        onCursiveIntakeChange: () => undefined,
        selectedCursiveCategory: "credit_bureau_dispute",
        sessionId: "session-1",
        sessionToken: "token-1",
      }),
    );

    expect(markup).toContain("Ask questions before you start the letter");
    expect(markup).toContain("Start official letter");
    expect(markup).not.toContain("Credit Bureau Dispute Intake");
  });
});
