## Context

`cube_cashflow_mensal` agrega `SUM(amount_signed) FILTER (WHERE transaction_kind = 'INCOME')` como `total_receitas`. Isso inclui tudo que é INCOME — salários, reembolsos, rendimentos E empréstimos. A distinção está disponível via JOIN com `transactions_enriched.operation_type`, mas a view atual não expõe isso.

O campo `debt_inflows` no `ai_monthly_digest` resolve esse problema para o contexto do AI, mas o card de Resumo usa a API REST diretamente.

## Goals / Non-Goals

**Goals:**
- Adicionar `total_emprestimos` e `total_receitas_operacionais` ao cube sem quebrar campos existentes
- Exibir receita operacional como principal e empréstimos como contexto secundário na UI
- Manter retrocompatibilidade da API (campos novos são adicionais)

**Non-Goals:**
- Não alterar `cashflow_real` do AI digest (já correto)
- Não reclassificar `OPERACAO_CREDITO` como TRANSFER ou outro tipo — dinheiro realmente entrou, só precisa de contexto
- Não exibir detalhamento de cada empréstimo (apenas total agregado)

## Decisions

**D1 — Novas colunas em `cube_cashflow_mensal` (não view separada)**

Adicionar na VIEW existente:
```sql
ROUND(SUM(ABS(te.amount)) FILTER (
  WHERE fc.transaction_kind = 'INCOME' AND te.operation_type = 'OPERACAO_CREDITO'
)::NUMERIC, 2) AS total_emprestimos,
ROUND((
  SUM(fc.amount_signed) FILTER (WHERE fc.transaction_kind = 'INCOME')
  - COALESCE(SUM(ABS(te.amount)) FILTER (WHERE fc.transaction_kind = 'INCOME' AND te.operation_type = 'OPERACAO_CREDITO'), 0)
)::NUMERIC, 2) AS total_receitas_operacionais
```
Requer JOIN com `transactions_enriched` na view (já joinado indiretamente via f_fluxo_caixa→f_transacoes→transactions_enriched).

**D2 — UI: exibir `total_receitas_operacionais` como valor principal**

No card de grade do Resumo.tsx, substituir `cashflow.total_receitas` por `cashflow.total_receitas_operacionais`. Se `total_emprestimos > 0`, exibir badge `+ R$ X.XXX (empréstimo)` abaixo.

**D3 — Campos novos opcionais no tipo TypeScript**

Adicionar como `total_emprestimos?: number` e `total_receitas_operacionais?: number` em `CashflowMensal` — fallback para `total_receitas` se ausente.

## Risks / Trade-offs

- **JOIN extra na view**: a view precisa joinear com `transactions_enriched` para acessar `operation_type`. Alternativa mais simples: criar view separada `cube_cashflow_mensal_detalhe`. Preferimos manter tudo em uma view para simplicidade da API.
- **Regressão**: campos existentes (`total_receitas`, `total_despesas`, `saldo_liquido`) não mudam — retrocompatível.
