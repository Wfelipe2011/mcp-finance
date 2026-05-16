## Context

Os dados para tendências existem em duas fontes:
1. `cube_gastos_grupo_mensal`: gastos por grupo por mês (histórico completo)
2. `ai_transaction_insights.is_recurring`: AI marcou transações específicas como recorrentes, com `merchant_name` e `recurrence_period`

A combinação desses dois nivela o problema: os grupos dão visão macro (média 3 meses de Alimentação, Moradia, etc.) e o AI dá visão micro (lista de assinaturas e recorrentes identificados).

## Goals / Non-Goals

**Goals:**
- Média de gastos por grupo dos últimos 3 meses disponíveis
- Lista de comerciantes recorrentes identificados por AI com média de valor
- Endpoint único `/tendencias` sem parâmetro de mês (sempre baseado nos últimos 3)
- Exibição simples no app como lista de previsão

**Non-Goals:**
- Não fazer previsão estatística complexa (regressão, etc.)
- Não filtrar por membro da família (nesta versão)
- Não incluir tendências de receita (apenas despesas)
- Não criar aba nova no app — integrar na aba Gastos existente

## Decisions

**D1 — VIEW `cube_tendencias` com duas sub-consultas**

```sql
CREATE OR REPLACE VIEW cube_tendencias AS
WITH ultimos_3 AS (
  SELECT year, month FROM cube_cashflow_mensal
  ORDER BY year DESC, month DESC LIMIT 3
),
grupos AS (
  SELECT group_pt,
    COUNT(DISTINCT (g.year, g.month)) AS meses_presentes,
    ROUND(AVG(g.total_gastos)::NUMERIC, 2) AS media_mensal,
    ROUND(MIN(g.total_gastos)::NUMERIC, 2) AS min_mensal,
    ROUND(MAX(g.total_gastos)::NUMERIC, 2) AS max_mensal
  FROM cube_gastos_grupo_mensal g
  INNER JOIN ultimos_3 u ON u.year = g.year AND u.month = g.month
  GROUP BY group_pt
),
recorrentes AS (
  SELECT ai.merchant_name,
    t.category_group_pt,
    COUNT(*) AS ocorrencias,
    ROUND(AVG(ABS(t.amount_signed))::NUMERIC, 2) AS media_valor,
    ai.recurrence_period
  FROM ai_transaction_insights ai
  JOIN f_transacoes t ON t.transaction_id = ai.transaction_id
  WHERE ai.is_recurring = true AND t.transaction_kind = 'EXPENSE'
    AND ai.merchant_name IS NOT NULL
  GROUP BY ai.merchant_name, t.category_group_pt, ai.recurrence_period
  HAVING COUNT(*) >= 2
)
-- Exposta como duas queries separadas via API (não UNION — tipos diferentes)
SELECT 'grupo' AS tipo, group_pt AS nome, NULL AS merchant,
  media_mensal AS valor, meses_presentes, NULL::text AS period
FROM grupos
UNION ALL
SELECT 'recorrente', category_group_pt, merchant_name,
  media_valor, ocorrencias, recurrence_period
FROM recorrentes
ORDER BY tipo, valor DESC;
```

**D2 — API retorna objeto com duas listas**

```json
{
  "grupos": [ { "group_pt": "Alimentação", "media_mensal": 893.58, "meses_presentes": 3 } ],
  "recorrentes": [ { "merchant_name": "Netflix", "category_group_pt": "...", "media_valor": 20.90, "ocorrencias": 4 } ]
}
```

**D3 — UI: seção "Tendências" ao final da aba Gastos**

Dois painéis colapsáveis abaixo das categorias:
- "Média 3 meses" → BarList com media_mensal por grupo
- "Recorrentes identificados" → lista com merchant_name + valor médio

## Risks / Trade-offs

- **Dados AI incompletos**: se poucos meses foram enrichados, `recorrentes` pode ser vazio. Exibir mensagem "Dados insuficientes — execute o enriquecimento" se lista vazia.
- **Grupos com `fix-enrichment-kind` não aplicado**: médias incluirão aportes/transferências. Por isso esta change depende de `fix-enrichment-kind`.
