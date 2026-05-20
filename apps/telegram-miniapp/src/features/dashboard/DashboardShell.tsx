import { useEffect, useMemo, useRef, useState } from "react";
import type { BotCatalogEntry } from "../../../../../packages/shared/src/bots/manifests";
import {
  type ArtifactListItem,
} from "../artifacts/ArtifactList";
import { ChatPanel, type ChatMessage } from "../chat/ChatPanel";
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
import {
  type CursiveMode,
  type CursiveEvidencePosture,
  type CursiveViolationType,
} from "../../../../../packages/shared/src/contracts/cursive";
import {
  CursiveWorkspace,
  type CursiveWorkspaceStep,
} from "../cursive/CursiveWorkspace";

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

type CursiveStep = "mode" | "evidence" | "violation";

export type CursiveWorkflowState = {
  currentStep: CursiveStep;
  evidencePosture: CursiveEvidencePosture | null;
  mode: CursiveMode | null;
  violationType: CursiveViolationType | null;
};

const EMPTY_CURSIVE_WORKFLOW_STATE: CursiveWorkflowState = {
  currentStep: "mode",
  evidencePosture: null,
  mode: null,
  violationType: null,
};

const CURSIVE_WORKSPACE_STEPS: CursiveWorkspaceStep[] = [
  { id: "mode", label: "Mode" },
  { id: "evidence", label: "Evidence" },
  { id: "violation", label: "Violation" },
];

const CROSS_BUREAU_VIOLATIONS: Array<{
  id: CursiveViolationType;
  label: string;
}> = [
  {
    id: "different_balances_across_bureaus",
    label: "Different balances across bureaus",
  },
  {
    id: "different_delinquency_dates_across_bureaus",
    label: "Different delinquency dates across bureaus",
  },
  {
    id: "incorrect_account_number_across_bureaus",
    label: "Incorrect account number across bureaus",
  },
  {
    id: "incorrect_creditor_name_across_bureaus",
    label: "Incorrect creditor or furnisher name across bureaus",
  },
  {
    id: "incorrect_payment_status_across_bureaus",
    label: "Incorrect payment status across bureaus",
  },
  {
    id: "open_closed_status_conflict_across_bureaus",
    label: "Open/closed status conflict across bureaus",
  },
];

const SINGLE_BUREAU_VIOLATIONS: Array<{
  id: CursiveViolationType;
  label: string;
}> = [
  {
    id: "incorrect_account_number",
    label: "Incorrect account number",
  },
  {
    id: "incorrect_creditor_name",
    label: "Incorrect creditor or furnisher name",
  },
  {
    id: "duplicate_creditor_or_collector_reporting",
    label: "Duplicate creditor or collector reporting",
  },
  {
    id: "incorrect_payment_status",
    label: "Incorrect payment status",
  },
  {
    id: "closed_account_reported_as_open",
    label: "Closed account reported as open",
  },
  {
    id: "account_not_mine",
    label: "Account not mine",
  },
];

export function getNextCursiveStepState(
  choice: CursiveMode | CursiveEvidencePosture | CursiveViolationType,
  state: CursiveWorkflowState,
): CursiveWorkflowState {
  if (choice === "manual_dispute" || choice === "analyze_uploaded_report") {
    return {
      currentStep: "evidence",
      evidencePosture: null,
      mode: choice,
      violationType: null,
    };
  }

  if (
    choice === "cross_bureau_inconsistency" ||
    choice === "single_bureau_inaccuracy_with_proof"
  ) {
    return {
      ...state,
      currentStep: "violation",
      evidencePosture: choice,
      violationType: null,
    };
  }

  return {
    ...state,
    currentStep: "violation",
    violationType: choice,
  };
}

type CursiveWorkspaceShellProps = {
  countdownValue: string;
  onBackToMenu: () => void;
  onBackStep: () => void;
  onChoiceSelect: (
    choice: CursiveMode | CursiveEvidencePosture | CursiveViolationType,
  ) => void;
  state: CursiveWorkflowState;
};

function getCursiveModeLabel(mode: CursiveMode | null) {
  if (mode === "manual_dispute") {
    return "Manual dispute";
  }

  if (mode === "analyze_uploaded_report") {
    return "Analyze uploaded report";
  }

  return "Choose how to begin";
}

