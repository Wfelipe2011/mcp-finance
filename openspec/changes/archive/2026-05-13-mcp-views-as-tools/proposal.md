## Why

Os 11 Resources MCP registrados no servidor são ignorados por muitos clientes e agentes LLM que suportam apenas Tools. Além disso, Resources não permitem parametrização — as janelas temporais (30d, 90d, 13 meses) são hardcoded nas views SQLite, impossibilitando perguntas como "gastos dos últimos 60 dias". Converter para Tools resolve os dois problemas simultaneamente.

## What Changes

- **BREAKING** — Os 11 Resources `finance://views/*` são removidos
- 11 novas Tools de leitura substituem os Resources: `get_overview`, `get_bank_summary`, `get_credit_summary`, `get_investment_summary`, `get_net_worth`, `get_investment_maturity`, `get_credit_alerts` (sem parâmetros) + `get_monthly_cashflow`, `get_spending_by_cat`, `get_top_categories`, `get_budget_5030_20` (com parâmetros opcionais)
- Tool `sync` existente mantida sem alteração
- `capabilities` do servidor atualizado: remove `resources: {}`, mantém `tools: {}`
- 4 tools parametrizadas geram SQL dinâmico em vez de consultar a view fixa

## Capabilities

### New Capabilities

- `mcp-view-tools`: 11 Tools MCP que expõem as views financeiras, 4 delas com parâmetros de janela temporal validados por Zod

### Modified Capabilities

- `mcp-server`: A capability existente perde o requisito de Resources e ganha o requisito das Tools de leitura — mudança de requisito funcional

## Impact

- **Modificado**: `src/application/mcp/FinanceMcpServer.ts` — único arquivo alterado
- **Sem alteração**: `FinanceQueryDb.ts`, `mcp.ts`, views SQL, `BunSQLiteAdapter.ts`
- **Sem novas dependências**
- **Breaking para clientes existentes** que usavam `resources/read` — precisam migrar para `tools/call`
