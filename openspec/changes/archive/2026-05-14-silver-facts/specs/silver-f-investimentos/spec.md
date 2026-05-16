## ADDED Requirements

### Requirement: View f_investimentos expõe movimentações de investimento com valor líquido
O sistema SHALL criar view `f_investimentos` sobre `investment_transactions JOIN investments` expondo: `inv_transaction_id` (TEXT), `investment_id` (TEXT), `investment_name` (TEXT, de `investments.description` ou nome do ativo), `date_day` (DATE), `type` (TEXT, tipo da movimentação), `movement_type` (TEXT), `amount` (NUMERIC), `net_amount` (NUMERIC, já descontadas taxas), `quantity` (NUMERIC), `value` (NUMERIC, valor unitário).

#### Scenario: net_amount reflete valor após taxas
- **WHEN** `f_investimentos` é consultada para uma movimentação com taxas
- **THEN** `net_amount < amount` (valor líquido é menor que o bruto)

#### Scenario: Todos os investment_transactions aparecem
- **WHEN** `SELECT COUNT(*) FROM f_investimentos`
- **THEN** o resultado é igual a `SELECT COUNT(*) FROM investment_transactions`
