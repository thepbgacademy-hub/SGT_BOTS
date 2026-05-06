import { useEffect, useState } from "react";
import { ProviderConnectPanel } from "../onboarding/ProviderConnectPanel";
import { formatRemaining } from "../../lib/timer";

type SessionSnapshot = {
  id: string;
  provider: "openai" | "anthropic";
  startedAt: string;
  expiresAt: string;
  durationSeconds: number;
  remainingSeconds: number;
  state: "active" | "expired" | "reauth_required";
};

type DashboardShellProps = {
  initData: string;
  preferredName: string;
};

export function DashboardShell({
  initData,
  preferredName,
}: DashboardShellProps) {
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || session.state !== "active" || !sessionToken) {
      return;
    }

    const intervalId = window.setInterval(async () => {
      try {
        const authenticatedResponse = await fetch(`/api/sessions/${session.id}`, {
          headers: {
            authorization: `Bearer ${sessionToken}`,
          },
        });

        if (!authenticatedResponse.ok) {
          throw new Error("session refresh failed");
        }

        const payload = (await authenticatedResponse.json()) as {
          session: SessionSnapshot;
        };
        setSession(payload.session);
      } catch {
        setSessionError("Unable to refresh provider session.");
      }
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [session, sessionToken]);

  const isSessionActive = session?.state === "active";
  const requiresRelaunch = session?.state === "reauth_required";

  return (
    <main>
      <header>
        <p>Playground</p>
        <h1>{preferredName}, your dashboard is ready</h1>
      </header>
      {isSessionActive ? (
        <section>
          <p>Provider connected</p>
          <p>Time remaining</p>
          <p>{formatRemaining(session.remainingSeconds)}</p>
        </section>
      ) : (
        <section>
          <p>Connect your provider to continue</p>
          <p>Bot access stays locked until provider validation succeeds.</p>
          {session?.state === "expired" ? (
            <p>Your provider session expired. Connect again to continue.</p>
          ) : null}
          {requiresRelaunch ? (
            <p>
              Relaunch the Playground from Telegram to get a fresh secure
              launch before reconnecting your provider.
            </p>
          ) : null}
          {sessionError ? <p role="alert">{sessionError}</p> : null}
          {requiresRelaunch ? null : (
            <ProviderConnectPanel
              initData={initData}
              onConnected={({ session: nextSession, sessionToken: nextSessionToken }) => {
                setSessionError(null);
                setSession(nextSession);
                setSessionToken(nextSessionToken);
              }}
            />
          )}
        </section>
      )}
    </main>
  );
}
