import { useEffect, useState, type FormEvent } from "react";
import type { BotCatalogEntry } from "../../../../../packages/shared/src/bots/manifests";
import type { ArtifactListItem } from "../artifacts/ArtifactList";
import {
  CursiveCategoryPicker,
  type CursiveCategorySlug,
} from "../cursive/CursiveCategoryPicker";
import {
  CursiveIntakeWizard,
  isCursiveDocumentLaneUnlocked,
  type CursiveCreditDisputeIntake,
} from "../cursive/CursiveIntakeWizard";
import {
  DocumentWizardForm,
  type DocumentWizardReportFormData,
} from "../forms/DocumentWizardForm";
import { UploadPanel } from "../uploads/UploadPanel";
import { VanishInput } from "./VanishInput";

const VANISH_DURATION_MS = 600;

type ChatCitation = {
  sourceId: "knowledge_base";
  title: string;
  url: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  citations?: ChatCitation[];
};

type ChatPanelProps = {
  bot: BotCatalogEntry | null;
  conversationId?: string;
  cursiveIntake: CursiveCreditDisputeIntake;
  cursiveIntakeStarted: boolean;
  cursivePreviewError: string | null;
  cursivePreviewHtml: string | null;
  cursivePreviewIsStale: boolean;
  cursivePreviewPortalText: string | null;
  cursivePreviewSnapshot: CursivePreviewSnapshot | null;
  cursivePreviewToken: string | null;
  isGeneratingCursivePreview: boolean;
  onCursiveCategoryChange: (category: CursiveCategorySlug) => void;
  onCursiveGenerate: () => void;
  onCursiveIntakeChange: (
    field: keyof CursiveCreditDisputeIntake,
    value: string,
  ) => void;
  messages: ChatMessage[];
  onArtifactQueued: (artifact: ArtifactListItem) => void;
  onConversationUpdate: (result: {
    conversationId: string;
    messages: ChatMessage[];
  }) => void;
  onStartCursiveIntake: () => void;
  selectedCursiveCategory: CursiveCategorySlug | null;
  sessionId: string;
  sessionToken: string;
};

type CursivePreviewSnapshot = {
  categorySlug: "credit_bureau_dispute";
  generatedDate: string;
  consumerName: string;
  consumerAddressLines: string[];
  bureauName: string;
  bureauAddressLines: string[];
  subjectLine: string;
  salutation: string;
  bodyParagraphs: string[];
  closing: string;
  citations: string[];
  portalText: string;
};

function sourceLabel(sourceId: ChatCitation["sourceId"]) {
  return sourceId === "knowledge_base" ? "Knowledge Base" : sourceId;
}

