import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import { readEnv } from "../../src/config/env";
import { createChatService } from "../../src/modules/chat/chat.service";
import { createFormWizardService } from "../../src/modules/form-wizard/form-wizard.service";
import { createInMemoryProfileRepo } from "../../src/modules/profiles/profile.repo";
import { createInMemorySessionMetadataRepo } from "../../src/modules/sessions/session.repo";
import { createInMemorySessionSecretStore } from "../../src/modules/sessions/session.service";
import {
  createSignedTelegramInitData,
  TEST_TELEGRAM_BOT_TOKEN,
} from "../../../../packages/shared/src/testing/telegram-fixtures";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function createAuthorizedSession() {
  const initData = createSignedTelegramInitData();
  const app = await buildApp({
    env: readEnv({
      APP_PORT: "3001",
      TELEGRAM_BOT_USERNAME: "sgt_playground_bot",
      TELEGRAM_BOT_TOKEN: TEST_TELEGRAM_BOT_TOKEN,
      PROFILE_REPO_MODE: "memory",
      PROVIDER_VALIDATION_MODE: "stub",
    }),
    profileRepo: createInMemoryProfileRepo(),
    sessionMetadataRepo: createInMemorySessionMetadataRepo(),
    sessionSecretStore: createInMemorySessionSecretStore(),
  });

  const profileResponse = await app.inject({
    method: "POST",
    url: "/api/profiles",
    payload: {
      initData,
      firstName: "Ada",
      lastName: "Lovelace",
      preferredName: "Ada",
    },
  });
  expect(profileResponse.statusCode).toBe(201);

  const sessionResponse = await app.inject({
    method: "POST",
    url: "/api/providers/connect",
    headers: {
      "x-telegram-init-data": initData,
    },
    payload: {
      provider: "openai",
      apiKey: "sk-test",
    },
  });
  expect(sessionResponse.statusCode).toBe(200);

  const payload = sessionResponse.json() as {
    session: {
      id: string;
    };
    sessionToken: string;
  };

  return {
    app,
    sessionId: payload.session.id,
    sessionToken: payload.sessionToken,
  };
}

describe("form wizard service", () => {
  it("describes a chat-disabled guided intake workflow entry", () => {
    const formWizardService = createFormWizardService();

    expect(formWizardService.getWorkflowEntry()).toEqual({
      botId: "form_wizard",
      chatEnabled: false,
      modes: ["guided_intake"],
      intakeFields: [
        expect.objectContaining({ key: "form_title", label: "Form title" }),
        expect.objectContaining({
          key: "requested_output",
          label: "Requested output",
        }),
        expect.objectContaining({ key: "key_details", label: "Key details" }),
      ],
    });
  });

  it("identifies missing required fields without completing the intake", () => {
    const formWizardService = createFormWizardService();

    const result = formWizardService.validateGuidedIntake({
      form_title: "Workshop signup",
      requested_output: "   ",
    });

    expect(result).toMatchObject({
      status: "incomplete",
      missingFields: ["requested_output", "key_details"],
      missingFieldLabels: ["Requested output", "Key details"],
      message: "Missing required intake fields: Requested output, Key details",
    });
    expect(result).not.toHaveProperty("intake");
  });

  it("returns a validated, trimmed intake when all required fields exist", () => {
    const formWizardService = createFormWizardService();

    const result = formWizardService.validateGuidedIntake({
      form_title: "  Workshop signup  ",
      requested_output: "Confirmation summary",
      key_details: "Name and preferred workshop date",
    });

    expect(result).toMatchObject({
      status: "ready",
      intake: {
        form_title: "Workshop signup",
        requested_output: "Confirmation summary",
        key_details: "Name and preferred workshop date",
      },
    });
  });
});

describe("createChatService form_wizard workflow gating", () => {
  it("throws shazzam workflow only for form_wizard chat sends", async () => {
    const chatService = createChatService();

    await expect(
      chatService.sendMessage({
        sessionId: "session-1",
        userId: "user-1",
        botId: "form_wizard",
        message: "Help me fill out a form.",
      }),
    ).rejects.toThrow("shazzam workflow only");
  });

  it("does not load persona config before rejecting form_wizard chat", async () => {
    const chatService = createChatService({
      botPromptConfigRepo: {
        async getActiveConfig() {
          throw new Error("persona config should not load for ShAzZaM!");
        },
        async getActiveConfigResult() {
          throw new Error("persona config should not load for ShAzZaM!");
        },
      },
    });

    await expect(
      chatService.sendMessage({
        sessionId: "session-1",
        userId: "user-1",
        botId: "form_wizard",
        message: "Help me fill out a form.",
      }),
    ).rejects.toThrow("shazzam workflow only");
  });

  it("does not advance message or conversation ids when form_wizard send fails", async () => {
    const chatService = createChatService();

    await expect(
      chatService.sendMessage({
        sessionId: "session-1",
        userId: "user-1",
        botId: "form_wizard",
        message: "Help me fill out a form.",
      }),
    ).rejects.toThrow("shazzam workflow only");

    const tutorReply = await chatService.sendMessage({
      sessionId: "session-1",
      userId: "user-1",
      botId: "tutor",
      message: "Walk me through this concept",
    });

    expect(tutorReply.conversation.id).toBe("conversation-1");
    expect(tutorReply.userMessage.id).toBe("message-1");
    expect(tutorReply.assistantMessage.id).toBe("message-2");
  });
});

describe("form wizard workflow routes", () => {
  it("serves the chat-disabled workflow entry", async () => {
    const { app } = await createAuthorizedSession();

    const response = await app.inject({
      method: "GET",
      url: "/api/form-wizard/workflow/entry",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      botId: "form_wizard",
      chatEnabled: false,
      modes: ["guided_intake"],
    });
  });

  it("rejects form_wizard chat messages with a workflow-only conflict", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const response = await app.inject({
      method: "POST",
      url: "/api/chat/messages",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "form_wizard",
        message: "Help me fill out a form.",
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      message: "shazzam workflow only",
    });
  });

  it("requires a session token before validating intake", async () => {
    const { app, sessionId } = await createAuthorizedSession();

    const response = await app.inject({
      method: "POST",
      url: "/api/form-wizard/workflow/guided-intake/validate",
      payload: {
        sessionId,
        intake: {
          form_title: "Workshop signup",
        },
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it("identifies the missing field and does not complete the submission", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const response = await app.inject({
      method: "POST",
      url: "/api/form-wizard/workflow/guided-intake/validate",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        intake: {
          form_title: "Workshop signup",
          requested_output: "Confirmation summary",
        },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      status: "incomplete",
      missingFieldLabels: ["Key details"],
      message: "Missing required intake fields: Key details",
    });
  });

  it("validates a complete guided intake", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const response = await app.inject({
      method: "POST",
      url: "/api/form-wizard/workflow/guided-intake/validate",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        intake: {
          form_title: " Workshop signup ",
          requested_output: "Confirmation summary",
          key_details: "Name and preferred workshop date",
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ready",
      intake: {
        form_title: "Workshop signup",
        requested_output: "Confirmation summary",
        key_details: "Name and preferred workshop date",
      },
    });
  });

  it("rejects other bots on the form wizard validate route", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const response = await app.inject({
      method: "POST",
      url: "/api/form-wizard/workflow/guided-intake/validate",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "document_wizard",
        intake: {
          form_title: "Workshop signup",
          requested_output: "Confirmation summary",
          key_details: "Name and preferred workshop date",
        },
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      message: "bot not found",
    });
  });
});
