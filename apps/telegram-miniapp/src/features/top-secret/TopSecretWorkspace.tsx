import { useMemo } from "react";
import type { ArtifactListItem } from "../artifacts/ArtifactList";
import { normalizeTopSecretClaimBatch } from "../../../../../packages/shared/src/top-secret/claims";
import {
  CursiveWorkspace,
  type CursiveWorkspaceStep,
} from "../cursive/CursiveWorkspace";
import { BotSupportPanel } from "../dashboard/BotSupportPanel";

export type TopSecretFinding = {
  claim: string;
  analysis: string;
  conclusion: string;
  verdict: string;
};

export type TopSecretWorkflowState = {
  claimsText: string;
  currentStep: "input" | "review" | "results";
  error: string | null;
  findings: TopSecretFinding[];
  isGenerating: boolean;
};

const TOP_SECRET_PROVIDER_FALLBACK_PREFIX =
  "The provider response did not keep";

type TopSecretWorkspaceProps = {
  artifacts: ArtifactListItem[];
  onBack: () => void;
  onBackToMenu: () => void;
  onClaimsTextChange: (claimsText: string) => void;
  onGenerate: () => void;
  onNext: () => void;
  state: TopSecretWorkflowState;
};

const TOP_SECRET_STEPS: CursiveWorkspaceStep[] = [
  { id: "input", label: "Paste" },
  { id: "review", label: "Look over" },
  { id: "results", label: "Report" },
];

export const EMPTY_TOP_SECRET_WORKFLOW_STATE: TopSecretWorkflowState = {
  claimsText: "",
  currentStep: "input",
  error: null,
  findings: [],
  isGenerating: false,
};

export function parseTopSecretClaimsText(claimsText: string) {
  const claimInputs = claimsText
    .split(/\n{2,}|\r?\n\s*(?=\d+[.)]\s+|-\s+)/u)
    .map((claim) => claim.replace(/^\s*(?:\d+[.)]|-)\s*/u, "").trim())
    .filter(Boolean);

  return normalizeTopSecretClaimBatch(claimInputs);
}

export function appendTopSecretMessageSlot(claimsText: string) {
  const claims = parseTopSecretClaimsText(claimsText);

  if (claims.length >= 5) {
    return claimsText;
  }

  const nextNumber = claims.length + 1;
  const trimmedText = claimsText.trimEnd();

  return trimmedText ? `${trimmedText}\n\n${nextNumber}. ` : "1. ";
}

export function getTopSecretInputError(claimsText: string) {
  const claims = parseTopSecretClaimsText(claimsText);

  if (claims.length === 0) {
    return "Paste at least one statement or how-to you want checked.";
  }

  if (claims.length > 5) {
    return "Keep this batch to 5 items or fewer.";
  }

  if (claims.some((claim) => claim.endsWith("?"))) {
    return "Send statements or how-to claims here, not questions.";
  }

  return null;
}

export function getSteppedTopSecretState(
  state: TopSecretWorkflowState,
  direction: "back" | "next",
): TopSecretWorkflowState {
  const steps: TopSecretWorkflowState["currentStep"][] = [
    "input",
    "review",
    "results",
  ];
  const currentIndex = steps.indexOf(state.currentStep);
  const nextIndex =
    direction === "next"
      ? Math.min(steps.length - 1, currentIndex + 1)
      : Math.max(0, currentIndex - 1);

  if (direction === "next") {
    const error = getTopSecretInputError(state.claimsText);

    if (state.currentStep === "input" && error) {
      return {
        ...state,
        error,
      };
    }
  }

  return {
    ...state,
    currentStep: steps[nextIndex],
    error: null,
  };
}

