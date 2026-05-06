import crypto from "node:crypto";
import type { AppEnv } from "../../config/env";
import type { SupportedProvider } from "../providers/provider.validators";

export type ProviderConnectionRow = {
  id: string;
  user_id: string;
  provider_name: SupportedProvider;
  auth_method: "api_key";
  validation_status: "validated";
  metadata: Record<string, never>;
  connected_at: string;
  expires_at: string | null;
  last_validated_at: string;
};

export type PlaygroundSessionRow = {
  id: string;
  user_id: string;
  provider_connection_id: string;
  started_at: string;
  ends_at: string;
  status: "active" | "retired";
  review_prompted: boolean;
};

export type SessionDetailsRow = {
  providerConnection: ProviderConnectionRow;
  session: PlaygroundSessionRow;
};

export type SessionMetadataRepo = {
  insertProviderConnection(
    input: Omit<ProviderConnectionRow, "id">,
  ): Promise<ProviderConnectionRow>;
  insertPlaygroundSession(
    input: Omit<PlaygroundSessionRow, "id">,
  ): Promise<PlaygroundSessionRow>;
  getSessionDetailsById(sessionId: string): Promise<SessionDetailsRow | null>;
  markReviewPrompted(input: { sessionId: string }): Promise<void>;
  retireSessionById(input: {
    retiredAt: string;
    sessionId: string;
  }): Promise<void>;
  retireActiveSessionsForUser(input: {
    retiredAt: string;
    userId: string;
  }): Promise<void>;
};

export type InMemorySessionMetadataRepo = SessionMetadataRepo & {
  snapshot: () => {
    playground_sessions: PlaygroundSessionRow[];
    provider_connections: ProviderConnectionRow[];
  };
};

function buildId(seed: string) {
  return crypto.createHash("sha1").update(seed).digest("hex").slice(0, 12);
}

export function createInMemorySessionMetadataRepo(): InMemorySessionMetadataRepo {
  const providerConnections: ProviderConnectionRow[] = [];
  const sessions: PlaygroundSessionRow[] = [];

  return {
    async insertProviderConnection(input) {
      const row: ProviderConnectionRow = {
        ...input,
        id: buildId(`provider:${input.user_id}:${providerConnections.length}`),
      };
      providerConnections.push(row);
      return row;
    },
    async insertPlaygroundSession(input) {
      const row: PlaygroundSessionRow = {
        ...input,
        id: buildId(`session:${input.user_id}:${sessions.length}`),
      };
      sessions.push(row);
      return row;
    },
    async getSessionDetailsById(sessionId) {
      const session = sessions.find((row) => row.id === sessionId);

      if (!session) {
        return null;
      }

      const providerConnection = providerConnections.find(
        (row) => row.id === session.provider_connection_id,
      );

      if (!providerConnection) {
        return null;
      }

      return {
        providerConnection,
        session,
      };
    },
    async markReviewPrompted({ sessionId }) {
      const session = sessions.find((row) => row.id === sessionId);

      if (session) {
        session.review_prompted = true;
      }
    },
    async retireSessionById({ retiredAt, sessionId }) {
      const session = sessions.find((row) => row.id === sessionId);

      if (session && session.status === "active") {
        session.status = "retired";
        session.ends_at = retiredAt;
      }
    },
    async retireActiveSessionsForUser({ retiredAt, userId }) {
      for (const session of sessions) {
        if (session.user_id === userId && session.status === "active") {
          session.status = "retired";
          session.ends_at = retiredAt;
        }
      }
    },
    snapshot() {
      return {
        playground_sessions: sessions,
        provider_connections: providerConnections,
      };
    },
  };
}

function requireSupabaseEnv(env: AppEnv) {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error("Supabase env is required for session metadata");
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

async function updateRows<TInput>(input: {
  env: AppEnv;
  payload: TInput;
  query: string;
  table: string;
}) {
  const env = requireSupabaseEnv(input.env);
  const response = await fetch(`${env.supabaseUrl}/rest/v1/${input.table}${input.query}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      apikey: env.supabaseServiceRoleKey,
      authorization: `Bearer ${env.supabaseServiceRoleKey}`,
    },
    body: JSON.stringify(input.payload),
  });

  if (!response.ok) {
    throw new Error(
      `Supabase update failed for ${input.table}: ${response.status} ${await response.text()}`,
    );
  }
}

export function createSupabaseSessionMetadataRepo(env: AppEnv): SessionMetadataRepo {
  return {
    async insertProviderConnection(input) {
      return insertRow<Omit<ProviderConnectionRow, "id">, ProviderConnectionRow>({
        env,
        payload: input,
        table: "provider_connections",
      });
    },
    async insertPlaygroundSession(input) {
      return insertRow<Omit<PlaygroundSessionRow, "id">, PlaygroundSessionRow>({
        env,
        payload: input,
        table: "playground_sessions",
      });
    },
    async getSessionDetailsById(sessionId) {
      const sessions = await selectRows<PlaygroundSessionRow>({
        env,
        query: `?id=eq.${encodeURIComponent(sessionId)}&select=*`,
        table: "playground_sessions",
      });
      const session = sessions[0];

      if (!session) {
        return null;
      }

      const providerConnections = await selectRows<ProviderConnectionRow>({
        env,
        query: `?id=eq.${encodeURIComponent(session.provider_connection_id)}&select=*`,
        table: "provider_connections",
      });
      const providerConnection = providerConnections[0];

      if (!providerConnection) {
        return null;
      }

      return {
        providerConnection,
        session,
      };
    },
    async markReviewPrompted({ sessionId }) {
      await updateRows({
        env,
        payload: {
          review_prompted: true,
        },
        query: `?id=eq.${encodeURIComponent(sessionId)}`,
        table: "playground_sessions",
      });
    },
    async retireSessionById({ retiredAt, sessionId }) {
      await updateRows({
        env,
        payload: {
          ends_at: retiredAt,
          status: "retired",
        },
        query: `?id=eq.${encodeURIComponent(sessionId)}&status=eq.active`,
        table: "playground_sessions",
      });
    },
    async retireActiveSessionsForUser({ retiredAt, userId }) {
      await updateRows({
        env,
        payload: {
          ends_at: retiredAt,
          status: "retired",
        },
        query: `?user_id=eq.${encodeURIComponent(userId)}&status=eq.active`,
        table: "playground_sessions",
      });
    },
  };
}
