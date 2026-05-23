import path from "node:path";
import { expect, test } from "@playwright/test";
import { createSignedTelegramInitData } from "../../packages/shared/src/testing/telegram-fixtures";

function createCursiveUploadInitData() {
  return createSignedTelegramInitData({
    queryId: "AAHdF6IQAAAAAN0XohDhrOr6",
    user: {
      id: 123462,
      username: "ada_cursive_upload",
      first_name: "Ada",
      last_name: "Lovelace",
      language_code: "en",
    },
  });
}

async function connectProvider(page: Parameters<typeof test>[0]["page"]) {
  const validInitData = createCursiveUploadInitData();
  await page.goto(`/?tgInitData=${encodeURIComponent(validInitData)}`);
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByLabel("Preferred name").fill("Ada");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("API key").fill("sk-test");
  await page.getByRole("button", { name: "Validate provider" }).click();
}

test("cursive analyzes an uploaded tri-merge report and generates a confirmed issue artifact", async ({
  page,
}) => {
  test.setTimeout(70000);
  await connectProvider(page);

  await page.getByRole("button", { name: "Cursive" }).click();
  await page.getByRole("button", { name: "Analyze uploaded report" }).click();

  await expect(
    page.getByRole("heading", { name: "Choose report type" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tri-merge report" }).click();
  await page.getByRole("button", { name: "Upload next" }).click();

  await expect(
    page.getByRole("heading", { name: "Upload the report PDF" }),
  ).toBeVisible();
  await page
    .getByLabel("Credit report PDF")
    .setInputFiles(
      path.join(
        process.cwd(),
        "tests",
        "e2e",
        "fixtures",
        "cursive-tri-merge-report.pdf",
      ),
    );
  await expect(
    page.getByText("cursive-tri-merge-report.pdf ready for analysis."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Analyze report" }).click();

  await expect(
    page.getByRole("heading", { name: "Review detected issues" }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("Issue 1 of 1")).toBeVisible();
  await expect(page.getByText("Example Bank")).toBeVisible();
  await expect(page.getByText("Different balances across bureaus")).toBeVisible();
  await expect(page.getByText("Experian reports $0")).toBeVisible();

  await expect(page.getByRole("button", { name: "Next step" })).toBeEnabled();
  await page.getByRole("button", { name: "Next step" }).click();

  await expect(
    page.getByRole("heading", { name: "Review confirmed issues" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Generate" }).click();

  await expect(page.getByRole("heading", { name: "Results" })).toBeVisible({
    timeout: 60000,
  });
  await expect(page.getByText("Letter being created.", { exact: true })).toBeVisible();
  const generatedArtifact = page
    .locator(".artifact-card")
    .filter({ hasText: "bureau-removal-demand-letter.pdf" })
    .first();
  await expect(generatedArtifact.getByRole("link", { name: "Download PDF" })).toBeVisible({
    timeout: 60000,
  });
});

test("cursive analyzes an uploaded single-bureau report and generates a confirmed proof artifact", async ({
  page,
}) => {
  test.setTimeout(70000);
  await connectProvider(page);

  await page.getByRole("button", { name: "Cursive" }).click();
  await page.getByRole("button", { name: "Analyze uploaded report" }).click();

  await expect(
    page.getByRole("heading", { name: "Choose report type" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Single-bureau report" }).click();
  await page.getByRole("button", { name: "Upload next" }).click();

  await expect(
    page.getByRole("heading", { name: "Upload the report PDF" }),
  ).toBeVisible();
  await page
    .getByLabel("Credit report PDF")
    .setInputFiles(
      path.join(
        process.cwd(),
        "tests",
        "e2e",
        "fixtures",
        "cursive-single-bureau-report.pdf",
      ),
    );
  await expect(
    page.getByText("cursive-single-bureau-report.pdf ready for analysis."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Analyze report" }).click();

  await expect(
    page.getByRole("heading", { name: "Review detected issues" }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("Issue 1 of 1")).toBeVisible();
  await expect(page.getByText("Example Bank")).toBeVisible();
  await expect(
    page.getByText("Closed account reported as open", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("closed account reported as open", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("account closure letter dated May 1, 2026"),
  ).toBeVisible();

  await expect(page.getByRole("button", { name: "Next step" })).toBeEnabled();
  await page.getByRole("button", { name: "Next step" }).click();

  await expect(
    page.getByRole("heading", { name: "Review confirmed issues" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Generate" }).click();

  await expect(page.getByRole("heading", { name: "Results" })).toBeVisible({
    timeout: 60000,
  });
  await expect(page.getByText("Letter being created.", { exact: true })).toBeVisible();
  const generatedArtifact = page
    .locator(".artifact-card")
    .filter({ hasText: "bureau-removal-demand-letter.pdf" })
    .first();
  await expect(generatedArtifact.getByRole("link", { name: "Download PDF" })).toBeVisible({
    timeout: 60000,
  });
});
