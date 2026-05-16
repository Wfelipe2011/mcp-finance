## Why

"Quantos meses a família sobrevive sem receitas?" é uma das métricas de saúde financeira mais importantes — e hoje não existe em nenhum cubo. O Cash Runway responde isso: divide o saldo líquido atual pelo gasto médio dos últimos 3 meses. Uma view simples na camada Gold, consumível diretamente pelo MCP.

## What Changes

- Cria view `kpi_cash_runway` em `gold-cubes.sql`
  - `saldo_liquido`: soma dos saldos de contas correntes e poupança (excluindo investimentos) de `cube_patrimonio`
  - `media_saidas_90d`: média das `total_despesas` dos 3 meses mais recentes de `cube_cashflow_mensal`
  - `runway_meses`: `saldo_liquido / media_saidas_90d` (NULL se denomindador for zero)

## Capabilities

### New Capabilities

- `kpi-cash-runway`: Responde "quantos meses a família aguentaria sem receita?" — base para alertas proativos do agente

### Modified Capabilities

<!-- nenhuma -->

## Impact

- Apenas SQL — nova view sobre views gold já existentes
- Nenhuma mudança em TypeScript
- `kpi_cash_runway` terá sempre uma única linha (snapshot atual)
- Expor via MCP tool `get_cash_runway` é desejável mas fora do escopo desta change
