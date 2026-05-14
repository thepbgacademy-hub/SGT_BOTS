import { z } from "zod";

export const CURSIVE_OUTPUT_MODES = [
  "portal_text",
  "html_letter",
  "pdf_letter",
] as const;

export const CursiveOutputModeSchema = z.enum(CURSIVE_OUTPUT_MODES);

export type CursiveOutputMode = z.infer<typeof CursiveOutputModeSchema>;

export const CursiveCategorySchema = z.object({
  slug: z.string().min(1),
  displayName: z.string().min(1),
  helperMode: z.literal("helper-only"),
  outputModes: z.array(CursiveOutputModeSchema).nonempty(),
}).strict();

export type CursiveCategory = z.infer<typeof CursiveCategorySchema>;

export const CURSIVE_CATEGORY_CATALOG = [
  {
    slug: "credit_bureau_dispute",
    displayName: "Credit Bureau Dispute",
    helperMode: "helper-only",
    outputModes: [...CURSIVE_OUTPUT_MODES],
  },
  {
    slug: "aggregator_dispute",
    displayName: "Aggregator Dispute",
    helperMode: "helper-only",
    outputModes: [...CURSIVE_OUTPUT_MODES],
  },
  {
    slug: "direct_creditor_dispute",
    displayName: "Direct Creditor Dispute",
    helperMode: "helper-only",
    outputModes: [...CURSIVE_OUTPUT_MODES],
  },
  {
    slug: "bill_collector_dispute",
    displayName: "Bill Collector Dispute",
    helperMode: "helper-only",
    outputModes: [...CURSIVE_OUTPUT_MODES],
  },
  {
    slug: "utility_dispute",
    displayName: "Utility Dispute",
    helperMode: "helper-only",
    outputModes: [...CURSIVE_OUTPUT_MODES],
  },
  {
    slug: "reconsideration_request",
    displayName: "Reconsideration Request",
    helperMode: "helper-only",
    outputModes: [...CURSIVE_OUTPUT_MODES],
  },
  {
    slug: "full_account_history_request",
    displayName: "Full Account History Request",
    helperMode: "helper-only",
    outputModes: [...CURSIVE_OUTPUT_MODES],
  },
  {
    slug: "irs_inquiry_dispute",
    displayName: "IRS Inquiry / Dispute",
    helperMode: "helper-only",
    outputModes: [...CURSIVE_OUTPUT_MODES],
  },
] as const satisfies readonly CursiveCategory[];

export const CursiveCategorySlugSchema = z.enum(
  CURSIVE_CATEGORY_CATALOG.map((category) => category.slug) as [
    (typeof CURSIVE_CATEGORY_CATALOG)[number]["slug"],
    ...(typeof CURSIVE_CATEGORY_CATALOG)[number]["slug"][],
  ],
);

export type CursiveCategorySlug = z.infer<typeof CursiveCategorySlugSchema>;

export const CURSIVE_LIVE_CATEGORY_SLUGS = [
  "credit_bureau_dispute",
] as const satisfies readonly CursiveCategorySlug[];

export const CURSIVE_CATEGORY_SUMMARIES = {
  credit_bureau_dispute:
    "Dispute inaccurate bureau reporting through a structured official intake.",
  aggregator_dispute:
    "Challenge aggregator file data such as LexisNexis-style consumer reporting records.",
  direct_creditor_dispute:
    "Prepare direct-to-creditor dispute requests for closures, late payments, balances, and similar lender-side issues.",
  bill_collector_dispute:
    "Request validation, assignment details, and bill-of-sale support from a debt collector.",
  utility_dispute:
    "Dispute energy, water, telecom, and similar service charges with a structured fact pattern.",
  reconsideration_request:
    "Request reconsideration after a credit or account denial using a focused supporting argument.",
  full_account_history_request:
    "Request a full account history, accounting, or transaction record package from a creditor or lender.",
  irs_inquiry_dispute:
    "Respond to IRS notices and account issues through a citation-ready intake lane.",
} as const satisfies Record<CursiveCategorySlug, string>;

