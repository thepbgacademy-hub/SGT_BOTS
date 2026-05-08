import { useState, type FormEvent } from "react";
import type { BotCatalogEntry } from "../../../../../packages/shared/src/bots/manifests";
import type { ArtifactListItem } from "../artifacts/ArtifactList";
import {
  DocumentWizardForm,
  type DocumentWizardReportFormData,
} from "../forms/DocumentWizardForm";
import { UploadPanel } from "../uploads/UploadPanel";

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

  function clearDocumentStatus() {
    setDocumentError(null);
    setReportStatus(null);
  }

  function handleFileSelect(file: File | null) {
    clearDocumentStatus();
    setDocumentFile(file);
  }

  const supportsDocumentWizardReportFlow = Boolean(
    bot?.capabilities.pdf_upload &&
      bot.capabilities.structured_form &&
      bot.capabilities.html_report,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!bot || !input.trim()) {
      return;
    }

    setChatError(null);
    setSubmitting(true);

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
          message: input,
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
      setInput("");
    } catch {
      setChatError("Unable to send your message.");
    } finally {
      setSubmitting(false);
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
          <p className="eyebrow">Active Bot</p>
        <h2>{bot.name}</h2>
        </div>
        <p className="panel-description">{bot.description}</p>
      </header>
      <div className="message-stack">
        {messages.map((message) => (
          <article className={message.role === "assistant" ? "message-card is-assistant" : "message-card is-user"} key={message.id}>
            <p className="message-role">{message.role === "assistant" ? bot.name : "You"}</p>
            <p className="message-copy">{message.content}</p>
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
        ))}
        {!messages.length ? (
          <article className="message-card message-card--empty">
            <p className="message-role">Ready</p>
            <p className="message-copy">
              Start the conversation here. Each bot stays inside its assigned
              lane and only returns user-facing results.
            </p>
          </article>
        ) : null}
      </div>
      {chatError ? <p role="alert" className="alert-banner">{chatError}</p> : null}
      <form className="composer" onSubmit={handleSubmit}>
        <label className="field field--full">
          <span className="field-label">Message</span>
          <input
            aria-label="Chat input"
            onChange={(event) => setInput(event.target.value)}
            value={input}
          />
        </label>
        <button className="primary-button composer-button" disabled={submitting || !bot} type="submit">
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