function getCursiveActiveStepContent({
  state,
  onChoiceSelect,
}: Pick<CursiveWorkspaceShellProps, "state" | "onChoiceSelect">) {
  if (state.currentStep === "mode") {
    return (
      <section className="cursive-card">
        <div className="cursive-card__header">
          <div>
            <p className="eyebrow">Step 1</p>
            <h3>Choose how to begin</h3>
          </div>
          <p className="panel-description">
            Start from your own facts or move into uploaded-report analysis next.
          </p>
        </div>
        <div className="cursive-generation-lane">
          <button
            className="primary-button"
            onClick={() => onChoiceSelect("manual_dispute")}
            type="button"
          >
            Manual dispute
          </button>
          <button className="secondary-button" disabled type="button">
            Analyze uploaded report
          </button>
        </div>
        <p className="muted-copy">
          Uploaded-report analysis is the next Cursive lane. This phase is landing the
          manual dispute flow first.
        </p>
      </section>
    );
  }

  if (state.currentStep === "evidence") {
    return (
      <section className="cursive-card">
        <div className="cursive-card__header">
          <div>
            <p className="eyebrow">Step 2</p>
            <h3>How are you documenting this issue?</h3>
          </div>
          <p className="panel-description">
            Pick the evidence posture that matches the dispute you want to build.
          </p>
        </div>
        <div className="cursive-generation-lane">
          <button
            className="primary-button"
            onClick={() => onChoiceSelect("cross_bureau_inconsistency")}
            type="button"
          >
            Inconsistent reporting across bureaus
          </button>
          <button
            className="secondary-button"
            onClick={() =>
              onChoiceSelect("single_bureau_inaccuracy_with_proof")
            }
            type="button"
          >
            One bureau is reporting the item inaccurately and I have proof
          </button>
        </div>
      </section>
    );
  }

  const violationChoices =
    state.evidencePosture === "cross_bureau_inconsistency"
      ? CROSS_BUREAU_VIOLATIONS
      : SINGLE_BUREAU_VIOLATIONS;

  return (
    <section className="cursive-card">
      <div className="cursive-card__header">
        <div>
          <p className="eyebrow">Step 3</p>
          <h3>
            {state.evidencePosture === "cross_bureau_inconsistency"
              ? "Choose the inconsistency type"
              : "Choose the reporting problem"}
          </h3>
        </div>
        <p className="panel-description">
          Keep the intake tight by selecting the exact violation lane before deeper
          details open.
        </p>
      </div>
      <div className="cursive-generation-lane">
        {violationChoices.map((violation) => (
          <button
            className={
              state.violationType === violation.id
                ? "primary-button"
                : "secondary-button"
            }
            key={violation.id}
            onClick={() => onChoiceSelect(violation.id)}
            type="button"
          >
            {violation.label}
          </button>
        ))}
      </div>
      {state.violationType ? (
        <p className="success-banner">
          Violation selected. Details, review, and results steps land in the next Cursive
          phase.
        </p>
      ) : null}
    </section>
  );
}

export function CursiveWorkspaceShell({
  countdownValue,
  onBackStep,
  onBackToMenu,
  onChoiceSelect,
  state,
}: CursiveWorkspaceShellProps) {
  const nextLabel =
    state.currentStep === "violation" ? "Details next" : "Next step";
  const footerSlot =
    state.currentStep === "violation" && state.violationType ? (
      <span className="muted-copy">Details, review, and results are next.</span>
    ) : null;

  return (
    <CursiveWorkspace
      activeStepId={state.currentStep}
      countdownLabel="Playground time remaining"
      countdownValue={countdownValue}
      footerSlot={footerSlot}
      isBackDisabled={false}
      isNextDisabled={true}
      laneLabel={getCursiveModeLabel(state.mode)}
      nextLabel={nextLabel}
      onBack={onBackStep}
      onTitleBack={onBackToMenu}
      steps={CURSIVE_WORKSPACE_STEPS}
      title="Cursive"
    >
      {getCursiveActiveStepContent({
        state,
        onChoiceSelect,
      })}
    </CursiveWorkspace>
  );
}

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
  const [cursiveWorkflow, setCursiveWorkflow] = useState<CursiveWorkflowState>(
    EMPTY_CURSIVE_WORKFLOW_STATE,
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
    setCursiveWorkflow(EMPTY_CURSIVE_WORKFLOW_STATE);
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
    setCursiveWorkflow(EMPTY_CURSIVE_WORKFLOW_STATE);
    setSelectedMenuBotId(null);
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
              isCursiveWorkspace ? (
                <CursiveWorkspaceShell
                  countdownValue={formatRemaining(remainingSeconds)}
                  onBackStep={() => {
                    setCursiveWorkflow((currentState) => {
                      if (currentState.currentStep === "violation") {
                        return {
                          ...currentState,
                          currentStep: "evidence",
                          violationType: null,
                        };
                      }

                      if (currentState.currentStep === "evidence") {
                        return {
                          currentStep: "mode",
                          evidencePosture: null,
                          mode: currentState.mode,
                          violationType: null,
                        };
                      }

                      handleBackToMenu();
                      return currentState;
                    });
                  }}
                  onBackToMenu={handleBackToMenu}
                  onChoiceSelect={(choice) => {
                    setCursiveWorkflow((currentState) =>
                      getNextCursiveStepState(choice, currentState),
                    );
                  }}
                  state={cursiveWorkflow}
                />
              ) : (
              <section className="workspace-shell workspace-shell--active">
                <img
                  alt="Bot workspace frame"
                  className="workspace-shell-image"
                  src="/images/bot-dashboard.png"
                />
                <div className="workspace-shell-overlay workspace-shell-overlay--sidebar-top workspace-shell-overlay--sidebar-top-enter">
                  <div className="workspace-side-card">
                    <p className="eyebrow">
                      {selectedWorkspacePanel?.focusLabel ?? "Function"}
                    </p>
                    <h3>{selectedMenuItem.displayName}</h3>
                    <p className="muted-copy">
                      {selectedWorkspacePanel?.mission ?? selectedMenuItem.description}
                    </p>
                    {selectedWorkspacePanel?.workflowTitle ? (
                      <div className="workspace-guidance">
                        <p className="workspace-guidance__title">
                          {selectedWorkspacePanel.workflowTitle}
                        </p>
                        <ul className="workspace-guidance__list">
                          {(selectedWorkspacePanel?.workflowSteps ?? []).map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="workspace-shell-overlay workspace-shell-overlay--sidebar-bottom workspace-shell-overlay--sidebar-bottom-enter">
                  {selectedMenuBotId ? (
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
                </div>
              </section>
              )
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
