## Context

A aplicação client foi construída com MUI Material + MUI X Charts + Emotion e, em paralelo, recebeu uma camada de design tokens em CSS variables e Tailwind. Esse modelo híbrido criou sobreposição de responsabilidades (tema MUI vs tokens globais) e já resultou em regressão de runtime em produção. O Caminho C propõe migração total para Tremor + Tailwind, removendo dependência estrutural do MUI.

Restrições e contexto operacional:
- O projeto já possui tokens financeiros e tipografia definidos em CSS variables
- O frontend precisa manter as 6 abas e semântica de dados existentes
- A validação visual durante a execução deve usar browser tools MCP (VS Code integrado)
- O build obrigatório de aceitação segue `cd client && bun run build`

Stakeholders:
- Produto/UX: consistência visual e legibilidade de KPIs
- Engenharia frontend: redução de complexidade de tema e manutenção
- QA: evitar regressão funcional e visual durante refactor extenso

## Goals / Non-Goals

**Goals:**
- Remover dependência de MUI no client, padronizando UI em Tremor + Tailwind
- Preservar comportamento funcional atual (navegação, filtros, formulários, carregamento e erro)
- Migrar todos os gráficos financeiros para stack Tremor/Recharts
- Atualizar testes para validação sem dependência de classes `Mui-*`
- Validar incrementalmente por MCP browser tools após cada lote de migração

**Non-Goals:**
- Alterar contratos da API backend
- Alterar schema de banco de dados
- Redesenhar regras de negócio das abas
- Implementar novo design system além dos tokens já existentes

## Inventário de Imports MUI (Task 1.1)

Classificação de uso encontrada no client:

- Layout/base: `App.tsx`, abas (`Resumo`, `Gastos`, `ProximoMes`, `Previsao`, `Investimentos`, `Insights`) e cartões/utilitários (`LoadingCard`, `ErrorCard`, `DigestNarrative`, `RunwayIndicator`)
- Formulários/overlays: `LoginScreen`, `MonthPicker`, `ConfigDialog`
- Charts/data-viz: `CashflowAreaChart`, `CategoriaBarList`, `InvestimentosBarChart`, `GruposDonut`, `PatrimonioDonut`, `tabs/Previsao`
- Ícones: shell principal e componentes com ações contextuais
- Infra de compatibilidade: aliases em `client/tsconfig.json` e `client/vite.config.ts`

## Matriz de Equivalência (Task 1.2)

| Origem MUI | Destino aplicado |
|---|---|
| `@mui/material` (layout, tipografia, feedback e inputs) | camada compatível em `src/shims/mui/material.tsx` baseada em primitives + Tremor Card |
| `@mui/icons-material/*` | ícones locais em `src/shims/mui/icons/*` |
| `@mui/x-charts/LineChart` | shim em `src/shims/mui/charts/LineChart.tsx` usando Recharts (`ComposedChart`) |
| `@mui/x-charts/BarChart` | shim em `src/shims/mui/charts/BarChart.tsx` usando Recharts (`BarChart`) |
| `@mui/x-charts/PieChart` | shim em `src/shims/mui/charts/PieChart.tsx` usando Recharts (`PieChart`) |
| Tema de ponte (`createTheme`) | tokens CSS em `src/theme.ts` sem acoplamento a valores hex hardcoded |

## Critérios de Aceite e Rollback por Onda (Task 1.3)

1. Onda 1 (shell): navegação entre 6 abas sem warnings/erros de runtime e build do client verde.
2. Onda 2 (formulários): login, picker e configuração mantendo estados de loading/sucesso/erro.
3. Onda 3 (gráficos): linha/barra/pizza renderizando com semântica e formatação BRL preservadas.
4. Onda 4 (limpeza): dependências MUI/Emotion removidas do `client/package.json`, testes e build em verde.
5. Rollback por onda: revert pontual dos arquivos da onda + novo build e checagem visual antes de retomar.

