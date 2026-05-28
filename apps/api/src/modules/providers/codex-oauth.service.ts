const CODEX_ISSUER = "https://auth.openai.com";
const CODEX_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const CODEX_BASE_URL = "https://chatgpt.com/backend-api/codex";
const CODEX_TOKEN_URL = `${CODEX_ISSUER}/oauth/token`;

export type CodexCredential = {
  accessToken: string;
  baseUrl: string;
  refreshToken: string;
};

export type CodexDeviceCode = {
  deviceAuthId: string;
  expiresIn: number;
  pollIntervalSeconds: number;
  userCode: string;
  verificationUrl: string;
};

export function parseCodexCredential(rawCredential: string): CodexCredential {
  try {
    const credential = JSON.parse(rawCredential) as Partial<CodexCredential>;

    if (
      typeof credential.accessToken === "string" &&
      typeof credential.refreshToken === "string"
    ) {
      return {
        accessToken: credential.accessToken,
        baseUrl:
          typeof credential.baseUrl === "string"
            ? credential.baseUrl
            : CODEX_BASE_URL,
        refreshToken: credential.refreshToken,
      };
    }
  } catch {
    // Fall through to the typed error below.
  }

  throw new Error("OpenAI Codex credential is invalid");
}

export function serializeCodexCredential(credential: CodexCredential) {
  return JSON.stringify(credential);
}

export async function requestCodexDeviceCode(input: {
  fetchImpl?: typeof fetch;
} = {}): Promise<CodexDeviceCode> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(
    `${CODEX_ISSUER}/api/accounts/deviceauth/usercode`,
    {
      body: JSON.stringify({ client_id: CODEX_CLIENT_ID }),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error("Unable to start OpenAI Codex device login");
  }

  const body = (await response.json()) as Record<string, unknown>;
  const userCode = typeof body.user_code === "string" ? body.user_code : "";
  const deviceAuthId =
    typeof body.device_auth_id === "string" ? body.device_auth_id : "";

  if (!userCode || !deviceAuthId) {
    throw new Error("OpenAI Codex device login returned an invalid response");
  }

  return {
    deviceAuthId,
    expiresIn: 15 * 60,
    pollIntervalSeconds: Math.max(Number(body.interval) || 5, 1),
    userCode,
    verificationUrl: `${CODEX_ISSUER}/codex/device`,
  };
}

