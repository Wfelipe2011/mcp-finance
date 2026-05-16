## Context

O PostgreSQL no Docker executa automaticamente todos os arquivos `.sql` e `.sh` presentes em `/docker-entrypoint-initdb.d/` quando cria um volume vazio (primeiro start). Atualmente apenas `schema.sql` está mapeado. As views das camadas silver e gold (`silver-dimensions.sql`, `silver-facts.sql`, `gold-ai.sql`, `gold-cubes.sql`) precisam ser aplicadas manualmente após cada `docker compose down -v`, o que é invisível ao desenvolvedor e quebra a experiência de onboarding.

Durante testes identificou-se que a **ordem de aplicação importa**: `gold-cubes.sql` depende da tabela `ai_transaction_insights` criada por `gold-ai.sql`, portanto `gold-ai.sql` deve preceder `silver-facts.sql`.

Ordem correta:
1. `schema.sql` (tabelas base)
2. `silver-dimensions.sql` (views de dimensões)
3. `gold-ai.sql` (tabela `ai_transaction_insights`)
4. `silver-facts.sql` (views de fatos — depende de dimensões)
5. `gold-cubes.sql` (materialized views — depende de gold-ai e silver-facts)

## Goals / Non-Goals

**Goals:**
- Após `docker compose up` com volume vazio, todas as views e cubes estão prontos sem intervenção manual
- Ordem de aplicação garantida por convenção de nomenclatura (prefixo numérico)

**Non-Goals:**
- Não migrar volumes existentes (requer `docker compose down -v` manual)
- Não criar scripts de migração incremental
- Não alterar o conteúdo dos arquivos SQL

## Decisions

### D1: Opção A — Volume mounts diretos no `initdb.d`

**Escolha**: Montar os arquivos com `read-only` e prefixo numérico no `docker-compose.yml`:
```yaml
- ./src/infrastructure/db/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
- ./src/infrastructure/db/silver-dimensions.sql:/docker-entrypoint-initdb.d/02-silver-dimensions.sql:ro
- ./src/infrastructure/db/gold-ai.sql:/docker-entrypoint-initdb.d/03-gold-ai.sql:ro
- ./src/infrastructure/db/silver-facts.sql:/docker-entrypoint-initdb.d/04-silver-facts.sql:ro
- ./src/infrastructure/db/gold-cubes.sql:/docker-entrypoint-initdb.d/05-gold-cubes.sql:ro
```

**Alternativas consideradas**:
- **Opção B (script de init separado)**: Um `init.sh` que aplica os arquivos em ordem. Mais flexível mas adiciona um arquivo extra e lógica de scripting.
- **Opção C (Flyway/Liquibase)**: Ferramenta de migrations. Excesso de complexidade para um projeto local single-developer.

**Rationale**: Zero arquivos novos, zero dependências extras, comportamento determinístico pela ordenação lexicográfica do PostgreSQL.

### D2: Prefixo numérico de dois dígitos

**Escolha**: `01-`, `02-`, ..., `05-` para garantir ordem lexicográfica correta até 99 arquivos.

**Rationale**: `schema.sql` atual será renomeado para `01-schema.sql` no mount (sem alterar o arquivo original).

## Risks / Trade-offs

- **[Risk] `initdb.d` só roda em volumes vazios** → Desenvolvedor com volume existente não recebe as views automaticamente. Mitigação: documentar no README que após esta change é necessário `docker compose down -v && docker compose up`.
- **[Risk] Mudança de nome do mount de `schema.sql`** → O volume agora monta como `01-schema.sql` em vez de `schema.sql`. Sem impacto funcional — o PostgreSQL não se importa com o nome do arquivo.

## Migration Plan

Para desenvolvedores com ambiente rodando:
```bash
docker compose down -v
docker compose up -d
```
