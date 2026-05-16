## ADDED Requirements

### Requirement: View f_transacoes normaliza todas as transações com amount_signed
O sistema SHALL criar view `f_transacoes` sobre `transactions_enriched` expondo: `transaction_id` (TEXT), `date_day` (DATE), `user_id` (INT, FK para `d_users`), `account_id` (TEXT), `category_id` (TEXT), `description` (TEXT), `transaction_kind` (TEXT), `amount` (NUMERIC, valor original), `amount_signed` (NUMERIC, normalizado pela perspectiva da família), `is_real_cashflow` (BOOLEAN), `operation_type` (TEXT), `cc_installment_number` (INT), `cc_total_installments` (INT).

A regra de `amount_signed` SHALL ser: EXPENSE → `-ABS(amount)`, INCOME → `+ABS(amount)`, INVEST → `-ABS(amount)`, TRANSFER → `amount` (mantém original).

#### Scenario: EXPENSE sempre retorna amount_signed negativo
- **WHEN** `f_transacoes` é consultada para `transaction_kind = 'EXPENSE'`
- **THEN** todos os registros têm `amount_signed < 0`

#### Scenario: INCOME sempre retorna amount_signed positivo
- **WHEN** `f_transacoes` é consultada para `transaction_kind = 'INCOME'`
- **THEN** todos os registros têm `amount_signed > 0`

#### Scenario: Contagem de registros igual ao bronze
- **WHEN** `SELECT COUNT(*) FROM f_transacoes`
- **THEN** o resultado é igual a `SELECT COUNT(*) FROM transactions_enriched`
