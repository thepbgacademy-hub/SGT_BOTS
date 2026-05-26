import type {
  TopSecretSourceBundle,
  TopSecretStatuteAnalysis,
} from "../../../../../packages/shared/src/contracts/top-secret";

const FEDERAL_USC_CITATION_PATTERN =
  /\b(?<title>\d+)\s+u\.?s\.?c\.?(?:\s*(?:§|sec(?:tion)?\.?|s\.?)\s*)?\s*(?<section>\d+[a-z0-9-]*(?:\([a-z0-9]+\))*)/giu;

const FEDERAL_CFR_CITATION_PATTERN =
  /\b(?<title>\d+)\s+c\.?f\.?r\.?\s+(?:(?:§|sec(?:tion)?\.?|s\.?)\s*)?(?<section>\d+(?:\.\d+)?[a-z0-9-]*(?:\([a-z0-9]+\))*)/giu;

type NormalizedLegalCitation = {
  citation: string;
  code: "C.F.R." | "U.S.C.";
  kind: "regulation" | "statute";
  section: string;
  title: string;
};

function normalizeSubsections(section: string) {
  return [...section.matchAll(/\(([a-z0-9]+)\)/giu)].map((match) => match[1]);
}

function normalizeCitation(
  match: RegExpExecArray,
  input?: {
    code?: "C.F.R." | "U.S.C.";
    kind?: "regulation" | "statute";
  },
): NormalizedLegalCitation | null {
  const groups = match.groups ?? {};
  const title = groups.title ?? "";
  const section = groups.section ?? "";
  const code = input?.code ?? "U.S.C.";
  const kind = input?.kind ?? "statute";

  if (!title || !section) {
    return null;
  }

  return {
    citation: `${title} ${code} Sec. ${section}`,
    code,
    kind,
    section,
    title,
  };
}

export function extractFederalStatuteCitations(message: string) {
  const citations = new Map<string, NormalizedLegalCitation>();

  for (const match of message.matchAll(FEDERAL_USC_CITATION_PATTERN)) {
    const citation = normalizeCitation(match as RegExpExecArray);

    if (citation) {
      citations.set(citation.citation, citation);
    }
  }

  return [...citations.values()];
}

function extractFederalRegulationCitations(message: string) {
  const citations = new Map<string, NormalizedLegalCitation>();

  for (const match of message.matchAll(FEDERAL_CFR_CITATION_PATTERN)) {
    const citation = normalizeCitation(match as RegExpExecArray, {
      code: "C.F.R.",
      kind: "regulation",
    });

    if (citation) {
      citations.set(citation.citation, citation);
    }
  }

  return [...citations.values()];
}

