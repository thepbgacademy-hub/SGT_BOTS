import { useEffect, useState, type FormEvent } from "react";
import type { BotCatalogEntry } from "../../../../../packages/shared/src/bots/manifests";
import type { ArtifactListItem } from "../artifacts/ArtifactList";
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
  messages: ChatMessage[];
  onArtifactQueued: (artifact: ArtifactListItem) => void;
  onConversationUpdate: (result: {
    conversationId: string;
    messages: ChatMessage[];
  }) => void;
  sessionId: string;
  sessionToken: string;
};

function sourceLabel(sourceId: ChatCitation["sourceId"]) {
  return sourceId === "knowledge_base" ? "Knowledge Base" : sourceId;
}

export function ChatPanel({
  bot,
  conversationId,
  messages,
  onArtifactQueued,
  onConversationUpdate,
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

  const supportsDocumentWizardReportFlow = Boolean(
    bot?.capabilities.pdf_upload &&
      bot.capabilities.structured_form &&
      bot.capabilities.html_report,
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
        <p className="panel-description">{bot.description}</p>
      </header>
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
              Start the conversation here. Each bot stays inside its assigned lane and only returns user-facing results.
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
