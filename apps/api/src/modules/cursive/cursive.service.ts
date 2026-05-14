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

function formatFieldLabelList(labels: string[]) {
  if (labels.length === 0) {
    return "";
  }

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

function formatCreditBureauAddressSummary(address: CursiveRepoAddress) {
  return `${address.organizationName} (${formatCityStatePostal(address)})`;
}

function looksLikeCreditBureauDisputeIntent(userGoal: string) {
  const normalizedGoal = userGoal.trim().toLowerCase();

  const disputeSignals = [
    "credit bureau",
    "bureau dispute",
    "dispute letter",
    "credit dispute",
    "late payment",
    "charge off",
    "charge-off",
    "inaccurate",
    "incorrect",
    "wrong balance",
    "not mine",
    "not my account",
    "remove this",
    "delete this",
    "reinvestigate",
  ];
  const bureauSignals = ["experian", "equifax", "transunion"];

  return (
    disputeSignals.some((keyword) => normalizedGoal.includes(keyword)) ||
    bureauSignals.some((keyword) => normalizedGoal.includes(keyword))
  );
}

function looksLikeGreeting(userGoal: string) {
  return /^(hi|hello|hey|good morning|good afternoon|good evening)\b/iu.test(
    userGoal.trim(),
  );
}

function looksLikeGeneralQuestion(userGoal: string) {
  const normalizedGoal = userGoal.trim().toLowerCase();

  return (
    normalizedGoal.includes("?") ||
    /^(what|how|can|could|should|why|when|where|who)\b/iu.test(normalizedGoal)
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
    isHelperOnlyBot,
    buildCreditBureauDisputeHelperReply(userGoal: string) {
      const config = getDefaultConfig();
      const citationList = formatFieldLabelList(
        config.citations.map((citation) => citation.citationText),
      );
      const bureauList = formatFieldLabelList(
        config.addresses.map((address) => address.organizationName),
      );
      const addressList = formatFieldLabelList(
        config.addresses.map(formatCreditBureauAddressSummary),
      );
      if (looksLikeGreeting(userGoal)) {
        return `Hi. I'm Cursive, and I can help you think through a ${config.category.displayName} before you start the official letter. Ask me what to gather, how to describe the inaccuracy, or which bureau should receive the dispute. When you're ready to build the real letter, tap Start official letter.`;
      }

      if (looksLikeGeneralQuestion(userGoal) && !looksLikeCreditBureauDisputeIntent(userGoal)) {
        return `I can help answer questions about ${config.category.displayName} letters, including what details matter, how bureau disputes usually work, and what kind of wording makes the issue clear and factual. I'll keep the guidance grounded in ${citationList}. When you want to move from questions into the real document flow, tap Start official letter.`;
      }

      if (!looksLikeCreditBureauDisputeIntent(userGoal)) {
        return `Cursive currently supports ${config.category.displayName} letters. "${userGoal}" does not look like a credit-bureau dispute request yet, but I can still help you think it through. A good place to start is understanding which bureau (${bureauList}) is involved, what reporting item seems wrong, and what outcome you want. When you're ready to build the actual letter, tap Start official letter.`;
      }

      return `That sounds like a possible ${config.category.displayName}. I can help you clarify the situation before we start the official letter, explain what details usually matter, and help you word the issue clearly without overstating it. I'll keep the guidance grounded in ${citationList} and the seeded mailing addresses for ${addressList}. When you're ready to move into the official document flow, tap Start official letter.`;
    },
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
