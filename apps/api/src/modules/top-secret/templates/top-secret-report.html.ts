import type {
  TopSecretCitation,
  TopSecretClaimCheck,
  TopSecretFinding,
} from "../../../../../../packages/shared/src/contracts/top-secret";

export type TopSecretReportTemplateInput = {
  generatedDate: string;
  findings: TopSecretFinding[];
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatVerdict(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function explainVerdict(value: TopSecretFinding["verdict"]) {
  if (value === "not_enough_reliable_evidence") {
    return "Many people naturally look for confirmation of an interpretation they already believe. The reviewed sources did not show enough reliable support for the full message, so this finding does not confirm that interpretation.";
  }

  if (value === "partially_verified") {
    return "Some parts of the message were supported by reliable sources, but the full merits of what the message declared as fact were not verified. This helps separate a true fragment from a conclusion that may go further than the sources allow.";
  }

  if (value === "misunderstood") {
    return "The message appears to contain a real idea or source fragment, but the meaning changes when the surrounding law, definitions, conditions, or source context are read carefully.";
  }

  if (value === "false") {
    return "The reliable sources reviewed do not support the message as stated.";
  }

  return "The reliable sources reviewed support the message as stated.";
}

function renderCitations(citations: TopSecretCitation[]) {
  return citations
    .map(
      (citation) =>
        `<li>${escapeHtml(citation.publisher)}: <a href="${escapeHtml(
          citation.url,
        )}">${escapeHtml(citation.title)}</a></li>`,
    )
    .join("");
}

function formatCurrentnessStatus(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function renderHistoricalAuthorities(finding: TopSecretFinding) {
  if (!finding.historicalAuthorities?.length) {
    return "";
  }

  return `
      <div class="historical-authorities">
        <p><strong>Historical or secondary authority</strong></p>
        <p class="historical-note">This source may help identify a legal meaning or research path, but it does not by itself establish the controlling rule.</p>
        <ol>
          ${finding.historicalAuthorities
            .map(
              (authority) => `
            <li>
              <p><strong>${escapeHtml(authority.citationOrTitle)}</strong></p>
              <p>Type: ${escapeHtml(formatVerdict(authority.authorityType))} | Current application: ${escapeHtml(
                formatCurrentnessStatus(authority.currentApplicationStatus),
              )}</p>
              <p>${escapeHtml(authority.reportNote)}</p>
            </li>
          `,
            )
            .join("")}
        </ol>
      </div>
  `;
}

function renderResearchContextNotes(finding: TopSecretFinding) {
  if (!finding.researchContextNotes?.length) {
    return "";
  }

  return `
      <div class="research-context">
        <p><strong>Helpful context</strong></p>
        <ol>
          ${finding.researchContextNotes
            .map(
              (contextNote) => `
            <li>
              <p><strong>${escapeHtml(
                formatVerdict(contextNote.topic),
              )}</strong></p>
              <p>${escapeHtml(contextNote.note)}</p>
            </li>
          `,
            )
            .join("")}
        </ol>
      </div>
  `;
}

function renderSourceChecks(finding: TopSecretFinding) {
  if (!finding.sourceChecks?.length) {
    return "";
  }

  return `
      <div class="source-checks">
        <p><strong>Sources checked</strong></p>
        <ol>
          ${finding.sourceChecks
            .map(
              (source) => `
            <li>
              <p><a href="${escapeHtml(source.url)}">${escapeHtml(
                source.title,
              )}</a></p>
              <p>${escapeHtml(source.publisher)} | Currentness: ${escapeHtml(
                formatCurrentnessStatus(source.currentnessStatus),
              )}</p>
              <p>${escapeHtml(source.supportNote)}</p>
            </li>
          `,
            )
            .join("")}
        </ol>
      </div>
  `;
}

function renderClaimComponents(finding: TopSecretFinding) {
  if (!finding.claimComponents?.length) {
    return "";
  }

  return `
      <div class="claim-components">
        <p><strong>Parts of the message to check</strong></p>
        <ol>
          ${finding.claimComponents
            .map(
              (component) => `
            <li>
              <p><strong>${escapeHtml(component.label)}</strong></p>
              <p>${escapeHtml(component.summary)}</p>
            </li>
          `,
            )
            .join("")}
        </ol>
      </div>
  `;
}

function formatClaimCheckStatus(value: TopSecretClaimCheck["status"]) {
  switch (value) {
    case "supported":
      return "Supported";
    case "partially_supported":
      return "Supported in part";
    case "misunderstood":
      return "Misunderstood";
    case "overstated":
      return "Overstated";
    case "not_found_in_source":
      return "Not found in source";
  }
}

function renderClaimChecks(finding: TopSecretFinding) {
  if (!finding.claimChecks?.length) {
    return "";
  }

  return `
      <div class="claim-checks">
        <p><strong>Point-by-point check</strong></p>
        <ol>
          ${finding.claimChecks
            .map(
              (claimCheck) => `
            <li>
              <p><strong>${escapeHtml(claimCheck.assertion)}</strong></p>
              <p class="claim-check-status">${escapeHtml(
                formatClaimCheckStatus(claimCheck.status),
              )}</p>
              <p>${escapeHtml(claimCheck.explanation)}</p>
            </li>
          `,
            )
            .join("")}
        </ol>
      </div>
  `;
}

function renderList(title: string, items: string[]) {
  return `
    <div class="statute-list">
      <p><strong>${escapeHtml(title)}</strong></p>
      <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </div>
  `;
}

function renderCurrentnessVerification(
  analysis: NonNullable<TopSecretFinding["statuteAnalyses"]>[number],
) {
  const currentness = analysis.currentnessVerification;

  return `
    <div class="currentness-grid">
      <p><strong>Source status check</strong></p>
      <dl>
        <div><dt>Jurisdiction</dt><dd>${escapeHtml(currentness.jurisdiction)}</dd></div>
        <div><dt>Citation</dt><dd>${escapeHtml(currentness.citation)}</dd></div>
        <div><dt>Official source checked</dt><dd>${escapeHtml(currentness.officialSourceChecked)}</dd></div>
        <div><dt>Source currency/date</dt><dd>${escapeHtml(currentness.sourceCurrencyDate)}</dd></div>
        <div><dt>Effective date</dt><dd>${escapeHtml(currentness.effectiveDate)}</dd></div>
        <div><dt>Amendments checked</dt><dd>${escapeHtml(currentness.amendmentsChecked)}</dd></div>
        <div><dt>Repeal/sunset checked</dt><dd>${escapeHtml(currentness.repealSunsetChecked)}</dd></div>
        <div><dt>Codification checked</dt><dd>${escapeHtml(currentness.codificationChecked)}</dd></div>
        <div><dt>Implementing regulations checked</dt><dd>${escapeHtml(currentness.implementingRegulationsChecked)}</dd></div>
        <div><dt>Interpretive cases/guidance checked</dt><dd>${escapeHtml(currentness.interpretiveCasesGuidanceChecked)}</dd></div>
        <div><dt>Verification status</dt><dd>${escapeHtml(formatCurrentnessStatus(currentness.verificationStatus))}</dd></div>
        <div><dt>Limits</dt><dd>${escapeHtml(currentness.limits)}</dd></div>
      </dl>
    </div>
  `;
}

function renderStatuteAnalyses(finding: TopSecretFinding) {
  if (!finding.statuteAnalyses?.length) {
    return "";
  }

  return `
      <div class="statute-analyses">
        <p><strong>Reading the legal text</strong></p>
        ${finding.statuteAnalyses
          .map(
            (analysis) => `
          <section class="statute-analysis">
            <p><strong>${escapeHtml(analysis.citation)}</strong></p>
            <p class="statute-status">Currentness: ${escapeHtml(
              formatCurrentnessStatus(analysis.currentnessStatus),
            )}</p>
            <p><strong>Pasted message:</strong> ${escapeHtml(
              analysis.pastedMessage,
            )}</p>
            <p>${escapeHtml(analysis.plainEnglishSummary)}</p>
            <p><em>${escapeHtml(analysis.whyMessageMayBeMisunderstood)}</em></p>
            ${renderCurrentnessVerification(analysis)}
            ${renderList("Definitions to check", analysis.definitionsToCheck)}
            ${renderList("Operator words to parse", analysis.operatorWordsToParse)}
            ${renderList("Cross-references", analysis.crossReferences)}
            ${renderList("What the statute does not say", analysis.notableAbsences)}
            ${renderList("Consistency checks", analysis.consistencyChecks)}
            ${renderList("Verification path", analysis.verificationPath)}
          </section>
        `,
          )
          .join("")}
      </div>
  `;
}

function renderCommonSenseStatement(finding: TopSecretFinding) {
  if (!finding.commonSenseStatement) {
    return "";
  }

  return `
      <div class="plain-language">
        <p><strong>In plain language</strong></p>
        <p>${escapeHtml(stripMechanicalPrefix(finding.commonSenseStatement))}</p>
      </div>
  `;
}

function stripMechanicalPrefix(value: string) {
  return value
    .replace(/^(?:common sense|body|end)\s*:\s*/iu, "")
    .replace(/^conclusion\s*:\s*/iu, "")
    .trim();
}

function formatConclusion(value: string) {
  const conclusion = stripMechanicalPrefix(value);

  if (/^so for this message, the evidence points to this conclusion:/iu.test(conclusion)) {
    return conclusion;
  }

  return `So for this message, the evidence points to this conclusion: ${conclusion}`;
}

function renderFinding(finding: TopSecretFinding, index: number) {
  return `
    <article class="finding">
      <p class="finding-number">Message ${index + 1}</p>
      <h2><em><strong>The message says</strong></em></h2>
      <p class="claim-text">${escapeHtml(finding.claim)}</p>
      <div class="analysis">
        <p>${escapeHtml(finding.analysis)}</p>
      </div>
      ${renderClaimChecks(finding)}
      <p class="conclusion"><em>${escapeHtml(formatConclusion(finding.conclusion))}</em></p>
      <p class="verdict"><strong>Verdict:</strong> ${escapeHtml(
        formatVerdict(finding.verdict),
      )}</p>
      <p class="verdict-explanation">${escapeHtml(
        explainVerdict(finding.verdict),
      )}</p>
      <div class="citations">
        <p><strong>Sources used for this finding</strong></p>
        <ol>${renderCitations(finding.citations)}</ol>
      </div>
      ${renderClaimComponents(finding)}
      ${renderHistoricalAuthorities(finding)}
      ${renderResearchContextNotes(finding)}
      ${renderSourceChecks(finding)}
      ${renderStatuteAnalyses(finding)}
      ${renderCommonSenseStatement(finding)}
    </article>
  `;
}

export function renderTopSecretReportHtml(input: TopSecretReportTemplateInput) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Top Secret Fact Check Report</title>
    <style>
      @page {
        size: Letter portrait;
        margin: 0.62in;
      }

      * {
        box-sizing: border-box;
      }

      body {
        color: #17130b;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 11pt;
        line-height: 1.48;
        margin: 0;
      }

      header {
        border-bottom: 1px solid #9d7a25;
        margin-bottom: 22px;
        padding-bottom: 14px;
      }

      h1 {
        font-size: 20pt;
        letter-spacing: 0;
        margin: 0 0 8px;
      }

      h2 {
        font-size: 13pt;
        margin: 0 0 8px;
      }

      a {
        color: #61450b;
      }

      .meta,
      .finding-number,
      .note {
        color: #574a2d;
        font-family: Arial, sans-serif;
        font-size: 8.5pt;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .note {
        letter-spacing: 0;
        line-height: 1.4;
        text-transform: none;
      }

      .finding {
        break-inside: avoid;
        border: 1px solid #d3bd72;
        margin: 0 0 18px;
        padding: 16px 18px;
      }

      .finding-number {
        margin: 0 0 8px;
      }

      .claim-text {
        font-weight: 700;
        margin: 0 0 12px;
      }

      .analysis p {
        margin: 0 0 12px;
      }

      .conclusion {
        border-top: 1px solid #eadca7;
        margin: 12px 0 8px;
        padding-top: 10px;
      }

      .verdict {
        font-family: Arial, sans-serif;
        margin: 0 0 10px;
      }

      .verdict-explanation {
        border-left: 3px solid #d3bd72;
        color: #3b321e;
        font-family: Arial, sans-serif;
        font-size: 9.5pt;
        margin: 0 0 12px;
        padding-left: 10px;
      }

      .plain-language {
        border-top: 1px solid #eadca7;
        color: #2f2818;
        font-family: Arial, sans-serif;
        font-size: 9.5pt;
        margin: 12px 0 0;
        padding-top: 10px;
      }

      .plain-language p {
        margin: 0 0 5px;
      }

      .citations {
        font-family: Arial, sans-serif;
        font-size: 9pt;
      }

      .source-checks {
        border-top: 1px solid #eadca7;
        font-family: Arial, sans-serif;
        font-size: 9pt;
        margin-top: 10px;
        padding-top: 8px;
      }

      .claim-components {
        border-top: 1px solid #eadca7;
        font-family: Arial, sans-serif;
        font-size: 9.2pt;
        margin-top: 10px;
        padding-top: 8px;
      }

      .claim-checks {
        border-top: 1px solid #eadca7;
        font-family: Arial, sans-serif;
        font-size: 9.2pt;
        margin-top: 10px;
        padding-top: 8px;
      }

      .claim-checks p {
        margin: 0 0 4px;
      }

      .claim-checks ol {
        margin: 0;
        padding-left: 18px;
      }

      .claim-checks li {
        margin: 0 0 8px;
      }

      .claim-check-status {
        color: #3b321e;
        font-weight: 700;
      }

      .claim-components p {
        margin: 0 0 4px;
      }

      .claim-components ol {
        margin: 0;
        padding-left: 18px;
      }

      .claim-components li {
        margin: 0 0 8px;
      }

      .source-checks p {
        margin: 0 0 4px;
      }

      .source-checks ol {
        margin: 0;
        padding-left: 18px;
      }

      .source-checks li {
        margin: 0 0 8px;
      }

      .historical-authorities {
        border-top: 1px solid #eadca7;
        font-family: Arial, sans-serif;
        font-size: 9pt;
        margin-top: 10px;
        padding-top: 8px;
      }

      .historical-authorities p {
        margin: 0 0 4px;
      }

      .historical-authorities ol {
        margin: 0;
        padding-left: 18px;
      }

      .historical-authorities li {
        margin: 0 0 8px;
      }

      .historical-note {
        border-left: 3px solid #d3bd72;
        color: #3b321e;
        padding-left: 8px;
      }

      .research-context {
        border-top: 1px solid #eadca7;
        font-family: Arial, sans-serif;
        font-size: 9pt;
        margin-top: 10px;
        padding-top: 8px;
      }

      .research-context p {
        margin: 0 0 4px;
      }

      .research-context ol {
        margin: 0;
        padding-left: 18px;
      }

      .research-context li {
        margin: 0 0 8px;
      }

      .statute-analyses {
        border-top: 1px solid #eadca7;
        font-family: Arial, sans-serif;
        font-size: 9pt;
        margin-top: 12px;
        padding-top: 10px;
      }

      .statute-analysis {
        break-inside: avoid;
        margin-top: 8px;
      }

      .statute-analysis p {
        margin: 0 0 6px;
      }

      .statute-status {
        color: #574a2d;
      }

      .currentness-grid dl {
        display: grid;
        gap: 4px;
        margin: 4px 0 8px;
      }

      .currentness-grid div {
        display: grid;
        grid-template-columns: 1.1in 1fr;
        gap: 8px;
      }

      .currentness-grid dt {
        color: #574a2d;
        font-weight: 700;
      }

      .currentness-grid dd {
        margin: 0;
      }

      .statute-list {
        margin-top: 8px;
      }

      .statute-list p {
        margin-bottom: 3px;
      }

      .citations p {
        margin: 0 0 4px;
      }

      .citations ol {
        margin: 0;
        padding-left: 18px;
      }

      .citations li {
        margin: 0 0 5px;
      }
    </style>
  </head>
  <body>
    <header>
      <p class="meta">Top Secret Research Report</p>
      <h1>Claim Review</h1>
      <p class="note">Generated ${escapeHtml(
        input.generatedDate,
      )}. This report is neutral educational research and is not legal, tax, or financial advice.</p>
    </header>
    ${input.findings.map(renderFinding).join("\n")}
  </body>
</html>`;
}
