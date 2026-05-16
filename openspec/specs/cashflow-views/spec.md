## ADDED Requirements

### Requirement: v_monthly_cashflow view exists and returns monthly cash flow
The system SHALL provide a SQLite view `v_monthly_cashflow` that returns one row per calendar month for the last 13 months, with real income, real spending, net balance, and savings rate — excluding noise transactions (inter-account transfers, credit card payments, investment movements).

#### Scenario: View returns up to 13 rows
- **WHEN** `v_monthly_cashflow` is queried
- **THEN** it returns at most 13 rows, one per month, ordered by `mes DESC`
- **AND** `mes` is formatted as `YYYY-MM`

#### Scenario: Noise categories are excluded from entradas_reais
- **WHEN** `v_monthly_cashflow` is queried
- **THEN** `entradas_reais` excludes transactions where `category` is in `('Same person transfer', 'Transfers', 'Credit card payment', 'Investments', 'Fixed income', 'Credit card fees')` or matches `LIKE 'Transfer - %'`

#### Scenario: Noise categories are excluded from saidas_reais
- **WHEN** `v_monthly_cashflow` is queried
- **THEN** `saidas_reais` excludes the same noise categories as entradas_reais
- **AND** `saidas_reais` contains only DEBIT transactions (amount < 0), expressed as positive value

#### Scenario: saldo and pct_poupanca are derived columns
- **WHEN** `v_monthly_cashflow` is queried
- **THEN** `saldo` equals `entradas_reais - saidas_reais` for each row
- **AND** `pct_poupanca` equals `ROUND(saldo * 100.0 / NULLIF(entradas_reais, 0), 1)`, NULL when entradas_reais is 0

#### Scenario: View covers last 13 months dynamically
- **WHEN** `v_monthly_cashflow` is queried on any given day
- **THEN** it only includes months where `date >= DATE('now', '-13 months')`

### Requirement: v_spending_by_cat view ranks real spending by category
The system SHALL provide a SQLite view `v_spending_by_cat` that returns one row per spending category with aggregated spending for the last 30 days and last 90 days, ordered by 30-day volume descending.

#### Scenario: View returns one row per category with both time windows
- **WHEN** `v_spending_by_cat` is queried
- **THEN** each row has `category`, `total_30d` (sum of ABS(amount) for last 30 days), and `total_90d` (sum of ABS(amount) for last 90 days)
- **AND** rows are ordered by `total_30d DESC`

#### Scenario: View excludes noise categories
- **WHEN** `v_spending_by_cat` is queried
- **THEN** it excludes the same noise category list used by `v_monthly_cashflow`
- **AND** it only includes DEBIT transactions (amount < 0)

#### Scenario: Categories with no spending in 30d but spending in 90d still appear
- **WHEN** a category had spending between 31 and 90 days ago but none in the last 30 days
- **THEN** that category appears in the view with `total_30d = 0` and `total_90d > 0`
