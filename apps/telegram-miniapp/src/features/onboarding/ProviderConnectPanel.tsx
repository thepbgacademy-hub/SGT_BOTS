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
    <form onSubmit={handleSubmit}>
      {error ? <p role="alert">{error}</p> : null}
      <label>
        Provider
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
      <label>
        API key
        <input
          aria-label="API key"
          name="apiKey"
          onChange={(event) => setApiKey(event.target.value)}
          type="password"
          value={apiKey}
        />
      </label>
      <button disabled={submitting} type="submit">
        Validate provider
      </button>
    </form>
  );
}
