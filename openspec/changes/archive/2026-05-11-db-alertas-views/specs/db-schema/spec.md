## MODIFIED Requirements

### Requirement: Database schema is initialized on startup
The database initialization SHALL execute `schema.sql` which includes both `CREATE TABLE IF NOT EXISTS` statements for all 6 raw data tables AND `CREATE VIEW IF NOT EXISTS` statements for the 10 financial views (`v_overview`, `v_bank_summary`, `v_credit_summary`, `v_investment_summary`, `v_monthly_cashflow`, `v_spending_by_cat`, `v_net_worth`, `v_investment_maturity`, `v_credit_alerts`, `v_top_categories_30d`).

#### Scenario: All tables and views exist after initialization
- **WHEN** `BunSQLiteAdapter` is instantiated
- **THEN** `SELECT name FROM sqlite_master WHERE type='table'` returns all 6 raw tables
- **AND** `SELECT name FROM sqlite_master WHERE type='view'` returns all 10 views
