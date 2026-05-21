-- Gold Layer — OLAP Cubes
-- change: gold-cubes
-- Views analíticas sobre o silver layer (f_transacoes, f_fluxo_caixa, f_investimentos, d_*)
-- Não cria tabelas; não modifica bronze nem silver

-- ────────────────────────────────────────────────
-- cube_gastos_mensais
-- Gastos por mês × categoria × membro da família
-- Grain: (year, month, category_pt, group_pt, display_name)
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW cube_gastos_mensais WITH (security_invoker = true) AS
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
INNER JOIN tenant_members du ON du.id          = fc.user_id
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
CREATE OR REPLACE VIEW cube_cashflow_mensal WITH (security_invoker = true) AS
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
CREATE OR REPLACE VIEW cube_patrimonio WITH (security_invoker = true) AS
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
CREATE OR REPLACE VIEW cube_gastos_grupo_mensal WITH (security_invoker = true) AS
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
CREATE OR REPLACE VIEW cube_gastos_categoria_mensal WITH (security_invoker = true) AS
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
CREATE OR REPLACE VIEW cube_investimentos_mensal WITH (security_invoker = true) AS
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
CREATE OR REPLACE VIEW cube_compromissos_ativos WITH (security_invoker = true) AS
SELECT
  fp.purchase_description                                      AS description,
  DATE_TRUNC('month', fp.cc_purchase_date::TIMESTAMPTZ AT TIME ZONE 'America/Sao_Paulo')::DATE
                                                              AS purchase_day,
  ((ARRAY_AGG(fp.amount ORDER BY fp.cc_installment_number DESC, fp.charge_date DESC))[1])::NUMERIC(18,4)
                                                              AS amount,
  fp.account_id,
  a.name                                                      AS cartao,
  du.display_name                                             AS dono,
  MIN(fp.category_pt)                                         AS category_pt,
  MIN(fp.category_group_pt)                                   AS category_group_pt,
  MAX(fp.cc_installment_number)                               AS installment_atual,
  MAX(fp.cc_total_installments)                               AS total_installments,
  ROUND(
    (MAX(fp.cc_total_installments) - MAX(fp.cc_installment_number))::NUMERIC
      * ((ARRAY_AGG(fp.amount ORDER BY fp.cc_installment_number DESC, fp.charge_date DESC))[1])::NUMERIC,
    2
  )                                                           AS compromisso_restante
FROM (
  SELECT
    trim(regexp_replace(te.description, 'PARC\d+/\d+|\s+\d+/\d+$', '', 'g')) AS purchase_description,
    te.description,
    te.date AS charge_date,
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
    -- Excluir parcelamentos/pagamentos/rotativos de fatura (mesma semântica de f_parcelas_futuras)
    AND te.description NOT ILIKE '%FATURA PARCELA%'
    AND te.description NOT ILIKE '%PAGAMENTO DE FATURA%'
    AND te.description NOT ILIKE '%ROTATIVO PARCELAMENTO FATURA%'
    AND COALESCE(te.category_pt, '') <> 'Pagamento de fatura'
) fp
INNER JOIN accounts  a  ON a.id      = fp.account_id
INNER JOIN tenant_members   du ON du.name   = fp.owner_normalized
GROUP BY
  fp.account_id,
  DATE_TRUNC('month', fp.cc_purchase_date::TIMESTAMPTZ AT TIME ZONE 'America/Sao_Paulo'),
  fp.purchase_description,
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
CREATE OR REPLACE VIEW cube_gastos_novos WITH (security_invoker = true) AS
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
INNER JOIN tenant_members     du ON du.id          = fc.user_id
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
-- kpi_runway_imediato
-- Fôlego imediato: quantos meses a família sobrevive sem receita
-- usando apenas saldo em conta corrente e poupança
-- Grain: 1 linha (snapshot atual)
-- runway_imediato_meses = NULL se não há histórico de despesas (evita divisão por zero)
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW kpi_runway_imediato WITH (security_invoker = true) AS
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
  ROUND(sa.saldo_liquido / NULLIF(mg.media_saidas_90d, 0), 1) AS runway_imediato_meses
FROM saldo_atual sa, media_gastos mg;

