export type CreditBureauDisputeTemplateInput = {
  consumerName: string;
  consumerAddressLines: string[];
  bureauName: string;
  bureauAddressLines: string[];
  subjectLine: string;
  salutation: string;
  bodyParagraphs: string[];
  closing: string;
  citations: string[];
  enclosures?: string[];
  generatedDate?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderLineGroup(lines: string[]) {
  return lines
    .filter((line) => line.trim().length > 0)
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join("");
}

function renderParagraphs(paragraphs: string[]) {
  return paragraphs
    .filter((paragraph) => paragraph.trim().length > 0)
    .map((paragraph) => `<p>${renderBodyParagraph(paragraph.trim())}</p>`)
    .join("");
}

function renderCitations(citations: string[]) {
  return citations
    .filter((citation) => citation.trim().length > 0)
    .map((citation) => `<li>${escapeHtml(citation)}</li>`)
    .join("");
}

function renderEnclosures(enclosures: string[]) {
  return enclosures
    .filter((enclosure) => enclosure.trim().length > 0)
    .map((enclosure) => `<li>${escapeHtml(enclosure)}</li>`)
    .join("");
}

function renderBodyParagraph(paragraph: string) {
  const safeSuperscriptPattern = /<sup>(\d{1,3})<\/sup>/g;
  const parts = paragraph.split(safeSuperscriptPattern);

  return parts
    .map((part, index) => {
      if (index % 2 === 1) {
        return `<sup>${part}</sup>`;
      }

      return escapeHtml(part);
    })
    .join("");
}

function renderPlainTextValue(value: string) {
  return value.replaceAll(/<[^>]+>/g, "").trim();
}

function getGeneratedDate(value?: string) {
  return (
    value ??
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date())
  );
}

function renderPlainTextParagraph(paragraph: string) {
  return paragraph
    .trim()
    .replaceAll(/<sup>(\d{1,3})<\/sup>/g, " [$1]")
    .replaceAll(/<[^>]+>/g, "");
}

function getPlainTextEnclosureLines(enclosures?: string[]) {
  return (enclosures ?? [])
    .map((enclosure) => renderPlainTextValue(enclosure))
    .filter((enclosure) => enclosure.length > 0);
}

export function renderCreditBureauDisputeHtml(
  input: CreditBureauDisputeTemplateInput,
) {
  const generatedDate = escapeHtml(getGeneratedDate(input.generatedDate));
  const enclosureItems = getPlainTextEnclosureLines(input.enclosures);
  const hasEnclosures = enclosureItems.length > 0;

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8" />',
    "  <title>Credit Bureau Dispute Letter</title>",
    "  <style>",
    "    @page { size: 8.5in 11in; margin: 0.72in 0.78in 0.78in; }",
    "    :root { color-scheme: light; }",
    "    * { box-sizing: border-box; }",
    '    body { margin: 0; font-family: "Times New Roman", Times, serif; color: #111111; background: #ffffff; font-size: 12pt; line-height: 1.52; }',
    "    .credit-bureau-dispute-letter { min-height: 9.5in; display: flex; flex-direction: column; }",
    "    .letter-date, .letter-address, .letter-salutation, .letter-closing { white-space: normal; }",
    "    .letter-date { margin-bottom: 0.42in; }",
    "    .letter-address { margin-bottom: 0.3in; }",
    "    .letter-address--consumer { margin-bottom: 0.26in; }",
    "    .letter-subject { margin-bottom: 0.26in; font-weight: bold; page-break-inside: avoid; }",
    "    .letter-salutation { margin-bottom: 0.24in; }",
    "    .letter-body { flex: 1; }",
    "    .letter-body p { margin: 0 0 0.2in; text-align: left; orphans: 3; widows: 3; }",
    "    .letter-closing { margin-top: 0.3in; }",
    "    .letter-signature { margin-top: 0.58in; }",
    "    .letter-supporting { border-top: 1px solid #d8dde5; margin-top: 0.44in; padding-top: 0.18in; break-inside: avoid; }",
    "    .letter-supporting + .letter-supporting { margin-top: 0.2in; }",
    "    .letter-supporting h2 { margin: 0 0 0.1in; font-size: 9.8pt; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; color: #343a40; }",
    "    .letter-supporting ol, .letter-supporting ul { margin: 0; padding-left: 0.22in; }",
    "    .letter-supporting li + li { margin-top: 0.06in; }",
    "    .letter-enclosures { font-size: 10.4pt; }",
    "    .letter-citations { font-size: 10pt; color: #1f2933; }",
    "  </style>",
    "</head>",
    "<body>",
    '  <main class="credit-bureau-dispute-letter">',
    `    <div class="letter-date">${generatedDate}</div>`,
    `    <section class="letter-address letter-address--consumer">${renderLineGroup(input.consumerAddressLines)}</section>`,
    `    <section class="letter-address">${renderLineGroup([input.bureauName, ...input.bureauAddressLines])}</section>`,
    `    <div class="letter-subject">${escapeHtml(input.subjectLine)}</div>`,
    `    <div class="letter-salutation">${escapeHtml(input.salutation)}</div>`,
    `    <section class="letter-body">${renderParagraphs(input.bodyParagraphs)}</section>`,
    '    <section class="letter-closing">',
    `      <div>${escapeHtml(input.closing)}</div>`,
    `      <div class="letter-signature">${escapeHtml(input.consumerName)}</div>`,
    "    </section>",
    ...(hasEnclosures
      ? [
          '    <section class="letter-supporting letter-enclosures">',
          "      <h2>Enclosures</h2>",
          `      <ul>${renderEnclosures(enclosureItems)}</ul>`,
          "    </section>",
        ]
      : []),
    '    <footer class="letter-supporting letter-citations">',
    "      <h2>Authorities</h2>",
    `      <ol>${renderCitations(input.citations)}</ol>`,
    "    </footer>",
    "  </main>",
    "</body>",
    "</html>",
  ].join("\n");
}

export function renderCreditBureauDisputePortalText(
  input: CreditBureauDisputeTemplateInput,
) {
  const enclosureLines = getPlainTextEnclosureLines(input.enclosures);
  const sections = [
    getGeneratedDate(input.generatedDate),
    ...input.consumerAddressLines
      .map(renderPlainTextValue)
      .filter((line) => line.length > 0),
    renderPlainTextValue(input.bureauName),
    ...input.bureauAddressLines
      .map(renderPlainTextValue)
      .filter((line) => line.length > 0),
    renderPlainTextValue(input.subjectLine),
    renderPlainTextValue(input.salutation),
    ...input.bodyParagraphs
      .map(renderPlainTextParagraph)
      .filter((paragraph) => paragraph.length > 0),
    renderPlainTextValue(input.closing),
    renderPlainTextValue(input.consumerName),
    ...(enclosureLines.length > 0
      ? ["Enclosures:", ...enclosureLines]
      : []),
    "Authorities:",
    ...input.citations
      .filter((citation) => citation.trim().length > 0)
      .map((citation, index) => `[${index + 1}] ${renderPlainTextValue(citation)}`),
  ];

  return sections.filter((section) => section.length > 0).join("\n\n");
}
