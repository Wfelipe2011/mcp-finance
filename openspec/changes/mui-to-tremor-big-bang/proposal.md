## Why

O frontend está acoplado ao MUI em múltiplas camadas (componentes, tema, ícones, charts e testes), e esse acoplamento já gerou regressões de runtime como o conflito de cor com CSS variables. A migração total para Tremor + Tailwind reduz complexidade de theming, unifica o design system e simplifica a manutenção visual no longo prazo.

## What Changes

- Migrar a shell principal da aplicação de MUI para componentes Tremor e utilitários Tailwind, preservando comportamento funcional das 6 abas
- Substituir os gráficos de `@mui/x-charts` por gráficos Tremor (base Recharts), mantendo semântica de dados, labels e cores financeiras
- Substituir componentes de formulário e overlay (select, dialog, inputs, estados de loading/erro) por equivalentes Tremor + primitives acessíveis
- Remover `@mui/material`, `@mui/icons-material`, `@mui/x-charts`, `@emotion/react` e `@emotion/styled` das dependências do client
- Atualizar testes para não depender de classes `Mui-*`, priorizando papéis ARIA e test IDs estáveis
- Executar validação incremental via MCP browser tools durante a execução (abrir página, navegar abas, capturar screenshot e ler estado da UI)
- **BREAKING (interno de frontend)**: estrutura de DOM e classes CSS mudam amplamente; snapshots e testes visuais atuais precisarão ser atualizados

## Capabilities

### New Capabilities
- `tremor-ui-foundation`: Define a nova base de UI do client usando Tremor + Tailwind, com tokens de cor/spacing/radius aplicados sem dependência de tema MUI
- `tremor-chart-migration`: Substitui os gráficos financeiros da aplicação para componentes Tremor/Recharts preservando legibilidade e semântica de tendências
- `mcp-visual-regression-checks`: Define validação contínua da migração por navegação e evidências visuais com browser tools MCP

### Modified Capabilities
- `forecast-tab-ui`: Ajusta requisitos de renderização da aba Previsão para refletir os novos componentes de tabela/gráfico sem classes MUI

## Impact

- Frontend client: shell, abas, componentes compartilhados, camada de charts e testes
- Build/deps do client: troca de stack de UI e remoção de pacote MUI/Emotion
- QA visual: aumento de validação por MCP browser tools durante rollout da migração
- Sem impacto esperado em contratos HTTP da API ou schema de banco
