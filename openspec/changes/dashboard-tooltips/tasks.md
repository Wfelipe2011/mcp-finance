## 1. Componente auxiliar de tooltip

- [ ] 1.1 Criar componente `MetricTooltip` em `client/src/components/MetricTooltip.tsx` — recebe `title: string` e renderiza ícone `HelpOutline` (16px, cor `text.disabled`) envolvido em `<Tooltip title={title}>`

## 2. Tooltips no card Resumo

- [ ] 2.1 Em `Resumo.tsx`, importar `MetricTooltip` e adicionar ao lado do label "Resultado do Mês" com texto: "Receitas reais menos despesas reais do mês. Exclui transferências entre contas e aportes em investimentos."
- [ ] 2.2 Em `Resumo.tsx`, adicionar `MetricTooltip` ao lado do label "Receitas" com texto: "Total de entradas de dinheiro no mês (salários, rendimentos, etc.). Transferências entre suas contas não são contadas."
- [ ] 2.3 Em `Resumo.tsx`, adicionar `MetricTooltip` ao lado do label "Despesas" com texto: "Total de saídas de dinheiro no mês (compras, contas, etc.). Transferências entre suas contas e aportes em investimentos não são contados."

## 3. Tooltips no RunwayIndicator

- [ ] 3.1 Em `RunwayIndicator.tsx`, adicionar `MetricTooltip` ao lado de "Fôlego imediato:" com texto: "Por quantos dias seu saldo em conta corrente/poupança sustenta seus gastos médios dos últimos 3 meses."
- [ ] 3.2 Em `RunwayIndicator.tsx`, adicionar `MetricTooltip` ao lado de "Fôlego total:" com texto: "Por quantos dias seu saldo em conta corrente/poupança mais seus investimentos sustentam seus gastos médios dos últimos 3 meses."

## 4. Validação

- [ ] 4.1 Rodar `cd client && bun run build` e confirmar zero erros de TypeScript
- [ ] 4.2 Verificar visualmente no browser que os 5 tooltips aparecem corretamente e não quebram o layout
