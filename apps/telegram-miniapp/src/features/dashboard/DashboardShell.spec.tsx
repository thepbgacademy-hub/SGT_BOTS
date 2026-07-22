import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { BotCatalogEntry } from "../../../../../packages/shared/src/bots/manifests";
import { ChatPanel } from "../chat/ChatPanel";
import { getStarterPromptsForBot } from "../rori/starter-prompts";
import {
  CursiveWorkspaceShell,
  buildBureauRemovalDemandInput,
  getCursiveDetailErrors,
  getLowTimeNudgeThreshold,
  getNextCursiveStepState,
  getSteppedCursiveState,
  isArtifactForMenuSelection,
  type CursiveWorkflowState,
} from "./DashboardShell";

function renderShell(state: CursiveWorkflowState) {
  return renderToStaticMarkup(
    createElement(CursiveWorkspaceShell, {
      artifacts: [],
      onBackStep: () => undefined,
      onBackToMenu: () => undefined,
      onChoiceSelect: () => undefined,
      onDetailsChange: () => undefined,
      onGenerate: () => undefined,
      onNextStep: () => undefined,
      onReportTypeSelect: () => undefined,
      onUploadAnalyze: () => undefined,
      onUploadFileChange: () => undefined,
      onUploadIssueToggle: () => undefined,
      state,
    }),
  );
}

