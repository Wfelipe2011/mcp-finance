## ADDED Requirements

### Requirement: forecast-cron generates one AI message per tenant per day
The system SHALL run a daily cron job at 00:30 BRT that generates a personalized forecast message per tenant by combining current month spending and ML predictions, using the same LLM pattern as `digest-cron`.

#### Scenario: Message generated when predictions exist
- **WHEN** the forecast cron runs and `forecast_predictions` has rows with `status = 'ok'` for the tenant
- **THEN** the cron builds an LLM context with: current month spending by group (Necessidades/Desejos/Poupança), predictions for the next 3 months by group, and 50/30/20 compliance status
- **AND** calls the LLM via `AI_BASE_URL` / `AI_MODEL` with a prompt requesting a 1-2 sentence actionable message in Portuguese
- **AND** saves the result to `forecast_ai_messages` via UPSERT

#### Scenario: Tenant skipped when predictions unavailable
- **WHEN** the forecast cron runs and there are no `forecast_predictions` rows with `status = 'ok'` for the tenant
- **THEN** the cron logs a skip message and does NOT insert into `forecast_ai_messages`

#### Scenario: Error in one tenant does not stop processing others
- **WHEN** the forecast cron encounters an error for a tenant (LLM failure, DB error)
- **THEN** the error is logged and the cron continues to the next tenant
- **AND** no partial state is written for the failed tenant

#### Scenario: Message is concise and actionable
- **WHEN** the LLM generates the forecast message
- **THEN** the prompt instructs the LLM to respond in 1-2 sentences maximum, in Portuguese, with a concrete observation or action item based on the forecast data
