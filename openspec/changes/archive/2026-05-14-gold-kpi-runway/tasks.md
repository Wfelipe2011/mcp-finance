# Tasks: gold-kpi-runway

## 1. View SQL

- [x] **Task 1**: Adicionar view `kpi_cash_runway` ao final de `src/infrastructure/db/gold-cubes.sql` com a seguinte lógica:
  - CTE `saldo_atual`: `SELECT SUM(saldo_atual) AS saldo_liquido FROM cube_patrimonio WHERE subtipo IN ('CHECKING_ACCOUNT', 'SAVINGS_ACCOUNT')`
  - CTE `media_gastos`: `SELECT AVG(total_despesas) AS media_saidas_90d FROM (SELECT total_despesas FROM cube_cashflow_mensal ORDER BY year DESC, month DESC LIMIT 3) sub`
  - SELECT final com `saldo_liquido`, `media_saidas_90d`, `ROUND(saldo_liquido / NULLIF(media_saidas_90d, 0), 1) AS runway_meses`

## 2. Validação

- [x] **Task 2**: Aplicar o schema via `psql` e consultar `SELECT * FROM kpi_cash_runway` — verificar que retorna exatamente 1 linha com valores plausíveis (runway > 0)
- [x] **Task 3**: Testar edge case: se `media_saidas_90d = 0` (base vazia), confirmar que `runway_meses` retorna NULL e não divide por zero