export function ChatPanel({
  bot,
  conversationId,
  cursiveIntake,
  cursiveIntakeStarted,
  cursivePreviewError,
  cursivePreviewHtml,
  cursivePreviewIsStale,
  cursivePreviewPortalText,
  cursivePreviewSnapshot,
  cursivePreviewToken,
  isGeneratingCursivePreview,
  messages,
  onCursiveCategoryChange,
  onCursiveGenerate,
  onCursiveIntakeChange,
  onArtifactQueued,
  onConversationUpdate,
  onStartCursiveIntake,
  selectedCursiveCategory,
  sessionId,
  sessionToken,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [vanishingText, setVanishingText] = useState("");
  const [isVanishing, setIsVanishing] = useState(false);
  const [expandedUserMessages, setExpandedUserMessages] = useState<string[]>([]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);

    return () => {
      mediaQuery.removeEventListener("change", syncPreference);
    };
  }, []);

  const vanishDurationMs = prefersReducedMotion ? 0 : VANISH_DURATION_MS;

  function clearDocumentStatus() {
    setDocumentError(null);
    setReportStatus(null);
  }

  function handleFileSelect(file: File | null) {
    clearDocumentStatus();
    setDocumentFile(file);
  }

  function toggleExpandedUserMessage(messageId: string) {
    setExpandedUserMessages((current) =>
      current.includes(messageId)
        ? current.filter((id) => id !== messageId)
        : [...current, messageId],
    );
  }

  const isCursiveBot = bot?.id === "document_wizard";
  const supportsDocumentWizardReportFlow = Boolean(
    bot?.capabilities.pdf_upload &&
      bot.capabilities.structured_form &&
      bot.capabilities.html_report &&
      !isCursiveBot,
  );
  const canSaveCursivePdfDraft = Boolean(
    isCursiveBot &&
      isCursiveDocumentLaneUnlocked(
        selectedCursiveCategory,
        cursivePreviewHtml,
        cursivePreviewIsStale,
      ) &&
      cursivePreviewSnapshot &&
      cursivePreviewToken &&
      !cursivePreviewIsStale,
  );
  let latestVisibleUserMessageId: string | null = null;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") {
      latestVisibleUserMessageId = messages[index].id;
      break;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const submittedMessage = input.trim();

    if (!bot || !submittedMessage) {
      return;
    }

    setChatError(null);
    setSubmitting(true);
    setVanishingText(submittedMessage);
    setIsVanishing(true);
    setInput("");

    let shouldDelayUnlock = false;

    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          authorization: `Bearer ${sessionToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          conversationId,
          botId: bot.id,
          message: submittedMessage,
        }),
      });
      const payload = (await response.json()) as {
        botId?: string;
        citations?: ChatCitation[];
        message?: string;
        output?: string;
        conversation?: {
          id: string;
        };
        userMessage?: ChatMessage;
      };

      if (
        !response.ok ||
        !payload.conversation ||
        !payload.userMessage ||
        !payload.output
      ) {
        setChatError(payload.message ?? "Unable to send your message.");
        setInput(submittedMessage);
        setIsVanishing(false);
        setVanishingText("");
        setSubmitting(false);
        return;
      }

      const assistantMessage: ChatMessage = {
        id: `assistant:${payload.conversation.id}:${messages.length + 1}`,
        role: "assistant",
        content: payload.output,
        createdAt: new Date().toISOString(),
        citations: payload.citations ?? [],
      };

      onConversationUpdate({
        conversationId: payload.conversation.id,
        messages: [...messages, payload.userMessage, assistantMessage],
      });
      shouldDelayUnlock = true;
    } catch {
      setChatError("Unable to send your message.");
      setInput(submittedMessage);
      setIsVanishing(false);
      setVanishingText("");
      setSubmitting(false);
    } finally {
      if (shouldDelayUnlock) {
        window.setTimeout(() => {
          setIsVanishing(false);
          setVanishingText("");
          setSubmitting(false);
        }, vanishDurationMs);
      } else if (submitting) {
        setSubmitting(false);
      }
    }
  }

  async function handleDocumentWizardSubmit(
    formData: DocumentWizardReportFormData,
  ) {
    if (!bot) {
      return;
    }

    if (!documentFile) {
      setDocumentError("Upload a PDF to continue.");
      setReportStatus(null);
      return;
    }

    const hasPdfMimeType = documentFile.type === "application/pdf";
    const hasPdfExtension = documentFile.name.toLowerCase().endsWith(".pdf");

    if (!hasPdfMimeType && !hasPdfExtension) {
      setDocumentError("Upload a PDF to continue.");
      setReportStatus(null);
      return;
    }

    setDocumentError(null);
    setReportStatus(null);
    setSubmittingReport(true);

    try {
      const response = await fetch("/api/reports/document-wizard", {
        method: "POST",
        headers: {
          authorization: `Bearer ${sessionToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          botId: bot.id,
          filename: documentFile.name,
          mimeType:
            documentFile.type || (hasPdfExtension ? "application/pdf" : ""),
          fileBytesBase64: await encodeFileAsBase64(documentFile),
          formData,
        }),
      });
      const payload = (await response.json()) as {
        message?: string;
        artifactType?: "pdf";
        artifact?: {
          id?: string;
          fileName?: string;
          originalFilename?: string;
          status?: "queued" | "ready" | "failed";
        };
        upload?: {
          originalFilename?: string;
        };
      };

      if (
        !response.ok ||
        payload.artifactType !== "pdf" ||
        !payload.artifact?.id ||
        !payload.artifact.fileName ||
        !payload.artifact.status ||
        !payload.upload?.originalFilename
      ) {
        setDocumentError(payload.message ?? "Unable to queue your report.");
        return;
      }

      onArtifactQueued({
        id: payload.artifact.id,
        artifactType: payload.artifactType,
        botName: bot.name,
        fileName: payload.artifact.fileName,
        originalFilename: payload.upload.originalFilename,
        status: payload.artifact.status,
      });
      setReportStatus("Report queued");
    } catch {
      setDocumentError("Unable to queue your report.");
    } finally {
      setSubmittingReport(false);
    }
  }

  async function handleCursiveSavePdfDraft() {
    if (
      !bot ||
      !isCursiveBot ||
      !cursivePreviewHtml ||
      !cursivePreviewSnapshot ||
      !cursivePreviewToken ||
      cursivePreviewIsStale
    ) {
      return;
    }

    setDocumentError(null);
    setReportStatus(null);
    setSubmittingReport(true);

    try {
      const response = await fetch(
        "/api/reports/cursive/credit-bureau-dispute/save-pdf-draft",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${sessionToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            botId: bot.id,
            previewHtml: cursivePreviewHtml,
            previewSnapshot: cursivePreviewSnapshot,
            previewToken: cursivePreviewToken,
            sessionId,
          }),
        },
      );
      const payload = (await response.json()) as {
        message?: string;
        artifactType?: "pdf";
        artifact?: {
          id?: string;
          fileName?: string;
          originalFilename?: string;
          status?: "queued" | "ready" | "failed";
        };
      };

      if (
        !response.ok ||
        payload.artifactType !== "pdf" ||
        !payload.artifact?.id ||
        !payload.artifact.fileName ||
        !payload.artifact.status
      ) {
        setDocumentError(payload.message ?? "Unable to queue your PDF draft.");
        return;
      }

      onArtifactQueued({
        id: payload.artifact.id,
        artifactType: payload.artifactType,
        botName: bot.name,
        fileName: payload.artifact.fileName,
        originalFilename:
          payload.artifact.originalFilename ?? "credit-bureau-dispute-preview.html",
        status: payload.artifact.status,
      });
      setReportStatus("PDF draft queued");
    } catch {
      setDocumentError("Unable to queue your PDF draft.");
    } finally {
      setSubmittingReport(false);
    }
  }

  if (!bot) {
    return (
      <section className="panel chat-panel">
        <h2>Chat</h2>
        <p className="muted-copy">Select a bot to start.</p>
      </section>
    );
  }

  return (
    <section className="panel chat-panel">
      <header className="panel-header">
        <div>
          <p className="eyebrow">Active Assistant</p>
          <h2>{bot.name}</h2>
        </div>
        <p className="panel-description">
          {isCursiveBot
            ? "Helper chat stays visible for questions and wording support. The official letter flow only starts after you explicitly open it."
            : bot.description}
        </p>
      </header>
      {isCursiveBot ? (
        <div className="cursive-shell">
          <CursiveCategoryPicker
            onSelect={onCursiveCategoryChange}
            selectedCategory={selectedCursiveCategory}
          />
          {!cursiveIntakeStarted ? (
            <section
              className={[
                "cursive-card",
                "cursive-card--muted",
                messages.length ? "cursive-card--compact" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="cursive-card__header">
                <div>
                  <p className="eyebrow">Helper Chat First</p>
                  <h3>
                    {messages.length
                      ? "Helper chat stays open while you think it through"
                      : "Ask questions before you start the letter"}
                  </h3>
                </div>
                <p className="panel-description">
                  {messages.length
                    ? "Keep asking questions here. The official intake stays separate until you explicitly begin it."
                    : "Cursive can explain the process, help you think through the facts, and answer wording questions. The official intake stays separate until you explicitly begin it."}
                </p>
              </div>
              <div className="cursive-generation-lane">
                <div>
                  <p className="cursive-generation-lane__title">Official letter flow</p>
                  <p className="muted-copy">
                    When you are ready to move from questions into the real letter
                    flow, open the official intake for the selected category.
                  </p>
                </div>
                <button
                  className="primary-button"
                  disabled={!selectedCursiveCategory}
                  onClick={onStartCursiveIntake}
                  type="button"
                >
                  Start official letter
                </button>
              </div>
            </section>
          ) : (
            <CursiveIntakeWizard
              category={selectedCursiveCategory}
              hasPreview={Boolean(cursivePreviewHtml)}
              isPreviewStale={cursivePreviewIsStale}
              isGeneratingPreview={isGeneratingCursivePreview}
              intake={cursiveIntake}
              onChange={onCursiveIntakeChange}
              onGenerate={onCursiveGenerate}
            />
          )}
        </div>
      ) : null}
      {isCursiveBot &&
      (cursivePreviewHtml || cursivePreviewPortalText || cursivePreviewError) ? (
        <section className="cursive-preview-card" aria-label="Cursive letter preview">
          <div className="cursive-preview-card__header">
            <div>
              <p className="eyebrow">Preview</p>
              <h3>Credit Bureau Dispute Letter</h3>
            </div>
            <p className="panel-description">
              {cursivePreviewIsStale
                ? "This preview is based on earlier official intake. Refresh it before saving the PDF draft."
                : "This preview reflects the latest generated official intake for Cursive."}
            </p>
          </div>
          {cursivePreviewIsStale ? (
            <p role="status" className="alert-banner">
              Official intake changed after this preview. Refresh preview before saving the PDF draft.
            </p>
          ) : null}
          {cursivePreviewError ? (
            <p role="alert" className="alert-banner">{cursivePreviewError}</p>
          ) : null}
          {cursivePreviewHtml ? (
            <iframe
              className="cursive-preview-frame"
              sandbox=""
              srcDoc={cursivePreviewHtml}
              title="Cursive letter preview"
            />
          ) : null}
          {cursivePreviewPortalText ? (
            <label className="field field--full cursive-portal-text-field">
              <span className="field-label">Portal text for bureau portals</span>
              <textarea
                aria-label="Portal text for bureau portals"
                className="cursive-portal-text"
                readOnly
                value={cursivePreviewPortalText}
              />
            </label>
          ) : null}
          {isCursiveBot ? (
            <div className="workspace-feedback">
              <button
                className="primary-button"
                disabled={!canSaveCursivePdfDraft || submittingReport}
                onClick={handleCursiveSavePdfDraft}
                type="button"
              >
                {submittingReport ? "Saving PDF draft..." : "Save PDF draft"}
              </button>
              {reportStatus ? <p className="success-banner">{reportStatus}</p> : null}
              {documentError ? <p role="alert" className="alert-banner">{documentError}</p> : null}
            </div>
          ) : null}
        </section>
      ) : null}
      <div className="message-stack">
        {messages.map((message) => {
          const isOlderUserMessage =
            message.role === "user" && message.id !== latestVisibleUserMessageId;
          const isExpandedOlderUserMessage =
            isOlderUserMessage && expandedUserMessages.includes(message.id);

          return (
            <article
              className={[
                "message-card",
                message.role === "assistant" ? "is-assistant" : "is-user",
                isOlderUserMessage && !isExpandedOlderUserMessage ? "is-compact" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={message.id}
            >
            <p className="message-role">{message.role === "assistant" ? bot.name : "You"}</p>
            <p className="message-copy">{message.content}</p>
            {isOlderUserMessage ? (
              <button
                aria-expanded={isExpandedOlderUserMessage}
                className="message-toggle"
                onClick={() => toggleExpandedUserMessage(message.id)}
                type="button"
              >
                {isExpandedOlderUserMessage ? "Collapse earlier prompt" : "Show earlier prompt"}
              </button>
            ) : null}
            {message.citations?.length ? (
              <ul aria-label="Citations" className="citation-list">
                {message.citations.map((citation) => (
                  <li className="citation-pill" key={`${message.id}:${citation.title}`}>
                    <span>{citation.title}</span>
                    <span>{sourceLabel(citation.sourceId)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            </article>
          );
        })}
        {!messages.length ? (
          <article className="message-card message-card--empty">
            <p className="message-role">Ready</p>
            <p className="message-copy">
              {isCursiveBot
                ? "Ask Cursive questions first. When you are ready to draft the real letter, tap Start official letter above."
                : "Start the conversation here. Each bot stays inside its assigned lane and only returns user-facing results."}
            </p>
          </article>
        ) : null}
      </div>
      {chatError ? <p role="alert" className="alert-banner">{chatError}</p> : null}
      <form className="composer" onSubmit={handleSubmit}>
        <label className="field field--full">
          <span className="field-label">Message</span>
          <VanishInput
            disabled={submitting || isVanishing || !bot}
            isVanishing={isVanishing}
            onChange={setInput}
            value={input}
            vanishingText={vanishingText}
          />
        </label>
        <button
          className="primary-button composer-button"
          disabled={submitting || isVanishing || !bot}
          type="submit"
        >
          Send message
        </button>
      </form>
      {supportsDocumentWizardReportFlow ? (
        <section className="workspace-strip">
          <UploadPanel
            disabled={submittingReport}
            file={documentFile}
            onFileSelect={handleFileSelect}
          />
          <DocumentWizardForm
            disabled={submittingReport}
            onSubmit={handleDocumentWizardSubmit}
          />
          <div className="workspace-feedback">
            {reportStatus ? <p className="success-banner">{reportStatus}</p> : null}
            {documentError ? <p role="alert" className="alert-banner">{documentError}</p> : null}
          </div>
        </section>
      ) : null}
    </section>
  );
}

async function encodeFileAsBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";

  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }

  return btoa(binary);
}
