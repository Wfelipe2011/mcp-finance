-- Schema MCP Finance — PostgreSQL 16
-- Todos os timestamps armazenados como TEXT ISO 8601 (Pluggy retorna strings ISO)
-- Valores monetários: NUMERIC(18,4)
-- Arrays/objetos JSON: TEXT (serializado no adapter)
-- Executar via: /docker-entrypoint-initdb.d/01-schema.sql (auto on first start)

-- ────────────────────────────────────────────────
-- tenants (famílias/organizações — multi-tenant)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  email            TEXT NOT NULL UNIQUE,
  password_hash    TEXT NOT NULL,
  pluggy_email     TEXT,
  pluggy_password  TEXT,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login_at    TIMESTAMP
);

-- ────────────────────────────────────────────────
-- workers (agentes AI de enriquecimento)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  ai_base_url   TEXT NOT NULL,
  ai_api_key    TEXT,
  ai_model      TEXT NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'enrich' CHECK (kind IN ('enrich', 'digest', 'forecast')),
  status        TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'busy', 'error', 'offline')),
  error_count   INTEGER NOT NULL DEFAULT 0,
  last_error    TEXT,
  jobs_done     INTEGER NOT NULL DEFAULT 0,
  last_seen_at  TIMESTAMP,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- enrich_jobs (fila de enriquecimento AI por transação)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrich_jobs (
  id             BIGSERIAL PRIMARY KEY,
  tenant_id      UUID NOT NULL REFERENCES tenants(id),
  transaction_id TEXT NOT NULL UNIQUE,
  date           TEXT,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'error')),
  attempts       INTEGER NOT NULL DEFAULT 0,
  worker_id      UUID REFERENCES workers(id),
  started_at     TIMESTAMP,
  finished_at    TIMESTAMP,
  error_msg      TEXT,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrich_jobs_status_tenant_date
  ON enrich_jobs (status, tenant_id, date DESC);

-- ────────────────────────────────────────────────
-- digest_jobs (fila de geração de digest por tenant/mês)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS digest_jobs (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'error', 'skipped')),
  attempts    INTEGER NOT NULL DEFAULT 0,
  worker_id   UUID REFERENCES workers(id),
  started_at  TIMESTAMP,
  finished_at TIMESTAMP,
  error_msg   TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_digest_jobs_status
  ON digest_jobs (status);

-- ────────────────────────────────────────────────
-- forecast_jobs (fila de mensagem diária de forecast)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forecast_jobs (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  job_date    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'error')),
  attempts    INTEGER NOT NULL DEFAULT 0,
  worker_id   UUID REFERENCES workers(id),
  started_at  TIMESTAMP,
  finished_at TIMESTAMP,
  error_msg   TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, job_date)
);

CREATE INDEX IF NOT EXISTS idx_forecast_jobs_status
  ON forecast_jobs (status);

-- ────────────────────────────────────────────────
-- ml_training_jobs (fila de treino ML por tenant)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ml_training_jobs (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'error')),
  attempts    INTEGER NOT NULL DEFAULT 0,
  mae         NUMERIC,
  mape        NUMERIC,
  started_at  TIMESTAMP,
  finished_at TIMESTAMP,
  error_msg   TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_training_jobs_status
  ON ml_training_jobs (status);

-- ────────────────────────────────────────────────
-- items (conexões bancárias)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS items (
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  id               TEXT PRIMARY KEY,
  connector        TEXT,
  status           TEXT,
  execution_status TEXT,
  products         TEXT,
  last_updated_at  TEXT,
  created_at       TEXT,
  updated_at       TEXT,
  synced_at        TEXT NOT NULL
);

-- ────────────────────────────────────────────────
-- accounts (contas bancárias e cartões)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  tenant_id                        UUID NOT NULL REFERENCES tenants(id),
  id                               TEXT PRIMARY KEY,
  item_id                          TEXT NOT NULL REFERENCES items(id),
  type                             TEXT,
  subtype                          TEXT,
  name                             TEXT,
  balance                          NUMERIC(18,4),
  currency_code                    TEXT,
  number                           TEXT,
  owner                            TEXT,
  tax_number                       TEXT,
  marketing_name                   TEXT,
  -- bankData
  transfer_number                  TEXT,
  closing_balance                  NUMERIC(18,4),
  automatically_invested_balance   NUMERIC(18,4),
  overdraft_contracted_limit       NUMERIC(18,4),
  overdraft_used_limit             NUMERIC(18,4),
  unarranged_overdraft_amount      NUMERIC(18,4),
  -- creditData
  cc_level                         TEXT,
  cc_brand                         TEXT,
  cc_balance_due_date              TEXT,
  cc_credit_limit                  NUMERIC(18,4),
  cc_available_credit_limit        NUMERIC(18,4),
  cc_minimum_payment               NUMERIC(18,4),
  cc_balance_foreign_currency      NUMERIC(18,4),
  created_at                       TEXT,
  updated_at                       TEXT,
  synced_at                        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_accounts_item_id ON accounts(item_id);