-- ────────────────────────────────────────────────
-- kpi_runway_total
-- Fôlego total: quantos meses a família sobrevive liquidando tudo
-- usando saldo em conta + todos os investimentos
-- Grain: 1 linha (snapshot atual)
-- runway_total_meses = NULL se não há histórico de despesas (evita divisão por zero)
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW kpi_runway_total WITH (security_invoker = true) AS
WITH saldo_contas AS (
  SELECT COALESCE(SUM(saldo_atual), 0) AS saldo_liquido
  FROM cube_patrimonio
  WHERE subtipo IN ('CHECKING_ACCOUNT', 'SAVINGS_ACCOUNT')
),
saldo_investimentos AS (
  SELECT COALESCE(SUM(i.balance), 0) AS saldo_investimentos
  FROM investments i
  JOIN items it ON it.id = i.item_id
  WHERE it.tenant_id = current_setting('app.tenant_id', true)::UUID
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
  sc.saldo_liquido,
  si.saldo_investimentos,
  mg.media_saidas_90d,
  ROUND((sc.saldo_liquido + si.saldo_investimentos) / NULLIF(mg.media_saidas_90d, 0), 1) AS runway_total_meses
FROM saldo_contas sc, saldo_investimentos si, media_gastos mg;

-- ────────────────────────────────────────────────
-- cube_parcelas_cartao
-- Saldo devedor e compromissos ativos agrupados por cartão de crédito
-- Grain: (account_id) — uma linha por cartão com lista JSON de compromissos
-- Decisão D1: usa cube_compromissos_ativos como fonte (já filtrado e deduplicado)
-- Decisão D2: cc_credit_limit nullable — exibir barra só quando disponível
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW cube_parcelas_cartao WITH (security_invoker = true) AS
SELECT
  ca.account_id,
  ca.cartao,
  a.cc_credit_limit,
  ROUND(SUM(ca.compromisso_restante)::NUMERIC, 2) AS total_comprometido,
  json_agg(
    json_build_object(
      'description',          ca.description,
      'purchase_day',         ca.purchase_day,
      'installment_atual',    ca.installment_atual,
      'total_installments',   ca.total_installments,
      'amount',               ca.amount,
      'compromisso_restante', ca.compromisso_restante,
      'dono',                 ca.dono,
      'category_pt',          ca.category_pt
    ) ORDER BY ca.compromisso_restante DESC
  ) AS compromissos
FROM cube_compromissos_ativos ca
INNER JOIN accounts a ON a.id = ca.account_id
GROUP BY ca.account_id, ca.cartao, a.cc_credit_limit
ORDER BY total_comprometido DESC;

-- ────────────────────────────────────────────────
-- cube_parcelas_por_mes
-- Timeline de parcelas futuras agrupadas por mês × cartão
-- Grain: (projected_month, account_id) — uma linha por mês/cartão com breakdown JSON
-- Decisão D3: parte de f_parcelas_futuras (lógica generate_series já feita)
-- Filtro: somente os próximos 24 meses a partir do mês atual
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW cube_parcelas_por_mes WITH (security_invoker = true) AS
SELECT
  pf.projected_month                                              AS mes_referencia,
  pf.account_id,
  a.name                                                          AS cartao,
  ROUND(SUM(pf.installment_amount)::NUMERIC, 2)                   AS total_parcelas_mes,
  json_agg(
    json_build_object(
      'description',       pf.description,
      'installment_amount', pf.installment_amount
    ) ORDER BY pf.installment_amount DESC
  )                                                               AS breakdown
FROM f_parcelas_futuras pf
INNER JOIN accounts a ON a.id = pf.account_id
WHERE pf.projected_month >= DATE_TRUNC('month', CURRENT_DATE)
  AND pf.projected_month < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '24 months'
GROUP BY pf.projected_month, pf.account_id, a.name
ORDER BY pf.projected_month, total_parcelas_mes DESC;

-- Alias de compatibilidade: kpi_cash_runway aponta para kpi_runway_imediato
CREATE OR REPLACE VIEW kpi_cash_runway WITH (security_invoker = true) AS
SELECT
  saldo_liquido,
  media_saidas_90d,
  runway_imediato_meses AS runway_meses
FROM kpi_runway_imediato;

-- ────────────────────────────────────────────────
-- cube_cashflow_projetado
-- Cashflow histórico (real) + futuro (estimado por parcelas)
-- Grain: (year, month) — uma linha por mês
-- is_projected = false: dados reais de cube_cashflow_mensal
-- is_projected = true:  estimativa baseada em f_parcelas_futuras
-- Mês atual não é duplicado: futuro começa no mês seguinte ao último com dados reais
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW cube_cashflow_projetado WITH (security_invoker = true) AS
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
CREATE OR REPLACE VIEW cube_tendencias WITH (security_invoker = true) AS
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


-- ────────────────────────────────────────────────
-- goals_progress_view
-- Metas financeiras com progresso calculado
-- Para metas 'saving': progress_ratio = current_amount / target_amount
-- Para metas 'spending': progress_ratio = gastos_mes_corrente / target_amount
-- Retorna apenas metas com status = 'active'
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW goals_progress_view WITH (security_invoker = true) AS
WITH base AS (
  SELECT
    g.id,
    g.tenant_id,
    g.name,
    g.goal_type,
    g.target_amount,
    g.current_amount,
    g.category_group,
    g.deadline,
    g.status,
    g.notes,
    g.created_at,
    CASE
      WHEN g.goal_type = 'spending' THEN
        COALESCE(cgm.total_gastos, 0) / g.target_amount
      ELSE
        LEAST(g.current_amount / g.target_amount, 1.0)
    END AS progress_ratio,
    CASE
      WHEN g.deadline IS NOT NULL THEN (g.deadline - CURRENT_DATE)
      ELSE NULL
    END AS days_remaining,
    CASE
      WHEN g.goal_type = 'saving' AND g.current_amount >= g.target_amount THEN false
      WHEN g.deadline IS NOT NULL AND g.deadline < CURRENT_DATE THEN true
      ELSE false
    END AS is_overdue
  FROM financial_goals g
  LEFT JOIN (
    SELECT
      group_pt,
      SUM(total_gastos) AS total_gastos
    FROM cube_gastos_mensais
    WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)::INT
      AND month = EXTRACT(MONTH FROM CURRENT_DATE)::INT
    GROUP BY group_pt
  ) cgm ON cgm.group_pt = g.category_group AND g.goal_type = 'spending'
  WHERE g.status = 'active'
)
SELECT
  id,
  tenant_id,
  name,
  goal_type,
  target_amount,
  current_amount,
  category_group,
  deadline,
  status,
  notes,
  created_at,
  progress_ratio,
  days_remaining,
  is_overdue,
  progress_ratio * 100 AS progress_pct
