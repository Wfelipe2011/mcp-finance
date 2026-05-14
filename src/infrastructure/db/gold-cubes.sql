-- Gold Layer — OLAP Cubes
-- change: gold-cubes
-- Views analíticas sobre o silver layer (f_transacoes, f_fluxo_caixa, f_investimentos, d_*)
-- Não cria tabelas; não modifica bronze nem silver

-- ────────────────────────────────────────────────
-- cube_gastos_mensais
-- Gastos por mês × categoria × membro da família
-- Grain: (year, month, category_pt, group_pt, display_name)
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW cube_gastos_mensais AS
SELECT
  dd.year,
  dd.month,
  dd.month_name_pt,
  COALESCE(dc.group_pt,   fc.category_group_pt, 'Sem Grupo') AS group_pt,
  COALESCE(dc.category_pt, fc.category_pt,       'Sem Categoria') AS category_pt,
  du.display_name,
  COUNT(*)                                                   AS num_transacoes,
  ROUND(SUM(ABS(fc.amount_signed))::NUMERIC, 2)              AS total_gastos
FROM f_fluxo_caixa fc
INNER JOIN d_data  dd ON dd.data        = fc.date_day
INNER JOIN d_users du ON du.id          = fc.user_id
LEFT  JOIN d_categoria dc ON dc.category_id = fc.category_id
WHERE fc.transaction_kind = 'EXPENSE'
GROUP BY
  dd.year, dd.month, dd.month_name_pt,
  COALESCE(dc.group_pt,    fc.category_group_pt, 'Sem Grupo'),
  COALESCE(dc.category_pt, fc.category_pt,       'Sem Categoria'),
  du.display_name;

-- ────────────────────────────────────────────────
-- cube_cashflow_mensal
-- Receitas, despesas e saldo líquido por mês
-- Grain: (year, month)
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW cube_cashflow_mensal AS
SELECT
  dd.year,
  dd.month,
  dd.month_name_pt,
  ROUND(SUM(fc.amount_signed)  FILTER (WHERE fc.transaction_kind = 'INCOME')::NUMERIC, 2)  AS total_receitas,
  ROUND(SUM(ABS(fc.amount_signed)) FILTER (WHERE fc.transaction_kind = 'EXPENSE')::NUMERIC, 2) AS total_despesas,
  ROUND(
    SUM(fc.amount_signed)  FILTER (WHERE fc.transaction_kind = 'INCOME')::NUMERIC
    - SUM(ABS(fc.amount_signed)) FILTER (WHERE fc.transaction_kind = 'EXPENSE')::NUMERIC,
    2
  ) AS saldo_liquido,
  COUNT(*) FILTER (WHERE fc.transaction_kind = 'INCOME')  AS num_receitas,
  COUNT(*) FILTER (WHERE fc.transaction_kind = 'EXPENSE') AS num_despesas,
  ROUND(SUM(ABS(te.amount)) FILTER (
    WHERE fc.transaction_kind = 'INCOME' AND te.operation_type = 'OPERACAO_CREDITO'
  )::NUMERIC, 2) AS total_emprestimos,
  ROUND((
    SUM(fc.amount_signed) FILTER (WHERE fc.transaction_kind = 'INCOME')
    - COALESCE(SUM(ABS(te.amount)) FILTER (WHERE fc.transaction_kind = 'INCOME' AND te.operation_type = 'OPERACAO_CREDITO'), 0)
  )::NUMERIC, 2) AS total_receitas_operacionais
FROM f_fluxo_caixa fc
INNER JOIN d_data dd ON dd.data = fc.date_day
LEFT JOIN transactions_enriched te ON te.id = fc.transaction_id
GROUP BY dd.year, dd.month, dd.month_name_pt
ORDER BY dd.year, dd.month;

-- ────────────────────────────────────────────────
-- cube_patrimonio
-- Snapshot atual de saldos e limites por conta/banco/dono
-- Grain: (account_id) — uma linha por conta
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW cube_patrimonio AS
SELECT
  dc.account_id,
  dc.nome,
  dc.tipo,
  dc.subtipo,
  dc.banco,
  dc.dono,
  dc.moeda,
  a.balance                   AS saldo_atual,
  dc.limite_credito,
  CASE
    WHEN dc.tipo = 'CREDIT' THEN dc.limite_credito - ABS(COALESCE(a.balance, 0))
    ELSE NULL
  END                         AS credito_disponivel
