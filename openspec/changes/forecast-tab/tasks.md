## 1. API Client — Tipos e funções

- [x] 1.1 Adicionar tipos em `client/src/api/types.ts`: `ForecastMonth` (year, month, type, group_pt, category_pt?, amount, lower_bound?, upper_bound?), `ForecastGroupsResponse` (has_forecast, months), `ForecastCategoriesResponse` (has_forecast, months), `ForecastMessage` (has_message, message_pt, message_date)
- [x] 1.2 Adicionar `fetchForecastGroups()` em `client/src/api/client.ts` → `GET /api/forecast/groups`
- [x] 1.3 Adicionar `fetchForecastCategories()` em `client/src/api/client.ts` → `GET /api/forecast/categories`
- [x] 1.4 Adicionar `fetchForecastMessage()` em `client/src/api/client.ts` → `GET /api/forecast/message`

## 2. Componente Previsao.tsx

- [x] 2.1 Criar `client/src/tabs/Previsao.tsx` com `useEffect` que chama `Promise.all([fetchForecastMessage(), fetchForecastGroups(), fetchForecastCategories()])`
- [x] 2.2 Implementar seção 1: Card de mensagem AI com `Typography` MUI, ícone `TrendingUpRounded`, texto da mensagem ou fallback "ainda sendo preparada"
- [x] 2.3 Implementar seção 2: Gráfico de grupos com Recharts `BarChart` — barras sólidas para real (últimos 3 meses), barras translúcidas para forecast (próximos 3 meses), tooltip com lower/upper bounds
- [x] 2.4 Implementar seção 3: Tabela de categorias com MUI `Table` mostrando category_pt, group_pt, real mês atual, previsto próximo mês — ordenado por grupo e valor
- [x] 2.5 Implementar loading state com `<LoadingCard title="Carregando Previsão..." />`
- [x] 2.6 Implementar error state com `<ErrorCard message={error} />`
- [x] 2.7 Implementar empty state para quando `has_forecast: false` (label abaixo do gráfico)

## 3. App.tsx — Registro da nova aba

- [x] 3.1 Importar `Previsao` de `./tabs/Previsao.tsx` no `App.tsx`
- [x] 3.2 Importar ícone `TrendingUpRounded` do MUI Icons
- [x] 3.3 Adicionar `BottomNavigationAction` com label "Previsão" e ícone entre "Próximo Mês" e "Investimentos"
- [x] 3.4 Adicionar `case` para renderizar `<Previsao />` no switch de tabs

## 4. Validação

- [x] 4.1 `cd client && bun run build` sem erros TypeScript
- [ ] 4.2 Abrir aba Previsão no browser — loading state aparece
- [ ] 4.3 Com dados no Postgres: card AI exibe mensagem, gráfico exibe barras real+previsto, tabela exibe categorias
- [ ] 4.4 Sem dados (primeiro deploy): empty state exibe "Previsões ainda sendo preparadas"
- [ ] 4.5 Simular erro de API: error state exibe mensagem
