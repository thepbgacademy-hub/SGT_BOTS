import { useEffect, useMemo, useRef, useState } from "react";
import type { BotCatalogEntry } from "../../../../../packages/shared/src/bots/manifests";
import {
  type ArtifactListItem,
} from "../artifacts/ArtifactList";
import { ChatPanel, type ChatMessage } from "../chat/ChatPanel";
import {
  EMPTY_CURSIVE_CREDIT_DISPUTE_INTAKE,
  getCoherentCursiveGenerationState,
  isCursiveCreditDisputeIntakeComplete,
  isCursiveOfficialCategory,
  type CursiveCreditDisputeIntake,
  type CursiveGenerationHandoffState,
} from "../cursive/CursiveIntakeWizard";
import {
  type CursiveCategorySlug,
} from "../cursive/CursiveCategoryPicker";
import { ProviderConnectPanel } from "../onboarding/ProviderConnectPanel";
import { BotSupportPanel } from "./BotSupportPanel";
import { formatRemaining } from "../../lib/timer";
import { SessionEndModal, type SessionEndPrompt } from "./SessionEndModal";
import { MainMenu } from "./MainMenu";
import { getBotWorkspacePanel } from "./bot-workspace-panels";
import {
  getMenuItem,
  type PlaygroundMenuBotId,
} from "./menu-config";

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

