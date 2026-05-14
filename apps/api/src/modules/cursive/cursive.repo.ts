import {
  CREDIT_BUREAU_DISPUTE_INTAKE_FIELDS,
  CURSIVE_CATEGORY_CATALOG,
  CURSIVE_CATEGORY_SUMMARIES,
  CURSIVE_SCAFFOLD_FIELD_LABELS,
  CursiveCategorySchema,
  CursiveIntakeSchemaSchema,
  CursivePromptPayloadSchema,
  CursiveTemplatePayloadSchema,
  type CursiveCategory,
  type CursiveCategorySlug,
  type CursiveIntakeSchema,
  type CursivePromptPayload,
  type CursiveTemplatePayload,
} from "../../../../../packages/shared/src/contracts/cursive";

export const DEFAULT_CURSIVE_CATEGORY_SLUG: CursiveCategorySlug =
  "credit_bureau_dispute";
export const DEFAULT_CREDIT_BUREAU_ADDRESS_KEY = "experian_disputes";

export type CursiveRepoCategory = CursiveCategory & {
  enabled: boolean;
  sortOrder: number;
  summary: string;
};

export type CursiveRepoCitation = {
  citationKey: string;
  citationText: string;
  sortOrder: number;
};

export type CursiveRepoAddress = {
  addressKey: string;
  organizationName: string;
  attentionLine: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  sortOrder: number;
};

export type CursiveRepoPromptProfile = {
  promptVersion: string;
  helperMode: "helper-only";
  promptPayload: CursivePromptPayload;
};

export type CursiveRepoTemplateDefaults = {
  templateVersion: string;
  helperMode: "helper-only";
  templatePayload: CursiveTemplatePayload;
};

export type CursiveCategoryConfig = {
  category: CursiveRepoCategory;
  intakeSchema: {
    schemaVersion: string;
    helperMode: "helper-only";
    intakeSchema: CursiveIntakeSchema;
  };
  promptProfile: CursiveRepoPromptProfile;
  citations: CursiveRepoCitation[];
  addresses: CursiveRepoAddress[];
  templateDefaults: CursiveRepoTemplateDefaults;
};

const CREDIT_BUREAU_DISPUTE_CONFIG: CursiveCategoryConfig = {
  category: {
    ...CURSIVE_CATEGORY_CATALOG.find(
      (category) => category.slug === "credit_bureau_dispute",
    )!,
    enabled: true,
    sortOrder: 10,
    summary:
      "Dispute late payments, charge-offs, and inaccurate bureau reporting.",
  },
  intakeSchema: {
    schemaVersion: "v1",
    helperMode: "helper-only",
    intakeSchema: CursiveIntakeSchemaSchema.parse({
      fields: CREDIT_BUREAU_DISPUTE_INTAKE_FIELDS.map((field) => ({ ...field })),
    }),
  },
  promptProfile: {
    promptVersion: "v1",
    helperMode: "helper-only",
    promptPayload: CursivePromptPayloadSchema.parse({
      systemPrompt:
        "You are a helper-only assistant collecting and organizing facts for a credit bureau dispute letter grounded in the user's official intake, the approved FCRA authorities, and the seeded bureau address data.",
      draftInstructions: [
        "Draft a formal credit bureau dispute letter using a concise legal-business tone.",
        "Keep the letter grounded in the official intake only. Do not invent facts, dates, balances, or account history.",
        "Use the approved citation set as the legal grounding for the letter structure, with superscript references left in place for the HTML template.",
        "Frame the requested remedy around reinvestigation, correction, deletion of unverifiable information, and written results.",
        "When drafting the dispute summary, explain the inaccuracy and the corrective position in one or two factual sentences without repeating the bureau name, account reference, or the phrase 'the disputed reporting is inaccurate because'.",
      ],
    }),
  },
  citations: [
    {
      citationKey: "fcra_general",
      citationText: "15 U.S.C. Secs. 1681 et seq. (FCRA)",
      sortOrder: 10,
    },
    {
      citationKey: "reg_v",
      citationText: "12 C.F.R. Sec. 1022.41-48 (Reg V)",
      sortOrder: 20,
    },
    {
      citationKey: "fcra_611",
      citationText: "15 U.S.C. Sec. 1681i",
      sortOrder: 30,
    },
  ],
  addresses: [
    {
      addressKey: DEFAULT_CREDIT_BUREAU_ADDRESS_KEY,
      organizationName: "Experian",
      attentionLine: "Dispute by Mail",
      addressLine1: "P.O. Box 4500",
      addressLine2: "",
      city: "Allen",
      state: "TX",
      postalCode: "75013",
      country: "US",
      sortOrder: 10,
    },
    {
      addressKey: "equifax_disputes",
      organizationName: "Equifax",
      attentionLine: "Information Services LLC",
      addressLine1: "P.O. Box 740256",
      addressLine2: "",
      city: "Atlanta",
      state: "GA",
      postalCode: "30374",
      country: "US",
      sortOrder: 20,
    },
    {
      addressKey: "transunion_disputes",
      organizationName: "TransUnion",
      attentionLine: "Consumer Solutions",
      addressLine1: "P.O. Box 2000",
      addressLine2: "",
      city: "Chester",
      state: "PA",
      postalCode: "19016-2000",
      country: "US",
      sortOrder: 30,
    },
  ],
  templateDefaults: {
    templateVersion: "v1",
    helperMode: "helper-only",
    templatePayload: CursiveTemplatePayloadSchema.parse({
      salutation: "To Whom It May Concern:",
      closing: "Sincerely,",
    }),
  },
};

