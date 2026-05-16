## Context

O bronze `transactions_enriched` tem `amount` com sinal inconsistente (depende do banco/cartão), `date` como TEXT ISO 8601, e IDs de dimensão como UUID text. A camada prata dos fatos resolve isso: normaliza o sinal, extrai a data como DATE, e faz JOIN com as dimensões.

**Dados atuais**: 3.295 transações (Jan/2025–Mai/2026). 4 kinds: EXPENSE(2559), INCOME(379), INVEST(124), TRANSFER(233).

## Goals / Non-Goals

**Goals:**
- `f_transacoes`: view completa com amount_signed, date_day, user_id, account_id, category_id
- `f_fluxo_caixa`: subset de `f_transacoes` com `is_real_cashflow = true`
- `f_investimentos`: view de movimentações de investimento com valor líquido

**Non-Goals:**
- Não agregar ou sumarizar (isso é papel do gold)
- Não criar materialized views (apenas views regulares)
- Não modificar bronze

## Decisions

**D1: Convenção de `amount_signed`**
Perspectiva do bolso da família. Regra:
```
EXPENSE  → -ABS(amount)   sempre negativo (saída)
INCOME   → +ABS(amount)   sempre positivo (entrada)
INVEST   → -ABS(amount)   saiu do caixa (foi para investimento)
TRANSFER → amount         mantém sinal original (cancela par a par)
```
Alternativa considerada: manter sinal original — rejeitada porque EXPENSE com sinal positivo (estornos de cartão) confunde análises de gasto.

**D2: `f_fluxo_caixa` como view separada, não filtro**
Facilita o uso por agentes LLM via MCP: uma tool `get_cashflow` aponta para `f_fluxo_caixa` sem precisar lembrar o filtro `WHERE is_real_cashflow`. Também facilita o gold layer.

**D3: `f_transacoes` mantém `transaction_id` como TEXT (UUID original)**
Não introduzimos surrogate key inteiro nos fatos — o UUID da Pluggy é estável e suficiente. A complexidade de um surrogate key para fatos não se justifica neste volume.

**D4: `f_investimentos` usa `net_amount` como métrica principal**
`investment_transactions.net_amount` já desconta taxas. Para análise do retorno líquido, é mais relevante que `amount` bruto.

## Risks / Trade-offs

- **EXPENSE com amount positivo vira negativo** → estornos e cashbacks ficam negativos. Pode parecer contra-intuitivo mas é consistente com a perspectiva de "quanto saiu". Gold layer pode adicionar `is_reversal` se necessário.
- **TRANSFER com sinal original** → transferências internas têm pares (débito + crédito). Como `is_real_cashflow = false`, não entram no cashflow. Na `f_transacoes` aparecem os dois lados, mas isso é correto para rastrear movimentação entre contas próprias.
