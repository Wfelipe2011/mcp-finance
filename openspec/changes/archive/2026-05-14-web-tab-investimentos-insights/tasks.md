## 1. Aba Investimentos — componentes

- [x] 1.1 Criar `client/src/components/PatrimonioDonut.tsx` com `DonutChart` do Tremor agrupando por `tipo`, excluindo contas CREDIT, com `valueFormatter` em BRL
- [x] 1.2 Criar `client/src/components/InvestimentosBarChart.tsx` com `BarChart` do Tremor exibindo rendimento/variação por mês, ordenado cronologicamente

## 2. Aba Investimentos — implementação

- [x] 2.1 Substituir placeholder em `client/src/tabs/Investimentos.tsx`
- [x] 2.2 Implementar `Promise.all([fetchPatrimonio(), fetchInvestimentos(6)])` no `useEffect`
- [x] 2.3 Renderizar `<Metric>` com `total_patrimonio` formatado em BRL
- [x] 2.4 Renderizar `<PatrimonioDonut contas={data.contas} />` com agrupamento por tipo
- [x] 2.5 Renderizar `<InvestimentosBarChart data={investimentos} />` com últimos 6 meses
- [x] 2.6 Renderizar `<LoadingCard />` durante fetch e `<ErrorCard />` em caso de erro

## 3. Refatorar App.tsx para compartilhar digest

- [x] 3.1 Mover fetch do digest para `App.tsx`: `fetchDigest(selectedMonth)` no useEffect que observa `selectedMonth`
- [x] 3.2 Passar `digest` como prop para `<Resumo digest={digest} />` e `<Insights digest={digest} />`
- [x] 3.3 Atualizar `Resumo.tsx` para receber `digest` como prop em vez de fetchá-lo internamente

## 4. Aba Insights — componentes

- [x] 4.1 Criar `client/src/components/NotableExpenses.tsx` com lista de `notable_expenses` do digest, cada item mostrando `description`, `amount` em BRL e `reason`
- [x] 4.2 Criar `client/src/components/AnomaliasList.tsx` com lista de transações filtradas por `anomaly_score > 0.6`, barra de intensidade proporcional ao score

## 5. Aba Insights — implementação

- [x] 5.1 Substituir placeholder em `client/src/tabs/Insights.tsx`
- [x] 5.2 Receber `digest` e `selectedMonth` como props de `App.tsx`
- [x] 5.3 Implementar `fetchTransacoes(month, 100)` no `useEffect` da aba para buscar transações do mês
- [x] 5.4 Filtrar transações com `anomaly_score > 0.6` no client
- [x] 5.5 Renderizar `<FlagPills flags={digest?.flags} />` (componente reusado)
- [x] 5.6 Renderizar `narrative_pt` completo em `<Callout>` ou `<Card>` do Tremor
- [x] 5.7 Renderizar `<NotableExpenses expenses={digest?.notable_expenses} />`
- [x] 5.8 Renderizar `<AnomaliasList transacoes={anomalias} />` com mensagem positiva quando vazia
- [x] 5.9 Renderizar placeholder quando `digest` é null

## 6. Validação visual

- [x] 6.1 Testar aba Investimentos com patrimônio real — DonutChart proporcional
- [x] 6.2 Testar BarChart de evolução com 6 meses ordenados
- [x] 6.3 Testar aba Insights com digest gerado — narrativa, flags, notable expenses
- [x] 6.4 Testar AnomaliasList com transações com anomaly_score alto
- [x] 6.5 Testar mensagem de digest null na aba Insights
- [x] 6.6 Confirmar que trocar de mês no MonthPicker atualiza todas as abas incluindo Insights
