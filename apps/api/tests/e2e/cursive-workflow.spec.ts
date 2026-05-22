import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";
import { readEnv } from "../../src/config/env";

describe("Cursive workflow route", () => {
  it("returns the workflow-only entry metadata", async () => {
    const app = await buildApp({
      env: readEnv({
        APP_PORT: "3001",
        PROFILE_REPO_MODE: "memory",
        PROVIDER_VALIDATION_MODE: "stub",
        TELEGRAM_BOT_TOKEN: "test-token",
        TELEGRAM_BOT_USERNAME: "test_bot",
      }),
    });
    const expectedEntry = {
      chatEnabled: false,
      modes: ["manual_dispute", "analyze_uploaded_report"],
    } as const;
    let getWorkflowEntryCallCount = 0;

    (
      app as typeof app & {
        cursiveService: {
          getWorkflowEntry: () => typeof expectedEntry;
        };
      }
    ).cursiveService = {
      getWorkflowEntry() {
        getWorkflowEntryCallCount += 1;

        return expectedEntry;
      },
    };

    const response = await app.inject({
      method: "GET",
      url: "/api/cursive/workflow/entry",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(expectedEntry);
    expect(getWorkflowEntryCallCount).toBe(1);
  });
});
