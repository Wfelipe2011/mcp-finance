## 1. Backend — endpoint de login

- [x] 1.1 Instalar `jose` como dependência: `bun add jose`
- [x] 1.2 Criar `src/application/web/routes/auth.ts` com `handleLogin`: lê `APP_USERNAME`, `APP_PASSWORD`, `APP_SECRET` do env; compara com `timingSafeEqual`; assina JWT com `jose` (HS256, TTL = `AUTH_TOKEN_TTL_DAYS * 86400s`)
- [x] 1.3 Registrar `POST /api/auth/login` no `router.ts`

## 2. Backend — middleware de autenticação

- [x] 2.1 Criar `src/application/web/auth-middleware.ts` com função `verifyAuth(req)` que valida JWT do header `Authorization: Bearer`
- [x] 2.2 Em `server.ts`, antes de chamar `router()`, checar: se path começa com `/api/` e não é `/api/auth/login`, chamar `verifyAuth`; retornar 401 se inválido

## 3. Frontend — tela de login

- [x] 3.1 Criar `client/src/components/LoginScreen.tsx` com campos username/password, botão "Entrar", estado de loading e mensagem de erro
- [x] 3.2 Em `client/src/App.tsx`, adicionar estado `authToken` inicializado com `localStorage.getItem('authToken')`
- [x] 3.3 Adicionar função `isTokenValid(token)` que decodifica o payload JWT (base64) e verifica `exp > Date.now() / 1000`
- [x] 3.4 Se `!authToken || !isTokenValid(authToken)`, renderizar `<LoginScreen onLogin={(token) => { localStorage.setItem('authToken', token); setAuthToken(token) }} />` em vez do app completo

## 4. Frontend — Authorization header

- [x] 4.1 Em `client/src/api/client.ts`, criar helper `authHeaders()` que retorna `{ Authorization: 'Bearer <token>' }` lendo do localStorage
- [x] 4.2 Adicionar `authHeaders()` a todos os `fetch()` existentes no `client.ts`
- [x] 4.3 Adicionar handler global: se qualquer fetch retornar 401, limpar localStorage e recarregar página

## 5. Validar

- [x] 5.1 Rodar `bun run client:build` — zero erros TypeScript
- [x] 5.2 Abrir o app sem token: tela de login aparece
- [x] 5.3 Login com credenciais corretas: app carrega normalmente
- [x] 5.4 Login com credenciais erradas: mensagem de erro sem travar
- [x] 5.5 Chamar `/api/cashflow` sem token via curl: retorna 401
