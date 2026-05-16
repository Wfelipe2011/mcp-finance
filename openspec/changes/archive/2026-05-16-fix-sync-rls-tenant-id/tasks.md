## 1. Fix INSERTs no BunPgAdapter

- [x] 1.1 Adicionar `tenant_id` no INSERT de `items.upsertMany` em `BunPgAdapter.ts`
- [x] 1.2 Adicionar `tenant_id` no INSERT de `accounts.upsertMany` em `BunPgAdapter.ts`
- [x] 1.3 Adicionar `tenant_id` no INSERT de `transactions.upsertMany` em `BunPgAdapter.ts`
- [x] 1.4 Adicionar `tenant_id` no INSERT de `investments.upsertMany` em `BunPgAdapter.ts`
- [x] 1.5 Adicionar `tenant_id` no INSERT de `investment_transactions.insertMany` em `BunPgAdapter.ts`

## 2. Validação

- [x] 2.1 Rebuild da imagem Docker da API (`docker compose build api-server`)
- [x] 2.2 Subir ambiente (`docker compose up -d api-server`)
- [x] 2.3 Fazer login com `wfelipepluggy@gmail.com` e acionar sync via `POST /api/sync`
- [x] 2.4 Confirmar ausência de erro RLS nos logs do api-server
- [x] 2.5 Confirmar dados presentes no banco via postgres-finance MCP (`SELECT count(*) FROM items WHERE tenant_id = '<uuid>'`)
