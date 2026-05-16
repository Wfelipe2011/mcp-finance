## Why

A tabela `d_users` tem os nomes "wilson felipe da silva" e "giulia cristina rodrigues de souza" hardcoded no `schema.sql`. Qualquer outra pessoa que usar o projeto precisa editar SQL diretamente — barreira técnica desnecessária.

A Pluggy já traz o nome completo de cada titular via API de identidades (`identities.full_name`). Podemos popular `d_users` automaticamente durante o enrich, usando o primeiro nome como display name. E para quem quiser personalizar (apelido, nome abreviado), uma aba de Configurações no frontend permite editar o `display_name` sem tocar em código.

## What Changes

- Remover o INSERT hardcoded de Wilson/Giulia do `schema.sql`
- No processo de enrich (`BunPgAdapter.enrichTransactions.enrich()`), adicionar um INSERT que popula `d_users` a partir de `identities.full_name` com `ON CONFLICT DO NOTHING` (preserva customizações)
- Novos endpoints: `GET /api/users` e `PATCH /api/users/:id`
- Nova aba "Configurações" no frontend com lista de membros e campo de edição para `display_name`

## Capabilities

### New Capabilities
- `user-management`: Seed automático de `d_users` a partir das identidades Pluggy + API de CRUD de `display_name` + aba de configurações no frontend

### Modified Capabilities
- `sync-orchestrator`: O enrich passa a incluir o passo de seed de `d_users`

## Impact

- `src/infrastructure/db/schema.sql` — remover INSERT INTO d_users com nomes hardcoded
- `src/infrastructure/db/silver-dimensions.sql` — sem mudança (estrutura de d_users mantida)
- `src/infrastructure/db/BunPgAdapter.ts` — adicionar step de seed de d_users no enrich; adicionar métodos `getUsers()` e `updateUserDisplayName(id, displayName)`
- `src/application/web/routes/users.ts` — handlers GET e PATCH
- `src/application/web/router.ts` — novas rotas
- `client/src/App.tsx` — nova aba "Configurações" no bottom navigation
- `client/src/tabs/Configuracoes.tsx` — nova tab com lista de membros editáveis
- `client/src/api/client.ts` — funções `fetchUsers()` e `updateUserDisplayName()`
- `client/src/api/types.ts` — tipo `User`
