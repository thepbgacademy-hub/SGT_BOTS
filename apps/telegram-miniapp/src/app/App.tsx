import { useEffect, useState } from "react";
import { DashboardShell } from "../features/dashboard/DashboardShell";
import { OnboardingPage } from "../features/onboarding/OnboardingPage";
import {
  fetchLaunchContext,
  readTelegramInitData,
  type LaunchContext,
} from "../lib/telegram";

export function App() {
  const [launchContext, setLaunchContext] = useState<LaunchContext | null>(null);
  const [profile, setProfile] = useState<{
    id: string;
    preferredName: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initData = readTelegramInitData(window.location.search);

  useEffect(() => {
    if (!initData) {
      setError("Telegram launch data is required.");
      return;
    }

    let cancelled = false;

    fetchLaunchContext(initData)
      .then((context) => {
        if (!cancelled) {
          setLaunchContext(context);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to validate Telegram launch data.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initData]);

  if (error) {
    return (
      <main className="app-shell">
        <section className="status-panel status-panel--error">
          <p className="eyebrow">Launch Error</p>
          <h1>Playground unavailable</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  }

  if (profile) {
    return (
      <DashboardShell
        initData={initData}
        preferredName={profile.preferredName}
      />
    );
  }

  if (!launchContext) {
    return (
      <main className="app-shell">
        <section className="status-panel">
          <p className="eyebrow">Initializing</p>
          <h1>Loading Telegram launch...</h1>
          <p>Validating your secure entry into the playground.</p>
        </section>
      </main>
    );
  }

  return (
    <OnboardingPage
      initData={initData}
      launchContext={launchContext}
      onComplete={(nextProfile) => {
        setProfile(nextProfile);
      }}
    />
  );
}
