import type { SupportedProvider } from "../providers/provider.validators";
import type { SessionMetadataRepo } from "./session.repo";
import {
  createInMemorySessionSecretStore,
  type SessionSecretStore,
} from "./session.store";

export const SESSION_DURATION_SECONDS = 3 * 60 * 60;

export type SessionSnapshot = {
  id: string;
  userId: string;
  provider: SupportedProvider;
  startedAt: string;
  expiresAt: string;
  durationSeconds: number;
  remainingSeconds: number;
  state: "active" | "expired" | "reauth_required";
};

function toSessionSnapshot(
  input: {
    endsAt: string;
    provider: SupportedProvider;
    sessionId: string;
    startedAt: string;
    status: "active" | "retired";
    userId: string;
  },
  hasSecret: boolean,
  now: number,
): SessionSnapshot {
  const expiresAtMs = new Date(input.endsAt).getTime();
  const remainingSeconds = Math.max(
    0,
    Math.ceil((expiresAtMs - now) / 1000),
  );
  const state =
    input.status !== "active"
      ? "expired"
      : now >= expiresAtMs
        ? "expired"
        : hasSecret
          ? "active"
          : "reauth_required";

  return {
    durationSeconds: SESSION_DURATION_SECONDS,
    expiresAt: input.endsAt,
    id: input.sessionId,
    provider: input.provider,
    remainingSeconds,
    startedAt: input.startedAt,
    state,
    userId: input.userId,
  };
}

export function createSessionService(deps: {
  metadataRepo: SessionMetadataRepo;
  secretStore?: SessionSecretStore;
  now?: () => number;
}) {
  const now = deps.now ?? (() => Date.now());
  const secretStore = deps.secretStore ?? createInMemorySessionSecretStore();

  async function getStoredSession(sessionId: string) {
    const details = await deps.metadataRepo.getSessionDetailsById(sessionId);

    if (!details) {
      throw new Error("session not found");
    }

    return details;
  }

  return {
    async startSession(input: {
      userId: string;
      provider: SupportedProvider;
      apiKey: string;
    }) {
      const startedAtMs = now();
      const startedAt = new Date(startedAtMs).toISOString();
      const expiresAt = new Date(
        startedAtMs + SESSION_DURATION_SECONDS * 1000,
      ).toISOString();

      await deps.metadataRepo.retireActiveSessionsForUser({
        retiredAt: startedAt,
        userId: input.userId,
      });

      const providerConnection = await deps.metadataRepo.insertProviderConnection({
        auth_method: "api_key",
        connected_at: startedAt,
        expires_at: expiresAt,
        last_validated_at: startedAt,
        metadata: {},
        provider_name: input.provider,
        user_id: input.userId,
        validation_status: "validated",
      });
      const session = await deps.metadataRepo.insertPlaygroundSession({
        ends_at: expiresAt,
        provider_connection_id: providerConnection.id,
        review_prompted: false,
        started_at: startedAt,
        status: "active",
        user_id: input.userId,
      });

      secretStore.put({
        apiKey: input.apiKey,
        provider: input.provider,
        sessionId: session.id,
        userId: input.userId,
      });

      return toSessionSnapshot(
        {
          endsAt: session.ends_at,
          provider: input.provider,
          sessionId: session.id,
          startedAt: session.started_at,
          status: session.status,
          userId: session.user_id,
        },
        true,
        startedAtMs,
      );
    },
    async getSessionForUser(input: { sessionId: string; userId: string }) {
      const details = await getStoredSession(input.sessionId);

      if (details.session.user_id !== input.userId) {
        throw new Error("session not found");
      }

      if (details.session.status !== "active") {
        throw new Error("session invalidated");
      }

      const secret = secretStore.get(details.session.id);

      return toSessionSnapshot(
        {
          endsAt: details.session.ends_at,
          provider: details.providerConnection.provider_name,
          sessionId: details.session.id,
          startedAt: details.session.started_at,
          status: details.session.status,
          userId: details.session.user_id,
        },
        Boolean(secret),
        now(),
      );
    },
    async authorizeRequest(input: {
      sessionId: string;
      userId: string;
      requestStartedAt?: string;
    }): Promise<{
      status: "allowed";
    }> {
      const details = await getStoredSession(input.sessionId);

      if (details.session.user_id !== input.userId) {
        throw new Error("session not found");
      }

      if (details.session.status !== "active") {
        throw new Error("session invalidated");
      }

      const secret = secretStore.get(details.session.id);

      if (!secret) {
        throw new Error("session secret unavailable");
      }

      const expiresAtMs = new Date(details.session.ends_at).getTime();
      const requestStartedAtMs = input.requestStartedAt
        ? new Date(input.requestStartedAt).getTime()
        : now();

      if (
        Number.isNaN(requestStartedAtMs) ||
        requestStartedAtMs >= expiresAtMs
      ) {
        throw new Error("session expired");
      }

      return {
        status: "allowed",
      };
    },
  };
}

export { createInMemorySessionSecretStore } from "./session.store";
