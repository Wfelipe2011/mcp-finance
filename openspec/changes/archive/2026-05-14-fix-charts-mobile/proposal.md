## Why

Os gráficos da aplicação usam margens fixas (MUI X Charts) incompatíveis com viewports móveis de 390px. Em mobile, os donuts de "Grupos de Gasto" e "Patrimônio" têm `margin={{ right: 120 }}` para a legenda lateral, o que empurra o gráfico para fora do container. Os gráficos de barra e área têm `margin={{ left: 60-110 }}` para labels BRL no eixo Y que ficam truncadas.

## What Changes

- **GruposDonut e PatrimonioDonut**: remover `margin={{ right: 120 }}` e legenda lateral embutida; adicionar legenda separada abaixo do gráfico com bolinhas coloridas
- **CashflowAreaChart, CategoriaBarList, InvestimentosBarChart**: reduzir margem esquerda usando `useMediaQuery` ou encurtar labels BRL

## Capabilities

### Modified Capabilities

- `cashflow-area-chart`: suporte a mobile com margem esquerda responsiva
- `grupos-donut`: redesenho sem legenda lateral; legenda separada abaixo
- `patrimonio-donut`: redesenho sem legenda lateral; legenda separada abaixo
- `categoria-bar-list`: margem esquerda responsiva para nomes de categoria
- `investimentos-bar-chart`: margem esquerda responsiva para labels BRL

## Impact

- `client/src/components/GruposDonut.tsx`
- `client/src/components/PatrimonioDonut.tsx`
- `client/src/components/CashflowAreaChart.tsx`
- `client/src/components/CategoriaBarList.tsx`
- `client/src/components/InvestimentosBarChart.tsx`
