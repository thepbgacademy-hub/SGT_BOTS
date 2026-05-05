insert into bot_definitions (
  bot_id,
  name,
  category,
  capability_manifest,
  active
)
values
  (
    'document_wizard',
    'Document Wizard',
    'documents',
    '{"chat":true,"pdf_upload":true,"structured_form":true,"html_report":true}',
    true
  ),
  (
    'kb_concierge',
    'KB Concierge',
    'knowledge',
    '{"chat":true,"citations":true,"rag_query":true}',
    true
  );
