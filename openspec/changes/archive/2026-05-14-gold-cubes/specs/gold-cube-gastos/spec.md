## ADDED Requirements

### Requirement: View cube_gastos_mensais agrega gastos por mês, categoria e membro
O sistema SHALL criar view `cube_gastos_mensais` sobre `f_fluxo_caixa` com colunas: `year` (INT), `month` (INT), `month_name_pt` (TEXT), `category_pt` (TEXT), `group_pt` (TEXT), `display_name` (TEXT, do membro), `total_gastos` (NUMERIC, SUM de amount_signed onde transaction_kind = 'EXPENSE'), `num_transacoes` (INT).

#### Scenario: Total de gastos por categoria em um mês
- **WHEN** `cube_gastos_mensais` é consultada com filtro `year = 2026 AND month = 1`
- **THEN** retorna uma linha por categoria com transações no período, com `total_gastos` negativo

#### Scenario: Drill-down por membro é possível
- **WHEN** `cube_gastos_mensais` é filtrada por `display_name = 'Wilson'`
- **THEN** retorna apenas gastos atribuídos a Wilson
