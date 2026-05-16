## 1. DDL — Atualizar schema.sql

- [x] 1.1 Substituir o bloco `CREATE TABLE IF NOT EXISTS transactions_enriched` em `schema.sql` pelo novo DDL sem as 11 colunas removidas e com `owner_normalized TEXT NOT NULL`
- [x] 1.2 Verificar que os dois índices existentes (`idx_tx_enriched_account_id_date`, `idx_tx_enriched_transaction_kind`) estão preservados no DDL

## 2. Banco em execução — Recriar tabela

- [x] 2.1 Executar `DROP TABLE transactions_enriched;` no banco em execução para remover o schema antigo
- [x] 2.2 Aplicar o novo DDL: `docker exec -i mcp-finance-postgres-1 psql -U finance -d finance` com o trecho novo do `schema.sql` e verificar que a tabela foi criada com o novo schema via `\d transactions_enriched`

## 3. BunPgAdapter — Atualizar SQL de enriquecimento

- [x] 3.1 No método `enrichTransactions.enrich()` de `BunPgAdapter.ts`, remover da projeção do SELECT as colunas eliminadas: `balance`, `provider_code`, `merchant`, `acquirer_data`, `cc_card_number`, `provider_id`, `"order"`, `created_at`, `updated_at`, `synced_at`, `payment_data`
- [x] 3.2 Adicionar JOIN com `accounts` no SELECT principal para obter `owner_normalized`: `JOIN accounts a ON a.id = t.account_id`
- [x] 3.3 Adicionar `LOWER(TRIM(a.owner)) AS owner_normalized` na projeção do SELECT, posicionado após as colunas de enriquecimento existentes

## 4. Verificação de uso das colunas removidas

- [x] 4.1 Buscar no código-fonte referências a colunas removidas em contexto de `transactions_enriched`: `payment_data`, `synced_at`, `cc_card_number`, `balance`, `"order"` — confirmar que nenhuma MCP tool ou view as usa diretamente

## 5. Validação

- [x] 5.1 Executar `bun run sync` completo e verificar ausência de erros
- [x] 5.2 Validar contagem: `SELECT COUNT(*) FROM transactions_enriched` = `SELECT COUNT(*) FROM transactions`
- [x] 5.3 Validar `owner_normalized`: `SELECT DISTINCT owner_normalized FROM transactions_enriched ORDER BY 1` — deve retornar exatamente 2 valores (`'giulia cristina rodrigues de souza'` e `'wilson felipe da silva'`)
- [x] 5.4 Confirmar colunas via `\d transactions_enriched`: 21 colunas no total (20 de dados + `owner_normalized`), sem as 11 removidas

## 6. Documentação

- [x] 6.1 Atualizar a seção "Camada Bronze: `transactions_enriched`" em `docs/finance-context.md` com a tabela de colunas atualizada (remover as 11 exluídas, adicionar `owner_normalized`)
