-- Migration 004: simulacao-financeira
-- Cria tabelas simulations, simulation_items, simulation_months com RLS por tenant_id
-- Safe to run on existing databases (uses IF NOT EXISTS)

-- ── simulations ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS simulations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id),
  name              TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  horizon_months    INTEGER     NOT NULL CHECK (horizon_months BETWEEN 1 AND 24),
  llm_message       TEXT,
  llm_model         TEXT,
  llm_generated_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulations_tenant_id
  ON simulations (tenant_id, created_at DESC);

ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON simulations;
CREATE POLICY tenant_isolation ON simulations
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- ── simulation_items ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS simulation_items (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id             UUID        NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  tenant_id                 UUID        NOT NULL REFERENCES tenants(id),
  item_type                 TEXT        NOT NULL CHECK (item_type IN ('new_purchase', 'recurring', 'income_adjustment', 'exclusion')),
  label                     TEXT        NOT NULL,
  category_pt               TEXT,
  total_amount              NUMERIC(18,4),
  installments              INTEGER,
  monthly_amount            NUMERIC(18,4),
  is_exclusion              BOOLEAN     NOT NULL DEFAULT false,
  excluded_transaction_ids  TEXT[],
  direction                 TEXT        CHECK (direction IN ('income', 'expense'))
);

CREATE INDEX IF NOT EXISTS idx_simulation_items_simulation_id
  ON simulation_items (simulation_id);

CREATE INDEX IF NOT EXISTS idx_simulation_items_tenant_id
  ON simulation_items (tenant_id);

ALTER TABLE simulation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON simulation_items;
CREATE POLICY tenant_isolation ON simulation_items
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- ── simulation_months ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS simulation_months (
  simulation_id   UUID          NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  tenant_id       UUID          NOT NULL REFERENCES tenants(id),
  month_offset    INTEGER       NOT NULL,
  year            INTEGER       NOT NULL,
  month           INTEGER       NOT NULL,
  total_income    NUMERIC(18,4) NOT NULL,
  total_expenses  NUMERIC(18,4) NOT NULL,
  balance         NUMERIC(18,4) NOT NULL,
  PRIMARY KEY (simulation_id, month_offset)
);

CREATE INDEX IF NOT EXISTS idx_simulation_months_simulation_id
  ON simulation_months (simulation_id);

ALTER TABLE simulation_months ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE simulation_months sm
SET tenant_id = s.tenant_id
FROM simulations s
WHERE sm.simulation_id = s.id
  AND sm.tenant_id IS NULL;
ALTER TABLE simulation_months ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE simulation_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_months FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON simulation_months;
CREATE POLICY tenant_isolation ON simulation_months
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

GRANT SELECT, INSERT, UPDATE, DELETE ON simulations, simulation_items, simulation_months TO finance;