export const CURSIVE_SCAFFOLD_FIELD_LABELS = {
  aggregator_dispute: [
    "Consumer name",
    "Mailing address",
    "Aggregator name",
    "Disputed file or report reference",
    "Why the file data is inaccurate",
  ],
  direct_creditor_dispute: [
    "Consumer name",
    "Mailing address",
    "Creditor or lender",
    "Account reference",
    "Why the lender-side reporting is inaccurate",
  ],
  bill_collector_dispute: [
    "Consumer name",
    "Mailing address",
    "Collection reference",
    "Collector name",
    "What proof or validation is requested",
  ],
  utility_dispute: [
    "Consumer name",
    "Mailing address",
    "Utility or service provider",
    "Billing reference",
    "Why the charge is disputed",
  ],
  reconsideration_request: [
    "Consumer name",
    "Mailing address",
    "Institution or issuer",
    "Denial reference",
    "Why reconsideration is warranted",
  ],
  full_account_history_request: [
    "Consumer name",
    "Mailing address",
    "Creditor or lender",
    "Account reference",
    "What records or accounting is requested",
  ],
  irs_inquiry_dispute: [
    "Taxpayer name",
    "Mailing address",
    "IRS notice or account reference",
    "Tax year or period",
    "Why the IRS position is disputed",
  ],
} as const satisfies Record<
  Exclude<CursiveCategorySlug, "credit_bureau_dispute">,
  readonly string[]
>;

export const CursiveIntakeFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean(),
}).strict();

export type CursiveIntakeField = z.infer<typeof CursiveIntakeFieldSchema>;

export const CursiveIntakeSchemaSchema = z.object({
  fields: z.array(CursiveIntakeFieldSchema).nonempty(),
}).strict();

export type CursiveIntakeSchema = z.infer<typeof CursiveIntakeSchemaSchema>;

export const CREDIT_BUREAU_DISPUTE_INTAKE_FIELDS = [
  {
    key: "consumer_name",
    label: "Consumer name",
    required: true,
  },
  {
    key: "consumer_address",
    label: "Mailing address",
    required: true,
  },
  {
    key: "bureau_choice",
    label: "Credit bureau",
    required: true,
  },
  {
    key: "account_reference",
    label: "Account reference",
    required: true,
  },
  {
    key: "dispute_reason",
    label: "Dispute reason",
    required: true,
  },
] as const satisfies readonly CursiveIntakeField[];

export type CreditBureauDisputeIntakeField =
  (typeof CREDIT_BUREAU_DISPUTE_INTAKE_FIELDS)[number];

export type CreditBureauDisputeIntakeFieldKey =
  CreditBureauDisputeIntakeField["key"];

export const CURSIVE_DRAFT_STATUSES = [
  "drafting",
  "review_ready",
  "needs_revision",
  "approved",
] as const;

export const CursiveDraftStatusSchema = z.enum(CURSIVE_DRAFT_STATUSES);

export type CursiveDraftStatus = z.infer<typeof CursiveDraftStatusSchema>;

export const CursiveReviewResultSchema = z.object({
  status: CursiveDraftStatusSchema,
  notes: z.array(z.string()),
}).strict();

export type CursiveReviewResult = z.infer<typeof CursiveReviewResultSchema>;

export const CursivePromptPayloadSchema = z.object({
  systemPrompt: z.string().min(1),
  draftInstructions: z.array(z.string()).nonempty(),
}).strict();

export type CursivePromptPayload = z.infer<typeof CursivePromptPayloadSchema>;

export const CursiveTemplatePayloadSchema = z.object({
  salutation: z.string().min(1),
  closing: z.string().min(1),
}).strict();

export type CursiveTemplatePayload = z.infer<typeof CursiveTemplatePayloadSchema>;
