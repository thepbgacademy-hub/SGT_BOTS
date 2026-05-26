import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { resolveAuthenticatedUser } from "../telegram/telegram-auth";
import {
  exchangeCodexDeviceCode,
  requestCodexDeviceCode,
  serializeCodexCredential,
} from "./codex-oauth.service";
import { connectProvider } from "./provider.service";

type CodexOAuthSession = {
  deviceAuthId: string;
  error?: string;
  expiresAt: number;
  session?: {
    id: string;
    userId: string;
    provider: "openai" | "anthropic" | "openai_codex";
    startedAt: string;
    expiresAt: string;
    durationSeconds: number;
    remainingSeconds: number;
    state: "active" | "expired" | "reauth_required";
  };
  sessionToken?: string;
  status: "pending" | "connected" | "expired" | "failed";
  userCode: string;
  userId: string;
};

const codexOAuthSessions = new Map<string, CodexOAuthSession>();

export async function registerProviderRoutes(app: FastifyInstance) {
  app.post("/api/providers/connect", async (request, reply) => {
    try {
      const user = await resolveAuthenticatedUser({
        initData: String(request.headers["x-telegram-init-data"] ?? ""),
        botToken: app.appEnv.telegramBotToken,
        botTokens: app.appEnv.telegramBotTokens,
        profileRepo: app.profileRepo,
      });

      const result = await connectProvider(
        request.body as {
          provider: string;
          apiKey: string;
        },
        {
          issueSessionToken: (input) =>
            app.sessionTokenService.issueToken(input),
          userId: user.id,
          providerValidationMode: app.appEnv.providerValidationMode,
          startSession: (input) => app.sessionService.startSession(input),
        },
      );

      app.analyticsService.track({
        eventName: "provider_connected",
        entityId: result.session.id,
        entityType: "session",
        metadata: {
          provider: result.provider,
          userId: user.id,
        },
      });

      return result;
    } catch (error) {
      const message = (error as Error).message;
      const statusCode =
        message === "missing telegram init data" ||
        message === "invalid telegram init data" ||
        message === "stale telegram init data" ||
        message === "profile not found"
          ? 401
          : message === "unsupported provider" ||
              message.startsWith("invalid api key for")
            ? 400
            : message.startsWith("provider validation failed for")
              ? 502
              : 500;

      return reply.code(statusCode).send({
        message,
      });
    }
  });

  app.post("/api/providers/openai-codex/oauth/start", async (request, reply) => {
    try {
      const user = await resolveAuthenticatedUser({
        initData: String(request.headers["x-telegram-init-data"] ?? ""),
        botToken: app.appEnv.telegramBotToken,
        botTokens: app.appEnv.telegramBotTokens,
        profileRepo: app.profileRepo,
      });
      cleanupCodexOAuthSessions(Date.now());
      const device = await requestCodexDeviceCode();
      const oauthSessionId = crypto.randomUUID();
      const expiresAt = Date.now() + device.expiresIn * 1000;

      codexOAuthSessions.set(oauthSessionId, {
        deviceAuthId: device.deviceAuthId,
        expiresAt,
        status: "pending",
        userCode: device.userCode,
        userId: user.id,
      });
      void pollCodexOAuthSession({
        app,
        oauthSessionId,
        pollIntervalSeconds: device.pollIntervalSeconds,
      });

      return reply.code(202).send({
        expiresAt: new Date(expiresAt).toISOString(),
        oauthSessionId,
        pollIntervalSeconds: device.pollIntervalSeconds,
        provider: "openai_codex",
        status: "pending",
        userCode: device.userCode,
        verificationUrl: device.verificationUrl,
      });
    } catch (error) {
      const message = (error as Error).message;
      const statusCode =
        message === "missing telegram init data" ||
        message === "invalid telegram init data" ||
        message === "stale telegram init data" ||
        message === "profile not found"
          ? 401
          : message.startsWith("Unable to start OpenAI Codex")
            ? 502
            : 500;

      return reply.code(statusCode).send({ message });
    }
  });

  app.get(
    "/api/providers/openai-codex/oauth/:oauthSessionId/status",
    async (request, reply) => {
      try {
        const user = await resolveAuthenticatedUser({
          initData: String(request.headers["x-telegram-init-data"] ?? ""),
          botToken: app.appEnv.telegramBotToken,
          botTokens: app.appEnv.telegramBotTokens,
          profileRepo: app.profileRepo,
        });
        const oauthSession = codexOAuthSessions.get(
          String(
            (request.params as { oauthSessionId?: string }).oauthSessionId ?? "",
          ),
        );

        if (!oauthSession || oauthSession.userId !== user.id) {
          return reply.code(404).send({
            message: "OpenAI Codex login session not found.",
          });
        }

        if (
          oauthSession.status === "pending" &&
          Date.now() >= oauthSession.expiresAt
        ) {
          oauthSession.status = "expired";
        }

        return reply.code(200).send({
          message: oauthSession.error,
          provider: "openai_codex",
          session: oauthSession.session,
          sessionToken: oauthSession.sessionToken,
          status: oauthSession.status,
        });
      } catch (error) {
        const message = (error as Error).message;
        const statusCode =
          message === "missing telegram init data" ||
          message === "invalid telegram init data" ||
          message === "stale telegram init data" ||
          message === "profile not found"
            ? 401
            : 500;

        return reply.code(statusCode).send({ message });
      }
    },
  );
}

async function pollCodexOAuthSession(input: {
  app: FastifyInstance;
  oauthSessionId: string;
  pollIntervalSeconds: number;
}) {
  const oauthSession = codexOAuthSessions.get(input.oauthSessionId);

  if (!oauthSession) {
    return;
  }

  try {
    while (
      oauthSession.status === "pending" &&
      Date.now() < oauthSession.expiresAt
    ) {
      await sleep(input.pollIntervalSeconds * 1000);
      const result = await exchangeCodexDeviceCode({
        deviceAuthId: oauthSession.deviceAuthId,
        userCode: oauthSession.userCode,
      });

      if (result.pending) {
        continue;
      }

      const session = await input.app.sessionService.startSession({
        apiKey: serializeCodexCredential(result.credential),
        authMethod: "oauth",
        metadata: {
          source: "openai_codex_device_login",
        },
        provider: "openai_codex",
        userId: oauthSession.userId,
      });

      oauthSession.session = session;
      oauthSession.sessionToken = input.app.sessionTokenService.issueToken({
        expiresAt: session.expiresAt,
        sessionId: session.id,
        userId: session.userId,
      });
      oauthSession.status = "connected";
      input.app.analyticsService.track({
        eventName: "provider_connected",
        entityId: session.id,
        entityType: "session",
        metadata: {
          provider: "openai_codex",
          userId: oauthSession.userId,
        },
      });
      return;
    }

    if (oauthSession.status === "pending") {
      oauthSession.status = "expired";
    }
  } catch (error) {
    oauthSession.error =
      error instanceof Error ? error.message : "OpenAI Codex login failed.";
    oauthSession.status = "failed";
  }
}

function cleanupCodexOAuthSessions(nowMs: number) {
  for (const [sessionId, session] of codexOAuthSessions) {
    if (nowMs >= session.expiresAt + 5 * 60 * 1000) {
      codexOAuthSessions.delete(sessionId);
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
