import { expect, test } from "@playwright/test";
import { createSignedTelegramInitData } from "../../packages/shared/src/testing/telegram-fixtures";

const VALID_INIT_DATA = createSignedTelegramInitData({
  queryId: "AAHdF6IQAAAAAN0XohDhrOr3",
  user: {
    id: 123459,
    username: "ada_phase3",
    first_name: "Ada",
    last_name: "Lovelace",
    language_code: "en",
  },
});

test("provider session unlocks the bot rail and both starter bots stay in their own lanes", async ({
  page,
}) => {
  await page.goto(`/?tgInitData=${encodeURIComponent(VALID_INIT_DATA)}`);
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByLabel("Preferred name").fill("Ada");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("API key").fill("sk-test");
  await page.getByRole("button", { name: "Validate provider" }).click();

  await expect(page.getByRole("heading", { name: "Bots" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Document Wizard" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Knowledge Concierge" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Knowledge Concierge" }).click();
  await page.getByLabel("Chat input").fill(
    "What should I read before the release review?",
  );
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(
    page.getByText("Release Review Runbook", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Knowledge Base", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Document Wizard" }).click();
  await expect(
    page.getByRole("button", { name: "Upload PDF" }),
  ).toBeVisible();

  await page.getByLabel("Chat input").fill("Draft a launch brief for tomorrow.");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(
    page.getByText("Upload a PDF or paste your notes and I will shape the final report flow for you."),
  ).toBeVisible();
  await expect(page.getByText("Release Review Runbook")).not.toBeVisible();
});

test("session refresh does not refetch the catalog on every tick", async ({
  page,
}) => {
  let botCatalogRequests = 0;
  let sessionRefreshCount = 0;

  await page.route("**/api/bots?**", async (route) => {
    botCatalogRequests += 1;
    await route.fallback();
  });

  await page.route("**/api/sessions/*", async (route) => {
    sessionRefreshCount += 1;
    const refreshedSessionId = route.request().url().split("/").pop() ?? "session-1";

    if (sessionRefreshCount === 1) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session: {
            id: refreshedSessionId,
            provider: "openai",
            startedAt: "2026-05-05T12:00:00.000Z",
            expiresAt: "2026-05-05T15:00:00.000Z",
            durationSeconds: 10800,
            remainingSeconds: 10799,
            state: "active",
          },
        }),
      });
      return;
    }

    if (sessionRefreshCount === 2) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session: {
            id: refreshedSessionId,
            provider: "openai",
            startedAt: "2026-05-05T12:00:00.000Z",
            expiresAt: "2026-05-05T15:00:00.000Z",
            durationSeconds: 10800,
            remainingSeconds: 10798,
            state: "active",
          },
        }),
      });
      return;
    }

    await route.fallback();
  });

  await page.goto(`/?tgInitData=${encodeURIComponent(VALID_INIT_DATA)}`);
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByLabel("Preferred name").fill("Ada");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("API key").fill("sk-test");
  await page.getByRole("button", { name: "Validate provider" }).click();

  await page.getByRole("button", { name: "Knowledge Concierge" }).click();
  await page.getByLabel("Chat input").fill("What should I read before the release review?");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(
    page.getByText("Release Review Runbook", { exact: true }),
  ).toBeVisible();

  await page.waitForTimeout(1200);
  expect(botCatalogRequests).toBe(1);
});

test("switching bots clears composer draft and chat errors", async ({ page }) => {
  let firstChatAttempt = true;

  await page.route("**/api/chat/messages", async (route) => {
    const payload = JSON.parse(route.request().postData() ?? "{}") as {
      botId?: string;
    };

    if (firstChatAttempt && payload.botId === "kb_concierge") {
      firstChatAttempt = false;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          message: "upstream failure",
        }),
      });
      return;
    }

    await route.fallback();
  });

  await page.goto(`/?tgInitData=${encodeURIComponent(VALID_INIT_DATA)}`);
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByLabel("Preferred name").fill("Ada");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("API key").fill("sk-test");
  await page.getByRole("button", { name: "Validate provider" }).click();

  await page.getByRole("button", { name: "Knowledge Concierge" }).click();
  await page.getByLabel("Chat input").fill("Leaky draft");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(page.getByRole("alert")).toHaveText("upstream failure");
  await expect(page.getByLabel("Chat input")).toHaveValue("Leaky draft");

  await page.getByRole("button", { name: "Document Wizard" }).click();

  await expect(page.getByRole("alert")).not.toBeVisible();
  await expect(page.getByLabel("Chat input")).toHaveValue("");
});
