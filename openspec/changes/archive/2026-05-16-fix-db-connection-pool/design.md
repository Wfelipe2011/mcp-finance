## Context

O servidor web (`server.ts`) instancia um novo `BunPgAdapter` — e portanto um novo pool `SQL` do Bun — em **cada requisição HTTP**. Esses pools nunca são fechados (exceto em `sync.ts`). Com `max_connections = 100` no Postgres e uso normal da UI, as conexões `idle` acumulam até esgotar os slots disponíveis, resultando em `FATAL: remaining connection slots are reserved for roles with the SUPERUSER attribute`.

O `BunPgAdapter` usa internamente `new SQL(url)` (pool gerenciado pelo Bun), e o isolamento de tenant é feito via `set_config('app.tenant_id', tid, true)` dentro de transações — o parâmetro é **transaction-local** (`is_local = true`), portanto não vaza entre requests concorrentes.

## Goals / Non-Goals

**Goals:**
- Criar um único pool SQL (`SQL`) no startup do servidor e reutilizá-lo em todos os handlers
- Garantir que o isolamento RLS por tenant continue funcionando corretamente
- Eliminar completamente o acúmulo de conexões idle no Postgres
- Minimizar diff e risco de regressão

**Non-Goals:**
- Refatorar workers (`enrich-worker.ts`) — processo separado, OK ter pool próprio
- Refatorar `supervisor.ts` — hot path baixíssimo, operações pontuais
- Alterar a lógica de RLS ou `set_config`
- Adicionar métricas/monitoramento de pool (escopo separado)

## Decisions

### D1 — `BunPgAdapter` aceita `SQL` externo opcional no construtor

**Decisão**: `new BunPgAdapter(tenantId?, sql?)` — se `sql` for fornecido, usa-o; caso contrário, cria internamente (comportamento atual para workers/scripts).

**Alternativa rejeitada**: Usar variável global module-level (`let globalSql`). Piora testabilidade e cria acoplamento implícito. Injeção explícita é mais clara.

**Por que isso funciona com RLS**: Todos os métodos de leitura do adapter já usam `withTenant()` que abre `sql.begin()` e faz `set_config(..., true)` — transaction-local. Dois requests concorrentes pegam **conexões físicas diferentes** do pool interno do Bun. Não há cross-contamination.

```
Pool compartilhado (10 conexões)
├── Request A (tenant X) → conn 1: BEGIN / set_config(X) / SELECT / COMMIT
├── Request B (tenant Y) → conn 2: BEGIN / set_config(Y) / SELECT / COMMIT
└── Request C (tenant X) → conn 3: BEGIN / set_config(X) / SELECT / COMMIT
    Cada transação isola o tenant. Após COMMIT, conn volta ao pool limpa.
```

### D2 — O singleton SQL é criado em `server.ts` e propagado via parâmetro

**Decisão**: `server.ts` cria `const sharedSql = new SQL(url)` antes de `Bun.serve()`. O `router()` recebe `sharedSql` e o passa para cada handler.

**Alternativa rejeitada**: Criar o singleton em `BunPgAdapter.ts` como module singleton. Dificulta testes e torna o ciclo de vida implícito.

### D3 — `db.close()` é no-op quando o `SQL` é externo

**Decisão**: `BunPgAdapter` rastreia se o `SQL` foi criado internamente (`this.ownsSql`). O método `close()` só chama `sql.close()` se `ownsSql === true`.

**Motivo**: Handlers que criam o adapter com SQL externo não devem fechar o pool compartilhado ao final da requisição.

### D4 — `auth.ts` continua criando SQL próprio

**Decisão**: O handler de login (`handleLogin`) executa antes da autenticação e em contexto onde o singleton pode não estar disponível. Mantém `new SQL(url)` + `sql.close()` no finally — já está correto.

**Rationale**: Login é baixa frequência. Mudar introduziria complexidade sem benefício significativo.

## Risks / Trade-offs

| Risco | Mitigação |
|---|---|
| Bug em RLS: tenant vaza entre requests | `set_config(..., true)` é transaction-local; testado em explore. Adicionar test no testing gate. |
| Pool do Bun com tamanho padrão insuficiente | Bun `SQL` ajusta o pool dinamicamente. Monitorar `pg_stat_activity` após deploy. |
| Handler esquece de usar o sql injetado e cria novo | Code review; o padrão novo é mais simples (sem try/finally), difícil de errar. |
| `router.ts` precisa propagar sql por todos os handlers | Mudança mecânica mas abrangente — 13 arquivos de rota. |

## Migration Plan

1. Modificar `BunPgAdapter` construtor (aceitar `sql` externo, `ownsSql` flag)
2. Modificar `server.ts` para criar singleton + fechar no shutdown
3. Modificar `router.ts` para aceitar e propagar `sql`  
4. Modificar cada handler de rota para receber `sql` e passar ao adapter
5. Build + typecheck: `cd client && bun run build` + `bun run typecheck` na raiz
6. Testar via Docker: verificar `pg_stat_activity` antes/depois

**Rollback**: git revert — sem mudança de schema, sem migração de dados.

## Open Questions

- O Bun `SQL` expõe tamanho máximo do pool? Pode ser útil configurar via env var `DB_POOL_MAX`.
