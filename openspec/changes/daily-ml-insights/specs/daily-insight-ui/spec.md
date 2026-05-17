## ADDED Requirements

### Requirement: Previsao.tsx exibe hero card de insight diário
O sistema SHALL atualizar `Previsao.tsx` para chamar `GET /api/forecast/daily` na montagem. Se retornar 200, exibe `DailyInsightCard` com a mensagem personalizada, categoria, probabilidade e valor estimado acima das seções existentes. Se retornar 204, mantém o comportamento atual (mensagem mensal).

#### Scenario: Hero card aparece com insight disponível
- **WHEN** a API retorna 200 com insight diário
- **THEN** `DailyInsightCard` é exibido no topo da aba com `message_pt`, badge de categoria e valor estimado

#### Scenario: Fallback para mensagem mensal sem insight diário
- **WHEN** a API retorna 204
- **THEN** Previsao.tsx exibe a mensagem mensal existente como antes, sem alteração de layout

#### Scenario: Secondary insights listados abaixo do card principal
- **WHEN** `secondary_insights` tem pelo menos 1 item com probability >= 0.3
- **THEN** itens secundários são exibidos em lista compacta abaixo do hero card

### Requirement: DailyInsightCard exibe probabilidade como barra visual
O sistema SHALL incluir no hero card uma barra de probabilidade (0–100%) com cor gradiente proporcional ao valor de `probability` da resposta da API.

#### Scenario: Barra reflete probabilidade numericamente
- **WHEN** `probability = 0.62`
- **THEN** a barra de progresso tem largura de 62% e exibe "62%" como texto

### Requirement: Nova aba Treinar.tsx com lista de desvios e ratings
O sistema SHALL criar `client/src/tabs/Treinar.tsx` que exibe: seletor de mês/ano, lista de desvios buscada em `GET /api/forecast/feedback/deviations`, botões 👍/👎 por categoria, dropdown de motivo para 👎, e botão "Re-treinar Modelo".

#### Scenario: Lista de desvios ordenada por maior desvio
- **WHEN** o usuário seleciona um mês com desvios
- **THEN** a lista exibe categorias ordenadas por `deviation_pct` decrescente (maior desvio no topo)

#### Scenario: Dropdown de motivo aparece apenas para avaliação negativa
- **WHEN** o usuário clica 👎 em uma categoria
- **THEN** aparece dropdown com opções: "Viagem", "Evento especial", "Mudança de hábito", "Outra situação atípica"

#### Scenario: Avaliação salva ao clicar no botão de rating
- **WHEN** o usuário clica 👍 ou confirma 👎 com motivo
- **THEN** `POST /api/forecast/feedback` é chamado e o ícone de rating fica marcado como selecionado

### Requirement: Botão Re-treinar envia POST e confirma enfileiramento
O sistema SHALL implementar o botão "Re-treinar Modelo" em `Treinar.tsx` que chama `POST /api/forecast/feedback/retrain`. Se 200, exibe confirmação "Modelo em re-treino". Se 400, exibe a mensagem de erro da API.

#### Scenario: Botão desabilitado com menos de 3 avaliações
- **WHEN** o usuário avaliou apenas 2 categorias na sessão atual
- **THEN** o botão "Re-treinar Modelo" está desabilitado com tooltip explicativo

#### Scenario: Feedback de sucesso após re-treino enfileirado
- **WHEN** a API retorna 200
- **THEN** exibe banner "Modelo em re-treino. Os resultados aparecerão no próximo ciclo de previsão."

### Requirement: App.tsx registra aba Treinar na tabbar
O sistema SHALL adicionar entrada `{ label: '🧠 Treinar', component: Treinar }` no array de abas de `App.tsx`.

#### Scenario: Aba aparece como 6ª tab
- **WHEN** o usuário visualiza a tabbar
- **THEN** a aba "🧠 Treinar" aparece após as 5 abas existentes

### Requirement: Tipos e funções de fetch em client/src/api/
O sistema SHALL adicionar em `types.ts` as interfaces: `DailyInsight`, `SecondaryInsight`, `ForecastDeviation`, `FeedbackItem`, `FeedbackResponse`. Em `client.ts`, as funções: `fetchDailyInsight()`, `fetchDeviations(year, month)`, `submitFeedback(items)`, `requestRetrain()`.

#### Scenario: fetchDailyInsight retorna null para 204
- **WHEN** a API responde 204
- **THEN** `fetchDailyInsight()` retorna `null` (não lança erro)

#### Scenario: Funções de fetch propagam erros de rede
- **WHEN** a API retorna 4xx ou 5xx
- **THEN** a função lança erro com a mensagem da API para o componente tratar
