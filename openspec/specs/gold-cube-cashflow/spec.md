## ADDED Requirements

### Requirement: View cube_cashflow_mensal mostra receitas e despesas reais por mês
O sistema SHALL criar view `cube_cashflow_mensal` sobre `f_fluxo_caixa` com colunas: `year` (INT), `month` (INT), `month_name_pt` (TEXT), `total_receitas` (NUMERIC, SUM de amount_signed WHERE INCOME), `total_despesas` (NUMERIC, SUM de ABS(amount_signed) WHERE EXPENSE, positivo para facilitar leitura), `saldo_liquido` (NUMERIC, receitas + despesas_signed), `num_transacoes_receita` (INT), `num_transacoes_despesa` (INT).

#### Scenario: Saldo líquido é calculado corretamente
- **WHEN** `cube_cashflow_mensal` é consultada para um mês com receitas e despesas
- **THEN** `saldo_liquido = total_receitas - total_despesas` (ambos positivos na perspectiva de leitura)

#### Scenario: Meses sem transações não aparecem
- **WHEN** `cube_cashflow_mensal` é consultada
- **THEN** apenas meses com pelo menos uma transação de cashflow real aparecem
