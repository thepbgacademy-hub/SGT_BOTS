import type { SessionSecret } from "../sessions/session.store";
import {
  composeCreditBureauDisputeDraftContent,
  type CreditBureauDisputeDraftContent,
  type CursivePromptPackage,
} from "./cursive-prompt.service";

type DraftServiceMode = "live" | "stub";
const CREDIT_BUREAU_DISPUTE_CATEGORY_SLUG = "credit_bureau_dispute";

function requireStringRecord(
  content: unknown,
): Record<string, unknown> | null {
  if (!content || typeof content !== "object") {
    return null;
  }

  return content as Record<string, unknown>;
}

function parseOpenAiJson(content: unknown) {
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("invalid provider draft response");
  }

  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new Error("invalid provider draft response");
  }
}

function requireDraftField(payload: unknown, key: string) {
  const record = requireStringRecord(payload);
  const value = record?.[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`missing provider draft field: ${key}`);
  }

  return value.trim();
}

function ensureSentence(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length === 0) {
    return normalized;
  }

  return /[.?!]$/u.test(normalized) ? normalized : `${normalized}.`;
}

function capitalizeFirstLetter(value: string) {
  if (value.length === 0) {
    return value;
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function normalizeDraftFact(value: string) {
  return value.replaceAll(/[<>]/g, "").trim();
}

function trimRepeatedDisputeLeadIn(value: string) {
  const patterns = [
    /^the disputed reporting is inaccurate because\s+/iu,
    /^this reporting is inaccurate because\s+/iu,
    /^the item is inaccurate because\s+/iu,
    /^the item i dispute is inaccurate because\s+/iu,
    /^i dispute this because\s+/iu,
    /^because\s+/iu,
  ];

  return patterns.reduce(
    (current, pattern) => current.replace(pattern, "").trim(),
    value.trim(),
  );
}

function requirePromptIntakeValue(promptPackage: CursivePromptPackage, key: string) {
  if (typeof promptPackage.intake === "string") {
    throw new Error("Official intake must be structured for credit bureau dispute drafts.");
  }

  const value = promptPackage.intake[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required prompt intake field: ${key}`);
  }

  return value.trim();
}

function buildOpenAiDraftRequest(promptPackage: CursivePromptPackage) {
  return {
    model: "gpt-4o-mini",
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content:
          `${promptPackage.systemPrompt}\nReturn only valid JSON with keys subjectLine and disputeSummary. Keep the subject line concise. Keep disputeSummary to one or two factual sentences. Explain the inaccuracy and the corrective position without repeating the bureau name, account reference, or the phrase 'the disputed reporting is inaccurate because'. Do not add citations, addresses, or signatures.`,
      },
      {
        role: "user",
        content: promptPackage.promptText,
      },
    ],
    temperature: 0.2,
  };
}

async function requestOpenAiDraft(input: {
  apiKey: string;
  fetchImpl: typeof fetch;
  promptPackage: CursivePromptPackage;
}) {
  const response = await input.fetchImpl("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(buildOpenAiDraftRequest(input.promptPackage)),
  });

  if (!response.ok) {
    throw new Error(`provider draft failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
      };
    }>;
  };

  return parseOpenAiJson(payload.choices?.[0]?.message?.content ?? "");
}

async function requestAnthropicDraft(input: {
  apiKey: string;
  fetchImpl: typeof fetch;
  promptPackage: CursivePromptPackage;
}) {
  const response = await input.fetchImpl("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": input.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-latest",
      max_tokens: 300,
      temperature: 0.2,
      system:
        `${input.promptPackage.systemPrompt}\nReturn only valid JSON with keys subjectLine and disputeSummary. Keep the subject line concise. Keep disputeSummary to one or two factual sentences. Explain the inaccuracy and the corrective position without repeating the bureau name, account reference, or the phrase 'the disputed reporting is inaccurate because'. Do not add citations, addresses, or signatures.`,
      messages: [
        {
          role: "user",
          content: input.promptPackage.promptText,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`provider draft failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  };
  const text = payload.content?.find((part) => part.type === "text")?.text ?? "";

  return parseOpenAiJson(text);
}

function buildFinalDraftFromProviderOutput(input: {
  promptPackage: CursivePromptPackage;
  providerDraft: unknown;
}): CreditBureauDisputeDraftContent {
  const bureauChoice = normalizeDraftFact(
    requirePromptIntakeValue(input.promptPackage, "bureau_choice"),
  );
  const accountReference = normalizeDraftFact(
    requirePromptIntakeValue(input.promptPackage, "account_reference"),
  );
  const providerSubjectLine = normalizeDraftFact(
    requireDraftField(input.providerDraft, "subjectLine"),
  );
  const providerDisputeSummary = ensureSentence(
    capitalizeFirstLetter(
      trimRepeatedDisputeLeadIn(
      normalizeDraftFact(requireDraftField(input.providerDraft, "disputeSummary")),
      ),
    ),
  );

  return Object.freeze({
    subjectLine: providerSubjectLine,
    bodyParagraphs: [
      "I am writing pursuant to my rights under the Fair Credit Reporting Act<sup>1</sup> and its implementing regulations<sup>2</sup> to dispute inaccurate information appearing on my consumer report.",
      `I dispute the reporting of ${accountReference} on my ${bureauChoice} consumer report. ${providerDisputeSummary}`,
      "Under FCRA section 611, you must conduct a reasonable reinvestigation of this dispute and delete or correct any information that is incomplete, inaccurate, or cannot be verified.<sup>3</sup>",
      "Please send me written confirmation of the results of your investigation and an updated consumer report once the reinvestigation is complete.",
    ],
  });
}

export function createCursiveDraftService(deps?: {
  fetch?: typeof fetch;
  mode?: DraftServiceMode;
}) {
  const fetchImpl = deps?.fetch ?? fetch;
  const mode = deps?.mode ?? "live";

  return {
    async generateCreditBureauDisputeDraft(input: {
      promptPackage: CursivePromptPackage;
      sessionSecret: SessionSecret;
    }): Promise<CreditBureauDisputeDraftContent> {
      if (input.promptPackage.categorySlug !== CREDIT_BUREAU_DISPUTE_CATEGORY_SLUG) {
        throw new Error("Unsupported Cursive draft category.");
      }

      const fallback = composeCreditBureauDisputeDraftContent({
        promptPackage: input.promptPackage,
      });

      if (mode === "stub") {
        return fallback;
      }

      const providerDraft =
        input.sessionSecret.provider === "anthropic"
          ? await requestAnthropicDraft({
              apiKey: input.sessionSecret.apiKey,
              fetchImpl,
              promptPackage: input.promptPackage,
            })
          : await requestOpenAiDraft({
              apiKey: input.sessionSecret.apiKey,
              fetchImpl,
              promptPackage: input.promptPackage,
            });

      return buildFinalDraftFromProviderOutput({
        promptPackage: input.promptPackage,
        providerDraft,
      });
    },
  };
}
