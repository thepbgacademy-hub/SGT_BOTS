import type { AppEnv } from "../../config/env";

type LegacyCursiveCategory = {
  slug: string;
  displayName: string;
  helperMode: "helper-only";
  outputModes: readonly string[];
  enabled: boolean;
  sortOrder: number;
  summary: string;
};

type LegacyIntakeField = {
  key: string;
  label: string;
  required: boolean;
};

type LegacyCursiveCategoryConfig = {
  category: LegacyCursiveCategory;
  intakeSchema: {
    schemaVersion: string;
    helperMode: "helper-only";
  intakeSchema: {
    fields: readonly LegacyIntakeField[];
    };
  };
  promptProfile: {
    promptVersion: string;
    helperMode: "helper-only";
    promptPayload: {
      systemPrompt: string;
      draftInstructions: readonly string[];
    };
  };
  citations: readonly {
    citationKey: string;
    citationText: string;
    sortOrder: number;
  }[];
  addresses: readonly {
    addressKey: string;
    organizationName: string;
    attentionLine: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    sortOrder: number;
  }[];
  templateDefaults: {
    templateVersion: string;
    helperMode: "helper-only";
    templatePayload: {
      salutation: string;
      closing: string;
    };
  };
};

export type CursiveConfigService = {
  getCategoryConfig(categorySlug: string): Promise<LegacyCursiveCategoryConfig>;
  listCategories(): Promise<readonly LegacyCursiveCategory[]>;
};

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
  intake_schema: {
    fields: LegacyIntakeField[];
  };
};

type SupabasePromptRow = {
  category_slug: string;
  prompt_version: string;
  helper_mode: "helper-only";
  prompt_payload: {
    systemPrompt: string;
    draftInstructions: string[];
  };
};

