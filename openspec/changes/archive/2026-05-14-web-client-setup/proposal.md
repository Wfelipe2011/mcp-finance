## Why

Com a API JSON disponível (`web-api-server`), o próximo passo é criar o projeto React que será o client do dashboard. Precisamos de um projeto configurado com Vite, Tremor (componentes financeiros prontos), Tailwind CSS e a estrutura de navegação por abas — pronto para receber a implementação das telas nas mudanças seguintes.

## What Changes

- Criar pasta `client/` na raiz do projeto com projeto React + Vite independente
- Configurar Tailwind CSS e Tremor como biblioteca de componentes
- Criar estrutura de roteamento com 5 abas usando `TabGroup` do Tremor
- Criar `MonthPicker` — componente de navegação de mês alimentado por `GET /api/meses`
- Criar hook `useApi(endpoint)` — abstração de fetch com estado loading/error/data
- Criar `client/api/client.ts` — funções tipadas para cada endpoint da API
- Criar páginas-esqueleto para cada aba (sem conteúdo — só estrutura)
- Configurar Vite com proxy `/api/*` → `http://localhost:3001` para desenvolvimento
- Adicionar scripts `client:dev`, `client:build`, `client:preview` ao `package.json` raiz

## Capabilities

### New Capabilities

- `web-client-project`: projeto React + Vite + Tremor em `client/` com `package.json` próprio
- `web-client-navigation`: TabGroup com 5 abas e MonthPicker no header, roteamento por estado local (sem React Router)
- `web-client-api-layer`: hook `useApi` e funções tipadas para todos os endpoints

### Modified Capabilities

## Impact

- **Nova pasta**: `client/` com projeto React independente
- **`package.json` raiz**: scripts `client:dev`, `client:build`, `client:preview`
- **Dependências novas** (somente em `client/package.json`): `react`, `react-dom`, `@tremor/react`, `tailwindcss`, `vite`, `@vitejs/plugin-react`
- **Zero impacto** no código TypeScript existente em `src/`
