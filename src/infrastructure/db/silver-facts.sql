-- Silver Layer — Facts
-- change: silver-facts
-- Views de fatos do star schema sobre o bronze layer
-- Não modifica tabelas bronze; apenas SELECT sobre elas

-- ────────────────────────────────────────────────
-- f_transacoes  (tabela fato completa de transações)
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW f_transacoes WITH (security_invoker = true) AS
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
INNER JOIN tenant_members u ON u.name = te.owner_normalized;

-- ────────────────────────────────────────────────
-- f_parcelas  (subset: transações com campos de parcelamento estruturado)
-- Grain: (transaction_id) — uma linha por parcela registrada pelo Pluggy
-- Inclui colunas derivadas para classificação de parcelamento
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW f_parcelas WITH (security_invoker = true) AS
SELECT
  te.id                                               AS transaction_id,
  te.account_id,
  u.id                                                AS user_id,
  te.category_id,
  -- data normalizada para timezone BRT (igual a f_transacoes)
  (te.date::TIMESTAMP AT TIME ZONE 'UTC'
    AT TIME ZONE 'America/Sao_Paulo')::DATE           AS date_day,
  -- data original da compra (pode diferir da data de cobrança da parcela)
  (te.cc_purchase_date::TIMESTAMP AT TIME ZONE 'UTC'
    AT TIME ZONE 'America/Sao_Paulo')::DATE           AS purchase_day,
  te.amount                                           AS amount,
  te.transaction_kind,
  te.is_real_cashflow,
  te.description,
  te.category_pt,
  te.category_group,
  te.category_group_pt,
  te.owner_normalized,
  -- campos estruturados de parcelamento
  te.cc_installment_number                            AS installment_number,
  te.cc_total_installments                            AS total_installments,
  -- colunas derivadas
  TRUE                                                AS is_installment,
  (te.cc_installment_number = 1)                      AS is_first_installment,
  (te.cc_total_installments - te.cc_installment_number) AS installments_remaining
FROM transactions_enriched te
INNER JOIN tenant_members u ON u.name = te.owner_normalized
WHERE te.cc_total_installments IS NOT NULL;

-- ────────────────────────────────────────────────
-- f_fluxo_caixa  (subset: apenas transações de caixa real)
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW f_fluxo_caixa WITH (security_invoker = true) AS
SELECT *
FROM f_transacoes
WHERE is_real_cashflow = true;

-- ────────────────────────────────────────────────
-- f_investimentos  (movimentações de investimento)
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW f_investimentos WITH (security_invoker = true) AS
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

-- ────────────────────────────────────────────────
-- f_parcelas_futuras
-- Projeção temporal de parcelas futuras usando generate_series
-- Grain: (purchase_day, account_id, total_installments, amount, installment_seq)
-- Para cada compra parcelada em aberto, gera uma linha por parcela ainda não registrada
-- A data de vencimento é aproximada (~30 dias por parcela a partir da parcela atual)
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW f_parcelas_futuras WITH (security_invoker = true) AS
WITH last_installment AS (
  -- Pega o último registro de cada compra parcelada (MAX installment_number por compra)
  SELECT DISTINCT ON (purchase_day, account_id, total_installments, ROUND(amount::NUMERIC, 2))
    description,
    purchase_day,
    account_id,
    owner_normalized,
    category_pt,
    category_group_pt,
    installment_number                            AS last_installment_number,
    total_installments,
    (total_installments - installment_number)     AS installments_remaining,
    amount
  FROM f_parcelas
  WHERE installments_remaining > 0
  ORDER BY purchase_day, account_id, total_installments, ROUND(amount::NUMERIC, 2),
           installment_number DESC
)
SELECT
  DATE_TRUNC('month',
    purchase_day + (last_installment_number + gs.n) * INTERVAL '30 days'
  )::DATE                              AS projected_month,
  gs.n                                 AS installment_seq,
  amount                               AS installment_amount,
  description,
  owner_normalized,
  category_pt,
  category_group_pt,
  account_id,
  total_installments,
  installments_remaining
FROM last_installment
CROSS JOIN LATERAL generate_series(1, installments_remaining) AS gs(n);
