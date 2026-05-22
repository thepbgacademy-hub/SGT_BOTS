import type {
  CursiveControlledAssertion,
  CursiveEvidencePosture,
  CursiveViolationType,
} from "../../../../../packages/shared/src/contracts/cursive";

export type CursiveDoctrine = CursiveEvidencePosture;

export type CursiveCategoryConfig = {
  category: {
    slug: string;
    displayName: string;
    helperMode: "helper-only";
    outputModes: readonly string[];
    enabled: boolean;
    sortOrder: number;
    summary: string;
  };
  intakeSchema: {
    schemaVersion: string;
    helperMode: "helper-only";
    intakeSchema: {
      fields: readonly {
        key: string;
        label: string;
        required: boolean;
      }[];
    };
  };
  promptProfile: {
    promptVersion: string;
    helperMode: "helper-only";
    promptPayload: {
      systemPrompt: string;
      draftInstructions: readonly string[];
    };
  };
  citations: readonly CursiveRepoCitation[];
  addresses: readonly CursiveRepoAddress[];
  templateDefaults: {
    templateVersion: string;
    helperMode: "helper-only";
    templatePayload: {
      salutation: string;
      closing: string;
    };
  };
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

export type CursiveViolationDefinition = {
  doctrine: CursiveDoctrine;
  evidencePosture: CursiveEvidencePosture;
  id: CursiveViolationType;
  label: string;
  controlledAssertions: readonly CursiveControlledAssertion[];
};

function freezeControlledAssertions(
  controlledAssertions: CursiveControlledAssertion[],
) {
  return Object.freeze(
    controlledAssertions.map((item) => Object.freeze({ ...item })),
  ) as readonly CursiveControlledAssertion[];
}

function defineViolation(input: {
  evidencePosture: CursiveEvidencePosture;
  id: CursiveViolationType;
  label: string;
  controlledAssertions: CursiveControlledAssertion[];
}): Readonly<CursiveViolationDefinition> {
  return Object.freeze({
    doctrine: input.evidencePosture,
    evidencePosture: input.evidencePosture,
    id: input.id,
    label: input.label,
    controlledAssertions: freezeControlledAssertions(
      input.controlledAssertions,
    ),
  });
}

const VIOLATIONS: Record<CursiveViolationType, Readonly<CursiveViolationDefinition>> =
  {
    different_balances_across_bureaus: defineViolation({
      evidencePosture: "cross_bureau_inconsistency",
      id: "different_balances_across_bureaus",
      label: "Different balances across bureaus",
      controlledAssertions: [
        {
          id: "balance_inconsistency",
          label:
            "This account is reported with inconsistent balances across bureaus",
        },
      ],
    }),
    different_delinquency_dates_across_bureaus: defineViolation({
      evidencePosture: "cross_bureau_inconsistency",
      id: "different_delinquency_dates_across_bureaus",
      label: "Different delinquency dates across bureaus",
      controlledAssertions: [
        {
          id: "date_inconsistency",
          label:
            "This account is reported with inconsistent delinquency dates across bureaus",
        },
      ],
    }),
    incorrect_account_number_across_bureaus: defineViolation({
      evidencePosture: "cross_bureau_inconsistency",
      id: "incorrect_account_number_across_bureaus",
      label: "Incorrect account number across bureaus",
      controlledAssertions: [
        {
          id: "account_id_inconsistency",
          label:
            "This account is reported with conflicting account identifiers across bureaus",
        },
      ],
    }),
    incorrect_creditor_name_across_bureaus: defineViolation({
      evidencePosture: "cross_bureau_inconsistency",
      id: "incorrect_creditor_name_across_bureaus",
      label: "Incorrect creditor or furnisher name across bureaus",
      controlledAssertions: [
        {
          id: "creditor_name_inconsistency",
          label:
            "This account is reported with conflicting creditor or furnisher names across bureaus",
        },
      ],
    }),
    incorrect_payment_status_across_bureaus: defineViolation({
      evidencePosture: "cross_bureau_inconsistency",
      id: "incorrect_payment_status_across_bureaus",
      label: "Incorrect payment status across bureaus",
      controlledAssertions: [
        {
          id: "status_inconsistency",
          label:
            "This account is reported with inconsistent payment status across bureaus",
        },
      ],
    }),
    open_closed_status_conflict_across_bureaus: defineViolation({
      evidencePosture: "cross_bureau_inconsistency",
      id: "open_closed_status_conflict_across_bureaus",
      label: "Open/closed status conflict across bureaus",
      controlledAssertions: [
        {
          id: "open_closed_inconsistency",
          label:
            "This account is reported with conflicting open and closed status across bureaus",
        },
      ],
    }),
    incorrect_account_number: defineViolation({
      evidencePosture: "single_bureau_inaccuracy_with_proof",
      id: "incorrect_account_number",
      label: "Incorrect account number",
      controlledAssertions: [
        {
          id: "no_account_with_reported_number",
          label: "I have no account with this reported account number",
        },
      ],
    }),
    incorrect_creditor_name: defineViolation({
      evidencePosture: "single_bureau_inaccuracy_with_proof",
      id: "incorrect_creditor_name",
      label: "Incorrect creditor or furnisher name",
      controlledAssertions: [
        {
          id: "no_account_with_reported_creditor",
          label: "I have no account with this reported creditor or furnisher",
        },
      ],
    }),
    duplicate_creditor_or_collector_reporting: defineViolation({
      evidencePosture: "single_bureau_inaccuracy_with_proof",
      id: "duplicate_creditor_or_collector_reporting",
      label: "Duplicate creditor or collector reporting",
      controlledAssertions: [
        {
          id: "duplicate_reporting",
          label:
            "These entries report the same underlying account more than once",
        },
      ],
    }),
    incorrect_payment_status: defineViolation({
      evidencePosture: "single_bureau_inaccuracy_with_proof",
      id: "incorrect_payment_status",
      label: "Incorrect payment status",
      controlledAssertions: [
        {
          id: "reported_status_inaccurate",
          label: "This reported payment status is inaccurate",
        },
      ],
    }),
    closed_account_reported_as_open: defineViolation({
      evidencePosture: "single_bureau_inaccuracy_with_proof",
      id: "closed_account_reported_as_open",
      label: "Closed account reported as open",
      controlledAssertions: [
        {
          id: "closed_but_open",
          label: "This account is being reported as open when it is closed",
        },
      ],
    }),
    account_not_mine: defineViolation({
      evidencePosture: "single_bureau_inaccuracy_with_proof",
      id: "account_not_mine",
      label: "Account not mine",
      controlledAssertions: [
        {
          id: "account_not_mine",
          label: "This account is not mine",
        },
      ],
    }),
  };

const VIOLATION_DEFINITIONS = Object.freeze(
  Object.values(VIOLATIONS),
) as readonly Readonly<CursiveViolationDefinition>[];

const CREDIT_BUREAU_DISPUTE_CONFIG: CursiveCategoryConfig = Object.freeze({
  category: Object.freeze({
    slug: "credit_bureau_dispute",
    displayName: "Credit Bureau Dispute",
    helperMode: "helper-only",
    outputModes: ["portal_text", "html_letter", "pdf_letter"],
    enabled: true,
    sortOrder: 10,
    summary:
      "Compatibility config for the Cursive preview and artifact route while the v2 output lane is migrated.",
  }),
  intakeSchema: Object.freeze({
    schemaVersion: "v1",
    helperMode: "helper-only",
    intakeSchema: Object.freeze({
      fields: Object.freeze([
        Object.freeze({ key: "consumer_name", label: "Consumer name", required: true }),
        Object.freeze({
          key: "consumer_address",
          label: "Mailing address",
          required: true,
        }),
        Object.freeze({ key: "bureau_choice", label: "Credit bureau", required: true }),
        Object.freeze({
          key: "account_reference",
          label: "Account reference",
          required: true,
        }),
        Object.freeze({ key: "dispute_reason", label: "Dispute reason", required: true }),
      ]),
    }),
  }),
  promptProfile: Object.freeze({
    promptVersion: "v1",
    helperMode: "helper-only",
    promptPayload: Object.freeze({
      systemPrompt:
        "Generate a narrow credit bureau removal-demand letter from controlled Cursive intake.",
      draftInstructions: Object.freeze([
        "Use only the official intake supplied to the route.",
        "Do not invent facts.",
        "Demand removal and proof of deletion.",
      ]),
    }),
  }),
  citations: Object.freeze([
    Object.freeze({
      citationKey: "fcra_general",
      citationText: "15 U.S.C. Secs. 1681 et seq. (FCRA)",
      sortOrder: 10,
    }),
    Object.freeze({
      citationKey: "fcra_1681eb",
      citationText: "15 U.S.C. Sec. 1681e(b)",
      sortOrder: 20,
    }),
    Object.freeze({
      citationKey: "fcra_611",
      citationText: "15 U.S.C. Sec. 1681i",
      sortOrder: 30,
    }),
  ]),
  addresses: Object.freeze([
    Object.freeze({
      addressKey: "experian_disputes",
      organizationName: "Experian",
      attentionLine: "Dispute by Mail",
      addressLine1: "P.O. Box 4500",
      addressLine2: "",
      city: "Allen",
      state: "TX",
      postalCode: "75013",
      country: "US",
      sortOrder: 10,
    }),
    Object.freeze({
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
    }),
    Object.freeze({
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
    }),
  ]),
  templateDefaults: Object.freeze({
    templateVersion: "v1",
    helperMode: "helper-only",
    templatePayload: Object.freeze({
      salutation: "To Whom It May Concern:",
      closing: "Sincerely,",
    }),
  }),
}) as CursiveCategoryConfig;

export function createCursiveRepo() {
  return {
    getCategoryConfig(categorySlug: string) {
      if (categorySlug !== CREDIT_BUREAU_DISPUTE_CONFIG.category.slug) {
        return null;
      }

      return CREDIT_BUREAU_DISPUTE_CONFIG;
    },
    listCategories() {
      return [CREDIT_BUREAU_DISPUTE_CONFIG.category] as const;
    },
    getDefaultCategoryConfig() {
      return CREDIT_BUREAU_DISPUTE_CONFIG;
    },
    getViolationDefinition(violationType: CursiveViolationType) {
      return VIOLATIONS[violationType] ?? null;
    },
    listViolationDefinitions() {
      return VIOLATION_DEFINITIONS;
    },
  };
}
