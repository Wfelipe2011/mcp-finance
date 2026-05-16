## 1. Componentes de suporte

- [x] 1.1 Criar `client/src/components/GruposDonut.tsx` com `DonutChart` do Tremor, limitando a top 5 + "Outros", com `valueFormatter` em BRL
- [x] 1.2 Criar `client/src/components/CategoriaBarList.tsx` com `BarList` do Tremor e `valueFormatter={(v) => formatBRL(v)}`
- [x] 1.3 Criar `client/src/components/NovosGastos.tsx` com lista de itens e badge "NOVO" do Tremor ao lado de cada item

## 2. Implementação da aba Gastos

- [x] 2.1 Substituir placeholder em `client/src/tabs/Gastos.tsx` com implementação completa
- [x] 2.2 Implementar `fetchGastos(month)` no `useEffect` — única chamada de API
- [x] 2.3 Calcular `totalGasto` como soma dos `total_gasto` de todos os grupos para o `<Metric>` no topo
- [x] 2.4 Renderizar `<Metric>` com total gasto formatado em BRL
- [x] 2.5 Renderizar `<GruposDonut grupos={data.grupos} />` com agrupamento de "Outros" se > 6 grupos
- [x] 2.6 Renderizar `<CategoriaBarList categorias={data.categorias} />` com top 10 categorias
- [x] 2.7 Renderizar `<NovosGastos novos={data.novos} />` condicionalmente (só se `novos.length > 0`)
- [x] 2.8 Renderizar `<LoadingCard />` durante fetch e `<ErrorCard />` em caso de erro

## 3. Validação visual

- [x] 3.1 Testar aba com mês real — verificar DonutChart proporcional e legenda
- [x] 3.2 Testar BarList com formatação monetária correta
- [x] 3.3 Testar que "Outros" aparece quando há mais de 5 grupos
- [x] 3.4 Testar seção de novos gastos com badge visível
- [x] 3.5 Verificar layout mobile: DonutChart redimensiona corretamente em tela estreita
