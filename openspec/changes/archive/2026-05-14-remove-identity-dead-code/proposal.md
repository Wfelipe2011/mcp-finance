## Why

A remoção do endpoint `/identity` da Pluggy (inexistente) deixou um conjunto de artefatos órfãos no codebase: entidade `Identity`, port `fetchIdentity`, `IdentityRepository`, mapeadores, e a tabela `identities` no schema. Esse dead code aumenta ruído de manutenção e causa confusão sobre o que o sistema realmente faz.

## What Changes

- **Remover** `src/domain/entities/Identity.ts`
- **Remover** `src/domain/ports/repositories/IdentityRepository.ts`
- **Remover** `fetchIdentity` de `src/domain/ports/PluggyPort.ts`
- **Remover** `fetchIdentity`, `mapIdentity`, `asRawIdentity` de `src/infrastructure/pluggy/PluggyHttpAdapter.ts` e `PluggyMappers.ts`
- **Remover** `readonly identities: IdentityRepository` e implementação de `BunPgAdapter`
- **Remover** tabela `identities` de `schema.sql`
- **Remover** imports e referências remanescentes

## Capabilities

### New Capabilities

_(nenhuma — limpeza de código)_

### Modified Capabilities

_(nenhuma — sem mudança de comportamento observável)_

## Impact

- **`src/domain/entities/Identity.ts`** — deletado
- **`src/domain/ports/repositories/IdentityRepository.ts`** — deletado
- **`src/domain/ports/PluggyPort.ts`** — remove `fetchIdentity`
- **`src/infrastructure/pluggy/PluggyHttpAdapter.ts`** — remove `fetchIdentity` e imports
- **`src/infrastructure/pluggy/PluggyMappers.ts`** — remove `mapIdentity`, `asRawIdentity` e tipos relacionados
- **`src/infrastructure/db/BunPgAdapter.ts`** — remove `identities` property e imports
- **`src/infrastructure/db/schema.sql`** — remove bloco `CREATE TABLE identities`
- Sem impacto no runtime: nenhum endpoint, view ou query usa `identities` após `fix-identity-seeding`
