## Context

O card de Resumo em `client/src/tabs/Resumo.tsx` exibe cinco métricas calculadas com lógica não trivial:

- **Resultado do Mês**: `receitas_reais − despesas_reais` (exclui transferências e aportes)
- **Receitas**: soma de transações `INCOME` com `is_real_cashflow = true`
- **Despesas**: soma de transações `EXPENSE` com `is_real_cashflow = true`
- **Fôlego Imediato**: `saldo_em_conta ÷ média_despesas_90d` (em dias)
- **Fôlego Total**: `(saldo_em_conta + saldo_investimentos) ÷ média_despesas_90d` (em dias)

Usuários confundem esses números com saldo bancário, total de movimentações ou outros valores que veriam no app do banco. A ausência de contexto é a causa da confusão.

## Goals / Non-Goals

**Goals:**
- Adicionar tooltip com texto explicativo em cada label das 5 métricas
- Usar linguagem natural, não técnica (sem "is_real_cashflow", sem "INCOME/EXPENSE")
- Componente simples e reutilizável dentro do escopo do card
- Zero mudanças em API, banco ou lógica de negócio

**Non-Goals:**
- Redesign do card de Resumo
- Glossário ou página de ajuda separada
- Internacionalização (apenas pt-BR)
- Tooltips em outras tabs (Gastos, Patrimônio, etc.) — escopo futuro

## Decisions

### Tooltip CSS-only com click toggle

**Decisão**: Componente `MetricTooltip` com `useState(open)` + posicionamento absoluto usando CSS vars do design system (`--color-surface-elevated`, `--color-text-body`, `--color-border-hairline`, etc.).

**Alternativas consideradas**:
- `<Tooltip>` do `@tremor/react` (interno) → usa `dark:bg-white` keyed em `prefers-color-scheme`, não em `.light`/`:root` do projeto — quebrado no tema escuro
- `title` nativo do HTML → sem estilo e sem controle de posicionamento
- Biblioteca externa (Tippy.js, Floating UI) → dependência desnecessária

**Rationale**: CSS vars do design system auto-adaptam dark/light corretamente. `useState` para open/close funciona em mobile (click) e desktop (click). Fechar ao clicar fora via `useEffect` + `mousedown` no `document`.

### Ícone de gatilho: `HelpOutlineRounded` (shim)

**Decisão**: Criar `HelpOutlineRounded.tsx` em `client/src/shims/mui/icons/`, seguindo o padrão de `_base.tsx` (SVG inline, props `{ fontSize?, style? }`). Tamanho `small` (16px), cor `var(--color-muted)`.

**Alternativas consideradas**:
- Tooltip no próprio texto do label → área de toque pequena e menos óbvio
- Ícone `Info` → visualmente mais "urgente" que o contexto exige
- SVG inline direto no `MetricTooltip` sem criar arquivo no shim → quebra o padrão estabelecido

**Rationale**: Consistência com o padrão de ícones do projeto. Ícone familiar e discreto, universalmente reconhecido como "mais info".

### Onde colocar o tooltip em Fôlego

**Decisão**: O tooltip vai no componente `RunwayIndicator`, ao lado de cada label "Fôlego imediato:" e "Fôlego total:". Os textos explicativos são passados via props `tooltipImediato` e `tooltipTotal`.

**Rationale**: `RunwayIndicator` já é um componente independente, faz sentido encapsular o tooltip lá mesmo.

## Risks / Trade-offs

- [Texto muito longo no tooltip] → Manter máximo 2 linhas por tooltip; usar frases objetivas
- [Mobile: tooltips difíceis de ativar] → `onClick` funciona em touch nativo; `onMouseEnter`/`onMouseLeave` não é usado — OK para MVP
- [Fechar ao clicar fora] → `useEffect` com `mousedown` no `document` lida com isso; cleanup correto no return do effect

## Migration Plan

Não há migration. É purely additive — nenhum componente existente tem comportamento alterado. Deploy direto.
