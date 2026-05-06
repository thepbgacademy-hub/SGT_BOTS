import { useState, type FormEvent } from "react";

type BotCatalogEntry = {
  id: "document_wizard" | "kb_concierge";
  name: string;
  description: string;
  capabilities: {
    chat: boolean;
    citations: boolean;
    html_report: boolean;
    pdf_upload: boolean;
    rag_query: boolean;
    structured_form: boolean;
  };
  sourceBinding: "none" | "knowledge_base";
};

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
  onConversationUpdate,
  sessionId,
  sessionToken,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!bot || !input.trim()) {
      return;
    }

    setError(null);
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
        botId?: BotCatalogEntry["id"];
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
        setError(payload.message ?? "Unable to send your message.");
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
      setError("Unable to send your message.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!bot) {
    return (
      <section>
        <h2>Chat</h2>
        <p>Select a bot to start.</p>
      </section>
    );
  }

  return (
    <section>
      <header>
        <h2>{bot.name}</h2>
        <p>{bot.description}</p>
      </header>
      {bot.capabilities.pdf_upload ? (
        <p>
          <button disabled type="button">
            Upload document (coming in Phase 4)
          </button>
        </p>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      <div>
        {messages.map((message) => (
          <article key={message.id}>
            <p>{message.content}</p>
            {message.citations?.length ? (
              <ul aria-label="Citations">
                {message.citations.map((citation) => (
                  <li key={`${message.id}:${citation.title}`}>
                    <span>{citation.title}</span>
                    <span>{sourceLabel(citation.sourceId)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <label>
          Message
          <input
            aria-label="Chat input"
            onChange={(event) => setInput(event.target.value)}
            value={input}
          />
        </label>
        <button disabled={submitting || !bot} type="submit">
          Send message
        </button>
      </form>
    </section>
  );
}
