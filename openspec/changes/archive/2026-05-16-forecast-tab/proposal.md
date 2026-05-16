## Why

As predições e mensagens geradas pelos workers de ML e IA ficam inacessíveis ao usuário sem uma aba dedicada na interface React. Precisamos de uma nova aba "Previsão" que combine o card de mensagem IA do dia, o resumo por grupo (Necessidades/Desejos/Poupança) com curva real→previsto, e o detalhe por categoria — tudo para os próximos 3 meses.

## What Changes

- Nova aba "Previsão" no `App.tsx` (entre ProximoMes e Investimentos)
- Novo componente `client/src/tabs/Previsao.tsx`
- 3 seções: card AI (mensagem do dia), resumo por grupo com gráfico, resumo por categoria com tabela
- Novos tipos em `client/src/api/types.ts` para os dados de forecast
- Novas funções em `client/src/api/client.ts` para chamar os 3 endpoints de forecast
- Estado de loading e empty state quando dados ainda não estão disponíveis
- Ícone de previsão/tendência no bottom navigation

## Capabilities

### New Capabilities

- `forecast-tab-ui`: Aba React "Previsão" com card AI, gráfico de grupos e tabela de categorias mostrando a evolução real→previsto dos próximos 3 meses

### Modified Capabilities

_(nenhuma)_

## Impact

- `client/src/App.tsx`: nova aba com ícone no bottom nav
- `client/src/tabs/Previsao.tsx`: novo componente principal
- `client/src/api/client.ts`: 3 novas funções `fetchForecastGroups`, `fetchForecastCategories`, `fetchForecastMessage`
- `client/src/api/types.ts`: novos tipos `ForecastMonth`, `ForecastMessage`
- Componentes reutilizáveis existentes: `LoadingCard`, `ErrorCard` (sem modificações)
- Dependência runtime: endpoints `forecast-endpoints` devem estar no ar
