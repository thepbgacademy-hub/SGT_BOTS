import {
  CursiveViolationTypeSchema,
  type CursiveViolationType,
} from "../../../../../../packages/shared/src/contracts/cursive";

export type BureauRemovalDemandDoctrine =
  | "documented_inconsistency"
  | "documented_inaccuracy_with_proof"
  | "unresolved_inconsistency_after_verification";

export type BureauRemovalDemandStatuteMappingId =
  | "cra_cross_bureau_inconsistency"
  | "cra_unresolved_inconsistency_after_verification"
  | "cra_single_bureau_inaccuracy_with_proof";

export type BureauRemovalDemandTemplateInput = {
  consumer: {
    fullName: string;
    mailingAddressLines: string[];
  };
  bureau: {
    name: string;
    mailingAddressLines: string[];
  };
  generatedDate: string;
  violationType: CursiveViolationType;
  violationLabel: string;
  doctrine: BureauRemovalDemandDoctrine;
  tradeline: {
    furnisherName: string;
    maskedAccountIdentifier?: string;
  };
  reportedFacts: {
    targetBureauFactLabel: string;
    targetBureauReportedValue: string;
  };
  conflictFacts?: {
    comparedBureauFacts: Array<{
      bureauName: string;
      reportedValue: string;
    }>;
    conflictSummary: string;
  };
  proofFacts?: {
    reportedInaccurateInformation: string;
    proofSummary: string;
  };
  priorVerification?: {
    respondingBureauName: string;
    responseDate: string;
    remainingIssueSummary: string;
  };
  evidenceSummary: string;
  enclosureLabels: string[];
  statuteMappingId: BureauRemovalDemandStatuteMappingId;
};

const CROSS_BUREAU_VIOLATIONS = new Set<CursiveViolationType>([
  "different_balances_across_bureaus",
  "different_delinquency_dates_across_bureaus",
  "incorrect_account_number_across_bureaus",
  "incorrect_creditor_name_across_bureaus",
  "incorrect_payment_status_across_bureaus",
  "open_closed_status_conflict_across_bureaus",
]);

const APPROVED_DOCTRINES = new Set<string>([
  "documented_inconsistency",
  "documented_inaccuracy_with_proof",
  "unresolved_inconsistency_after_verification",
]);

const FORBIDDEN_PATTERNS = [
  /verify this account/iu,
  /correct if needed/iu,
  /validate this debt/iu,
  /compare (?:notes|records) with/iu,
  /which bureau is (?:right|correct)/iu,
  /\bcorrect account number\b/iu,
  /\bcorrect furnisher name\b/iu,
  /\bcorrect payment status\b/iu,
];

const STATUTE_AUTHORITIES: Record<
  BureauRemovalDemandStatuteMappingId,
  string[]
> = {
  cra_cross_bureau_inconsistency: [
    "Fair Credit Reporting Act, 15 U.S.C. Sec. 1681e(b): requires consumer reporting agencies to follow reasonable procedures to assure maximum possible accuracy when preparing consumer reports.",
    "Fair Credit Reporting Act, 15 U.S.C. Sec. 1681i(a)(1)(A): applies when the completeness or accuracy of an item in a consumer's file is disputed by the consumer.",
    "Fair Credit Reporting Act, 15 U.S.C. Sec. 1681i(a)(5)(A)(i): requires prompt deletion or modification, as appropriate, after disputed information is found inaccurate, incomplete, or not confirmed through the statutory dispute process.",
    "Fair Credit Reporting Act, 15 U.S.C. Sec. 1681i(a)(5)(C): requires reasonable procedures designed to prevent deleted information from reappearing except as permitted by the statute.",
  ],
  cra_unresolved_inconsistency_after_verification: [
    "Fair Credit Reporting Act, 15 U.S.C. Sec. 1681e(b): requires consumer reporting agencies to follow reasonable procedures to assure maximum possible accuracy when preparing consumer reports.",
    "Fair Credit Reporting Act, 15 U.S.C. Sec. 1681i(a)(1)(A): applies when the completeness or accuracy of an item in a consumer's file is disputed by the consumer.",
    "Fair Credit Reporting Act, 15 U.S.C. Sec. 1681i(a)(5)(A)(i): requires prompt deletion or modification, as appropriate, after disputed information is found inaccurate, incomplete, or not confirmed through the statutory dispute process.",
    "Fair Credit Reporting Act, 15 U.S.C. Sec. 1681i(a)(5)(B)(i): restricts reinsertion of information deleted under Sec. 1681i(a)(5)(A) unless the furnisher certifies that the information is complete and accurate.",
    "Fair Credit Reporting Act, 15 U.S.C. Sec. 1681i(a)(5)(C): requires reasonable procedures designed to prevent deleted information from reappearing except as permitted by the statute.",
  ],
  cra_single_bureau_inaccuracy_with_proof: [
    "Fair Credit Reporting Act, 15 U.S.C. Sec. 1681e(b): requires consumer reporting agencies to follow reasonable procedures to assure maximum possible accuracy when preparing consumer reports.",
    "Fair Credit Reporting Act, 15 U.S.C. Sec. 1681i(a)(1)(A): applies when the completeness or accuracy of an item in a consumer's file is disputed by the consumer.",
    "Fair Credit Reporting Act, 15 U.S.C. Sec. 1681i(a)(5)(A)(i): requires prompt deletion or modification, as appropriate, after disputed information is found inaccurate, incomplete, or not confirmed through the statutory dispute process.",
    "Fair Credit Reporting Act, 15 U.S.C. Sec. 1681i(a)(5)(C): requires reasonable procedures designed to prevent deleted information from reappearing except as permitted by the statute.",
  ],
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripMarkup(value: string) {
  return value.replaceAll(/<[^>]+>/g, "").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    if (label === "conflict facts") {
      throw new Error("conflict facts are required");
    }

    throw new Error(`${label} is required`);
  }

  return value;
}

