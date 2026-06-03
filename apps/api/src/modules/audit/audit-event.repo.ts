import crypto from "node:crypto";
import type { AppEnv } from "../../config/env";

export type AuditEventRow = {
  actor: string;
  created_at: string;
  entity_id: string;
  entity_type: string;
  event_type: string;
  id: string;
  metadata: Record<string, unknown>;
};

export type InsertAuditEventInput = Omit<AuditEventRow, "id">;

export type AuditEventRepo = {
  insertEvent(input: InsertAuditEventInput): Promise<AuditEventRow>;
};

export type InMemoryAuditEventRepo = AuditEventRepo & {
  snapshot: () => {
    playground_audit_events: AuditEventRow[];
  };
};

function buildId(seed: string) {
  return crypto.createHash("sha1").update(seed).digest("hex").slice(0, 12);
}

export function createInMemoryAuditEventRepo(): InMemoryAuditEventRepo {
  const events: AuditEventRow[] = [];

  return {
    async insertEvent(input) {
      const row: AuditEventRow = {
        ...input,
        id: buildId(`${input.entity_type}:${input.entity_id}:${events.length}`),
      };
      events.push(row);
      return row;
    },
    snapshot() {
      return {
        playground_audit_events: events,
      };
    },
  };
}

function requireSupabaseEnv(env: AppEnv) {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error("Supabase env is required for audit events");
  }

  return {
    supabaseServiceRoleKey: env.supabaseServiceRoleKey,
    supabaseUrl: env.supabaseUrl,
  };
}

export function createSupabaseAuditEventRepo(env: AppEnv): AuditEventRepo {
  return {
    async insertEvent(input) {
      const supabaseEnv = requireSupabaseEnv(env);
      const response = await fetch(
        `${supabaseEnv.supabaseUrl}/rest/v1/playground_audit_events`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            apikey: supabaseEnv.supabaseServiceRoleKey,
            authorization: `Bearer ${supabaseEnv.supabaseServiceRoleKey}`,
            prefer: "return=representation",
          },
          body: JSON.stringify(input),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Supabase insert failed for playground_audit_events: ${response.status} ${await response.text()}`,
        );
      }

      return ((await response.json()) as AuditEventRow[])[0];
    },
  };
}

