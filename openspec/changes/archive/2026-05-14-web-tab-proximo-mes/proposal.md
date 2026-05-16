## Why

A terceira pergunta do Pierre Finance é "O que pesa no próximo mês?". Esta aba é prospectiva — combina o cashflow projetado com as parcelas abertas e o indicador de fôlego para dar ao usuário uma visão do que está vindo. É a aba mais analítica, mas deve ser legível: uma linha do tempo visual e uma lista de compromissos.

## What Changes

- Implementar `client/src/tabs/ProximoMes.tsx` substituindo o placeholder
- Criar `client/src/components/CashflowAreaChart.tsx` — gráfico de área com séries históricas (sólidas) e projetadas (tracejadas)
- Criar `client/src/components/CompromissosLista.tsx` — lista de parcelas abertas com barra de progresso `N/total`

## Capabilities

### New Capabilities

- `web-tab-proximo-mes-ui`: aba Próximo Mês com AreaChart de cashflow projetado, lista de compromissos ativos e runway

### Modified Capabilities

## Impact

- **Arquivo modificado**: `client/src/tabs/ProximoMes.tsx` (placeholder → implementação)
- **Arquivos novos**: 2 componentes em `client/src/components/`
- **Endpoints consumidos**: `GET /api/cashflow/projetado`, `GET /api/compromissos`, `GET /api/runway`
- **Zero impacto** no server ou em outras abas
