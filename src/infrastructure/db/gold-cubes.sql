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
  COUNT(*) FILTER (WHERE fc.transaction_kind = 'EXPENSE') AS num_despesas
FROM f_fluxo_caixa fc
INNER JOIN d_data dd ON dd.data = fc.date_day
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
