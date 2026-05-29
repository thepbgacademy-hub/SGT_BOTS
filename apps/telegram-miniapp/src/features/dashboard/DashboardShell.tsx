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
import { openTelegramReviewLink } from "../../lib/telegram";
import { getBotWorkspacePanel } from "./bot-workspace-panels";
import {
  getMenuItem,
  type PlaygroundMenuBotId,
} from "./menu-config";
import {
  type CursiveMode,
  type CursiveEvidencePosture,
  type CursiveReportType,
  type CursiveViolationType,
} from "../../../../../packages/shared/src/contracts/cursive";
import {
  CursiveWorkspace,
  type CursiveWorkspaceStep,
} from "../cursive/CursiveWorkspace";
import {
  EMPTY_TOP_SECRET_WORKFLOW_STATE,
  TopSecretWorkspace,
  getSteppedTopSecretState,
  parseTopSecretClaimsText,
  type TopSecretFinding,
  type TopSecretWorkflowState,
} from "../top-secret/TopSecretWorkspace";
import { RoriWorkspace } from "../rori/RoriWorkspace";

type SessionSnapshot = {
  id: string;
  provider: "openai" | "anthropic" | "openai_codex";
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

const DEFAULT_REVIEW_GROUP_URL = "https://t.me/+1wagxfyhnAcwMDJh";

type CursiveStep =
  | "mode"
  | "evidence"
  | "violation"
  | "details"
  | "reportType"
  | "upload"
  | "issues"
  | "review"
  | "results";

export type CursiveDetailsState = {
  bureauName: string;
  conflictSummary: string;
  consumerAddress: string;
  consumerName: string;
  evidenceSummary: string;
  furnisherName: string;
  maskedAccountIdentifier: string;
  proofSummary: string;
  reportedFactLabel: string;
  reportedInaccurateInformation: string;
  targetBureauReportedValue: string;
};

export type CursiveWorkflowState = {
  confirmedUploadIssueIds: string[];
  currentStep: CursiveStep;
  details: CursiveDetailsState;
  evidencePosture: CursiveEvidencePosture | null;
  isGenerating: boolean;
  isUploading: boolean;
  mode: CursiveMode | null;
  previewError: string | null;
  previewHtml: string | null;
  previewToken: string | null;
  reportType: CursiveReportType | null;
  uploadConsumer: {
    fullName: string;
    mailingAddressLines: string[];
  } | null;
  uploadError: string | null;
  uploadFile: File | null;
  uploadIssues: CursiveUploadIssue[];
  uploadId: string | null;
  violationType: CursiveViolationType | null;
};

const EMPTY_CURSIVE_DETAILS_STATE: CursiveDetailsState = {
  bureauName: "",
  conflictSummary: "",
  consumerAddress: "",
  consumerName: "",
  evidenceSummary: "",
  furnisherName: "",
  maskedAccountIdentifier: "",
  proofSummary: "",
  reportedFactLabel: "",
  reportedInaccurateInformation: "",
  targetBureauReportedValue: "",
};

const EMPTY_CURSIVE_WORKFLOW_STATE: CursiveWorkflowState = {
  confirmedUploadIssueIds: [],
  currentStep: "mode",
  details: EMPTY_CURSIVE_DETAILS_STATE,
  evidencePosture: null,
  isGenerating: false,
  isUploading: false,
  mode: null,
  previewError: null,
  previewHtml: null,
  previewToken: null,
  reportType: null,
  uploadConsumer: null,
  uploadError: null,
  uploadFile: null,
  uploadId: null,
  uploadIssues: [],
  violationType: null,
};

const MANUAL_CURSIVE_WORKSPACE_STEPS: CursiveWorkspaceStep[] = [
  { id: "mode", label: "Mode" },
  { id: "evidence", label: "Evidence" },
  { id: "violation", label: "Violation" },
  { id: "details", label: "Details" },
  { id: "review", label: "Review" },
  { id: "results", label: "Results" },
];

const UPLOAD_CURSIVE_WORKSPACE_STEPS: CursiveWorkspaceStep[] = [
  { id: "mode", label: "Mode" },
  { id: "reportType", label: "Report Type" },
  { id: "upload", label: "Upload" },
  { id: "issues", label: "Issues" },
  { id: "review", label: "Review" },
  { id: "results", label: "Results" },
];

type CursiveUploadIssue = {
  id: string;
  reportType: CursiveReportType;
  targetBureau: string;
  violationLabel: string;
  violationType: CursiveViolationType;
  tradeline: {
    furnisherName: string;
    maskedAccountIdentifier?: string;
  };
  reportedFacts: {
    targetBureauFactLabel: string;
    targetBureauReportedValue: string;
  };
  conflictFacts?: {
    conflictSummary: string;
  };
  proofFacts?: {
    reportedInaccurateInformation: string;
    proofSummary: string;
  };
  evidenceSummary: string;
};

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
      ...EMPTY_CURSIVE_WORKFLOW_STATE,
      currentStep: choice === "manual_dispute" ? "evidence" : "reportType",
      details: state.details,
      mode: choice,
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
      isGenerating: false,
      previewError: null,
      previewHtml: null,
      previewToken: null,
      violationType: null,
    };
  }

  return {
    ...state,
    currentStep: "violation",
    isGenerating: false,
    previewError: null,
    previewHtml: null,
    previewToken: null,
    violationType: choice,
  };
}

function getViolationLabel(violationType: CursiveViolationType | null) {
  return [...CROSS_BUREAU_VIOLATIONS, ...SINGLE_BUREAU_VIOLATIONS].find(
    (violation) => violation.id === violationType,
  )?.label ?? "Selected reporting issue";
}

