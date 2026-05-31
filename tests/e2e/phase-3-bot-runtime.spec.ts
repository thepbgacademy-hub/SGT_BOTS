import { expect, test, type Page } from "@playwright/test";
import { createSignedTelegramInitData } from "../../packages/shared/src/testing/telegram-fixtures";

function buildInitData(user: { id: number; username: string }) {
  return createSignedTelegramInitData({
    queryId: `AAHdF6IQAAAAA${user.id}`,
    user: {
      id: user.id,
      username: user.username,
      first_name: "Ada",
      last_name: "Lovelace",
      language_code: "en",
    },
  });
}

async function openRori(page: Page, initData: string) {
  await page.goto(`/?tgInitData=${encodeURIComponent(initData)}`);
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByLabel("Preferred name").fill("Ada");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Provider").selectOption("openai");
  await page.getByLabel("API key").fill("sk-test");
  await page.getByRole("button", { name: "Validate provider" }).click();
  await page.getByRole("button", { name: "Rori" }).click();
}

test("provider session unlocks the menu and selected bots stay in their own lanes", async ({
  page,
}) => {
  const initData = buildInitData({
    id: 123459,
    username: "ada_phase3_menu",
  });
  await page.goto(`/?tgInitData=${encodeURIComponent(initData)}`);
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByLabel("Preferred name").fill("Ada");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Provider").selectOption("openai");
  await page.getByLabel("API key").fill("sk-test");
  await page.getByRole("button", { name: "Validate provider" }).click();

  await expect(page.getByRole("button", { name: "Cursive" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Rori" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Insight" })).toBeVisible();

  await page.getByRole("button", { name: "Rori" }).click();
  await expect(page.getByRole("heading", { name: "Rori" })).toBeVisible();
  await expect(
    page.getByText(
      "Ask about the Academy, workshops, enrollment, PBG Telegram rooms, or what tools do what.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Back to Menu" })).toBeVisible();
  await page.getByLabel("Chat input").fill("How do I enroll?");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(
    page.getByText("I can help you understand how PBG Academy enrollment works"),
  ).toBeVisible();
  await expect(page.getByText("Release Review Runbook")).not.toBeVisible();

  await page.getByRole("button", { name: "Back to Menu" }).click();
  await page.getByRole("button", { name: "Cursive" }).click();
  await expect(page.getByLabel("Chat input")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Upload PDF" })).toHaveCount(0);
  await expect(page.getByLabel("Client name")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Generate report" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Choose how to begin" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Manual dispute" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Analyze uploaded report" }),
  ).toBeVisible();
  await expect(page.getByText("Release Review Runbook")).not.toBeVisible();
});

