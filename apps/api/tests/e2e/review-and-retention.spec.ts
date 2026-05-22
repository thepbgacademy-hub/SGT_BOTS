import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import { readEnv } from "../../src/config/env";
import { createInMemoryProfileRepo } from "../../src/modules/profiles/profile.repo";
import {
  createInMemorySessionMetadataRepo,
  type InMemorySessionMetadataRepo,
} from "../../src/modules/sessions/session.repo";
import { createInMemorySessionSecretStore } from "../../src/modules/sessions/session.service";
import { findStaleProfiles } from "../../../../workers/queue/src/jobs/profile-retention-cleanup.job";
import {
  createSignedTelegramInitData,
  TEST_TELEGRAM_BOT_TOKEN,
} from "../../../../packages/shared/src/testing/telegram-fixtures";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function createAuthorizedSession(options?: {
  metadataRepo?: InMemorySessionMetadataRepo;
  now?: () => number;
}) {
  const initData = createSignedTelegramInitData();
  const metadataRepo =
    options?.metadataRepo ?? createInMemorySessionMetadataRepo();
  const app = await buildApp({
    env: readEnv({
      APP_PORT: "3001",
      TELEGRAM_BOT_USERNAME: "sgt_playground_bot",
      TELEGRAM_BOT_TOKEN: TEST_TELEGRAM_BOT_TOKEN,
      TELEGRAM_REVIEW_GROUP_URL: "https://t.me/sgt_review_lab",
      PROFILE_REPO_MODE: "memory",
      PROVIDER_VALIDATION_MODE: "stub",
    }),
    now: options?.now,
    profileRepo: createInMemoryProfileRepo(),
    sessionMetadataRepo: metadataRepo,
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
    metadataRepo,
    sessionId: payload.session.id,
    sessionToken: payload.sessionToken,
    userId: payload.session.userId,
  };
}

describe("review prompt and retention cleanup", () => {
  it("matches the planned phase 5 retention schema contract", async () => {
    const sql = await readFile(
      new URL(
        "../../../../supabase/migrations/005_retention_and_audit.sql",
        import.meta.url,
      ),
      "utf8",
    );

    expect(sql).toContain("create table audit_events");
    expect(sql).toContain("actor text not null");
    expect(sql).toContain("entity_type text not null");
    expect(sql).toContain("event_type text not null");
    expect(sql).toContain("metadata jsonb not null");
  });

  it(
    "returns a review url, marks review_prompted, retires early-exit sessions, and records analytics",
    async () => {
      const { app, metadataRepo, sessionId, sessionToken } =
        await createAuthorizedSession();

      const response = await app.inject({
        method: "POST",
        url: "/api/reviews/prompt",
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          sessionId,
          reason: "early_exit",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        reviewUrl: "https://t.me/sgt_review_lab",
        reason: "early_exit",
        status: "prompted",
      });
      expect(metadataRepo.snapshot()).toMatchObject({
        playground_sessions: [
          {
            id: sessionId,
            review_prompted: true,
            status: "retired",
          },
        ],
      });
      expect(app.analyticsService.listEvents()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            eventName: "profile_created",
          }),
          expect.objectContaining({
            eventName: "provider_connected",
            entityId: sessionId,
          }),
          expect.objectContaining({
            eventName: "review_prompted",
            entityId: sessionId,
            metadata: {
              reason: "early_exit",
            },
          }),
        ]),
      );
    },
    40000,
  );

  it("allows a just-expired session token to request the timeout review prompt", async () => {
    let now = Date.parse("2026-05-05T12:00:00.000Z");
    const { app, metadataRepo, sessionId, sessionToken } =
      await createAuthorizedSession({
        metadataRepo: createInMemorySessionMetadataRepo(),
        now: () => now,
      });

    now = Date.parse("2026-05-05T15:00:00.000Z");

    const response = await app.inject({
      method: "POST",
      url: "/api/reviews/prompt",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        sessionId,
        reason: "timeout",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      reviewUrl: "https://t.me/sgt_review_lab",
      reason: "timeout",
      status: "prompted",
    });
    expect(metadataRepo.snapshot()).toMatchObject({
      playground_sessions: [
        {
          id: sessionId,
          review_prompted: true,
          status: "active",
        },
      ],
    });
  });

  it("identifies stale profiles using a 90-day inactivity cutoff", () => {
    const staleProfiles = findStaleProfiles(
      "2026-05-06T00:00:00.000Z",
      [
        {
          id: "stale-user",
          lastActivityAt: "2026-02-04T23:59:59.000Z",
        },
        {
          id: "active-user",
          lastActivityAt: "2026-02-05T00:00:01.000Z",
        },
      ],
      90,
    );

    expect(staleProfiles).toEqual([
      {
        id: "stale-user",
        lastActivityAt: "2026-02-04T23:59:59.000Z",
      },
    ]);
  });
});
