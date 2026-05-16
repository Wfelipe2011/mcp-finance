## 1. Dependências

- [x] 1.1 Instalar `@modelcontextprotocol/sdk` e `zod` via `bun add @modelcontextprotocol/sdk zod`
- [x] 1.2 Verificar que `bun run sync` continua funcionando após instalação

## 2. FinanceQueryDb (conexão readonly)

- [x] 2.1 Criar `src/infrastructure/db/FinanceQueryDb.ts` com classe que abre `Database(path, { readonly: true })`
- [x] 2.2 Implementar método `queryView(sql: string): unknown[]` que executa `db.query(sql).all()`
- [x] 2.3 Implementar método `close()` para fechar o banco

## 3. FinanceMcpServer

- [x] 3.1 Criar `src/application/mcp/FinanceMcpServer.ts` com classe que recebe `FinanceQueryDb` no construtor
- [x] 3.2 Instanciar `McpServer` da SDK com `{ name: "mcp-finance", version: "1.0.0", capabilities: { resources: {}, tools: {} } }`
- [x] 3.3 Registrar os 11 Resources com URIs `finance://views/<slug>`, mimeType `application/json` e descriptions descritivas
- [x] 3.4 Implementar handler de cada Resource: `db.queryView("SELECT * FROM v_<name>")` → `JSON.stringify(rows)` em `contents[0].text`
- [x] 3.5 Registrar Tool `sync` com schema Zod vazio (`{}`) e description
- [x] 3.6 Implementar handler do Tool `sync`: instanciar `BunSQLiteAdapter` + `TokenHttpAdapter`, executar `SyncUseCase.run()`, retornar resumo JSON em `content[0].text`
- [x] 3.7 Tratar erros no handler do Tool: `isError: true` com mensagem serializada se `SyncUseCase` lançar exceção
- [x] 3.8 Expor método `connect(transport: StreamableHTTPServerTransport): Promise<void>`

## 4. Entrypoint mcp.ts

- [x] 4.1 Criar `src/scripts/mcp.ts` que lê `DB_PATH` e `MCP_PORT` do ambiente
- [x] 4.2 Instanciar `FinanceQueryDb` e `FinanceMcpServer`
- [x] 4.3 Criar servidor HTTP com `node:http` e roteamento para POST/GET/DELETE `/mcp`
- [x] 4.4 Instanciar `StreamableHTTPServerTransport` com `{ sessionIdGenerator: undefined }` para modo stateless
- [x] 4.5 Conectar server ao transport e iniciar `httpServer.listen(port, "127.0.0.1")`
- [x] 4.6 Logar `MCP Finance Server listening on http://127.0.0.1:<port>/mcp`

## 5. Configuração de script

- [x] 5.1 Adicionar `"mcp": "bun run src/scripts/mcp.ts"` ao `package.json`

## 6. Validação

- [x] 6.1 Executar `bun run mcp` e confirmar que o servidor sobe sem erros
- [x] 6.2 Testar `resources/list` via cliente MCP (ou `curl` com JSON-RPC) e confirmar 11 resources listados
- [x] 6.3 Testar leitura de `finance://views/overview` e confirmar JSON array válido
- [x] 6.4 Testar leitura de `finance://views/monthly-cashflow` e confirmar até 13 entradas
- [x] 6.5 Invocar tool `sync` e confirmar resumo `{items, accounts, transactions, investments, durationMs}` no response
