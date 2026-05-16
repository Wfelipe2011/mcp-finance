## Why

O banco SQLite é adequado para desenvolvimento local, mas não para um sistema de dados financeiros que precisa de tipagem forte, consultas ad-hoc via ferramentas padrão e potencial de escalar para múltiplos clientes. A migração para PostgreSQL (via Docker) troca o banco de arquivo local por uma instância gerenciada, usa `Bun.sql` (driver nativo do Bun) no lugar de `bun:sqlite`, e remove a camada de views SQL e tools MCP de leitura que se tornaram desnecessárias. O sync parte do zero — os dados históricos são recarregados via Pluggy no próximo ciclo de sincronização.

## What Changes

- **[NOVO]** `docker-compose.yml` com serviço `postgres:16`, volume persistente e healthcheck
- **[NOVO]** `BunPgAdapter` substitui `BunSQLiteAdapter`: usa `Bun.sql` com tagged template literals para inserções upsert de todos os 6 repositórios
- **[NOVO]** `schema.sql` revisado para PostgreSQL: tipos nativos (`TIMESTAMP WITH TIME ZONE`, `NUMERIC`, `TEXT`, `JSONB`), convenção `snake_case` para identificadores, constraints e índices Postgres-compatíveis
- **[REMOVIDO]** `BunSQLiteAdapter.ts` — implementação SQLite
- **[REMOVIDO]** `FinanceQueryDb.ts` — conexão readonly SQLite
- **[REMOVIDO]** `src/infrastructure/db/views/*.sql` — todos os 11 arquivos de view
- **[REMOVIDO]** `src/infrastructure/db/views.test.ts` — testes das views
- **[REMOVIDO]** `FinanceMcpServer.ts` e `src/scripts/mcp.ts` — servidor MCP inteiro (11 get_* tools + sync tool)
- **[REMOVIDO]** `finance.db`, `finance.db-wal`, `finance.db-shm` — arquivos de banco SQLite
- **[MODIFICADO]** `SyncUseCase` continua inalterado; apenas o adapter injetado muda
- **[MODIFICADO]** `package.json` remove script `mcp`, mantém `sync`

## Capabilities

### New Capabilities
- `postgres-adapter`: Adapter de escrita para PostgreSQL usando `Bun.sql`, implementando os 6 repositórios do domínio com upsert idiomático
- `postgres-docker`: Infraestrutura Docker Compose para rodar PostgreSQL 16 localmente com configuração via variáveis de ambiente

### Modified Capabilities
- `sync-orchestrator`: O SyncUseCase em si não muda, mas o adapter concreto injetado muda de SQLite para PostgreSQL; o script de entrada `sync.ts` passa a configurar `Bun.sql` em vez de `new Database()`

## Impact

- `src/infrastructure/db/` — reescrita completa do adapter
- `src/scripts/sync.ts` — troca de importação e instância do adapter
- `src/scripts/mcp.ts` — removido
- `docker-compose.yml` — criado na raiz
- `finance.db*` — removidos (dados recarregados via sync)
- Dependências: `@modelcontextprotocol/sdk` e `zod` podem ser removidas de `package.json`
