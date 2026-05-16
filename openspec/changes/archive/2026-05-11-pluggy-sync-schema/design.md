## Context

O projeto `mcp-finance` não possui ainda nenhum código de aplicação. Este design define a fundação: estrutura de pastas, padrão arquitetural, schema do banco e estratégia de sincronização para o primeiro script executável.

A fonte de dados é o proxy `my-api.pluggy.ai` (Pluggy). O token bearer é obtido de um serviço local em `http://192.168.0.194:4567/token` que retorna um array com o token atual e sua data de expiração. O volume real do usuário é aproximadamente: 5 items, 11 accounts, ~2.300 transactions, 87 investments, ~200 investment transactions, 5 identities.

## Goals / Non-Goals

**Goals:**
- Estabelecer arquitetura hexagonal com ports/adapters desde o início
- Schema SQLite completo e bem tipado (TypeScript `strict: true`)
- Script de sync executável via `bun run src/scripts/sync.ts`
- Zero duplicatas mesmo com re-execução completa (estratégia de upsert por tabela)
- Estrutura que permite trocar SQLite por Postgres apenas adicionando um novo adapter

**Non-Goals:**
- Interface gráfica ou API HTTP de leitura (escopo futuro)
- Renovação automática de token (token é gerenciado externamente)
- Coleta de LOANS (endpoint não exposto no proxy)
- Histórico de sincronizações (apenas último estado de cada entidade)

## Decisions

### 1. Arquitetura Hexagonal (Ports & Adapters)

**Escolha:** Organizar o código em `domain/`, `application/`, `infrastructure/` com ports como interfaces TypeScript.

**Rationale:** O projeto deve suportar troca de banco (SQLite → Postgres) sem alterar use cases. Com ports, o `SyncUseCase` depende apenas de interfaces — o adapter concreto (Bun SQLite ou Postgres) é injetado. Isso também facilita testes unitários do use case com mocks.

**Alternativa descartada:** Estrutura simples scripts + funções. Descartada porque tornar-se-ia um emaranhado ao evoluir para servidor MCP com múltiplos casos de uso.

```
src/
  domain/
    entities/          ← tipos puros: Item, Account, Transaction, Investment, ...
    ports/
      PluggyPort.ts         ← interface de coleta (fetchItems, fetchAccounts, ...)
      TokenPort.ts          ← interface de token (getToken(): Promise<string>)
      repositories/
        ItemRepository.ts
        AccountRepository.ts
        TransactionRepository.ts
        InvestmentRepository.ts
        InvestmentTransactionRepository.ts
        IdentityRepository.ts

  application/
    sync/
      SyncUseCase.ts        ← orquestra coleta + persistência

  infrastructure/
    pluggy/
      PluggyHttpAdapter.ts  ← implementa PluggyPort
      PluggyMappers.ts      ← API response → domain entity
    token/
      TokenHttpAdapter.ts   ← implementa TokenPort
    db/
      BunSQLiteAdapter.ts   ← implementa todos os repositories
      schema.sql            ← CREATE TABLE IF NOT EXISTS ...

  scripts/
    sync.ts                 ← entry point: new SyncUseCase(...).run()
```

### 2. Bun SQLite nativo (`bun:sqlite`)

**Escolha:** Usar `bun:sqlite` sem ORM ou query builder.

**Rationale:** Zero dependências externas, API síncrona simples, prepared statements nativos. Para o volume atual (~2.500 rows) é mais que suficiente. O adapter implementa os port interfaces com SQL puro — ao migrar para Postgres, escreve-se um novo adapter sem tocar em nada mais.

**Alternativa descartada:** Drizzle ORM. Adiciona abstração antes de ser necessária e cria coupling ao ORM que dificulta a troca de banco.

### 3. Estratégia de Deduplicação por Tabela

**Escolha:** Upsert granular usando `INSERT ... ON CONFLICT DO UPDATE SET` do SQLite, com campos específicos por tabela.

