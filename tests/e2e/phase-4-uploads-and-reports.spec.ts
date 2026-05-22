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

async function completeManualCursiveReview(
  page: Parameters<typeof test>[0]["page"],
) {
  await page.getByRole("button", { name: "Manual dispute" }).click();
  await page
    .getByRole("button", {
      name: "Inconsistent reporting across bureaus",
    })
    .click();
  await page
    .getByRole("button", {
      name: "Different balances across bureaus",
    })
    .click();
  await page.getByRole("button", { name: "Details next" }).click();
  await page.getByLabel("Consumer name").fill("Ada Lovelace");
  await page.getByLabel("Mailing address").fill("123 Example Street\nDallas, TX 75001");
  await page.getByLabel("Target bureau").selectOption("Experian");
  await page.getByLabel("Furnisher name").fill("Example Bank");
  await page.getByLabel("Account identifier").fill("Account ending 4242");
  await page.getByLabel("Reported field").fill("balance");
  await page.getByLabel("Bureau reported value").fill("$4,812");
  await page
    .getByLabel("Conflicting report facts")
    .fill("TransUnion reports a $0 balance while Experian reports $4,812.");
  await page
    .getByLabel("Evidence summary")
    .fill("Tri-merge report excerpt dated May 1, 2026.");
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(
    page.getByRole("heading", { name: "Review the removal demand" }),
  ).toBeVisible();
}

test("cursive generates a pdf draft from the manual workflow", async ({
  page,
}) => {
  test.setTimeout(70000);
  await completeOnboarding(page);

  await page.getByRole("button", { name: "Cursive" }).click();
  await expect(page.getByRole("button", { name: "Upload PDF" })).toHaveCount(0);
  await expect(page.getByLabel("Client name")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Generate report" }),
  ).toHaveCount(0);
  await completeManualCursiveReview(page);
  await page.getByRole("button", { name: "Generate" }).click();

  await expect(page.getByText("PDF draft queued.", { exact: true })).toBeVisible({
    timeout: 60000,
  });
  await expect(
    page.getByText("bureau-removal-demand-letter.pdf").first(),
  ).toBeVisible({ timeout: 60000 });
  const generatedArtifact = page
    .locator(".artifact-card")
    .filter({ hasText: "bureau-removal-demand-letter.pdf" })
    .first();
  const downloadLink = generatedArtifact.getByRole("link", { name: "Download PDF" });
  await expect(downloadLink).toBeVisible({
    timeout: 60000,
  });
  const downloadPromise = page.waitForEvent("download");
  await downloadLink.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    "bureau-removal-demand-letter.pdf",
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
    "**/api/reports/cursive/bureau-removal-demand/save-pdf-draft",
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
  await completeManualCursiveReview(page);
  await page.getByRole("button", { name: "Generate" }).click();

  await expect(
    page.getByText("Unable to render report right now."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Review the removal demand" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate" })).toBeVisible();
  await expect(page.getByText("PDF draft queued.")).toHaveCount(0);
});

test("cursive artifact polling failures fail loudly without hiding the current workspace", async ({
  page,
}) => {
  await completeOnboarding(page);

  await page.route("**/api/reports/artifacts?sessionId=*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 500,
      body: JSON.stringify({
        message: "polling broke",
      }),
    });
  });

  await page.getByRole("button", { name: "Cursive" }).click();

  await expect(page.getByRole("alert")).toContainText(
    "Unable to refresh artifact status.",
  );
  await expect(
    page.getByRole("heading", { name: "Choose how to begin" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Manual dispute" })).toBeVisible();
});
