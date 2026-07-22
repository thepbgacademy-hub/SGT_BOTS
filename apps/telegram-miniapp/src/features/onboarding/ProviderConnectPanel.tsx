import { useEffect, useState, type FormEvent } from "react";

type SessionSnapshot = {
  id: string;
  provider: "openai" | "anthropic" | "openai_codex";
  startedAt: string;
  expiresAt: string;
  durationSeconds: number;
  remainingSeconds: number;
  state: "active" | "expired" | "reauth_required";
};

type CodexOAuthStatusPayload = {
  message?: string;
  session?: SessionSnapshot;
  sessionToken?: string;
  status?: "pending" | "connected" | "expired" | "failed";
};

export type CodexOAuthPollAction =
  | { type: "connected"; session: SessionSnapshot; sessionToken: string }
  | { type: "stop"; message: string }
  | { type: "continue" };

export function resolveCodexOAuthPollAction(
  payload: CodexOAuthStatusPayload | null,
): CodexOAuthPollAction {
  if (!payload) {
    return { type: "continue" };
  }

  if (
    payload.status === "connected" &&
    payload.session &&
    payload.sessionToken
  ) {
    return {
      type: "connected",
      session: payload.session,
      sessionToken: payload.sessionToken,
    };
  }

  if (payload.status === "expired" || payload.status === "failed") {
    return {
      type: "stop",
      message:
        payload.message ?? "OpenAI Codex login needs to be restarted.",
    };
  }

  return { type: "continue" };
}

// Approval happens in a separate Telegram/browser tab, so this only needs to
// notice a completed human action, not react in real time like the 1s
// session-timer poll (flagged separately as too aggressive).
const CODEX_OAUTH_POLL_INTERVAL_MS = 4_000;

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

  async function fetchCodexOAuthStatus(
    oauthSessionId: string,
  ): Promise<CodexOAuthStatusPayload | null> {
    try {
      const response = await fetch(
        `/api/providers/openai-codex/oauth/${encodeURIComponent(
          oauthSessionId,
        )}/status`,
        {
          headers: {
            "x-telegram-init-data": initData,
          },
        },
      );

      return (await response.json()) as CodexOAuthStatusPayload;
    } catch {
      return null;
    }
  }

  async function checkCodexLogin() {
    if (!codexLogin) {
      setError("Start OpenAI Codex login first.");
      return;
    }

    setError(null);
    setSubmitting(true);

    const payload = await fetchCodexOAuthStatus(codexLogin.oauthSessionId);

    if (!payload) {
      setError("Unable to check OpenAI Codex login.");
      setSubmitting(false);
      return;
    }

    const action = resolveCodexOAuthPollAction(payload);

    if (action.type === "connected") {
      onConnected({ session: action.session, sessionToken: action.sessionToken });
      return;
    }

    if (action.type === "stop") {
      setError(action.message);
      setCodexLogin(null);
      setSubmitting(false);
      return;
    }

    setError("OpenAI Codex login is still waiting for approval.");
    setSubmitting(false);
  }

  useEffect(() => {
    if (provider !== "openai_codex" || !codexLogin) {
      return;
    }

    let cancelled = false;
    const oauthSessionId = codexLogin.oauthSessionId;

    const intervalId = window.setInterval(() => {
      void (async () => {
        const payload = await fetchCodexOAuthStatus(oauthSessionId);

        if (cancelled || !payload) {
          return;
        }

        const action = resolveCodexOAuthPollAction(payload);

        if (action.type === "connected") {
          cancelled = true;
          window.clearInterval(intervalId);
          onConnected({
            session: action.session,
            sessionToken: action.sessionToken,
          });
          return;
        }

        if (action.type === "stop") {
          cancelled = true;
          window.clearInterval(intervalId);
          setError(action.message);
          setCodexLogin(null);
        }
      })();
    }, CODEX_OAUTH_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
    // onConnected/setError/setCodexLogin are stable setters/props; keying on
    // codexLogin+provider is what actually starts/stops/restarts the poll.
  }, [codexLogin, provider]);

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
        Secret, Rori, Insight, ShAzZaM!, and Condor all use this same
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
