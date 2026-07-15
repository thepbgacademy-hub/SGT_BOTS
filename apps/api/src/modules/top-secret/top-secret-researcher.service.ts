import type {
  TopSecretCitation,
  TopSecretSourceBundle,
  TopSecretSourceType,
} from "../../../../../packages/shared/src/contracts/top-secret";
import { extractFederalStatuteCitations } from "./top-secret-statute-analysis.service";
import { isCursiveCreditReportDomainClaim } from "./top-secret-boundary.service";

const AUTHORITATIVE_HOST_PATTERNS = [
  /(?:^|\.)law\.cornell\.edu$/iu,
  /(?:^|\.)irs\.gov$/iu,
  /(?:^|\.)treasury\.gov$/iu,
  /(?:^|\.)treasurydirect\.gov$/iu,
  /(?:^|\.)ssa\.gov$/iu,
  /(?:^|\.)federalreserve\.gov$/iu,
  /(?:^|\.)uscode\.house\.gov$/iu,
  /(?:^|\.)federalregister\.gov$/iu,
  /(?:^|\.)ecfr\.gov$/iu,
  /(?:^|\.)govinfo\.gov$/iu,
  /(?:^|\.)congress\.gov$/iu,
  /(?:^|\.)uscourts\.gov$/iu,
  /(?:^|\.)supreme\.justia\.com$/iu,
  /(?:^|\.)courtlistener\.com$/iu,
];

const STUB_AUTHORITY_SOURCES: Array<Omit<TopSecretSourceBundle, "detectedCitations" | "id">> = [
  {
    currentnessStatus: "not_verified",
    publisher: "Legal Information Institute",
    retrievedText:
      "26 U.S.C. Sec. 61 defines gross income broadly. Runtime retrieval has not yet verified current source currency.",
    sourceType: "statute",
    title: "26 U.S.C. Sec. 61 - Gross income defined",
    url: "https://www.law.cornell.edu/uscode/text/26/61",
  },
  {
    currentnessStatus: "not_verified",
    publisher: "Internal Revenue Service",
    retrievedText:
      "IRS Publication 17 explains individual federal income tax filing and reporting duties. Runtime retrieval has not yet verified current source currency.",
    sourceType: "official_explainer",
    title: "IRS Publication 17 - Your Federal Income Tax",
    url: "https://www.irs.gov/publications/p17",
  },
  {
    currentnessStatus: "not_verified",
    publisher: "U.S. Treasury",
    retrievedText:
      "TreasuryDirect explains marketable Treasury securities. Runtime retrieval has not yet verified current source currency.",
    sourceType: "official_explainer",
    title: "TreasuryDirect - Treasury securities overview",
    url: "https://www.treasurydirect.gov/marketable-securities/",
  },
  {
    currentnessStatus: "not_verified",
    publisher: "Social Security Administration",
    retrievedText:
      "The Social Security Administration publishes the Social Security Act and program guidance. Runtime retrieval has not yet verified current source currency.",
    sourceType: "statute",
    title: "Social Security Act",
    url: "https://www.ssa.gov/OP_Home/ssact/ssact.htm",
  },
];

type CandidateSourceDescriptor = {
  publisher: string;
  sourceType: TopSecretSourceType;
  title: string;
  url: string;
};

const DEFAULT_CANDIDATES: CandidateSourceDescriptor[] = [
  {
    publisher: "Internal Revenue Service",
    sourceType: "official_explainer",
    title: "IRS Publication 17 - Your Federal Income Tax",
    url: "https://www.irs.gov/publications/p17",
  },
  {
    publisher: "U.S. Treasury",
    sourceType: "official_explainer",
    title: "TreasuryDirect - Treasury securities overview",
    url: "https://www.treasurydirect.gov/marketable-securities/",
  },
  {
    publisher: "Social Security Administration",
    sourceType: "statute",
    title: "Social Security Act",
    url: "https://www.ssa.gov/OP_Home/ssact/ssact.htm",
  },
];
const DEFAULT_RETRIEVAL_TIMEOUT_MS = 2500;

export function createTopSecretStubSourceBundles(): TopSecretSourceBundle[] {
  return STUB_AUTHORITY_SOURCES.map((source, index) => ({
    ...source,
    detectedCitations: extractTopSecretLegalCitations(
      `${source.title}\n${source.retrievedText}`,
    ),
    id: `source-${index + 1}`,
  }));
}

