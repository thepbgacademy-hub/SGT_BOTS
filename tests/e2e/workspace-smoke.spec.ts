import { expect, test } from "@playwright/test";

test("phase 0 e2e lane loads the root Playwright config", async ({}, testInfo) => {
  expect(testInfo.project.use.baseURL).toBe("http://127.0.0.1:3000");
});
