## 1. DDL — Atualizar schema.sql

- [x] 1.1 Em `schema.sql`, remover a coluna `amount_in_account_currency` do DDL de `transactions_enriched`
- [x] 1.2 Adicionar comentário inline em `amount` indicando que o valor é sempre BRL
- [x] 1.3 Adicionar comentário inline em `currency_code` indicando que é sempre `'BRL'`

## 2. BunPgAdapter — Atualizar SQL de enriquecimento

- [x] 2.1 Substituir a projeção de `t.amount` pelo COALESCE de normalização: `COALESCE(CASE WHEN t.currency_code != 'BRL' THEN t.amount_in_account_currency ELSE NULL END, t.amount) AS amount`
- [x] 2.2 Substituir a projeção de `t.currency_code` pela literal `'BRL' AS currency_code`
- [x] 2.3 Remover `t.amount_in_account_currency` da projeção do SELECT

## 3. Banco em execução — Recriar tabela

- [x] 3.1 Executar `DROP TABLE transactions_enriched;` no banco em execução
- [x] 3.2 Aplicar o novo DDL via `docker exec -i mcp-finance-postgres-1 psql -U finance -d finance` com o trecho atualizado do `schema.sql` e verificar via `\d transactions_enriched` que `amount_in_account_currency` não aparece

## 4. Validação

- [x] 4.1 Executar `bun run sync` completo e verificar ausência de erros
- [x] 4.2 Validar moeda única: `SELECT DISTINCT currency_code FROM transactions_enriched` — deve retornar apenas `'BRL'`
- [x] 4.3 Validar contagem: `SELECT COUNT(*) FROM transactions_enriched` = `SELECT COUNT(*) FROM transactions`
- [x] 4.4 Validar ausência da coluna: confirmar que `amount_in_account_currency` não aparece em `\d transactions_enriched`
- [x] 4.5 Verificar normalização USD→BRL: `SELECT t.amount AS usd, te.amount AS brl FROM transactions t JOIN transactions_enriched te ON te.id = t.id WHERE t.currency_code = 'USD' LIMIT 10` — coluna `brl` deve conter valores BRL (maiores que `usd` para compras USD→BRL no câmbio atual)

## 5. Documentação

- [x] 5.1 Atualizar a seção "Camada Bronze: `transactions_enriched`" em `docs/finance-context.md`: remover `amount_in_account_currency` da tabela de colunas e atualizar descrição de `amount` e `currency_code`
