## Context

O cliente React atual em `client/` usa `@tremor/react@3.18.7` como único design system — navegação (TabGroup/TabList), charts (DonutChart, AreaChart, BarChart, BarList) e UI primitives (Card, Metric, Text, Badge, ProgressBar). O problema imediato é que o TabList horizontal não comporta 5 abas com labels longas em viewport mobile, resultando em encavalcamento visual.

A migração elimina `@tremor/react` completamente e adota `@mui/material` + `@mui/x-charts` como stack de UI, mantendo Tailwind CSS apenas para layout.

Componentes afetados: 15 em `client/src/components/`, 5 em `client/src/tabs/`, `App.tsx`.

## Goals / Non-Goals

**Goals:**
- Resolver encavalcamento de tabs com `BottomNavigation` MUI fixo na base da tela
- Substituir todos os charts por `@mui/x-charts` (PieChart, LineChart, BarChart)
- Substituir primitives Tremor por equivalentes `@mui/material`
- Manter Tailwind só para layout utilitário (`max-w-md`, `grid`, `gap`, `px-`, `pb-safe`)
- Build bem-sucedido e zero imports de `@tremor/react` no resultado final

**Non-Goals:**
- Criar tema MUI customizado (usar padrão do Material Design)
- Adicionar novas features de dashboard além da migração
- Usar MUI Pro/Premium (todos os charts usados estão na tier Community/Free)
- Migrar o servidor Bun ou a API

## Decisions

### D1: BottomNavigation ao invés de tabs horizontais

**Decisão**: `<BottomNavigation>` MUI com `position: fixed; bottom: 0; left: 0; right: 0` + padding-bottom no container principal para não sobrepor conteúdo.

```
┌─────────────────────────┐
│  header + month picker  │
│                         │
│  conteúdo da aba ativa  │
│  (scroll livre)         │
│                         │
├─────────────────────────┤
│ 🏠  📊  📅  📈  💡    │  ← fixed bottom
└─────────────────────────┘
```

**Rationale**: Mobile first — BottomNavigation é o padrão Material Design para 3-5 destinos de nível superior. Resolve o encavalcamento sem truncamento de labels. Polegar alcança facilmente.

**Alternativa descartada**: tabs com `overflow-x: scroll`. Funciona, mas scrollbar horizontal em nav é antipadrão em mobile e labels ainda ficam cortadas invisíveis.

### D2: Manter Tailwind para layout, MUI para componentes

**Decisão**: Tailwind continua em `client/tailwind.config.ts` e `index.css` com as 3 diretivas. MUI fornece `sx` prop e `styled()` para estilos de componentes. Não misturar `className` Tailwind dentro de componentes MUI exceto para layout wrapper (`div`, `main`).

**Rationale**: Tailwind é excelente para layout utilitário (`max-w-md mx-auto`, `grid grid-cols-2`, `space-y-3`). Forçar tudo no `sx` do MUI seria verboso. Misturar é aceitável quando o escopo é claro: Tailwind para estrutura, MUI para aparência de componentes.

**Alternativa descartada**: remover Tailwind e usar só `sx`. Custo alto de reescrever todos os wrappers de layout sem benefício visível.

### D3: `@mui/x-charts` Community (free tier)

**Decisão**: Usar apenas `@mui/x-charts` da tier Community (MIT). Charts necessários:
- `PieChart` com `innerRadius` → donut (GruposDonut, PatrimonioDonut)
- `LineChart` com `area: true` → área (CashflowAreaChart)  
- `BarChart` vertical → barras agrupadas (InvestimentosBarChart)
- `BarChart` horizontal → substituir BarList de categorias (CategoriaBarList)

**Rationale**: Zoom/Pan (Pro) e Export (Pro) não são necessários para este dashboard. Community é MIT e cobre todos os tipos de chart em uso.

**Alternativa descartada**: `recharts` ou `victory`. MUI X Charts integra nativamente com o tema MUI, tooltips styled automaticamente, e o design system é coerente com os demais componentes.

### D4: Substituição de primitives Tremor → MUI Material

| Tremor | MUI equivalente |
|---|---|
| `Card` | `Paper elevation={1}` ou `Card` MUI |
| `Metric` | `Typography variant="h4"` |
| `Text` | `Typography variant="body2"` |
| `Badge` | `Chip size="small"` |
| `ProgressBar` | `LinearProgress` |
| `TabGroup/TabList` | removido — ver D1 |

### D5: `CategoriaBarList` como BarChart horizontal

**Decisão**: Substituir o Tremor `BarList` (componente lista+barra) por `BarChart` horizontal do MUI X com `layout="horizontal"`.

**Rationale**: `BarChart` horizontal do MUI X é semanticamente mais correto para comparação de valores entre categorias e tem tooltip nativo.

**Alternativa considerada**: lista customizada com `LinearProgress`. Mais fiel ao visual atual, mas introduz componente sem suporte de acessibilidade. `BarChart` tem ARIA nativo.

### D6: Emotion como peer dependency

**Decisão**: Instalar `@emotion/react` e `@emotion/styled` explicitamente em `client/package.json`.

**Rationale**: `@mui/material` requer Emotion como peer dep. Sem instalação explícita, warnings de peer no `bun install` e possível runtime error.

## Risks / Trade-offs

- **[Risk] Bundle maior com MUI**: `@mui/material` + `@mui/x-charts` podem aumentar bundle. → Mitigação: tree-shaking por default com Vite. MUI usa named exports para todos os componentes.
- **[Risk] Conflito CSS entre Tailwind e MUI**: especificidade de classes pode causar surpresas. → Mitigação: usar Tailwind só em wrappers `div`/`main`, nunca em componentes MUI diretamente.
- **[Risk] `BarChart` horizontal do MUI X pode não renderizar bem em `max-w-md`**: eixos com labels longas de categoria ficam cortadas. → Mitigação: usar `margin={{ left: 90 }}` e truncar labels com `tickLabelStyle`.
- **[Risk] `bun.lock` desatualizado após remoção de Tremor**: `bun install` gera novo lockfile. → Sem mitigação necessária — é o comportamento esperado.

## Migration Plan

1. Atualizar `client/package.json`: remover `@tremor/react`, adicionar deps MUI
2. Atualizar `client/tailwind.config.ts`: remover entry do tremor em `content`
3. Refatorar `App.tsx`: BottomNavigation + state de aba ativa (sem TabGroup)
4. Refatorar primitives: LoadingCard, ErrorCard, FlagPills, DigestNarrative, RunwayIndicator, NovosGastos, NotableExpenses, AnomaliasList, CompromissosLista, MonthPicker
5. Refatorar charts: GruposDonut, PatrimonioDonut, CashflowAreaChart, CategoriaBarList, InvestimentosBarChart
6. Refatorar tabs: Resumo, Gastos, ProximoMes, Investimentos, Insights
7. `bun install` + `bun run client:build` — zero erros
8. Verificar visualmente no browser que não há imports Tremor remanescentes

**Rollback**: `git checkout` do `client/` inteiro — sem efeito no servidor Bun.

## Open Questions

- Nenhuma — decisões tomadas na sessão de explore anterior.
