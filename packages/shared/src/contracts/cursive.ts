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

export const CursiveControlledAssertionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
}).strict();

export type CursiveMode = z.infer<typeof CursiveModeSchema>;
export type CursiveEvidencePosture = z.infer<typeof CursiveEvidencePostureSchema>;
export type CursiveReportType = z.infer<typeof CursiveReportTypeSchema>;
export type CursiveViolationType = z.infer<typeof CursiveViolationTypeSchema>;
export type CursiveControlledAssertion = z.infer<
  typeof CursiveControlledAssertionSchema
>;
