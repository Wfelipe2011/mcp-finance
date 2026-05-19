## ADDED Requirements

### Requirement: POST /api/forecast/daily/regenerate gera novo insight para hoje
O sistema SHALL expor endpoint autenticado `POST /api/forecast/daily/regenerate` que busca dados frescos do banco (hábitos diários + predições do dia) e gera um novo insight via LLM, salvando via UPSERT em `forecast_ai_messages` com `message_type = 'daily_insight'`, retornando o novo payload no response.

#### Scenario: Regeneração bem-sucedida
- **WHEN** usuário autenticado faz `POST /api/forecast/daily/regenerate`
- **AND** existem `forecast_daily_predictions` com `prediction_date = hoje` para o tenant
- **THEN** o sistema busca `getDailyHabitSignals(today)` e `getDailyPrediction(today)`
- **AND** chama `generateDailyInsightMessage(context)` com os dados frescos
- **AND** faz UPSERT em `forecast_ai_messages` sobrescrevendo o registro do dia
- **AND** retorna status 200 com o mesmo shape de `GET /api/forecast/daily`

#### Scenario: Sem predições disponíveis
- **WHEN** usuário faz `POST /api/forecast/daily/regenerate`
- **AND** não existem `forecast_daily_predictions` para hoje com probability >= 0.3
- **THEN** o sistema retorna status 409 com body `{ "error": "Sem previsões disponíveis para hoje" }`
- **AND** nenhum dado é escrito no banco

#### Scenario: Autenticação obrigatória
- **WHEN** requisição sem token JWT válido chega ao endpoint
- **THEN** o sistema retorna status 401
