# Tasks: silver-parcelas-projecao

## 1. View SQL

- [x] **Task 1**: Adicionar view `f_parcelas_futuras` ao final de `src/infrastructure/db/silver-facts.sql`
  - CTE `base`: SELECT de `f_parcelas` WHERE `installments_remaining > 0` (parcelas ainda não quitadas), usando a parcela mais recente registrada por compra (MAX `installment_number` agrupado por `description + purchase_day + account_id`)
  - `generate_series(1, installments_remaining)` para gerar uma linha por parcela futura
  - `projected_month`: `(purchase_day + (installment_number + gs) * INTERVAL '30 days')` truncado para o primeiro dia do mês (`DATE_TRUNC('month', ...)`)
  - Colunas de saída: `projected_month`, `installment_seq`, `installment_amount`, `description`, `owner_normalized`, `category_pt`, `category_group_pt`, `account_id`, `total_installments`, `installments_remaining`

## 2. Validação

- [x] **Task 2**: Aplicar schema e consultar `SELECT projected_month, SUM(installment_amount) FROM f_parcelas_futuras GROUP BY projected_month ORDER BY projected_month` — verificar que meses futuros têm valores plausíveis e que meses passados não aparecem
- [x] **Task 3**: Cruzar contagem de linhas com `cube_compromissos_ativos`: soma de `installments_remaining` em `cube_compromissos_ativos` deve ser igual ao COUNT(*) de `f_parcelas_futuras`
