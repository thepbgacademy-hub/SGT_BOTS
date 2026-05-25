import { describe, expect, it, vi } from "vitest";
import type { AppEnv } from "../../src/config/env";
import {
  createRoriWikiRepo,
  createSupabaseRoriWikiRepo,
} from "../../src/modules/chat/rori-wiki.repo";

const BASE_ENV: AppEnv = {
  appPort: 3001,
  profileRepoMode: "memory",
  providerValidationMode: "stub",
  telegramBotAppShortName: "app",
  telegramBotRuntimeMode: "off",
  telegramBotToken: "test-token",
  telegramBotUsername: "sgt_playground_bot",
  telegramReviewGroupUrl: "https://t.me/+review",
};

describe("Rori wiki repo", () => {
  it("falls back to local Academy wiki pages when Supabase env is absent", async () => {
    const repo = createRoriWikiRepo(BASE_ENV);

    await expect(repo.searchPages("How do I enroll?")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: "enrollment",
          title: "Academy Enrollment",
          status: "published",
        }),
      ]),
    );
  });

  it("loads published Rori wiki pages from Supabase REST rows", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          page_key: "enrollment",
          title: "Live Enrollment Wiki",
          summary: "Enrollment steps maintained by Academy ops.",
          body: "Start with the live enrollment path and ask support when access is unclear.",
          keywords: ["enrollment", "join", "academy"],
          source_url: "sgt-bots://wiki/rori/enrollment",
          updated_at: "2026-05-25T00:00:00.000Z",
        },
      ],
    });
    const repo = createSupabaseRoriWikiRepo(
      {
        ...BASE_ENV,
        supabaseServiceRoleKey: "service-role",
        supabaseUrl: "https://supabase.test",
      },
      { fetchImpl },
    );

    await expect(repo.searchPages("enrollment")).resolves.toEqual([
      expect.objectContaining({
        body: "Start with the live enrollment path and ask support when access is unclear.",
        slug: "enrollment",
        sourceUrl: "sgt-bots://wiki/rori/enrollment",
        title: "Live Enrollment Wiki",
      }),
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining(
        "/rest/v1/rori_academy_wiki_pages?select=page_key,title,summary,body,keywords,status,source_url,updated_at&visible=is.true&status=eq.published",
      ),
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("uses local wiki pages when Supabase has no matching published pages", async () => {
    const repo = createSupabaseRoriWikiRepo(
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

    await expect(repo.searchPages("How do I enroll?")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: "enrollment",
          title: "Academy Enrollment",
        }),
      ]),
    );
  });

  it("falls back to local wiki pages when Supabase fails", async () => {
    const repo = createSupabaseRoriWikiRepo(
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

    await expect(repo.searchPages("telegram troubleshooting")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: "telegram-troubleshooting",
          title: "Telegram Troubleshooting",
        }),
      ]),
    );
  });
});
