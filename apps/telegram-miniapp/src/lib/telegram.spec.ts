import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchLaunchContext,
  initializeTelegramWebApp,
  readTelegramInitData,
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
  });
});
