## 1. Utilitários compartilhados

- [x] 1.1 Criar `client/src/utils/format.ts` com função `formatBRL(value: number): string` usando `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`
- [x] 1.2 Adicionar `formatMonth(monthStr: string): string` que converte `"2025-03"` em `"Março 2025"`

## 2. Componentes de suporte

- [x] 2.1 Criar `client/src/components/FlagPills.tsx` com dicionário de tradução de flags e renderização de `Badge` do Tremor por flag
- [x] 2.2 Criar `client/src/components/DigestNarrative.tsx` com lógica de colapso/expansão da `narrative_pt`
- [x] 2.3 Criar `client/src/components/RunwayIndicator.tsx` que calcula cor semântica e exibe `runway_meses` com label "meses de fôlego"

## 3. Implementação da aba Resumo

- [x] 3.1 Substituir placeholder em `client/src/tabs/Resumo.tsx` com implementação completa
- [x] 3.2 Implementar `Promise.all([fetchCashflow(month), fetchDigest(month), fetchRunway()])` no `useEffect` da aba
- [x] 3.3 Implementar estado de loading: renderizar `<LoadingCard />` enquanto qualquer chamada estiver pendente
- [x] 3.4 Implementar estado de erro: renderizar `<ErrorCard />` se qualquer chamada falhar
- [x] 3.5 Renderizar `cashflow_real` com `<Metric>` do Tremor com cor semântica (emerald/red)
- [x] 3.6 Renderizar `<FlagPills flags={digest?.flags} />`
- [x] 3.7 Renderizar `<DigestNarrative narrative={digest?.narrative_pt} />`
- [x] 3.8 Renderizar `total_receitas` e `total_despesas` em `<Card>` com grid de 2 colunas
- [x] 3.9 Renderizar `<RunwayIndicator runway={runway} />`

## 4. Validação visual

- [x] 4.1 Testar aba com mês que tem digest gerado — verificar narrative, flags e métricas
- [x] 4.2 Testar aba com mês sem digest — verificar placeholder "Análise de IA não disponível"
- [x] 4.3 Testar accordion da narrativa: colapso, expansão, botão muda de texto
- [x] 4.4 Testar cores do runway: > 3 meses (verde), 1-3 (amarelo), < 1 (vermelho)
- [x] 4.5 Verificar formatação monetária em diferentes valores (negativos, zero, grandes)
- [x] 4.6 Verificar layout mobile: abrir no DevTools em 390px de largura
