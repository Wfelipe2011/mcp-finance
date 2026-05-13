-- =============================================================================
-- Gold-AI Layer: tabelas para enriquecimento semântico via LLM
-- Aplicar: psql -U finance -d finance -f src/infrastructure/db/gold-ai.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ai_transaction_insights
-- Enriquecimento semântico linha a linha via Gemma 3 (Ollama local)
-- Populado pelo pipeline gold-ai-agent (change separada)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_transaction_insights (
  transaction_id    TEXT PRIMARY KEY REFERENCES transactions_enriched(id),
  merchant_name     TEXT,           -- "Netflix", "Amazon Web Services"
  merchant_country  TEXT,           -- "BR", "US"
  is_recurring      BOOLEAN,        -- assinatura detectada
  recurrence_period TEXT,           -- "monthly", "annual", "unknown"
  expense_context   TEXT,           -- "work" | "personal" | "shared" | "debt"
  is_debt_related   BOOLEAN,        -- empréstimo/amortização detectado (D5)
  anomaly_score     NUMERIC(3,2),   -- 0.00 a 1.00
  tags              TEXT[],         -- ['assinatura', 'tech', 'streaming']
  category_hint     TEXT,           -- sugestão de categoria mais específica
  raw_response      JSONB,          -- resposta completa do LLM para auditoria
  analyzed_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  model_version     TEXT NOT NULL   -- "gemma3:4b"
);

-- Índice para queries de auditoria e filtragem por data de análise
CREATE INDEX IF NOT EXISTS idx_ai_insights_analyzed_at
  ON ai_transaction_insights (analyzed_at);

-- ---------------------------------------------------------------------------
-- ai_monthly_digest
-- Análise narrativa de mês completo — consumida diretamente pelo agente via MCP
-- Populado por digest_month(year, month) (change gold-ai-agent)
-- Input: ai_transaction_insights já enriquecido (não o bronze direto)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_monthly_digest (
  year                 INT,
  month                INT,
  PRIMARY KEY (year, month),

  -- métricas calculadas pelo LLM com base nos insights linha a linha
  cashflow_real        NUMERIC(18,2),  -- receitas reais − entradas de dívida
  debt_inflows         NUMERIC(18,2),  -- total de empréstimos/depósitos de dívida recebidos
  debt_payments        NUMERIC(18,2),  -- total de amortizações pagas

  -- narrativa dual: usuário + agente
  narrative_pt         TEXT,           -- texto fluido em português para o usuário ler
  structured_summary   JSONB,          -- JSON estruturado para o agente LLM via MCP

  -- flags e anomalias
  flags                TEXT[],         -- ex: ['emprestimo_detectado', 'gastos_atipicos']
  notable_expenses     JSONB,          -- top transações anômalas do mês

  -- metadados de qualidade
  enrichment_coverage  NUMERIC(5,2),   -- % das tx do mês com ai_insights ao rodar o digest
  model_version        TEXT,
  digest_at            TIMESTAMP NOT NULL DEFAULT NOW()
);
