import type { SessionSecret } from "../sessions/session.store";
import { requestCodexJson } from "../providers/codex-oauth.service";
import {
  TopSecretFindingSchema,
  type TopSecretCitation,
  type TopSecretFinding,
  type TopSecretHistoricalAuthority,
  type TopSecretSupportReference,
  type TopSecretSourceBundle,
} from "../../../../../packages/shared/src/contracts/top-secret";
import {
  normalizeTopSecretClaimBatch,
  normalizeTopSecretClaimText,
  summarizeLongTopSecretClaim,
} from "../../../../../packages/shared/src/top-secret/claims";
import { validateTopSecretFindingAgainstSources } from "./top-secret-finding-validator.service";
import {
  isAuthoritativeTopSecretSourceUrl,
  retrieveTopSecretSourceBundles,
  sourceBundleToCitation,
} from "./top-secret-researcher.service";
import {
  buildTopSecretStatuteAnalyses,
  extractFederalStatuteCitations,
} from "./top-secret-statute-analysis.service";
import {
  isCursiveCreditReportDomainClaim,
  TOP_SECRET_CURSIVE_DOMAIN_ERROR,
} from "./top-secret-boundary.service";
import {
  buildTopSecretClaimComponents,
  buildTopSecretCommonSenseStatement,
  buildTopSecretResearchContextNotes,
  type TopSecretRuntimeKnowledgeEntry,
} from "./top-secret-kb.service";

type TopSecretServiceMode = "live" | "stub";

const QUESTION_START_PATTERN =
  /^(?:who|what|when|where|why|which|can|could|should|would|will|do|does|did|is|are|am|was|were|has|have|had)\b/iu;

const AUTHORITATIVE_SOURCE_POLICY = [
  "Use official or authoritative legal and government sources first: law.cornell.edu, irs.gov, treasury.gov, treasurydirect.gov, ssa.gov, federalregister.gov, ecfr.gov, govinfo.gov, congress.gov, and uscourts.gov.",
  "Use court cases only when they directly interpret the claim or governing statute.",
  "Do not cite public forums, social platforms, unsourced blogs, or advocacy posts as authority.",
  "If reliable sources do not support a confident answer, use not_enough_reliable_evidence.",
  "Remain neutral in tone. Do not ridicule, stereotype, or dismiss a claim because it resembles an internet myth.",
  "For statutory claims, identify the statute, definitions, operative words, exceptions, implementing regulations, and relevant cases when available.",
];

const STATUTORY_ANALYSIS_POLICY = [
  "Statutory construction protocol for federal statute claims:",
  "Confirm the current codified source and cite it by title, code, section, subsection, paragraph, and subparagraph when available.",
  "Read the definitions, applicability language, operative words such as shall/may/and/or/except/unless, cross-references, exceptions, implementing regulations, and source notes.",
  "Check whether recent amendments, effective dates, repeal notes, sunset provisions, or case interpretations affect the text.",
  "Do not treat agency guidance as overriding statute or regulation.",
];

const FALLBACK_CITATIONS: TopSecretCitation[] = [
  {
    publisher: "Legal Information Institute",
    title: "26 U.S.C. Sec. 61 - Gross income defined",
    url: "https://www.law.cornell.edu/uscode/text/26/61",
  },
  {
    publisher: "Internal Revenue Service",
    title: "IRS Publication 17 - Your Federal Income Tax",
    url: "https://www.irs.gov/publications/p17",
  },
  {
    publisher: "U.S. Treasury",
    title: "TreasuryDirect - Treasury securities overview",
    url: "https://www.treasurydirect.gov/marketable-securities/",
  },
];

const SECONDARY_AUTHORITY_REPORT_NOTE =
  "This secondary or historical source may help identify a legal meaning or research path, but it does not by itself establish the controlling rule. The cited authority still has to be checked against the current legal context.";

function normalizeClaim(value: string) {
  return summarizeLongTopSecretClaim(normalizeTopSecretClaimText(value));
}

function isQuestion(value: string) {
  const normalized = normalizeClaim(value);

  if (normalized.endsWith("?")) {
    return true;
  }

  if (/^how to\b/iu.test(normalized)) {
    return false;
  }

  return QUESTION_START_PATTERN.test(normalized);
}

