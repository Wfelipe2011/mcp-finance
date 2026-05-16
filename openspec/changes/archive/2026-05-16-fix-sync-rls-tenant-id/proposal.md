## Why

O sync do banco falha com `new row violates row-level security policy for table "items"` porque o `BunPgAdapter` não inclui `tenant_id` nos INSERTs das tabelas protegidas por RLS. A coluna é `NOT NULL REFERENCES tenants(id)` mas nunca é passada, fazendo o PostgreSQL rejeitar qualquer insert via RLS antes mesmo de chegar na constraint NOT NULL.

## What Changes

- `BunPgAdapter.items.upsertMany`: incluir `tenant_id` no INSERT
- `BunPgAdapter.accounts.upsertMany`: incluir `tenant_id` no INSERT
- `BunPgAdapter.transactions.upsertMany`: incluir `tenant_id` no INSERT
- `BunPgAdapter.investments.upsertMany`: incluir `tenant_id` no INSERT
- `BunPgAdapter.investmentTransactions.insertMany`: incluir `tenant_id` no INSERT

Nenhuma mudança de schema, API ou entidades de domínio — apenas o adapter de infraestrutura.

## Capabilities

### New Capabilities
<!-- Nenhuma capability nova — é um bugfix -->

### Modified Capabilities
- `tenant-scoped-adapter`: INSERTs agora incluem `tenant_id` explicitamente em todas as tabelas RLS-protegidas

## Impact

- **Arquivo afetado**: `src/infrastructure/db/BunPgAdapter.ts`
- **Tabelas afetadas**: `items`, `accounts`, `transactions`, `investments`, `investment_transactions`
- O `tenantId` já é passado ao construtor do adapter e já está sendo usado no `set_config` — só falta incluir no VALUES dos INSERTs
- Sem breaking changes
