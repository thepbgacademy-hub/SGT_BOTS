import { useState, type FormEvent } from "react";

type SessionSnapshot = {
  id: string;
  provider: "openai" | "anthropic";
  startedAt: string;
  expiresAt: string;
  durationSeconds: number;
  remainingSeconds: number;
  state: "active" | "expired" | "reauth_required";
};

type ProviderConnectPanelProps = {
  initData: string;
  onConnected: (result: {
    session: SessionSnapshot;
    sessionToken: string;
  }) => void;
};

export function ProviderConnectPanel({
  initData,
  onConnected,
}: ProviderConnectPanelProps) {
  const [provider, setProvider] = useState<"openai" | "anthropic">("openai");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/providers/connect", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-telegram-init-data": initData,
        },
        body: JSON.stringify({
          provider,
          apiKey,
        }),
      });
      const payload = (await response.json()) as {
        message?: string;
        session?: SessionSnapshot;
        sessionToken?: string;
      };

      if (!response.ok || !payload.session || !payload.sessionToken) {
        setError(payload.message ?? "Provider validation failed.");
        setSubmitting(false);
        return;
      }

      onConnected({
        session: payload.session,
        sessionToken: payload.sessionToken,
      });
    } catch {
      setError("Provider validation failed.");
      setSubmitting(false);
    }
  }

  return (
    <form className="form-grid provider-form" onSubmit={handleSubmit}>
      {error ? <p role="alert" className="alert-banner">{error}</p> : null}
      <label className="field">
        <span className="field-label">Provider</span>
        <select
          aria-label="Provider"
          onChange={(event) =>
            setProvider(event.target.value as "openai" | "anthropic")
          }
          value={provider}
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
        </select>
      </label>
      <label className="field field--full">
        <span className="field-label">API key</span>
        <input
          aria-label="API key"
          name="apiKey"
          onChange={(event) => setApiKey(event.target.value)}
          type="password"
          value={apiKey}
        />
      </label>
      <div className="provider-hint field--full">
        The playground stays locked until your key validates. This connection is
        session-only and expires with the timer.
      </div>
      <div className="form-actions field--full">
        <button className="primary-button" disabled={submitting} type="submit">
          Validate provider
        </button>
      </div>
    </form>
  );
}
