## Context

O client React já tem padrão estabelecido: tab component → `useEffect` com `Promise.all` → estados loading/error → renderização com MUI + Recharts (ou componentes similares). Os componentes `LoadingCard`, `ErrorCard`, `CashflowAreaChart` existentes são referências de implementação.

A aba Previsão é fundamentalmente um dashboard de leitura — sem interações complexas. Segue o padrão de `ProximoMes.tsx` (carrega múltiplas fontes, combina em uma tela).

## Goals / Non-Goals

**Goals:**
- Exibir mensagem AI do dia em card de destaque
- Gráfico de barras/área mostrando real (últimos 3 meses) + previsto (próximos 3 meses) por grupo
- Tabela de categorias com previsto vs. atual
- Empty state claro quando ML ainda não rodou

**Non-Goals:**
- Sem interatividade (filtros, drill-down) — só leitura
- Sem edição de orçamento na aba (isso seria outra feature)
- Sem seletor de mês (dados são sempre "a partir de hoje")

## Decisions

### D1: Gráfico — BarChart grouped por grupo + mês

**Escolha:** `BarChart` do Recharts com grupos de barras lado a lado por mês (real e previsto), diferenciados por cor (sólido = real, tracejado/translúcido = previsto).

**Alternativa:** `AreaChart` com zona sombreada para intervalo de confiança.

**Rationale:** O `CashflowAreaChart` já existe para cashflow; barras são mais intuitivas para comparar grupos lado a lado. Intervalo de confiança pode ser exibido como tooltip.

### D2: Card AI — estilo igual ao Insights (digest)

**Escolha:** Card com ícone `AutoAwesome`, texto da mensagem, e sublabel "Atualizado hoje" ou data.

**Rationale:** Consistência visual com o card de digest já existente em `Insights.tsx`.

### D3: Empty state — quando ML ainda não rodou

**Escolha:** Card com mensagem "Previsões ainda sendo preparadas. Volte amanhã." quando `has_forecast: false`.

**Rationale:** Claro e honesto. Não bloqueia a aba de existir.

### D4: Posição da aba — entre ProximoMes e Investimentos

**Escolha:** Ordem: Resumo | Gastos | Próximo Mês | **Previsão** | Investimentos | Insights

**Rationale:** Fluxo natural: passado (Resumo/Gastos) → presente (Próximo Mês) → futuro (Previsão) → patrimônio (Investimentos).

## Risks / Trade-offs

- **Dados vazios no primeiro deploy** → Empty state trata graciosamente
- **Gráfico com muitas categorias fica poluído** → tabela de categorias é colapsável ou paginada

## Migration Plan

1. Adicionar tipos e funções de API ao client
2. Criar `Previsao.tsx`
3. Registrar nova aba em `App.tsx`
4. Build TypeScript para validar
5. Teste visual no browser

## Open Questions

_(nenhuma)_
