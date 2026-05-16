## Why

O app não tem visibilidade de **gastos recorrentes e tendências** — a informação mais útil para previsão orçamentária. Um usuário não sabe quanto vai gastar em alimentação, moradia e serviços no próximo mês sem olhar mês a mês manualmente.

O dado já existe no banco: `cube_gastos_grupo_mensal` (histórico por grupo) + `ai_transaction_insights.is_recurring` (recorrência por AI). O que falta é uma view SQL consolidada e um endpoint + tab no app.

Gastos recorrentes confirmados pelo AI (já no banco):
- GAT Locação (aluguel): R$1.635/mês × 2 meses
- Claro: R$120/mês × 3 meses
- Gympass: R$98/mês × 3 meses
- Netflix: R$20/mês × 4 meses
- Z-API: R$99/mês × 6 meses

## What Changes

1. **View SQL `cube_tendencias`**: média de gastos por grupo nos últimos 3 meses com contagem de presença (para detectar consistência), plus subconsulta de recorrentes confirmados por AI agrupados por categoria
2. **Endpoint REST `/tendencias`**: retorna a estrutura consolidada
3. **Client**: nova seção "Tendências" na aba Gastos (abaixo das categorias) ou como card no Resumo, mostrando média mensal por grupo e lista de recorrentes identificados por AI

## Capabilities

### New Capabilities
- `tendencias-endpoint`: View `cube_tendencias` com média 3 meses por grupo + recorrentes AI; endpoint REST `/tendencias`; exibição no cliente.

### Modified Capabilities

## Impact

- `gold-cubes.sql`: nova VIEW `cube_tendencias`
- `src/application/web/routes/tendencias.ts`: novo arquivo de rota
- `src/application/web/router.ts`: registro da rota `/tendencias`
- `BunPgAdapter.ts`: método `getTendencias()`
- `client/src/api/client.ts`: função `fetchTendencias()`
- `client/src/api/types.ts`: tipo `Tendencias`
- `client/src/tabs/Gastos.tsx`: nova seção "Tendências" ao final
- Depende de `fix-enrichment-kind` para médias limpas (sem aportes/transferências)
