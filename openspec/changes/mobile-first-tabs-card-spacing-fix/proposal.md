## Why

A migração visual recente estabilizou o stack, mas deixou regressões perceptíveis de layout em mobile: conteúdo coberto pela tabbar fixa, cards com densidade visual excessiva por falta de espaçamento interno e legibilidade comprometida em áreas com gráficos/tabelas. Corrigir isso agora é crítico para evitar percepção de baixa qualidade no fluxo principal das abas financeiras.

## What Changes

- Definir contrato mobile-first para shell e abas, com prioridade para viewport pequeno e expansão progressiva para desktop.
- Corrigir a convivência entre tabbar fixa e conteúdo rolável, com área segura inferior obrigatória para evitar sobreposição.
- Padronizar espaçamento interno de cards (padding, gap e rhythm vertical) em todas as abas.
- Ajustar componentes de visualização de dados para preservar legibilidade em mobile (labels, eixos, tabela e áreas de scroll).
- Adicionar critérios objetivos de validação visual para garantir que a navegação entre abas não reintroduza quebras de layout.

## Capabilities

### New Capabilities
- `mobile-first-tab-layout`: contrato de layout mobile-first para shell e conteúdo das abas, com breakpoints e comportamento responsivo explícitos.
- `fixed-tabbar-safe-area`: regras de área segura inferior para tabbar fixa sem cobrir cards, gráficos e tabelas.
- `card-internal-spacing`: padrão de espaçamento interno mínimo para cards e blocos de conteúdo em todas as abas.
- `chart-viewport-readability`: requisitos de legibilidade e overflow controlado para gráficos/listas em viewports reduzidas.

### Modified Capabilities
- `forecast-tab-ui`: atualização dos requisitos da aba Previsão para garantir que gráfico e tabela permaneçam visíveis/legíveis sem sobreposição da tabbar fixa.

## Impact

- Frontend client: shell principal, tabs (`Resumo`, `Gastos`, `Próx. Mês`, `Previsão`, `Investimentos`, `Insights`) e componentes de card/chart/tabela.
- Tokens/estilos utilitários: ajustes de spacing, safe-area e regras responsivas.
- QA visual: novos checks de navegação e leitura em mobile-first para prevenir regressões.
