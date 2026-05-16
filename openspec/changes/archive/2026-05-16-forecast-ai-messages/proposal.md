## Why

Após o `forecast-ml-worker` gerar predições para os próximos 3 meses, precisamos de um worker que transforme esses números em mensagens diárias contextualizadas por tenant — combinando predições + gastos reais do mês atual via LLM, seguindo o mesmo padrão do `digest-cron`.

## What Changes

- Novo pod Docker `forecast-cron` (Bun/TS), separado do `digest-cron`
- Script `src/application/cron/forecast-cron.ts` que roda diariamente após o treino do ML
- Lê `forecast_predictions` + spending atual do mês (`cube_gastos_mensais`)
- Monta contexto e chama LLM (mesmo padrão de `generateDigest` → `generateForecastMessage`)
- Salva mensagem diária em nova tabela `forecast_ai_messages`
- Skips tenant quando não há predições disponíveis (`status = 'insufficient_data'`)

## Capabilities

### New Capabilities

- `forecast-ai-message-generation`: Geração diária de mensagem LLM por tenant combinando predições de 3 meses e gastos atuais
- `forecast-ai-messages-schema`: Schema da tabela `forecast_ai_messages` no Postgres

### Modified Capabilities

_(nenhuma)_

## Impact

- `docker-compose.yml`: novo serviço `forecast-cron`
- `src/application/cron/forecast-cron.ts`: novo script cron Bun/TS
- `src/infrastructure/ai/forecastAgent.ts`: função `generateForecastMessage` que chama LLM
- `src/infrastructure/db/BunPgAdapter.ts`: métodos para ler `forecast_predictions` e salvar `forecast_ai_messages`
- `src/infrastructure/db/forecast.sql`: adição da tabela `forecast_ai_messages`
- Dependência: `forecast-ml-worker` deve estar rodando (predições devem existir)
