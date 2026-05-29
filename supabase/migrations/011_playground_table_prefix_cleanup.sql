alter table if exists users rename to playground_users;
alter table if exists telegram_profiles rename to playground_telegram_profiles;
alter table if exists provider_connections rename to playground_provider_connections;
alter table if exists bot_definitions rename to playground_bot_definitions;
alter table if exists conversations rename to playground_conversations;
alter table if exists messages rename to playground_messages;
alter table if exists uploads rename to playground_uploads;
alter table if exists artifacts rename to playground_artifacts;
alter table if exists audit_events rename to playground_audit_events;

alter index if exists uploads_session_id_idx rename to playground_uploads_session_id_idx;
alter index if exists uploads_bot_id_idx rename to playground_uploads_bot_id_idx;
alter index if exists artifacts_session_id_idx rename to playground_artifacts_session_id_idx;
alter index if exists artifacts_upload_id_idx rename to playground_artifacts_upload_id_idx;
