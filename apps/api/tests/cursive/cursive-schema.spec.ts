import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CURSIVE_DRAFT_STATUSES,
  CursiveIntakeSchemaSchema,
  CursivePromptPayloadSchema,
  CursiveReviewResultSchema,
  CursiveTemplatePayloadSchema,
} from "../../../../packages/shared/src/contracts/cursive";

function extractJsonbLiteral(sql: string, anchor: string) {
  const startIndex = sql.indexOf(anchor);

  expect(startIndex).toBeGreaterThanOrEqual(0);

  const afterAnchor = sql.slice(startIndex + anchor.length);
  const match = afterAnchor.match(/'(\{[\s\S]*?\})'::jsonb/);

  expect(match?.[1]).toBeDefined();

  return JSON.parse(match![1].replace(/''/g, "'"));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function whitespaceTolerantPattern(value: string) {
  return new RegExp(value.split(/\s+/).map(escapeRegExp).join("\\s+"));
}

function expectContainsIgnoringWhitespace(source: string, expected: string) {
  expect(source).toMatch(whitespaceTolerantPattern(expected));
}

const testDirectory = dirname(fileURLToPath(import.meta.url));

function resolveFromRepoRoot(...segments: string[]) {
  return resolve(testDirectory, "..", "..", "..", "..", ...segments);
}

function readCursiveSqlFiles() {
  const migrationPath = resolveFromRepoRoot(
    "supabase",
    "migrations",
    "007_cursive_category_engine.sql",
  );
  const seedPath = resolveFromRepoRoot(
    "supabase",
    "seed",
    "007_cursive_seed.sql",
  );

  return {
    sql: readFileSync(migrationPath, "utf8"),
    seedSql: readFileSync(seedPath, "utf8"),
  };
}

describe("Cursive schema migration", () => {
  it("creates the category and draft tables", () => {
    const { sql, seedSql } = readCursiveSqlFiles();

    expect(sql).toContain("create table if not exists public.cursive_categories");
    expect(sql).toContain("create table if not exists public.cursive_intake_schemas");
    expect(sql).toContain("create table if not exists public.cursive_citations");
    expect(sql).toContain("create table if not exists public.cursive_addresses");
    expect(sql).toContain("create table if not exists public.cursive_prompts");
    expect(sql).toContain("create table if not exists public.cursive_templates");
    expect(sql).toContain("create table if not exists public.cursive_drafts");
    expect(sql).toContain("alter table public.cursive_categories enable row level security");
    expect(sql).toContain("alter table public.cursive_intake_schemas enable row level security");
    expect(sql).toContain("alter table public.cursive_citations enable row level security");
    expect(sql).toContain("alter table public.cursive_addresses enable row level security");
    expect(sql).toContain("alter table public.cursive_prompts enable row level security");
    expect(sql).toContain("alter table public.cursive_templates enable row level security");
    expect(sql).toContain("alter table public.cursive_drafts enable row level security");
    expect(sql).toContain("create policy \"Authenticated users can read cursive categories\"");
    expect(sql).toContain("create policy \"Authenticated users can read cursive intake schemas\"");
    expect(sql).toContain("create policy \"Authenticated users can read cursive citations\"");
    expect(sql).toContain("create policy \"Authenticated users can read cursive addresses\"");
    expect(sql).toContain("create policy \"Authenticated users can read cursive prompts\"");
    expect(sql).toContain("create policy \"Authenticated users can read cursive templates\"");
    expect(sql).toContain("create policy \"Users can read their own cursive drafts\"");
    expect(sql).toContain("create policy \"Users can insert their own cursive drafts\"");
    expect(sql).toContain("create policy \"Users can update their own cursive drafts\"");
    expect(sql).toContain("create policy \"Users can delete their own cursive drafts\"");
    expect(sql).toContain("output_modes text[] not null");
    expect(sql).toContain("check (cardinality(output_modes) > 0)");
    expect(sql).toContain("address_key text not null");
    expect(sql).toContain("constraint cursive_addresses_category_slug_address_key_key unique");
    expect(sql).toContain("status text not null default 'drafting'");
    expectContainsIgnoringWhitespace(
      sql,
      `check (status in (${CURSIVE_DRAFT_STATUSES.map((status) => `'${status}'`).join(", ")}))`,
    );
    expectContainsIgnoringWhitespace(
      sql,
      "check (status = review_payload->>'status')",
    );
    expectContainsIgnoringWhitespace(
      sql,
      "check (jsonb_typeof(review_payload) = 'object')",
    );
    expectContainsIgnoringWhitespace(
      sql,
      "check (jsonb_typeof(review_payload->'notes') = 'array')",
    );
    expectContainsIgnoringWhitespace(
      sql,
      `check (
        not jsonb_path_exists(review_payload, '$.notes[*] ? (@.type() != "string")')
      )`,
    );
    expect(sql).toContain(
      "create or replace function public.set_cursive_updated_at()",
    );
    expect(sql).toContain(
      "create trigger set_cursive_categories_updated_at",
    );
    expect(sql).toContain(
      "create trigger set_cursive_intake_schemas_updated_at",
    );
    expect(sql).toContain(
      "create trigger set_cursive_prompts_updated_at",
    );
    expect(sql).toContain(
      "create trigger set_cursive_templates_updated_at",
    );
    expect(sql).toContain(
      "create trigger set_cursive_drafts_updated_at",
    );
    expect(sql).toContain(
      'drop policy if exists "Authenticated users can read cursive categories" on public.cursive_categories',
    );
    expect(sql).toContain(
      'drop policy if exists "Authenticated users can read cursive intake schemas" on public.cursive_intake_schemas',
    );
    expect(sql).toContain(
      'drop policy if exists "Authenticated users can read cursive citations" on public.cursive_citations',
    );
    expect(sql).toContain(
      'drop policy if exists "Authenticated users can read cursive addresses" on public.cursive_addresses',
    );
    expect(sql).toContain(
      'drop policy if exists "Authenticated users can read cursive prompts" on public.cursive_prompts',
    );
    expect(sql).toContain(
      'drop policy if exists "Authenticated users can read cursive templates" on public.cursive_templates',
    );
    expect(sql).toContain(
      'drop policy if exists "Users can read their own cursive drafts" on public.cursive_drafts',
    );
    expect(sql).toContain(
      'drop policy if exists "Users can insert their own cursive drafts" on public.cursive_drafts',
    );
    expect(sql).toContain(
      'drop policy if exists "Users can update their own cursive drafts" on public.cursive_drafts',
    );
    expect(sql).toContain(
      'drop policy if exists "Users can delete their own cursive drafts" on public.cursive_drafts',
    );

    expect(seedSql).toContain("'credit_bureau_dispute'");
    expect(seedSql).toContain("'aggregator_dispute'");
    expect(seedSql).toContain("'direct_creditor_dispute'");
    expect(seedSql).toContain("'bill_collector_dispute'");
    expect(seedSql).toContain("'utility_dispute'");
    expect(seedSql).toContain("'reconsideration_request'");
    expect(seedSql).toContain("'full_account_history_request'");
    expect(seedSql).toContain("'irs_inquiry_dispute'");
    expect(seedSql).toContain("'helper-only'");
    expect(seedSql).toContain("output_modes");
    expect(seedSql).toContain("array['portal_text', 'html_letter', 'pdf_letter']");
    expect(seedSql).toContain("'15 U.S.C. Sec. 1681i'");
    expect(seedSql).toContain("'Experian'");
    expect(seedSql).toContain("on conflict on constraint cursive_addresses_category_slug_address_key_key do update");
    expect(seedSql).toContain("insert into public.cursive_prompts");
    expect(seedSql).toContain("'credit_bureau_dispute'");
    expect(seedSql).not.toContain("\"outputModes\"");
    expect(seedSql).toContain("updated_at = timezone('utc', now())");
    expectContainsIgnoringWhitespace(
      seedSql,
      "'credit_bureau_dispute', 'Credit Bureau Dispute',",
    );
    expectContainsIgnoringWhitespace(
      seedSql,
      "'aggregator_dispute', 'Aggregator Dispute', 'helper-only', array['portal_text', 'html_letter', 'pdf_letter'], false,",
    );
    expectContainsIgnoringWhitespace(
      seedSql,
      "'direct_creditor_dispute', 'Direct Creditor Dispute', 'helper-only', array['portal_text', 'html_letter', 'pdf_letter'], false,",
    );
    expectContainsIgnoringWhitespace(
      seedSql,
      "'bill_collector_dispute', 'Bill Collector Dispute', 'helper-only', array['portal_text', 'html_letter', 'pdf_letter'], false,",
    );
    expectContainsIgnoringWhitespace(
      seedSql,
      "'utility_dispute', 'Utility Dispute', 'helper-only', array['portal_text', 'html_letter', 'pdf_letter'], false,",
    );
    expectContainsIgnoringWhitespace(
      seedSql,
      "'reconsideration_request', 'Reconsideration Request', 'helper-only', array['portal_text', 'html_letter', 'pdf_letter'], false,",
    );
    expectContainsIgnoringWhitespace(
      seedSql,
      "'full_account_history_request', 'Full Account History Request', 'helper-only', array['portal_text', 'html_letter', 'pdf_letter'], false,",
    );
    expectContainsIgnoringWhitespace(
      seedSql,
      "'irs_inquiry_dispute', 'IRS Inquiry / Dispute', 'helper-only', array['portal_text', 'html_letter', 'pdf_letter'], false,",
    );
  });

  it("keeps parseable JSON defaults and seeded payloads aligned with shared schemas", () => {
    const { sql, seedSql } = readCursiveSqlFiles();

    const reviewPayloadDefault = extractJsonbLiteral(
      sql,
      "review_payload jsonb not null default ",
    );
    const intakeSchemaDefaultMatch = sql.match(
      /intake_schema jsonb not null(?: default '(\{[\s\S]*?\})'::jsonb)?/,
    );
    const promptPayloadDefaultMatch = sql.match(
      /prompt_payload jsonb not null(?: default '(\{[\s\S]*?\})'::jsonb)?/,
    );
    const templatePayloadDefaultMatch = sql.match(
      /template_payload jsonb not null(?: default '(\{[\s\S]*?\})'::jsonb)?/,
    );
    const seededIntakeSchema = extractJsonbLiteral(
      seedSql,
      "insert into public.cursive_intake_schemas",
    );
    const seededPromptPayload = extractJsonbLiteral(
      seedSql,
      "insert into public.cursive_prompts",
    );
    const seededTemplatePayload = extractJsonbLiteral(
      seedSql,
      "insert into public.cursive_templates",
    );

    expect(CursiveReviewResultSchema.parse(reviewPayloadDefault)).toEqual({
      status: "drafting",
      notes: [],
    });
    expect(intakeSchemaDefaultMatch?.[1]).toBeUndefined();
    expect(promptPayloadDefaultMatch?.[1]).toBeUndefined();
    expect(templatePayloadDefaultMatch?.[1]).toBeUndefined();
    expect(CursiveIntakeSchemaSchema.parse(seededIntakeSchema)).toEqual({
      fields: [
        { key: "consumer_name", label: "Consumer name", required: true },
        { key: "consumer_address", label: "Mailing address", required: true },
        { key: "bureau_choice", label: "Credit bureau", required: true },
        { key: "account_reference", label: "Account reference", required: true },
        { key: "dispute_reason", label: "Dispute reason", required: true },
      ],
    });
    expect(CursivePromptPayloadSchema.parse(seededPromptPayload)).toEqual({
      systemPrompt:
        "You are a helper-only assistant collecting and organizing facts for a credit bureau dispute letter grounded in the user's official intake, the approved FCRA authorities, and the seeded bureau address data.",
      draftInstructions: [
        "Draft a formal credit bureau dispute letter using a concise legal-business tone.",
        "Keep the letter grounded in the official intake only. Do not invent facts, dates, balances, or account history.",
        "Use the approved citation set as the legal grounding for the letter structure, with superscript references left in place for the HTML template.",
        "Frame the requested remedy around reinvestigation, correction, deletion of unverifiable information, and written results.",
        "When drafting the dispute summary, explain the inaccuracy and the corrective position in one or two factual sentences without repeating the bureau name, account reference, or the phrase 'the disputed reporting is inaccurate because'.",
      ],
    });
    expect(CursiveTemplatePayloadSchema.parse(seededTemplatePayload)).toEqual({
      salutation: "To Whom It May Concern:",
      closing: "Sincerely,",
    });
  });

  it("rejects seeded payload drift against strict shared schemas", () => {
    expect(() =>
      CursiveIntakeSchemaSchema.parse({
        fields: [
          {
            key: "consumer_name",
            label: "Consumer name",
            required: true,
            helperMode: "helper-only",
          },
        ],
      }),
    ).toThrow();

    expect(() =>
      CursivePromptPayloadSchema.parse({
        systemPrompt:
          "You are a helper-only assistant collecting and organizing facts for a credit bureau dispute letter.",
        draftInstructions: ["Summarize the dispute facts clearly and professionally.", false],
      }),
    ).toThrow();

    expect(() =>
      CursiveTemplatePayloadSchema.parse({
        salutation: "To Whom It May Concern:",
        closing: "Sincerely,",
        outputModes: ["portal_text"],
      }),
    ).toThrow();
  });

  it("rejects non-string review note elements at the contract boundary", () => {
    expect(() =>
      CursiveReviewResultSchema.parse({
        status: "needs_revision",
        notes: ["Keep the timeline tighter.", { detail: "not a string" }],
      }),
    ).toThrow();
  });
});
