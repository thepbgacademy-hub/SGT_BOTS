import type { BotCatalogEntry } from "../../../../../packages/shared/src/bots/manifests";
import { ChatPanel, type ChatMessage } from "../chat/ChatPanel";
import { RORI_STARTER_PROMPTS } from "./starter-prompts";

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

export function RoriWorkspace({
  bot,
  conversationId,
  messages,
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
            Ask about the Academy, workshops, enrollment, PBG Telegram rooms, or what tools do what.
          </p>
        </div>
      </header>
      <div className="rori-chat-window">
        <ChatPanel
          bot={bot}
          conversationId={conversationId}
          hideCitations
          hideHeader
          inputPlaceholder="Ask Rori about the Academy..."
          latestExchangeOnly
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