export function doesClaimLikelyInvolveFederalStatute(claim: string) {
  return (
    extractFederalStatuteCitations(claim).length > 0 ||
    /\b(?:u\.?s\.?c\.?|c\.?f\.?r\.?|internal revenue code|social security act|fair credit reporting act|federal reserve act|treasury regulation|statute|subsection|paragraph|subparagraph|public law)\b/iu.test(
      claim,
    )
  );
}

export function isAuthoritativeTopSecretCitation(citation: TopSecretCitation) {
  return isAuthoritativeTopSecretSourceUrl(citation.url);
}

export function parseTopSecretClaims(input: unknown) {
  const claimsInput =
    typeof input === "object" && input !== null
      ? (input as { claims?: unknown }).claims
      : undefined;

  if (
    !Array.isArray(claimsInput) ||
    claimsInput.some((claim) => typeof claim !== "string")
  ) {
    throw new Error("top secret requires 1 to 5 claims");
  }
  const claims = normalizeTopSecretClaimBatch(claimsInput);

  if (claims.length === 0 || claims.length > 5) {
    throw new Error("top secret requires 1 to 5 claims");
  }

  const question = claims.find(isQuestion);

  if (question) {
    throw new Error("top secret accepts statements and how-to claims, not questions");
  }

  if (claims.some(isCursiveCreditReportDomainClaim)) {
    throw new Error(TOP_SECRET_CURSIVE_DOMAIN_ERROR);
  }

  return claims;
}

function buildNeutralStubFinding(
  claim: string,
  sources: TopSecretSourceBundle[],
  runtimeKnowledgeEntries: TopSecretRuntimeKnowledgeEntry[] = [],
): TopSecretFinding {
  const lowerClaim = claim.toLowerCase();
  const claimComponents = buildTopSecretClaimComponents(
    claim,
    runtimeKnowledgeEntries,
  );
  const verdict = lowerClaim.includes("income tax is voluntary")
    ? "misunderstood"
    : lowerClaim.includes("treasury direct account")
      ? "not_enough_reliable_evidence"
      : "not_enough_reliable_evidence";
  const conclusion =
    verdict === "misunderstood"
      ? "So for this message, the evidence points to this conclusion: the claim appears to confuse voluntary compliance procedures with whether the tax laws impose mandatory obligations. Review the cited statute and IRS publication before relying on the claim."
      : "So for this message, the evidence points to this conclusion: the claim needs more source-specific research before it can be called true or false. The cited authorities are starting points, not a final endorsement of the claim.";

  const supportReferences = sources.slice(0, 1).map((source) => ({
    sourceId: source.id,
    supports:
      "This retained source is a starting point for research; it does not by itself validate the full pasted message.",
  }));

  return {
    analysis: buildTopSecretStubAnalysis({ claimComponents }),
    citations: sources.map(sourceBundleToCitation),
    claim,
    claimComponents,
    commonSenseStatement: buildTopSecretCommonSenseStatement(
      claim,
      runtimeKnowledgeEntries,
    ),
    conclusion,
    historicalAuthorities: detectTopSecretHistoricalAuthorities(claim, sources),
    researchContextNotes: buildTopSecretResearchContextNotes(
      claim,
      runtimeKnowledgeEntries,
    ),
    sourceChecks: buildSourceChecks({
      sources,
      supportReferences,
    }),
    supportReferences,
    statuteAnalyses: buildTopSecretStatuteAnalyses({
      message: claim,
      sourceBundles: sources,
    }),
    verdict,
  };
}

function buildTopSecretStubAnalysis(input: {
  claimComponents?: Array<{ label: string; summary: string }>;
}) {
  if (
    input.claimComponents?.some(
      (component) => component.label === "Application-created credit",
    )
  ) {
    return "This message is a research conjecture because it joins several separate ideas into one conclusion: tax forms, signatures, instruments, securitization, Treasury routing, and credit creation. Each piece needs its own supporting authority before the full claim can be treated as fact.";
  }

  return "This is treated as a research claim, not as something to accept or reject based on tone. The exact wording needs to be compared against primary legal and government sources, then checked for any court decision that narrows or explains the rule.";
}