function createPlaceholderCategoryConfig(input: {
  slug: Exclude<CursiveCategorySlug, "credit_bureau_dispute">;
  displayName: string;
  sortOrder: number;
  summary: string;
  fieldLabels: string[];
}) {
  return {
    category: {
      ...CursiveCategorySchema.parse({
        slug: input.slug,
        displayName: input.displayName,
      helperMode: "helper-only",
      outputModes: ["portal_text", "html_letter", "pdf_letter"],
    }),
      enabled: false,
      sortOrder: input.sortOrder,
      summary: input.summary,
    },
    intakeSchema: {
      schemaVersion: "v1",
      helperMode: "helper-only" as const,
      intakeSchema: CursiveIntakeSchemaSchema.parse({
        fields: input.fieldLabels.map((label, index) => ({
          key: `field_${index + 1}`,
          label,
          required: true,
        })),
      }),
    },
    promptProfile: {
      promptVersion: "v1",
      helperMode: "helper-only" as const,
      promptPayload: CursivePromptPayloadSchema.parse({
        systemPrompt: `You are a helper-only assistant collecting and organizing facts for the ${input.displayName} Cursive workflow.`,
        draftInstructions: [
          `Collect the official intake needed for ${input.displayName}.`,
          "Keep the workflow grounded in the official intake only. Do not invent facts or supporting records.",
          "Use helper-only chat to clarify inputs without silently overriding the official intake.",
        ],
      }),
    },
    citations: [],
    addresses: [],
    templateDefaults: {
      templateVersion: "v1",
      helperMode: "helper-only" as const,
      templatePayload: CursiveTemplatePayloadSchema.parse({
        salutation: "To Whom It May Concern:",
        closing: "Sincerely,",
      }),
    },
  } satisfies CursiveCategoryConfig;
}

function snapshotCategory(category: CursiveRepoCategory): CursiveRepoCategory {
  return Object.freeze({
    ...category,
    outputModes: Object.freeze([...category.outputModes]),
  }) as CursiveRepoCategory;
}

function snapshotIntakeSchema(
  intakeSchema: CursiveCategoryConfig["intakeSchema"],
): CursiveCategoryConfig["intakeSchema"] {
  return Object.freeze({
    schemaVersion: intakeSchema.schemaVersion,
    helperMode: intakeSchema.helperMode,
    intakeSchema: Object.freeze({
      fields: Object.freeze(
        intakeSchema.intakeSchema.fields.map((field) => Object.freeze({ ...field })),
      ),
    }),
  }) as CursiveCategoryConfig["intakeSchema"];
}

function snapshotPromptProfile(
  promptProfile: CursiveRepoPromptProfile,
): CursiveRepoPromptProfile {
  return Object.freeze({
    promptVersion: promptProfile.promptVersion,
    helperMode: promptProfile.helperMode,
    promptPayload: Object.freeze({
      systemPrompt: promptProfile.promptPayload.systemPrompt,
      draftInstructions: Object.freeze([
        ...promptProfile.promptPayload.draftInstructions,
      ]),
    }),
  }) as CursiveRepoPromptProfile;
}

function snapshotCitations(
  citations: CursiveRepoCitation[],
): CursiveRepoCitation[] {
  return Object.freeze(
    citations.map((citation) => Object.freeze({ ...citation })),
  ) as unknown as CursiveRepoCitation[];
}

function snapshotAddresses(
  addresses: CursiveRepoAddress[],
): CursiveRepoAddress[] {
  return Object.freeze(
    addresses.map((address) => Object.freeze({ ...address })),
  ) as unknown as CursiveRepoAddress[];
}

function snapshotTemplateDefaults(
  templateDefaults: CursiveRepoTemplateDefaults,
): CursiveRepoTemplateDefaults {
  return Object.freeze({
    templateVersion: templateDefaults.templateVersion,
    helperMode: templateDefaults.helperMode,
    templatePayload: Object.freeze({ ...templateDefaults.templatePayload }),
  }) as CursiveRepoTemplateDefaults;
}

