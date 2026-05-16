## Why

O `api-server` precisa expor endpoints para que a aba Previsão (React) consuma as predições ML, os resumos por grupo e categoria, e a mensagem diária de IA. Atualmente não existe nenhum endpoint de forecast na API.

## What Changes

- 3 novos endpoints no `api-server` (Bun/TS):
  - `GET /api/forecast/groups` — predições por grupo (Necessidades/Desejos/Poupança) para os próximos 3 meses + gasto atual do mês
  - `GET /api/forecast/categories` — predições por categoria para os próximos 3 meses + gasto atual do mês
  - `GET /api/forecast/message` — mensagem AI do dia para o tenant autenticado
- Novos handlers e rota no `router.ts`
- Métodos de leitura adicionados ao `BunPgAdapter` (alguns já criados no `forecast-ai-messages`)

## Capabilities

### New Capabilities

- `forecast-api-endpoints`: Três endpoints REST no api-server para servir dados de previsão ao cliente React

### Modified Capabilities

_(nenhuma)_

## Impact

- `src/application/web/routes/forecast/` — nova pasta com handlers
- `src/application/web/router.ts` — 3 novas rotas
- `src/infrastructure/db/BunPgAdapter.ts` — métodos de leitura de `forecast_predictions` e `forecast_ai_messages`
- Dependência runtime: `forecast-ml-worker` e `forecast-ai-messages` devem ter dados no Postgres
