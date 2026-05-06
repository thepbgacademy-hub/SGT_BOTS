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
    <main>
      <header>
        <p>Telegram Playground</p>
        <a href={launchContext.welcomeButton.url}>
          {launchContext.welcomeButton.text}
        </a>
      </header>
      <form onSubmit={handleSubmit}>
        {error ? <p role="alert">{error}</p> : null}
        <label>
          First name
          <input
            aria-label="First name"
            name="firstName"
            onChange={(event) => setFirstName(event.target.value)}
            value={firstName}
          />
        </label>
        <label>
          Last name
          <input
            aria-label="Last name"
            name="lastName"
            onChange={(event) => setLastName(event.target.value)}
            value={lastName}
          />
        </label>
        <label>
          Preferred name
          <input
            aria-label="Preferred name"
            name="preferredName"
            onChange={(event) => setPreferredName(event.target.value)}
            value={preferredName}
          />
        </label>
        <button disabled={submitting} type="submit">
          Continue
        </button>
      </form>
    </main>
  );
}
