-- Forecast Layer — ML Predictions Storage
-- change: forecast-ml-worker
-- Tabelas para armazenar predições geradas pelo ml-trainer Python pod
-- Não modifica bronze, silver, nem gold layers existentes

-- ────────────────────────────────────────────────
-- forecast_predictions
-- Predições de gastos mensais por tenant × categoria × mês futuro
-- Grain: (tenant_id, category_pt, target_year, target_month)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forecast_predictions (
  id               BIGSERIAL PRIMARY KEY,
  tenant_id        UUID    NOT NULL REFERENCES tenants(id),
  category_pt      TEXT    NOT NULL,
  group_pt         TEXT    NOT NULL,
  target_year      INTEGER NOT NULL,
  target_month     INTEGER NOT NULL,
  predicted_amount NUMERIC(18,2) NOT NULL,
  lower_bound      NUMERIC(18,2) NOT NULL,
  upper_bound      NUMERIC(18,2) NOT NULL,
  model_version    TEXT    NOT NULL DEFAULT 'v1',
  status           TEXT    NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'insufficient_data')),
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, category_pt, target_year, target_month)
);

CREATE INDEX IF NOT EXISTS idx_forecast_predictions_tenant_month
  ON forecast_predictions (tenant_id, target_year, target_month);

-- ────────────────────────────────────────────────
-- forecast_model_meta
-- Metadados de cada ciclo de treinamento por tenant
-- Grain: (tenant_id, trained_at) — append-only, sem UNIQUE
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forecast_model_meta (
  id                BIGSERIAL PRIMARY KEY,
  tenant_id         UUID    NOT NULL REFERENCES tenants(id),
  trained_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  months_of_history INTEGER,
  num_categories    INTEGER,
  mae               NUMERIC(18,4),
  mape              NUMERIC(18,4),
  status            TEXT    NOT NULL CHECK (status IN ('ok', 'insufficient_data', 'error')),
  error_message     TEXT
);

CREATE INDEX IF NOT EXISTS idx_forecast_model_meta_tenant
  ON forecast_model_meta (tenant_id, trained_at DESC);

-- ────────────────────────────────────────────────
-- forecast_ai_messages
-- Mensagens diárias geradas pelo LLM por tenant
-- Grain: (tenant_id, message_date) — UPSERT diário
-- change: forecast-ai-messages
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forecast_ai_messages (
  id            BIGSERIAL PRIMARY KEY,
  tenant_id     UUID      NOT NULL REFERENCES tenants(id),
  message_date  DATE      NOT NULL,
  message_pt    TEXT      NOT NULL,
  context_json  JSONB     NOT NULL DEFAULT '{}',
  model_version TEXT      NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, message_date)
);

CREATE INDEX IF NOT EXISTS idx_forecast_ai_messages_tenant_date
  ON forecast_ai_messages (tenant_id, message_date DESC);

ALTER TABLE forecast_ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY forecast_ai_messages_tenant_isolation
  ON forecast_ai_messages
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ────────────────────────────────────────────────
-- Grants para a role 'finance' (para acesso via api-server em changes futuras)
-- ────────────────────────────────────────────────
GRANT ALL ON TABLE forecast_predictions TO finance;
GRANT ALL ON TABLE forecast_model_meta  TO finance;
GRANT ALL ON TABLE forecast_ai_messages TO finance;
GRANT ALL ON SEQUENCE forecast_predictions_id_seq    TO finance;
GRANT ALL ON SEQUENCE forecast_model_meta_id_seq     TO finance;
GRANT ALL ON SEQUENCE forecast_ai_messages_id_seq    TO finance;
