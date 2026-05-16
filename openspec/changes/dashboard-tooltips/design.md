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

### Usar `Tooltip` do MUI

**Decisão**: Usar `<Tooltip title="...">` do `@mui/material` (já disponível no projeto).

**Alternativas consideradas**:
- `title` nativo do HTML → sem estilo e sem controle de posicionamento
- Biblioteca externa (Tippy.js, Floating UI) → dependência desnecessária, MUI já resolve

**Rationale**: Consistência com o restante do design system já adotado.

### Ícone de gatilho: `HelpOutline` (outlined)

**Decisão**: Ícone `<HelpOutline>` do `@mui/icons-material` ao lado do label, tamanho `small` (16px), cor `text.disabled`.

**Alternativas consideradas**:
- Tooltip no próprio texto do label → área de toque pequena e menos óbvio
- Ícone `Info` → visualmente mais "urgente" que o contexto exige
- Ícone `?` em chip → muito saliente para informação secundária

**Rationale**: Padrão familiar, discreto, universalmente reconhecido como "mais info".

### Onde colocar o tooltip em Fôlego

**Decisão**: O tooltip vai no componente `RunwayIndicator`, ao lado de cada label "Fôlego imediato:" e "Fôlego total:". Os textos explicativos são passados via props `tooltipImediato` e `tooltipTotal`.

**Rationale**: `RunwayIndicator` já é um componente independente, faz sentido encapsular o tooltip lá mesmo.

## Risks / Trade-offs

- [Texto muito longo no tooltip] → Manter máximo 2 linhas por tooltip; usar frases objetivas
- [Mobile: tooltips difíceis de ativar] → MUI Tooltip tem suporte a `touch` por padrão (clique longo); aceitável para MVP
- [`@mui/icons-material` não instalado] → Verificar antes de implementar; se necessário, usar ícone inline em SVG como fallback

## Migration Plan

Não há migration. É purely additive — nenhum componente existente tem comportamento alterado. Deploy direto.
