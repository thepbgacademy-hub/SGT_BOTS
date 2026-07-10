import type { AppEnv } from "../../config/env";
import {
  FALLBACK_RORI_WIKI_PAGES,
  findRoriWikiPages,
  findRoriWikiSearchResult,
  type RoriWikiPage,
  type RoriWikiPageStatus,
  type RoriWikiSearchResult,
} from "./rori-wiki";

export type RoriWikiRepo = {
  searchPages(query: string): Promise<RoriWikiPage[]>;
  searchPagesResult?(query: string): Promise<RoriWikiSearchResult>;
};

const RORI_SCHEMA = "rori";

type FetchLike = typeof fetch;

type SupabaseRoriWikiRow = {
  page_key: string;
  title: string;
  summary: string;
  body: string;
  keywords: string[] | null;
  status?: RoriWikiPageStatus;
  source_url: string | null;
  updated_at: string | null;
};

export function createFallbackRoriWikiRepo(
  pages: RoriWikiPage[] = FALLBACK_RORI_WIKI_PAGES,
): RoriWikiRepo {
  return {
    async searchPagesResult(query: string) {
      return findRoriWikiSearchResult(query, pages);
    },
    async searchPages(query: string) {
      return findRoriWikiPages(query, pages);
    },
  };
}

function hasSupabaseEnv(env: AppEnv) {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}

async function selectWikiRows(input: {
  env: AppEnv;
  fetchImpl: FetchLike;
}) {
  if (!input.env.supabaseUrl || !input.env.supabaseServiceRoleKey) {
    throw new Error("Supabase env is required for the Rori wiki repo");
  }

  const response = await input.fetchImpl(
    `${input.env.supabaseUrl}/rest/v1/rori_academy_wiki_pages?select=page_key,title,summary,body,keywords,status,source_url,updated_at&visible=is.true&status=eq.published&order=sort_order.asc,title.asc`,
    {
      method: "GET",
      headers: {
        "accept-profile": RORI_SCHEMA,
        apikey: input.env.supabaseServiceRoleKey,
        authorization: `Bearer ${input.env.supabaseServiceRoleKey}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Supabase select failed for rori_academy_wiki_pages: ${response.status} ${await response.text()}`,
    );
  }

  return (await response.json()) as SupabaseRoriWikiRow[];
}

function mapWikiRow(row: SupabaseRoriWikiRow): RoriWikiPage {
  return {
    slug: row.page_key,
    title: row.title,
    summary: row.summary,
    body: row.body,
    keywords: row.keywords ?? [],
    status: row.status ?? "published",
    sourceUrl: row.source_url ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function createSupabaseRoriWikiRepo(
  env: AppEnv,
  options?: {
    fallbackRepo?: RoriWikiRepo;
    fetchImpl?: FetchLike;
  },
): RoriWikiRepo {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const fallbackRepo = options?.fallbackRepo ?? createFallbackRoriWikiRepo();
  const searchPagesResult = async (
    query: string,
  ): Promise<RoriWikiSearchResult> => {
    try {
      const rows = await selectWikiRows({ env, fetchImpl });
      const pages = rows.map(mapWikiRow);
      const result = findRoriWikiSearchResult(query, pages);

      return result;
    } catch (error) {
      const fallbackResult = fallbackRepo.searchPagesResult
        ? await fallbackRepo.searchPagesResult(query)
        : findRoriWikiSearchResult(query, await fallbackRepo.searchPages(query));

      return {
        ...fallbackResult,
        outcome: "error",
        errorMessage:
          error instanceof Error ? error.message : "Rori wiki retrieval failed",
      };
    }
  };

  return {
    searchPagesResult,
    async searchPages(query: string) {
      return (await searchPagesResult(query)).pages;
    },
  };
}

export function createRoriWikiRepo(
  env: AppEnv,
  options?: {
    fetchImpl?: FetchLike;
  },
): RoriWikiRepo {
  if (!hasSupabaseEnv(env)) {
    return createFallbackRoriWikiRepo();
  }

  return createSupabaseRoriWikiRepo(env, options);
}
