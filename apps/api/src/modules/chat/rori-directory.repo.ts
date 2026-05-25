import type { AppEnv } from "../../config/env";
import {
  FALLBACK_RORI_ACADEMY_DIRECTORY,
  type RoriAcademyDirectory,
  type RoriDirectoryLinkStatus,
  type RoriTelegramRoomRecord,
  type RoriWorkshopRecord,
} from "./rori-directory";

export type RoriAcademyDirectoryRepo = {
  listTelegramRooms(): Promise<RoriTelegramRoomRecord[]>;
  listUpcomingEvents(): Promise<RoriWorkshopRecord[]>;
};

type FetchLike = typeof fetch;

type SupabaseRoriEventRow = {
  event_key: string;
  title: string;
  summary: string;
  timing: string;
  keywords: string[] | null;
  registration_status: RoriDirectoryLinkStatus;
  registration_url: string | null;
};

type SupabaseRoriTelegramRoomRow = {
  room_key: string;
  label: string;
  purpose: string;
  keywords: string[] | null;
  link_status: RoriDirectoryLinkStatus;
  invite_url: string | null;
};

export function createFallbackRoriDirectoryRepo(
  directory: RoriAcademyDirectory = FALLBACK_RORI_ACADEMY_DIRECTORY,
): RoriAcademyDirectoryRepo {
  return {
    async listTelegramRooms() {
      return directory.telegramRooms;
    },
    async listUpcomingEvents() {
      return directory.workshops;
    },
  };
}

function hasSupabaseEnv(env: AppEnv) {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}

async function selectRows<T>(input: {
  env: AppEnv;
  fetchImpl: FetchLike;
  query: string;
  table: string;
}) {
  if (!input.env.supabaseUrl || !input.env.supabaseServiceRoleKey) {
    throw new Error("Supabase env is required for the Rori directory repo");
  }

  const response = await input.fetchImpl(
    `${input.env.supabaseUrl}/rest/v1/${input.table}${input.query}`,
    {
      method: "GET",
      headers: {
        apikey: input.env.supabaseServiceRoleKey,
        authorization: `Bearer ${input.env.supabaseServiceRoleKey}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Supabase select failed for ${input.table}: ${response.status} ${await response.text()}`,
    );
  }

  return (await response.json()) as T[];
}

export function createSupabaseRoriDirectoryRepo(
  env: AppEnv,
  options?: {
    fallbackRepo?: RoriAcademyDirectoryRepo;
    fetchImpl?: FetchLike;
  },
): RoriAcademyDirectoryRepo {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const fallbackRepo = options?.fallbackRepo ?? createFallbackRoriDirectoryRepo();

  return {
    async listTelegramRooms() {
      try {
        const rows = await selectRows<SupabaseRoriTelegramRoomRow>({
          env,
          fetchImpl,
          table: "rori_telegram_rooms",
          query:
            "?select=room_key,label,purpose,keywords,link_status,invite_url&visible=is.true&order=sort_order.asc,label.asc",
        });

        if (rows.length === 0) {
          return fallbackRepo.listTelegramRooms();
        }

        return rows.map((row) => ({
          id: row.room_key,
          label: row.label,
          purpose: row.purpose,
          keywords: row.keywords ?? [],
          linkStatus: row.link_status,
          inviteUrl: row.link_status === "configured" ? row.invite_url ?? undefined : undefined,
        }));
      } catch {
        return fallbackRepo.listTelegramRooms();
      }
    },
    async listUpcomingEvents() {
      try {
        const rows = await selectRows<SupabaseRoriEventRow>({
          env,
          fetchImpl,
          table: "rori_academy_events",
          query:
            "?select=event_key,title,summary,timing,keywords,registration_status,registration_url&visible=is.true&status=eq.active&order=sort_order.asc,title.asc",
        });

        return rows.map((row) => ({
          id: row.event_key,
          label: row.title,
          summary: row.summary,
          timing: row.timing,
          keywords: row.keywords ?? [],
          registrationStatus: row.registration_status,
          registrationUrl:
            row.registration_status === "configured"
              ? row.registration_url ?? undefined
              : undefined,
        }));
      } catch {
        return fallbackRepo.listUpcomingEvents();
      }
    },
  };
}

export function createRoriDirectoryRepo(
  env: AppEnv,
  options?: {
    fetchImpl?: FetchLike;
  },
): RoriAcademyDirectoryRepo {
  if (!hasSupabaseEnv(env)) {
    return createFallbackRoriDirectoryRepo();
  }

  return createSupabaseRoriDirectoryRepo(env, options);
}
