## ADDED Requirements

### Requirement: v_credit_alerts view exposes credit card payment urgency per card
The system SHALL provide a SQLite view `v_credit_alerts` that returns one row per credit card account with the estimated next due date, days until that date, minimum payment, utilization, and a computed alert status.

#### Scenario: View returns one row per credit card
- **WHEN** `v_credit_alerts` is queried
- **THEN** each row corresponds to one account where `type = 'CREDIT'`
- **AND** includes `name`, `lastFour`, `fatura`, `vencimento` (ccBalanceDueDate), `proximoVencimento`, `diasParaVencer`, `minimo`, `utilizacaoPct`, `statusAlerta`

#### Scenario: proximoVencimento is estimated as 30 days after ccBalanceDueDate
- **WHEN** `v_credit_alerts` is queried
- **THEN** `proximoVencimento` equals `DATE(ccBalanceDueDate, '+30 days')`

#### Scenario: diasParaVencer is computed from proximoVencimento
- **WHEN** `v_credit_alerts` is queried
- **THEN** `diasParaVencer` equals `CAST(julianday(proximoVencimento) - julianday('now') AS INTEGER)`

#### Scenario: statusAlerta reflects payment urgency
- **WHEN** `v_credit_alerts` is queried
- **THEN** `statusAlerta` is `'VENCIDO'` when `diasParaVencer < 0`
- **AND** `statusAlerta` is `'URGENTE'` when `diasParaVencer` is between 0 and 3
- **AND** `statusAlerta` is `'ATENÇÃO'` when `diasParaVencer` is between 4 and 7
- **AND** `statusAlerta` is `'OK'` when `diasParaVencer` exceeds 7

#### Scenario: View is ordered by diasParaVencer ascending
- **WHEN** `v_credit_alerts` is queried
- **THEN** rows are ordered so that most urgent cards (lowest `diasParaVencer`) appear first

### Requirement: v_top_categories_30d view ranks top 10 spending categories for the last 30 days
The system SHALL provide a SQLite view `v_top_categories_30d` that returns the top 10 spending categories by volume in the last 30 days, excluding noise categories, with each category's percentage of total non-noise spending in the period.

#### Scenario: View returns at most 10 rows
- **WHEN** `v_top_categories_30d` is queried
- **THEN** it returns at most 10 rows

#### Scenario: View excludes noise categories
- **WHEN** `v_top_categories_30d` is queried
- **THEN** it excludes transactions where `category` is in the standard noise list or matches `LIKE 'Transfer - %'`
- **AND** it only includes DEBIT transactions (amount < 0)

#### Scenario: pctDoTotal reflects share of all non-noise spending in the period
- **WHEN** `v_top_categories_30d` is queried
- **THEN** `pctDoTotal` for each row equals `ROUND(total * 100.0 / SUM(all non-noise debits in 30d), 1)`
- **AND** the sum of `pctDoTotal` across all rows may be less than 100 if more than 10 categories exist

#### Scenario: View is ordered by total descending
- **WHEN** `v_top_categories_30d` is queried
- **THEN** rows are ordered by `total DESC` (highest spending category first)