function formatVerdict(verdict: string) {
  return verdict
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function isProviderFallbackFinding(finding: TopSecretFinding) {
  return finding.analysis.startsWith(TOP_SECRET_PROVIDER_FALLBACK_PREFIX);
}

function TopSecretStepContent({
  onClaimsTextChange,
  state,
}: Pick<TopSecretWorkspaceProps, "onClaimsTextChange" | "state">) {
  const claims = useMemo(
    () => parseTopSecretClaimsText(state.claimsText),
    [state.claimsText],
  );

  if (state.currentStep === "input") {
    return (
      <section className="cursive-card top-secret-card">
        <div className="cursive-card__header">
          <div>
            <p className="eyebrow">Step 1</p>
            <h3>Paste what you found</h3>
          </div>
          <p className="panel-description">
            Drop in 1 to 5 statements or how-to posts. We will check the facts,
            not the person who shared them.
          </p>
        </div>
        <label className="top-secret-claim-input">
          What should we check?
          <textarea
            onChange={(event) => onClaimsTextChange(event.currentTarget.value)}
            placeholder={"Paste a statement here.\n\nAdd another one below it if you want us to check more."}
            value={state.claimsText}
          />
        </label>
        <p className="muted-copy">
          {claims.length} of 5 messages ready to check.
        </p>
        {state.error ? <p className="alert-banner">{state.error}</p> : null}
      </section>
    );
  }

  if (state.currentStep === "review") {
    return (
      <section className="cursive-card top-secret-card">
        <div className="cursive-card__header">
          <div>
            <p className="eyebrow">Step 2</p>
            <h3>Make sure this looks right</h3>
          </div>
          <p className="panel-description">
            We will make one report and keep the answer tied to reliable sources.
          </p>
        </div>
        <ol className="top-secret-review-list">
          {claims.map((claim, index) => (
            <li key={claim}>
              <span className="top-secret-message-label">
                Message {index + 1}
              </span>
              <p>{claim}</p>
            </li>
          ))}
        </ol>
        {state.error ? <p className="alert-banner">{state.error}</p> : null}
      </section>
    );
  }

  return (
    <section className="cursive-card top-secret-card">
      <div className="cursive-card__header">
        <div>
          <p className="eyebrow">Step 3</p>
          <h3>Your report is on the way</h3>
        </div>
        <p className="panel-description">
          We are putting everything into one PDF for you.
        </p>
      </div>
      {state.findings.length &&
      !state.findings.every(isProviderFallbackFinding) ? (
        <div className="top-secret-findings">
          {state.findings.map((finding, index) => (
            <article className="top-secret-finding-card" key={finding.claim}>
              <p className="top-secret-message-label">Message {index + 1}</p>
              <h4>{finding.claim}</h4>
              <p>{finding.analysis}</p>
              <p>
                <em>{finding.conclusion}</em>
              </p>
              <p className="muted-copy">Verdict: {formatVerdict(finding.verdict)}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="success-banner">
          Your report is being created. It will show up in the Report section
          shortly.
        </p>
      )}
    </section>
  );
}

export function TopSecretWorkspace({
  artifacts,
  onBack,
  onBackToMenu,
  onClaimsTextChange,
  onGenerate,
  onNext,
  state,
}: TopSecretWorkspaceProps) {
  const parsedClaims = parseTopSecretClaimsText(state.claimsText);
  const canUseNext =
    state.currentStep === "results" ||
    (state.currentStep === "input" && !getTopSecretInputError(state.claimsText)) ||
    (state.currentStep === "review" && !state.isGenerating);

  return (
    <div className="cursive-shell top-secret-shell">
      <CursiveWorkspace
        activeStepId={state.currentStep}
        footerSlot={
          state.currentStep === "input" ? (
            <button
              className="secondary-button top-secret-add-message-button"
              disabled={parsedClaims.length >= 5}
              onClick={() =>
                onClaimsTextChange(appendTopSecretMessageSlot(state.claimsText))
              }
              type="button"
            >
              Add another message
            </button>
          ) : null
        }
        isBackDisabled={state.isGenerating}
        isNextDisabled={!canUseNext}
        laneLabel="Top Secret"
        nextLabel={
          state.currentStep === "review"
            ? state.isGenerating
              ? "Researching"
              : "Create report"
            : state.currentStep === "results"
              ? "Back to menu"
              : "Review messages"
        }
        onBack={state.currentStep === "input" ? onBackToMenu : onBack}
        onNext={
          state.currentStep === "review"
            ? onGenerate
            : state.currentStep === "results"
              ? onBackToMenu
              : onNext
        }
        steps={TOP_SECRET_STEPS}
      >
        <TopSecretStepContent
          onClaimsTextChange={onClaimsTextChange}
          state={state}
        />
      </CursiveWorkspace>
      <BotSupportPanel artifacts={artifacts} botId="verifier" />
    </div>
  );
}