function requireStringArray(value: unknown, label: string) {
  if (!Array.isArray(value) || value.some((line) => typeof line !== "string")) {
    throw new Error(`${label} is required`);
  }

  return value;
}

function requireText(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required`);
  }
}

function requireLines(lines: unknown, label: string) {
  const checkedLines = requireStringArray(lines, label);

  if (checkedLines.filter((line) => line.trim().length > 0).length === 0) {
    throw new Error(`${label} is required`);
  }
}

function combinedUserVisibleText(input: BureauRemovalDemandTemplateInput) {
  return [
    input.consumer.fullName,
    ...input.consumer.mailingAddressLines,
    input.bureau.name,
    ...input.bureau.mailingAddressLines,
    input.generatedDate,
    input.violationLabel,
    input.tradeline.furnisherName,
    input.tradeline.maskedAccountIdentifier ?? "",
    input.reportedFacts.targetBureauFactLabel,
    input.reportedFacts.targetBureauReportedValue,
    input.conflictFacts?.conflictSummary ?? "",
    ...(input.conflictFacts?.comparedBureauFacts.flatMap((fact) => [
      fact.bureauName,
      fact.reportedValue,
    ]) ?? []),
    input.proofFacts?.reportedInaccurateInformation ?? "",
    input.proofFacts?.proofSummary ?? "",
    input.priorVerification?.respondingBureauName ?? "",
    input.priorVerification?.responseDate ?? "",
    input.priorVerification?.remainingIssueSummary ?? "",
    input.evidenceSummary,
    ...input.enclosureLabels,
  ].join("\n");
}

export function validateBureauRemovalDemandInput(
  input: BureauRemovalDemandTemplateInput,
) {
  const root = requireObject(input, "bureau removal-demand input");
  const consumer = requireObject(root.consumer, "consumer");
  const bureau = requireObject(root.bureau, "bureau");
  const tradeline = requireObject(root.tradeline, "tradeline");
  const reportedFacts = requireObject(root.reportedFacts, "reported facts");

  requireText(consumer.fullName, "consumer full name");
  requireLines(consumer.mailingAddressLines, "consumer mailing address");
  requireText(bureau.name, "bureau name");
  requireLines(bureau.mailingAddressLines, "bureau mailing address");
  requireText(input.generatedDate, "generated date");
  if (!CursiveViolationTypeSchema.safeParse(input.violationType).success) {
    throw new Error("approved violation type is required");
  }
  requireText(input.violationLabel, "violation label");
  if (!APPROVED_DOCTRINES.has(input.doctrine)) {
    throw new Error("approved doctrine is required");
  }
  requireText(tradeline.furnisherName, "furnisher name");
  requireText(reportedFacts.targetBureauFactLabel, "reported fact label");
  requireText(
    reportedFacts.targetBureauReportedValue,
    "target bureau reported value",
  );
  requireText(input.evidenceSummary, "evidence summary");
  requireStringArray(input.enclosureLabels, "enclosure labels");

  if (!STATUTE_AUTHORITIES[input.statuteMappingId]) {
    throw new Error("approved statute mapping is required");
  }

  const isCrossBureau = CROSS_BUREAU_VIOLATIONS.has(input.violationType);

  if (isCrossBureau) {
    const conflictFacts = requireObject(
      input.conflictFacts,
      "conflict facts",
    );
    requireStringArray(
      Array.isArray(conflictFacts.comparedBureauFacts)
        ? conflictFacts.comparedBureauFacts.map((fact) =>
            isRecord(fact)
              ? `${String(fact.bureauName ?? "")}:${String(
                  fact.reportedValue ?? "",
                )}`
              : fact,
          )
        : conflictFacts.comparedBureauFacts,
      "compared bureau facts",
    );

    if (!input.conflictFacts?.conflictSummary.trim()) {
      throw new Error("conflict facts are required");
    }

    if (
      input.doctrine === "documented_inaccuracy_with_proof" ||
      input.statuteMappingId === "cra_single_bureau_inaccuracy_with_proof"
    ) {
      throw new Error("doctrine and statute mapping must match violation type");
    }
  } else if (
    input.doctrine !== "documented_inaccuracy_with_proof" ||
    input.statuteMappingId !== "cra_single_bureau_inaccuracy_with_proof"
  ) {
    throw new Error("doctrine and statute mapping must match violation type");
  }

  if (
    input.doctrine === "documented_inconsistency" &&
    input.statuteMappingId !== "cra_cross_bureau_inconsistency"
  ) {
    throw new Error("doctrine and statute mapping must match violation type");
  }

  if (
    input.doctrine === "unresolved_inconsistency_after_verification" &&
    input.statuteMappingId !== "cra_unresolved_inconsistency_after_verification"
  ) {
    throw new Error("doctrine and statute mapping must match violation type");
  }

  if (input.doctrine === "documented_inaccuracy_with_proof") {
    requireObject(input.proofFacts, "proof facts");
    if (
      !input.proofFacts?.reportedInaccurateInformation.trim() ||
      !input.proofFacts?.proofSummary.trim()
    ) {
      throw new Error("proof facts are required");
    }
  }

  if (input.doctrine === "unresolved_inconsistency_after_verification") {
    requireObject(input.priorVerification, "prior verification facts");
    if (
      !input.priorVerification?.respondingBureauName.trim() ||
      !input.priorVerification.responseDate.trim() ||
      !input.priorVerification.remainingIssueSummary.trim()
    ) {
      throw new Error("prior verification facts are required");
    }
  }

  const visibleText = combinedUserVisibleText(input);

  if (FORBIDDEN_PATTERNS.some((pattern) => pattern.test(visibleText))) {
    throw new Error("forbidden bureau-removal-demand language");
  }

  return true;
}

function accountSuffix(input: BureauRemovalDemandTemplateInput) {
  return input.tradeline.maskedAccountIdentifier
    ? `, ${input.tradeline.maskedAccountIdentifier}`
    : "";
}

function subjectLine(input: BureauRemovalDemandTemplateInput) {
  return `Re: Demand for Removal of Inaccurate or Unreliable Reporting - ${input.tradeline.furnisherName}${accountSuffix(input)}`;
}

function openingParagraph(input: BureauRemovalDemandTemplateInput) {
  return `I am submitting this dispute directly to ${input.bureau.name} regarding the tradeline identified below. This letter disputes the completeness and accuracy of information appearing in my consumer file and is supported by the enclosed documentation. The disputed reporting is inaccurate or unreliable under the Fair Credit Reporting Act, including 15 U.S.C. Sec. 1681e(b) and 15 U.S.C. Sec. 1681i(a)(1)(A).`;
}

function tradelineBlock(input: BureauRemovalDemandTemplateInput) {
  return [
    `Disputed tradeline: ${input.tradeline.furnisherName}`,
    input.tradeline.maskedAccountIdentifier
      ? `Reported account identifier: ${input.tradeline.maskedAccountIdentifier}`
      : "",
    `Receiving bureau: ${input.bureau.name}`,
    `Violation type: ${input.violationLabel}`,
    `Evidence reviewed: ${input.evidenceSummary}`,
  ].filter((line) => line.length > 0);
}

function crossBureauParagraphs(input: BureauRemovalDemandTemplateInput) {
  return [
    `The disputed tradeline is being reported with inconsistent ${input.reportedFacts.targetBureauFactLabel} information across my consumer reports. ${input.bureau.name} reports ${input.reportedFacts.targetBureauFactLabel} as ${input.reportedFacts.targetBureauReportedValue}. The enclosed documentation shows that this same account is reported differently elsewhere: ${input.conflictFacts?.conflictSummary ?? ""}. This documented inconsistency makes the tradeline inaccurate or unreliable as reported by ${input.bureau.name}.`,
    `The inconsistency itself is the basis of this dispute. I am not asking ${input.bureau.name} to preserve the tradeline by changing it to match another bureau's version. Because ${input.bureau.name} is publishing this tradeline in my consumer file, ${input.bureau.name} remains responsible for the accuracy and reliability of the information it reports.`,
    `Based on the documented inconsistency described above, I demand that ${input.bureau.name} remove the disputed tradeline from my consumer file and provide written proof of deletion. Please also provide an updated copy of my ${input.bureau.name} consumer report showing that the disputed tradeline has been removed.`,
  ];
}

