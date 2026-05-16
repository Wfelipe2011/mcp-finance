## 1. Schema — Tabela forecast_ai_messages

- [ ] 1.1 Adicionar tabela `forecast_ai_messages` ao `src/infrastructure/db/forecast.sql` com colunas: id (SERIAL PK), tenant_id (UUID FK), message_date (DATE), message_pt (TEXT), context_json (JSONB), model_version (TEXT), created_at (TIMESTAMP DEFAULT NOW())
- [ ] 1.2 Adicionar UNIQUE constraint em `(tenant_id, message_date)`
- [ ] 1.3 Habilitar RLS na tabela e criar policy de isolamento por `tenant_id`

## 2. BunPgAdapter — Métodos de dados

- [ ] 2.1 Adicionar método `forecast.getPredictionsByGroup(tenantId)` que lê `forecast_predictions` agrupado por group_pt para os próximos 3 meses
- [ ] 2.2 Adicionar método `forecast.getCurrentMonthSpendingByGroup(tenantId)` que lê `cube_gastos_mensais` para o mês atual agregado por group_pt
- [ ] 2.3 Adicionar método `forecast.saveDailyMessage(tenantId, date, message, contextJson, modelVersion)` que faz UPSERT em `forecast_ai_messages`
- [ ] 2.4 Adicionar método `forecast.getDailyMessage(tenantId, date)` que retorna a mensagem do dia para o tenant

## 3. AI Agent — forecastAgent.ts

- [ ] 3.1 Criar `src/infrastructure/ai/forecastAgent.ts` com função `generateForecastMessage(context)` seguindo o padrão de `digestAgent.ts`
- [ ] 3.2 Implementar prompt que recebe: spending por grupo (mês atual), predições por grupo (3 meses), status 50/30/20 → instrui LLM a gerar 1-2 frases em português, concretas e acionáveis

## 4. Cron — forecast-cron.ts

- [ ] 4.1 Criar `src/application/cron/forecast-cron.ts` seguindo a estrutura de `digest-cron.ts`
- [ ] 4.2 Implementar `runForecastCron()`: lista tenants → para cada tenant: busca predições + spending atual → skip se sem predições → chama `generateForecastMessage` → salva via UPSERT
- [ ] 4.3 Implementar `scheduleNext()` para rodar às 00:30 BRT diariamente
- [ ] 4.4 Adicionar script `"forecast-cron": "bun run src/application/cron/forecast-cron.ts"` ao `package.json`

## 5. Docker Compose — Novo pod

- [ ] 5.1 Adicionar serviço `forecast-cron` ao `docker-compose.yml` com `command: bun run forecast-cron`, `AI_BASE_URL`, `AI_MODEL`, `DATABASE_URL`, `depends_on: postgres`, `restart: always`

## 6. Validação

- [ ] 6.1 Rodar `forecast-cron` manualmente e verificar rows em `forecast_ai_messages`
- [ ] 6.2 Confirmar UPSERT: rodar duas vezes no mesmo dia e verificar que não duplica
- [ ] 6.3 Confirmar skip quando tenant não tem predições
- [ ] 6.4 Confirmar que erro em um tenant não para os demais
