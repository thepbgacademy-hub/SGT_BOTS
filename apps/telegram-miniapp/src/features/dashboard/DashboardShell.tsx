import { useEffect, useMemo, useRef, useState } from "react";
import type { BotCatalogEntry } from "../../../../../packages/shared/src/bots/manifests";
import {
  ArtifactList,
  type ArtifactListItem,
} from "../artifacts/ArtifactList";
import { ChatPanel, type ChatMessage } from "../chat/ChatPanel";
import { BotRail } from "./BotRail";
import { ProviderConnectPanel } from "../onboarding/ProviderConnectPanel";
import { formatRemaining } from "../../lib/timer";
import { SessionEndModal, type SessionEndPrompt } from "./SessionEndModal";

type SessionSnapshot = {
  id: string;
  provider: "openai" | "anthropic";
  startedAt: string;
  expiresAt: string;
  durationSeconds: number;
  remainingSeconds: number;
  state: "active" | "expired" | "reauth_required";
};

type DashboardShellProps = {
  initData: string;
  preferredName: string;
};

const DEFAULT_REVIEW_GROUP_URL = "https://t.me/your_review_group";

export function DashboardShell({
  initData,
  preferredName,
}: DashboardShellProps) {
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [reviewPrompt, setReviewPrompt] = useState<SessionEndPrompt | null>(null);
  const [bots, setBots] = useState<BotCatalogEntry[]>([]);
  const [botError, setBotError] = useState<string | null>(null);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactListItem[]>([]);
  const [remainingCountdownSeconds, setRemainingCountdownSeconds] = useState<number | null>(
    null,
  );
  const [conversations, setConversations] = useState<
    Record<
      string,
      {
        conversationId?: string;
        messages: ChatMessage[];
      }
    >
  >({});
  const reviewPromptRequestKeyRef = useRef<string | null>(null);
  const forceSessionExpiry = useMemo(
    () =>
      new URLSearchParams(window.location.search).get("forceSessionExpiry") ===
      "1",
    [],
  );

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
  const remainingSeconds = isSessionActive
    ? remainingCountdownSeconds ?? session?.remainingSeconds ?? 0
    : 0;
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
    setArtifacts([]);
    setConversations({});
    setSelectedBotId(null);
  }, [activeSessionId, sessionToken]);

  useEffect(() => {
    if (!isSessionActive || reviewPrompt) {
      setRemainingCountdownSeconds(null);
      return;
    }

    setRemainingCountdownSeconds(session.remainingSeconds);
    const intervalId = window.setInterval(() => {
      setRemainingCountdownSeconds((currentSeconds) =>
        Math.max(0, (currentSeconds ?? 0) - 1),
      );
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isSessionActive, reviewPrompt, session?.id, session?.remainingSeconds]);

  useEffect(() => {
    if (!activeSessionId || !sessionToken || reviewPrompt) {
      return;
    }

    if (remainingCountdownSeconds === null) {
      return;
    }

    if (!forceSessionExpiry && remainingSeconds > 0) {
      return;
    }

    const requestKey = `timeout:${activeSessionId}`;

    if (reviewPromptRequestKeyRef.current === requestKey) {
      return;
    }

    reviewPromptRequestKeyRef.current = requestKey;
    setReviewPrompt({
      reason: "timeout",
      reviewUrl: DEFAULT_REVIEW_GROUP_URL,
    });
    setSession((currentSession) =>
      currentSession
        ? {
            ...currentSession,
            remainingSeconds: 0,
            state: "expired",
          }
        : currentSession,
    );
    setSessionToken(null);

    let cancelled = false;

    void fetch("/api/reviews/prompt", {
      method: "POST",
      headers: {
        authorization: `Bearer ${sessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sessionId: activeSessionId,
        reason: "timeout",
      }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          reviewUrl?: string;
        };

        if (cancelled) {
          return;
        }

        setReviewPrompt({
          reason: "timeout",
          reviewUrl: payload.reviewUrl ?? DEFAULT_REVIEW_GROUP_URL,
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeSessionId,
    forceSessionExpiry,
    remainingCountdownSeconds,
    remainingSeconds,
    reviewPrompt,
    sessionToken,
  ]);

  async function handleEndPlayground() {
    if (!activeSessionId || !sessionToken) {
      return;
    }

    setSessionError(null);

    try {
      const response = await fetch("/api/reviews/prompt", {
        method: "POST",
        headers: {
          authorization: `Bearer ${sessionToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sessionId: activeSessionId,
          reason: "early_exit",
        }),
      });
      const payload = (await response.json()) as {
        message?: string;
        reviewUrl?: string;
      };

      if (!response.ok) {
        setSessionError(payload.message ?? "Unable to end the playground right now.");
        return;
      }

      setReviewPrompt({
        reason: "early_exit",
        reviewUrl: payload.reviewUrl ?? DEFAULT_REVIEW_GROUP_URL,
      });
      setSession((currentSession) =>
        currentSession
          ? {
              ...currentSession,
              remainingSeconds: 0,
              state: "expired",
            }
          : currentSession,
      );
      setSessionToken(null);
    } catch {
      setSessionError("Unable to end the playground right now.");
    }
  }

  return (
    <main>
      <header>
        <p>Playground</p>
        <h1>{preferredName}, your dashboard is ready</h1>
      </header>
      {reviewPrompt ? <SessionEndModal prompt={reviewPrompt} /> : null}
      {isSessionActive && sessionToken && !reviewPrompt ? (
        <>
          <section>
            <p>Provider connected</p>
            <p>Time remaining</p>
            <p>{formatRemaining(remainingSeconds)}</p>
            <button onClick={handleEndPlayground} type="button">
              End playground
            </button>
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
              onArtifactQueued={(artifact) => {
                setArtifacts((currentArtifacts) => [
                  artifact,
                  ...currentArtifacts.filter(
                    (currentArtifact) => currentArtifact.id !== artifact.id,
                  ),
                ]);
              }}
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
            <ArtifactList artifacts={artifacts} />
          </section>
        </>
      ) : reviewPrompt ? (
        <section>
          <p>Review ready.</p>
        </section>
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
                reviewPromptRequestKeyRef.current = null;
                setReviewPrompt(null);
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
