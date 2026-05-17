## ADDED Requirements

### Requirement: GET /api/forecast/daily retorna insight diário personalizado
O sistema SHALL implementar o endpoint `GET /api/forecast/daily` que retorna o insight do dia atual para o tenant do JWT. Se não houver insight, retorna 204. Se houver, retorna 200 com o shape definido.

#### Scenario: Retorna 200 com insight disponível
- **WHEN** existe um `forecast_ai_messages` com `message_type = 'daily_insight'` e `message_date = CURRENT_DATE` para o tenant
- **THEN** resposta 200 com campos: `has_insight`, `insight_type`, `message_pt`, `category_pt`, `probability`, `estimated_amount`, `lower_bound`, `upper_bound`, `signal_count`, `period_months`, `insight_date`, `secondary_insights[]`

#### Scenario: Retorna 204 sem insight disponível
- **WHEN** não existe mensagem diária para o tenant na data atual
- **THEN** resposta 204 No Content (sem body)

#### Scenario: Tenant derivado do JWT, sem param na query
- **WHEN** cliente faz request sem parâmetros de tenant
- **THEN** o endpoint usa o `tenant_id` do JWT para filtrar dados

### Requirement: GET /api/forecast/feedback/deviations retorna desvios de um mês
O sistema SHALL implementar `GET /api/forecast/feedback/deviations?year=YYYY&month=MM` retornando desvios entre `forecast_predictions` e gastos reais, ordenados por desvio absoluto decrescente.

#### Scenario: Retorna lista de desvios com dados de avaliação
- **WHEN** o cliente consulta desvios para um mês já fechado
- **THEN** cada item inclui: `prediction_id`, `category_pt`, `group_pt`, `predicted_amount`, `actual_amount`, `deviation_pct`, `user_rating` (null se não avaliado), `correction_tag`

#### Scenario: Valida parâmetros obrigatórios
- **WHEN** `year` ou `month` não são fornecidos ou são inválidos
- **THEN** resposta 400 com mensagem de erro

### Requirement: POST /api/forecast/feedback salva avaliações do usuário
O sistema SHALL implementar `POST /api/forecast/feedback` recebendo array de `{ prediction_id, rating, correction_tag }` e salvando em `forecast_user_feedback` vinculado ao tenant do JWT.

#### Scenario: Salva múltiplas avaliações em uma requisição
- **WHEN** o cliente envia array com 3 itens de feedback
- **THEN** resposta 200 com `{ "saved": 3 }` e 3 linhas inseridas em `forecast_user_feedback`

#### Scenario: rating deve ser 'up' ou 'down'
- **WHEN** um item tem `rating` com valor inválido
- **THEN** resposta 400 com mensagem de validação

### Requirement: POST /api/forecast/feedback/retrain enfileira re-treino
O sistema SHALL implementar `POST /api/forecast/feedback/retrain` que verifica se o tenant tem pelo menos 3 feedbacks avaliados e, em caso positivo, insere job em `ml_training_jobs` com `trigger = 'user_feedback'`.

#### Scenario: Bloqueia re-treino com menos de 3 feedbacks
- **WHEN** o tenant tem apenas 2 itens de feedback avaliados
- **THEN** resposta 400 com `{ "error": "minimum 3 rated items required" }`

#### Scenario: Enfileira job com trigger correto
- **WHEN** o tenant tem 3 ou mais feedbacks
- **THEN** insere linha em `ml_training_jobs` com `trigger = 'user_feedback'` e resposta 200 `{ "enqueued": true }`

### Requirement: Tabela `forecast_user_feedback` tem RLS por tenant
O sistema SHALL criar `forecast_user_feedback` com `tenant_id UUID FK`, RLS habilitada e policy `USING (tenant_id = current_setting('app.tenant_id')::uuid)`.

#### Scenario: Usuário não acessa feedback de outros tenants
- **WHEN** tenant A consulta `forecast_user_feedback`
- **THEN** vê apenas seus próprios registros, invisíveis para tenant B
