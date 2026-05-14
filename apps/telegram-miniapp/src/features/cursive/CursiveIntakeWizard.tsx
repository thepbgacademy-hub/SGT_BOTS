import {
  CREDIT_BUREAU_DISPUTE_INTAKE_FIELDS,
  CURSIVE_SCAFFOLD_FIELD_LABELS,
  type CreditBureauDisputeIntakeFieldKey,
} from "../../../../../packages/shared/src/contracts";
import type { CursiveCategorySlug } from "./CursiveCategoryPicker";
import { CURSIVE_ACTIVE_CATEGORY } from "./CursiveCategoryPicker";

type PlannedCursiveCategorySlug = Exclude<
  CursiveCategorySlug,
  typeof CURSIVE_ACTIVE_CATEGORY
>;

export type CursiveCreditDisputeIntake = {
  consumer_name: string;
  consumer_address: string;
  bureau_choice: string;
  account_reference: string;
  dispute_reason: string;
};

export type CursiveGenerationHandoffState = "idle" | "ready";

type CursiveIntakeWizardProps = {
  category: CursiveCategorySlug | null;
  hasPreview: boolean;
  isPreviewStale: boolean;
  isGeneratingPreview: boolean;
  intake: CursiveCreditDisputeIntake;
  onChange: (field: keyof CursiveCreditDisputeIntake, value: string) => void;
  onGenerate: () => void;
};

export const EMPTY_CURSIVE_CREDIT_DISPUTE_INTAKE: CursiveCreditDisputeIntake = {
  consumer_name: "",
  consumer_address: "",
  bureau_choice: "",
  account_reference: "",
  dispute_reason: "",
};

const CREDIT_BUREAU_DISPUTE_FIELD_LABELS = Object.freeze(
  Object.fromEntries(
    CREDIT_BUREAU_DISPUTE_INTAKE_FIELDS.map((field) => [field.key, field.label]),
  ) as Record<CreditBureauDisputeIntakeFieldKey, string>,
);

const CREDIT_BUREAU_DISPUTE_FIELD_LAYOUTS = Object.freeze({
  consumer_name: { className: "field", control: "input" },
  consumer_address: { className: "field field--full", control: "textarea" },
  bureau_choice: { className: "field", control: "select" },
  account_reference: { className: "field field--full", control: "input" },
  dispute_reason: { className: "field field--full", control: "textarea" },
} satisfies Record<
  CreditBureauDisputeIntakeFieldKey,
  {
    className: string;
    control: "input" | "select" | "textarea";
  }
>);

const CURSIVE_CATEGORY_SCAFFOLDS = Object.freeze({
  aggregator_dispute: {
    title: "Aggregator Dispute Intake",
    helperText:
      "This lane is scaffolded for dispute letters aimed at aggregator-style consumer reporting files.",
    requiredFields: [...CURSIVE_SCAFFOLD_FIELD_LABELS.aggregator_dispute],
  },
  direct_creditor_dispute: {
    title: "Direct Creditor Dispute Intake",
    helperText:
      "This lane is scaffolded for direct lender disputes such as inaccurate late payments, closures, or balances.",
    requiredFields: [...CURSIVE_SCAFFOLD_FIELD_LABELS.direct_creditor_dispute],
  },
  bill_collector_dispute: {
    title: "Bill Collector Dispute Intake",
    helperText:
      "This lane is scaffolded for validation requests, assignment questions, and bill-of-sale demands.",
    requiredFields: [...CURSIVE_SCAFFOLD_FIELD_LABELS.bill_collector_dispute],
  },
  utility_dispute: {
    title: "Utility Dispute Intake",
    helperText:
      "This lane is scaffolded for energy, internet, water, telecom, and similar service-charge disputes.",
    requiredFields: [...CURSIVE_SCAFFOLD_FIELD_LABELS.utility_dispute],
  },
  reconsideration_request: {
    title: "Reconsideration Request Intake",
    helperText:
      "This lane is scaffolded for credit and account reconsideration requests after a denial.",
    requiredFields: [...CURSIVE_SCAFFOLD_FIELD_LABELS.reconsideration_request],
  },
  full_account_history_request: {
    title: "Full Account History Request Intake",
    helperText:
      "This lane is scaffolded for complete account-history, accounting, and records-package requests.",
    requiredFields: [...CURSIVE_SCAFFOLD_FIELD_LABELS.full_account_history_request],
  },
  irs_inquiry_dispute: {
    title: "IRS Inquiry / Dispute Intake",
    helperText:
      "This lane is scaffolded for IRS notices and account-level disputes that will later use IRM-grounded drafting.",
    requiredFields: [...CURSIVE_SCAFFOLD_FIELD_LABELS.irs_inquiry_dispute],
  },
} satisfies Record<
  PlannedCursiveCategorySlug,
  {
    title: string;
    helperText: string;
    requiredFields: string[];
  }
>);

export function isCursiveCreditDisputeIntakeComplete(
  intake: CursiveCreditDisputeIntake,
) {
  return Object.values(intake).every((value) => value.trim().length > 0);
}

export function isCursiveOfficialCategory(
  category: CursiveCategorySlug | null,
): category is typeof CURSIVE_ACTIVE_CATEGORY {
  return category === CURSIVE_ACTIVE_CATEGORY;
}

export function isCursiveDocumentLaneUnlocked(
  category: CursiveCategorySlug | null,
  previewHtml: string | null,
  isPreviewStale = false,
) {
  return (
    isCursiveOfficialCategory(category) &&
    previewHtml !== null &&
    !isPreviewStale
  );
}

