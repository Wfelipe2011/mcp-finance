## 1. Banco — cube_tendencias

- [x] 1.1 Em `gold-cubes.sql`, criar VIEW `cube_tendencias` com CTEs `ultimos_3`, `grupos` e `recorrentes` conforme design
- [x] 1.2 Executar VIEW no banco e validar: query `SELECT * FROM cube_tendencias WHERE tipo='grupo' ORDER BY valor DESC` deve mostrar grupos com médias razoáveis (~R$893 Alimentação, ~R$1.635 Moradia etc)
- [x] 1.3 Validar recorrentes: `SELECT * FROM cube_tendencias WHERE tipo='recorrente'` deve listar Netflix, Gympass, Claro, Z-API, etc.

## 2. API — endpoint /tendencias

- [x] 2.1 Criar `src/application/web/routes/tendencias.ts` com `handleTendencias()` chamando `db.getTendencias()`
- [x] 2.2 Em `BunPgAdapter.ts`, adicionar método `getTendencias()` que faz duas queries separadas: uma para `grupos` e uma para `recorrentes`, retorna objeto `{ grupos, recorrentes }`
- [x] 2.3 Em `src/application/web/router.ts`, registrar rota `GET /tendencias → handleTendencias`
- [x] 2.4 Testar `curl http://localhost:3001/tendencias` e validar JSON com as duas listas

## 3. Client — seção Tendências na aba Gastos

- [x] 3.1 Em `client/src/api/types.ts`, adicionar tipos `GrupoTendencia`, `RecorrenteAI` e `Tendencias`
- [x] 3.2 Em `client/src/api/client.ts`, adicionar `fetchTendencias(): Promise<Tendencias>`
- [x] 3.3 Em `Gastos.tsx`, adicionar `useEffect` para chamar `fetchTendencias()` e armazenar em state
- [x] 3.4 Criar componente `TendenciasGrupos` (BarList com média mensal por grupo) em `client/src/components/`
- [x] 3.5 Criar componente `TendenciasRecorrentes` (lista com merchant + valor médio) em `client/src/components/`
- [x] 3.6 Renderizar os dois componentes ao final de `Gastos.tsx` dentro de `Paper` com títulos "Média 3 meses" e "Recorrentes identificados"
- [x] 3.7 Validar visualmente no browser: aba Gastos exibe seção de tendências com dados corretos
- [x] 3.8 Rodar `cd client && bun run build` e confirmar zero erros TypeScript
