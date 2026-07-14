import { useState, type FormEvent } from "react";

type FormWizardIntakeField = {
  key: "form_title" | "requested_output" | "key_details";
  label: string;
  prompt: string;
};

const GUIDED_INTAKE_FIELDS: FormWizardIntakeField[] = [
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
];

type FormWizardPanelProps = {
  sessionId: string;
  sessionToken: string;
};

type IntakeValues = Record<FormWizardIntakeField["key"], string>;

const EMPTY_INTAKE: IntakeValues = {
  form_title: "",
  requested_output: "",
  key_details: "",
};

export function FormWizardPanel({
  sessionId,
  sessionToken,
}: FormWizardPanelProps) {
  const [intake, setIntake] = useState<IntakeValues>(EMPTY_INTAKE);
  const [isSubmitting, setSubmitting] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  );
  const [readyMessage, setReadyMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setSubmitting(true);
    setValidationMessage(null);
    setReadyMessage(null);

    try {
      const response = await fetch(
        "/api/form-wizard/workflow/guided-intake/validate",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${sessionToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            intake,
          }),
        },
      );
      const payload = (await response.json()) as {
        status?: "incomplete" | "ready";
        message?: string;
      };

      if (response.ok && payload.status === "ready") {
        setReadyMessage(
          payload.message ??
            "All required fields are captured and validated. This intake is ready.",
        );
        return;
      }

      setValidationMessage(
        payload.message ?? "This intake is not ready to submit yet.",
      );
    } catch {
      setValidationMessage("Unable to validate the intake. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel chat-panel form-wizard-panel">
      <header className="panel-header">
        <div>
          <p className="eyebrow">Guided Intake</p>
          <h2>ShAzZaM!</h2>
        </div>
      </header>
      <p className="muted-copy">
        ShAzZaM! is a form engine, not a chat assistant. Complete the required
        fields below and it will validate the intake before anything is
        submitted.
      </p>
      <form className="form-grid" onSubmit={handleSubmit}>
        {GUIDED_INTAKE_FIELDS.map((field) => (
          <label className="field field--full" key={field.key}>
            <span className="field-label">{field.label}</span>
            <input
              name={field.key}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setIntake((currentIntake) => ({
                  ...currentIntake,
                  [field.key]: value,
                }));
              }}
              placeholder={field.prompt}
              type="text"
              value={intake[field.key]}
            />
          </label>
        ))}
        <div className="form-actions field--full">
          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Validating" : "Validate intake"}
          </button>
        </div>
      </form>
      {validationMessage ? (
        <p className="alert-banner">{validationMessage}</p>
      ) : null}
      {readyMessage ? <p className="success-banner">{readyMessage}</p> : null}
    </section>
  );
}
