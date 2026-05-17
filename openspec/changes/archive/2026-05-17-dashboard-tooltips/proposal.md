## Why

Os números do dashboard (Resultado do Mês, Receitas, Despesas, Fôlego Imediato e Fôlego Total) são calculados com critérios não óbvios — excluem transferências, incluem apenas `is_real_cashflow = true`, e o Fôlego usa média dos últimos 3 meses. Sem contexto, o usuário não entende de onde vêm os números nem o que eles representam, gerando confusão mesmo quando os dados estão corretos.

## What Changes

- Adicionar tooltip explicativo em cada número-chave do card de Resumo
- Os tooltips revelam a fórmula/lógica por trás de cada métrica em linguagem natural
- Nenhuma lógica de dados é alterada — apenas UI informativa

## Capabilities

### New Capabilities

- `resumo-tooltips`: Tooltips informativos nos campos do card Resumo — Resultado do Mês, Receitas, Despesas, Fôlego Imediato e Fôlego Total — explicando a fórmula e o que está incluído/excluído.

### Modified Capabilities

<!-- Nenhuma spec existente tem requisitos de comportamento alterados. -->

## Impact

- `client/src/tabs/Resumo.tsx` — adiciona ícone "?" com tooltip em cada label
- `client/src/components/RunwayIndicator.tsx` — adiciona tooltip ao lado do indicador de fôlego
- `client/src/shims/mui/icons/HelpOutlineRounded.tsx` — novo ícone no shim, seguindo o padrão `_base.tsx`
- Nenhuma mudança em API, banco, ou lógica de negócio
- Nenhuma dependência nova — tooltip implementado com CSS vars do design system e `useState`