test("session refresh does not refetch the catalog on every tick", async ({
  page,
}) => {
  const initData = buildInitData({
    id: 123460,
    username: "ada_phase3_refresh",
  });
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

  await page.goto(`/?tgInitData=${encodeURIComponent(initData)}`);
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByLabel("Preferred name").fill("Ada");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Provider").selectOption("openai");
  await page.getByLabel("API key").fill("sk-test");
  await page.getByRole("button", { name: "Validate provider" }).click();

  await page.getByRole("button", { name: "Rori" }).click();
  await page.getByLabel("Chat input").fill("What workshops are coming up?");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(
    page.getByText("I don't have a live workshop or event list inside the playground yet"),
  ).toBeVisible();
  await expect(page.getByText("Academy admin")).toBeVisible();
  await expect(page.getByText(/https?:\/\//i)).toHaveCount(0);

  await page.waitForTimeout(1200);
  expect(botCatalogRequests).toBe(1);
});

test("Rori shows Telegram room routing from the Academy directory", async ({ page }) => {
  await openRori(
    page,
    buildInitData({
      id: 123461,
      username: "ada_phase3_rooms",
    }),
  );

  await page.getByLabel("Chat input").fill("Which PBG Telegram rooms should I join?");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("Rori DM")).toBeVisible();
  await expect(page.getByText("Lobby DM to staff")).toBeVisible();
  await expect(page.getByText("I can't open the live invite")).toBeVisible();
  await expect(page.getByText(/https?:\/\//i)).toHaveCount(0);
});

test("Rori routes specific Telegram access trouble to the matching room purpose", async ({
  page,
}) => {
  await openRori(
    page,
    buildInitData({
      id: 123462,
      username: "ada_phase3_support",
    }),
  );

  await page
    .getByLabel("Chat input")
    .fill("I am having Telegram access trouble and cannot find the right room.");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("Lobby DM to staff")).toBeVisible();
  await expect(page.getByText("I can't open the live invite")).toBeVisible();
});

test("Rori keeps event registration links conservative when unset", async ({ page }) => {
  await openRori(
    page,
    buildInitData({
      id: 123463,
      username: "ada_phase3_workshops",
    }),
  );

  await page.getByLabel("Chat input").fill("Where do I register for the next workshop?");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(
    page.getByText("I can't open the registration link in the playground yet"),
  ).toBeVisible();
  await expect(page.getByText(/https?:\/\//i)).toHaveCount(0);
});

test("switching bots clears composer draft and chat errors", async ({ page }) => {
  const initData = buildInitData({
    id: 123464,
    username: "ada_phase3_switch",
  });
  let firstChatAttempt = true;

  await page.route("**/api/chat/messages", async (route) => {
    const payload = JSON.parse(route.request().postData() ?? "{}") as {
      botId?: string;
    };

    if (firstChatAttempt && payload.botId === "concierge_general_academy_KB") {
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

  await page.goto(`/?tgInitData=${encodeURIComponent(initData)}`);
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByLabel("Preferred name").fill("Ada");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Provider").selectOption("openai");
  await page.getByLabel("API key").fill("sk-test");
  await page.getByRole("button", { name: "Validate provider" }).click();

  await page.getByRole("button", { name: "Rori" }).click();
  await page.getByLabel("Chat input").fill("Leaky draft");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByRole("alert")).toHaveText(
    "Rori could not answer right now. Please try again.",
  );
  await expect(page.getByLabel("Chat input")).toHaveValue("Leaky draft");

  await page.getByRole("button", { name: "Back to Menu" }).click();
  await page.getByRole("button", { name: "Cursive" }).click();

  await expect(page.getByRole("alert")).not.toBeVisible();
  await expect(page.getByLabel("Chat input")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Choose how to begin" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Back to Menu" }).click();
  await page.getByRole("button", { name: "Rori" }).click();

  await expect(page.getByRole("alert")).not.toBeVisible();
  await expect(page.getByLabel("Chat input")).toHaveValue("");
});

test("menu renders only the bot lanes returned by the authenticated catalog", async ({
  page,
}) => {
  const initData = buildInitData({
    id: 123465,
    username: "ada_phase3_catalog",
  });
  await page.route("**/api/bots?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        bots: [
          {
            id: "tax_legal_research",
            name: "Condor",
            description: "Handles tax and legal research with grounded source support.",
            menuPosition: "bottom-right",
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
          {
            id: "document_wizard",
            name: "Cursive",
            description: "Turns notes and source files into polished structured outputs.",
            menuPosition: "top-left",
            capabilities: {
              chat: true,
              citations: false,
              html_report: true,
              pdf_upload: true,
              rag_query: false,
              structured_form: true,
            },
            sourceBinding: "none",
          },
        ],
      }),
    });
  });

  await page.goto(`/?tgInitData=${encodeURIComponent(initData)}`);
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByLabel("Preferred name").fill("Ada");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Provider").selectOption("openai");
  await page.getByLabel("API key").fill("sk-test");
  await page.getByRole("button", { name: "Validate provider" }).click();

  await expect(page.getByRole("button", { name: "Cursive" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Condor" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Insight" })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Rori" })).not.toBeVisible();
});
