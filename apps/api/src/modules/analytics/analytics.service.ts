export type AnalyticsEventName =
  | "profile_created"
  | "provider_connected"
  | "bot_catalog_viewed"
  | "chat_message_sent"
  | "report_queued"
  | "review_prompted";

export type AnalyticsEvent = {
  eventName: AnalyticsEventName;
  entityId: string;
  entityType: "bot" | "profile" | "report" | "session";
  metadata: Record<string, unknown>;
  createdAt: string;
};

export function createAnalyticsService(deps?: {
  now?: () => number;
}) {
  const now = deps?.now ?? (() => Date.now());
  const events: AnalyticsEvent[] = [];

  return {
    track(input: {
      eventName: AnalyticsEventName;
      entityId: string;
      entityType: AnalyticsEvent["entityType"];
      metadata?: Record<string, unknown>;
    }) {
      const event: AnalyticsEvent = {
        eventName: input.eventName,
        entityId: input.entityId,
        entityType: input.entityType,
        metadata: input.metadata ?? {},
        createdAt: new Date(now()).toISOString(),
      };

      events.push(event);
      return event;
    },
    listEvents() {
      return [...events];
    },
  };
}
