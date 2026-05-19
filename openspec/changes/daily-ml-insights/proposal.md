## Why

O pipeline ML atual produz previsões mensais por categoria, mas o usuário não recebe alertas comportamentais no momento certo — como saber que hoje é um dia de alto risco para gastos com delivery. Este feature adiciona uma camada de inteligência diária que transforma histórico de transações em insights personalizados acionáveis, exibidos como hero card na aba Previsão, com loop de feedback para o usuário ajustar a precisão do modelo ao longo do tempo.

## What Changes

- **Nova tabela** `forecast_daily_predictions` — previsões diárias por categoria para os próximos 30 dias, geradas pelo trainer Python
- **Nova view SQL** `daily_habit_signals` — agrega padrões de gasto por dia-da-semana, dia-do-mês e categoria por tenant
- **Nova tabela** `daily_insight_jobs` — fila de jobs para geração diária de insight LLM (espelho de `forecast_jobs`)
- **Nova tabela** `forecast_user_feedback` — ratings 👍/👎 por categoria/mês com tag de motivo
- **Migração aditiva** `forecast_ai_messages` — coluna `message_type` com default `'monthly'` para discriminar insights diários
- **Extensão do trainer Python** (`src/ml/trainer.py`) — novas funções: `load_daily_habit_signals`, `generate_daily_predictions`, `load_user_feedback`, `apply_feedback_weights`
- **Novo cron** `daily-insight-cron.ts` — enfileira `daily_insight_jobs` às 00:35 BRT
- **Novo worker** `daily-insight-worker.ts` — consome jobs, lê sinais + previsões, chama LLM, salva insight
- **Novos endpoints REST**: `GET /api/forecast/daily`, `GET /api/forecast/feedback/deviations`, `POST /api/forecast/feedback`, `POST /api/forecast/feedback/retrain`
- **Atualização do frontend**: hero card de insight diário em `Previsao.tsx` + nova aba `Treinar.tsx` com lista de desvios, ratings e botão de re-treino

## Capabilities

### New Capabilities

- `daily-habit-signals`: View SQL `daily_habit_signals` que agrega padrões de gasto histórico por tenant — dia da semana, dia do mês, categoria, frequência, valor médio — para alimentar o modelo e o worker
- `daily-ml-predictions`: Extensão do trainer Python e nova tabela `forecast_daily_predictions` com previsões diárias (30 dias) por categoria com probabilidade, bounds e model_version
- `daily-insight-worker`: Cron + worker dedicado que lê sinais e previsões, chama LLM com prompt estruturado e salva hero message em `forecast_ai_messages` com `message_type = 'daily_insight'`
- `forecast-feedback`: Endpoints e tabela `forecast_user_feedback` para o usuário avaliar desvios de previsão e acionar re-treino com sample weights ajustados
- `daily-insight-ui`: Hero card de insight diário em `Previsao.tsx` + nova aba `🧠 Treinar` com lista de desvios, thumbs up/down, seleção de motivo e botão de re-treino

### Modified Capabilities

<!-- Nenhuma spec existente tem seus requisitos alterados. A migração de forecast_ai_messages é aditiva (DEFAULT preserva todos os registros existentes). -->

## Impact

**Backend:**
- `src/infrastructure/db/forecast.sql` — 4 novos DDLs + 1 migration
- `src/ml/trainer.py` — 4 novas funções; backward-compatible com treinamento mensal existente
- `src/infrastructure/db/BunPgAdapter.ts` — novos métodos em `forecast.*` e namespace `feedback.*`
- `src/infrastructure/ai/forecastAgent.ts` — nova função `generateDailyInsightMessage()`
- `src/application/cron/daily-insight-cron.ts` — novo arquivo
- `src/application/workers/daily-insight-worker.ts` — novo arquivo
- `src/application/web/router.ts` — 4 novas rotas registradas
- `src/application/web/routes/forecast/daily.ts` — novo arquivo
- `src/application/web/routes/forecast/feedback.ts` — novo arquivo
- `docker-compose.yml` — novo serviço `daily-insight-worker`

**Frontend:**
- `client/src/tabs/Previsao.tsx` — hero card + painel de acurácia (seções existentes inalteradas)
- `client/src/tabs/Treinar.tsx` — nova aba
- `client/src/App.tsx` — registro da nova aba
- `client/src/api/client.ts` — 4 novas funções de fetch
- `client/src/api/types.ts` — novas interfaces: `DailyInsight`, `ForecastDeviation`, `FeedbackItem`

**Dependências externas:** nenhuma; usa LLM já configurado (`AI_MODEL`) banco Postgres existente.