```
┌─────────────────────────┬──────────────────────────────────────────────────────┐
│ Tabela                  │ Estratégia                                           │
├─────────────────────────┼──────────────────────────────────────────────────────┤
│ items                   │ ON CONFLICT(id) DO UPDATE SET status, syncedAt, ...  │
│ accounts                │ ON CONFLICT(id) DO UPDATE SET balance, syncedAt, ... │
│ transactions            │ ON CONFLICT(id) DO UPDATE SET                        │
│                         │   status, description, syncedAt                      │
│                         │   (createdAt NUNCA sobrescrito)                      │
│ investments             │ ON CONFLICT(id) DO UPDATE SET balance, value, ...    │
│ investment_transactions │ INSERT OR IGNORE (imutável após criação)             │
│ identities              │ ON CONFLICT(id) DO UPDATE SET fullName, syncedAt,.. │
└─────────────────────────┴──────────────────────────────────────────────────────┘
```

**Rationale:** `transactions` pode ter `PENDING → POSTED` (muda status, mas não perde o `createdAt` original). `investment_transactions` são imutáveis — INSERT OR IGNORE é mais simples e seguro. As demais entidades são snapshots dimensionais onde todo o estado atual deve ser substituído.

**Alternativa descartada:** `INSERT OR REPLACE` para todas. Destrói e recria a linha, perdendo `createdAt` e invalidando integridade referencial temporariamente.

### 4. Fetch paralelo + insert em transação

**Escolha:** `Promise.all` para fetches simultâneos, depois `db.transaction()` para inserts em batch.

**Rationale:** O fan-out de transactions (11 accounts + 87 investments = ~98 chamadas HTTP) se beneficia de paralelismo. Já os inserts síncronos do `bun:sqlite` agrupados em uma transação são ordens de magnitude mais rápidos do que commits individuais.

```
[fetch items] → [batch fetch accounts + investments] → [fan-out transactions em parallel] → [transaction db única por entidade]
```

### 5. Fluxo de Sincronização

```
1. GET http://192.168.0.194:4567/token → bearer token
   └─ verificar expires_at; logar warning se expirado mas não abortar
2. GET /items?only_my_items=true → upsert items
3. GET /accounts?itemId=a&itemId=b&... (batch) → upsert accounts
4. GET /investments?itemId=a&itemId=b&... (batch) → upsert investments
   └─ ignorar transactions[] inline; confiar no endpoint dedicado
5. Fan-out em paralelo:
   ├── GET /transactions?accountId={uuid} → upsert transactions (por account)
   └── GET /investments/{uuid}/transactions → INSERT OR IGNORE inv_transactions
6. GET /identity/?itemId={uuid} (por item) → upsert identities
```

### 6. Schema SQLite — campos-chave

Todas as tabelas têm `syncedAt TEXT` (ISO 8601) atualizado em todo upsert. Timestamps são armazenados como TEXT no formato ISO 8601 (padrão Pluggy). Campos JSON complexos (paymentData, expenses, arrays) são armazenados como `TEXT` com o JSON serializado — evita over-engineering de normalização para dados que o MCP vai ler como JSON de qualquer forma.

## Risks / Trade-offs

**[Token pode expirar durante sync longo]** → Mitigação: verificar `expires_at` no início e logar warning. O sync de ~98 chamadas HTTP leva poucos segundos em rede local/rápida, risco de expiração durante a execução é baixo. Se ocorrer, o erro 401 do fetch vai propagar como exceção com mensagem clara.

**[Transações PENDING podem existir e mudar]** → Mitigação: a estratégia de upsert em `transactions` já cobre: re-execução do sync atualiza `status` e `syncedAt` sem perder `createdAt`.

**[API do Pluggy sem paginação explícita observada]** → Risco: se `/transactions?accountId=...` paginar silenciosamente, podemos perder dados. Mitigação: verificar no response se há campo `total` ou `page` e tratar na implementação.

**[SQLite sem concorrência]** → Aceito por ora. O sync é um script único sem leitores concorrentes. Ao migrar para Postgres isso deixa de ser problema.

## Open Questions

- O endpoint `/transactions?accountId=...` retorna todas as transações de uma vez ou tem paginação? Verificar `total` e `pageSize` no response real antes de implementar.
