import { useEffect, useState } from "react";
import { ChatPanel, type ChatMessage } from "../chat/ChatPanel";
import { BotRail } from "./BotRail";
import { ProviderConnectPanel } from "../onboarding/ProviderConnectPanel";
import { formatRemaining } from "../../lib/timer";

type SessionSnapshot = {
  id: string;
  provider: "openai" | "anthropic";
  startedAt: string;
  expiresAt: string;
  durationSeconds: number;
  remainingSeconds: number;
  state: "active" | "expired" | "reauth_required";
};

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

type DashboardShellProps = {
  initData: string;
  preferredName: string;
};

export function DashboardShell({
  initData,
  preferredName,
}: DashboardShellProps) {
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [bots, setBots] = useState<BotCatalogEntry[]>([]);
  const [botError, setBotError] = useState<string | null>(null);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<
    Record<
      string,
      {
        conversationId?: string;
        messages: ChatMessage[];
      }
    >
  >({});

  const activeSessionId =
    session?.state === "active" && sessionToken ? session.id : null;

  useEffect(() => {
    if (!activeSessionId || !sessionToken) {
      return;
    }

    const intervalId = window.setInterval(async () => {
      try {
        const authenticatedResponse = await fetch(`/api/sessions/${activeSessionId}`, {
          headers: {
            authorization: `Bearer ${sessionToken}`,
          },
        });

        if (!authenticatedResponse.ok) {
          throw new Error("session refresh failed");
        }

        const payload = (await authenticatedResponse.json()) as {
          session: SessionSnapshot;
        };
        setSession(payload.session);
      } catch {
        setSessionError("Unable to refresh provider session.");
      }
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeSessionId, sessionToken]);

  const isSessionActive = session?.state === "active";
  const requiresRelaunch = session?.state === "reauth_required";
  const selectedBot =
    bots.find((bot) => bot.id === selectedBotId) ?? bots[0] ?? null;
  const selectedConversation = selectedBot
    ? conversations[selectedBot.id]
    : undefined;

  useEffect(() => {
    if (!activeSessionId || !sessionToken) {
      setConversations({});
      setBots([]);
      setSelectedBotId(null);
      return;
    }

    let cancelled = false;

    fetch(`/api/bots?sessionId=${encodeURIComponent(activeSessionId)}`, {
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          message?: string;
          bots?: BotCatalogEntry[];
        };

        const nextBots = payload.bots;

        if (!response.ok || !nextBots) {
          throw new Error(payload.message ?? "Unable to load bots.");
        }

        if (!cancelled) {
          setBotError(null);
          setBots(nextBots);
          setSelectedBotId((currentSelectedBotId) => {
            if (
              currentSelectedBotId &&
              nextBots.some((bot) => bot.id === currentSelectedBotId)
            ) {
              return currentSelectedBotId;
            }

            return nextBots[0]?.id ?? null;
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBotError("Unable to load bot catalog.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeSessionId, sessionToken]);

  useEffect(() => {
    setConversations({});
    setSelectedBotId(null);
  }, [activeSessionId, sessionToken]);

  return (
    <main>
      <header>
        <p>Playground</p>
        <h1>{preferredName}, your dashboard is ready</h1>
      </header>
      {isSessionActive && sessionToken ? (
        <>
          <section>
            <p>Provider connected</p>
            <p>Time remaining</p>
            <p>{formatRemaining(session.remainingSeconds)}</p>
          </section>
          {botError ? <p role="alert">{botError}</p> : null}
          <section>
            <BotRail
              bots={bots}
              selectedBotId={selectedBot?.id ?? null}
              onSelect={setSelectedBotId}
            />
            <ChatPanel
              key={selectedBot?.id ?? "no-bot-selected"}
              bot={selectedBot}
              conversationId={selectedConversation?.conversationId}
              messages={selectedConversation?.messages ?? []}
              onConversationUpdate={({ conversationId, messages }) => {
                if (!selectedBot) {
                  return;
                }

                setConversations((currentConversations) => ({
                  ...currentConversations,
                  [selectedBot.id]: {
                    conversationId,
                    messages,
                  },
                }));
              }}
              sessionId={session.id}
              sessionToken={sessionToken}
            />
          </section>
        </>
      ) : (
        <section>
          <p>Connect your provider to continue</p>
          <p>Bot access stays locked until provider validation succeeds.</p>
          {session?.state === "expired" ? (
            <p>Your provider session expired. Connect again to continue.</p>
          ) : null}
          {requiresRelaunch ? (
            <p>
              Relaunch the Playground from Telegram to get a fresh secure
              launch before reconnecting your provider.
            </p>
          ) : null}
          {sessionError ? <p role="alert">{sessionError}</p> : null}
          {requiresRelaunch ? null : (
            <ProviderConnectPanel
              initData={initData}
              onConnected={({ session: nextSession, sessionToken: nextSessionToken }) => {
                setSessionError(null);
                setSession(nextSession);
                setSessionToken(nextSessionToken);
              }}
            />
          )}
        </section>
      )}
    </main>
  );
}
