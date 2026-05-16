## Context

Com a implementação de `fix-identity-seeding`, o endpoint `/identity` da Pluggy foi removido do fluxo de sync e `d_users` passou a ser semeado de `accounts`. Restam artefatos órfãos no codebase que nunca mais serão chamados:

- `src/domain/entities/Identity.ts` — entidade de domínio
- `src/domain/ports/repositories/IdentityRepository.ts` — port do repositório
- `src/domain/ports/PluggyPort.ts` — método `fetchIdentity`
- `src/infrastructure/pluggy/PluggyHttpAdapter.ts` — implementação `fetchIdentity` + imports
- `src/infrastructure/pluggy/PluggyMappers.ts` — `mapIdentity`, `asRawIdentity`, tipos relacionados
- `src/infrastructure/db/BunPgAdapter.ts` — property `identities: IdentityRepository`
- `src/infrastructure/db/schema.sql` — tabela `identities`

Este dead code aumenta ruído cognitivo e pode induzir novos desenvolvedores a pensar que o endpoint existe.

## Goals / Non-Goals

**Goals:**
- Remover todos os artefatos relacionados à entidade `Identity` que não são mais usados
- Projeto compila sem erros após a remoção
- Nenhum endpoint, view ou query quebra

**Non-Goals:**
- Não criar nenhuma funcionalidade nova
- Não alterar a tabela `identities` em volumes PostgreSQL existentes (DROP TABLE em schema.sql não afeta volumes já criados — `initdb.d` só roda em volumes novos)

## Decisions

### D1: Deletar arquivos de entidade e port completamente

**Escolha**: Deletar `Identity.ts` e `IdentityRepository.ts` em vez de esvaziar ou comentar.

**Rationale**: Arquivos vazios causam mais confusão do que ausência. A intenção é clara: o conceito não existe mais.

### D2: Remover tabela `identities` do `schema.sql`

**Escolha**: Remover o bloco `CREATE TABLE identities` de `schema.sql`.

**Alternativas consideradas**:
- Manter tabela vazia → confunde sobre a intenção do sistema
- Adicionar `DROP TABLE IF EXISTS identities CASCADE` → desnecessário pois `schema.sql` só é aplicado em volumes novos via `initdb.d`

**Rationale**: Consistência — se o conceito não existe no código, não deve existir no schema.

### D3: `remove-identity-dead-code` depende de `fix-identity-seeding`

**Escolha**: Esta change só deve ser aplicada **após** `fix-identity-seeding` estar implementada e commitada.

**Rationale**: `fix-identity-seeding` remove as últimas referências funcionais a `identityRepo` no `SyncUseCase` e callers. Sem ela, remover `BunPgAdapter.identities` causaria erros de compilação.

## Risks / Trade-offs

- **[Risk] Regressão de compilação** → Mitigação: verificar `bun build` ou `tsc --noEmit` após cada arquivo removido/modificado
- **[Trade-off] `identities` em volumes existentes** → A tabela continua existindo em bancos já criados (inócua — nunca é populada). Sem impacto funcional.
