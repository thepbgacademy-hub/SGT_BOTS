import type { AppEnv } from "../../config/env";
import crypto from "node:crypto";

export type UserRow = {
  id: string;
  telegram_user_id: string;
  username: string | null;
  first_name: string;
  last_name: string | null;
  preferred_name: string;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
};

export type TelegramProfileRow = {
  user_id: string;
  language_code: string | null;
  launch_metadata: {
    launch_source: string;
  };
  validated_payload: {
    telegramUserId: string;
    username: string;
  };
  raw_init_data_hash: string;
  created_at: string;
};

export type ProfileRepo = {
  insertUser(input: Omit<UserRow, "id">): Promise<UserRow>;
  insertTelegramProfile(input: TelegramProfileRow): Promise<TelegramProfileRow>;
  snapshot?: () => {
    users: UserRow[];
    telegram_profiles: TelegramProfileRow[];
  };
};

export type InMemoryProfileRepo = ProfileRepo & {
  snapshot: () => {
    users: UserRow[];
    telegram_profiles: TelegramProfileRow[];
  };
};

function buildId(seed: string) {
  return crypto.createHash("sha1").update(seed).digest("hex").slice(0, 12);
}

export function createInMemoryProfileRepo(): InMemoryProfileRepo {
  const users: UserRow[] = [];
  const telegramProfiles: TelegramProfileRow[] = [];

  return {
    async insertUser(input) {
      const row: UserRow = {
        ...input,
        id: buildId(`${input.telegram_user_id}:${users.length}`),
      };
      users.push(row);
      return row;
    },
    async insertTelegramProfile(input) {
      telegramProfiles.push(input);
      return input;
    },
    snapshot() {
      return {
        users,
        telegram_profiles: telegramProfiles,
      };
    },
  };
}

function requireSupabaseEnv(env: AppEnv) {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error("Supabase env is required for the supabase profile repo");
  }

  return {
    supabaseUrl: env.supabaseUrl,
    supabaseServiceRoleKey: env.supabaseServiceRoleKey,
  };
}

async function insertRow<TInput, TRow>(input: {
  env: AppEnv;
  table: string;
  payload: TInput;
  query?: string;
  prefer?: string;
}) {
  const env = requireSupabaseEnv(input.env);
  const response = await fetch(
    `${env.supabaseUrl}/rest/v1/${input.table}${input.query ?? ""}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: env.supabaseServiceRoleKey,
        authorization: `Bearer ${env.supabaseServiceRoleKey}`,
        prefer: input.prefer ?? "return=representation",
      },
      body: JSON.stringify(input.payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Supabase insert failed for ${input.table}: ${response.status} ${await response.text()}`,
    );
  }

  return ((await response.json()) as TRow[])[0];
}
export function createSupabaseProfileRepo(env: AppEnv): ProfileRepo {
  return {
    async insertUser(input) {
      return insertRow<Omit<UserRow, "id">, UserRow>({
        env,
        table: "users",
        query: "?on_conflict=telegram_user_id",
        prefer: "resolution=merge-duplicates,return=representation",
        payload: {
          telegram_user_id: input.telegram_user_id,
          username: input.username,
          first_name: input.first_name,
          last_name: input.last_name,
          preferred_name: input.preferred_name,
          created_at: input.created_at,
          updated_at: input.updated_at,
          last_activity_at: input.last_activity_at,
        },
      });
    },
    async insertTelegramProfile(input) {
      return insertRow<TelegramProfileRow, TelegramProfileRow>({
        env,
        table: "telegram_profiles",
        query: "?on_conflict=user_id",
        prefer: "resolution=merge-duplicates,return=representation",
        payload: {
          user_id: input.user_id,
          launch_metadata: input.launch_metadata,
          validated_payload: input.validated_payload,
          raw_init_data_hash: input.raw_init_data_hash,
          language_code: input.language_code,
          created_at: input.created_at,
        },
      });
    },
  };
}
