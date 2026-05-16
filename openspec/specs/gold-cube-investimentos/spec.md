## ADDED Requirements

### Requirement: View cube_investimentos_mensal agrega movimentações de investimento por mês
O sistema SHALL criar view `cube_investimentos_mensal` sobre `f_investimentos` com colunas: `year` (INT), `month` (INT), `month_name_pt` (TEXT), `investment_name` (TEXT), `movement_type` (TEXT), `total_net_amount` (NUMERIC, SUM de net_amount), `num_movimentacoes` (INT).

#### Scenario: Total investido por mês
- **WHEN** `cube_investimentos_mensal` é consultada com filtro `year = 2026`
- **THEN** retorna uma linha por combinação de mês × investimento × tipo de movimentação

#### Scenario: Resultado tem pelo menos uma linha
- **WHEN** `SELECT COUNT(*) FROM cube_investimentos_mensal`
- **THEN** o resultado é maior que zero (há dados de investimento no bronze)
