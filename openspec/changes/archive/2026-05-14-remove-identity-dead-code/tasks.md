## 1. Remover arquivos de entidade e port

- [x] 1.1 Deletar `src/domain/entities/Identity.ts`
- [x] 1.2 Deletar `src/domain/ports/repositories/IdentityRepository.ts`

## 2. PluggyPort — remover fetchIdentity

- [x] 2.1 Em `src/domain/ports/PluggyPort.ts`, remover a assinatura do método `fetchIdentity(itemId: string): Promise<...>`
- [x] 2.2 Remover qualquer import de `Identity` em `PluggyPort.ts`

## 3. PluggyHttpAdapter — remover implementação

- [x] 3.1 Em `src/infrastructure/pluggy/PluggyHttpAdapter.ts`, remover o método `fetchIdentity`
- [x] 3.2 Remover imports de `mapIdentity`, `asRawIdentity`, `Identity` e tipos relacionados

## 4. PluggyMappers — remover mappers de identity

- [x] 4.1 Em `src/infrastructure/pluggy/PluggyMappers.ts`, remover as funções `mapIdentity` e `asRawIdentity` (ou equivalentes)
- [x] 4.2 Remover tipos/interfaces relacionadas a Identity (ex: `RawIdentity`, `IdentityDto`) que não sejam usados em outro lugar

## 5. BunPgAdapter — remover property identities

- [x] 5.1 Em `src/infrastructure/db/BunPgAdapter.ts`, remover a property `identities: IdentityRepository` da classe
- [x] 5.2 Remover a implementação de todos os métodos de `IdentityRepository` (ex: `upsertMany`)
- [x] 5.3 Remover imports de `Identity`, `IdentityRepository` e tipos relacionados

## 6. schema.sql — remover tabela identities

- [x] 6.1 Em `src/infrastructure/db/schema.sql`, remover o bloco `CREATE TABLE identities (...)` completo (incluindo comentários e índices associados)

## 7. Verificação

- [x] 7.1 Rodar `bun build` (ou `tsc --noEmit`) e confirmar zero erros de compilação
- [x] 7.2 Confirmar que `grep -r "identity\|Identity\|identities" src/` não retorna referências não-intencionais
