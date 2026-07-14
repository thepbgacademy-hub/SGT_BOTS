export const FORM_WIZARD_GUIDED_INTAKE_MODE = "guided_intake" as const;

export const FORM_WIZARD_GUIDED_INTAKE_FIELDS = [
  {
    key: "form_title",
    label: "Form title",
    prompt: "What should this form be called?",
  },
  {
    key: "requested_output",
    label: "Requested output",
    prompt: "What finished output should this form produce?",
  },
  {
    key: "key_details",
    label: "Key details",
    prompt: "What details must the final output include?",
  },
] as const;

export type FormWizardGuidedIntakeFieldKey =
  (typeof FORM_WIZARD_GUIDED_INTAKE_FIELDS)[number]["key"];

export type FormWizardGuidedIntake = Record<
  FormWizardGuidedIntakeFieldKey,
  string
>;

export function getMissingGuidedIntakeFields(
  intake: Partial<FormWizardGuidedIntake>,
) {
  return FORM_WIZARD_GUIDED_INTAKE_FIELDS.filter((field) => {
    const value = intake[field.key];

    return typeof value !== "string" || value.trim().length === 0;
  });
}

export function createFormWizardService() {
  return {
    getWorkflowEntry() {
      return {
        botId: "form_wizard" as const,
        chatEnabled: false,
        modes: [FORM_WIZARD_GUIDED_INTAKE_MODE] as const,
        intakeFields: FORM_WIZARD_GUIDED_INTAKE_FIELDS.map((field) => ({
          key: field.key,
          label: field.label,
          prompt: field.prompt,
        })),
      };
    },
    validateGuidedIntake(intake: Partial<FormWizardGuidedIntake>) {
      const missingFields = getMissingGuidedIntakeFields(intake);

      if (missingFields.length > 0) {
        const missingFieldLabels = missingFields.map((field) => field.label);

        return {
          status: "incomplete" as const,
          missingFields: missingFields.map((field) => field.key),
          missingFieldLabels,
          message: `Missing required intake fields: ${missingFieldLabels.join(", ")}`,
        };
      }

      const normalizedIntake = Object.fromEntries(
        FORM_WIZARD_GUIDED_INTAKE_FIELDS.map((field) => [
          field.key,
          String(intake[field.key]).trim(),
        ]),
      ) as FormWizardGuidedIntake;

      return {
        status: "ready" as const,
        intake: normalizedIntake,
        message:
          "All required fields are captured and validated. This intake is ready.",
      };
    },
  };
}
