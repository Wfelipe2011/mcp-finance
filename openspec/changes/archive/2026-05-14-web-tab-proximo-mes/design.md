## Context

A aba Próximo Mês combina três fontes: `cube_cashflow_projetado` (série temporal de cashflow real + projetado), `cube_compromissos_ativos` (parcelas abertas) e `kpi_cash_runway` (fôlego). O chart de área é o elemento visual central — mostra o arco histórico e para onde o cashflow está indo.

## Goals / Non-Goals

**Goals:**
- AreaChart com cashflow mensal histórico + projetado em série contínua
- Distinção visual entre dados reais (sólido) e projetados (tracejado ou tom diferente)
- Lista de compromissos com progresso em parcelas (ex: "6/12") e valor mensal
- Total comprometido em parcelas por mês calculado no client
- RunwayIndicator reusado da aba Resumo

**Non-Goals:**
- Edição de parcelas
- Detalhamento de cada parcela (transação original)
- Projeção de renda (apenas despesas projetadas via parcelas)

## Decisions

### D1: AreaChart do Tremor para cashflow projetado

**Decisão**: `<AreaChart data={projetado} categories={["cashflow_real", "cashflow_projetado"]} />` com `connectNulls`.

**Rationale**: Tremor AreaChart suporta múltiplas séries. Dados históricos têm `cashflow_real` preenchido e `cashflow_projetado` null; dados futuros têm o inverso. Cores diferentes distinguem visualmente sem CSS adicional.

Alternativa considerada: ECharts com série tracejada. Descartado — Tremor é suficiente e mantém consistência visual com as outras abas.

### D2: Dados do chart mapeados no client

**Decisão**: A resposta de `/api/cashflow/projetado` já tem `is_projected`. O client mapeia para duas colunas:
```typescript
{ month_name_pt, cashflow_real: isProjected ? null : value, cashflow_projetado: isProjected ? value : null }
```

**Rationale**: Mantém a API simples. O mapeamento é trivial no client e permite futuras variações visuais.

### D3: Lista de compromissos com ProgressBar nativa

**Decisão**: Para cada compromisso, `<ProgressBar value={(parcela_atual/total_parcelas)*100} />` do Tremor com label `"6/12 parcelas"`.

**Rationale**: ProgressBar visual comunica imediatamente quanto falta pagar. Mais efetivo que texto puro.

### D4: Layout

```
┌─────────────────────────────┐
│  Fôlego atual: 2,4 meses 🟡 │  ← RunwayIndicator (reusado)
├─────────────────────────────┤
│  Evolução do cashflow       │
│  [AreaChart 6 meses +       │
│   projeção 3 meses]         │  ← CashflowAreaChart
│   sólido │ tracejado        │
├─────────────────────────────┤
│  Compromissos em aberto     │
│  Total: R$ 2.847/mês        │  ← total calculado no client
│                             │
│  Celular 12x                │
│  [████░░░░░░░] 6/12         │  ← ProgressBar
│  R$ 189/mês                 │
│                             │
│  Notebook 24x               │
│  [██░░░░░░░░] 3/24          │
│  R$ 320/mês                 │
└─────────────────────────────┘
```

## Risks / Trade-offs

- **[Risk] AreaChart com gaps entre histórico e projetado** → Mitigação: `connectNulls` no Tremor une as séries visualmente
- **[Risk] Compromissos com muitas parcelas scrollam demais** → Mitigação: lista tem `max-h` com scroll interno, mostra primeiros 5 com "ver todos" toggle
- **[Risk] Total comprometido pode confundir se parcelas têm datas diferentes** → Mitigação: label explica "por mês (média das parcelas ativas)"

## Open Questions

- Nenhuma.
