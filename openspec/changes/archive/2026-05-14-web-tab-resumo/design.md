## Context

A aba Resumo é a tela inicial do dashboard. Ela combina dados numéricos de `cube_cashflow_mensal` com insights da IA de `ai_monthly_digest` e o indicador de fôlego de `kpi_cash_runway`. O tom deve ser Pierre Finance: resultado em destaque, alertas claros, narrativa da IA como um assistente que fala com o usuário.

## Goals / Non-Goals

**Goals:**
- Exibir `cashflow_real` como número grande com cor semântica (verde positivo, vermelho negativo)
- Exibir `flags` da IA como badges/pills coloridas
- Exibir `narrative_pt` colapsável (primeiro parágrafo visível, "ver mais" para expandir)
- Exibir `total_receitas`, `total_despesas` como lista de métricas secundárias
- Exibir `runway_meses` com cor semântica (verde > 3, amarelo 1-3, vermelho < 1)
- Exibir estado de loading enquanto as 3 chamadas carregam
- Exibir estado de erro se alguma chamada falhar

**Non-Goals:**
- Gráficos de linha/barra (essa aba é sobre números e texto, não charts)
- Histórico de meses anteriores (apenas o mês selecionado)
- Edição ou ações do usuário

## Decisions

### D1: Três chamadas de API paralelas com Promise.all

**Decisão**: `Resumo.tsx` faz `Promise.all([fetchCashflow(month), fetchDigest(month), fetchRunway()])` em um único `useEffect`.

**Rationale**: As três chamadas são independentes. Promise.all minimiza latência total. Um único estado de loading cobre tudo.

### D2: Narrativa colapsável com estado local

**Decisão**: `DigestNarrative` tem `useState(false)` para collapsed/expanded. Exibe primeiros 200 caracteres com "ver mais ↓" quando colapsado.

**Rationale**: Narrativas podem ser longas (3-5 parágrafos). Mostrar tudo na abertura domina o scroll. Pierre usa abordagem similar.

### D3: Cores semânticas via Tremor color system

**Decisão**: `cashflow_real > 0` → `color="emerald"`, `cashflow_real < 0` → `color="red"`. Runway: > 3 meses → `emerald`, 1-3 → `amber`, < 1 → `red`.

**Rationale**: Tremor tem sistema de cores integrado com Tailwind. Consistência visual sem CSS manual.

### D4: FlagPills mapeia flags para labels em português

**Decisão**: Dicionário fixo em `FlagPills.tsx`: `{ gastos_atipicos: "Gastos atípicos", emprestimo_detectado: "Empréstimo detectado", ... }`.

**Rationale**: As flags do banco são snake_case em inglês técnico. O usuário deve ver texto legível.

### D5: Layout com seções empilhadas verticalmente

```
┌─────────────────────────────┐
│  [cashflow_real — grande]   │  ← Tremor <Metric>
│  [pills de flags]           │  ← FlagPills
├─────────────────────────────┤
│  [DigestNarrative]          │  ← Callout colapsável
├─────────────────────────────┤
│  Receitas   R$ 16.908       │  ← Card com grid 2 colunas
│  Despesas   R$ 19.652       │
├─────────────────────────────┤
│  Fôlego: 2,4 meses  🟡      │  ← RunwayIndicator
└─────────────────────────────┘
```

## Risks / Trade-offs

- **[Risk] Digest null quando não gerado** → Mitigação: `DigestNarrative` e `FlagPills` tratam prop `null` exibindo estado vazio gracioso ("Análise não disponível para este mês")
- **[Risk] Formatação monetária** → Mitigação: helper `formatBRL(value: number)` em `client/src/utils/format.ts` usando `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`

## Open Questions

- Nenhuma.
