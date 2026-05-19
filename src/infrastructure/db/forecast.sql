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

-- ────────────────────────────────────────────────
-- daily_habit_signals (VIEW)
-- Sinais de hábitos diários por tenant × dia-da-semana × dia-do-mês × categoria
-- Grain: (tenant_id, day_of_week, day_of_month, category_pt, group_pt)
-- change: daily-ml-insights / task 1.1
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW daily_habit_signals AS
SELECT
  tm.tenant_id,
  EXTRACT(DOW FROM te.date::date)::int                                    AS day_of_week,
  EXTRACT(DAY FROM te.date::date)::int                                    AS day_of_month,
  COALESCE(te.category_pt, 'Sem Categoria')                              AS category_pt,
  COALESCE(te.category_group_pt, 'Sem Grupo')                            AS group_pt,
  COUNT(*)                                                                AS occurrences,
  AVG(ABS(te.amount))                                                     AS avg_amount,
  STDDEV(ABS(te.amount))                                                  AS std_amount,
  COUNT(*) FILTER (WHERE te.date::date >= NOW() - INTERVAL '6 months')   AS occurrences_6m
FROM transactions_enriched te
JOIN tenant_members tm ON tm.name = te.owner_normalized AND tm.tenant_id = te.tenant_id
WHERE te.amount < 0
GROUP BY tm.tenant_id, day_of_week, day_of_month, category_pt, group_pt
HAVING COUNT(*) >= 3;

GRANT SELECT ON daily_habit_signals TO finance;

-- ────────────────────────────────────────────────
-- forecast_daily_predictions
-- Predições diárias de gastos por tenant × data × categoria
-- Grain: (tenant_id, prediction_date, category_pt)
-- change: daily-ml-insights / task 1.2
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forecast_daily_predictions (
  id               BIGSERIAL PRIMARY KEY,
  tenant_id        UUID          NOT NULL REFERENCES tenants(id),
  prediction_date  DATE          NOT NULL,
  category_pt      TEXT          NOT NULL,
  group_pt         TEXT          NOT NULL,
  predicted_amount NUMERIC(18,2) NOT NULL,
  lower_bound      NUMERIC(18,2) NOT NULL,
  upper_bound      NUMERIC(18,2) NOT NULL,
  probability      NUMERIC(5,4)  NOT NULL,
  model_version    TEXT          NOT NULL DEFAULT 'v1',
  created_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, prediction_date, category_pt)
);

CREATE INDEX IF NOT EXISTS idx_forecast_daily_predictions_tenant_date
  ON forecast_daily_predictions (tenant_id, prediction_date);

GRANT ALL ON TABLE    forecast_daily_predictions          TO finance;
GRANT ALL ON SEQUENCE forecast_daily_predictions_id_seq   TO finance;

-- ────────────────────────────────────────────────
-- daily_insight_jobs
-- Fila de jobs de geração de insights diários por tenant
-- Grain: (tenant_id, job_date)
-- change: daily-ml-insights / task 1.3
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_insight_jobs (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   UUID      NOT NULL REFERENCES tenants(id),
  job_date    DATE      NOT NULL,
  status      TEXT      NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'error')),
  attempts    INTEGER   NOT NULL DEFAULT 0,
  started_at  TIMESTAMP,
  finished_at TIMESTAMP,
  error_msg   TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, job_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_insight_jobs_status ON daily_insight_jobs (status);

-- Sem RLS: daily_insight_jobs é fila de sistema (como forecast_jobs e digest_jobs).
-- Isolamento por tenant_id é feito na lógica do worker/admin, não via RLS.
GRANT ALL ON TABLE    daily_insight_jobs          TO finance;
GRANT ALL ON SEQUENCE daily_insight_jobs_id_seq   TO finance;

-- ────────────────────────────────────────────────
-- forecast_user_feedback
-- Avaliações do usuário sobre predições individuais
-- Grain: (tenant_id, prediction_id)
-- change: daily-ml-insights / task 1.3
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forecast_user_feedback (
  id             BIGSERIAL PRIMARY KEY,
  tenant_id      UUID   NOT NULL REFERENCES tenants(id),
  prediction_id  BIGINT NOT NULL REFERENCES forecast_predictions(id),
  rating         TEXT   NOT NULL CHECK (rating IN ('up', 'down')),
  correction_tag TEXT   CHECK (correction_tag IN ('Viagem', 'Evento especial', 'Mudança de hábito', 'Outra situação atípica')),
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, prediction_id)
);

