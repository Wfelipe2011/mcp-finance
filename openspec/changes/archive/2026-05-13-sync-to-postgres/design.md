## Context

O sistema atual usa SQLite (`bun:sqlite`) via `BunSQLiteAdapter`. O banco é um arquivo local (`finance.db`) com WAL mode. O `SyncUseCase` depende de 6 repositórios injetados via o adapter. O script `mcp.ts` e `FinanceMcpServer` implementam um servidor MCP com 11 tools de leitura sobre views SQL e 1 tool `sync` — esses são removidos inteiramente.

A migração troca o backend de persistência para PostgreSQL 16 rodando em Docker, usando `Bun.sql` (driver nativo, tagged template literals, connection pool built-in). Não há migração de dados: o próximo `bun run sync` recarrega tudo via Pluggy.

## Goals / Non-Goals

**Goals:**
- Substituir `BunSQLiteAdapter` por `BunPgAdapter` usando `Bun.sql` com PostgreSQL
- Prover `docker-compose.yml` funcional para rodar PG 16 localmente
- Adaptar `schema.sql` para ser PostgreSQL-válido (tipos nativos, snake_case)
- Remover servidor MCP e todas as views SQL
- Manter `SyncUseCase` e domain layer 100% inalterados

**Non-Goals:**
- Migração de dados do `finance.db` (começar do zero é a decisão)
- ORM ou migration framework (Drizzle, Prisma, etc.)
- Rollback para SQLite
- Novo servidor MCP ou novas tools de leitura

## Decisions

**D1 — `Bun.sql` nativo, sem bibliotecas externas de Postgres**

`Bun.sql` está disponível em Bun 1.2.19 (`typeof Bun.sql === "function"`). Suporta PostgreSQL por padrão quando `DATABASE_URL` usa `postgres://`. Não requer `pg`, `postgres.js`, `drizzle` nem nada no `node_modules`. Conexão configurada via `DATABASE_URL` env var.

```typescript
import { SQL } from "bun";
const sql = new SQL(process.env.DATABASE_URL!);
```

**D2 — snake_case no schema Postgres**

Identificadores PostgreSQL sem aspas viram lowercase. Manter camelCase exigiria aspas em todo lugar (`"itemId"`, `"syncedAt"`). A decisão é migrar para snake_case no schema:

| SQLite atual | PostgreSQL novo |
|---|---|
| `itemId` | `item_id` |
| `syncedAt` | `synced_at` |
| `ccBalanceDueDate` | `cc_balance_due_date` |
| `executionStatus` | `execution_status` |
| `lastUpdatedAt` | `last_updated_at` |

As entidades do domínio (`Item`, `Account`, etc.) permanecem em camelCase — o adapter faz o mapeamento na hora do INSERT.

**D3 — Upsert via `INSERT ... ON CONFLICT DO UPDATE` (mesmo padrão do SQLite)**

PostgreSQL suporta o mesmo padrão de upsert. O `Bun.sql` com tagged templates garante zero SQL injection nos valores:

```typescript
await sql`
  INSERT INTO items (id, connector, status, ...)
  VALUES (${r.id}, ${r.connector}, ${r.status}, ...)
  ON CONFLICT (id) DO UPDATE SET
    connector = EXCLUDED.connector,
    status    = EXCLUDED.status,
    synced_at = EXCLUDED.synced_at
`;
```

**D4 — Bulk insert via loop + `sql.begin()` (transação por lote)**

O `Bun.sql` suporta bulk insert via `sql(array)` helper, mas exige que as colunas do objeto correspondam exatamente às colunas da tabela. Como os objetos de domínio têm camelCase e o schema tem snake_case, o bulk helper não é utilizável diretamente sem transformação de chaves. Decisão: loop dentro de `sql.begin()` — mesma lógica do adapter SQLite atual.

**D5 — Tipos Postgres para campos do schema**

| Campo | SQLite | PostgreSQL |
|---|---|---|
| Datas (ISO string) | `TEXT` | `TEXT` (mantido — Pluggy retorna strings ISO) |
| Valores monetários | `REAL` | `NUMERIC(18,4)` |
| Arrays JSON (products, phoneNumbers, etc.) | `TEXT` (JSON serializado) | `TEXT` (mantido — serialização no adapter) |
| IDs | `TEXT PRIMARY KEY` | `TEXT PRIMARY KEY` |

Datas ficam como `TEXT` porque a Pluggy já retorna strings ISO 8601 e qualquer transformação para `TIMESTAMP` exigiria parsing com fuso horário — fora do escopo.

**D6 — Docker Compose com inicialização automática do schema**

O `docker-compose.yml` monta `schema.sql` em `/docker-entrypoint-initdb.d/` — o Postgres executa automaticamente no primeiro start (quando o volume está vazio). Sem `bun run migrate`.

```yaml
volumes:
  - ./src/infrastructure/db/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
```

**D7 — Remover MCP inteiramente**

`FinanceMcpServer.ts`, `src/scripts/mcp.ts`, `src/infrastructure/db/FinanceQueryDb.ts`, `src/infrastructure/db/views/*.sql`, `src/infrastructure/db/views.test.ts` e dependências `@modelcontextprotocol/sdk` + `zod` são removidos. O script `mcp` em `package.json` é removido.

**D8 — `BunPgAdapter` expõe os mesmos 6 repositórios que o `BunSQLiteAdapter`**

A interface de saída é idêntica — `SyncUseCase` e `sync.ts` não precisam saber que o banco mudou:

```typescript
export class BunPgAdapter {
  readonly items: ItemRepository;
  readonly accounts: AccountRepository;
  readonly transactions: TransactionRepository;
  readonly investments: InvestmentRepository;
  readonly investmentTransactions: InvestmentTransactionRepository;
  readonly identities: IdentityRepository;
  async close(): Promise<void> { await sql.close(); }
}
```

## Risks / Trade-offs

- **[Mapeamento camelCase→snake_case manual]** Cada campo mapeado explicitamente no adapter. Verboso, mas seguro e sem surpresas. O risco é esquecer um campo — mitigado pelos testes de integração (inserir + consultar).
- **[Sem migration framework]** `schema.sql` via `initdb.d` só roda no primeiro start. Se o schema mudar, precisa destruir o volume. Aceitável para dev local; não é produção.
- **[Bun.sql em Bun 1.2.x]** API estável mas ainda com `Roadmap` items. `COPY`, `LISTEN`/`NOTIFY` não implementados — nenhum dos dois é necessário aqui.
- **[Dados perdidos na migração]** Aceito explicitamente. O próximo sync recarrega ~3000 transações via Pluggy em ~30s.
