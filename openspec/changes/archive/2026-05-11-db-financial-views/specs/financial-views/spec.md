## ADDED Requirements

### Requirement: v_overview view exists and returns one row of financial totals
The system SHALL provide a SQLite view `v_overview` that returns exactly one row containing pre-aggregated financial totals derived from the `accounts` and `investments` tables.

#### Scenario: View returns single row with bank total
- **WHEN** the view `v_overview` is queried
- **THEN** it returns exactly 1 row with `bankTotal` equal to the sum of `balance` for all accounts where `type = 'BANK'`

#### Scenario: View returns credit totals
- **WHEN** the view `v_overview` is queried
- **THEN** `creditTotal` equals the sum of `balance` for all accounts where `type = 'CREDIT'`
- **AND** `creditLimitTotal` equals the sum of `ccCreditLimit` for those same accounts
- **AND** `creditUtilPct` equals `ROUND(creditTotal * 100.0 / creditLimitTotal, 0)`

#### Scenario: View returns investment total
- **WHEN** the view `v_overview` is queried
- **THEN** `investmentTotal` equals the sum of `balance` from the `investments` table

#### Scenario: View returns combined balance evolution value
- **WHEN** the view `v_overview` is queried
- **THEN** `balanceEvolution` equals `bankTotal + creditTotal`

### Requirement: v_bank_summary view groups balances by banking institution
The system SHALL provide a SQLite view `v_bank_summary` that returns one row per banking institution (item) with aggregated balance data for `type = 'BANK'` accounts only.

#### Scenario: View groups by connector name
- **WHEN** `v_bank_summary` is queried
- **THEN** each row corresponds to a distinct `connector` value from the `items` table
- **AND** `balance` is the sum of all BANK account balances for that item
- **AND** `accountCount` is the count of BANK accounts for that item
- **AND** `pctOfTotal` is the percentage of that item's balance relative to the total bank balance

#### Scenario: View excludes credit accounts
- **WHEN** `v_bank_summary` is queried
- **THEN** no rows include accounts where `type = 'CREDIT'`

### Requirement: v_credit_summary view lists each credit card with fatura and limit
The system SHALL provide a SQLite view `v_credit_summary` that returns one row per credit card account with balance (fatura), limit, available limit, and utilization percentage.

#### Scenario: View returns one row per credit card
- **WHEN** `v_credit_summary` is queried
- **THEN** each row represents one account where `type = 'CREDIT'`
- **AND** includes `name`, `lastFour` (last 4 digits of `number`), `fatura` (balance), `creditLimit` (ccCreditLimit), `availableLimit` (ccAvailableCreditLimit), `utilizacaoPct`

#### Scenario: Utilization percentage is computed per card
- **WHEN** `v_credit_summary` is queried
- **THEN** `utilizacaoPct` for each row equals `ROUND(fatura * 100.0 / creditLimit, 0)` when `creditLimit > 0`, NULL otherwise

### Requirement: v_investment_summary view groups investments by type
The system SHALL provide a SQLite view `v_investment_summary` that returns one row per investment type with total balance, count of active and inactive investments, and percentage of total portfolio.

#### Scenario: View groups by investment type
- **WHEN** `v_investment_summary` is queried
- **THEN** each row represents a distinct `type` value in the `investments` table
- **AND** includes `type`, `balance` (sum), `total` (count), `ativos` (count where status = 'ACTIVE'), `inativos` (count where status ≠ 'ACTIVE'), `pctOfTotal`

#### Scenario: Active vs inactive count adds up to total
- **WHEN** `v_investment_summary` is queried
- **THEN** `ativos + inativos = total` for every row

### Requirement: Views are created automatically on database initialization
The system SHALL create all 4 views via `CREATE VIEW IF NOT EXISTS` statements included in `schema.sql`, so they are available immediately after the database is initialized by `BunSQLiteAdapter`.

#### Scenario: Views exist after fresh database initialization
- **WHEN** a new `BunSQLiteAdapter` is instantiated against an empty database path
- **THEN** running `SELECT name FROM sqlite_master WHERE type='view'` returns at least `v_overview`, `v_bank_summary`, `v_credit_summary`, `v_investment_summary`

### Requirement: Integration tests validate views against real data snapshot
The system SHALL include integration tests in `src/infrastructure/db/views.test.ts` that open the real `finance.db` and assert view results match the known dashboard values from the 2026-05-11 snapshot.

#### Scenario: v_overview bank total matches snapshot
- **WHEN** `views.test.ts` queries `v_overview`
- **THEN** `bankTotal` equals `2610.44` (R$ 2.610,44 from dashboard snapshot)

#### Scenario: v_overview credit total matches snapshot
- **WHEN** `views.test.ts` queries `v_overview`
- **THEN** `creditTotal` is approximately `17574.60` (R$ 17.574,60 from dashboard snapshot)

#### Scenario: v_overview credit utilization matches snapshot
- **WHEN** `views.test.ts` queries `v_overview`
- **THEN** `creditUtilPct` equals `37` (37% shown in dashboard)

#### Scenario: v_overview investment total matches snapshot
- **WHEN** `views.test.ts` queries `v_overview`
- **THEN** `investmentTotal` equals `4219.04` (R$ 4.219,04 from dashboard snapshot)
