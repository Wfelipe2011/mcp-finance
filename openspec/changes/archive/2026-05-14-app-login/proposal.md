## Why

O app expõe dados financeiros pessoais (extratos, saldos, investimentos) sem nenhuma autenticação. Qualquer pessoa na mesma rede que souber a URL consegue ver tudo. Com o compose subindo o projeto acessível via `localhost:3001`, isso é aceitável numa máquina pessoal — mas ao expor para a rede local ou um servidor, vira um risco real.

Além disso, o objetivo de "clonar e usar" implica que outras pessoas podem rodar o projeto. Autenticação mínima garante que só o dono configurado no `.env` tem acesso.

## What Changes

- Tela de login no frontend (React) mostrada quando não há token válido em localStorage
- Endpoint `POST /api/auth/login` que valida username/password do `.env` e retorna JWT
- Middleware de autenticação no servidor Bun que bloqueia todos os `/api/*` sem token válido (exceto `/api/auth/login`)
- Token JWT salvo em localStorage, enviado em `Authorization: Bearer` em todas as chamadas da API

## Capabilities

### New Capabilities
- `app-auth`: Login de 1 usuário com credenciais do `.env`, JWT com TTL configurável, middleware de proteção de todos os endpoints

## Impact

- `src/application/web/server.ts` — middleware de auth antes do router
- `src/application/web/router.ts` — rota `POST /api/auth/login`
- `src/application/web/routes/auth.ts` — handler de login
- `client/src/App.tsx` — estado de autenticação, redirecionamento para login
- `client/src/components/LoginScreen.tsx` — tela de login (novo arquivo)
- `client/src/api/client.ts` — adicionar `Authorization` header em todas as chamadas
- `.env.example` — variáveis `APP_USERNAME`, `APP_PASSWORD`, `APP_SECRET`
