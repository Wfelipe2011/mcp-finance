-- Silver Layer — Facts
-- change: silver-facts
-- Views de fatos do star schema sobre o bronze layer
-- Não modifica tabelas bronze; apenas SELECT sobre elas

-- ────────────────────────────────────────────────
-- f_transacoes  (tabela fato completa de transações)
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW f_transacoes AS
SELECT
  te.id                                               AS transaction_id,
  te.account_id,
  u.id                                                AS user_id,
  te.category_id,
  -- data normalizada para timezone BRT
  (te.date::TIMESTAMP AT TIME ZONE 'UTC'
    AT TIME ZONE 'America/Sao_Paulo')::DATE           AS date_day,
  -- valor com sinal da perspectiva do bolso familiar
  CASE te.transaction_kind
    WHEN 'EXPENSE'  THEN -ABS(te.amount)
    WHEN 'INCOME'   THEN  ABS(te.amount)
    WHEN 'INVEST'   THEN -ABS(te.amount)
    ELSE                 te.amount          -- TRANSFER: mantém sinal original
  END                                                 AS amount_signed,
  te.amount                                           AS amount_raw,
  te.transaction_kind,
  te.is_real_cashflow,
  te.description,
  te.category_pt,
  te.category_group,
  te.category_group_pt,
  te.owner_normalized
FROM transactions_enriched te
INNER JOIN d_users u ON u.name = te.owner_normalized;

-- ────────────────────────────────────────────────
-- f_fluxo_caixa  (subset: apenas transações de caixa real)
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW f_fluxo_caixa AS
SELECT *
FROM f_transacoes
WHERE is_real_cashflow = true;

-- ────────────────────────────────────────────────
-- f_investimentos  (movimentações de investimento)
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW f_investimentos AS
SELECT
  it.id                                                     AS investment_transaction_id,
  it.investment_id,
  inv.item_id,
  inv.name                                                  AS investment_name,
  inv.type                                                  AS investment_type,
  inv.subtype                                               AS investment_subtype,
  LOWER(inv.owner)                                          AS owner_normalized,
  it.type                                                   AS movement_type,
  it.description,
  it.amount,
  COALESCE(it.net_amount, it.amount)                        AS net_amount,
  (it.date::TIMESTAMP AT TIME ZONE 'UTC'
    AT TIME ZONE 'America/Sao_Paulo')::DATE                 AS date_day
FROM investment_transactions it
INNER JOIN investments inv ON inv.id = it.investment_id;
