## Context

O `BunPgAdapter` é o adaptador PostgreSQL da aplicação. Ele implementa todos os repositórios do domínio em um único arquivo (`src/infrastructure/db/BunPgAdapter.ts`). O adapter recebe `tenantId` no construtor e já faz `set_config('app.tenant_id', tid, true)` em cada transação para satisfazer a cláusula `USING` da RLS policy.

O problema é que os INSERTs omitem a coluna `tenant_id` do VALUES — o banco recebe `NULL` para essa coluna, o que viola tanto a política RLS (`NULL ≠ UUID`) quanto a constraint `NOT NULL`. O erro de RLS aparece primeiro porque o PostgreSQL avalia o `WITH CHECK` antes das constraints.

**Tabelas afetadas:**
- `items`
- `accounts`
- `transactions`
- `investments`
- `investment_transactions`

## Goals / Non-Goals

**Goals:**
- Adicionar `tenant_id` em todos os INSERTs das tabelas RLS-protegidas
- Sync completo sem erros para qualquer tenant

**Non-Goals:**
- Alterar schema do banco
- Alterar entidades de domínio (`Item`, `Account`, etc.)
- Refatorar a arquitetura do `BunPgAdapter`
- Tratar outros possíveis erros de RLS além deste

## Decisions

**Usar `tid` do closure do adapter, não passar via entidade**

O `tenantId` já está disponível no closure como `tid`. Não faz sentido poluir as entidades de domínio com `tenantId` pois elas representam dados Pluggy — multi-tenant é um detalhe de infraestrutura. Simplesmente incluir `tid` no VALUES de cada INSERT.

```sql
-- antes
INSERT INTO items (id, connector, ...) VALUES (${r.id}, ${r.connector}, ...)

-- depois
INSERT INTO items (tenant_id, id, connector, ...) VALUES (${tid}, ${r.id}, ${r.connector}, ...)
```

**Alternativa descartada — usar `DEFAULT` via trigger**

Seria possível criar um trigger que popula `tenant_id` a partir do `current_setting`. Descartada por adicionar complexidade invisível ao schema e dificultar debug.

## Risks / Trade-offs

- [Items de outro tenant com mesmo ID] → Não é risco — `items.id` é `TEXT PRIMARY KEY` único da Pluggy; um item pertence a um tenant específico pela API key usada
- [ON CONFLICT em items de tenants diferentes] → Não acontece: a Pluggy retorna apenas os items do token usado, que é por tenant

## Migration Plan

1. Aplicar o fix no `BunPgAdapter.ts`
2. Rebuild da imagem Docker da API
3. Testar sync com `POST /api/sync` para o tenant afetado
4. Rollback: reverter o arquivo (não há migração de schema)
