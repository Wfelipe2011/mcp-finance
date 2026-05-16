## Why

A segunda pergunta do Pierre Finance é "Pra onde meu dinheiro foi?". Essa aba responde isso com visual impactante: um donut mostrando a distribuição por grupos (Alimentação, Moradia, etc.), uma lista ordenada por categoria e um destaque para gastos novos — compras que apareceram pela primeira vez este mês.

## What Changes

- Implementar `client/src/tabs/Gastos.tsx` substituindo o placeholder
- Criar `client/src/components/GruposDonut.tsx` — gráfico donut de distribuição de grupos usando Tremor `DonutChart`
- Criar `client/src/components/CategoriaBarList.tsx` — lista de categorias com barras de progresso usando Tremor `BarList`
- Criar `client/src/components/NovosGastos.tsx` — lista de gastos novos do mês com badge "NOVO"

## Capabilities

### New Capabilities

- `web-tab-gastos-ui`: aba Gastos completa com donut de grupos, barlist de categorias e destaque de gastos novos

### Modified Capabilities

## Impact

- **Arquivo modificado**: `client/src/tabs/Gastos.tsx` (placeholder → implementação)
- **Arquivos novos**: 3 componentes em `client/src/components/`
- **Endpoint consumido**: `GET /api/gastos?month=` (retorna `{ grupos, categorias, novos }`)
- **Zero impacto** no server ou em outras abas
