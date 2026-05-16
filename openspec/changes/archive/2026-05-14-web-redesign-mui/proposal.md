## Why

O dashboard web atual usa `@tremor/react` para tudo — tabs, cards, charts e tipografia. O `TabList` do Tremor não é responsivo: com 5 abas e labels longas ("Próximo Mês", "Investimentos"), os itens se encavalcam no viewport mobile (`max-w-md`). Além disso, os charts Tremor têm pouca personalização e o bundle completo da lib é pesado para poucos componentes usados.

## What Changes

- **BREAKING** Remover `@tremor/react` completamente do `client/`
- Instalar `@mui/material`, `@mui/x-charts`, `@emotion/react`, `@emotion/styled`
- Substituir `TabGroup/TabList/Tab/TabPanel` → `BottomNavigation` fixo na base da tela
- Substituir todos os charts Tremor → `PieChart`, `LineChart`, `BarChart` do `@mui/x-charts`
- Substituir `Card`, `Metric`, `Text`, `Badge`, `ProgressBar` → equivalentes MUI Material
- Manter Tailwind CSS apenas para layout (`max-w-md`, `grid`, `gap`, `space-y`, `px-`, `pb-`)
- Ajustar `client/package.json` removendo `@tremor/react` e adicionando `@mui/*`

## Capabilities

### New Capabilities

- `web-bottom-navigation`: BottomNavigation MUI fixo na base, substituindo o Tremor TabList horizontal. Resolve o encavalcamento de tabs no mobile.
- `web-mui-charts`: Componentes de chart reimplementados com `@mui/x-charts` — `PieChart` (donut com `innerRadius`), `LineChart` com área, `BarChart` horizontal e vertical.
- `web-mui-components`: Cards, métricas, badges, progress bars e tipografia reimplementados com `@mui/material`, seguindo o design system Material Design.

### Modified Capabilities

<!-- Nenhum spec existente cobre a camada de UI web — tudo novo -->

## Impact

- `client/package.json`: remove `@tremor/react`, adiciona `@mui/material@^6`, `@mui/x-charts@^8`, `@emotion/react`, `@emotion/styled`
- `client/tailwind.config.ts`: remover entrada do tremor em `content`
- `client/src/components/`: todos os 15 componentes refatorados
- `client/src/tabs/`: 5 tabs ajustadas para MUI
- `client/src/App.tsx`: troca `TabGroup/TabList` por `BottomNavigation` + state de aba ativa
- Bundle estimado menor (~180 kB gzip vs ~280 kB atual com Tremor completo)
