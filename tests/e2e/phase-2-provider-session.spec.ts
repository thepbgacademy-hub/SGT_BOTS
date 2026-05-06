import { expect, test } from "@playwright/test";
import { createSignedTelegramInitData } from "../../packages/shared/src/testing/telegram-fixtures";

const VALID_INIT_DATA = createSignedTelegramInitData();

test("countdown appears only after provider validation", async ({ page }) => {
  await page.goto(`/?tgInitData=${encodeURIComponent(VALID_INIT_DATA)}`);
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByLabel("Preferred name").fill("Ada");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("API key").fill("sk-test");
  await page.getByRole("button", { name: "Validate provider" }).click();

  await expect(page.getByText("03:00:00")).toBeVisible();
  await expect(page.getByText("Provider connected")).toBeVisible();
});

test("reauth required tells the user to relaunch from Telegram and hides the reconnect form", async ({
  page,
}) => {
  let sessionRefreshCount = 0;

  await page.route("**/api/sessions/*", async (route) => {
    sessionRefreshCount += 1;

    if (sessionRefreshCount === 1) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session: {
            id: "session-1",
            provider: "openai",
            startedAt: "2026-05-05T12:00:00.000Z",
            expiresAt: "2026-05-05T15:00:00.000Z",
            durationSeconds: 10800,
            remainingSeconds: 10799,
            state: "reauth_required",
          },
        }),
      });
      return;
    }

    await route.fallback();
  });

  await page.goto(`/?tgInitData=${encodeURIComponent(VALID_INIT_DATA)}`);
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByLabel("Preferred name").fill("Ada");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("API key").fill("sk-test");
  await page.getByRole("button", { name: "Validate provider" }).click();

  await expect(
    page.getByText(
      "Relaunch the Playground from Telegram to get a fresh secure launch before reconnecting your provider.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("API key")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Validate provider" }),
  ).not.toBeVisible();
});