ALTER TABLE forecast_user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY forecast_user_feedback_tenant_isolation
  ON forecast_user_feedback
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

GRANT ALL ON TABLE    forecast_user_feedback          TO finance;
GRANT ALL ON SEQUENCE forecast_user_feedback_id_seq   TO finance;

-- ────────────────────────────────────────────────
-- Migration aditiva: forecast_ai_messages — adicionar message_type
-- change: daily-ml-insights / task 1.3
-- ────────────────────────────────────────────────
ALTER TABLE forecast_ai_messages ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'monthly';

ALTER TABLE forecast_ai_messages ADD CONSTRAINT forecast_ai_messages_message_type_check
  CHECK (message_type IN ('monthly', 'daily_insight'));

ALTER TABLE forecast_ai_messages DROP CONSTRAINT IF EXISTS forecast_ai_messages_tenant_id_message_date_key;

ALTER TABLE forecast_ai_messages ADD CONSTRAINT forecast_ai_messages_tenant_date_type_unique
  UNIQUE (tenant_id, message_date, message_type);

-- ────────────────────────────────────────────────
-- forecast_model_versions
-- Versões do modelo diário por tenant
-- change: ml-daily-trainer / task 1.1
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forecast_model_versions (
  id                    BIGSERIAL PRIMARY KEY,
  tenant_id             UUID      NOT NULL REFERENCES tenants(id),
  version_name          TEXT      NOT NULL,
  file_path             TEXT,
  status                TEXT      NOT NULL DEFAULT 'staging' CHECK (status IN ('staging','production','archived')),
  mae                   NUMERIC(18,4),
  mape                  NUMERIC(18,4),
  accuracy_pct          NUMERIC(5,4),
  num_train             INTEGER,
  num_test              INTEGER,
  exclusions_applied    JSONB     NOT NULL DEFAULT '[]',
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  activated_at          TIMESTAMP,
  archived_at           TIMESTAMP,
  UNIQUE (tenant_id, version_name)
);

CREATE INDEX IF NOT EXISTS idx_forecast_model_versions_tenant_status
  ON forecast_model_versions (tenant_id, status);

ALTER TABLE forecast_model_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY forecast_model_versions_tenant_isolation
  ON forecast_model_versions
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

GRANT ALL ON TABLE    forecast_model_versions          TO finance;
GRANT ALL ON SEQUENCE forecast_model_versions_id_seq   TO finance;

-- ────────────────────────────────────────────────
-- forecast_daily_test_results
-- Conjunto de teste do split 80/20 por versão de modelo
-- change: ml-daily-trainer / task 1.2
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forecast_daily_test_results (
  id                BIGSERIAL PRIMARY KEY,
  tenant_id         UUID          NOT NULL REFERENCES tenants(id),
  version_name      TEXT          NOT NULL,
  transaction_date  DATE          NOT NULL,
  category_pt       TEXT          NOT NULL,
  group_pt          TEXT          NOT NULL,
  predicted_amount  NUMERIC(18,2) NOT NULL,
  actual_amount     NUMERIC(18,2) NOT NULL,
  deviation_pct     NUMERIC(10,4) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_forecast_daily_test_results_tenant_version
  ON forecast_daily_test_results (tenant_id, version_name);

ALTER TABLE forecast_daily_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY forecast_daily_test_results_tenant_isolation
  ON forecast_daily_test_results
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

GRANT ALL ON TABLE    forecast_daily_test_results          TO finance;
GRANT ALL ON SEQUENCE forecast_daily_test_results_id_seq   TO finance;

-- ────────────────────────────────────────────────
-- forecast_category_exclusions
-- Categorias excluídas globalmente do treinamento por tenant
-- change: ml-daily-trainer / task 1.3
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forecast_category_exclusions (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id    UUID      NOT NULL REFERENCES tenants(id),
  category_pt  TEXT      NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, category_pt)
);

