## ADDED Requirements

### Requirement: v_budget_5030_20 view applies the 50/30/20 budget method to real spending
The system SHALL provide a SQLite view `v_budget_5030_20` that returns exactly 3 rows — one per budget group (NECESSIDADES, DESEJOS, POUPANÇA) — comparing the user's real spending in the last 30 days against the 50/30/20 ideal percentages, using observed monthly income as the reference.

#### Scenario: View returns exactly 3 rows
- **WHEN** `v_budget_5030_20` is queried
- **THEN** it returns exactly 3 rows with `grupo` values of 'NECESSIDADES', 'DESEJOS', and 'POUPANÇA'

#### Scenario: renda_mensal_obs is the average of real income from the 3 last complete months
- **WHEN** `v_budget_5030_20` is queried
- **THEN** `renda_mensal_obs` equals the average of `entradas_reais` (CREDIT transactions excluding noise) for the 3 most recent complete calendar months
- **AND** the current (incomplete) month is excluded from this calculation

#### Scenario: NECESSIDADES group aggregates spending from mapped necessity categories
- **WHEN** `v_budget_5030_20` is queried
- **THEN** the NECESSIDADES row `gasto_30d` is the sum of ABS(amount) for DEBIT transactions in the last 30 days where `category` belongs to the necessity category list (Groceries, Housing, Rent, Electricity, Gas stations, Pharmacy, School, Education, Online Courses, Hospital clinics and labs, Healthcare, Health insurance, Insurance, Telecommunications, Internet, Mobile, Public transportation, Transportation, Legal obligations, Taxes, Automotive, Vehicle maintenance, Houseware, Services)
- **AND** `pct_ideal` is 50

#### Scenario: DESEJOS group aggregates spending from mapped desire categories
- **WHEN** `v_budget_5030_20` is queried
- **THEN** the DESEJOS row `gasto_30d` is the sum of ABS(amount) for DEBIT transactions in the last 30 days where `category` belongs to the desire category list (Shopping, Online shopping, Eating out, Food delivery, Food and drinks, Electronics, Clothing, Bookstore, Digital services, Video streaming, Gyms and fitness centers, Cinema theater and concerts, Travel, Accomodation, Car rental, Taxi and ride-hailing, Parking, Tolls and in vehicle payment, Pet supplies and vet, Sports goods, Sports practice, Wellness and fitness, Bicycle)
- **AND** `pct_ideal` is 30

#### Scenario: POUPANÇA is computed as what remains after necessity and desire spending
- **WHEN** `v_budget_5030_20` is queried
- **THEN** the POUPANÇA row `gasto_30d` equals `renda_mensal_obs - necessidades_30d - desejos_30d`
- **AND** `pct_ideal` is 20
- **AND** `gasto_30d` may be negative (indicating a deficit month)

#### Scenario: pct_real reflects actual percentage of observed income
- **WHEN** `v_budget_5030_20` is queried
- **THEN** `pct_real` equals `ROUND(gasto_30d * 100.0 / NULLIF(renda_mensal_obs, 0), 1)` for each row

#### Scenario: delta_pct and status indicate deviation from ideal
- **WHEN** `v_budget_5030_20` is queried
- **THEN** `delta_pct` equals `pct_real - pct_ideal` for each row
- **AND** `status` is `'OK'` when `ABS(delta_pct) <= 5`
- **AND** `status` is `'ACIMA'` when `delta_pct > 5`
- **AND** `status` is `'ABAIXO'` when `delta_pct < -5`