function unresolvedParagraphs(input: BureauRemovalDemandTemplateInput) {
  return [
    `The disputed tradeline remains inconsistent after prior notice. ${input.priorVerification?.respondingBureauName ?? ""} responded on ${input.priorVerification?.responseDate ?? ""}, yet the same unresolved conflict remains: ${input.priorVerification?.remainingIssueSummary ?? ""}. ${input.bureau.name} continues to publish the disputed tradeline with ${input.reportedFacts.targetBureauFactLabel} reported as ${input.reportedFacts.targetBureauReportedValue}, while the enclosed documentation shows the continuing inconsistency: ${input.conflictFacts?.conflictSummary ?? ""}.`,
    `The continued reporting of this conflict after prior notice makes the tradeline unreliable as it appears in my ${input.bureau.name} file. This dispute does not ask ${input.bureau.name} to choose between other bureaus' versions. The issue is that ${input.bureau.name} is publishing a tradeline that remains materially inconsistent and unsupported after notice.`,
    `Based on the unresolved inconsistency described above, I demand removal of the disputed tradeline from my ${input.bureau.name} consumer file and written proof of deletion. Please provide an updated ${input.bureau.name} consumer report showing that the disputed tradeline has been removed and apply reasonable procedures to prevent the deleted information from reappearing except as permitted by the Fair Credit Reporting Act.`,
  ];
}