function getBureauAddressLines(bureauName: string) {
  const normalizedName = bureauName.trim().toLowerCase();

  if (normalizedName === "experian") {
    return ["P.O. Box 4500", "Allen, TX 75013"];
  }

  if (normalizedName === "equifax") {
    return ["Information Services LLC", "P.O. Box 740256", "Atlanta, GA 30374"];
  }

  if (normalizedName === "transunion") {
    return ["Consumer Solutions", "P.O. Box 2000", "Chester, PA 19016-2000"];
  }

  return ["Consumer Dispute Department"];
}

export function getSteppedCursiveState(
  state: CursiveWorkflowState,
  direction: "back" | "next",
): CursiveWorkflowState {
  const steps: CursiveStep[] = [
    ...(state.mode === "analyze_uploaded_report"
      ? (["mode", "reportType", "upload", "issues", "review", "results"] as const)
      : (["mode", "evidence", "violation", "details", "review", "results"] as const)),
  ];
  const currentIndex = steps.indexOf(state.currentStep);
  if (currentIndex === -1) {
    return state;
  }
  const nextIndex =
    direction === "next"
      ? Math.min(steps.length - 1, currentIndex + 1)
      : Math.max(0, currentIndex - 1);

  if (
    direction === "next" &&
    state.currentStep === "violation" &&
    !state.violationType
  ) {
    return state;
  }

  if (
    direction === "next" &&
    state.currentStep === "reportType" &&
    !state.reportType
  ) {
    return state;
  }

  if (
    direction === "next" &&
    state.currentStep === "upload" &&
    state.uploadIssues.length === 0
  ) {
    return state;
  }

  return {
    ...state,
    currentStep: steps[nextIndex],
  };
}

export function buildBureauRemovalDemandInput(state: CursiveWorkflowState) {
  if (!state.violationType || !state.evidencePosture) {
    throw new Error("Cursive violation selection is required.");
  }

  const isCrossBureau =
    state.evidencePosture === "cross_bureau_inconsistency";
  const mailingAddressLines = state.details.consumerAddress
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return {
    consumer: {
      fullName: state.details.consumerName.trim(),
      mailingAddressLines,
    },
    bureau: {
      name: state.details.bureauName.trim(),
      mailingAddressLines: getBureauAddressLines(state.details.bureauName),
    },
    generatedDate: new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date()),
    violationType: state.violationType,
    violationLabel: getViolationLabel(state.violationType),
    doctrine: isCrossBureau
      ? "documented_inconsistency"
      : "documented_inaccuracy_with_proof",
    tradeline: {
      furnisherName: state.details.furnisherName.trim(),
      maskedAccountIdentifier:
        state.details.maskedAccountIdentifier.trim() || undefined,
    },
    reportedFacts: {
      targetBureauFactLabel: state.details.reportedFactLabel.trim(),
      targetBureauReportedValue:
        state.details.targetBureauReportedValue.trim(),
    },
    conflictFacts: isCrossBureau
      ? {
          comparedBureauFacts: [],
          conflictSummary: state.details.conflictSummary.trim(),
        }
      : undefined,
    proofFacts: isCrossBureau
      ? undefined
      : {
          reportedInaccurateInformation:
            state.details.reportedInaccurateInformation.trim(),
          proofSummary: state.details.proofSummary.trim(),
        },
    evidenceSummary: state.details.evidenceSummary.trim(),
    enclosureLabels: [state.details.evidenceSummary.trim()].filter(
      (label) => label.length > 0,
    ),
    statuteMappingId: isCrossBureau
      ? "cra_cross_bureau_inconsistency"
      : "cra_single_bureau_inaccuracy_with_proof",
  } as const;
}

export function getCursiveDetailErrors(state: CursiveWorkflowState) {
  const missingFields: string[] = [];
  const requireDetail = (value: string, label: string) => {
    if (value.trim().length === 0) {
      missingFields.push(label);
    }
  };

  requireDetail(state.details.consumerName, "consumer name");
  requireDetail(state.details.consumerAddress, "mailing address");
  requireDetail(state.details.bureauName, "target bureau");
  requireDetail(state.details.furnisherName, "furnisher name");
  requireDetail(state.details.reportedFactLabel, "reported field");
  requireDetail(state.details.targetBureauReportedValue, "bureau reported value");
  requireDetail(state.details.evidenceSummary, "evidence summary");

  if (state.evidencePosture === "cross_bureau_inconsistency") {
    requireDetail(state.details.conflictSummary, "conflicting report facts");
  } else if (state.evidencePosture === "single_bureau_inaccuracy_with_proof") {
    requireDetail(
      state.details.reportedInaccurateInformation,
      "inaccurate reported information",
    );
    requireDetail(state.details.proofSummary, "proof summary");
  }

  return missingFields;
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",").pop() ?? "" : result);
    });
    reader.addEventListener("error", () => {
      reject(new Error("Unable to read the uploaded PDF."));
    });
    reader.readAsDataURL(file);
  });
}

type CursiveWorkspaceShellProps = {
  artifacts: ArtifactListItem[];
  onDetailsChange: (details: Partial<CursiveDetailsState>) => void;
  onGenerate: () => void;
  onReportTypeSelect: (reportType: CursiveReportType) => void;
  onUploadAnalyze: () => void;
  onUploadFileChange: (file: File | null) => void;
  onUploadIssueToggle: (issueId: string) => void;
  onBackToMenu: () => void;
  onBackStep: () => void;
  onChoiceSelect: (
    choice: CursiveMode | CursiveEvidencePosture | CursiveViolationType,
  ) => void;
  onNextStep: () => void;
  state: CursiveWorkflowState;
};

export function isArtifactForMenuSelection(
  artifact: ArtifactListItem,
  botId: PlaygroundMenuBotId,
  displayName: string,
) {
  return artifact.botId ? artifact.botId === botId : artifact.botName === displayName;
}

function getCursiveModeLabel(mode: CursiveMode | null) {
  if (mode === "manual_dispute") {
    return "Manual dispute";
  }

  if (mode === "analyze_uploaded_report") {
    return "Analyze uploaded report";
  }

  return "Choose how to begin";
}

