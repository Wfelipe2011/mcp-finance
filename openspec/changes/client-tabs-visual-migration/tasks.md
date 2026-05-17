## 1. Aba Resumo — hierarquia visual e semântica financeira

- [x] 1.1 Reestilizar `Resumo.tsx`: KPI principal (resultado mensal) com tipografia `number-display` e cor semântica via `amountToTone()`; KPIs secundários (patrimônio, runway) com `number-md`; layout de cards com `surface-card-dark`
- [x] 1.2 Reestilizar `RunwayIndicator.tsx` com cor semântica baseada em `runwayDaysToTone()` e tipografia tokenizada
- [x] 1.3 Reestilizar `FlagPills.tsx` com tokens de borda, `border-radius: var(--radius-pill)` e cores de status semântico
- [x] 1.4 Reestilizar `AnomaliasList.tsx` com cards de superfície tokenizados e destaque de anomalia
- [x] 1.5 Reestilizar `DigestNarrative.tsx` com tipografia `body-md` tokenizada e espaçamento consistente
- [x] 1.6 Reestilizar `CompromissosLista.tsx` e `NotableExpenses.tsx` com tokens de superfície, borda e tipografia
- [x] 1.7 Verificar `bun run build` sem erros e confirmar ausência de cores hex hardcoded nos arquivos modificados

## 2. Aba Gastos — KPI, categorias e tendências

- [x] 2.1 Reestilizar `Gastos.tsx`: KPI de total gasto em `number-display` com tom semântico negativo; hierarquia de títulos de seção com tokens de tipografia
- [x] 2.2 Reestilizar `CategoriaBarList.tsx` com tokens de borda, `body-sm` para labels e barra de progresso usando cor de token
- [x] 2.3 Reestilizar `NovosGastos.tsx` com card tokenizado e destaque de valor proporcional
- [x] 2.4 Reestilizar `TendenciasGrupos.tsx` com superfícies de card tokenizadas e sinalização visual de tendência (ícone seta + cor semântica via `SemanticTone`)
- [x] 2.5 Reestilizar `TendenciasRecorrentes.tsx` com tokens de superfície e tipografia consistente
- [x] 2.6 Verificar `bun run build` sem erros e confirmar ausência de cores hex hardcoded nos arquivos modificados

## 3. Abas Próx. Mês, Previsão e Investimentos

- [x] 3.1 Reestilizar `ProximoMes.tsx`: layout de seções tokenizado, KPIs de compromissos e projeção com hierarquia visual clara; `CompromissosLista` já migrado em task 1 reutilizado sem alterações
- [x] 3.2 Reestilizar `Previsao.tsx`: KPI de cashflow projetado em `number-display`, seções de grupos e categorias com tokens de superfície e espaçamento; `CashflowAreaChart` já tokenizado integrado sem modificações
- [x] 3.3 Reestilizar `Investimentos.tsx`: KPI de patrimônio total em `number-display`, seções de distribuição e histórico com tokens; `PatrimonioDonut` e `InvestimentosBarChart` já tokenizados integrados sem modificações
- [x] 3.4 Verificar que gráficos tokenizados (task_04) renderizam corretamente integrados nas 3 abas reestilizadas
- [x] 3.5 Verificar `bun run build` sem erros e confirmar ausência de cores hex hardcoded nos arquivos modificados

## 4. Aba Insights — semântica de tipo de insight

- [x] 4.1 Reestilizar `Insights.tsx`: título de seção com tipografia tokenizada, layout de cards com `surface-card-dark` e espaçamento via tokens
- [x] 4.2 Aplicar semântica visual por tipo de insight: positivo usa `--color-trading-up` na borda/ícone, negativo usa `--color-trading-down`, neutro/informativo usa `--color-info`
- [x] 4.3 Verificar `bun run build` sem erros

## 5. Validação final

- [x] 5.1 Rodar `cd client && bun run build` e confirmar zero erros de TypeScript em todas as abas
- [x] 5.2 Verificar no browser (localhost:5173) que as 6 abas renderizam sem erros de console
- [x] 5.3 Confirmar que nenhum arquivo em `client/src/tabs/` ou nos componentes migrados contém cores hex hardcoded fora dos tokens