type CursiveWorkspaceState = {
  generationState: CursiveGenerationHandoffState;
  intake: CursiveCreditDisputeIntake;
  intakeStarted: boolean;
  previewError: string | null;
  previewHtml: string | null;
  previewIsStale: boolean;
  previewPortalText: string | null;
  previewSnapshot: CursivePreviewSnapshot | null;
  previewStatus: "idle" | "loading" | "ready";
  previewToken: string | null;
  selectedCategory: CursiveCategorySlug | null;
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

const EMPTY_CURSIVE_WORKSPACE_STATE: CursiveWorkspaceState = {
  generationState: "idle",
  intake: EMPTY_CURSIVE_CREDIT_DISPUTE_INTAKE,
  intakeStarted: false,
  previewError: null,
  previewHtml: null,
  previewIsStale: false,
  previewPortalText: null,
  previewSnapshot: null,
  previewStatus: "idle",
  previewToken: null,
  selectedCategory: null,
};

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
  const [selectedMenuBotId, setSelectedMenuBotId] = useState<PlaygroundMenuBotId | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactListItem[]>([]);
  const [artifactError, setArtifactError] = useState<string | null>(null);
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
  const [cursiveWorkspace, setCursiveWorkspace] = useState<CursiveWorkspaceState>(
    EMPTY_CURSIVE_WORKSPACE_STATE,
  );
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
    bots.find((bot) => bot.id === selectedMenuBotId) ?? null;
  const selectedConversation = selectedBot
    ? conversations[selectedBot.id]
    : undefined;
  const selectedMenuItem = getMenuItem(bots, selectedMenuBotId);
  const selectedWorkspacePanel = selectedBot
    ? getBotWorkspacePanel(selectedBot.id)
    : null;
  const isCursiveWorkspace = selectedBot?.id === "document_wizard";
  const workspaceFocusLabel = isCursiveWorkspace
    ? "Category-First Intake"
    : (selectedWorkspacePanel?.focusLabel ?? "Function");
  const workspaceMission = isCursiveWorkspace
    ? "Open with a category, complete the official intake, and use helper chat only as support."
    : (selectedWorkspacePanel?.mission ?? selectedMenuItem?.description ?? "");
  const workspaceWorkflowTitle = isCursiveWorkspace
    ? "Inside Phase C1:"
    : selectedWorkspacePanel?.workflowTitle;
  const workspaceWorkflowSteps = isCursiveWorkspace
    ? [
        "choose a Cursive category first",
        "complete the required official intake fields",
        "generate the preview from official intake",
        "refresh the preview after edits before relying on document outputs",
      ]
    : (selectedWorkspacePanel?.workflowSteps ?? []);
  const workspaceSupportTitle = isCursiveWorkspace
    ? "Intake guardrails"
    : selectedWorkspacePanel?.supportTitle;
  const workspaceSupportItems = isCursiveWorkspace
    ? [
        "official intake remains the source of truth",
        "preview stays locked until required fields are complete",
        "a stale preview stays visible, but it no longer reflects the latest intake",
        "refresh the preview after edits before relying on document outputs",
      ]
    : (selectedWorkspacePanel?.supportItems ?? []);

  useEffect(() => {
    if (!activeSessionId || !sessionToken) {
      setConversations({});
      setBots([]);
      setSelectedMenuBotId(null);
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
    setCursiveWorkspace(EMPTY_CURSIVE_WORKSPACE_STATE);
    setSelectedMenuBotId(null);
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

  const selectedBotIsLive = Boolean(selectedBot && selectedMenuBotId);

  useEffect(() => {
    if (!activeSessionId || !sessionToken) {
      return;
    }

    const currentSessionId = activeSessionId;
    let cancelled = false;

    async function refreshArtifacts() {
      try {
        const response = await fetch(
          `/api/reports/artifacts?sessionId=${encodeURIComponent(currentSessionId)}`,
          {
            headers: {
              authorization: `Bearer ${sessionToken}`,
            },
          },
        );
        const payload = (await response.json()) as {
          artifacts?: Array<{
            artifactType: "pdf";
            botId: string;
            createdAt: string;
            downloadUrl: string | null;
            failureReason: string | null;
            fileName: string;
            generatedAt: string;
            id: string;
            originalFilename: string;
            status: "queued" | "ready" | "failed";
          }>;
        };

        if (!response.ok || !payload.artifacts || cancelled) {
          if (!cancelled) {
            setArtifactError("Unable to refresh artifact status.");
          }
          return;
        }

        setArtifactError(null);
        setArtifacts(
          payload.artifacts.map((artifact) => ({
            artifactType: artifact.artifactType,
            botName:
              bots.find((bot) => bot.id === artifact.botId)?.name ?? artifact.botId,
            createdAt: artifact.createdAt,
            downloadUrl: artifact.downloadUrl,
            failureReason: artifact.failureReason,
            fileName: artifact.fileName,
            generatedAt: artifact.generatedAt,
            id: artifact.id,
            originalFilename: artifact.originalFilename,
            status: artifact.status,
          })),
        );
      } catch {
        if (cancelled) {
          return;
        }

        setArtifactError("Unable to refresh artifact status.");
      }
    }

    void refreshArtifacts();
    const intervalId = window.setInterval(() => {
      void refreshArtifacts();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeSessionId, bots, sessionToken]);

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

  function handleMenuSelection(menuBotId: PlaygroundMenuBotId) {
    setSelectedMenuBotId(menuBotId);
    setBotError(null);
  }

  function handleBackToMenu() {
    setSelectedMenuBotId(null);
  }

  function handleCursiveCategoryChange(category: CursiveCategorySlug) {
    setCursiveWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      generationState: getCoherentCursiveGenerationState(
        category,
        currentWorkspace.intake,
      ),
      intakeStarted:
        category === currentWorkspace.selectedCategory
          ? currentWorkspace.intakeStarted
          : false,
      previewError: null,
      previewHtml:
        category === currentWorkspace.selectedCategory
          ? currentWorkspace.previewHtml
          : null,
      previewIsStale:
        category === currentWorkspace.selectedCategory
          ? currentWorkspace.previewIsStale
          : false,
      previewStatus:
        category === currentWorkspace.selectedCategory
          ? currentWorkspace.previewStatus
          : "idle",
      previewPortalText:
        category === currentWorkspace.selectedCategory
          ? currentWorkspace.previewPortalText
          : null,
      previewSnapshot:
        category === currentWorkspace.selectedCategory
          ? currentWorkspace.previewSnapshot
          : null,
      previewToken:
        category === currentWorkspace.selectedCategory
          ? currentWorkspace.previewToken
          : null,
      selectedCategory: category,
    }));
  }

  function handleCursiveIntakeStart() {
    setCursiveWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      intakeStarted: true,
    }));
  }

  function handleCursiveIntakeChange(
    field: keyof CursiveCreditDisputeIntake,
    value: string,
  ) {
    setCursiveWorkspace((currentWorkspace) => {
      const nextIntake = {
        ...currentWorkspace.intake,
        [field]: value,
      };

      return {
        ...currentWorkspace,
        generationState: getCoherentCursiveGenerationState(
          currentWorkspace.selectedCategory,
          nextIntake,
        ),
        previewError: null,
        intake: nextIntake,
        previewIsStale:
          currentWorkspace.previewHtml !== null ||
          currentWorkspace.previewPortalText !== null,
      };
    });
  }

  async function handleCursiveGenerate() {
    if (
      !sessionToken ||
      !selectedBot ||
      !session ||
      !isCursiveOfficialCategory(cursiveWorkspace.selectedCategory) ||
      !isCursiveCreditDisputeIntakeComplete(cursiveWorkspace.intake)
    ) {
      return;
    }

    setCursiveWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      previewError: null,
      previewStatus: "loading",
    }));

    try {
      const response = await fetch(
        "/api/reports/cursive/credit-bureau-dispute/preview",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${sessionToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            sessionId: session.id,
            botId: selectedBot.id,
            intake: cursiveWorkspace.intake,
          }),
        },
      );
      const payload = (await response.json()) as {
          html?: string;
          message?: string;
          portalText?: string;
          previewSnapshot?: CursivePreviewSnapshot;
          previewToken?: string;
        };

      if (
        !response.ok ||
        !payload.html ||
        !payload.previewSnapshot ||
        !payload.previewToken
      ) {
        setCursiveWorkspace((currentWorkspace) => ({
          ...currentWorkspace,
          previewError: payload.message ?? "Unable to generate the Cursive preview right now.",
          previewStatus: "idle",
        }));
        return;
      }

      setCursiveWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        generationState: getCoherentCursiveGenerationState(
          currentWorkspace.selectedCategory,
          currentWorkspace.intake,
        ),
        previewError: null,
        previewHtml: payload.html ?? null,
        previewIsStale: false,
        previewPortalText: payload.portalText ?? null,
        previewSnapshot: payload.previewSnapshot ?? null,
        previewStatus: "ready",
        previewToken: payload.previewToken ?? null,
      }));
    } catch {
      setCursiveWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        previewError: "Unable to generate the Cursive preview right now.",
        previewStatus: "idle",
      }));
    }
  }

  return (
    <main className="app-shell app-shell--dashboard">
      <header className="dashboard-topbar panel">
        <div>
          <p className="eyebrow">PBG Playground</p>
          <h1>{preferredName}, your dashboard is ready</h1>
        </div>
      </header>
      {reviewPrompt ? <SessionEndModal prompt={reviewPrompt} /> : null}
      {isSessionActive && sessionToken && !reviewPrompt ? (
        <>
          <section className="session-banner panel">
            <div>
              <p className="eyebrow">Session Live</p>
              <p className="session-status">
                {selectedMenuItem ? `${selectedMenuItem.displayName} workspace live` : "Provider connected"}
              </p>
            </div>
            <div className="timer-readout">
              <span className="timer-label">Time remaining</span>
              <span className="timer-value">{formatRemaining(remainingSeconds)}</span>
            </div>
            <div className="session-banner-actions">
              {selectedMenuItem ? (
                <button className="secondary-button" onClick={handleBackToMenu} type="button">
                  Back to Menu
                </button>
              ) : null}
              <button className="secondary-button" onClick={handleEndPlayground} type="button">
                End playground
              </button>
            </div>
          </section>
          {botError ? <p role="alert" className="alert-banner">{botError}</p> : null}
          {artifactError ? <p role="alert" className="alert-banner">{artifactError}</p> : null}
          {selectedMenuItem ? (
            selectedBotIsLive ? (
              <section className="workspace-shell workspace-shell--active">
                <img
                  alt="Bot workspace frame"
                  className="workspace-shell-image"
                  src="/images/bot-dashboard.png"
                />
                <div className="workspace-shell-overlay workspace-shell-overlay--sidebar-top workspace-shell-overlay--sidebar-top-enter">
                  <div className="workspace-side-card">
                    <p className="eyebrow">{workspaceFocusLabel}</p>
                    <h3>{selectedMenuItem.displayName}</h3>
                    <p className="muted-copy">{workspaceMission}</p>
                    {workspaceWorkflowTitle ? (
                      <div className="workspace-guidance">
                        <p className="workspace-guidance__title">{workspaceWorkflowTitle}</p>
                        <ul className="workspace-guidance__list">
                          {workspaceWorkflowSteps.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="workspace-shell-overlay workspace-shell-overlay--sidebar-bottom workspace-shell-overlay--sidebar-bottom-enter">
                  {isCursiveWorkspace ? (
                    <div className="workspace-side-card">
                      <p className="eyebrow">Workflow Support</p>
                      <h3>{workspaceSupportTitle}</h3>
                      <ul className="support-panel-list">
                        {workspaceSupportItems.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                      {artifacts.filter(
                        (artifact) => artifact.botName === selectedMenuItem.displayName,
                      ).length ? (
                        <ul className="artifact-list">
                          {artifacts
                            .filter(
                              (artifact) => artifact.botName === selectedMenuItem.displayName,
                            )
                            .map((artifact) => (
                              <li className="artifact-card" key={artifact.id}>
                                <p className="artifact-title">{artifact.fileName}</p>
                                <p className="artifact-meta">
                                  {artifact.botName} - {artifact.status}
                                </p>
                                <p className="artifact-source">
                                  Source: {artifact.originalFilename}
                                </p>
                                {artifact.failureReason ? (
                                  <p className="alert-banner">{artifact.failureReason}</p>
                                ) : null}
                                {artifact.downloadUrl ? (
                                  <p className="artifact-actions">
                                    <a className="secondary-button" href={artifact.downloadUrl}>
                                      Download PDF
                                    </a>
                                  </p>
                                ) : null}
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <p className="muted-copy">No saved outputs in this workspace yet.</p>
                      )}
                    </div>
                  ) : selectedMenuBotId ? (
                    <BotSupportPanel
                      artifacts={artifacts.filter(
                        (artifact) => artifact.botName === selectedMenuItem.displayName,
                      )}
                      botId={selectedMenuBotId}
                    />
                  ) : null}
                </div>
                <div className="workspace-shell-overlay workspace-shell-overlay--chat workspace-shell-overlay--chat-enter">
                  <ChatPanel
                    key={selectedBot?.id ?? "no-bot-selected"}
                    bot={selectedBot}
                    conversationId={selectedConversation?.conversationId}
                    cursiveIntake={cursiveWorkspace.intake}
                    cursiveIntakeStarted={cursiveWorkspace.intakeStarted}
                    cursivePreviewError={cursiveWorkspace.previewError}
                    cursivePreviewHtml={cursiveWorkspace.previewHtml}
                    cursivePreviewIsStale={cursiveWorkspace.previewIsStale}
                    cursivePreviewPortalText={cursiveWorkspace.previewPortalText}
                    cursivePreviewSnapshot={cursiveWorkspace.previewSnapshot}
                    cursivePreviewToken={cursiveWorkspace.previewToken}
                    isGeneratingCursivePreview={
                      cursiveWorkspace.previewStatus === "loading"
                    }
                    messages={selectedConversation?.messages ?? []}
                    onCursiveCategoryChange={handleCursiveCategoryChange}
                    onCursiveGenerate={handleCursiveGenerate}
                    onCursiveIntakeChange={handleCursiveIntakeChange}
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
                    onStartCursiveIntake={handleCursiveIntakeStart}
                    selectedCursiveCategory={cursiveWorkspace.selectedCategory}
                    sessionId={session.id}
                    sessionToken={sessionToken}
                  />
                </div>
              </section>
            ) : (
              <section className="panel status-panel">
                <p className="eyebrow">Pending Runtime</p>
                <h2>{selectedMenuItem.displayName}</h2>
                <p className="muted-copy">
                  This menu lane is approved, but its backend runtime is the next
                  step to activate.
                </p>
              </section>
            )
          ) : (
            <div className="main-menu-enter">
              <MainMenu
                bots={bots}
                onSelect={handleMenuSelection}
                preferredName={preferredName}
              />
            </div>
          )}
        </>
      ) : reviewPrompt ? (
        <section className="panel status-panel">
          <p className="eyebrow">Review Ready</p>
          <p>Review ready.</p>
        </section>
      ) : (
        <section className="dashboard-grid dashboard-grid--locked">
          <div className="panel locked-panel">
            <p className="eyebrow">Step 2</p>
            <h2>Connect your provider to continue</h2>
            <p className="panel-description">Bot access stays locked until provider validation succeeds.</p>
          {session?.state === "expired" ? (
            <p className="alert-banner">Your provider session expired. Connect again to continue.</p>
          ) : null}
          {requiresRelaunch ? (
            <p className="alert-banner">
              Relaunch the Playground from Telegram to get a fresh secure
              launch before reconnecting your provider.
            </p>
          ) : null}
          {sessionError ? <p role="alert" className="alert-banner">{sessionError}</p> : null}
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
          </div>
          <div className="panel guidance-panel">
            <p className="eyebrow">How It Works</p>
            <h2>What the user sees in this playground</h2>
            <ul className="guidance-list">
              <li>Choose a bot with a distinct role and fixed capability lane.</li>
              <li>Chat naturally while the system hides tools and workflow internals.</li>
              <li>Upload PDFs or fill structured forms when the selected bot allows it.</li>
              <li>Leave with a polished output and a clear review path.</li>
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}
