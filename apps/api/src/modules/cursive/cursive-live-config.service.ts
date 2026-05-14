import type { AppEnv } from "../../config/env";
import {
  CursiveCategorySchema,
  CursiveIntakeSchemaSchema,
  CursivePromptPayloadSchema,
  CursiveTemplatePayloadSchema,
  type CursiveCategorySlug,
} from "../../../../../packages/shared/src/contracts/cursive";
import {
  createCursiveRepo,
  type CursiveCategoryConfig,
  type CursiveRepoAddress,
  type CursiveRepoCategory,
  type CursiveRepoCitation,
} from "./cursive.repo";

type SupabaseCategoryRow = {
  slug: string;
  display_name: string;
  helper_mode: "helper-only";
  output_modes: string[];
  enabled: boolean;
  sort_order: number;
  summary: string;
};

type SupabaseIntakeSchemaRow = {
  category_slug: string;
  schema_version: string;
  helper_mode: "helper-only";
  intake_schema: unknown;
};

type SupabasePromptRow = {
  category_slug: string;
  prompt_version: string;
  helper_mode: "helper-only";
  prompt_payload: unknown;
};

type SupabaseTemplateRow = {
  category_slug: string;
  template_version: string;
  helper_mode: "helper-only";
  template_payload: unknown;
};

type SupabaseCitationRow = {
  category_slug: string;
  citation_key: string;
  citation_text: string;
  sort_order: number;
};

type SupabaseAddressRow = {
  category_slug: string;
  address_key: string;
  organization_name: string;
  attention_line: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  sort_order: number;
};

export type CursiveConfigService = {
  getCategoryConfig(categorySlug: CursiveCategorySlug): Promise<CursiveCategoryConfig>;
  listCategories(): Promise<readonly CursiveRepoCategory[]>;
};

function requireSupabaseEnv(env: AppEnv) {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error("Supabase env is required for live Cursive config");
  }

  return {
    supabaseServiceRoleKey: env.supabaseServiceRoleKey,
    supabaseUrl: env.supabaseUrl,
  };
}

function hasSupabaseEnv(env: AppEnv) {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}

function hasPartialSupabaseEnv(env: AppEnv) {
  return Boolean(env.supabaseUrl || env.supabaseServiceRoleKey) && !hasSupabaseEnv(env);
}

async function selectRows<TRow>(input: {
  env: AppEnv;
  fetchImpl?: typeof fetch;
  query: string;
  table: string;
}) {
  const env = requireSupabaseEnv(input.env);
  const response = await (input.fetchImpl ?? fetch)(
    `${env.supabaseUrl}/rest/v1/${input.table}${input.query}`,
    {
      headers: {
        apikey: env.supabaseServiceRoleKey,
        authorization: `Bearer ${env.supabaseServiceRoleKey}`,
      },
      method: "GET",
    },
  );

  if (!response.ok) {
    throw new Error(
      `Supabase select failed for ${input.table}: ${response.status} ${await response.text()}`,
    );
  }

  return (await response.json()) as TRow[];
}

function freezeCategoryConfig(config: CursiveCategoryConfig): CursiveCategoryConfig {
  return Object.freeze({
    ...config,
    category: Object.freeze({
      ...config.category,
      outputModes: Object.freeze([...config.category.outputModes]),
    }),
    intakeSchema: Object.freeze({
      ...config.intakeSchema,
      intakeSchema: Object.freeze({
        fields: Object.freeze(
          config.intakeSchema.intakeSchema.fields.map((field) =>
            Object.freeze({ ...field }),
          ),
        ),
      }),
    }),
    promptProfile: Object.freeze({
      ...config.promptProfile,
      promptPayload: Object.freeze({
        ...config.promptProfile.promptPayload,
        draftInstructions: Object.freeze([
          ...config.promptProfile.promptPayload.draftInstructions,
        ]),
      }),
    }),
    citations: Object.freeze(
      config.citations.map((citation) => Object.freeze({ ...citation })),
    ) as unknown as CursiveRepoCitation[],
    addresses: Object.freeze(
      config.addresses.map((address) => Object.freeze({ ...address })),
    ) as unknown as CursiveRepoAddress[],
    templateDefaults: Object.freeze({
      ...config.templateDefaults,
      templatePayload: Object.freeze({
        ...config.templateDefaults.templatePayload,
      }),
    }),
  }) as CursiveCategoryConfig;
}

function mapCategory(row: SupabaseCategoryRow): CursiveCategoryConfig["category"] {
  const category = CursiveCategorySchema.parse({
    displayName: row.display_name,
    helperMode: row.helper_mode,
    outputModes: row.output_modes,
    slug: row.slug,
  });

  return {
    ...category,
    enabled: row.enabled,
    sortOrder: row.sort_order,
    summary: row.summary,
  };
}

function requireSingleRow<TRow>(rows: TRow[], label: string, categorySlug: string) {
  if (rows.length === 0) {
    throw new Error(`Missing live Cursive ${label} for category: ${categorySlug}`);
  }

  return rows[0]!;
}

function requireCollectionRows<TRow>(
  rows: TRow[],
  label: string,
  categorySlug: string,
) {
  if (rows.length === 0) {
    throw new Error(`Missing live Cursive ${label} for category: ${categorySlug}`);
  }

  return rows;
}

