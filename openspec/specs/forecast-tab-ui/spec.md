# forecast-tab-ui Specification

## Purpose
TBD - created by archiving change forecast-tab. Update Purpose after archive.
## Requirements
### Requirement: Aba Previsão exibe card com mensagem AI do dia
The system SHALL display a card at the top of the Previsão tab with the AI-generated message for the current day, fetched from `GET /api/forecast/message`.

#### Scenario: Mensagem disponível
- **WHEN** the user navigates to the Previsão tab
- **AND** `GET /api/forecast/message` returns `{ has_message: true, message_pt: "..." }`
- **THEN** a card is displayed with the message text in Portuguese
- **AND** a subtitle shows the message date (formatted as "dd/MM/yyyy")

#### Scenario: Mensagem não disponível
- **WHEN** `GET /api/forecast/message` returns `{ has_message: false }`
- **THEN** the card displays "Mensagem de IA ainda sendo preparada. Volte amanhã."

### Requirement: Aba Previsão exibe gráfico de gastos por grupo (real + previsto)
The system SHALL display a bar chart showing monthly spending by budget group (Necessidades, Desejos, Poupança) for the last 3 real months and next 3 forecast months, fetched from `GET /api/forecast/groups`.

#### Scenario: Dados disponíveis — gráfico combinado
- **WHEN** `GET /api/forecast/groups` returns `months` with both real and forecast items
- **THEN** a grouped bar chart is displayed where real months have solid bars and forecast months have visually distinct bars (e.g., translucent or different pattern)
- **AND** the X axis shows month/year labels
- **AND** hovering a forecast bar shows the lower_bound and upper_bound in the tooltip

#### Scenario: Sem dados de previsão
- **WHEN** `GET /api/forecast/groups` returns `{ has_forecast: false }`
- **THEN** only real months are shown in the chart
- **AND** a label "Previsões ainda sendo preparadas" is shown below the chart

### Requirement: Aba Previsão exibe tabela de categorias (real + previsto)
The system SHALL display a table below the group chart showing spending per category for the current month (real) and next month (forecast), fetched from `GET /api/forecast/categories`.

#### Scenario: Tabela exibe categoria, grupo, real e previsto
- **WHEN** `GET /api/forecast/categories` returns data
- **THEN** each row shows: `category_pt`, `group_pt`, `amount` real do mês atual, `amount` previsto do próximo mês
- **AND** rows are sorted by `group_pt` then by `amount` descending

#### Scenario: Sem dados de previsão — tabela mostra apenas real
- **WHEN** forecast data is unavailable
- **THEN** the table shows only real data for the current month with the forecast column empty

### Requirement: Aba Previsão trata loading e erros
The system SHALL display a loading state while data is being fetched and an error state if any request fails.

#### Scenario: Loading state
- **WHEN** the Previsão tab mounts and requests are in flight
- **THEN** a `LoadingCard` with label "Carregando Previsão..." is shown

#### Scenario: Error state
- **WHEN** any of the 3 requests fail
- **THEN** an `ErrorCard` with the error message is shown

### Requirement: Aba Previsão é acessível via bottom navigation
The system SHALL add a "Previsão" entry to the bottom navigation bar between "Próximo Mês" and "Investimentos".

#### Scenario: Nova aba visível no nav
- **WHEN** the user views the app
- **THEN** a bottom nav item labeled "Previsão" with a trend/forecast icon is visible
- **AND** tapping it navigates to the Previsão tab

