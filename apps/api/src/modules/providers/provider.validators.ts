export const SUPPORTED_PROVIDERS = ["openai", "anthropic", "openai_codex"] as const;

export type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

type ProviderConnectInput = {
  provider: string;
  apiKey: string;
};

function isSupportedProvider(provider: string): provider is SupportedProvider {
  return SUPPORTED_PROVIDERS.includes(provider as SupportedProvider);
}

function assertApiKeyFormat(provider: SupportedProvider, apiKey: string) {
  const normalizedKey = apiKey.trim();

  if (!normalizedKey) {
    throw new Error(`invalid api key for ${provider}`);
  }

  return normalizedKey;
}

export function validateProviderConnectInput(
  input: ProviderConnectInput,
): {
  provider: SupportedProvider;
  apiKey: string;
} {
  if (!isSupportedProvider(input.provider)) {
    throw new Error("unsupported provider");
  }

  return {
    provider: input.provider,
    apiKey: assertApiKeyFormat(input.provider, input.apiKey),
  };
}

export async function validateProviderKey(input: {
  provider: SupportedProvider;
  apiKey: string;
  mode: "live" | "stub";
}) {
  if (input.provider === "openai_codex") {
    throw new Error("unsupported provider");
  }

  if (input.mode === "stub") {
    const valid =
      input.provider === "openai"
        ? input.apiKey.startsWith("sk-")
        : input.apiKey.startsWith("sk-ant-") || input.apiKey === "sk-test";

    if (!valid) {
      throw new Error(`invalid api key for ${input.provider}`);
    }

    return {
      provider: input.provider,
      status: "validated" as const,
    };
  }

  const response =
    input.provider === "openai"
      ? await fetch("https://api.openai.com/v1/models", {
          method: "GET",
          headers: {
            authorization: `Bearer ${input.apiKey}`,
          },
        })
      : await fetch("https://api.anthropic.com/v1/models", {
          method: "GET",
          headers: {
            "x-api-key": input.apiKey,
            "anthropic-version": "2023-06-01",
          },
        });

  if (response.ok) {
    return {
      provider: input.provider,
      status: "validated" as const,
    };
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error(`invalid api key for ${input.provider}`);
  }

  throw new Error(`provider validation failed for ${input.provider}`);
}
