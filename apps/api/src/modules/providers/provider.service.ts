import type { SupportedProvider } from "./provider.validators";
import {
  validateProviderConnectInput,
  validateProviderKey,
} from "./provider.validators";

export async function connectProvider(
  input: {
    provider: string;
    apiKey: string;
  },
  deps: {
    issueSessionToken: (input: {
      expiresAt: string;
      sessionId: string;
      userId: string;
    }) => string;
    providerValidationMode: "live" | "stub";
    startSession: (input: {
      userId: string;
      provider: SupportedProvider;
      apiKey: string;
      authMethod?: "api_key" | "oauth";
      metadata?: Record<string, unknown>;
    }) => Promise<{
      id: string;
      userId: string;
      provider: SupportedProvider;
      startedAt: string;
      expiresAt: string;
      durationSeconds: number;
      remainingSeconds: number;
      state: "active" | "expired" | "reauth_required";
    }>;
    userId: string;
  },
) {
  const validated = validateProviderConnectInput(input);
  await validateProviderKey({
    provider: validated.provider,
    apiKey: validated.apiKey,
    mode: deps.providerValidationMode,
  });

  const session = await deps.startSession({
    userId: deps.userId,
    provider: validated.provider,
    apiKey: validated.apiKey,
  });

  return {
    provider: validated.provider,
    session,
    sessionToken: deps.issueSessionToken({
      expiresAt: session.expiresAt,
      sessionId: session.id,
      userId: session.userId,
    }),
    status: "connected" as const,
  };
}
