import type { SessionMetadataRepo } from "../sessions/session.repo";
import type { createAnalyticsService } from "../analytics/analytics.service";

export type ReviewPromptReason = "early_exit" | "timeout";

export function createReviewService(deps: {
  analyticsService: ReturnType<typeof createAnalyticsService>;
  metadataRepo: SessionMetadataRepo;
  now?: () => number;
  reviewGroupUrl: string;
}) {
  const now = deps.now ?? (() => Date.now());

  return {
    async promptForReview(input: {
      reason: ReviewPromptReason;
      sessionId: string;
      userId: string;
    }) {
      const details = await deps.metadataRepo.getSessionDetailsById(input.sessionId);

      if (!details || details.session.user_id !== input.userId) {
        throw new Error("session not found");
      }

      await deps.metadataRepo.markReviewPrompted({
        sessionId: input.sessionId,
      });

      if (input.reason === "early_exit" && details.session.status === "active") {
        await deps.metadataRepo.retireSessionById({
          retiredAt: new Date(now()).toISOString(),
          sessionId: input.sessionId,
        });
      }

      deps.analyticsService.track({
        eventName: "review_prompted",
        entityId: input.sessionId,
        entityType: "session",
        metadata: {
          reason: input.reason,
        },
      });

      return {
        reason: input.reason,
        reviewUrl: deps.reviewGroupUrl,
        status: "prompted" as const,
      };
    },
  };
}
