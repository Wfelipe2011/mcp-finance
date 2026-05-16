## 1. BunPgAdapter — Métodos de leitura

- [x] 1.1 Adicionar método `forecast.getRealSpendingByGroup(tenantId, months)` que lê `cube_gastos_mensais` para os últimos N meses agrupado por group_pt
- [x] 1.2 Adicionar método `forecast.getForecastByGroup(tenantId)` que lê `forecast_predictions` agrupado por group_pt para os próximos 3 meses (status = 'ok')
- [x] 1.3 Adicionar método `forecast.getRealSpendingByCategory(tenantId, months)` que lê `cube_gastos_mensais` por category_pt para os últimos N meses
- [x] 1.4 Adicionar método `forecast.getForecastByCategory(tenantId)` que lê `forecast_predictions` por category_pt e group_pt para os próximos 3 meses
- [x] 1.5 Adicionar método `forecast.getTodayMessage(tenantId)` que retorna a row de `forecast_ai_messages` para hoje

## 2. Handlers de forecast

- [x] 2.1 Criar `src/application/web/routes/forecast/groups.ts` com `handleForecastGroups(req, tenantId)` que combina real + forecast por grupo e retorna JSON
- [x] 2.2 Criar `src/application/web/routes/forecast/categories.ts` com `handleForecastCategories(req, tenantId)` que combina real + forecast por categoria e retorna JSON
- [x] 2.3 Criar `src/application/web/routes/forecast/message.ts` com `handleForecastMessage(req, tenantId)` que retorna a mensagem do dia

## 3. Router — Novas rotas

- [x] 3.1 Adicionar `GET /api/forecast/groups` → `handleForecastGroups` no `router.ts` (autenticado)
- [x] 3.2 Adicionar `GET /api/forecast/categories` → `handleForecastCategories` no `router.ts` (autenticado)
- [x] 3.3 Adicionar `GET /api/forecast/message` → `handleForecastMessage` no `router.ts` (autenticado)

## 4. Validação

- [x] 4.1 `bun run build` sem erros TypeScript
- [x] 4.2 `curl` em `/api/forecast/groups` com token válido → resposta JSON com `months`
- [x] 4.3 `curl` em `/api/forecast/categories` com token válido → resposta JSON com `months`
- [x] 4.4 `curl` em `/api/forecast/message` com token válido → `{ has_message: true/false }`
- [x] 4.5 Requisição sem token → 401 em todos os 3 endpoints