ALTER TABLE forecast_category_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY forecast_category_exclusions_tenant_isolation
  ON forecast_category_exclusions
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

GRANT ALL ON TABLE    forecast_category_exclusions          TO finance;
GRANT ALL ON SEQUENCE forecast_category_exclusions_id_seq   TO finance;

-- ────────────────────────────────────────────────
-- forecast_daily_exclusions
-- Pares (date, category) excluídos do treino via feedback 👎
-- change: ml-daily-trainer / task 1.4
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forecast_daily_exclusions (
  id               BIGSERIAL PRIMARY KEY,
  tenant_id        UUID      NOT NULL REFERENCES tenants(id),
  transaction_date DATE      NOT NULL,
  category_pt      TEXT      NOT NULL,
  correction_tag   TEXT      CHECK (correction_tag IN ('Viagem','Evento especial','Mudança de hábito','Outra situação atípica')),
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, transaction_date, category_pt)
);

ALTER TABLE forecast_daily_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY forecast_daily_exclusions_tenant_isolation
  ON forecast_daily_exclusions
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

GRANT ALL ON TABLE    forecast_daily_exclusions          TO finance;
GRANT ALL ON SEQUENCE forecast_daily_exclusions_id_seq   TO finance;

-- ────────────────────────────────────────────────
-- forecast_monthly_projection (VIEW)
-- Projeção mensal de gastos por (category_pt, group_pt) para os próximos 3 meses
-- Usa regressão linear (REGR_SLOPE) sobre cube_gastos_mensais (últimos 6 meses)
-- Grain: (target_year, target_month, category_pt, group_pt)
-- change: forecast-sql-views
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW forecast_monthly_projection WITH (security_invoker = true) AS
WITH historico AS (
  SELECT
    category_pt,
    group_pt,
    year,
    month,
    (year * 12 + month)::int AS month_epoch,
    SUM(total_gastos)        AS total_gastos
  FROM cube_gastos_mensais
  WHERE (year * 12 + month) >= (
    EXTRACT(YEAR FROM NOW())::int * 12 + EXTRACT(MONTH FROM NOW())::int - 5
  )
  GROUP BY category_pt, group_pt, year, month
),
tendencia AS (
  SELECT
    category_pt,
    group_pt,
    REGR_SLOPE(total_gastos::float8, month_epoch::float8)     AS slope,
    REGR_INTERCEPT(total_gastos::float8, month_epoch::float8) AS intercept,
    AVG(total_gastos)                                          AS avg_amount,
    STDDEV(total_gastos)                                       AS std_amount
  FROM historico
  GROUP BY category_pt, group_pt
  HAVING AVG(total_gastos) > 0
),
meses_futuros AS (
  SELECT
    EXTRACT(YEAR  FROM gs)::int                                     AS target_year,
    EXTRACT(MONTH FROM gs)::int                                     AS target_month,
    EXTRACT(YEAR  FROM gs)::int * 12 + EXTRACT(MONTH FROM gs)::int AS target_epoch
  FROM generate_series(
    DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
    DATE_TRUNC('month', NOW()) + INTERVAL '3 months',
    INTERVAL '1 month'
  ) gs
)
SELECT
  t.category_pt,
  t.group_pt,
  f.target_year,
  f.target_month,
  GREATEST(
    0,
    COALESCE(t.slope, 0) * f.target_epoch + COALESCE(t.intercept, t.avg_amount)
  )::numeric(18,2)                                                          AS predicted_amount,
  GREATEST(
    0,
    COALESCE(t.slope, 0) * f.target_epoch + COALESCE(t.intercept, t.avg_amount)
    - COALESCE(t.std_amount, 0)
  )::numeric(18,2)                                                          AS lower_bound,
  GREATEST(
    0,
    COALESCE(t.slope, 0) * f.target_epoch + COALESCE(t.intercept, t.avg_amount)
    + COALESCE(t.std_amount, 0)
  )::numeric(18,2)                                                          AS upper_bound
FROM tendencia t
CROSS JOIN meses_futuros f;

GRANT SELECT ON forecast_monthly_projection TO finance;
