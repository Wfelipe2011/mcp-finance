## ADDED Requirements

### Requirement: View d_data expõe atributos de calendário em PT-BR
O sistema SHALL criar uma view `d_data` que extrai datas distintas de `transactions_enriched.date` e expõe: `date_day` (DATE), `year` (INT), `month` (INT), `month_name_pt` (TEXT, ex: 'Janeiro'), `quarter` (INT), `quarter_label` (TEXT, ex: 'T1'), `day_of_week` (INT, 1=Domingo), `day_name_pt` (TEXT, ex: 'Segunda'), `is_weekend` (BOOLEAN).

#### Scenario: Atributos de calendário corretos para uma data conhecida
- **WHEN** `d_data` é consultada para `date_day = '2026-01-15'`
- **THEN** retorna `year = 2026`, `month = 1`, `month_name_pt = 'Janeiro'`, `quarter = 1`, `quarter_label = 'T1'`, `is_weekend = false`

#### Scenario: Apenas datas com transações reais aparecem
- **WHEN** `d_data` é consultada
- **THEN** o número de linhas é igual ao número de `date_day` distintos em `transactions_enriched`
