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

test("cursive opens a full-screen manual workflow shell with named steps", async ({
  page,
}) => {
  await connectProvider(page);

  await page.getByRole("button", { name: "Cursive" }).click();

  await expect(
    page.getByRole("heading", { name: "Cursive" }),
  ).toBeVisible();
  await expect(page.getByText("Playground time remaining")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Choose how to begin" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Manual dispute" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Analyze uploaded report" }),
  ).toBeVisible();
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
    page.getByText(
      "Violation selected. Details, review, and results steps land in the next Cursive phase.",
    ),
  ).toBeVisible();

  await page.getByRole("button", { name: "Back to Menu" }).click();
  await page.getByRole("button", { name: "Cursive" }).click();

  await expect(
    page.getByRole("heading", { name: "Choose how to begin" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Inconsistent reporting across bureaus",
    }),
  ).toHaveCount(0);
});
