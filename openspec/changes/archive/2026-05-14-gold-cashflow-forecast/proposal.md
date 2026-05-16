## Why

`cube_cashflow_mensal` só olha para o passado — mostra o que já aconteceu. Mas as maiores decisões financeiras são sobre o futuro: "posso viajar em julho sabendo que tenho R$ 1.200 de parcelas vencendo?" Com `f_parcelas_futuras` (change `silver-parcelas-projecao`), podemos estender o cashflow para os próximos meses, incluindo compromissos previstos de parcelamentos.

## What Changes

- Cria view `cube_cashflow_projetado` em `gold-cubes.sql`
  - Combina meses históricos (de `cube_cashflow_mensal`) com meses futuros (de `f_parcelas_futuras`)
  - Para meses futuros: `total_receitas = NULL`, `total_despesas = SUM(installment_amount)` agrupado por `projected_month`, `saldo_liquido = -total_despesas` (somente o peso das parcelas)
  - Coluna `is_projected: BOOLEAN` para diferenciar histórico de previsão
  - Janela: histórico completo + próximos 6 meses

## Capabilities

### New Capabilities

- `gold-cashflow-forecast`: Cashflow com janela de previsão — agente pode responder "nos próximos 3 meses você tem R$ X comprometidos em parcelas, planeje suas reservas"

### Modified Capabilities

- `gold-cube-cashflow`: `cube_cashflow_mensal` mantido como está (histórico puro); `cube_cashflow_projetado` é a visão estendida — sem breaking change

## Impact

- Depende de `silver-parcelas-projecao` estar implementado e `f_parcelas_futuras` existindo
- Apenas SQL — nova view em `gold-cubes.sql`
- Previsão é uma estimativa (parcelas aproximadas) — view deve deixar isso claro com `is_projected = true`
- Expor via MCP tool `get_cashflow_forecast` é desejável mas fora do escopo desta change