export function createFallbackCursiveConfigService(
  repo = createCursiveRepo(),
): CursiveConfigService {
  return {
    async getCategoryConfig(categorySlug) {
      const config = repo.getCategoryConfig(categorySlug);

      if (!config) {
        throw new Error(`Missing fallback Cursive config for category: ${categorySlug}`);
      }

      return config;
    },
    async listCategories() {
      return repo.listCategories();
    },
  };
}

export function createSupabaseCursiveConfigService(
  env: AppEnv,
  input?: {
    fetchImpl?: typeof fetch;
  },
): CursiveConfigService {
  return {
    async getCategoryConfig(categorySlug) {
      const [categoryRows, intakeRows, promptRows, templateRows, citationRows, addressRows] =
        await Promise.all([
          selectRows<SupabaseCategoryRow>({
            env,
            fetchImpl: input?.fetchImpl,
            query: `?slug=eq.${encodeURIComponent(categorySlug)}&select=slug,display_name,helper_mode,output_modes,enabled,sort_order,summary`,
            table: "cursive_categories",
          }),
          selectRows<SupabaseIntakeSchemaRow>({
            env,
            fetchImpl: input?.fetchImpl,
            query: `?category_slug=eq.${encodeURIComponent(categorySlug)}&select=category_slug,schema_version,helper_mode,intake_schema`,
            table: "cursive_intake_schemas",
          }),
          selectRows<SupabasePromptRow>({
            env,
            fetchImpl: input?.fetchImpl,
            query: `?category_slug=eq.${encodeURIComponent(categorySlug)}&select=category_slug,prompt_version,helper_mode,prompt_payload`,
            table: "cursive_prompts",
          }),
          selectRows<SupabaseTemplateRow>({
            env,
            fetchImpl: input?.fetchImpl,
            query: `?category_slug=eq.${encodeURIComponent(categorySlug)}&select=category_slug,template_version,helper_mode,template_payload`,
            table: "cursive_templates",
          }),
          selectRows<SupabaseCitationRow>({
            env,
            fetchImpl: input?.fetchImpl,
            query: `?category_slug=eq.${encodeURIComponent(categorySlug)}&select=category_slug,citation_key,citation_text,sort_order&order=sort_order.asc`,
            table: "cursive_citations",
          }),
          selectRows<SupabaseAddressRow>({
            env,
            fetchImpl: input?.fetchImpl,
            query: `?category_slug=eq.${encodeURIComponent(categorySlug)}&select=category_slug,address_key,organization_name,attention_line,address_line_1,address_line_2,city,state,postal_code,country,sort_order&order=sort_order.asc`,
            table: "cursive_addresses",
          }),
        ]);

      const category = mapCategory(
        requireSingleRow(categoryRows, "category", categorySlug),
      );
      const intakeSchemaRow = requireSingleRow(
        intakeRows,
        "intake schema",
        categorySlug,
      );
      const promptRow = requireSingleRow(promptRows, "prompt profile", categorySlug);
      const templateRow = requireSingleRow(
        templateRows,
        "template defaults",
        categorySlug,
      );
      const citations = requireCollectionRows(
        citationRows,
        "citations",
        categorySlug,
      );
      const addresses = requireCollectionRows(
        addressRows,
        "addresses",
        categorySlug,
      );

      return freezeCategoryConfig({
        addresses: addresses.map((row) => ({
          addressKey: row.address_key,
          addressLine1: row.address_line_1,
          addressLine2: row.address_line_2,
          attentionLine: row.attention_line,
          city: row.city,
          country: row.country,
          organizationName: row.organization_name,
          postalCode: row.postal_code,
          sortOrder: row.sort_order,
          state: row.state,
        })),
        category,
        citations: citations.map((row) => ({
          citationKey: row.citation_key,
          citationText: row.citation_text,
          sortOrder: row.sort_order,
        })),
        intakeSchema: {
          helperMode: intakeSchemaRow.helper_mode,
          intakeSchema: CursiveIntakeSchemaSchema.parse(intakeSchemaRow.intake_schema),
          schemaVersion: intakeSchemaRow.schema_version,
        },
        promptProfile: {
          helperMode: promptRow.helper_mode,
          promptPayload: CursivePromptPayloadSchema.parse(promptRow.prompt_payload),
          promptVersion: promptRow.prompt_version,
        },
        templateDefaults: {
          helperMode: templateRow.helper_mode,
          templatePayload: CursiveTemplatePayloadSchema.parse(
            templateRow.template_payload,
          ),
          templateVersion: templateRow.template_version,
        },
      });
    },
    async listCategories() {
      const rows = await selectRows<SupabaseCategoryRow>({
        env,
        fetchImpl: input?.fetchImpl,
        query: "?select=slug,display_name,helper_mode,output_modes,enabled,sort_order,summary&order=sort_order.asc",
        table: "cursive_categories",
      });

      return Object.freeze(
        rows.map((row) => mapCategory(row)).sort((a, b) => a.sortOrder - b.sortOrder),
      ) as readonly CursiveRepoCategory[];
    },
  };
}

export function createCursiveConfigService(
  env: AppEnv,
  input?: {
    fetchImpl?: typeof fetch;
    fallbackRepo?: ReturnType<typeof createCursiveRepo>;
  },
): CursiveConfigService {
  if (hasPartialSupabaseEnv(env)) {
    throw new Error(
      "Incomplete Supabase env for live Cursive config. Both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }

  if (!hasSupabaseEnv(env)) {
    return createFallbackCursiveConfigService(input?.fallbackRepo);
  }

  return createSupabaseCursiveConfigService(env, {
    fetchImpl: input?.fetchImpl,
  });
}
