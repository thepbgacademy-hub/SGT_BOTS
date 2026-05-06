import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLaunchContext, readTelegramInitData } from "./telegram";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("telegram helpers", () => {
  it("reads the tgInitData query parameter", () => {
    expect(readTelegramInitData("?tgInitData=signed-data&foo=bar")).toBe(
      "signed-data",
    );
  });

  it("builds launch context from the launch and prefill endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            welcomeButton: {
              text: "Open Playground",
              url: "https://t.me/sgt_playground_bot/app?startapp=profile-onboarding",
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
        url: "https://t.me/sgt_playground_bot/app?startapp=profile-onboarding",
      },
    });
  });
});
