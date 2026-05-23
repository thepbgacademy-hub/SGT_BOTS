import { expect, test } from "@playwright/test";
import { createSignedTelegramInitData } from "../../packages/shared/src/testing/telegram-fixtures";

const VALID_INIT_DATA = createSignedTelegramInitData({
  queryId: "AAHdF6IQAAAAAN0XohDhrOr5",
  user: {
    id: 123461,
    username: "ada_phase5",
    first_name: "Ada",
    last_name: "Lovelace",
    language_code: "en",
  },
});
const REVIEW_GROUP_URL = "https://t.me/+1wagxfyhnAcwMDJh";

async function completeOnboarding(page: Parameters<typeof test>[0]["page"]) {
  await page.goto(`/?tgInitData=${encodeURIComponent(VALID_INIT_DATA)}`);
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByLabel("Preferred name").fill("Ada");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("API key").fill("sk-test");
  await page.getByRole("button", { name: "Validate provider" }).click();
}

test("user sees review CTA when the playground session ends", async ({
  page,
}) => {
  await page.goto(
    `/?tgInitData=${encodeURIComponent(VALID_INIT_DATA)}&forceSessionExpiry=1`,
  );
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByLabel("Preferred name").fill("Ada");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("API key").fill("sk-test");
  await page.getByRole("button", { name: "Validate provider" }).click();

  await expect(page.getByText("Please leave a review")).toBeVisible();
  await expect(
    page.getByText("Thank you for your participation in the PBG Playground."),
  ).toBeVisible();
  const reviewLink = page.getByRole("link", { name: "Leave your review" });
  await expect(reviewLink).toBeVisible();
  await expect(reviewLink).toHaveAttribute("href", REVIEW_GROUP_URL);
});

test("user can end the session early and still get the review CTA", async ({
  page,
}) => {
  await completeOnboarding(page);

  await expect(page.getByRole("button", { name: "Insight" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Rori" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Condor" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "End playground" }).click();

  await expect(page.getByText("Please leave a review")).toBeVisible();
  const reviewLink = page.getByRole("link", { name: "Leave your review" });
  await expect(reviewLink).toBeVisible();
  await expect(reviewLink).toHaveAttribute("href", REVIEW_GROUP_URL);
  await expect(
    page.getByText("Your playground session has ended."),
  ).toBeVisible();
});