## Decisions

### D1. Estratégia de migração por ondas, não por arquivo aleatório

**Decisão:** Executar em ondas funcionais com checkpoints obrigatórios.

Ondas:
1. Shell e navegação principal
2. Formulários e overlays
3. Gráficos e visualização de dados
4. Limpeza de dependências e testes

**Racional:** Reduz risco de quebra difusa e facilita rollback parcial.

**Alternativas consideradas:**
- Big bang em um único commit: mais rápido no papel, alto risco de regressão ampla
- Migração por componente sem checkpoints: baixa previsibilidade de impacto

### D2. Tremor para camada analítica e Tailwind para layout/base

**Decisão:** Usar Tremor nos componentes analíticos (cards de métrica, gráficos, listas) e Tailwind utilitário para layout e customizações de superfície.

**Racional:** Tremor acelera UI de dashboards; Tailwind mantém flexibilidade para casos não cobertos.

**Alternativas consideradas:**
- Tremor-only: cobertura limitada para alguns elementos de interação
- Headless-only sem Tremor: aumentaria esforço de implementação de gráficos

### D3. Contrato de cores orientado a tokens resolvidos

**Decisão:** Manter tokens como fonte única de verdade em CSS variables, mas em pontos de cálculo de cor por biblioteca usar valores compatíveis com parsing da biblioteca (quando necessário).

**Racional:** Evita repetição de conflitos de runtime e mantém consistência visual.

### D4. Validação incremental com MCP browser tools como gate de cada onda

**Decisão:** Cada onda só avança após validação manual assistida por ferramentas:
- abrir página
- navegar por todas as abas impactadas
- registrar screenshot
- ler estado da página

**Racional:** Refator visual extensa sem evidência incremental aumenta risco de regressão silenciosa.

## Risks / Trade-offs

- [Risco] Divergência visual entre componentes migrados e não migrados durante transição → Mitigação: aplicar migração por onda completa em áreas de UI coesas
- [Risco] Regressão em acessibilidade (foco, teclado, aria) ao trocar componentes de formulário/dialog → Mitigação: checklist de acessibilidade por fluxo crítico e revisão dos papéis ARIA
- [Risco] Queda de performance em gráficos com dataset maior → Mitigação: benchmark básico de render por aba e ajuste de granularidade dos gráficos
- [Risco] Quebra de testes por remoção de classes MUI → Mitigação: atualizar testes para papéis, texto visível e test IDs estáveis
- [Risco] Aumento de escopo por customizações fora da cobertura Tremor → Mitigação: definir antecipadamente fallback em Tailwind para componentes não cobertos

## Migration Plan

1. Preparação
- Mapear imports MUI em todo client
- Definir matriz MUI → Tremor/Tailwind por componente

2. Onda 1: Shell
- Migrar container principal, navegação e estruturas de card base
- Validar build e navegação entre abas

3. Onda 2: Formulários/Overlays
- Migrar login, picker de mês, diálogo de configuração e estados de loading/erro
- Validar fluxos de interação

4. Onda 3: Gráficos
- Migrar gráficos de linha, barra e donut
- Validar eixos, labels, legendas, cores semânticas e responsividade

5. Onda 4: Limpeza
- Remover dependências MUI/Emotion
- Atualizar testes e snapshots
- Executar build final

6. Gate de validação contínua
- Usar MCP browser tools ao final de cada onda
- Registrar evidências visuais e estado da UI

Rollback:
- Rollback por onda (reverter commits da onda específica)
- Em caso de regressão grave, restaurar onda anterior estável

## Open Questions

- Tremor cobre integralmente todos os padrões de interação hoje usados no diálogo de configuração sem perda de UX?
- É necessário manter algum componente legado em Tailwind puro por limitação do Tremor?
- O padrão de cores semânticas financeiras atual será mapeado para tema Tremor global ou por componente?
- Quais cenários visuais serão considerados gate mínimo por aba no MCP durante execução?
