## Why

O endpoint `GET /identity/?itemId=` da Pluggy retorna HTTP 500 e não consta no mapeamento real de endpoints — era uma alucinação. O seeding de `d_users` (que alimenta `f_transacoes` e todas as views gold) depende de `identities.full_name`, mas `identities` fica sempre vazia, zerando o dashboard.

## What Changes

- Remover a chamada `fetchIdentity` do `SyncUseCase.run()` (passo 5)
- Alterar `enrich()` no `BunPgAdapter` para semear `d_users` a partir de `accounts.owner` (já disponível no banco após o sync) em vez de `identities.full_name`
- Remover o parâmetro `identityRepo` do `SyncUseCase` e do endpoint `/api/sync`

## Capabilities

### New Capabilities

_(nenhuma — correção de comportamento existente)_

### Modified Capabilities

- `sync-orchestrator`: o orchestrador de sync deixa de buscar identidades da Pluggy; `d_users` passa a ser semeado a partir de `accounts.owner`

## Impact

- **`src/application/sync/SyncUseCase.ts`** — remove passo 5 e dependência de `identityRepo`
- **`src/infrastructure/db/BunPgAdapter.ts`** — `enrich()` troca `FROM identities` por `FROM accounts`
- **`src/application/web/routes/sync.ts`** — remove `identityRepo` passado ao `SyncUseCase`
- **`src/scripts/sync.ts`** — remove `identityRepo` passado ao `SyncUseCase`
- Dashboard volta a exibir dados após o primeiro sync limpo
