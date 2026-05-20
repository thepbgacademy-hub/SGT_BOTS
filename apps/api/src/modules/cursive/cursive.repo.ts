import type {
  CursiveControlledAssertion,
  CursiveEvidencePosture,
  CursiveViolationType,
} from "../../../../../packages/shared/src/contracts/cursive";

export type CursiveDoctrine = CursiveEvidencePosture;

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

export function createCursiveRepo() {
  return {
    getViolationDefinition(violationType: CursiveViolationType) {
      return VIOLATIONS[violationType] ?? null;
    },
    listViolationDefinitions() {
      return VIOLATION_DEFINITIONS;
    },
  };
}
