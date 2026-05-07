import { useState, type FormEvent } from "react";

export type DocumentWizardReportFormData = {
  clientName: string;
  objective: string;
};

type DocumentWizardFormProps = {
  disabled?: boolean;
  onSubmit: (
    formData: DocumentWizardReportFormData,
  ) => Promise<void> | void;
};

function normalizeField(value: string) {
  return value.replace(/\s+/gu, " ").trim();
}

export function DocumentWizardForm({
  disabled = false,
  onSubmit,
}: DocumentWizardFormProps) {
  const [clientName, setClientName] = useState("");
  const [objective, setObjective] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedFormData = {
      clientName: normalizeField(clientName),
      objective: normalizeField(objective),
    };

    if (!normalizedFormData.clientName) {
      setError("Client name is required.");
      return;
    }

    if (!normalizedFormData.objective) {
      setError("Objective is required.");
      return;
    }

    setError(null);
    await onSubmit(normalizedFormData);
  }

  return (
    <form className="document-form" onSubmit={handleSubmit}>
      {error ? <p role="alert" className="alert-banner">{error}</p> : null}
      <label className="field">
        <span className="field-label">Client name</span>
        <input
          aria-label="Client name"
          disabled={disabled}
          onChange={(event) => {
            setClientName(event.target.value);
            if (error) {
              setError(null);
            }
          }}
          value={clientName}
        />
      </label>
      <label className="field">
        <span className="field-label">Objective</span>
        <textarea
          aria-label="Objective"
          disabled={disabled}
          onChange={(event) => {
            setObjective(event.target.value);
            if (error) {
              setError(null);
            }
          }}
          rows={4}
          value={objective}
        />
      </label>
      <button className="primary-button" disabled={disabled} type="submit">
        Generate report
      </button>
    </form>
  );
}