function singleBureauParagraphs(input: BureauRemovalDemandTemplateInput) {
  return [
    `${input.bureau.name} is reporting inaccurate information for the disputed tradeline. The specific inaccurate information is: ${input.proofFacts?.reportedInaccurateInformation ?? ""} My supporting proof is: ${input.proofFacts?.proofSummary ?? ""} The enclosed documentation supports that the tradeline, as reported by ${input.bureau.name}, is inaccurate or unreliable.`,
    `This dispute is based on documented inaccuracy with proof. I am not providing replacement information for ${input.bureau.name} to repair or preserve the tradeline. The disputed reporting is inaccurate or unreliable as published and should be removed from my ${input.bureau.name} consumer file.`,
    `Based on the proof described above, I demand that ${input.bureau.name} remove the disputed tradeline from my consumer file and provide written proof of deletion. Please also provide an updated copy of my ${input.bureau.name} consumer report showing that the disputed tradeline has been removed.`,
  ];
}

function bodyParagraphs(input: BureauRemovalDemandTemplateInput) {
  if (input.doctrine === "unresolved_inconsistency_after_verification") {
    return [openingParagraph(input), ...unresolvedParagraphs(input)];
  }

  if (input.doctrine === "documented_inaccuracy_with_proof") {
    return [openingParagraph(input), ...singleBureauParagraphs(input)];
  }

  return [openingParagraph(input), ...crossBureauParagraphs(input)];
}

function renderLineGroup(lines: string[]) {
  return lines
    .filter((line) => line.trim().length > 0)
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join("");
}

function renderParagraphs(paragraphs: string[]) {
  return paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
}

function renderTradelineBlock(lines: string[]) {
  return `<dl>${lines
    .map((line) => {
      const [label, ...valueParts] = line.split(":");
      return `<div><dt>${escapeHtml(label ?? "")}</dt><dd>${escapeHtml(
        valueParts.join(":").trim(),
      )}</dd></div>`;
    })
    .join("")}</dl>`;
}

