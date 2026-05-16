## Why

O projeto acumulou um conjunto rico de views Gold/Silver com dados financeiros processados e insights de IA, mas não existe camada de acesso HTTP. Para construir um dashboard mobile-first, precisamos de uma API JSON que exponha esses dados com filtros por mês. A API também será responsável por servir o bundle estático do client React ao final do build.

## What Changes

- Criar `src/application/web/server.ts` — entry point do Bun HTTP server na porta 3001
- Criar `src/application/web/routes/` — módulos de rota para cada domínio de dados
- Criar `src/application/web/router.ts` — dispatcher que mapeia `GET /api/*` para os handlers
- Criar `src/application/web/static.ts` — serve arquivos de `client/dist/` (SPA fallback)
- Adicionar scripts `web:dev` e `web:start` ao `package.json` raiz
- Nenhuma autenticação (ambiente local de teste)

## Capabilities

### New Capabilities

- `web-api-cashflow`: endpoint `GET /api/cashflow?month=YYYY-MM` retornando dados de `cube_cashflow_mensal`
- `web-api-gastos`: endpoint `GET /api/gastos?month=YYYY-MM` retornando `cube_gastos_grupo_mensal`, `cube_gastos_categoria_mensal` e `cube_gastos_novos`
- `web-api-compromissos`: endpoint `GET /api/compromissos` retornando `cube_compromissos_ativos`
- `web-api-cashflow-projetado`: endpoint `GET /api/cashflow/projetado` retornando `cube_cashflow_projetado`
- `web-api-runway`: endpoint `GET /api/runway` retornando `kpi_cash_runway`
- `web-api-patrimonio`: endpoint `GET /api/patrimonio` retornando `cube_patrimonio`
- `web-api-investimentos`: endpoint `GET /api/investimentos?months=N` retornando `cube_investimentos_mensal`
- `web-api-digest`: endpoint `GET /api/digest?month=YYYY-MM` retornando `ai_monthly_digest` com `narrative_pt`, `flags`, `notable_expenses`
- `web-api-transacoes`: endpoint `GET /api/transacoes?month=YYYY-MM&limit=N&offset=N` retornando `f_transacoes` enriquecidas com `ai_transaction_insights`
- `web-api-meses`: endpoint `GET /api/meses` retornando lista de meses disponíveis no banco
- `web-static-server`: serve `client/dist/index.html` para rotas não-API (SPA fallback)

### Modified Capabilities

## Impact

- **Novo código**: `src/application/web/` (server, router, routes, static handler)
- **Dependências existentes**: `BunPgAdapter` já instanciado — as rotas o utilizam diretamente
- **`package.json` raiz**: adição de scripts `web:dev` e `web:start`
- **Porta**: 3001 (não conflita com Vite em 5173)
- **Zero novas dependências de runtime** — Bun HTTP nativo, sem Express/Hono
