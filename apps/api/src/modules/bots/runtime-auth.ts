import type { FastifyInstance, FastifyRequest } from "fastify";
import { readBearerToken } from "../sessions/session.token";

function readAuthorizationHeader(request: FastifyRequest) {
  return typeof request.headers.authorization === "string"
    ? request.headers.authorization
    : undefined;
}

export async function authorizeBotRuntimeRequest(input: {
  app: FastifyInstance;
  request: FastifyRequest;
  sessionId: string;
}) {
  const token = readBearerToken(readAuthorizationHeader(input.request));
  const claims = input.app.sessionTokenService.verifyToken(token);

  if (claims.sessionId !== input.sessionId) {
    throw new Error("invalid session token");
  }

  await input.app.sessionService.authorizeRequest({
    sessionId: input.sessionId,
    userId: claims.userId,
  });

  return claims;
}
