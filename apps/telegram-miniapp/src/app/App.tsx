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
  const [preferredName, setPreferredName] = useState<string | null>(null);
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
    return <p>{error}</p>;
  }

  if (preferredName) {
    return <DashboardShell preferredName={preferredName} />;
  }

  if (!launchContext) {
    return <p>Loading Telegram launch...</p>;
  }

  return (
    <OnboardingPage
      initData={initData}
      launchContext={launchContext}
      onComplete={({ preferredName: nextPreferredName }) => {
        setPreferredName(nextPreferredName);
      }}
    />
  );
}
