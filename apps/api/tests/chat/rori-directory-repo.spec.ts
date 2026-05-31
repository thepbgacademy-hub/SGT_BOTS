import { describe, expect, it, vi } from "vitest";
import type { AppEnv } from "../../src/config/env";
import {
  createRoriDirectoryRepo,
  createSupabaseRoriDirectoryRepo,
} from "../../src/modules/chat/rori-directory.repo";

const BASE_ENV: AppEnv = {
  appPort: 3001,
  playgroundParticipationBypassTelegramUserIds: [],
  profileRepoMode: "memory",
  providerValidationMode: "stub",
  telegramBotAppShortName: "app",
  telegramBotRuntimeMode: "off",
  telegramBotToken: "test-token",
  telegramBotTokens: ["test-token"],
  telegramBotUsername: "sgt_playground_bot",
  telegramReviewGroupUrl: "https://t.me/+review",
};

describe("Rori directory repo", () => {
  it("falls back to local directory records when Supabase env is absent", async () => {
    const repo = createRoriDirectoryRepo(BASE_ENV);

    await expect(repo.listUpcomingEvents()).resolves.toEqual([]);
    await expect(repo.listTelegramRooms()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Rori DM",
          linkStatus: "not_configured",
        }),
      ]),
    );
  });

  it("loads active Rori records from Supabase REST rows", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            room_key: "tech-access",
            label: "Live Tech Access Desk",
            purpose: "Telegram access help.",
            keywords: ["technical", "access"],
            link_status: "configured",
            invite_url: "https://t.me/+configuredTechDesk",
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            event_key: "commerce-basics",
            title: "Commerce Basics Workshop",
            summary: "A live workshop.",
            timing: "June 15, 2026 at 7:00 PM Central",
            keywords: ["commerce", "workshop"],
            registration_status: "configured",
            registration_url: "https://academy.example.test/events/commerce-basics",
          },
        ],
      });
    const repo = createSupabaseRoriDirectoryRepo(
      {
        ...BASE_ENV,
        supabaseServiceRoleKey: "service-role",
        supabaseUrl: "https://supabase.test",
      },
      { fetchImpl },
    );

    await expect(repo.listTelegramRooms()).resolves.toEqual([
      expect.objectContaining({
        id: "tech-access",
        inviteUrl: "https://t.me/+configuredTechDesk",
        label: "Live Tech Access Desk",
        linkStatus: "configured",
      }),
    ]);
    await expect(repo.listUpcomingEvents()).resolves.toEqual([
      expect.objectContaining({
        id: "commerce-basics",
        label: "Commerce Basics Workshop",
        registrationStatus: "configured",
        registrationUrl: "https://academy.example.test/events/commerce-basics",
      }),
    ]);
  });

  it("falls back to local not-configured records when Supabase fails", async () => {
    const repo = createSupabaseRoriDirectoryRepo(
      {
        ...BASE_ENV,
        supabaseServiceRoleKey: "service-role",
        supabaseUrl: "https://supabase.test",
      },
      {
        fetchImpl: vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          text: async () => "database unavailable",
        }),
      },
    );

    await expect(repo.listUpcomingEvents()).resolves.toEqual([]);
    await expect(repo.listTelegramRooms()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Lobby DM to staff",
          linkStatus: "not_configured",
        }),
      ]),
    );
  });

  it("uses local room purposes when the operations table has no visible rooms", async () => {
    const repo = createSupabaseRoriDirectoryRepo(
      {
        ...BASE_ENV,
        supabaseServiceRoleKey: "service-role",
        supabaseUrl: "https://supabase.test",
      },
      {
        fetchImpl: vi.fn().mockResolvedValue({
          ok: true,
          json: async () => [],
        }),
      },
    );

    await expect(repo.listTelegramRooms()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Rori DM",
          linkStatus: "not_configured",
        }),
      ]),
    );
  });

  it("preserves closed registration status from operations rows", async () => {
    const repo = createSupabaseRoriDirectoryRepo(
      {
        ...BASE_ENV,
        supabaseServiceRoleKey: "service-role",
        supabaseUrl: "https://supabase.test",
      },
      {
        fetchImpl: vi.fn().mockResolvedValue({
          ok: true,
          json: async () => [
            {
              event_key: "closed-workshop",
              title: "Closed Workshop",
              summary: "Registration is no longer open.",
              timing: "June 30, 2026",
              keywords: ["workshop"],
              registration_status: "closed",
              registration_url: null,
            },
          ],
        }),
      },
    );

    await expect(repo.listUpcomingEvents()).resolves.toEqual([
      expect.objectContaining({
        label: "Closed Workshop",
        registrationStatus: "closed",
        registrationUrl: undefined,
      }),
    ]);
  });
});
