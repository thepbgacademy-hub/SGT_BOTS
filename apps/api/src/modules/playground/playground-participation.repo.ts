import crypto from "node:crypto";
import type { AppEnv } from "../../config/env";
import type { SupportedProvider } from "../providers/provider.validators";

export type PlaygroundParticipationRow = {
  id: string;
  user_id: string;
  telegram_user_id: string;
  telegram_username: string | null;
  first_name: string;
  preferred_name: string;
  first_provider_name: SupportedProvider;
  first_session_id: string;
  participated_at: string;
};

export type PlaygroundParticipationRepo = {
  getByUserId(userId: string): Promise<PlaygroundParticipationRow | null>;
  insertParticipation(
    input: Omit<PlaygroundParticipationRow, "id">,
  ): Promise<PlaygroundParticipationRow>;
};

export type InMemoryPlaygroundParticipationRepo = PlaygroundParticipationRepo & {
  snapshot: () => {
    playground_participations: PlaygroundParticipationRow[];
  };
};

function buildId(seed: string) {
  return crypto.createHash("sha1").update(seed).digest("hex").slice(0, 12);
}

export function createInMemoryPlaygroundParticipationRepo(): InMemoryPlaygroundParticipationRepo {
  const participations: PlaygroundParticipationRow[] = [];

  return {
    async getByUserId(userId) {
      return participations.find((row) => row.user_id === userId) ?? null;
    },
    async insertParticipation(input) {
      const existing = participations.find((row) => row.user_id === input.user_id);

      if (existing) {
        throw new Error("playground participation already recorded");
      }

      const row: PlaygroundParticipationRow = {
        ...input,
        id: buildId(`playground-participation:${input.user_id}`),
      };
      participations.push(row);
      return row;
    },
    snapshot() {
      return {
        playground_participations: participations,
      };
    },
  };
}

function requireSupabaseEnv(env: AppEnv) {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error("Supabase env is required for playground participation");
  }

  return {
    supabaseServiceRoleKey: env.supabaseServiceRoleKey,
    supabaseUrl: env.supabaseUrl,
  };
}

async function insertRow<TInput, TRow>(input: {
  env: AppEnv;
  payload: TInput;
  table: string;
}) {
  const env = requireSupabaseEnv(input.env);
  const response = await fetch(`${env.supabaseUrl}/rest/v1/${input.table}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: env.supabaseServiceRoleKey,
      authorization: `Bearer ${env.supabaseServiceRoleKey}`,
      prefer: "return=representation",
    },
    body: JSON.stringify(input.payload),
  });

  if (!response.ok) {
    throw new Error(
      `Supabase insert failed for ${input.table}: ${response.status} ${await response.text()}`,
    );
  }

  return ((await response.json()) as TRow[])[0];
}

async function selectRows<TRow>(input: {
  env: AppEnv;
  query: string;
  table: string;
}) {
  const env = requireSupabaseEnv(input.env);
  const response = await fetch(`${env.supabaseUrl}/rest/v1/${input.table}${input.query}`, {
    method: "GET",
    headers: {
      apikey: env.supabaseServiceRoleKey,
      authorization: `Bearer ${env.supabaseServiceRoleKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Supabase select failed for ${input.table}: ${response.status} ${await response.text()}`,
    );
  }

  return (await response.json()) as TRow[];
}

export function createSupabasePlaygroundParticipationRepo(
  env: AppEnv,
): PlaygroundParticipationRepo {
  return {
    async getByUserId(userId) {
      const rows = await selectRows<PlaygroundParticipationRow>({
        env,
        query: `?user_id=eq.${encodeURIComponent(userId)}&select=*`,
        table: "playground_participations",
      });

      return rows[0] ?? null;
    },
    async insertParticipation(input) {
      return insertRow<Omit<PlaygroundParticipationRow, "id">, PlaygroundParticipationRow>({
        env,
        payload: input,
        table: "playground_participations",
      });
    },
  };
}
