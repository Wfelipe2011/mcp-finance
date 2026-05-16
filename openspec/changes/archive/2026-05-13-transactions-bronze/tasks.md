## 1. DDL — Schema da tabela

- [x] 1.1 Adicionar DDL de `transactions_enriched` em `schema.sql` com `CREATE TABLE IF NOT EXISTS`, incluindo todas as colunas de `transactions` + `transaction_kind TEXT`, `peer_account_id TEXT REFERENCES accounts(id)`, `is_real_cashflow BOOLEAN`
- [x] 1.2 Adicionar índice em `transactions_enriched(account_id, date DESC)` e em `transactions_enriched(transaction_kind)`
- [x] 1.3 Aplicar o schema no banco em execução: `docker exec mcp-finance-postgres-1 psql -U finance -d finance -f /dev/stdin < schema.sql` (apenas o trecho novo) e verificar que a tabela existe

## 2. SQL de enriquecimento

- [x] 2.1 Escrever o SQL de classificação de `transaction_kind` com CASE WHEN em ordem de prioridade: INVEST → TRANSFER (payment_data crédito) → TRANSFER (payment_data débito) → TRANSFER (fatura banco) → TRANSFER (fatura cartão) → EXPENSE → INCOME
- [x] 2.2 Escrever o SQL de `peer_account_id` usando `DISTINCT ON (t.id)` com JOIN em `accounts` por `number`, priorizando `CHECKING_ACCOUNT` no ORDER BY para resolver a ambiguidade do Bradesco
- [x] 2.3 Combinar em um `INSERT INTO transactions_enriched SELECT ... FROM transactions t LEFT JOIN ...` dentro de `BEGIN` / `COMMIT` com `TRUNCATE transactions_enriched` antes
- [x] 2.4 Testar o SQL manualmente no banco e validar: total de linhas = total em `transactions`; distribuição de `transaction_kind` (verificar que TRANSFER não infla mais do que esperado)

## 3. Implementação TypeScript

- [x] 3.1 Adicionar tipo `EnrichTransactionsRepository` ou método `enrichTransactions(): Promise<void>` em `BunPgAdapter.ts` que executa o TRUNCATE + INSERT SQL do passo 2
- [x] 3.2 Adicionar `enrichTransactionRepo` (ou método equivalente) como dependência do `SyncUseCase` em `SyncUseCase.ts`
- [x] 3.3 Adicionar step 6 em `SyncUseCase.run()` após o step de identidades: `await this.deps.enrichTransactionRepo.enrich()` (ou equivalente) com log `[sync] Enriching transactions...`
- [x] 3.4 Atualizar `SyncSummary` se necessário para refletir o step adicional

## 4. Validação

- [x] 4.1 Executar `bun run sync` completo e verificar ausência de erros
- [x] 4.2 Validar contagem: `SELECT COUNT(*) FROM transactions_enriched` = `SELECT COUNT(*) FROM transactions`
- [x] 4.3 Validar distribuição: `SELECT transaction_kind, COUNT(*) FROM transactions_enriched GROUP BY transaction_kind ORDER BY 2 DESC`
- [x] 4.4 Validar que pares conhecidos de transferência Wilson→Nubank estão como `TRANSFER` com `peer_account_id` preenchido
- [x] 4.5 Validar que `is_real_cashflow = TRUE` soma apenas EXPENSE + INCOME e o total é menor que o total de débitos/créditos brutos

## 5. Documentação

- [x] 5.1 Atualizar `docs/finance-context.md` adicionando seção sobre `transactions_enriched` com a tabela de colunas novas e a lógica de `transaction_kind`
- [x] 5.2 Adicionar query de referência "Fluxo de caixa real (sem transferências)" no `docs/finance-context.md`
