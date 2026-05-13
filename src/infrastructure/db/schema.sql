-- Schema MCP Finance — PostgreSQL 16
-- Todos os timestamps armazenados como TEXT ISO 8601 (Pluggy retorna strings ISO)
-- Valores monetários: NUMERIC(18,4)
-- Arrays/objetos JSON: TEXT (serializado no adapter)
-- Executar via: /docker-entrypoint-initdb.d/01-schema.sql (auto on first start)

-- ────────────────────────────────────────────────
-- items (conexões bancárias)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS items (
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
-- identities (dados pessoais por conexão)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS identities (
  id                           TEXT PRIMARY KEY,
  item_id                      TEXT NOT NULL UNIQUE REFERENCES items(id),
  full_name                    TEXT,
  birth_date                   TEXT,
  tax_number                   TEXT,
  document                     TEXT,
  document_type                TEXT,
  job_title                    TEXT,
  company_name                 TEXT,
  phone_numbers                TEXT,
  emails                       TEXT,
  addresses                    TEXT,
  relations                    TEXT,
  investor_profile             TEXT,
  establishment_code           TEXT,
  establishment_name           TEXT,
  -- financialRelationships
  fr_start_date                TEXT,
  fr_products_services_type    TEXT,
  fr_procurators               TEXT,
  fr_accounts                  TEXT,
  -- qualifications
  qual_company_cnpj            TEXT,
  qual_informed_income_amount  NUMERIC(18,4),
  qual_informed_income_frequency TEXT,
  qual_informed_income_date    TEXT,
  created_at                   TEXT,
  updated_at                   TEXT,
  synced_at                    TEXT NOT NULL
);

