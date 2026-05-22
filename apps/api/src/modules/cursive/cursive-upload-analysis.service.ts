import type {
  CursiveReportType,
  CursiveViolationType,
} from "../../../../../packages/shared/src/contracts/cursive";
import type { BureauRemovalDemandTemplateInput } from "./templates/bureau-removal-demand.html";

export type CursiveUploadIssue = {
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

const BUREAU_NAMES = ["Experian", "Equifax", "TransUnion"] as const;

function extractText(fileBytes: Buffer) {
  return fileBytes.toString("utf8").replaceAll(/\r\n?/gu, "\n").trim();
}

function cleanPdfTextField(value: string) {
  return value
    .trim()
    .replace(/^\(/u, "")
    .replace(/\)\s*Tj\s*$/u, "")
    .replace(/\\([()\\])/gu, "$1")
    .trim();
}

function matchField(text: string, label: string) {
  const pattern = new RegExp(`${label}\\s*:\\s*([^|\\n\\r]+)`, "iu");
  const value = pattern.exec(text)?.[1] ?? "";
  return cleanPdfTextField(value);
}

function matchBureauBalance(text: string, bureauName: string) {
  const pattern = new RegExp(`${bureauName}\\s+balance\\s*:\\s*([^|\\n\\r]+)`, "iu");
  const value = pattern.exec(text)?.[1] ?? "";
  return cleanPdfTextField(value);
}

function normalizeBureauName(rawBureauName: string) {
  const normalizedName = rawBureauName.trim().toLowerCase();

  if (!normalizedName) {
    return "";
  }

  if (normalizedName.includes("equifax")) {
    return "Equifax";
  }

  if (normalizedName.includes("transunion") || normalizedName.includes("trans union")) {
    return "TransUnion";
  }

  if (normalizedName.includes("experian")) {
    return "Experian";
  }

  return "";
}

function getSingleBureauViolation(input: string): {
  label: string;
  type: CursiveViolationType;
} | null {
  const normalizedInput = input.toLowerCase();

  if (normalizedInput.includes("closed") && normalizedInput.includes("open")) {
    return {
      label: "Closed account reported as open",
      type: "closed_account_reported_as_open",
    };
  }

  return null;
}

function consumerAddressLines(rawAddress: string) {
  return rawAddress
    .split(/;/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function analyzeCursiveUploadedReport(input: {
  fileBytes: Buffer;
  reportType: CursiveReportType;
}) {
  const text = extractText(input.fileBytes);
  const furnisherName = matchField(text, "Furnisher") || "Reported tradeline";
  const maskedAccountIdentifier = matchField(text, "Account") || undefined;
  const balances = BUREAU_NAMES.map((bureauName) => ({
    bureauName,
    reportedValue: matchBureauBalance(text, bureauName),
  })).filter((balance) => balance.reportedValue.length > 0);
  const uniqueBalances = new Set(
    balances.map((balance) => balance.reportedValue.toLowerCase()),
  );

  if (input.reportType === "single_bureau") {
    const reportedInaccurateInformation = matchField(
      text,
      "Reported inaccurate information",
    );
    const proofSummary = matchField(text, "Proof");

    if (!reportedInaccurateInformation || !proofSummary) {
      return [];
    }

    const targetBureau = normalizeBureauName(matchField(text, "Bureau"));

    if (!targetBureau) {
      return [];
    }

    const violation = getSingleBureauViolation(reportedInaccurateInformation);

    if (!violation) {
      return [];
    }

    return [
      {
        id: "issue-single-bureau-proof-1",
        reportType: input.reportType,
        targetBureau,
        violationLabel: violation.label,
        violationType: violation.type,
        tradeline: {
          furnisherName,
          maskedAccountIdentifier,
        },
        reportedFacts: {
          targetBureauFactLabel: "reported inaccurate information",
          targetBureauReportedValue: reportedInaccurateInformation,
        },
        proofFacts: {
          reportedInaccurateInformation,
          proofSummary,
        },
        evidenceSummary: "Uploaded single-bureau report excerpt",
      } satisfies CursiveUploadIssue,
    ];
  }

  if (balances.length < 2 || uniqueBalances.size < 2) {
    return [];
  }

  const target =
    balances.find((balance) => balance.bureauName === "TransUnion") ??
    balances[0];
  const conflictSummary = balances
    .map((balance) => `${balance.bureauName} reports ${balance.reportedValue}`)
    .join("; ");

  return [
    {
      id: "issue-balance-inconsistency-1",
      reportType: input.reportType,
      targetBureau: target.bureauName,
      violationLabel: "Different balances across bureaus",
      violationType: "different_balances_across_bureaus",
      tradeline: {
        furnisherName,
        maskedAccountIdentifier,
      },
      reportedFacts: {
        targetBureauFactLabel: "balance",
        targetBureauReportedValue: target.reportedValue,
      },
      conflictFacts: {
        conflictSummary,
      },
      evidenceSummary: "Uploaded tri-merge report excerpt",
    } satisfies CursiveUploadIssue,
  ];
}

export function buildRemovalDemandInputFromUploadIssue(input: {
  consumer: {
    fullName: string;
    mailingAddressLines: string[];
  };
  bureauAddressLines: string[];
  generatedDate: string;
  issue: CursiveUploadIssue;
}): BureauRemovalDemandTemplateInput {
  if (input.issue.reportType === "single_bureau") {
    return {
      consumer: input.consumer,
      bureau: {
        name: input.issue.targetBureau,
        mailingAddressLines: input.bureauAddressLines,
      },
      generatedDate: input.generatedDate,
      violationType: input.issue.violationType,
      violationLabel: input.issue.violationLabel,
      doctrine: "documented_inaccuracy_with_proof",
      tradeline: input.issue.tradeline,
      reportedFacts: input.issue.reportedFacts,
      proofFacts: {
        reportedInaccurateInformation:
          input.issue.proofFacts?.reportedInaccurateInformation ?? "",
        proofSummary: input.issue.proofFacts?.proofSummary ?? "",
      },
      evidenceSummary: input.issue.evidenceSummary,
      enclosureLabels: [input.issue.evidenceSummary],
      statuteMappingId: "cra_single_bureau_inaccuracy_with_proof",
    };
  }

  return {
    consumer: input.consumer,
    bureau: {
      name: input.issue.targetBureau,
      mailingAddressLines: input.bureauAddressLines,
    },
    generatedDate: input.generatedDate,
    violationType: input.issue.violationType,
    violationLabel: input.issue.violationLabel,
    doctrine: "documented_inconsistency",
    tradeline: input.issue.tradeline,
    reportedFacts: input.issue.reportedFacts,
    conflictFacts: {
      comparedBureauFacts: [],
      conflictSummary: input.issue.conflictFacts?.conflictSummary ?? "",
    },
    evidenceSummary: input.issue.evidenceSummary,
    enclosureLabels: [input.issue.evidenceSummary],
    statuteMappingId: "cra_cross_bureau_inconsistency",
  };
}

export function buildConsumerFromUploadText(input: {
  fallbackName: string;
  fallbackAddressLines: string[];
  fileBytes: Buffer;
}) {
  const text = extractText(input.fileBytes);
  const fullName = matchField(text, "Consumer") || input.fallbackName;
  const address = consumerAddressLines(matchField(text, "Address"));

  return {
    fullName,
    mailingAddressLines:
      address.length > 0 ? address : input.fallbackAddressLines,
  };
}
