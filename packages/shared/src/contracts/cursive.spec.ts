import { describe, expect, it } from "vitest";
import {
  CursiveCategorySchema,
  CursiveDraftStatusSchema,
  CursiveIntakeSchemaSchema,
  CursivePromptPayloadSchema,
  CursiveReviewResultSchema,
  CursiveTemplatePayloadSchema,
} from "./cursive";

describe("CursiveCategorySchema", () => {
  it("accepts the credit bureau dispute category", () => {
    expect(
      CursiveCategorySchema.parse({
        slug: "credit_bureau_dispute",
        displayName: "Credit Bureau Dispute",
        helperMode: "helper-only",
        outputModes: ["portal_text", "html_letter", "pdf_letter"],
      }),
    ).toEqual({
      slug: "credit_bureau_dispute",
      displayName: "Credit Bureau Dispute",
      helperMode: "helper-only",
      outputModes: ["portal_text", "html_letter", "pdf_letter"],
    });
  });

  it("rejects unsupported output modes", () => {
    const result = CursiveCategorySchema.safeParse({
      slug: "credit_bureau_dispute",
      displayName: "Credit Bureau Dispute",
      helperMode: "helper-only",
      outputModes: ["email"],
    });

    expect(result.success).toBe(false);
  });
});

describe("CursiveTemplatePayloadSchema", () => {
  it("accepts the seeded credit bureau dispute template payload", () => {
    expect(
      CursiveTemplatePayloadSchema.parse({
        salutation: "To Whom It May Concern:",
        closing: "Sincerely,",
      }),
    ).toEqual({
      salutation: "To Whom It May Concern:",
      closing: "Sincerely,",
    });
  });

  it("rejects template payloads that try to carry category output modes", () => {
    const result = CursiveTemplatePayloadSchema.safeParse({
      salutation: "To Whom It May Concern:",
      closing: "Sincerely,",
      outputModes: ["portal_text", "html_letter", "pdf_letter"],
    });

    expect(result.success).toBe(false);
  });
});

describe("CursivePromptPayloadSchema", () => {
  it("accepts the seeded credit bureau dispute prompt payload", () => {
    expect(
      CursivePromptPayloadSchema.parse({
        systemPrompt:
          "You are a helper-only assistant collecting and organizing facts for a credit bureau dispute letter.",
        draftInstructions: [
          "Summarize the dispute facts clearly and professionally.",
          "Reference the seeded citations when they support the user's dispute.",
        ],
      }),
    ).toEqual({
      systemPrompt:
        "You are a helper-only assistant collecting and organizing facts for a credit bureau dispute letter.",
      draftInstructions: [
        "Summarize the dispute facts clearly and professionally.",
        "Reference the seeded citations when they support the user's dispute.",
      ],
    });
  });

  it("rejects prompt payloads with non-string draft instruction elements", () => {
    const result = CursivePromptPayloadSchema.safeParse({
      systemPrompt:
        "You are a helper-only assistant collecting and organizing facts for a credit bureau dispute letter.",
      draftInstructions: ["Summarize the dispute facts clearly and professionally.", 123],
    });

    expect(result.success).toBe(false);
  });
});

describe("CursiveIntakeSchemaSchema", () => {
  it("rejects intake fields with unexpected nested properties", () => {
    const result = CursiveIntakeSchemaSchema.safeParse({
      fields: [
        {
          key: "consumer_name",
          label: "Consumer name",
          required: true,
          outputModes: ["portal_text"],
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});

describe("CursiveReviewResultSchema", () => {
  it("rejects review payload drift from unexpected properties", () => {
    const result = CursiveReviewResultSchema.safeParse({
      status: "drafting",
      notes: [],
      helperMode: "helper-only",
    });

    expect(result.success).toBe(false);
  });
});

describe("CursiveDraftStatusSchema", () => {
  it("accepts only the persisted draft lifecycle states", () => {
    expect(CursiveDraftStatusSchema.options).toEqual([
      "drafting",
      "review_ready",
      "needs_revision",
      "approved",
    ]);
  });
});
