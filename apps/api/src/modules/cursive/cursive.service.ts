import type { CreditBureauDisputeTemplateInput } from "./templates/credit-bureau-dispute.html";
import {
  buildCursivePromptPackage,
  composeCreditBureauDisputeDraftContent,
  type CursivePromptPackage,
} from "./cursive-prompt.service";
import { createCursiveDraftService } from "./cursive-draft.service";
import type { SessionSecret } from "../sessions/session.store";
import {
  createCursiveRepo,
  type CursiveCategoryConfig,
  type CursiveRepoAddress,
} from "./cursive.repo";
import { reviewCreditBureauDisputeDraft as reviewCreditBureauDisputeDraftOutput } from "./cursive-review.service";

export type CreditBureauDisputeOfficialIntake = {
  consumer_name: string;
  consumer_address: string;
  bureau_choice: string;
  account_reference: string;
  dispute_reason: string;
};

export type CreditBureauDisputeDraft = {
  categorySlug: "credit_bureau_dispute";
  promptPackage: CursivePromptPackage;
  templateInput: CreditBureauDisputeTemplateInput;
};

const CREDIT_BUREAU_DISPUTE_REQUIRED_FIELDS: Array<
  keyof CreditBureauDisputeOfficialIntake
> = [
  "consumer_name",
  "consumer_address",
  "bureau_choice",
  "account_reference",
  "dispute_reason",
];

const CREDIT_BUREAU_DISPUTE_CATEGORY_SLUG = "credit_bureau_dispute";
const CREDIT_BUREAU_DISPUTE_DEFAULT_ENCLOSURES = Object.freeze([
  "Photocopy of government-issued identification",
  "Photocopy of Social Security card",
]);

function getCreditBureauDisputeFieldLabels(deps?: {
  cursiveRepo?: ReturnType<typeof createCursiveRepo>;
}) {
  const cursiveRepo = deps?.cursiveRepo ?? createCursiveRepo();
  const config = cursiveRepo.getCategoryConfig(
    CREDIT_BUREAU_DISPUTE_CATEGORY_SLUG,
  );

  if (!config) {
    throw new Error("Credit bureau dispute category config is unavailable.");
  }

  return new Map(
    config.intakeSchema.intakeSchema.fields.map((field) => [field.key, field.label]),
  );
}

function normalizeBureauChoice(value: string) {
  return value.trim().toLowerCase().replaceAll(/[\s-]+/g, "");
}

function formatCityStatePostal(address: CursiveRepoAddress) {
  return [address.city, [address.state, address.postalCode].filter(Boolean).join(" ")]
    .filter((part) => part.trim().length > 0)
    .join(", ");
}

function formatConsumerAddressLines(value: string) {
  const lines = value
    .split(/\r?\n/)
    .map((line) => normalizeDraftFact(line))
    .filter((line) => line.length > 0);

  return lines.length > 0 ? lines : [normalizeDraftFact(value)];
}

function ensureSentence(value: string) {
  return value.replace(/[.?!]+$/u, "");
}

function formatBureauAddressLines(address: CursiveRepoAddress) {
  return [
    address.attentionLine,
    address.addressLine1,
    address.addressLine2,
    formatCityStatePostal(address),
  ].filter((line) => line.trim().length > 0);
}

function findBureauAddress(
  config: CursiveCategoryConfig,
  bureauChoice: string,
) {
  const normalizedChoice = normalizeBureauChoice(bureauChoice);
  const matchedAddress = config.addresses.find(
    (address) =>
      normalizeBureauChoice(address.organizationName) === normalizedChoice,
  );

  if (!matchedAddress) {
    throw new Error("invalid credit bureau");
  }

  return matchedAddress;
}

