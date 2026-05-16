## 1. Componentes de suporte

- [x] 1.1 Criar `client/src/components/CashflowAreaChart.tsx` que recebe array de `cube_cashflow_projetado`, mapeia para duas séries (`cashflow_real` e `cashflow_projetado` com nulls), renderiza `AreaChart` do Tremor com `connectNulls`
- [x] 1.2 Criar `client/src/components/CompromissosLista.tsx` com lista de compromissos, `ProgressBar` por item, total calculado no topo, colapso após 5 itens

## 2. Implementação da aba Próximo Mês

- [x] 2.1 Substituir placeholder em `client/src/tabs/ProximoMes.tsx` com implementação completa
- [x] 2.2 Implementar `Promise.all([fetchCashflowProjetado(), fetchCompromissos(), fetchRunway()])` no `useEffect`
- [x] 2.3 Renderizar `<RunwayIndicator runway={runway} />` no topo (componente reusado de `web-tab-resumo`)
- [x] 2.4 Mapear dados de `cashflow_projetado` para duas séries: `cashflow_real` (histórico) e `cashflow_projetado` (futuro), com null onde não aplicável
- [x] 2.5 Renderizar `<CashflowAreaChart data={mappedData} />` com título "Evolução do cashflow"
- [x] 2.6 Calcular `totalComprometido` como soma dos valores mensais de `compromissos`
- [x] 2.7 Renderizar `<CompromissosLista compromissos={compromissos} total={totalComprometido} />`
- [x] 2.8 Renderizar `<LoadingCard />` durante fetch e `<ErrorCard />` em caso de erro

## 3. Validação visual

- [x] 3.1 Testar AreaChart com dados reais — verificar que histórico e projetado têm cores distintas
- [x] 3.2 Testar ProgressBar com compromissos variados (1/3, 6/12, 20/24)
- [x] 3.3 Testar colapso da lista com mais de 5 compromissos
- [x] 3.4 Testar mensagem "Sem parcelas em aberto" quando lista vazia
- [x] 3.5 Verificar total comprometido somado corretamente
- [x] 3.6 Verificar layout mobile: AreaChart redimensiona sem overflow horizontal
