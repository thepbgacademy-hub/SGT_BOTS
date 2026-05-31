import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BOT_MANIFESTS } from "../../../../packages/shared/src/bots/manifests";
import { buildApp } from "../../src/app";
import { readEnv } from "../../src/config/env";
import { createInMemoryProfileRepo } from "../../src/modules/profiles/profile.repo";
import { createInMemorySessionMetadataRepo } from "../../src/modules/sessions/session.repo";
import { createInMemorySessionSecretStore } from "../../src/modules/sessions/session.service";
import type { RoriAcademyDirectoryRepo } from "../../src/modules/chat/rori-directory.repo";
import type { RoriWikiRepo } from "../../src/modules/chat/rori-wiki.repo";
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

async function createAuthorizedSessionWithRoriDirectoryRepo(
  roriDirectoryRepo: RoriAcademyDirectoryRepo,
) {
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
    roriDirectoryRepo,
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

async function createAuthorizedSessionWithRoriWikiRepo(roriWikiRepo: RoriWikiRepo) {
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
    roriWikiRepo,
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

    expect(sql).toContain("create table playground_bot_definitions");
    expect(sql).toContain("bot_id text primary key");
    expect(sql).toContain("name text not null");
    expect(sql).toContain("category text not null");
    expect(sql).toContain("capability_manifest jsonb");
    expect(sql).toContain("source_binding text not null");
    expect(sql).toContain("prompt_version text");
    expect(sql).toContain("active boolean");
    expect(sql).toContain("create table playground_conversations");
    expect(sql).toContain("state jsonb");
    expect(sql).toContain("ended_at timestamptz");
    expect(sql).toContain("create table playground_messages");
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

  it("adds Rori Academy directory tables with authenticated read policies", async () => {
    const sql = await readFile(
      new URL(
        "../../../../supabase/migrations/008_rori_academy_directory.sql",
        import.meta.url,
      ),
      "utf8",
    );

    expect(sql).toContain("create schema if not exists rori");
    expect(sql).toContain("grant usage on schema rori to authenticated, service_role");
    expect(sql).toContain("create table if not exists rori.rori_academy_events");
    expect(sql).toContain("event_key text primary key");
    expect(sql).toContain("registration_url text");
    expect(sql).toContain("create table if not exists rori.rori_telegram_rooms");
    expect(sql).toContain("room_key text primary key");
    expect(sql).toContain("invite_url text");
    expect(sql).toContain("grant select on rori.rori_academy_events to authenticated, service_role");
    expect(sql).toContain("grant select on rori.rori_telegram_rooms to authenticated, service_role");
    expect(sql).toContain("alter table rori.rori_academy_events enable row level security");
    expect(sql).toContain("alter table rori.rori_telegram_rooms enable row level security");
    expect(sql).toContain("Authenticated users can read active Rori Academy events");
    expect(sql).toContain("Authenticated users can read active Rori Telegram rooms");
  });

  it("adds Rori Academy wiki pages with authenticated published-page reads", async () => {
    const sql = await readFile(
      new URL(
        "../../../../supabase/migrations/009_rori_academy_wiki.sql",
        import.meta.url,
      ),
      "utf8",
    );

    expect(sql).toContain("create schema if not exists rori");
    expect(sql).toContain("grant usage on schema rori to authenticated, service_role");
    expect(sql).toContain("create table if not exists rori.rori_academy_wiki_pages");
    expect(sql).toContain("page_key text primary key");
    expect(sql).toContain("status text not null default 'draft'");
    expect(sql).toContain("source_url text");
    expect(sql).toContain("grant select on rori.rori_academy_wiki_pages to authenticated, service_role");
    expect(sql).toContain("alter table rori.rori_academy_wiki_pages enable row level security");
    expect(sql).toContain("Authenticated users can read published Rori Academy wiki pages");
    expect(sql).toContain("status = 'published'");
    expect(sql).toContain("example\\.invalid");
  });

  it("adds a non-destructive migration that moves Rori Academy data into the dedicated rori schema", async () => {
    const sql = await readFile(
      new URL(
        "../../../../supabase/migrations/012_rori_schema_segregation.sql",
        import.meta.url,
      ),
      "utf8",
    );

    expect(sql).toContain("create schema if not exists rori");
    expect(sql).toContain("grant usage on schema rori to authenticated, service_role");
    expect(sql).toContain("alter table public.rori_academy_events set schema rori");
    expect(sql).toContain("alter table public.rori_telegram_rooms set schema rori");
    expect(sql).toContain("alter table public.rori_academy_wiki_pages set schema rori");
    expect(sql).toContain("grant select on rori.rori_academy_events to authenticated, service_role");
    expect(sql).toContain("grant select on rori.rori_telegram_rooms to authenticated, service_role");
    expect(sql).toContain("grant select on rori.rori_academy_wiki_pages to authenticated, service_role");
    expect(sql).not.toMatch(/\bdrop table\b|\btruncate\b|\bdelete from\b/i);
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
      citations: Array<{ sourceId: string; title: string; url: string }>;
    };

    expect(kbResponse.statusCode).toBe(200);
    expect(body).toMatchObject({
      botId: "concierge_general_academy_KB",
      output: expect.stringContaining("PBG Academy"),
      citations: expect.arrayContaining([
        expect.objectContaining({
          sourceId: "knowledge_base",
          title: "Academy Enrollment",
        }),
      ]),
      conversation: {
        botId: "concierge_general_academy_KB",
        sessionId,
      },
    });
    expect(body.output).toContain("I can't open the live enrollment link");
    expect(body.citations.every((citation) => !citation.url.includes("example.invalid"))).toBe(true);
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
    expect(body.citations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Rori Tool Routing Source Pack",
        }),
      ]),
    );
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
    expect(body.citations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Academy Enrollment",
        }),
      ]),
    );
  }, 40000);

  it.each([
    {
      message: "Which tool should I use for...?",
      expected: "Use Cursive for credit bureau and dispute work",
    },
    {
      message: "Which PBG Telegram rooms should I join?",
      expected: "Rori DM",
    },
    {
      message: "What workshops are coming up?",
      expected: "I don't have a live workshop or event list inside the playground yet",
    },
    {
      message: "How do I enroll?",
      expected: "PBG Academy enrollment",
      expectedAlt: "I can't open the live enrollment link",
    },
  ])("answers Rori starter prompt: $message", async ({ message, expected, expectedAlt }) => {
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
    if (expectedAlt) {
      expect(body.output).toContain(expectedAlt);
    }
    expect(body.citations.length).toBeGreaterThan(0);
    expect(body.citations.every((citation) => !citation.url.includes("example.invalid"))).toBe(true);
    expect(body.output).not.toMatch(
      /PDF|reports?|artifacts?|Release Review Runbook|document upload/i,
    );
  }, 40000);

  it("answers Rori workshop questions from the Academy directory without inventing events", async () => {
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
        message: "What workshops are coming up?",
      },
    });

    const body = response.json() as {
      output: string;
      citations: Array<{ sourceId: string; title: string; url: string }>;
    };

    expect(response.statusCode).toBe(200);
    expect(body.output).toContain(
      "I don't have a live workshop or event list inside the playground yet",
    );
    expect(body.output).toContain("Academy admin");
    expect(body.output).not.toMatch(/\bhttps?:\/\//i);
    expect(body.citations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceId: "knowledge_base",
          title: "Rori Academy Directory Source Pack",
        }),
      ]),
    );
  }, 40000);

  it("uses the active Rori conversation to resolve an enrollment follow-up", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const enrollmentResponse = await app.inject({
      method: "POST",
      url: "/api/chat/messages",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "concierge_general_academy_KB",
        message: "How do I enroll?",
      },
    });

    expect(enrollmentResponse.statusCode).toBe(200);
    const conversationId = (enrollmentResponse.json() as {
      conversation: { id: string };
    }).conversation.id;

    const followUpResponse = await app.inject({
      method: "POST",
      url: "/api/chat/messages",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        conversationId,
        botId: "concierge_general_academy_KB",
        message: "What happens after that?",
      },
    });

    const body = followUpResponse.json() as {
      output: string;
    };

    expect(followUpResponse.statusCode).toBe(200);
    expect(body.output).toContain("After you enroll");
    expect(body.output).not.toContain("PBG Academy is where Cadets come to study");
  }, 40000);

  it("uses the active Rori conversation to resolve a Telegram room follow-up", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const roomListResponse = await app.inject({
      method: "POST",
      url: "/api/chat/messages",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "concierge_general_academy_KB",
        message: "Which PBG Telegram rooms should I join?",
      },
    });

    expect(roomListResponse.statusCode).toBe(200);
    const conversationId = (roomListResponse.json() as {
      conversation: { id: string };
    }).conversation.id;

    const followUpResponse = await app.inject({
      method: "POST",
      url: "/api/chat/messages",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        conversationId,
        botId: "concierge_general_academy_KB",
        message: "Which one would help with payment trouble?",
      },
    });

    const body = followUpResponse.json() as {
      output: string;
    };

    expect(followUpResponse.statusCode).toBe(200);
    expect(body.output).toContain("Lobby DM to staff");
    expect(body.output).toContain("payment problems");
  }, 40000);

  it("uses the active Rori conversation to resolve general room help follow-up", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const roomListResponse = await app.inject({
      method: "POST",
      url: "/api/chat/messages",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "concierge_general_academy_KB",
        message: "Which PBG Telegram rooms should I join?",
      },
    });

    expect(roomListResponse.statusCode).toBe(200);
    const conversationId = (roomListResponse.json() as {
      conversation: { id: string };
    }).conversation.id;

    const followUpResponse = await app.inject({
      method: "POST",
      url: "/api/chat/messages",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        conversationId,
        botId: "concierge_general_academy_KB",
        message: "And which one for general Academy help?",
      },
    });

    const body = followUpResponse.json() as {
      output: string;
    };

    expect(followUpResponse.statusCode).toBe(200);
    expect(body.output).toContain("Rori DM");
    expect(body.output).toContain("General Academy questions");
  }, 40000);

  it("lists admin-maintained Telegram room purposes and does not invent invite links", async () => {
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
        message: "Which PBG Telegram rooms should I join?",
      },
    });

    const body = response.json() as {
      output: string;
      citations: Array<{ sourceId: string; title: string; url: string }>;
    };

    expect(response.statusCode).toBe(200);
    expect(body.output).toContain("Rori DM");
    expect(body.output).toContain("Lobby DM to staff");
    expect(body.output).toContain("I can't open the live invite");
    expect(body.output).not.toMatch(/\bhttps?:\/\//i);
    expect(body.citations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceId: "knowledge_base",
          title: "Rori Academy Directory Source Pack",
        }),
      ]),
    );
  }, 40000);

  it("routes specific Telegram access trouble to the matching room purpose", async () => {
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
        message: "I am having Telegram access trouble and cannot find the right room.",
      },
    });

    const body = response.json() as {
      output: string;
      citations: Array<{ sourceId: string; title: string; url: string }>;
    };

    expect(response.statusCode).toBe(200);
    expect(body.output).toContain("Lobby DM to staff");
    expect(body.output).toContain("I can't open the live invite");
    expect(body.citations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceId: "knowledge_base",
          title: "Rori Academy Directory Source Pack",
        }),
      ]),
    );
  }, 40000);

  it.each([
    {
      message: "Which Telegram room should I use for general Academy help?",
      expectedRoom: "Rori DM",
    },
    {
      message: "Which Telegram room is for support questions?",
      expectedRoom: "Rori DM",
    },
    {
      message: "Which Telegram room should I use for technical access help?",
      expectedRoom: "Lobby DM to staff",
    },
  ])("routes specific room purpose questions to $expectedRoom", async ({ message, expectedRoom }) => {
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
    expect(body.output).toContain(expectedRoom);
    expect(body.output).toContain("I can't open the live invite");
    expect(body.citations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceId: "knowledge_base",
          title: "Rori Academy Directory Source Pack",
        }),
      ]),
    );
  }, 40000);

  it("uses configured Academy event data and registration URLs from the Rori directory repo", async () => {
    const { app, sessionId, sessionToken } =
      await createAuthorizedSessionWithRoriDirectoryRepo({
        async listTelegramRooms() {
          return [];
        },
        async listUpcomingEvents() {
          return [
            {
              id: "commerce-basics",
              label: "Commerce Basics Workshop",
              summary: "A live Academy workshop for getting oriented.",
              timing: "June 15, 2026 at 7:00 PM Central",
              keywords: ["commerce", "workshop"],
              registrationStatus: "configured",
              registrationUrl: "https://academy.example.test/events/commerce-basics",
            },
          ];
        },
      });

    const response = await app.inject({
      method: "POST",
      url: "/api/chat/messages",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "concierge_general_academy_KB",
        message: "Where do I register for the next workshop?",
      },
    });

    const body = response.json() as {
      output: string;
      citations: Array<{ title: string; url: string }>;
    };

    expect(response.statusCode).toBe(200);
    expect(body.output).toContain("Commerce Basics Workshop");
    expect(body.output).toContain("June 15, 2026 at 7:00 PM Central");
    expect(body.output).toContain("https://academy.example.test/events/commerce-basics");
    expect(body.output).not.toContain("I can't open the registration link in the playground yet");
    expect(body.output).not.toContain("I don't have a live workshop or event list inside the playground yet");
    expect(body.citations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Rori Academy Directory Source Pack",
        }),
      ]),
    );
  }, 40000);

  it("uses configured Telegram room data and invite URLs from the Rori directory repo", async () => {
    const { app, sessionId, sessionToken } =
      await createAuthorizedSessionWithRoriDirectoryRepo({
        async listUpcomingEvents() {
          return [];
        },
        async listTelegramRooms() {
          return [
            {
              id: "tech-access",
              label: "Live Tech Access Desk",
              purpose: "Telegram access and login support for Academy members.",
              keywords: ["technical", "access", "login"],
              linkStatus: "configured",
              inviteUrl: "https://t.me/+configuredTechDesk",
            },
          ];
        },
      });

    const response = await app.inject({
      method: "POST",
      url: "/api/chat/messages",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "concierge_general_academy_KB",
        message: "Which Telegram room should I use for technical access help?",
      },
    });

    const body = response.json() as {
      output: string;
      citations: Array<{ title: string; url: string }>;
    };

    expect(response.statusCode).toBe(200);
    expect(body.output).toContain("Live Tech Access Desk");
    expect(body.output).toContain("https://t.me/+configuredTechDesk");
    expect(body.output).not.toContain("I can't open the live invite");
    expect(body.citations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Rori Academy Directory Source Pack",
        }),
      ]),
    );
  }, 40000);

  it("answers Academy questions from injected wiki pages without using fake links", async () => {
    const { app, sessionId, sessionToken } = await createAuthorizedSessionWithRoriWikiRepo({
      async searchPages() {
        return [
          {
            body:
              "I can help you understand how enrollment works. I can't open the live enrollment link in the playground yet, but I can still point you to the right information.",
            keywords: ["enrollment", "academy", "join"],
            slug: "enrollment",
            sourceUrl: "sgt-bots://wiki/rori/enrollment",
            status: "published",
            summary: "Current Academy enrollment guidance.",
            title: "Academy Enrollment Wiki",
            updatedAt: "2026-05-25T00:00:00.000Z",
          },
        ];
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/chat/messages",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "concierge_general_academy_KB",
        message: "How do I enroll in the PBG Academy?",
      },
    });

    const body = response.json() as {
      output: string;
      citations: Array<{ title: string; url: string }>;
    };

    expect(response.statusCode).toBe(200);
    expect(body.output).toContain("I can help you understand how enrollment works");
    expect(body.output).toContain("I can't open the live enrollment link");
    expect(body.output).not.toMatch(/\bhttps?:\/\/example/i);
    expect(body.citations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Academy Enrollment Wiki",
          url: "sgt-bots://wiki/rori/enrollment",
        }),
      ]),
    );
  }, 40000);

  it("lists configured Telegram invite URLs for generic room link requests", async () => {
    const { app, sessionId, sessionToken } =
      await createAuthorizedSessionWithRoriDirectoryRepo({
        async listUpcomingEvents() {
          return [];
        },
        async listTelegramRooms() {
          return [
            {
              id: "enrollment-help",
              label: "Enrollment Help Live",
              purpose: "Academy enrollment help.",
              keywords: ["enrollment", "help"],
              linkStatus: "configured",
              inviteUrl: "https://t.me/+configuredEnrollment",
            },
            {
              id: "tool-support",
              label: "Tool Support",
              purpose: "Tool support for Playground apps.",
              keywords: ["tool", "support"],
              linkStatus: "not_configured",
            },
          ];
        },
      });

    const response = await app.inject({
      method: "POST",
      url: "/api/chat/messages",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId: "concierge_general_academy_KB",
        message: "Can you give me the Telegram room links?",
      },
    });

    const body = response.json() as {
      output: string;
    };

    expect(response.statusCode).toBe(200);
    expect(body.output).toContain("Enrollment Help Live");
    expect(body.output).toContain("https://t.me/+configuredEnrollment");
    expect(body.output).toContain("Tool Support");
    expect(body.output).toContain("I can't open the live invite for Tool Support");
    expect(body.output).not.toContain("live room links are not configured yet");
  }, 40000);

  it.each([
    {
      message: "Where do I register for the next workshop?",
      expected: "I can't open the registration link in the playground yet",
    },
    {
      message: "How do I sign up for the next workshop?",
      expected: "I can't open the registration link in the playground yet",
    },
    {
      message: "Can you give me the Telegram room links?",
      expected: "I can't open the live room links in the playground yet",
    },
    {
      message: "Can I get an invite to the Telegram room?",
      expected: "I can't open the live room links in the playground yet",
    },
  ])("does not invent live links for $message", async ({ message, expected }) => {
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
    expect(body.citations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceId: "knowledge_base",
        }),
      ]),
    );
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
    expect(body.citations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Rori Tool Routing Source Pack",
        }),
      ]),
    );
  }, 40000);

  it.each([
    {
      botId: "verifier",
      message: "Please check this claim.",
    },
    {
      botId: "tax_legal_research",
      message: "Research this tax statute.",
    },
  ])("does not return placeholder citation URLs from $botId", async ({ botId, message }) => {
    const { app, sessionId, sessionToken } = await createAuthorizedSession();

    const response = await app.inject({
      method: "POST",
      url: "/api/chat/messages",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        botId,
        message,
      },
    });

    const body = response.json() as {
      citations: Array<{ url: string }>;
    };

    expect(response.statusCode).toBe(200);
    expect(body.citations.length).toBeGreaterThan(0);
    expect(body.citations.every((citation) => !citation.url.includes("example.invalid"))).toBe(true);
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