function requirePromptIntakeValue(
  intake: CursivePromptPackage["intake"],
  key: keyof CreditBureauDisputeOfficialIntake,
) {
  if (typeof intake === "string") {
    throw new Error("Official intake must be structured for credit bureau dispute drafts.");
  }

  const value = intake[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required draft intake field: ${key}`);
  }

  return value.trim();
}

function normalizeDraftFact(value: string) {
  return value.replaceAll(/[<>]/g, "").trim();
}

export function isHelperOnlyBot(botId: string) {
  return botId === "document_wizard";
}

export function getMissingCreditBureauDisputeIntakeFields(
  intake: Partial<CreditBureauDisputeOfficialIntake>,
) {
  return CREDIT_BUREAU_DISPUTE_REQUIRED_FIELDS.filter((field) => {
    const value = intake[field];

    return typeof value !== "string" || value.trim().length === 0;
  });
}

export function getMissingCreditBureauDisputeIntakeFieldLabels(
  intake: Partial<CreditBureauDisputeOfficialIntake>,
  deps?: {
    cursiveRepo?: ReturnType<typeof createCursiveRepo>;
  },
) {
  const fieldLabels = getCreditBureauDisputeFieldLabels(deps);

  return getMissingCreditBureauDisputeIntakeFields(intake).map(
    (field) => fieldLabels.get(field) ?? field,
  );
}

export function createCursiveService(deps?: {
  cursiveRepo?: ReturnType<typeof createCursiveRepo>;
  cursiveDraftService?: ReturnType<typeof createCursiveDraftService>;
}) {
  const cursiveRepo = deps?.cursiveRepo ?? createCursiveRepo();
  const cursiveDraftService =
    deps?.cursiveDraftService ?? createCursiveDraftService();

  function getDefaultConfig() {
    const config = cursiveRepo.getCategoryConfig(
      CREDIT_BUREAU_DISPUTE_CATEGORY_SLUG,
    );

    if (!config) {
      throw new Error("Credit bureau dispute category config is unavailable.");
    }

    return config;
  }

  return {
    getWorkflowEntry() {
      return {
        chatEnabled: false,
        modes: ["manual_dispute", "analyze_uploaded_report"] as const,
      };
    },
    isHelperOnlyBot,
    buildCreditBureauDisputeTemplateInput(
      intake: CreditBureauDisputeOfficialIntake,
      options?: {
        config?: CursiveCategoryConfig;
      },
    ): CreditBureauDisputeTemplateInput {
      return this.buildCreditBureauDisputeDraft(intake, options).templateInput;
    },
    buildCreditBureauDisputeDraft(
      intake: CreditBureauDisputeOfficialIntake,
      options?: {
        config?: CursiveCategoryConfig;
      },
    ): CreditBureauDisputeDraft {
      const config = options?.config ?? getDefaultConfig();
      const promptPackage = buildCursivePromptPackage({
        config,
        intake,
      });
      const consumerName = requirePromptIntakeValue(
        promptPackage.intake,
        "consumer_name",
      );
      const consumerAddress = requirePromptIntakeValue(
        promptPackage.intake,
        "consumer_address",
      );
      const bureauChoice = requirePromptIntakeValue(
        promptPackage.intake,
        "bureau_choice",
      );
      const accountReference = requirePromptIntakeValue(
        promptPackage.intake,
        "account_reference",
      );
      const disputeReason = requirePromptIntakeValue(
        promptPackage.intake,
        "dispute_reason",
      );
      const draftContent = composeCreditBureauDisputeDraftContent({
        promptPackage,
      });
      const bureauAddress = findBureauAddress(config, bureauChoice);

      return {
        categorySlug: CREDIT_BUREAU_DISPUTE_CATEGORY_SLUG,
        promptPackage,
        templateInput: {
          consumerName: normalizeDraftFact(consumerName),
          consumerAddressLines: formatConsumerAddressLines(consumerAddress),
          bureauName: bureauAddress.organizationName,
          bureauAddressLines: formatBureauAddressLines(bureauAddress),
          subjectLine: draftContent.subjectLine,
          salutation: config.templateDefaults.templatePayload.salutation,
          bodyParagraphs: draftContent.bodyParagraphs.map((paragraph) =>
            paragraph
              .replaceAll(accountReference, normalizeDraftFact(accountReference))
              .replaceAll(bureauChoice, normalizeDraftFact(bureauChoice))
              .replaceAll(
                ensureSentence(disputeReason),
                ensureSentence(normalizeDraftFact(disputeReason)),
              ),
          ),
          closing: config.templateDefaults.templatePayload.closing,
          enclosures: [...CREDIT_BUREAU_DISPUTE_DEFAULT_ENCLOSURES],
          citations: config.citations.map((citation) => citation.citationText),
        },
      };
    },
    async generateCreditBureauDisputeDraft(input: {
      config?: CursiveCategoryConfig;
      intake: CreditBureauDisputeOfficialIntake;
      sessionSecret: SessionSecret;
    }): Promise<CreditBureauDisputeDraft> {
      const config = input.config ?? getDefaultConfig();
      const promptPackage = buildCursivePromptPackage({
        config,
        intake: input.intake,
      });
      const consumerName = requirePromptIntakeValue(
        promptPackage.intake,
        "consumer_name",
      );
      const consumerAddress = requirePromptIntakeValue(
        promptPackage.intake,
        "consumer_address",
      );
      const bureauChoice = requirePromptIntakeValue(
        promptPackage.intake,
        "bureau_choice",
      );
      const bureauAddress = findBureauAddress(config, bureauChoice);
      const draftContent =
        await cursiveDraftService.generateCreditBureauDisputeDraft({
          promptPackage,
          sessionSecret: input.sessionSecret,
        });

      return {
        categorySlug: CREDIT_BUREAU_DISPUTE_CATEGORY_SLUG,
        promptPackage,
        templateInput: {
          consumerName: normalizeDraftFact(consumerName),
          consumerAddressLines: formatConsumerAddressLines(consumerAddress),
          bureauName: bureauAddress.organizationName,
          bureauAddressLines: formatBureauAddressLines(bureauAddress),
          subjectLine: draftContent.subjectLine,
          salutation: config.templateDefaults.templatePayload.salutation,
          bodyParagraphs: draftContent.bodyParagraphs,
          closing: config.templateDefaults.templatePayload.closing,
          enclosures: [...CREDIT_BUREAU_DISPUTE_DEFAULT_ENCLOSURES],
          citations: config.citations.map((citation) => citation.citationText),
        },
      };
    },
    reviewCreditBureauDisputeDraft(input: {
      config?: CursiveCategoryConfig;
      draft: CreditBureauDisputeDraft;
      intake: CreditBureauDisputeOfficialIntake;
    }) {
      return reviewCreditBureauDisputeDraftOutput({
        config: input.config ?? getDefaultConfig(),
        draft: input.draft,
        intake: input.intake,
      });
    },
  };
}
