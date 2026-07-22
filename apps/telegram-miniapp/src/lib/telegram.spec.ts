import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyTelegramThemeParams,
  computeThemeCssVariables,
  fetchLaunchContext,
  initializeTelegramWebApp,
  readTelegramInitData,
  setTelegramBackButton,
  setTelegramClosingConfirmation,
  triggerTelegramHaptic,
  waitForTelegramInitData,
} from "./telegram";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(globalThis, "window");
});

describe("telegram helpers", () => {
  it("reads the tgInitData query parameter", () => {
    expect(readTelegramInitData("?tgInitData=signed-data&foo=bar")).toBe(
      "signed-data",
    );
  });

  it("falls back to Telegram WebApp initData when no query param exists", () => {
    vi.stubGlobal("window", {
      Telegram: {
        WebApp: {
          initData: "runtime-signed-data",
        },
      },
    });

    expect(readTelegramInitData("")).toBe("runtime-signed-data");
  });

  it("initializes the Telegram WebApp shell when available", () => {
    const ready = vi.fn();
    const expand = vi.fn();
    vi.stubGlobal("window", {
      WebApp: {
        ready,
        expand,
      },
      Telegram: {
        WebApp: {
          ready,
          expand,
        },
      },
    } as unknown as Window & typeof globalThis);

    initializeTelegramWebApp();

    expect(ready).toHaveBeenCalledTimes(1);
    expect(expand).toHaveBeenCalledTimes(1);
  });

  it("waits briefly for Telegram runtime initData to appear", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", {
      Telegram: {
        WebApp: {},
      },
    } as unknown as Window & typeof globalThis);

    const pending = waitForTelegramInitData({
      search: "",
      timeoutMs: 500,
      pollIntervalMs: 50,
    });

    setTimeout(() => {
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.initData = "delayed-runtime-data";
      }
    }, 100);

    await vi.advanceTimersByTimeAsync(150);

    await expect(pending).resolves.toBe("delayed-runtime-data");
  });

  it("builds launch context from the launch and prefill endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            welcomeButton: {
              text: "Open Playground",
              url: "https://t.me/sgt_playground_bot/playground?startapp=profile-onboarding",
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            profile: {
              firstName: "Ada",
              lastName: "Lovelace",
              preferredName: "Ada",
              telegramUsername: "ada_l",
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchLaunchContext("signed-data")).resolves.toEqual({
      profile: {
        firstName: "Ada",
        lastName: "Lovelace",
        preferredName: "Ada",
        telegramUsername: "ada_l",
      },
      welcomeButton: {
        text: "Open Playground",
        url: "https://t.me/sgt_playground_bot/playground?startapp=profile-onboarding",
      },
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/telegram/launch",
      expect.objectContaining({
        headers: { "x-telegram-init-data": "signed-data" },
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/telegram/prefill",
      expect.objectContaining({
        headers: { "x-telegram-init-data": "signed-data" },
      }),
    );
  });

  it("no-ops the BackButton wiring outside Telegram", () => {
    vi.stubGlobal("window", {} as unknown as Window & typeof globalThis);

    const cleanup = setTelegramBackButton(() => undefined);

    expect(() => cleanup()).not.toThrow();
  });

  it("shows and binds the Telegram BackButton, and tears it down on cleanup", () => {
    const show = vi.fn();
    const hide = vi.fn();
    const onClick = vi.fn();
    const offClick = vi.fn();
    vi.stubGlobal("window", {
      Telegram: {
        WebApp: {
          BackButton: { show, hide, onClick, offClick },
        },
      },
    } as unknown as Window & typeof globalThis);

    const handler = () => undefined;
    const cleanup = setTelegramBackButton(handler);

    expect(onClick).toHaveBeenCalledWith(handler);
    expect(show).toHaveBeenCalledTimes(1);

    cleanup();

    expect(offClick).toHaveBeenCalledWith(handler);
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it("does not throw when triggering haptics outside Telegram", () => {
    vi.stubGlobal("window", {} as unknown as Window & typeof globalThis);

    expect(() => triggerTelegramHaptic("light")).not.toThrow();
  });

  it("forwards haptic impact style to the Telegram WebApp", () => {
    const impactOccurred = vi.fn();
    vi.stubGlobal("window", {
      Telegram: {
        WebApp: {
          HapticFeedback: { impactOccurred },
        },
      },
    } as unknown as Window & typeof globalThis);

    triggerTelegramHaptic("medium");

    expect(impactOccurred).toHaveBeenCalledWith("medium");
  });

  it("does not throw when toggling closing confirmation outside Telegram", () => {
    vi.stubGlobal("window", {} as unknown as Window & typeof globalThis);

    expect(() => setTelegramClosingConfirmation(true)).not.toThrow();
  });

  it("enables and disables the Telegram closing confirmation", () => {
    const enableClosingConfirmation = vi.fn();
    const disableClosingConfirmation = vi.fn();
    vi.stubGlobal("window", {
      Telegram: {
        WebApp: { enableClosingConfirmation, disableClosingConfirmation },
      },
    } as unknown as Window & typeof globalThis);

    setTelegramClosingConfirmation(true);
    expect(enableClosingConfirmation).toHaveBeenCalledTimes(1);

    setTelegramClosingConfirmation(false);
    expect(disableClosingConfirmation).toHaveBeenCalledTimes(1);
  });

  it("maps known theme param keys to app CSS variables and ignores unset ones", () => {
    expect(
      computeThemeCssVariables({
        bg_color: "#111111",
        text_color: "#eeeeee",
      }),
    ).toEqual({
      "--bg": "#111111",
      "--text": "#eeeeee",
    });
    expect(computeThemeCssVariables({})).toEqual({});
  });

  it("applies theme params to a given root without touching global document", () => {
    vi.stubGlobal("window", {
      Telegram: {
        WebApp: {
          themeParams: { bg_color: "#0a0a0a", hint_color: "#c7b588" },
        },
      },
    } as unknown as Window & typeof globalThis);
    const setProperty = vi.fn();

    applyTelegramThemeParams({ style: { setProperty } });

    expect(setProperty).toHaveBeenCalledWith("--bg", "#0a0a0a");
    expect(setProperty).toHaveBeenCalledWith("--muted", "#c7b588");
  });

  it("applies no theme variables outside Telegram", () => {
    vi.stubGlobal("window", {} as unknown as Window & typeof globalThis);
    const setProperty = vi.fn();

    applyTelegramThemeParams({ style: { setProperty } });

    expect(setProperty).not.toHaveBeenCalled();
  });
});