export function getCoherentCursiveGenerationState(
  category: CursiveCategorySlug | null,
  intake: CursiveCreditDisputeIntake,
): CursiveGenerationHandoffState {
  if (!isCursiveOfficialCategory(category)) {
    return "idle";
  }

  return isCursiveCreditDisputeIntakeComplete(intake) ? "ready" : "idle";
}

function getCreditBureauDisputeFieldLabel(key: CreditBureauDisputeIntakeFieldKey) {
  return CREDIT_BUREAU_DISPUTE_FIELD_LABELS[key];
}

function renderCreditBureauDisputeField(
  fieldKey: CreditBureauDisputeIntakeFieldKey,
  intake: CursiveCreditDisputeIntake,
  onChange: CursiveIntakeWizardProps["onChange"],
) {
  const label = getCreditBureauDisputeFieldLabel(fieldKey);
  const layout = CREDIT_BUREAU_DISPUTE_FIELD_LAYOUTS[fieldKey];

  if (layout.control === "select") {
    return (
      <label className={layout.className} key={fieldKey}>
        <span className="field-label">{label}</span>
        <select
          aria-label={label}
          onChange={(event) => onChange(fieldKey, event.target.value)}
          value={intake[fieldKey]}
        >
          <option value="">Select a bureau</option>
          <option value="equifax">Equifax</option>
          <option value="experian">Experian</option>
          <option value="transunion">TransUnion</option>
        </select>
      </label>
    );
  }

  if (layout.control === "textarea") {
    return (
      <label className={layout.className} key={fieldKey}>
        <span className="field-label">{label}</span>
        <textarea
          aria-label={label}
          onChange={(event) => onChange(fieldKey, event.target.value)}
          value={intake[fieldKey]}
        />
      </label>
    );
  }

  return (
    <label className={layout.className} key={fieldKey}>
      <span className="field-label">{label}</span>
      <input
        aria-label={label}
        onChange={(event) => onChange(fieldKey, event.target.value)}
        value={intake[fieldKey]}
      />
    </label>
  );
}

function isPlannedCursiveCategory(
  category: CursiveCategorySlug | null,
): category is PlannedCursiveCategorySlug {
  return Boolean(category && category in CURSIVE_CATEGORY_SCAFFOLDS);
}

export function CursiveIntakeWizard({
  category,
  hasPreview,
  isPreviewStale,
  isGeneratingPreview,
  intake,
  onChange,
  onGenerate,
}: CursiveIntakeWizardProps) {
  if (!isCursiveOfficialCategory(category)) {
    if (isPlannedCursiveCategory(category)) {
      const scaffold = CURSIVE_CATEGORY_SCAFFOLDS[category];

      return (
        <section className="cursive-card cursive-card--muted">
          <div className="cursive-card__header">
            <div>
              <p className="eyebrow">Official Intake</p>
              <h3>{scaffold.title}</h3>
            </div>
            <p className="panel-description">{scaffold.helperText}</p>
          </div>
          <div className="workspace-guidance">
            <p className="workspace-guidance__title">Planned required fields</p>
            <ul className="workspace-guidance__list">
              {scaffold.requiredFields.map((field) => (
              <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
          <p className="muted-copy">
            Preview generation is not live for this category yet. The intake
            scaffold is here so we can validate the workflow shape before the
            category-specific drafting lane ships.
          </p>
        </section>
      );
    }

    return (
      <section className="cursive-card cursive-card--muted">
        <p className="eyebrow">Official Intake</p>
        <h3>Select an active category</h3>
        <p className="muted-copy">
          Helper chat stays available, but Cursive only unlocks the document lane
          after the official intake is complete and previewed.
        </p>
      </section>
    );
  }

  const intakeComplete = isCursiveCreditDisputeIntakeComplete(intake);

  return (
    <section className="cursive-card" aria-label="Official Cursive intake panel">
      <div className="cursive-card__header">
        <div>
          <p className="eyebrow">Official Intake</p>
          <h3>Credit Bureau Dispute Intake</h3>
        </div>
        <p className="panel-description">
          These required fields stay separate from helper chat and become the
          source of truth for generation.
        </p>
      </div>

      <div className="form-grid cursive-intake-grid">
        {CREDIT_BUREAU_DISPUTE_INTAKE_FIELDS.map((field) =>
          renderCreditBureauDisputeField(field.key, intake, onChange),
        )}
      </div>

      <div
        className={[
          "cursive-generation-lane",
          intakeComplete ? "is-ready" : "is-locked",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div>
          <p className="cursive-generation-lane__title">Document workflow</p>
          <p className="muted-copy">
            {isGeneratingPreview
              ? "Generating the Cursive preview from the latest official intake."
              : hasPreview && isPreviewStale
              ? "Official intake changed. Refresh preview before saving the PDF draft."
              : hasPreview
              ? "Preview ready below. Update any field and regenerate anytime before saving the PDF draft."
              : intakeComplete
                ? "Official intake complete. Generate a preview before saving the PDF draft."
                : "Complete every required intake field to unlock generation."}
          </p>
        </div>
        <button
          className="primary-button"
          disabled={!intakeComplete || isGeneratingPreview}
          onClick={onGenerate}
          type="button"
        >
          {isGeneratingPreview
            ? "Generating preview..."
            : hasPreview
              ? "Refresh preview"
              : "Generate dispute letter"}
        </button>
      </div>
    </section>
  );
}
