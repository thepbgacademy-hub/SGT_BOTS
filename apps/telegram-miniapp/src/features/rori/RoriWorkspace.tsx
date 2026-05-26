import type { BotCatalogEntry } from "../../../../../packages/shared/src/bots/manifests";
import { ChatPanel, type ChatMessage } from "../chat/ChatPanel";

type RoriWorkspaceProps = {
  bot: BotCatalogEntry | null;
  conversationId?: string;
  messages: ChatMessage[];
  onBackToMenu: () => void;
  onConversationUpdate: (result: {
    conversationId: string;
    messages: ChatMessage[];
  }) => void;
  sessionId: string;
  sessionToken: string;
};

const RORI_STARTER_PROMPTS = [
  "How do I enroll?",
  "What workshops are coming up?",
  "Which PBG Telegram rooms should I join?",
  "Which tool should I use for...?",
];

export function RoriWorkspace({
  bot,
  conversationId,
  messages,
  onBackToMenu,
  onConversationUpdate,
  sessionId,
  sessionToken,
}: RoriWorkspaceProps) {
  return (
    <section className="rori-shell">
      <header className="rori-workspace-header">
        <div>
          <p className="rori-kicker">Academy concierge</p>
          <h2>Rori</h2>
          <p className="rori-helper-text">
            Ask about the Academy, workshops, enrollment, or Telegram rooms.
          </p>
        </div>
        <button
          className="secondary-button rori-back-button"
          onClick={onBackToMenu}
          type="button"
        >
          Back
        </button>
      </header>
      <div className="rori-guidance-row" aria-label="Rori can help with">
        <span>Enrollment</span>
        <span>Workshops</span>
        <span>Telegram rooms</span>
        <span>Tool routing</span>
      </div>
      <div className="rori-chat-window">
        <ChatPanel
          bot={bot}
          conversationId={conversationId}
          emptyCopy="Pick a prompt or type your question below."
          hideHeader
          inputPlaceholder="Ask Rori about the Academy..."
          messages={messages}
          onArtifactQueued={() => undefined}
          onConversationUpdate={onConversationUpdate}
          primarySendButtonLabel="Send"
          sendErrorCopy="Rori could not answer right now. Please try again."
          sessionId={sessionId}
          sessionToken={sessionToken}
          starterPrompts={RORI_STARTER_PROMPTS}
        />
      </div>
    </section>
  );
}
