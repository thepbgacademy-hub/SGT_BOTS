import { expect, test } from "@playwright/test";
import { createSignedTelegramInitData } from "../../packages/shared/src/testing/telegram-fixtures";

function createCursiveInitData() {
  return createSignedTelegramInitData({
    queryId: "AAHdF6IQAAAAAN0XohDhrOr5",
    user: {
      id: 123461,
      username: "ada_cursive",
      first_name: "Ada",
      last_name: "Lovelace",
      language_code: "en",
    },
  });
}

async function connectProvider(page: Parameters<typeof test>[0]["page"]) {
  const validInitData = createCursiveInitData();
  await page.goto(`/?tgInitData=${encodeURIComponent(validInitData)}`);
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByLabel("Preferred name").fill("Ada");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("API key").fill("sk-test");
  await page.getByRole("button", { name: "Validate provider" }).click();
}

test("cursive generates a manual bureau removal-demand artifact", async ({
  page,
}) => {
  test.setTimeout(70000);
  await page.setViewportSize({ width: 545, height: 705 });
  await connectProvider(page);

  await page.getByRole("button", { name: "Cursive" }).click();

  await expect(
    page.getByText("Cursive workspace live"),
  ).toBeVisible();
  await expect(page.getByText("Time remaining")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Choose how to begin" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Manual dispute" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Analyze uploaded report" }),
  ).toBeVisible();
  const manualBox = await page
    .getByRole("button", { name: "Manual dispute" })
    .boundingBox();
  const uploadBox = await page
    .getByRole("button", { name: "Analyze uploaded report" })
    .boundingBox();
  const nextBox = await page
    .getByRole("button", { name: "Next step" })
    .boundingBox();
  const backBox = await page
    .getByRole("button", { exact: true, name: "Back" })
    .boundingBox();
  expect(manualBox).not.toBeNull();
  expect(uploadBox).not.toBeNull();
  expect(nextBox).not.toBeNull();
  expect(backBox).not.toBeNull();
  expect(Math.abs(manualBox!.y - uploadBox!.y)).toBeLessThanOrEqual(2);
  expect(nextBox!.y).toBeLessThan(backBox!.y);
  expect(nextBox!.y - (manualBox!.y + manualBox!.height)).toBeLessThan(140);
  await expect(page.getByLabel("Chat input")).toHaveCount(0);

  await page.getByRole("button", { name: "Manual dispute" }).click();

  await expect(
    page.getByRole("heading", { name: "How are you documenting this issue?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Inconsistent reporting across bureaus",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "One bureau is reporting the item inaccurately and I have proof",
    }),
  ).toBeVisible();

  await page
    .getByRole("button", {
      name: "Inconsistent reporting across bureaus",
    })
    .click();

  await expect(
    page.getByRole("heading", { name: "Choose the inconsistency type" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Different balances across bureaus",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Incorrect account number across bureaus",
    }),
  ).toBeVisible();

  await page
    .getByRole("button", {
      name: "Different balances across bureaus",
    })
    .click();

  await expect(
    page.getByText("Violation selected. Continue to enter the letter details"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Details next" }).click();

  await expect(
    page.getByRole("heading", { name: "Enter the letter details" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Next step" })).toBeDisabled();
  await page.getByLabel("Consumer name").fill("Jane Doe");
  await page.getByLabel("Mailing address").fill("123 Main Street\nDallas, TX 75001");
  await page.getByLabel("Target bureau").selectOption("TransUnion");
  await page.getByLabel("Furnisher name").fill("Example Bank");
  await page.getByLabel("Account identifier").fill("Account ending 1234");
  await page.getByLabel("Reported field").fill("balance");
  await page.getByLabel("Bureau reported value").fill("$4,812");
  await page
    .getByLabel("Conflicting report facts")
    .fill("Experian reports a $0 balance while TransUnion reports $4,812.");
  await page
    .getByLabel("Evidence summary")
    .fill("Tri-merge report excerpt dated May 1, 2026");

  await expect(
    page.getByRole("button", { name: "Next step" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Next step" }).click();

  await expect(
    page.getByRole("heading", { name: "Review the removal demand" }),
  ).toBeVisible();
  await expect(page.getByText("TransUnion")).toBeVisible();
  await expect(page.getByText("Example Bank")).toBeVisible();

  await page.getByRole("button", { name: "Generate" }).click();

  await expect(page.getByRole("heading", { name: "Results" })).toBeVisible({
    timeout: 60000,
  });
  await expect(page.getByText("Letter being created.", { exact: true })).toBeVisible();
  const generatedArtifact = page
    .locator(".artifact-card")
    .filter({ hasText: "bureau-removal-demand-letter.pdf" })
    .first();
  await expect(generatedArtifact).toBeVisible({
    timeout: 60000,
  });
  await expect(
    generatedArtifact.getByRole("link", { name: "Download PDF" }),
  ).toBeVisible({ timeout: 60000 });
});
