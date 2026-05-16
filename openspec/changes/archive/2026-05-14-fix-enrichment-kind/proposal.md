## Why

O enriquecimento de `transaction_kind` em `BunPgAdapter.enrichTransactions.enrich()` classifica como `INVEST` apenas transações com `operation_type IN ('RESGATE_APLIC_FINANCEIRA', 'RENDIMENTO_APLIC_FINANCEIRA')` — ou seja, apenas os **saques/resgates** de investimentos. Os **aportes** (depósitos em carteiras, PIX para Digio, Cofrinho) chegam como `DEBIT` sem operation_type específico e viram `EXPENSE`.

Da mesma forma, o classificador `TRANSFER` só detecta transferências entre contas próprias quando o `payment_data.accountNumber` bate com contas cadastradas. Muitos PIX internos (Wilson→própria conta Bradesco, por exemplo) não têm esse campo preenchido pelo Pluggy, mas a categoria do Pluggy já os identifica como `"Transferência entre Próprias Contas"`.

Impacto medido (Mar/2026):
- Aportes em investimentos classificados como EXPENSE: R$ 15.434
- Transferências próprias classificadas como EXPENSE: R$ 9.292
- Total inflado em despesas: ~R$ 24.726 sobre um total de R$ 44.107 (56% de viés)

## What Changes

Adicionar dois novos gatilhos no classificador de `transaction_kind` dentro do CTE `kind`:

1. **Fallback para TRANSFER via categoria**: se `category_group_pt = 'Transferência entre Próprias Contas'` → `TRANSFER`
2. **Fallback para INVEST via categoria**: se `category_group_pt = 'Investimentos'` e `type = 'DEBIT'` → `INVEST`

Esses fallbacks têm prioridade **menor** que os baseados em `operation_type` e `payment_data` (posicionados depois no CASE).

## Capabilities

### New Capabilities
- `enrichment-kind-category-fallback`: Classificação de `transaction_kind` com fallback baseado na categoria do Pluggy quando `operation_type` e `payment_data` não são suficientes.

### Modified Capabilities
- `transactions-bronze`: O campo `transaction_kind` em `transactions_enriched` passa a ter cobertura correta para aportes e transferências próprias.

## Impact

- `BunPgAdapter.ts`: CTE `kind` no método `enrich()` recebe 2 novos `WHEN` no CASE
- `cube_gastos_mensais`: grupos "Investimentos" e "Transferência entre Próprias Contas" desaparecem das despesas reais
- `cube_cashflow_mensal`: `total_despesas` passa a refletir só gastos reais de consumo
- Depende de `fix-dedup-transactions` ser aplicado primeiro (base limpa)
