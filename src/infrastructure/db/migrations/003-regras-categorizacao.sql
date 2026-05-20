-- Migration 003: regras-categorizacao
-- Cria transaction_category_overrides para overrides pontuais de categoria
-- e adiciona is_active em category_overrides

-- ── is_active em category_overrides ──────────────────────────────────────────
ALTER TABLE category_overrides
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ── transaction_category_overrides ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transaction_category_overrides (
  transaction_id  TEXT        NOT NULL REFERENCES transactions(id),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id),
  category_id     TEXT        NOT NULL REFERENCES category_labels(category_id),
  overridden_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (transaction_id, tenant_id)
);

-- Índice de suporte para queries por tenant
CREATE INDEX IF NOT EXISTS idx_tco_tenant
  ON transaction_category_overrides (tenant_id);

-- Row Level Security (padrão do projeto)
ALTER TABLE transaction_category_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_category_overrides FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON transaction_category_overrides;

CREATE POLICY tenant_isolation ON transaction_category_overrides
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
