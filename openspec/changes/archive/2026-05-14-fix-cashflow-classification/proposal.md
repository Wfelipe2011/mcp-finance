## Why

Transferências PIX entre contas próprias (ex: Wilson → Giulia) onde o Pluggy não consegue matchear `peer_account_id` pelo `payment_data` são classificadas como `INCOME` no enriquecimento, inflando as receitas mensais em até R$126k (fevereiro: R$136k exibido vs ~R$10k real). Os dados do Resumo são atualmente não confiáveis.

## What Changes

- Corrigir a lógica do `kind` CASE em `BunPgAdapter.ts`: transações `CREDIT` da categoria "Transferência entre Próprias Contas" devem ser classificadas como `TRANSFER`, não `INCOME`
- Re-executar o enriquecimento para regenerar `transactions_enriched` com a classificação correta
- Validar que `cube_cashflow_mensal` passa a exibir valores coerentes (fev: ~R$10k receita, não R$136k)

## Capabilities

### New Capabilities

- `cashflow-classification-rules`: Regras de classificação de `transaction_kind` cobrindo todos os cenários de CREDIT/DEBIT por categoria e operation_type

### Modified Capabilities

- `transactions-bronze`: O comportamento de classificação `kind` muda (CREDIT de conta própria → TRANSFER em vez de INCOME)

## Impact

- `src/infrastructure/db/BunPgAdapter.ts`: CASE expression do `kind` CTE
- `transactions_enriched`: tabela precisa ser re-populada após a correção
- `cube_cashflow_mensal`: valores de `total_receitas` e `saldo_liquido` mudarão em todos os meses com transferências internas
- Todos os meses com PIX entre contas próprias serão afetados (especialmente fev/2026 e mar/2026)
