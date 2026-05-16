## 1. Estrutura base do servidor

- [x] 1.1 Criar `src/application/web/server.ts` com `Bun.serve()` na porta 3001, chamando `router(req)` e `serveStatic(url)` como fallback
- [x] 1.2 Criar `src/application/web/router.ts` com dispatcher baseado em `URL.pathname` mapeando `/api/*` para os handlers de rota
- [x] 1.3 Criar `src/application/web/static.ts` com handler que serve arquivos de `client/dist/` e faz SPA fallback para `index.html`
- [x] 1.4 Adicionar scripts ao `package.json` raiz: `"web:dev": "bun run src/application/web/server.ts"` e `"web:start": "bun run src/application/web/server.ts"`

## 2. Helpers de validação e resposta

- [x] 2.1 Criar `src/application/web/helpers.ts` com `parseMonth(param: string | null): { year: number, month: number } | null` que valida formato `YYYY-MM`
- [x] 2.2 Adicionar `jsonResponse(data: unknown, status?: number): Response` e `errorResponse(msg: string, status: number): Response` ao helpers
- [x] 2.3 Adicionar cabeçalho CORS `Access-Control-Allow-Origin: *` em todas as respostas (necessário para Vite dev server)

## 3. Métodos no BunPgAdapter

- [x] 3.1 Adicionar método `getCashflowMensal(year: number, month: number)` consultando `cube_cashflow_mensal`
- [x] 3.2 Adicionar método `getGastosMensais(year: number, month: number)` retornando `{ grupos, categorias, novos }` das três views de gastos
- [x] 3.3 Adicionar método `getCompromissosAtivos()` consultando `cube_compromissos_ativos` ordenado por valor restante DESC
- [x] 3.4 Adicionar método `getCashflowProjetado()` consultando `cube_cashflow_projetado` ordenado por mês ASC
- [x] 3.5 Adicionar método `getRunway()` consultando `kpi_cash_runway` e garantindo coerção numérica com `Number()`
- [x] 3.6 Adicionar método `getPatrimonio()` consultando `cube_patrimonio` e calculando `total_patrimonio` no server
- [x] 3.7 Adicionar método `getInvestimentosMensais(months: number)` consultando `cube_investimentos_mensal` dos últimos N meses
- [x] 3.8 Adicionar método `getDigestMensal(year: number, month: number)` consultando `ai_monthly_digest`
- [x] 3.9 Adicionar método `getTransacoesMensais(year: number, month: number, limit: number, offset: number)` com LEFT JOIN em `ai_transaction_insights`, retornando `{ items, total }`
- [x] 3.10 Adicionar método `getMesesDisponiveis()` consultando meses distintos de `cube_cashflow_mensal` ordenados DESC

## 4. Handlers de rota

- [x] 4.1 Criar `src/application/web/routes/cashflow.ts` com handlers para `GET /api/cashflow` e `GET /api/cashflow/projetado`
- [x] 4.2 Criar `src/application/web/routes/gastos.ts` com handler para `GET /api/gastos`
- [x] 4.3 Criar `src/application/web/routes/compromissos.ts` com handler para `GET /api/compromissos`
- [x] 4.4 Criar `src/application/web/routes/runway.ts` com handler para `GET /api/runway`
- [x] 4.5 Criar `src/application/web/routes/patrimonio.ts` com handler para `GET /api/patrimonio`
- [x] 4.6 Criar `src/application/web/routes/investimentos.ts` com handler para `GET /api/investimentos`
- [x] 4.7 Criar `src/application/web/routes/digest.ts` com handler para `GET /api/digest`
- [x] 4.8 Criar `src/application/web/routes/transacoes.ts` com handler para `GET /api/transacoes`
- [x] 4.9 Criar `src/application/web/routes/meses.ts` com handler para `GET /api/meses`

## 5. Validação e testes manuais

- [x] 5.1 Testar `GET /api/meses` retorna array de strings `YYYY-MM`
- [x] 5.2 Testar `GET /api/cashflow?month=2025-03` retorna objeto com `cashflow_real` como número
- [x] 5.3 Testar `GET /api/gastos?month=2025-03` retorna `{ grupos, categorias, novos }` com arrays
- [x] 5.4 Testar `GET /api/compromissos` retorna array de objetos
- [x] 5.5 Testar `GET /api/cashflow/projetado` retorna array com campo `is_projected`
- [x] 5.6 Testar `GET /api/runway` retorna campos numéricos (não strings)
- [x] 5.7 Testar `GET /api/digest?month=2025-03` retorna objeto com `narrative_pt`
- [x] 5.8 Testar `GET /api/transacoes?month=2025-03&limit=5` retorna `{ items: [...], total: N }`
- [x] 5.9 Testar `GET /api/cashflow?month=invalid` retorna `400` com mensagem de erro
- [x] 5.10 Testar rota não-API retorna SPA fallback (`index.html` ou mensagem de build ausente)
