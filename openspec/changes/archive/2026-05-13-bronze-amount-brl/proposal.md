## Why

A camada bronze (`transactions_enriched`) contém transações em duas moedas: BRL (3.245 linhas) e USD (50 linhas). Qualquer `SUM(amount)` ou comparação por período mistura as duas moedas e produz resultado incorreto. O Pluggy já fornece o valor BRL equivalente em `amount_in_account_currency` para transações em moeda estrangeira — normalizar para BRL no bronze elimina a ambiguidade sem perda de informação analítica.

## What Changes

- `amount` em `transactions_enriched` passa a representar **sempre** o valor em BRL: para transações BRL mantém o valor original; para USD (e qualquer moeda estrangeira futura) usa `amount_in_account_currency` (com fallback para 0 quando NULL)
- `currency_code` em `transactions_enriched` passa a ser sempre `'BRL'`
- **BREAKING**: coluna `amount_in_account_currency` removida do schema de `transactions_enriched` (tornou-se redundante após a normalização)
- DDL de `transactions_enriched` em `schema.sql` atualizado
- SQL de enriquecimento em `BunPgAdapter.ts` atualizado

## Capabilities

### New Capabilities

_(nenhuma — mudança é de qualidade de dados, não de nova funcionalidade)_

### Modified Capabilities

_(nenhuma spec existente cobre a bronze layer especificamente)_

## Impact

- `src/infrastructure/db/schema.sql`: coluna `amount_in_account_currency` removida do DDL de `transactions_enriched`; semântica de `amount` e `currency_code` documentadas
- `src/infrastructure/db/BunPgAdapter.ts`: SELECT de enriquecimento atualizado com `COALESCE` e `currency_code` fixo em `'BRL'`
- Banco em execução: `DROP TABLE transactions_enriched` + recriação + `bun run sync` para repopular
- `docs/finance-context.md`: tabela de colunas atualizada
- Consumidores de `transactions_enriched` (MCP tools, views) se beneficiam automaticamente — `SUM(amount)` passa a ser correto sem filtro de moeda
