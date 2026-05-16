# forecast-ai-messages-schema Specification

## Purpose
TBD - created by archiving change forecast-ai-messages. Update Purpose after archive.
## Requirements
### Requirement: forecast_ai_messages table stores one AI message per tenant per day
The system SHALL provide a Postgres table `forecast_ai_messages` that stores daily AI-generated forecast messages per tenant, with UPSERT semantics.

#### Scenario: Table structure supports daily messages per tenant
- **WHEN** the forecast cron inserts a message for a tenant
- **THEN** `forecast_ai_messages` contains a row with columns: `id`, `tenant_id`, `message_date`, `message_pt`, `context_json`, `model_version`, `created_at`
- **AND** the primary key (or unique constraint) is `(tenant_id, message_date)`

#### Scenario: UPSERT overwrites existing message for same day
- **WHEN** the forecast cron runs twice on the same day for the same tenant
- **THEN** the existing message is overwritten (not duplicated)

