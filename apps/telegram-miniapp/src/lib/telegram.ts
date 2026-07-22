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

export type TelegramHapticImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";

export type TelegramThemeParams = {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        close?: () => void;
        openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
        openTelegramLink?: (url: string) => void;
        initData?: string;
        ready?: () => void;
        expand?: () => void;
        BackButton?: {
          show?: () => void;
          hide?: () => void;
          onClick?: (callback: () => void) => void;
          offClick?: (callback: () => void) => void;
        };
        HapticFeedback?: {
          impactOccurred?: (style: TelegramHapticImpactStyle) => void;
          notificationOccurred?: (type: "error" | "success" | "warning") => void;
          selectionChanged?: () => void;
        };
        enableClosingConfirmation?: () => void;
        disableClosingConfirmation?: () => void;
        themeParams?: TelegramThemeParams;
      };
    };
  }
}

export function initializeTelegramWebApp() {
  window.Telegram?.WebApp?.ready?.();
  window.Telegram?.WebApp?.expand?.();
}

export function openTelegramReviewLink(url: string) {
  const telegram = window.Telegram?.WebApp;

  if (telegram?.openTelegramLink) {
    telegram.openTelegramLink(url);
    window.setTimeout(() => {
      telegram.close?.();
    }, 150);
    return;
  }

  if (telegram?.openLink) {
    telegram.openLink(url);
    window.setTimeout(() => {
      telegram.close?.();
    }, 150);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
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

export function setTelegramBackButton(onBack: () => void): () => void {
  const backButton = window.Telegram?.WebApp?.BackButton;

  if (!backButton?.show || !backButton.onClick) {
    return () => {};
  }

  backButton.onClick(onBack);
  backButton.show();

  return () => {
    backButton.offClick?.(onBack);
    backButton.hide?.();
  };
}

export function triggerTelegramHaptic(style: TelegramHapticImpactStyle = "light") {
  window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(style);
}

export function setTelegramClosingConfirmation(enabled: boolean) {
  const webApp = window.Telegram?.WebApp;

  if (enabled) {
    webApp?.enableClosingConfirmation?.();
  } else {
    webApp?.disableClosingConfirmation?.();
  }
}

const THEME_PARAM_CSS_VARIABLES: ReadonlyArray<
  readonly [string, keyof TelegramThemeParams]
> = [
  ["--bg", "bg_color"],
  ["--text", "text_color"],
  ["--muted", "hint_color"],
  ["--gold", "button_color"],
];

export function computeThemeCssVariables(
  themeParams: TelegramThemeParams,
): Record<string, string> {
  const variables: Record<string, string> = {};

  for (const [cssVariable, themeKey] of THEME_PARAM_CSS_VARIABLES) {
    const value = themeParams[themeKey];

    if (value) {
      variables[cssVariable] = value;
    }
  }

  return variables;
}

export function applyTelegramThemeParams(
  root: { style: { setProperty: (name: string, value: string) => void } } = document.documentElement,
) {
  const themeParams = window.Telegram?.WebApp?.themeParams ?? {};
  const variables = computeThemeCssVariables(themeParams);

  for (const [cssVariable, value] of Object.entries(variables)) {
    root.style.setProperty(cssVariable, value);
  }
}

export async function fetchLaunchContext(initData: string): Promise<LaunchContext> {
  const launchResponse = await fetch("/api/telegram/launch", {
    headers: {
      "x-telegram-init-data": initData,
    },
  });

  if (!launchResponse.ok) {
    throw new Error("launch validation failed");
  }

  const prefillResponse = await fetch("/api/telegram/prefill", {
    headers: {
      "x-telegram-init-data": initData,
    },
  });

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
