import type { RoriConversationContext } from "./rori-kb";
import type { RoriWikiSearchResult } from "./rori-wiki";

export type RoriResponseIntent =
  | "answer"
  | "clarify"
  | "boundary"
  | "escalate"
  | "route";

export type RoriResponseDecision = {
  boundaryType?: "jailbreak_attempt" | "off_topic";
  intent: RoriResponseIntent;
  needsClarification?: boolean;
  reason:
    | "approved_match"
    | "jailbreak_attempt"
    | "missing_follow_up_context"
    | "operational_escalation"
    | "out_of_scope"
    | "partial_approved_match"
    | "room_route"
    | "tool_route"
    | "vague_in_scope";
};

export type RoriDecisionInput = {
  content: string;
  conversationContext?: RoriConversationContext;
  normalizedContent: string;
  wikiSearchResult: RoriWikiSearchResult;
};

const JAILBREAK_PATTERN =
  /\b(ignore (all|any|your|previous) instructions|disregard (all|any|your|previous) instructions|reveal (your|the) (prompt|system prompt|instructions)|show (me )?(your|the) (prompt|system prompt|instructions)|what are your hidden instructions|developer message|system message|jailbreak|bypass (your|the) instructions|step outside (your|the) role|pretend (you are|to be) (not rori|a different bot|an unrestricted)|dan mode|do anything now)\b/i;

const SUPPORT_ESCALATION_PATTERN =
  /\b(payment problems?|payment trouble|billing issues?|billing problems?|payment issues?|upgrade|downgrade|leave of absence|conflict|cancel|cancellation|refund|discount)\b/i;

const TOOL_ROUTE_PATTERN =
  /\b(credit reports?|credit-report|consumer reports?|consumer reporting agenc(?:y|ies)|reinvestigation|bureau|dispute|tradeline|fcra|fair credit reporting act|fact[- ]?check|check (?:this )?(?:claim|myth|statement|post|message)|verify (?:this )?(?:claim|myth|statement|post|message)|source-backed verification|is this true or false|whether this is true|true\/false|true-false|online claim|myth|tax|legal|statute|usc|cfr|irs|treasury|form|intake|questionnaire|collect document answers)\b/i;

const BROAD_HELP_PATTERN =
  /^(can you help|help|i need help|i am lost|i'm lost|where do i start|what can you do)\??$/i;

const CONTEXT_FREE_FOLLOW_UP_PATTERN =
  /^(tell me more|more|what about it|explain more|go on)\.?$/i;
const THIN_APPROVED_FOLLOW_UP_PATTERN = /^what about\s+.+[?.!]?$/i;

function hasAnyApprovedMatch(wikiSearchResult: RoriWikiSearchResult) {
  return (
    wikiSearchResult.outcome === "exact" ||
    wikiSearchResult.outcome === "partial"
  ) && wikiSearchResult.pages.length > 0;
}

function hasRoomRouteIntent(normalizedContent: string) {
  return (
    /\btelegram\b/i.test(normalizedContent) &&
    /\b(rooms?|channels?|group chat|chat room)\b/i.test(normalizedContent) &&
    (/\b(which|what|list|all|where|invite|invitation|link|links)\b/i.test(
      normalizedContent,
    ) ||
      /\b(access|trouble|technical|cannot find|can't find)\b/i.test(
        normalizedContent,
      ) ||
      /\brooms? should\b/i.test(normalizedContent) ||
      /\brooms? (?:is|are)?\s*for\b/i.test(normalizedContent))
  );
}

export function decideRoriResponse(
  input: RoriDecisionInput,
): RoriResponseDecision {
  const normalizedContent = input.normalizedContent.trim();

  if (JAILBREAK_PATTERN.test(normalizedContent)) {
    return {
      boundaryType: "jailbreak_attempt",
      intent: "boundary",
      reason: "jailbreak_attempt",
    };
  }

  if (SUPPORT_ESCALATION_PATTERN.test(normalizedContent)) {
    return {
      intent: "escalate",
      reason: "operational_escalation",
    };
  }

  if (hasRoomRouteIntent(normalizedContent)) {
    return {
      intent: "route",
      reason: "room_route",
    };
  }

  if (TOOL_ROUTE_PATTERN.test(normalizedContent)) {
    return {
      intent: "route",
      reason: "tool_route",
    };
  }

  if (
    CONTEXT_FREE_FOLLOW_UP_PATTERN.test(normalizedContent) &&
    !input.conversationContext?.lastIntent
  ) {
    return {
      intent: "clarify",
      reason: "missing_follow_up_context",
    };
  }

  if (
    BROAD_HELP_PATTERN.test(normalizedContent) ||
    (input.wikiSearchResult.outcome === "partial" &&
      input.wikiSearchResult.matches.every((match) =>
        match.matchedTerms.every((term) =>
          ["academy", "help", "info", "information", "overview", "support"].includes(term),
        ),
      ))
  ) {
    return {
      intent: "clarify",
      reason: "vague_in_scope",
    };
  }

  if (
    THIN_APPROVED_FOLLOW_UP_PATTERN.test(normalizedContent) &&
    hasAnyApprovedMatch(input.wikiSearchResult)
  ) {
    return {
      intent: "answer",
      needsClarification: true,
      reason: "partial_approved_match",
    };
  }

  if (hasAnyApprovedMatch(input.wikiSearchResult)) {
    return {
      intent: "answer",
      needsClarification: input.wikiSearchResult.outcome === "partial",
      reason:
        input.wikiSearchResult.outcome === "partial"
          ? "partial_approved_match"
          : "approved_match",
    };
  }

  return {
    boundaryType: "off_topic",
    intent: "boundary",
    reason: "out_of_scope",
  };
}
