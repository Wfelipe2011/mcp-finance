## Context

A fundação do design system está estabelecida:

- **Tokens CSS** em `client/src/index.css` — todas as variáveis de cor, espaçamento, raio e tipografia
- **Ponte MUI** em `client/src/App.tsx` — `createTheme()` consome os tokens CSS
- **Shell reestilizado** — `BottomNavigation`, `LoadingCard`, `ErrorCard`, `MonthPicker`, `LoginScreen`, `ConfigDialog` usando tokens
- **Gráficos tokenizados** — `CashflowAreaChart`, `GruposDonut`, `PatrimonioDonut`, `InvestimentosBarChart` sem cores hardcoded
- **Helper semântico** em `client/src/utils/semanticTone.ts` — `amountToTone()` e `runwayDaysToTone()`

O que resta é a camada de apresentação: as 6 abas e seus ~12 componentes exclusivos ainda usam estilos não-tokenizados.

## Goals / Non-Goals

**Goals:**
- Aplicar hierarquia visual, semântica de cor e tokens de superfície em todas as 6 abas
- Usar `SemanticTone` e as variáveis CSS como única fonte de verdade para cor
- Garantir que gráficos já tokenizados (task_04) integrem corretamente nas abas
- Manter build TypeScript limpo (`bun run build` sem erros)

**Non-Goals:**
- Alterar qualquer contrato de API, hook de dados ou lógica de cálculo
- Criar novos endpoints, novas abas ou novos fluxos funcionais
- Adicionar animações, micro-interações ou novos comportamentos
- Implementar gate de regressão visual automatizado (escopo futuro — task_09)

## Decisions

### Ordem de implementação: Resumo primeiro

**Decisão**: Implementar na ordem Resumo → Gastos → (Próx.Mês + Previsão + Investimentos) → Insights.

**Rationale**: Resumo é o dashboard principal e o maior validador de hierarquia. Gastos tem complexidade moderada e muitos componentes reutilizáveis. As abas de previsão/investimentos têm pouco componente exclusivo (os gráficos já estão prontos). Insights é a mais simples e fecha o ciclo.

### SemanticTone como padrão para cor financeira

**Decisão**: Todo valor numérico que precise de cor semântica (positivo/negativo) DEVE usar `amountToTone()` ou `runwayDaysToTone()` do helper da task_04. Não usar cores hardcoded nem condicionais inline.

**Rationale**: Consistência entre abas, facilidade de manutenção e rastreabilidade do sistema de design.

### Superfícies: `--color-surface-card-dark` como padrão de card

**Decisão**: Cards de conteúdo usam `var(--color-surface-card-dark)` em modo escuro e `var(--color-surface-soft-light)` em modo claro. Cards elevados/modais usam `--color-surface-elevated-dark`.

**Rationale**: Segue a hierarquia de superfícies definida em DESIGN.md sem introduzir novos valores.

### Tipografia: number-display para KPIs primários

**Decisão**: O KPI principal de cada aba (resultado mensal, total gasto, cashflow projetado, patrimônio total) usa a escala `number-display` (40px, 700). KPIs secundários usam `number-md`.

**Rationale**: Hierarquia de leitura financeira — o número mais importante de cada contexto deve ser lido primeiro, sem esforço.

### Componentes de aba: reestilização sem extração de novos componentes

**Decisão**: Reestilizar componentes existentes sem extrair novos componentes compartilhados, a menos que o mesmo padrão apareça em 3+ abas.

**Rationale**: Minimizar risco de refatoração estrutural durante migração visual. O escopo é CSS/classes, não arquitetura de componentes.

## Risks / Trade-offs

- [Inconsistência entre abas] → Usar checklist único de tokens por seção (KPI, card, título de seção, borda) em todas as abas
- [Cores hardcoded remanescentes] → Validar via `grep` antes de fechar cada task
- [Build quebrado por prop de estilo incorreta] → `bun run build` obrigatório ao fim de cada subtask
- [GruposDonut com muitas categorias] → A paleta de tokens de accent pode ter menos cores que categorias; solução: derivar por índice módulo o tamanho da paleta

## Migration Plan

Não há migration de dados. As mudanças são puramente visuais e aditivas. Deploy direto após cada aba validada no build.