function getCursiveSteps(mode: CursiveMode | null) {
  return mode === "analyze_uploaded_report"
    ? UPLOAD_CURSIVE_WORKSPACE_STEPS
    : MANUAL_CURSIVE_WORKSPACE_STEPS;
}

function getCursiveActiveStepContent({
  state,
  onDetailsChange,
  onChoiceSelect,
  onBackStep,
  onNextStep,
  onReportTypeSelect,
  onUploadAnalyze,
  onUploadFileChange,
  onUploadIssueToggle,
}: Pick<
  CursiveWorkspaceShellProps,
  | "state"
  | "onBackStep"
  | "onChoiceSelect"
  | "onDetailsChange"
  | "onNextStep"
  | "onReportTypeSelect"
  | "onUploadAnalyze"
  | "onUploadFileChange"
  | "onUploadIssueToggle"
>) {
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
        <div className="cursive-generation-lane cursive-mode-actions">
          <button
            className="primary-button"
            onClick={() => onChoiceSelect("manual_dispute")}
            type="button"
          >
            Manual dispute
          </button>
          <button
            className="secondary-button"
            onClick={() => onChoiceSelect("analyze_uploaded_report")}
            type="button"
          >
            Analyze uploaded report
          </button>
        </div>
      </section>
    );
  }

  if (state.currentStep === "reportType") {
    return (
      <section className="cursive-card">
        <div className="cursive-card__header">
          <div>
            <p className="eyebrow">Step 2</p>
            <h3>Choose report type</h3>
          </div>
          <p className="panel-description">
            This section supports one tri-merge PDF or one single-bureau PDF per run.
          </p>
        </div>
        <div className="cursive-report-type-controls">
          <div className="cursive-report-type-actions">
            <button
              className={
                state.reportType === "tri_merge"
                  ? "primary-button"
                  : "secondary-button"
              }
              onClick={() => onReportTypeSelect("tri_merge")}
              type="button"
            >
              Tri-merge report
            </button>
            <button
              className={
                state.reportType === "single_bureau"
                  ? "primary-button"
                  : "secondary-button"
              }
              onClick={() => onReportTypeSelect("single_bureau")}
              type="button"
            >
              Single-bureau report
            </button>
          </div>
          <button
            className="primary-button cursive-report-type-upload"
            disabled={!state.reportType}
            onClick={onNextStep}
            type="button"
          >
            Upload next
          </button>
          <button
            className="secondary-button cursive-report-type-back"
            onClick={onBackStep}
            type="button"
          >
            Back
          </button>
        </div>
      </section>
    );
  }

  if (state.currentStep === "upload") {
    return (
      <section className="cursive-card">
        <div className="cursive-card__header">
          <div>
            <p className="eyebrow">Step 3</p>
            <h3>Upload the report PDF</h3>
          </div>
          <p className="panel-description">
            Cursive will extract narrow report facts and surface likely issues for
            review.
          </p>
        </div>
        <div className="cursive-detail-grid">
          <label>
            Credit report PDF
            <input
              accept="application/pdf"
              onChange={(event) =>
                onUploadFileChange(event.currentTarget.files?.[0] ?? null)
              }
              type="file"
            />
          </label>
        </div>
        {state.uploadFile ? (
          <p className="success-banner">{state.uploadFile.name} ready for analysis.</p>
        ) : null}
        {state.uploadError ? (
          <p className="alert-banner">{state.uploadError}</p>
        ) : null}
        <button
          className="primary-button"
          disabled={!state.uploadFile || state.isUploading}
          onClick={onUploadAnalyze}
          type="button"
        >
          {state.isUploading ? "Analyzing report" : "Analyze report"}
        </button>
      </section>
    );
  }

  if (state.currentStep === "issues") {
    const issue = state.uploadIssues[0] ?? null;
    const isConfirmed = issue
      ? state.confirmedUploadIssueIds.includes(issue.id)
      : false;

    return (
      <section className="cursive-card">
        <div className="cursive-card__header">
          <div>
            <p className="eyebrow">Step 4</p>
            <h3>Review detected issues</h3>
          </div>
          <p className="panel-description">
            Confirm only the issues you want Cursive to generate.
          </p>
        </div>
        {issue ? (
          <div className="cursive-issue-card">
            <p className="eyebrow">Issue 1 of {state.uploadIssues.length}</p>
            <h4>{issue.tradeline.furnisherName}</h4>
            <dl className="cursive-review-list">
              <div>
                <dt>Target bureau</dt>
                <dd>{issue.targetBureau}</dd>
              </div>
              <div>
                <dt>Violation</dt>
                <dd>{issue.violationLabel}</dd>
              </div>
              <div>
                <dt>Reported facts</dt>
                <dd>
                  {issue.conflictFacts?.conflictSummary ??
                    issue.proofFacts?.reportedInaccurateInformation ??
                    issue.reportedFacts.targetBureauReportedValue}
                </dd>
              </div>
              {issue.proofFacts ? (
                <div>
                  <dt>Proof</dt>
                  <dd>{issue.proofFacts.proofSummary}</dd>
                </div>
              ) : null}
            </dl>
            <button
              className={isConfirmed ? "primary-button" : "secondary-button"}
              onClick={() => onUploadIssueToggle(issue.id)}
              type="button"
            >
              {isConfirmed ? "Issue confirmed" : "Confirm issue"}
            </button>
          </div>
        ) : (
          <p className="muted-copy">No likely issues were detected in this PDF.</p>
        )}
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

  if (state.currentStep === "details") {
    const isCrossBureau =
      state.evidencePosture === "cross_bureau_inconsistency";

    return (
      <section className="cursive-card">
        <div className="cursive-card__header">
          <div>
            <p className="eyebrow">Step 4</p>
            <h3>Enter the letter details</h3>
          </div>
          <p className="panel-description">
            Keep the facts narrow. Cursive uses these fields to build a bureau
            removal-demand letter.
          </p>
        </div>
        <div className="cursive-detail-grid">
          <label>
            Consumer name
            <input
              onChange={(event) =>
                onDetailsChange({ consumerName: event.currentTarget.value })
              }
              value={state.details.consumerName}
            />
          </label>
          <label>
            Mailing address
            <textarea
              onChange={(event) =>
                onDetailsChange({ consumerAddress: event.currentTarget.value })
              }
              value={state.details.consumerAddress}
            />
          </label>
          <label>
            Target bureau
            <select
              onChange={(event) =>
                onDetailsChange({ bureauName: event.currentTarget.value })
              }
              value={state.details.bureauName}
            >
              <option value="">Select bureau</option>
              <option value="Experian">Experian</option>
              <option value="Equifax">Equifax</option>
              <option value="TransUnion">TransUnion</option>
            </select>
          </label>
          <label>
            Furnisher name
            <input
              onChange={(event) =>
                onDetailsChange({ furnisherName: event.currentTarget.value })
              }
              value={state.details.furnisherName}
            />
          </label>
          <label>
            Account identifier
            <input
              onChange={(event) =>
                onDetailsChange({
                  maskedAccountIdentifier: event.currentTarget.value,
                })
              }
              value={state.details.maskedAccountIdentifier}
            />
          </label>
          <label>
            Reported field
            <input
              onChange={(event) =>
                onDetailsChange({
                  reportedFactLabel: event.currentTarget.value,
                })
              }
              placeholder="balance, account status, payment status"
              value={state.details.reportedFactLabel}
            />
          </label>
          <label>
            Bureau reported value
            <input
              onChange={(event) =>
                onDetailsChange({
                  targetBureauReportedValue: event.currentTarget.value,
                })
              }
              value={state.details.targetBureauReportedValue}
            />
          </label>
          {isCrossBureau ? (
            <label>
              Conflicting report facts
              <textarea
                onChange={(event) =>
                  onDetailsChange({
                    conflictSummary: event.currentTarget.value,
                  })
                }
                value={state.details.conflictSummary}
              />
            </label>
          ) : (
            <>
              <label>
                Inaccurate reported information
                <textarea
                  onChange={(event) =>
                    onDetailsChange({
                      reportedInaccurateInformation:
                        event.currentTarget.value,
                    })
                  }
                  value={state.details.reportedInaccurateInformation}
                />
              </label>
              <label>
                Proof summary
                <textarea
                  onChange={(event) =>
                    onDetailsChange({ proofSummary: event.currentTarget.value })
                  }
                  value={state.details.proofSummary}
                />
              </label>
            </>
          )}
          <label>
            Evidence summary
            <input
              onChange={(event) =>
                onDetailsChange({ evidenceSummary: event.currentTarget.value })
              }
              value={state.details.evidenceSummary}
            />
          </label>
        </div>
      </section>
    );
  }

  if (state.currentStep === "review") {
    if (state.mode === "analyze_uploaded_report") {
      const confirmedIssues = state.uploadIssues.filter((issue) =>
        state.confirmedUploadIssueIds.includes(issue.id),
      );

      return (
        <section className="cursive-card">
          <div className="cursive-card__header">
            <div>
              <p className="eyebrow">Step 5</p>
              <h3>Review confirmed issues</h3>
            </div>
            <p className="panel-description">
              Cursive will batch-generate bureau removal-demand letters for the
              confirmed issues.
            </p>
          </div>
          <dl className="cursive-review-list">
            {confirmedIssues.map((issue) => (
              <div key={issue.id}>
                <dt>{issue.targetBureau}</dt>
                <dd>{issue.tradeline.furnisherName} - {issue.violationLabel}</dd>
              </div>
            ))}
          </dl>
          {state.previewError ? (
            <p className="alert-banner">{state.previewError}</p>
          ) : null}
        </section>
      );
    }

    return (
      <section className="cursive-card">
        <div className="cursive-card__header">
          <div>
            <p className="eyebrow">Step 5</p>
            <h3>Review the removal demand</h3>
          </div>
          <p className="panel-description">
            Cursive will generate a bureau-specific removal-demand preview from
            these controlled facts.
          </p>
        </div>
        <dl className="cursive-review-list">
          <div>
            <dt>Bureau</dt>
            <dd>{state.details.bureauName || "Not entered"}</dd>
          </div>
          <div>
            <dt>Tradeline</dt>
            <dd>{state.details.furnisherName || "Not entered"}</dd>
          </div>
          <div>
            <dt>Violation</dt>
            <dd>{getViolationLabel(state.violationType)}</dd>
          </div>
          <div>
            <dt>Evidence</dt>
            <dd>{state.details.evidenceSummary || "Not entered"}</dd>
          </div>
        </dl>
        {state.previewError ? (
          <p className="alert-banner">{state.previewError}</p>
        ) : null}
      </section>
    );
  }

  if (state.currentStep === "results") {
    return (
      <section className="cursive-card">
        <div className="cursive-card__header">
          <div>
            <p className="eyebrow">Step 6</p>
            <h3>Results</h3>
          </div>
          <p className="panel-description">
            {state.mode === "analyze_uploaded_report"
              ? "Your confirmed uploaded-report issues have been queued as PDF reports."
              : "Your bureau removal-demand letter has been queued as a PDF report."}
          </p>
        </div>
        {state.previewHtml ? (
          <p className="success-banner">
            Your letter is being created. Your letter will be available in the
            Report section shortly.
          </p>
        ) : (
          <p className="muted-copy">Generate the preview from the review step.</p>
        )}
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
          Keep the intake tight by selecting the exact reporting problem before
          deeper details open.
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
          Violation selected. Continue to enter the letter details and review
          the removal demand.
        </p>
      ) : null}
    </section>
  );
}