type SupabaseTemplateRow = {
  category_slug: string;
  template_version: string;
  helper_mode: "helper-only";
  template_payload: {
    salutation: string;
    closing: string;
  };
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

const FALLBACK_CATEGORY_CONFIG: LegacyCursiveCategoryConfig = Object.freeze({
  category: Object.freeze({
    slug: "credit_bureau_dispute",
    displayName: "Credit Bureau Dispute",
    helperMode: "helper-only",
    outputModes: ["portal_text", "html_letter", "pdf_letter"],
    enabled: true,
    sortOrder: 10,
    summary:
      "Legacy fallback credit bureau dispute config kept only to support existing preview and artifact routes while Cursive v2 is being migrated.",
  }),
  intakeSchema: Object.freeze({
    schemaVersion: "v1",
    helperMode: "helper-only",
    intakeSchema: Object.freeze({
      fields: Object.freeze([
        Object.freeze({ key: "consumer_name", label: "Consumer name", required: true }),
        Object.freeze({
          key: "consumer_address",
          label: "Mailing address",
          required: true,
        }),
        Object.freeze({ key: "bureau_choice", label: "Credit bureau", required: true }),
        Object.freeze({
          key: "account_reference",
          label: "Account reference",
          required: true,
        }),
        Object.freeze({ key: "dispute_reason", label: "Dispute reason", required: true }),
      ]),
    }),
  }),
  promptProfile: Object.freeze({
    promptVersion: "v1",
    helperMode: "helper-only",
    promptPayload: Object.freeze({
      systemPrompt:
        "Legacy fallback prompt profile retained only to keep preview routes bootable during the Cursive v2 migration.",
      draftInstructions: Object.freeze([
        "Use only the official intake supplied to the route.",
        "Do not invent facts.",
      ]),
    }),
  }),
  citations: Object.freeze([
    Object.freeze({
      citationKey: "fcra_general",
      citationText: "15 U.S.C. Secs. 1681 et seq. (FCRA)",
      sortOrder: 10,
    }),
    Object.freeze({
      citationKey: "reg_v",
      citationText: "12 C.F.R. Sec. 1022.41-48 (Reg V)",
      sortOrder: 20,
    }),
    Object.freeze({
      citationKey: "fcra_611",
      citationText: "15 U.S.C. Sec. 1681i",
      sortOrder: 30,
    }),
  ]),
  addresses: Object.freeze([
    Object.freeze({
      addressKey: "experian_disputes",
      organizationName: "Experian",
      attentionLine: "Dispute by Mail",
      addressLine1: "P.O. Box 4500",
      addressLine2: "",
      city: "Allen",
      state: "TX",
      postalCode: "75013",
      country: "US",
      sortOrder: 10,
    }),
    Object.freeze({
      addressKey: "equifax_disputes",
      organizationName: "Equifax",
      attentionLine: "Information Services LLC",
      addressLine1: "P.O. Box 740256",
      addressLine2: "",
      city: "Atlanta",
      state: "GA",
      postalCode: "30374",
      country: "US",
      sortOrder: 20,
    }),
    Object.freeze({
      addressKey: "transunion_disputes",
      organizationName: "TransUnion",
      attentionLine: "Consumer Solutions",
      addressLine1: "P.O. Box 2000",
      addressLine2: "",
      city: "Chester",
      state: "PA",
      postalCode: "19016-2000",
      country: "US",
      sortOrder: 30,
    }),
  ]),
  templateDefaults: Object.freeze({
    templateVersion: "v1",
    helperMode: "helper-only",
    templatePayload: Object.freeze({
      salutation: "To Whom It May Concern:",
      closing: "Sincerely,",
    }),
  }),
});

function createFallbackCursiveConfigService(): CursiveConfigService {
  return {
    async getCategoryConfig(categorySlug) {
      if (categorySlug !== FALLBACK_CATEGORY_CONFIG.category.slug) {
        throw new Error(`Missing fallback Cursive config for category: ${categorySlug}`);
      }

      return FALLBACK_CATEGORY_CONFIG;
    },
    async listCategories() {
      return [FALLBACK_CATEGORY_CONFIG.category];
    },
  };
}

function hasSupabaseEnv(env: AppEnv) {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}

function hasPartialSupabaseEnv(env: AppEnv) {
  return Boolean(env.supabaseUrl || env.supabaseServiceRoleKey) && !hasSupabaseEnv(env);
}

function requireSupabaseEnv(env: AppEnv) {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error("Supabase env is required for live Cursive config");
  }

  return {
    supabaseServiceRoleKey: env.supabaseServiceRoleKey,
    supabaseUrl: env.supabaseUrl,
  };
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

function freezeCategoryConfig(
  config: LegacyCursiveCategoryConfig,
): LegacyCursiveCategoryConfig {
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
    ),
    addresses: Object.freeze(
      config.addresses.map((address) => Object.freeze({ ...address })),
    ),
    templateDefaults: Object.freeze({
      ...config.templateDefaults,
      templatePayload: Object.freeze({
        ...config.templateDefaults.templatePayload,
      }),
    }),
  });
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

      const categoryRow = requireSingleRow(categoryRows, "category", categorySlug);
      const intakeRow = requireSingleRow(intakeRows, "intake schema", categorySlug);
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
        category: {
          slug: categoryRow.slug,
          displayName: categoryRow.display_name,
          helperMode: categoryRow.helper_mode,
          outputModes: categoryRow.output_modes,
          enabled: categoryRow.enabled,
          sortOrder: categoryRow.sort_order,
          summary: categoryRow.summary,
        },
        intakeSchema: {
          schemaVersion: intakeRow.schema_version,
          helperMode: intakeRow.helper_mode,
          intakeSchema: intakeRow.intake_schema,
        },
        promptProfile: {
          promptVersion: promptRow.prompt_version,
          helperMode: promptRow.helper_mode,
          promptPayload: promptRow.prompt_payload,
        },
        citations: citations.map((row) => ({
          citationKey: row.citation_key,
          citationText: row.citation_text,
          sortOrder: row.sort_order,
        })),
        addresses: addresses.map((row) => ({
          addressKey: row.address_key,
          organizationName: row.organization_name,
          attentionLine: row.attention_line,
          addressLine1: row.address_line_1,
          addressLine2: row.address_line_2,
          city: row.city,
          state: row.state,
          postalCode: row.postal_code,
          country: row.country,
          sortOrder: row.sort_order,
        })),
        templateDefaults: {
          templateVersion: templateRow.template_version,
          helperMode: templateRow.helper_mode,
          templatePayload: templateRow.template_payload,
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
        rows.map((row) => ({
          slug: row.slug,
          displayName: row.display_name,
          helperMode: row.helper_mode,
          outputModes: row.output_modes,
          enabled: row.enabled,
          sortOrder: row.sort_order,
          summary: row.summary,
        })),
      );
    },
  };
}

export function createCursiveConfigService(
  env: AppEnv,
  input?: {
    fetchImpl?: typeof fetch;
  },
): CursiveConfigService {
  if (hasPartialSupabaseEnv(env)) {
    throw new Error(
      "Incomplete Supabase env for live Cursive config. Both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }

  if (hasSupabaseEnv(env)) {
    return createSupabaseCursiveConfigService(env, {
      fetchImpl: input?.fetchImpl,
    });
  }

  return createFallbackCursiveConfigService();
}
