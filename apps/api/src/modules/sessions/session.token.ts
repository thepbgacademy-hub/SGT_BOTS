import crypto from "node:crypto";

type SessionTokenClaims = {
  sessionId: string;
  userId: string;
  exp: number;
};

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function createSessionTokenService(deps: {
  secret: string;
  now?: () => number;
}) {
  const now = deps.now ?? (() => Date.now());

  function sign(payload: string) {
    return crypto
      .createHmac("sha256", deps.secret)
      .update(payload)
      .digest("base64url");
  }

  return {
    issueToken(input: {
      sessionId: string;
      userId: string;
      expiresAt: string;
    }) {
      const claims: SessionTokenClaims = {
        sessionId: input.sessionId,
        userId: input.userId,
        exp: new Date(input.expiresAt).getTime(),
      };
      const payload = encode(JSON.stringify(claims));

      return `${payload}.${sign(payload)}`;
    },
    verifyToken(token: string) {
      const [payload, signature] = token.split(".");

      if (!payload || !signature || sign(payload) !== signature) {
        throw new Error("invalid session token");
      }

      const claims = JSON.parse(decode(payload)) as SessionTokenClaims;

      if (!claims.sessionId || !claims.userId || !claims.exp) {
        throw new Error("invalid session token");
      }

      if (now() >= claims.exp) {
        throw new Error("session token expired");
      }

      return claims;
    },
  };
}

export function readBearerToken(headerValue: string | undefined) {
  if (!headerValue) {
    throw new Error("missing session token");
  }

  const [scheme, token] = headerValue.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new Error("invalid session token");
  }

  return token;
}