-- ────────────────────────────────────────────────
-- transactions (transações bancárias e de cartão)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  tenant_id                 UUID NOT NULL REFERENCES tenants(id),
  id                        TEXT PRIMARY KEY,
  account_id                TEXT NOT NULL REFERENCES accounts(id),
  description               TEXT,
  description_raw           TEXT,
  currency_code             TEXT,
  amount                    NUMERIC(18,4),
  amount_in_account_currency NUMERIC(18,4),
  date                      TEXT,
  category                  TEXT,
  category_id               TEXT,
  balance                   NUMERIC(18,4),
  provider_code             TEXT,
  status                    TEXT,
  type                      TEXT,
  operation_type            TEXT,
  provider_id               TEXT,
  "order"                   INTEGER,
  -- paymentData (JSON serializado)
  payment_data              TEXT,
  -- creditCardMetadata
  cc_card_number            TEXT,
  cc_bill_id                TEXT,
  cc_purchase_date          TEXT,
  cc_total_installments     INTEGER,
  cc_installment_number     INTEGER,
  cc_payee_mcc              INTEGER,
  -- outros
  merchant                  TEXT,
  acquirer_data             TEXT,
  created_at                TEXT,
  updated_at                TEXT,
  synced_at                 TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_account_id_date
  ON transactions(account_id, date DESC);

