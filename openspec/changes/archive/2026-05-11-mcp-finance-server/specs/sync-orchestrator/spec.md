## ADDED Requirements

### Requirement: Invocação via MCP Tool
O sistema SHALL permitir que o `SyncUseCase` seja invocado via Tool MCP `sync`, além do script direto `bun run sync`. A invocação via Tool SHALL produzir o mesmo efeito de persistência que a invocação direta, e SHALL retornar um resumo estruturado `{items, accounts, transactions, investments, durationMs}` ao chamador MCP.

#### Scenario: Sync via Tool retorna resumo
- **WHEN** o tool MCP `sync` é invocado
- **THEN** o `SyncUseCase.run()` é executado com as mesmas dependências (BunSQLiteAdapter + TokenHttpAdapter) e o resultado é retornado como JSON no campo `content[0].text`