function getHost(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function isAuthoritativeTopSecretSourceUrl(url: string) {
  const host = getHost(url);

  return AUTHORITATIVE_HOST_PATTERNS.some((pattern) => pattern.test(host));
}

function dedupeCandidates(candidates: CandidateSourceDescriptor[]) {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    const key = candidate.url.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}

function sectionPathFromFederalStatute(section: string) {
  return section.match(/^[\w-]+/u)?.[0] ?? section;
}

function officialUscUrl(input: { section: string; title: string }) {
  return `https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title${input.title}-section${sectionPathFromFederalStatute(input.section)}&num=0&edition=prelim`;
}

function extractFederalRegulationCitations(message: string) {
  const citations = new Map<
    string,
    {
      citation: string;
      section: string;
      title: string;
    }
  >();

  for (const match of message.matchAll(
    /\b(?<title>\d+)\s+c\.?f\.?r\.?\s+(?:(?:§|sec(?:tion)?\.?|s\.?)\s*)?(?<section>\d+(?:\.\d+)?[a-z0-9-]*(?:\([a-z0-9]+\))*)/giu,
  )) {
    const title = match.groups?.title ?? "";
    const section = match.groups?.section ?? "";

    if (!title || !section) {
      continue;
    }

    const citation = `${title} C.F.R. Sec. ${section}`;
    citations.set(citation, {
      citation,
      section,
      title,
    });
  }

  return [...citations.values()];
}

function extractFederalRegulationPartCitations(message: string) {
  const citations = new Map<
    string,
    {
      citation: string;
      part: string;
      title: string;
      url: string;
    }
  >();

  for (const match of message.matchAll(
    /\b(?<title>\d+)\s+c\.?f\.?r\.?\s+parts?\s+(?<parts>\d+(?:\s*(?:,|and)\s*\d+)*)/giu,
  )) {
    const title = match.groups?.title ?? "";
    const parts = match.groups?.parts ?? "";

    if (!title || !parts) {
      continue;
    }

    for (const part of parts
      .split(/\s*(?:,|and)\s*/iu)
      .map((value) => value.trim())
      .filter(Boolean)) {
      const citation = `${title} C.F.R. Part ${part}`;
      citations.set(citation, {
        citation,
        part,
        title,
        url: `https://www.ecfr.gov/current/title-${title}/part-${part}`,
      });
    }
  }

  return [...citations.values()];
}

function extractTopSecretLegalCitations(message: string) {
  return [
    ...extractFederalStatuteCitations(message).map((citation) => citation.citation),
    ...extractFederalRegulationCitations(message).map(
      (citation) => citation.citation,
    ),
    ...extractFederalRegulationPartCitations(message).map(
      (citation) => citation.citation,
    ),
  ];
}

function sectionPathFromFederalRegulation(section: string) {
  return section.match(/^[\d.]+[a-z0-9-]*/iu)?.[0] ?? section;
}

export function buildTopSecretCandidateSourceDescriptors(
  claim: string,
): CandidateSourceDescriptor[] {
  const lowerClaim = claim.toLowerCase();
  const candidates: CandidateSourceDescriptor[] = [];
  const explicitFederalStatutes = extractFederalStatuteCitations(claim);
  const explicitFederalRegulations = extractFederalRegulationCitations(claim);
  const explicitFederalRegulationParts =
    extractFederalRegulationPartCitations(claim);

  if (isCursiveCreditReportDomainClaim(claim)) {
    return [];
  }

  for (const citation of explicitFederalStatutes) {
    const sectionPath = sectionPathFromFederalStatute(citation.section);

    candidates.push(
      {
        publisher: "Office of the Law Revision Counsel",
        sourceType: "statute",
        title: `${citation.title} U.S.C. Sec. ${citation.section} - Official current U.S. Code`,
        url: officialUscUrl({
          section: citation.section,
          title: citation.title,
        }),
      },
      {
        publisher: "Legal Information Institute",
        sourceType: "statute",
        title: `${citation.title} U.S.C. Sec. ${citation.section}`,
        url: `https://www.law.cornell.edu/uscode/text/${citation.title}/${sectionPath}`,
      },
    );
  }

  for (const citation of explicitFederalRegulations) {
    const sectionPath = sectionPathFromFederalRegulation(citation.section);

    candidates.push({
      publisher: "Electronic Code of Federal Regulations",
      sourceType: "regulation",
      title: citation.citation,
      url: `https://www.ecfr.gov/current/title-${citation.title}/section-${sectionPath}`,
    });
  }

  for (const citation of explicitFederalRegulationParts) {
    candidates.push({
      publisher: "Electronic Code of Federal Regulations",
      sourceType: "regulation",
      title: citation.citation,
      url: citation.url,
    });
  }

  const hasExplicitLegalCitation =
    explicitFederalStatutes.length > 0 ||
    explicitFederalRegulations.length > 0 ||
    explicitFederalRegulationParts.length > 0;

  if (
    !hasExplicitLegalCitation &&
    /\b(?:tax|irs|income|internal revenue|1040|w-?2|1099|federal return)\b/iu.test(
      lowerClaim,
    )
  ) {
    candidates.push(DEFAULT_CANDIDATES[0], {
      publisher: "Legal Information Institute",
      sourceType: "statute",
      title: "26 U.S.C. Sec. 61 - Gross income defined",
      url: "https://www.law.cornell.edu/uscode/text/26/61",
    });
  }

  if (!hasExplicitLegalCitation && /\b1041[-\s]?v\b/iu.test(lowerClaim)) {
    candidates.push({
      publisher: "Internal Revenue Service",
      sourceType: "official_explainer",
      title: "About Form 1041-V, Payment Voucher",
      url: "https://www.irs.gov/forms-pubs/about-form-1041-v",
    });
  }

  if (!hasExplicitLegalCitation && /\b1099\b/iu.test(lowerClaim)) {
    candidates.push({
      publisher: "Internal Revenue Service",
      sourceType: "official_explainer",
      title: "About Publication 1099, General Instructions for Certain Information Returns",
      url: "https://www.irs.gov/forms-pubs/about-form-1099",
    });
  }

  if (
    !hasExplicitLegalCitation &&
    /\b(?:treasury|treasurydirect|bond|securities)\b/iu.test(lowerClaim)
  ) {
    candidates.push(DEFAULT_CANDIDATES[1]);
  }

  if (
    !hasExplicitLegalCitation &&
    /\bno (?:such thing as )?real money\b|\bonly congress\b.*\b(?:create|coin|make)\s+money\b|\bfederal reserve\b.*\b(?:not|cannot|can't)\b.*\bmoney\b|\bfederal reserve notes?\b.*\bnot\s+(?:real\s+)?money\b/iu.test(
      lowerClaim,
    )
  ) {
    candidates.push(
      {
        publisher: "Congress.gov",
        sourceType: "official_explainer",
        title: "U.S. Constitution Article I, Section 8 - Coinage power",
        url: "https://constitution.congress.gov/constitution/article-1/",
      },
      {
        publisher: "Legal Information Institute",
        sourceType: "statute",
        title: "31 U.S.C. Sec. 5103 - Legal tender",
        url: "https://www.law.cornell.edu/uscode/text/31/5103",
      },
      {
        publisher: "Federal Reserve Board",
        sourceType: "official_explainer",
        title: "Federal Reserve - Legal tender",
        url: "https://www.federalreserve.gov/frrs/statutes/legal-tender.htm",
      },
    );
  }

  if (
    !hasExplicitLegalCitation &&
    /\b(?:social security|ssa|benefit|ssn|social security act)\b/iu.test(lowerClaim)
  ) {
    candidates.push(DEFAULT_CANDIDATES[2]);
  }

  if (shouldSearchCourtAuthorities(claim)) {
    candidates.push({
      publisher: "CourtListener",
      sourceType: "court_case",
      title: "CourtListener case search",
      url: `https://www.courtlistener.com/?q=${encodeURIComponent(
        claim.slice(0, 180),
      )}&type=o`,
    });
  }

  const deduped = dedupeCandidates(
    candidates.filter((candidate) =>
      isAuthoritativeTopSecretSourceUrl(candidate.url),
    ),
  );

  if (hasExplicitLegalCitation) {
    return deduped
      .sort((left, right) => {
        const leftScore =
          Number(left.url.includes("uscode.house.gov")) * 4 +
          Number(left.url.includes("ecfr.gov/current/")) * 4 +
          Number(left.url.includes("law.cornell.edu/uscode/text/")) * 3 +
          Number(left.sourceType === "court_case");
        const rightScore =
          Number(right.url.includes("uscode.house.gov")) * 4 +
          Number(right.url.includes("ecfr.gov/current/")) * 4 +
          Number(right.url.includes("law.cornell.edu/uscode/text/")) * 3 +
          Number(right.sourceType === "court_case");

        return rightScore - leftScore;
      })
      .slice(0, 4);
  }

  return deduped.slice(0, 5);
}

function shouldSearchCourtAuthorities(claim: string) {
  return /\b\d+\s+U\.?S\.?\s+\d+\b|\b\d+\s+F\.(?:2d|3d|4th|Supp\.?\s*\d*)\s+\d+\b|\bcourt case\b|\bsupreme court\b|\bold case\b|\bantiquated case\b|\bhistorical case\b|\bblack'?s law dictionary\b|\bam\.?\s*jur\.?\b|\bamerican jurisprudence\b|\bc\.?j\.?s\.?\b|\bcorpus juris secundum\b/iu.test(
    claim,
  );
}