function getBaseSection(section: string) {
  return section.replace(/\(.+$/u, "");
}

function addLegalCitation(
  citations: Map<string, NormalizedLegalCitation>,
  citation: NormalizedLegalCitation,
) {
  const baseSection = getBaseSection(citation.section);
  const hasSubsections = normalizeSubsections(citation.section).length > 0;
  const relatedCitations = [...citations.values()].filter(
    (candidate) =>
      candidate.code === citation.code &&
      candidate.title === citation.title &&
      getBaseSection(candidate.section) === baseSection,
  );

  if (!hasSubsections && relatedCitations.length > 0) {
    return;
  }

  if (hasSubsections) {
    for (const relatedCitation of relatedCitations) {
      if (normalizeSubsections(relatedCitation.section).length === 0) {
        citations.delete(relatedCitation.citation);
      }
    }
  }

  citations.set(citation.citation, citation);
}

function findRetrievedSourceForCitation(input: {
  citation: NormalizedLegalCitation;
  sourceBundles?: TopSecretSourceBundle[];
}) {
  const baseSection = getBaseSection(input.citation.section);
  const sourceUrlPattern =
    input.citation.kind === "regulation"
      ? new RegExp(
          `/current/title-${input.citation.title}/section-${baseSection}(?:$|[/?#])`,
          "iu",
        )
      : new RegExp(
          `(?:/uscode/text/${input.citation.title}/${baseSection}(?:$|[/?#])|granuleid:USC-prelim-title${input.citation.title}-section${baseSection})`,
          "iu",
        );

  return input.sourceBundles?.find((source) => {
    const sourceText = [
      source.title,
      source.url,
      ...source.detectedCitations,
    ].join("\n");

    return (
      source.currentnessStatus !== "not_verified" &&
      (sourceUrlPattern.test(source.url) ||
        sourceText.includes(
          `${input.citation.title} ${input.citation.code} Sec. ${baseSection}`,
        ))
    );
  });
}

function hasCourtCaseSource(sourceBundles?: TopSecretSourceBundle[]) {
  return (sourceBundles ?? []).some(
    (source) =>
      source.sourceType === "court_case" &&
      source.currentnessStatus !== "not_verified" &&
      !isCourtSearchLead(source.url),
  );
}

function isCourtSearchLead(url: string) {
  try {
    const parsedUrl = new URL(url);

    return (
      /(?:^|\.)courtlistener\.com$/iu.test(parsedUrl.hostname) &&
      parsedUrl.pathname === "/" &&
      parsedUrl.searchParams.has("q")
    );
  } catch {
    return false;
  }
}

export function buildTopSecretStatuteAnalyses(input: {
  message: string;
  discoveredCitations?: string[];
  sourceBundles?: TopSecretSourceBundle[];
  accessDate?: string;
}): TopSecretStatuteAnalysis[] {
  const citations = new Map<string, NormalizedLegalCitation>();

  for (const citation of [
    ...extractFederalStatuteCitations(input.message),
    ...extractFederalRegulationCitations(input.message),
  ]) {
    addLegalCitation(citations, citation);
  }

  for (const discoveredCitation of input.discoveredCitations ?? []) {
    for (const citation of [
      ...extractFederalStatuteCitations(discoveredCitation),
      ...extractFederalRegulationCitations(discoveredCitation),
    ]) {
      addLegalCitation(citations, citation);
    }
  }

  return [...citations.values()].map((citation) => {
    const baseSection = getBaseSection(citation.section);
    const subsections = normalizeSubsections(citation.section);
    const retrievedSource = findRetrievedSourceForCitation({
      citation,
      sourceBundles: input.sourceBundles,
    });
    const currentnessStatus = retrievedSource
      ? retrievedSource.currentnessStatus
      : "not_verified";
    const courtCaseSourceRetained = hasCourtCaseSource(input.sourceBundles);
    const accessDate =
      input.accessDate ?? new Date().toISOString().slice(0, "YYYY-MM-DD".length);
    const hierarchy =
      subsections.length > 0
        ? `title ${citation.title}, section ${baseSection}, ${subsections
            .map((part, index) =>
              index === 0
                ? `subsection (${part})`
                : index === 1
                  ? `paragraph (${part})`
                  : `subparagraph (${part})`,
            )
            .join(", ")}`
        : `title ${citation.title}, section ${citation.section}`;

    return {
      applicabilityAnalysis: [
        "Identify who or what the statute applies to before applying it to the pasted message.",
        "Check whether the rule uses conjunctive thresholds such as and, or disjunctive thresholds such as or.",
        "Do not assume a quoted subsection applies to the user until scope, definitions, and exceptions are checked.",
      ],
      canonsApplied: [
        "Plain meaning: start with the text itself before outside commentary.",
        "Whole-act rule: read the cited subsection with the surrounding statute.",
        "Surplusage canon: avoid reading words as meaningless.",
        "Consistent usage: repeated terms should usually carry the same meaning unless the statute says otherwise.",
      ],
      citation: citation.citation,
      consistencyChecks: [
        "If an interpretation creates conflict with another subsection, reconsider it.",
        "Avoid interpretations that make parts of the statute ineffective or absurd.",
        "Consider the statute's purpose only after the text and structure are reviewed.",
      ],
      crossReferences: [
        "Stop at each cross-reference and read the referenced provision.",
        "Check whether another subsection expands, limits, or conditions this citation.",
        "Build a map of related sections before reaching a final conclusion.",
      ],
      currentnessStatus,
      currentnessVerification: {
        amendmentsChecked: retrievedSource
          ? currentnessStatus === "verified_current"
            ? "Partially checked; an official current source endpoint was retrieved, but recent amendments and source notes should still be reviewed by the reader."
            : "Partially verified; an authoritative source page was retrieved, but recent public laws, bills, registers, and rulemaking have not been fully checked."
          : "Not verified; retrieval adapter has not checked recent public laws, bills, registers, or rulemaking yet.",
        citation: citation.citation,
        codificationChecked: retrievedSource
          ? currentnessStatus === "verified_current"
            ? `Verified against official current source: ${retrievedSource.url}`
            : `Partially verified against retrieved authoritative source: ${retrievedSource.url}`
          : "Not verified; codified source must be checked against official or authoritative text.",
        effectiveDate: "Not verified.",
        implementingRegulationsChecked: "Not verified; implementing regulations and agency guidance must be identified.",
        interpretiveCasesGuidanceChecked: courtCaseSourceRetained
          ? "Partially checked against retained court-case source; binding status, jurisdiction, and later treatment are not fully verified."
          : "Not verified; binding cases, agency decisions, and guidance must be checked.",
        jurisdiction: "United States federal law",
        limits:
          "This is a preliminary statute-reading scaffold. Do not treat it as a verified statement of current law until official sources, regulations, amendments, and interpretations are checked.",
        officialSourceChecked: retrievedSource
          ? `${retrievedSource.publisher}: ${retrievedSource.title} (${retrievedSource.url})`
          : "Not checked by runtime retrieval yet.",
        repealSunsetChecked: "Not verified; repeal, sunset, delayed operative date, and savings clauses must be checked.",
        sourceCurrencyDate: retrievedSource
          ? currentnessStatus === "verified_current"
            ? `Retrieved by runtime on ${accessDate} from an official current source endpoint; page-level currency date still should be confirmed by the reader.`
            : `Retrieved by runtime on ${accessDate}; page-level currency date not independently extracted.`
          : "Not verified.",
        verificationStatus: currentnessStatus,
      },
      definitionsToCheck: [
        "Find the statute's definitions section before applying ordinary meanings.",
        "Check whether key terms use means, includes, or cross-referenced definitions.",
        "Watch for definitions that incorporate other statutes, regulations, or standards.",
      ],
      enforcementAnalysis: [
        "Identify the enforcing agency or court mechanism.",
        "Check enforcement guidance, enforcement history, penalties, cure periods, and private-right-of-action issues where relevant.",
        "Do not assume two similar statutes carry the same practical risk without checking enforcement.",
      ],
      exemptionsAndPreemption: [
        "Check entity exemptions and data/activity-specific exemptions separately.",
        "Check whether federal sector laws preempt or modify state-law analysis.",
        "Check delayed application dates separately from permanent exemptions.",
      ],
      legalHierarchy: [
        citation.kind === "regulation"
          ? "Regulation: agency rule implementing statutory authority and often containing operational details."
          : "Statute: enacted by Congress and provides the legal framework.",
        "Regulation: agency rule implementing statutory authority and often containing operational details.",
        "Rule or court rule: procedural or administrative requirement that may affect application.",
        "Read the statute and implementing regulations together before drawing conclusions.",
      ],
      notableAbsences: [
        "Check whether the statute says nothing about a claimed remedy, safe harbor, or private right of action.",
        "Note what the statute leaves to agency discretion.",
        "Do not fill statutory silence with internet claims.",
      ],
      operatorWordsToParse: [
        "Shall means mandatory.",
        "May means permissive.",
        "And means all listed elements are generally required.",
        "Or means any listed element may be sufficient.",
        "Unless, except, subject to, and notwithstanding can change the result.",
        "Means is usually exhaustive; includes may be illustrative.",
      ],
      pastedMessage: input.message,
      plainEnglishSummary:
        `${citation.citation} is a federal ${citation.kind} citation. Read it by hierarchy as ${hierarchy}. The citation alone does not prove the pasted message; the exact words, definitions, exceptions, and cross-references control what it means.`,
      regulatoryEcosystem: [
        "Identify the agency responsible for implementation or enforcement.",
        "Check agency regulations, FAQs, enforcement manuals, interpretive letters, and practical guidance.",
        "Agency guidance can explain enforcement but should not override statute or regulation.",
      ],
      requirementTypes: [
        "Separate disclosure requirements from operational requirements.",
        "Separate technical requirements from UI/design requirements.",
        "Do not turn operational duties into document-language requirements unless the statute actually requires disclosure.",
      ],
      structureFirst: [
        "Browse the surrounding title, chapter, subchapter, and section organization before isolating one sentence.",
        "Locate definitions, scope, exceptions, remedies, and enforcement sections.",
        "Understand where the cited provision sits in the larger statutory scheme.",
      ],
      verificationPath: [
        "Find the official or authoritative codified text.",
        "Record source currency, effective date, and access date.",
        "Check amendments, repeal, sunset, renumbering, and pending changes.",
        "Identify implementing regulations and agency materials.",
        "Check court decisions or agency adjudications interpreting the provision.",
        "Only then state whether the pasted message is true, misunderstood, false, or not supported.",
      ],
      whyMessageMayBeMisunderstood:
        `The pasted message says: "${input.message}" That message has to be compared to the statute's actual text instead of relying on a shortened internet explanation. A claim can be wrong or misunderstood when it quotes a real statute but skips definitions, exceptions, or another subsection that changes the result.`,
      readingChecklist: [
        "Confirm the current codified text from an official or authoritative source before relying on it.",
        "Read the definitions section and any incorporated definitions.",
        "Parse operator words such as shall, may, and, or, unless, except, and subject to.",
        "Follow cross-references to nearby subsections, implementing regulations, and agency guidance.",
        "Check effective dates, amendment notes, repeal or sunset notes, and cases interpreting the citation.",
      ],
    };
  });
}