function detectTopSecretHistoricalAuthorities(
  claim: string,
  sourceBundles: TopSecretSourceBundle[] = [],
): TopSecretHistoricalAuthority[] | undefined {
  const authorities: TopSecretHistoricalAuthority[] = [];
  const currentApplicationStatus =
    getHistoricalAuthorityApplicationStatus(sourceBundles);

  if (/\bblack'?s law dictionary\b/iu.test(claim)) {
    authorities.push({
      authorityType: "dictionary",
      citationOrTitle: "Black's Law Dictionary",
      currentApplicationStatus,
      reportNote: SECONDARY_AUTHORITY_REPORT_NOTE,
    });
  }

  if (/\b(?:am\.?\s*jur\.?|american jurisprudence)\b/iu.test(claim)) {
    authorities.push({
      authorityType: "encyclopedia",
      citationOrTitle: "American Jurisprudence",
      currentApplicationStatus,
      reportNote: SECONDARY_AUTHORITY_REPORT_NOTE,
    });
  }

  if (/\b(?:corpus juris secundum|c\.?j\.?s\.?)\b/iu.test(claim)) {
    authorities.push({
      authorityType: "encyclopedia",
      citationOrTitle: "Corpus Juris Secundum",
      currentApplicationStatus,
      reportNote: SECONDARY_AUTHORITY_REPORT_NOTE,
    });
  }

  if (/\b(?:old case|antiquated case|historical case|old statute|antiquated statute)\b/iu.test(claim)) {
    authorities.push({
      authorityType: "other",
      citationOrTitle: "Historical legal authority referenced in pasted message",
      currentApplicationStatus,
      reportNote: SECONDARY_AUTHORITY_REPORT_NOTE,
    });
  }

  return authorities.length > 0 ? authorities : undefined;
}

function getHistoricalAuthorityApplicationStatus(
  sourceBundles: TopSecretSourceBundle[],
): TopSecretHistoricalAuthority["currentApplicationStatus"] {
  const retainedText = sourceBundles
    .filter((source) => !isCourtSearchLead(source.url))
    .map((source) => `${source.title}\n${source.retrievedText}`)
    .join("\n");

  if (/\boverruled\b|\bsuperseded\b|\brepealed\b|\babrogated\b|\breplaced\b/iu.test(retainedText)) {
    return "superseded_or_replaced";
  }

  if (
    sourceBundles.some(
      (source) =>
        source.currentnessStatus !== "not_verified" &&
        !isCourtSearchLead(source.url) &&
        (source.sourceType === "court_case" ||
          source.sourceType === "regulation" ||
          source.sourceType === "statute"),
    )
  ) {
    return "limited_or_context_specific";
  }

  return "controlling_not_verified";
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

function buildSourceChecks(input: {
  sources: TopSecretSourceBundle[];
  supportReferences?: TopSecretSupportReference[];
}) {
  const supportBySourceId = new Map(
    (input.supportReferences ?? []).map((reference) => [
      reference.sourceId,
      reference.supports,
    ]),
  );

  return input.sources.map((source) => ({
    currentnessStatus: source.currentnessStatus,
    publisher: source.publisher,
    sourceId: source.id,
    supportNote:
      supportBySourceId.get(source.id) ??
      "Source retrieved for context; the finding did not rely on this source for a specific support note.",
    title: source.title,
    url: source.url,
  }));
}

function getTopSecretSystemPrompt(claims: string[]) {
  const hasFederalStatuteClaim = claims.some(doesClaimLikelyInvolveFederalStatute);

  return [
    "You are Top Secret, a neutral fact-checking and legal-research assistant.",
    "Return only valid JSON with a findings array.",
    "Each finding must have claim, analysis, conclusion, verdict, citations, discoveredStatuteCitations, and statuteAnalyses when the pasted message or your research finds a federal statute citation.",
    "Each finding must include supportReferences using only source IDs from the supplied sourceBundles.",
    "Each finding should include one commonSenseStatement sentence that helps the user compare the claim to ordinary real-world use without sarcasm, condescension, or unsupported certainty.",
    "The commonSenseStatement value must be the sentence itself. Do not prefix it with Common sense:",
    "The conclusion value must be a complete natural sentence. Prefer this pattern when it fits: So for this message, the evidence points to this conclusion: ...",
    "Do not write user-visible scaffold labels or tool narration such as Top Secret should, Top Secret could, Body:, End:, Conclusion:, or Common sense:.",
    "Do not talk in first person. Do not narrate what Top Secret is doing inside the finding body.",
    "Do not answer from model memory. Reason only over the supplied sourceBundles.",
    "Do not add citations, cases, statutes, agencies, dates, or claims not present in sourceBundles.",
    "Verdict must be one of: true, partially_verified, misunderstood, false, not_enough_reliable_evidence.",
    "The report is educational research, not legal, tax, or financial advice.",
    "Do not punish, shame, ridicule, or stereotype the user for the pasted belief. Refute only the unsupported understanding, using simple terms and evidence from retained sources.",
    "If a claim sounds unusual but retained authoritative evidence supports it in a jurisdiction, date range, or narrow fact pattern, validate only that supported scope and explain the limits.",
    ...AUTHORITATIVE_SOURCE_POLICY,
    ...(hasFederalStatuteClaim ? STATUTORY_ANALYSIS_POLICY : []),
  ].join("\n");
}

function buildOpenAiTopSecretRequest(input: {
  claims: string[];
  sourceBundlesByClaim: TopSecretSourceBundle[][];
}) {
  return {
    model: "gpt-4o-mini",
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content: getTopSecretSystemPrompt(input.claims),
      },
      {
        role: "user",
        content: JSON.stringify({
          claims: input.claims,
          sourceBundlesByClaim: input.sourceBundlesByClaim,
        }),
      },
    ],
    temperature: 0.1,
  };
}

