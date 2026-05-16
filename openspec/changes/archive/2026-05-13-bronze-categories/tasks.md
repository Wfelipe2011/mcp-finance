## 1. DDL — Adicionar tabelas de lookup e colunas em schema.sql

- [x] 1.1 Criar DDL de `category_groups` em `schema.sql`: `group_id TEXT PK`, `name_pt TEXT NOT NULL`
- [x] 1.2 Criar DDL de `category_labels` em `schema.sql`: `category_id TEXT PK`, `name_pt TEXT NOT NULL`, `group_id TEXT NOT NULL REFERENCES category_groups(group_id)`
- [x] 1.3 Criar DDL de `category_overrides` em `schema.sql`: `id SERIAL PK`, `pattern TEXT NOT NULL`, `category_id_override TEXT NOT NULL REFERENCES category_labels(category_id)`, `note TEXT`, `priority INTEGER NOT NULL DEFAULT 100`, `match_count INTEGER NOT NULL DEFAULT 0`, `created_at TEXT NOT NULL DEFAULT (NOW()::TEXT)`
- [x] 1.4 Inserir seed das 20 linhas de `category_groups` em `schema.sql` via `INSERT ... ON CONFLICT DO NOTHING`
- [x] 1.5 Inserir seed das 74 linhas de `category_labels` em `schema.sql` via `INSERT ... ON CONFLICT DO NOTHING`
- [x] 1.6 Inserir seed das regras iniciais de `category_overrides` em `schema.sql` (Amazon AWS → 09000000, OpenRouter → 09000000, Neon.tech → 09000000) via `INSERT ... ON CONFLICT DO NOTHING`
- [x] 1.7 Adicionar colunas `category_pt TEXT`, `category_group TEXT`, `category_group_pt TEXT` ao DDL de `transactions_enriched` em `schema.sql`

## 2. BunPgAdapter — Atualizar SQL de enriquecimento

- [x] 2.1 No SELECT do `INSERT INTO transactions_enriched`, adicionar JOIN com `category_labels` e `category_groups` para projetar `cl.name_pt AS category_pt`, `LEFT(t.category_id, 2) AS category_group`, `cg.name_pt AS category_group_pt`
- [x] 2.2 Usar LEFT JOIN (não INNER) para `category_labels` e `category_groups` — transações sem `category_id` ficam com NULL nos campos PT-BR
- [x] 2.3 Após o INSERT principal, adicionar UPDATE de overrides na mesma transação usando `DISTINCT ON (tx.id) ORDER BY co.priority ASC` para garantir que menor priority vence
- [x] 2.4 Após o UPDATE de overrides, adicionar UPDATE de `match_count` em `category_overrides` para incrementar o contador de cada regra que fez match

## 3. Banco em execução — Recriar estrutura

- [x] 3.1 Executar `DROP TABLE transactions_enriched;` no banco em execução
- [x] 3.2 Aplicar DDL das novas tabelas (`category_groups`, `category_labels`, `category_overrides`) via `docker exec -i mcp-finance-postgres-1 psql -U finance -d finance`
- [x] 3.3 Aplicar seed das categorias e regras iniciais
- [x] 3.4 Aplicar novo DDL de `transactions_enriched` com as 3 colunas adicionadas
- [x] 3.5 Verificar via `\d transactions_enriched` que `category_pt`, `category_group`, `category_group_pt` aparecem

## 4. Validação

- [x] 4.1 Executar `bun run sync` completo e verificar ausência de erros
- [x] 4.2 Validar cobertura PT-BR: `SELECT COUNT(*) FROM transactions_enriched WHERE category_id IS NOT NULL AND category_pt IS NULL` — deve retornar 0
- [x] 4.3 Validar grupos: `SELECT category_group_pt, COUNT(*) FROM transactions_enriched GROUP BY 1 ORDER BY 2 DESC` — deve listar todos os grupos com contagens coerentes
- [x] 4.4 Verificar override Amazon AWS: `SELECT description, category_id, category_pt FROM transactions_enriched WHERE description ILIKE '%Amazon AWS%' LIMIT 5` — deve mostrar `category_id = '09000000'` e `category_pt = 'Serviços digitais'`
- [x] 4.5 Verificar match_count: `SELECT pattern, category_id_override, match_count FROM category_overrides ORDER BY match_count DESC` — regras de Amazon AWS e OpenRouter devem ter `match_count > 0`
- [x] 4.6 Validar contagem total: `SELECT COUNT(*) FROM transactions_enriched` = `SELECT COUNT(*) FROM transactions`
