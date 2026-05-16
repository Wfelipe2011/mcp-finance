## Purpose
Define tenant-scoped ML training, feature set, and prediction output.
## Requirements
### Requirement: ML worker trains one RandomForest model per tenant daily
The system SHALL train a separate `RandomForestRegressor` model for each tenant daily at 00:00, using the tenant's historical monthly spending per category as training data.

#### Scenario: Training reads from cube_gastos_mensais via superuser connection
- **WHEN** the ML worker starts a training cycle
- **THEN** it queries `cube_gastos_mensais` filtered by tenant_id using a Postgres superuser connection (bypassing RLS)
- **AND** data is aggregated at grain: (year, month, category_pt, group_pt, total_gastos)

#### Scenario: Features used for training
- **WHEN** a model is trained for a tenant
- **THEN** the feature set includes: `mes_do_ano` (1-12), `media_3m_categoria` (3-month rolling avg per category), `total_meses_hist` (count of months in history), `category_pt` (OneHot encoded), `group_pt` (OneHot encoded)
- **AND** the target is `total_gastos` (monthly spending in BRL)

#### Scenario: Tenant with insufficient data is skipped
- **WHEN** a tenant has fewer than 3 complete months of historical spending data
- **THEN** the worker skips model training for that tenant
- **AND** inserts a row in `forecast_model_meta` with `status = 'insufficient_data'`
- **AND** does NOT insert rows into `forecast_predictions` for that tenant

#### Scenario: Predictions cover next 3 months
- **WHEN** training succeeds for a tenant
- **THEN** the worker generates predictions for each category for the next 3 calendar months
- **AND** each prediction includes `predicted_amount`, `lower_bound` (predicted - 2×desvio), `upper_bound` (predicted + 2×desvio)

#### Scenario: Predictions are saved via UPSERT
- **WHEN** the worker finishes generating predictions for a tenant
- **THEN** it UPSERTs into `forecast_predictions` on conflict `(tenant_id, category_pt, target_year, target_month)`

#### Scenario: Training metadata is recorded
- **WHEN** training completes (success or skip)
- **THEN** a row is inserted into `forecast_model_meta` with `trained_at`, `months_of_history`, `mae`, `mape`, `status`

## ADDED Requirements

### Requirement: ML worker trains one RandomForest model per tenant daily
The system SHALL train a separate `RandomForestRegressor` model for each tenant daily at 00:00, using the tenant's historical monthly spending per category as training data.

#### Scenario: Training reads from cube_gastos_mensais via superuser connection
- **WHEN** the ML worker starts a training cycle
- **THEN** it queries `cube_gastos_mensais` filtered by tenant_id using a Postgres superuser connection (bypassing RLS)
- **AND** data is aggregated at grain: (year, month, category_pt, group_pt, total_gastos)

#### Scenario: Features used for training
- **WHEN** a model is trained for a tenant
- **THEN** the feature set includes: `mes_do_ano` (1-12), `media_3m_categoria` (3-month rolling avg per category), `total_meses_hist` (count of months in history), `category_pt` (OneHot encoded), `group_pt` (OneHot encoded)
- **AND** the target is `total_gastos` (monthly spending in BRL)

#### Scenario: Tenant with insufficient data is skipped
- **WHEN** a tenant has fewer than 3 complete months of historical spending data
- **THEN** the worker skips model training for that tenant
- **AND** inserts a row in `forecast_model_meta` with `status = 'insufficient_data'`
- **AND** does NOT insert rows into `forecast_predictions` for that tenant

#### Scenario: Predictions cover next 3 months
- **WHEN** training succeeds for a tenant
- **THEN** the worker generates predictions for each category for the next 3 calendar months
- **AND** each prediction includes `predicted_amount`, `lower_bound` (predicted - 2×desvio), `upper_bound` (predicted + 2×desvio)

#### Scenario: Predictions are saved via UPSERT
- **WHEN** the worker finishes generating predictions for a tenant
- **THEN** it UPSERTs into `forecast_predictions` on conflict `(tenant_id, category_pt, target_year, target_month)`

#### Scenario: Training metadata is recorded
- **WHEN** training completes (success or skip)
- **THEN** a row is inserted into `forecast_model_meta` with `trained_at`, `months_of_history`, `mae`, `mape`, `status`