FROM base;

-- ────────────────────────────────────────────────
-- budget_execution_view
-- Orçamentos mensais com execução do mês corrente
-- Grain: um registro por orçamento ativo (tenant_id, category_pt)
-- Usa security_invoker = true → herda RLS do caller
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW budget_execution_view WITH (security_invoker = true) AS
SELECT
  b.id,
  b.tenant_id,
  b.category_pt,
  b.monthly_limit,
  b.is_active,
  b.created_at,
  COALESCE(c.total_gastos, 0)::NUMERIC(12,2)                             AS spent_amount,
  (b.monthly_limit - COALESCE(c.total_gastos, 0))::NUMERIC(12,2)        AS remaining,
  (COALESCE(c.total_gastos, 0) / b.monthly_limit)::NUMERIC(8,4)         AS used_ratio,
  CASE
    WHEN COALESCE(c.total_gastos, 0) >= b.monthly_limit       THEN 'exceeded'
    WHEN COALESCE(c.total_gastos, 0) >= b.monthly_limit * 0.8 THEN 'warning'
    ELSE 'ok'
  END                                                                    AS budget_status
FROM category_budgets b
LEFT JOIN cube_gastos_categoria_mensal c
  ON  c.category_pt = b.category_pt
  AND c.year  = EXTRACT(YEAR  FROM CURRENT_DATE)::INT
  AND c.month = EXTRACT(MONTH FROM CURRENT_DATE)::INT
WHERE b.is_active = true;