FROM d_conta dc
INNER JOIN accounts a ON a.id = dc.account_id;

-- ────────────────────────────────────────────────
-- cube_gastos_grupo_mensal
-- Gastos por mês × grupo (família consolidada, visão macro)
-- Grain: (year, month, group_pt)
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW cube_gastos_grupo_mensal AS
SELECT
  year,
  month,
  month_name_pt,
  group_pt,
  SUM(num_transacoes)                                                    AS num_transacoes,
  ROUND(SUM(total_gastos)::NUMERIC, 2)                                   AS total_gastos,
  ROUND((SUM(total_gastos) / SUM(num_transacoes))::NUMERIC, 2)           AS ticket_medio
FROM cube_gastos_mensais
GROUP BY year, month, month_name_pt, group_pt
ORDER BY year, month, total_gastos DESC;

-- ────────────────────────────────────────────────
-- cube_gastos_categoria_mensal
-- Gastos por mês × categoria (família consolidada, sem drill por membro)
-- Grain: (year, month, group_pt, category_pt)
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW cube_gastos_categoria_mensal AS
SELECT
  year,
  month,
  month_name_pt,
  group_pt,
  category_pt,
  SUM(num_transacoes)                                                    AS num_transacoes,
  ROUND(SUM(total_gastos)::NUMERIC, 2)                                   AS total_gastos,
  ROUND((SUM(total_gastos) / SUM(num_transacoes))::NUMERIC, 2)           AS ticket_medio
FROM cube_gastos_mensais
GROUP BY year, month, month_name_pt, group_pt, category_pt
ORDER BY year, month, total_gastos DESC;

-- ────────────────────────────────────────────────
-- cube_investimentos_mensal
-- Movimentações de investimentos por mês × produto × tipo de movimento
-- Grain: (year, month, investment_name, movement_type)
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW cube_investimentos_mensal AS
SELECT
  EXTRACT(YEAR  FROM fi.date_day)::INT                    AS year,
  EXTRACT(MONTH FROM fi.date_day)::INT                    AS month,
  CASE EXTRACT(MONTH FROM fi.date_day)::INT
    WHEN 1  THEN 'Janeiro'   WHEN 2  THEN 'Fevereiro' WHEN 3  THEN 'Março'
    WHEN 4  THEN 'Abril'     WHEN 5  THEN 'Maio'      WHEN 6  THEN 'Junho'
    WHEN 7  THEN 'Julho'     WHEN 8  THEN 'Agosto'    WHEN 9  THEN 'Setembro'
    WHEN 10 THEN 'Outubro'   WHEN 11 THEN 'Novembro'  WHEN 12 THEN 'Dezembro'
  END                                                     AS month_name_pt,
  fi.investment_name,
  fi.investment_type,
  fi.investment_subtype,
  fi.movement_type,
  COUNT(*)                                                AS num_movimentacoes,
  ROUND(SUM(fi.amount)::NUMERIC,     2)                   AS total_bruto,
  ROUND(SUM(fi.net_amount)::NUMERIC, 2)                   AS total_liquido
FROM f_investimentos fi
GROUP BY
  EXTRACT(YEAR  FROM fi.date_day)::INT,
  EXTRACT(MONTH FROM fi.date_day)::INT,
  TO_CHAR(fi.date_day, 'TMMonth'),
  fi.investment_name, fi.investment_type, fi.investment_subtype, fi.movement_type
ORDER BY year, month;

-- ────────────────────────────────────────────────
-- cube_compromissos_ativos
-- Passivo de parcelamentos em aberto por compra
-- Grain: (account_id, cc_total_installments, purchase_month) — uma linha por compra parcelada não quitada
-- Decisão D1: agrupa por DATE_TRUNC('month', cc_purchase_date) para tolerar variações de timestamp
-- Decisão D2: description limpa via regexp_replace removendo sufixo PARC##/##
-- Decisão D3: compromisso_restante = (MAX(total) - MAX(installment_atual)) * MIN(amount)
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW cube_compromissos_ativos AS
SELECT
  regexp_replace(MIN(fp.description), 'PARC\d+/\d+', '', 'g') AS description,
  DATE_TRUNC('month', fp.cc_purchase_date::TIMESTAMPTZ AT TIME ZONE 'America/Sao_Paulo')::DATE
                                                              AS purchase_day,
  MIN(fp.amount)::NUMERIC(18,4)                               AS amount,
  fp.account_id,
  a.name                                                      AS cartao,
  du.display_name                                             AS dono,
  MIN(fp.category_pt)                                         AS category_pt,
  MIN(fp.category_group_pt)                                   AS category_group_pt,
  MAX(fp.cc_installment_number)                               AS installment_atual,
  MAX(fp.cc_total_installments)                               AS total_installments,
  ROUND(
    (MAX(fp.cc_total_installments) - MAX(fp.cc_installment_number))::NUMERIC * MIN(fp.amount),
    2
  )                                                           AS compromisso_restante
