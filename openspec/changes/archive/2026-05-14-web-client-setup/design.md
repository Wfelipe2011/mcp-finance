## Context

O client React é um projeto completamente separado que vive em `client/`. Ele não importa nada de `src/` — consome os dados exclusivamente via HTTP através dos endpoints definidos em `web-api-server`. O Bun server serve o bundle buildado de `client/dist/`.

Em desenvolvimento, Vite roda na porta 5173 com proxy para o Bun server em 3001. Em produção (local), `bun run client:build` gera `client/dist/` e o Bun server serve tudo na porta 3001.

## Goals / Non-Goals

**Goals:**
- Projeto React funcional com Vite, Tremor, Tailwind — buildável com `bun run client:build`
- Estrutura de 5 abas navegáveis com MonthPicker funcional (busca meses disponíveis da API)
- Hook `useApi` reutilizável com estados `loading`, `error`, `data`
- Funções de API tipadas para todos os 10 endpoints
- Proxy Vite configurado para `/api/*` → `localhost:3001`
- Mobile-first: `max-w-md mx-auto` no container principal, viewport correto no `index.html`

**Non-Goals:**
- Autenticação ou persistência de estado (localStorage, etc.)
- React Router (navegação por abas via estado local — sem URL changes)
- SSR / Next.js
- Testes automatizados
- Dark mode

## Decisions

### D1: Navegação por estado local, sem React Router

**Decisão**: A aba ativa é gerenciada por `useState<Tab>` no componente `App`. Não há mudança de URL.

**Rationale**: É um dashboard local de teste. URLs diferentes por aba adicionariam complexidade (React Router, history management) sem benefício prático. O Tremor `TabGroup` já cuida do visual.

### D2: MonthPicker alimentado pela API

**Decisão**: `MonthPicker` faz `GET /api/meses` ao montar e popula um `<select>` nativo.

**Rationale**: Os meses disponíveis dependem dos dados no banco. Hardcoding criaria inconsistência. Consulta única ao montar — sem polling.

### D3: Hook useApi para todas as chamadas

**Decisão**: `useApi<T>(url: string)` retorna `{ data: T | null, loading: boolean, error: string | null }` e dispara fetch sempre que `url` muda.

**Rationale**: Evita duplicação de lógica loading/error em cada componente. Simples o suficiente para não precisar de React Query.

### D4: Funções tipadas em api/client.ts

**Decisão**: Um arquivo `client/src/api/client.ts` exporta funções como `fetchCashflow(month: string)` que constroem a URL correta e retornam tipos TypeScript adequados.

**Rationale**: Centraliza a construção de URLs e os tipos de resposta da API. Os componentes chamam `fetchCashflow(month)` em vez de construir strings de URL manualmente.

### D5: Tremor como biblioteca de componentes

**Decisão**: Usar `@tremor/react` com Tailwind CSS.

**Rationale**: Tremor tem `TabGroup`, `Card`, `Metric`, `BarList`, `DonutChart`, `AreaChart` — todos os primitivos necessários para as 5 abas. Mobile-first por padrão. Permite implementar o visual Pierre sem escrever CSS do zero.

### D6: Estrutura de pastas do client

```
client/
  index.html
  package.json
  vite.config.ts
  tailwind.config.ts
  src/
    main.tsx
    App.tsx              ← TabGroup + MonthPicker
    api/
      client.ts          ← funções tipadas por endpoint
      types.ts           ← interfaces TypeScript da API
    hooks/
      useApi.ts          ← hook genérico de fetch
    components/
      MonthPicker.tsx
      LoadingCard.tsx    ← estado de carregamento padrão
      ErrorCard.tsx      ← estado de erro padrão
    tabs/
      Resumo.tsx         ← placeholder (implementado na próxima mudança)
      Gastos.tsx         ← placeholder
      ProximoMes.tsx     ← placeholder
      Investimentos.tsx  ← placeholder
      Insights.tsx       ← placeholder
```

## Risks / Trade-offs

- **[Risk] Versão do Tremor com Tailwind v4** → Mitigação: verificar versão compatível; Tremor v3 usa Tailwind v3. Fixar versões no `package.json` do client.
- **[Risk] bun install no diretório client** → Mitigação: scripts raiz usam `cd client && bun install` antes de build/dev.
- **[Risk] CORS em dev sem proxy correto** → Mitigação: Vite proxy configurado para `/api/*`; CORS headers já estão no Bun server.

## Open Questions

- Nenhuma — estrutura definida no explore anterior.
