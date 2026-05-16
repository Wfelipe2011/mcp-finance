## 1. Remover hardcode do schema

- [x] 1.1 Em `src/infrastructure/db/schema.sql`, remover o bloco `INSERT INTO d_users (name, display_name) VALUES (...)` com Wilson e Giulia

## 2. Seed automático no enrich

- [x] 2.1 Em `src/infrastructure/db/BunPgAdapter.ts`, dentro de `enrichTransactions.enrich()`, adicionar antes do TRUNCATE de `transactions_enriched`:
  ```sql
  INSERT INTO d_users (name, display_name)
  SELECT LOWER(TRIM(full_name)), initcap(split_part(full_name, ' ', 1))
  FROM identities
  WHERE full_name IS NOT NULL AND TRIM(full_name) != ''
  ON CONFLICT (name) DO NOTHING
  ```

## 3. Backend — API de usuários

- [x] 3.1 Em `BunPgAdapter`, adicionar método `users.getAll()`: `SELECT id, name, display_name FROM d_users ORDER BY id`
- [x] 3.2 Em `BunPgAdapter`, adicionar método `users.updateDisplayName(id: number, displayName: string)`: valida não-vazio e ≤50 chars, executa UPDATE, retorna registro atualizado
- [x] 3.3 Criar `src/application/web/routes/users.ts` com `handleGetUsers` e `handleUpdateUser`
- [x] 3.4 Registrar `GET /api/users` e `PATCH /api/users/:id` no `router.ts`

## 4. Frontend — tipos e client

- [x] 4.1 Em `client/src/api/types.ts`, adicionar tipo `User: { id: number; name: string; display_name: string }`
- [x] 4.2 Em `client/src/api/client.ts`, adicionar `fetchUsers()` e `updateUserDisplayName(id, displayName)`

## 5. Frontend — modal de configurações

- [x] 5.1 Criar `client/src/components/ConfigDialog.tsx` com Dialog do MUI listando membros; cada membro tem `TextField` para `display_name` e botão de salvar com estado de loading/sucesso/erro por linha
- [x] 5.2 Em `client/src/App.tsx`, adicionar ícone `SettingsRoundedIcon` no header (entre sync e tema); estado `configOpen` abre `<ConfigDialog>`

## 6. Validar

- [x] 6.1 Rodar `db.enrichTransactions.enrich()` e confirmar que `d_users` é populada sem o hardcode
- [x] 6.2 Confirmar que views silver/gold continuam funcionando (queries de cashflow retornam dados)
- [x] 6.3 `GET /api/users` retorna membros com display names corretos
- [x] 6.4 Abrir o modal de config, editar um display_name e confirmar que `PATCH` funciona
- [x] 6.5 Rodar `bun run client:build` — zero erros TypeScript
