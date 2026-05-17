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
The system SHALL display a chart showing monthly spending by budget group (Necessidades, Desejos, Poupança) for the last 3 real months and next 3 forecast months, fetched from `GET /api/forecast/groups`, usando componentes da nova stack Tremor/Recharts, com legibilidade preservada em layout mobile-first e sem sobreposição da tabbar fixa.

#### Scenario: Dados disponíveis — gráfico combinado
- **WHEN** `GET /api/forecast/groups` returns `months` with both real and forecast items
- **THEN** a grouped chart is displayed where real months have visual style distinct from forecast months
- **AND** the X axis shows month/year labels legíveis em viewport mobile
- **AND** forecast points/bars provide contextual information in tooltip

#### Scenario: Sem dados de previsão
- **WHEN** `GET /api/forecast/groups` returns `{ has_forecast: false }`
- **THEN** only real months are shown in the chart
- **AND** a label "Previsões ainda sendo preparadas" is shown below the chart
- **AND** nenhum elemento do gráfico ou mensagem fica coberto pela tabbar fixa

### Requirement: Aba Previsão exibe tabela de categorias (real + previsto)
The system SHALL display a table below the group chart showing spending per category for the current month (real) and next month (forecast), fetched from `GET /api/forecast/categories`, sem dependência de classes visuais específicas do MUI, com leitura completa em mobile e sem sobreposição da tabbar fixa.

#### Scenario: Tabela exibe categoria, grupo, real e previsto
- **WHEN** `GET /api/forecast/categories` returns data
- **THEN** each row shows: `category_pt`, `group_pt`, `amount` real do mês atual, `amount` previsto do próximo mês
- **AND** rows are sorted by `group_pt` then by `amount` descending
- **AND** ao rolar até o fim da tabela, as últimas linhas permanecem totalmente visíveis acima da tabbar fixa

#### Scenario: Sem dados de previsão — tabela mostra apenas real
- **WHEN** forecast data is unavailable
- **THEN** the table shows only real data for the current month with the forecast column empty
- **AND** o estado vazio mantém espaçamento adequado e legível em viewport mobile

### Requirement: Aba Previsão trata loading e erros
The system SHALL display a loading state while data is being fetched and an error state if any request fails.

#### Scenario: Loading state
- **WHEN** the Previsão tab mounts and requests are in flight
- **THEN** a `LoadingCard` with label "Carregando Previsão..." is shown

#### Scenario: Error state
- **WHEN** any of the 3 requests fail
- **THEN** an `ErrorCard` with the error message is shown

### Requirement: Aba Previsão é acessível via bottom navigation
The system SHALL add a "Previsão" entry to the bottom navigation bar between "Próximo Mês" and "Investimentos", mantendo navegação fixa sem prejudicar leitura do conteúdo da aba.

#### Scenario: Nova aba visível no nav
- **WHEN** the user views the app
- **THEN** a bottom nav item labeled "Previsão" with a trend/forecast icon is visible
- **AND** tapping it navigates to the Previsão tab

#### Scenario: Conteúdo final sem sobreposição
- **WHEN** the user scrolls to the end of the Previsão tab
- **THEN** tabela e cards finais continuam totalmente visíveis
- **AND** a bottom navigation fixa não cobre conteúdo interativo ou textual

