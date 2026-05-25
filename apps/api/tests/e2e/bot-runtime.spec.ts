import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BOT_MANIFESTS } from "../../../../packages/shared/src/bots/manifests";
import { buildApp } from "../../src/app";
import { readEnv } from "../../src/config/env";
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
      userId: string;
    };
    sessionToken: string;
  };

  return {
    app,
    sessionId: payload.session.id,
    sessionToken: payload.sessionToken,
    userId: payload.session.userId,
  };
}

describe("bot runtime routes", () => {
  it("matches the planned phase 3 persistence schema contract", async () => {
    const sql = await readFile(
      new URL(
        "../../../../supabase/migrations/003_bots_conversations_messages.sql",
        import.meta.url,
      ),
      "utf8",
    );

    expect(sql).toContain("create table bot_definitions");
    expect(sql).toContain("bot_id text primary key");
    expect(sql).toContain("name text not null");
    expect(sql).toContain("category text not null");
    expect(sql).toContain("capability_manifest jsonb");
    expect(sql).toContain("source_binding text not null");
    expect(sql).toContain("prompt_version text");
    expect(sql).toContain("active boolean");
    expect(sql).toContain("create table conversations");
    expect(sql).toContain("state jsonb");
    expect(sql).toContain("ended_at timestamptz");
    expect(sql).toContain("create table messages");
    expect(sql).toContain("safety_flags jsonb");
  });

  it("keeps the playground bot registry migration locked behind RLS with a read-only policy", async () => {
    const sql = await readFile(
      new URL(
        "../../../../supabase/migrations/006_playground_bot_registry.sql",
        import.meta.url,
      ),
      "utf8",
    );

    expect(sql).toContain("alter table playground_bot_registry enable row level security");
    expect(sql).toContain(
      'create policy "Authenticated users can read the playground bot registry"',
    );
    expect(sql).toContain("on playground_bot_registry for select");
    expect(sql).toContain("to authenticated");
    expect(sql).toContain("using (true)");
  });

  it("returns the authenticated bot catalog for an active provider session", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const response = await app.inject({
      method: "GET",
      url: `/api/bots?sessionId=${encodeURIComponent(sessionId)}`,
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      bots: expect.arrayContaining([
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
        {
          id: "concierge_general_academy_KB",
          name: "Rori",
          description: "Routes knowledge-base questions across the academy domain.",
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
        expect.objectContaining({
          id: "tutor",
          name: "Insight",
          menuPosition: "middle-left",
        }),
        expect.objectContaining({
          id: "form_wizard",
          name: "ShAzZaM!",
          menuPosition: "bottom-left",
        }),
        expect.objectContaining({
          id: "verifier",
          name: "Top Secret",
          menuPosition: "top-right",
        }),
        expect.objectContaining({
          id: "tax_legal_research",
          name: "Condor",
          menuPosition: "bottom-right",
        }),
      ]),
    });
  }, 40000);

  it("answers academy enrollment questions as Rori without report language", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const kbResponse = await app.inject({
      method: "POST",
      url: "/api/chat/messages",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "concierge_general_academy_KB",
        message: "How do I enroll in the PBG Academy workshop and join the Telegram room?",
      },
    });

    const body = kbResponse.json() as {
      output: string;
      citations: Array<{ sourceId: string; title: string }>;
    };

    expect(kbResponse.statusCode).toBe(200);
    expect(body).toMatchObject({
      botId: "concierge_general_academy_KB",
      output: expect.stringContaining("PBG Academy"),
      citations: [],
      conversation: {
        botId: "concierge_general_academy_KB",
        sessionId,
      },
    });
    expect(body.output).toContain("Telegram");
    expect(body.output).toContain("workshop");
    expect(body.output).not.toMatch(
      /PDF|reports?|artifacts?|Release Review Runbook|document upload/i,
    );
  }, 40000);

  it("returns kb concierge replies and keeps document wizard isolated from those tools", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const kbResponse = await app.inject({
      method: "POST",
      url: "/api/chat/messages",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "concierge_general_academy_KB",
        message: "What is the PBG Academy Telegram room for?",
      },
    });

    const kbConversationId = (kbResponse.json() as {
      conversation: { id: string };
    }).conversation.id;

    const documentResponse = await app.inject({
      method: "POST",
      url: "/api/chat/messages",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "document_wizard",
        message: "Draft a launch brief for tomorrow.",
      },
    });

    expect(documentResponse.statusCode).toBe(409);
    expect(documentResponse.json()).toMatchObject({
      message: "cursive workflow only",
    });

    const leakedConversationResponse = await app.inject({
      method: "POST",
      url: "/api/chat/messages",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        conversationId: kbConversationId,
        botId: "document_wizard",
        message: "Reuse the other bot conversation.",
      },
    });

    expect(leakedConversationResponse.statusCode).toBe(409);
    expect(leakedConversationResponse.json()).toEqual({
      message: "conversation belongs to a different bot",
    });
  }, 40000);

  it.each([
    {
      message: "Can Rori help me dispute a credit bureau tradeline under FCRA?",
      specialist: "Cursive",
    },
    {
      message: "Can Rori help me with credit reports?",
      specialist: "Cursive",
    },
    {
      message: "Can Rori explain a consumer reporting agency reinvestigation under the Fair Credit Reporting Act?",
      specialist: "Cursive",
    },
    {
      message: "Can Rori fact check whether this online claim is true or false?",
      specialist: "Top Secret",
    },
    {
      message: "Can you check whether this is true?",
      specialist: "Top Secret",
    },
    {
      message: "Is this true or false?",
      specialist: "Top Secret",
    },
    {
      message: "Can you verify this statement?",
      specialist: "Top Secret",
    },
    {
      message: "Can Rori research the tax statute in the USC, CFR, IRS, or Treasury rules?",
      specialist: "Condor",
    },
    {
      message: "Can Rori collect answers for this intake form questionnaire?",
      specialist: "ShAzZaM",
    },
  ])("routes specialized Rori requests to $specialist", async ({ message, specialist }) => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const response = await app.inject({
      method: "POST",
      url: "/api/chat/messages",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "concierge_general_academy_KB",
        message,
      },
    });

    const body = response.json() as {
      output: string;
      citations: Array<{ sourceId: string; title: string }>;
    };

    expect(response.statusCode).toBe(200);
    expect(body.output).toContain(specialist);
    expect(body.output).toContain("Rori");
    expect(body.output).not.toMatch(
      /PDF|reports?|artifacts?|Release Review Runbook|document upload/i,
    );
    expect(body.citations).toEqual([]);
  }, 40000);

  it.each([
    {
      message: "Can Rori verify my enrollment for the next Academy workshop?",
      unexpectedSpecialist: "Top Secret",
    },
    {
      message: "Can Rori verify my enrollment?",
      unexpectedSpecialist: "Top Secret",
    },
  ])("keeps Academy verification phrasing in Rori for $message", async ({ message, unexpectedSpecialist }) => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const response = await app.inject({
      method: "POST",
      url: "/api/chat/messages",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "concierge_general_academy_KB",
        message,
      },
    });

    const body = response.json() as {
      output: string;
      citations: Array<{ sourceId: string; title: string; url: string }>;
    };

    expect(response.statusCode).toBe(200);
    expect(body.output).toContain("PBG Academy");
    expect(body.output).not.toContain(unexpectedSpecialist);
    expect(body.citations).toEqual([]);
  }, 40000);

  it.each([
    {
      message: "Which tool should I use for...?",
      expected: "Use Cursive for credit bureau and dispute work",
    },
    {
      message: "Which PBG Telegram rooms should I join?",
      expected: "PBG Telegram rooms",
    },
    {
      message: "What workshops are coming up?",
      expected: "PBG Academy workshop and event questions",
    },
    {
      message: "How do I enroll?",
      expected: "PBG Academy enrollment",
    },
  ])("answers Rori starter prompt: $message", async ({ message, expected }) => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const response = await app.inject({
      method: "POST",
      url: "/api/chat/messages",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "concierge_general_academy_KB",
        message,
      },
    });

    const body = response.json() as {
      output: string;
      citations: Array<{ sourceId: string; title: string; url: string }>;
    };

    expect(response.statusCode).toBe(200);
    expect(body.output).toContain(expected);
    expect(body.output).not.toMatch(
      /PDF|reports?|artifacts?|Release Review Runbook|document upload/i,
    );
    expect(body.citations).toEqual([]);
  }, 40000);

  it("routes source-backed claim verification phrasing to Top Secret", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const response = await app.inject({
      method: "POST",
      url: "/api/chat/messages",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "concierge_general_academy_KB",
        message: "Can Rori fact check this claim?",
      },
    });

    const body = response.json() as {
      output: string;
      citations: Array<{ sourceId: string; title: string; url: string }>;
    };

    expect(response.statusCode).toBe(200);
    expect(body.output).toContain("Top Secret");
    expect(body.citations).toEqual([]);
  }, 40000);

  it("keeps the Phase 2 bearer session token requirement on bot routes", async () => {
    const { app, sessionId } = await createAuthorizedSession();

    const response = await app.inject({
      method: "GET",
      url: `/api/bots?sessionId=${encodeURIComponent(sessionId)}`,
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      message: "missing session token",
    });
  }, 40000);

  it(
    "keeps the Phase 2 bearer session token requirement on chat post routes",
    async () => {
      const { app, sessionId } = await createAuthorizedSession();

      const response = await app.inject({
        method: "POST",
        url: "/api/chat/messages",
        payload: {
          sessionId,
          botId: "concierge_general_academy_KB",
          message: "Hello?",
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        message: "missing session token",
      });
    },
    40000,
  );

  it("hides inactive bots from catalog and blocks them from runtime lookup", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();
    const documentWizard = BOT_MANIFESTS.find(
      (bot) => bot.id === "document_wizard",
    ) as { active: boolean } | undefined;

    if (!documentWizard) {
      throw new Error("document wizard fixture missing");
    }

    const previousActive = documentWizard.active;
    documentWizard.active = false;

    try {
      const catalogResponse = await app.inject({
        method: "GET",
        url: `/api/bots?sessionId=${encodeURIComponent(sessionId)}`,
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
      });

      const runtimeResponse = await app.inject({
        method: "POST",
        url: "/api/chat/messages",
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          sessionId,
          botId: "document_wizard",
          message: "Draft a launch brief for tomorrow.",
        },
      });

      expect(catalogResponse.statusCode).toBe(200);
      expect(catalogResponse.json()).toMatchObject({
        bots: expect.arrayContaining([
          expect.objectContaining({
            id: "concierge_general_academy_KB",
          }),
        ]),
      });
      expect(
        (catalogResponse.json() as { bots: Array<{ id: string }> }).bots,
      ).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "document_wizard",
          }),
        ]),
      );
      expect(runtimeResponse.statusCode).toBe(404);
      expect(runtimeResponse.json()).toEqual({
        message: "bot not found",
      });
    } finally {
      documentWizard.active = previousActive;
    }
  }, 40000);
});
