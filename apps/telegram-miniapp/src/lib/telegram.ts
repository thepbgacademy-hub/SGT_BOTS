export type LaunchProfile = {
  firstName: string;
  lastName: string;
  preferredName: string;
  telegramUsername: string;
};

export type LaunchContext = {
  profile: LaunchProfile;
  welcomeButton: {
    text: string;
    url: string;
  };
};

export function readTelegramInitData(search: string) {
  const params = new URLSearchParams(search);
  return params.get("tgInitData") || "";
}

export async function fetchLaunchContext(initData: string): Promise<LaunchContext> {
  const launchResponse = await fetch(
    `/api/telegram/launch?initData=${encodeURIComponent(initData)}`,
  );

  if (!launchResponse.ok) {
    throw new Error("launch validation failed");
  }

  const prefillResponse = await fetch(
    `/api/telegram/prefill?initData=${encodeURIComponent(initData)}`,
  );

  if (!prefillResponse.ok) {
    throw new Error("profile prefill failed");
  }

  const launch = (await launchResponse.json()) as {
    welcomeButton: LaunchContext["welcomeButton"];
  };
  const prefill = (await prefillResponse.json()) as {
    profile: LaunchProfile;
  };

  return {
    profile: prefill.profile,
    welcomeButton: launch.welcomeButton,
  };
}
