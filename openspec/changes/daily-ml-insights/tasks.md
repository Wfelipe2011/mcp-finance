> **Referência obrigatória para subagents**: Antes de implementar qualquer task, leia o TechSpec completo em `.compozy/tasks/daily-ml-insights/_techspec.md`. Ele contém os DDLs exatos, assinaturas de funções Python, shapes de resposta da API, lógica de negócio e critérios de aceitação para cada componente.

<critical>
Cada grupo numerado (## 1, ## 2, ## 3, ...) deve ser executado por um subagent independente. Não implemente tasks de grupos diferentes no mesmo agente. Isso garante isolamento, rastreabilidade e permite execução paralela dos grupos sem dependência direta.
</critical>

## 1. Schema de Banco de Dados

- [x] 1.1 Criar VIEW `daily_habit_signals` em `src/infrastructure/db/forecast.sql` com agrego por `(tenant_id, day_of_week, day_of_month, category_pt, group_pt)`, colunas `occurrences`, `avg_amount`, `std_amount`, `occurrences_6m`, filtro `amount < 0` e HAVING `COUNT(*) >= 3`
- [x] 1.2 Criar tabela `forecast_daily_predictions` com colunas `id BIGSERIAL PK`, `tenant_id UUID FK`, `prediction_date DATE`, `category_pt TEXT`, `group_pt TEXT`, `predicted_amount NUMERIC(18,2)`, `lower_bound`, `upper_bound`, `probability NUMERIC(5,4)`, `model_version TEXT DEFAULT 'v1'`, `created_at`, UNIQUE `(tenant_id, prediction_date, category_pt)` e index em `(tenant_id, prediction_date)`
- [x] 1.3 Criar tabela `daily_insight_jobs` (UNIQUE em `(tenant_id, job_date)`, status check constraint, RLS), tabela `forecast_user_feedback` (rating check, correction_tag check, RLS), e migration aditiva de `forecast_ai_messages` adicionando coluna `message_type TEXT NOT NULL DEFAULT 'monthly'` e reconstruindo UNIQUE constraint

## 2. Extensões do Python Trainer

- [x] 2.1 Implementar `load_daily_habit_signals(tenant_id: str) -> pd.DataFrame` que faz query na VIEW `daily_habit_signals` e `generate_daily_predictions(pipeline, df_signals, tenant_id, days=30) -> list[dict]` que produz linhas para os próximos 30 dias por categoria com `probability`, `lower_bound` e `upper_bound`
- [x] 2.2 Implementar `load_user_feedback(tenant_id: str) -> pd.DataFrame` que lê `forecast_user_feedback` e `apply_feedback_weights(df, feedback) -> pd.DataFrame` que aplica up-weight 3× em amostras com rating `down` (exceto `correction_tag IN ('Viagem', 'Evento especial')`), limitado a 20% do peso total
- [x] 2.3 Integrar novas funções no loop principal do trainer: chamar `generate_daily_predictions` após treino mensal; chamar `apply_feedback_weights` quando `job.trigger == 'user_feedback'`; implementar `save_daily_predictions()` com UPSERT em `forecast_daily_predictions`

## 3. BunPgAdapter — Métodos de Consulta

- [x] 3.1 Adicionar métodos no namespace `forecast` do `BunPgAdapter.ts`: `getDailyInsight(date: string)`, `getDailyHabitSignals(date: string)`, `getDailyPrediction(date: string)` e `saveDailyInsightMessage(date, message, contextJson, modelVersion, insightType)`
- [x] 3.2 Adicionar namespace `feedback` no `BunPgAdapter.ts` com métodos: `getDeviations(year, month)` (join `forecast_predictions` com gastos reais + feedback existente), `saveFeedback(items)`, `getFeedbackSummary(tenantId)` e `enqueueRetrain(tenantId)`
- [x] 3.3 Adicionar função `generateDailyInsightMessage(context: DailyInsightContext): Promise<string>` em `src/infrastructure/ai/forecastAgent.ts` com prompt estruturado em pt-BR incluindo `insight_type`, `category_pt`, `occurrences`, `avg_amount`, `probability` e `suggested_action_type` mapeado por categoria

## 4. Cron + Worker Diário

- [x] 4.1 Criar `src/application/cron/daily-insight-cron.ts` espelhando `forecast-cron.ts`: agendar às 00:35 BRT, iterar tenants ativos, inserir linha em `daily_insight_jobs` com `status = 'pending'` e `job_date = CURRENT_DATE`, ignorar conflito de UNIQUE
- [x] 4.2 Criar `src/application/workers/daily-insight-worker.ts` com loop de polling: claim job `pending → running`, ler sinais de `daily_habit_signals` + previsões de `forecast_daily_predictions`, selecionar top categoria (probability >= 0.3 e occurrences_6m >= 3), chamar `generateDailyInsightMessage()`, salvar em `forecast_ai_messages` com `message_type = 'daily_insight'`, marcar job `done`; em caso de falha marcar `error` com `error_msg`; logar `status=no_signal` quando sem sinal suficiente
- [x] 4.3 Adicionar serviço `daily-insight-worker` em `docker-compose.yml` espelhando configuração do serviço `forecast-worker` existente

## 5. Rotas da API

- [x] 5.1 Criar `src/application/web/routes/forecast/daily.ts` com handler `GET /api/forecast/daily`: derivar tenant do JWT, chamar `getDailyInsight(today)`, retornar 200 com shape definido ou 204 No Content se null; incluir `secondary_insights` com itens de `getDailyPrediction` com `probability >= 0.3`
- [x] 5.2 Criar `src/application/web/routes/forecast/feedback.ts` com handlers: `GET /api/forecast/feedback/deviations?year=YYYY&month=MM` (validar params, chamar `getDeviations`, retornar lista ordenada por `deviation_pct` desc) e `POST /api/forecast/feedback` (validar body, chamar `saveFeedback`, retornar `{ saved: n }`)
- [x] 5.3 Adicionar handler `POST /api/forecast/feedback/retrain` em `feedback.ts` (verificar mínimo 3 feedbacks via `getFeedbackSummary`, retornar 400 se insuficiente, chamar `enqueueRetrain`, retornar 200) e registrar as 4 novas rotas em `src/application/web/router.ts`

## 6. Frontend — Tipos e API Client

- [x] 6.1 Adicionar interfaces em `client/src/api/types.ts`: `DailyInsight`, `SecondaryInsight`, `ForecastDeviation`, `FeedbackItem`, `FeedbackResponse` conforme shapes dos endpoints definidos nas specs
- [x] 6.2 Adicionar funções em `client/src/api/client.ts`: `fetchDailyInsight(): Promise<DailyInsight | null>` (retorna null para 204), `fetchDeviations(year: number, month: number): Promise<ForecastDeviation[]>`, `submitFeedback(items: FeedbackItem[]): Promise<FeedbackResponse>`, `requestRetrain(): Promise<void>`

## 7. Frontend — Componentes UI

- [x] 7.1 Criar componente `DailyInsightCard` em `client/src/tabs/Previsao.tsx` (ou arquivo separado): exibe `message_pt`, badge de categoria, barra de probabilidade visual (0–100% com largura proporcional), valor estimado com bounds; atualizar `Previsao.tsx` para chamar `fetchDailyInsight()` na montagem e exibir o card acima das seções existentes (fallback: mensagem mensal se null)
- [x] 7.2 Criar `client/src/tabs/Treinar.tsx` com: seletor de mês/ano, lista de desvios buscada em `fetchDeviations()` ordenada por `deviation_pct` desc, botões 👍/👎 por linha, dropdown de motivo (4 opções) aparecendo apenas para 👎, chamada a `submitFeedback()` ao confirmar rating com ícone marcado
- [x] 7.3 Adicionar botão "Re-treinar Modelo" em `Treinar.tsx` (desabilitado com < 3 avaliações, com tooltip explicativo) que chama `requestRetrain()` e exibe banner de confirmação ou mensagem de erro; adicionar entrada `{ label: '🧠 Treinar', component: Treinar }` no array de abas em `client/src/App.tsx`

## 8. Validação Final

- [x] 8.1 Rodar `cd client && bun run build` para validar TypeScript sem erros; corrigir quaisquer type errors introduzidos pelas novas interfaces e componentes
- [x] 8.2 Verificar via API local (`curl http://localhost:3001/api/forecast/daily`) que endpoints respondem corretamente (200 ou 204 conforme dados disponíveis)
- [x] 8.3 Confirmar no banco (`forecast_daily_predictions`, `daily_insight_jobs`, `forecast_ai_messages`) que as tabelas existem e RLS está ativa; verificar que registros existentes em `forecast_ai_messages` têm `message_type = 'monthly'`