export function CursiveWorkspaceShell({
  artifacts,
  onDetailsChange,
  onGenerate,
  onBackStep,
  onBackToMenu,
  onChoiceSelect,
  onNextStep,
  onReportTypeSelect,
  onUploadAnalyze,
  onUploadFileChange,
  onUploadIssueToggle,
  state,
}: CursiveWorkspaceShellProps) {
  const nextLabel =
    state.currentStep === "review"
      ? "Generate"
      : state.currentStep === "results"
        ? "Done"
        : state.currentStep === "violation"
          ? "Details next"
          : state.currentStep === "reportType"
            ? "Upload next"
            : state.currentStep === "upload"
              ? "Issues next"
          : "Next step";
  const footerSlot =
    state.currentStep === "results" && state.previewHtml ? (
      <span className="muted-copy">Letter being created.</span>
    ) : state.currentStep === "violation" && state.violationType ? (
      <span className="muted-copy">Details and review are next.</span>
    ) : null;
  const canUseNext =
    (state.currentStep === "violation" && Boolean(state.violationType)) ||
    (state.currentStep === "reportType" && Boolean(state.reportType)) ||
    (state.currentStep === "upload" && state.uploadIssues.length > 0) ||
    (state.currentStep === "issues" &&
      state.confirmedUploadIssueIds.length > 0) ||
    (state.currentStep === "details" &&
      getCursiveDetailErrors(state).length === 0) ||
    (state.currentStep === "review" && !state.isGenerating) ||
    state.currentStep === "results";

  return (
    <div className="cursive-shell">
      <CursiveWorkspace
        activeStepId={state.currentStep}
        footerSlot={footerSlot}
        hideFooter={state.currentStep === "reportType"}
        isBackDisabled={state.currentStep === "mode" || state.isGenerating}
        isNextDisabled={!canUseNext}
        laneLabel={getCursiveModeLabel(state.mode)}
        nextLabel={state.currentStep === "review" && state.isGenerating ? "Generating" : nextLabel}
        onBack={onBackStep}
        onNext={
          state.currentStep === "review"
            ? onGenerate
            : state.currentStep === "results"
              ? onBackToMenu
              : onNextStep
        }
        steps={getCursiveSteps(state.mode)}
      >
        {getCursiveActiveStepContent({
          onBackStep,
          onDetailsChange,
          onChoiceSelect,
          onNextStep,
          onReportTypeSelect,
          onUploadAnalyze,
          onUploadFileChange,
          onUploadIssueToggle,
          state,
        })}
      </CursiveWorkspace>
      <BotSupportPanel artifacts={artifacts} botId="document_wizard" />
    </div>
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
  const [topSecretWorkflow, setTopSecretWorkflow] =
    useState<TopSecretWorkflowState>(EMPTY_TOP_SECRET_WORKFLOW_STATE);
  const cursiveGenerateInFlightRef = useRef(false);
  const cursiveGenerateRequestIdRef = useRef(0);
  const topSecretGenerateInFlightRef = useRef(false);
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
  const isTopSecretWorkspace = selectedBot?.id === "verifier";
  const isRoriWorkspace = selectedBot?.id === "concierge_general_academy_KB";
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
    setTopSecretWorkflow(EMPTY_TOP_SECRET_WORKFLOW_STATE);
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
    setSessionError(null);

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
          message?: string;
          reviewUrl?: string;
        };

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          reviewPromptRequestKeyRef.current = null;
          setSessionError(
            payload.message ?? "Unable to end the playground right now.",
          );
          return;
        }

        setReviewPrompt({
          reason: "timeout",
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
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        reviewPromptRequestKeyRef.current = null;
        setSessionError("Unable to end the playground right now.");
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
            botId: artifact.botId,
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
    cursiveGenerateInFlightRef.current = false;
    cursiveGenerateRequestIdRef.current += 1;
    topSecretGenerateInFlightRef.current = false;
    setCursiveWorkflow(EMPTY_CURSIVE_WORKFLOW_STATE);
    setTopSecretWorkflow(EMPTY_TOP_SECRET_WORKFLOW_STATE);
    setSelectedMenuBotId(null);
  }

  function handleCursiveBackStep() {
    cursiveGenerateInFlightRef.current = false;
    cursiveGenerateRequestIdRef.current += 1;
    setCursiveWorkflow((currentState) =>
      getSteppedCursiveState(currentState, "back"),
    );
  }

  function handleCursiveDetailsChange(details: Partial<CursiveDetailsState>) {
    cursiveGenerateInFlightRef.current = false;
    cursiveGenerateRequestIdRef.current += 1;
    setCursiveWorkflow((currentState) => ({
      ...currentState,
      details: {
        ...currentState.details,
        ...details,
      },
      isGenerating: false,
      previewError: null,
      previewHtml: null,
      previewToken: null,
    }));
  }

  function handleCursiveReportTypeSelect(reportType: CursiveReportType) {
    cursiveGenerateInFlightRef.current = false;
    cursiveGenerateRequestIdRef.current += 1;
    setCursiveWorkflow((currentState) => ({
      ...currentState,
      confirmedUploadIssueIds: [],
      currentStep: "reportType",
      isGenerating: false,
      previewError: null,
      previewHtml: null,
      previewToken: null,
      reportType,
      uploadConsumer: null,
      uploadError: null,
      uploadId: null,
      uploadIssues: [],
    }));
  }

  function handleCursiveUploadFileChange(file: File | null) {
    cursiveGenerateInFlightRef.current = false;
    cursiveGenerateRequestIdRef.current += 1;
    setCursiveWorkflow((currentState) => ({
      ...currentState,
      confirmedUploadIssueIds: [],
      isGenerating: false,
      isUploading: false,
      previewError: null,
      previewHtml: null,
      previewToken: null,
      uploadConsumer: null,
      uploadError: null,
      uploadFile: file,
      uploadId: null,
      uploadIssues: [],
    }));
  }

  function handleCursiveUploadIssueToggle(issueId: string) {
    setCursiveWorkflow((currentState) => {
      const alreadyConfirmed =
        currentState.confirmedUploadIssueIds.includes(issueId);

      return {
        ...currentState,
        confirmedUploadIssueIds: alreadyConfirmed
          ? currentState.confirmedUploadIssueIds.filter((id) => id !== issueId)
          : [...currentState.confirmedUploadIssueIds, issueId],
        previewError: null,
      };
    });
  }

  function handleCursiveNextStep() {
    cursiveGenerateInFlightRef.current = false;
    cursiveGenerateRequestIdRef.current += 1;
    setCursiveWorkflow((currentState) =>
      getSteppedCursiveState(currentState, "next"),
    );
  }

  function handleTopSecretBackStep() {
    setTopSecretWorkflow((currentState) =>
      getSteppedTopSecretState(currentState, "back"),
    );
  }

  function handleTopSecretNextStep() {
    setTopSecretWorkflow((currentState) =>
      getSteppedTopSecretState(currentState, "next"),
    );
  }

  async function handleCursiveUploadAnalyze() {
    if (!activeSessionId || !sessionToken) {
      setCursiveWorkflow((currentState) => ({
        ...currentState,
        uploadError: "Reconnect your provider session before analyzing.",
      }));
      return;
    }

    if (!cursiveWorkflow.reportType || !cursiveWorkflow.uploadFile) {
      setCursiveWorkflow((currentState) => ({
        ...currentState,
        uploadError: "Choose a report type and upload a PDF before analyzing.",
      }));
      return;
    }

    const requestId = cursiveGenerateRequestIdRef.current + 1;
    cursiveGenerateRequestIdRef.current = requestId;
    setCursiveWorkflow((currentState) => ({
      ...currentState,
      isUploading: true,
      uploadError: null,
    }));

    try {
      const fileBytesBase64 = await readFileAsBase64(cursiveWorkflow.uploadFile);
      const response = await fetch("/api/reports/cursive/upload-analysis/analyze", {
        method: "POST",
        headers: {
          authorization: `Bearer ${sessionToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          botId: "document_wizard",
          fileBytesBase64,
          filename: cursiveWorkflow.uploadFile.name,
          mimeType: cursiveWorkflow.uploadFile.type || "application/pdf",
          reportType: cursiveWorkflow.reportType,
          sessionId: activeSessionId,
        }),
      });
      const payload = (await response.json()) as {
        consumer?: {
          fullName: string;
          mailingAddressLines: string[];
        };
        issues?: CursiveUploadIssue[];
        message?: string;
        upload?: {
          id: string;
        };
      };

      if (!response.ok || !payload.upload || !payload.issues) {
        throw new Error(payload.message ?? "Unable to analyze the uploaded report.");
      }

      const upload = payload.upload;
      const issues = payload.issues;

      if (cursiveGenerateRequestIdRef.current !== requestId) {
        return;
      }

      setCursiveWorkflow((currentState) => ({
        ...currentState,
        confirmedUploadIssueIds:
          issues.length > 0 ? [issues[0].id] : [],
        currentStep: "issues",
        isUploading: false,
        uploadConsumer: payload.consumer ?? null,
        uploadError:
          issues.length === 0
            ? "No likely report issues were detected in this PDF."
            : null,
        uploadId: upload.id,
        uploadIssues: issues,
      }));
    } catch (error) {
      if (cursiveGenerateRequestIdRef.current !== requestId) {
        return;
      }

      setCursiveWorkflow((currentState) => ({
        ...currentState,
        isUploading: false,
        uploadError:
          error instanceof Error
            ? error.message
            : "Unable to analyze the uploaded report.",
      }));
    }
  }

  async function handleCursiveGenerate() {
    if (cursiveGenerateInFlightRef.current || cursiveWorkflow.isGenerating) {
      return;
    }

    cursiveGenerateInFlightRef.current = true;

    if (!activeSessionId || !sessionToken) {
      setCursiveWorkflow((currentState) => ({
        ...currentState,
        isGenerating: false,
        previewError: "Reconnect your provider session before generating.",
      }));
      cursiveGenerateInFlightRef.current = false;
      return;
    }

    if (cursiveWorkflow.mode === "analyze_uploaded_report") {
      const requestId = cursiveGenerateRequestIdRef.current + 1;
      cursiveGenerateRequestIdRef.current = requestId;

      if (
        !cursiveWorkflow.uploadId ||
        !cursiveWorkflow.reportType ||
        cursiveWorkflow.confirmedUploadIssueIds.length === 0
      ) {
        setCursiveWorkflow((currentState) => ({
          ...currentState,
          isGenerating: false,
          previewError: "Confirm at least one uploaded-report issue before generating.",
        }));
        cursiveGenerateInFlightRef.current = false;
        return;
      }

      setCursiveWorkflow((currentState) => ({
        ...currentState,
        isGenerating: true,
        previewError: null,
      }));

      try {
        const response = await fetch(
          "/api/reports/cursive/upload-analysis/generate",
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${sessionToken}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              botId: "document_wizard",
              confirmedIssueIds: cursiveWorkflow.confirmedUploadIssueIds,
              consumer: cursiveWorkflow.uploadConsumer,
              reportType: cursiveWorkflow.reportType,
              sessionId: activeSessionId,
              uploadId: cursiveWorkflow.uploadId,
            }),
          },
        );
        const payload = (await response.json()) as {
          artifacts?: Array<{
            fileName: string;
            id: string;
            originalFilename: string;
            status: "queued" | "ready" | "failed";
          }>;
          artifactType?: "pdf";
          message?: string;
        };

        if (!response.ok || !payload.artifacts?.length) {
          throw new Error(
            payload.message ?? "Unable to queue uploaded-report letters.",
          );
        }

        if (cursiveGenerateRequestIdRef.current !== requestId) {
          cursiveGenerateInFlightRef.current = false;
          return;
        }

        setArtifacts((currentArtifacts) => [
          ...payload.artifacts!.map((artifact) => ({
            artifactType: payload.artifactType ?? ("pdf" as const),
            botId: "document_wizard",
            botName: selectedMenuItem?.displayName ?? "Cursive",
            createdAt: new Date().toISOString(),
            fileName: artifact.fileName,
            generatedAt: new Date().toISOString(),
            id: artifact.id,
            originalFilename: artifact.originalFilename,
            status: artifact.status,
          })),
          ...currentArtifacts.filter(
            (artifact) =>
              !payload.artifacts!.some(
                (queuedArtifact) => queuedArtifact.id === artifact.id,
              ),
          ),
        ]);
        setCursiveWorkflow((currentState) => ({
          ...currentState,
          currentStep: "results",
          isGenerating: false,
          previewError: null,
          previewHtml: "<uploaded-report-analysis />",
        }));
        cursiveGenerateInFlightRef.current = false;
      } catch (error) {
        if (cursiveGenerateRequestIdRef.current !== requestId) {
          cursiveGenerateInFlightRef.current = false;
          return;
        }

        setCursiveWorkflow((currentState) => ({
          ...currentState,
          currentStep: "review",
          isGenerating: false,
          previewError:
            error instanceof Error
              ? error.message
              : "Unable to generate uploaded-report letters.",
        }));
        cursiveGenerateInFlightRef.current = false;
      }

      return;
    }

    const detailErrors = getCursiveDetailErrors(cursiveWorkflow);

    if (detailErrors.length > 0) {
      setCursiveWorkflow((currentState) => ({
        ...currentState,
        isGenerating: false,
        previewError: `Complete required details: ${detailErrors.join(", ")}.`,
      }));
      cursiveGenerateInFlightRef.current = false;
      return;
    }

    let input: ReturnType<typeof buildBureauRemovalDemandInput>;
    try {
      input = buildBureauRemovalDemandInput(cursiveWorkflow);
    } catch (error) {
      setCursiveWorkflow((currentState) => ({
        ...currentState,
        isGenerating: false,
        previewError:
          error instanceof Error
            ? error.message
            : "Complete the removal-demand details before generating.",
      }));
      cursiveGenerateInFlightRef.current = false;
      return;
    }

    const requestId = cursiveGenerateRequestIdRef.current + 1;
    cursiveGenerateRequestIdRef.current = requestId;

    setCursiveWorkflow((currentState) => ({
      ...currentState,
      isGenerating: true,
      previewError: null,
    }));

    try {
      const previewResponse = await fetch(
        "/api/reports/cursive/bureau-removal-demand/preview",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${sessionToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            botId: "document_wizard",
            input,
            sessionId: activeSessionId,
          }),
        },
      );
      const previewPayload = (await previewResponse.json()) as {
        html?: string;
        message?: string;
        previewSnapshot?: unknown;
        previewToken?: string;
      };

      if (
        !previewResponse.ok ||
        !previewPayload.html ||
        !previewPayload.previewSnapshot ||
        !previewPayload.previewToken
      ) {
        throw new Error(
          previewPayload.message ?? "Unable to generate the removal-demand preview.",
        );
      }

      if (cursiveGenerateRequestIdRef.current !== requestId) {
        cursiveGenerateInFlightRef.current = false;
        return;
      }

      const saveResponse = await fetch(
        "/api/reports/cursive/bureau-removal-demand/save-pdf-draft",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${sessionToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            botId: "document_wizard",
            previewHtml: previewPayload.html,
            previewSnapshot: previewPayload.previewSnapshot,
            previewToken: previewPayload.previewToken,
            sessionId: activeSessionId,
          }),
        },
      );
      const savePayload = (await saveResponse.json()) as {
        artifact?: {
          fileName: string;
          id: string;
          originalFilename: string;
          status: "queued" | "ready" | "failed";
        };
        artifactType?: "pdf";
        message?: string;
      };

      if (!saveResponse.ok || !savePayload.artifact) {
        throw new Error(
          savePayload.message ?? "Unable to queue the removal-demand PDF draft.",
        );
      }

      const queuedArtifact = savePayload.artifact;
      if (cursiveGenerateRequestIdRef.current !== requestId) {
        cursiveGenerateInFlightRef.current = false;
        return;
      }

      setArtifacts((currentArtifacts) => [
        {
          artifactType: savePayload.artifactType ?? "pdf",
          botId: "document_wizard",
          botName: selectedMenuItem?.displayName ?? "Cursive",
          createdAt: new Date().toISOString(),
          fileName: queuedArtifact.fileName,
          generatedAt: new Date().toISOString(),
          id: queuedArtifact.id,
          originalFilename: queuedArtifact.originalFilename,
          status: queuedArtifact.status,
        },
        ...currentArtifacts.filter(
          (artifact) => artifact.id !== queuedArtifact.id,
        ),
      ]);
      setCursiveWorkflow((currentState) => ({
        ...currentState,
        currentStep: "results",
        isGenerating: false,
        previewError: null,
        previewHtml: previewPayload.html ?? null,
        previewToken: previewPayload.previewToken ?? null,
      }));
      cursiveGenerateInFlightRef.current = false;
    } catch (error) {
      if (cursiveGenerateRequestIdRef.current !== requestId) {
        cursiveGenerateInFlightRef.current = false;
        return;
      }

      setCursiveWorkflow((currentState) => ({
        ...currentState,
        currentStep: "review",
        isGenerating: false,
        previewError:
          error instanceof Error
            ? error.message
            : "Unable to generate the removal-demand letter.",
      }));
      cursiveGenerateInFlightRef.current = false;
    }
  }

  async function handleTopSecretGenerate() {
    if (topSecretGenerateInFlightRef.current || topSecretWorkflow.isGenerating) {
      return;
    }

    topSecretGenerateInFlightRef.current = true;

    if (!activeSessionId || !sessionToken) {
      setTopSecretWorkflow((currentState) => ({
        ...currentState,
        error: "Reconnect your provider session before creating the report.",
        isGenerating: false,
      }));
      topSecretGenerateInFlightRef.current = false;
      return;
    }

    setTopSecretWorkflow((currentState) => ({
      ...currentState,
      error: null,
      isGenerating: true,
    }));

    try {
      const response = await fetch("/api/reports/top-secret/claim-review", {
        method: "POST",
        headers: {
          authorization: `Bearer ${sessionToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          botId: "verifier",
          claims: parseTopSecretClaimsText(topSecretWorkflow.claimsText),
          sessionId: activeSessionId,
        }),
      });
      const payload = (await response.json()) as {
        artifact?: {
          fileName: string;
          id: string;
          originalFilename: string;
          status: "queued" | "ready" | "failed";
        };
        artifactType?: "pdf";
        findings?: TopSecretFinding[];
        message?: string;
      };

      if (!response.ok || !payload.artifact) {
        throw new Error(payload.message ?? "Unable to create the report.");
      }

      const queuedArtifact = payload.artifact;
      setArtifacts((currentArtifacts) => [
        {
          artifactType: payload.artifactType ?? "pdf",
          botId: "verifier",
          botName: selectedMenuItem?.displayName ?? "Top Secret",
          createdAt: new Date().toISOString(),
          fileName: queuedArtifact.fileName,
          generatedAt: new Date().toISOString(),
          id: queuedArtifact.id,
          originalFilename: queuedArtifact.originalFilename,
          status: queuedArtifact.status,
        },
        ...currentArtifacts.filter(
          (artifact) => artifact.id !== queuedArtifact.id,
        ),
      ]);
      setTopSecretWorkflow((currentState) => ({
        ...currentState,
        currentStep: "results",
        error: null,
        findings: payload.findings ?? [],
        isGenerating: false,
      }));
    } catch (error) {
      setTopSecretWorkflow((currentState) => ({
        ...currentState,
        currentStep: "review",
        error:
          error instanceof Error
            ? error.message
            : "Unable to create the report right now.",
        isGenerating: false,
      }));
    } finally {
      topSecretGenerateInFlightRef.current = false;
    }
  }

  return (
    <main
      className={[
        "app-shell",
        "app-shell--dashboard",
        isTopSecretWorkspace ? "app-shell--top-secret" : "",
        isRoriWorkspace ? "app-shell--rori" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="dashboard-topbar panel">
        <div>
          <p className="eyebrow">PBG Playground</p>
          <h1>{preferredName}, your dashboard is ready</h1>
        </div>
      </header>
      {reviewPrompt ? (
        <SessionEndModal
          onReviewClick={(url) => {
            openTelegramReviewLink(url);
          }}
          prompt={reviewPrompt}
        />
      ) : null}
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
              <button
                className="secondary-button secondary-button--danger"
                onClick={handleEndPlayground}
                type="button"
              >
                Danger Zone
              </button>
            </div>
          </section>
          {botError ? <p role="alert" className="alert-banner">{botError}</p> : null}
          {artifactError ? <p role="alert" className="alert-banner">{artifactError}</p> : null}
          {selectedMenuItem ? (
            selectedBotIsLive ? (
              isCursiveWorkspace ? (
                <CursiveWorkspaceShell
                  artifacts={artifacts.filter(
                    (artifact) =>
                      isArtifactForMenuSelection(
                        artifact,
                        selectedMenuItem.id,
                        selectedMenuItem.displayName,
                      ),
                  )}
                  onBackStep={handleCursiveBackStep}
                  onBackToMenu={handleBackToMenu}
                  onChoiceSelect={(choice) => {
                    setCursiveWorkflow((currentState) =>
                      getNextCursiveStepState(choice, currentState),
                    );
                  }}
                  onDetailsChange={handleCursiveDetailsChange}
                  onGenerate={() => {
                    void handleCursiveGenerate();
                  }}
                  onNextStep={handleCursiveNextStep}
                  onReportTypeSelect={handleCursiveReportTypeSelect}
                  onUploadAnalyze={() => {
                    void handleCursiveUploadAnalyze();
                  }}
                  onUploadFileChange={handleCursiveUploadFileChange}
                  onUploadIssueToggle={handleCursiveUploadIssueToggle}
                  state={cursiveWorkflow}
                />
              ) : isTopSecretWorkspace ? (
                <TopSecretWorkspace
                  artifacts={artifacts.filter(
                    (artifact) =>
                      isArtifactForMenuSelection(
                        artifact,
                        selectedMenuItem.id,
                        selectedMenuItem.displayName,
                      ),
                  )}
                  onBack={handleTopSecretBackStep}
                  onBackToMenu={handleBackToMenu}
                  onClaimsTextChange={(claimsText) => {
                    setTopSecretWorkflow((currentState) => ({
                      ...currentState,
                      claimsText,
                      error: null,
                    }));
                  }}
                  onGenerate={() => {
                    void handleTopSecretGenerate();
                  }}
                  onNext={handleTopSecretNextStep}
                  state={topSecretWorkflow}
                />
              ) : isRoriWorkspace ? (
                <RoriWorkspace
                  key={selectedBot?.id ?? "no-bot-selected"}
                  bot={selectedBot}
                  conversationId={selectedConversation?.conversationId}
                  messages={selectedConversation?.messages ?? []}
                  onBackToMenu={handleBackToMenu}
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
                        (artifact) =>
                          isArtifactForMenuSelection(
                            artifact,
                            selectedMenuItem.id,
                            selectedMenuItem.displayName,
                          ),
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
