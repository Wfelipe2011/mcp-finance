# daily-insight-card-ui Specification

## Purpose
TBD - created by archiving change insights-card-enrich. Update Purpose after archive.
## Requirements
### Requirement: DailyInsightsNavigator exibe dados ricos do context_json
O sistema SHALL atualizar `MessageContent` dentro de `DailyInsightsNavigator.tsx` para renderizar, além de `message_pt`, os campos contextuais retornados pelo endpoint `GET /api/forecast/daily?date=YYYY-MM-DD`: chip de categoria, barra de probabilidade, estimativa de valor com range e lista de insights secundários.

#### Scenario: Card enriquecido quando dados estão presentes
- **WHEN** usuário navega para uma data que tem insight disponível
- **AND** `GET /api/forecast/daily?date=<data>` retorna `{ has_insight: true, category_pt: "Compras", probability: 0.78, estimated_amount: 49.83, lower_bound: 22.00, upper_bound: 110.00, secondary_insights: [...] }`
- **THEN** o card exibe chip com o nome da categoria
- **AND** barra de progresso indicando a probabilidade em %
- **AND** linha de estimativa `R$ 49,83 (R$ 22,00 – R$ 110,00)`
- **AND** lista de categorias secundárias com probabilidade e valor estimado

#### Scenario: Card degradado quando sem dados contextuais
- **WHEN** `GET /api/forecast/daily?date=<data>` retorna `{ has_insight: false }` ou status 204
- **THEN** o card exibe apenas a mensagem "Sem mensagem disponível para este dia."
- **AND** não exibe barra de probabilidade nem estimativas

### Requirement: Botão "Regerar" visível apenas para o dia de hoje
O sistema SHALL exibir um botão "Regerar" no card do Navigator exclusivamente quando a data exibida é o dia atual (não para passado nem futuro).

#### Scenario: Botão visível apenas para Hoje
- **WHEN** usuário navega até a data de hoje no DailyInsightsNavigator
- **THEN** botão "Regerar" aparece abaixo do conteúdo do card

#### Scenario: Botão não visível para datas passadas ou futuras
- **WHEN** usuário navega para qualquer data que não seja hoje
- **THEN** botão "Regerar" não é renderizado

#### Scenario: Regerar dispara POST e atualiza card
- **WHEN** usuário clica em "Regerar"
- **AND** `POST /api/forecast/daily/regenerate` retorna 200
- **THEN** o botão fica disabled durante o loading
- **AND** ao completar, o card re-renderiza com os novos dados do response

#### Scenario: Regerar sem predições disponíveis
- **WHEN** usuário clica em "Regerar"
- **AND** `POST /api/forecast/daily/regenerate` retorna 409
- **THEN** o botão volta ao estado normal
- **AND** uma mensagem de erro "Sem previsões disponíveis para hoje" é exibida

### Requirement: DailyInsightCard extraído como componente compartilhado
O sistema SHALL mover o componente `DailyInsightCard` de `Previsao.tsx` para `client/src/components/DailyInsightCard.tsx`, sendo importado tanto por `Previsao.tsx` quanto por `DailyInsightsNavigator.tsx`.

#### Scenario: Previsao.tsx usa componente extraído sem mudança de comportamento
- **WHEN** usuário acessa a aba Previsões
- **THEN** o `DailyInsightCard` é renderizado com o mesmo visual de antes
- **AND** todos os campos (categoria, probabilidade, estimativa, secundários) continuam funcionando