async function requestOpenAiFindings(input: {
  apiKey: string;
  claims: string[];
  fetchImpl: typeof fetch;
  sourceBundlesByClaim: TopSecretSourceBundle[][];
}) {
  const response = await input.fetchImpl("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(
      buildOpenAiTopSecretRequest({
        claims: input.claims,
        sourceBundlesByClaim: input.sourceBundlesByClaim,
      }),
    ),
  });

  if (!response.ok) {
    throw new Error(`top secret provider failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content ?? "";

  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new Error("invalid top secret provider response");
  }
}

async function requestAnthropicFindings(input: {
  apiKey: string;
  claims: string[];
  fetchImpl: typeof fetch;
  sourceBundlesByClaim: TopSecretSourceBundle[][];
}) {
  const response = await input.fetchImpl("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": input.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-latest",
      max_tokens: 2200,
      temperature: 0.1,
      system: [
        getTopSecretSystemPrompt(input.claims),
      ].join("\n"),
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            claims: input.claims,
            sourceBundlesByClaim: input.sourceBundlesByClaim,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`top secret provider failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = payload.content?.find((part) => part.type === "text")?.text ?? "";

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("invalid top secret provider response");
  }
}

async function requestCodexFindings(input: {
  apiKey: string;
  claims: string[];
  fetchImpl: typeof fetch;
  sourceBundlesByClaim: TopSecretSourceBundle[][];
}) {
  return requestCodexJson({
    apiKey: input.apiKey,
    failurePrefix: "top secret provider failed",
    fetchImpl: input.fetchImpl,
    maxOutputTokens: 2200,
    systemPrompt: getTopSecretSystemPrompt(input.claims),
    userPrompt: JSON.stringify({
      claims: input.claims,
      sourceBundlesByClaim: input.sourceBundlesByClaim,
    }),
  });
}

