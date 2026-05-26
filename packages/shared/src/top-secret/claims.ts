export const TOP_SECRET_MAX_CLAIM_CHARS = 900;
const TOP_SECRET_LONG_PASTE_THRESHOLD_CHARS = 1200;
const TOP_SECRET_SUMMARY_BODY_CHARS = 760;

const LEGAL_CITATION_PATTERN =
  /\b(?:\d+\s+u\.?s\.?c\.?(?:\s*(?:§|Â§|sec(?:tion)?\.?|s\.?)\s*)?\s*\d+[a-z0-9-]*(?:\([a-z0-9]+\))*|\d+\s+c\.?f\.?r\.?(?:\s*(?:§|Â§|sec(?:tion)?\.?|s\.?)\s*)?\s*\d+(?:\.\d+)?[a-z0-9-]*(?:\([a-z0-9]+\))*|public law\s+\d+-\d+|h\.?j\.?r\.?\s*\d+|black'?s law dictionary|american jurisprudence|am\.?\s*jur\.?)/giu;

const IMPORTANT_CLAIM_SENTENCE_PATTERN =
  /\b(?:statute|law|court|case|license|travel|debt|creditor|debtor|treasury|federal reserve|income tax|voluntary|money|legal tender|social security|irs|black'?s law|am\.?\s*jur\.?|public law|h\.?j\.?r\.?|u\.?s\.?c\.?|c\.?f\.?r\.?)\b/iu;

export function normalizeTopSecretClaimText(value: string) {
  return value.replace(/\s+/gu, " ").trim();
}

function truncateAtWordBoundary(value: string, maxChars: number) {
  if (value.length <= maxChars) {
    return value;
  }

  const slice = value.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");

  return `${slice.slice(0, lastSpace > 120 ? lastSpace : maxChars).trim()}...`;
}

function getUniqueMatches(input: string, pattern: RegExp) {
  return [...input.matchAll(pattern)]
    .map((match) => normalizeTopSecretClaimText(match[0]))
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index);
}

export function summarizeLongTopSecretClaim(value: string) {
  const normalized = normalizeTopSecretClaimText(value);

  if (normalized.length <= TOP_SECRET_LONG_PASTE_THRESHOLD_CHARS) {
    return normalized;
  }

  const sentences = normalized
    .split(/(?<=[.!;:])\s+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const citations = getUniqueMatches(normalized, LEGAL_CITATION_PATTERN).slice(0, 6);
  const selectedSentences = [
    sentences[0],
    ...sentences.filter((sentence) =>
      IMPORTANT_CLAIM_SENTENCE_PATTERN.test(sentence),
    ),
  ]
    .filter((sentence): sentence is string => Boolean(sentence))
    .filter((sentence, index, values) => values.indexOf(sentence) === index);
  const summaryBody = truncateAtWordBoundary(
    selectedSentences.join(" ") || normalized,
    TOP_SECRET_SUMMARY_BODY_CHARS,
  );
  const citationText = citations.length
    ? ` Key references mentioned: ${citations.join("; ")}.`
    : "";

  return truncateAtWordBoundary(
    `Summary of long paste: ${summaryBody}${citationText}`,
    TOP_SECRET_MAX_CLAIM_CHARS,
  );
}

export function normalizeTopSecretClaimBatch(values: string[]) {
  const normalizedClaims = values.map(normalizeTopSecretClaimText).filter(Boolean);
  const combinedText = normalizeTopSecretClaimText(normalizedClaims.join("\n\n"));

  if (
    normalizedClaims.length > 5 &&
    combinedText.length > TOP_SECRET_LONG_PASTE_THRESHOLD_CHARS
  ) {
    return [summarizeLongTopSecretClaim(combinedText)];
  }

  return normalizedClaims.map(summarizeLongTopSecretClaim);
}
