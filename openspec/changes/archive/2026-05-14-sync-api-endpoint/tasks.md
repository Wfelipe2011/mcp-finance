## 1. Backend — rota de sync

- [x] 1.1 Criar `src/application/web/routes/sync.ts` com `handleSync`: instancia `BunPgAdapter` e `TokenHttpAdapter`, cria `SyncUseCase`, chama `run()` e retorna `jsonResponse(summary)`; fecha `db` no finally; retorna `errorResponse` em caso de exceção
- [x] 1.2 Registrar `POST /api/sync` no `router.ts`
- [x] 1.3 Atualizar `CORS_HEADERS` em `helpers.ts` adicionando `POST` em `Access-Control-Allow-Methods`
- [x] 1.4 Verificar se `server.ts` trata `OPTIONS` corretamente para POST (preflight)

## 2. Frontend — função triggerSync

- [x] 2.1 Em `client/src/api/client.ts`, adicionar `export async function triggerSync()` que faz `POST /api/sync` com `authHeaders()` e timeout de 120s via `AbortController`

## 3. Frontend — botão no header

- [x] 3.1 Em `client/src/App.tsx`, importar `SyncRoundedIcon` e `CircularProgress` do MUI
- [x] 3.2 Adicionar estado `syncState: 'idle' | 'loading' | 'success' | 'error'` e `syncMessage: string`
- [x] 3.3 Adicionar `IconButton` no header (entre MonthPicker e toggle de tema) com: ícone `SyncRoundedIcon` em idle/success/error, `CircularProgress size={20}` em loading; desabilitado quando `syncState === 'loading'`
- [x] 3.4 No handler de clique: setar `loading`, chamar `triggerSync()`, setar `success` com mensagem de summary, ou `error` com mensagem de falha
- [x] 3.5 Após sucesso: re-fetch da lista de meses chamando `fetchMeses()` e atualizando o state

## 4. Frontend — Snackbar de feedback

- [x] 4.1 Adicionar `Snackbar` + `Alert` do MUI no JSX do App.tsx para mostrar `syncMessage`
- [x] 4.2 Auto-fechar após 4s em sucesso, 6s em erro

## 5. Validar

- [x] 5.1 Rodar `bun run client:build` — zero erros TypeScript
- [x] 5.2 Clicar no botão de sync: spinner aparece, aguarda e mostra toast de sucesso com contagem
- [x] 5.3 Confirmar que `GET /api/meses` retorna lista atualizada após sync
- [x] 5.4 Simular erro (desligar auth container) e confirmar toast de erro aparece