function snapshotCategoryConfig(
  config: CursiveCategoryConfig,
): CursiveCategoryConfig {
  return Object.freeze({
    category: snapshotCategory(config.category),
    intakeSchema: snapshotIntakeSchema(config.intakeSchema),
    promptProfile: snapshotPromptProfile(config.promptProfile),
    citations: snapshotCitations(config.citations),
    addresses: snapshotAddresses(config.addresses),
    templateDefaults: snapshotTemplateDefaults(config.templateDefaults),
  }) as CursiveCategoryConfig;
}

const CURSIVE_CATEGORY_CONFIGS = new Map<
  CursiveCategorySlug,
  CursiveCategoryConfig
>([
  [DEFAULT_CURSIVE_CATEGORY_SLUG, CREDIT_BUREAU_DISPUTE_CONFIG],
  [
    "aggregator_dispute",
    createPlaceholderCategoryConfig({
      slug: "aggregator_dispute",
      displayName: "Aggregator Dispute",
      sortOrder: 20,
      summary: CURSIVE_CATEGORY_SUMMARIES.aggregator_dispute,
      fieldLabels: [...CURSIVE_SCAFFOLD_FIELD_LABELS.aggregator_dispute],
    }),
  ],
  [
    "direct_creditor_dispute",
    createPlaceholderCategoryConfig({
      slug: "direct_creditor_dispute",
      displayName: "Direct Creditor Dispute",
      sortOrder: 30,
      summary: CURSIVE_CATEGORY_SUMMARIES.direct_creditor_dispute,
      fieldLabels: [...CURSIVE_SCAFFOLD_FIELD_LABELS.direct_creditor_dispute],
    }),
  ],
  [
    "bill_collector_dispute",
    createPlaceholderCategoryConfig({
      slug: "bill_collector_dispute",
      displayName: "Bill Collector Dispute",
      sortOrder: 40,
      summary: CURSIVE_CATEGORY_SUMMARIES.bill_collector_dispute,
      fieldLabels: [...CURSIVE_SCAFFOLD_FIELD_LABELS.bill_collector_dispute],
    }),
  ],
  [
    "utility_dispute",
    createPlaceholderCategoryConfig({
      slug: "utility_dispute",
      displayName: "Utility Dispute",
      sortOrder: 50,
      summary: CURSIVE_CATEGORY_SUMMARIES.utility_dispute,
      fieldLabels: [...CURSIVE_SCAFFOLD_FIELD_LABELS.utility_dispute],
    }),
  ],
  [
    "reconsideration_request",
    createPlaceholderCategoryConfig({
      slug: "reconsideration_request",
      displayName: "Reconsideration Request",
      sortOrder: 60,
      summary: CURSIVE_CATEGORY_SUMMARIES.reconsideration_request,
      fieldLabels: [...CURSIVE_SCAFFOLD_FIELD_LABELS.reconsideration_request],
    }),
  ],
  [
    "full_account_history_request",
    createPlaceholderCategoryConfig({
      slug: "full_account_history_request",
      displayName: "Full Account History Request",
      sortOrder: 70,
      summary: CURSIVE_CATEGORY_SUMMARIES.full_account_history_request,
      fieldLabels: [...CURSIVE_SCAFFOLD_FIELD_LABELS.full_account_history_request],
    }),
  ],
  [
    "irs_inquiry_dispute",
    createPlaceholderCategoryConfig({
      slug: "irs_inquiry_dispute",
      displayName: "IRS Inquiry / Dispute",
      sortOrder: 80,
      summary: CURSIVE_CATEGORY_SUMMARIES.irs_inquiry_dispute,
      fieldLabels: [...CURSIVE_SCAFFOLD_FIELD_LABELS.irs_inquiry_dispute],
    }),
  ],
]);

export function createCursiveRepo() {
  return {
    getCategoryConfig(categorySlug: string) {
      const config = CURSIVE_CATEGORY_CONFIGS.get(
        categorySlug as CursiveCategorySlug,
      );

      return config ? snapshotCategoryConfig(config) : null;
    },
    listCategories() {
      return Object.freeze(
        [...CURSIVE_CATEGORY_CONFIGS.values()]
          .map((config) => snapshotCategory(config.category))
          .sort((left, right) => left.sortOrder - right.sortOrder),
      ) as readonly CursiveRepoCategory[];
    },
    getDefaultCategoryConfig() {
      const config = CURSIVE_CATEGORY_CONFIGS.get(DEFAULT_CURSIVE_CATEGORY_SLUG);

      return config ? snapshotCategoryConfig(config) : null;
    },
  };
}
