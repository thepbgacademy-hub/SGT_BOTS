import { expect, test } from "@playwright/test";
import { createSignedTelegramInitData } from "../../packages/shared/src/testing/telegram-fixtures";

const VALID_INIT_DATA = createSignedTelegramInitData();

test("profile onboarding user completes profile onboarding and reaches the locked dashboard", async ({
  page,
}) => {
  await page.goto(`/?tgInitData=${encodeURIComponent(VALID_INIT_DATA)}`);
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByLabel("Preferred name").fill("Ada");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Connect your provider to continue")).toBeVisible();
  await expect(page.getByText("Time remaining")).not.toBeVisible();
});

test("profile onboarding shows an error and re-enables submit if profile creation fails", async ({
  page,
}) => {
  await page.route("**/api/profiles", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Profile creation failed. Please try again.",
      }),
    });
  });

  await page.goto(`/?tgInitData=${encodeURIComponent(VALID_INIT_DATA)}`);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(
    page.getByText("Profile creation failed. Please try again."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
});