function renderList(items: string[]) {
  return items
    .filter((item) => item.trim().length > 0)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

export function renderBureauRemovalDemandHtml(
  input: BureauRemovalDemandTemplateInput,
) {
  validateBureauRemovalDemandInput(input);

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8" />',
    "  <title>Bureau Removal Demand Letter</title>",
    "  <style>",
    "    @page { size: 8.5in 11in; margin: 0.72in 0.78in 0.78in; }",
    "    :root { color-scheme: light; }",
    "    * { box-sizing: border-box; }",
    '    body { margin: 0; font-family: "Times New Roman", Times, serif; color: #111111; background: #ffffff; font-size: 12pt; line-height: 1.5; }',
    "    .bureau-removal-demand-letter { min-height: 9.5in; display: flex; flex-direction: column; }",
    "    .letter-date { margin-bottom: 0.36in; }",
    "    .letter-address { margin-bottom: 0.26in; }",
    "    .letter-subject { margin-bottom: 0.24in; font-weight: bold; page-break-inside: avoid; }",
    "    .letter-salutation { margin-bottom: 0.22in; }",
    "    .tradeline-summary { border: 1px solid #d8dde5; margin: 0 0 0.22in; padding: 0.12in 0.16in; break-inside: avoid; }",
    "    .tradeline-summary dl { margin: 0; }",
    "    .tradeline-summary div { display: grid; grid-template-columns: 1.8in 1fr; gap: 0.12in; }",
    "    .tradeline-summary dt { font-weight: bold; }",
    "    .tradeline-summary dd { margin: 0; }",
    "    .letter-body { flex: 1; }",
    "    .letter-body p { margin: 0 0 0.18in; text-align: left; orphans: 3; widows: 3; }",
    "    .letter-closing { margin-top: 0.26in; }",
    "    .letter-signature { margin-top: 0.54in; }",
    "    .letter-supporting { border-top: 1px solid #d8dde5; margin-top: 0.36in; padding-top: 0.16in; break-inside: avoid; }",
    "    .letter-supporting h2 { margin: 0 0 0.1in; font-size: 9.8pt; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; color: #343a40; }",
    "    .letter-supporting ol, .letter-supporting ul { margin: 0; padding-left: 0.22in; }",
    "    .letter-supporting li + li { margin-top: 0.06in; }",
    "    .letter-enclosures { font-size: 10.4pt; }",
    "    .letter-citations { font-size: 10pt; color: #1f2933; }",
    "  </style>",
    "</head>",
    "<body>",
    '  <main class="bureau-removal-demand-letter">',
    `    <section class="letter-address letter-address--consumer">${renderLineGroup([
      input.consumer.fullName,
      ...input.consumer.mailingAddressLines,
    ])}</section>`,
    `    <div class="letter-date">${escapeHtml(input.generatedDate)}</div>`,
    `    <section class="letter-address">${renderLineGroup([
      input.bureau.name,
      ...input.bureau.mailingAddressLines,
    ])}</section>`,
    `    <div class="letter-subject">${escapeHtml(subjectLine(input))}</div>`,
    '    <div class="letter-salutation">To Whom It May Concern:</div>',
    `    <section class="tradeline-summary">${renderTradelineBlock(
      tradelineBlock(input),
    )}</section>`,
    `    <section class="letter-body">${renderParagraphs(
      bodyParagraphs(input),
    )}</section>`,
    '    <section class="letter-closing">',
    "      <div>Respectfully,</div>",
    `      <div class="letter-signature">${escapeHtml(input.consumer.fullName)}</div>`,
    "    </section>",
    ...(input.enclosureLabels.length > 0
      ? [
          '    <section class="letter-supporting letter-enclosures">',
          "      <h2>Enclosures</h2>",
          `      <ul>${renderList(input.enclosureLabels)}</ul>`,
          "    </section>",
        ]
      : []),
    '    <footer class="letter-supporting letter-citations">',
    "      <h2>Authorities</h2>",
    `      <ol>${renderList(STATUTE_AUTHORITIES[input.statuteMappingId])}</ol>`,
    "    </footer>",
    "  </main>",
    "</body>",
    "</html>",
  ].join("\n");
}

function plainTextLines(input: BureauRemovalDemandTemplateInput) {
  validateBureauRemovalDemandInput(input);

  return [
    input.consumer.fullName,
    ...input.consumer.mailingAddressLines,
    input.generatedDate,
    input.bureau.name,
    ...input.bureau.mailingAddressLines,
    subjectLine(input),
    "To Whom It May Concern:",
    ...tradelineBlock(input),
    ...bodyParagraphs(input),
    "Respectfully,",
    input.consumer.fullName,
    ...(input.enclosureLabels.length > 0
      ? ["Enclosures:", ...input.enclosureLabels]
      : []),
    "Authorities:",
    ...STATUTE_AUTHORITIES[input.statuteMappingId].map(
      (authority, index) => `[${index + 1}] ${authority}`,
    ),
  ];
}

export function renderBureauRemovalDemandPortalText(
  input: BureauRemovalDemandTemplateInput,
) {
  return plainTextLines(input)
    .map(stripMarkup)
    .filter((line) => line.length > 0)
    .join("\n\n");
}
