import { z } from "zod";

export const TopSecretVerdictSchema = z.enum([
  "true",
  "partially_verified",
  "misunderstood",
  "false",
  "not_enough_reliable_evidence",
]);

export const TopSecretCitationSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  publisher: z.string().min(1),
});

export const TopSecretSourceTypeSchema = z.enum([
  "statute",
  "regulation",
  "agency_guidance",
  "court_case",
  "official_explainer",
]);

export const TopSecretSourceBundleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  publisher: z.string().min(1),
  sourceType: TopSecretSourceTypeSchema,
  retrievedText: z.string().min(1),
  currentnessStatus: z.enum([
    "verified_current",
    "partially_verified",
    "not_verified",
  ]),
  detectedCitations: z.array(z.string().min(1)),
});

export const TopSecretSupportReferenceSchema = z.object({
  sourceId: z.string().min(1),
  supports: z.string().min(1),
});

export const TopSecretSourceCheckSchema = z.object({
  sourceId: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  publisher: z.string().min(1),
  currentnessStatus: z.enum([
    "verified_current",
    "partially_verified",
    "not_verified",
  ]),
  supportNote: z.string().min(1),
});

export const TopSecretHistoricalAuthoritySchema = z.object({
  authorityType: z.enum(["case", "dictionary", "encyclopedia", "treatise", "other"]),
  citationOrTitle: z.string().min(1),
  reportNote: z.string().min(1),
  currentApplicationStatus: z.enum([
    "controlling_not_verified",
    "historical_only",
    "limited_or_context_specific",
    "superseded_or_replaced",
  ]),
});

export const TopSecretClaimComponentSchema = z.object({
  label: z.string().min(1),
  summary: z.string().min(1),
});

export const TopSecretResearchContextNoteSchema = z.object({
  topic: z.enum([
    "all_caps_name",
    "debt_paid_with_debt",
    "debtor_creditor_status",
    "hj343_public_law_73_10",
    "income_tax_voluntary_compliance",
    "money_federal_reserve_notes",
    "prepaid_debt",
    "reviewed_pattern",
    "right_to_travel",
    "statutes_as_law",
    "tax_forms_treasury_credit_theory",
  ]),
  note: z.string().min(1),
});

export const TopSecretStatuteAnalysisSchema = z.object({
  citation: z.string().min(1),
  currentnessStatus: z.enum([
    "verified_current",
    "partially_verified",
    "not_verified",
  ]),
  applicabilityAnalysis: z.array(z.string().min(1)).min(1),
  canonsApplied: z.array(z.string().min(1)).min(1),
  consistencyChecks: z.array(z.string().min(1)).min(1),
  crossReferences: z.array(z.string().min(1)).min(1),
  currentnessVerification: z.object({
    jurisdiction: z.string().min(1),
    citation: z.string().min(1),
    officialSourceChecked: z.string().min(1),
    sourceCurrencyDate: z.string().min(1),
    effectiveDate: z.string().min(1),
    amendmentsChecked: z.string().min(1),
    repealSunsetChecked: z.string().min(1),
    codificationChecked: z.string().min(1),
    implementingRegulationsChecked: z.string().min(1),
    interpretiveCasesGuidanceChecked: z.string().min(1),
    verificationStatus: z.enum([
      "verified_current",
      "partially_verified",
      "not_verified",
    ]),
    limits: z.string().min(1),
  }),
  definitionsToCheck: z.array(z.string().min(1)).min(1),
  enforcementAnalysis: z.array(z.string().min(1)).min(1),
  exemptionsAndPreemption: z.array(z.string().min(1)).min(1),
  legalHierarchy: z.array(z.string().min(1)).min(1),
  notableAbsences: z.array(z.string().min(1)).min(1),
  operatorWordsToParse: z.array(z.string().min(1)).min(1),
  pastedMessage: z.string().min(1),
  plainEnglishSummary: z.string().min(1),
  regulatoryEcosystem: z.array(z.string().min(1)).min(1),
  requirementTypes: z.array(z.string().min(1)).min(1),
  structureFirst: z.array(z.string().min(1)).min(1),
  verificationPath: z.array(z.string().min(1)).min(1),
  whyMessageMayBeMisunderstood: z.string().min(1),
  readingChecklist: z.array(z.string().min(1)).min(1),
});

export const TopSecretFindingSchema = z.object({
  claim: z.string().min(1),
  analysis: z.string().min(1),
  commonSenseStatement: z.string().min(1).optional(),
  conclusion: z.string().min(1),
  verdict: TopSecretVerdictSchema,
  citations: z.array(TopSecretCitationSchema).min(1),
  claimComponents: z.array(TopSecretClaimComponentSchema).optional(),
  discoveredStatuteCitations: z.array(z.string().min(1)).optional(),
  historicalAuthorities: z.array(TopSecretHistoricalAuthoritySchema).optional(),
  researchContextNotes: z.array(TopSecretResearchContextNoteSchema).optional(),
  supportReferences: z.array(TopSecretSupportReferenceSchema).optional(),
  sourceChecks: z.array(TopSecretSourceCheckSchema).optional(),
  statuteAnalyses: z.array(TopSecretStatuteAnalysisSchema).optional(),
});

export const TopSecretReportInputSchema = z.object({
  claims: z.array(z.string().min(1)).min(1).max(5),
});

export type TopSecretVerdict = z.infer<typeof TopSecretVerdictSchema>;
export type TopSecretCitation = z.infer<typeof TopSecretCitationSchema>;
export type TopSecretSourceType = z.infer<typeof TopSecretSourceTypeSchema>;
export type TopSecretSourceBundle = z.infer<typeof TopSecretSourceBundleSchema>;
export type TopSecretSupportReference = z.infer<
  typeof TopSecretSupportReferenceSchema
>;
export type TopSecretSourceCheck = z.infer<typeof TopSecretSourceCheckSchema>;
export type TopSecretHistoricalAuthority = z.infer<
  typeof TopSecretHistoricalAuthoritySchema
>;
export type TopSecretClaimComponent = z.infer<
  typeof TopSecretClaimComponentSchema
>;
export type TopSecretResearchContextNote = z.infer<
  typeof TopSecretResearchContextNoteSchema
>;
export type TopSecretStatuteAnalysis = z.infer<
  typeof TopSecretStatuteAnalysisSchema
>;
export type TopSecretFinding = z.infer<typeof TopSecretFindingSchema>;
export type TopSecretReportInput = z.infer<typeof TopSecretReportInputSchema>;