FROM (
  SELECT
    te.description,
    te.cc_purchase_date,
    te.amount,
    te.account_id,
    te.cc_installment_number,
    te.cc_total_installments,
    te.category_pt,
    te.category_group_pt,
    te.owner_normalized
  FROM transactions_enriched te
  WHERE te.cc_total_installments IS NOT NULL
    AND te.transaction_kind = 'EXPENSE'
) fp
INNER JOIN accounts  a  ON a.id      = fp.account_id
INNER JOIN d_users   du ON du.name   = fp.owner_normalized
GROUP BY
  fp.account_id,
  DATE_TRUNC('month', fp.cc_purchase_date::TIMESTAMPTZ AT TIME ZONE 'America/Sao_Paulo'),
  fp.cc_total_installments,
  a.name,
  du.display_name
HAVING MAX(fp.cc_installment_number) < MAX(fp.cc_total_installments)
ORDER BY compromisso_restante DESC;

-- ────────────────────────────────────────────────
-- cube_gastos_novos
-- Gastos pela ótica da decisão de compra (exclui rastro de parcelamentos)
-- Grain: (year, month, category_pt, group_pt, display_name) — igual a cube_gastos_mensais
-- Decisão D4: inclui parcela 1 (compra nova parcelada) + compras à vista (IS NULL ou = 1)
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW cube_gastos_novos AS
SELECT
  dd.year,
  dd.month,
  dd.month_name_pt,
  COALESCE(dc.group_pt,    fc.category_group_pt, 'Sem Grupo')      AS group_pt,
  COALESCE(dc.category_pt, fc.category_pt,       'Sem Categoria')  AS category_pt,
  du.display_name,
  COUNT(*)                                                          AS num_transacoes,
  ROUND(SUM(ABS(fc.amount_signed))::NUMERIC, 2)                     AS total_gastos
FROM f_fluxo_caixa fc
INNER JOIN d_data      dd ON dd.data        = fc.date_day
INNER JOIN d_users     du ON du.id          = fc.user_id
LEFT  JOIN d_categoria dc ON dc.category_id = fc.category_id
-- join back to bronze for installment fields (not exposed in f_fluxo_caixa)
INNER JOIN transactions_enriched te ON te.id = fc.transaction_id
WHERE fc.transaction_kind = 'EXPENSE'
  AND (
    te.cc_installment_number = 1
    OR te.cc_total_installments IS NULL
    OR te.cc_total_installments = 1
  )
GROUP BY
  dd.year, dd.month, dd.month_name_pt,
  COALESCE(dc.group_pt,    fc.category_group_pt, 'Sem Grupo'),
  COALESCE(dc.category_pt, fc.category_pt,       'Sem Categoria'),
  du.display_name;

-- ────────────────────────────────────────────────
-- kpi_cash_runway
-- Fôlego financeiro: quantos meses a família sobrevive sem receita
-- Grain: 1 linha (snapshot atual)
-- Fórmula: saldo_liquido (contas correntes + poupança) / media_saidas_90d (3 meses)
-- runway_meses = NULL se não há histórico de despesas (evita divisão por zero)
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW kpi_cash_runway AS
WITH saldo_atual AS (
  SELECT COALESCE(SUM(saldo_atual), 0) AS saldo_liquido
  FROM cube_patrimonio
  WHERE subtipo IN ('CHECKING_ACCOUNT', 'SAVINGS_ACCOUNT')
),
media_gastos AS (
  SELECT AVG(total_despesas) AS media_saidas_90d
  FROM (
    SELECT total_despesas
    FROM cube_cashflow_mensal
    ORDER BY year DESC, month DESC
    LIMIT 3
  ) sub
)
SELECT
  sa.saldo_liquido,
  mg.media_saidas_90d,
  ROUND(sa.saldo_liquido / NULLIF(mg.media_saidas_90d, 0), 1) AS runway_meses
