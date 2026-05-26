import type {
  TopSecretFinding,
  TopSecretSourceBundle,
} from "../../../../../packages/shared/src/contracts/top-secret";
import { buildTopSecretStatuteAnalyses } from "./top-secret-statute-analysis.service";

const UNSUPPORTED_CERTAINTY_PATTERN = /\b(?:always|never|guarantees?|proves?|must\s+always|cannot\s+ever|everyone|no\s+one)\b/iu;
const SYCOPHANCY_PATTERN =
  /\b(?:you(?:'re| are) right|your claim is valid|this could be true|you have a valid point|i agree with your interpretation|your interpretation is correct)\b/iu;

function sameUrl(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function buildFailClosedFinding(input: {
  claim: string;
  reason: string;
  sources: TopSecretSourceBundle[];
}): TopSecretFinding {
  const source = input.sources[0];
  const citations = source
    ? [
        {
          publisher: source.publisher,
          title: source.title,
          url: source.url,
        },
      ]
    : [
        {
          publisher: "Top Secret",
          title: "No authoritative source retained",
          url: "https://example.invalid/top-secret/no-authoritative-source",
        },
      ];

  return {
    analysis:
      `This finding was narrowed because ${input.reason}. The retained sources did not support a confident answer from the pasted message alone.`,
    citations,
    claim: input.claim,
    conclusion:
      "So for this message, the evidence points to this conclusion: there is not enough reliable supporting evidence for the full message as written.",
    supportReferences: source
      ? [
          {
            sourceId: source.id,
            supports:
              "This retained source is a starting point only; it did not validate the rejected model output.",
          },
        ]
      : [],
    statuteAnalyses: buildTopSecretStatuteAnalyses({
      discoveredCitations: input.sources.flatMap(
        (candidate) => candidate.detectedCitations,
      ),
      message: input.claim,
    }),
    verdict: "not_enough_reliable_evidence",
  };
}

export function validateTopSecretFindingAgainstSources(input: {
  claim: string;
  finding: TopSecretFinding;
  sources: TopSecretSourceBundle[];
}) {
  const allowedSourceIds = new Set(input.sources.map((source) => source.id));
  const allowedUrls = input.sources.map((source) => source.url);
  const sourcesById = new Map(input.sources.map((source) => [source.id, source]));
  const supportReferences = input.finding.supportReferences ?? [];
  const citationUrls = input.finding.citations.map((citation) => citation.url);
  const visibleText = [
    input.finding.analysis,
    input.finding.conclusion,
    input.finding.claim,
  ].join("\n");

  if (supportReferences.length === 0) {
    return buildFailClosedFinding({
      claim: input.claim,
      reason: "it did not include source support references",
      sources: input.sources,
    });
  }

  const unknownSourceReference = supportReferences.find(
    (reference) => !allowedSourceIds.has(reference.sourceId),
  );

  if (unknownSourceReference) {
    return buildFailClosedFinding({
      claim: input.claim,
      reason: `it referenced a source outside the evidence bundle (${unknownSourceReference.sourceId})`,
      sources: input.sources,
    });
  }

  const inventedCitation = input.finding.citations.find(
    (citation) => !allowedUrls.some((url) => sameUrl(url, citation.url)),
  );

  if (inventedCitation) {
    return buildFailClosedFinding({
      claim: input.claim,
      reason: `it cited a URL outside the evidence bundle (${inventedCitation.url})`,
      sources: input.sources,
    });
  }

  const uncitedSupportReference = supportReferences.find((reference) => {
    const source = sourcesById.get(reference.sourceId);

    return source
      ? !citationUrls.some((citationUrl) => sameUrl(citationUrl, source.url))
      : false;
  });

  if (uncitedSupportReference) {
    const source = sourcesById.get(uncitedSupportReference.sourceId);

    return buildFailClosedFinding({
      claim: input.claim,
      reason: `it attached support to a source that was not cited (${source?.url ?? uncitedSupportReference.sourceId})`,
      sources: input.sources,
    });
  }

  if (
    input.finding.verdict !== "not_enough_reliable_evidence" &&
    SYCOPHANCY_PATTERN.test(visibleText)
  ) {
    return buildFailClosedFinding({
      claim: input.claim,
      reason: "it used agreement language without evidence-bound support",
      sources: input.sources,
    });
  }

  if (
    input.finding.verdict !== "not_enough_reliable_evidence" &&
    UNSUPPORTED_CERTAINTY_PATTERN.test(visibleText)
  ) {
    return buildFailClosedFinding({
      claim: input.claim,
      reason: "it used unsupported certainty language",
      sources: input.sources,
    });
  }

  return input.finding;
}
