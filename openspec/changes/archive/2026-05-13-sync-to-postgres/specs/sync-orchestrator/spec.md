## MODIFIED Requirements

### Requirement: Persistência em transação de banco por tipo de entidade
O sistema SHALL persistir cada conjunto de entidades (ex: todas as transactions) dentro de uma única transação PostgreSQL usando `sql.begin()`, garantindo atomicidade — ou todas as linhas são inseridas ou nenhuma.

#### Scenario: Falha durante inserção de transactions
- **WHEN** uma inserção dentro do batch de transactions falha
- **THEN** nenhuma das transactions desse batch é persistida (rollback automático)

## REMOVED Requirements

### Requirement: Persistência em transação de banco por tipo de entidade (SQLite)
**Reason**: Substituído pelo mesmo requisito usando `sql.begin()` do PostgreSQL em vez de `db.transaction()` do bun:sqlite.
**Migration**: O comportamento externo é idêntico — somente a implementação interna muda.

### Requirement: Invocação via MCP Tool
**Reason**: O servidor MCP (`FinanceMcpServer`, `mcp.ts`) é removido inteiramente. A tool `sync` deixa de existir.
**Migration**: Executar `bun run sync` diretamente no terminal, ou configurar um cron job.
