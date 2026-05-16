## Why

O banco de dados financeiro acumula 11 views SQLite ricas em insights (patrimônio, cashflow, orçamento 50/30/20, alertas), mas não existe nenhuma interface padronizada para que agentes ou LLMs consumam esses dados. O protocolo MCP (Model Context Protocol) é o padrão emergente para expor dados e ações a modelos de linguagem — criar um servidor MCP transforma o banco local em uma fonte de contexto financeiro consumível por qualquer cliente MCP.

## What Changes

- Novo servidor MCP via Streamable HTTP (porta configurável via env `MCP_PORT`, padrão 3000)
- 11 views SQLite expostas como **Resources** MCP com URIs `finance://views/<name>` e payload JSON
- 1 **Tool** MCP `sync` que executa o `SyncUseCase` e retorna resumo de execução
- Novo entrypoint `src/scripts/mcp.ts` que instancia e sobe o servidor
- Novo script `"mcp"` no `package.json`
- Dependência `@modelcontextprotocol/sdk` + `zod` adicionadas ao projeto
- Banco aberto em `readonly: true` para todas as queries de recursos; write apenas durante execução do tool `sync`

## Capabilities

### New Capabilities

- `mcp-server`: Servidor MCP Streamable HTTP que expõe views financeiras como Resources e sync como Tool

### Modified Capabilities

- `sync-orchestrator`: O sync passa a poder ser invocado via MCP Tool além do script direto — sem mudança de requisito funcional, mas o ponto de entrada muda

## Impact

- **Novo código**: `src/application/mcp/FinanceMcpServer.ts`, `src/infrastructure/db/FinanceQueryDb.ts`, `src/scripts/mcp.ts`
- **Dependências**: `@modelcontextprotocol/sdk`, `zod`
- **package.json**: novo script `"mcp"`
- **Sem breaking changes**: sync.ts e BunSQLiteAdapter.ts não são modificados
- **Sem autenticação**: servidor local, sem exposição pública prevista
