## Context

A aba Investimentos combina dois endpoints: `/api/patrimonio` (saldos por conta) e `/api/investimentos?months=6` (evolução mensal). A aba Insights reusa dados já carregados em outras abas — o digest (`/api/digest`) pode ser cacheado localmente em vez de refetchado, e as transações anômalas vêm de `/api/transacoes` filtradas por `anomaly_score > 0.6` no client.

## Goals / Non-Goals

**Goals (Investimentos):**
- Total de patrimônio em destaque
- DonutChart distribuindo patrimônio por tipo de ativo (`tipo` de `cube_patrimonio`)
- BarChart com rendimento/variação mensal dos últimos 6 meses

**Goals (Insights):**
- Narrativa completa da IA (`narrative_pt`) sem colapso — esta aba é para leitura
- Lista de `notable_expenses` do digest como cards
- Lista de transações com `anomaly_score > 0.6` com indicador de intensidade
- Flags exibidas como badges (reusando `FlagPills`)

**Non-Goals:**
- Detalhamento por ticker/ativo individual
- Gráficos candlestick ou técnicos
- Chat com a IA (seria outra mudança futura)
- Filtro de threshold de anomalia

## Decisions

### D1: PatrimonioDonut agrupa por `tipo` (não subtipo)

**Decisão**: DonutChart usa campo `tipo` (ex: BANK, INVESTMENT, CREDIT) não `subtipo` (CHECKING_ACCOUNT, etc.).

**Rationale**: Subtipo tem muitas categorias granulares. `tipo` dá visão de alto nível — "Banco vs Investimento vs Crédito".

### D2: InvestimentosBarChart usa BarChart do Tremor

**Decisão**: `<BarChart data={investimentos} categories={["valor_aplicado", "rendimento"]} />` ou apenas `rendimento` por mês.

**Rationale**: BarChart horizontal por mês é mais legível em mobile que linha para 6 pontos.

### D3: Anomalias filtradas no client

**Decisão**: `/api/transacoes` retorna todas as transações do mês. Client filtra `anomaly_score > 0.6` e exibe até 10 itens.

**Alternativa**: endpoint `/api/transacoes?anomaly_min=0.6`. Descartado por adicionar complexidade ao server sem benefício — a lista já vem paginada e o filtro no client é trivial.

### D4: Insights não refetcha digest — recebe via props de App

**Decisão**: `App.tsx` faz fetch do digest e passa para ambas as abas que precisam dele (Resumo e Insights) via props.

**Rationale**: Evita dupla chamada ao mesmo endpoint para o mesmo mês. Quando mês muda, App refetcha uma vez e distribui.

### D5: Layout da aba Insights

```
┌─────────────────────────────┐
│  📖 Análise de [mês]        │
│  [flags como pills]         │  ← FlagPills reusado
├─────────────────────────────┤
│  [narrative_pt completo]    │  ← texto completo, sem colapso
├─────────────────────────────┤
│  📌 Destaques notáveis      │
│  iFood  R$847  "23 vezes"   │  ← NotableExpenses
│  Uber   R$312  "acima..."   │
├─────────────────────────────┤
│  ⚡ Anomalias detectadas    │
│  Netflix  R$55,90  [████░]  │  ← AnomaliasList
│  anomalia: 0.71             │     barra de intensidade
└─────────────────────────────┘
```

## Risks / Trade-offs

- **[Risk] `/api/transacoes` retorna muitos registros para filtrar no client** → Mitigação: paginação já implementada no server (limit=100 suficiente para detectar anomalias do mês)
- **[Risk] Digest null na aba Insights** → Mitigação: placeholder "Análise de IA não disponível para este mês. Execute `bun run digest --month YYYY-MM` para gerar."
- **[Risk] Patrimônio tipo CREDIT com saldo negativo no donut** → Mitigação: filtrar `tipo != 'CREDIT'` ou tratar valores negativos como zero no donut

## Open Questions

- Nenhuma.