function assessTopSecretSourceCurrentness(candidate: CandidateSourceDescriptor) {
  if (
    candidate.url.includes("https://www.ecfr.gov/current/") ||
    candidate.url.includes("https://uscode.house.gov/view.xhtml")
  ) {
    return "verified_current" as const;
  }

  return "partially_verified" as const;
}

export function extractTopSecretSourceText(input: string) {
  return input
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&quot;/giu, "\"")
    .replace(/&#39;/giu, "'")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 6000);
}

export async function retrieveTopSecretSourceBundles(input: {
  claim: string;
  fetchImpl: typeof fetch;
  mode: "live" | "stub";
  timeoutMs?: number;
}): Promise<TopSecretSourceBundle[]> {
  if (input.mode === "stub") {
    return createTopSecretStubSourceBundles();
  }

  const candidates = buildTopSecretCandidateSourceDescriptors(input.claim);
  const bundleResults: Array<TopSecretSourceBundle | null> = await Promise.all(candidates.map(async (candidate) => {
    const abortController = new AbortController();
    const timeout = setTimeout(
      () => abortController.abort(),
      input.timeoutMs ?? DEFAULT_RETRIEVAL_TIMEOUT_MS,
    );

    try {
      const response = await input.fetchImpl(candidate.url, {
        headers: {
          accept: "text/html,text/plain;q=0.9,*/*;q=0.5",
        },
        signal: abortController.signal,
      });

      if (!response.ok) {
        return null;
      }

      const retrievedText = extractTopSecretSourceText(await response.text());

      if (retrievedText.length < 80) {
        return null;
      }

      return {
        ...candidate,
        currentnessStatus: assessTopSecretSourceCurrentness(candidate),
        detectedCitations: extractTopSecretLegalCitations(
          `${candidate.title}\n${retrievedText}`,
        ),
        id: "source-pending",
        retrievedText,
      } as TopSecretSourceBundle;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }));
  const bundles = bundleResults
    .filter((bundle): bundle is TopSecretSourceBundle => Boolean(bundle))
    .map((bundle, index) => ({
      ...bundle,
      id: `source-${index + 1}`,
    }));

  if (bundles.length > 0) {
    return bundles;
  }

  if (candidates.length > 0) {
    return candidates.map((candidate, index) => ({
      ...candidate,
      currentnessStatus: "not_verified",
      detectedCitations: extractTopSecretLegalCitations(candidate.title),
      id: `source-${index + 1}`,
      retrievedText:
        `Runtime retrieval could not fetch the governing source text from ${candidate.url} during this run. ` +
        "Keep the analysis anchored to this citation instead of substituting unrelated agency background.",
    }));
  }

  return createTopSecretStubSourceBundles();
}

export function sourceBundleToCitation(
  source: TopSecretSourceBundle,
): TopSecretCitation {
  return {
    publisher: source.publisher,
    title: source.title,
    url: source.url,
  };
}
