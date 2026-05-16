## Why

A camada bronze (`transactions_enriched`) herdou as categorias do Pluggy em inglês e sem hierarquia. Isso torna análises por agrupamento (ex: "quanto gastei em Alimentação?") impossíveis sem lógica extra no cliente, e os erros de categorização do Pluggy (Amazon AWS como "Bookstore", OpenRouter como "Electronics") corrompem silenciosamente qualquer relatório de gastos.

## What Changes

- Nova tabela `category_groups`: grupos pai com nome em PT-BR (ex: `11 → Alimentação`)
- Nova tabela `category_labels`: mapeamento `category_id → name_pt` + FK para `category_groups`
- Nova tabela `category_overrides`: regras de recategorização manual por padrão ILIKE na `description`
- Etapa adicional no `enrichTransactions`: após o `TRUNCATE + INSERT`, executa `UPDATE` aplicando os overrides na mesma transação
- Novas colunas em `transactions_enriched`: `category_pt` (tradução PT-BR), `category_group` (ID do grupo pai), `category_group_pt` (nome do grupo em PT-BR)
- Dados de `category_labels` e `category_groups` populados no `schema.sql` com as 74 categorias Pluggy traduzidas

## Capabilities

### New Capabilities

- `category-taxonomy`: Tabelas de lookup `category_groups` e `category_labels` com traduções PT-BR e hierarquia de grupos
- `category-override`: Tabela `category_overrides` com regras de recategorização por padrão ILIKE, aplicadas como UPDATE após o enriquecimento bronze

### Modified Capabilities

- `transactions-bronze`: `transactions_enriched` ganha 3 novas colunas (`category_pt`, `category_group`, `category_group_pt`) e o enriquecimento passa a aplicar overrides de categorias como etapa final
- `db-schema`: `schema.sql` ganha 3 novas tabelas e dados seed das traduções

## Impact

- `src/infrastructure/db/schema.sql`: 3 novas tabelas + `INSERT` seed de categorias + 3 colunas em `transactions_enriched`
- `src/infrastructure/db/BunPgAdapter.ts`: query de enriquecimento estendida com JOIN nas tabelas de lookup + UPDATE de overrides após o INSERT
- Banco em execução: DROP + recreate de `transactions_enriched` + criação das novas tabelas + seed
