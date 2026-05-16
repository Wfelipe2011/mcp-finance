## Context

O enriquecimento de transações (`enrichTransactions.enrich()` em `BunPgAdapter.ts`) classifica cada transação com um `transaction_kind` via CASE expression. A lógica atual detecta transferências entre contas próprias para `DEBIT` (via categoria ou payment_data), mas para `CREDIT` só detecta quando o `peer_account_id` é resolvido via `payment_data.payer.accountNumber`. Quando o número de conta remetente não está nos `payment_data` (o que ocorre em ~40% dos PIX pelo Pluggy), o CREDIT cai no `ELSE → INCOME`, inflando receitas mensais em até R$126k.

**Estado atual da classificação CREDIT:**
```
CREDIT + payment_data.payer in accounts → TRANSFER  ✓
CREDIT + categoria "Transferência entre Próprias Contas" sem peer match → INCOME  ✗ (bug)
CREDIT + pagamento fatura → TRANSFER  ✓
ELSE → INCOME  ✓ (para CREDITs legítimos)
```

## Goals / Non-Goals

**Goals:**
- Classificar CREDITs da categoria "Transferência entre Próprias Contas" como `TRANSFER` independente do peer match
- Reduzir inflação de receitas mensais para zero (fevereiro: R$136k → ~R$10k real)
- Manter a lógica existente para todos os outros casos

**Non-Goals:**
- Reclassificar "Transferências" genérias (categoria diferente de "Transferência entre Próprias Contas")
- Alterar a lógica para DEBITs (já correta)
- Modificar a view `cube_cashflow_mensal` (as views refletem corretamente o `transaction_kind`)

## Decisions

### Decisão 1: Classificar por categoria, não por peer_account_id

**Escolhido**: adicionar WHEN para CREDIT + categoria "Transferência entre Próprias Contas" → TRANSFER antes do ELSE.

**Alternativa considerada**: Tentar expandir o peer match (ex: lookup por nome do remetente). Descartado: o Pluggy não fornece nome de forma normalizada, e o risco de falsos positivos é alto.

**Rationale**: A categoria "Transferência entre Próprias Contas" é atribuída pelo Pluggy com alta precisão para transações entre contas do mesmo CPF/CNPJ. Classificar pela categoria é mais confiável que o peer match por número de conta.

### Decisão 2: Re-executar enrich após a correção

O fix é no código do `enrich()`. O banco precisa ser re-populado com `bun run enrich`. Não há migration SQL direta porque a lógica vive no TypeScript.

**Risco**: `ai_transaction_insights` pode perder dados se a FK cascade estiver ativa. Já foi corrigido (FK referencia `transactions`, não `transactions_enriched`).

## Risks / Trade-offs

- **[Risco]** Alguns CREDITs legítimos de terceiros podem estar categorizados como "Transferência entre Próprias Contas" pelo Pluggy erroneamente → **Mitigação**: validar a contagem antes/depois; em caso extremo, reverter com `git revert`
- **[Trade-off]** Receitas históricas vão cair drasticamente (ex: fev: -R$126k) — isso é correto, não é regressão
- **[Risco]** O `cube_cashflow_mensal.total_receitas_operacionais` já excluía OPERACAO_CREDITO mas não excluía transferências INCOME — após o fix, ambos ficam corretos automaticamente

## Migration Plan

1. Aplicar o fix no CASE expression (`BunPgAdapter.ts`)
2. Executar `bun run enrich` para re-popular `transactions_enriched`
3. Validar: `SELECT year, month, total_receitas FROM cube_cashflow_mensal ORDER BY year DESC, month DESC LIMIT 6`
4. Esperado: fev/2026 cai de R$136k para ~R$10k; mai/2026 inalterado

## Open Questions

- Nenhuma questão pendente.
