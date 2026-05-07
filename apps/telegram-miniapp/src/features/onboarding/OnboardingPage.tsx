import { useState, type FormEvent } from "react";
import type { LaunchContext } from "../../lib/telegram";

type OnboardingPageProps = {
  initData: string;
  launchContext: LaunchContext;
  onComplete: (profile: {
    id: string;
    preferredName: string;
  }) => void;
};

export function OnboardingPage({
  initData,
  launchContext,
  onComplete,
}: OnboardingPageProps) {
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(launchContext.profile.firstName);
  const [lastName, setLastName] = useState(launchContext.profile.lastName);
  const [preferredName, setPreferredName] = useState(
    launchContext.profile.preferredName,
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          initData,
          firstName,
          lastName,
          preferredName,
        }),
      });
      const payload = (await response.json()) as {
        message?: string;
        profile?: {
          id: string;
          preferredName: string;
        };
      };

      if (!response.ok || !payload.profile) {
        setError(payload.message ?? "Profile creation failed. Please try again.");
        setSubmitting(false);
        return;
      }

      onComplete(payload.profile);
    } catch {
      setError("Profile creation failed. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Telegram Playground</p>
          <h1>Test-drive the bot lineup before you commit.</h1>
          <p className="hero-text">
            Build your profile, connect your own provider, and unlock a guided
            three-hour sandbox across specialized assistants.
          </p>
          <a className="ghost-link" href={launchContext.welcomeButton.url}>
            Open from Telegram
          </a>
        </div>
        <div className="hero-stats">
          <div className="hero-stat-card">
            <span className="hero-stat-value">3h</span>
            <span className="hero-stat-label">Shared session window</span>
          </div>
          <div className="hero-stat-card">
            <span className="hero-stat-value">BYOK</span>
            <span className="hero-stat-label">Session-only provider access</span>
          </div>
          <div className="hero-stat-card">
            <span className="hero-stat-value">5</span>
            <span className="hero-stat-label">Specialized bot lanes</span>
          </div>
        </div>
      </section>
      <section className="panel onboarding-panel">
        <header className="panel-header">
          <div>
            <p className="eyebrow">Step 1</p>
            <h2>Create your playground profile</h2>
          </div>
          <a className="inline-link" href={launchContext.welcomeButton.url}>
            {launchContext.welcomeButton.text}
          </a>
        </header>
        <form className="form-grid" onSubmit={handleSubmit}>
          {error ? <p role="alert" className="alert-banner">{error}</p> : null}
          <label className="field">
            <span className="field-label">First name</span>
            <input
              aria-label="First name"
              name="firstName"
              onChange={(event) => setFirstName(event.target.value)}
              value={firstName}
            />
          </label>
          <label className="field">
            <span className="field-label">Last name</span>
            <input
              aria-label="Last name"
              name="lastName"
              onChange={(event) => setLastName(event.target.value)}
              value={lastName}
            />
          </label>
          <label className="field field--full">
            <span className="field-label">Preferred name</span>
            <input
              aria-label="Preferred name"
              name="preferredName"
              onChange={(event) => setPreferredName(event.target.value)}
              value={preferredName}
            />
          </label>
          <div className="callout-card field--full">
            <p className="callout-title">What happens next</p>
            <p className="callout-copy">
              We store your Telegram identity and profile so your playground
              session can stay personalized. Your provider credentials are never
              kept beyond the active session.
            </p>
          </div>
          <div className="form-actions field--full">
            <button className="primary-button" disabled={submitting} type="submit">
              Continue
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
