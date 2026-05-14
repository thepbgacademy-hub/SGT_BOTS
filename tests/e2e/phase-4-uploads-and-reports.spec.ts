import { expect, test } from "@playwright/test";
import { createSignedTelegramInitData } from "../../packages/shared/src/testing/telegram-fixtures";

const VALID_INIT_DATA = createSignedTelegramInitData({
  queryId: "AAHdF6IQAAAAAN0XohDhrOr4",
  user: {
    id: 123460,
    username: "ada_phase4",
    first_name: "Ada",
    last_name: "Lovelace",
    language_code: "en",
  },
});

async function completeOnboarding(page: Parameters<typeof test>[0]["page"]) {
  await page.goto(`/?tgInitData=${encodeURIComponent(VALID_INIT_DATA)}`);
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByLabel("Preferred name").fill("Ada");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("API key").fill("sk-test");
  await page.getByRole("button", { name: "Validate provider" }).click();
}

async function unlockCursiveDocumentLane(
  page: Parameters<typeof test>[0]["page"],
) {
  await page.getByRole("button", { name: "Credit Bureau Dispute" }).click();
  await page.getByRole("button", { name: "Start official letter" }).click();
  await page.getByLabel("Consumer name").fill("Ada Lovelace");
  await page.getByLabel("Credit bureau").selectOption("experian");
  await page.getByLabel("Mailing address").fill("123 Example Street");
  await page.getByLabel("Account reference").fill("ACCT-42");
  await page.getByLabel("Dispute reason").fill(
    "This account is being reported inaccurately.",
  );
  await page.getByRole("button", { name: "Generate dispute letter" }).click();
  await expect(
    page.getByRole("button", { name: "Refresh preview" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Credit Bureau Dispute Letter" }),
  ).toBeVisible();
}

test("cursive saves a pdf draft directly from the preview card", async ({
  page,
}) => {
  await completeOnboarding(page);

  await page.getByRole("button", { name: "Cursive" }).click();
  await expect(page.getByRole("button", { name: "Upload PDF" })).toHaveCount(0);
  await expect(page.getByLabel("Client name")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Generate report" })).toHaveCount(0);
  await unlockCursiveDocumentLane(page);
  await page.getByRole("button", { name: "Save PDF draft" }).click();

  await expect(page.getByText("PDF draft queued")).toBeVisible();
  await expect(
    page.getByText("credit-bureau-dispute-letter.pdf").first(),
  ).toBeVisible();
  const downloadLink = page.getByRole("link", { name: "Download PDF" }).first();
  await expect(downloadLink).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await downloadLink.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    "credit-bureau-dispute-letter.pdf",
  );
});

test("bots without the full document wizard capability set do not show the report flow", async ({
  page,
}) => {
  await page.route("**/api/bots?sessionId=*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        bots: [
          {
            id: "document_wizard",
            name: "Cursive",
            description: "Partial capability test bot.",
            menuPosition: "top-left",
            capabilities: {
              chat: true,
              citations: false,
              html_report: true,
              pdf_upload: true,
              rag_query: false,
              structured_form: false,
            },
            sourceBinding: "none",
          },
          {
            id: "concierge_general_academy_KB",
            name: "Rori",
            description: "Answer grounded questions from the curated knowledge base.",
            menuPosition: "middle-right",
            capabilities: {
              chat: true,
              citations: true,
              html_report: false,
              pdf_upload: false,
              rag_query: true,
              structured_form: false,
            },
            sourceBinding: "knowledge_base",
          },
        ],
      }),
    });
  });

  await completeOnboarding(page);

  await page.getByRole("button", { name: "Cursive" }).click();
  await expect(page.getByRole("button", { name: "Upload PDF" })).toHaveCount(0);
  await expect(page.getByLabel("Client name")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Generate report" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Back to Menu" }).click();
  await page.getByRole("button", { name: "Rori" }).click();
  await expect(page.getByRole("button", { name: "Upload PDF" })).toHaveCount(0);
  await expect(page.getByLabel("Client name")).toHaveCount(0);
});

test("cursive pdf draft failures stay recoverable in the UI", async ({ page }) => {
  await page.route(
    "**/api/reports/cursive/credit-bureau-dispute/save-pdf-draft",
    async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 500,
      body: JSON.stringify({
        message: "Unable to render report right now.",
      }),
    });
    },
  );

  await completeOnboarding(page);

  await page.getByRole("button", { name: "Cursive" }).click();
  await unlockCursiveDocumentLane(page);
  await page.getByRole("button", { name: "Save PDF draft" }).click();

  await expect(page.getByRole("alert")).toContainText(
    "Unable to render report right now.",
  );
  await expect(
    page.getByRole("heading", { name: "Credit Bureau Dispute Letter" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Save PDF draft" })).toBeVisible();
  await expect(page.getByText("PDF draft queued")).toHaveCount(0);
});

test("cursive artifact polling failures fail loudly without hiding the current workspace", async ({
  page,
}) => {
  await completeOnboarding(page);

  await page.getByRole("button", { name: "Cursive" }).click();
  await unlockCursiveDocumentLane(page);

  await page.route("**/api/reports/artifacts?sessionId=*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 500,
      body: JSON.stringify({
        message: "polling broke",
      }),
    });
  });

  await expect(page.getByRole("alert")).toContainText(
    "Unable to refresh artifact status.",
  );
  await expect(
    page.getByRole("heading", { name: "Credit Bureau Dispute Letter" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Save PDF draft" })).toBeVisible();
});
