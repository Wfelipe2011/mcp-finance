## Why

Com as dimensões criadas (`silver-dimensions`), precisamos das tabelas fato que conectam os eventos financeiros ao contexto dimensional. Sem os fatos, não é possível responder "quanto gastei em alimentação em março" ou "qual meu cashflow real do mês". Os fatos são o coração do modelo analítico.

## What Changes

- Cria view `f_transacoes` com todas as transações normalizadas, `amount_signed` (convenção: EXPENSE sempre negativo, INCOME sempre positivo), FKs para dimensões
- Cria view `f_fluxo_caixa` como subset de `f_transacoes` onde `is_real_cashflow = true` (exclui transferências internas e movimentações de investimento irrelevantes)
- Cria view `f_investimentos` sobre `investment_transactions JOIN investments` com valor líquido e tipo de movimentação

## Capabilities

### New Capabilities

- `silver-f-transacoes`: View fato principal com todas as transações, amount_signed normalizado e FKs dimensionais
- `silver-f-fluxo-caixa`: View de cashflow real (apenas is_real_cashflow = true)
- `silver-f-investimentos`: View fato de movimentações de investimentos

### Modified Capabilities

<!-- nenhuma -->

## Impact

- Depende de `silver-dimensions` (`d_users`, `d_data`, `d_conta`, `d_categoria`) estar implementado
- Lê de: `transactions_enriched`, `investment_transactions`, `investments`
- Consumido por: `gold-cubes` e MCP tools analíticas
- Nenhuma tabela bronze é modificada