function parseProviderFindings(input: {
  claims: string[];
  payload: unknown;
  runtimeKnowledgeEntries?: TopSecretRuntimeKnowledgeEntry[];
  sourceBundlesByClaim: TopSecretSourceBundle[][];
}) {
  const record =
    typeof input.payload === "object" && input.payload !== null
      ? (input.payload as { findings?: unknown })
      : {};
  const findings = Array.isArray(record.findings) ? record.findings : [];

  if (findings.length !== input.claims.length) {
    throw new Error("invalid top secret provider response");
  }

  return findings.map((finding, index) => {
    const parsed = TopSecretFindingSchema.parse(finding);
    const citations = parsed.citations.filter(isAuthoritativeTopSecretCitation);
    const sources = input.sourceBundlesByClaim[index] ?? [];
    const claim = input.claims[index];

    if (citations.length === 0) {
      return {
        ...buildNeutralStubFinding(claim, sources, input.runtimeKnowledgeEntries),
        analysis:
          "The provider response did not keep authoritative citations tied to the retained sources, so this item is marked as not enough reliable evidence instead of being forced into a true or false conclusion.",
      };
    }

    const validatedFinding = validateTopSecretFindingAgainstSources({
      claim,
      sources,
      finding: {
        ...parsed,
        claim,
        commonSenseStatement:
          parsed.commonSenseStatement ??
          buildTopSecretCommonSenseStatement(
            claim,
            input.runtimeKnowledgeEntries,
          ),
        citations,
        statuteAnalyses: buildTopSecretStatuteAnalyses({
          discoveredCitations: [
            ...(parsed.discoveredStatuteCitations ?? []),
            ...sources.flatMap((source) => source.detectedCitations),
            ...parsed.citations.flatMap((citation) => [
              citation.title,
              citation.url,
            ]),
            parsed.analysis,
            parsed.conclusion,
          ],
          message: claim,
          sourceBundles: sources,
        }),
      },
    });

    return {
      ...validatedFinding,
      claimComponents: [
        ...(validatedFinding.claimComponents ?? []),
        ...(buildTopSecretClaimComponents(
          claim,
          input.runtimeKnowledgeEntries,
        ) ?? []),
      ],
      commonSenseStatement:
        validatedFinding.commonSenseStatement ??
        buildTopSecretCommonSenseStatement(claim, input.runtimeKnowledgeEntries),
      historicalAuthorities: [
        ...(validatedFinding.historicalAuthorities ?? []),
        ...(detectTopSecretHistoricalAuthorities(claim, sources) ?? []),
      ],
      researchContextNotes: [
        ...(validatedFinding.researchContextNotes ?? []),
        ...(buildTopSecretResearchContextNotes(
          claim,
          input.runtimeKnowledgeEntries,
        ) ?? []),
      ],
      sourceChecks: buildSourceChecks({
        sources,
        supportReferences: validatedFinding.supportReferences,
      }),
    };
  });
}

export function createTopSecretService(deps?: {
  fetch?: typeof fetch;
  runtimeKnowledgeEntries?: TopSecretRuntimeKnowledgeEntry[];
  mode?: TopSecretServiceMode;
}) {
  const fetchImpl = deps?.fetch ?? fetch;
  const mode = deps?.mode ?? "live";

  return {
    async generateFindings(input: {
      claims: string[];
      sessionSecret: SessionSecret;
    }): Promise<TopSecretFinding[]> {
      const claims = parseTopSecretClaims({ claims: input.claims });
      const sourceBundlesByClaim = await Promise.all(
        claims.map((claim) =>
          retrieveTopSecretSourceBundles({
            claim,
            fetchImpl,
            mode,
          }),
        ),
      );

      if (mode === "stub") {
        return claims.map((claim, index) =>
          buildNeutralStubFinding(
            claim,
            sourceBundlesByClaim[index],
            deps?.runtimeKnowledgeEntries,
          ),
        );
      }

      const payload =
        input.sessionSecret.provider === "anthropic"
          ? await requestAnthropicFindings({
              apiKey: input.sessionSecret.apiKey,
              claims,
              fetchImpl,
              sourceBundlesByClaim,
            })
          : input.sessionSecret.provider === "openai_codex"
            ? await requestCodexFindings({
                apiKey: input.sessionSecret.apiKey,
                claims,
                fetchImpl,
                sourceBundlesByClaim,
              })
          : await requestOpenAiFindings({
              apiKey: input.sessionSecret.apiKey,
              claims,
              fetchImpl,
              sourceBundlesByClaim,
            });

      return parseProviderFindings({
        claims,
        payload,
        runtimeKnowledgeEntries: deps?.runtimeKnowledgeEntries,
        sourceBundlesByClaim,
      });
    },
  };
}
