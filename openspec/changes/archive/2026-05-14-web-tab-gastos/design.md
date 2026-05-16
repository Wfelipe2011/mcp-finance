## Context

A aba Gastos consome um único endpoint `GET /api/gastos?month=YYYY-MM` que retorna três listas: `grupos`, `categorias` e `novos`. O design usa dois charts do Tremor (DonutChart e BarList) e uma lista simples para novos gastos.

## Goals / Non-Goals

**Goals:**
- DonutChart com distribuição percentual por grupo de gastos
- BarList com top categorias ordenadas por valor
- Lista de novos gastos do mês com badge "NOVO"
- Total gasto no mês no topo da aba
- Uma única chamada de API (todos os dados em `GET /api/gastos`)

**Non-Goals:**
- Comparação com mês anterior (só o mês atual)
- Drill-down para transações individuais (isso é a aba de Insights)
- Filtro por grupo/categoria

## Decisions

### D1: DonutChart do Tremor para grupos

**Decisão**: `<DonutChart data={grupos} category="total_gasto" index="grupo_nome" />` do Tremor.

**Rationale**: Tremor já tem DonutChart pronto, responsivo, com legenda integrada. Não precisa de ECharts aqui — a simplicidade é o objetivo.

### D2: BarList para categorias (não BarChart)

**Decisão**: `<BarList data={categorias} />` do Tremor em vez de BarChart horizontal.

**Rationale**: BarList é o padrão Pierre Finance para listas rankeadas. Mais legível que barras em mobile — mostra nome, barra proporcional e valor em uma linha.

### D3: Novos gastos em seção separada com badge

**Decisão**: Seção "Novos este mês" com lista de `cube_gastos_novos`, badge "NOVO" ao lado de cada item.

**Rationale**: Gastos novos são surpresas — merecem destaque visual. O usuário quer saber "o que apareceu que não estava no mês passado?".

### D4: Layout em seções empilhadas

```
┌─────────────────────────────┐
│  Total: R$ 19.652           │  ← Metric
├─────────────────────────────┤
│  Por onde foi               │
│  [DonutChart com legenda]   │  ← GruposDonut
├─────────────────────────────┤
│  Por categoria              │
│  iFood        R$ 847  ████  │
│  Aluguel      R$ 2.100 ████ │  ← CategoriaBarList
│  Uber         R$ 312  ██    │
├─────────────────────────────┤
│  🆕 Novos este mês          │
│  Netflix   R$ 55,90  NOVO   │  ← NovosGastos
│  Duolingo  R$ 29,90  NOVO   │
└─────────────────────────────┘
```

## Risks / Trade-offs

- **[Risk] DonutChart com muitos grupos fica ilegível** → Mitigação: limitar a top 6 grupos, agrupar o resto em "Outros"
- **[Risk] BarList sem formatação monetária** → Mitigação: `valueFormatter={(v) => formatBRL(v)}` no BarList

## Open Questions

- Nenhuma.
