## MODIFIED Requirements

### Requirement: Aba Previsão exibe gráfico de gastos por grupo (real + previsto)
The system SHALL display a chart showing monthly spending by budget group (Necessidades, Desejos, Poupança) for the last 3 real months and next 3 forecast months, fetched from `GET /api/forecast/groups`, usando componentes da nova stack Tremor/Recharts.

#### Scenario: Dados disponíveis — gráfico combinado
- **WHEN** `GET /api/forecast/groups` returns `months` with both real and forecast items
- **THEN** a grouped chart is displayed where real months have visual style distinct from forecast months
- **AND** the X axis shows month/year labels
- **AND** forecast points/bars provide contextual information in tooltip

#### Scenario: Sem dados de previsão
- **WHEN** `GET /api/forecast/groups` returns `{ has_forecast: false }`
- **THEN** only real months are shown in the chart
- **AND** a label "Previsões ainda sendo preparadas" is shown below the chart

### Requirement: Aba Previsão exibe tabela de categorias (real + previsto)
The system SHALL display a table below the group chart showing spending per category for the current month (real) and next month (forecast), fetched from `GET /api/forecast/categories`, sem dependência de classes visuais específicas do MUI.

#### Scenario: Tabela exibe categoria, grupo, real e previsto
- **WHEN** `GET /api/forecast/categories` returns data
- **THEN** each row shows: `category_pt`, `group_pt`, `amount` real do mês atual, `amount` previsto do próximo mês
- **AND** rows are sorted by `group_pt` then by `amount` descending

#### Scenario: Sem dados de previsão — tabela mostra apenas real
- **WHEN** forecast data is unavailable
- **THEN** the table shows only real data for the current month with the forecast column empty
