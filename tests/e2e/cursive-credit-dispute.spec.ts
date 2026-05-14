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

test("cursive keeps the preview visible and lets users refresh it after intake edits and menu re-entry", async ({
  page,
}) => {
  await connectProvider(page);

  await page.getByRole("button", { name: "Cursive" }).click();

  await expect(
    page.getByRole("heading", { name: "Choose a letter category" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Credit Bureau Dispute/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Aggregator Dispute/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /IRS Inquiry \/ Dispute/i }),
  ).toBeVisible();

  await page.getByRole("button", { name: /Aggregator Dispute/i }).click();
  await page.getByRole("button", { name: "Start official letter" }).click();
  await expect(
    page.getByRole("heading", { name: "Aggregator Dispute Intake" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Preview generation is not live for this category yet. The intake scaffold is here so we can validate the workflow shape before the category-specific drafting lane ships.",
    ),
  ).toBeVisible();

  await page.getByRole("button", { name: /Credit Bureau Dispute/i }).click();
  await expect(
    page.getByRole("button", { name: "Start official letter" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start official letter" }).click();

  await expect(
    page.getByRole("heading", { name: "Credit Bureau Dispute Intake" }),
  ).toBeVisible();
  await expect(page.getByLabel("Consumer name")).toBeVisible();
  await expect(page.getByLabel("Mailing address")).toBeVisible();
  await expect(page.getByLabel("Credit bureau")).toBeVisible();
  await expect(page.getByLabel("Account reference")).toBeVisible();
  await expect(page.getByLabel("Dispute reason")).toBeVisible();

  const generateButton = page.getByRole("button", { name: "Generate dispute letter" });
  await expect(generateButton).toBeDisabled();
  await expect(
    page.getByText("Complete every required intake field to unlock generation."),
  ).toBeVisible();

  await page.getByLabel("Consumer name").fill("Ada Lovelace");
  await page.getByLabel("Mailing address").fill("12 St James Square, Chicago, IL 60601");
  await page.getByLabel("Credit bureau").selectOption("experian");
  await page.getByLabel("Account reference").fill("Acct ending 4432");
  await page.getByLabel("Dispute reason").fill(
    "The late payment history is inaccurate because the account was paid on time.",
  );

  await expect(generateButton).toBeEnabled();
  await expect(
    page.getByText(
      "Official intake complete. Generate a preview before saving the PDF draft.",
    ),
  ).toBeVisible();

  await page.getByRole("button", { name: "Back to Menu" }).click();
  await page.getByRole("button", { name: "Cursive" }).click();

  await expect(
    page.getByRole("heading", { name: "Credit Bureau Dispute Intake" }),
  ).toBeVisible();
  await expect(page.getByLabel("Consumer name")).toHaveValue("Ada Lovelace");
  await expect(page.getByLabel("Mailing address")).toHaveValue(
    "12 St James Square, Chicago, IL 60601",
  );
  await expect(page.getByLabel("Credit bureau")).toHaveValue("experian");
  await expect(page.getByLabel("Account reference")).toHaveValue(
    "Acct ending 4432",
  );
  await expect(page.getByLabel("Dispute reason")).toHaveValue(
    "The late payment history is inaccurate because the account was paid on time.",
  );

  await generateButton.click();
  const refreshButton = page.getByRole("button", { name: "Refresh preview" });
  const savePdfDraftButton = page.getByRole("button", { name: "Save PDF draft" });
  const portalText = page.getByLabel("Portal text for bureau portals");
  await expect(
    page.getByText(
      "Preview ready below. Update any field and regenerate anytime before saving the PDF draft.",
    ),
  ).toBeVisible();
  await expect(refreshButton).toBeEnabled();
  await expect(
    page.getByRole("heading", { name: "Credit Bureau Dispute Letter" }),
  ).toBeVisible();
  await expect(portalText).toBeVisible();
  await expect(portalText).toHaveValue(/Ada Lovelace/);
  await expect(portalText).toHaveValue(/Experian/);
  await expect(portalText).toHaveValue(/Acct ending 4432/);
  await expect(portalText).toHaveValue(
    /\[1\] 15 U\.S\.C\. Secs\. 1681 et seq\. \(FCRA\)/,
  );
  await expect(portalText).toHaveValue(/\[3\] 15 U\.S\.C\. Sec\. 1681i/);
  await expect(savePdfDraftButton).toBeVisible();
  await expect(savePdfDraftButton).toBeEnabled();
  await expect(page.getByRole("button", { name: "Upload PDF" })).toHaveCount(0);

  await page.getByLabel("Dispute reason").fill(
    "Updated follow-up note: the payment history is still inaccurate because the account was paid on time.",
  );
  await expect(page.getByLabel("Dispute reason")).toHaveValue(
    "Updated follow-up note: the payment history is still inaccurate because the account was paid on time.",
  );
  await expect(refreshButton).toBeEnabled();
  await expect(
    page.getByText(
      "Official intake changed. Refresh preview before saving the PDF draft.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Official intake changed after this preview. Refresh preview before saving the PDF draft.",
    ),
  ).toBeVisible();
  await expect(savePdfDraftButton).toBeDisabled();
  await refreshButton.click();
  await expect(refreshButton).toBeEnabled();
  await expect(
    page.getByText(
      "Preview ready below. Update any field and regenerate anytime before saving the PDF draft.",
    ),
  ).toBeVisible();
  await expect(savePdfDraftButton).toBeEnabled();

  await page.getByRole("button", { name: "Back to Menu" }).click();
  await page.getByRole("button", { name: "Cursive" }).click();

  await expect(
    page.getByRole("heading", { name: "Credit Bureau Dispute Intake" }),
  ).toBeVisible();
  await expect(page.getByLabel("Dispute reason")).toHaveValue(
    "Updated follow-up note: the payment history is still inaccurate because the account was paid on time.",
  );
  await expect(refreshButton).toBeEnabled();
  await expect(
    page.getByText(
      "Preview ready below. Update any field and regenerate anytime before saving the PDF draft.",
    ),
  ).toBeVisible();
});
