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

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        ready?: () => void;
        expand?: () => void;
      };
    };
  }
}

export function initializeTelegramWebApp() {
  window.Telegram?.WebApp?.ready?.();
  window.Telegram?.WebApp?.expand?.();
}

export function readTelegramInitData(search: string) {
  const params = new URLSearchParams(search);
  return params.get("tgInitData") || window.Telegram?.WebApp?.initData || "";
}

export async function waitForTelegramInitData(input: {
  search: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}) {
  const timeoutMs = input.timeoutMs ?? 3_000;
  const pollIntervalMs = input.pollIntervalMs ?? 100;
  const startedAt = Date.now();
  let initData = readTelegramInitData(input.search);

  while (!initData && Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => {
      setTimeout(resolve, pollIntervalMs);
    });
    initData = readTelegramInitData(input.search);
  }

  return initData;
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
