## Why

A fundação visual do design system foi estabelecida (tokens CSS, ponte MUI, shell reestilizado e gráficos tokenizados — tasks 01–04). O que falta é aplicar essa linguagem visual às 6 abas do produto: Resumo, Gastos, Próx. Mês, Previsão, Investimentos e Insights.

Sem essa migração, a experiência fica híbrida: o shell e os gráficos têm o novo visual, mas o conteúdo das abas ainda usa estilos fragmentados, cores hardcoded e hierarquia de leitura fraca — exatamente o problema que o design system foi criado para resolver.

## What Changes

- Migração visual da aba **Resumo** e seus 7 componentes exclusivos (RunwayIndicator, FlagPills, AnomaliasList, DigestNarrative, CompromissosLista, NotableExpenses)
- Migração visual da aba **Gastos** e seus componentes exclusivos (CategoriaBarList, NovosGastos, TendenciasGrupos, TendenciasRecorrentes)
- Migração visual das abas **Próx. Mês**, **Previsão** e **Investimentos** com hierarquia de KPI e integração dos gráficos já tokenizados
- Migração visual da aba **Insights** com semântica de destaque por tipo (positivo, negativo, neutro)
- Nenhuma lógica de dados, contratos de API ou fluxo funcional é alterado

## Capabilities

### New Capabilities

<!-- Nenhuma nova capability funcional — escopo puramente visual -->

### Modified Capabilities

- `resumo-visual`: Aba Resumo com hierarquia visual clara, semântica financeira (resultado mensal em cor trading-up/down) e todos os componentes exclusivos tokenizados.
- `gastos-visual`: Aba Gastos com KPI de total gasto em destaque, sinalização semântica de tendências e componentes de categoria/novos gastos tokenizados.
- `abas-financeiras-visual`: Abas Próx. Mês, Previsão e Investimentos com hierarquia de KPIs, seções tokenizadas e integração correta dos gráficos da fundação.
- `insights-visual`: Aba Insights com cards tokenizados e semântica visual de destaque por tipo de insight (positivo, negativo, neutro/informativo).

## Impact

- `client/src/tabs/Resumo.tsx` — reestilização completa com hierarquia e semântica
- `client/src/tabs/Gastos.tsx` — reestilização completa com semântica de tendências
- `client/src/tabs/ProximoMes.tsx` — reestilização de layout e KPIs
- `client/src/tabs/Previsao.tsx` — reestilização de KPI principal e seções
- `client/src/tabs/Investimentos.tsx` — reestilização com KPI de patrimônio em destaque
- `client/src/tabs/Insights.tsx` — reestilização com semântica de tipo de insight
- `client/src/components/RunwayIndicator.tsx`, `FlagPills.tsx`, `AnomaliasList.tsx`, `DigestNarrative.tsx`, `CompromissosLista.tsx`, `NotableExpenses.tsx` — tokenização
- `client/src/components/CategoriaBarList.tsx`, `NovosGastos.tsx`, `TendenciasGrupos.tsx`, `TendenciasRecorrentes.tsx` — tokenização
- Nenhuma mudança em `client/src/api/`, tipos de resposta ou lógica de negócio
- Pré-requisito: tokens CSS (index.css), ponte MUI (App.tsx), shell (task_03) e gráficos (task_04) já completos
