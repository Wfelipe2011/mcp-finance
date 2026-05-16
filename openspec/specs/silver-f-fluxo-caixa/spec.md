## ADDED Requirements

### Requirement: View f_fluxo_caixa filtra apenas transações de caixa real
O sistema SHALL criar view `f_fluxo_caixa` como subset de `f_transacoes` onde `is_real_cashflow = true`. Todas as colunas de `f_transacoes` SHALL estar disponíveis.

#### Scenario: Transferências internas excluídas
- **WHEN** `f_fluxo_caixa` é consultada
- **THEN** nenhum registro tem `transaction_kind = 'TRANSFER'` (pois transferências entre contas próprias têm `is_real_cashflow = false`)

#### Scenario: Saldo do cashflow é soma de amount_signed
- **WHEN** `SELECT SUM(amount_signed) FROM f_fluxo_caixa WHERE date_day >= '2026-01-01'`
- **THEN** o resultado representa o saldo líquido real do período (receitas menos despesas reais)
