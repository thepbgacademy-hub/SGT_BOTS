import type {
  CursiveCategoryConfig,
  CursiveRepoAddress,
  CursiveRepoCitation,
} from "./cursive.repo";

export type CursivePromptCitation = {
  citationKey: string;
  citationText: string;
};

export type CursivePromptAddress = {
  addressKey: string;
  organizationName: string;
  attentionLine: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type CursivePromptIntake = string | Record<string, string>;

export type CursivePromptPackage = {
  categorySlug: string;
  categoryDisplayName: string;
  helperMode: "helper-only";
  promptVersion: string;
  systemPrompt: string;
  draftInstructions: string[];
  intake: CursivePromptIntake;
  citations: CursivePromptCitation[];
  addresses: CursivePromptAddress[];
  promptText: string;
};

export type CreditBureauDisputeDraftContent = {
  subjectLine: string;
  bodyParagraphs: string[];
};

function formatIntake(
  intake: CursivePromptIntake,
  fields: CursiveCategoryConfig["intakeSchema"]["intakeSchema"]["fields"],
) {
  if (typeof intake === "string") {
    return intake;
  }

  return fields
    .map((field) => [field.label, intake[field.key]] as const)
    .filter(([, value]) => typeof value === "string" && value.length > 0)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
}

function formatAddress(address: CursivePromptAddress) {
  const lines = [
    address.organizationName,
    address.attentionLine,
    address.addressLine1,
    address.addressLine2,
    `${address.city}, ${address.state} ${address.postalCode}`,
    address.country,
  ].filter((line) => line.trim().length > 0);

  return lines.join(", ");
}

function normalizeIntake(intake: CursivePromptIntake): CursivePromptIntake {
  if (typeof intake === "string") {
    return intake.trim();
  }

  const normalizedEntries = Object.entries(intake)
    .map(([key, value]) => [key, value.trim()] as const)
    .filter(([, value]) => value.length > 0);

  return Object.fromEntries(normalizedEntries) as Record<string, string>;
}

function ensureSentence(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length === 0) {
    return normalized;
  }

  return /[.?!]$/u.test(normalized) ? normalized : `${normalized}.`;
}

function capitalizeFirstLetter(value: string) {
  if (value.length === 0) {
    return value;
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function trimRepeatedDisputeLeadIn(value: string) {
  const patterns = [
    /^the disputed reporting is inaccurate because\s+/iu,
    /^this reporting is inaccurate because\s+/iu,
    /^the item is inaccurate because\s+/iu,
    /^the item i dispute is inaccurate because\s+/iu,
    /^i dispute this because\s+/iu,
    /^because\s+/iu,
  ];

  return patterns.reduce(
    (current, pattern) => current.replace(pattern, "").trim(),
    value.trim(),
  );
}

function requireStructuredPromptIntakeValue(
  promptPackage: CursivePromptPackage,
  key: string,
) {
  if (typeof promptPackage.intake === "string") {
    throw new Error("Official intake must be structured for credit bureau dispute drafts.");
  }

  const value = promptPackage.intake[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required prompt intake field: ${key}`);
  }

  return value.trim();
}

function snapshotIntake(intake: CursivePromptIntake): CursivePromptIntake {
  if (typeof intake === "string") {
    return intake;
  }

  return Object.freeze({ ...intake }) as CursivePromptIntake;
}

function snapshotCitations(
  citations: readonly CursiveRepoCitation[],
): CursivePromptCitation[] {
  return Object.freeze(
    citations.map((citation) =>
      Object.freeze({
        citationKey: citation.citationKey,
        citationText: citation.citationText,
      }),
    ),
  ) as unknown as CursivePromptCitation[];
}

function snapshotAddresses(
  addresses: readonly CursiveRepoAddress[],
): CursivePromptAddress[] {
  return Object.freeze(
    addresses.map((address) =>
      Object.freeze({
        addressKey: address.addressKey,
        organizationName: address.organizationName,
        attentionLine: address.attentionLine,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
      }),
    ),
  ) as unknown as CursivePromptAddress[];
}

export function buildCursivePromptPackage(input: {
  config: CursiveCategoryConfig;
  intake: CursivePromptIntake;
}): CursivePromptPackage {
  const intake = snapshotIntake(normalizeIntake(input.intake));
  const citations = snapshotCitations(input.config.citations);
  const addresses = snapshotAddresses(input.config.addresses);
  const draftInstructions = Object.freeze([
    ...input.config.promptProfile.promptPayload.draftInstructions,
  ]) as unknown as string[];
  const promptText = [
    input.config.promptProfile.promptPayload.systemPrompt,
    `Category: ${input.config.category.displayName}`,
    `Intake:\n${formatIntake(
      intake,
      input.config.intakeSchema.intakeSchema.fields,
    )}`,
    `Citations:\n${citations.map((citation) => `- ${citation.citationText}`).join("\n")}`,
    `Addresses:\n${addresses.map((address) => `- ${formatAddress(address)}`).join("\n")}`,
    `Draft instructions:\n${draftInstructions.map((instruction) => `- ${instruction}`).join("\n")}`,
  ].join("\n\n");

  return Object.freeze({
    categorySlug: input.config.category.slug,
    categoryDisplayName: input.config.category.displayName,
    helperMode: input.config.category.helperMode,
    promptVersion: input.config.promptProfile.promptVersion,
    systemPrompt: input.config.promptProfile.promptPayload.systemPrompt,
    draftInstructions,
    intake,
    citations,
    addresses,
    promptText,
  }) as CursivePromptPackage;
}

export function composeCreditBureauDisputeDraftContent(input: {
  promptPackage: CursivePromptPackage;
}): CreditBureauDisputeDraftContent {
  if (input.promptPackage.categorySlug !== "credit_bureau_dispute") {
    throw new Error("Unsupported Cursive draft category.");
  }

  const bureauChoice = requireStructuredPromptIntakeValue(
    input.promptPackage,
    "bureau_choice",
  );
  const accountReference = requireStructuredPromptIntakeValue(
    input.promptPackage,
    "account_reference",
  );
  const disputeReason = requireStructuredPromptIntakeValue(
    input.promptPackage,
    "dispute_reason",
  );
  const normalizedDisputeReason = ensureSentence(
    capitalizeFirstLetter(trimRepeatedDisputeLeadIn(disputeReason)),
  );

  return Object.freeze({
    subjectLine: `Re: FCRA Dispute and Reinvestigation Request for ${accountReference}`,
    bodyParagraphs: [
      "I am writing pursuant to my rights under the Fair Credit Reporting Act<sup>1</sup> and its implementing regulations<sup>2</sup> to dispute inaccurate information appearing on my consumer report.",
      `I dispute the reporting of ${accountReference} on my ${bureauChoice} consumer report. ${normalizedDisputeReason}`,
      "Under FCRA section 611, you must conduct a reasonable reinvestigation of this dispute and delete or correct any information that is incomplete, inaccurate, or cannot be verified.<sup>3</sup>",
      "Please send me written confirmation of the results of your investigation and an updated consumer report once the reinvestigation is complete.",
    ],
  });
}
