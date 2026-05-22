import { z } from "zod";

export const CursiveModeSchema = z.enum([
  "manual_dispute",
  "analyze_uploaded_report",
]);

export const CursiveEvidencePostureSchema = z.enum([
  "cross_bureau_inconsistency",
  "single_bureau_inaccuracy_with_proof",
]);

export const CursiveReportTypeSchema = z.enum([
  "tri_merge",
  "single_bureau",
]);

export const CursiveViolationTypeSchema = z.enum([
  "different_balances_across_bureaus",
  "different_delinquency_dates_across_bureaus",
  "incorrect_account_number_across_bureaus",
  "incorrect_creditor_name_across_bureaus",
  "incorrect_payment_status_across_bureaus",
  "open_closed_status_conflict_across_bureaus",
  "incorrect_account_number",
  "incorrect_creditor_name",
  "duplicate_creditor_or_collector_reporting",
  "incorrect_payment_status",
  "closed_account_reported_as_open",
  "account_not_mine",
]);

export const CURSIVE_DRAFT_STATUSES = [
  "drafting",
  "review_ready",
  "needs_revision",
  "approved",
] as const;

export const CursiveIntakeFieldSchema = z
  .object({
    key: z.string().min(1),
    label: z.string().min(1),
    required: z.boolean(),
  })
  .strict();

export const CursiveIntakeSchemaSchema = z
  .object({
    fields: z.array(CursiveIntakeFieldSchema).min(1),
  })
  .strict();

export const CursivePromptPayloadSchema = z
  .object({
    systemPrompt: z.string().min(1),
    draftInstructions: z.array(z.string().min(1)).min(1),
  })
  .strict();

export const CursiveTemplatePayloadSchema = z
  .object({
    salutation: z.string().min(1),
    closing: z.string().min(1),
  })
  .strict();

export const CursiveControlledAssertionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
}).strict();

export const CursiveReviewResultSchema = z
  .object({
    status: z.enum(CURSIVE_DRAFT_STATUSES),
    notes: z.array(z.string()),
  })
  .strict();

export type CursiveMode = z.infer<typeof CursiveModeSchema>;
export type CursiveEvidencePosture = z.infer<typeof CursiveEvidencePostureSchema>;
export type CursiveReportType = z.infer<typeof CursiveReportTypeSchema>;
export type CursiveViolationType = z.infer<typeof CursiveViolationTypeSchema>;
export type CursiveIntakeSchema = z.infer<typeof CursiveIntakeSchemaSchema>;
export type CursivePromptPayload = z.infer<typeof CursivePromptPayloadSchema>;
export type CursiveTemplatePayload = z.infer<
  typeof CursiveTemplatePayloadSchema
>;
export type CursiveControlledAssertion = z.infer<
  typeof CursiveControlledAssertionSchema
>;
export type CursiveReviewResult = z.infer<typeof CursiveReviewResultSchema>;
