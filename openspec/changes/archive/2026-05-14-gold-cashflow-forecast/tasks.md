# Tasks: gold-cashflow-forecast

## Pré-requisito

- `silver-parcelas-projecao` deve estar implementado (`f_parcelas_futuras` existindo)

## 1. View SQL

- [x] **Task 1**: Adicionar view `cube_cashflow_projetado` ao final de `src/infrastructure/db/gold-cubes.sql`
  - CTE `historico`: SELECT `year`, `month`, `month_name_pt`, `total_receitas`, `total_despesas`, `saldo_liquido`, `FALSE AS is_projected` FROM `cube_cashflow_mensal`
  - CTE `futuro`: SELECT `EXTRACT(YEAR FROM projected_month)::INT AS year`, `EXTRACT(MONTH FROM projected_month)::INT AS month`, lookup `month_name_pt` de `d_data`, `NULL AS total_receitas`, `SUM(installment_amount) AS total_despesas`, `-SUM(installment_amount) AS saldo_liquido`, `TRUE AS is_projected` FROM `f_parcelas_futuras` WHERE `projected_month > DATE_TRUNC('month', NOW())` GROUP BY `projected_month`
  - UNION ALL de `historico` e `futuro`, ORDER BY `year, month`

## 2. Validação

- [x] **Task 2**: Aplicar schema e consultar `SELECT * FROM cube_cashflow_projetado ORDER BY year, month` — verificar que meses passados têm `is_projected = false` com receitas/despesas reais, e meses futuros têm `is_projected = true` com apenas `total_despesas`
- [x] **Task 3**: Confirmar que não há sobreposição: mês atual não deve aparecer duplicado (um histórico + um projetado)