export async function exchangeCodexDeviceCode(input: {
  deviceAuthId: string;
  fetchImpl?: typeof fetch;
  userCode: string;
}): Promise<{ credential: CodexCredential; pending: boolean }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const pollResponse = await fetchImpl(
    `${CODEX_ISSUER}/api/accounts/deviceauth/token`,
    {
      body: JSON.stringify({
        device_auth_id: input.deviceAuthId,
        user_code: input.userCode,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  );

  if (pollResponse.status === 403 || pollResponse.status === 404) {
    return {
      credential: {
        accessToken: "",
        baseUrl: CODEX_BASE_URL,
        refreshToken: "",
      },
      pending: true,
    };
  }

  if (!pollResponse.ok) {
    throw new Error("OpenAI Codex device login polling failed");
  }

  const pollBody = (await pollResponse.json()) as Record<string, unknown>;
  const authorizationCode =
    typeof pollBody.authorization_code === "string"
      ? pollBody.authorization_code
      : "";
  const codeVerifier =
    typeof pollBody.code_verifier === "string" ? pollBody.code_verifier : "";

  if (!authorizationCode || !codeVerifier) {
    return {
      credential: {
        accessToken: "",
        baseUrl: CODEX_BASE_URL,
        refreshToken: "",
      },
      pending: true,
    };
  }

  const tokenResponse = await fetchImpl(CODEX_TOKEN_URL, {
    body: new URLSearchParams({
      client_id: CODEX_CLIENT_ID,
      code: authorizationCode,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: `${CODEX_ISSUER}/deviceauth/callback`,
    }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  });

  if (!tokenResponse.ok) {
    throw new Error("OpenAI Codex token exchange failed");
  }

  const tokenBody = (await tokenResponse.json()) as Record<string, unknown>;
  const accessToken =
    typeof tokenBody.access_token === "string" ? tokenBody.access_token : "";
  const refreshToken =
    typeof tokenBody.refresh_token === "string"
      ? tokenBody.refresh_token
      : "";

  if (!accessToken || !refreshToken) {
    throw new Error("OpenAI Codex token exchange returned invalid tokens");
  }

  return {
    credential: {
      accessToken,
      baseUrl: CODEX_BASE_URL,
      refreshToken,
    },
    pending: false,
  };
}

export async function requestCodexJson(input: {
  apiKey: string;
  failurePrefix?: string;
  fetchImpl: typeof fetch;
  maxOutputTokens?: number;
  onCredentialRefresh?: (credential: CodexCredential) => void;
  systemPrompt: string;
  userPrompt: string;
}) {
  let credential = parseCodexCredential(input.apiKey);

  if (isJwtExpiring(credential.accessToken, 120)) {
    credential = await refreshCodexCredential({
      credential,
      fetchImpl: input.fetchImpl,
    });
    input.onCredentialRefresh?.(credential);
  }

  let response = await sendCodexJsonRequest({ credential, input });

  if (response.status === 401 || response.status === 403) {
    credential = await refreshCodexCredential({
      credential,
      fetchImpl: input.fetchImpl,
    });
    input.onCredentialRefresh?.(credential);
    response = await sendCodexJsonRequest({ credential, input });
  }

  if (!response.ok) {
    const failureBody = await response.text();
    throw new Error(
      `${input.failurePrefix ?? "codex provider failed"}: ${response.status} ${summarizeProviderFailureBody(failureBody)}`,
    );
  }

  return parseJsonText(
    extractCodexText(await response.json()),
    input.failurePrefix,
  );
}

async function sendCodexJsonRequest(input: {
  credential: CodexCredential;
  input: {
    fetchImpl: typeof fetch;
    systemPrompt: string;
    userPrompt: string;
  };
}) {
  const credential = input.credential;
  const baseUrl = credential.baseUrl.replace(/\/$/u, "");
  return input.input.fetchImpl(`${baseUrl}/responses`, {
    body: JSON.stringify({
      include: ["reasoning.encrypted_content"],
      input: [{ content: input.input.userPrompt, role: "user" }],
      instructions: input.input.systemPrompt,
      model: "gpt-5.3-codex",
      reasoning: { effort: "medium", summary: "auto" },
      store: false,
    }),
    headers: {
      authorization: `Bearer ${credential.accessToken}`,
      "content-type": "application/json",
      ...buildCodexHeaders(credential.accessToken),
    },
    method: "POST",
  });
}

function extractCodexText(payload: unknown) {
  const body = payload as Record<string, unknown>;

  if (typeof body.output_text === "string") {
    return body.output_text;
  }

  const output = body.output as
    | Array<{ content?: Array<{ text?: string; type?: string }> }>
    | undefined;

  return (
    output
      ?.flatMap((item) => item.content ?? [])
      .find((part) => part.type === "output_text" || typeof part.text === "string")
      ?.text ?? ""
  );
}

function parseJsonText(text: string, failurePrefix?: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(
      failurePrefix === "top secret provider failed"
        ? "invalid top secret provider response"
        : "invalid provider draft response",
    );
  }
}

function summarizeProviderFailureBody(body: string) {
  return body
    .replaceAll(/\s+/gu, " ")
    .replaceAll(/Bearer\s+[A-Za-z0-9._-]+/gu, "Bearer [redacted]")
    .slice(0, 500)
    .trim();
}

function buildCodexHeaders(accessToken: string) {
  const headers: Record<string, string> = {
    originator: "codex_cli_rs",
    "User-Agent": "codex_cli_rs/0.0.0 (PBG Playground)",
  };
  const accountId = extractCodexAccountId(accessToken);

  if (accountId) {
    headers["ChatGPT-Account-ID"] = accountId;
  }

  return headers;
}

function extractCodexAccountId(accessToken: string) {
  const [, payload] = accessToken.split(".");

  if (!payload) {
    return null;
  }

  try {
    const normalizedPayload = payload
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const parsed = JSON.parse(
      Buffer.from(normalizedPayload, "base64").toString("utf8"),
    ) as { "https://api.openai.com/auth"?: { chatgpt_account_id?: string } };

    return (
      parsed["https://api.openai.com/auth"]?.chatgpt_account_id ?? null
    );
  } catch {
    return null;
  }
}

async function refreshCodexCredential(input: {
  credential: CodexCredential;
  fetchImpl: typeof fetch;
}) {
  const response = await input.fetchImpl(CODEX_TOKEN_URL, {
    body: new URLSearchParams({
      client_id: CODEX_CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: input.credential.refreshToken,
    }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("OpenAI Codex token refresh failed");
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const accessToken =
    typeof payload.access_token === "string" ? payload.access_token : "";
  const refreshToken =
    typeof payload.refresh_token === "string"
      ? payload.refresh_token
      : input.credential.refreshToken;

  if (!accessToken) {
    throw new Error("OpenAI Codex token refresh returned invalid tokens");
  }

  return {
    accessToken,
    baseUrl: input.credential.baseUrl,
    refreshToken,
  };
}

function isJwtExpiring(token: string, skewSeconds: number) {
  const [, payload] = token.split(".");

  if (!payload) {
    return false;
  }

  try {
    const normalizedPayload = payload
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const parsed = JSON.parse(
      Buffer.from(normalizedPayload, "base64").toString("utf8"),
    ) as { exp?: unknown };
    const exp = typeof parsed.exp === "number" ? parsed.exp : 0;

    return exp > 0 && exp <= Math.floor(Date.now() / 1000) + skewSeconds;
  } catch {
    return false;
  }
}
