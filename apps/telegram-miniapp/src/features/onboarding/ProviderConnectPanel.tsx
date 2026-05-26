import { useState, type FormEvent } from "react";

type SessionSnapshot = {
  id: string;
  provider: "openai" | "anthropic" | "openai_codex";
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
  const [provider, setProvider] =
    useState<"openai" | "anthropic" | "openai_codex">("openai_codex");
  const [apiKey, setApiKey] = useState("");
  const [codexLogin, setCodexLogin] = useState<{
    oauthSessionId: string;
    userCode: string;
    verificationUrl: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    if (provider === "openai_codex") {
      setSubmitting(false);
      await startCodexLogin();
      return;
    }

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

  function handleProviderChange(value: "openai_codex" | "openai" | "anthropic") {
    setProvider(value);
    setError(null);
    if (value !== "openai_codex") {
      setCodexLogin(null);
    }
  }

  async function startCodexLogin() {
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/providers/openai-codex/oauth/start", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-telegram-init-data": initData,
        },
        body: JSON.stringify({}),
      });
      const payload = (await response.json()) as {
        message?: string;
        oauthSessionId?: string;
        userCode?: string;
        verificationUrl?: string;
      };

      if (
        !response.ok ||
        !payload.oauthSessionId ||
        !payload.userCode ||
        !payload.verificationUrl
      ) {
        setError(payload.message ?? "OpenAI Codex login failed to start.");
        setSubmitting(false);
        return;
      }

      setCodexLogin({
        oauthSessionId: payload.oauthSessionId,
        userCode: payload.userCode,
        verificationUrl: payload.verificationUrl,
      });
      setSubmitting(false);
      openProviderLogin(payload.verificationUrl);
    } catch {
      setError("OpenAI Codex login failed to start.");
      setSubmitting(false);
    }
  }

  async function checkCodexLogin() {
    if (!codexLogin) {
      setError("Start OpenAI Codex login first.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(
        `/api/providers/openai-codex/oauth/${encodeURIComponent(
          codexLogin.oauthSessionId,
        )}/status`,
        {
          headers: {
            "x-telegram-init-data": initData,
          },
        },
      );
      const payload = (await response.json()) as {
        message?: string;
        session?: SessionSnapshot;
        sessionToken?: string;
        status?: "pending" | "connected" | "expired" | "failed";
      };

      if (payload.status === "connected" && payload.session && payload.sessionToken) {
        onConnected({
          session: payload.session,
          sessionToken: payload.sessionToken,
        });
        return;
      }

      setError(
        payload.status === "pending"
          ? "OpenAI Codex login is still waiting for approval."
          : payload.message ?? "OpenAI Codex login needs to be restarted.",
      );
      setSubmitting(false);
    } catch {
      setError("Unable to check OpenAI Codex login.");
      setSubmitting(false);
    }
  }

  function openProviderLogin(verificationUrl: string) {
    const telegram = (
      window as Window & {
        Telegram?: {
          WebApp?: {
            openLink?: (url: string) => void;
          };
        };
      }
    ).Telegram?.WebApp;

    if (telegram?.openLink) {
      telegram.openLink(verificationUrl);
      return;
    }

    window.open(verificationUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <form className="form-grid provider-form" onSubmit={handleSubmit}>
      {error ? <p role="alert" className="alert-banner">{error}</p> : null}
      <p className="provider-hint field--full">
        Connect once here to unlock the whole playground session. Cursive, Top
        Secret, Rori, Condor, and the rest of the bots all use this same
        three-hour connection.
      </p>
      <label className="field field--full">
        <span className="field-label">Provider</span>
        <select
          aria-label="Provider"
          onChange={(event) =>
            handleProviderChange(
              event.target.value as "openai_codex" | "openai" | "anthropic",
            )
          }
          value={provider}
        >
          <option value="openai_codex">OpenAI Codex</option>
          <option value="openai">OpenAI API key</option>
          <option value="anthropic">Anthropic API key</option>
        </select>
      </label>
      {provider === "openai_codex" ? (
        <div className="field field--full provider-oauth-panel">
          <p className="provider-hint">
            Sign in with the OpenAI account that has your Codex subscription.
            Open the login page, enter the code, then check the login here.
          </p>
          <button
            className="primary-button"
            disabled={submitting}
            onClick={startCodexLogin}
            type="button"
          >
            Connect OpenAI Codex
          </button>
          {codexLogin ? (
            <div className="oauth-code-row" aria-label="OpenAI Codex login steps">
              <button
                className="secondary-button"
                disabled={submitting}
                onClick={() => openProviderLogin(codexLogin.verificationUrl)}
                type="button"
              >
                Open login
              </button>
              <strong className="oauth-code-chip" aria-label="OpenAI Codex login code">
                {codexLogin.userCode}
              </strong>
              <button
                className="secondary-button"
                disabled={submitting}
                onClick={checkCodexLogin}
                type="button"
              >
                Check login
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <>
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
        </>
      )}
    </form>
  );
}