FROM saldo_atual sa, media_gastos mg;

-- ────────────────────────────────────────────────
-- cube_cashflow_projetado
-- Cashflow histórico (real) + futuro (estimado por parcelas)
-- Grain: (year, month) — uma linha por mês
-- is_projected = false: dados reais de cube_cashflow_mensal
-- is_projected = true:  estimativa baseada em f_parcelas_futuras
-- Mês atual não é duplicado: futuro começa no mês seguinte ao último com dados reais
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW cube_cashflow_projetado AS
WITH historico AS (
  SELECT
    year,
    month,
    month_name_pt,
    total_receitas,
    total_despesas,
    saldo_liquido,
    FALSE AS is_projected
  FROM cube_cashflow_mensal
),
ultimo_mes_real AS (
  SELECT MAX(year * 100 + month) AS ym FROM cube_cashflow_mensal
),
futuro AS (
  SELECT
    EXTRACT(YEAR  FROM pf.projected_month)::INT            AS year,
    EXTRACT(MONTH FROM pf.projected_month)::INT            AS month,
    (SELECT month_name_pt FROM d_data
     WHERE month = EXTRACT(MONTH FROM pf.projected_month)::INT LIMIT 1)  AS month_name_pt,
    NULL::NUMERIC                                          AS total_receitas,
    ROUND(SUM(pf.installment_amount)::NUMERIC, 2)          AS total_despesas,
    ROUND(-SUM(pf.installment_amount)::NUMERIC, 2)         AS saldo_liquido,
    TRUE                                                   AS is_projected
  FROM f_parcelas_futuras pf, ultimo_mes_real umr
  WHERE (EXTRACT(YEAR FROM pf.projected_month)::INT * 100
       + EXTRACT(MONTH FROM pf.projected_month)::INT) > umr.ym
  GROUP BY pf.projected_month
)
SELECT * FROM historico
UNION ALL
SELECT * FROM futuro
ORDER BY year, month;

-- ────────────────────────────────────────────────
-- cube_tendencias
-- Tendências de gastos: média dos últimos 3 meses por grupo + recorrentes identificados por AI
-- Grain: (tipo, nome) — tipo='grupo' ou tipo='recorrente'
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW cube_tendencias AS
WITH ultimos_3 AS (
  SELECT year, month FROM cube_cashflow_mensal
  ORDER BY year DESC, month DESC LIMIT 3
),
grupos AS (
  SELECT
    g.group_pt,
    COUNT(DISTINCT (g.year, g.month))            AS meses_presentes,
    ROUND(AVG(g.total_gastos)::NUMERIC, 2)       AS media_mensal,
    ROUND(MIN(g.total_gastos)::NUMERIC, 2)       AS min_mensal,
    ROUND(MAX(g.total_gastos)::NUMERIC, 2)       AS max_mensal
  FROM cube_gastos_grupo_mensal g
  INNER JOIN ultimos_3 u ON u.year = g.year AND u.month = g.month
  GROUP BY g.group_pt
),
recorrentes AS (
  SELECT
    ai.merchant_name,
    te.category_group_pt,
    COUNT(*)                                     AS ocorrencias,
    ROUND(AVG(ABS(te.amount))::NUMERIC, 2)       AS media_valor,
    ai.recurrence_period
  FROM ai_transaction_insights ai
  JOIN transactions_enriched te ON te.id = ai.transaction_id
  WHERE ai.is_recurring = true
    AND te.transaction_kind = 'EXPENSE'
    AND ai.merchant_name IS NOT NULL
  GROUP BY ai.merchant_name, te.category_group_pt, ai.recurrence_period
  HAVING COUNT(*) >= 2
)
SELECT
  'grupo'        AS tipo,
  g.group_pt     AS nome,
  NULL           AS merchant,
  g.media_mensal AS valor,
  g.meses_presentes,
  NULL::TEXT     AS period
FROM grupos g
UNION ALL
SELECT
  'recorrente'           AS tipo,
  r.category_group_pt    AS nome,
  r.merchant_name        AS merchant,
  r.media_valor          AS valor,
  r.ocorrencias,
  r.recurrence_period    AS period
FROM recorrentes r
ORDER BY tipo, valor DESC;
