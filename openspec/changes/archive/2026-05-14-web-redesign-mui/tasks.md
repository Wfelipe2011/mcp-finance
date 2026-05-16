## 1. Dependências

- [x] 1.1 Remover `@tremor/react` de `client/package.json` (dependencies)
- [x] 1.2 Adicionar `@mui/material@^6`, `@mui/x-charts@^8`, `@emotion/react@^11`, `@emotion/styled@^11` em `client/package.json`
- [x] 1.3 Adicionar `@mui/icons-material@^6` em `client/package.json`
- [x] 1.4 Remover entrada do tremor em `content` de `client/tailwind.config.ts`
- [x] 1.5 Rodar `bun install` em `client/` e confirmar que `bun.lock` atualiza sem erros

## 2. App.tsx — BottomNavigation

- [x] 2.1 Remover `TabGroup, TabList, Tab, TabPanels, TabPanel` do import
- [x] 2.2 Adicionar `BottomNavigation, BottomNavigationAction, Paper` do `@mui/material`
- [x] 2.3 Adicionar ícones `HomeRounded, ReceiptLongRounded, CalendarMonthRounded, ShowChartRounded, AutoAwesomeRounded` do `@mui/icons-material`
- [x] 2.4 Substituir `useState("")` de `selectedMonth` e adicionar `useState(0)` para aba ativa (`activeTab`)
- [x] 2.5 Renderizar `BottomNavigation` com `position: fixed; bottom: 0` dentro de `<Paper elevation={3}>`
- [x] 2.6 Controlar exibição de conteúdo via `activeTab` (switch ou array de componentes)
- [x] 2.7 Adicionar `paddingBottom: "56px"` no container principal para não sobrepor conteúdo

## 3. Primitives — LoadingCard e ErrorCard

- [x] 3.1 Substituir Tremor `Card` por `Paper elevation={1}` com `sx={{ borderRadius: 2, p: 2 }}` em `LoadingCard`
- [x] 3.2 Substituir spinner Tremor por `CircularProgress` do MUI + `Typography variant="body2"` em `LoadingCard`
- [x] 3.3 Substituir Tremor `Card` e `Text` por `Paper` + `Typography color="error"` em `ErrorCard`

## 4. Primitives — MonthPicker

- [x] 4.1 Substituir `<select>` nativo por `Select` + `MenuItem` do MUI com `size="small" fullWidth variant="outlined"`

## 5. Primitives — FlagPills

- [x] 5.1 Substituir `Badge` do Tremor por `Chip size="small"` do MUI
- [x] 5.2 Mapear cores: emerald→`color="success"`, amber→`color="warning"`, red→`color="error"`, blue→`color="primary"`, gray→`color="default"`

## 6. Primitives — RunwayIndicator

- [x] 6.1 Substituir `Badge` do Tremor por `Chip size="small"` do MUI com cor semântica (success/warning/error conforme runway_meses)

## 7. Primitives — DigestNarrative

- [x] 7.1 Substituir `Card` + `Text` por `Paper` + `Typography` MUI
- [x] 7.2 Manter lógica de colapso (200 chars preview + "ver mais") com `Typography` e `Button variant="text" size="small"`

## 8. Primitives — CompromissosLista

- [x] 8.1 Substituir `Card` + `Text` por `Paper` + `Typography` MUI
- [x] 8.2 Substituir `ProgressBar` Tremor por `LinearProgress color="primary"` do MUI
- [x] 8.3 Manter lógica de "ver todos" com `Button variant="text" size="small"` MUI

## 9. Primitives — NovosGastos, NotableExpenses, AnomaliasList

- [x] 9.1 Substituir `Badge` Tremor em `NovosGastos` por `Chip label="NOVO" size="small" color="primary"` MUI
- [x] 9.2 Substituir `Text` Tremor em `NotableExpenses` por `Typography` MUI
- [x] 9.3 Substituir `ProgressBar` Tremor em `AnomaliasList` por `LinearProgress color="error"` MUI

## 10. Charts — GruposDonut e PatrimonioDonut

- [x] 10.1 Substituir `DonutChart + Legend` Tremor em `GruposDonut` por `PieChart` do `@mui/x-charts` com `innerRadius: 50`, `valueFormatter` em BRL e `slotProps.legend`
- [x] 10.2 Substituir `DonutChart + Legend` Tremor em `PatrimonioDonut` por `PieChart` do `@mui/x-charts` com mesmas configurações

## 11. Charts — CashflowAreaChart

- [x] 11.1 Substituir `AreaChart` Tremor por `LineChart` do `@mui/x-charts` com `area: true`
- [x] 11.2 Mapear séries "Cashflow Real" (azul) e "Projetado" (violeta) com `connectNulls`
- [x] 11.3 Adicionar `valueFormatter` no eixo Y exibindo BRL abreviado (ex: "R$1,2k")

## 12. Charts — CategoriaBarList

- [x] 12.1 Substituir `BarList` Tremor por `BarChart` do `@mui/x-charts` com `layout="horizontal"`
- [x] 12.2 Configurar `margin={{ left: 100 }}` para acomodar labels de categoria no eixo Y
- [x] 12.3 Adicionar `valueFormatter` em BRL e limitar a 10 categorias

## 13. Charts — InvestimentosBarChart

- [x] 13.1 Substituir `BarChart` Tremor por `BarChart` do `@mui/x-charts` com séries agrupadas (Aplicações + Resgates)
- [x] 13.2 Cores: azul para Aplicações, âmbar para Resgates

## 14. Tabs — verificação e ajustes finos

- [x] 14.1 Verificar que `Resumo.tsx` não usa nenhum import de `@tremor/react`; substituir remanescentes por MUI
- [x] 14.2 Verificar que `Gastos.tsx` não usa nenhum import de `@tremor/react`; substituir remanescentes por MUI
- [x] 14.3 Verificar que `ProximoMes.tsx` não usa nenhum import de `@tremor/react`; substituir remanescentes por MUI
- [x] 14.4 Verificar que `Investimentos.tsx` não usa nenhum import de `@tremor/react`; substituir remanescentes por MUI
- [x] 14.5 Verificar que `Insights.tsx` não usa nenhum import de `@tremor/react`; substituir remanescentes por MUI

## 15. Validação final

- [x] 15.1 Rodar `bun run client:build` e confirmar zero erros de TypeScript
- [x] 15.2 Confirmar com `grep -r "@tremor" client/src/` que não há imports remanescentes
- [x] 15.3 Testar no browser: BottomNavigation exibe 5 itens sem encavalcamento
- [x] 15.4 Testar troca de abas: conteúdo correto exibido por aba
- [x] 15.5 Testar charts: Donut, LineChart área, BarChart horizontal e vertical renderizam com dados reais
