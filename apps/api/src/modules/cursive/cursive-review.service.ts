import {
  CursiveReviewResultSchema,
  type CursiveReviewResult,
} from "../../../../../packages/shared/src/contracts/cursive";
import type {
  CreditBureauDisputeDraft,
  CreditBureauDisputeOfficialIntake,
} from "./cursive.service";
import type { CursiveCategoryConfig } from "./cursive.repo";

const REPRESENTATION_PATTERNS = [
  /\battorney\b/iu,
  /\blaw firm\b/iu,
  /\blegal counsel\b/iu,
  /\bauthorized representative\b/iu,
  /\bour client\b/iu,
  /\bcounsel for\b/iu,
  /\bi represent\b/iu,
  /\brepresent(?:ing|s|ed)? you\b/iu,
  /\brepresent(?:ing|s|ed)? [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/u,
  /\bon your behalf\b/iu,
];

function hasRepresentationClaim(value: string) {
  return REPRESENTATION_PATTERNS.some((pattern) => pattern.test(value));
}

export function reviewCreditBureauDisputeDraft(input: {
  config: CursiveCategoryConfig;
  draft: CreditBureauDisputeDraft;
  intake: CreditBureauDisputeOfficialIntake;
}): CursiveReviewResult {
  const notes: string[] = [];
  const expectedCitations = input.config.citations.map((citation) => citation.citationText);
  const paragraphTwo = input.draft.templateInput.bodyParagraphs[1] ?? "";
  const combinedDraftText = [
    input.draft.templateInput.subjectLine,
    ...input.draft.templateInput.bodyParagraphs,
  ].join("\n");

  if (input.draft.categorySlug !== "credit_bureau_dispute") {
    notes.push("Draft category drifted outside the credit bureau dispute lane.");
  }

  if (!paragraphTwo.includes(input.intake.account_reference.trim())) {
    notes.push("Draft is missing the disputed account reference in the factual dispute paragraph.");
  }

  if (!paragraphTwo.includes(input.intake.bureau_choice.trim())) {
    notes.push("Draft is missing the selected credit bureau in the factual dispute paragraph.");
  }

  if (
    input.draft.templateInput.citations.length !== expectedCitations.length ||
    input.draft.templateInput.citations.some(
      (citation, index) => citation !== expectedCitations[index],
    )
  ) {
    notes.push("Draft citations drifted from the approved credit bureau dispute citation set.");
  }

  if (hasRepresentationClaim(combinedDraftText)) {
    notes.push("Draft includes legal representation language that is not allowed in Cursive output.");
  }

  return CursiveReviewResultSchema.parse({
    status: notes.length === 0 ? "review_ready" : "needs_revision",
    notes,
  });
}