const EMPTY_DETAILS = {
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

const EMPTY_STATE: CursiveWorkflowState = {
  confirmedUploadIssueIds: [],
  currentStep: "mode",
  details: EMPTY_DETAILS,
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

describe("DashboardShell Cursive workspace", () => {
  it("renders upload report type controls without duplicate topbar chrome", () => {
    const markup = renderShell({
      ...EMPTY_STATE,
      currentStep: "reportType",
      mode: "analyze_uploaded_report",
    });

    expect(markup).not.toContain("cursive-workspace__topbar");
    expect(markup).toContain("This section supports one tri-merge PDF");
    expect(markup).toContain("cursive-report-type-actions");
    expect(markup).toContain("cursive-report-type-upload");
    expect(markup).toContain("cursive-report-type-back");
  });

  it("keeps ready artifacts visible by bot id when display names drift", () => {
    expect(
      isArtifactForMenuSelection(
        {
          artifactType: "pdf",
          botId: "document_wizard",
          botName: "Document Wizard",
          downloadUrl: "/api/reports/artifacts/artifact-1/download?token=test",
          fileName: "bureau-removal-demand-letter.pdf",
          id: "artifact-1",
          originalFilename: "manual-intake",
          status: "ready",
        },
        "document_wizard",
        "Cursive",
      ),
    ).toBe(true);
  });

  it("labels Cursive generated output as a report instead of artifacts", () => {
    const markup = renderToStaticMarkup(
      createElement(CursiveWorkspaceShell, {
        artifacts: [
          {
            artifactType: "pdf",
            botId: "document_wizard",
            botName: "Cursive",
            downloadUrl: "/api/reports/artifacts/artifact-1/download?token=test",
            fileName: "bureau-removal-demand-letter.pdf",
            id: "artifact-1",
            originalFilename: "manual-intake",
            status: "ready",
          },
        ],
        onBackStep: () => undefined,
        onBackToMenu: () => undefined,
        onChoiceSelect: () => undefined,
        onDetailsChange: () => undefined,
        onGenerate: () => undefined,
        onNextStep: () => undefined,
        onReportTypeSelect: () => undefined,
        onUploadAnalyze: () => undefined,
        onUploadFileChange: () => undefined,
        onUploadIssueToggle: () => undefined,
        state: {
          ...EMPTY_STATE,
          currentStep: "results",
          mode: "manual_dispute",
        },
      }),
    );

    expect(markup).toContain("<h2>Report</h2>");
    expect(markup).toContain("bureau-removal-demand-letter.pdf");
    expect(markup).toContain("Download PDF");
    expect(markup).not.toContain("track generated artifacts here");
  });

  it("starts on the named Mode step and keeps later steps locked", () => {
    const markup = renderShell({
      ...EMPTY_STATE,
    });

    expect(markup).toContain("Mode");
    expect(markup).toContain("Evidence");
    expect(markup).toContain("Violation");
    expect(markup).toContain("Choose how to begin");
    expect(markup).toContain("cursive-mode-actions");
    expect(markup).toContain("Manual dispute");
    expect(markup).toContain("Analyze uploaded report");
  });

  it("advances deterministically through Mode, Evidence, and Violation", () => {
    const afterMode = getNextCursiveStepState("manual_dispute", {
      ...EMPTY_STATE,
    });
    const afterEvidence = getNextCursiveStepState(
      "cross_bureau_inconsistency",
      afterMode,
    );
    const afterViolation = getNextCursiveStepState(
      "different_balances_across_bureaus",
      afterEvidence,
    );

    expect(afterMode).toEqual({
      ...EMPTY_STATE,
      currentStep: "evidence",
      mode: "manual_dispute",
    });
    expect(afterEvidence).toEqual({
      ...EMPTY_STATE,
      currentStep: "violation",
      evidencePosture: "cross_bureau_inconsistency",
      mode: "manual_dispute",
    });
    expect(afterViolation).toEqual({
      ...EMPTY_STATE,
      currentStep: "violation",
      evidencePosture: "cross_bureau_inconsistency",
      mode: "manual_dispute",
      violationType: "different_balances_across_bureaus",
    });
  });

  it("routes uploaded-report mode into report type selection", () => {
    const afterMode = getNextCursiveStepState(
      "analyze_uploaded_report",
      EMPTY_STATE,
    );
    const markup = renderShell({
      ...afterMode,
      reportType: "tri_merge",
    });

    expect(afterMode.currentStep).toBe("reportType");
    expect(afterMode.mode).toBe("analyze_uploaded_report");
    expect(markup).toContain("Choose report type");
    expect(markup).toContain("Tri-merge report");
    expect(markup).toContain("Single-bureau report");
  });

  it("allows back navigation even when the current step is not complete", () => {
    expect(
      getSteppedCursiveState(
        {
          ...EMPTY_STATE,
          currentStep: "reportType",
          mode: "analyze_uploaded_report",
          reportType: null,
        },
        "back",
      ).currentStep,
    ).toBe("mode");
    expect(
      getSteppedCursiveState(
        {
          ...EMPTY_STATE,
          currentStep: "violation",
          evidencePosture: "cross_bureau_inconsistency",
          mode: "manual_dispute",
          violationType: null,
        },
        "back",
      ).currentStep,
    ).toBe("evidence");
  });

  it("moves uploaded-report issues into review only after confirmation", () => {
    const uploadState: CursiveWorkflowState = {
      ...EMPTY_STATE,
      confirmedUploadIssueIds: ["issue-balance-inconsistency-1"],
      currentStep: "issues",
      mode: "analyze_uploaded_report",
      reportType: "tri_merge",
      uploadId: "upload-1",
      uploadIssues: [
        {
          id: "issue-balance-inconsistency-1",
          reportType: "tri_merge",
          targetBureau: "TransUnion",
          violationLabel: "Different balances across bureaus",
          violationType: "different_balances_across_bureaus",
          tradeline: {
            furnisherName: "Example Bank",
            maskedAccountIdentifier: "Account ending 4242",
          },
          reportedFacts: {
            targetBureauFactLabel: "balance",
            targetBureauReportedValue: "$4,812",
          },
          conflictFacts: {
            conflictSummary:
              "Experian reports $0; TransUnion reports $4,812",
          },
          evidenceSummary: "Uploaded tri-merge report excerpt",
        },
      ],
    };

    expect(getSteppedCursiveState(uploadState, "next").currentStep).toBe(
      "review",
    );
    expect(
      renderShell({ ...uploadState, currentStep: "review" }),
    ).toContain("Review confirmed issues");
  });

  it("renders single-bureau uploaded-report proof facts without conflict facts", () => {
    const markup = renderShell({
      ...EMPTY_STATE,
      confirmedUploadIssueIds: ["issue-single-bureau-proof-1"],
      currentStep: "issues",
      mode: "analyze_uploaded_report",
      reportType: "single_bureau",
      uploadId: "upload-1",
      uploadIssues: [
        {
          id: "issue-single-bureau-proof-1",
          reportType: "single_bureau",
          targetBureau: "Experian",
          violationLabel: "Closed account reported as open",
          violationType: "closed_account_reported_as_open",
          tradeline: {
            furnisherName: "Example Bank",
            maskedAccountIdentifier: "Account ending 4242",
          },
          reportedFacts: {
            targetBureauFactLabel: "reported inaccurate information",
            targetBureauReportedValue: "closed account reported as open",
          },
          proofFacts: {
            proofSummary: "account closure letter dated May 1, 2026",
            reportedInaccurateInformation: "closed account reported as open",
          },
          evidenceSummary: "Uploaded single-bureau report excerpt",
        },
      ],
    });

    expect(markup).toContain("Closed account reported as open");
    expect(markup).toContain("closed account reported as open");
    expect(markup).toContain("account closure letter dated May 1, 2026");
  });

  it("moves the selected manual violation into details and review steps", () => {
    const selected: CursiveWorkflowState = {
      ...EMPTY_STATE,
      currentStep: "violation",
      evidencePosture: "cross_bureau_inconsistency",
      mode: "manual_dispute",
      violationType: "different_balances_across_bureaus",
    };

    expect(getSteppedCursiveState(selected, "next").currentStep).toBe("details");
    expect(
      getSteppedCursiveState(
        { ...selected, currentStep: "details" },
        "next",
      ).currentStep,
    ).toBe("review");
  });

  it("builds the v2 bureau-removal-demand payload from manual details", () => {
    const payload = buildBureauRemovalDemandInput({
      ...EMPTY_STATE,
      currentStep: "review",
      details: {
        ...EMPTY_DETAILS,
        bureauName: "TransUnion",
        conflictSummary:
          "Experian reports a $0 balance while TransUnion reports $4,812.",
        consumerAddress: "123 Main Street\nDallas, TX 75001",
        consumerName: "Jane Doe",
        evidenceSummary: "Tri-merge report excerpt dated May 1, 2026",
        furnisherName: "Example Bank",
        maskedAccountIdentifier: "Account ending 1234",
        reportedFactLabel: "balance",
        targetBureauReportedValue: "$4,812",
      },
      evidencePosture: "cross_bureau_inconsistency",
      mode: "manual_dispute",
      violationType: "different_balances_across_bureaus",
    });

    expect(payload).toMatchObject({
      bureau: {
        name: "TransUnion",
      },
      doctrine: "documented_inconsistency",
      statuteMappingId: "cra_cross_bureau_inconsistency",
      tradeline: {
        furnisherName: "Example Bank",
      },
      violationType: "different_balances_across_bureaus",
    });
    expect(payload.conflictFacts?.conflictSummary).toContain(
      "Experian reports a $0 balance",
    );
  });

  it("keeps required detail validation local before generation", () => {
    expect(
      getCursiveDetailErrors({
        ...EMPTY_STATE,
        currentStep: "details",
        evidencePosture: "cross_bureau_inconsistency",
        mode: "manual_dispute",
        violationType: "different_balances_across_bureaus",
      }),
    ).toContain("consumer name");
  });
});

describe("getLowTimeNudgeThreshold", () => {
  it("returns null while the session is inactive, regardless of remaining time", () => {
    expect(getLowTimeNudgeThreshold(500, false)).toBeNull();
    expect(getLowTimeNudgeThreshold(0, false)).toBeNull();
  });

  it("returns null above the 10-minute threshold", () => {
    expect(getLowTimeNudgeThreshold(601, true)).toBeNull();
  });

  it("crosses into the 10-minute threshold at and below 600 seconds", () => {
    expect(getLowTimeNudgeThreshold(600, true)).toBe("ten_minute");
    expect(getLowTimeNudgeThreshold(300, true)).toBe("ten_minute");
  });

  it("crosses into the 2-minute threshold at and below 120 seconds", () => {
    expect(getLowTimeNudgeThreshold(120, true)).toBe("two_minute");
    expect(getLowTimeNudgeThreshold(0, true)).toBe("two_minute");
  });

  it("resolves the more urgent threshold even if a tick skips past 10 minutes", () => {
    expect(getLowTimeNudgeThreshold(90, true)).toBe("two_minute");
  });
});

describe("generic chat workspace starter prompts", () => {
  const TUTOR_BOT = {
    id: "tutor",
    name: "Insight",
    description: "Guides the user step by step like a coach and explainer.",
    capabilities: {
      chat: true,
      citations: true,
      html_report: false,
      pdf_upload: false,
      rag_query: true,
      structured_form: false,
    },
  } as unknown as BotCatalogEntry;

  it("wires per-bot starter prompts into the generic DashboardShell chat surface for a non-Rori bot", () => {
    const starterPrompts = getStarterPromptsForBot(TUTOR_BOT.id);

    expect(starterPrompts).not.toHaveLength(0);

    const markup = renderToStaticMarkup(
      createElement(ChatPanel, {
        bot: TUTOR_BOT,
        conversationId: undefined,
        messages: [],
        onArtifactQueued: () => undefined,
        onConversationUpdate: () => undefined,
        sessionId: "session-1",
        sessionToken: "token-1",
        starterPrompts,
      }),
    );

    expect(markup).toContain("starter-prompt-grid");
    starterPrompts.forEach((prompt) => {
      expect(markup).toContain(prompt);
    });
  });

  it("falls back to no starter prompts for unknown or missing bot ids", () => {
    expect(getStarterPromptsForBot("unknown_bot_id")).toEqual([]);
    expect(getStarterPromptsForBot(undefined)).toEqual([]);
  });
});