-- ────────────────────────────────────────────────
-- investments (ativos financeiros)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS investments (
  tenant_id              UUID NOT NULL REFERENCES tenants(id),
  id                     TEXT PRIMARY KEY,
  item_id                TEXT NOT NULL REFERENCES items(id),
  name                   TEXT,
  type                   TEXT,
  subtype                TEXT,
  balance                NUMERIC(18,4),
  currency_code          TEXT,
  value                  NUMERIC(18,4),
  quantity               NUMERIC(18,4),
  amount                 NUMERIC(18,4),
  taxes                  NUMERIC(18,4),
  taxes2                 NUMERIC(18,4),
  amount_profit          NUMERIC(18,4),
  amount_withdrawal      NUMERIC(18,4),
  amount_original        NUMERIC(18,4),
  -- taxas e retorno
  last_month_rate        NUMERIC(18,4),
  last_twelve_months_rate NUMERIC(18,4),
  annual_rate            NUMERIC(18,4),
  fixed_annual_rate      NUMERIC(18,4),
  rate                   NUMERIC(18,4),
  rate_type              TEXT,
  -- identificação
  code                   TEXT,
  isin                   TEXT,
  number                 TEXT,
  metadata               TEXT,
  -- emissão
  issuer                 TEXT,
  issuer_cnpj            TEXT,
  issue_date             TEXT,
  purchase_date          TEXT,
  due_date               TEXT,
  date                   TEXT,
  owner                  TEXT,
  institution            TEXT,
  status                 TEXT,
  created_at             TEXT,
  updated_at             TEXT,
  synced_at              TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_investments_item_id ON investments(item_id);

-- ────────────────────────────────────────────────
-- investment_transactions (movimentações de investimento)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS investment_transactions (
  tenant_id                    UUID NOT NULL REFERENCES tenants(id),
  id                           TEXT PRIMARY KEY,
  investment_id                TEXT NOT NULL REFERENCES investments(id),
  description                  TEXT,
  amount                       NUMERIC(18,4),
  value                        NUMERIC(18,4),
  quantity                     NUMERIC(18,4),
  trade_date                   TEXT,
  date                         TEXT,
  type                         TEXT,
  net_amount                   NUMERIC(18,4),
  movement_type                TEXT,
  brokerage_number             TEXT,
  agreed_rate                  NUMERIC(18,4),
  -- expenses
  exp_income_tax               NUMERIC(18,4),
  exp_brokerage_fee            NUMERIC(18,4),
  exp_service_tax              NUMERIC(18,4),
  exp_settlement_fee           NUMERIC(18,4),
  exp_clearing_fee             NUMERIC(18,4),
  exp_stock_exchange_fee       NUMERIC(18,4),
  exp_custody_fee              NUMERIC(18,4),
  exp_operating_fee            NUMERIC(18,4),
  exp_trading_assets_notice_fee NUMERIC(18,4),
  exp_maintenance_fee          NUMERIC(18,4),
  exp_other                    NUMERIC(18,4),
  created_at                   TEXT,
  updated_at                   TEXT,
  synced_at                    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inv_tx_investment_id_date
  ON investment_transactions(investment_id, date DESC);

-- ────────────────────────────────────────────────
-- category_groups (grupos pai de categorias — PT-BR)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS category_groups (
  group_id  TEXT PRIMARY KEY,
  name_pt   TEXT NOT NULL
);

-- ────────────────────────────────────────────────
-- category_labels (categorias Pluggy → PT-BR)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS category_labels (
  category_id  TEXT PRIMARY KEY,
  name_pt      TEXT NOT NULL,
  group_id     TEXT NOT NULL REFERENCES category_groups(group_id)
);

-- ────────────────────────────────────────────────
-- category_overrides (regras de recategorização manual por ILIKE)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS category_overrides (
  id                   SERIAL PRIMARY KEY,
  tenant_id            UUID NOT NULL REFERENCES tenants(id),
  pattern              TEXT NOT NULL,
  category_id_override TEXT NOT NULL REFERENCES category_labels(category_id),
  note                 TEXT,
  priority             INTEGER NOT NULL DEFAULT 100,
  match_count          INTEGER NOT NULL DEFAULT 0,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TEXT NOT NULL DEFAULT (NOW()::TEXT),
  UNIQUE (tenant_id, pattern)
);

-- ────────────────────────────────────────────────
-- transaction_category_overrides (sobrescritas pontuais por transação)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transaction_category_overrides (
  transaction_id  TEXT        NOT NULL REFERENCES transactions(id),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id),
  category_id     TEXT        NOT NULL REFERENCES category_labels(category_id),
  overridden_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (transaction_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_tco_tenant
  ON transaction_category_overrides (tenant_id);

-- seed: category_groups
INSERT INTO category_groups (group_id, name_pt) VALUES
  ('01', 'Receitas'),
  ('02', 'Empréstimos e Financiamentos'),
  ('03', 'Investimentos'),
  ('04', 'Transferência entre Próprias Contas'),
  ('05', 'Transferências'),
  ('06', 'Obrigações Legais'),
  ('07', 'Serviços'),
  ('08', 'Compras'),
  ('09', 'Serviços Digitais'),
  ('10', 'Mercado e Supermercado'),
  ('11', 'Alimentação'),
  ('12', 'Viagem'),
  ('13', 'Doações'),
  ('15', 'Impostos'),
  ('16', 'Tarifas Bancárias'),
  ('17', 'Moradia'),
  ('18', 'Saúde'),
  ('19', 'Transporte'),
  ('20', 'Seguros')
ON CONFLICT DO NOTHING;

-- seed: category_labels (74 categorias Pluggy → PT-BR)
INSERT INTO category_labels (category_id, name_pt, group_id) VALUES
  -- Receitas
  ('01010000', 'Salário',                                    '01'),
  ('01030000', 'Atividades empresariais',                    '01'),
  ('01040000', 'Auxílio governamental',                      '01'),
  ('01050000', 'Renda não recorrente',                       '01'),
  -- Empréstimos e Financiamentos
  ('02000000', 'Empréstimos e financiamentos',               '02'),
  ('02010000', 'Multa e juros por atraso',                   '02'),
  ('02020000', 'Juros cobrados',                             '02'),
  ('02040000', 'Empréstimos',                                '02'),
  -- Investimentos
  ('03000000', 'Investimentos',                              '03'),
  ('03010000', 'Investimento automático',                    '03'),
  ('03020000', 'Renda fixa',                                 '03'),
  ('03060000', 'Rendimentos e dividendos',                   '03'),
  -- Transferência entre Próprias Contas
  ('04000000', 'Transferência entre próprias contas',        '04'),
  ('04010000', 'Transferência entre próprias contas — Saque','04'),
  -- Transferências
  ('05000000', 'Transferências',                             '05'),
  ('05010000', 'Transferência — Boleto',                     '05'),
  ('05060000', 'Transferência interna',                      '05'),
  ('05070000', 'Transferência — PIX',                        '05'),
  ('05080000', 'Transferência — TED',                        '05'),
  ('05090000', 'Transferências a terceiros',                 '05'),
  ('05100000', 'Pagamento de fatura',                        '05'),
  -- Obrigações Legais
  ('06000000', 'Obrigações legais',                          '06'),
  -- Serviços
  ('07000000', 'Serviços',                                   '07'),
  ('07010000', 'Telecomunicações',                           '07'),
  ('07010001', 'Internet',                                   '07'),
  ('07010002', 'Telefone celular',                           '07'),
  ('07020000', 'Educação',                                   '07'),
  ('07020001', 'Cursos online',                              '07'),
  ('07020003', 'Escola',                                     '07'),
  ('07030000', 'Bem-estar e fitness',                        '07'),
  ('07030001', 'Academias e centros de fitness',             '07'),
  ('07030002', 'Prática esportiva',                          '07'),
  ('07040003', 'Cinema, teatro e shows',                     '07'),
  -- Compras
  ('08000000', 'Compras',                                    '08'),
  ('08010000', 'Compras online',                             '08'),
  ('08020000', 'Eletrônicos',                                '08'),
  ('08030000', 'Pet e veterinário',                          '08'),
  ('08040000', 'Roupas e vestuário',                         '08'),
  ('08060000', 'Livraria',                                   '08'),
  ('08070000', 'Artigos esportivos',                         '08'),
  ('08080000', 'Material de escritório',                     '08'),
  ('08090000', 'Cashback',                                   '08'),
  -- Serviços Digitais
  ('09000000', 'Serviços digitais',                          '09'),
  ('09020000', 'Streaming de vídeo',                         '09'),
  -- Mercado e Supermercado
  ('10000000', 'Mercado e supermercado',                     '10'),
  -- Alimentação
  ('11000000', 'Alimentação e bebidas',                      '11'),
  ('11010000', 'Restaurantes',                               '11'),
  ('11020000', 'Delivery de comida',                         '11'),
  -- Viagem
  ('12000000', 'Viagem',                                     '12'),
  ('12020000', 'Hospedagem',                                 '12'),
  -- Doações
  ('13000000', 'Doações',                                    '13'),
  -- Impostos
  ('15000000', 'Impostos',                                   '15'),
  ('15030000', 'Imposto sobre operações financeiras',        '15'),
  -- Tarifas Bancárias
  ('16000000', 'Tarifas bancárias',                          '16'),
  ('16030000', 'Tarifas de cartão de crédito',               '16'),
  -- Moradia
  ('17000000', 'Moradia',                                    '17'),
  ('17010000', 'Aluguel',                                    '17'),
  ('17020002', 'Energia elétrica',                           '17'),
  ('17030000', 'Utensílios domésticos',                      '17'),
  -- Saúde
  ('18000000', 'Saúde',                                      '18'),
  ('18020000', 'Farmácia',                                   '18'),
  ('18040000', 'Hospitais, clínicas e laboratórios',         '18'),
  -- Transporte
  ('19000000', 'Transporte',                                 '19'),
  ('19010000', 'Táxi e aplicativos',                         '19'),
  ('19020000', 'Transporte público',                         '19'),
  ('19030000', 'Aluguel de carro',                           '19'),
  ('19040000', 'Bicicleta',                                  '19'),
  ('19050000', 'Automóvel',                                  '19'),
  ('19050001', 'Postos de combustível',                      '19'),
  ('19050002', 'Estacionamento',                             '19'),
  ('19050003', 'Pedágios e pagamentos em veículo',           '19'),
  ('19050005', 'Manutenção de veículo',                      '19'),
  -- Seguros
  ('20000000', 'Seguros',                                    '20'),
  ('200300000','Plano de saúde',                             '20')
ON CONFLICT DO NOTHING;

-- seed: category_overrides removido — seeds agora são por tenant (ver migration script)

-- ────────────────────────────────────────────────
-- transactions_enriched (camada bronze — classificação de natureza)
-- Repopulada a cada sync via DELETE + INSERT ... SELECT (RLS garante escopo por tenant)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions_enriched (
  -- colunas espelhadas de transactions
  tenant_id                 UUID NOT NULL REFERENCES tenants(id),
  id                        TEXT PRIMARY KEY,
  account_id                TEXT NOT NULL REFERENCES accounts(id),
  description               TEXT,
  description_raw           TEXT,
  currency_code             TEXT,          -- sempre 'BRL' (normalizado no enriquecimento)
  amount                    NUMERIC(18,4), -- sempre em BRL (USD convertido via amount_in_account_currency)
  date                      TEXT,
  category                  TEXT,
  category_id               TEXT,
  status                    TEXT,
  type                      TEXT,
  operation_type            TEXT,
  cc_bill_id                TEXT,
  cc_purchase_date          TEXT,
  cc_total_installments     INTEGER,
  cc_installment_number     INTEGER,
  cc_payee_mcc              INTEGER,
  -- colunas de enriquecimento
  transaction_kind          TEXT NOT NULL,
  peer_account_id           TEXT REFERENCES accounts(id),
  is_real_cashflow          BOOLEAN NOT NULL,
  owner_normalized          TEXT NOT NULL,
  -- colunas de categorização PT-BR (via category_labels + category_groups)
  category_pt               TEXT,
  category_group            TEXT,
  category_group_pt         TEXT
);

CREATE INDEX IF NOT EXISTS idx_tx_enriched_account_id_date
  ON transactions_enriched(account_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_tx_enriched_transaction_kind
  ON transactions_enriched(transaction_kind);

-- ────────────────────────────────────────────────
-- tenant_members (membros da família por tenant)
-- Substitui d_users single-tenant
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_members (
  id            SERIAL PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  name          TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  UNIQUE (tenant_id, name)
);

-- ════════════════════════════════════════════════
-- Row Level Security (RLS) — isolamento por tenant
-- ════════════════════════════════════════════════

-- items
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE items FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON items
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- accounts
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON accounts
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON transactions
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- investments
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON investments
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- investment_transactions
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_transactions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON investment_transactions
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- category_overrides
ALTER TABLE category_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_overrides FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON category_overrides
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- transaction_category_overrides
ALTER TABLE transaction_category_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_category_overrides FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON transaction_category_overrides
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- transactions_enriched
ALTER TABLE transactions_enriched ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions_enriched FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON transactions_enriched
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- tenant_members
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tenant_members
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- ────────────────────────────────────────────────
-- financial_goals (metas financeiras por tenant)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_goals (
  id             SERIAL PRIMARY KEY,
  tenant_id      UUID NOT NULL REFERENCES tenants(id),
  name           TEXT NOT NULL,
  goal_type      TEXT NOT NULL CHECK (goal_type IN ('saving', 'spending')),
  target_amount  NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  category_group TEXT NULL,
  deadline       DATE NULL,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'abandoned')),
  notes          TEXT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_goals_tenant_status
  ON financial_goals (tenant_id, status);

-- financial_goals
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_goals FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON financial_goals
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- Note: enrich_jobs and workers do NOT have RLS — workers need cross-tenant visibility

-- ────────────────────────────────────────────────
-- category_budgets (orçamentos mensais por categoria por tenant)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS category_budgets (
  id             SERIAL PRIMARY KEY,
  tenant_id      UUID NOT NULL REFERENCES tenants(id),
  category_pt    TEXT NOT NULL,
  monthly_limit  NUMERIC(12,2) NOT NULL CHECK (monthly_limit > 0),
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_category_budgets_tenant_category UNIQUE (tenant_id, category_pt)
);

CREATE INDEX IF NOT EXISTS idx_category_budgets_tenant_active
  ON category_budgets (tenant_id, is_active);

-- category_budgets RLS
ALTER TABLE category_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_budgets FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON category_budgets
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- ────────────────────────────────────────────────
-- simulations (cabeçalho de simulação hipotética)
-- ────────────────────────────────────────────────
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
CREATE POLICY tenant_isolation ON simulations
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- ────────────────────────────────────────────────
-- simulation_items (itens de uma simulação)
-- ────────────────────────────────────────────────
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
CREATE POLICY tenant_isolation ON simulation_items
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- ────────────────────────────────────────────────
-- simulation_months (projeção mês a mês materializada)
-- ────────────────────────────────────────────────
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

ALTER TABLE simulation_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_months FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON simulation_months
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- ════════════════════════════════════════════════
-- Application role (non-superuser, RLS-compliant)
-- ════════════════════════════════════════════════
-- The POSTGRES_USER (postgres) is the DDL superuser used only during init.
-- The application connects as 'finance' which has no BYPASSRLS privilege,
-- so all row level security policies apply to it normally.
CREATE ROLE finance WITH LOGIN PASSWORD 'finance' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
GRANT CONNECT ON DATABASE finance TO finance;
GRANT USAGE ON SCHEMA public TO finance;
