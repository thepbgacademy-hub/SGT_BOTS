import type { SupportedProvider } from "../providers/provider.validators";

export type SessionSecret = {
  sessionId: string;
  userId: string;
  provider: SupportedProvider;
  apiKey: string;
};

export type SessionSecretStore = {
  put(secret: SessionSecret): SessionSecret;
  get(sessionId: string): SessionSecret | undefined;
  delete(sessionId: string): void;
};

export function createInMemorySessionSecretStore(): SessionSecretStore {
  const sessions = new Map<string, SessionSecret>();
  const sessionIdsByUserId = new Map<string, string>();

  return {
    put(secret) {
      const existingSessionId = sessionIdsByUserId.get(secret.userId);

      if (existingSessionId) {
        sessions.delete(existingSessionId);
      }

      sessions.set(secret.sessionId, secret);
      sessionIdsByUserId.set(secret.userId, secret.sessionId);
      return secret;
    },
    get(sessionId) {
      return sessions.get(sessionId);
    },
    delete(sessionId) {
      const secret = sessions.get(sessionId);

      if (!secret) {
        return;
      }

      sessions.delete(sessionId);

      if (sessionIdsByUserId.get(secret.userId) === sessionId) {
        sessionIdsByUserId.delete(secret.userId);
      }
    },
  };
}
