import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { buildApp } from "../../src/app";
import { readEnv } from "../../src/config/env";
import { createInMemoryProfileRepo } from "../../src/modules/profiles/profile.repo";
import { createInMemorySessionMetadataRepo } from "../../src/modules/sessions/session.repo";
import { createInMemorySessionSecretStore } from "../../src/modules/sessions/session.service";
import { createInMemoryTopSecretReviewRepo } from "../../src/modules/top-secret/top-secret-review.repo";
import {
  createSignedTelegramInitData,
  TEST_TELEGRAM_BOT_TOKEN,
} from "../../../../packages/shared/src/testing/telegram-fixtures";

async function createAuthorizedSession() {
  const initData = createSignedTelegramInitData();
  const topSecretReviewRepo = createInMemoryTopSecretReviewRepo();
  const app = await buildApp({
    env: readEnv({
      APP_PORT: "3001",
      PROFILE_REPO_MODE: "memory",
      PROVIDER_VALIDATION_MODE: "stub",
      TELEGRAM_BOT_TOKEN: TEST_TELEGRAM_BOT_TOKEN,
      TELEGRAM_BOT_USERNAME: "sgt_playground_bot",
      TOP_SECRET_ADMIN_TOKEN: "admin-test-token",
    }),
    profileRepo: createInMemoryProfileRepo(),
    sessionMetadataRepo: createInMemorySessionMetadataRepo(),
    sessionSecretStore: createInMemorySessionSecretStore(),
    topSecretReviewRepo,
  });

  expect(
    (
      await app.inject({
        method: "POST",
        payload: {
          firstName: "Ada",
          initData,
          lastName: "Lovelace",
          preferredName: "Ada",
        },
        url: "/api/profiles",
      })
    ).statusCode,
  ).toBe(201);

  const sessionResponse = await app.inject({
    headers: {
      "x-telegram-init-data": initData,
    },
    method: "POST",
    payload: {
      apiKey: "sk-test",
      provider: "openai",
    },
    url: "/api/providers/connect",
  });
  expect(sessionResponse.statusCode).toBe(200);
  const sessionPayload = sessionResponse.json() as {
    session: { id: string; userId: string };
    sessionToken: string;
  };

  return {
    app,
    sessionId: sessionPayload.session.id,
    sessionToken: sessionPayload.sessionToken,
    topSecretReviewRepo,
  };
}

describe("Top Secret review workflow", () => {
  it("ships a durable review KB persistence migration", async () => {
    const sql = await readFile(
      new URL(
        "../../../../supabase/migrations/008_top_secret_review_kb.sql",
        import.meta.url,
      ),
      "utf8",
    );

    expect(sql).toContain("create table if not exists top_secret_submissions");
    expect(sql).toContain("create table if not exists top_secret_review_candidates");
    expect(sql).toContain(
      "create table if not exists top_secret_approved_knowledge_entries",
    );
    expect(sql).toContain("source_candidate_id uuid null");
    expect(sql).toContain("on delete set null");
  });

  it("captures submissions, queues review candidates, and promotes approved patterns", async () => {
    const { app, sessionId, sessionToken, topSecretReviewRepo } =
      await createAuthorizedSession();

    const response = await app.inject({
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      method: "POST",
      payload: {
        botId: "verifier",
        claims: ["A brand new special receipt claim."],
        sessionId,
      },
      url: "/api/reports/top-secret/claim-review",
    });
    expect(response.statusCode).toBe(202);
    const reportPayload = response.json() as {
      artifact: { id: string };
    };

    expect(topSecretReviewRepo.snapshot().submissions).toEqual([
      expect.objectContaining({
        artifact_id: reportPayload.artifact.id,
        claims: ["A brand new special receipt claim."],
        session_id: sessionId,
      }),
    ]);

    const listResponse = await app.inject({
      headers: {
        "x-top-secret-admin-token": "admin-test-token",
      },
      method: "GET",
      url: "/api/admin/top-secret/review-candidates?status=pending",
    });
    expect(listResponse.statusCode).toBe(200);
    const listPayload = listResponse.json() as {
      candidates: Array<{ id: string; status: string }>;
    };
    expect(listPayload.candidates).toHaveLength(1);

    const promoteResponse = await app.inject({
      headers: {
        "x-top-secret-admin-token": "admin-test-token",
      },
      method: "POST",
      payload: {
        commonSenseStatement:
          "Common sense: a receipt does not prove a rule unless the source says it does.",
        requiredSourceHints: ["current statute"],
        researchNote:
          "This approved pattern should compare receipt claims against current source text.",
        triggerPhrases: ["special receipt"],
      },
      url: `/api/admin/top-secret/review-candidates/${listPayload.candidates[0].id}/promote`,
    });
    expect(promoteResponse.statusCode).toBe(200);
    expect(promoteResponse.json()).toMatchObject({
      approvedEntry: {
        status: "approved",
        topic: "reviewed_pattern",
      },
    });
  }, 30000);

  it("persists normalized Top Secret claims instead of raw blank inputs", async () => {
    const { app, sessionId, sessionToken, topSecretReviewRepo } =
      await createAuthorizedSession();

    const response = await app.inject({
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      method: "POST",
      payload: {
        botId: "verifier",
        claims: ["A brand new special receipt claim.", "   "],
        sessionId,
      },
      url: "/api/reports/top-secret/claim-review",
    });

    expect(response.statusCode).toBe(202);
    expect(topSecretReviewRepo.snapshot().submissions.at(-1)).toMatchObject({
      claims: ["A brand new special receipt claim."],
    });
  }, 30000);

  it("requires the admin token for review routes", async () => {
    const { app } = await createAuthorizedSession();

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/top-secret/review-candidates",
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns a controlled 400 when promotion payload is missing", async () => {
    const { app } = await createAuthorizedSession();

    const response = await app.inject({
      headers: {
        "x-top-secret-admin-token": "admin-test-token",
      },
      method: "POST",
      url: "/api/admin/top-secret/review-candidates/missing/promote",
    });

    expect(response.statusCode).toBe(400);
  });
});
