import path from "node:path";
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

const PDF_FIXTURE = path.resolve(
  process.cwd(),
  "tests/e2e/fixtures/document-sample.pdf",
);

async function completeOnboarding(page: Parameters<typeof test>[0]["page"]) {
  await page.goto(`/?tgInitData=${encodeURIComponent(VALID_INIT_DATA)}`);
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByLabel("Preferred name").fill("Ada");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("API key").fill("sk-test");
  await page.getByRole("button", { name: "Validate provider" }).click();
}

test("document wizard shows upload, form, and generated artifact", async ({
  page,
}) => {
  await completeOnboarding(page);

  await page.getByRole("button", { name: "Document Wizard" }).click();
  await page.getByRole("button", { name: "Upload PDF" }).click();
  await page.setInputFiles('input[type="file"]', PDF_FIXTURE);
  await page.getByLabel("Client name").fill("Acme Co");
  await page.getByLabel("Objective").fill(
    "Summarize the uploaded agreement",
  );
  await page.getByRole("button", { name: "Generate report" }).click();

  await expect(page.getByText("Report queued")).toBeVisible();
  await expect(page.getByText("document-wizard-report.pdf")).toBeVisible();
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
            name: "Document Wizard",
            description: "Partial capability test bot.",
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
            id: "kb_concierge",
            name: "Knowledge Concierge",
            description: "Answer grounded questions from the curated knowledge base.",
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

  await page.getByRole("button", { name: "Document Wizard" }).click();
  await expect(page.getByRole("button", { name: "Upload PDF" })).toHaveCount(0);
  await expect(page.getByLabel("Client name")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Generate report" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Knowledge Concierge" }).click();
  await expect(page.getByRole("button", { name: "Upload PDF" })).toHaveCount(0);
  await expect(page.getByLabel("Client name")).toHaveCount(0);
});

test("document wizard failures stay recoverable in the UI", async ({ page }) => {
  await page.route("**/api/reports/document-wizard", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 500,
      body: JSON.stringify({
        message: "Unable to render report right now.",
      }),
    });
  });

  await completeOnboarding(page);

  await page.getByRole("button", { name: "Document Wizard" }).click();
  await page.getByRole("button", { name: "Upload PDF" }).click();
  await page.setInputFiles('input[type="file"]', PDF_FIXTURE);
  await page.getByLabel("Client name").fill("Acme Co");
  await page.getByLabel("Objective").fill(
    "Summarize the uploaded agreement",
  );
  await page.getByRole("button", { name: "Generate report" }).click();

  await expect(page.getByRole("alert")).toContainText(
    "Unable to render report right now.",
  );
  await expect(page.getByText("Selected file: document-sample.pdf")).toBeVisible();
  await expect(page.getByLabel("Client name")).toHaveValue("Acme Co");
  await expect(page.getByLabel("Objective")).toHaveValue(
    "Summarize the uploaded agreement",
  );
  await expect(page.getByText("Report queued")).toHaveCount(0);
});
