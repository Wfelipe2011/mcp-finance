## Context

Os dados reais revelam que os 5 cartões de crédito têm `ccBalanceDueDate` sempre no passado (o banco informa o vencimento do ciclo atual, não do próximo). Isso é comportamento esperado da API Pluggy: após o vencimento, o próximo ciclo começa mas o campo pode não ser atualizado até o próximo sync. A view precisa lidar com isso calculando o próximo vencimento estimado como `DATE(ccBalanceDueDate, '+30 days')`.

Para top categorias, o mesmo filtro de ruído de `v_spending_by_cat` se aplica. A diferença é que esta view é limitada a 10 linhas e inclui `pctDoTotal` — mais útil para o modelo gerar frases como "Compras representou 34% dos seus gastos esse mês".

## Goals / Non-Goals

**Goals:**
- `v_credit_alerts`: por cartão — `name`, `lastFour`, `fatura`, `vencimento` (ccBalanceDueDate), `proximoVencimento` (+ 30 dias), `diasParaVencer` (a partir do próximo vencimento), `minimo`, `utilizacaoPct`, `statusAlerta`
- `v_top_categories_30d`: top 10 categorias DEBIT últimos 30d — `category`, `total`, `pctDoTotal`, sem ruído
- `statusAlerta` calculado: `'VENCIDO'` (diasParaVencer < 0), `'URGENTE'` (0-3 dias), `'ATENÇÃO'` (4-7 dias), `'OK'` (> 7 dias)

**Non-Goals:**
- Não enviar notificações — apenas expor dados para o MCP reagir
- Não consolidar alertas de investimento (coberto por `v_investment_maturity`)
- `v_top_categories_30d` não precisa de coluna `total_90d` — essa é responsabilidade de `v_spending_by_cat`

## Decisions

**D1 — `proximoVencimento = DATE(ccBalanceDueDate, '+30 days')`**
Estimativa simples que funciona para ciclos mensais padrão. Cartões com ciclo de 25 ou 28 dias podem ter pequena imprecisão. Alternativa: tentar inferir o dia fixo do mês — complexidade desnecessária para o modelo, que usa o dado para contextualizar, não para cobrança formal.

**D2 — `diasParaVencer` calculado contra `proximoVencimento`**
Se calculado contra `ccBalanceDueDate` (que está no passado), todos seriam negativos — sem valor de alerta. Calculado contra `proximoVencimento`, reflete o prazo real do ciclo em andamento.

**D3 — `pctDoTotal` em `v_top_categories_30d` usa SUM do período inteiro como denominador**
O denominador é `SUM(ABS(amount))` de todas as categorias não-ruído dos últimos 30d — não apenas o top 10. Isso garante que os percentuais somem para um valor real (não necessariamente 100% se existem mais de 10 categorias). O modelo pode comunicar "os 10 maiores gastos representam X% do total".

**D4 — LIMIT 10 hardcoded na view**
Suficiente para o assistente gerar insights de pareto (80/20). Mais de 10 categorias sobrecarrega a resposta sem valor adicional.

## Risks / Trade-offs

- **[Risco] `ccBalanceDueDate` desatualizado após sync** → Se o usuário não roda `bun run sync` há mais de 30 dias, `proximoVencimento` pode estar errado. Mitigação: o modelo deve mencionar "baseado no último sync em X data".
- **[Trade-off] `statusAlerta` com thresholds fixos (3/7 dias)** → Thresholds razoáveis para o contexto brasileiro (débito automático, boleto com 2 dias úteis). Podem ser ajustados futuramente.
- **[Risco] Cartão com fatura zero aparece na view com statusAlerta='OK'** → Correto — sem fatura, sem urgência. O modelo filtra naturalmente.
