## 1. SyncUseCase — remover passo fetchIdentity

- [x] 1.1 Em `src/application/sync/SyncUseCase.ts`, remover a interface de deps `identityRepo: IdentityRepository` (ou equivalente)
- [x] 1.2 Remover a linha `const identityResults = await Promise.all(...)` e as linhas subsequentes de upsert de identities
- [x] 1.3 Remover o import de `IdentityRepository` e qualquer referência ao type em `SyncUseCase.ts`

## 2. BunPgAdapter — corrigir seeding de d_users

- [x] 2.1 Em `src/infrastructure/db/BunPgAdapter.ts`, localizar o bloco `INSERT INTO d_users ... FROM identities` dentro do método `enrich()`
- [x] 2.2 Substituir o SELECT source de `identities WHERE full_name IS NOT NULL` por `accounts WHERE owner IS NOT NULL AND TRIM(owner) != ''` com `DISTINCT` e `ON CONFLICT (name) DO NOTHING`

## 3. Callers — remover identityRepo

- [x] 3.1 Em `src/application/web/routes/sync.ts`, remover `identityRepo: db.identities` da instanciação do `SyncUseCase`
- [x] 3.2 Em `src/scripts/sync.ts`, remover `identityRepo: db.identities` da instanciação do `SyncUseCase`

## 4. Verificação

- [x] 4.1 Rodar `bun build` (ou `tsc --noEmit`) e confirmar zero erros de compilação
- [x] 4.2 Executar sync completo com banco limpo e confirmar que `d_users` é populado com o nome do titular
