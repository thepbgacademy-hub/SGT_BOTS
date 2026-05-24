import { expect, test } from "@playwright/test";
import { createSignedTelegramInitData } from "../../packages/shared/src/testing/telegram-fixtures";

const TOP_SECRET_INIT_DATA = createSignedTelegramInitData({
  queryId: "AAHdF6IQAAAAAN0XohDhrOr8",
  user: {
    id: 123464,
    username: "ada_top_secret",
    first_name: "Ada",
    last_name: "Lovelace",
    language_code: "en",
  },
});

async function connectProvider(page: Parameters<typeof test>[0]["page"]) {
  await page.goto(`/?tgInitData=${encodeURIComponent(TOP_SECRET_INIT_DATA)}`);
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByLabel("Preferred name").fill("Ada");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("API key").fill("sk-test");
  await page.getByRole("button", { name: "Validate provider" }).click();
}

test("top secret creates one combined claim-review report", async ({ page }) => {
  test.setTimeout(70000);
  await page.setViewportSize({ width: 545, height: 705 });
  await connectProvider(page);

  await page.getByRole("button", { name: "Top Secret" }).click();

  await expect(page.getByText("Top Secret workspace live")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Paste the claims" }),
  ).toBeVisible();
  await expect(page.getByLabel("Chat input")).toHaveCount(0);

  await page
    .getByLabel("Claims")
    .fill(
      "1. Income tax is voluntary.\n\n2. How to verify a TreasuryDirect claim using official sources.",
    );
  await page.getByRole("button", { name: "Next step" }).click();

  await expect(
    page.getByRole("heading", { name: "Review before research" }),
  ).toBeVisible();
  await expect(page.getByText("Income tax is voluntary.")).toBeVisible();
  await page.getByRole("button", { name: "Create report" }).click();

  await expect(page.getByRole("heading", { name: "Report queued" })).toBeVisible({
    timeout: 60000,
  });
  await expect(page.getByText("Income tax is voluntary.")).toBeVisible();

  const generatedArtifact = page
    .locator(".artifact-card")
    .filter({ hasText: "top-secret-claim-review.pdf" })
    .first();
  await expect(generatedArtifact).toBeVisible({
    timeout: 60000,
  });
  await expect(
    generatedArtifact.getByRole("link", { name: "Download PDF" }),
  ).toBeVisible({ timeout: 60000 });
});
