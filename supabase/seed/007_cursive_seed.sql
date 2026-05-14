insert into public.cursive_categories (
  slug,
  display_name,
  helper_mode,
  output_modes,
  enabled,
  sort_order,
  summary
)
values
  (
    'credit_bureau_dispute',
    'Credit Bureau Dispute',
    'helper-only',
    array['portal_text', 'html_letter', 'pdf_letter'],
    true,
    10,
    'Dispute late payments, charge-offs, and inaccurate bureau reporting.'
  ),
  (
    'aggregator_dispute',
    'Aggregator Dispute',
    'helper-only',
    array['portal_text', 'html_letter', 'pdf_letter'],
    false,
    20,
    'Challenge aggregator data such as LexisNexis-style reporting.'
  ),
  (
    'direct_creditor_dispute',
    'Direct Creditor Dispute',
    'helper-only',
    array['portal_text', 'html_letter', 'pdf_letter'],
    false,
    30,
    'Dispute directly with a creditor or lender.'
  ),
  (
    'bill_collector_dispute',
    'Bill Collector Dispute',
    'helper-only',
    array['portal_text', 'html_letter', 'pdf_letter'],
    false,
    40,
    'Request validation, assignment, and bill-of-sale support.'
  ),
  (
    'utility_dispute',
    'Utility Dispute',
    'helper-only',
    array['portal_text', 'html_letter', 'pdf_letter'],
    false,
    50,
    'Dispute energy, water, telecom, and similar charges.'
  ),
  (
    'reconsideration_request',
    'Reconsideration Request',
    'helper-only',
    array['portal_text', 'html_letter', 'pdf_letter'],
    false,
    60,
    'Request reconsideration after denial of credit or account access.'
  ),
  (
    'full_account_history_request',
    'Full Account History Request',
    'helper-only',
    array['portal_text', 'html_letter', 'pdf_letter'],
    false,
    70,
    'Request a complete accounting and account history.'
  ),
  (
    'irs_inquiry_dispute',
    'IRS Inquiry / Dispute',
    'helper-only',
    array['portal_text', 'html_letter', 'pdf_letter'],
    false,
    80,
    'Respond to IRS account notices and inquiry disputes.'
  )
on conflict (slug) do update
set
  display_name = excluded.display_name,
  helper_mode = excluded.helper_mode,
  output_modes = excluded.output_modes,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order,
  summary = excluded.summary,
  updated_at = timezone('utc', now());

insert into public.cursive_intake_schemas (
  category_slug,
  schema_version,
  helper_mode,
  intake_schema
)
values (
  'credit_bureau_dispute',
  'v1',
  'helper-only',
  '{
    "fields": [
      { "key": "consumer_name", "label": "Consumer name", "required": true },
      { "key": "consumer_address", "label": "Mailing address", "required": true },
      { "key": "bureau_choice", "label": "Credit bureau", "required": true },
      { "key": "account_reference", "label": "Account reference", "required": true },
      { "key": "dispute_reason", "label": "Dispute reason", "required": true }
    ]
  }'::jsonb
)
on conflict (category_slug) do update
set
  schema_version = excluded.schema_version,
  helper_mode = excluded.helper_mode,
  intake_schema = excluded.intake_schema,
  updated_at = timezone('utc', now());

insert into public.cursive_citations (
  category_slug,
  citation_key,
  citation_text,
  sort_order
)
values
  (
    'credit_bureau_dispute',
    'fcra_general',
    '15 U.S.C. Secs. 1681 et seq. (FCRA)',
    10
  ),
  (
    'credit_bureau_dispute',
    'reg_v',
    '12 C.F.R. Sec. 1022.41-48 (Reg V)',
    20
  ),
  (
    'credit_bureau_dispute',
    'fcra_611',
    '15 U.S.C. Sec. 1681i',
    30
  )
on conflict (category_slug, citation_key) do update
set
  citation_text = excluded.citation_text,
  sort_order = excluded.sort_order;

insert into public.cursive_addresses (
  category_slug,
  address_key,
  organization_name,
  attention_line,
  address_line_1,
  address_line_2,
  city,
  state,
  postal_code,
  country,
  sort_order
)
values
  (
    'credit_bureau_dispute',
    'experian_disputes',
    'Experian',
    'Dispute by Mail',
    'P.O. Box 4500',
    '',
    'Allen',
    'TX',
    '75013',
    'US',
    10
  ),
  (
    'credit_bureau_dispute',
    'equifax_disputes',
    'Equifax',
    'Information Services LLC',
    'P.O. Box 740256',
    '',
    'Atlanta',
    'GA',
    '30374',
    'US',
    20
  ),
  (
    'credit_bureau_dispute',
    'transunion_disputes',
    'TransUnion',
    'Consumer Solutions',
    'P.O. Box 2000',
    '',
    'Chester',
    'PA',
    '19016-2000',
    'US',
    30
  )
on conflict on constraint cursive_addresses_category_slug_address_key_key do update
set
  organization_name = excluded.organization_name,
  attention_line = excluded.attention_line,
  address_line_1 = excluded.address_line_1,
  address_line_2 = excluded.address_line_2,
  city = excluded.city,
  state = excluded.state,
  postal_code = excluded.postal_code,
  country = excluded.country,
  sort_order = excluded.sort_order;

insert into public.cursive_prompts (
  category_slug,
  prompt_version,
  helper_mode,
  prompt_payload
)
values (
  'credit_bureau_dispute',
  'v1',
  'helper-only',
  '{
    "systemPrompt": "You are a helper-only assistant collecting and organizing facts for a credit bureau dispute letter grounded in the user''s official intake, the approved FCRA authorities, and the seeded bureau address data.",
    "draftInstructions": [
      "Draft a formal credit bureau dispute letter using a concise legal-business tone.",
      "Keep the letter grounded in the official intake only. Do not invent facts, dates, balances, or account history.",
      "Use the approved citation set as the legal grounding for the letter structure, with superscript references left in place for the HTML template.",
      "Frame the requested remedy around reinvestigation, correction, deletion of unverifiable information, and written results.",
      "When drafting the dispute summary, explain the inaccuracy and the corrective position in one or two factual sentences without repeating the bureau name, account reference, or the phrase ''the disputed reporting is inaccurate because''."
    ]
  }'::jsonb
)
on conflict (category_slug) do update
set
  prompt_version = excluded.prompt_version,
  helper_mode = excluded.helper_mode,
  prompt_payload = excluded.prompt_payload,
  updated_at = timezone('utc', now());

insert into public.cursive_templates (
  category_slug,
  template_version,
  helper_mode,
  template_payload
)
values (
  'credit_bureau_dispute',
  'v1',
  'helper-only',
  '{
    "salutation": "To Whom It May Concern:",
    "closing": "Sincerely,"
  }'::jsonb
)
on conflict (category_slug) do update
set
  template_version = excluded.template_version,
  helper_mode = excluded.helper_mode,
  template_payload = excluded.template_payload,
  updated_at = timezone('utc', now());
