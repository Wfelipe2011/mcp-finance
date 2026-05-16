## 1. Inicialização do projeto client

- [x] 1.1 Criar `client/package.json` com dependências: `react`, `react-dom`, `@tremor/react`, `tailwindcss`, `postcss`, `autoprefixer`, `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`
- [x] 1.2 Criar `client/vite.config.ts` com plugin React, proxy `/api/*` → `http://localhost:3001` e `base: '/'`
- [x] 1.3 Criar `client/tailwind.config.ts` com content paths incluindo `./src/**/*.{ts,tsx}` e preset do Tremor
- [x] 1.4 Criar `client/postcss.config.js` com plugins tailwindcss e autoprefixer
- [x] 1.5 Criar `client/tsconfig.json` com target ES2020, JSX react-jsx, strict mode
- [x] 1.6 Criar `client/index.html` com viewport mobile, charset, e `<div id="root">`
- [x] 1.7 Executar `cd client && bun install` e confirmar que instala sem erros

## 2. Scripts no package.json raiz

- [x] 2.1 Adicionar `"client:dev": "cd client && bun run dev"` ao `package.json` raiz
- [x] 2.2 Adicionar `"client:build": "cd client && bun run build"` ao `package.json` raiz
- [x] 2.3 Adicionar `"client:preview": "cd client && bun run preview"` ao `package.json` raiz

## 3. Tipos e camada de API

- [x] 3.1 Criar `client/src/api/types.ts` com interfaces TypeScript: `CashflowMensal`, `GastosMensais`, `Compromisso`, `CashflowProjetado`, `Runway`, `Patrimonio`, `InvestimentoMensal`, `Digest`, `Transacao`, `TransacaoComInsight`
- [x] 3.2 Criar `client/src/api/client.ts` exportando funções: `fetchMeses()`, `fetchCashflow(month)`, `fetchGastos(month)`, `fetchCompromissos()`, `fetchCashflowProjetado()`, `fetchRunway()`, `fetchPatrimonio()`, `fetchInvestimentos(months?)`, `fetchDigest(month)`, `fetchTransacoes(month, limit?, offset?)`
- [x] 3.3 Confirmar que todas as funções retornam o tipo correto e tratam resposta null

## 4. Hook useApi

- [x] 4.1 Criar `client/src/hooks/useApi.ts` com `useApi<T>(url: string)` usando `useEffect` + `AbortController`
- [x] 4.2 Garantir que hook retorna `{ data: T | null, loading: boolean, error: string | null }`
- [x] 4.3 Garantir que hook cancela fetch anterior quando `url` muda (cleanup do useEffect)

## 5. Componentes base

- [x] 5.1 Criar `client/src/components/MonthPicker.tsx` que chama `fetchMeses()` e renderiza `<select>` com meses disponíveis
- [x] 5.2 Criar `client/src/components/LoadingCard.tsx` — Card do Tremor com spinner ou skeleton
- [x] 5.3 Criar `client/src/components/ErrorCard.tsx` — Card do Tremor com mensagem de erro

## 6. Estrutura de navegação (App + abas esqueleto)

- [x] 6.1 Criar `client/src/App.tsx` com `TabGroup` do Tremor contendo 5 tabs: Resumo, Gastos, Próximo Mês, Investimentos, Insights
- [x] 6.2 Gerenciar `selectedMonth` como estado em `App.tsx` e passar como prop para cada aba
- [x] 6.3 Criar `client/src/tabs/Resumo.tsx` — placeholder com texto "Aba Resumo - em breve"
- [x] 6.4 Criar `client/src/tabs/Gastos.tsx` — placeholder
- [x] 6.5 Criar `client/src/tabs/ProximoMes.tsx` — placeholder
- [x] 6.6 Criar `client/src/tabs/Investimentos.tsx` — placeholder
- [x] 6.7 Criar `client/src/tabs/Insights.tsx` — placeholder
- [x] 6.8 Criar `client/src/main.tsx` com `ReactDOM.createRoot` e importação de CSS do Tailwind

## 7. Validação

- [x] 7.1 Executar `bun run client:build` e confirmar que `client/dist/` é gerado sem erros TypeScript
- [x] 7.2 Executar `bun run web:dev` + `bun run client:dev` em paralelo e confirmar que proxy `/api/meses` funciona no browser
- [x] 7.3 Confirmar que MonthPicker exibe os meses disponíveis corretamente
- [x] 7.4 Confirmar que navegação entre as 5 abas funciona
