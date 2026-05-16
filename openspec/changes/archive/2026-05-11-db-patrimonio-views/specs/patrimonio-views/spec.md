## ADDED Requirements

### Requirement: v_net_worth view returns consolidated net worth in one row
The system SHALL provide a SQLite view `v_net_worth` that returns exactly one row with the user's net worth broken down into its components: banking balance, investment balance, credit card debt (fatura), and the net total.

#### Scenario: View returns exactly one row
- **WHEN** `v_net_worth` is queried
- **THEN** it returns exactly 1 row

#### Scenario: netWorth is correctly computed
- **WHEN** `v_net_worth` is queried
- **THEN** `netWorth` equals `bankTotal + investmentTotal - creditTotal`
- **AND** all values are REAL, rounded to 2 decimal places

#### Scenario: Components match existing v_overview values
- **WHEN** `v_net_worth` is queried alongside `v_overview`
- **THEN** `v_net_worth.bankTotal` equals `v_overview.bankTotal`
- **AND** `v_net_worth.investmentTotal` equals `v_overview.investmentTotal`
- **AND** `v_net_worth.creditTotal` equals `v_overview.creditTotal`

### Requirement: v_investment_maturity view lists active fixed-income investments by due date
The system SHALL provide a SQLite view `v_investment_maturity` that returns one row per active investment with a known due date (`dueDate IS NOT NULL AND status = 'ACTIVE'`), ordered by due date ascending.

#### Scenario: View only includes active investments with due date
- **WHEN** `v_investment_maturity` is queried
- **THEN** every row has `status = 'ACTIVE'` and a non-null `dueDate`

#### Scenario: diasParaVencer is computed from today
- **WHEN** `v_investment_maturity` is queried
- **THEN** `diasParaVencer` equals `CAST(julianday(dueDate) - julianday('now') AS INTEGER)` for each row
- **AND** negative values indicate the investment is past its due date

#### Scenario: bucket categorizes investments by time to maturity
- **WHEN** `v_investment_maturity` is queried
- **THEN** `bucket` is `'vencido'` when `diasParaVencer <= 0`
- **AND** `bucket` is `'≤30d'` when `diasParaVencer` is between 1 and 30
- **AND** `bucket` is `'31-90d'` when `diasParaVencer` is between 31 and 90
- **AND** `bucket` is `'91-365d'` when `diasParaVencer` is between 91 and 365
- **AND** `bucket` is `'>365d'` when `diasParaVencer` exceeds 365

#### Scenario: View is ordered by due date ascending
- **WHEN** `v_investment_maturity` is queried
- **THEN** rows are ordered by `dueDate ASC` (soonest first)
